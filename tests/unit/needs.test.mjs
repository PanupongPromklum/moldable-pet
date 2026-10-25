// Needs + save unit tests. Run: node tests/unit/needs.test.mjs
// No framework: each test is a function; failures are counted and exit code is non-zero.
// Covers design/gdd/needs-system.md §8 acceptance criteria 3–12 plus save/migration.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  decayNeeds, eatFood, flushToilet, pickNeedMood, pickReturnStyle, needState,
  sanitizeLevels, startLevels, addNeed,
} from '../../src/game/needs.js';
import { newSave, migrateSave, tickSave, createGameState, SAVE_KEY } from '../../src/game/state.js';

const load = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../assets/data/${f}`, import.meta.url)), 'utf8'));
const DATA = { needs: load('needs.json'), foods: load('foods.json'), personas: load('personas.json') };
const N = DATA.needs;
const H = 3600000;
const T0 = 1_700_000_000_000; // fixed clock

let pass = 0, fail = 0;
const near = (a, b, eps) => Math.abs(a - b) <= eps;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok  ', name); }
  catch (e) { fail++; console.log('  FAIL', name, '\n       ', e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertNear(a, b, eps, msg) { assert(near(a, b, eps), `${msg}: got ${a}, want ${b} ± ${eps}`); }
const lv = (o) => ({ ...startLevels(N), ...o });
const rates = (k) => DATA.personas[k].needRates;

// seeded PRNG (mulberry32) for deterministic fuzzing
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

console.log('needs');

test('AC3 online decay: pill hunger 1.0, 5 h of 1 s ticks → 0.30 ± 0.005', () => {
  let L = lv({ hunger: 1 }), t = T0;
  for (let i = 0; i < 5 * 3600; i++) { const r = decayNeeds(L, rates('pill'), N, t, t + 1000); L = r.levels; t = r.tLast; assert(!r.offline, 'should be online'); }
  assertNear(L.hunger, 0.30, 0.005, 'hunger');
});

test('AC3 online decay: flower social 1.0 after 1.9 h → 0.30 ± 0.01', () => {
  let L = lv({ social: 1 }), t = T0;
  const steps = Math.round(1.9 * 3600 / 30);
  for (let i = 0; i < steps; i++) { const r = decayNeeds(L, rates('flower'), N, t, t + 30000); L = r.levels; t = r.tLast; }
  assertNear(L.social, 0.30, 0.01, 'social');
});

test('online decay has no floor and stops at 0', () => {
  let L = lv({ social: 0.05 }), t = T0;
  for (let i = 0; i < 3600; i++) { const r = decayNeeds(L, rates('flower'), N, t, t + 1000); L = r.levels; t = r.tLast; }
  assert(L.social === 0, `social ${L.social}`);
});

test('AC4 offline: flower hunger 0.9 → 0.438, social 0.9 → 0.15 after 3 h', () => {
  const r = decayNeeds(lv({ hunger: 0.9, toilet: 0.8, fun: 0.85, social: 0.9 }), rates('flower'), N, T0, T0 + 3 * H);
  assert(r.offline, 'offline');
  assertNear(r.levels.hunger, 0.438, 0.001, 'hunger');
  assertNear(r.levels.toilet, 0.47, 0.001, 'toilet');
  assert(r.levels.fun === N.offlineFloor, `fun floored, got ${r.levels.fun}`);
  assert(r.levels.social === N.offlineFloor, `social exactly floor, got ${r.levels.social}`);
});

test('AC5 offline cap: 30 h gap == 12 h gap', () => {
  const L = lv({ hunger: 0.95, toilet: 0.95, fun: 0.95, social: 0.95 });
  const a = decayNeeds(L, rates('cloud'), N, T0, T0 + 30 * H).levels;
  const b = decayNeeds(L, rates('cloud'), N, T0, T0 + N.offlineCapHours * H).levels;
  for (const k of Object.keys(a)) assert(a[k] === b[k], `${k}: ${a[k]} vs ${b[k]}`);
});

test('AC6 offline floor never raises: 0.05 stays 0.05 after 10 h', () => {
  const r = decayNeeds(lv({ fun: 0.05 }), rates('flower'), N, T0, T0 + 10 * H);
  assert(r.levels.fun === 0.05, `fun ${r.levels.fun}`);
});

test('offline gap boundary: exactly offlineGapSeconds is online, +1 ms is offline', () => {
  const g = N.offlineGapSeconds * 1000;
  assert(!decayNeeds(lv({}), rates('flower'), N, T0, T0 + g).offline, 'at boundary should be online');
  assert(decayNeeds(lv({}), rates('flower'), N, T0, T0 + g + 1).offline, 'past boundary should be offline');
});

test('AC7 clock backwards: no change, tLast becomes now', () => {
  const L = lv({ hunger: 0.6 });
  const r = decayNeeds(L, rates('flower'), N, T0, T0 - H);
  for (const k of Object.keys(L)) assert(r.levels[k] === L[k], `${k} changed`);
  assert(r.tLast === T0 - H, 'tLast');
  assert(r.gapMs === 0, 'gap 0');
});

test('AC8 eat liked food: flower cupcake at hunger 0.438', () => {
  const L = lv({ hunger: 0.438, fun: 0.15, toilet: 0.47 });
  const r = eatFood(L, 'cupcake', 'flower', DATA.foods, N);
  assert(r.outcome === 'eaten' && r.kind === 'like', `${r.outcome}/${r.kind}`);
  assertNear(r.levels.hunger, 0.588, 0.001, 'hunger');
  assertNear(r.levels.fun, 0.33, 0.001, 'fun');
  assertNear(r.levels.toilet, 0.42, 0.001, 'toilet');
  assert(L.hunger === 0.438, 'input not mutated');
});

test('AC8 eat when full (hunger 0.96) is refused, levels unchanged', () => {
  const L = lv({ hunger: 0.96 });
  for (const f of DATA.foods.foods) {
    const r = eatFood(L, f.id, 'flower', DATA.foods, N);
    assert(r.outcome === 'full', `${f.id}: ${r.outcome}`);
    for (const k of Object.keys(L)) assert(r.levels[k] === L[k], `${k} changed`);
  }
});

test('AC9 disliked food: flower milk at hunger 0.5', () => {
  const L = lv({ hunger: 0.5, fun: 0.02, toilet: 0.5 });
  const r = eatFood(L, 'milk', 'flower', DATA.foods, N);
  assert(r.kind === 'dislike', r.kind);
  assertNear(r.levels.hunger, 0.596, 0.001, 'hunger');
  assert(r.levels.fun === 0, `fun clamped to 0, got ${r.levels.fun}`);
  assertNear(r.levels.toilet, 0.38, 0.001, 'toilet');
});

test('eat cooldown: a drop inside cooldownSeconds is a miss', () => {
  const r = eatFood(lv({ hunger: 0.3 }), 'apple', 'cloud', DATA.foods, N, { nowSeconds: 10, lastEatSeconds: 10 - N.actions.eat.cooldownSeconds / 2 });
  assert(r.outcome === 'cooldown', r.outcome);
});

test('AC10 flush: toilet 0.2 → 1.0 with relief; toilet 0.8 → 1.0, no relief, noNeed', () => {
  const a = flushToilet(lv({ toilet: 0.2, fun: 0.4 }), N);
  assert(a.levels.toilet === 1 && a.relieved && !a.noNeed, JSON.stringify(a));
  assertNear(a.levels.fun, 0.45, 1e-9, 'fun relief');
  const b = flushToilet(lv({ toilet: 0.8, fun: 0.4 }), N);
  assert(b.levels.toilet === 1 && !b.relieved && b.noNeed && b.levels.fun === 0.4, JSON.stringify(b));
});

test('AC11 mood: toilet+hunger urgent → surprised; all good → smile; cloud social low → smile', () => {
  const p = DATA.personas;
  assert(pickNeedMood(lv({ toilet: 0.1, hunger: 0.1 }), N, p.flower).expr === 'surprised', 'toilet urgent first');
  assert(pickNeedMood({ hunger: 0.8, toilet: 0.8, fun: 0.8, social: 0.8 }, N, p.flower).expr === 'smile', 'all good');
  assert(pickNeedMood({ hunger: 0.6, toilet: 0.8, fun: 0.8, social: 0.8 }, N, p.flower).expr === 'original', 'neutral');
  assert(pickNeedMood({ hunger: 0.8, toilet: 0.8, fun: 0.8, social: 0.2 }, N, p.cloud).expr === 'smile', 'cloud override');
  assert(pickNeedMood({ hunger: 0.8, toilet: 0.8, fun: 0.8, social: 0.1 }, N, p.cloud).expr === 'sleepy', 'cloud urgent override');
  const m = pickNeedMood({ hunger: 0.25, toilet: 0.8, fun: 0.25, social: 0.8 }, N, p.flower);
  assert(m.need === 'hunger' && m.state === 'low' && m.line === 'hungry', JSON.stringify(m));
});

test('needState thresholds', () => {
  const c = N.needs.hunger;
  assert(needState(c.urgent, c) === 'urgent' && needState(c.low, c) === 'low' && needState(c.good, c) === 'good' && needState(0.5, c) === 'ok', 'states');
});

test('AC12 no level leaves [0,1] after 10 000 seeded random actions and ticks', () => {
  const r = rng(42), keys = Object.keys(DATA.personas), foods = DATA.foods.foods.map((f) => f.id);
  let L = lv({}), t = T0;
  for (let i = 0; i < 10000; i++) {
    const k = keys[Math.floor(r() * keys.length)], a = r();
    if (a < 0.3) { const d = decayNeeds(L, rates(k), N, t, t + Math.floor((r() - 0.1) * 20 * H)); L = d.levels; t = d.tLast; }
    else if (a < 0.5) L = eatFood(L, foods[Math.floor(r() * foods.length)], k, DATA.foods, N).levels;
    else if (a < 0.6) L = flushToilet(L, N).levels;
    else addNeed(L, ['hunger', 'toilet', 'fun', 'social'][Math.floor(r() * 4)], (r() - 0.5) * 3);
    for (const [n, v] of Object.entries(L)) assert(v >= 0 && v <= 1 && Number.isFinite(v), `step ${i}: ${n}=${v}`);
  }
});

test('return style: weighted pick covers each band and falls back to gentle', () => {
  const w = DATA.personas.flower.returnStyles; // gentle .3, dramatic .5, sleepy .2
  assert(pickReturnStyle(w, 0) === 'gentle', 'r=0');
  assert(pickReturnStyle(w, 0.31) === 'dramatic', 'r=.31');
  assert(pickReturnStyle(w, 0.85) === 'sleepy', 'r=.85');
  assert(pickReturnStyle(w, 0.999999) === 'sleepy', 'r≈1');
  assert(pickReturnStyle({}, 0.5) === 'gentle', 'empty');
  const r = rng(7), count = { gentle: 0, dramatic: 0, sleepy: 0 };
  for (let i = 0; i < 10000; i++) count[pickReturnStyle(w, r())]++;
  assert(near(count.dramatic / 10000, 0.5, 0.03), `dramatic share ${count.dramatic}`);
});

console.log('state / save');

test('per-character independence: each character decays with its own needRates', () => {
  const s = newSave(DATA, T0);
  for (const k of Object.keys(s.chars)) s.chars[k].needs = { hunger: 1, toilet: 1, fun: 1, social: 1 };
  tickSave(s, DATA, T0 + 3 * H);
  const f = s.chars.flower.needs.social, c = s.chars.cloud.needs.social;
  assertNear(f, Math.max(1 - 0.23 * 1.6 * 3, N.offlineFloor), 1e-9, 'flower social');
  assertNear(c, 1 - 0.23 * 0.5 * 3, 1e-9, 'cloud social');
  s.chars.flower.needs.hunger = 0.2; // touching one must not touch another
  assert(s.chars.cloud.needs.hunger !== 0.2, 'shared object');
});

test('per-character tLast: a character with an older tLast gets a bigger catch-up', () => {
  const s = newSave(DATA, T0);
  s.chars.gumdrop.tLast = T0 - 6 * H;
  const before = s.chars.gumdrop.needs.hunger;
  tickSave(s, DATA, T0 + 1000);
  assertNear(s.chars.gumdrop.needs.hunger, Math.max(before - 0.14 * 1.0 * (6 * H + 1000) / H, Math.min(before, N.offlineFloor)), 1e-9, 'gumdrop');
  assertNear(s.chars.flower.needs.hunger, before - 0.14 * 1.1 * (1000 / H), 1e-9, 'flower online');
});

test('migrate: garbage, NaN, out-of-range, unknown keys, missing tLast', () => {
  assert(migrateSave('nope', DATA, T0).selected === 'flower', 'string');
  const m = migrateSave({ version: 1, selected: 'ghost', room: 'attic', coins: -4, chars: { flower: { needs: { hunger: 'x', toilet: 7, fun: -1, social: NaN, extra: 1 } }, ghost: {} } }, DATA, T0, ['living', 'kitchen', 'bathroom']);
  assert(m.selected === 'flower' && m.room === 'living' && m.coins === 0, 'top-level');
  const n = m.chars.flower.needs;
  assert(n.hunger === N.needs.hunger.start && n.toilet === 1 && n.fun === 0 && n.social === N.needs.social.start && !('extra' in n), JSON.stringify(n));
  assert(m.chars.flower.tLast === T0, 'missing tLast → now');
  assert(!m.chars.ghost, 'unknown character dropped');
  assert(Object.keys(m.chars).length === Object.keys(DATA.personas).length, 'all characters present');
});

test('migrate v0 single-needs save into per-character save', () => {
  const m = migrateSave({ needs: { hunger: 0.2, toilet: 0.3, fun: 0.4, social: 0.5 }, tLast: T0 - H, charKey: 'cloud' }, DATA, T0);
  assert(m.version === 1 && m.selected === 'cloud' && m.chars.cloud.needs.hunger === 0.2 && m.chars.cloud.tLast === T0 - H, JSON.stringify(m.chars.cloud));
});

test('createGameState: round trip through storage, and throwing storage never throws', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); return true; } };
  let now = T0;
  const a = createGameState({ data: DATA, storage, now: () => now });
  assert(a.fresh, 'fresh');
  a.select('diamond'); a.bump('fun', -0.3); a.setRoom('kitchen');
  assert(a.persist(), 'persist');
  assert(JSON.parse(mem.get(SAVE_KEY)).version === 1, 'versioned');
  now = T0 + 2 * H;
  const b = createGameState({ data: DATA, storage, now: () => now });
  assert(!b.fresh && b.selected === 'diamond' && b.room === 'kitchen' && b.chosen, 'restored');
  const info = b.tick();
  assert(info.offline && info.gapMs === 2 * H, JSON.stringify(info));
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  const c = createGameState({ data: DATA, storage: bad, now: () => now });
  assert(c.fresh && c.persist() === false, 'bad storage handled');
  const corrupt = { getItem: () => '{not json', setItem: () => true };
  assert(createGameState({ data: DATA, storage: corrupt, now: () => now }).fresh, 'corrupt json → fresh');
});

test('sanitizeLevels fills every need id', () => {
  const s = sanitizeLevels(null, N);
  assert(Object.keys(s).join() === 'hunger,toilet,fun,social', Object.keys(s).join());
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
