import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { createScene, expandedHomeLayout, homeLayout } from '../src/scene.ts';
import { livingActions, livingDurations, CUP_PARK } from '../src/LivingActivity.ts';
import { LifeJournal, roomActions, lifePresentation } from '../src/life.ts';
import { SoundCues } from '../src/SoundCues.ts';
import { soundSamples } from '../src/soundDesign.ts';
import { FrameClock } from '../src/FrameClock.ts';
import { bindWindowInteraction } from '../src/WindowInteraction.ts';

function until(fox, predicate, dt = .05, sample = () => {}, seconds = 150) {
  for (let frame = 0; frame < seconds / dt; frame++) {
    fox.update(dt); sample(); if (predicate()) return;
  }
  assert.fail(`stalled at ${fox.action}: ${fox.root.position.toArray()}`);
}
function autonomous(kind) {
  const random = (4.5 + livingActions.indexOf(kind)) / 13;
  const fox = new Character(expandedHomeLayout, () => random);
  until(fox, () => fox.livingActivity?.kind === kind);
  assert.equal(fox.source, 'Autonomous'); return fox;
}
function meshHitsBox(mesh, box) {
  const triangle = new THREE.Triangle(), geometry = mesh.geometry;
  const count = geometry.index?.count ?? geometry.getAttribute('position').count;
  for (let i = 0; i < count; i += 3) {
    for (const [offset, point] of [[0, triangle.a], [1, triangle.b], [2, triangle.c]]) {
      mesh.getVertexPosition(geometry.index ? geometry.index.getX(i + offset) : i + offset, point);
      point.applyMatrix4(mesh.matrixWorld);
    }
    if (box.intersectsTriangle(triangle)) return true;
  }
  return false;
}

// Ray parity in the actual closed surface, including the sculpted muzzle.
function insideSurface(point, mesh) {
  const local = mesh.worldToLocal(point.clone());
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  if (!mesh.geometry.boundingBox.containsPoint(local)) return false;
  const ray = new THREE.Ray(local, new THREE.Vector3(.873, .361, .327).normalize());
  const positions = mesh.geometry.getAttribute('position'), index = mesh.geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3();
  const distances = [];
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    a.fromBufferAttribute(positions, index ? index.getX(i) : i);
    b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2);
    if (ray.intersectTriangle(a, b, c, false, hit)) {
      const distance = hit.distanceTo(local);
      if (distance > 1e-5 && !distances.some(value => Math.abs(value - distance) < 1e-5)) distances.push(distance);
    }
  }
  return distances.length % 2 === 1;
}

for (const kind of ['TidySofa', 'Exercise', 'Tea']) {
  test(`${kind} keeps distal arms and tail outside the head and torso`, () => {
    for (const dt of [.05, 1 / 60, 1 / 144]) {
      const fox = new Character(expandedHomeLayout, () => .45); fox.requestLivingAction(kind);
      const head = fox.root.getObjectByName('FoxHead').children[0];
      const torso = head.parent.parent.children.find(object => object instanceof THREE.Mesh && object.geometry.type === 'LatheGeometry');
      const tail = fox.root.getObjectByName('FoxTail').children[0];
      const arms = ['FoxArmL', 'FoxArmR'].map(name => fox.root.getObjectByName(name).children[0]);
      let frame = 0;
      until(fox, () => fox.state === 'Idle', dt, () => {
        if (frame++ % Math.max(1, Math.round(1 / (dt * 30))) || !fox.livingActivity) return;
        fox.root.updateMatrixWorld(true);
        const samples = kind === 'Tea' ? [tail] : arms;
        const raised = fox.livingActivity.phase === 'active' && (kind === 'TidySofa'
          || kind === 'Exercise' && fox.livingActivity.motionTime >= 3.6 && fox.livingActivity.motionTime < 7.2);
        for (const mesh of samples) {
          const positions = mesh.geometry.getAttribute('position');
          for (let i = 0; i < positions.count; i += 2) {
            // Standing shoulders join the neck; fully raised arms must clear the whole head.
            if (mesh === tail ? i < 6 * 24 : !raised && positions.getY(i) > -.2) continue;
            const vertex = mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
            const surfaces = mesh === tail ? [head, torso] : [head];
            for (const surface of surfaces) {
              assert.ok(!insideSurface(vertex, surface), `${kind}/${fox.livingActivity.phase}: ${mesh.parent.name} enters ${surface === head ? 'head' : 'torso'} at ${fox.livingActivity.elapsed.toFixed(2)}`);
            }
          }
        }
      }); fox.dispose();
    }
  });
}

test('six distinct living actions cross from the bedroom, complete full active clocks and record one real moment at every frame rate', () => {
  for (const dt of [.05, 1 / 60, 1 / 144]) for (const kind of livingActions) {
    const fox = new Character(expandedHomeLayout, () => .45), journal = new LifeJournal();
    assert.equal(fox.requestLivingAction(kind), true);
    assert.equal(fox.requestLivingAction(kind), false); assert.equal(fox.requestSleep(), false);
    const phases = new Set(); let activeSeconds = 0, position = fox.root.position.clone();
    until(fox, () => fox.state === 'Idle', dt, () => {
      journal.observe(fox);
      const activity = fox.livingActivity;
      if (activity) { phases.add(activity.phase); if (activity.phase === 'active') activeSeconds += dt; }
      if (activity?.phase === 'active') {
        assert.equal(lifePresentation(fox).active, kind);
        assert.ok(lifePresentation(fox).progress >= 0 && lifePresentation(fox).progress <= 100);
      }
      assert.ok(position.distanceTo(fox.root.position) <= 1.05 * dt + 1e-8, 'movement never teleports'); position.copy(fox.root.position);
    });
    assert.ok(activeSeconds >= livingDurations[kind] - dt);
    assert.equal(journal.entries.filter(entry => entry.kind === kind).length, 1);
    assert.equal(journal.entries[0].source, 'player');
    assert.ok(phases.has('settle') && phases.has('active') && phases.has('finish'));
    if (kind === 'Tea') for (const phase of ['pickup', 'carry', 'return', 'putdown']) assert.ok(phases.has(phase), phase);
    assert.equal(fox.livingActivity, null); assert.equal(fox.source, 'Autonomous');
    for (const prop of ['HeldTeaCup', 'HeldRemote', 'PlayingYarn']) assert.equal(fox.root.getObjectByName(prop).visible, false);
    assert.equal(fox.root.getObjectByName('FoxVisual').position.length(), 0); fox.dispose();
  }
});

test('every living action safely exits to a bedroom invitation without retaining a seat pose or prop', () => {
  for (const kind of livingActions) for (const command of ['requestWindowObserve', 'requestSleep', 'requestRead', 'requestEat', 'requestClean']) {
    const fox = autonomous(kind); until(fox, () => fox.livingActivity?.phase === 'active' && fox.livingActivity.elapsed > .5);
    assert.equal(fox[command](), true); assert.equal(fox.requestRoomVisit('Bedroom'), false);
    until(fox, () => !fox.livingActivity);
    assert.equal(fox.root.getObjectByName('HeldTeaCup').visible, false);
    assert.equal(fox.root.getObjectByName('HeldRemote').visible, false);
    assert.equal(fox.root.getObjectByName('FoxVisual').position.length(), 0);
    until(fox, () => fox.state === 'Idle'); fox.dispose();
  }
});

test('tea interruptions during pickup, carrying, sitting, sipping and return always put the cup back before the replacement starts', () => {
  for (const phase of ['pickup', 'carry', 'settle', 'active', 'finish', 'return', 'putdown']) {
    const fox = autonomous('Tea');
    until(fox, () => fox.livingActivity?.phase === phase && (['carry', 'return'].includes(phase) || fox.livingActivity.elapsed > .25));
    assert.equal(fox.requestLivingAction('Exercise'), true);
    let placed = false;
    until(fox, () => fox.livingActivity?.kind === 'Exercise', .05, () => {
      const tea = fox.livingActivity;
      if (tea?.kind === 'Tea' && tea.phase === 'putdown' && tea.cupHold < .01) {
        placed = true;
        assert.ok(fox.root.getObjectByName('HeldTeaCup').getWorldPosition(new THREE.Vector3()).distanceTo(CUP_PARK) < .015);
      }
    });
    assert.ok(placed, phase); assert.equal(fox.root.getObjectByName('HeldTeaCup').visible, false);
    until(fox, () => fox.state === 'Idle'); fox.dispose();
  }
});

test('room dock follows actual location and exercise fully replaces yarn in the connected home', () => {
  const fox = new Character(expandedHomeLayout);
  assert.deepEqual(roomActions(fox), ['Window', 'Bed', 'Bookshelf', 'Food', 'Clean']);
  fox.root.position.z = 6.2; assert.deepEqual(roomActions(fox), [...livingActions]);
  assert.ok(!roomActions(fox).includes('Play')); assert.equal(fox.requestPlay(), true);
  assert.equal(fox.livingActivity.kind, 'Exercise');
  const old = new Character(homeLayout); assert.equal(old.requestPlay(), true); assert.equal(old.activityKind, 'Play');
  old.dispose(); fox.dispose();
});

test('television, remote, cup and radio follow actual action phases and reset after completion', () => {
  const room = createScene({ expanded: true }), fox = new Character(expandedHomeLayout, () => .45);
  for (const kind of ['WatchTV', 'Tea', 'Music']) {
    fox.requestLivingAction(kind);
    let observed = false;
    until(fox, () => fox.state === 'Idle', .05, () => {
      room.livingRoom.update(.05, false, fox.livingActivity);
      if (fox.livingActivity?.phase !== 'active') return;
      observed = true;
      if (kind === 'WatchTV') {
        assert.equal(room.scene.getObjectByName('TVProgram').visible, fox.livingActivity.elapsed >= .25);
        assert.equal(room.scene.getObjectByName('ParkedRemote').visible, false);
        assert.equal(fox.root.getObjectByName('HeldRemote').visible, true);
      } else if (kind === 'Tea') {
        assert.equal(room.scene.getObjectByName('ParkedTeaCup').visible, false);
        assert.equal(fox.root.getObjectByName('HeldTeaCup').visible, true);
      } else assert.equal(room.scene.getObjectByName('RadioNotes').visible, true);
    });
    assert.ok(observed); assert.equal(room.scene.getObjectByName('TVProgram').visible, false);
    assert.equal(room.scene.getObjectByName('ParkedTeaCup').visible, true);
    assert.equal(room.scene.getObjectByName('ParkedRemote').visible, true);
    assert.equal(room.scene.getObjectByName('RadioNotes').visible, false);
  }
  fox.dispose();
});

test('background pause freezes carried props, exercise and all living clocks without replaying cues', () => {
  for (const kind of livingActions) {
    const fox = new Character(expandedHomeLayout, () => .45); fox.requestLivingAction(kind);
    until(fox, () => fox.livingActivity?.phase === 'active' && fox.livingActivity.elapsed > .5);
    const before = JSON.stringify(fox.livingActivity), visual = fox.root.getObjectByName('FoxVisual').position.clone();
    const clock = new FrameClock(); clock.tick(1000, false);
    fox.update(clock.tick(60000, true)); clock.reset(); fox.update(clock.tick(90000, false));
    assert.equal(JSON.stringify(fox.livingActivity), before); assert.ok(fox.root.getObjectByName('FoxVisual').position.equals(visual)); fox.dispose();
  }
});

test('new living sounds track actual visible phrases once across frame rates and synthesized buffers stay bounded', () => {
  for (const dt of [.05, 1 / 60, 1 / 144]) for (const [kind, sound, count] of [['WatchTV', 'remote', 2], ['Tea', 'sip', 3], ['Tea', 'cup', 1], ['Music', 'radio', 4]]) {
    const fox = new Character(expandedHomeLayout, () => .45), cues = new SoundCues(); const heard = [];
    cues.update(fox, dt); fox.requestLivingAction(kind);
    until(fox, () => fox.state === 'Idle', dt, () => heard.push(...cues.update(fox, dt)));
    assert.equal(heard.filter(value => value === sound).length, count); fox.dispose();
  }
  for (const kind of ['remote', 'cup', 'sip', 'radio']) {
    const buffer = soundSamples(kind, 24000);
    assert.ok(buffer.every(Number.isFinite)); assert.ok(buffer.some(value => Math.abs(value) > .0001));
    assert.ok(buffer.every(value => Math.abs(value) < .2));
    assert.ok(Math.abs(buffer[0]) < .0001 && Math.abs(buffer.at(-1)) < .001);
  }
});

test('living poses keep feet above the floor, sit on the cushion and clear moving furniture through approach and recovery', () => {
  const { scene, livingRoom } = createScene({ expanded: true }); scene.updateMatrixWorld(true);
  const solidNames = new Set(['SofaBase', 'SofaCushion', 'SofaBack', 'SofaArm', 'SofaPillow', 'SofaThrow', 'RoomDivider', 'DoorwayPost', 'LivingLeftWall', 'TVStand', 'Television', 'LivingSideboard']);
  const blockers = [];
  scene.traverse(object => { if (object instanceof THREE.Mesh && solidNames.has(object.name)) {
    // Allow surface contact on soft upholstery, while detecting penetration into its interior.
    const box = new THREE.Box3().setFromObject(object, true);
    if (object.name.startsWith('Sofa')) box.expandByScalar(-.008);
    blockers.push({ name: object.name, object, box });
  } });
  for (const kind of livingActions) {
    const fox = new Character(expandedHomeLayout, () => .45); fox.requestLivingAction(kind); let frame = 0;
    until(fox, () => fox.state === 'Idle', .05, () => {
      livingRoom.update(.05, false, fox.livingActivity);
      if (frame++ % 2 || fox.root.position.z < 2.3) return;
      scene.updateMatrixWorld(true);
      for (const blocker of blockers) {
        blocker.box.setFromObject(blocker.object, true);
        if (blocker.name.startsWith('Sofa')) blocker.box.expandByScalar(-.008);
      }
      const sofaFootprint = new THREE.Box3().setFromObject(scene.getObjectByName('SofaBase'));
      const blanket = scene.getObjectByName('SofaThrow').getWorldPosition(new THREE.Vector3());
      blanket.y = sofaFootprint.getCenter(new THREE.Vector3()).y;
      assert.ok(sofaFootprint.containsPoint(blanket), 'folding keeps the blanket on the sofa');
      fox.root.updateMatrixWorld(true);
      fox.root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        let parent = object; while (parent?.visible) parent = parent.parent; if (parent) return;
        const box = new THREE.Box3().setFromObject(object, true);
        assert.ok(box.min.y >= -.01, `${fox.action}: ${object.parent?.name} below floor`);
        // A muzzle can extend above a tabletop while the chin remains beside it.
        // Confirm broad-phase overlaps against the actual posed mesh surface.
        for (const blocker of blockers) if (box.intersectsBox(blocker.box)) {
          assert.ok(!meshHitsBox(object, blocker.box), `${fox.action}: ${object.parent?.name} hit ${blocker.name}`);
        }
      });
      if (fox.livingActivity?.phase === 'active' && ['WatchTV', 'SofaRest', 'Tea', 'Music'].includes(kind)) {
        const visual = fox.root.getObjectByName('FoxVisual').getWorldPosition(new THREE.Vector3());
        assert.ok(visual.x < -2.7 && visual.x > -3.2); assert.ok(visual.y > .50 && visual.y < .51);
      }
    }); fox.dispose();
  }
});

test('all six living furniture targets dispatch their own action, reject occlusion and dragging, and detach cleanly', () => {
  const room = createScene({ expanded: true });
  class Canvas extends EventTarget { getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 500 }; } }
  const names = { WatchTV: 'TVScreen', SofaRest: 'SofaCushion', Tea: 'ParkedTeaCup', Exercise: 'ExerciseMat', Music: 'RadioCase', TidySofa: 'SofaPillow' };
  for (const kind of livingActions) {
    const canvas = new Canvas(), object = room.scene.getObjectByName(names[kind]);
    const point = object.getWorldPosition(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 30);
    camera.position.copy(point).add(new THREE.Vector3(0, 3, .3)); camera.lookAt(point); camera.updateMatrixWorld();
    const received = [];
    const unbinders = Object.entries(room.livingRoom.livingParts).map(([action, parts]) => bindWindowInteraction(canvas, camera, room.scene, parts, () => received.push(action)));
    const emit = (type, x = 250) => {
      const event = new Event(type); Object.assign(event, { clientX: x, clientY: 250, button: 0, isPrimary: true, pointerId: 1 }); canvas.dispatchEvent(event);
    };
    emit('pointerdown'); emit('pointerup'); assert.deepEqual(received, [kind]);
    emit('pointerdown'); emit('pointermove', 280); emit('pointerup'); assert.equal(received.length, 1);
    const occluder = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5)); occluder.position.copy(point).lerp(camera.position, .5); room.scene.add(occluder);
    emit('pointerdown'); emit('pointerup'); assert.equal(received.length, 1);
    room.scene.remove(occluder); unbinders.forEach(unbind => unbind()); emit('pointerdown'); emit('pointerup'); assert.equal(received.length, 1);
  }
});
