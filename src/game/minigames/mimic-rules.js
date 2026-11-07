/**
 * จำท่าทาง (`mimic`) rules — pure (no DOM, no Three, no clock; rng injected).
 * GDD: design/gdd/minigames-2.md 3.2, 4.1, 5.3–5.5. Numbers: minigames.json › mimic.
 * Unit tests: tests/unit/mimic.test.mjs.
 * @module game/minigames/mimic-rules
 */
import { mergeConfig, clamp01, lerp, coinsForRound } from './common-rules.js';

/** Fallback when minigames.json lacks a key (mirrors GDD 7.2; the file always wins). */
export const MIMIC_DEFAULTS = Object.freeze({
  title: 'จำท่าทาง', howTo: 'ดูท่าของเพื่อน แล้วกดตามให้ครบ',
  controls: ['touch'],
  poses: [
    { id: 'smile', label: 'ยิ้ม', expr: 'smile', action: 'nod', color: 'pink', shape: 'circle', note: 1 },
    { id: 'surprised', label: 'ตกใจ', expr: 'surprised', action: 'hop', color: 'lilac', shape: 'star', note: 2 },
    { id: 'wink', label: 'ขยิบตา', expr: 'wink', action: 'tilt', color: 'sky', shape: 'drop', note: 3 },
    { id: 'sleepy', label: 'ง่วง', expr: 'sleepy', action: 'sway', color: 'lavender', shape: 'moon', note: 4 },
    { id: 'shy', label: 'เขิน', expr: 'shy', action: 'wiggle', color: 'peach', shape: 'heart', note: 5 },
    { id: 'joy', label: 'ดีใจ', expr: 'joy', action: 'jelly', color: 'butter', shape: 'sun', note: 6 },
  ],
  startLength: 2, maxLength: 12,
  pads: { start: 4, max: 6, addAt: 6 },
  showStartSec: 0.75, showEndSec: 0.5, showRampLength: 10, gapSec: 0.15,
  mirrorSec: 0.35, betweenSec: 1.0, countdownSec: 3, maxSameInARow: 2,
  hintAfterSec: 6, hintScale: 0.5,
  slipsPerRound: 3, slipReplaySlow: 1.25, stepBackAfterSlipsAtLength: 2,
  afkPauseSec: 20, maxSec: 75,
  pointsPerPose: 10, coinsPerPoints: 5.5,
  minCoinsPerRound: 5, minCoinsOnlyIfComplete: true, maxCoinsPerRound: 60,
  needs: { fun: 0.2, social: 0.15, hunger: -0.03 },
  relaxed: { showScale: 1.4, hintAfterSec: 3 },
  lines: { start: 'mimicStart', good: 'mimicGood', slip: 'mimicSlip', end: 'minigameWin' },
});

/** @returns {{ cfg: object, missing: string[] }} */
export function resolveMimic(raw) { return mergeConfig(MIMIC_DEFAULTS, raw); }

/**
 * showSec(L) = lerp(showStartSec, showEndSec, clamp((L − start) / (rampLength − start))) (GDD 4.1),
 * × relaxed.showScale in relaxed mode, × slipReplaySlow on a replay after a slip.
 */
export function showSec(L, cfg, { relaxed = false, replay = false } = {}) {
  const span = Math.max(1, cfg.showRampLength - cfg.startLength);
  let s = lerp(cfg.showStartSec, cfg.showEndSec, clamp01((L - cfg.startLength) / span));
  if (relaxed) s *= cfg.relaxed.showScale;
  if (replay) s *= cfg.slipReplaySlow;
  return s;
}

/** Active pad count: L ≥ pads.addAt → pads.max, else pads.start (capped by the pose list). */
export function padsFor(L, cfg) {
  const n = L >= cfg.pads.addAt ? cfg.pads.max : cfg.pads.start;
  return Math.max(2, Math.min(n, cfg.poses.length));
}

/**
 * Append one random pose index (0 … nPads−1) so no pose appears more than
 * `maxSame` times in a row. Returns a new array; `seq` is its prefix.
 */
export function extendSequence(seq, rng, nPads, maxSame = 2) {
  const out = seq.slice();
  let run = 0;
  const last = out.length ? out[out.length - 1] : -1;
  for (let i = out.length - 1; i >= 0 && out[i] === last; i--) run++;
  let p = Math.floor(rng() * nPads) % nPads;
  if (last >= 0 && run >= maxSame && p === last) {
    // pick uniformly among the other pads
    p = Math.floor(rng() * (nPads - 1)) % (nPads - 1);
    if (p >= last) p++;
  }
  out.push(p);
  return out;
}

/** A sequence of length L built from an existing prefix (shortened or extended). */
export function sequenceOfLength(seq, L, rng, cfg) {
  let s = seq.slice(0, L);
  while (s.length < L) s = extendSequence(s, rng, padsFor(L, cfg), cfg.maxSameInARow);
  return s;
}

/**
 * New round state. `seq` holds pose indices into cfg.poses.
 * @returns {{ L:number, seq:number[], idx:number, slips:number, slipsAtL:number, score:number,
 *   best:number, hintUsed:boolean, replay:boolean, done:boolean, reason:string }}
 */
export function newMimicState(cfg, rng) {
  return {
    L: cfg.startLength, seq: sequenceOfLength([], cfg.startLength, rng, cfg), idx: 0,
    slips: 0, slipsAtL: 0, score: 0, best: 0, hintUsed: false, replay: false, done: false, reason: '',
  };
}

/**
 * One pad press during the input phase (pure; returns a new state).
 * outcome: 'ok' (right pose, sequence continues) · 'complete' (whole sequence right:
 * score += L × pointsPerPose × (hintUsed ? hintScale : 1), L + 1, new pose appended) ·
 * 'slip' (wrong pose: slips + 1; at the 2nd slip on the same L, L = max(startLength, L − 1)).
 * After 'complete' or 'slip' the caller shows the (new) sequence; `done` is set by `endCheck`.
 * @param {ReturnType<typeof newMimicState>} st
 * @param {number} pose index pressed
 * @returns {{ state: object, outcome: 'ok'|'complete'|'slip'|'ignored', gained: number }}
 */
export function pressPad(st, pose, cfg, rng) {
  if (st.done || st.idx >= st.seq.length) return { state: st, outcome: 'ignored', gained: 0 };
  const s = { ...st };
  if (st.seq[st.idx] === pose) {
    s.idx = st.idx + 1;
    if (s.idx < s.seq.length) return { state: s, outcome: 'ok', gained: 0 };
    const gained = Math.round(st.L * cfg.pointsPerPose * (st.hintUsed ? cfg.hintScale : 1));
    s.score = st.score + gained;
    s.best = Math.max(st.best, st.L);
    s.L = st.L + 1; s.slipsAtL = 0; s.hintUsed = false; s.replay = false; s.idx = 0;
    s.seq = s.L <= cfg.maxLength ? extendSequence(st.seq, rng, padsFor(s.L, cfg), cfg.maxSameInARow) : st.seq.slice();
    return { state: s, outcome: 'complete', gained };
  }
  s.slips = st.slips + 1; s.slipsAtL = st.slipsAtL + 1; s.idx = 0; s.replay = true; s.hintUsed = false;
  if (s.slipsAtL >= cfg.stepBackAfterSlipsAtLength) {
    s.L = Math.max(cfg.startLength, st.L - 1);
    s.seq = sequenceOfLength(st.seq, s.L, rng, cfg);
    s.slipsAtL = 0;
  }
  return { state: s, outcome: 'slip', gained: 0 };
}

/** The hint flashed for the current sequence (it scores × hintScale). */
export function useHint(st) { return st.hintUsed ? st : { ...st, hintUsed: true }; }

/**
 * Round end, checked only between sequences (never mid-sequence, GDD 3.2 #6):
 * slips ≥ slipsPerRound · L > maxLength · t ≥ maxSec.
 * @returns {''|'slips'|'max'|'time'}
 */
export function endCheck(st, t, cfg) {
  if (st.slips >= cfg.slipsPerRound) return 'slips';
  if (st.L > cfg.maxLength) return 'max';
  if (t >= cfg.maxSec) return 'time';
  return '';
}

/** Seconds of the show phase for the current state (L × (showSec + gapSec)). */
export function showPhaseSec(st, cfg, relaxed = false) {
  return st.seq.length * (showSec(st.L, cfg, { relaxed, replay: st.replay }) + cfg.gapSec);
}

/** Hint delay in the input phase (relaxed: relaxed.hintAfterSec). */
export function hintAfter(cfg, relaxed = false) { return relaxed ? cfg.relaxed.hintAfterSec : cfg.hintAfterSec; }

/** Coins (GDD 4.1): min(max, max(floor, floor(score / coinsPerPoints))). */
export function mimicCoins(score, cfg, completed) {
  return coinsForRound(score, 0, { ...cfg, coinValue: 0 }, completed);
}

/** f for needs: 1 when the round ended by rule, else t / maxSec. */
export function mimicFraction(t, cfg, completed) { return completed ? 1 : clamp01(t / Math.max(1e-6, cfg.maxSec)); }
