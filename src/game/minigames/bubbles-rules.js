/**
 * เป่าฟองสบู่ (`bubbles`) rules — pure (no DOM, no Three, no clock; rng injected).
 * GDD: design/gdd/minigames-2.md 3.3, 4.2, 5.6–5.8. Numbers: minigames.json › bubbles.
 * Unit tests: tests/unit/bubbles.test.mjs.
 * @module game/minigames/bubbles-rules
 */
import { mergeConfig, lerp, easeAt, streakMult, coinsForRound } from './common-rules.js';

/** Fallback when minigames.json lacks a key (GDD 7.2; the file always wins). */
export const BUBBLES_DEFAULTS = Object.freeze({
  title: 'เป่าฟองสบู่', howTo: 'แตะฟองสีที่เพื่อนเรียก',
  controls: ['touch', 'head'],
  durationSec: 45, countdownSec: 3, pauseResumeCountdownSec: 3,
  colors: [
    { id: 'pink', label: 'ชมพู', pattern: 'heart' },
    { id: 'lilac', label: 'ม่วง', pattern: 'star' },
    { id: 'sky', label: 'ฟ้า', pattern: 'dot' },
    { id: 'butter', label: 'เหลือง', pattern: 'stripe' },
  ],
  spawn: { startPerSec: 1.1, endPerSec: 2.2, rampPower: 1.3, maxOnScreen: 9 },
  rise: { start: 0.18, end: 0.30 },
  drift: 0.06,
  bubbleSize: 0.5, hitScale: 1.3, maxTouches: 2,
  targetShare: 0.4, coinShare: 0.07,
  call: { everySec: 7, jitterSec: 1, warnSec: 0.8, graceSec: 0.4, minOnScreen: 2, emptyRescueSec: 1.5 },
  points: { target: 10, coin: 15 }, coinValue: 2,
  streak: { step: 4, bonusPerStep: 0.5, maxMultiplier: 3, resetOnWrong: true },
  popStar: { y: 0.55, radius: 0.45, riseScale: 0.85, keySpeed: 1.1 },
  coinsPerPoints: 12,
  minCoinsPerRound: 5, minCoinsOnlyIfComplete: true, maxCoinsPerRound: 60,
  needs: { fun: 0.25, social: 0.1, hunger: -0.03 },
  relaxed: { colors: 3, riseScale: 0.8 },
  lines: { start: 'bubbleStart', call: 'bubbleCall', wrong: 'bubbleWrong', end: 'minigameWin' },
});

/** @returns {{ cfg: object, missing: string[] }} */
export function resolveBubbles(raw) { return mergeConfig(BUBBLES_DEFAULTS, raw); }

/** e for the curves; first play: 0 during `easySec` (GDD 3.0). */
export function bubbleEase(t, cfg, easySec = 0) { return t < easySec ? 0 : easeAt(t, cfg.durationSec, cfg.spawn.rampPower); }

/** Spawns per second at time t. */
export function spawnRateAt(t, cfg, easySec = 0) { return lerp(cfg.spawn.startPerSec, cfg.spawn.endPerSec, bubbleEase(t, cfg, easySec)); }

/** Rise speed (play heights / s) at t; × popStar.riseScale in star mode, × relaxed.riseScale. */
export function riseAt(t, cfg, { easySec = 0, star = false, relaxed = false } = {}) {
  let r = lerp(cfg.rise.start, cfg.rise.end, bubbleEase(t, cfg, easySec));
  if (star) r *= cfg.popStar.riseScale;
  if (relaxed) r *= cfg.relaxed.riseScale;
  return r;
}

/** Number of colours in play (relaxed: relaxed.colors). */
export function colorCount(cfg, relaxed = false) {
  return Math.max(2, Math.min(cfg.colors.length, relaxed ? cfg.relaxed.colors : cfg.colors.length));
}

/**
 * What the next bubble is: coin (coinShare), the called colour (targetShare), else
 * an equal share of the other colours. Colours are indices 0 … nColors−1.
 * @param {number} r1 @param {number} r2 two rng draws
 * @returns {{ coin: boolean, color: number }} color −1 for a coin bubble
 */
export function pickBubble(r1, r2, called, nColors, cfg) {
  if (r1 < cfg.coinShare) return { coin: true, color: -1 };
  if (r1 < cfg.coinShare + cfg.targetShare) return { coin: false, color: called };
  let c = Math.floor(r2 * (nColors - 1)) % (nColors - 1);
  if (c >= called) c++;
  return { coin: false, color: c };
}

/** Seconds until the next colour call: everySec ± jitterSec. */
export function nextCallIn(r, cfg) { return cfg.call.everySec + (r * 2 - 1) * cfg.call.jitterSec; }

/** A new called colour, never the current one. */
export function nextCallColor(r, current, nColors) {
  if (current < 0) return Math.floor(r * nColors) % nColors;
  let c = Math.floor(r * (nColors - 1)) % (nColors - 1);
  if (c >= current) c++;
  return c;
}

/**
 * Spawn guarantee (GDD 3.3 #1, 5.6): force a called-colour bubble when, within 1 s of a call,
 * fewer than call.minOnScreen are on screen, or when none has been on screen for emptyRescueSec.
 */
export function mustForceCalled(onScreenCalled, sinceCall, sinceNoneCalled, cfg) {
  if (sinceCall <= 1 && onScreenCalled < cfg.call.minOnScreen) return true;
  return onScreenCalled === 0 && sinceNoneCalled >= cfg.call.emptyRescueSec;
}

/** @returns {{ score:number, streak:number, coinPops:number, pops:number, wrong:number, called:number, prevCalled:number, sinceCall:number }} */
export function newBubblesState(called = 0) {
  return { score: 0, streak: 0, coinPops: 0, pops: 0, wrong: 0, called, prevCalled: -1, sinceCall: 0 };
}

/** Change the called colour (keeps the previous one for `call.graceSec`). */
export function callColor(st, color) { return { ...st, prevCalled: st.called, called: color, sinceCall: 0 }; }

/**
 * Is a bubble a "good" pop right now: coin, the called colour, or the previous colour within graceSec.
 * @param {{coin:boolean,color:number}} b
 */
export function isGood(st, b, cfg) {
  return b.coin || b.color === st.called || (b.color === st.prevCalled && st.sinceCall <= cfg.call.graceSec);
}

/**
 * Pop one bubble (pure). Good: streak + 1, score += round(points × mult(streak)), coin bubble also
 * coinPops + 1. Wrong: streak = 0 (resetOnWrong), score unchanged. Star mode (`star`): a wrong
 * colour is not popped at all and never resets the streak.
 * @returns {{ state: object, outcome: 'good'|'coin'|'wrong'|'pass', gained: number }}
 */
export function popBubble(st, b, cfg, star = false) {
  const s = { ...st };
  if (isGood(st, b, cfg)) {
    s.streak = st.streak + 1;
    const gained = Math.round((b.coin ? cfg.points.coin : cfg.points.target) * streakMult(s.streak, cfg.streak));
    s.score = st.score + gained; s.pops = st.pops + 1;
    if (b.coin) s.coinPops = st.coinPops + 1;
    return { state: s, outcome: b.coin ? 'coin' : 'good', gained };
  }
  if (star) return { state: st, outcome: 'pass', gained: 0 };
  if (cfg.streak.resetOnWrong !== false) s.streak = 0;
  s.wrong = st.wrong + 1;
  return { state: s, outcome: 'wrong', gained: 0 };
}

/**
 * Which bubble a tap hits (GDD 3.3 #5, 5.7): the nearest good bubble inside its radius
 * (bubble radius × hitScale), else the nearest bubble inside its radius, else −1.
 * @param {ArrayLike<{x:number,y:number,r:number,coin:boolean,color:number}>} list world positions
 */
export function pickTarget(list, x, y, st, cfg) {
  let good = -1, gd = Infinity, any = -1, ad = Infinity;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const dx = b.x - x, dy = b.y - y, d = dx * dx + dy * dy, R = b.r * cfg.hitScale;
    if (d > R * R) continue;
    if (isGood(st, b, cfg) && d < gd) { gd = d; good = i; }
    if (d < ad) { ad = d; any = i; }
  }
  return good >= 0 ? good : any;
}

/** Coins (GDD 4.2): min(60, max(floor, 2 × coinPops + floor(score / 12))). */
export function bubblesCoins(score, coinPops, cfg, completed) { return coinsForRound(score, coinPops, cfg, completed); }

/**
 * Expected spawn count by integrating the rate with a fixed step (balance / AC5 check).
 * @param {object} cfg @param {number} [dt]
 */
export function expectedSpawns(cfg, dt = 1 / 60) {
  let acc = 0, n = 0;
  for (let t = 0; t < cfg.durationSec; t += dt) { acc += spawnRateAt(t, cfg) * dt; while (acc >= 1) { acc -= 1; n++; } }
  return n;
}
