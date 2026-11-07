// จำท่าทาง rules — design/gdd/minigames-2.md §8 criteria 2–4.
// Run: node tests/unit/mimic.test.mjs
import { test, assert, eq, near, done } from './_harness.mjs';
import { seeded } from '../../src/game/minigames/common-rules.js';
import {
  resolveMimic, MIMIC_DEFAULTS, showSec, padsFor, extendSequence, sequenceOfLength, newMimicState,
  pressPad, useHint, endCheck, mimicCoins, mimicFraction, showPhaseSec,
} from '../../src/game/minigames/mimic-rules.js';

const CFG = resolveMimic(MIMIC_DEFAULTS).cfg;
/** Press the whole current sequence right. */
const playRight = (st, rng) => { let r; for (const p of st.seq) { r = pressPad(st, p, CFG, rng); st = r.state; } return r; };
const wrongPad = (st) => (st.seq[st.idx] + 1) % padsFor(st.L, CFG);

console.log('mimic');

test('defaults resolve with no missing key', () => { eq(resolveMimic(MIMIC_DEFAULTS).missing.length, 0, 'missing'); });

test('AC2 showSec(2)=0.75, (6)=0.625, (12)=0.5', () => {
  near(showSec(2, CFG), 0.75, 0.001, 'L2'); near(showSec(6, CFG), 0.625, 0.001, 'L6'); near(showSec(12, CFG), 0.5, 0.001, 'L12');
});

test('relaxed × 1.4 and slip replay × 1.25', () => {
  near(showSec(2, CFG, { relaxed: true }), 1.05, 0.001, 'relaxed');
  near(showSec(2, CFG, { replay: true }), 0.9375, 0.001, 'replay');
});

test('show phase length L=6 = 6 × 0.775', () => {
  const st = { ...newMimicState(CFG, seeded(1)), L: 6, seq: [0, 1, 2, 3, 0, 1], replay: false };
  near(showPhaseSec(st, CFG), 4.65, 0.001, 'show');
});

test('AC2 pads(5)=4, pads(6)=6', () => { eq(padsFor(5, CFG), 4, 'L5'); eq(padsFor(6, CFG), 6, 'L6'); });

test('AC2 a new sequence keeps the previous one as prefix', () => {
  const rng = seeded(7);
  let st = newMimicState(CFG, rng);
  for (let k = 0; k < 8; k++) {
    const before = st.seq.slice();
    st = playRight(st, rng).state;
    eq(st.seq.length, before.length + 1, 'grows by one');
    eq(JSON.stringify(st.seq.slice(0, before.length)), JSON.stringify(before), 'prefix kept');
  }
});

test('AC2 no pose 3 times in a row over 1000 seeded sequences', () => {
  const rng = seeded(42);
  for (let n = 0; n < 1000; n++) {
    let s = [];
    for (let L = 1; L <= 12; L++) s = extendSequence(s, rng, L >= 6 ? 6 : 4, 2);
    for (let i = 2; i < s.length; i++) assert(!(s[i] === s[i - 1] && s[i] === s[i - 2]), `run of 3 in ${s}`);
  }
});

test('extendSequence with 2 pads still avoids 3 in a row (worst case)', () => {
  const always0 = () => 0;
  let s = [];
  for (let i = 0; i < 10; i++) s = extendSequence(s, always0, 2, 2);
  for (let i = 2; i < s.length; i++) assert(!(s[i] === s[i - 1] && s[i] === s[i - 2]), s.join());
});

test('AC3 completed L=6 adds 60, with hint 30', () => {
  const rng = seeded(3);
  const st = { ...newMimicState(CFG, rng), L: 6, seq: sequenceOfLength([], 6, rng, CFG) };
  eq(playRight({ ...st }, rng).state.score, 60, 'plain');
  eq(playRight(useHint({ ...st }), rng).state.score, 30, 'hint');
});

test('AC3 second slip at L=5 → next L=4 (prefix kept)', () => {
  const rng = seeded(5);
  let st = { ...newMimicState(CFG, rng), L: 5, seq: sequenceOfLength([], 5, rng, CFG) };
  const seq5 = st.seq.slice();
  st = pressPad(st, wrongPad(st), CFG, rng).state;
  eq(st.L, 5, 'first slip keeps L'); assert(st.replay, 'replay slower');
  st = pressPad(st, wrongPad(st), CFG, rng).state;
  eq(st.L, 4, 'second slip steps back');
  eq(JSON.stringify(st.seq), JSON.stringify(seq5.slice(0, 4)), 'shortened prefix');
});

test('AC3 slips at L=2 twice → L stays 2', () => {
  const rng = seeded(9);
  let st = newMimicState(CFG, rng);
  st = pressPad(st, wrongPad(st), CFG, rng).state;
  st = pressPad(st, wrongPad(st), CFG, rng).state;
  eq(st.L, 2, 'floor'); eq(st.seq.length, 2, 'seq length');
});

test('AC3 three slips end the round', () => {
  const rng = seeded(11);
  let st = newMimicState(CFG, rng);
  for (let i = 0; i < 3; i++) { eq(endCheck(st, 10, CFG), '', 'not yet ' + i); st = pressPad(st, wrongPad(st), CFG, rng).state; }
  eq(endCheck(st, 10, CFG), 'slips', 'ended');
});

test('AC3 time ≥ 75 s ends only between sequences', () => {
  const rng = seeded(13);
  let st = newMimicState(CFG, rng);
  // endCheck is only called by the controller between sequences; mid-sequence presses never end the round
  const r = pressPad(st, st.seq[0], CFG, rng);
  eq(r.outcome, 'ok', 'mid sequence continues even after 75 s');
  st = playRight(st, rng).state;
  eq(endCheck(st, 74.9, CFG), '', 'before time'); eq(endCheck(st, 75, CFG), 'time', 'at time, after the sequence');
});

test('reaching maxLength ends with "max"', () => {
  const rng = seeded(17);
  let st = newMimicState(CFG, rng);
  while (st.L <= CFG.maxLength) st = playRight(st, rng).state;
  eq(endCheck(st, 30, CFG), 'max', 'max'); eq(st.best, 12, 'reached 12');
  eq(st.score, (2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12) * 10, 'score');
});

test('taps after the sequence is done are ignored', () => {
  const rng = seeded(1);
  const st = { ...newMimicState(CFG, rng), done: true };
  eq(pressPad(st, 0, CFG, rng).outcome, 'ignored', 'ignored');
});

test('AC4 coins: 200 → 36, 440 → 60, 0 completed → 5, early exit 0 → 0', () => {
  eq(mimicCoins(200, CFG, true), 36, '200'); eq(mimicCoins(440, CFG, true), 60, '440');
  eq(mimicCoins(0, CFG, true), 5, 'floor'); eq(mimicCoins(0, CFG, false), 0, 'early');
});

test('worked example: L 2..6 then 3 slips → 200 points', () => {
  const rng = seeded(21);
  let st = newMimicState(CFG, rng);
  while (st.L <= 6) st = playRight(st, rng).state;
  for (let i = 0; i < 3; i++) st = pressPad(st, wrongPad(st), CFG, rng).state;
  eq(st.score, 200, 'score'); eq(endCheck(st, 40, CFG), 'slips', 'end'); eq(mimicCoins(st.score, CFG, true), 36, 'coins');
});

test('needs fraction: rule end 1, early t/maxSec', () => {
  eq(mimicFraction(20, CFG, true), 1, 'complete'); near(mimicFraction(30, CFG, false), 0.4, 1e-9, 'early');
});

done();
