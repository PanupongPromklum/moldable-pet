/**
 * Synthesized SFX for Moldable Pet (owner: echo). No samples: every sound is
 * built from oscillators and filtered noise, so we own all rights.
 *
 * Contract (docs/architecture/module-contracts.md, "Audio — echo"):
 *   import { sfx } from './audio/sfx.js';
 *   sfx.unlock();                    // call on first user gesture
 *   sfx.play(name, { volume } = {}); // see SFX_NAMES
 *   sfx.setEnabled(bool);
 *
 * Character: soft, cute, rounded. pop/pick/boing/chirp/squish/slap keep the
 * approved prototype recipes (prototypes/squish-pet/index.html); slap gets a
 * lowpass so the square wave stays rounded. Never throws.
 */
import { getAudioContext, resumeAudio, getBus, peekBus, busDefaultGain, duckMusic } from './context.js';

/** Every sound name this module can play. */
export const SFX_NAMES = Object.freeze([
  'pop', 'pick', 'boing', 'chirp', 'squish', 'slap', 'chew', 'gulp',
  'flush', 'sparkle', 'whoosh', 'tap', 'giggle', 'yawn',
]);

/** Same sound re-triggered faster than this (s) is skipped, so rapid pokes do not pile up. */
const RETRIGGER_GAP = 0.035;
/** Hard cap on simultaneous voices (oscillators + noise sources). */
const MAX_VOICES = 32;

let enabled = true;
let noiseBuf = null;
let voices = 0;
const lastAt = new Map();

/* ---------- building blocks ---------- */

function track(node) {
  voices++;
  node.onended = () => { voices = Math.max(0, voices - 1); try { node.disconnect(); } catch { /* ignore */ } };
}

/** Gain envelope: quick linear attack, exponential decay (prototype shape). */
function envelope(c, peak, t, dur, attack = 0.012) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  return g;
}

/**
 * Pitched blip with an exponential glide f0 → f1 (the prototype `tone`).
 * opt.lowpass: Hz, opt.vibrato: { rate, depth } in Hz.
 */
function tone(c, out, t, f0, f1, dur, type = 'sine', vol = 0.12, opt = {}) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  let node = o;
  if (opt.lowpass) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = opt.lowpass; f.Q.value = 0.4;
    node.connect(f); node = f;
  }
  if (opt.vibrato) {
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = opt.vibrato.rate; lg.gain.value = opt.vibrato.depth;
    l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.03); track(l);
  }
  node.connect(envelope(c, vol, t, dur, opt.attack)).connect(out);
  o.start(t); o.stop(t + dur + 0.03); track(o);
}

/** Pitched tone with a multi-point pitch path [[time, hz], ...] and a filter path. */
function contour(c, out, t, path, dur, type, vol, filterPath, attack = 0.06) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(path[0][1], t);
  for (const [dt, hz] of path.slice(1)) o.frequency.exponentialRampToValueAtTime(hz, t + dt);
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(filterPath[0][1], t);
  for (const [dt, hz] of filterPath.slice(1)) f.frequency.exponentialRampToValueAtTime(hz, t + dt);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(f).connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.03); track(o);
}

function getNoise(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const n = Math.floor(c.sampleRate * 1.5);
  noiseBuf = c.createBuffer(1, n, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let seed = 22222; // deterministic LCG: same noise every run
  for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = seed / 2147483648 - 1; }
  return noiseBuf;
}

/**
 * Filtered noise burst. opt: { type, f0, f1, q, attack, sustain(0..1 of dur) }.
 * Returns the filter so callers can add modulation.
 */
function noise(c, out, t, dur, vol, opt = {}) {
  const s = c.createBufferSource();
  s.buffer = getNoise(c); s.loop = true;
  const f = c.createBiquadFilter();
  f.type = opt.type || 'bandpass'; f.Q.value = opt.q ?? 1;
  f.frequency.setValueAtTime(opt.f0 ?? 800, t);
  if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
  const g = c.createGain(), a = opt.attack ?? 0.01;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  if (opt.sustain) g.gain.setValueAtTime(vol, t + dur * opt.sustain);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03); track(s);
  return f;
}

/* ---------- recipes: (ctx, out, startTime, volume) → duration (s) ---------- */

const RECIPES = {
  // Prototype-approved six.
  pop: (c, o, t, v) => { tone(c, o, t, 760, 260, 0.09, 'sine', 0.14 * v); return 0.09; },
  pick: (c, o, t, v) => { tone(c, o, t, 330, 520, 0.12, 'triangle', 0.08 * v); return 0.12; },
  boing: (c, o, t, v) => {
    tone(c, o, t, 180, 520, 0.16, 'sine', 0.14 * v);
    tone(c, o, t + 0.12, 520, 240, 0.22, 'sine', 0.08 * v);
    return 0.34;
  },
  chirp: (c, o, t, v) => {
    tone(c, o, t, 880, 1180, 0.07, 'sine', 0.06 * v);
    tone(c, o, t + 0.08, 1050, 1400, 0.08, 'sine', 0.05 * v);
    return 0.16;
  },
  squish: (c, o, t, v) => {
    tone(c, o, t, 140, 90, 0.2, 'triangle', 0.09 * v);
    noise(c, o, t, 0.16, 0.03 * v, { type: 'lowpass', f0: 900, f1: 300, q: 2 }); // wet clay squelch
    return 0.2;
  },
  slap: (c, o, t, v) => { tone(c, o, t, 420, 80, 0.14, 'square', 0.06 * v, { lowpass: 1600, attack: 0.004 }); return 0.14; },

  // Game sounds.
  chew: (c, o, t, v) => { // three soft munches, slightly varied
    const steps = [0, 0.17, 0.33];
    steps.forEach((dt, i) => {
      noise(c, o, t + dt, 0.09, 0.07 * v, { type: 'bandpass', f0: 700 - i * 60, f1: 380, q: 2.5, attack: 0.008 });
      tone(c, o, t + dt, 210 - i * 12, 140, 0.08, 'sine', 0.06 * v, { attack: 0.006 });
    });
    return 0.45;
  },
  gulp: (c, o, t, v) => { // throat "glk" then a little bubble
    tone(c, o, t, 420, 150, 0.11, 'sine', 0.13 * v, { attack: 0.006 });
    tone(c, o, t + 0.1, 190, 460, 0.09, 'sine', 0.09 * v, { attack: 0.01 });
    return 0.2;
  },
  flush: (c, o, t, v) => { // swirling water + bubbles, gentle
    const dur = 1.7;
    const f = noise(c, o, t, dur, 0.09 * v, { type: 'bandpass', f0: 380, q: 1.4, attack: 0.18, sustain: 0.5 });
    f.frequency.setValueAtTime(380, t);
    f.frequency.exponentialRampToValueAtTime(1300, t + 0.5);
    f.frequency.exponentialRampToValueAtTime(300, t + dur);
    const l = c.createOscillator(), lg = c.createGain(); // swirl wobble
    l.frequency.setValueAtTime(3, t); l.frequency.linearRampToValueAtTime(7, t + dur);
    lg.gain.value = 180; l.connect(lg).connect(f.frequency); l.start(t); l.stop(t + dur); track(l);
    noise(c, o, t, dur * 0.8, 0.035 * v, { type: 'lowpass', f0: 260, f1: 120, q: 0.7, attack: 0.1, sustain: 0.4 });
    [0.35, 0.6, 0.82, 1.05, 1.3].forEach((dt, i) => tone(c, o, t + dt, 300 + i * 70, 620 + i * 90, 0.06, 'sine', 0.04 * v));
    return dur;
  },
  sparkle: (c, o, t, v) => { // F major 7 arpeggio chime (matches the music key)
    [698.5, 880, 1046.5, 1318.5].forEach((hz, i) => {
      tone(c, o, t + i * 0.07, hz, hz * 1.002, 0.5, 'sine', 0.055 * v, { attack: 0.004 });
      tone(c, o, t + i * 0.07, hz * 2, hz * 2, 0.25, 'sine', 0.012 * v, { attack: 0.004 });
    });
    return 0.75;
  },
  whoosh: (c, o, t, v) => {
    const f = noise(c, o, t, 0.45, 0.1 * v, { type: 'bandpass', f0: 320, q: 0.9, attack: 0.16 });
    f.frequency.setValueAtTime(320, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.22);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.45);
    return 0.45;
  },
  tap: (c, o, t, v) => {
    tone(c, o, t, 1250, 880, 0.04, 'sine', 0.08 * v, { attack: 0.002 });
    tone(c, o, t, 2500, 1800, 0.02, 'triangle', 0.015 * v, { attack: 0.001 });
    return 0.05;
  },
  giggle: (c, o, t, v) => { // "hee-hee-hee-hee", each syllable bends up, line falls
    [920, 860, 800, 760, 700].forEach((hz, i) => {
      tone(c, o, t + i * 0.1, hz, hz * 1.22, 0.075, 'triangle', 0.07 * v * (1 - i * 0.1),
        { lowpass: 2600, attack: 0.008, vibrato: { rate: 28, depth: 22 } });
    });
    return 0.55;
  },
  yawn: (c, o, t, v) => { // "haa-aaum": rise, long fall, filter opens then closes
    contour(c, o, t, [[0, 260], [0.35, 400], [0.8, 300], [1.15, 200]], 1.2, 'triangle', 0.1 * v,
      [[0, 500], [0.35, 1500], [0.9, 700], [1.15, 350]], 0.12);
    noise(c, o, t, 1.0, 0.012 * v, { type: 'bandpass', f0: 1200, f1: 600, q: 0.8, attack: 0.2, sustain: 0.5 }); // breath
    return 1.2;
  },
};

/* ---------- public API ---------- */

/**
 * The SFX player singleton.
 */
export const sfx = {
  /**
   * Create/resume the AudioContext. Call synchronously in the first user
   * gesture (pointerdown/click/keydown); safe to call on every gesture.
   * @returns {Promise<boolean>} true when audio is running.
   */
  unlock() {
    try { return resumeAudio(); } catch { return Promise.resolve(false); }
  },

  /**
   * Play a sound. Unknown names, muted state and missing Web Audio are silent no-ops.
   * @param {string} name one of SFX_NAMES
   * @param {{volume?: number}} [opts] volume multiplier 0..2 (default 1)
   */
  play(name, { volume = 1 } = {}) {
    if (!enabled) return;
    const recipe = RECIPES[name];
    if (!recipe) return;
    try {
      const c = getAudioContext();
      if (!c) return;
      const go = () => {
        if (voices >= MAX_VOICES) return;
        const now = c.currentTime;
        if (now - (lastAt.get(name) ?? -1) < RETRIGGER_GAP) return;
        lastAt.set(name, now);
        const out = getBus('sfx');
        if (!out) return;
        const v = Math.min(2, Math.max(0, Number(volume) || 0));
        if (v <= 0) return;
        const dur = recipe(c, out, now + 0.005, v);
        duckMusic(dur);
      };
      if (c.state === 'running') { go(); return; }
      // Suspended (no gesture yet, or iOS interrupted): try to resume; play only if it
      // comes back quickly, so stale sounds never burst out later.
      const t0 = Date.now();
      resumeAudio().then((ok) => { if (ok && Date.now() - t0 < 200) go(); });
    } catch { /* never throw from audio */ }
  },

  /**
   * Turn SFX on or off (settings toggle). Does not affect talk-back.
   * @param {boolean} on
   */
  setEnabled(on) {
    enabled = !!on;
    try {
      const b = peekBus('sfx'); // never creates the context (may be called before any gesture)
      if (b) b.gain.setTargetAtTime(enabled ? busDefaultGain('sfx') : 0, b.context.currentTime, 0.02);
    } catch { /* ignore */ }
  },

  /** @returns {boolean} whether SFX are enabled. */
  isEnabled() { return enabled; },
};
