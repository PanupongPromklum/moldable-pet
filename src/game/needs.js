/**
 * Needs rules — pure functions only (no DOM, no clock, no randomness of their own).
 * Every number comes from the loaded data files (`assets/data/needs.json`,
 * `foods.json`, `personas.json`); see `design/gdd/needs-system.md` sections 3 and 4.
 *
 * Levels are 0..1 where 1 = satisfied.
 * @module game/needs
 */

const MS_PER_HOUR = 3600000;

/** Clamp to [0, 1]; non-numbers become NaN so callers can detect them. */
export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * List of need ids in data order.
 * @param {object} needsCfg parsed needs.json
 * @returns {string[]}
 */
export function needIds(needsCfg) {
  return Object.keys(needsCfg.needs);
}

/**
 * Fresh need levels from `needs.<id>.start`.
 * @param {object} needsCfg
 * @returns {Record<string, number>}
 */
export function startLevels(needsCfg) {
  const out = {};
  for (const id of needIds(needsCfg)) out[id] = needsCfg.needs[id].start;
  return out;
}

/**
 * Repair a levels object from a save: clamp to [0, 1], non-numbers → `start`,
 * unknown keys dropped, missing keys added (GDD edge case 8).
 * @param {any} raw
 * @param {object} needsCfg
 * @returns {Record<string, number>}
 */
export function sanitizeLevels(raw, needsCfg) {
  const out = {};
  for (const id of needIds(needsCfg)) {
    const v = raw && typeof raw === 'object' ? raw[id] : undefined;
    out[id] = typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : needsCfg.needs[id].start;
  }
  return out;
}

/**
 * State of one need: 'urgent' | 'low' | 'ok' | 'good' (GDD 3.1).
 * @param {number} level
 * @param {{low:number, urgent:number, good:number}} cfg one entry of needs.json `needs`
 */
export function needState(level, cfg) {
  if (level <= cfg.urgent) return 'urgent';
  if (level <= cfg.low) return 'low';
  if (level >= cfg.good) return 'good';
  return 'ok';
}

/**
 * Wall-clock decay for one character (GDD 4.1).
 * Gap ≤ offlineGapSeconds: online decay, floor 0.
 * Gap > offlineGapSeconds: offline catch-up, gap capped at offlineCapHours and
 * levels never pushed below offlineFloor (a level already below it stays put).
 * Clock moved backwards (tNow < tLast): no change.
 *
 * @param {Record<string, number>} levels current levels (not mutated)
 * @param {Record<string, number>} rates persona `needRates` (missing → 1)
 * @param {object} needsCfg parsed needs.json
 * @param {number} tLast ms timestamp of the previous tick
 * @param {number} tNow ms timestamp now
 * @returns {{ levels: Record<string, number>, tLast: number, gapMs: number, offline: boolean }}
 */
export function decayNeeds(levels, rates, needsCfg, tLast, tNow) {
  const out = {};
  const gapMs = tNow - tLast;
  const ids = needIds(needsCfg);
  if (!(gapMs > 0)) {
    for (const id of ids) out[id] = levels[id];
    return { levels: out, tLast: tNow, gapMs: 0, offline: false };
  }
  const offline = gapMs / 1000 > needsCfg.offlineGapSeconds;
  const hours = offline ? Math.min(gapMs / MS_PER_HOUR, needsCfg.offlineCapHours) : gapMs / MS_PER_HOUR;
  for (const id of ids) {
    const r = needsCfg.needs[id].decayPerHour * (rates && typeof rates[id] === 'number' ? rates[id] : 1);
    const L = levels[id];
    const next = L - r * hours;
    out[id] = offline ? Math.max(next, Math.min(L, needsCfg.offlineFloor)) : clamp01(next);
  }
  return { levels: out, tLast: tNow, gapMs, offline };
}

/**
 * Add `amount` to one need in place, clamped (GDD 4.2). Used for per-frame gains,
 * so it mutates instead of allocating.
 * @param {Record<string, number>} levels
 * @param {string} need
 * @param {number} amount
 */
export function addNeed(levels, need, amount) {
  if (!(need in levels) || !amount) return;
  levels[need] = clamp01(levels[need] + amount);
}

/**
 * Food reaction kind for a character: 'like' | 'dislike' | 'ok' (GDD 3.4 step 4).
 * @param {object} foodsCfg parsed foods.json
 * @param {string} charKey
 * @param {string} foodId
 */
export function foodReactionKind(foodsCfg, charKey, foodId) {
  if ((foodsCfg.likes?.[charKey] || []).includes(foodId)) return 'like';
  if ((foodsCfg.dislikes?.[charKey] || []).includes(foodId)) return 'dislike';
  return 'ok';
}

/**
 * Eating rule (GDD 3.4 / 4.3). Does not mutate `levels`.
 * @param {Record<string, number>} levels
 * @param {string} foodId
 * @param {string} charKey
 * @param {object} foodsCfg parsed foods.json
 * @param {object} needsCfg parsed needs.json
 * @param {{ nowSeconds?: number, lastEatSeconds?: number }} [timing] for the cooldown rule
 * @returns {{ outcome: 'eaten'|'full'|'cooldown'|'unknown', kind?: string, levels: Record<string, number> }}
 */
export function eatFood(levels, foodId, charKey, foodsCfg, needsCfg, timing = {}) {
  const copy = { ...levels };
  const food = foodsCfg.foods.find((f) => f.id === foodId);
  if (!food) return { outcome: 'unknown', levels: copy };
  const eat = needsCfg.actions.eat;
  if (typeof timing.nowSeconds === 'number' && typeof timing.lastEatSeconds === 'number'
      && timing.nowSeconds - timing.lastEatSeconds < eat.cooldownSeconds) {
    return { outcome: 'cooldown', levels: copy };
  }
  if (copy.hunger >= eat.fullThreshold) return { outcome: 'full', levels: copy };
  const kind = foodReactionKind(foodsCfg, charKey, foodId);
  const rx = foodsCfg.reactions[kind];
  copy.hunger = clamp01(copy.hunger + food.hunger * rx.hungerScale);
  copy.fun = clamp01(copy.fun + (food.fun || 0) + rx.funBonus);
  const toiletDelta = typeof food.toilet === 'number' ? food.toilet : -needsCfg.actions.eatToiletCost;
  copy.toilet = clamp01(copy.toilet + toiletDelta);
  return { outcome: 'eaten', kind, levels: copy };
}

/**
 * True when the pet says it does not need the toilet (GDD 3.5).
 * @param {Record<string, number>} levels
 * @param {object} needsCfg
 */
export function toiletNoNeed(levels, needsCfg) {
  return levels.toilet > needsCfg.actions.toiletNoNeedAbove;
}

/**
 * Flush rule (GDD 3.5): toilet = flush.toilet; relief bonus only if toilet was ≤ low.
 * @param {Record<string, number>} levels
 * @param {object} needsCfg
 * @returns {{ levels: Record<string, number>, relieved: boolean, noNeed: boolean }}
 */
export function flushToilet(levels, needsCfg) {
  const copy = { ...levels };
  const relieved = levels.toilet <= needsCfg.needs.toilet.low;
  const noNeed = toiletNoNeed(levels, needsCfg);
  copy.toilet = clamp01(needsCfg.actions.flush.toilet);
  if (relieved) copy.fun = clamp01(copy.fun + needsCfg.actions.flushReliefFun);
  return { levels: copy, relieved, noNeed };
}

/**
 * Need-driven mood (GDD 3.6 steps 2–4). First urgent need in `moods.priority`,
 * else first low need; else allGood (every need good) or neutral.
 * @param {Record<string, number>} levels
 * @param {object} needsCfg
 * @param {object} persona one entry of personas.json (for moodOverrides)
 * @returns {{ need: string|null, state: string|null, expr: string, idle?: string, idleEverySeconds?: number, line?: string }}
 */
export function pickNeedMood(levels, needsCfg, persona) {
  const moods = needsCfg.moods;
  for (const wanted of ['urgent', 'low']) {
    for (const need of moods.priority) {
      const st = needState(levels[need], needsCfg.needs[need]);
      if (st !== wanted) continue;
      const def = moods.states[need][st];
      const override = persona?.moodOverrides?.[`${need}.${st}`];
      return { need, state: st, expr: override || def.expr, idle: def.idle, idleEverySeconds: def.idleEverySeconds, line: def.line };
    }
  }
  const allGood = needIds(needsCfg).every((id) => needState(levels[id], needsCfg.needs[id]) === 'good');
  return { need: null, state: null, expr: allGood ? moods.allGood.expr : moods.neutral.expr };
}

/**
 * Weighted pick of a return-after-absence style (owner decision 2026-10-25).
 * @param {Record<string, number>} weights persona `returnStyles`, e.g. { gentle: .3, dramatic: .5, sleepy: .2 }
 * @param {number} r a random number in [0, 1)
 * @returns {string} style key; 'gentle' when weights are empty or invalid
 */
export function pickReturnStyle(weights, r) {
  const entries = Object.entries(weights || {}).filter(([, w]) => typeof w === 'number' && w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (!total) return 'gentle';
  let x = r * total;
  for (const [k, w] of entries) { if (x < w) return k; x -= w; }
  return entries[entries.length - 1][0];
}
