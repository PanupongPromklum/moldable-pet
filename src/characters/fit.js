/**
 * Per-shape outfit anchors (story S2-06). Built once per character, lazily, the first time an
 * outfit item is equipped. Everything is in the character's body space (the `turn` group: origin
 * at the body centre, +Z towards the camera), the same space the soft-body deformers use.
 *
 * Sources:
 *  - the traced silhouette (`profile`, 360 radii at z = 0) → horizontal spans and head top;
 *  - the flat body mesh vertices → a front / back height map (surface z for any x, y);
 *  - the face data (eye centres, sizes, rotation; mouth position, mouth scale).
 *
 * Clearance rules the anchors enforce so items in different slots never meet:
 *  - eyewear lenses surround the eyes and stay above the mouth top;
 *  - head items stay above `head.minY` (the highest eyewear point + a margin), so they never
 *    cover the eyes, whether or not glasses are worn;
 *  - body items stay below `chest.topY` (the fully open mouth's lowest point − a margin).
 */
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const GRID = 72;

/**
 * @param {{ profile: number[], positions: ArrayLike<number>, bbox: THREE.Box3, eye: any, eyeScale: number,
 *   mouth: { x: number, y: number }, mScale: number, top: number, bottom: number }} o
 * @returns {object} fit (see fields below)
 */
export function createFit(o) {
  const { profile, positions, bbox, eye: E, eyeScale: S, mouth, mScale } = o;

  /* ---------- silhouette polygon (z = 0) ---------- */
  const N = profile.length, px = new Float32Array(N), py = new Float32Array(N);
  for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2; px[i] = profile[i] * Math.cos(t); py[i] = profile[i] * Math.sin(t); }

  /** Sorted x crossings of the outline at height y. */
  function crossX(y) {
    const xs = [];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, y0 = py[i], y1 = py[j];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(px[i] + (y - y0) / (y1 - y0) * (px[j] - px[i]));
    }
    return xs.sort((a, b) => a - b);
  }
  /**
   * The horizontal span of the silhouette at height y that contains (or is nearest to) nearX.
   * @returns {{ l: number, r: number, cx: number, hw: number } | null}
   */
  function span(y, nearX = 0) {
    const xs = crossX(y); if (xs.length < 2) return null;
    let best = null, bd = Infinity;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const l = xs[k], r = xs[k + 1], d = nearX < l ? l - nearX : nearX > r ? nearX - r : 0;
      if (d < bd) { bd = d; best = { l, r, cx: (l + r) / 2, hw: (r - l) / 2 }; }
    }
    return best;
  }
  /** Highest point of the silhouette straight above x. */
  function topAt(x) {
    let best = -Infinity;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, x0 = px[i], x1 = px[j];
      if ((x0 <= x && x1 > x) || (x1 <= x && x0 > x)) best = Math.max(best, py[i] + (x - x0) / (x1 - x0) * (py[j] - py[i]));
    }
    return best;
  }
  function inside(x, y) {
    let c = false;
    for (let i = 0, j = N - 1; i < N; j = i++) {
      if ((py[i] > y) !== (py[j] > y) && x < (px[j] - px[i]) * (y - py[i]) / (py[j] - py[i]) + px[i]) c = !c;
    }
    return c;
  }

  /* ---------- front / back height map from the body vertices ---------- */
  const x0 = bbox.min.x - .03, y0 = bbox.min.y - .03, cw = (bbox.max.x - bbox.min.x + .06) / GRID, ch = (bbox.max.y - bbox.min.y + .06) / GRID;
  const F = new Float32Array(GRID * GRID).fill(-Infinity), B = new Float32Array(GRID * GRID).fill(Infinity);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    const gi = clamp(Math.floor((x - x0) / cw), 0, GRID - 1), gj = clamp(Math.floor((y - y0) / ch), 0, GRID - 1), k = gj * GRID + gi;
    if (z > F[k]) F[k] = z; if (z < B[k]) B[k] = z;
  }
  // empty cells: inside the outline → average of filled neighbours; outside → 0 (the rim)
  for (let pass = 0; pass < 6; pass++) {
    let left = 0;
    for (let gj = 0; gj < GRID; gj++) for (let gi = 0; gi < GRID; gi++) {
      const k = gj * GRID + gi; if (F[k] !== -Infinity) continue;
      if (!inside(x0 + (gi + .5) * cw, y0 + (gj + .5) * ch)) { F[k] = 0; B[k] = 0; continue; }
      let sf = 0, sb = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = gi + di, b = gj + dj; if (a < 0 || b < 0 || a >= GRID || b >= GRID) continue;
        const q = b * GRID + a; if (F[q] === -Infinity) continue; sf += F[q]; sb += B[q]; n++;
      }
      if (n) { F[k] = sf / n; B[k] = sb / n; } else left++;
    }
    if (!left) break;
  }
  for (let k = 0; k < F.length; k++) if (F[k] === -Infinity) { F[k] = 0; B[k] = 0; }
  function sample(A, x, y) {
    const u = clamp((x - x0) / cw - .5, 0, GRID - 1.001), v = clamp((y - y0) / ch - .5, 0, GRID - 1.001);
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, k = j * GRID + i;
    return (A[k] * (1 - fu) + A[k + 1] * fu) * (1 - fv) + (A[k + GRID] * (1 - fu) + A[k + GRID + 1] * fu) * fv;
  }
  /** Front surface z at (x, y) (0 outside the outline). */
  const frontZ = (x, y) => Math.max(0, sample(F, x, y));
  /** Back surface z at (x, y) (≤ 0). */
  const backZ = (x, y) => Math.min(0, sample(B, x, y));
  /** Front surface normal at (x, y). */
  function normalAt(x, y, out = new THREE.Vector3()) {
    const h = cw * 1.5;
    return out.set(-(frontZ(x + h, y) - frontZ(x - h, y)) / (2 * h), -(frontZ(x, y + h) - frontZ(x, y - h)) / (2 * h), 1).normalize();
  }

  /* ---------- face ---------- */
  const order = E.pos[0][0] <= E.pos[1][0] ? [0, 1] : [1, 0];
  const eHW = E.w * S, eHH = E.h * S, eR = Math.max(eHW, eHH);
  const halfSpacing = Math.abs(E.pos[1][0] - E.pos[0][0]) / 2;
  const mouthHW = .09 * mScale + .01;
  const mouthTop = mouth.y + .014 * mScale + .004;            // closed / smiling mouth top
  const mouthBottom = mouth.y - .1 * mScale - .006;           // fully open mouth bottom
  const tube = clamp(eR * .13, .011, .016);

  const eyes = order.map((idx) => {
    const [ex, ey] = E.pos[idx];
    const rx = Math.min(eHW * 1.12 + tube, halfSpacing);
    let top = ey + eHH * 1.12 + tube, bot = ey - eHH * 1.12 - tube;
    const overMouth = Math.abs(ex - mouth.x) < rx + mouthHW;
    const lowest = mouthTop + .008 + tube;
    if (overMouth && bot - tube < lowest - tube) bot = Math.max(bot, lowest);
    const cy = (top + bot) / 2, ry = (top - bot) / 2;
    // star frames: hole around the eye, points clear of the mouth
    const hole = eR * 1.08;
    let star = Math.max(hole * 1.6, ry + tube * 2);
    if (overMouth) star = Math.min(star, (cy - (mouthTop + .01)) / .81);
    star = Math.max(star, hole * 1.28);
    const z = frontZ(ex, cy);
    return { x: ex, y: ey, cy, rx, ry, rot: E.rot || 0, z, n: normalAt(ex, cy), hole, star, eyeHW: eHW, eyeHH: eHH };
  });
  const eyeZoneTop = Math.max(...eyes.map(e => Math.max(e.cy + e.ry + tube, e.cy + e.star + .012)));

  /* ---------- head ---------- */
  const faceCx = (E.pos[0][0] + E.pos[1][0]) / 2;
  const hx = faceCx * .3;
  const top = topAt(hx);
  const head = { x: hx, top, minY: eyeZoneTop + .022 };

  /* ---------- chest ---------- */
  const chestX = mouth.x * .7 + faceCx * .3;
  const chestTop = mouthBottom - .02;
  const zc = frontZ(chestX, chestTop);
  let chestBottom = chestTop;
  for (let y = chestTop; y > o.bottom * .9; y -= .01) { if (frontZ(chestX, y) < zc * .62) break; chestBottom = y; }
  const chest = { x: chestX, topY: chestTop, bottomY: chestBottom };

  const height = o.top - o.bottom;
  return {
    frontZ, backZ, normalAt, span, topAt, inside,
    /** Overall body size relative to the reference blob (≈ 1). */
    size: clamp(height / 1.7, .8, 1.25),
    tube, eyes, eyeZoneTop, faceCx,
    mouth: { x: mouth.x, y: mouth.y, top: mouthTop, bottom: mouthBottom, hw: mouthHW },
    head, chest,
    top: o.top, bottom: o.bottom,
  };
}
