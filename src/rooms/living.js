/**
 * living.js — ห้องนั่งเล่น (owner: prop).
 * Sofa behind the pet, round window with soft sky, framed brand blob, rug, plant,
 * floor lamp, toy ball; extra cabinet, pouf and shelf for wide desktop screens.
 */
import * as THREE from 'three';
import {
  ClayBuilder, PALETTE, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle,
  gradientY, brandGradientX,
} from '../props/clay.js';
import { addShell, makeRoom, WALL_Z } from './shell.js';

const P = PALETTE.living;
const W = WALL_Z + 0.04;

/** Build the living room. @returns {ReturnType<typeof makeRoom>} */
export function buildLiving() {
  const b = new ClayBuilder({ shadowColor: P.shadow, shadowOpacity: 0.22 });
  addShell(b, P);
  const group = new THREE.Group();

  // --- sofa (centred behind the pet, as in the approved mockup)
  const sz = -2.42;
  b.add(roundedBox(3.3, 0.5, 0.95, 0.2), '#D3CDEB', { position: [0, 0.34, sz] });
  b.add(roundedBox(3.3, 0.98, 0.4, 0.19), '#DCD7F1', { position: [0, 0.98, sz - 0.36] });
  for (const s of [-1, 1]) {
    b.add(roundedBox(0.44, 0.8, 1.0, 0.21), '#D8D2EE', { position: [s * 1.72, 0.48, sz + 0.02] });
    b.add(roundedBox(1.46, 0.26, 0.8, 0.12), '#E3DEF4', { position: [s * 0.74, 0.7, sz + 0.06] });
    b.add(roundedBox(1.38, 0.62, 0.24, 0.12), '#E3DEF4', { position: [s * 0.73, 1.08, sz - 0.2], rotation: [-0.12, 0, 0] });
    for (const z of [-0.36, 0.36]) b.add(puck(0.07, 0.1, 10), '#BFB6E0', { position: [s * 1.6, 0, sz + z] });
  }
  b.add(roundedBox(0.52, 0.5, 0.2, 0.13), lighten(BRAND.pink, 0.55), { position: [1.18, 1.02, sz - 0.02], rotation: [-0.15, 0, 0.18] });
  b.add(roundedBox(0.48, 0.46, 0.2, 0.12), lighten(BRAND.periwinkle, 0.5), { position: [-1.2, 1.0, sz - 0.02], rotation: [-0.15, 0, -0.14] });
  b.addShadow(0, sz + 0.1, 4.2, 1.5);

  // --- round window with soft sky
  const wx = -0.62, wy = 2.5, R = 0.55;
  b.add(torus(R, 0.1, 10, 40), PALETTE.white, { position: [wx, wy, W + 0.04], shade: 0.03 });
  b.addGlow(circle(R, 40), gradientY('#F7E3EE', '#CFE0F6', -R, R * 0.8), { position: [wx, wy, W] });
  b.addGlow(blob(0.12, { seed: 2, detail: 2 }), '#FFFFFF', { position: [wx - 0.22, wy + 0.2, W + 0.01], scale: [1.9, 0.75, 0.2] });
  b.addGlow(blob(0.1, { seed: 5, detail: 2 }), '#FFFFFF', { position: [wx + 0.25, wy - 0.05, W + 0.01], scale: [1.7, 0.7, 0.2] });
  b.add(roundedBox(R * 1.9, 0.06, 0.05, 0.025), PALETTE.white, { position: [wx, wy, W + 0.05] });
  b.add(roundedBox(0.06, R * 1.9, 0.05, 0.025), PALETTE.white, { position: [wx, wy, W + 0.05] });
  b.add(roundedBox(R * 2.1, 0.1, 0.24, 0.05), PALETTE.white, { position: [wx, wy - R - 0.08, W + 0.1] });

  // --- framed brand blob (right of the window)
  b.add(roundedBox(0.66, 0.78, 0.08, 0.16), '#FBF0F4', { position: [0.92, 2.48, W + 0.04] });
  b.add(blob(0.2, { seed: 3, wobble: 0.14 }), brandGradientX(-0.25, 0.25, 0.35), { position: [0.92, 2.48, W + 0.1], scale: [1.05, 1, 0.22], shade: 0 });

  // --- floor lamp (left)
  const lx = -2.6, lz = -2.45;
  b.add(puck(0.27, 0.08), '#D8D2EE', { position: [lx, 0, lz] });
  b.add(capsule(0.04, 1.6, 3, 8), '#E3DEF4', { position: [lx, 0.88, lz] });
  b.add(lathe([[0, 0], [0.42, 0], [0.43, 0.04], [0.38, 0.16], [0.24, 0.34], [0.07, 0.42], [0, 0.43]], 24), lighten(BRAND.pink, 0.62), { position: [lx, 1.66, lz], shade: 0.03 });
  b.addGlow(sphere(0.1, 12, 8), '#FFF6EE', { position: [lx, 1.64, lz], scale: [1, 0.5, 1] });
  b.addShadow(lx, lz, 0.9, 0.6);

  // --- side table with mug (right of sofa)
  const tx = 2.3, tz = -2.45;
  b.add(puck(0.36, 0.08), '#FFFFFF', { position: [tx, 0.62, tz] });
  b.add(capsule(0.06, 0.5, 3, 8), '#E3DEF4', { position: [tx, 0.34, tz] });
  b.add(puck(0.24, 0.06), '#E3DEF4', { position: [tx, 0, tz] });
  b.add(lathe([[0, 0], [0.09, 0], [0.1, 0.02], [0.1, 0.18], [0.085, 0.19], [0, 0.17]], 16), lighten(BRAND.teal, 0.45), { position: [tx - 0.08, 0.7, tz + 0.05] });
  b.add(torus(0.05, 0.016, 6, 12), lighten(BRAND.teal, 0.45), { position: [tx + 0.03, 0.8, tz + 0.05] });
  b.addShadow(tx, tz, 0.9, 0.6);

  // --- plant (pot is static, leaves sway)
  const px = 3.15, pz = -2.4;
  b.add(lathe([[0, 0], [0.24, 0], [0.3, 0.05], [0.34, 0.5], [0.39, 0.55], [0.38, 0.62], [0, 0.6]], 24), lighten(BRAND.lavender, 0.3), { position: [px, 0, pz] });
  b.addShadow(px, pz, 1.0, 0.6);
  const lb = new ClayBuilder();
  const leaf = (rx, rz, len, col) => lb.add(blob(0.16, { seed: rx * 7 + rz, wobble: 0.06, detail: 2 }), col,
    { position: [Math.sin(rz) * -len * 0.5, Math.cos(rz) * len * 0.5 * Math.cos(rx), Math.sin(rx) * len * 0.5], rotation: [rx, 0, rz], scale: [0.7, len * 3.1, 0.32] });
  const L1 = lighten(BRAND.teal, 0.2), L2 = lighten(BRAND.teal, 0.42);
  leaf(0, 0, 0.9, L1); leaf(0.2, 0.55, 0.75, L2); leaf(-0.15, -0.6, 0.8, L2); leaf(0.4, 0.15, 0.6, L1); leaf(-0.35, -0.2, 0.65, L1); leaf(0.1, 1.0, 0.55, L1); leaf(0, -1.05, 0.55, L2);
  const leaves = lb.buildMesh('living:plantLeaves');
  leaves.position.set(px, 0.58, pz);
  group.add(leaves);

  // --- rug in front
  b.add(puck(1, 0.035, 40), '#D9D4F0', { position: [0, 0, 0.35], scale: [2.3, 1, 1.35], shade: 0 });
  b.add(puck(1, 0.04, 40), '#E1DDF4', { position: [0, 0, 0.35], scale: [1.85, 1, 1.0], shade: 0 });

  // --- wide-screen extras: cabinet with books (right), shelf + pouf (left)
  const cx = 4.8, cz = -2.55;
  b.add(roundedBox(2.1, 0.92, 0.7, 0.18), lighten(BRAND.periwinkle, 0.62), { position: [cx, 0.5, cz] });
  for (const s of [-1, 1]) b.add(capsule(0.035, 0.18, 3, 8), '#FFFFFF', { position: [cx + s * 0.25, 0.55, cz + 0.37], rotation: [0, 0, Math.PI / 2] });
  b.add(roundedBox(0.04, 0.7, 0.02, 0.01), lighten(BRAND.periwinkle, 0.5), { position: [cx, 0.5, cz + 0.355] });
  const books = [[BRAND.pink, 0.52], [BRAND.lavender, 0.6], [BRAND.periwinkle, 0.46], [BRAND.teal, 0.42]];
  books.forEach(([c, h], i) => b.add(roundedBox(0.16, h, 0.4, 0.06), lighten(c, 0.35), { position: [cx - 0.75 + i * 0.18, 0.96 + h / 2, cz], rotation: [0, 0, i === 3 ? -0.18 : 0] }));
  b.add(lathe([[0, 0], [0.12, 0], [0.18, 0.12], [0.16, 0.26], [0.07, 0.36], [0.08, 0.42], [0, 0.42]], 18), '#FFFFFF', { position: [cx + 0.55, 0.96, cz] });
  b.add(blob(0.24, { seed: 8 }), brandGradientX(-0.3, 0.3, 0.4), { position: [cx, 2.4, W + 0.05], scale: [1.2, 1, 0.18], shade: 0 });
  b.addShadow(cx, cz + 0.05, 2.6, 0.9);

  const sx = -4.6;
  b.add(roundedBox(1.6, 0.1, 0.32, 0.05), '#FFFFFF', { position: [sx, 2.0, W + 0.16] });
  b.add(lathe([[0, 0], [0.11, 0], [0.13, 0.18], [0, 0.18]], 16), lighten(BRAND.pink, 0.45), { position: [sx - 0.45, 2.05, W + 0.16] });
  b.add(blob(0.13, { seed: 4, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [sx - 0.45, 2.33, W + 0.16], scale: [1, 1.2, 1] });
  b.add(roundedBox(0.34, 0.3, 0.2, 0.08), lighten(BRAND.lavender, 0.45), { position: [sx + 0.4, 2.2, W + 0.16] });
  b.add(puck(0.55, 0.5, 28), lighten(BRAND.lavender, 0.45), { position: [-4.1, 0, -1.6] });
  b.add(torus(0.5, 0.06, 8, 28), lighten(BRAND.lavender, 0.3), { position: [-4.1, 0.42, -1.6], rotation: [Math.PI / 2, 0, 0] });
  b.addShadow(-4.1, -1.6, 1.5, 1.1);

  // --- toy ball (sits behind-right of the pet; rocks gently)
  const ball = new ClayBuilder().add(sphere(0.27, 28, 18), (x, y, z, c) => {
    const a = Math.atan2(z, x); const k = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 6) % 3;
    c.set(Math.abs(y) > 0.24 ? '#FFFFFF' : [lighten(BRAND.pink, 0.3), lighten(BRAND.periwinkle, 0.3), '#FFFFFF'][k]);
  }, { shade: 0.1 }).buildMesh('living:toyBall');
  const ballPos = new THREE.Vector3(1.6, 0.27, -1.05);
  ball.position.copy(ballPos);
  group.add(ball);
  b.addShadow(ballPos.x, ballPos.z + 0.05, 0.8, 0.5);

  group.add(b.build('living:static'));

  return makeRoom({
    id: 'living',
    group,
    update(dt, t) {
      leaves.rotation.z = Math.sin(t * 0.7) * 0.035;
      leaves.rotation.x = Math.sin(t * 0.5 + 1) * 0.02;
      ball.rotation.z = Math.sin(t * 0.9) * 0.08;
      ball.position.x = ballPos.x - Math.sin(t * 0.9) * 0.08 * 0.27;
    },
  });
}
