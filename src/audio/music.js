/**
 * Home background music (owner 2026-11-16 "เพิ่มเพลง"). Owner: echo.
 *
 * A soft, synthesized lullaby loop (no samples, so we own every right): F major, ~78 BPM, an 8-bar
 * progression Fmaj7 – Dm7 – B♭maj7 – C6 with a warm pad, a round bass on beats 1 and 3, and a
 * music-box melody. Plays on the `music` bus (ducked under SFX/voice by context.js, level set by the
 * settings slider through setBusVolume('music')). Scheduled with a short look-ahead timer.
 *
 *   import { music } from './audio/music.js';
 *   music.start();  music.stop();  music.pause(reason, on);  music.isPlaying();
 *
 * Never throws; silent without Web Audio.
 * @module audio/music
 */
import { getAudioContext, getBus, peekBus, busDefaultGain } from './context.js';

const BPM = 78;
const BEAT = 60 / BPM;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
/** Bars: [bass root, pad chord (midi), melody (8 eighth notes, midi or 0 = rest)] */
const BARS = [
  [41, [57, 60, 64, 65], [77, 0, 76, 72, 0, 69, 72, 0]],     // Fmaj7
  [38, [57, 60, 62, 65], [74, 0, 72, 69, 0, 0, 65, 0]],      // Dm7
  [46, [58, 62, 65, 69], [70, 0, 69, 65, 0, 62, 65, 0]],     // Bbmaj7
  [36, [55, 60, 64, 69], [67, 0, 69, 72, 0, 0, 0, 0]],       // C6
  [41, [57, 60, 64, 65], [72, 0, 76, 77, 0, 76, 72, 0]],
  [38, [57, 60, 62, 65], [74, 0, 77, 74, 0, 72, 69, 0]],
  [46, [58, 62, 65, 69], [70, 0, 72, 74, 0, 72, 70, 0]],
  [36, [55, 60, 64, 67], [72, 0, 0, 67, 0, 0, 0, 0]],
];
const LOOKAHEAD = 0.6, TICK_MS = 150;

let timer = 0, nextT = 0, step = 0, want = false;
const pauses = new Set();

function env(c, out, t, dur, peak, attack, release) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setTargetAtTime(0.0001, t + Math.max(attack, dur - release), release / 3);
  g.connect(out);
  return g;
}
function osc(c, type, f, t, end, dest, detune = 0) {
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(end);
}
function pad(c, out, t, notes, dur) {
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.3; lp.connect(out);
  const g = env(c, lp, t, dur, 0.045, 0.6, 0.9);
  for (const n of notes) { osc(c, 'triangle', hz(n), t, t + dur + 1, g, -6); osc(c, 'sine', hz(n), t, t + dur + 1, g, 6); }
}
function bass(c, out, t, n, dur) {
  const g = env(c, out, t, dur, 0.12, 0.03, 0.5);
  osc(c, 'sine', hz(n), t, t + dur + 0.6, g);
}
function bell(c, out, t, n) {
  const g = env(c, out, t, 1.1, 0.05, 0.005, 1.0);
  osc(c, 'sine', hz(n), t, t + 1.4, g);
  const g2 = env(c, out, t, 0.5, 0.012, 0.004, 0.45);
  osc(c, 'sine', hz(n) * 3, t, t + 0.7, g2);           // music-box shimmer
}

function schedule() {
  const c = getAudioContext(), out = getBus('music');
  if (!c || !out || c.state !== 'running' || !want || pauses.size) return;
  if (nextT < c.currentTime) nextT = c.currentTime + 0.1;
  while (nextT < c.currentTime + LOOKAHEAD) {
    const bar = BARS[(step >> 3) % BARS.length], s = step & 7, t = nextT;
    if (s === 0) pad(c, out, t, bar[1], BEAT * 4);
    if (s === 0 || s === 4) bass(c, out, t, bar[0], BEAT * 1.8);
    const m = bar[2][s]; if (m) bell(c, out, t, m);
    nextT += BEAT / 2; step++;
  }
}

/** The home music player. */
export const music = {
  /** Start (or keep) the loop. Call after the first user gesture unlocked audio. */
  start() {
    want = true;
    if (!timer) { try { timer = setInterval(schedule, TICK_MS); } catch { timer = 0; } }
    schedule();
  },
  /** Stop the loop (notes already scheduled ring out). */
  stop() { want = false; clearInterval(timer); timer = 0; },
  /**
   * Hold the music for a reason (mic listening, page hidden …) and let it go again.
   * @param {string} reason @param {boolean} on true = pause
   */
  pause(reason, on) {
    const was = pauses.size;
    if (on) pauses.add(reason); else pauses.delete(reason);
    const b = peekBus('music');
    try {   // fade the notes already ringing too, so nothing bleeds into the mic
      if (b && !!was !== !!pauses.size) {
        const t = b.context.currentTime; b.gain.cancelScheduledValues(t);
        b.gain.setTargetAtTime(pauses.size ? 0 : busDefaultGain('music'), t, pauses.size ? 0.04 : 0.3);
      }
    } catch { /* ignore */ }
    if (!pauses.size) { const c = getAudioContext(); if (c) nextT = c.currentTime + 0.15; }
  },
  /** @returns {boolean} whether the loop is wanted and not paused. */
  isPlaying() { return want && !pauses.size; },
};
