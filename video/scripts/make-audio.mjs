// 動画の BGM と効果音を合成して public/audio/ に WAV で書き出す（素材のライセンスを気にしなくてよいよう、全部ここで作る）。
//
//   cd video && node scripts/make-audio.mjs
//
// 音色は正弦波・のこぎり波・ノイズを足し合わせただけの簡単なもの。音量は Remotion 側で調整する。

import { mkdir, writeFile } from "node:fs/promises";

const SR = 44100;
const OUT = "public/audio";

// ---------- 道具 ----------
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

/** buf の t 秒目から音 f(i, dt) を足す */
function add(out, t, sec, f, gain = 1) {
  const s = Math.floor(t * SR);
  const n = Math.floor(sec * SR);
  for (let i = 0; i < n && s + i < out.length; i++) out[s + i] += f(i, i / SR) * gain;
}

/** 1次のローパス（ノイズを丸くする） */
function lowpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) x[i] = y = (1 - a) * x[i] + a * y;
  return x;
}
function highpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0, px = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    x[i] = y = a * (y + v - px);
    px = v;
  }
  return x;
}

function normalize(x, peak = 0.8) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  return x;
}

function fade(x, inSec, outSec) {
  const a = Math.floor(inSec * SR), b = Math.floor(outSec * SR);
  for (let i = 0; i < a; i++) x[i] *= i / a;
  for (let i = 0; i < b; i++) x[x.length - 1 - i] *= i / b;
  return x;
}

async function wav(name, x) {
  const data = Buffer.alloc(44 + x.length * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + x.length * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // モノラル
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  await writeFile(`${OUT}/${name}.wav`, data);
  console.log("書き出し:", `${OUT}/${name}.wav`, `${(x.length / SR).toFixed(1)}秒`);
}

// ---------- 楽器 ----------
const env = (dt, a, d) => (dt < a ? dt / a : Math.exp(-(dt - a) / d));
/** やわらかいパッド（のこぎり波を少しずらして重ね、倍音を減らす） */
const pad = (freq, len) => (i, dt) => {
  let v = 0;
  for (const det of [-0.12, 0, 0.1]) {
    const f = freq * 2 ** (det / 12);
    for (let h = 1; h <= 5; h++) v += Math.sin(2 * Math.PI * f * h * dt) / (h * h);
  }
  const a = Math.min(1, dt / 0.35) * Math.min(1, (len - dt) / 0.4);
  return v * 0.18 * Math.max(0, a);
};
/** はじく音（アルペジオ） */
const pluck = (freq) => (i, dt) => (Math.sin(2 * Math.PI * freq * dt) + 0.35 * Math.sin(4 * Math.PI * freq * dt)) * Math.exp(-dt / 0.16);
const bass = (freq, len) => (i, dt) => Math.tanh(1.6 * Math.sin(2 * Math.PI * freq * dt)) * Math.min(1, dt / 0.01) * Math.exp(-dt / (len * 0.9));
const kick = () => (i, dt) => Math.sin(2 * Math.PI * (45 * dt + (75 * 0.05) * (1 - Math.exp(-dt / 0.05)))) * Math.exp(-dt / 0.14);
function noiseHit(sec, decay, hp) {
  const x = buf(sec);
  for (let i = 0; i < x.length; i++) x[i] = rnd() * Math.exp(-i / SR / decay);
  return highpass(x, hp);
}
const mixIn = (out, t, src, gain) => add(out, t, src.length / SR, (i) => src[i], gain);

/**
 * BGM。chords は1小節ずつのコード（構成音の MIDI 番号）。
 * drums: 0 = なし、1 = ハイハットだけ、2 = キック・クラップも
 */
function song({ bpm, bars, chords, sec, drumsFrom, fullFrom, light = false }) {
  const out = buf(sec);
  const beat = 60 / bpm;
  const bar = beat * 4;
  const hat = noiseHit(0.05, 0.012, 7000);
  const clap = lowpass(noiseHit(0.2, 0.05, 1200), 5000);
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    if (t0 >= sec) break;
    const ch = chords[b % chords.length];
    for (const n of ch) add(out, t0, bar + 0.4, pad(midi(n), bar + 0.4), light ? 0.8 : 1);
    add(out, t0, bar, bass(midi(ch[0] - 12), beat * 2), light ? 0.16 : 0.22);
    add(out, t0 + beat * 2, bar, bass(midi(ch[0] - 12), beat * 2), light ? 0.14 : 0.2);
    // 8分のアルペジオ（根音・3度・5度・オクターブ）
    const arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[2] + 12];
    arp.forEach((n, k) => {
      const t = t0 + (k * beat) / 2;
      add(out, t, 0.6, pluck(midi(n)), light ? 0.1 : 0.13);
      add(out, t + beat * 0.75, 0.6, pluck(midi(n)), light ? 0.03 : 0.04); // 付点8分のこだま
    });
    if (b >= drumsFrom) for (let k = 0; k < 8; k++) mixIn(out, t0 + (k * beat) / 2, hat, (k % 2 ? 0.05 : 0.08) * (light ? 0.7 : 1));
    if (!light && b >= fullFrom) {
      for (const k of [0, 2]) add(out, t0 + k * beat, 0.4, kick(), 0.55);
      add(out, t0 + beat * 2.5, 0.4, kick(), 0.3);
      for (const k of [1, 3]) mixIn(out, t0 + k * beat, clap, 0.22);
    }
    if (light && b >= fullFrom) add(out, t0, 0.4, kick(), 0.3);
  }
  return out;
}

// ---------- 効果音 ----------
function pop() {
  const x = buf(0.14);
  add(x, 0, 0.14, (i, dt) => Math.sin(2 * Math.PI * (520 * dt + 2600 * dt * dt)) * Math.exp(-dt / 0.035));
  return x;
}
function click() {
  const x = buf(0.06);
  add(x, 0, 0.003, () => rnd(), 0.5);
  lowpass(x, 3500);
  add(x, 0, 0.06, (i, dt) => Math.sin(2 * Math.PI * 1700 * dt) * Math.exp(-dt / 0.007), 0.5);
  add(x, 0.01, 0.04, (i, dt) => Math.sin(2 * Math.PI * 1100 * dt) * Math.exp(-dt / 0.006), 0.3);
  return highpass(x, 250);
}
function whoosh() {
  const sec = 0.55;
  const x = buf(sec);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const p = i / x.length;
    const cutoff = 200 + 2000 * Math.sin(Math.PI * p);
    const a = Math.exp((-2 * Math.PI * cutoff) / SR);
    y = (1 - a) * rnd() + a * y;
    x[i] = y * Math.sin(Math.PI * p) ** 2;
  }
  return lowpass(lowpass(x, 2500), 2500);
}
const bell = (freq, dec) => (i, dt) =>
  (Math.sin(2 * Math.PI * freq * dt) + 0.4 * Math.sin(2 * Math.PI * freq * 2.76 * dt) * Math.exp(-dt / 0.15) + 0.2 * Math.sin(2 * Math.PI * freq * 5.4 * dt) * Math.exp(-dt / 0.05)) *
  Math.min(1, dt / 0.003) * Math.exp(-dt / dec);
function chime() {
  const x = buf(1.3);
  add(x, 0, 1.2, bell(midi(88), 0.45), 0.6); // E6
  add(x, 0.13, 1.1, bell(midi(95), 0.5), 0.5); // B6
  return x;
}
function success() {
  const x = buf(1.2);
  [72, 76, 79, 84].forEach((n, k) => add(x, k * 0.07, 1, bell(midi(n), 0.35), 0.5));
  return x;
}

await mkdir(OUT, { recursive: true });

// 紹介動画（約30秒）: 104 BPM、C → G → Am → F。2小節目からハイハット、3小節目から全部
const C = [60, 64, 67], G = [55, 59, 62], Am = [57, 60, 64], F = [53, 57, 60];
await wav("bgm-teaser", fade(normalize(song({ bpm: 104, bars: 14, chords: [C, G, Am, F], sec: 32, drumsFrom: 1, fullFrom: 2 }), 0.8), 0.4, 2));
// 使い方の動画: 88 BPM、F → C → Dm → B♭ の落ち着いたもの。16小節（約44秒）をつなぎ目なく繰り返す
const Fm = [53, 57, 60], Cm = [48, 52, 55], Dm = [50, 53, 57], Bb = [46, 50, 53];
{
  const len = (60 / 88) * 4 * 16;
  const long = song({ bpm: 88, bars: 16, chords: [Fm, Cm, Dm, Bb], sec: len + 1, drumsFrom: 0, fullFrom: 4, light: true });
  // 最後の小節の余韻を頭に重ねて、繰り返したときのつなぎ目を消す
  const n = Math.floor(len * SR);
  const loop = long.slice(0, n);
  for (let i = 0; n + i < long.length; i++) loop[i] += long[n + i];
  await wav("bgm-guide", normalize(loop, 0.7));
}
await wav("sfx-pop", normalize(pop(), 0.7));
await wav("sfx-click", normalize(click(), 0.7));
await wav("sfx-whoosh", normalize(whoosh(), 0.6));
await wav("sfx-chime", normalize(chime(), 0.7));
await wav("sfx-success", normalize(success(), 0.7));
