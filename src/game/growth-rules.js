/**
 * Growth & raised personality — pure rules (no DOM, no clock, no Three.js).
 * Design: design/gdd/growth-personality.md (loop) §3–§5, formulas §4.1–§4.3.
 * Numbers: `assets/data/growth.json`. `DEFAULT_GROWTH` mirrors the GDD §7.2
 * draft only so the build keeps working while the file is missing; every value
 * the file provides wins (`resolveGrowth` lists what fell back).
 *
 * Time is always the frame `dt` the caller passes (clamped), never `Date.now()`,
 * so a device clock change cannot make a pet grow (GDD 3.1, edge 4). `nowMs`
 * values passed in are only stored for display (`traitAt`, `lastChangeAt`).
 *
 * Unit tests: tests/unit/growth.test.mjs.
 * @module game/growth-rules
 */

export const STAGES = Object.freeze(['baby', 'kid', 'grown']);
export const CATS = Object.freeze(['cuddly', 'playful', 'foodie', 'stylish']);
export const TRAITS = Object.freeze(['cheerful', 'cuddly', 'playful', 'foodie', 'stylish']);
/** Largest frame step that counts (GDD 3.1). */
export const MAX_DT = 0.1;

/** Fallback copy of the GDD §7.2 draft (used only for keys growth.json lacks). */
export const DEFAULT_GROWTH = Object.freeze({
  stages: {
    baby: { label: 'ก้อนจิ๋ว', atMinutes: 0, scale: 0.7, eyeScale: 1.3, roundness: 1.08, jiggle: 1.3, hopScale: 0.7, pitchSemitones: 3, vocabLevel: 1, needRateScale: 1 },
    kid: { label: 'ก้อนซน', atMinutes: 45, scale: 0.85, eyeScale: 1.12, roundness: 1.03, jiggle: 1.15, hopScale: 0.9, pitchSemitones: 1.5, vocabLevel: 2, needRateScale: 1 },
    grown: { label: 'ก้อนโต', atMinutes: 180, scale: 1, eyeScale: 1, roundness: 1, jiggle: 1, hopScale: 1, pitchSemitones: 0, vocabLevel: 3, needRateScale: 1 },
  },
  transitionSec: 2.5,
  engagedWindowSec: 45,
  offline: { minutesPerHour: 0, capMinutes: 10 },
  dailySoftCap: { minutes: 0, rate: 0.5 },
  bucketSec: 60,
  capPerBucket: 6,
  minigameMinuteWeight: 0.5,
  minigameWeightPerSec: 0.1,
  categoryScale: { cuddly: 1, playful: 1, foodie: 1, stylish: 1.5 },
  events: {
    strokePerSec: { cuddly: 1 }, carryPerSec: { cuddly: 0.5 }, talk: { cuddly: 3 }, cameraHello: { cuddly: 3 },
    poke: { playful: 1 }, boing: { playful: 2 }, squishPerSec: { playful: 1 },
    eat: { foodie: 4 }, eatLike: { foodie: 5 },
    equip: { stylish: 3 }, buy: { stylish: 4 }, decorEquip: { stylish: 3 }, decorBuy: { stylish: 4 },
    flush: { neutral: 2 },
  },
  minigameMix: {
    snackRain: { playful: 0.6, foodie: 0.4 }, mimic: { cuddly: 0.5, playful: 0.5 },
    bubbles: { playful: 0.7, stylish: 0.3 }, hop: { playful: 1 },
  },
  traits: {
    cheerful: { label: 'ร่าเริง', because: 'เพราะเธอดูแลครบทุกอย่างเลย', idle: ['hop', 'jelly', 'nod'] },
    cuddly: { label: 'ขี้อ้อน', because: 'เพราะเธอลูบหัวและคุยด้วยบ่อยมาก', idle: ['wiggle', 'tilt'] },
    playful: { label: 'ขี้เล่น', because: 'เพราะเธอชวนเล่นสนุกบ่อยมาก', idle: ['hop', 'shake', 'jelly'] },
    foodie: { label: 'นักกิน', because: 'เพราะเธอป้อนของอร่อยบ่อยมาก', idle: ['chew', 'gulp'] },
    stylish: { label: 'สายแฟ', because: 'เพราะเธอแต่งตัวแต่งห้องให้บ่อยมาก', idle: ['sway', 'tilt'] },
  },
  traitIdle: { everySeconds: 16 },
  traitLineShare: 0.5,
  minTallyForTrait: 20,
  balancedMaxShare: 0.36,
  tieMargin: 0.02,
  hint: { minTally: 15, everyMinutes: 20 },
  drift: { decayPerBucket: 0.01, confirmMinutes: 30, minGapMinutes: 120 },
  minigameMinScale: 0.85,
  personas: {},
  babble: {},
});

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const num = (v, d) => (Number.isFinite(v) ? v : d);

/**
 * Merge growth.json over the defaults (one level deep for blocks, whole entries
 * for stages / traits / events / mixes / personas).
 * @param {object|null} json
 * @returns {{ cfg: object, missing: string[] }}
 */
export function resolveGrowth(json) {
  const src = isObj(json) ? json : {};
  const missing = [];
  const cfg = {};
  for (const [k, d] of Object.entries(DEFAULT_GROWTH)) {
    const v = src[k];
    if (v === undefined) { missing.push(k); cfg[k] = clone(d); continue; }
    if (isObj(d) && isObj(v)) {
      const deep = k === 'stages' || k === 'traits';
      const o = clone(d);
      for (const [kk, vv] of Object.entries(v)) o[kk] = deep && isObj(o[kk]) && isObj(vv) ? { ...o[kk], ...vv } : vv;
      cfg[k] = o;
    } else cfg[k] = v;
  }
  for (const [k, v] of Object.entries(src)) if (!(k in cfg)) cfg[k] = v;
  return { cfg, missing };
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/** Stage thresholds in seconds `{ K, G }`. */
export function thresholds(cfg) {
  return { K: num(cfg.stages.kid?.atMinutes, 45) * 60, G: num(cfg.stages.grown?.atMinutes, 180) * 60 };
}

/** Index of a stage id (unknown → -1). */
export const stageIndex = (s) => STAGES.indexOf(s);

/**
 * Stage from engaged seconds, never below the saved stage (GDD 4.1, edge 6).
 * @param {number} T activeSec @param {object} cfg @param {string|null} [saved]
 */
export function stageOf(T, cfg, saved = null) {
  const { K, G } = thresholds(cfg);
  const byT = T >= G ? 'grown' : T >= K ? 'kid' : 'baby';
  return stageIndex(saved) > stageIndex(byT) ? saved : byT;
}

/** Progress 0..1 toward the next stage (GDD 4.1 ring); grown → 1. */
export function stageProgress(T, stage, cfg) {
  const { K, G } = thresholds(cfg);
  if (stage === 'grown') return 1;
  if (stage === 'kid') return clamp01((T - K) / Math.max(1, G - K));
  return clamp01(T / Math.max(1, K));
}

/** Look of a stage for `pet.setGrowth` + pitch + vocab level. */
export function lookOf(stage, cfg) {
  const s = cfg.stages[stage] || cfg.stages.grown;
  return {
    look: { scale: num(s.scale, 1), eyeScale: num(s.eyeScale, 1), roundness: num(s.roundness, 1), jiggle: num(s.jiggle, 1), hopScale: num(s.hopScale, 1) },
    pitchSemitones: num(s.pitchSemitones, 0), vocabLevel: num(s.vocabLevel, 3), label: s.label || stage,
  };
}

/** Local calendar day key `YYYY-MM-DD` (only used by the daily soft cap). */
export function dayKeyOf(date) {
  const d = date instanceof Date ? date : new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Fresh growth record (save v5 `chars[key].growth`, GDD 3.10).
 * @param {'baby'|'kid'|'grown'} [stage] @param {number} [activeSec] @param {string} [dayKey]
 */
export function newGrowth(stage = 'baby', activeSec = 0, dayKey = '') {
  return {
    activeSec, stage, stageSeen: stage,
    tally: { cuddly: 0, playful: 0, foodie: 0, stylish: 0 },
    trait: null, traitAt: 0,
    drift: { candidate: null, minutes: 0, lastChangeAt: 0, lastChangeSec: 0 },
    day: { key: dayKey, sec: 0 },
  };
}

/**
 * Valid growth record from anything (hand-edited save, GDD edge 7):
 * activeSec ≥ 0; bad tallies → 0; unknown stage → from T; never below a valid
 * saved stage; unknown trait → recomputed when grown, else null.
 * @param {any} raw @param {object} cfg @param {string} charKey
 */
export function sanitizeGrowth(raw, cfg, charKey) {
  const g = newGrowth();
  if (!isObj(raw)) return g;
  g.activeSec = Number.isFinite(raw.activeSec) && raw.activeSec > 0 ? raw.activeSec : 0;
  for (const c of CATS) { const v = raw.tally?.[c]; g.tally[c] = Number.isFinite(v) && v > 0 ? v : 0; }
  g.stage = stageOf(g.activeSec, cfg, STAGES.includes(raw.stage) ? raw.stage : null);
  g.stageSeen = STAGES.includes(raw.stageSeen) && stageIndex(raw.stageSeen) <= stageIndex(g.stage) ? raw.stageSeen : g.stage;
  if (g.stage === 'grown') g.trait = TRAITS.includes(raw.trait) ? raw.trait : chooseTrait(g.tally, charKey, cfg);
  else g.trait = null;
  g.traitAt = Number.isFinite(raw.traitAt) && raw.traitAt > 0 ? raw.traitAt : 0;
  const d = isObj(raw.drift) ? raw.drift : {};
  g.drift = {
    candidate: TRAITS.includes(d.candidate) ? d.candidate : null,
    minutes: Number.isFinite(d.minutes) && d.minutes > 0 ? Math.floor(d.minutes) : 0,
    lastChangeAt: Number.isFinite(d.lastChangeAt) && d.lastChangeAt > 0 ? d.lastChangeAt : 0,
    lastChangeSec: Number.isFinite(d.lastChangeSec) && d.lastChangeSec >= 0 ? Math.min(d.lastChangeSec, g.activeSec) : 0,
  };
  if (isObj(raw.day) && typeof raw.day.key === 'string') g.day = { key: raw.day.key, sec: Number.isFinite(raw.day.sec) && raw.day.sec > 0 ? raw.day.sec : 0 };
  return g;
}

/**
 * Engaged test (GDD 4.1): in an unpaused minigame round, or a care event in the
 * last `engagedWindowSec`. Times in stage seconds.
 */
export function isEngaged({ time, lastCareAt, inMinigame }, cfg) {
  if (inMinigame) return true;
  return Number.isFinite(lastCareAt) && time - lastCareAt <= cfg.engagedWindowSec;
}

/**
 * Advance engaged time by one frame (GDD 4.1, in place).
 * @param {object} g growth record
 * @param {number} dt frame seconds (clamped to MAX_DT here)
 * @param {{ visible: boolean, engaged: boolean, dayKey?: string }} st
 * @param {object} cfg
 * @returns {number} seconds of growth time added (counted toward buckets too)
 */
export function advanceTime(g, dt, { visible, engaged, dayKey }, cfg) {
  const d = Math.min(MAX_DT, Math.max(0, Number(dt) || 0));
  if (!visible || !engaged || d === 0) return 0;
  if (dayKey && g.day.key !== dayKey) g.day = { key: dayKey, sec: 0 };
  const cap = cfg.dailySoftCap || {};
  const r = cap.minutes > 0 && g.day.sec >= cap.minutes * 60 ? num(cap.rate, 1) : 1;
  g.day.sec += d;
  const add = d * r;
  g.activeSec += add;
  return add;
}

/**
 * Offline growth on return (GDD 4.1; default 0 minutes per hour).
 * @param {object} g @param {number} gapHours @param {object} cfg @returns {number} seconds added
 */
export function offlineGrowth(g, gapHours, cfg) {
  const o = cfg.offline || {};
  const min = Math.min(num(o.capMinutes, 0), Math.max(0, gapHours) * num(o.minutesPerHour, 0));
  const add = Math.max(0, min) * 60;
  g.activeSec += add;
  return add;
}

/** Empty tally bucket. `sec` = counted seconds, `minigameSec` of those in a round. */
export function newBucket() {
  return { sec: 0, minigameSec: 0, raw: { cuddly: 0, playful: 0, foodie: 0, stylish: 0 } };
}

/**
 * Add a care event to the open bucket (GDD 3.4 table). `amount` is 1 for an
 * instant event or the seconds for a `*PerSec` event. Neutral weight is split
 * evenly over the four categories. Unknown events are ignored.
 * @returns {boolean} the event is known
 */
export function addEvent(bucket, event, amount, cfg) {
  const w = cfg.events?.[event];
  if (!isObj(w)) return false;
  const a = Number.isFinite(amount) ? Math.max(0, amount) : 1;
  for (const [c, v] of Object.entries(w)) {
    if (!Number.isFinite(v)) continue;
    if (c === 'neutral') { for (const cc of CATS) bucket.raw[cc] += (v / 4) * a; }
    else if (c in bucket.raw) bucket.raw[c] += v * a;
  }
  return true;
}

/**
 * Minigame seconds into the open bucket: `minigameWeightPerSec × mix_c` per
 * second and they count toward the half-rate factor `P` (GDD 4.2).
 */
export function addMinigameSec(bucket, gameId, sec, cfg) {
  const s = Math.max(0, Number(sec) || 0);
  bucket.minigameSec += s;
  const mix = cfg.minigameMix?.[gameId];
  if (!isObj(mix)) return;
  const k = num(cfg.minigameWeightPerSec, 0.1) * s;
  for (const c of CATS) if (Number.isFinite(mix[c])) bucket.raw[c] += k * mix[c];
}

/** Persona growth block (bias, balancedMaxShare, tendencyOrder) with defaults. */
export function personaGrowth(charKey, cfg) {
  const p = cfg.personas?.[charKey] || {};
  const bias = {};
  for (const c of CATS) bias[c] = num(p.bias?.[c], 1);
  const order = Array.isArray(p.tendencyOrder) ? p.tendencyOrder.filter((c) => CATS.includes(c)) : [];
  for (const c of CATS) if (!order.includes(c)) order.push(c);
  return { bias, balancedMaxShare: num(p.balancedMaxShare, num(cfg.balancedMaxShare, 0.36)), tendencyOrder: order };
}

/**
 * Close a bucket into the tally (GDD 4.2, in place). After grown the old tally
 * decays first (drift 3.8). `fraction` < 1 closes a partial bucket (character
 * switch mid-bucket, edge 5): total points = P × fraction.
 * @param {object} g growth record @param {object} bucket @param {string} charKey @param {object} cfg
 * @param {number} [fraction] defaults to bucket.sec / bucketSec, max 1
 * @returns {{ cuddly: number, playful: number, foodie: number, stylish: number }} points added
 */
export function closeBucket(g, bucket, charKey, cfg, fraction) {
  const bs = Math.max(1, num(cfg.bucketSec, 60));
  const f = clamp01(Number.isFinite(fraction) ? fraction : bucket.sec / bs);
  const out = { cuddly: 0, playful: 0, foodie: 0, stylish: 0 };
  if (g.stage === 'grown') { const k = 1 - num(cfg.drift?.decayPerBucket, 0); for (const c of CATS) g.tally[c] *= k; }
  const cap = num(cfg.capPerBucket, 6);
  let W = 0;
  const w = {};
  for (const c of CATS) { w[c] = Math.min(cap, Math.max(0, bucket.raw[c])); W += w[c]; }
  if (W <= 0) return out;
  const m = clamp01(bucket.minigameSec / Math.max(1e-9, bucket.sec || bs));
  const P = 1 - (1 - num(cfg.minigameMinuteWeight, 0.5)) * m;
  const { bias } = personaGrowth(charKey, cfg);
  for (const c of CATS) {
    out[c] = P * f * (w[c] / W) * num(cfg.categoryScale?.[c], 1) * bias[c];
    g.tally[c] += out[c];
  }
  return out;
}

/** Shares and sorted order of a tally. */
function shares(tally) {
  let S = 0;
  for (const c of CATS) S += Math.max(0, tally[c] || 0);
  const list = CATS.map((c) => ({ c, s: S > 0 ? Math.max(0, tally[c] || 0) / S : 0 }));
  // stable sort: equal shares keep CATS order (tendencyOrder decides real ties below)
  list.sort((a, b) => b.s - a.s);
  return { S, list };
}

/**
 * Trait choice (GDD 4.3).
 * @param {object} tally @param {string} charKey @param {object} cfg
 * @param {number} [minTally] override (kid hint uses hint.minTally)
 * @returns {'cheerful'|'cuddly'|'playful'|'foodie'|'stylish'}
 */
export function chooseTrait(tally, charKey, cfg, minTally = num(cfg.minTallyForTrait, 20)) {
  const { S, list } = shares(tally || {});
  if (S < minTally) return 'cheerful';
  const pg = personaGrowth(charKey, cfg);
  const [top, second] = list;
  if (top.s < pg.balancedMaxShare) return 'cheerful';
  if (top.s - second.s < num(cfg.tieMargin, 0.02)) {
    return pg.tendencyOrder.find((c) => c === top.c || c === second.c) || top.c;
  }
  return top.c;
}

/**
 * Leading trait for the kid-stage hint (GDD 3.6), or null when the tally is
 * still below `hint.minTally`.
 */
export function leadingTrait(tally, charKey, cfg) {
  const { S } = shares(tally || {});
  if (S < num(cfg.hint?.minTally, 15)) return null;
  return chooseTrait(tally, charKey, cfg, 0);
}

/**
 * Drift step after a closed bucket while grown (GDD 3.8, in place).
 * @returns {string|null} the new trait when it changed, else null
 */
export function stepDrift(g, charKey, cfg, nowMs = 0) {
  if (g.stage !== 'grown' || !g.trait) return null;
  const cand = chooseTrait(g.tally, charKey, cfg);
  if (cand === g.trait) { g.drift.candidate = null; g.drift.minutes = 0; return null; }
  if (g.drift.candidate === cand) g.drift.minutes += 1;
  else { g.drift.candidate = cand; g.drift.minutes = 1; }
  const D = cfg.drift || {};
  const gapOk = g.activeSec - (g.drift.lastChangeSec || 0) >= num(D.minGapMinutes, 120) * 60;
  if (g.drift.minutes >= num(D.confirmMinutes, 30) && gapOk) {
    g.trait = cand;
    g.drift = { candidate: null, minutes: 0, lastChangeAt: nowMs, lastChangeSec: g.activeSec };
    return cand;
  }
  return null;
}

/**
 * Update the stage from `activeSec` (never shrinks); at the first time grown,
 * choose the trait. Cards are not decided here (see `pendingCards`).
 * @returns {{ stageChanged: boolean, trait: string|null }}
 */
export function updateStage(g, charKey, cfg, nowMs = 0) {
  const st = stageOf(g.activeSec, cfg, g.stage);
  const changed = st !== g.stage;
  g.stage = st;
  let trait = null;
  if (st === 'grown' && !g.trait) {
    g.trait = chooseTrait(g.tally, charKey, cfg);
    g.traitAt = nowMs;
    g.drift = { candidate: null, minutes: 0, lastChangeAt: nowMs, lastChangeSec: g.activeSec };
    trait = g.trait;
  }
  return { stageChanged: changed, trait };
}

/**
 * Cards still to show, in order (GDD 3.3, edge 8: kid then grown, never skipped):
 * `[{ kind: 'stage', stage }, …, { kind: 'trait', trait }]`. Showing them is the
 * caller's job; it then calls `markSeen`.
 */
export function pendingCards(g) {
  const out = [];
  for (let i = stageIndex(g.stageSeen) + 1; i <= stageIndex(g.stage); i++) {
    out.push({ kind: 'stage', stage: STAGES[i] });
    if (STAGES[i] === 'grown' && g.trait) out.push({ kind: 'trait', trait: g.trait });
  }
  return out;
}

/** Mark one stage card as shown (stageSeen advances one step at a time). */
export function markSeen(g, stage) {
  if (stageIndex(stage) > stageIndex(g.stageSeen) && stageIndex(stage) <= stageIndex(g.stage)) g.stageSeen = stage;
}

/**
 * "Played before" test for the v4 → v5 migration (GDD 3.9 option B): the
 * selected character, any minigame best > 0, or at least one outfit slot worn.
 */
export function playedBefore(key, v4) {
  if (!isObj(v4)) return false;
  if (v4.selected === key && v4.chosen !== false) return true;
  const c = v4.chars?.[key];
  if (!isObj(c)) return false;
  if (isObj(c.best) && Object.values(c.best).some((v) => Number.isFinite(v) && v > 0)) return true;
  if (isObj(c.outfit) && Object.values(c.outfit).some((v) => typeof v === 'string' && v)) return true;
  return false;
}

/**
 * Growth record for a character in a v4 (or older) save: option B — played
 * characters start as `kid` at `T = K`, others `baby`; tally 0, no trait,
 * stageSeen = stage so no card pops on load.
 */
export function migrateGrowth(key, v4, cfg, dayKey = '') {
  if (playedBefore(key, v4)) return newGrowth('kid', thresholds(cfg).K, dayKey);
  return newGrowth('baby', 0, dayKey);
}

/** Pick a line list for an event by vocabulary level / trait (GDD 3.2). */
export function lineSource(persona, cfg, event, { vocabLevel, trait }, random = Math.random) {
  const lines = persona?.lines || {};
  if (vocabLevel <= 1) {
    const baby = lines.baby?.[event];
    if (Array.isArray(baby) && baby.length) return baby;
    const mid = cfg.babble?.[event];
    if (Array.isArray(mid) && mid.length) return mid;
    return lines[event];
  }
  if (vocabLevel >= 3 && trait) {
    const tl = persona?.traits?.[trait]?.lines?.[event];
    if (Array.isArray(tl) && tl.length && random() < num(cfg.traitLineShare, 0.5)) return tl;
  }
  return lines[event];
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
