export const HOME_MUSIC = { title: '窗邊慢慢', bpm: 66, bars: 24, beatsPerBar: 3 } as const;

/** Original 24-bar miniature: felt-style piano, open voicings, breathing room, no percussion. */
export function homeMusicScore() {
  const beat = 60 / HOME_MUSIC.bpm;
  const chords = [
    [48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 55, 57], [43, 50, 55, 57, 62],
    [40, 47, 50, 55, 59], [45, 52, 55, 59, 62], [38, 45, 48, 52, 57], [43, 50, 55, 57, 59],
  ];
  const melody = [
    [76, 74], [72], [69, 67], [], [71, 67], [69], [65, 64], [67],
    [72], [71, 69], [67], [69, 74], [], [72, 71], [69], [67],
    [76, 74], [72], [69], [], [71, 67], [69, 67], [65, 64], [62],
  ];
  const notes: Array<{ time: number; midi: number; gain: number; pan: number; pad: boolean }> = [];
  for (let bar = 0; bar < HOME_MUSIC.bars; bar++) {
    const chord = chords[bar % 8]!, start = bar * 3 * beat;
    notes.push({ time: start, midi: chord[0]!, gain: .042, pan: -.16, pad: false });
    // The middle phrase thins out rather than adding layers on every repeat.
    for (const [i, offset] of [0.18, 1.05, 2.15].entries()) {
      if (bar >= 8 && bar < 16 && i === 1) continue;
      notes.push({ time: start + offset * beat + (bar % 3) * .012, midi: chord[i + 1]!,
        gain: .026 - i * .003, pan: -.22 + i * .20, pad: false });
    }
    melody[bar]!.forEach((midi, i) => notes.push({ time: start + (.48 + i * 1.32) * beat,
      midi, gain: .032 - (bar >= 8 && bar < 16 ? .006 : 0), pan: .13, pad: false }));
    if (bar % 2 === 0) notes.push({ time: start, midi: chord[2]!, gain: .006, pan: -.28, pad: true });
  }
  return { duration: HOME_MUSIC.bars * HOME_MUSIC.beatsPerBar * beat, notes };
}

export function renderHomeMusic(sampleRate: number): [Float32Array, Float32Array] {
  const score = homeMusicScore(), count = Math.round(score.duration * sampleRate);
  const left = new Float32Array(count), right = new Float32Array(count);
  for (const note of score.notes) {
    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    const length = note.pad ? 6 : 5.4;
    const start = Math.round(note.time * sampleRate);
    for (let i = 0; i < length * sampleRate; i++) {
      const t = i / sampleRate;
      const release = Math.max(0, Math.min(1, (length - t) / 1.4));
      const attack = 1 - Math.exp(-t / (note.pad ? .8 : .028));
      let value = 0;
      if (note.pad) value = (Math.sin(2 * Math.PI * frequency * t) + Math.sin(2 * Math.PI * frequency * 1.0014 * t)) * .5 * Math.exp(-t * .28);
      else for (let partial = 1; partial <= 5; partial++) {
        const weight = [0, .78, .16, .045, .012, .003][partial]!;
        value += Math.sin(2 * Math.PI * frequency * partial * (1 + .00011 * partial * partial) * t)
          * weight * Math.exp(-t * (.62 + partial * .32));
      }
      value *= attack * release * release * note.gain;
      const at = (start + i) % count;
      left[at]! += value * Math.sqrt((1 - note.pan) / 2);
      right[at]! += value * Math.sqrt((1 + note.pan) / 2);
    }
  }
  // A few low-level, diffuse reflections wrap at the loop boundary with the notes.
  const dryL = left.slice(), dryR = right.slice();
  for (const [delay, gain] of [[.173, .16], [.317, .13], [.463, .1], [.719, .075], [1.103, .045]]) {
    const offset = Math.round(delay! * sampleRate);
    for (let i = 0; i < count; i++) {
      const at = (i + offset) % count;
      left[at]! += dryR[i]! * gain!; right[at]! += dryL[i]! * gain! * .93;
    }
  }
  return [left, right];
}
