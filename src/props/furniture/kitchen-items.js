/**
 * kitchen-items.js — furniture items of ห้องครัว (owner: prop-utility, S4-03).
 * Contract: docs/architecture/module-contracts.md → "Sprint 4 additions" (ids fixed).
 *
 * Slots and footprints (room space: floor y = 0, wall z = -3, pet at the origin):
 *   fridge  KITCHEN_ANCHORS.fridge — floor footprint x -1.3..-0.3, z -2.95..-2.05, top ≤ 2.75
 *           (between the stove and the counter; the upper part shows above the pet's
 *           left shoulder on a 390×844 phone)
 *   wall    KITCHEN_ANCHORS.wall — wall area x 0.2..1.4, y 1.95..3.0 (above the pet's right
 *           shoulder, under the top HUD band on phones)
 *   rug     KITCHEN_ANCHORS.rug — floor oval ≈ 3.8 × 3.2 centred a little in front of the pet
 *           (z 1.0, so more of it shows below the pet on phones), flat (≤ 0.08 high); the pet
 *           always stands on its back half
 *
 * All parts are static clay (baked by wire). Items only use `b` — nothing here moves.
 */
import * as THREE from 'three';
import {
  BRAND, PALETTE, NIGHT, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, brandGradientX, puffyStar,
} from '../clay.js';
import { registerFurniture } from '../../rooms/furniture.js';
import {
  XMAS, TINT, softShape, hollyLeaf, heartShape, snowflake, tubeAlong, icingOutline,
  stripesDiag, ovalMat, scallopRing, flatOnFloor, gingerbreadMan, bow,
} from './kitchen-bath-shared.js';

/** Slot anchors of the kitchen (art layout, not gameplay numbers). */
export const KITCHEN_ANCHORS = Object.freeze({
  fridge: Object.freeze({ x: -0.8, z: -2.5 }),
  wall: Object.freeze({ x: 0.78, y: 2.36 }),
  rug: Object.freeze({ x: 0, z: 1.0 }),
});

const F = KITCHEN_ANCHORS.fridge, S = KITCHEN_ANCHORS.wall, R = KITCHEN_ANCHORS.rug;
const PI = Math.PI;
/** Depth stretch of the kitchen rugs (the floor is seen at a low angle). */
const ZS = 1.4;

/* ------------------------------------------------------------------ small props */

/** Glass jar with painted contents (glass above `fill`, contents below), lid and knob. */
function jar(b, x, y, z, { r = 0.12, h = 0.3, fill = 0.6, content = '#F3D9B5', lid = TINT.periSoft, dots } = {}) {
  const glass = new THREE.Color(PALETTE.glass), c0 = new THREE.Color(content), cd = new THREE.Color(dots ?? content);
  b.add(lathe([[0, 0], [r * 0.85, 0], [r, r * 0.25], [r, h * 0.88], [r * 0.8, h], [0, h]], 20), (px, py, pz, c) => {
    if (py < h * fill) {
      const k = Math.sin(px * 61 + py * 47) * Math.cos(pz * 53 - py * 29);
      c.copy(k > 0.55 ? cd : c0);
    } else c.copy(glass);
  }, { position: [x, y, z], shade: 0.04 });
  b.add(puck(r * 0.92, 0.055, 20), lid, { position: [x, y + h - 0.01, z] });
  b.add(sphere(0.032, 10, 8), lighten(lid, 0.4), { position: [x, y + h + 0.06, z] });
}

/** Shelf board with brackets and a scalloped front trim. */
function shelfBoard(b, W, color, trim) {
  b.add(roundedBox(1.12, 0.09, 0.32, 0.04), color, { position: [S.x, S.y, W + 0.16] });
  for (const s of [-1, 1]) {
    b.add(roundedBox(0.05, 0.2, 0.2, 0.025), color, { position: [S.x + s * 0.42, S.y - 0.13, W + 0.1] });
    b.add(sphere(0.03, 8, 6), trim, { position: [S.x + s * 0.42, S.y - 0.2, W + 0.2] });
  }
  for (let i = 0; i < 11; i++) b.add(sphere(0.04, 10, 6), trim, { position: [S.x - 0.5 + i * 0.1, S.y - 0.045, W + 0.31], scale: [1, 0.6, 0.5], shade: 0 });
}

/** Soft light bar under the shelf (glows in the evening). */
function underShelfLight(b, W) {
  b.addLamp(capsule(0.03, 0.66, 3, 10), lighten(BRAND.pink, 0.7), { position: [S.x, S.y - 0.08, W + 0.1], rotation: [0, 0, PI / 2], shade: 0 });
  b.addHalo(S.x, S.y - 0.35, W + 0.02, 1.9, NIGHT.lamp, 0.3);
  b.addHalo(S.x, S.y - 0.1, W + 0.3, 0.7, NIGHT.lamp, 0.16);
}

/** Peppermint candy painter (local puck space: swirl in x/z). */
function peppermint(a, c2) {
  const ca = new THREE.Color(a), cb = new THREE.Color(c2);
  return (x, y, z, c) => { const r = Math.hypot(x, z); c.copy(r < 0.012 || Math.floor((Math.atan2(z, x) + r * 30) / (PI / 4)) % 2 ? ca : cb); };
}

/* ------------------------------------------------------------------ fridge */

registerFurniture('fridge-classic', ({ b }) => {
  const fx = F.x, fz = F.z, fw = 0.92, fh = 2.5, fd = 0.8, front = fz + fd / 2;
  b.add(roundedBox(fw, fh, fd, 0.24), '#FFFFFF', { position: [fx, fh / 2 + 0.04, fz], shade: 0.05 });
  b.add(roundedBox(fw - 0.12, 0.74, 0.06, 0.12), '#FBF5F8', { position: [fx, 2.04, front] });
  b.add(roundedBox(fw - 0.12, 1.52, 0.06, 0.12), '#FBF5F8', { position: [fx, 0.88, front] });
  b.add(capsule(0.035, 0.26, 3, 8), PALETTE.glass, { position: [fx + 0.32, 1.98, front + 0.06] });
  b.add(capsule(0.035, 0.42, 3, 8), PALETTE.glass, { position: [fx + 0.32, 1.3, front + 0.06] });
  for (const y of [1.84, 2.12, 1.09, 1.51]) b.add(sphere(0.03, 8, 6), PALETTE.steel, { position: [fx + 0.32, y, front + 0.04] });
  for (const s of [-1, 1]) b.add(puck(0.06, 0.05, 12), '#EDE3EA', { position: [fx + s * 0.32, 0, front - 0.08] });
  // magnets + a little note with a heart, a doodle of the blob on the lower door
  b.add(blob(0.09, { seed: 6, detail: 2 }), brandGradientX(-0.1, 0.1, 0.2), { position: [fx - 0.22, 2.24, front + 0.05], scale: [1.1, 1, 0.35], shade: 0 });
  b.add(roundedBox(0.22, 0.26, 0.012, 0.03), '#FFFBF2', { position: [fx - 0.02, 1.96, front + 0.04], rotation: [0, 0, -0.07] });
  for (let i = 0; i < 3; i++) b.add(capsule(0.008, 0.12 - i * 0.025, 2, 5), TINT.lav, { position: [fx - 0.03 + i * 0.0, 1.95 - i * 0.05, front + 0.05], rotation: [0, 0, PI / 2 - 0.07] });
  b.add(heartShape(0.085), TINT.apple, { position: [fx - 0.01, 2.08, front + 0.06], rotation: [0, 0, -0.1] });
  b.add(sphere(0.045, 12, 8), lighten(BRAND.teal, 0.25), { position: [fx + 0.14, 2.26, front + 0.04], scale: [1, 1, 0.45] });
  b.add(roundedBox(0.26, 0.2, 0.012, 0.03), '#FFFFFF', { position: [fx - 0.1, 1.28, front + 0.04], rotation: [0, 0, 0.05] });
  b.add(blob(0.06, { seed: 3 }), brandGradientX(-0.06, 0.06, 0.3), { position: [fx - 0.1, 1.28, front + 0.05], scale: [1.2, 0.9, 0.2], shade: 0 });
  b.add(puffyStar(0.05, 0.4, { detail: 2 }), XMAS.gold, { position: [fx - 0.2, 1.38, front + 0.05] });
  // on top: cookie jar and a little tin
  jar(b, fx + 0.17, fh + 0.04, fz + 0.05, { r: 0.12, h: 0.24, fill: 0.55, content: '#EDCDA8', dots: '#D9B08C', lid: TINT.pinkSoft });
  b.add(puck(0.1, 0.12, 18), TINT.periSoft, { position: [fx - 0.2, fh + 0.04, fz + 0.05] });
  b.add(torus(0.1, 0.012, 5, 18), '#FFFFFF', { position: [fx - 0.2, fh + 0.1, fz + 0.05], rotation: [PI / 2, 0, 0] });
  b.addShadow(fx, fz + 0.1, 1.5, 1.1);
});

registerFurniture('fridge-retro', ({ b }) => {
  const fx = F.x, fz = F.z, fw = 0.94, fh = 2.28, fd = 0.8, legH = 0.14, front = fz + fd / 2;
  const body = lighten(BRAND.teal, 0.52), trim = '#FFFFFF';
  b.add(roundedBox(fw, fh, fd, 0.3, 4), body, { position: [fx, legH + fh / 2, fz], shade: 0.06 });
  b.add(roundedBox(fw + 0.02, 0.12, fd + 0.02, 0.06), trim, { position: [fx, legH + 0.12, fz] });
  b.add(capsule(0.02, fw - 0.4, 3, 8), PALETTE.steel, { position: [fx, 1.72, front + 0.005], rotation: [0, 0, PI / 2] });
  // chrome lever handles
  b.add(capsule(0.04, 0.5, 3, 10), PALETTE.steel, { position: [fx + 0.3, 1.25, front + 0.09] });
  for (const y of [1.0, 1.5]) b.add(capsule(0.025, 0.06, 2, 8), PALETTE.steel, { position: [fx + 0.3, y, front + 0.04], rotation: [PI / 2, 0, 0] });
  b.add(capsule(0.035, 0.18, 3, 10), PALETTE.steel, { position: [fx + 0.22, 1.86, front + 0.08], rotation: [0, 0, PI / 2] });
  for (const x of [0.15, 0.29]) b.add(capsule(0.02, 0.05, 2, 8), PALETTE.steel, { position: [fx + x, 1.86, front + 0.04], rotation: [PI / 2, 0, 0] });
  // round badge with the brand blob + a white brow trim on top
  b.add(puck(0.13, 0.04, 28), trim, { position: [fx - 0.14, 2.12, front + 0.0], rotation: [PI / 2, 0, 0] });
  b.add(blob(0.075, { seed: 12 }), brandGradientX(-0.08, 0.08, 0.2), { position: [fx - 0.14, 2.12, front + 0.04], scale: [1.1, 1, 0.3], shade: 0 });
  b.add(capsule(0.035, fw - 0.5, 3, 8), trim, { position: [fx, legH + fh - 0.12, front - 0.05], rotation: [0, 0, PI / 2] });
  // magnets: a pink heart and a lemon
  b.add(heartShape(0.09), TINT.apple, { position: [fx - 0.2, 1.4, front + 0.02], rotation: [0, 0, 0.15] });
  b.add(sphere(0.045, 12, 8), TINT.lemon, { position: [fx - 0.05, 1.5, front + 0.02], scale: [1.3, 1, 0.45] });
  // tapered legs
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.add(lathe([[0, 0], [0.035, 0], [0.05, legH], [0, legH]], 12), PALETTE.steel, { position: [fx + sx * 0.32, 0, fz + sz * 0.27] });
  }
  // on top: little vase with a flower
  const vx = fx + 0.16, vy = legH + fh, vz = fz + 0.05;
  b.add(lathe([[0, 0], [0.07, 0], [0.1, 0.06], [0.08, 0.15], [0.045, 0.19], [0.055, 0.22], [0, 0.21]], 18), TINT.lav, { position: [vx, vy, vz] });
  b.add(capsule(0.012, 0.2, 2, 6), TINT.leaf, { position: [vx, vy + 0.3, vz] });
  b.add(blob(0.04, { seed: 7, detail: 1 }), TINT.leaf, { position: [vx + 0.04, vy + 0.3, vz], scale: [1.4, 0.6, 0.5], rotation: [0, 0, 0.5] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    b.add(sphere(0.04, 10, 8), TINT.pink, { position: [vx + Math.cos(a) * 0.045, vy + 0.43 + Math.sin(a) * 0.045, vz + 0.01], scale: [1, 1, 0.6] });
  }
  b.add(sphere(0.03, 10, 8), TINT.lemon, { position: [vx, vy + 0.43, vz + 0.03] });
  b.add(roundedBox(0.2, 0.08, 0.2, 0.04), TINT.pinkSoft, { position: [fx - 0.2, vy + 0.04, vz] });
  b.add(roundedBox(0.18, 0.06, 0.18, 0.03), TINT.periSoft, { position: [fx - 0.2, vy + 0.11, vz], rotation: [0, 0.3, 0] });
  b.addShadow(fx, fz + 0.1, 1.5, 1.1);
});

registerFurniture('fridge-gingerbread', ({ b }) => {
  const fx = F.x, fz = F.z, fw = 0.92, fh = 2.24, fd = 0.8, front = fz + fd / 2, top = fh + 0.04;
  const G = XMAS.tan, GD = XMAS.tanDeep, ICE = XMAS.snow;
  const GN = '#8C6E8E';   // evening body: muted mauve cocoa (the automatic evening shift turns tan maroon)
  b.add(roundedBox(fw, fh, fd, 0.2), G, { position: [fx, fh / 2 + 0.04, fz], shade: 0.07, night: GN });
  // doors: lighter baked panels with piped icing outlines
  const up = { y: 1.92, h: 0.58 }, lo = { y: 0.92, h: 1.32 };
  for (const d of [up, lo]) {
    b.add(roundedBox(fw - 0.14, d.h, 0.05, 0.1), lighten(G, 0.18), { position: [fx, d.y, front], night: lighten(GN, 0.12) });
    b.add(icingOutline(fw - 0.22, d.h - 0.08, 0.08, 0.012, Math.round((fw + d.h) * 9), 0.016), ICE, { position: [fx, d.y, front + 0.035], shade: 0 });
  }
  // gingerbread person on the upper door, gumdrops beside it
  const gx = fx - 0.16, gy = 1.93, gz = front + 0.05;
  b.add(gingerbreadMan(0.36), GD, { position: [gx, gy, gz], shade: 0.04 });
  for (const s of [-1, 1]) b.add(sphere(0.014, 8, 6), PALETTE.ink, { position: [gx + s * 0.022, gy + 0.12, gz + 0.025] });
  b.add(torus(0.022, 0.006, 4, 10, PI), ICE, { position: [gx, gy + 0.095, gz + 0.022], rotation: [0, 0, PI] });
  for (const y of [0.03, -0.02]) b.add(sphere(0.013, 8, 6), XMAS.berry, { position: [gx, gy + y, gz + 0.03] });
  for (const s of [-1, 1]) {
    b.add(capsule(0.006, 0.04, 2, 4), ICE, { position: [gx + s * 0.105, gy + 0.045, gz + 0.025], rotation: [0, 0, s * 0.4] });
    b.add(capsule(0.006, 0.04, 2, 4), ICE, { position: [gx + s * 0.06, gy - 0.15, gz + 0.025], rotation: [0, 0, PI / 2] });
  }
  [[XMAS.berry, 0.07, 2.08], [XMAS.sage, 0.2, 2.02], [XMAS.gold, 0.12, 1.8]].forEach(([c, dx, y]) => {
    b.add(lathe([[0, 0], [0.05, 0], [0.052, 0.02], [0.04, 0.05], [0, 0.06]], 14), c, { position: [fx + dx, y, front + 0.03], rotation: [PI / 2, 0, 0] });
  });
  // lower door: icing heart and peppermints
  b.add(heartShape(0.3), ICE, { position: [fx - 0.05, 1.12, front + 0.04], scale: [1, 1, 0.5] });
  b.add(heartShape(0.23), lighten(G, 0.3), { position: [fx - 0.05, 1.125, front + 0.05], scale: [1, 1, 0.4] });
  for (const [dx, y] of [[-0.18, 0.58], [0.1, 0.48], [-0.05, 0.72]]) {
    b.add(puck(0.055, 0.03, 20), peppermint(ICE, XMAS.berry), { position: [fx + dx, y, front + 0.03], rotation: [PI / 2, 0, 0], shade: 0 });
  }
  // candy-cane handles
  const stripe = stripesDiag(ICE, XMAS.berry, 0.045);
  b.add(tubeAlong([[0, -0.22, 0], [0, 0.12, 0], [0, 0.2, 0], [-0.05, 0.25, 0], [-0.1, 0.21, 0]], 0.028, 48, 8), stripe, { position: [fx + 0.32, 1.32, front + 0.07] });
  b.add(tubeAlong([[0, -0.1, 0], [0, 0.06, 0], [-0.04, 0.11, 0], [-0.08, 0.07, 0]], 0.024, 32, 8), stripe, { position: [fx + 0.32, 1.9, front + 0.07] });
  for (const y of [1.12, 1.82]) b.add(sphere(0.03, 8, 6), ICE, { position: [fx + 0.32, y, front + 0.04] });
  // gable roof with icing snow and drips, round window in the gable
  const rise = 0.3, half = fw / 2 + 0.06, len = Math.hypot(half, rise), ang = Math.atan2(rise, half);
  const tri = new THREE.Shape(); tri.moveTo(-fw / 2 + 0.06, 0); tri.lineTo(fw / 2 - 0.06, 0); tri.lineTo(0, rise - 0.04); tri.closePath();
  b.add(softShape(tri, fd - 0.16, 0.03, 2), lighten(G, 0.1), { position: [fx, top - 0.02, fz], night: lighten(GN, 0.06) });
  b.add(puck(0.07, 0.03, 20), XMAS.cream, { position: [fx, top + 0.11, fz + fd / 2 - 0.05], rotation: [PI / 2, 0, 0] });
  b.add(torus(0.07, 0.012, 5, 20), ICE, { position: [fx, top + 0.11, fz + fd / 2 - 0.02] });
  for (const s of [-1, 1]) {
    const cx = fx + s * half / 2, cy = top + rise / 2;
    b.add(roundedBox(len + 0.06, 0.08, fd + 0.12, 0.04), GD, { position: [cx, cy, fz], rotation: [0, 0, -s * ang] });
    const nx = s * Math.sin(ang), ny = Math.cos(ang);
    b.add(roundedBox(len + 0.02, 0.05, fd + 0.14, 0.025), ICE, { position: [cx + nx * 0.05, cy + ny * 0.05, fz], rotation: [0, 0, -s * ang], shade: 0.02 });
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5, ex = fx + s * half * (1 - t), ey = top + rise * t + 0.02;
      b.add(capsule(0.022, 0.03 + (i % 2) * 0.03, 3, 8), ICE, { position: [ex, ey - 0.04 - (i % 2) * 0.015, fz + fd / 2 + 0.06] });
    }
  }
  b.add(sphere(0.05, 12, 8), XMAS.berry, { position: [fx, top + rise + 0.07, fz + fd / 2 - 0.02] });
  b.add(capsule(0.01, 0.03, 2, 5), XMAS.sageDeep, { position: [fx + 0.02, top + rise + 0.13, fz + fd / 2 - 0.02], rotation: [0, 0, -0.4] });
  // icing dots along the base
  for (let i = 0; i < 9; i++) b.add(sphere(0.025, 8, 6), ICE, { position: [fx - 0.38 + i * 0.095, 0.1, front + 0.01], scale: [1, 1, 0.6] });
  b.addShadow(fx, fz + 0.1, 1.5, 1.1);
});

/* ------------------------------------------------------------------ wall */

registerFurniture('shelf-jars', ({ b, W }) => {
  const z = W + 0.16, y = S.y + 0.045;
  shelfBoard(b, W, '#EDD3E1', TINT.pinkSoft);
  jar(b, S.x - 0.36, y, z, { r: 0.12, h: 0.34, fill: 0.62, content: '#F0D6B4', dots: '#DDB592', lid: TINT.periSoft });
  b.add(roundedBox(0.15, 0.09, 0.012, 0.03), '#FFFFFF', { position: [S.x - 0.36, y + 0.13, z + 0.125] });
  b.add(heartShape(0.05), TINT.apple, { position: [S.x - 0.36, y + 0.13, z + 0.135] });
  jar(b, S.x - 0.07, y, z, { r: 0.1, h: 0.25, fill: 0.7, content: lighten(BRAND.pink, 0.5), dots: lighten(BRAND.periwinkle, 0.35), lid: TINT.lav });
  for (const [dx, c, h] of [[0.15, TINT.apple, 0.14], [0.27, TINT.teal, 0.12]]) {
    b.add(lathe([[0, 0], [0.045, 0], [0.05, 0.02], [0.05, h], [0, h]], 14), '#FFFFFF', { position: [S.x + dx, y, z + 0.04] });
    b.add(puck(0.052, 0.04, 14), c, { position: [S.x + dx, y + h - 0.005, z + 0.04] });
  }
  for (let i = 0; i < 2; i++) b.add(lathe([[0, 0], [0.07, 0], [0.12, 0.05], [0.13, 0.07], [0.12, 0.075], [0, 0.03]], 18), i ? TINT.tealSoft : '#F1DCEA', { position: [S.x + 0.44, y + i * 0.045, z - 0.03] });
  // two mugs on hooks under the shelf (in front of the light bar)
  [[S.x + 0.06, TINT.teal], [S.x + 0.3, TINT.pink]].forEach(([mx, c]) => {
    b.add(capsule(0.01, 0.04, 2, 5), PALETTE.steel, { position: [mx, S.y - 0.08, W + 0.26] });
    b.add(lathe([[0, 0], [0.06, 0], [0.065, 0.02], [0.065, 0.12], [0.055, 0.125], [0, 0.11]], 16), c, { position: [mx, S.y - 0.27, W + 0.26] });
    b.add(torus(0.04, 0.012, 6, 12), c, { position: [mx + 0.07, S.y - 0.2, W + 0.26] });
  });
  underShelfLight(b, W);
});

registerFurniture('shelf-plants', ({ b, W }) => {
  const z = W + 0.16, y = S.y + 0.045;
  shelfBoard(b, W, '#FFFFFF', TINT.tealSoft);
  // trailing pothos (left), spilling over the shelf edge
  const px = S.x - 0.36;
  b.add(lathe([[0, 0], [0.09, 0], [0.11, 0.02], [0.12, 0.15], [0.135, 0.16], [0.13, 0.19], [0, 0.18]], 18), TINT.pink, { position: [px, y, z] });
  const vine = [[px + 0.02, y + 0.17, z + 0.05], [px - 0.06, y + 0.1, z + 0.16], [px - 0.12, y - 0.05, z + 0.2], [px - 0.13, y - 0.25, z + 0.2], [px - 0.08, y - 0.42, z + 0.19]];
  b.add(tubeAlong(vine, 0.011, 40, 5), lighten(BRAND.teal, 0.2));
  const vine2 = [[px + 0.06, y + 0.17, z + 0.04], [px + 0.12, y + 0.08, z + 0.17], [px + 0.15, y - 0.08, z + 0.2], [px + 0.13, y - 0.24, z + 0.2]];
  b.add(tubeAlong(vine2, 0.01, 30, 5), lighten(BRAND.teal, 0.2));
  const curve = new THREE.CatmullRomCurve3([...vine, ...[]].map((p) => new THREE.Vector3(...p)));
  const curve2 = new THREE.CatmullRomCurve3(vine2.map((p) => new THREE.Vector3(...p)));
  const leaf = (p, i, s = 1) => b.add(heartShape(0.075 * s), i % 2 ? TINT.leaf : lighten(BRAND.teal, 0.45), { position: [p.x, p.y, p.z + 0.015], rotation: [0.2, 0, PI + (i % 2 ? 0.5 : -0.5)] });
  for (let i = 0; i < 7; i++) leaf(curve.getPoint(0.12 + i * 0.14), i);
  for (let i = 0; i < 4; i++) leaf(curve2.getPoint(0.2 + i * 0.25), i + 1, 0.9);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    b.add(heartShape(0.08), i % 2 ? TINT.leaf : lighten(BRAND.teal, 0.45), { position: [px + Math.cos(a) * 0.06, y + 0.22 + (i % 2) * 0.03, z + Math.sin(a) * 0.05 + 0.02], rotation: [-0.6, 0, a] });
  }
  // succulent rosette (middle)
  const sx = S.x - 0.03;
  b.add(lathe([[0, 0], [0.08, 0], [0.1, 0.03], [0.1, 0.1], [0, 0.1]], 18), '#FFFFFF', { position: [sx, y, z] });
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < (ring ? 5 : 8); i++) {
    const a = (i / (ring ? 5 : 8)) * PI * 2 + ring * 0.4, rr = ring ? 0.03 : 0.07;
    b.add(blob(0.045, { seed: i + ring * 9, detail: 1, wobble: 0.05 }), ring ? lighten(BRAND.teal, 0.5) : TINT.teal,
      { position: [sx + Math.cos(a) * rr, y + 0.13 + ring * 0.03, z + Math.sin(a) * rr], rotation: [Math.sin(a) * (ring ? 0.5 : 1.0), 0, -Math.cos(a) * (ring ? 0.5 : 1.0)], scale: [0.6, 1.3, 0.45] });
  }
  b.add(sphere(0.02, 8, 6), TINT.pink, { position: [sx, y + 0.19, z] });
  // tall herb (right)
  const hx = S.x + 0.25;
  b.add(lathe([[0, 0], [0.07, 0], [0.09, 0.02], [0.1, 0.17], [0, 0.17]], 18), TINT.peri, { position: [hx, y, z] });
  b.add(roundedBox(0.09, 0.05, 0.01, 0.015), '#FFFFFF', { position: [hx, y + 0.09, z + 0.1] });
  for (let i = 0; i < 4; i++) {
    const a = -0.35 + i * 0.23, h = 0.22 + (i % 2) * 0.07;
    b.add(capsule(0.008, h, 2, 5), TINT.leaf, { position: [hx + Math.sin(a) * h * 0.5, y + 0.17 + Math.cos(a) * h * 0.5, z], rotation: [0, 0, -a] });
    for (let k = 1; k <= 3; k++) {
      const t = k / 3.4;
      b.add(blob(0.03, { seed: i * 3 + k, detail: 1 }), k % 2 ? TINT.leaf : lighten(BRAND.teal, 0.4),
        { position: [hx + Math.sin(a) * h * t + (k % 2 ? 0.02 : -0.02), y + 0.17 + Math.cos(a) * h * t, z + 0.01], scale: [1.3, 0.75, 0.5], rotation: [0, 0, k % 2 ? -0.6 : 0.6] });
    }
  }
  // tiny watering can
  const wx = S.x + 0.46;
  b.add(roundedBox(0.13, 0.11, 0.1, 0.045), TINT.pinkSoft, { position: [wx, y + 0.055, z] });
  b.add(capsule(0.014, 0.1, 2, 6), TINT.pinkSoft, { position: [wx - 0.1, y + 0.1, z], rotation: [0, 0, 0.9] });
  b.add(torus(0.045, 0.012, 5, 12, PI), TINT.pinkSoft, { position: [wx + 0.02, y + 0.11, z], rotation: [0, 0, 0] });
  underShelfLight(b, W);
});

registerFurniture('wreath-xmas', ({ b, W }) => {
  const cx = S.x, cy = S.y + 0.14, Rr = 0.33, z = W + 0.08;
  // nail and berry ribbon
  b.add(sphere(0.03, 10, 8), XMAS.goldDeep, { position: [cx, cy + 0.62, W + 0.03] });
  for (const s of [-1, 1]) b.add(tubeAlong([[cx, cy + 0.62, W + 0.03], [cx + s * 0.08, cy + 0.45, W + 0.05], [cx + s * 0.12, cy + Rr - 0.02, z]], 0.018, 16, 6), XMAS.berry, { shade: 0 });
  // leafy ring
  b.add(torus(Rr, 0.075, 8, 40), XMAS.sageDeep, { position: [cx, cy, z] });
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * PI * 2, off = (i % 3 - 1) * 0.06;
    const leaf = hollyLeaf(0.21, 0.095); leaf.translate(-0.105, 0, 0);
    b.add(leaf, [XMAS.sage, XMAS.sageDeep, XMAS.pine][i % 3],
      { position: [cx + Math.cos(a) * (Rr + off), cy + Math.sin(a) * (Rr + off), z + 0.06 + (i % 2) * 0.03], rotation: [(i % 2 ? 0.25 : -0.25), (i % 3 - 1) * 0.3, a + PI / 2 + (i % 2 ? 0.5 : -0.4)] });
  }
  // berry clusters + a little snow on the top leaves
  for (let k = 0; k < 7; k++) {
    const a = PI / 2 + 0.45 + (k / 7) * PI * 2;
    for (let j = 0; j < 3; j++) {
      const ja = j * 2.1;
      b.add(sphere(0.032, 12, 8), j === 1 ? XMAS.berryDeep : XMAS.berry, { position: [cx + Math.cos(a) * Rr + Math.cos(ja) * 0.035, cy + Math.sin(a) * Rr + Math.sin(ja) * 0.035, z + 0.14] });
    }
  }
  for (const a of [1.2, 1.75, 2.3]) b.add(blob(0.05, { seed: a * 10, detail: 2 }), XMAS.snow, { position: [cx + Math.cos(a) * (Rr + 0.04), cy + Math.sin(a) * (Rr + 0.04), z + 0.12], scale: [1.4, 0.6, 0.8] });
  // soft gold bow and bell at the bottom
  b.add(bow(0.3), XMAS.gold, { position: [cx, cy - Rr + 0.02, z + 0.17], shade: 0.04 });
  b.add(lathe([[0, 0], [0.04, 0], [0.042, 0.01], [0.03, 0.05], [0.015, 0.07], [0, 0.072]], 14), XMAS.goldDeep, { position: [cx, cy - Rr - 0.18, z + 0.16] });
  b.add(sphere(0.012, 6, 5), XMAS.goldDeep, { position: [cx, cy - Rr - 0.185, z + 0.16] });
  // warm bead lights (glow in the evening)
  for (let i = 0; i < 9; i++) {
    const a = PI / 2 + (i / 9) * PI * 2 + 0.2, px = cx + Math.cos(a) * (Rr + 0.01), py = cy + Math.sin(a) * (Rr + 0.01);
    b.addLamp(sphere(0.022, 10, 8), i % 2 ? XMAS.cream : XMAS.gold, { position: [px, py, z + 0.16], shade: 0 });
    b.addHalo(px, py, z + 0.18, 0.16, NIGHT.lamp, 0.55);
  }
  b.addHalo(cx, cy, W + 0.02, 1.4, NIGHT.lamp, 0.22);
});

/* ------------------------------------------------------------------ rug */

registerFurniture('mat-kitchen', ({ b }) => {
  const top = ovalMat(b, R.x, R.z, 1.9, 1.6, 0.03, lighten(BRAND.pink, 0.62), lighten(BRAND.pink, 0.45));
  b.add(puck(1, 0.034, 48), lighten(BRAND.pink, 0.74), { position: [R.x, 0, R.z], scale: [1.45, 1, 1.18], shade: 0 });
  scallopRing(b, R.x, R.z, 1.62, 1.36, 44, 0.02, top + 0.004, '#FFFFFF', { flat: 0.5 });
  for (let i = 0; i < 4; i++) {
    const a = PI * 0.25 + (i / 4) * PI * 0.5;
    b.add(heartShape(0.14), TINT.pink, flatOnFloor(R.x + Math.cos(a) * 1.3, top + 0.006, R.z + Math.sin(a) * 1.0, 0, [1, 1.4, 0.25]));
  }
});

registerFurniture('mat-fruit', ({ b }) => {
  const sh = new THREE.Shape(), w = 3.5, h = 2.05 * ZS, r = 0.5;
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  b.add(softShape(sh, 0.012, 0.012, 10), '#FFF4EA', { position: [R.x, 0.015, R.z], rotation: [-PI / 2, 0, 0], shade: 0 });
  b.add(icingOutline(w - 0.1, h - 0.1, r - 0.05, 0, 40, 0.022), TINT.peri, { position: [R.x, 0.03, R.z], rotation: [-PI / 2, 0, 0], shade: 0 });
  const y = 0.03, flat = (x, z, s = 0) => flatOnFloor(R.x + x, y, R.z + z * ZS, s, [1, ZS, 0.35]);
  const disc = (rad, c, x, z, sx = 1) => b.add(puck(rad, 0.014, 22), c, { position: [R.x + x, y - 0.004, R.z + z * ZS], scale: [sx, 1, ZS], shade: 0 });
  const leafAt = (x, z, rot) => b.add(heartShape(0.08), TINT.leaf, flat(x, z, rot));
  // apples
  for (const [x, z] of [[-1.25, 0.6], [1.3, -0.45]]) {
    disc(0.17, TINT.apple, x, z); disc(0.05, lighten(BRAND.pink, 0.55), x - 0.06, z - 0.05);
    leafAt(x + 0.07, z - 0.2, 0.6);
  }
  // lemons
  for (const [x, z] of [[-0.55, 0.8], [-1.35, -0.4]]) { disc(0.14, TINT.lemon, x, z, 1.35); disc(0.04, '#FBEBBF', x + 0.19, z); }
  // grapes
  for (let i = 0; i < 7; i++) disc(0.055, i % 2 ? TINT.lav : lighten(BRAND.lavender, 0.25), 0.3 + ((i % 3) - 1) * 0.1 + (i > 5 ? 0.05 : 0), 0.72 + Math.floor(i / 3) * 0.09);
  leafAt(0.33, 0.6, 2.4);
  // strawberry and cherries
  b.add(heartShape(0.28), TINT.pink, flat(1.0, 0.75, PI));
  for (let i = 0; i < 5; i++) disc(0.012, '#FFFFFF', 1.0 + ((i % 3) - 1) * 0.06, 0.73 + Math.floor(i / 3) * 0.07);
  leafAt(1.0, 0.62, 0);
  for (const s of [-1, 1]) disc(0.07, XMAS.berry, 1.45 + s * 0.08, 0.25);
  b.add(tubeAlong([[1.37, y + 0.005, 0.28 + R.z], [1.45, y + 0.005, 0.07 + R.z], [1.53, y + 0.005, 0.28 + R.z]], 0.01, 12, 4), XMAS.cocoa, { shade: 0 });
  // peach
  disc(0.15, '#F7CDB3', -1.55, 0.1); leafAt(-1.5, -0.08, -0.3);
});

registerFurniture('mat-snow', ({ b }) => {
  const sh = new THREE.Shape(), w = 3.4, h = 2.0 * ZS, r = 0.55;
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  // knit-look rug: ice base, cream bands near front and back with a berry thread
  b.add(softShape(sh, 0.012, 0.012, 10), XMAS.ice, { position: [R.x, 0.015, R.z], rotation: [-PI / 2, 0, 0], shade: 0 });
  for (const sz of [-1, 1]) {
    b.add(roundedBox(w - 0.6, 0.012, 0.3, 0.006, 1), XMAS.cream, { position: [R.x, 0.03, R.z + sz * 0.93], shade: 0 });
    b.add(capsule(0.012, w - 0.7, 2, 5), XMAS.berryLight, { position: [R.x, 0.037, R.z + sz * 0.93], rotation: [0, 0, PI / 2], scale: [1, 1, 0.5], shade: 0 });
  }
  b.add(icingOutline(w - 0.08, h - 0.08, r - 0.04, 0.02, 46, 0.026), XMAS.snow, { position: [R.x, 0.032, R.z], rotation: [-PI / 2, 0, 0], shade: 0 });
  // two snowman appliqués in front of the pet (head points away from the camera so they read upright)
  const snowman = (sx, sz, s, scarf) => {
    const fy = 0.04, Z = (d) => R.z + (sz - d) * ZS;
    b.add(puck(0.2 * s, 0.014, 26), XMAS.snow, { position: [R.x + sx, fy, Z(0)], scale: [1, 1, ZS], shade: 0 });
    b.add(puck(0.14 * s, 0.014, 24), XMAS.snow, { position: [R.x + sx, fy + 0.002, Z(0.3 * s)], scale: [1, 1, ZS], shade: 0 });
    b.add(roundedBox(0.3 * s, 0.01, 0.06 * s * ZS, 0.005, 1), scarf, { position: [R.x + sx, fy + 0.012, Z(0.17 * s)], shade: 0 });
    b.add(roundedBox(0.05 * s, 0.01, 0.12 * s * ZS, 0.005, 1), scarf, { position: [R.x + sx + 0.09 * s, fy + 0.013, Z(0.1 * s)], rotation: [0, 0.3, 0], shade: 0 });
    for (const e of [-1, 1]) b.add(sphere(0.018 * s, 8, 6), PALETTE.ink, { position: [R.x + sx + e * 0.045 * s, fy + 0.012, Z(0.33 * s)], scale: [1, 0.4, ZS] });
    b.add(capsule(0.018 * s, 0.05 * s, 2, 6), XMAS.gold, { position: [R.x + sx + 0.04 * s, fy + 0.014, Z(0.29 * s)], rotation: [0, 0, PI / 2], scale: [1, 0.4, 1], shade: 0 });
    for (const k of [0, 1]) b.add(sphere(0.02 * s, 8, 6), XMAS.berryDeep, { position: [R.x + sx, fy + 0.012, Z(-0.02 * s + k * 0.09 * s)], scale: [1, 0.4, ZS] });
    b.add(roundedBox(0.18 * s, 0.012, 0.05 * s * ZS, 0.005, 1), XMAS.sageDeep, { position: [R.x + sx, fy + 0.014, Z(0.44 * s)], shade: 0 });
    b.add(roundedBox(0.11 * s, 0.012, 0.1 * s * ZS, 0.005, 1), XMAS.sageDeep, { position: [R.x + sx, fy + 0.014, Z(0.5 * s)], shade: 0 });
  };
  snowman(-0.62, 0.42, 1.0, XMAS.berry);
  snowman(0.62, 0.42, 1.0, XMAS.sage);
  // snowflakes on the sides, gold stars along the front band
  for (const [x, zz, sc] of [[-1.15, 0.2, 0.15], [1.15, 0.2, 0.15], [-1.4, -0.3, 0.12], [1.42, -0.3, 0.12], [0, 0.5, 0.1]]) {
    b.add(snowflake(sc), XMAS.snow, flatOnFloor(R.x + x, 0.036, R.z + zz * ZS, x * 0.4, [1, ZS, 0.5]));
  }
  for (const [x, zz] of [[-1.1, 0.66], [-0.37, 0.67], [0.37, 0.67], [1.1, 0.66]]) {
    b.add(puffyStar(0.06, 0.3, { detail: 2 }), XMAS.gold, flatOnFloor(R.x + x, 0.045, R.z + zz * ZS, 0, [1, ZS, 0.6]));
  }
  // pompoms on the corners
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(sphere(0.07, 12, 8), XMAS.snow, { position: [R.x + sx * (w / 2 - 0.2), 0.05, R.z + sz * (h / 2 - 0.2)], scale: [1, 0.7, 1] });
});
