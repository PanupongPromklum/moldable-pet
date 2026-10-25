/**
 * Head-tilt control — pure math (no DOM, no MediaPipe), unit-tested in
 * tests/unit/head-control.test.mjs. Used by `input/head.js` for the Snack Rain
 * "เอียงหัว" control (module-contracts.md › Sprint 3 additions #3).
 *
 * Conventions: landmarks are MediaPipe Face Landmarker image coordinates
 * (x, y in 0..1, NOT mirrored, y down). The player sees a mirrored world, so a
 * positive roll / axis means "towards the player's right" = screen right.
 * @module input/head-rules
 */

/** Face mesh landmark ids: outer eye corners (subject's right / left) and nose tip. */
export const FACE_IDS = Object.freeze({ eyeR: 33, eyeL: 263, nose: 1 });

/**
 * Input feel (degrees, shares of the frame, seconds) — presentation, not balance.
 * `deadZoneDeg` around the calibrated neutral does nothing; `fullDeg` from neutral
 * reaches the screen edge; the nose's sideways offset adds a smaller second cue.
 */
export const HEAD_FEEL = Object.freeze({
  deadZoneDeg: 4, fullDeg: 20,
  noseWeight: 0.35, noseDead: 0.02, noseFull: 0.18,
  followPerSec: 9, lostSeconds: 0.7,
});

const DEG = 180 / Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * Head pose from one face's landmarks.
 * @param {ArrayLike<{x:number,y:number}>} L landmarks (468+)
 * @param {number} [aspect] video width / height (x and y are normalized separately)
 * @param {{roll:number, nose:number}} [out] reused to avoid allocation
 * @returns {{roll:number, nose:number}|null} roll in degrees (+ = tilt to the
 *   player's right), nose = mirrored horizontal offset of the nose tip from the
 *   frame centre (+ = player's right), in shares of the frame width
 */
export function headPose(L, aspect = 4 / 3, out = { roll: 0, nose: 0 }) {
  const a = L && L[FACE_IDS.eyeR], b = L && L[FACE_IDS.eyeL], n = L && L[FACE_IDS.nose];
  if (!a || !b || !n) return null;
  const dx = (b.x - a.x) * aspect, dy = a.y - b.y;
  if (dx * dx + dy * dy < 1e-8) return null;
  out.roll = Math.atan2(dy, dx) * DEG;
  out.nose = 0.5 - n.x;
  return out;
}

/**
 * Signed value past a dead zone, scaled so `full` maps to ±1 (clamped).
 * @param {number} v @param {number} dead @param {number} full
 */
export function deadZone(v, dead, full) {
  const m = Math.abs(v);
  if (m <= dead) return 0;
  return Math.sign(v) * clamp((m - dead) / Math.max(1e-6, full - dead), 0, 1);
}

/**
 * Head pose → movement axis −1 (screen left edge) … +1 (right edge).
 * Roll is the main cue (±fullDeg from neutral = full width); the nose offset adds
 * `noseWeight` × its own dead-zoned share so a small head shift helps too.
 * @param {{roll:number, nose:number}} pose
 * @param {{roll:number, nose:number}} neutral calibrated pose
 * @param {typeof HEAD_FEEL} [f]
 */
export function poseToAxis(pose, neutral, f = HEAD_FEEL) {
  const r = deadZone(pose.roll - neutral.roll, f.deadZoneDeg, f.fullDeg);
  const n = deadZone(pose.nose - neutral.nose, f.noseDead, f.noseFull);
  return clamp(r + f.noseWeight * n, -1, 1);
}

/**
 * Axis → client x across the play area.
 * @param {number} axis −1..1 @param {number} left px @param {number} width px
 */
export function axisToClientX(axis, left, width) {
  return left + width * 0.5 * (1 + clamp(axis, -1, 1));
}

/**
 * Frame-rate independent exponential smoothing.
 * @param {number} prev @param {number} target @param {number} dt s @param {number} perSec
 */
export function smoothToward(prev, target, dt, perSec) {
  return prev + (target - prev) * (1 - Math.exp(-perSec * Math.max(0, dt)));
}

/**
 * Running mean for calibrating the neutral pose (no allocation per sample).
 * @returns {{ add(p:{roll:number,nose:number}):void, reset():void, count:number, mean(out:{roll:number,nose:number}):boolean }}
 */
export function createCalibrator() {
  let n = 0, r = 0, s = 0;
  return {
    add(p) { n++; r += p.roll; s += p.nose; },
    reset() { n = 0; r = 0; s = 0; },
    get count() { return n; },
    /** Write the mean into `out`; false (out untouched) without samples. */
    mean(out) { if (!n) return false; out.roll = r / n; out.nose = s / n; return true; },
  };
}
