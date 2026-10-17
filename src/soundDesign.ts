export type SoundKind = 'step-wood' | 'step-rug' | 'page' | 'sweep' | 'crunch' | 'cloth' | 'yarn' | 'bird';

/** Original, deterministic Foley synthesis. Shared by playback and exported listening samples. */
export function soundSamples(kind: Exclude<SoundKind, 'step-wood' | 'step-rug'>, sampleRate: number, seed = 73) {
  const duration = { page: .65, sweep: 1.05, crunch: .18, cloth: .48, yarn: .2, bird: .72 }[kind];
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let low = 0, softer = 0, phase = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
  const cutoff = kind === 'cloth' ? 900 : 2600;
  const alpha = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate, u = t / duration;
    const white = random(); low += alpha * (white - low); softer += .015 * (low - softer);
    const envelope = Math.pow(Math.sin(Math.PI * u), 2);
    let value = 0;
    if (kind === 'bird') {
      const phrase = t < .24 ? t / .24 : (t - .36) / .28;
      const voice = phrase > 0 && phrase < 1 ? Math.sin(Math.PI * phrase) ** 3 : 0;
      const frequency = 1750 + 800 * Math.sin(Math.PI * Math.max(0, Math.min(1, phrase))) + 70 * Math.sin(t * 80);
      phase += 2 * Math.PI * frequency / sampleRate;
      value = Math.sin(phase) * voice * .035;
    } else if (kind === 'page') value = (low - softer) * envelope * (.07 + .1 * Math.sin(u * Math.PI) ** 6);
    else if (kind === 'sweep') value = (low - softer) * envelope * .17 * (.85 + .15 * Math.sin(t * 45));
    else if (kind === 'crunch') value = white * Math.exp(-t * 25) * (.5 + .5 * Math.cos(t * 150)) * .09 * Math.min(1, t * 600);
    else if (kind === 'cloth') value = low * envelope * .16;
    else value = (low * .08 + Math.sin(t * 2 * Math.PI * 150) * .04) * envelope * Math.exp(-t * 15);
    samples[i] = value;
  }
  return samples;
}
