// One-off overall acceptance evidence; does not add to the 44-test suite.
// Run from repo: node docs/evidence/v0.2-overall/cross-action-check.mjs
import assert from 'node:assert/strict';
import { Character } from '../../../src/Character.ts';
import { eatLayout } from '../../../src/scene.ts';

const commands = { Window: c => c.requestWindowObserve(), Bed: c => c.requestSleep(), Bookshelf: c => c.requestRead(), Food: c => c.requestEat() };
const states = { Window: 'Observe', Bed: 'Sleep', Bookshelf: 'Read', Food: 'Eat' };
const same = { Sleep: 'Bed', Read: 'Bookshelf', Eat: 'Food' };
function until(c, predicate, dt, limit = 150) {
  let t = 0;
  while (!predicate() && t < limit) { c.update(dt); t += dt; }
  assert.ok(predicate(), `timeout ${c.action}`);
  return t;
}
function clean(c, armLimit = .05) {
  for (const name of ['ReadingBook', 'EatingBowl', 'EatingBite']) {
    const p = c.root.getObjectByName(name);
    assert.equal(p.visible, false, name);
    assert.equal(p.scale.x, 0, name);
  }
  const v = c.root.getObjectByName('FoxVisual');
  assert.deepEqual(v.position.toArray(), [0, 0, 0]);
  assert.ok(v.quaternion.angleTo(v.quaternion.clone().identity()) < 1e-6);
  for (const [name, roll] of [['FoxArmL', -.08], ['FoxArmR', .08]]) {
    const arm = c.root.getObjectByName(name);
    assert.equal(arm.position.z, 0);
    assert.ok(Math.abs(arm.rotation.z - roll) < 1e-8);
    assert.ok(Math.abs(arm.rotation.x) < armLimit, `${c.action} ${name} x=${arm.rotation.x}`);
  }
  assert.ok(Math.abs(c.root.getObjectByName('FoxHead').rotation.x) < .05);
  assert.equal(c.root.getObjectByName('FoxHead').position.x, 0);
  assert.equal(c.root.getObjectByName('FoxTail').position.x, 0);
  c.root.traverse(o => {
    if (o.morphTargetInfluences) assert.ok(o.morphTargetInfluences.every(x => x === 0));
    assert.ok([...o.position, ...o.scale, o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite));
  });
}
const rows = [];
for (const hz of [20, 60, 144]) for (const from of ['Idle', 'Walk', 'Observe', 'Sleep', 'Read', 'Eat']) for (const [target, command] of Object.entries(commands)) {
  const dt = 1 / hz;
  const c = new Character(eatLayout, () => from === 'Sleep' ? 0 : from === 'Read' ? .2 : .4);
  if (from === 'Observe') c.requestWindowObserve();
  until(c, () => c.state === from, dt);
  // Exercise active pose, not only the phase-entry boundary.
  if (['Sleep', 'Read', 'Eat'].includes(from)) for (let t = 0; t < .7; t += dt) c.update(dt);
  const before = c.root.position.clone();
  const timers = [c.sleepElapsed, c.readElapsed, c.eatElapsed, c.observeElapsed];
  const accepted = command(c);
  const expected = from !== 'Observe' && same[from] !== target;
  assert.equal(accepted, expected);
  assert.deepEqual(c.root.position.toArray(), before.toArray(), 'command never teleports');
  if (!accepted) assert.deepEqual([c.sleepElapsed, c.readElapsed, c.eatElapsed, c.observeElapsed], timers, 'rejected command does not restart timer');
  let exitSeconds = 0, exitArmX = null;
  if (accepted) {
    assert.equal(c.source, 'Player Command');
    for (const f of Object.values(commands)) assert.equal(f(c), false, 'replacement cannot be overwritten or queued');
    if (same[from]) {
      exitSeconds = until(c, () => c.state === 'Walk', dt);
      assert.ok(exitSeconds <= (from === 'Sleep' ? .75 : .35) + dt * 2);
      assert.deepEqual(c.root.position.toArray(), before.toArray(), 'anchored until visual reset');
      exitArmX = ['FoxArmL', 'FoxArmR'].map(n => c.root.getObjectByName(n).rotation.x);
      // Sleep uses baseline damping (unlike Read/Eat's removed offsets).
      // Record its small wake-end arm angle explicitly; do not claim exact zero.
      // The accepted walk swing envelope is 0.23 rad. Final idle still uses .05.
      clean(c, from === 'Sleep' ? .23 : .05);
    }
    until(c, () => c.state === states[target], dt);
    for (const f of Object.values(commands)) assert.equal(f(c), false);
  } else {
    assert.equal(c.source, from === 'Observe' ? 'Player Command' : 'Autonomous');
  }
  until(c, () => c.state === 'Idle', dt);
  assert.equal(c.source, 'Autonomous'); assert.equal(c.target, null);
  // Observe head easing belongs to accepted baseline; allow one second to settle.
  for (let t = 0; t < 1; t += dt) { c.update(dt); assert.equal(c.state, 'Idle', 'no queued action'); }
  clean(c);
  assert.equal(command(c), true, 'new command works after completion');
  rows.push({ hz, from, target, accepted, exitSeconds: +exitSeconds.toFixed(3), exitArmX, result: 'PASS' });
}
// All four player actions reject all four commands while active.
for (const [initial, start] of Object.entries(commands)) for (const [target, command] of Object.entries(commands)) {
  const c = new Character(eatLayout, () => .4); start(c);
  until(c, () => c.state === states[initial], 1 / 60);
  assert.equal(command(c), false);
  until(c, () => c.state === 'Idle', 1 / 60);
  for (let i = 0; i < 60; i++) { c.update(1 / 60); assert.equal(c.state, 'Idle'); }
  clean(c); assert.equal(command(c), true);
}
console.log(JSON.stringify({ date: new Date().toISOString(), checkpoint: '562c945', matrixCases: rows.length, playerLockCases: 16, rows }, null, 2));
