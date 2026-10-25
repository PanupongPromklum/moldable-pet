// Head-tilt control math (Sprint 3 #3). Run: node tests/unit/head-control.test.mjs
import { test, eq, near, assert, done } from './_harness.mjs';
import { headPose, deadZone, poseToAxis, axisToClientX, smoothToward, createCalibrator, FACE_IDS, HEAD_FEEL } from '../../src/input/head-rules.js';

console.log('head control');

/** Landmark fixture: eye corners at ±halfSpan around (cx, cy), rolled by `deg` (+ = player's right), nose at noseX. */
function face(deg, { cx = 0.5, cy = 0.45, halfSpan = 0.12, noseX = 0.5, aspect = 1 } = {}) {
  const L = [];
  const t = (deg * Math.PI) / 180;
  // subject's right eye is on the image left; tilting to the player's right lowers it (y grows)
  L[FACE_IDS.eyeR] = { x: cx - (halfSpan * Math.cos(t)) / aspect, y: cy + halfSpan * Math.sin(t) };
  L[FACE_IDS.eyeL] = { x: cx + (halfSpan * Math.cos(t)) / aspect, y: cy - halfSpan * Math.sin(t) };
  L[FACE_IDS.nose] = { x: noseX, y: cy + 0.08 };
  return L;
}
const NEUTRAL = { roll: 0, nose: 0 };

test('headPose_levelFace_rollZero', () => {
  const p = headPose(face(0), 1);
  near(p.roll, 0, 1e-9, 'roll'); near(p.nose, 0, 1e-9, 'nose');
});

test('headPose_tiltToPlayersRight_positiveRoll_aspectCorrected', () => {
  near(headPose(face(15, { aspect: 4 / 3 }), 4 / 3).roll, 15, 1e-6, '15° on a 4:3 frame');
  near(headPose(face(-20), 1).roll, -20, 1e-6, 'left tilt');
});

test('headPose_missingLandmarks_null', () => {
  eq(headPose([], 1), null, 'empty'); eq(headPose(null, 1), null, 'null');
});

test('deadZone_insideZero_edgeOne_clamped', () => {
  eq(deadZone(3.9, 4, 20), 0, 'inside'); eq(deadZone(-4, 4, 20), 0, 'edge of zone');
  near(deadZone(12, 4, 20), 0.5, 1e-9, 'half way'); eq(deadZone(20, 4, 20), 1, 'full'); eq(deadZone(-45, 4, 20), -1, 'clamped');
});

test('poseToAxis_rollMapsDeadZoneToFullWidth', () => {
  eq(poseToAxis({ roll: 3, nose: 0 }, NEUTRAL), 0, '3° = still');
  near(poseToAxis({ roll: 12, nose: 0 }, NEUTRAL), 0.5, 1e-9, '12° = half right');
  eq(poseToAxis({ roll: 20, nose: 0 }, NEUTRAL), 1, '20° = right edge');
  eq(poseToAxis({ roll: -30, nose: 0 }, NEUTRAL), -1, '−30° = left edge');
});

test('poseToAxis_usesCalibratedNeutral', () => {
  const tiltedRest = { roll: 6, nose: 0.05 };
  eq(poseToAxis({ roll: 6, nose: 0.05 }, tiltedRest), 0, 'resting pose = centre');
  near(poseToAxis({ roll: 18, nose: 0.05 }, tiltedRest), 0.5, 1e-9, '+12° from rest');
});

test('poseToAxis_noseAddsSecondaryCue', () => {
  const f = HEAD_FEEL;
  near(poseToAxis({ roll: 0, nose: f.noseFull }, NEUTRAL), f.noseWeight, 1e-9, 'nose alone ≤ weight');
  eq(poseToAxis({ roll: 0, nose: f.noseDead * 0.5 }, NEUTRAL), 0, 'nose jitter ignored');
  eq(poseToAxis({ roll: 20, nose: f.noseFull }, NEUTRAL), 1, 'never past the edge');
});

test('axisToClientX_spansPlayWidth', () => {
  eq(axisToClientX(-1, 0, 390), 0, 'left'); eq(axisToClientX(0, 0, 390), 195, 'centre'); eq(axisToClientX(1, 10, 390), 400, 'right + offset');
  eq(axisToClientX(3, 0, 100), 100, 'clamped');
});

test('headPose_thenAxis_endToEnd_tilt12DegreesIsHalfRight', () => {
  const p = headPose(face(12, { aspect: 4 / 3 }), 4 / 3);
  near(axisToClientX(poseToAxis(p, NEUTRAL), 0, 400), 300, 1e-6, 'x');
});

test('smoothToward_frameRateIndependent', () => {
  let a = 0; for (let i = 0; i < 6; i++) a = smoothToward(a, 1, 1 / 60, 9);
  const b = smoothToward(0, 1, 6 / 60, 9);
  near(a, b, 1e-12, '6 small steps = 1 big'); eq(smoothToward(0.3, 1, 0, 9), 0.3, 'dt 0 keeps');
});

test('createCalibrator_meanOfSamples_falseWhenEmpty', () => {
  const c = createCalibrator(); const out = { roll: 9, nose: 9 };
  assert(!c.mean(out) && out.roll === 9, 'empty leaves out');
  c.add({ roll: 4, nose: 0.1 }); c.add({ roll: 8, nose: -0.1 });
  assert(c.mean(out), 'has mean'); near(out.roll, 6, 1e-12, 'roll'); near(out.nose, 0, 1e-12, 'nose'); eq(c.count, 2, 'count');
  c.reset(); eq(c.count, 0, 'reset');
});

done();
