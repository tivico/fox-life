import test from 'node:test';
import assert from 'node:assert/strict';
import { Character } from '../src/Character.ts';
import { kitchenHomeLayout, companionLayout, homeLayout } from '../src/scene.ts';
import { Household } from '../src/Household.ts';
import { createFoxVisual, foxLooks } from '../src/createFoxVisual.ts';
import { LifeJournal } from '../src/life.ts';

const dt = 1 / 60;
const lcg = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const groups = ['reading', 'dining', 'cleaning', 'play', 'living', 'garden', 'kitchen'];
const groupOf = fox => fox.kitchenActivity ? 'kitchen' : fox.gardenActivity ? 'garden' : fox.livingActivity ? 'living'
  : fox.readPhase ? 'reading' : fox.eatPhase ? 'dining' : fox.activityKind === 'Clean' ? 'cleaning' : fox.activityKind === 'Play' ? 'play' : null;
function until(predicate, step, seconds = 90) {
  let elapsed = 0;
  while (!predicate() && elapsed < seconds) { step(); elapsed += dt; }
  assert.ok(predicate(), 'timed out');
}

test('two foxes of one household never use the same spot or prop at once and release it when idle', () => {
  const household = new Household();
  const orange = new Character(kitchenHomeLayout, lcg(11), { name: '小橘', household });
  const white = new Character(companionLayout, lcg(29), { name: '小白', look: foxLooks.white, household });
  white.root.position.set(-.9, 0, 5.6); white.yieldTo(orange);
  const seen = new Set();
  for (let frame = 0; frame < 400 / dt; frame++) {
    orange.update(dt); white.update(dt);
    const a = groupOf(orange), b = groupOf(white);
    if (a) seen.add(a); if (b) seen.add(b);
    assert.ok(!a || a !== b, `both foxes in ${a} at ${(frame * dt).toFixed(1)}s`);
    for (const fox of [orange, white]) if (fox.state === 'Idle') for (const group of groups) assert.notEqual(household.owner(group), fox, 'an idle fox holds nothing');
  }
  assert.ok(seen.size >= 3, [...seen].join());
  orange.dispose(); white.dispose();
});

test('both foxes can sleep on the double bed at once, each on its own pillow', () => {
  const household = new Household();
  const orange = new Character(kitchenHomeLayout, () => .45, { name: '小橘', household });
  const white = new Character(companionLayout, () => .45, { name: '小白', household });
  white.root.position.set(-.9, 0, 5.6); white.yieldTo(orange);
  assert.equal(orange.requestSleep(), true); assert.equal(white.requestSleep(), true);
  const step = () => { orange.update(dt); white.update(dt); };
  until(() => orange.sleepPhase === 'sleep' && white.sleepPhase === 'sleep', step, 120);
  assert.ok(Math.abs(orange.root.position.x - white.root.position.x) > .7, 'different pillows');
  assert.equal(orange.root.position.z.toFixed(2), white.root.position.z.toFixed(2), 'same mattress edge');
  orange.dispose(); white.dispose();
});

for (const resting of ['sleep', 'meal']) {
  test(`an accepted reading invitation reserves the shelf while finishing a ${resting}`, () => {
    const household = new Household();
    const orange = new Character(homeLayout, lcg(11), { household });
    const white = new Character(homeLayout, () => .45, { household });
    try {
      until(() => resting === 'sleep' ? orange.sleepPhase === 'sleep' : orange.eatPhase === 'eat',
        () => orange.update(dt), 600);
      assert.equal(orange.source, 'Autonomous');
      assert.equal(orange.requestRead(), true);
      assert.ok(household.owner('reading') === orange, 'reserve the destination as soon as the invitation is accepted');
      assert.equal(orange.occupies('Bookshelf'), true, 'feedback can identify the fox reserving the shelf');
      assert.equal(white.requestRead(), false, 'a second invitation cannot take the reserved shelf');
      assert.equal(orange.requestEat(), false, 'another invitation cannot replace the accepted one');
      if (resting === 'meal') {
        assert.ok(household.owner('dining') === orange, 'keep the old spot until its safe exit finishes');
        assert.equal(white.requestEat(), false);
      }
      until(() => orange.readPhase === 'read', () => {
        orange.update(dt); white.update(dt);
        assert.ok(household.owner('reading') === orange, 'reservation survives the transition and autonomous choices');
        assert.equal(orange.source, 'Player Command');
        assert.equal(white.readPhase, null);
      });
      assert.ok(household.owner('dining') !== orange, 'release the previous spot after finishing');
      until(() => orange.state === 'Idle', () => orange.update(dt));
      assert.ok(household.owner('reading') === null, 'reading releases the shelf');
      assert.equal(orange.occupies('Bookshelf'), false);
      assert.equal(white.requestRead(), true, 'the shelf is available again after the reading ends');
    } finally { orange.dispose(); white.dispose(); }
  });
}

test('an occupied destination rejects the invitation without waking a sleeping fox', () => {
  const household = new Household();
  const orange = new Character(homeLayout, () => 0, { household });
  const white = new Character(homeLayout, () => .45, { household });
  try {
    until(() => orange.sleepPhase === 'sleep', () => orange.update(dt));
    assert.equal(white.requestRead(), true);
    assert.equal(orange.requestRead(), false);
    assert.equal(orange.sleepPhase, 'sleep');
    assert.equal(orange.source, 'Autonomous');
    assert.ok(household.owner('reading') === white, 'the original reader keeps the shelf');
  } finally { orange.dispose(); white.dispose(); }
});

test('disposing a fox releases the destination reserved during its safe exit', () => {
  const household = new Household();
  const orange = new Character(homeLayout, () => 0, { household });
  const white = new Character(homeLayout, () => .45, { household });
  until(() => orange.sleepPhase === 'sleep', () => orange.update(dt));
  assert.equal(orange.requestRead(), true);
  assert.ok(household.owner('reading') === orange, 'the departing fox holds a reservation');
  orange.dispose();
  try {
    assert.ok(household.owner('reading') === null, 'dispose releases the reservation');
    assert.equal(white.requestRead(), true);
  } finally { white.dispose(); }
});

test('a trailing fox waits behind a housemate in its way and carries on once the way is clear', () => {
  const household = new Household();
  const orange = new Character(homeLayout, () => .99, { household });
  const white = new Character(homeLayout, () => .5, { household });
  orange.root.position.set(0, 0, -.3);
  white.root.position.set(0, 0, 1.3); white.root.rotation.y = Math.PI;
  white.yieldTo(orange);
  assert.equal(white.requestWindowObserve(), true);
  let minGap = Infinity, waited = false;
  until(() => white.state === 'Observe', () => {
    orange.update(dt); white.update(dt);
    const gap = orange.root.position.distanceTo(white.root.position);
    minGap = Math.min(minGap, gap);
    if (white.state === 'Walk' && orange.state === 'Idle' && gap < .7) waited = true;
  }, 60);
  assert.ok(waited, 'the white fox paused behind the idle orange fox');
  assert.ok(minGap > .35, `the foxes stayed ${minGap.toFixed(2)} apart`);
  orange.dispose(); white.dispose();
});

test('the journal records which fox did what, and the white palette reaches the coat', () => {
  const journal = new LifeJournal();
  const orange = new Character(homeLayout, () => .45, { name: '小橘' }), white = new Character(homeLayout, () => .45, { name: '小白' });
  white.root.position.set(1, 0, 1);
  assert.equal(orange.requestRead(), true); assert.equal(white.requestEat(), true);
  let tick = 0;
  for (let frame = 0; frame < 20 / dt; frame++) { orange.update(dt); white.update(dt); for (const fox of [orange, white]) journal.observe(fox, 1_700_000_000_000 + tick++); }
  assert.ok(journal.entries.some(entry => entry.kind === 'Bookshelf' && entry.who === '小橘'));
  assert.ok(journal.entries.some(entry => entry.kind === 'Food' && entry.who === '小白'));
  assert.deepEqual(new LifeJournal(JSON.parse(JSON.stringify(journal.entries))).entries, journal.entries);
  const coat = [];
  createFoxVisual(foxLooks.white).root.traverse(node => { if (node.material && !Array.isArray(node.material) && node.material.color) coat.push(node.material.color.getHexString()); });
  assert.ok(coat.includes('efe9e0') && coat.includes('c9a35c') && !coat.includes('bc713f'));
  orange.dispose(); white.dispose();
});
