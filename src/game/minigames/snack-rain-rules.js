/**
 * Snack Rain rules — pure functions only (no DOM, no Three, no clock, no
 * randomness of their own). Numbers come from `assets/data/minigames.json` ›
 * `snackRain` (loop); formulas follow design/gdd/minigame-snack-rain.md §4.
 * Unit tests: tests/unit/snack-rain.test.mjs (GDD §8 criteria 1–10).
 * @module game/minigames/snack-rain-rules
 */

// ------------------------------------------------------------------ config

/**
 * Fallbacks used only when minigames.json lacks a key (keeps the build playable
 * if the data file is missing). They mirror Loop's first data file; the file
 * always wins. `resolveConfig` reports every key that fell back.
 */
export const SNACK_RAIN_DEFAULTS = Object.freeze({
  title: 'ฝนขนม',
  durationSec: 45, countdownSec: 3, pauseResumeCountdownSec: 3,
  lanesOrWidth: 0.86, playWidthMaxUnits: 6, catchRadius: 0.55, itemSize: 0.45,
  move: { keySpeed: 1.1, followPerSec: 14 },
  spawn: { startPerSec: 0.9, endPerSec: 2.0, rampPower: 1.3, maxOnScreen: 6, minGapSec: 0.22, edgeMargin: 0.06 },
  fallSpeed: { start: 0.32, end: 0.62, jitter: 0.08 },
  items: {
    snack: { weight: 0.74, points: 10, likedBonus: 5 },
    coin: { weight: 0.16, points: 15, coins: 2 },
    demon: { weight: 0.1, points: -20, graceSec: 8, rampSec: 17, maxInARow: 1, grumpySec: 0.8 },
  },
  streak: { step: 4, bonusPerStep: 0.5, maxMultiplier: 3, resetOnMiss: false, resetOnDemon: true },
  coinsPerPoints: 40, minCoinsPerRound: 5, minCoinsOnlyIfComplete: true, maxCoinsPerRound: 60,
  needs: { fun: 0.25, social: 0.1, hunger: -0.05 },
  lines: { start: 'minigameStart', demon: 'minigameDemon', end: 'minigameWin', demonLineCooldownSec: 6 },
});

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Deep-merge the data block over the defaults; report keys that fell back.
 * Extra keys in the data (e.g. `items.snack.foods`) are kept.
 * @param {object|null|undefined} raw `minigames.json` › `snackRain`
 * @returns {{ cfg: object, missing: string[] }}
 */
export function resolveConfig(raw) {
  const missing = [];
  function merge(def, src, path) {
    const out = {};
    for (const k of Object.keys(def)) {
      const d = def[k], s = isObj(src) ? src[k] : undefined;
      if (isObj(d)) out[k] = merge(d, s, path + k + '.');
      else if (s !== undefined && typeof s === typeof d) out[k] = s;
      else { out[k] = d; missing.push(path + k); }
    }
    if (isObj(src)) for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  return { cfg: merge(SNACK_RAIN_DEFAULTS, raw, ''), missing };
}

// ------------------------------------------------------------------ pace

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Eased round progress e = (t / D) ^ rampPower (GDD 4). */
export function ease(elapsed, cfg) {
  const p = clamp01(elapsed / Math.max(1e-6, cfg.durationSec));
  return Math.pow(p, Math.max(0.01, cfg.spawn.rampPower));
}

/** rate(t) — objects per second (GDD 4.1). */
export function spawnRate(elapsed, cfg) {
  return cfg.spawn.startPerSec + (cfg.spawn.endPerSec - cfg.spawn.startPerSec) * ease(elapsed, cfg);
}

/**
 * fall(t) in visible play heights per second (GDD 4.1).
 * @param {number} elapsed
 * @param {object} cfg
 * @param {number} [r] random in [0, 1) for the ± jitter; omit (or 0.5) for none
 */
export function fallSpeedAt(elapsed, cfg, r = 0.5) {
  const base = cfg.fallSpeed.start + (cfg.fallSpeed.end - cfg.fallSpeed.start) * ease(elapsed, cfg);
  return base * (1 + cfg.fallSpeed.jitter * (r * 2 - 1));
}

/**
 * Demon weight now: 0 during graceSec, ramps to `weight` over rampSec, and 0
 * once `maxInARow` demons came in a row (GDD 4.2).
 */
export function demonWeight(elapsed, cfg, demonsInARow = 0) {
  const d = cfg.items.demon;
  if (!d || demonsInARow >= Math.max(1, d.maxInARow)) return 0;
  return d.weight * clamp01((elapsed - d.graceSec) / Math.max(1e-6, d.rampSec));
}

/**
 * Weighted kind pick with the demon ramp (GDD 4.2).
 * @param {number} r random in [0, 1)
 * @param {number} elapsed play seconds
 * @param {object} cfg
 * @param {number} [demonsInARow] demons spawned in a row just before this one
 * @returns {string} 'snack' | 'coin' | 'demon' (or another kind loop adds)
 */
export function pickKind(r, elapsed, cfg, demonsInARow = 0) {
  let total = 0;
  const w = {};
  for (const k of Object.keys(cfg.items)) {
    const it = cfg.items[k];
    const wk = k === 'demon' ? demonWeight(elapsed, cfg, demonsInARow) : (isObj(it) && it.weight > 0 ? it.weight : 0);
    w[k] = wk; total += wk;
  }
  if (!(total > 0)) return 'snack';
  let x = r * total, last = 'snack';
  for (const k of Object.keys(w)) { if (!w[k]) continue; last = k; if (x < w[k]) return k; x -= w[k]; }
  return last;
}

/**
 * Whether a spawn may happen now (GDD 3.4): fewer than maxOnScreen falling and
 * at least minGapSec since the previous spawn.
 */
export function canSpawn(onScreen, sinceLastSpawn, cfg) {
  return onScreen < cfg.spawn.maxOnScreen && sinceLastSpawn >= cfg.spawn.minGapSec;
}

// ------------------------------------------------------------------ area

/**
 * Play area for the pet line (GDD 3.2).
 * `lanesOrWidth` < 2: continuous, width = value × visible width, capped at
 * `playWidthMaxUnits`. Integer ≥ 2: that many lanes across the visible width
 * (same cap). `petHalf` keeps the pet's body on screen (AC 12).
 * @param {number} visibleWidth world units at the pet's depth
 * @param {object} cfg
 * @param {number} [petHalf] half the pet body width (world units)
 * @returns {{ half: number, lanes: number, petHalfRange: number, spawnHalf: number }}
 */
export function playArea(visibleWidth, cfg, petHalf = 0) {
  const v = cfg.lanesOrWidth;
  const lanes = Number.isInteger(v) && v >= 2 ? v : 0;
  const width = Math.min(cfg.playWidthMaxUnits, visibleWidth * (lanes ? 1 : Math.max(0.1, v)));
  const half = width / 2;
  const petHalfRange = Math.max(0, Math.min(half, visibleWidth / 2 - petHalf));
  const spawnHalf = Math.max(0, half - cfg.spawn.edgeMargin * width);
  return { half, lanes, petHalfRange, spawnHalf };
}

/** Lane centre x for lane i of `area` (lanes mode). */
export function laneX(i, area) {
  const w = (2 * area.half) / area.lanes;
  return -area.half + (Math.max(0, Math.min(area.lanes - 1, i)) + 0.5) * w;
}

/** Nearest lane index for an x (lanes mode). */
export function nearestLane(x, area) {
  const w = (2 * area.half) / area.lanes;
  return Math.max(0, Math.min(area.lanes - 1, Math.floor((x + area.half) / w)));
}

/** Spawn x for r in [0, 1): a lane centre, or uniform inside the spawn half-width. */
export function spawnX(r, area) {
  if (area.lanes >= 2) return laneX(Math.floor(r * area.lanes), area);
  return (r * 2 - 1) * area.spawnHalf;
}

// ------------------------------------------------------------------ score

/**
 * mult(streak) = min(maxMultiplier, 1 + floor(streak / step) × bonusPerStep),
 * with `streak` counted after this catch (GDD 4.3).
 */
export function streakMultiplier(streak, s) {
  const step = Math.max(1, Math.floor(s.step) || 1);
  return Math.min(s.maxMultiplier, 1 + Math.floor(Math.max(0, streak) / step) * s.bonusPerStep);
}

/** @returns {{ score: number, streak: number, coinsCaught: number, caught: number, demons: number }} */
export function newRoundState() { return { score: 0, streak: 0, coinsCaught: 0, caught: 0, demons: 0 }; }

/**
 * Apply one catch (GDD 4.3). Snack / coin: streak + 1, then
 * score += round((points + liked × likedBonus) × mult(streak)). Demon:
 * score = max(0, score − |points|), streak = 0 (when resetOnDemon). Coins
 * caught are never lost. Does not mutate `st`.
 * @param {ReturnType<typeof newRoundState>} st
 * @param {string} kind
 * @param {object} cfg
 * @param {boolean} [liked] snack is in the character's foods.json likes
 * @returns {{ state: ReturnType<typeof newRoundState>, delta: number, multiplier: number }}
 */
export function applyCatch(st, kind, cfg, liked = false) {
  const it = cfg.items[kind] || { points: 0 };
  const next = { ...st };
  if (kind === 'demon') {
    next.score = Math.max(0, st.score - Math.abs(Number(it.points) || 0));
    if (cfg.streak.resetOnDemon !== false) next.streak = 0;
    next.demons = st.demons + 1;
    return { state: next, delta: next.score - st.score, multiplier: 1 };
  }
  next.streak = st.streak + 1;
  const mult = streakMultiplier(next.streak, cfg.streak);
  const base = (Number(it.points) || 0) + (liked && kind === 'snack' ? Number(it.likedBonus) || 0 : 0);
  const delta = Math.round(Math.max(0, base) * mult);
  next.score = st.score + delta; next.caught = st.caught + 1;
  if (kind === 'coin') next.coinsCaught = st.coinsCaught + 1;
  return { state: next, delta, multiplier: mult };
}

/** An object fell past: only breaks the streak when `resetOnMiss` (never for demons). */
export function applyMiss(st, kind, cfg) {
  return kind !== 'demon' && cfg.streak.resetOnMiss ? { ...st, streak: 0 } : st;
}

/**
 * coinsEarned = min(max, max(minFloor, coinsCaught × coin.coins + floor(score / coinsPerPoints)))
 * where minFloor = minCoinsPerRound if the round was completed (or
 * minCoinsOnlyIfComplete is false), else 0 (GDD 4.4).
 * @param {number} score
 * @param {number} coinsCaught coin objects caught
 * @param {object} cfg
 * @param {boolean} completed round ran to time-up
 */
export function roundCoins(score, coinsCaught, cfg, completed) {
  const caught = Math.max(0, Math.floor(coinsCaught) || 0) * Math.max(0, Math.floor(cfg.items.coin?.coins) || 0);
  const bonus = cfg.coinsPerPoints > 0 ? Math.floor(Math.max(0, score) / cfg.coinsPerPoints) : 0;
  const floor = completed || !cfg.minCoinsOnlyIfComplete ? Math.max(0, cfg.minCoinsPerRound) : 0;
  return Math.max(0, Math.min(cfg.maxCoinsPerRound, Math.max(floor, caught + bonus)));
}

/**
 * Need deltas on round end (GDD 4.5), f = played / D:
 * fun × playGain × f, social × f, hunger × f (hunger always a drop).
 * @param {object} cfg
 * @param {number} played seconds of play
 * @param {number} [playGain] persona playGain (default 1)
 */
export function roundNeedDeltas(cfg, played, playGain = 1) {
  const f = clamp01(played / Math.max(1e-6, cfg.durationSec));
  const n = cfg.needs || {};
  return {
    fun: Math.abs(Number(n.fun) || 0) * playGain * f,
    social: Math.abs(Number(n.social) || 0) * f,
    hunger: -Math.abs(Number(n.hunger) || 0) * f,
  };
}
