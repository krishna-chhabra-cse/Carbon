// Generates the soundtracks for the Glass, Terminal, Kinetic and Aurora styles
// into public/music-<style>.wav. Every sound is synthesized here from sine,
// saw, square and noise oscillators: no samples, no loops, no third-party
// audio. Original compositions, royalty-free.
//
// All four are 30s at 90 BPM and follow the same cut grid as the other
// tracks (frames @30fps): intro, drop at 160, hits at 320 / 560, a lift at
// 720, the final hit at 840, ringing out to 900.
//
//   glass     airy future garage: shuffled 2-step, warm pads, FM glass bells
//   terminal  chiptune synthwave: square arpeggios, pulse bass, gated snare
//   kinetic   phonk-style: distorted kick, sliding 808, pitched cowbell riff
//   aurora    bright pluck pop: marimba chords, plucked lead, claps
//
// Run: node scripts/make-music-packs.mjs [glass terminal kinetic aurora]
import fs from "node:fs";
import path from "node:path";

const SR = 44100;
const FPS = 30;
const N = Math.round((900 / FPS) * SR);
const BEAT = 60 / 90;
const BAR = BEAT * 4;
const STEP = BEAT / 4;
const TAU = Math.PI * 2;
const fr = (f) => f / FPS;
const DROP = fr(160);
const END = fr(840);
const CUTS = [fr(320), fr(560), fr(720)];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// ── engine ───────────────────────────────────────────────────
function engine(seed) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const noise = () => rnd() * 2 - 1;
  const bus = () => [new Float32Array(N), new Float32Array(N)];
  const b = { drums: bus(), bass: bus(), music: bus(), fx: bus(), verb: bus(), echo: bus() };
  const kicks = [];
  const add = (target, buf, t0, gain = 1, pan = 0, verb = 0, echo = 0) => {
    const s0 = Math.round(t0 * SR);
    const a = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(a);
    const gr = Math.sin(a);
    for (let i = 0; i < buf.length; i++) {
      const j = s0 + i;
      if (j < 0 || j >= N) continue;
      const v = buf[i] * gain;
      target[0][j] += v * gl;
      target[1][j] += v * gr;
      if (verb) {
        b.verb[0][j] += v * gl * verb;
        b.verb[1][j] += v * gr * verb;
      }
      if (echo) {
        b.echo[0][j] += v * gl * echo;
        b.echo[1][j] += v * gr * echo;
      }
    }
  };
  return { rnd, noise, b, add, kicks };
}

const lowpass = (buf, fc) => {
  const a = 1 - Math.exp((-TAU * fc) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) buf[i] = y += a * (buf[i] - y);
  return buf;
};
const highpass = (buf, fc) => {
  const a = 1 - Math.exp((-TAU * fc) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += a * (buf[i] - y);
    buf[i] -= y;
  }
  return buf;
};
// Resonant state-variable lowpass with a cutoff that can move per sample.
const svf = (buf, cutoff, q = 0.7) => {
  let lo = 0;
  let band = 0;
  for (let i = 0; i < buf.length; i++) {
    const fc = typeof cutoff === "function" ? cutoff(i / SR) : cutoff;
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
    const hi = buf[i] - lo - (1 / q) * band;
    band += f * hi;
    lo += f * band;
    buf[i] = lo;
  }
  return buf;
};
const adsr = (t, dur, a, d, sus, r) => {
  if (t < a) return t / a;
  const v = t < a + d ? 1 - (1 - sus) * ((t - a) / d) : sus;
  return t > dur ? v * Math.max(0, 1 - (t - dur) / r) : v;
};

// ── instruments ──────────────────────────────────────────────
const I = (e) => {
  const { noise, rnd } = e;
  const len = (sec) => new Float32Array(Math.round(sec * SR));
  return {
    kick({ from = 160, to = 48, drop = 32, decay = 4, drive = 3, click = 0.6 } = {}) {
      const out = len(0.8);
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        ph += (TAU * (to + (from - to) * Math.exp(-t * drop))) / SR;
        const body = Math.sin(ph) * Math.exp(-t * decay);
        out[i] = Math.tanh(body * drive) * Math.min(1, t / 0.001) + (t < 0.004 ? noise() * click * (1 - t / 0.004) : 0);
      }
      return out;
    },
    snare({ tone = 185, decay = 18, body = 0.6, gated = 0, bright = 0.5 } = {}) {
      const out = len(gated ? 0.45 : 0.4);
      let hp = 0;
      let xp = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const x = noise();
        hp = bright * (hp + x - xp);
        xp = x;
        // Gated: a flat noise tail cut off hard, like a gated room.
        const env = gated ? (t < gated ? 0.55 + 0.45 * Math.exp(-t * 30) : Math.exp(-(t - gated) * 220) * 0.55) : Math.exp(-t * decay);
        out[i] = Math.tanh((hp * env + Math.sin(TAU * tone * t) * Math.exp(-t * 30) * body) * 1.5);
      }
      return out;
    },
    clap(vel = 1) {
      const out = len(0.45);
      let hp = 0;
      let xp = 0;
      let lp = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const x = noise();
        hp = 0.9 * (hp + x - xp);
        xp = x;
        lp += 0.35 * (hp - lp);
        let env = 0;
        for (const o of [0, 0.009, 0.019, 0.028]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) * 110));
        if (t > 0.028) env = Math.max(env, Math.exp(-(t - 0.028) * 14) * 0.5);
        out[i] = lp * env * 1.6 * vel;
      }
      return out;
    },
    hat({ decay = 70, open = false, color = 0.4 } = {}) {
      const out = len(open ? 0.35 : 0.08);
      let y = 0;
      let xp = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const x = noise();
        y = color * (y + x - xp);
        xp = x;
        out[i] = y * Math.exp(-t * (open ? 11 : decay));
      }
      return out;
    },
    // 8-bit noise: sample-and-hold noise at a low rate.
    chipNoise(dur = 0.06, rate = 9000) {
      const out = len(dur);
      let v = 0;
      const hold = Math.round(SR / rate);
      for (let i = 0; i < out.length; i++) {
        if (i % hold === 0) v = rnd() > 0.5 ? 1 : -1;
        out[i] = v * Math.exp((-i / SR) * 45);
      }
      return out;
    },
    shaker() {
      const out = len(0.09);
      let y = 0;
      let xp = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const x = noise();
        y = 0.3 * (y + x - xp);
        xp = x;
        out[i] = y * Math.sin(Math.PI * Math.min(1, t / 0.09)) ** 2;
      }
      return out;
    },
    sub(f, dur, { from = 0, glide = 0.07, drive = 1.2, punch = 0.3 } = {}) {
      const out = len(dur + 0.1);
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const g = from ? from + (f - from) * Math.min(1, t / glide) : f;
        ph += (TAU * g * (1 + punch * Math.exp(-t * 40))) / SR;
        const env = Math.min(1, t / 0.004) * (t > dur ? Math.exp(-(t - dur) * 30) : 1);
        out[i] = Math.tanh(Math.sin(ph) * drive) * env;
      }
      return out;
    },
    // Detuned saw pad through a gentle lowpass.
    pad(notes, dur, { cutoff = 1500, attack = 0.6, release = 0.8, voices = 4, detune = 0.008 } = {}) {
      const out = len(dur + release);
      for (const m of notes) {
        const f0 = hz(m);
        for (let v = 0; v < voices; v++) {
          const f = f0 * (1 + (v - (voices - 1) / 2) * detune);
          let ph = rnd();
          for (let i = 0; i < out.length; i++) {
            ph += f / SR;
            out[i] += (2 * (ph % 1) - 1) / voices;
          }
        }
      }
      svf(out, cutoff, 0.8);
      for (let i = 0; i < out.length; i++) out[i] *= adsr(i / SR, dur, attack, 0.5, 0.85, release) * 0.12;
      return out;
    },
    // FM bell: inharmonic modulator, index decays quickly = glassy attack.
    bell(m, dur = 1.6, ratio = 3.5, index = 3) {
      const out = len(dur);
      const f = hz(m);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const mod = Math.sin(TAU * f * ratio * t) * index * Math.exp(-t * 6);
        out[i] = Math.sin(TAU * f * t + mod) * Math.exp(-t * 2.8) * Math.min(1, t / 0.002);
      }
      return out;
    },
    // Karplus-Strong plucked string.
    pluck(m, dur = 1.2, bright = 0.5) {
      const out = len(dur);
      const p = Math.max(2, Math.round(SR / hz(m)));
      const line = new Float32Array(p);
      let lp = 0;
      for (let i = 0; i < p; i++) {
        lp += bright * (noise() - lp);
        line[i] = lp;
      }
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const nxt = (idx + 1) % p;
        const v = 0.996 * 0.5 * (line[idx] + line[nxt]);
        out[i] = line[idx];
        line[idx] = v;
        idx = nxt;
      }
      for (let i = 0; i < out.length; i++) out[i] *= Math.min(1, (dur - i / SR) / 0.05);
      return out;
    },
    // Marimba-ish mallet: fundamental + 4x and 10x partials that die fast.
    mallet(m, dur = 0.9) {
      const out = len(dur);
      const f = hz(m);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        out[i] =
          (Math.sin(TAU * f * t) * Math.exp(-t * 5) +
            0.35 * Math.sin(TAU * f * 3.93 * t) * Math.exp(-t * 22) +
            0.12 * Math.sin(TAU * f * 9.8 * t) * Math.exp(-t * 50)) *
          Math.min(1, t / 0.0015);
      }
      return out;
    },
    // Chiptune square / pulse wave with a short decay.
    square(m, dur, { duty = 0.25, decay = 6, vib = 0, sustain = 0.35 } = {}) {
      const out = len(dur + 0.02);
      const f = hz(m);
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        ph += (f * (1 + (t > 0.15 ? vib * Math.sin(TAU * 5.5 * t) : 0))) / SR;
        const env = (sustain + (1 - sustain) * Math.exp(-t * decay)) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.02) : 1);
        out[i] = (ph % 1 < duty ? 1 : -1) * env;
      }
      return out;
    },
    triangle(m, dur, vib = 0.006) {
      const out = len(dur + 0.05);
      const f = hz(m);
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        ph += (f * (1 + (t > 0.12 ? vib * Math.sin(TAU * 5 * t) : 0))) / SR;
        const x = ph % 1;
        out[i] = (x < 0.5 ? 4 * x - 1 : 3 - 4 * x) * Math.min(1, t / 0.005) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.05) : 1);
      }
      return out;
    },
    // Pitched cowbell: two detuned squares through a bandpass, short decay.
    cowbell(m, dur = 0.32) {
      const out = len(dur);
      const f = hz(m);
      let p1 = 0;
      let p2 = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        p1 += f / SR;
        p2 += (f * 1.48) / SR;
        out[i] = ((p1 % 1 < 0.5 ? 1 : -1) + (p2 % 1 < 0.5 ? 1 : -1)) * 0.5 * (0.25 * Math.exp(-t * 4) + 0.75 * Math.exp(-t * 28));
      }
      highpass(out, 500);
      svf(out, 3200, 1.2);
      return out;
    },
    riser(dur, top = 7000) {
      const out = len(dur);
      let lo = 0;
      let band = 0;
      for (let i = 0; i < out.length; i++) {
        const x = i / out.length;
        const f = 2 * Math.sin((Math.PI * (200 + top * x * x)) / SR);
        const hi = noise() - lo - 0.5 * band;
        band += f * hi;
        lo += f * band;
        out[i] = band * x * x;
      }
      return out;
    },
    impact(dur = 2.2, low = 30) {
      const out = len(dur);
      let ph = 0;
      let lp = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        ph += (TAU * (low + 60 * Math.exp(-t * 7))) / SR;
        lp += 0.06 * (noise() - lp);
        out[i] = Math.tanh(Math.sin(ph) * 3) * Math.exp(-t * 1.6) + lp * Math.exp(-t * 3) * 2.5;
      }
      return out;
    },
    reverse(buf) {
      return buf.slice().reverse();
    },
    crackle(dur) {
      const out = len(dur);
      for (let i = 0; i < out.length; i++) if (rnd() < 0.0006) out[i] = noise() * (0.3 + rnd());
      return lowpass(out, 5000);
    },
  };
};

// ── mixing ───────────────────────────────────────────────────
function reverb(input, offset, size = 1, damp = 0.22) {
  const out = new Float32Array(N);
  for (const ms of [41.1, 47.7, 53.3, 61.9]) {
    const d = Math.round(((ms * size) / 1000) * SR) + offset;
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp += damp * (y - lp);
      buf[idx] = input[i] + lp * 0.86;
      idx = (idx + 1) % d;
      out[i] += y * 0.25;
    }
  }
  for (const ms of [6.3, 2.2]) {
    const d = Math.round((ms / 1000) * SR);
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const bv = buf[idx];
      const y = -0.7 * out[i] + bv;
      buf[idx] = out[i] + 0.7 * y;
      idx = (idx + 1) % d;
      out[i] = y;
    }
  }
  return out;
}

// Ping-pong delay, dotted eighth.
function pingpong([l, r], time = BEAT * 0.75, fb = 0.42) {
  const d = Math.round(time * SR);
  const ol = new Float32Array(N);
  const or = new Float32Array(N);
  for (let i = d; i < N; i++) {
    ol[i] = r[i - d] + or[i - d] * fb;
    or[i] = l[i - d] + ol[i - d] * fb;
  }
  return [lowpass(ol, 4500), lowpass(or, 4500)];
}

function master(e, { drums = 1, bass = 1, music = 0.8, fx = 1, verb = 0.4, echo = 0.35, duck = 0.5, size = 1, drive = 1.6, intro = 2 } = {}) {
  const { b, kicks } = e;
  const env = new Float32Array(N).fill(1);
  for (const tk of kicks) {
    const s0 = Math.round(tk * SR);
    for (let i = 0; i < SR * 0.3 && s0 + i < N; i++) env[s0 + i] = Math.min(env[s0 + i], 1 - duck * Math.exp(-(i / SR) * 10));
  }
  const [el, er] = pingpong(b.echo);
  const wl = reverb(b.verb[0], 0, size);
  const wr = reverb(b.verb[1], 31, size);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  // Lift the drum-less intro to about half the level of the drop (like the
  // other Carbon tracks), easing back to 1 over the last beat before it.
  const dropAt = Math.round(DROP * SR);
  const ease = Math.round(BEAT * SR);
  for (let i = 0; i < N; i++) {
    const m = env[i] * (i >= dropAt ? 1 : intro + (1 - intro) * Math.max(0, 1 - (dropAt - i) / ease));
    L[i] = b.drums[0][i] * drums + b.bass[0][i] * bass * (0.4 + 0.6 * m) + b.music[0][i] * music * m + b.fx[0][i] * fx + (wl[i] * verb + el[i] * echo) * m;
    R[i] = b.drums[1][i] * drums + b.bass[1][i] * bass * (0.4 + 0.6 * m) + b.music[1][i] * music * m + b.fx[1][i] * fx + (wr[i] * verb + er[i] * echo) * m;
  }
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const sat = Math.tanh(drive);
  const pcm = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (SR * 0.3), i / (SR * 0.01));
    pcm.writeInt16LE(Math.round((Math.tanh((L[i] / peak) * drive) / sat) * fade * 0.93 * 32767), i * 4);
    pcm.writeInt16LE(Math.round((Math.tanh((R[i] / peak) * drive) / sat) * fade * 0.93 * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const bars = (fn) => {
  for (let bar = 0; bar < 11; bar++) fn(bar, bar * BAR);
};

// Shared cut accents: risers into the drop and the lift, impacts on the cuts,
// a final hit at 840.
function cutFx(e, x, { impact = 0.8, riser = 0.3, small = 0.35 } = {}) {
  e.add(e.b.fx, x.riser(BAR), DROP - BAR, riser, 0, 0.3);
  e.add(e.b.fx, x.riser(BAR), CUTS[2] - BAR, riser, 0, 0.3);
  e.add(e.b.fx, x.riser(BEAT * 2), END - BEAT * 2, riser * 0.8, 0, 0.3);
  e.add(e.b.fx, x.impact(), DROP, impact, 0, 0.5);
  e.add(e.b.fx, x.impact(1.4), CUTS[0], small, 0, 0.4);
  e.add(e.b.fx, x.impact(1.4), CUTS[1], small, 0, 0.4);
  e.add(e.b.fx, x.impact(), CUTS[2], impact * 0.9, 0, 0.5);
  e.add(e.b.fx, x.impact(3), END, impact, 0, 0.6);
}

// ── Glass: airy future garage (A minor) ─────────────────────
function glass() {
  const e = engine(101);
  const x = I(e);
  const { add, b } = e;
  const CH = [
    { root: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] }, // Fmaj7
    { root: 40, pad: [52, 55, 59, 62], arp: [64, 67, 71, 74] }, // Em7
    { root: 45, pad: [57, 60, 64, 71], arp: [69, 72, 76, 79] }, // Am9
    { root: 43, pad: [55, 59, 62, 69], arp: [67, 71, 74, 81] }, // Gadd9
  ];
  const K = x.kick({ from: 120, to: 50, drop: 28, decay: 5, drive: 2.2, click: 0.3 });
  const SN = x.snare({ tone: 220, decay: 22, body: 0.35, bright: 0.6 });
  const RIM = x.snare({ tone: 400, decay: 60, body: 0.8, bright: 0.3 });
  const H = x.hat({ decay: 90, color: 0.45 });
  const swing = (st) => (st % 2 ? STEP * 0.3 : 0);
  add(b.fx, x.crackle(30), 0, 0.25, 0);
  // Bell arpeggio order (indexes into the chord), 8 per bar.
  const ORDER = [0, 2, 1, 3, 2, 1, 3, 2];
  bars((bar, t0) => {
    const c = CH[bar % 4];
    if (t0 >= END) return;
    const intro = t0 < DROP;
    add(b.music, x.pad(c.pad, BAR * 0.98, { cutoff: intro ? 700 + 500 * bar : 1700, attack: 0.5 }), t0, 0.9, 0, 0.5);
    ORDER.forEach((k, i) => {
      if (intro && bar === 0 && i % 2) return;
      add(b.music, x.bell(c.arp[k] + (i === 7 ? 12 : 0), 1.4), t0 + i * BEAT * 0.5 + swing(i * 2), 0.16, i % 2 ? 0.45 : -0.45, 0.35, 0.5);
    });
    if (intro) {
      if (bar === 1) add(b.fx, x.reverse(x.bell(c.arp[3] + 12, 1.6)), DROP - 1.6, 0.3, 0, 0.6);
      return;
    }
    const breakdown = bar === 7; // the cut at 560: drums thin out for a bar
    for (let st = 0; st < 16; st++) {
      const t = t0 + st * STEP + swing(st);
      if (t >= END) break;
      // 2-step kick: 1, the "and" of 2, a ghost before 4.
      if (!breakdown && (st === 0 || st === 7 || (st === 13 && bar % 2))) {
        add(b.drums, K, t, st === 0 ? 1 : 0.75);
        e.kicks.push(t);
        add(b.bass, x.sub(hz(c.root), st === 0 ? STEP * 6 : STEP * 4, { drive: 1.4, punch: 0.15 }), t, 0.9);
      }
      if (st === 8) add(b.drums, SN, t, 0.7, 0, 0.35);
      if (st === 15 && bar % 2 === 0) add(b.drums, RIM, t, 0.25, 0.3, 0.3);
      if (!breakdown || st % 4 === 2) add(b.drums, H, t, [0.16, 0.08, 0.12, 0.07][st % 4], st % 2 ? 0.35 : -0.25);
    }
    if (breakdown) add(b.bass, x.sub(hz(c.root), BAR * 0.9, { drive: 1.1 }), t0, 0.7);
  });
  cutFx(e, x, { impact: 0.55, riser: 0.28, small: 0.25 });
  add(b.music, x.pad([45, 57, 60, 64, 71, 76], 1.8, { cutoff: 2200, attack: 0.02, release: 1.4 }), END, 1.1, 0, 0.7);
  for (const [i, m] of [69, 72, 76, 81, 84].entries()) add(b.music, x.bell(m, 2), END + i * 0.09, 0.2, i % 2 ? 0.4 : -0.4, 0.5, 0.4);
  add(b.bass, x.sub(hz(33), 1.6), END, 0.9);
  add(b.drums, K, END, 1);
  return master(e, { music: 0.9, verb: 0.55, echo: 0.45, duck: 0.45, size: 1.3, drive: 1.4, intro: 3.2 });
}

// ── Terminal: chiptune synthwave (E minor) ──────────────────
function terminal() {
  const e = engine(202);
  const x = I(e);
  const { add, b } = e;
  const CH = [
    { root: 28, tones: [52, 55, 59] }, // Em
    { root: 24, tones: [48, 52, 55] }, // C
    { root: 31, tones: [55, 59, 62] }, // G
    { root: 26, tones: [50, 54, 57] }, // D
  ];
  // Lead (bars 4-9): [bar in loop, beat, beats, midi]
  const LEAD = [
    [0, 0, 1.5, 71], [0, 1.5, 0.5, 74], [0, 2, 1, 76], [0, 3, 1, 74],
    [1, 0, 2, 72], [1, 2, 1, 71], [1, 3, 1, 67],
    [2, 0, 1.5, 74], [2, 1.5, 0.5, 71], [2, 2, 2, 79],
    [3, 0, 1, 78], [3, 1, 1, 74], [3, 2, 2, 69],
  ];
  const K = x.kick({ from: 200, to: 45, drop: 40, decay: 6, drive: 3, click: 0.4 });
  const SN = x.snare({ tone: 200, gated: 0.17, body: 0.5, bright: 0.55 });
  const ARP = [0, 1, 2, 3, 2, 1, 0, 1]; // up-down through the triad + octave
  bars((bar, t0) => {
    const c = CH[bar % 4];
    if (t0 >= END) return;
    const intro = t0 < DROP;
    const tones = [...c.tones, c.tones[0] + 12];
    for (let st = 0; st < 16; st++) {
      const t = t0 + st * STEP;
      if (t >= END) break;
      const m = tones[ARP[st % 8]] + 12;
      const arp = x.square(m, STEP * 0.9, { duty: 0.25, decay: 12, sustain: 0.25 });
      // Intro: the arpeggio opens up from a muffled filter.
      if (intro) svf(arp, 500 + 2600 * ((t - 0) / DROP) ** 2, 1.4);
      add(b.music, arp, t, 0.2, st % 2 ? 0.3 : -0.3, 0.15, 0.3);
      if (!intro && st % 2 === 0) {
        add(b.bass, lowpass(x.square(c.root + (st % 4 === 2 ? 12 : 0) + 12, STEP * 1.6, { duty: 0.5, decay: 4, sustain: 0.6 }), 1800), t, 0.42);
      }
      if (!intro && st % 2 === 0) add(b.drums, x.chipNoise(st % 4 === 2 ? 0.09 : 0.04, 11000), t, 0.1, 0.25);
      if ((!intro && (st === 0 || st === 8 || (st === 10 && bar % 2))) || (bar === 1 && st % 4 === 0)) {
        add(b.drums, K, t, intro ? 0.6 : 1);
        if (!intro) e.kicks.push(t);
      }
      if (!intro && (st === 4 || st === 12)) add(b.drums, SN, t, 0.7, 0, 0.25);
    }
    if (bar >= 4 && bar <= 9) {
      for (const [lb, beat, len, m] of LEAD) {
        if (lb !== bar % 4) continue;
        const t = t0 + beat * BEAT;
        if (t < END) add(b.music, x.square(m, len * BEAT * 0.92, { duty: 0.5, decay: 2, sustain: 0.7, vib: 0.008 }), t, 0.13, 0, 0.3, 0.35);
      }
    }
    if (!intro) add(b.music, x.pad(c.tones.map((m) => m - 12), BAR, { cutoff: 900, attack: 0.3 }), t0, 0.6, 0, 0.3);
    // Tom fill into the lift at 720.
    if (bar === 8) for (let s = 0; s < 6; s++) add(b.drums, x.kick({ from: 300 - s * 30, to: 110 - s * 10, drop: 20, decay: 9, drive: 2 }), t0 + 2.5 * BEAT + s * (BEAT / 4), 0.5, s % 2 ? 0.3 : -0.3, 0.3);
  });
  cutFx(e, x, { impact: 0.6, riser: 0.25, small: 0.3 });
  for (const [i, m] of [64, 67, 71, 76, 79, 83, 88].entries()) add(b.music, x.square(m, 0.08, { duty: 0.125, decay: 10 }), END + i * 0.045, 0.22, 0, 0.4, 0.4);
  add(b.music, x.square(52, 1.6, { duty: 0.5, decay: 1.5, sustain: 0.3, vib: 0.01 }), END, 0.2, 0, 0.5);
  add(b.drums, K, END, 1);
  add(b.drums, SN, END, 0.8, 0, 0.4);
  add(b.bass, x.sub(hz(28), 1.6), END, 0.8);
  return master(e, { music: 0.85, verb: 0.35, echo: 0.3, duck: 0.4, drive: 1.5, intro: 2.2 });
}

// ── Kinetic: phonk-style drums, 808 and cowbell (C minor) ───
function kinetic() {
  const e = engine(303);
  const x = I(e);
  const { add, b } = e;
  const ROOTS = [36, 32, 29, 31]; // C, Ab, F, G (808 roots)
  // Two-bar cowbell riff: [16th step 0-31, midi]
  const RIFF = [
    [0, 75], [3, 75], [6, 72], [8, 74], [10, 75], [12, 79], [14, 77],
    [16, 75], [19, 75], [22, 72], [24, 70], [26, 72], [28, 67], [30, 68],
  ];
  const K = x.kick({ from: 220, to: 52, drop: 34, decay: 5, drive: 6, click: 0.8 });
  const SN = x.snare({ tone: 210, decay: 16, body: 0.7, bright: 0.65 });
  const H = x.hat({ decay: 110, color: 0.38 });
  const OH = x.hat({ open: true, color: 0.4 });
  let prev = 0;
  bars((bar, t0) => {
    if (t0 >= END) return;
    const intro = t0 < DROP;
    for (const [st, m] of RIFF) {
      if ((st >= 16) !== (bar % 2 === 1)) continue;
      const t = t0 + (st % 16) * STEP;
      if (t >= END) continue;
      const cb = x.cowbell(m);
      if (intro) svf(cb, 900 + 2500 * (t / DROP), 0.9);
      add(b.music, cb, t, intro ? 0.5 : 0.42, (st % 3) - 1 > 0 ? 0.25 : -0.15, 0.25, 0.25);
    }
    if (intro) {
      if (bar === 1) add(b.fx, x.reverse(x.impact(1.6, 40)), DROP - 1.6, 0.6, 0, 0.3);
      return;
    }
    const root = ROOTS[bar % 4];
    const stutter = bar === 7;
    for (let st = 0; st < 16; st++) {
      const t = t0 + st * STEP;
      if (t >= END) break;
      if (st === 0 || st === 6 || st === 10 || (st === 14 && bar % 2)) {
        add(b.drums, K, t, 1);
        e.kicks.push(t);
        const dur = st === 0 ? STEP * 5.5 : STEP * 3.5;
        add(b.bass, x.sub(hz(root), dur, { from: prev ? hz(prev) : 0, glide: 0.09, drive: 4, punch: 0.25 }), t, 0.85);
        prev = root;
      }
      if (st === 8) add(b.drums, SN, t, 0.9, 0, 0.2);
      if (st === 8) add(b.drums, x.clap(0.8), t, 0.5, 0, 0.3);
      if (!stutter || st < 8) add(b.drums, H, t, st % 4 === 0 ? 0.22 : 0.13, 0.3);
      if (st === 14) add(b.drums, OH, t, 0.12, -0.3);
    }
    // Triplet hat roll at the end of every other bar; a 1/32 stutter on 560's bar.
    if (bar % 2) for (let r = 0; r < 6; r++) add(b.drums, H, t0 + 3 * BEAT + r * (BEAT / 6), 0.1 + r * 0.025, 0.3);
    if (stutter) for (let r = 0; r < 16; r++) add(b.drums, SN, t0 + 2 * BEAT + r * (STEP / 2), 0.2 + r * 0.03, 0, 0.1);
  });
  cutFx(e, x, { impact: 0.9, riser: 0.3, small: 0.45 });
  add(b.bass, x.sub(hz(36), 1.8, { from: hz(48), glide: 0.25, drive: 4 }), END, 0.9);
  add(b.drums, K, END, 1);
  add(b.music, x.cowbell(84, 0.6), END, 0.6, 0, 0.6, 0.5);
  return master(e, { drums: 1.15, bass: 1.1, music: 0.75, verb: 0.3, echo: 0.25, duck: 0.35, drive: 2.2, intro: 3 });
}

// ── Aurora: bright pluck pop (D major) ──────────────────────
function aurora() {
  const e = engine(404);
  const x = I(e);
  const { add, b } = e;
  const CH = [
    { root: 38, tones: [62, 66, 69] }, // D
    { root: 45, tones: [61, 64, 69] }, // A
    { root: 47, tones: [62, 66, 71] }, // Bm
    { root: 43, tones: [62, 67, 71] }, // G
  ];
  const RHYTHM = [0, 3, 6, 8, 11, 14]; // syncopated mallet chords
  const MELODY = [
    [0, 0, 0.75, 78], [0, 0.75, 0.75, 76], [0, 1.5, 1, 74], [0, 2.5, 1.5, 76],
    [1, 0, 0.75, 73], [1, 0.75, 0.75, 74], [1, 1.5, 2.5, 76],
    [2, 0, 0.75, 78], [2, 0.75, 0.75, 81], [2, 1.5, 1, 78], [2, 2.5, 1.5, 74],
    [3, 0, 1, 79], [3, 1, 1, 78], [3, 2, 2, 76],
  ];
  const K = x.kick({ from: 150, to: 52, drop: 30, decay: 6, drive: 2.4, click: 0.4 });
  const CL = x.clap(1);
  const SH = x.shaker();
  bars((bar, t0) => {
    const c = CH[bar % 4];
    if (t0 >= END) return;
    const intro = t0 < DROP;
    add(b.music, x.pad([c.root + 12, ...c.tones], BAR * 0.98, { cutoff: 1300, attack: 0.4 }), t0, 0.55, 0, 0.4);
    for (const st of RHYTHM) {
      const t = t0 + st * STEP;
      if (t >= END) continue;
      c.tones.forEach((m, i) => add(b.music, x.mallet(m + 12, 0.8), t + i * 0.006, 0.18, (i - 1) * 0.4, 0.25, 0.15));
    }
    if (intro) {
      if (bar === 1) for (let r = 0; r < 8; r++) add(b.drums, CL, t0 + 2 * BEAT + r * (BEAT / 4), 0.12 + r * 0.05, 0, 0.3);
      return;
    }
    if (bar >= 4 && bar <= 9) {
      for (const [lb, beat, len, m] of MELODY) {
        if (lb !== bar % 4) continue;
        const t = t0 + beat * BEAT;
        if (t < END) add(b.music, x.pluck(m, Math.max(0.5, len * BEAT + 0.3), 0.6), t, 0.4, 0.1, 0.3, 0.4);
      }
    }
    for (let st = 0; st < 16; st++) {
      const t = t0 + st * STEP;
      if (t >= END) break;
      if (st === 0 || st === 8 || (st === 10 && bar % 2 === 0)) {
        add(b.drums, K, t, 0.95);
        e.kicks.push(t);
      }
      if (st === 4 || st === 12) add(b.drums, CL, t, 0.6, 0, 0.35);
      add(b.drums, SH, t, st % 2 ? 0.09 : 0.14, 0.35);
      if (st % 4 === 0 || st === 6 || st === 14) add(b.bass, x.sub(hz(c.root - 12 + 12), STEP * 1.6, { drive: 1.3, punch: 0.1 }), t, 0.55);
    }
  });
  cutFx(e, x, { impact: 0.4, riser: 0.25, small: 0.2 });
  for (const [i, m] of [74, 78, 81, 86, 90, 93].entries()) add(b.music, x.mallet(m, 1.4), END + i * 0.06, 0.25, i % 2 ? 0.4 : -0.4, 0.4, 0.3);
  add(b.music, x.pad([50, 62, 66, 69, 74], 1.6, { cutoff: 2000, attack: 0.02, release: 1.2 }), END, 0.8, 0, 0.6);
  add(b.drums, K, END, 1);
  add(b.drums, CL, END, 0.6, 0, 0.5);
  add(b.bass, x.sub(hz(38), 1.5), END, 0.7);
  return master(e, { music: 0.95, verb: 0.4, echo: 0.3, duck: 0.4, drive: 1.5, intro: 2.2 });
}

const TRACKS = { glass, terminal, kinetic, aurora };
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TRACKS);
for (const name of want) {
  if (!TRACKS[name]) throw new Error(`unknown track ${name}`);
  const t0 = Date.now();
  const out = path.join(import.meta.dirname, "..", "public", `music-${name}.wav`);
  fs.writeFileSync(out, TRACKS[name]());
  console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
