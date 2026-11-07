// กระโดดข้ามก้อน rules — design/gdd/minigames-2.md §8 criteria 7–9.
// Run: node tests/unit/hop.test.mjs
import { test, assert, eq, near, done } from './_harness.mjs';
import { seeded } from '../../src/game/minigames/common-rules.js';
import {
  resolveHop, HOP_DEFAULTS, speedAt, gapAt, pickObstacle, doublesAllowed, newJump, jumpY, pressJump, stepJump,
  newHopState, applyHop, hopCoins, createFlick, airSec,
} from '../../src/game/minigames/hop-rules.js';

const CFG = resolveHop(HOP_DEFAULTS).cfg;
const HEAD = { head: true };

/** Feed a roll trace [[t, deg], …] sampled at 60 Hz between points; count hops. */
function flickHops(points, f = createFlick(CFG.headFlick)) {
  let hops = 0;
  for (let k = 1; k < points.length; k++) {
    const [t0, a0] = points[k - 1], [t1, a1] = points[k];
    const steps = Math.max(1, Math.round((t1 - t0) * 60));
    for (let s = k === 1 ? 0 : 1; s <= steps; s++) { const u = s / steps; if (f.update(a0 + (a1 - a0) * u, t0 + (t1 - t0) * u)) hops++; }
  }
  return hops;
}

console.log('hop');

test('defaults resolve with no missing key', () => { eq(resolveHop(HOP_DEFAULTS).missing.length, 0, 'missing'); });

test('speed 2.6 → 4.2; head × 0.8; relaxed × 0.8; easy period at start speed', () => {
  near(speedAt(0, CFG), 2.6, 1e-9, 's0'); near(speedAt(45, CFG), 4.2, 1e-9, 's45');
  near(speedAt(45, CFG, HEAD), 3.36, 1e-9, 'head'); near(speedAt(45, CFG, { relaxed: true }), 3.36, 1e-9, 'relaxed');
  near(speedAt(6, CFG, { easySec: 8 }), 2.6, 1e-9, 'easy');
});

test('AC7 no gap under airSec × minGapAir in 1000 seeded rounds', () => {
  const rng = seeded(4);
  for (let r = 0; r < 1000; r++) {
    for (let t = 0; t < CFG.durationSec;) {
      const g = gapAt(t, rng(), CFG); assert(g >= CFG.jump.airSec * CFG.spawn.minGapAir - 1e-9, `gap ${g} at ${t}`); t += g;
    }
  }
  near(airSec(CFG) * CFG.spawn.minGapAir, 0.992, 1e-9, 'floor 0.99 s');
});

test('expected obstacles per round ≈ 29', () => {
  const rng = seeded(6); let sum = 0;
  for (let r = 0; r < 400; r++) { let n = 0; for (let t = 1; t < CFG.durationSec; t += gapAt(t, rng(), CFG)) n++; sum += n; }
  near(sum / 400, 29, 2, 'mean');
});

test('AC7 no doubles before 20 s or in head mode / relaxed', () => {
  const rng = seeded(12);
  for (let i = 0; i < 20000; i++) {
    const t = rng() * 45;
    const o = pickObstacle(rng(), rng(), rng(), t, CFG); if (t < 20) assert(!o.double, 'double at ' + t);
    assert(!pickObstacle(rng(), rng(), rng(), t, CFG, HEAD).double, 'head double');
    assert(!pickObstacle(rng(), rng(), rng(), t, CFG, { relaxed: true }).double, 'relaxed double');
  }
  assert(doublesAllowed(25, CFG), 'allowed after 20 s');
});

test('kinds follow the weights; coin share 30%; doubles 15% after 20 s', () => {
  const rng = seeded(2); const c = { pebble: 0, cushion: 0, demon: 0 }; let coin = 0, dbl = 0; const N = 20000;
  for (let i = 0; i < N; i++) { const o = pickObstacle(rng(), rng(), rng(), 30, CFG); c[o.kind]++; if (o.coin) coin++; if (o.double) dbl++; }
  near(c.pebble / N, 0.45, 0.015, 'pebble'); near(c.demon / N, 0.2, 0.015, 'demon');
  near(coin / N, 0.3, 0.015, 'coin'); near(dbl / N, 0.15, 0.015, 'double');
});

test('jump arc: up to height 1.1, lands after 0.62 s', () => {
  const j = newJump(); eq(pressJump(j, CFG), 'jump', 'jump');
  let peak = 0, t = 0, r;
  do { r = stepJump(j, 1 / 120, CFG); t += 1 / 120; peak = Math.max(peak, jumpY(j)); } while (r === 'air');
  near(peak, 1.1, 0.01, 'peak'); near(t, 0.62, 0.01, 'air time'); eq(jumpY(j), 0, 'grounded');
});

test('AC7 at most one double jump per airtime; spam ignored; buffer keeps one', () => {
  const j = newJump();
  eq(pressJump(j, CFG), 'jump', '1'); stepJump(j, 0.2, CFG);
  eq(pressJump(j, CFG), 'double', '2');
  eq(pressJump(j, CFG), 'ignored', 'early spam');
  stepJump(j, 0.25, CFG);   // 0.1 s left of the double arc
  eq(pressJump(j, CFG), 'buffer', 'buffered'); eq(pressJump(j, CFG), 'ignored', 'one buffer only');
  let r; do { r = stepJump(j, 1 / 60, CFG); } while (r === 'air');
  eq(r, 'rejump', 'buffered jump on landing'); assert(j.air && !j.doubled, 'new jump, double available');
});

test('AC7 a bump sets streak 0 and never changes coins or score', () => {
  let st = newHopState();
  for (let i = 0; i < 5; i++) st = applyHop(st, i === 2 ? 'coin' : 'clear', CFG).state;
  const before = { ...st };
  st = applyHop(st, 'bump', CFG).state;
  eq(st.streak, 0, 'streak'); eq(st.coinsGot, before.coinsGot, 'coins'); eq(st.score, before.score, 'score');
  eq(applyHop(before, 'bump', CFG, true).state.streak, 5, 'face lost keeps the streak');
});

test('scores: clear 10 × mult, coin 15 × mult', () => {
  let st = newHopState();
  for (let i = 0; i < 4; i++) st = applyHop(st, 'clear', CFG).state;
  eq(st.score, 10 + 10 + 10 + 15, 'mult at 4');
  st = applyHop(st, 'coin', CFG).state; eq(st.score, 45 + 23, 'coin ×1.5'); eq(st.coinsGot, 1, 'coins got');
});

test('AC8 flick 0° → 13° in 0.2 s → hop', () => { eq(flickHops([[0, 0], [0.2, 13], [0.6, 13]]), 1, 'hops'); });
test('AC8 slow tilt 0° → 13° over 1.0 s → no hop', () => { eq(flickHops([[0, 0], [1.0, 13], [1.5, 13]]), 0, 'hops'); });
test('AC8 (as written) 0° → 13° over 0.5 s: 6°→12° takes 0.23 s < withinSec 0.25 → hop (flagged to loop)', () => {
  eq(flickHops([[0, 0], [0.5, 13]]), 1, 'linear 0.5 s ramp is inside the formula window');
});
test('AC8 holding 13° → one hop only', () => { eq(flickHops([[0, 0], [0.1, 13], [3, 13]]), 1, 'hops'); });
test('AC8 back to 5° then 13° fast → second hop', () => { eq(flickHops([[0, 0], [0.1, 13], [0.5, 13], [0.7, 5], [0.8, 5], [0.9, 13]]), 2, 'hops'); });
test('flick either side; slow drift past 12° never jumps until re-armed', () => {
  eq(flickHops([[0, 0], [0.1, -13], [0.4, -2], [0.5, 13]]), 2, 'both sides');
  eq(flickHops([[0, 0], [2, 14], [2.1, 14], [2.15, 13]]), 0, 'drift');
});
test('flick ignores lost face (null)', () => { const f = createFlick(CFG.headFlick); eq(f.update(null, 0), false, 'null'); });

test('AC9 coins: 5 coins + score 370 → 36; cap 60; floor 5', () => {
  eq(hopCoins(370, 5, CFG, true), 36, 'worked'); eq(hopCoins(5000, 9, CFG, true), 60, 'cap');
  eq(hopCoins(0, 0, CFG, true), 5, 'floor'); eq(hopCoins(0, 0, CFG, false), 0, 'early');
});

done();
