import { SoundCues, type SoundSnapshot } from './SoundCues.ts';
import { soundSamples, type SoundKind } from './soundDesign.ts';

export interface AudioPreferences { enabled: boolean; music: number; ambience: number; effects: number }
export interface HomeAudioAssets { music?: string; wind?: string; steps?: Partial<Record<'step-wood' | 'step-rug', string[]>> }
export type AudioChannel = 'music' | 'ambience' | 'effects';
export const AUDIO_KEY = 'fox-life.audio.v2';
export const LEGACY_AUDIO_KEY = 'fox-life.audio.v1';
export function audioPreferences(value: unknown): AudioPreferences {
  const source = value && typeof value === 'object' ? value as Partial<AudioPreferences> : {};
  const volume = (n: unknown, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
  return { enabled: source.enabled === true, music: volume(source.music, .55), ambience: volume(source.ambience, .3), effects: volume(source.effects, .5) };
}

export class HomeAudio {
  preferences: AudioPreferences;
  private context: AudioContext | null = null;
  private music: GainNode | null = null;
  private ambience: GainNode | null = null;
  private effects: GainNode | null = null;
  private musicLoop: AudioBufferSourceNode | null = null;
  private windVoice: AudioBufferSourceNode | null = null;
  private readonly assets: HomeAudioAssets;
  private readonly abort = new AbortController();
  private loading: Promise<void> | null = null;
  private ready = false;
  private stepVariant = 0;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices = new Set<AudioBufferSourceNode>();
  private readonly cues = new SoundCues();
  private birdTime = 6;
  private windTime = 9;
  private awake = false;
  private disposed = false;
  private operation = 0;
  constructor(preferences: AudioPreferences, assets: HomeAudioAssets = {}) { this.preferences = audioPreferences(preferences); this.assets = assets; }
  get running() { return this.awake && this.context?.state === 'running'; }
  private buffer(kind: Exclude<SoundKind, 'step-wood' | 'step-rug'>) {
    if (!this.buffers.has(kind)) {
      const ctx = this.context!, samples = soundSamples(kind, ctx.sampleRate);
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.copyToChannel(samples, 0); this.buffers.set(kind, buffer);
    }
    return this.buffers.get(kind)!;
  }
  private async loadAssets() {
    if (this.loading) return this.loading;
    const urls: Array<[string, string]> = [];
    if (this.assets.music) urls.push(['music', this.assets.music]);
    if (this.assets.wind) urls.push(['wind', this.assets.wind]);
    for (const kind of ['step-wood', 'step-rug'] as const)
      this.assets.steps?.[kind]?.forEach((url, i) => urls.push([`${kind}/${i}`, url]));
    this.loading = Promise.all(urls.filter(([key]) => !this.buffers.has(key)).map(async ([key, url]) => {
      const response = await fetch(url, { signal: this.abort.signal });
      if (!response.ok) throw new Error('Audio asset could not be loaded');
      const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
      if (!this.disposed) this.buffers.set(key, buffer);
    })).then(() => {});
    try { await this.loading; } finally { this.loading = null; }
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
        this.music = ctx.createGain(); this.ambience = ctx.createGain(); this.effects = ctx.createGain();
        this.music.gain.value = this.ambience.gain.value = this.effects.gain.value = 0;
        this.music.connect(master); this.ambience.connect(master); this.effects.connect(master);
      }
      await this.context.resume();
      await this.loadAssets();
      if (this.disposed || operation !== this.operation) return false;
      if (!this.musicLoop && this.buffers.has('music')) {
        this.musicLoop = this.context.createBufferSource(); this.musicLoop.buffer = this.buffers.get('music')!;
        this.musicLoop.loop = true; this.musicLoop.connect(this.music!); this.musicLoop.start();
      }
      this.ready = true;
      this.awake = true; this.preferences.enabled = true; this.cues.reset(); this.applyVolumes();
      return true;
    } catch {
      if (operation === this.operation) {
        this.awake = false; this.applyVolumes();
        if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
      }
      return false;
    }
  }
  setVolume(channel: AudioChannel, value: number) {
    this.preferences = audioPreferences({ ...this.preferences, [channel]: value }); this.applyVolumes();
  }
  private applyVolumes() {
    if (!this.context || this.context.state === 'closed') return;
    this.music!.gain.setTargetAtTime(this.awake ? this.preferences.music : 0, this.context.currentTime, .45);
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
    if (!this.context || !this.ready || !this.preferences.enabled || this.disposed) return;
    const operation = ++this.operation;
    try {
      await this.context.resume();
      if (this.disposed || operation !== this.operation) return;
      this.awake = true; this.cues.reset(); this.applyVolumes();
    } catch { this.awake = false; }
  }
  preview(kind: 'page' | 'step-wood' | 'step-rug' | 'wind' = 'page') { this.play(kind, 0, kind === 'wind'); }
  private play(kind: SoundKind | 'wind', pan: number, ambient = false) {
    if (!this.running || this.voices.size >= 12 || !(kind === 'radio' ? this.preferences.music : ambient ? this.preferences.ambience : this.preferences.effects)) return;
    let buffer: AudioBuffer | undefined;
    if (kind === 'wind') buffer = this.buffers.get('wind');
    else if (kind === 'step-wood' || kind === 'step-rug') {
      const count = this.assets.steps?.[kind]?.length ?? 0;
      if (count) buffer = this.buffers.get(`${kind}/${this.stepVariant++ % count}`);
    } else buffer = this.buffer(kind);
    if (!buffer) return;
    if (kind === 'wind') this.windVoice?.stop();
    const ctx = this.context!, voice = ctx.createBufferSource(), panner = ctx.createStereoPanner();
    voice.buffer = buffer; voice.playbackRate.value = kind === 'bird' || kind === 'wind' ? 1 : .98 + Math.random() * .04;
    panner.pan.value = Math.max(-.75, Math.min(.75, pan));
    voice.connect(panner); panner.connect(kind === 'radio' ? this.music! : ambient ? this.ambience! : this.effects!);
    this.voices.add(voice);
    if (kind === 'wind') this.windVoice = voice;
    voice.onended = () => { if (this.windVoice === voice) this.windVoice = null; this.voices.delete(voice); voice.disconnect(); panner.disconnect(); };
    voice.start();
  }
  update(fox: SoundSnapshot, dt: number, pan = 0) {
    if (!this.running || dt <= 0) return;
    this.cues.update(fox, dt).forEach(cue => this.play(cue, pan));
    this.birdTime -= dt;
    this.windTime -= dt;
    if (this.birdTime <= 0) { this.play('bird', -.35, true); this.birdTime = 20 + Math.random() * 15; }
    if (this.windTime <= 0) { this.play('wind', -.2, true); this.windTime = 20 + Math.random() * 13; }
  }
  dispose() {
    this.disposed = true; this.abort.abort(); this.pause(); this.musicLoop?.stop(); this.musicLoop?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.buffers.clear();
  }
}
