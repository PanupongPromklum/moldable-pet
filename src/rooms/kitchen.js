/**
 * kitchen.js — ห้องครัว (owner: prop-utility, S4-03).
 * Fixed decor: counter with tiled backsplash, fruit bowl, bread board, kettle and
 * spoon crock (right), stove with hanging utensils and a clock, round table with
 * stools and pendant lamp, window with herbs (wide screens).
 * Furniture slots (src/props/furniture/kitchen-items.js): `fridge`, `wall`, `rug`.
 * The food tray itself is HUD (glaze), not 3D; petSpot stays at the origin.
 *
 * Static / live split (Sprint 4 bake): everything is static except the kettle
 * steam (one instanced mesh, desktop only in practice — the kettle is off-screen
 * on phones). Evening look (setTheme('dark')): under-shelf light and pendant lamp
 * glow, the window shows a dusk sky with a moon and soft stars.
 */
import * as THREE from 'three';
import {
  ClayBuilder, PALETTE, NIGHT, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, gradientY,
  getSharedClayMaterial,
} from '../props/clay.js';
import { addShell, makeRoom, WALL_Z } from './shell.js';
import { TINT, XMAS, tileWall, tubeAlong, heartShape } from '../props/furniture/kitchen-bath-shared.js';
import '../props/furniture/kitchen-items.js';   // registers fridge / wall / rug items

const P = PALETTE.kitchen;
const N = NIGHT.kitchen;
const W = WALL_Z + 0.04;
const CAB = '#F7E6EE';
const DOOR = lighten('#F7E6EE', 0.45);
const PI = Math.PI;
/** Kettle position (lid top), where the live steam starts. */
const KETTLE = new THREE.Vector3(2.5, 1.55, -2.55);

/** Build the kitchen. @returns {ReturnType<typeof makeRoom>} */
export function buildKitchen() {
  const b = new ClayBuilder({ shadowColor: P.shadow, shadowOpacity: 0.2, themed: true, nightShadowColor: N.shadow });
  addShell(b, P, N);
  const staticGroup = new THREE.Group(), liveGroup = new THREE.Group();

  // --- counter (right, behind the pet)
  const cx = 1.9, cz = -2.55, cw = 2.7;
  b.add(roundedBox(cw, 0.95, 0.76, 0.16), CAB, { position: [cx, 0.52, cz] });
  b.add(roundedBox(cw + 0.16, 0.14, 0.9, 0.07), '#FFFFFF', { position: [cx, 1.05, cz + 0.02] });
  b.add(capsule(0.03, cw - 0.1, 3, 8), TINT.pinkSoft, { position: [cx, 0.985, cz + 0.47], rotation: [0, 0, PI / 2], shade: 0 });
  for (let i = 0; i < 3; i++) {
    const dx = cx - cw / 2 + 0.45 + i * 0.9;
    b.add(roundedBox(0.8, 0.72, 0.05, 0.12), DOOR, { position: [dx, 0.52, cz + 0.39] });
    b.add(roundedBox(0.66, 0.58, 0.02, 0.09), lighten(CAB, 0.2), { position: [dx, 0.52, cz + 0.415] });
    b.add(sphere(0.045, 10, 8), PALETTE.glass, { position: [dx + (i === 1 ? 0 : (i ? -0.26 : 0.26)), 0.66, cz + 0.45] });
  }
  b.add(roundedBox(cw - 0.1, 0.08, 0.05, 0.03), '#EBD4DF', { position: [cx, 0.06, cz + 0.36] });
  b.addShadow(cx, cz + 0.12, cw + 0.8, 1.1);
  const ky = 1.12;
  // fruit bowl (visible on phones at the right edge)
  fruitBowl(b, cx - 0.52, ky, cz + 0.1);
  // bread board with a loaf
  b.add(roundedBox(0.56, 0.04, 0.34, 0.02), '#F3DCC8', { position: [cx + 0.02, ky + 0.02, cz + 0.1] });
  b.add(torus(0.035, 0.012, 5, 10), '#F3DCC8', { position: [cx + 0.33, ky + 0.025, cz + 0.1], rotation: [PI / 2, 0, 0] });
  b.add(roundedBox(0.36, 0.16, 0.2, 0.08, 3), '#EECDA9', { position: [cx + 0.0, ky + 0.12, cz + 0.1], scale: [1, 1, 1] });
  for (let i = 0; i < 3; i++) b.add(capsule(0.012, 0.12, 2, 5), '#F7E2C6', { position: [cx - 0.09 + i * 0.09, ky + 0.2, cz + 0.11], rotation: [PI / 2, 0, 0.5] });
  // kettle (steam is live)
  const kx = KETTLE.x;
  b.add(lathe([[0, 0], [0.22, 0], [0.26, 0.06], [0.26, 0.2], [0.2, 0.34], [0.1, 0.38], [0, 0.38]], 22), lighten(BRAND.periwinkle, 0.35), { position: [kx, ky, cz] });
  b.add(puck(0.1, 0.03, 16), '#FFFFFF', { position: [kx, ky + 0.37, cz] });
  b.add(sphere(0.05, 10, 8), '#FFFFFF', { position: [kx, ky + 0.42, cz] });
  b.add(capsule(0.045, 0.2, 3, 8), lighten(BRAND.periwinkle, 0.35), { position: [kx - 0.3, ky + 0.2, cz + 0.02], rotation: [0, 0, 0.9] });
  b.add(torus(0.13, 0.03, 6, 16, PI), '#FFFFFF', { position: [kx + 0.03, ky + 0.36, cz], rotation: [0, 0, -0.2] });
  b.add(heartShape(0.11), lighten(BRAND.pink, 0.35), { position: [kx, ky + 0.17, cz + 0.255], scale: [1, 1, 0.5] });
  // spoon crock
  const ux = cx + 1.08;
  b.add(lathe([[0, 0], [0.1, 0], [0.12, 0.03], [0.12, 0.24], [0.13, 0.26], [0, 0.25]], 18), TINT.tealSoft, { position: [ux, ky, cz - 0.05] });
  [[-0.04, 0.2], [0.03, -0.12], [0.0, 0.0]].forEach(([dx, a], i) => {
    b.add(capsule(0.016, 0.34, 2, 6), '#F0D6BB', { position: [ux + dx + Math.sin(-a) * 0.1, ky + 0.42, cz - 0.05], rotation: [0, 0, a] });
    b.add(sphere(0.05, 10, 8), i === 2 ? TINT.pinkSoft : '#F0D6BB', { position: [ux + dx + Math.sin(-a) * 0.27, ky + 0.6, cz - 0.05], scale: [0.8, 1.15, 0.45] });
  });
  // backsplash: rounded tiles with soft grout
  tileWall(b, { x0: cx - 1.38, x1: cx + 1.38, y0: 1.13, y1: 1.84, z: W, size: 0.345, colors: ['#FFFFFF', '#F8E7EE'], grout: '#EED7E2' });

  // --- round table with stools + pendant lamp (right, desktop)
  const tx = 3.15, tz = -1.15;
  b.add(puck(0.72, 0.12, 40), '#FFFFFF', { position: [tx, 0.84, tz] });
  b.add(torus(0.71, 0.03, 6, 40), TINT.pinkSoft, { position: [tx, 0.9, tz], rotation: [PI / 2, 0, 0], shade: 0 });
  b.add(capsule(0.09, 0.66, 3, 10), CAB, { position: [tx, 0.46, tz] });
  b.add(puck(0.36, 0.08, 24), CAB, { position: [tx, 0, tz] });
  b.add(puck(0.26, 0.012, 24), TINT.periSoft, { position: [tx - 0.25, 0.955, tz + 0.15], scale: [1.2, 1, 0.8], shade: 0 });
  b.add(lathe([[0, 0], [0.09, 0], [0.1, 0.02], [0.1, 0.16], [0.085, 0.17], [0, 0.15]], 16), TINT.pink, { position: [tx - 0.25, 0.965, tz + 0.15] });
  b.add(torus(0.045, 0.014, 5, 12), TINT.pink, { position: [tx - 0.14, 1.04, tz + 0.15] });
  // vase with a flower
  b.add(lathe([[0, 0], [0.07, 0], [0.1, 0.07], [0.07, 0.17], [0.04, 0.2], [0.05, 0.23], [0, 0.22]], 18), TINT.teal, { position: [tx + 0.22, 0.96, tz - 0.05] });
  b.add(capsule(0.012, 0.22, 2, 6), TINT.leaf, { position: [tx + 0.22, 1.3, tz - 0.05] });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; b.add(sphere(0.04, 10, 8), TINT.lav, { position: [tx + 0.22 + Math.cos(a) * 0.045, 1.44 + Math.sin(a) * 0.045, tz - 0.04], scale: [1, 1, 0.6] }); }
  b.add(sphere(0.03, 10, 8), TINT.lemon, { position: [tx + 0.22, 1.44, tz - 0.01] });
  for (const [ox, oz] of [[-0.95, 0.15], [0.95, 0.2]]) {
    b.add(puck(0.32, 0.18, 22), lighten(BRAND.lavender, 0.35), { position: [tx + ox, 0.46, tz + oz] });
    b.add(sphere(0.03, 8, 6), lighten(BRAND.lavender, 0.15), { position: [tx + ox, 0.64, tz + oz] });
    b.add(capsule(0.06, 0.32, 3, 8), '#FFFFFF', { position: [tx + ox, 0.24, tz + oz] });
    b.add(puck(0.17, 0.04, 16), '#FFFFFF', { position: [tx + ox, 0, tz + oz] });
    b.addShadow(tx + ox, tz + oz, 0.75, 0.55);
  }
  b.addShadow(tx, tz, 1.9, 1.3);
  b.add(capsule(0.015, 2.6, 2, 6), PALETTE.steel, { position: [tx, 4.2, tz] });
  b.addLamp(lathe([[0, 0], [0.36, 0], [0.37, 0.03], [0.3, 0.18], [0.12, 0.28], [0, 0.29]], 24), lighten(BRAND.pink, 0.55), { position: [tx, 2.7, tz], shade: 0.03 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; b.add(sphere(0.025, 8, 6), '#FFFFFF', { position: [tx + Math.cos(a) * 0.365, 2.705, tz + Math.sin(a) * 0.365], scale: [1, 0.7, 1] }); }
  b.addHalo(tx, 2.6, tz + 0.1, 2.2, NIGHT.lamp, 0.28);
  b.addGlow(sphere(0.1, 12, 8), '#FFF6EE', { position: [tx, 2.68, tz], scale: [1, 0.55, 1] });

  // --- stove + utensils + clock + window (left, desktop)
  const ox = -2.75, oz = -2.55;
  b.add(roundedBox(1.6, 0.95, 0.76, 0.16), CAB, { position: [ox, 0.52, oz] });
  b.add(roundedBox(1.76, 0.14, 0.9, 0.07), '#FFFFFF', { position: [ox, 1.05, oz + 0.02] });
  b.add(roundedBox(1.1, 0.5, 0.05, 0.12), PALETTE.glass, { position: [ox, 0.48, oz + 0.39] });
  b.add(roundedBox(0.9, 0.32, 0.02, 0.08), lighten(PALETTE.glass, 0.4), { position: [ox, 0.5, oz + 0.415] });
  b.add(capsule(0.03, 0.7, 3, 8), '#FFFFFF', { position: [ox, 0.82, oz + 0.43], rotation: [0, 0, PI / 2] });
  for (let i = 0; i < 3; i++) b.add(puck(0.05, 0.04, 14), i === 1 ? TINT.pink : TINT.peri, { position: [ox - 0.35 + i * 0.35, 0.96, oz + 0.38], rotation: [PI / 2, 0, 0] });
  b.add(roundedBox(1.5, 0.08, 0.05, 0.03), '#EBD4DF', { position: [ox, 0.06, oz + 0.36] });
  b.add(torus(0.2, 0.035, 6, 20), PALETTE.steel, { position: [ox + 0.4, 1.13, oz], rotation: [PI / 2, 0, 0] });
  b.add(lathe([[0, 0], [0.3, 0], [0.32, 0.04], [0.32, 0.3], [0, 0.3]], 24), lighten(BRAND.lavender, 0.4), { position: [ox - 0.35, 1.12, oz] });
  b.add(puck(0.34, 0.06, 24), lighten(BRAND.lavender, 0.25), { position: [ox - 0.35, 1.42, oz] });
  b.add(sphere(0.05, 10, 8), '#FFFFFF', { position: [ox - 0.35, 1.5, oz] });
  for (const s of [-1, 1]) b.add(capsule(0.04, 0.12, 3, 8), lighten(BRAND.lavender, 0.25), { position: [ox - 0.35 + s * 0.36, 1.33, oz], rotation: [0, 0, PI / 2] });
  b.addShadow(ox, oz + 0.1, 2.2, 1.1);
  tileWall(b, { x0: ox - 0.8, x1: ox + 0.8, y0: 1.13, y1: 1.84, z: W, size: 0.345, colors: ['#F8E7EE', '#FFFFFF'], grout: '#EED7E2' });
  // utensil rail: ladle, spatula, whisk
  b.add(capsule(0.022, 1.1, 3, 8), PALETTE.steel, { position: [ox, 2.08, W + 0.1], rotation: [0, 0, PI / 2] });
  for (const s of [-1, 1]) b.add(sphere(0.04, 10, 8), PALETTE.steel, { position: [ox + s * 0.6, 2.08, W + 0.1] });
  const hook = (x) => b.add(torus(0.03, 0.008, 4, 10), PALETTE.steel, { position: [x, 2.05, W + 0.1] });
  hook(ox - 0.35); b.add(capsule(0.018, 0.34, 2, 6), TINT.lav, { position: [ox - 0.35, 1.84, W + 0.11] });
  b.add(lathe([[0, 0], [0.08, 0.02], [0.1, 0.07], [0.09, 0.08], [0, 0.04]], 16), '#FFFFFF', { position: [ox - 0.35, 1.58, W + 0.13], rotation: [PI, 0, 0] });
  hook(ox); b.add(capsule(0.018, 0.3, 2, 6), TINT.pink, { position: [ox, 1.86, W + 0.11] });
  b.add(roundedBox(0.13, 0.16, 0.025, 0.04), '#FFFFFF', { position: [ox, 1.6, W + 0.12] });
  hook(ox + 0.35); b.add(capsule(0.018, 0.18, 2, 6), TINT.teal, { position: [ox + 0.35, 1.9, W + 0.11] });
  for (let i = 0; i < 3; i++) b.add(torus(0.06, 0.008, 4, 16), PALETTE.steel, { position: [ox + 0.35, 1.68, W + 0.12], rotation: [0, (i / 3) * PI, 0], scale: [0.75, 1.5, 1] });
  // clock with little bells
  const clx = ox, cly = 2.62;
  b.add(puck(0.32, 0.08, 32), '#FFFFFF', { position: [clx, cly, W], rotation: [PI / 2, 0, 0] });
  b.add(torus(0.31, 0.03, 6, 32), TINT.lav, { position: [clx, cly, W + 0.08] });
  for (const s of [-1, 1]) {
    b.add(sphere(0.09, 14, 10), TINT.pink, { position: [clx + s * 0.22, cly + 0.28, W + 0.05], scale: [1, 0.8, 0.8] });
    b.add(capsule(0.02, 0.06, 2, 6), PALETTE.steel, { position: [clx + s * 0.2, cly - 0.33, W + 0.05], rotation: [0, 0, s * 0.5] });
  }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2; b.add(sphere(0.022, 8, 6), TINT.lav, { position: [clx + Math.cos(a) * 0.23, cly + Math.sin(a) * 0.23, W + 0.085] }); }
  b.add(roundedBox(0.035, 0.18, 0.02, 0.012), PALETTE.ink, { position: [clx, cly + 0.07, W + 0.1] });
  b.add(roundedBox(0.13, 0.035, 0.02, 0.012), PALETTE.ink, { position: [clx + 0.05, cly, W + 0.1] });
  b.add(sphere(0.03, 8, 6), BRAND.pink, { position: [clx, cly, W + 0.11] });

  const wx = -5.0, wy = 2.4, R = 0.62;
  b.add(torus(R, 0.1, 10, 40), PALETTE.white, { position: [wx, wy, W + 0.04], shade: 0.03 });
  b.addGlow(circle(R, 40), gradientY('#F9E4EC', '#D6E3F6', -R, R * 0.8),
    { position: [wx, wy, W], night: gradientY(NIGHT.skyLow, NIGHT.skyHigh, -R, R * 0.8) });
  b.addHalo(wx - 0.25, wy + 0.28, W + 0.015, 0.36, NIGHT.moon, 0.95);
  b.addHalo(wx - 0.25, wy + 0.28, W + 0.016, 0.17, NIGHT.moon, 0.9);
  for (const [ax, ay, s_] of [[0.25, 0.35, 0.08], [0.05, 0.12, 0.06], [0.36, 0.05, 0.07], [-0.4, -0.05, 0.06], [0.12, -0.25, 0.05]]) {
    b.addHalo(wx + ax, wy + ay, W + 0.014, s_, NIGHT.star, 0.95);
  }
  b.add(roundedBox(R * 1.9, 0.05, 0.04, 0.02), PALETTE.white, { position: [wx, wy, W + 0.05] });
  b.add(roundedBox(0.05, R * 1.9, 0.04, 0.02), PALETTE.white, { position: [wx, wy, W + 0.05] });
  for (let i = 0; i < 7; i++) b.add(sphere(0.1, 12, 8), i % 2 ? TINT.pinkSoft : '#FFFFFF', { position: [wx - 0.6 + i * 0.2, wy + R + 0.12, W + 0.1], scale: [1, 0.75, 0.6] });
  b.add(roundedBox(1.25, 0.1, 0.24, 0.05), PALETTE.white, { position: [wx, wy - R - 0.08, W + 0.1] });
  for (const [dx, c] of [[-0.3, TINT.pink], [0.3, TINT.lav]]) {
    b.add(lathe([[0, 0], [0.11, 0], [0.13, 0.16], [0, 0.16]], 16), c, { position: [wx + dx, wy - R - 0.03, W + 0.12] });
    b.add(blob(0.12, { seed: 13 + dx * 10, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [wx + dx, wy - R + 0.22, W + 0.12], scale: [1, 1.15, 1] });
  }

  staticGroup.add(b.build('kitchen:static'));

  // --- live: kettle steam (3 soft puffs, one instanced draw call)
  const steamGeo = new ClayBuilder({ themed: true }).add(blob(1, { seed: 5, detail: 1, wobble: 0.1 }), '#FFFFFF', { shade: 0 }).buildMesh('tmp').geometry;
  const steam = new THREE.InstancedMesh(steamGeo, getSharedClayMaterial(), 3);
  steam.name = 'kitchen:steam';
  steam.frustumCulled = false;
  liveGroup.add(steam);
  const mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  const updateSteam = (t) => {
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.32 + i / 3) % 1;
      const s = Math.sin(PI * p) * (0.06 + p * 0.05);
      pos.set(KETTLE.x + Math.sin(t * 1.3 + i * 2) * 0.05 + p * 0.06, KETTLE.y + p * 0.62, KETTLE.z + 0.02);
      scl.set(s * 1.2, s, s);
      steam.setMatrixAt(i, mtx.compose(pos, quat, scl));
    }
    steam.instanceMatrix.needsUpdate = true;
  };
  updateSteam(0);

  return makeRoom({
    id: 'kitchen',
    staticGroup,
    liveGroup,
    update(dt, t) { updateSteam(t); },
  });
}

/** Cute fruit bowl (apple, lemon, grapes, banana). */
function fruitBowl(b, x, y, z) {
  b.add(lathe([[0, 0], [0.12, 0], [0.13, 0.02], [0.24, 0.08], [0.29, 0.17], [0.27, 0.185], [0.2, 0.12], [0, 0.08]], 24), '#F1DCEA', { position: [x, y, z], shade: 0.06 });
  b.add(torus(0.28, 0.018, 6, 28), TINT.pink, { position: [x, y + 0.175, z], rotation: [PI / 2, 0, 0] });
  for (let i = 0; i < 6; i++) b.add(sphere(0.033, 10, 8), i % 2 ? TINT.lav : lighten(BRAND.lavender, 0.25), { position: [x - 0.05 + (i % 3) * 0.05, y + 0.18 + Math.floor(i / 3) * 0.05, z - 0.1] });
  b.add(sphere(0.095, 14, 10), TINT.apple, { position: [x - 0.09, y + 0.21, z + 0.02] });
  b.add(capsule(0.008, 0.04, 2, 5), XMAS.cocoa, { position: [x - 0.09, y + 0.31, z + 0.02], rotation: [0, 0, 0.3] });
  b.add(blob(0.03, { seed: 2, detail: 1 }), TINT.leaf, { position: [x - 0.06, y + 0.315, z + 0.02], scale: [1.4, 0.6, 0.5] });
  b.add(sphere(0.085, 14, 10), TINT.lemon, { position: [x + 0.1, y + 0.19, z + 0.05], scale: [1.25, 1, 1] });
  b.add(tubeAlong([[-0.18, 0.17, 0.1], [-0.06, 0.13, 0.13], [0.08, 0.15, 0.13], [0.17, 0.23, 0.1]].map(([a, c, d]) => [x + a, y + c, z + d]), 0.032, 24, 8), '#F3E1A3', { shade: 0.05 });
  b.add(sphere(0.022, 8, 6), XMAS.cocoa, { position: [x + 0.17, y + 0.235, z + 0.1] });
}
