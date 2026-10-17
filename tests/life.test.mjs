import test from 'node:test';
import assert from 'node:assert/strict';
import { Character } from '../src/Character.ts';
import { eatLayout } from '../src/scene.ts';
import { JOURNAL_LIMIT, LifeJournal, lifePresentation } from '../src/life.ts';

test('real player actions record only the active moment, once, and unlock after returning home', () => {
  for (const [kind, method] of [
    ['Window', 'requestWindowObserve'], ['Bed', 'requestSleep'],
    ['Bookshelf', 'requestRead'], ['Food', 'requestEat'],
  ]) {
    const fox = new Character(eatLayout, () => 0.5);
    const journal = new LifeJournal();
    assert.equal(fox[method](), true);
    assert.equal(journal.observe(fox, 1000), false, 'walking is not a life moment');
    assert.equal(lifePresentation(fox).locked, true);
    assert.equal(lifePresentation(fox).active, kind);
    assert.equal(fox.requestWindowObserve(), false, 'a second invitation cannot overwrite the first');
    let observedProgress = false;
    for (let frame = 0; frame < 2400; frame++) {
      fox.update(1 / 60);
      journal.observe(fox, 1000 + frame);
      const status = lifePresentation(fox);
      if (status.progress !== null) {
        observedProgress = true;
        assert.ok(status.progress >= 0 && status.progress <= 100);
      }
      if (fox.state === 'Idle') break;
    }
    assert.equal(fox.state, 'Idle');
    assert.equal(observedProgress, true);
    assert.deepEqual(journal.entries.map(entry => [entry.kind, entry.source]), [[kind, 'player']]);
    assert.equal(lifePresentation(fox).locked, false);
    assert.equal(lifePresentation(fox).active, null);
    const restored = new LifeJournal(JSON.parse(JSON.stringify(journal.entries)));
    assert.deepEqual(restored.entries, journal.entries, 'reload preserves actual recorded moments');
  }
});

test('autonomous moments and interrupted actions keep their actual origin without phantom entries', () => {
  const fox = new Character(eatLayout, () => 0.7);
  const journal = new LifeJournal();
  for (let frame = 0; frame < 20000 && fox.readPhase !== 'read'; frame++) {
    fox.update(1 / 60);
    journal.observe(fox, 1000 + frame);
  }
  assert.equal(fox.readPhase, 'read');
  assert.equal(journal.entries[0].kind, 'Bookshelf');
  assert.equal(journal.entries[0].source, 'autonomous');
  const count = journal.entries.length;
  assert.equal(fox.requestEat(), true);
  journal.observe(fox, 50000);
  assert.equal(journal.entries.length, count, 'safe exit does not record a meal');
  for (let frame = 0; frame < 3000 && fox.eatPhase !== 'eat'; frame++) {
    fox.update(1 / 60);
    journal.observe(fox, 50001 + frame);
  }
  assert.equal(fox.eatPhase, 'eat');
  assert.equal(journal.entries.length, count + 1);
  assert.equal(journal.entries[0].kind, 'Food');
  assert.equal(journal.entries[0].source, 'player');
});

test('journal tolerates damaged storage, bounds history, and copies valid entries', () => {
  for (const invalid of [null, {}, 'bad', 123]) assert.deepEqual(new LifeJournal(invalid).entries, []);
  const valid = { kind: 'Bed', at: 1000, source: 'autonomous', injected: '<script>' };
  const journal = new LifeJournal([null, 3, {}, { ...valid, kind: '__proto__' }, { ...valid, kind: { toString: null } },
    { ...valid, at: Infinity }, { ...valid, at: 9e15 }, { ...valid, source: 'anything' }, valid]);
  assert.deepEqual(journal.entries, [{ kind: 'Bed', at: 1000, source: 'autonomous' }]);
  valid.at = 2000;
  assert.equal(journal.entries[0].at, 1000);
  const full = new LifeJournal(Array.from({ length: 60 }, (_, i) => ({ kind: 'Food', at: 1000 + i, source: 'player' })));
  assert.equal(full.entries.length, JOURNAL_LIMIT);
  const fox = new Character(eatLayout);
  fox.requestWindowObserve();
  for (let frame = 0; frame < 2400 && fox.state !== 'Observe'; frame++) fox.update(1 / 60);
  full.observe(fox, 9999);
  assert.equal(full.entries.length, JOURNAL_LIMIT);
  assert.equal(full.entries[0].kind, 'Window');
});
