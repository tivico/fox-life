import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { createScene, homeLayout } from '../src/scene.ts';
import { DAILY, CLEAN_STORAGE } from '../src/daily.ts';
import { FrameClock } from '../src/FrameClock.ts';
import { LifeJournal, lifePresentation } from '../src/life.ts';
import { bindClickInteraction } from '../src/ClickInteraction.ts';

const requests = { Window: 'requestWindowObserve', Bed: 'requestSleep', Bookshelf: 'requestRead', Food: 'requestEat', Clean: 'requestClean', Play: 'requestPlay' };
function seeded(seed = 42) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
function until(fox, predicate, dt = 1 / 60, seconds = 60, each = () => {}) {
  for (let i = 0; i < seconds / dt; i++) {
    if (predicate()) return;
    fox.update(dt); each(i);
  }
  assert.fail(`timed out: ${fox.action}, ${fox.activityKind}/${fox.activityPhase}`);
}
const makeAuto = kind => new Character(homeLayout, () => kind === 'Clean' ? .45 : kind === 'Play' ? .6 : .18);
function neutralProps(fox) {
  for (const name of ['CleaningBroom', 'CleaningDust', 'PlayingYarn', 'ReadingDoze']) {
    const prop = fox.root.getObjectByName(name);
    assert.equal(prop.visible, false, name);
    assert.deepEqual(prop.scale.toArray(), [0, 0, 0], name);
  }
}

test('Clean and Play complete six-second-plus player activities across rates, log once, and clear every prop', () => {
  for (const kind of ['Clean', 'Play']) for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
    const fox = new Character(homeLayout, seeded());
    const journal = new LifeJournal();
    assert.equal(fox[requests[kind]](), true);
    assert.equal(journal.observe(fox), false);
    until(fox, () => fox.activityPhase === 'active', dt, 40, () => journal.observe(fox));
    const position = fox.root.position.clone();
    let duration = 0;
    while (fox.activityPhase === 'active') {
      assert.equal(fox.source, 'Player Command');
      assert.equal(fox.requestPlay(), false);
      assert.equal(fox.requestWindowObserve(), false);
      assert.equal(lifePresentation(fox).active, kind);
      assert.ok(lifePresentation(fox).progress >= 0);
      fox.update(dt); journal.observe(fox); duration += dt;
      assert.deepEqual(fox.root.position.toArray(), position.toArray());
    }
    assert.ok(duration >= DAILY[kind].duration && duration <= DAILY[kind].duration + dt * 2);
    until(fox, () => fox.state === 'Idle', dt);
    neutralProps(fox);
    assert.deepEqual(journal.entries.map(entry => [entry.kind, entry.source]), [[kind, 'player']]);
    assert.ok((kind === 'Clean' ? fox.cleanCooldownRemaining : fox.playCooldownRemaining) > 0);
  }
});

test('autonomous activities safely exit from approach, settle, active and finish to every other invitation', () => {
  for (const kind of ['Clean', 'Play']) for (const phase of ['approach', 'settle', 'active', 'finish']) {
    for (const [target, method] of Object.entries(requests)) {
      if (target === kind) continue;
      const fox = makeAuto(kind);
      until(fox, () => fox.activityKind === kind && fox.activityPhase === phase && (phase === 'approach' || fox.activityElapsed > .1));
      assert.equal(fox.source, 'Autonomous');
      const position = fox.root.position.clone();
      assert.equal(fox[method](), true, `${kind}/${phase} -> ${target}`);
      assert.deepEqual(fox.root.position.toArray(), position.toArray(), 'no teleport on invitation');
      assert.equal(fox.source, 'Player Command');
      assert.equal(fox.requestWindowObserve(), false, 'replacement is locked');
      until(fox, () => fox.targetLabel === target || (target === 'Food' && fox.targetLabel === 'DiningArea'));
      neutralProps(fox);
      until(fox, () => fox.state === 'Idle');
      neutralProps(fox);
    }
  }
});

test('odd readings doze then resume, even readings stay awake, and the journal never duplicates a book', () => {
  const fox = new Character(homeLayout, seeded());
  const journal = new LifeJournal();
  for (let reading = 1; reading <= 3; reading++) {
    assert.equal(fox.requestRead(), true);
    let dozed = false;
    until(fox, () => fox.state === 'Idle', 1 / 60, 40, () => {
      journal.observe(fox);
      if (fox.microEvent === 'Doze') {
        dozed = true;
        assert.equal(fox.state, 'Read');
        assert.equal(fox.root.getObjectByName('ReadingBook').visible, true);
        assert.equal(fox.root.getObjectByName('ReadingDoze').visible, true);
      }
    });
    assert.equal(dozed, reading % 2 === 1);
    neutralProps(fox);
  }
  assert.equal(journal.entries.filter(entry => entry.kind === 'Bookshelf').length, 3);
  assert.equal(journal.entries.filter(entry => entry.kind === 'Doze').length, 2);
  assert.equal(fox.root.getObjectByName('ReadingBook').visible, false);
});

test('autonomous dozing reading puts the book and Z away before accepting a new activity', () => {
  const fox = makeAuto('Bookshelf');
  until(fox, () => fox.microEvent === 'Doze');
  assert.equal(fox.requestClean(), true);
  assert.equal(fox.readPhase, 'finish');
  until(fox, () => fox.activityKind === 'Clean');
  assert.equal(fox.root.getObjectByName('ReadingBook').visible, false);
  assert.equal(fox.root.getObjectByName('ReadingDoze').visible, false);
  until(fox, () => fox.state === 'Idle');
  neutralProps(fox);
});

test('Sleep, Read and Eat safe exits transfer to both new activities; all six player invitations remain exclusive', () => {
  for (const [origin, random, phase] of [['Bed', .02, 'sleep'], ['Bookshelf', .18, 'read'], ['Food', .31, 'eat']]) {
    for (const target of ['Clean', 'Play']) {
      const fox = new Character(homeLayout, () => random);
      until(fox, () => (origin === 'Bed' ? fox.sleepPhase : origin === 'Bookshelf' ? fox.readPhase : fox.eatPhase) === phase);
      assert.equal(fox[requests[target]](), true);
      until(fox, () => fox.activityKind === target);
      for (const name of ['ReadingBook', 'EatingBowl', 'EatingBite']) assert.equal(fox.root.getObjectByName(name).visible, false);
      assert.equal(fox.root.getObjectByName('FoxTail').children[0].morphTargetInfluences[0], 0);
      until(fox, () => fox.state === 'Idle');
      neutralProps(fox);
    }
  }
  for (const method of Object.values(requests)) {
    const fox = new Character(homeLayout, seeded());
    assert.equal(fox[method](), true);
    assert.equal(fox.requestClean(), false);
    assert.equal(fox.requestPlay(), false);
    assert.equal(fox.source, 'Player Command');
  }
});

test('waking fox leaves the bed, stretches in the activity area and can safely accept an invitation mid-stretch', () => {
  for (const interrupt of [false, true]) {
    const fox = new Character(homeLayout, seeded());
    const journal = new LifeJournal();
    fox.requestSleep();
    until(fox, () => fox.microEvent === 'Stretch', 1 / 60, 90, () => journal.observe(fox));
    assert.ok(fox.root.position.x >= homeLayout.bounds.minX && fox.root.position.x <= homeLayout.bounds.maxX);
    assert.ok(fox.root.position.distanceTo(homeLayout.bed.position) > 1, 'off the bed before stretching');
    until(fox, () => fox.activityElapsed > .6);
    if (interrupt) {
      assert.equal(fox.requestPlay(), true);
      assert.equal(fox.activityPhase, 'finish');
      assert.equal(fox.requestRead(), false);
      until(fox, () => fox.activityKind === 'Play');
    }
    until(fox, () => fox.state === 'Idle');
    neutralProps(fox);
    assert.equal(journal.entries.filter(entry => entry.kind === 'Stretch').length, 1);
  }
});

test('ten minutes autonomous life include both new activities and both micro-events without stuck props', () => {
  const fox = new Character(homeLayout, seeded(97));
  const seen = new Set();
  for (let frame = 0; frame < 600 * 20; frame++) {
    fox.update(1 / 20);
    seen.add(fox.state); if (fox.microEvent) seen.add(fox.microEvent);
    if (fox.state === 'Idle') neutralProps(fox);
  }
  for (const kind of ['Clean', 'Play', 'Read', 'Sleep', 'Eat', 'Doze', 'Stretch']) assert.ok(seen.has(kind), `missing ${kind}`);
});

test('new activities preserve foreground timing and props across hidden/resume, including cooldowns', () => {
  for (const kind of ['Clean', 'Play']) {
    const fox = new Character(homeLayout, seeded()); fox[requests[kind]]();
    until(fox, () => fox.activityPhase === 'active' && fox.activityElapsed > 1);
    const before = [fox.activityElapsed, fox.cleanCooldownRemaining, fox.playCooldownRemaining, fox.root.position.toArray()];
    const clock = new FrameClock(); clock.tick(1000, false);
    fox.update(clock.tick(15000, true)); clock.reset(); fox.update(clock.tick(25000, false));
    assert.deepEqual([fox.activityElapsed, fox.cleanCooldownRemaining, fox.playCooldownRemaining, fox.root.position.toArray()], before);
  }
});

test('Doze and Stretch also pause in the background, then resume without consuming the event', () => {
  for (const kind of ['Doze', 'Stretch']) {
    const fox = kind === 'Doze' ? makeAuto('Bookshelf') : new Character(homeLayout, seeded());
    if (kind === 'Stretch') fox.requestSleep();
    until(fox, () => fox.microEvent === kind);
    const before = [fox.microEvent, fox.activityElapsed, fox.readElapsed, fox.root.getObjectByName('FoxEyes').scale.y];
    const clock = new FrameClock(); clock.tick(1000, false);
    fox.update(clock.tick(120000, true)); clock.reset(); fox.update(clock.tick(240000, false));
    assert.deepEqual([fox.microEvent, fox.activityElapsed, fox.readElapsed, fox.root.getObjectByName('FoxEyes').scale.y], before);
  }
});

test('stretch raises both arms and every overlay restores the accepted neutral arm roll after finishing', () => {
  const fox = new Character(homeLayout, seeded()); fox.requestSleep();
  until(fox, () => fox.microEvent === 'Stretch' && fox.activityElapsed >= .9);
  for (const name of ['FoxArmL', 'FoxArmR']) assert.ok(fox.root.getObjectByName(name).rotation.x < -2);
  until(fox, () => fox.state === 'Idle');
  for (const [name, expected] of [['FoxArmL', -.08], ['FoxArmR', .08]]) {
    assert.ok(Math.abs(fox.root.getObjectByName(name).rotation.z - expected) < 1e-8);
  }
  neutralProps(fox);
});

test('new props and poses clear floor and actual room furniture on approach, activity and departure', () => {
  const { scene } = createScene(); scene.updateMatrixWorld(true);
  const blockers = [];
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      const box = new THREE.Box3().setFromObject(object, true);
      if (box.max.y > .05) {
        let parent = object;
        while (parent.parent && parent.name !== 'RoomBroom') parent = parent.parent;
        blockers.push({ box, name: object.name, storedBroom: parent.name === 'RoomBroom' });
      }
    }
  });
  for (const kind of ['Clean', 'Play']) for (const dt of [1 / 20, 1 / 60]) {
    for (const start of [[0, 0, 0], [1.6, 0, -1.1], [-3.15, 0, 1.85]]) {
      const fox = new Character(homeLayout, seeded()); fox.root.position.fromArray(start); fox.root.rotation.y = Math.PI;
      fox[requests[kind]]();
      until(fox, () => fox.state === 'Idle', dt, 45, frame => {
        if (frame % 5) return;
        fox.root.updateMatrixWorld(true);
        fox.root.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const box = new THREE.Box3().setFromObject(object, true);
          assert.ok(box.min.y >= -.005, `${kind} prop below floor: ${object.parent?.name}`);
          for (const blocker of blockers) {
            // The renderer hides the parked copy while this same broom is in use.
            if (blocker.storedBroom && fox.cleanToolInUse) continue;
            assert.ok(!box.intersectsBox(blocker.box), `${kind}/${fox.activityPhase}: ${object.parent?.name} hit ${blocker.name}`);
          }
        });
      });
    }
  }
});

test('room broom and yarn accept nearest visible clicks and reject drags, occlusion and disposed listeners', () => {
  class Canvas extends EventTarget { getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 500 }; } }
  for (const key of ['cleanParts', 'playParts']) {
    const room = createScene(), canvas = new Canvas();
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 40);
    const point = room[key][0].getWorldPosition(new THREE.Vector3());
    camera.position.copy(point).add(new THREE.Vector3(-1, 2, 4)); camera.lookAt(point); camera.updateMatrixWorld();
    let hits = 0;
    const dispose = bindClickInteraction(canvas, camera, room.scene, room[key], () => hits++);
    const p = point.clone().project(camera), x = (p.x + 1) * 250, y = (1 - p.y) * 250;
    const event = (type, dx = 0) => { const e = new Event(type); Object.assign(e, { clientX: x + dx, clientY: y, button: 0, isPrimary: true, pointerId: 1 }); canvas.dispatchEvent(e); };
    event('pointerdown'); event('pointerup'); assert.equal(hits, 1, key);
    event('pointerdown'); event('pointermove', 20); event('pointerup'); assert.equal(hits, 1);
    const occluder = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5));
    occluder.position.copy(point).lerp(camera.position, .5); room.scene.add(occluder);
    event('pointerdown'); event('pointerup'); assert.equal(hits, 1);
    room.scene.remove(occluder); dispose(); event('pointerdown'); event('pointerup'); assert.equal(hits, 1);
  }
});

test('nested room tools expose correct world bounds before the first render', () => {
  const { cleanParts, playParts } = createScene();
  const broom = new THREE.Box3().setFromObject(cleanParts[0], true);
  const yarn = new THREE.Box3().setFromObject(playParts[0], true);
  assert.ok(Math.abs(broom.getCenter(new THREE.Vector3()).x - CLEAN_STORAGE.tool[0]) < .01);
  assert.ok(Math.abs(broom.getCenter(new THREE.Vector3()).z - CLEAN_STORAGE.tool[2]) < .01);
  assert.ok(yarn.min.x > 3 && yarn.min.y > 1.5);
});
