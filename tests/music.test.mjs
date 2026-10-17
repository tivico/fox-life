import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeMusicScore, renderHomeMusic, HOME_MUSIC } from '../src/homeMusic.ts';

test('original music has a full 24-bar phrase with rests, varied voicings and no percussion', () => {
  const score = homeMusicScore();
  assert.equal(HOME_MUSIC.bpm, 66);
  assert.ok(score.duration > 60 && score.duration < 70);
  assert.ok(score.notes.every(note => note.time >= 0 && note.time < score.duration && note.midi >= 38 && note.midi <= 76));
  const middle = score.notes.filter(note => note.time >= score.duration / 3 && note.time < 2 * score.duration / 3);
  assert.ok(middle.length < score.notes.length / 3, 'middle phrase leaves more breathing room');
});

test('music renders bounded stereo audio, with continuous wrapped tails at the loop boundary', () => {
  const rate = 12000, channels = renderHomeMusic(rate);
  assert.equal(channels.length, 2); assert.equal(channels[0].length, Math.round(homeMusicScore().duration * rate));
  let difference = 0;
  for (const channel of channels) {
    let peak = 0, energy = 0;
    for (const sample of channel) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
    assert.ok(peak > .02 && peak < .2);
    assert.ok(energy / channel.length > .000001);
    assert.ok(Math.abs(channel[0] - channel.at(-1)) < .005, 'no discontinuity at the cyclic join');
  }
  for (let i = 0; i < channels[0].length; i++) difference += Math.abs(channels[0][i] - channels[1][i]);
  assert.ok(difference > 1, 'stereo reflections are distinct');
});

test('all shipped audio assets are local Ogg files with license and source provenance', () => {
  let bytes = 0;
  for (const name of ['window-afternoon', 'leaves-gentle', ...[0, 1, 2].flatMap(i => [`step-wood-${i}`, `step-rug-${i}`])]) {
    const data = readFileSync(new URL(`../assets/audio/${name}.ogg`, import.meta.url));
    assert.equal(data.subarray(0, 4).toString(), 'OggS'); bytes += data.length;
  }
  assert.ok(bytes < 1024 * 1024, 'entire audio addition remains below one megabyte');
  const sources = readFileSync(new URL('../assets/audio/README.md', import.meta.url), 'utf8');
  assert.match(sources, /575645/); assert.match(sources, /kenney.nl/); assert.match(sources, /CC0/);
});
