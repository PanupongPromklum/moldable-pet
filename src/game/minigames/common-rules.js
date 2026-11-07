/**
 * Shared minigame rules (pure: no DOM, no Three, no clock). Used by mimic,
 * bubbles and hop. GDD: design/gdd/minigames-2.md 3.0, 4.x.
 * @module game/minigames/common-rules
 */

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, x) => a + (b - a) * x;

/** `minigames.json › picker` fallback (GDD 7.2). */
export const PICKER_DEFAULTS = Object.freeze({
  order: ['snackRain', 'mimic', 'bubbles', 'hop'],
  favorites: { flower: 'hop', splat: 'mimic', gumdrop: 'snackRain', diamond: 'bubbles', cloud: 'bubbles' },
  favoriteFunScale: 1.2,
  firstPlayEasySec: 8,
  lineCooldownSec: 6,
});

/**
 * Deep-merge `raw` over `defaults`; report keys that fell back. Arrays and
 * extra keys in the data are kept as given (type must match the default).
 * @returns {{ cfg: object, missing: string[] }}
 */
export function mergeConfig(defaults, raw) {
  const missing = [];
  function merge(def, src, path) {
    const out = {};
    for (const k of Object.keys(def)) {
      const d = def[k], s = isObj(src) ? src[k] : undefined;
      if (isObj(d)) out[k] = merge(d, s, path + k + '.');
      else if (Array.isArray(d)) { if (Array.isArray(s) && s.length) out[k] = s; else { out[k] = d; missing.push(path + k); } }
      else if (s !== undefined && typeof s === typeof d) out[k] = s;
      else { out[k] = d; missing.push(path + k); }
    }
    if (isObj(src)) for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  return { cfg: merge(defaults, raw, ''), missing };
}

/** `picker` block with defaults. */
export function resolvePicker(raw) { return mergeConfig(PICKER_DEFAULTS, raw); }

/** mult = min(max, 1 + floor(streak / step) × bonusPerStep) (GDD 3.0). */
export function streakMult(streak, s) {
  const step = Math.max(1, Math.floor(s?.step) || 1);
  return Math.min(s?.maxMultiplier ?? 3, 1 + Math.floor(Math.max(0, streak) / step) * (s?.bonusPerStep ?? 0.5));
}

/** Eased progress e = (t / D) ^ power. */
export function easeAt(t, D, power) { return Math.pow(clamp01(t / Math.max(1e-6, D)), power || 1); }

/**
 * Coins per round (GDD 3.0): min(max, max(floor, pickups × coinValue + floor(score / coinsPerPoints))),
 * floor = minCoinsPerRound only for a completed round (when minCoinsOnlyIfComplete).
 * @param {number} score @param {number} pickups coin pickups
 * @param {{coinValue?:number, coinsPerPoints:number, minCoinsPerRound:number, maxCoinsPerRound:number, minCoinsOnlyIfComplete?:boolean}} cfg
 * @param {boolean} completed
 */
export function coinsForRound(score, pickups, cfg, completed) {
  const got = Math.max(0, Math.floor(pickups) || 0) * Math.max(0, Math.floor(cfg.coinValue ?? 0) || 0);
  const bonus = cfg.coinsPerPoints > 0 ? Math.floor(Math.max(0, score) / cfg.coinsPerPoints) : 0;
  const floor = completed || cfg.minCoinsOnlyIfComplete === false ? Math.max(0, cfg.minCoinsPerRound) : 0;
  return Math.max(0, Math.min(cfg.maxCoinsPerRound, Math.max(floor, got + bonus)));
}

/**
 * Need deltas at round end (GDD 3.0): fun × playGain × fav × f, social × f, hunger × f.
 * @param {{fun:number, social:number, hunger:number}} needs cfg.needs
 * @param {number} f fraction played 0..1
 * @param {number} [playGain] persona playGain
 * @param {number} [favScale] picker.favoriteFunScale when favourite, else 1
 */
export function needDeltas(needs, f, playGain = 1, favScale = 1) {
  const k = clamp01(f), n = needs || {};
  return {
    fun: Math.abs(Number(n.fun) || 0) * playGain * favScale * k,
    social: Math.abs(Number(n.social) || 0) * k,
    hunger: -Math.abs(Number(n.hunger) || 0) * k,
  };
}

/** Apply deltas to a needs object, clamped [0, 1] (pure; returns a copy). */
export function applyNeeds(levels, d) {
  const o = { ...levels };
  for (const k of Object.keys(d)) if (k in o) o[k] = clamp01(o[k] + d[k]);
  return o;
}

/** Deterministic RNG (mulberry32) for tests and the balance sim. */
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
