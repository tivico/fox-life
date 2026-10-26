import test from 'node:test';
import assert from 'node:assert/strict';
import { LifeNeeds } from '../src/Needs.ts';
import { Character } from '../src/Character.ts';
import { kitchenHomeLayout, companionLayout } from '../src/scene.ts';
import { Household } from '../src/Household.ts';
import { PairPlanner } from '../src/Pair.ts';
import { foxLooks } from '../src/createFoxVisual.ts';
import { lifePresentation } from '../src/life.ts';

const lcg = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const advance = (needs, seconds, kind = null, phase = null, walking = false) => {
  for (let i = 0; i < seconds * 20; i++) needs.update(.05, kind, phase, walking);
};

test('needs change only with foreground time and actual eating, sleeping or resting phases', () => {
  const needs = new LifeNeeds({ hunger: .8, energy: .2 });
  const initial = needs.snapshot;
  for (const dt of [0, -1, Infinity, NaN]) needs.update(dt, 'Bed', 'sleep', false);
  assert.deepEqual(needs.snapshot, initial);
  advance(needs, 6, 'Food', 'approach', true);
  assert.ok(needs.snapshot.hunger > initial.hunger && needs.snapshot.energy < initial.energy);
  advance(needs, 6, 'Food', 'eat');
  assert.ok(needs.snapshot.hunger < .25, 'eating, rather than walking toward food, satisfies hunger');
  advance(needs, 8, 'Bed', 'sleep');
  assert.ok(needs.snapshot.energy > .9);
  advance(needs, 30, 'Food', 'eat');
  advance(needs, 30, 'Bed', 'sleep');
  assert.equal(needs.snapshot.hunger >= 0 && needs.snapshot.energy <= 1, true);
  const resting = new LifeNeeds({ energy: .3 });
  advance(resting, 12, 'GardenRest', 'active');
  assert.ok(resting.snapshot.energy > .3 && resting.snapshot.energy < .5, 'a short rest helps less than sleep');
  const snapshot = resting.snapshot; snapshot.energy = 0;
  assert.ok(resting.snapshot.energy > .3, 'reading a snapshot cannot mutate the live need');
});

test('hunger, tiredness and preferences change choices without eliminating other activities', () => {
  const sample = options => {
    const needs = new LifeNeeds(options), counts = {};
    for (let i = 0; i < 1000; i++) {
      const kind = needs.choose(['Bed', 'Food', 'Bookshelf', 'WaterPlants', 'Exercise'], 3, (i + .5) / 1000) ?? 'Walk';
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    return counts;
  };
  const content = sample({ hunger: .1, energy: .9 }), hungry = sample({ hunger: .9, energy: .9 });
  const tired = sample({ hunger: .1, energy: .1 });
  assert.ok(hungry.Food > content.Food * 3 && tired.Bed > content.Bed * 3);
  assert.ok(hungry.Walk > 0 && hungry.Bookshelf > 0 && tired.Exercise > 0);
  const reader = sample({ preference: 'reader' }), gardener = sample({ preference: 'gardener' });
  assert.ok(reader.Bookshelf > gardener.Bookshelf && gardener.WaterPlants > reader.WaterPlants);
});

test('a hungry, tired fox still accepts the player invitation and pauses needs with zero time', () => {
  const fox = new Character(kitchenHomeLayout, lcg(7), { life: { hunger: .95, energy: .1 } });
  try {
    assert.match(lifePresentation(fox).title, /睏/);
    const before = fox.needs;
    fox.update(0); fox.update(Infinity);
    assert.deepEqual(fox.needs, before);
    assert.equal(fox.requestRead(), true);
    assert.equal(fox.source, 'Player Command');
    let seconds = 0;
    while (fox.readPhase !== 'read' && seconds < 60) { fox.update(.05); seconds += .05; }
    assert.equal(fox.readPhase, 'read', 'needs never veto or replace the requested action');
    assert.match(lifePresentation(fox).title, /故事/);
  } finally { fox.dispose(); }
});

test('twenty minutes with each preference retain varied activities and recover food and sleep needs', () => {
  for (const preference of ['reader', 'gardener']) {
    const fox = new Character(kitchenHomeLayout, lcg(42), { life: { preference } });
    const seen = new Set(); let sleeping = 0, eating = 0, last = null, meals = 0, naps = 0;
    try {
      for (let i = 0; i < 1200 * 20; i++) {
        fox.update(.05);
        const target = fox.targetLabel;
        if (target) seen.add(target);
        if (fox.sleepPhase === 'sleep') { sleeping += .05; if (last !== 'sleep') naps++; }
        if (fox.eatPhase === 'eat') { eating += .05; if (last !== 'eat') meals++; }
        last = fox.sleepPhase === 'sleep' ? 'sleep' : fox.eatPhase === 'eat' ? 'eat' : null;
        assert.ok(fox.needs.hunger >= 0 && fox.needs.hunger <= 1 && fox.needs.energy >= 0 && fox.needs.energy <= 1);
      }
      assert.ok(meals >= 1 && naps >= 1, `${preference}: meals ${meals}, sleeps ${naps}`);
      assert.ok(seen.size >= 8, `${preference}: ${[...seen]}`);
      assert.ok(sleeping + eating < 1200 * .25, 'eating and sleeping do not dominate the day');
      assert.ok(fox.needs.hunger < .95 && fox.needs.energy > .05, JSON.stringify(fox.needs));
    } finally { fox.dispose(); }
  }
});

test('the live household combines preferences, needs and shared activities without stale reservations', t => {
  for (const seeds of [[11, 29], [44, 116]]) {
    const household = new Household();
    const orange = new Character(kitchenHomeLayout, lcg(seeds[0]), { name: '小橘', household, life: { preference: 'reader' } });
    const white = new Character(companionLayout, lcg(seeds[1]), { name: '小白', household, look: foxLooks.white, life: { preference: 'gardener' } });
    white.root.position.set(-.9, 0, 5.6); white.yieldTo(orange);
    const foxes = [orange, white], planner = new PairPlanner(foxes, lcg(12));
    const counts = [{}, {}], previous = [null, null], eatingSleeping = [0, 0];
    const waits = [0, 0];
    try {
      for (let frame = 0; frame < 1200 * 20; frame++) {
        foxes.forEach(fox => fox.update(.05)); planner.update(.05);
        foxes.forEach((fox, index) => {
          const pair = fox.together;
          const kind = pair?.phase === 'active' ? pair.kind : fox.sleepPhase === 'sleep' ? 'Bed' : fox.eatPhase === 'eat' ? 'Food'
            : fox.readPhase === 'read' ? 'Bookshelf' : fox.livingActivity?.phase === 'active' ? fox.livingActivity.kind
            : fox.gardenActivity?.phase === 'active' ? fox.gardenActivity.kind : fox.kitchenActivity?.phase === 'active' ? fox.kitchenActivity.kind : null;
          if (kind && kind !== previous[index]) counts[index][kind] = (counts[index][kind] ?? 0) + 1;
          previous[index] = kind;
          if (kind === 'Bed' || kind === 'Food') eatingSleeping[index] += .05;
          waits[index] = pair?.phase === 'wait' ? waits[index] + .05 : 0;
          assert.ok(waits[index] <= 30.1, 'a pair cannot wait forever');
        });
        for (const group of ['reading', 'dining', 'cleaning', 'living', 'garden', 'kitchen']) {
          const owner = household.owner(group);
          if (owner && !foxes.includes(owner)) {
            assert.equal(owner.kind, 'WatchTVTogether');
            assert.ok(foxes.some(fox => fox.together?.kind === 'WatchTVTogether'), 'a shared claim always has a live member');
          }
        }
      }
      foxes.forEach((fox, index) => {
        assert.ok(counts[index].Bed >= 1 && counts[index].Food >= 1, JSON.stringify(counts[index]));
        assert.ok(Object.keys(counts[index]).length >= 8, 'both foxes keep a varied day');
        assert.ok(eatingSleeping[index] < 1200 * .25);
        assert.ok(fox.needs.hunger < .98 && fox.needs.energy > .02, JSON.stringify(fox.needs));
      });
      t.diagnostic(JSON.stringify({ seeds, counts, eatingSleeping, finalNeeds: foxes.map(fox => fox.needs) }));
    } finally { orange.dispose(); white.dispose(); }
    assert.ok(['reading', 'dining', 'cleaning', 'living', 'garden', 'kitchen'].every(group => household.owner(group) === null));
  }
});
