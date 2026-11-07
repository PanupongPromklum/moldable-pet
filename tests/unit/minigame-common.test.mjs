// Shared minigame rules + data — design/gdd/minigames-2.md §8 criteria 1, 10–12.
// Run: node tests/unit/minigame-common.test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, near, done } from './_harness.mjs';
import {
  seeded, streakMult, coinsForRound, needDeltas, applyNeeds, resolvePicker, PICKER_DEFAULTS, mergeConfig,
} from '../../src/game/minigames/common-rules.js';
import { resolveMimic, MIMIC_DEFAULTS, newMimicState, pressPad, endCheck, showPhaseSec, padsFor, mimicCoins } from '../../src/game/minigames/mimic-rules.js';
import { resolveBubbles, BUBBLES_DEFAULTS, spawnRateAt, pickBubble, popBubble, newBubblesState, bubblesCoins, colorCount } from '../../src/game/minigames/bubbles-rules.js';
import { resolveHop, HOP_DEFAULTS, gapAt, pickObstacle, applyHop, newHopState, hopCoins, speedAt } from '../../src/game/minigames/hop-rules.js';

const DATA_PATH = fileURLToPath(new URL('../../assets/data/minigames.json', import.meta.url));
const data = existsSync(DATA_PATH) ? JSON.parse(readFileSync(DATA_PATH, 'utf8')) : null;
const MIMIC = resolveMimic(MIMIC_DEFAULTS).cfg, BUB = resolveBubbles(BUBBLES_DEFAULTS).cfg, HOP = resolveHop(HOP_DEFAULTS).cfg;

console.log('minigames (common)');

test('AC1 live data: picker, mimic, bubbles, hop blocks have every key of the GDD 7.2 draft', () => {
  assert(data, 'minigames.json');
  for (const [name, res] of [['picker', resolvePicker], ['mimic', resolveMimic], ['bubbles', resolveBubbles], ['hop', resolveHop]]) {
    assert(data[name], 'block ' + name);
    const m = res(data[name]).missing; eq(m.length, 0, `${name} missing ${m.join(', ')}`);
  }
});

test('AC1 picker.order = the 4 game ids; favourites are known ids', () => {
  const ids = ['snackRain', 'mimic', 'bubbles', 'hop'];
  const p = resolvePicker(data?.picker).cfg;
  eq(JSON.stringify([...p.order].sort()), JSON.stringify([...ids].sort()), 'order');
  for (const v of Object.values(p.favorites)) assert(ids.includes(v), 'fav ' + v);
});

test('mergeConfig keeps extra keys and reports wrong types', () => {
  const r = mergeConfig({ a: 1, b: { c: 2 } }, { a: 'x', b: { c: 3 }, extra: true });
  eq(r.cfg.a, 1, 'type mismatch falls back'); eq(r.cfg.b.c, 3, 'nested'); eq(r.cfg.extra, true, 'extra'); eq(r.missing.join(), 'a', 'missing');
});

test('streak multiplier steps 4 / 0.5 / max 3', () => {
  const s = { step: 4, bonusPerStep: 0.5, maxMultiplier: 3 };
  eq(streakMult(3, s), 1, '3'); eq(streakMult(4, s), 1.5, '4'); eq(streakMult(16, s), 3, '16'); eq(streakMult(40, s), 3, 'cap');
});

test('coins formula: floor only when completed, cap', () => {
  const c = { coinValue: 2, coinsPerPoints: 10, minCoinsPerRound: 5, maxCoinsPerRound: 60, minCoinsOnlyIfComplete: true };
  eq(coinsForRound(0, 0, c, true), 5, 'floor'); eq(coinsForRound(0, 0, c, false), 0, 'early'); eq(coinsForRound(100, 3, c, true), 16, 'sum'); eq(coinsForRound(9e3, 0, c, true), 60, 'cap');
});

test('AC10 ไผ่ (playGain 1.5) completes hop, her favourite: fun 0.3 → 0.84; hunger 0.05 → 0', () => {
  const d = needDeltas(HOP.needs, 1, 1.5, PICKER_DEFAULTS.favoriteFunScale);
  near(d.fun, 0.54, 1e-9, 'fun delta'); near(d.social, 0.05, 1e-9, 'social'); near(d.hunger, -0.08, 1e-9, 'hunger');
  const n = applyNeeds({ fun: 0.3, social: 0.5, hunger: 0.05 }, d);
  near(n.fun, 0.84, 1e-9, 'fun'); eq(n.hunger, 0, 'hunger clamped');
});

test('needs scale with fraction played', () => {
  const d = needDeltas(BUB.needs, 0.5, 1, 1); near(d.fun, 0.125, 1e-9, 'half'); near(d.hunger, -0.015, 1e-9, 'hunger');
});

// ---------------------------------------------------------------- balance (AC11, AC12)
// Seeded player profiles: chance to handle each event right. Positions are not modelled (GDD 4.4).
const OVERHEAD = 15;   // countdown + result card, seconds
const PROFILES = {
  weak: { mimicMiss: 0.16, bubbleHit: 0.45, bubbleWrong: 0.08, coinHit: 0.4, hopClear: 0.55 },
  typical: { mimicMiss: 0.065, bubbleHit: 0.71, bubbleWrong: 0.1, coinHit: 0.7, hopClear: 0.78 },
};

/** One mimic round: each pose pressed right with probability (1 − miss); returns { coins, sec }. */
function simMimic(p, rng, relaxed = false) {
  let st = newMimicState(MIMIC, rng), t = 0;
  for (;;) {
    t += showPhaseSec(st, MIMIC, relaxed) + st.seq.length * 0.7 + MIMIC.betweenSec;
    let r;
    do {
      const right = rng() >= p.mimicMiss;
      const pose = right ? st.seq[st.idx] : (st.seq[st.idx] + 1) % padsFor(st.L, MIMIC);
      r = pressPad(st, pose, MIMIC, rng); st = r.state;
    } while (r.outcome === 'ok');
    if (endCheck(st, t, MIMIC)) break;
  }
  return { coins: mimicCoins(st.score, MIMIC, true), sec: t };
}
function simBubbles(p, rng, relaxed = false) {
  let st = newBubblesState(0), acc = 0; const n = colorCount(BUB, relaxed);
  for (let t = 0; t < BUB.durationSec; t += 0.1) {
    acc += spawnRateAt(t, BUB) * 0.1;   // relaxed: same spawns, fewer colours, slower rise (hit chance kept)
    while (acc >= 1) {
      acc -= 1;
      const b = pickBubble(rng(), rng(), st.called, n, BUB);
      if (b.coin) { if (rng() < p.coinHit) st = popBubble(st, b, BUB).state; }
      else if (b.color === st.called) { if (rng() < p.bubbleHit) st = popBubble(st, b, BUB).state; }
      else if (rng() < p.bubbleWrong) st = popBubble(st, b, BUB).state;
    }
  }
  return { coins: bubblesCoins(st.score, st.coinPops, BUB, true), sec: BUB.durationSec };
}
function simHop(p, rng, relaxed = false) {
  let st = newHopState(); const m = { relaxed };
  for (let t = 1; t < HOP.durationSec; t += gapAt(t, rng(), HOP, m) * (relaxed ? speedAt(t, HOP) / speedAt(t, HOP, m) * 0.9 : 1)) {
    const o = pickObstacle(rng(), rng(), rng(), t, HOP, m);
    const clear = rng() < p.hopClear * (o.double ? 0.7 : 1);
    st = applyHop(st, clear ? (o.coin ? 'coin' : 'clear') : 'bump', HOP).state;
  }
  return { coins: hopCoins(st.score, st.coinsGot, HOP, true), sec: HOP.durationSec };
}
function perMinute(sim, p, seed, relaxed) {
  const rng = seeded(seed); let coins = 0, sec = 0;
  for (let i = 0; i < 400; i++) { const r = sim(p, rng, relaxed); coins += r.coins; sec += r.sec + OVERHEAD; }
  return coins / (sec / 60);
}

for (const [name, sim] of [['mimic', simMimic], ['bubbles', simBubbles], ['hop', simHop]]) {
  test(`AC11 ${name}: typical 30–42 coins/min, weak ≥ 18`, () => {
    const typ = perMinute(sim, PROFILES.typical, 101), weak = perMinute(sim, PROFILES.weak, 202);
    console.log(`        ${name}: typical ${typ.toFixed(1)}/min, weak ${weak.toFixed(1)}/min`);
    assert(typ >= 30 && typ <= 42, `typical ${typ.toFixed(1)}`); assert(weak >= 18, `weak ${weak.toFixed(1)}`);
  });
  test(`AC12 ${name}: relaxed mode typical within ±15% of normal`, () => {
    const a = perMinute(sim, PROFILES.typical, 303), b = perMinute(sim, PROFILES.typical, 303, true);
    console.log(`        ${name}: normal ${a.toFixed(1)}/min, relaxed ${b.toFixed(1)}/min`);
    assert(Math.abs(b / a - 1) <= 0.15, `ratio ${(b / a).toFixed(2)}`);
  });
}

done();
