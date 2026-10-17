import { mkdirSync, writeFileSync } from 'node:fs';
import { renderHomeMusic } from '../src/homeMusic.ts';

const rate = 24000;
const channels = renderHomeMusic(rate);
const count = channels[0].length;
const wav = Buffer.alloc(44 + count * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(count * 4, 40);
for (let i = 0; i < count; i++) for (let side = 0; side < 2; side++)
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, channels[side][i])) * 32767), 44 + i * 4 + side * 2);
mkdirSync('.cache/audio', { recursive: true });
writeFileSync('.cache/audio/window-afternoon.wav', wav);
console.log(JSON.stringify({ seconds: count / rate, sampleRate: rate, channels: 2, output: '.cache/audio/window-afternoon.wav' }));
