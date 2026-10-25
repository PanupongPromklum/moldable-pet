// Snack Rain rules — design/gdd/minigame-snack-rain.md §8 criteria 1–10.
// Run: node tests/unit/snack-rain.test.mjs
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, deepEq, near, done } from './_harness.mjs';
import { makeSnackRain, rng } from './fixtures/sprint2.mjs';
import {
  resolveConfig, streakMultiplier, newRoundState, applyCatch, applyMiss, roundCoins, roundNeedDeltas,
  pickKind, demonWeight, canSpawn, spawnRate, fallSpeedAt, playArea, spawnX, laneX, nearestLane,
} from '../../src/game/minigames/snack-rain-rules.js';

const CFG = resolveConfig(makeSnackRain()).cfg;
const run = (steps, st = newRoundState(), cfg = CFG) => steps.reduce((s, [k, liked]) => applyCatch(s, k, cfg, !!liked).state, st);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

console.log('snack rain');

test('AC1 full fixture resolves with no missing key', () => {
  deepEq(resolveConfig(makeSnackRain()).missing, [], 'missing');
});

test('missing keys fall back to defaults and are reported', () => {
  const r = resolveConfig({ durationSec: 30, items: { snack: { weight: 1, points: 7 } } });
  eq(r.cfg.durationSec, 30, 'given'); eq(r.cfg.items.snack.points, 7, 'given nested');
  assert(r.missing.includes('maxCoinsPerRound') && r.missing.includes('items.coin.weight'), r.missing.join());
});

test('AC2 rate(22.5) = 1.347 ± 0.002, fall(22.5) without jitter = 0.442 ± 0.002', () => {
  near(spawnRate(22.5, CFG), 1.347, 0.002, 'rate');
  near(fallSpeedAt(22.5, CFG), 0.442, 0.002, 'fall');
  near(fallSpeedAt(22.5, CFG, 1), 0.442 * 1.08, 0.003, 'jitter max');
});

test('AC3 no demon before 8 s and never two in a row (1000 seeded rounds)', () => {
  const r = rng(7);
  let demons = 0;
  for (let round = 0; round < 1000; round++) {
    let inRow = 0;
    for (let t = 0; t < CFG.durationSec; t += 0.7) {
      const k = pickKind(r(), t, CFG, inRow);
      if (k === 'demon') { demons++; assert(t >= CFG.items.demon.graceSec, `demon at ${t}`); assert(inRow === 0, 'two demons in a row'); }
      inRow = k === 'demon' ? inRow + 1 : 0;
    }
  }
  assert(demons > 0, 'demons do spawn');
});

test('demon weight ramps: 0.047 at 16 s, full after grace + ramp', () => {
  near(demonWeight(16, CFG), 0.1 * 8 / 17, 1e-9, '16 s'); eq(demonWeight(30, CFG), 0.1, 'full'); eq(demonWeight(4, CFG), 0, 'grace');
});

test('spawn gate: maxOnScreen and minGapSec', () => {
  assert(canSpawn(5, 0.3, CFG) && !canSpawn(6, 1, CFG) && !canSpawn(0, 0.1, CFG), 'gate');
});

test('AC4 mult: streak 3 → 1, 4 → 1.5, 11 → 2, 16 → 3, 40 → 3', () => {
  deepEq([3, 4, 11, 16, 40].map((n) => streakMultiplier(n, CFG.streak)), [1, 1.5, 2, 3, 3], 'mult');
});

test('AC5 liked banana at streak 4 for flower → +23 points', () => {
  const st = { ...newRoundState(), streak: 3 };
  eq(applyCatch(st, 'snack', CFG, true).delta, 23, 'round((10+5)×1.5)');
});

test('coin at streak 16 → +45 points and one coin object caught', () => {
  const r = applyCatch({ ...newRoundState(), streak: 15 }, 'coin', CFG);
  eq(r.delta, 45, 'points'); eq(r.state.coinsCaught, 1, 'coins');
});

test('AC6 demon at score 10 → 0, streak 0, coins unchanged', () => {
  const r = applyCatch({ ...newRoundState(), score: 10, streak: 7, coinsCaught: 3 }, 'demon', CFG);
  eq(r.state.score, 0, 'score'); eq(r.state.streak, 0, 'streak'); eq(r.state.coinsCaught, 3, 'coins');
  eq(applyCatch({ ...newRoundState(), score: 300 }, 'demon', CFG).state.score, 280, '300 → 280');
});

test('miss keeps the streak with resetOnMiss false, breaks it with true', () => {
  const st = run([['snack'], ['snack']]);
  eq(applyMiss(st, 'snack', CFG).streak, 2, 'kept');
  eq(applyMiss(st, 'snack', { ...CFG, streak: { ...CFG.streak, resetOnMiss: true } }).streak, 0, 'reset');
});

test('AC7 coins: 925 + 7 → 37; 0 completed → 5; 0 exited → 0; 5000 → 60', () => {
  eq(roundCoins(925, 7, CFG, true), 37, 'worked example');
  eq(roundCoins(0, 0, CFG, true), 5, 'minimum');
  eq(roundCoins(0, 0, CFG, false), 0, 'exited early');
  eq(roundCoins(5000, 0, CFG, true), 60, 'cap');
});

test('AC8 needs for flower (playGain 1.5): completed, half time, hunger clamp', () => {
  const apply = (lv, d) => ({ fun: clamp01(lv.fun + d.fun), social: clamp01(lv.social + d.social), hunger: clamp01(lv.hunger + d.hunger) });
  const lv = { fun: 0.5, social: 0.5, hunger: 0.5 };
  const a = apply(lv, roundNeedDeltas(CFG, 45, 1.5));
  near(a.fun, 0.875, 1e-9, 'fun'); near(a.social, 0.6, 1e-9, 'social'); near(a.hunger, 0.45, 1e-9, 'hunger');
  const b = apply(lv, roundNeedDeltas(CFG, 22.5, 1.5));
  near(b.fun, 0.6875, 1e-9, 'fun half'); near(b.social, 0.55, 1e-9, 'social half'); near(b.hunger, 0.475, 1e-9, 'hunger half');
  eq(apply({ ...lv, hunger: 0.02 }, roundNeedDeltas(CFG, 45, 1.5)).hunger, 0, 'clamped');
});

test('AC10 seeded 400-round typical profile (65% catch, 60% dodge) averages 30–42 coins', () => {
  const r = rng(42);
  let total = 0;
  for (let round = 0; round < 400; round++) {
    let st = newRoundState(), acc = 0, inRow = 0;
    for (let t = 0; t < CFG.durationSec; t += 0.05) {
      acc += spawnRate(t, CFG) * 0.05;
      if (acc < 1) continue;
      acc -= 1;
      const k = pickKind(r(), t, CFG, inRow); inRow = k === 'demon' ? inRow + 1 : 0;
      const hit = k === 'demon' ? r() > 0.6 : r() < 0.65;
      st = hit ? applyCatch(st, k, CFG, k === 'snack' && r() < 1 / 3).state : applyMiss(st, k, CFG);
    }
    total += roundCoins(st.score, st.coinsCaught, CFG, true);
  }
  const avg = total / 400;
  assert(avg >= 30 && avg <= 42, `avg ${avg.toFixed(1)}`);
});

test('play area: 0.86 of visible width, capped at playWidthMaxUnits, pet kept on screen', () => {
  const a = playArea(4.4, CFG, 0.9);
  near(a.half, 4.4 * 0.86 / 2, 1e-9, 'half'); near(a.petHalfRange, 2.2 - 0.9, 1e-9, 'pet on screen');
  near(a.spawnHalf, a.half - 0.06 * 4.4 * 0.86, 1e-9, 'edge margin');
  eq(playArea(20, CFG, 0.9).half, 3, 'desktop cap');
});

test('lanes mode: integer ≥ 2 splits the width into lanes', () => {
  const a = playArea(4, { ...CFG, lanesOrWidth: 4 }, 0);
  eq(a.lanes, 4, 'lanes'); near(laneX(0, a), -1.5, 1e-9, 'lane 0'); eq(nearestLane(0.2, a), 2, 'nearest');
  near(spawnX(0.99, a), 1.5, 1e-9, 'spawn on lane');
});

const real = fileURLToPath(new URL('../../assets/data/minigames.json', import.meta.url));
if (existsSync(real)) {
  test('AC1 assets/data/minigames.json snackRain has every contract key', () => {
    const r = resolveConfig(JSON.parse(readFileSync(real, 'utf8')).snackRain);
    const contract = ['durationSec', 'lanesOrWidth', 'spawn.startPerSec', 'spawn.endPerSec', 'fallSpeed.start', 'fallSpeed.end',
      'items.snack.weight', 'items.snack.points', 'items.coin.weight', 'items.coin.points', 'items.coin.coins', 'items.demon.weight', 'items.demon.points',
      'streak.step', 'streak.maxMultiplier', 'coinsPerPoints', 'maxCoinsPerRound', 'needs.fun', 'needs.social', 'needs.hunger'];
    deepEq(contract.filter((k) => r.missing.includes(k)), [], 'missing contract keys');
    deepEq(r.missing, [], 'every key the controller reads');
  });
} else console.log('  skip  minigames.json not present');

done();
