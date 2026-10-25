// Petting taper + stroke rules (needs GDD 4.2, acceptance 12a). Run: node tests/unit/pet-stroke.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, near, done } from './_harness.mjs';
import { applyPet, petTaper, strokeCounts, inHeadZone, petNumber } from '../../src/game/needs.js';

const load = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../assets/data/${f}`, import.meta.url)), 'utf8'));
const A = load('needs.json').actions;
const PERSONAS = load('personas.json');
const DT = 1 / 60;

/** Seconds of petting ticks from `from` until social ≥ `to`. */
function secondsTo(key, from, to) {
  const lv = { social: from, fun: 0 };
  let t = 0;
  while (lv.social < to && t < 120) { applyPet(lv, A, PERSONAS[key].petGain, DT); t += DT; }
  return t;
}

console.log('pet stroke');

test('petTaper_belowStart_one_atFull_min', () => {
  eq(petTaper(0.5, A), 1, 'below start');
  near(petTaper(1, A), petNumber(A, 'petSocialTaperMin'), 1e-12, 'at 1.0');
  const mid = (petNumber(A, 'petSocialTaperStart') + 1) / 2;
  near(petTaper(mid, A), (1 + petNumber(A, 'petSocialTaperMin')) / 2, 1e-12, 'half way');
});

test('applyPet_pill_0.3to0.75_about7s', () => near(secondsTo('pill', 0.3, 0.75), 7.0, 0.1, 'pill'));
test('applyPet_flower_0.3to0.75_about4.7s', () => near(secondsTo('flower', 0.3, 0.75), 4.7, 0.1, 'flower'));
test('applyPet_cloud_0.3to0.75_about10s', () => near(secondsTo('cloud', 0.3, 0.75), 10.0, 0.1, 'cloud'));
test('applyPet_pill_0.75toFull_taperAbout6.6s', () => near(secondsTo('pill', 0.75, 0.999), 6.6, 0.2, 'pill top'));

test('applyPet_funHasNoTaper_clamped', () => {
  const lv = { social: 0.99, fun: 0.5 };
  applyPet(lv, A, 1, 1);
  near(lv.fun, 0.5 + A.petPerSecond.fun, 1e-12, 'fun flat');
  assert(lv.social <= 1, 'clamped');
});

test('strokeCounts_speedWindow_matchesAcceptance12a', () => {
  eq(strokeCounts(0.1, Infinity, A), false, '0.1 too slow');
  eq(strokeCounts(4.5, 0, A), false, '4.5 too fast, even in grace');
  eq(strokeCounts(0.12, Infinity, A), true, 'min');
  eq(strokeCounts(4.0, Infinity, A), true, 'max');
});

test('strokeCounts_slowPauseWithinGrace_counts_afterGrace_not', () => {
  const g = petNumber(A, 'petStrokeGraceSeconds');
  eq(strokeCounts(0, g * 0.5, A), true, 'turning round');
  eq(strokeCounts(0, g + 0.01, A), false, 'resting finger');
});

test('inHeadZone_topShareOfBody', () => {
  const z = petNumber(A, 'petHeadZoneFromTop');
  eq(inHeadZone(2 - 2 * z + 0.01, 0, 2, A), true, 'just inside');
  eq(inHeadZone(2 - 2 * z - 0.01, 0, 2, A), false, 'just below');
  eq(inHeadZone(1.9, 0, 2, A), true, 'top');
  eq(inHeadZone(3, 0, 2, A), false, 'far above');
});

test('petNumber_missingKey_default', () => eq(petNumber({}, 'petStrokeMaxSpeed'), 4, 'default'));

done();
