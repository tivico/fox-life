import { SoundCues, type SoundSnapshot } from './SoundCues.ts';
import { soundSamples, type SoundKind } from './soundDesign.ts';

export interface AudioPreferences { enabled: boolean; ambience: number; effects: number }
export const AUDIO_KEY = 'fox-life.audio.v1';
export function audioPreferences(value: unknown): AudioPreferences {
  const source = value && typeof value === 'object' ? value as Partial<AudioPreferences> : {};
  const volume = (n: unknown, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
  return { enabled: source.enabled === true, ambience: volume(source.ambience, .65), effects: volume(source.effects, .7) };
}

export class HomeAudio {
  preferences: AudioPreferences;
  private context: AudioContext | null = null;
  private ambience: GainNode | null = null;
  private effects: GainNode | null = null;
  private wind: AudioBufferSourceNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices = new Set<AudioBufferSourceNode>();
  private readonly cues = new SoundCues();
  private birdTime = 6;
  private awake = false;
  private disposed = false;
  private operation = 0;
  constructor(preferences: AudioPreferences) { this.preferences = audioPreferences(preferences); }
  get running() { return this.awake && this.context?.state === 'running'; }
  private buffer(kind: SoundKind | 'wind') {
    if (!this.buffers.has(kind)) {
      const ctx = this.context!, samples = soundSamples(kind, ctx.sampleRate);
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.copyToChannel(samples, 0); this.buffers.set(kind, buffer);
    }
    return this.buffers.get(kind)!;
  }
  // Call only inside an explicit sound button gesture, including after a saved opt-in.
  async enable() {
    if (this.disposed) return false;
    const operation = ++this.operation;
    try {
      if (!this.context) {
        const ctx = new AudioContext(); this.context = ctx;
        const master = ctx.createGain(); master.gain.value = .7;
        const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -18; limiter.ratio.value = 4;
        master.connect(limiter); limiter.connect(ctx.destination);
        this.ambience = ctx.createGain(); this.effects = ctx.createGain();
        this.ambience.gain.value = this.effects.gain.value = 0;
        this.ambience.connect(master); this.effects.connect(master);
        this.wind = ctx.createBufferSource(); this.wind.buffer = this.buffer('wind'); this.wind.loop = true;
        this.wind.connect(this.ambience); this.wind.start();
      }
      await this.context.resume();
      if (this.disposed || operation !== this.operation) return false;
      this.awake = true; this.preferences.enabled = true; this.cues.reset(); this.applyVolumes();
      return true;
    } catch { this.awake = false; return false; }
  }
  setVolume(channel: 'ambience' | 'effects', value: number) {
    this.preferences = audioPreferences({ ...this.preferences, [channel]: value }); this.applyVolumes();
  }
  private applyVolumes() {
    if (!this.context) return;
    this.ambience!.gain.setTargetAtTime(this.awake ? this.preferences.ambience : 0, this.context.currentTime, .08);
    this.effects!.gain.setTargetAtTime(this.awake ? this.preferences.effects : 0, this.context.currentTime, .03);
  }
  pause() {
    this.operation++;
    this.awake = false; this.cues.reset(); this.applyVolumes();
    this.voices.forEach(voice => { voice.stop(); voice.disconnect(); }); this.voices.clear();
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }
  mute() { this.preferences.enabled = false; this.pause(); }
  async resumeVisible() {
    if (!this.context || !this.preferences.enabled || this.disposed) return;
    const operation = ++this.operation;
    try {
      await this.context.resume();
      if (this.disposed || operation !== this.operation) return;
      this.awake = true; this.cues.reset(); this.applyVolumes();
    } catch { this.awake = false; }
  }
  preview() { this.play('page', 0); }
  private play(kind: SoundKind, pan: number, ambient = false) {
    if (!this.running || this.voices.size >= 12 || !(ambient ? this.preferences.ambience : this.preferences.effects)) return;
    const ctx = this.context!, voice = ctx.createBufferSource(), panner = ctx.createStereoPanner();
    voice.buffer = this.buffer(kind); voice.playbackRate.value = kind === 'bird' ? 1 : .96 + Math.random() * .08;
    panner.pan.value = Math.max(-.75, Math.min(.75, pan));
    voice.connect(panner); panner.connect(ambient ? this.ambience! : this.effects!);
    this.voices.add(voice);
    voice.onended = () => { this.voices.delete(voice); voice.disconnect(); panner.disconnect(); };
    voice.start();
  }
  update(fox: SoundSnapshot, dt: number, pan = 0) {
    if (!this.running || dt <= 0) return;
    this.cues.update(fox, dt).forEach(cue => this.play(cue, pan));
    this.birdTime -= dt;
    if (this.birdTime <= 0) { this.play('bird', -.35, true); this.birdTime = 12 + Math.random() * 13; }
  }
  dispose() {
    this.disposed = true; this.pause(); this.wind?.stop(); this.wind?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.buffers.clear();
  }
}
