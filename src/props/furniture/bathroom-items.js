/**
 * bathroom-items.js — furniture items of ห้องน้ำ (owner: prop-utility, S4-03).
 * Contract: docs/architecture/module-contracts.md → "Sprint 4 additions" (ids fixed).
 *
 * Slots and footprints (room space: floor y = 0, wall z = -3, pet at the origin):
 *   mirror  BATHROOM_ANCHORS.mirror — wall area x -1.42..-0.16, y 1.72..3.1, above the
 *           pedestal sink (left of the pet's head on a 390×844 phone; the globe sconce
 *           at x 0.04 is fixed decor and stays clear)
 *   wall    BATHROOM_ANCHORS.wall — wall area x 0.4..1.4, y 1.6..2.95, above the toilet
 *           tank (the live toilet draws in front of it, which is the right order)
 *   rug     BATHROOM_ANCHORS.rug — floor oval ≈ 3.8 × 3.2 centred a little in front of the
 *           pet (z 1.0, so more of it shows below the pet on phones), flat (≤ 0.08 high),
 *           back edge at z ≥ -0.65 so it never reaches the toilet base
 *
 * All parts are static clay (baked by wire). Items only use `b` — nothing here moves.
 */
import * as THREE from 'three';
import {
  BRAND, PALETTE, NIGHT, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, brandGradientX, puffyStar, circle,
} from '../clay.js';
import { registerFurniture } from '../../rooms/furniture.js';
import {
  XMAS, TINT, softShape, hollyLeaf, heartShape, snowflake, tubeAlong,
  ovalMat, scallopRing, flatOnFloor, bow,
} from './kitchen-bath-shared.js';

/** Slot anchors of the bathroom (art layout, not gameplay numbers). */
export const BATHROOM_ANCHORS = Object.freeze({
  mirror: Object.freeze({ x: -0.78, y: 2.42 }),
  wall: Object.freeze({ x: 0.88, y: 2.2 }),
  rug: Object.freeze({ x: 0, z: 1.0 }),
});

const M = BATHROOM_ANCHORS.mirror, T = BATHROOM_ANCHORS.wall, R = BATHROOM_ANCHORS.rug;
const PI = Math.PI;
const WHITE = '#FFFFFF';
const GLASS = PALETTE.glass;
const GLASS_NIGHT = '#8E9BCB';

/** Two soft shine streaks on a mirror (white, slightly in front of the glass). */
function shine(b, x, y, z, s = 1) {
  b.add(capsule(0.032 * s, 0.3 * s, 3, 8), WHITE, { position: [x, y, z], rotation: [0, 0, -0.55], scale: [1, 1, 0.35], shade: 0 });
  b.add(capsule(0.022 * s, 0.1 * s, 3, 8), WHITE, { position: [x + 0.12 * s, y + 0.1 * s, z], rotation: [0, 0, -0.55], scale: [1, 1, 0.35], shade: 0 });
}

/** Glass disc facing +Z (night: a cool dusk reflection). */
function glass(b, x, y, z, rx, ry, color = GLASS) {
  b.add(puck(1, 0.03, 40), color, { position: [x, y, z], rotation: [PI / 2, 0, 0], scale: [rx, 1, ry], shade: 0, night: GLASS_NIGHT });
}

/* ------------------------------------------------------------------ mirror */

registerFurniture('mirror-oval', ({ b, W }) => {
  const x = M.x, y = M.y, z = W;
  b.add(puck(0.5, 0.08, 40), WHITE, { position: [x, y, z], rotation: [PI / 2, 0, 0], scale: [1, 1, 1.3], shade: 0.02 });
  b.add(torus(0.47, 0.035, 8, 48), TINT.periSoft, { position: [x, y, z + 0.08], scale: [1, 1.3, 1], shade: 0 });
  glass(b, x, y, z + 0.06, 0.41, 0.54);
  shine(b, x - 0.17, y + 0.18, z + 0.09);
  // little bead dots around the frame
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    b.add(sphere(0.028, 10, 8), i % 2 ? TINT.pinkSoft : TINT.lavSoft, { position: [x + Math.cos(a) * 0.475, y + Math.sin(a) * 0.62, z + 0.1], scale: [1, 1, 0.6], shade: 0 });
  }
  // a blob sticker in the corner and a tiny heart
  b.add(blob(0.06, { seed: 4 }), brandGradientX(x + 0.1, x + 0.3, 0.25), { position: [x + 0.22, y - 0.33, z + 0.08], scale: [1.15, 1, 0.2], shade: 0 });
  for (const s of [-1, 1]) b.add(sphere(0.008, 6, 5), PALETTE.ink, { position: [x + 0.22 + s * 0.022, y - 0.32, z + 0.095] });
  b.add(heartShape(0.06), TINT.pink, { position: [x - 0.25, y - 0.38, z + 0.09], rotation: [0, 0, 0.25] });
  b.addWallShadow(x, y - 0.06, z, 1.1, 1.4, 0.5);
});

registerFurniture('mirror-cloud', ({ b, W }) => {
  const x = M.x, y = M.y + 0.02, z = W;
  // cloud = overlapping round puffs (frame, then glass a little in front)
  const puffs = [[0, 0.08, 0.36], [-0.34, -0.06, 0.27], [0.34, -0.04, 0.28], [-0.17, 0.27, 0.25], [0.2, 0.3, 0.22], [-0.04, -0.2, 0.3]];
  puffs.forEach(([dx, dy, r], i) => b.add(puck(r + 0.07, 0.07, 36), WHITE, { position: [x + dx, y + dy, z + i * 0.0015], rotation: [PI / 2, 0, 0], shade: 0.02 }));
  // glass: flat coplanar discs (no rims), so the overlapping puffs read as one seamless pane
  puffs.forEach(([dx, dy, r]) => b.add(circle(r, 40), lighten(BRAND.periwinkle, 0.78), { position: [x + dx, y + dy, z + 0.075], shade: 0, night: GLASS_NIGHT }));
  shine(b, x - 0.2, y + 0.18, z + 0.1, 0.9);
  // puffy rim bumps on the outer edge
  for (const [dx, dy, r] of puffs) {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * PI * 2, px = dx + Math.cos(a) * (r + 0.07), py = dy + Math.sin(a) * (r + 0.07);
      const inside = puffs.some(([ex, ey, er]) => (ex !== dx || ey !== dy) && Math.hypot(px - ex, py - ey) < er + 0.03);
      if (!inside) b.add(sphere(0.045, 12, 8), TINT.periSoft, { position: [x + px, y + py, z + 0.05], scale: [1, 1, 0.6], shade: 0 });
    }
  }
  // little sun and a raindrop hanging below
  b.add(puffyStar(0.07, 0.4, { points: 8, inner: 0.75, detail: 2 }), TINT.lemon, { position: [x + 0.38, y + 0.36, z + 0.1] });
  b.add(capsule(0.006, 0.14, 2, 4), TINT.periSoft, { position: [x + 0.12, y - 0.47, z + 0.04] });
  b.add(sphere(0.045, 12, 10), TINT.peri, { position: [x + 0.12, y - 0.57, z + 0.05], scale: [1, 1.25, 0.7] });
  b.add(capsule(0.006, 0.08, 2, 4), TINT.periSoft, { position: [x - 0.24, y - 0.45, z + 0.04] });
  b.add(sphere(0.035, 12, 10), TINT.lav, { position: [x - 0.24, y - 0.52, z + 0.05], scale: [1, 1.25, 0.7] });
  b.addWallShadow(x, y, z, 1.3, 1.1, 0.5);
});

registerFurniture('mirror-holly', ({ b, W }) => {
  const x = M.x, y = M.y - 0.02, z = W, r = 0.48;
  b.add(puck(r + 0.05, 0.08, 44), XMAS.cream, { position: [x, y, z], rotation: [PI / 2, 0, 0], shade: 0.02 });
  b.add(torus(r + 0.02, 0.035, 8, 48), XMAS.gold, { position: [x, y, z + 0.08], shade: 0 });
  glass(b, x, y, z + 0.06, r - 0.05, r - 0.05);
  shine(b, x - 0.18, y + 0.12, z + 0.09);
  // holly sprays on the top-left and bottom-right of the frame
  const spray = (a0, n) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * 0.24, rr = r + 0.03 + (i % 2) * 0.04;
      const leaf = hollyLeaf(0.2, 0.09); leaf.translate(-0.1, 0, 0);
      b.add(leaf, [XMAS.sage, XMAS.sageDeep, XMAS.pine][i % 3], {
        position: [x + Math.cos(a) * rr, y + Math.sin(a) * rr, z + 0.12 + (i % 2) * 0.02],
        rotation: [(i % 2 ? 0.25 : -0.25), 0, a + PI / 2 + (i % 2 ? 0.45 : -0.45)],
      });
    }
    for (let j = 0; j < 3; j++) {
      const ja = a0 + (j - 1) * 0.12;
      b.add(sphere(0.034, 12, 8), j === 1 ? XMAS.berryDeep : XMAS.berry, { position: [x + Math.cos(ja) * (r + 0.02) + (j === 1 ? 0.02 : 0), y + Math.sin(ja) * (r + 0.02), z + 0.17] });
    }
  };
  spray(PI * 0.72, 7);
  spray(-PI * 0.28, 5);
  // gold bow on top, a hanging soft-gold bell
  b.add(bow(0.26), XMAS.gold, { position: [x, y + r + 0.04, z + 0.13], shade: 0.04 });
  b.add(capsule(0.006, 0.12, 2, 4), XMAS.goldDeep, { position: [x + 0.36, y - 0.4, z + 0.1] });
  b.add(lathe([[0, 0], [0.045, 0], [0.047, 0.012], [0.034, 0.055], [0.017, 0.08], [0, 0.082]], 16), XMAS.gold, { position: [x + 0.36, y - 0.56, z + 0.12] });
  b.add(sphere(0.014, 6, 5), XMAS.goldDeep, { position: [x + 0.36, y - 0.565, z + 0.12] });
  // frosty corner on the glass + two snowflake decals
  b.add(blob(0.12, { seed: 8, detail: 2 }), XMAS.snow, { position: [x + 0.26, y - 0.3, z + 0.075], scale: [1.6, 0.7, 0.12], rotation: [0, 0, 0.6], shade: 0 });
  b.add(snowflake(0.07), XMAS.snow, { position: [x + 0.12, y + 0.22, z + 0.085], shade: 0 });
  b.add(snowflake(0.045), XMAS.snow, { position: [x + 0.26, y + 0.04, z + 0.085], shade: 0 });
  b.addWallShadow(x, y - 0.06, z, 1.2, 1.2, 0.5);
});

/* ------------------------------------------------------------------ wall (towels) */

/** Chrome rail with round end caps and wall posts. */
function rail(b, W, x, y, len, color = PALETTE.steel) {
  b.add(capsule(0.03, len, 3, 10), color, { position: [x, y, W + 0.14], rotation: [0, 0, PI / 2] });
  for (const s of [-1, 1]) {
    b.add(capsule(0.025, 0.12, 2, 8), color, { position: [x + s * len / 2, y, W + 0.07], rotation: [PI / 2, 0, 0] });
    b.add(puck(0.05, 0.02, 14), color, { position: [x + s * len / 2, y, W + 0.01], rotation: [PI / 2, 0, 0] });
  }
}

/** Towel draped over a rail: folded front panel, rolled top, stitched hem. */
function towel(b, x, yTop, z, w, h, color, o = {}) {
  const paint = o.paint ?? color;
  b.add(roundedBox(w, h, 0.07, 0.05), paint, { position: [x, yTop - h / 2, z], shade: 0.03 });
  b.add(capsule(0.06, w - 0.1, 3, 10), color, { position: [x, yTop, z - 0.01], rotation: [0, 0, PI / 2] });
  if (o.band) b.add(roundedBox(w + 0.005, 0.1, 0.08, 0.04), o.band, { position: [x, yTop - h + 0.16, z + 0.005] });
  if (o.hem) b.addStitches([x - w / 2 + 0.05, yTop - h + 0.05, z + 0.04], [x + w / 2 - 0.05, yTop - h + 0.05, z + 0.04], 9, o.hem, { r: 0.008 });
}

registerFurniture('towel-rail', ({ b, W }) => {
  const x = T.x, y = T.y + 0.32;
  rail(b, W, x, y, 0.72);
  towel(b, x - 0.04, y, W + 0.18, 0.54, 0.8, '#F4E1E9', { band: lighten(BRAND.pink, 0.55), hem: TINT.pink });
  // a little embroidered blob on the towel
  b.add(blob(0.07, { seed: 5 }), brandGradientX(x - 0.12, x + 0.04, 0.3), { position: [x - 0.04, y - 0.3, W + 0.225], scale: [1.15, 1, 0.2], shade: 0 });
  for (const s of [-1, 1]) b.add(sphere(0.009, 6, 5), PALETTE.ink, { position: [x - 0.04 + s * 0.025, y - 0.29, W + 0.24] });
  // hand towel on a hook to the right, with a hanging loop
  const hx = x + 0.44, hy = y - 0.05;
  b.add(sphere(0.035, 10, 8), PALETTE.steel, { position: [hx, hy, W + 0.06] });
  b.add(torus(0.035, 0.01, 5, 12), TINT.teal, { position: [hx, hy - 0.04, W + 0.1] });
  b.add(roundedBox(0.24, 0.42, 0.06, 0.05), TINT.tealSoft, { position: [hx, hy - 0.28, W + 0.11], rotation: [0, 0, 0.04] });
  b.addStitches([hx - 0.09, hy - 0.45, W + 0.145], [hx + 0.09, hy - 0.45, W + 0.145], 5, TINT.teal, { r: 0.007 });
  b.addWallShadow(x + 0.1, y - 0.35, W, 1.1, 1.0, 0.45);
});

registerFurniture('towel-stripes', ({ b, W }) => {
  const x = T.x + 0.02, y = T.y + 0.36;
  // white rail with two striped towels side by side (stripes = soft raised bands)
  rail(b, W, x, y, 0.9, WHITE);
  const striped = (tx, w, h, base, bands, z) => {
    towel(b, tx, y, z, w, h, base, { hem: bands[0] });
    const n = Math.floor((h - 0.12) / 0.12);
    for (let i = 0; i < n; i++) {
      b.add(roundedBox(w + 0.004, 0.045, 0.075, 0.02), bands[i % bands.length], { position: [tx, y - 0.14 - i * 0.12, z + 0.003], shade: 0 });
    }
  };
  striped(x - 0.2, 0.4, 0.74, lighten(BRAND.lavender, 0.6), [lighten(BRAND.lavender, 0.25), WHITE, TINT.pink], W + 0.18);
  striped(x + 0.22, 0.36, 0.56, TINT.tealSoft, [TINT.teal, WHITE], W + 0.22);
  // fringe tassels on the lavender towel
  for (let i = 0; i < 6; i++) b.add(capsule(0.012, 0.045, 2, 5), lighten(BRAND.lavender, 0.25), { position: [x - 0.35 + i * 0.06, y - 0.79, W + 0.18] });
  // loofah blob on a pink cord at the rail end
  const lx = x + 0.47;
  b.add(tubeAlong([[lx, y, W + 0.16], [lx + 0.02, y - 0.1, W + 0.2], [lx, y - 0.2, W + 0.2]], 0.008, 10, 4), TINT.pink, { shade: 0 });
  b.add(blob(0.09, { seed: 17, detail: 2, wobble: 0.18 }), TINT.pinkSoft, { position: [lx, y - 0.28, W + 0.22], scale: [1, 0.9, 0.8] });
  b.addWallShadow(x, y - 0.38, W, 1.2, 1.0, 0.45);
});

registerFurniture('stocking-xmas', ({ b, W }) => {
  const x = T.x, y = T.y + 0.42;
  // soft gold rail with a little pine garland and bead lights
  rail(b, W, x, y, 0.86, XMAS.goldDeep);
  const N = 12;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), px = x - 0.42 + t * 0.84, py = y + 0.03 + Math.sin(t * PI * 3) * 0.015;
    const leaf = hollyLeaf(0.15, 0.065); leaf.translate(-0.075, 0, 0);
    b.add(leaf, [XMAS.sage, XMAS.pine, XMAS.sageDeep][i % 3], { position: [px, py, W + 0.2], rotation: [(i % 2 ? 0.3 : -0.3), 0, (i % 2 ? 0.5 : -0.5) + (i % 3) * 0.3] });
  }
  for (let i = 0; i < 5; i++) {
    const px = x - 0.36 + i * 0.18;
    b.addLamp(sphere(0.02, 10, 8), i % 2 ? XMAS.cream : XMAS.gold, { position: [px, y + 0.06, W + 0.24], shade: 0 });
    b.addHalo(px, y + 0.06, W + 0.26, 0.14, NIGHT.lamp, 0.55);
  }
  // two stockings: berry with a snowy cuff, cream with a sage cuff
  const stocking = (sx, h, body, cuff, toe, deco) => {
    const top = y - 0.06;
    b.add(capsule(0.006, 0.08, 2, 4), cuff, { position: [sx - 0.06, top + 0.02, W + 0.18], rotation: [0, 0, 0.5] });
    b.add(roundedBox(0.24, h, 0.12, 0.1), body, { position: [sx, top - 0.08 - h / 2, W + 0.2], shade: 0.04 });
    b.add(capsule(0.09, 0.13, 4, 14), body, { position: [sx + 0.07, top - 0.08 - h + 0.02, W + 0.2], rotation: [0, 0, PI / 2], scale: [1, 1, 0.68] });
    b.add(sphere(0.062, 12, 10), toe, { position: [sx + 0.17, top - 0.08 - h + 0.02, W + 0.215], scale: [1, 1, 0.7] });
    b.add(roundedBox(0.3, 0.13, 0.15, 0.065), cuff, { position: [sx, top - 0.04, W + 0.21], shade: 0.02 });
    for (let i = 0; i < 6; i++) b.add(sphere(0.022, 8, 6), lighten(cuff, 0.4), { position: [sx - 0.12 + i * 0.048, top - 0.04 + (i % 2 ? 0.03 : -0.02), W + 0.29], scale: [1, 1, 0.6], shade: 0 });
    deco(sx, top - 0.08 - h * 0.5);
  };
  stocking(x - 0.2, 0.42, XMAS.berry, XMAS.snow, XMAS.cream, (sx, sy) => {
    b.add(snowflake(0.08), XMAS.snow, { position: [sx, sy, W + 0.27], shade: 0 });
  });
  stocking(x + 0.24, 0.34, XMAS.cream, XMAS.sage, XMAS.berryLight, (sx, sy) => {
    b.add(puffyStar(0.07, 0.4, { detail: 2 }), XMAS.gold, { position: [sx, sy - 0.02, W + 0.27] });
  });
  // gold jingle bells on the cuffs
  for (const sx of [x - 0.32, x + 0.12]) {
    b.add(sphere(0.035, 12, 10), XMAS.gold, { position: [sx, y - 0.16, W + 0.3] });
    b.add(capsule(0.006, 0.03, 2, 4), XMAS.goldDeep, { position: [sx, y - 0.175, W + 0.335], rotation: [0, 0, PI / 2] });
  }
  b.addHalo(x, y - 0.2, W + 0.02, 1.3, NIGHT.lamp, 0.2);
  b.addWallShadow(x, y - 0.35, W, 1.1, 0.9, 0.45);
});

/* ------------------------------------------------------------------ rug */

registerFurniture('mat-bath', ({ b }) => {
  const top = ovalMat(b, R.x, R.z, 1.9, 1.6, 0.035, TINT.tealSoft, TINT.teal);
  // soft bubble bumps (bath-mat texture) in a loose grid, bigger toward the front
  for (let i = -7; i <= 7; i++) for (let j = -3; j <= 3; j++) {
    const px = i * 0.22 + (j % 2 ? 0.11 : 0), pz = j * 0.36;
    if ((px * px) / (1.62 * 1.62) + (pz * pz) / (1.35 * 1.35) > 1) continue;
    const big = (i * 7 + j * 3) % 5 === 0;
    b.add(sphere(big ? 0.06 : 0.04, 10, 6), big ? WHITE : lighten(BRAND.teal, 0.72), { position: [R.x + px, top, R.z + pz], scale: [1, 0.4, 1], shade: 0 });
  }
  scallopRing(b, R.x, R.z, 1.78, 1.48, 40, 0.035, top + 0.01, (i) => (i % 2 ? WHITE : TINT.periSoft));
});

/** Rubber-duck silhouette, flat in XY (body + head + tail), about 1 unit wide. */
function duckShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.05);
  s.bezierCurveTo(-0.52, -0.3, 0.3, -0.38, 0.46, -0.12);           // belly
  s.bezierCurveTo(0.56, 0.04, 0.42, 0.14, 0.26, 0.16);             // chest
  s.bezierCurveTo(0.42, 0.24, 0.42, 0.56, 0.18, 0.6);              // head front
  s.bezierCurveTo(-0.04, 0.64, -0.12, 0.42, 0.0, 0.2);             // head back
  s.bezierCurveTo(-0.2, 0.22, -0.36, 0.2, -0.46, 0.3);             // back
  s.quadraticCurveTo(-0.56, 0.22, -0.5, 0.05);                     // tail
  return softShape(s, 0.012, 0.012, 14);
}

registerFurniture('mat-duck', ({ b }) => {
  // water-blue oval with ripple rings, a big duck appliqué lying on it
  const top = ovalMat(b, R.x, R.z, 1.9, 1.6, 0.03, TINT.periSoft, TINT.peri);
  for (const [rx, rz] of [[1.45, 1.18], [1.0, 0.8]]) {
    const pts = [];
    for (let i = 0; i < 64; i++) { const a = (i / 64) * PI * 2; pts.push([Math.cos(a) * rx, 0, Math.sin(a) * rz]); }
    b.add(tubeAlong(pts, 0.016, 128, 5, true), WHITE, { position: [R.x, top + 0.004, R.z], scale: [1, 0.5, 1], shade: 0 });
  }
  const y = top + 0.012, dz = R.z + 0.45;
  // ducks: one big in front (stretched in z so it reads under the camera's angle), one small on each side
  const duck = (cx, cz, s, flip) => {
    const sx = flip ? -s : s;
    b.add(duckShape(), TINT.lemon, { position: [cx, y, cz], rotation: [-PI / 2, 0, 0], scale: [sx, s * 2.1, 1], shade: 0 });
    b.add(blob(0.12, { seed: 3, detail: 2 }), '#F9E9B8', { position: [cx - sx * 0.12, y + 0.008, cz + s * 0.08], scale: [Math.abs(sx) * 1.5, 0.12, s * 1.3], shade: 0 });
    b.add(capsule(0.05 * s, 0.1 * s, 3, 8), TINT.pink, { position: [cx + sx * 0.4, y + 0.01, cz - s * 0.84], rotation: [0, 0, PI / 2], scale: [1, 1.4, 0.3], shade: 0 });
    b.add(sphere(0.035 * s, 8, 6), PALETTE.ink, { position: [cx + sx * 0.22, y + 0.012, cz - s * 0.92], scale: [1, 0.35, 2] });
    b.add(sphere(0.05 * s, 8, 6), TINT.pinkSoft, { position: [cx + sx * 0.25, y + 0.01, cz - s * 0.7], scale: [1, 0.3, 1.7], shade: 0 });
  };
  duck(R.x + 0.05, dz, 0.75, false);
  duck(R.x - 1.25, R.z + 0.1, 0.34, true);
  duck(R.x + 1.3, R.z - 0.1, 0.3, false);
  // a few bubbles
  for (const [px, pz, r] of [[-0.7, 1.05, 0.06], [0.9, 1.0, 0.05], [1.0, 0.65, 0.035], [-0.85, -0.6, 0.05], [0.55, -0.85, 0.04]]) {
    b.add(sphere(r, 10, 8), WHITE, { position: [R.x + px, y + r * 0.3, R.z + pz], scale: [1, 0.5, 1], shade: 0 });
  }
});

registerFurniture('mat-snow-bath', ({ b }) => {
  // fluffy snow rug: cream-white base covered in soft tufts, ice-blue snowflakes, pompom edge
  const top = ovalMat(b, R.x, R.z, 1.85, 1.58, 0.04, XMAS.cream, XMAS.ice);
  // soft tufts: close whites so it reads as one fluffy pile, with its own gentle evening tones
  const tuftCols = [WHITE, '#F8F5FC', XMAS.cream], tuftNight = ['#C9CCEB', '#BEC2E6', '#CFC8E6'];
  let k = 0;
  for (let i = -7; i <= 7; i++) for (let j = -4; j <= 4; j++) {
    const px = i * 0.22 + (j % 2 ? 0.11 : 0), pz = j * 0.32;
    if ((px * px) / (1.55 * 1.55) + (pz * pz) / (1.3 * 1.3) > 1) continue;
    k++;
    b.add(blob(0.15, { seed: k, detail: 2, wobble: 0.16 }), tuftCols[k % 3], { position: [R.x + px, top + 0.005, R.z + pz], scale: [1, 0.42, 1.25], shade: 0.03, night: tuftNight[k % 3] });
  }
  for (const [px, pz, s] of [[-0.95, 0.75, 0.19], [0.95, 0.75, 0.19], [0, 1.1, 0.15], [-1.35, -0.15, 0.14], [1.35, -0.15, 0.14]]) {
    b.add(snowflake(s), lighten(XMAS.frost, 0.3), flatOnFloor(R.x + px, top + 0.05, R.z + pz, px * 0.5, [1, 1.4, 0.6]));
  }
  for (const [px, pz] of [[-0.48, 1.2], [0.48, 1.2], [-1.2, 0.7], [1.2, 0.7]]) {
    b.add(puffyStar(0.06, 0.35, { detail: 2 }), XMAS.gold, flatOnFloor(R.x + px, top + 0.05, R.z + pz, 0, [1, 1.3, 0.6]));
  }
  scallopRing(b, R.x, R.z, 1.8, 1.53, 34, 0.07, 0.05, (i) => (i % 3 === 0 ? XMAS.berryLight : WHITE), { flat: 0.8 });
});
