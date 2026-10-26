import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { kitchenHomeLayout, companionLayout, createScene } from '../src/scene.ts';
import { Household } from '../src/Household.ts';
import { PairPlanner } from '../src/Pair.ts';
import { foxLooks } from '../src/createFoxVisual.ts';
import { LifeJournal, lifePresentation } from '../src/life.ts';
import { SoundCues } from '../src/SoundCues.ts';

const dt = .05;
const lcg = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
function home(random = () => .45, pairs = () => .99) {
  const household = new Household();
  const a = new Character(kitchenHomeLayout, random, { household, name: '小橘' });
  const b = new Character(companionLayout, () => .45, { household, name: '小白', look: foxLooks.white });
  b.root.position.set(6.4, 0, 6.4); b.yieldTo(a);
  const planner = new PairPlanner([a, b], pairs);
  return { a, b, household, planner, step() { a.update(dt); b.update(dt); planner.update(dt); },
    dispose() { a.dispose(); b.dispose(); } };
}
function until(h, predicate, seconds = 120, sample = () => {}) {
  for (let i = 0; i < seconds / dt; i++) { h.step(); sample(); if (predicate()) return; }
  assert.fail(`timed out: ${h.a.action} / ${h.b.action}`);
}
const active = h => h.a.together?.phase === 'active' && h.b.together?.phase === 'active';
const finished = h => !h.a.together && !h.b.together && h.a.state === 'Idle' && h.b.state === 'Idle';

function meshHitsBox(mesh, box) {
  const triangle = new THREE.Triangle(), geometry = mesh.geometry;
  const count = geometry.index?.count ?? geometry.attributes.position.count;
  for (let i = 0; i < count; i += 3) {
    for (const [offset, point] of [[0, triangle.a], [1, triangle.b], [2, triangle.c]]) {
      mesh.getVertexPosition(geometry.index ? geometry.index.getX(i + offset) : i + offset, point).applyMatrix4(mesh.matrixWorld);
    }
    if (box.intersectsTriangle(triangle)) return true;
  }
  return false;
}

test('two foxes come from different rooms, share two sofa seats and one remote, and record one TV moment', () => {
  for (const leadName of ['a', 'b']) {
    const h = home(), journal = new LifeJournal();
    const { scene, livingRoom } = createScene({ expanded: true, garden: true, kitchen: true });
    scene.add(h.a.root, h.b.root);
    const cues = [new SoundCues(), new SoundCues()], remoteSounds = [0, 0];
    let frame = 0, sampledSeats = false, tvOn = false;
    const solids = [];
    scene.updateMatrixWorld(true);
    scene.traverse(mesh => {
      if (mesh instanceof THREE.Mesh && ['SofaBase', 'SofaCushion', 'SofaBack', 'SofaArm', 'SofaThrow'].includes(mesh.name)) {
        solids.push({ name: mesh.name, box: new THREE.Box3().setFromObject(mesh, true).expandByScalar(-.008) });
      }
    });
    const sample = () => {
      livingRoom.update(dt, false, h.a.livingActivity, h.b.livingActivity);
      scene.updateMatrixWorld(true);
      [h.a, h.b].forEach((fox, index) => {
        journal.observe(fox);
        remoteSounds[index] += cues[index].update(fox, dt).filter(cue => cue === 'remote').length;
      });
      tvOn ||= scene.getObjectByName('TVProgram').visible;
      if (active(h) && h.a.together.motionTime > 1) {
        sampledSeats = true;
        for (const fox of [h.a, h.b]) {
          assert.equal(fox.state, 'Living');
          const visual = fox.root.getObjectByName('FoxVisual').getWorldPosition(new THREE.Vector3());
          assert.ok(visual.x < -2.7 && visual.x > -3.2 && visual.y > .5 && visual.y < .51, `seated at ${visual.toArray()}`);
          assert.equal(fox.root.getObjectByName('HeldRemote').visible, fox === h[leadName]);
        }
        const head = fox => new THREE.Box3().setFromObject(fox.root.getObjectByName('FoxHead'), true);
        assert.ok(!head(h.a).intersectsBox(head(h.b)), 'the two heads have clear space');
        assert.equal(scene.getObjectByName('ParkedRemote').visible, false);
        assert.match(lifePresentation(h.b).title, /並肩看/);
      }
      if (frame++ % 4) return;
      for (const fox of [h.a, h.b]) fox.root.traverse(mesh => {
        if (!(mesh instanceof THREE.Mesh)) return;
        for (let parent = mesh; parent; parent = parent.parent) if (!parent.visible) return;
        const bounds = new THREE.Box3().setFromObject(mesh, true);
        assert.ok(bounds.min.y >= -.01, 'feet stay above the floor');
        for (const solid of solids) if (bounds.intersectsBox(solid.box)) {
          assert.ok(!meshHitsBox(mesh, solid.box), `${fox.name}/${fox.action}/${fox.together?.pose.toFixed(3)} at ${fox.root.position.toArray()}: ${mesh.parent.name} ${bounds.min.toArray()}..${bounds.max.toArray()} enters ${solid.name} ${solid.box.min.toArray()}..${solid.box.max.toArray()}`);
        }
      });
    };
    try {
      assert.equal(h.planner.invite('WatchTVTogether', h[leadName]), 'accepted');
      assert.equal(h.planner.invite('WatchTVTogether', h[leadName]), 'same');
      assert.equal(h.a.occupies('WatchTV'), true); assert.equal(h.b.occupies('SofaRest'), true);
      until(h, () => active(h), 120, sample);
      until(h, () => finished(h), 30, sample);
      assert.ok(sampledSeats && tvOn);
      assert.equal(scene.getObjectByName('TVProgram').visible, false);
      assert.equal(scene.getObjectByName('ParkedRemote').visible, true);
      assert.ok(h.household.owner('living') === null, 'both standing up releases the shared sofa');
      assert.equal(remoteSounds[leadName === 'a' ? 0 : 1], 2);
      assert.equal(remoteSounds[leadName === 'a' ? 1 : 0], 0);
      assert.equal(journal.entries.filter(entry => entry.kind === 'WatchTVTogether').length, 1);
      assert.equal(journal.entries.filter(entry => entry.kind === 'WatchTV').length, 0);
    } finally { h.dispose(); }
  }
});

test('calling a fox away from autonomous TV ends both performances and releases the shared sofa', () => {
  for (const phase of ['approach', 'active']) {
    const h = home(() => .45, () => 0);
    try {
      h.a.root.position.set(.6, 0, 5.4); h.b.root.position.set(.6, 0, 7);
      h.planner.update(dt);
      assert.equal(h.a.together?.kind, 'WatchTVTogether');
      if (phase === 'active') until(h, () => active(h));
      assert.equal(h.a.requestSleep(), true);
      until(h, () => !h.a.together && !h.b.together);
      assert.ok(h.household.owner('living') === null);
      assert.equal(h.b.root.getObjectByName('HeldRemote').visible, false);
      until(h, () => h.a.sleepPhase === 'sleep');
    } finally { h.dispose(); }
  }
});

test('a fox carrying tea safely returns it before joining, and a cancelled pending pair releases its reservation', () => {
  for (const cancel of [false, true]) {
    const h = home(lcg(11));
    try {
      // Advance only this fox to arrange a real autonomous tea activity; the partner stays free.
      let elapsed = 0;
      while (!(h.a.livingActivity?.kind === 'Tea' && h.a.livingActivity.phase === 'active') && elapsed < 1800) {
        h.a.update(dt); elapsed += dt;
      }
      assert.equal(h.a.livingActivity?.kind, 'Tea');
      assert.equal(h.planner.invite('WatchTVTogether', h.b), 'accepted');
      assert.equal(h.a.together, null, 'first safely return the cup');
      assert.equal(h.a.occupies('WatchTV'), true, 'pending pair holds its destination');
      if (cancel) h.b.dispose();
      let time = 0;
      while (!h.a.together && h.a.source === 'Player Command' && time < 90) { h.a.update(dt); time += dt; }
      assert.equal(h.a.root.getObjectByName('HeldTeaCup').visible, false);
      if (cancel) {
        assert.equal(h.a.together, null);
        assert.ok(h.household.owner('living') === null, 'abandoned pending join frees its reservation');
      } else {
        until(h, () => active(h));
        until(h, () => finished(h), 30);
        assert.ok(h.household.owner('living') === null);
      }
    } finally { h.dispose(); }
  }
});

test('a pair does not steal a living-room reservation owned by someone outside the pair', () => {
  const h = home(), outsider = {};
  try {
    h.household.claim('living', outsider);
    assert.equal(h.planner.invite('WatchTVTogether', h.a), 'space-busy');
    assert.equal(h.a.together, null); assert.equal(h.b.together, null);
    assert.ok(h.household.owner('living') === outsider);
  } finally { h.dispose(); }
});

test('room props track a partner still returning tea while the first fox approaches the shared sofa', () => {
  const { scene, livingRoom } = createScene({ expanded: true });
  const approaching = { kind: 'WatchTV', phase: 'approach', elapsed: 0, motionTime: 0, pose: 0, cupHold: 0, remote: true };
  const returning = { kind: 'Tea', phase: 'return', elapsed: 0, motionTime: 2, pose: 0, cupHold: 1 };
  for (const reversed of [false, true]) {
    const snapshots = reversed ? [returning, approaching] : [approaching, returning];
    livingRoom.update(dt, false, ...snapshots);
    assert.equal(scene.getObjectByName('ParkedTeaCup').visible, false, 'no duplicate cup during the handover');
    assert.equal(scene.getObjectByName('TVProgram').visible, false);
    livingRoom.update(dt, false, approaching, approaching);
    assert.equal(scene.getObjectByName('ParkedTeaCup').visible, true, 'the cup is back before the pair starts');
  }
});

test('the shared sofa stays reserved until the second fox has finished standing up', () => {
  const h = home(() => .45, () => 0);
  try {
    h.a.root.position.set(.6, 0, 5.4); h.b.root.position.set(.6, 0, 7);
    h.planner.update(dt);
    until(h, () => active(h));
    assert.equal(h.a.requestRead(), true);
    // Deliberately delay one participant to exercise the ownership boundary between two updates.
    for (let i = 0; i < 28; i++) h.a.update(dt);
    assert.equal(h.a.together, null);
    assert.ok(h.household.owner('living') !== null, 'the other fox is still seated');
    for (let i = 0; i < 29; i++) h.b.update(dt);
    assert.equal(h.b.together, null);
    assert.ok(h.household.owner('living') === null);
  } finally { h.dispose(); }
});
