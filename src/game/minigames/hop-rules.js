/**
 * กระโดดข้ามก้อน (`hop`) rules — pure (no DOM, no Three, no clock; rng injected).
 * GDD: design/gdd/minigames-2.md 3.4, 4.3, 5.9–5.10. Numbers: minigames.json › hop.
 * Unit tests: tests/unit/hop.test.mjs.
 * @module game/minigames/hop-rules
 */
import { mergeConfig, lerp, easeAt, streakMult, coinsForRound } from './common-rules.js';

/** Fallback when minigames.json lacks a key (GDD 7.2; the file always wins). */
export const HOP_DEFAULTS = Object.freeze({
  title: 'กระโดดข้ามก้อน', howTo: 'แตะเพื่อกระโดดข้ามก้อนนุ่มๆ',
  controls: ['touch', 'head'],
  durationSec: 45, countdownSec: 3, pauseResumeCountdownSec: 3,
  petX: 0.3,
  jump: { airSec: 0.62, height: 1.1, doubleAirSec: 0.35, bufferSec: 0.15 },
  spawn: { gapStartSec: 1.9, gapEndSec: 1.1, gapJitter: 0.15, minGapAir: 1.6, rampPower: 1.3,
    kinds: { pebble: 0.45, cushion: 0.35, demon: 0.2 } },
  speed: { start: 2.6, end: 4.2 },
  doubles: { afterSec: 20, share: 0.15 },
  coinShare: 0.3,
  points: { clear: 10, coin: 15 }, coinValue: 2,
  streak: { step: 4, bonusPerStep: 0.5, maxMultiplier: 3, resetOnBump: true },
  bumpGraceSec: 0.5, bumpSquish: 0.3,
  headFlick: { onDeg: 12, offDeg: 6, withinSec: 0.25 },
  headMode: { speedScale: 0.8, airScale: 1.15, doubles: false },
  coinsPerPoints: 14,
  minCoinsPerRound: 5, minCoinsOnlyIfComplete: true, maxCoinsPerRound: 60,
  needs: { fun: 0.3, social: 0.05, hunger: -0.08 },
  relaxed: { speedScale: 0.8, doubles: false },
  lines: { start: 'hopStart', bump: 'hopBump', demon: 'minigameDemon', end: 'minigameWin', demonLineCooldownSec: 6 },
});

/** @returns {{ cfg: object, missing: string[] }} */
export function resolveHop(raw) { return mergeConfig(HOP_DEFAULTS, raw); }

/**
 * Mode flags for one round. head: tilt-flick control (slower, longer air, no doubles);
 * relaxed: "โหมดสบายๆ"; easySec: first-play easiest period.
 * @typedef {{ head?: boolean, relaxed?: boolean, easySec?: number }} HopMode
 */

const eAt = (t, cfg, m) => (t < (m.easySec || 0) ? 0 : easeAt(t, cfg.durationSec, cfg.spawn.rampPower));

/** Air time of one jump (× headMode.airScale in head mode). */
export function airSec(cfg, m = {}) { return cfg.jump.airSec * (m.head ? cfg.headMode.airScale : 1); }

/** Ground speed (units / s) at t (× headMode.speedScale, × relaxed.speedScale). */
export function speedAt(t, cfg, m = {}) {
  let v = lerp(cfg.speed.start, cfg.speed.end, eAt(t, cfg, m));
  if (m.head) v *= cfg.headMode.speedScale;
  if (m.relaxed) v *= cfg.relaxed.speedScale;
  return v;
}

/**
 * Seconds until the next obstacle (GDD 4.3):
 * max(lerp(gapStart, gapEnd, e) × (1 ± jitter), airSec × minGapAir).
 * @param {number} r rng draw
 */
export function gapAt(t, r, cfg, m = {}) {
  const g = lerp(cfg.spawn.gapStartSec, cfg.spawn.gapEndSec, eAt(t, cfg, m)) * (1 + (r * 2 - 1) * cfg.spawn.gapJitter);
  return Math.max(g, airSec(cfg, m) * cfg.spawn.minGapAir);
}

/** True when double obstacles are allowed at t in this mode. */
export function doublesAllowed(t, cfg, m = {}) {
  if (m.head && cfg.headMode.doubles === false) return false;
  if (m.relaxed && cfg.relaxed.doubles === false) return false;
  if (t < (m.easySec || 0)) return false;
  return t >= cfg.doubles.afterSec;
}

/**
 * Next obstacle from three rng draws.
 * @returns {{ kind: 'pebble'|'cushion'|'demon', double: boolean, coin: boolean }}
 */
export function pickObstacle(r1, r2, r3, t, cfg, m = {}) {
  const k = cfg.spawn.kinds; const ids = Object.keys(k);
  let total = 0; for (const id of ids) total += Math.max(0, k[id]);
  let x = r1 * total, kind = ids[0];
  for (const id of ids) { x -= Math.max(0, k[id]); if (x < 0) { kind = id; break; } }
  return { kind, double: doublesAllowed(t, cfg, m) && r2 < cfg.doubles.share, coin: r3 < cfg.coinShare };
}

// ------------------------------------------------------------------ jump

/** @returns {{ air: boolean, t: number, dur: number, y0: number, h: number, doubled: boolean, buffered: boolean }} */
export function newJump() { return { air: false, t: 0, dur: 1, y0: 0, h: 0, doubled: false, buffered: false }; }

/** Current height of the jump arc (0 on the ground). */
export function jumpY(j) {
  if (!j.air) return 0;
  const u = Math.min(1, j.t / j.dur);
  return j.y0 * (1 - u) + 4 * j.h * u * (1 - u);
}

/**
 * A jump press (mutates `j`; hot path, no allocation). Ground: jump. Air, no double yet:
 * double jump (new arc of doubleAirSec from the current height). Air after the double:
 * buffered when ≤ bufferSec before landing (at most one), else ignored (GDD 5.9).
 * @returns {'jump'|'double'|'buffer'|'ignored'}
 */
export function pressJump(j, cfg, m = {}) {
  if (!j.air) {
    j.air = true; j.t = 0; j.dur = airSec(cfg, m); j.y0 = 0; j.h = cfg.jump.height; j.doubled = false; j.buffered = false;
    return 'jump';
  }
  if (!j.doubled) {
    const y = jumpY(j);
    j.doubled = true; j.t = 0; j.dur = cfg.jump.doubleAirSec * (m.head ? cfg.headMode.airScale : 1);
    j.y0 = y; j.h = cfg.jump.height * 0.55 + y * 0.25;
    return 'double';
  }
  if (!j.buffered && j.dur - j.t <= cfg.jump.bufferSec) { j.buffered = true; return 'buffer'; }
  return 'ignored';
}

/**
 * Advance the jump (mutates). Lands at the end of the arc; a buffered press jumps again at once.
 * @returns {'air'|'land'|'rejump'|'ground'}
 */
export function stepJump(j, dt, cfg, m = {}) {
  if (!j.air) return 'ground';
  j.t += dt;
  if (j.t < j.dur) return 'air';
  j.air = false; j.t = 0; j.y0 = 0;
  if (j.buffered) { j.buffered = false; pressJump(j, cfg, m); return 'rejump'; }
  return 'land';
}

// ------------------------------------------------------------------ scoring

/** @returns {{ score:number, streak:number, coinsGot:number, clears:number, bumps:number }} */
export function newHopState() { return { score: 0, streak: 0, coinsGot: 0, clears: 0, bumps: 0 }; }

/**
 * One obstacle event (pure). 'clear': streak + 1, score += round(10 × mult). 'coin': streak + 1,
 * score += round(15 × mult), coinsGot + 1. 'bump': streak = 0 (unless `keepStreak`, face lost
 * in head mode, GDD 5.10); never changes coins or score.
 */
export function applyHop(st, event, cfg, keepStreak = false) {
  const s = { ...st };
  if (event === 'bump') {
    s.bumps = st.bumps + 1;
    if (cfg.streak.resetOnBump !== false && !keepStreak) s.streak = 0;
    return { state: s, gained: 0 };
  }
  s.streak = st.streak + 1;
  const gained = Math.round((event === 'coin' ? cfg.points.coin : cfg.points.clear) * streakMult(s.streak, cfg.streak));
  s.score = st.score + gained;
  if (event === 'coin') s.coinsGot = st.coinsGot + 1; else s.clears = st.clears + 1;
  return { state: s, gained };
}

/** Coins (GDD 4.3): min(60, max(floor, 2 × coinsGot + floor(score / 14))). */
export function hopCoins(score, coinsGot, cfg, completed) { return coinsForRound(score, coinsGot, cfg, completed); }

// ------------------------------------------------------------------ head flick

/**
 * Tilt-flick detector (GDD 3.4 #6, 4.3). Feed |roll − neutral| (degrees) each frame.
 * Fires when the roll goes past onDeg within withinSec of last being under offDeg;
 * re-arms only after coming back under offDeg. A slow tilt disarms until re-armed.
 * @param {{onDeg:number, offDeg:number, withinSec:number}} f
 */
export function createFlick(f) {
  let armed = true, belowT = 0, started = false;
  return {
    /** @param {number|null} deg |roll| from neutral, null = no face @param {number} t seconds @returns {boolean} hop */
    update(deg, t) {
      if (deg == null) return false;
      const a = Math.abs(deg);
      if (!started) { started = true; belowT = t; armed = a < f.offDeg; }
      if (a < f.offDeg) { armed = true; belowT = t; return false; }
      if (a > f.onDeg && armed) {
        armed = false;
        return t - belowT <= f.withinSec;
      }
      return false;
    },
    reset() { armed = true; started = false; },
  };
}
