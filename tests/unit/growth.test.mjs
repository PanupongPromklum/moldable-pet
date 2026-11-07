// Growth & raised personality rules (design/gdd/growth-personality.md §4, §5, §8 AC 1–10).
// Run: node tests/unit/growth.test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, near, deepEq, done } from './_harness.mjs';
import {
  resolveGrowth, DEFAULT_GROWTH, stageOf, stageProgress, isEngaged, advanceTime, newGrowth, newBucket, addEvent,
  addMinigameSec, closeBucket, chooseTrait, leadingTrait, stepDrift, updateStage, pendingCards, markSeen,
  sanitizeGrowth, migrateGrowth, offlineGrowth, lookOf, lineSource, CATS, TRAITS,
} from '../../src/game/growth-rules.js';

const path = fileURLToPath(new URL('../../assets/data/growth.json', import.meta.url));
const live = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
// Rules are tested on the GDD §7.2 numbers (the ACs are written against them);
// the persona block is the GDD §3.7 table.
const PERSONAS = {
  flower: { bias: { cuddly: 1.1, playful: 1.2, foodie: 1.0, stylish: 0.9 }, balancedMaxShare: 0.36, tendencyOrder: ['playful', 'cuddly', 'foodie', 'stylish'] },
  splat: { bias: { cuddly: 1.25, playful: 0.9, foodie: 1.0, stylish: 1.1 }, balancedMaxShare: 0.36, tendencyOrder: ['cuddly', 'stylish', 'foodie', 'playful'] },
  gumdrop: { bias: { cuddly: 1, playful: 1, foodie: 1, stylish: 1 }, balancedMaxShare: 0.4, tendencyOrder: ['cuddly', 'playful', 'foodie', 'stylish'] },
  diamond: { bias: { cuddly: 1.0, playful: 0.9, foodie: 0.9, stylish: 1.3 }, balancedMaxShare: 0.36, tendencyOrder: ['stylish', 'cuddly', 'playful', 'foodie'] },
  cloud: { bias: { cuddly: 0.85, playful: 1.0, foodie: 1.15, stylish: 1.0 }, balancedMaxShare: 0.36, tendencyOrder: ['foodie', 'playful', 'stylish', 'cuddly'] },
};
const CFG = resolveGrowth({ ...JSON.parse(JSON.stringify(DEFAULT_GROWTH)), personas: PERSONAS }).cfg;
const FIVE = ['flower', 'splat', 'gumdrop', 'diamond', 'cloud'];

/** Deterministic RNG (mulberry32). */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

console.log('growth rules');

test('growth.json (when present) resolves with no missing keys', () => {
  if (!live) { console.log('        (growth.json not landed yet — defaults used)'); return; }
  const { missing } = resolveGrowth(live);
  deepEq(missing, [], 'missing');
});

test('AC1 engaged time: care every 30 s → 60 s; no care after t=0 → 45 s; hidden → 0', () => {
  const run = (visible, careEvery) => {
    const g = newGrowth(); let lastCare = 0;
    for (let i = 1; i <= 600; i++) {
      const t = i * 0.1;
      if (careEvery && Math.abs(t % careEvery) < 1e-6) lastCare = t;
      advanceTime(g, 0.1, { visible, engaged: isEngaged({ time: t, lastCareAt: lastCare, inMinigame: false }, CFG) }, CFG);
    }
    return g.activeSec;
  };
  near(run(true, 30), 60, 0.1, 'care every 30 s');
  near(run(true, 0), 45, 0.1, 'engaged window');
  near(run(false, 30), 0, 1e-9, 'hidden');
});

test('engaged: an unpaused minigame round counts without care; dt is clamped to 0.1', () => {
  assert(isEngaged({ time: 999, lastCareAt: 0, inMinigame: true }, CFG), 'minigame');
  assert(!isEngaged({ time: 999, lastCareAt: -Infinity, inMinigame: false }, CFG), 'idle');
  const g = newGrowth();
  eq(advanceTime(g, 5, { visible: true, engaged: true }, CFG), 0.1, 'clamped');
  eq(advanceTime(g, -1, { visible: true, engaged: true }, CFG), 0, 'negative');
});

test('AC2 stageOf thresholds and never shrinks', () => {
  eq(stageOf(2699, CFG), 'baby', '2699'); eq(stageOf(2700, CFG), 'kid', '2700');
  eq(stageOf(10799, CFG), 'kid', '10799'); eq(stageOf(10800, CFG), 'grown', '10800');
  eq(stageOf(0, CFG, 'grown'), 'grown', 'saved grown');
  near(stageProgress(1350, 'baby', CFG), 0.5, 1e-9, 'baby half'); near(stageProgress(2700 + 4050, 'kid', CFG), 0.5, 1e-9, 'kid half'); eq(stageProgress(0, 'grown', CFG), 1, 'grown');
});

test('AC3 200 pokes in one bucket → exactly P × 1 × bias.playful, nothing elsewhere', () => {
  const g = newGrowth(); const b = newBucket(); b.sec = 60;
  for (let i = 0; i < 200; i++) addEvent(b, 'poke', 1, CFG);
  closeBucket(g, b, 'flower', CFG);
  near(g.tally.playful, 1.2, 1e-9, 'playful'); eq(g.tally.cuddly + g.tally.foodie + g.tally.stylish, 0, 'others');
});

test('AC4 full Snack Rain minute for มิน → playful 0.3, foodie 0.2 (P = 0.5)', () => {
  const g = newGrowth(); const b = newBucket(); b.sec = 60;
  for (let i = 0; i < 600; i++) addMinigameSec(b, 'snackRain', 0.1, CFG);
  closeBucket(g, b, 'gumdrop', CFG);
  near(g.tally.playful, 0.3, 1e-9, 'playful'); near(g.tally.foodie, 0.2, 1e-9, 'foodie'); eq(g.tally.cuddly, 0, 'cuddly');
});

test('AC5 flush-only bucket → 0.25 each before scale/bias (stylish × 1.5)', () => {
  const g = newGrowth(); const b = newBucket(); b.sec = 60;
  addEvent(b, 'flush', 1, CFG);
  closeBucket(g, b, 'gumdrop', CFG);
  near(g.tally.cuddly, 0.25, 1e-9, 'cuddly'); near(g.tally.playful, 0.25, 1e-9, 'playful'); near(g.tally.foodie, 0.25, 1e-9, 'foodie');
  near(g.tally.stylish, 0.25 * 1.5, 1e-9, 'stylish × categoryScale');
});

test('per-second events, capPerBucket and the empty bucket (edge 13)', () => {
  const g = newGrowth(); const b = newBucket(); b.sec = 60;
  addEvent(b, 'strokePerSec', 3, CFG); addEvent(b, 'eat', 1, CFG);   // cuddly 3, foodie 4 → 3/7, 4/7
  closeBucket(g, b, 'gumdrop', CFG);
  near(g.tally.cuddly, 3 / 7, 1e-9, 'cuddly'); near(g.tally.foodie, 4 / 7, 1e-9, 'foodie');
  const e = newBucket(); e.sec = 60; deepEq(closeBucket(g, e, 'gumdrop', CFG), { cuddly: 0, playful: 0, foodie: 0, stylish: 0 }, 'empty');
  eq(addEvent(e, 'nope', 1, CFG), false, 'unknown event ignored');
});

test('partial bucket on character switch (edge 5): points = P × sec / bucketSec', () => {
  const g = newGrowth(); const b = newBucket(); b.sec = 30;
  addEvent(b, 'poke', 1, CFG);
  closeBucket(g, b, 'gumdrop', CFG);
  near(g.tally.playful, 0.5, 1e-9, 'half');
});

test('mixed minute: half minigame + pokes → P = 0.75', () => {
  const g = newGrowth(); const b = newBucket(); b.sec = 60;
  addMinigameSec(b, 'hop', 30, CFG); addEvent(b, 'poke', 1, CFG);
  closeBucket(g, b, 'gumdrop', CFG);
  near(g.tally.playful, 0.75, 1e-9, 'P');
});

test('AC6 trait choice: threshold, persona threshold, tie rule, low tally', () => {
  const T = (c, p, f, s) => ({ cuddly: c, playful: p, foodie: f, stylish: s });
  eq(chooseTrait(T(40, 60, 40, 20), 'flower', CFG), 'playful', 'ไผ่ 0.375');
  eq(chooseTrait(T(40, 60, 40, 20), 'gumdrop', CFG), 'cheerful', 'มิน 0.375 < 0.40');
  eq(chooseTrait(T(59, 60, 20, 20), 'splat', CFG), 'cuddly', 'ใหม่ tie → tendencyOrder');
  eq(chooseTrait(T(59, 70, 20, 20), 'splat', CFG), 'playful', 'no tie → top');
  eq(chooseTrait(T(4, 3, 2, 1), 'flower', CFG), 'cheerful', 'S = 10');
  eq(leadingTrait(T(4, 3, 2, 1), 'flower', CFG), null, 'hint needs minTally');
  eq(leadingTrait(T(12, 3, 2, 1), 'flower', CFG), 'cuddly', 'hint leader');
});

test('stage-up queues cards kid → grown → trait (edge 8) and markSeen walks one step', () => {
  const g = newGrowth(); g.activeSec = 10800; g.tally = { cuddly: 50, playful: 5, foodie: 5, stylish: 5 };
  const r = updateStage(g, 'gumdrop', CFG, 123);
  assert(r.stageChanged, 'changed'); eq(r.trait, 'cuddly', 'trait'); eq(g.traitAt, 123, 'traitAt');
  deepEq(pendingCards(g), [{ kind: 'stage', stage: 'kid' }, { kind: 'stage', stage: 'grown' }, { kind: 'trait', trait: 'cuddly' }], 'queue');
  markSeen(g, 'kid'); deepEq(pendingCards(g).map((c) => c.kind), ['stage', 'trait'], 'after kid');
  markSeen(g, 'grown'); deepEq(pendingCards(g), [], 'all seen');
});

test('AC7 drift: 29 buckets → same, 30th → changes only when 120 engaged minutes passed', () => {
  const make = (sinceChange) => {
    const g = newGrowth('grown', 20000); g.stageSeen = 'grown'; g.trait = 'cuddly';
    g.drift.lastChangeSec = g.activeSec - sinceChange;
    g.tally = { cuddly: 10, playful: 60, foodie: 5, stylish: 5 };   // candidate is playful
    return g;
  };
  const tick = (g) => { g.activeSec += 60; const b = newBucket(); b.sec = 60; addEvent(b, 'poke', 1, CFG); closeBucket(g, b, 'gumdrop', CFG); return stepDrift(g, 'gumdrop', CFG, 1); };
  const a = make(200 * 60);
  for (let i = 0; i < 29; i++) eq(tick(a), null, `bucket ${i + 1}`);
  eq(a.trait, 'cuddly', 'still cuddly at 29');
  eq(tick(a), 'playful', '30th → playful'); eq(a.drift.minutes, 0, 'reset');
  const b = make(0);   // changed just now: needs 120 engaged minutes first
  let changedAt = -1;
  for (let i = 1; i <= 200 && changedAt < 0; i++) if (tick(b)) changedAt = i;
  eq(changedAt, 120, 'waits for the gap, then the first satisfying bucket');
});

test('drift decays the old tally by decayPerBucket before adding', () => {
  const g = newGrowth('grown', 20000); g.trait = 'cuddly'; g.tally = { cuddly: 100, playful: 0, foodie: 0, stylish: 0 };
  const b = newBucket(); b.sec = 60; closeBucket(g, b, 'gumdrop', CFG);
  near(g.tally.cuddly, 99, 1e-9, 'decayed even on an empty bucket');
});

test('AC8 migration helper: played characters → kid at 2700, others baby', () => {
  const v4 = { version: 4, selected: 'flower', chosen: true, chars: { gumdrop: { best: { snackRain: 300 }, outfit: { head: null, eyes: null, body: null } }, cloud: { best: { snackRain: 0 }, outfit: { head: null, eyes: 'glasses-round', body: null } }, splat: { best: { snackRain: 0 }, outfit: {} } } };
  const f = migrateGrowth('flower', v4, CFG), g = migrateGrowth('gumdrop', v4, CFG), c = migrateGrowth('cloud', v4, CFG), s = migrateGrowth('splat', v4, CFG);
  eq(f.stage, 'kid', 'selected'); eq(f.activeSec, 2700, 'T'); eq(f.stageSeen, 'kid', 'no card on load');
  eq(g.stage, 'kid', 'best > 0'); eq(c.stage, 'kid', 'outfit worn'); eq(s.stage, 'baby', 'unplayed'); eq(s.activeSec, 0, 'T 0');
  for (const x of [f, g, c, s]) { eq(x.trait, null, 'trait'); eq(CATS.reduce((a, k) => a + x.tally[k], 0), 0, 'tally 0'); }
});

test('sanitizeGrowth (edge 7): bad numbers, unknown stage / trait, no shrink', () => {
  const g = sanitizeGrowth({ activeSec: -5, stage: 'giant', tally: { cuddly: -3, playful: 'x', foodie: 4 }, trait: 'evil' }, CFG, 'flower');
  eq(g.activeSec, 0, 'T'); eq(g.stage, 'baby', 'stage from T'); deepEq(g.tally, { cuddly: 0, playful: 0, foodie: 4, stylish: 0 }, 'tally'); eq(g.trait, null, 'not grown → null');
  const h = sanitizeGrowth({ activeSec: 100, stage: 'grown', stageSeen: 'grown', tally: { cuddly: 50 }, trait: 'bogus' }, CFG, 'flower');
  eq(h.stage, 'grown', 'never shrinks'); eq(h.trait, 'cuddly', 'unknown trait recomputed');
  eq(sanitizeGrowth(null, CFG, 'flower').stage, 'baby', 'null');
  const k = sanitizeGrowth({ activeSec: 3000, stage: 'kid', stageSeen: 'grown' }, CFG, 'flower');
  eq(k.stageSeen, 'kid', 'stageSeen cannot be ahead of stage');
});

test('no offline growth by default; data can turn a little on', () => {
  const g = newGrowth(); eq(offlineGrowth(g, 10, CFG), 0, 'default 0');
  const on = resolveGrowth({ ...DEFAULT_GROWTH, offline: { minutesPerHour: 2, capMinutes: 10 } }).cfg;
  eq(offlineGrowth(g, 3, on), 360, '3 h × 2 min'); eq(offlineGrowth(newGrowth(), 50, on), 600, 'capped');
});

test('daily soft cap: off by default; when on, time past the cap counts at rate', () => {
  const g = newGrowth();
  for (let i = 0; i < 100; i++) advanceTime(g, 0.1, { visible: true, engaged: true, dayKey: 'd1' }, CFG);
  near(g.activeSec, 10, 1e-9, 'off');
  const on = resolveGrowth({ ...DEFAULT_GROWTH, dailySoftCap: { minutes: 1, rate: 0.5 } }).cfg;
  const h = newGrowth();
  for (let i = 0; i < 1200; i++) advanceTime(h, 0.1, { visible: true, engaged: true, dayKey: 'd1' }, on);
  near(h.activeSec, 90, 1e-6, '60 + 60 × 0.5');
  advanceTime(h, 0.1, { visible: true, engaged: true, dayKey: 'd2' }, on); near(h.day.sec, 0.1, 1e-9, 'new day resets');
});

test('look per stage and line source per vocab level', () => {
  eq(lookOf('baby', CFG).look.scale, 0.7, 'baby scale'); eq(lookOf('kid', CFG).pitchSemitones, 1.5, 'kid pitch'); eq(lookOf('grown', CFG).vocabLevel, 3, 'grown vocab');
  const persona = { lines: { hello: ['สวัสดี'], baby: { hello: ['อุ๊!'] } }, traits: { cuddly: { lines: { hello: ['กอดหน่อย'] } } } };
  deepEq(lineSource(persona, CFG, 'hello', { vocabLevel: 1 }), ['อุ๊!'], 'baby lines');
  deepEq(lineSource({ lines: { hello: ['x'] } }, { ...CFG, babble: { hello: ['หวัดดี!'] } }, 'hello', { vocabLevel: 1 }), ['หวัดดี!'], 'shared babble');
  deepEq(lineSource(persona, CFG, 'hello', { vocabLevel: 2, trait: 'cuddly' }), ['สวัสดี'], 'kid normal');
  deepEq(lineSource(persona, CFG, 'hello', { vocabLevel: 3, trait: 'cuddly' }, () => 0.1), ['กอดหน่อย'], 'grown trait line');
  deepEq(lineSource(persona, CFG, 'hello', { vocabLevel: 3, trait: 'cuddly' }, () => 0.9), ['สวัสดี'], 'grown normal line');
});

// AC9 — seeded simulation over 180 engaged minutes. Each room minute is one
// activity drawn from the profile; minigame minutes rotate the four games.
const ACT = {
  cuddly: [['strokePerSec', 8], ['talk', 1], ['carryPerSec', 10]],
  playful: [['poke', 4], ['boing', 2], ['squishPerSec', 5]],
  foodie: [['eat', 1], ['eatLike', 1]],
  stylish: [['equip', 1], ['buy', 1], ['decorEquip', 1], ['decorBuy', 1]],
  neutral: [['flush', 1]],
};
const PROFILES = {
  mixed: { mini: 70, room: { cuddly: 0.35, playful: 0.25, foodie: 0.2, stylish: 0.1, neutral: 0.1 }, games: ['snackRain'] },   // GDD 4.4 example
  // AC9 names 4 profiles, but 4 profiles cannot reach 5 traits for one character;
  // a balanced carer (equal care, every game) is the fifth and sixth way in.
  balanced: { mini: 60, room: { cuddly: 0.25, playful: 0.2, foodie: 0.22, stylish: 0.2, neutral: 0.13 }, games: ['snackRain', 'mimic', 'bubbles', 'hop'] },
  petting: { mini: 70, room: { cuddly: 0.6, playful: 0.15, foodie: 0.15, stylish: 0.05, neutral: 0.05 }, games: ['snackRain'] },
  feeding: { mini: 60, room: { cuddly: 0.15, playful: 0.1, foodie: 0.6, stylish: 0.05, neutral: 0.1 }, games: ['snackRain'] },
  dressing: { mini: 50, room: { cuddly: 0.15, playful: 0.1, foodie: 0.1, stylish: 0.55, neutral: 0.1 }, games: ['bubbles'] },
  playing: { mini: 110, room: { cuddly: 0.15, playful: 0.55, foodie: 0.1, stylish: 0.05, neutral: 0.15 }, games: ['hop', 'snackRain', 'bubbles'] },
};
function simulate(key, prof, seed) {
  const r = rng(seed); const g = newGrowth();
  const cats = Object.keys(prof.room);
  const minutes = [];
  for (let i = 0; i < 180; i++) minutes.push(i < prof.mini ? 'mini' : 'room');
  for (let i = minutes.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [minutes[i], minutes[j]] = [minutes[j], minutes[i]]; }
  let gi = 0;
  for (const kind of minutes) {
    const b = newBucket(); b.sec = 60;
    if (kind === 'mini') { addMinigameSec(b, prof.games[gi++ % prof.games.length], 60, CFG); }
    else {
      let x = r(), cat = cats[cats.length - 1];
      for (const c of cats) { if (x < prof.room[c]) { cat = c; break; } x -= prof.room[c]; }
      const opts = ACT[cat]; const [ev, amt] = opts[Math.floor(r() * opts.length)];
      addEvent(b, ev, amt, CFG);
    }
    g.activeSec += 60; closeBucket(g, b, key, CFG);
  }
  updateStage(g, key, CFG);
  return g.trait;
}

test('AC9 seeded simulation: every trait reachable for every character; mixed → cheerful for ≥ 2', () => {
  const table = {};
  for (const k of FIVE) { table[k] = {}; for (const [p, prof] of Object.entries(PROFILES)) table[k][p] = simulate(k, prof, 1234); }
  console.log('        ', JSON.stringify(table));
  for (const k of FIVE) {
    const got = new Set(Object.values(table[k]));
    const lack = TRAITS.filter((t) => !got.has(t));
    eq(lack.join(','), '', `traits not reached for ${k}`);
  }
  assert(FIVE.filter((k) => table[k].mixed === 'cheerful').length >= 2, 'mixed cheerful ≥ 2');
});

test('AC10 growth rules never touch needs or coins (no such fields written)', () => {
  const g = newGrowth(); const before = JSON.stringify(Object.keys(g).sort());
  const b = newBucket(); b.sec = 60; addEvent(b, 'eat', 1, CFG); closeBucket(g, b, 'flower', CFG); updateStage(g, 'flower', CFG);
  eq(JSON.stringify(Object.keys(g).sort()), before, 'same fields'); assert(!('needs' in g) && !('coins' in g), 'no needs / coins');
});

done();
