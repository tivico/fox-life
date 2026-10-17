import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/Character.ts';
import { createScene, homeLayout } from '../src/scene.ts';
import { SoundCues } from '../src/SoundCues.ts';
import { soundSamples } from '../src/soundDesign.ts';
import { audioPreferences, HomeAudio } from '../src/HomeAudio.ts';
import { createFoxPerformance, foxPerformanceClips } from '../src/FoxPerformance.ts';
import { createYarnChoreography, YARN_TAPS } from '../src/YarnChoreography.ts';

test('sound follows real action clocks once across frame rates, never invitations or idle frames', () => {
  for (const dt of [1 / 20, 1 / 60, 1 / 144]) for (const [request, kind, count] of [
    ['requestClean', 'sweep', 3], ['requestRead', 'page', 1], ['requestEat', 'crunch', 3], ['requestPlay', 'yarn', 6],
  ]) {
    const fox = new Character(homeLayout, () => .45), cues = new SoundCues(), heard = [];
    cues.update(fox, dt); fox[request]();
    for (let i = 0; i < 90 / dt; i++) {
      fox.update(dt); heard.push(...cues.update(fox, dt));
      if (fox.state === 'Idle') break;
    }
    assert.equal(heard.filter(cue => cue === kind).length, count, `${request} at ${1 / dt} Hz`);
    assert.ok(heard.some(cue => cue.startsWith('step-')));
    fox.dispose();
  }
});

test('mute/background reset never replays missed sounds, and zero delta emits nothing', () => {
  const fox = new Character(homeLayout, () => .45), cues = new SoundCues();
  fox.requestRead();
  while (fox.readPhase !== 'read' || fox.readElapsed < 2.9) fox.update(1 / 60);
  cues.update(fox, 1 / 60);
  for (let i = 0; i < 200; i++) assert.deepEqual(cues.update(fox, 0), []);
  fox.update(.05); assert.ok(!cues.update(fox, .05).includes('page'));
  cues.reset();
  for (let i = 0; i < 70; i++) fox.update(1 / 60);
  assert.deepEqual(cues.update(fox, 1 / 60), [], 'enable mid-action is silent until next actual cue');
  fox.dispose();
});

test('a dozing reader rustles the page only when it visibly moves after waking', () => {
  const fox = new Character(homeLayout, () => .45), cues = new SoundCues();
  for (let reading = 1; reading <= 2; reading++) {
    fox.requestRead(); cues.reset(); const times = [];
    for (let i = 0; i < 60 * 60; i++) {
      fox.update(1 / 60);
      if (cues.update(fox, 1 / 60).includes('page')) times.push(fox.readElapsed);
      if (fox.state === 'Idle') break;
    }
    assert.equal(times.length, 1);
    assert.ok(reading === 1 ? times[0] > 4.2 && times[0] < 4.6 : times[0] > 3 && times[0] < 3.2);
  }
  fox.dispose();
});

test('footsteps use distance, rug/wood surfaces, and ignore teleports or turning in place', () => {
  const cues = new SoundCues();
  const fox = new Character(homeLayout, () => .45); fox.requestClean();
  cues.update(fox, .05); const heard = [];
  for (let i = 0; i < 600; i++) { fox.update(.05); heard.push(...cues.update(fox, .05)); }
  assert.ok(heard.includes('step-rug') && heard.includes('step-wood'));
  cues.reset(); cues.update(fox, .05); fox.root.position.x += 10;
  assert.ok(!cues.update(fox, .05).some(cue => cue.startsWith('step-')));
  fox.dispose();
});

test('original sound buffers are finite, quiet, reproducible and begin/end without DC clicks', () => {
  for (const kind of ['bird', 'page', 'sweep', 'crunch', 'cloth', 'yarn']) {
    const buffer = soundSamples(kind, 24000);
    assert.deepEqual(buffer, soundSamples(kind, 24000));
    let energy = 0, peak = 0;
    for (const value of buffer) { assert.ok(Number.isFinite(value)); peak = Math.max(peak, Math.abs(value)); energy += value * value; }
    assert.ok(peak > .001 && peak < .4, `${kind} headroom`);
    assert.ok(energy / buffer.length > .0000001);
    assert.ok(Math.abs(buffer[0]) < .0001 && Math.abs(buffer.at(-1)) < .001);
  }
});

test('preferences survive invalid storage and audio remains uninitialized until explicit opt-in', () => {
  assert.deepEqual(audioPreferences({ enabled: 'yes', ambience: NaN, effects: 9 }), { enabled: false, music: .55, ambience: .3, effects: 1 });
  assert.deepEqual(audioPreferences({ enabled: true, ambience: .2, effects: .4 }), { enabled: true, music: .55, ambience: .2, effects: .4 }, 'v1 preferences keep customized levels and gain a music level');
  const audio = new HomeAudio(audioPreferences({ enabled: true }));
  assert.equal(audio.running, false, 'saved opt-in never bypasses autoplay gesture');
  audio.setVolume('ambience', -.5); assert.equal(audio.preferences.ambience, 0);
  audio.mute(); assert.equal(audio.preferences.enabled, false); audio.dispose();
});

test('audio opt-in, mute, background resume and disposal cannot leave a running or duplicate audio graph', async () => {
  const OriginalContext = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  let created = 0, started = 0, stopped = 0, context, fetched = 0;
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ connect() {}, disconnect() {} });
  class TestContext {
    state = 'suspended'; sampleRate = 8000; currentTime = 0; destination = node();
    constructor() { created++; context = this; }
    createGain() { return { ...node(), gain: param() }; }
    createDynamicsCompressor() { return { ...node(), threshold: param(), ratio: param() }; }
    createBuffer(_channels, length) { return { length, copyToChannel() {} }; }
    async decodeAudioData() { return { length: 128 }; }
    createBufferSource() { return { ...node(), playbackRate: param(), start() { started++; }, stop() { stopped++; }, onended: null }; }
    createStereoPanner() { return { ...node(), pan: param() }; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  }
  globalThis.AudioContext = TestContext;
  globalThis.fetch = async () => { fetched++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; };
  try {
    const audio = new HomeAudio(audioPreferences(null), { music: 'test:music', wind: 'test:leaves', steps: { 'step-wood': ['test:wood'], 'step-rug': ['test:rug'] } });
    assert.equal(created, 0); assert.equal(await audio.enable(), true);
    assert.equal(created, 1); assert.equal(started, 1, 'one persistent music source; wind no longer loops');
    assert.equal(fetched, 4);
    audio.preview(); assert.equal(started, 2);
    audio.mute(); assert.equal(audio.running, false); assert.equal(context.state, 'suspended'); assert.equal(stopped, 1);
    await audio.enable(); assert.equal(created, 1); assert.equal(started, 2, 'enabling reuses the context and music');
    assert.equal(fetched, 4, 'decoded assets are reused');
    audio.pause(); assert.equal(context.state, 'suspended');
    await audio.resumeVisible(); assert.equal(audio.running, true);
    audio.pause(); const pending = audio.resumeVisible(); audio.mute(); await pending;
    assert.equal(audio.running, false, 'a late resume never overrides mute');
    assert.equal(context.state, 'suspended');
    audio.dispose(); assert.equal(context.state, 'closed'); assert.equal(await audio.enable(), false);
  } finally { globalThis.AudioContext = OriginalContext; globalThis.fetch = originalFetch; }
});

test('authored performance clips crossfade, remain bounded, freeze on zero delta and do not accumulate', () => {
  const clips = foxPerformanceClips();
  assert.equal(new Set(clips.map(clip => clip.name)).size, 9);
  clips.forEach(clip => assert.equal(clip.validate(), true));
  for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
    const performance = createFoxPerformance(); let last;
    for (let cycle = 0; cycle < 3; cycle++) for (const clip of clips) {
      for (let i = 0; i < 2 / dt; i++) {
        const pose = performance.update(clip.name, dt);
        assert.ok(Math.abs(pose.gaze) < .3 && Math.abs(pose.nod) < .1);
        assert.ok(pose.eyes >= .1 && pose.eyes <= 1);
        if (last) assert.ok(Math.abs(last.gaze - pose.gaze) < .15, 'no hard pose switch');
        assert.deepEqual(performance.update(clip.name, 0), pose, 'background freezes clip time'); last = pose;
      }
    }
    performance.dispose();
  }
});

test('room atmosphere freezes with time, offers reduced motion and leaves world targets unchanged', () => {
  const { scene, atmosphere, windowParts } = createScene();
  const target = windowParts[0].matrixWorld.clone();
  const curtain = scene.getObjectByName('LinenCurtain'), leaf = scene.getObjectByName('PlantLeaf');
  const start = [curtain.rotation.z, leaf.rotation.z];
  for (let i = 0; i < 240; i++) atmosphere.update(1 / 60);
  assert.ok(Math.abs(curtain.rotation.z - start[0]) <= .0041);
  assert.ok(Math.abs(leaf.rotation.z - start[1]) <= .051);
  const paused = curtain.rotation.z; atmosphere.update(0); assert.equal(curtain.rotation.z, paused);
  atmosphere.update(1 / 60, true); assert.equal(scene.getObjectByName('TeaSteam').visible, false);
  assert.equal(curtain.rotation.z, 0); assert.ok(target.equals(windowParts[0].matrixWorld));
  assert.ok(new THREE.Box3().setFromObject(scene.getObjectByName('MantelClock')).max.y < 1.4);
});

test('yarn choreography pauses after each tap, stays in reach, and can restart after the clamped final frame', () => {
  const motion = createYarnChoreography();
  for (let round = 0; round < 3; round++) {
    assert.equal(motion.sample(0).x, 0);
    for (const tap of YARN_TAPS) {
      const a = motion.sample(tap + .55), b = motion.sample(tap + .72);
      assert.ok(Math.abs(a.x - b.x) < 1e-6, 'ball holds instead of oscillating or drifting');
    }
    for (let time = 0; time < 7.6; time += .01) {
      const pose = motion.sample(time);
      assert.ok(Math.abs(pose.x) <= .341 && pose.left >= 0 && pose.left <= 1 && pose.right >= 0 && pose.right <= 1);
    }
    motion.sample(7.6);
  }
  motion.dispose();
});
