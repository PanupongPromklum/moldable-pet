/**
 * kitchen.js — ห้องครัว (owner: prop).
 * Fridge left of the pet, counter with kettle right, wall shelf with jars, round
 * table with stools and pendant lamp; stove, clock and window for wide screens.
 * The food tray itself is HUD (glaze), not 3D.
 */
import * as THREE from 'three';
import { ClayBuilder, PALETTE, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, gradientY, brandGradientX } from '../props/clay.js';
import { addShell, makeRoom, WALL_Z } from './shell.js';

const P = PALETTE.kitchen;
const W = WALL_Z + 0.04;
const CAB = '#F7E6EE';
const DOOR = lighten('#F7E6EE', 0.45);

/** Build the kitchen. @returns {ReturnType<typeof makeRoom>} */
export function buildKitchen() {
  const b = new ClayBuilder({ shadowColor: P.shadow, shadowOpacity: 0.2 });
  addShell(b, P);
  const group = new THREE.Group();

  // --- fridge (left, behind the pet's shoulder)
  const fx = -0.8, fz = -2.5, fw = 0.92, fh = 2.5, fd = 0.8;
  b.add(roundedBox(fw, fh, fd, 0.24), '#FFFFFF', { position: [fx, fh / 2 + 0.04, fz], shade: 0.05 });
  const front = fz + fd / 2;
  b.add(roundedBox(fw - 0.12, 0.74, 0.06, 0.12), '#FBF5F8', { position: [fx, 2.04, front] });
  b.add(roundedBox(fw - 0.12, 1.52, 0.06, 0.12), '#FBF5F8', { position: [fx, 0.88, front] });
  b.add(capsule(0.035, 0.26, 3, 8), PALETTE.glass, { position: [fx + 0.32, 1.98, front + 0.06] });
  b.add(capsule(0.035, 0.42, 3, 8), PALETTE.glass, { position: [fx + 0.32, 1.3, front + 0.06] });
  b.add(blob(0.09, { seed: 6, detail: 2 }), brandGradientX(-0.1, 0.1, 0.2), { position: [fx - 0.2, 2.15, front + 0.05], scale: [1.1, 1, 0.35], shade: 0 });
  b.add(blob(0.07, { seed: 9, detail: 2 }), lighten(BRAND.teal, 0.25), { position: [fx - 0.05, 1.95, front + 0.05], scale: [1, 1, 0.35], shade: 0 });
  b.addShadow(fx, fz + 0.1, 1.5, 1.1);

  // --- counter (right, behind the pet)
  const cx = 1.9, cz = -2.55, cw = 2.7;
  b.add(roundedBox(cw, 0.95, 0.76, 0.16), CAB, { position: [cx, 0.52, cz] });
  b.add(roundedBox(cw + 0.16, 0.14, 0.9, 0.07), '#FFFFFF', { position: [cx, 1.05, cz + 0.02] });
  for (let i = 0; i < 3; i++) {
    const dx = cx - cw / 2 + 0.45 + i * 0.9;
    b.add(roundedBox(0.8, 0.72, 0.05, 0.12), DOOR, { position: [dx, 0.52, cz + 0.39] });
    b.add(sphere(0.045, 10, 8), PALETTE.glass, { position: [dx + (i === 1 ? 0 : (i ? -0.26 : 0.26)), 0.66, cz + 0.43] });
  }
  // kettle
  const kx = cx + 0.6, ky = 1.12;
  b.add(lathe([[0, 0], [0.22, 0], [0.26, 0.06], [0.26, 0.2], [0.2, 0.34], [0.1, 0.38], [0, 0.38]], 22), lighten(BRAND.periwinkle, 0.35), { position: [kx, ky, cz] });
  b.add(sphere(0.05, 10, 8), '#FFFFFF', { position: [kx, ky + 0.41, cz] });
  b.add(capsule(0.045, 0.2, 3, 8), lighten(BRAND.periwinkle, 0.35), { position: [kx - 0.3, ky + 0.2, cz + 0.02], rotation: [0, 0, 0.9] });
  b.add(torus(0.13, 0.03, 6, 16, Math.PI), '#FFFFFF', { position: [kx + 0.03, ky + 0.36, cz], rotation: [0, 0, -0.2] });
  // bowl + cutting board
  b.add(roundedBox(0.7, 0.05, 0.42, 0.025), '#F3DCC8', { position: [cx - 0.5, ky + 0.02, cz + 0.05] });
  b.add(lathe([[0, 0], [0.14, 0], [0.24, 0.08], [0.27, 0.17], [0.25, 0.18], [0, 0.06]], 22), '#F1DCEA', { position: [cx - 0.5, ky + 0.05, cz + 0.05] });
  b.add(sphere(0.09, 12, 10), lighten(BRAND.pink, 0.2), { position: [cx - 0.55, ky + 0.2, cz + 0.05] });
  b.add(sphere(0.08, 12, 10), '#F6DE9C', { position: [cx - 0.42, ky + 0.19, cz + 0.08] });
  b.addShadow(cx, cz + 0.1, cw + 0.8, 1.1);
  // backsplash tiles
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
    b.add(roundedBox(0.3, 0.3, 0.03, 0.08), (i + j) % 2 ? '#F8E7EE' : '#FFFFFF', { position: [cx - 1.22 + i * 0.35, 1.32 + j * 0.35, W + 0.02], shade: 0 });
  }

  // --- wall shelf (top right, visible above the pet on phones)
  const sx = 0.78, sy = 2.36;
  b.add(roundedBox(1.1, 0.1, 0.32, 0.05), '#EDD3E1', { position: [sx, sy, W + 0.16] });
  b.add(roundedBox(0.3, 0.38, 0.28, 0.12), PALETTE.glass, { position: [sx - 0.33, sy + 0.24, W + 0.16] });
  b.add(roundedBox(0.32, 0.08, 0.3, 0.04), lighten(BRAND.periwinkle, 0.3), { position: [sx - 0.33, sy + 0.46, W + 0.16] });
  b.add(lathe([[0, 0], [0.12, 0], [0.19, 0.08], [0.2, 0.16], [0.18, 0.17], [0, 0.05]], 20), '#F1DCEA', { position: [sx + 0.08, sy + 0.05, W + 0.16] });
  b.add(lathe([[0, 0], [0.1, 0], [0.12, 0.2], [0, 0.2]], 16), lighten(BRAND.lavender, 0.4), { position: [sx + 0.36, sy + 0.05, W + 0.16] });
  b.add(blob(0.12, { seed: 11, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [sx + 0.36, sy + 0.34, W + 0.16], scale: [1, 1.15, 1] });

  // --- round table with stools + pendant lamp (right, desktop)
  const tx = 3.15, tz = -1.15;
  b.add(puck(0.72, 0.12, 36), '#FFFFFF', { position: [tx, 0.84, tz] });
  b.add(capsule(0.09, 0.66, 3, 10), CAB, { position: [tx, 0.46, tz] });
  b.add(puck(0.36, 0.08, 24), CAB, { position: [tx, 0, tz] });
  b.add(lathe([[0, 0], [0.12, 0], [0.22, 0.07], [0.25, 0.14], [0.23, 0.15], [0, 0.05]], 20), lighten(BRAND.teal, 0.45), { position: [tx + 0.12, 0.96, tz + 0.1] });
  for (const [ox, oz] of [[-0.95, 0.15], [0.95, 0.2]]) {
    b.add(puck(0.32, 0.18, 22), lighten(BRAND.lavender, 0.35), { position: [tx + ox, 0.46, tz + oz] });
    b.add(capsule(0.06, 0.32, 3, 8), '#FFFFFF', { position: [tx + ox, 0.24, tz + oz] });
    b.addShadow(tx + ox, tz + oz, 0.75, 0.55);
  }
  b.addShadow(tx, tz, 1.9, 1.3);
  b.add(capsule(0.015, 2.6, 2, 6), PALETTE.steel, { position: [tx, 4.2, tz] });
  b.add(lathe([[0, 0], [0.36, 0], [0.37, 0.03], [0.3, 0.18], [0.12, 0.28], [0, 0.29]], 24), lighten(BRAND.pink, 0.55), { position: [tx, 2.7, tz], shade: 0.03 });
  b.addGlow(sphere(0.1, 12, 8), '#FFF6EE', { position: [tx, 2.68, tz], scale: [1, 0.55, 1] });

  // --- stove + clock + window (left, desktop)
  const ox = -2.75, oz = -2.55;
  b.add(roundedBox(1.6, 0.95, 0.76, 0.16), CAB, { position: [ox, 0.52, oz] });
  b.add(roundedBox(1.76, 0.14, 0.9, 0.07), '#FFFFFF', { position: [ox, 1.05, oz + 0.02] });
  b.add(roundedBox(1.1, 0.5, 0.05, 0.12), PALETTE.glass, { position: [ox, 0.52, oz + 0.39] });
  b.add(capsule(0.03, 0.7, 3, 8), '#FFFFFF', { position: [ox, 0.86, oz + 0.43], rotation: [0, 0, Math.PI / 2] });
  b.add(torus(0.2, 0.035, 6, 20), PALETTE.steel, { position: [ox + 0.4, 1.13, oz], rotation: [Math.PI / 2, 0, 0] });
  b.add(lathe([[0, 0], [0.3, 0], [0.32, 0.04], [0.32, 0.3], [0, 0.3]], 24), lighten(BRAND.lavender, 0.4), { position: [ox - 0.35, 1.12, oz] });
  b.add(puck(0.34, 0.06, 24), lighten(BRAND.lavender, 0.25), { position: [ox - 0.35, 1.42, oz] });
  b.add(sphere(0.05, 10, 8), '#FFFFFF', { position: [ox - 0.35, 1.5, oz] });
  for (const s of [-1, 1]) b.add(capsule(0.04, 0.12, 3, 8), lighten(BRAND.lavender, 0.25), { position: [ox - 0.35 + s * 0.36, 1.33, oz], rotation: [0, 0, Math.PI / 2] });
  b.addShadow(ox, oz + 0.1, 2.2, 1.1);
  b.add(puck(0.32, 0.08, 28), '#FFFFFF', { position: [ox, 2.55, W], rotation: [Math.PI / 2, 0, 0] });
  b.add(roundedBox(0.035, 0.2, 0.02, 0.012), PALETTE.ink, { position: [ox, 2.62, W + 0.1] });
  b.add(roundedBox(0.15, 0.035, 0.02, 0.012), PALETTE.ink, { position: [ox + 0.06, 2.55, W + 0.1] });
  b.add(sphere(0.03, 8, 6), BRAND.pink, { position: [ox, 2.55, W + 0.11] });

  const wx = -5.0, wy = 2.4, R = 0.62;
  b.add(torus(R, 0.1, 10, 40), PALETTE.white, { position: [wx, wy, W + 0.04], shade: 0.03 });
  b.addGlow(circle(R, 40), gradientY('#F9E4EC', '#D6E3F6', -R, R * 0.8), { position: [wx, wy, W] });
  b.add(roundedBox(1.25, 0.1, 0.24, 0.05), PALETTE.white, { position: [wx, wy - R - 0.08, W + 0.1] });
  b.add(lathe([[0, 0], [0.13, 0], [0.16, 0.2], [0, 0.2]], 16), lighten(BRAND.pink, 0.5), { position: [wx + 0.3, wy - R - 0.03, W + 0.12] });
  b.add(blob(0.13, { seed: 13, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [wx + 0.3, wy - R + 0.26, W + 0.12], scale: [1, 1.15, 1] });

  // --- floor mat by the counter
  b.add(puck(1, 0.03, 32), lighten(BRAND.pink, 0.62), { position: [0, 0, 0.4], scale: [1.9, 1, 1.15], shade: 0 });

  group.add(b.build('kitchen:static'));
  return makeRoom({ id: 'kitchen', group });
}
