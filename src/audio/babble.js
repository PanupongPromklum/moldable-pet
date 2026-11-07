/**
 * Babble voice for the pet's replies (conversation GDD 3.7, 4.3). Owner: echo.
 * Synthesised syllables pitched per character and life stage, deterministic for a seed.
 *
 * Usage:
 *   import { createBabble } from './audio/babble.js';
 *   const babble = createBabble({ tuning: conversationJson.tuning });
 *   const sec = babble.say('หิวไหม', { charKey: 'flower', stage: 'kid', seed: lineId, kind: 'talk', onLevel: (l) => pet.setTalkLevel(l) });
 *
 * Pitch: only `tuning.stages.<stage>.semitones` is used here (growth.json pitch is for sfx/talk-back).
 * Plays on the shared `voice` bus, so mute and the limiter apply.
 * @module audio/babble
 */
import { getAudioContext, resumeAudio, getBus } from './context.js';

const DEF_STAGES = { baby: { semitones: 7, speed: 1.25 }, kid: { semitones: 3, speed: 1.0 }, grown: { semitones: 0, speed: 0.9 } };
const DEF_VOICE = { hz: 480, syllableSec: 0.1, wave: 'triangle', bright: 0.8 };

/** Small seeded RNG (mulberry32) from a string. */
export function seededRng(seed) {
  let h = 1779033703;
  for (const ch of String(seed ?? '')) h = Math.imul(h ^ ch.codePointAt(0), 3432918353), h = (h << 13) | (h >>> 19);
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Plan the syllables for a line (GDD 4.3). Pure, for tests.
 * @returns {{ syllables: {t: number, dur: number, hz: number}[], duration: number }}
 */
export function planBabble(text, { charKey, stage = 'grown', seed, kind = 'talk', tuning = {} } = {}) {
  const v = { ...DEF_VOICE, ...(tuning.babble?.[charKey] || {}) };
  const st = { ...(DEF_STAGES[stage] || DEF_STAGES.grown), ...(tuning.stages?.[stage] || {}) };
  const letters = [...String(text || '')].filter((c) => /[ก-ฮะ-ๅa-zA-Z]/.test(c)).length;
  const n = Math.max(2, Math.min(14, Math.round(letters / 2.6)));
  const syl = v.syllableSec * st.speed * (kind === 'sing' ? 1.8 : 1);
  const rng = seededRng(seed ?? text);
  const t = String(text || '').trim();
  const q = /[?？]$/.test(t), trail = /…$|\.\.\.$/.test(t);
  const out = [];
  let time = 0;
  for (let j = 0; j < n; j++) {
    let semi = st.semitones + (rng() * 4 - 2);
    let dur = syl;
    if (kind === 'sing') semi += [0, 2, 4, 5, 7, 5, 4, 2][j % 8];
    if (j === n - 1) { if (q) semi += 3; if (trail) { semi -= 3; dur *= 1.4; } }
    out.push({ t: time, dur, hz: v.hz * Math.pow(2, semi / 12) });
    time += dur;
  }
  return { syllables: out, duration: time + 0.15, wave: v.wave, bright: v.bright };
}

/** @param {{ tuning?: object }} [opts] */
export function createBabble(opts = {}) {
  let tuning = opts.tuning || {};
  let levelTimer = null;

  function say(text, o = {}) {
    const plan = planBabble(text, { ...o, tuning });
    const c = getAudioContext();
    const bus = getBus('voice');
    if (c && bus) {
      resumeAudio();
      const t0 = c.currentTime + 0.03;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400 + 2600 * (plan.bright ?? 0.8);
      lp.connect(bus);
      for (const s of plan.syllables) {
        const osc = c.createOscillator(), g = c.createGain();
        osc.type = plan.wave || 'triangle';
        osc.frequency.setValueAtTime(s.hz * 0.96, t0 + s.t);
        osc.frequency.linearRampToValueAtTime(s.hz, t0 + s.t + s.dur * 0.4);
        g.gain.setValueAtTime(0.0001, t0 + s.t);
        g.gain.exponentialRampToValueAtTime(0.32, t0 + s.t + Math.min(0.02, s.dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.t + s.dur * 0.92);
        osc.connect(g).connect(lp);
        osc.start(t0 + s.t); osc.stop(t0 + s.t + s.dur);
      }
      setTimeout(() => { try { lp.disconnect(); } catch { /* ignore */ } }, (plan.duration + 0.5) * 1000);
    }
    // Mouth envelope at ~30 fps from the plan (works even when audio is unavailable).
    if (typeof o.onLevel === 'function') {
      clearInterval(levelTimer);
      const start = performance.now();
      levelTimer = setInterval(() => {
        const el = (performance.now() - start) / 1000;
        if (el >= plan.duration) { clearInterval(levelTimer); levelTimer = null; o.onLevel(0); return; }
        const s = plan.syllables.find((x) => el >= x.t && el < x.t + x.dur);
        o.onLevel(s ? 0.35 + 0.65 * Math.sin(Math.PI * (el - s.t) / s.dur) : 0);
      }, 33);
    }
    return plan.duration;
  }

  return { say, setTuning(t) { tuning = t || {}; } };
}
