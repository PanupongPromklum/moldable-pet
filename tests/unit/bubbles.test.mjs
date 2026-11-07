// เป่าฟองสบู่ rules — design/gdd/minigames-2.md §8 criteria 5–6.
// Run: node tests/unit/bubbles.test.mjs
import { test, assert, eq, near, done } from './_harness.mjs';
import { seeded } from '../../src/game/minigames/common-rules.js';
import {
  resolveBubbles, BUBBLES_DEFAULTS, spawnRateAt, riseAt, colorCount, pickBubble, nextCallIn, nextCallColor,
  mustForceCalled, newBubblesState, callColor, popBubble, pickTarget, bubblesCoins, expectedSpawns,
} from '../../src/game/minigames/bubbles-rules.js';

const CFG = resolveBubbles(BUBBLES_DEFAULTS).cfg;

console.log('bubbles');

test('defaults resolve with no missing key', () => { eq(resolveBubbles(BUBBLES_DEFAULTS).missing.length, 0, 'missing'); });

test('rate 1.1 → 2.2, rise 0.18 → 0.30; first-play easy period holds the start values', () => {
  near(spawnRateAt(0, CFG), 1.1, 1e-9, 'r0'); near(spawnRateAt(45, CFG), 2.2, 1e-9, 'r45');
  near(riseAt(45, CFG), 0.30, 1e-9, 'rise end'); near(riseAt(5, CFG, { easySec: 8 }), 0.18, 1e-9, 'easy');
  near(riseAt(0, CFG, { star: true }), 0.18 * 0.85, 1e-9, 'star'); near(riseAt(0, CFG, { relaxed: true }), 0.18 * 0.8, 1e-9, 'relaxed');
});

test('relaxed mode has 3 colours', () => { eq(colorCount(CFG, true), 3, 'relaxed'); eq(colorCount(CFG, false), 4, 'normal'); });

test('AC5 expected spawn count ≈ 71 ± 3', () => {
  const n = expectedSpawns(CFG);
  assert(Math.abs(n - 71) <= 3, `got ${n}`);
});

test('AC5 seeded rounds: mean spawn count 71 ± 3 with jittered frame times (1000 rounds)', () => {
  const rng = seeded(99);
  let sum = 0;
  for (let r = 0; r < 1000; r++) {
    let acc = 0, n = 0;
    for (let t = 0; t < CFG.durationSec;) { const dt = 1 / 60 + (rng() - 0.5) * 0.008; acc = Math.min(2, acc + spawnRateAt(t, CFG) * dt); if (acc >= 1) { acc -= 1; n++; } t += dt; }
    sum += n;
  }
  assert(Math.abs(sum / 1000 - 71) <= 3, `mean ${sum / 1000}`);
});

test('shares: ~40% called, ~7% coin, rest spread over other colours', () => {
  const rng = seeded(5); const cnt = { coin: 0, called: 0, other: [0, 0, 0, 0] };
  for (let i = 0; i < 20000; i++) { const b = pickBubble(rng(), rng(), 2, 4, CFG); if (b.coin) cnt.coin++; else if (b.color === 2) cnt.called++; else cnt.other[b.color]++; }
  near(cnt.coin / 20000, 0.07, 0.01, 'coin'); near(cnt.called / 20000, 0.40, 0.015, 'called');
  eq(cnt.other[2], 0, 'others never the called colour');
  for (const c of [0, 1, 3]) near(cnt.other[c] / 20000, 0.53 / 3, 0.015, 'other ' + c);
});

test('calls: every 7 ± 1 s, never the same colour twice', () => {
  const rng = seeded(8);
  let c = nextCallColor(rng(), -1, 4);
  for (let i = 0; i < 500; i++) {
    const d = nextCallIn(rng(), CFG); assert(d >= 6 && d <= 8, 'delay ' + d);
    const n = nextCallColor(rng(), c, 4); assert(n !== c && n >= 0 && n < 4, 'colour'); c = n;
  }
});

test('AC5 after every call a called-colour bubble exists within 1 s (spawn guarantee)', () => {
  // simulate the controller's guarantee: spawn when mustForceCalled, plus normal spawns
  const rng = seeded(31);
  for (let round = 0; round < 200; round++) {
    let st = newBubblesState(0); const live = []; let sinceNone = 0, acc = 0, callT = nextCallIn(rng(), CFG), firstSeen = -1;
    for (let t = 0; t < CFG.durationSec; t += 1 / 30) {
      st.sinceCall += 1 / 30; callT -= 1 / 30;
      if (callT <= 0) { st = callColor(st, nextCallColor(rng(), st.called, 4)); callT = nextCallIn(rng(), CFG); firstSeen = -1; for (const b of live) b.age = 99; }
      acc += spawnRateAt(t, CFG) / 30; if (acc >= 1) { acc -= 1; live.push({ ...pickBubble(rng(), rng(), st.called, 4, CFG), age: 0 }); }
      for (const b of live) b.age += 1 / 30;
      for (let i = live.length - 1; i >= 0; i--) if (live[i].age > 4) live.splice(i, 1);
      const on = live.filter((b) => !b.coin && b.color === st.called).length;
      sinceNone = on ? 0 : sinceNone + 1 / 30;
      if (mustForceCalled(on, st.sinceCall, sinceNone, CFG)) { live.push({ coin: false, color: st.called, age: 0 }); sinceNone = 0; }
      if (firstSeen < 0 && live.some((b) => !b.coin && b.color === st.called)) firstSeen = st.sinceCall;
      if (st.sinceCall >= 1) assert(firstSeen >= 0 && firstSeen <= 1, `round ${round}: none within 1 s`);
    }
  }
});

test('a good pop: streak + 1, score × mult; coin bubble +15 and coin pop', () => {
  let st = newBubblesState(1);
  for (let i = 0; i < 3; i++) st = popBubble(st, { coin: false, color: 1 }, CFG).state;
  eq(st.score, 30, '3 × 10'); eq(st.streak, 3, 'streak');
  st = popBubble(st, { coin: false, color: 1 }, CFG).state;
  eq(st.score, 45, '4th at ×1.5');
  st = popBubble(st, { coin: true, color: -1 }, CFG).state;
  eq(st.score, 45 + 23, 'coin 15 × 1.5 → 23'); eq(st.coinPops, 1, 'coin pops');
});

test('AC5 wrong colour: streak 0, score unchanged', () => {
  let st = { ...newBubblesState(1), score: 120, streak: 6 };
  const r = popBubble(st, { coin: false, color: 2 }, CFG);
  eq(r.outcome, 'wrong', 'outcome'); eq(r.state.streak, 0, 'streak'); eq(r.state.score, 120, 'score');
});

test('star mode: wrong colour passes behind, streak kept', () => {
  const st = { ...newBubblesState(1), score: 50, streak: 5 };
  const r = popBubble(st, { coin: false, color: 3 }, CFG, true);
  eq(r.outcome, 'pass', 'pass'); eq(r.state.streak, 5, 'kept');
});

test('AC5 previous colour 0.3 s after a change counts as correct; 0.5 s does not', () => {
  let st = callColor(newBubblesState(0), 2);
  st.sinceCall = 0.3;
  eq(popBubble(st, { coin: false, color: 0 }, CFG).outcome, 'good', 'grace');
  st = { ...st, sinceCall: 0.5 };
  eq(popBubble(st, { coin: false, color: 0 }, CFG).outcome, 'wrong', 'after grace');
});

test('tap between bubbles: nearest called colour/coin inside hit radius wins, else nearest', () => {
  const st = newBubblesState(1);
  const list = [
    { x: 0.1, y: 0, r: 0.25, coin: false, color: 0 },   // nearest, wrong colour
    { x: 0.28, y: 0, r: 0.25, coin: false, color: 1 },  // called, inside 0.25 × 1.3
    { x: 2, y: 0, r: 0.25, coin: true, color: -1 },
  ];
  eq(pickTarget(list, 0, 0, st, CFG), 1, 'called wins');
  eq(pickTarget([list[0]], 0, 0, st, CFG), 0, 'else nearest');
  eq(pickTarget(list, 5, 5, st, CFG), -1, 'miss');
});

test('AC6 coins: 4 coin pops + score 350 → 37; cap 60; floor 5 only when completed', () => {
  eq(bubblesCoins(350, 4, CFG, true), 37, 'worked'); eq(bubblesCoins(2000, 10, CFG, true), 60, 'cap');
  eq(bubblesCoins(0, 0, CFG, true), 5, 'floor'); eq(bubblesCoins(0, 0, CFG, false), 0, 'early');
});

done();
