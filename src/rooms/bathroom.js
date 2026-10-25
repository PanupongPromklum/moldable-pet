/**
 * bathroom.js — ห้องน้ำ (owner: prop).
 * Rounded toilet (bowl, seat, open lid, tank, push button) back-right of the pet,
 * pedestal sink with oval mirror back-left, towel rail; bathtub with bubbles and a
 * clay duck, bath mat and a bottle shelf for wide screens.
 *
 * Contract extras: `toiletSeat` (room-local = world while room.group sits at the
 * origin), `dropZones.toilet`, `flush()` → duration in seconds.
 */
import * as THREE from 'three';
import { ClayBuilder, PALETTE, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle } from '../props/clay.js';
import { addShell, makeRoom, WALL_Z, ease } from './shell.js';

const P = PALETTE.bathroom;
const W = WALL_Z + 0.04;
/** Flush animation length in seconds (animation timing, not a gameplay value). */
export const FLUSH_SECONDS = 1.2;
/** Toilet placement: back-right of petSpot, about 2.1 units away, turned toward the pet. */
const TOILET_POS = new THREE.Vector3(1.0, 0, -1.85);
const TOILET_YAW = -0.38;
const SEAT_LOCAL = new THREE.Vector3(0, 0.8, 0.04);

/** Build the bathroom. @returns {ReturnType<typeof makeRoom>} */
export function buildBathroom() {
  const b = new ClayBuilder({ shadowColor: P.shadow, shadowOpacity: 0.2 });
  addShell(b, P);
  const group = new THREE.Group();

  // --- wainscot band (soft tile-coloured lower wall)
  b.add(roundedBox(32, 1.25, 0.05, 0.02), P.trim, { position: [0, 0.62, W], shade: 0 });
  b.add(roundedBox(32, 0.09, 0.12, 0.045), '#FFFFFF', { position: [0, 1.27, W + 0.03], shade: 0 });

  // --- toilet (own group so it can wobble on flush)
  const toilet = new THREE.Group();
  toilet.name = 'bathroom:toilet';
  toilet.position.copy(TOILET_POS);
  toilet.rotation.y = TOILET_YAW;
  const tb = new ClayBuilder();
  const WHITE = '#FFFFFF';
  tb.add(lathe([[0, 0], [0.3, 0], [0.33, 0.04], [0.27, 0.18], [0.25, 0.36], [0.32, 0.47], [0, 0.47]], 28), WHITE, { scale: [1, 1, 1.12], shade: 0.08 });
  tb.add(lathe([[0, 0.4], [0.34, 0.42], [0.47, 0.54], [0.53, 0.66], [0.53, 0.71], [0.45, 0.735], [0.4, 0.66], [0.3, 0.6], [0, 0.58]], 32), WHITE, { scale: [1, 1, 1.15], shade: 0.06 });
  tb.add(puck(0.34, 0.025, 24), PALETTE.steel, { scale: [1, 1, 1.12], shade: 0 });
  tb.add(torus(0.44, 0.07, 10, 36), lighten(BRAND.periwinkle, 0.72), { position: [0, 0.77, 0.02], rotation: [Math.PI / 2, 0, 0], scale: [1, 1.14, 1], shade: 0.02 });
  tb.add(roundedBox(0.92, 0.86, 0.36, 0.17), WHITE, { position: [0, 1.17, -0.56], shade: 0.05 });
  tb.add(roundedBox(0.98, 0.1, 0.42, 0.05), lighten(BRAND.periwinkle, 0.78), { position: [0, 1.63, -0.56], shade: 0 });
  tb.add(roundedBox(0.3, 0.26, 0.5, 0.12), WHITE, { position: [0, 0.6, -0.42] }); // neck between bowl and tank
  tb.add(puck(0.47, 0.06, 32), lighten(BRAND.periwinkle, 0.72), { position: [0, 1.25, -0.31], rotation: [Math.PI / 2 - 0.2, 0, 0], scale: [1, 1, 1.12], shade: 0 });
  const toiletBody = tb.buildMesh('bathroom:toiletBody');
  toilet.add(toiletBody);

  const BUTTON_Y = 1.69;
  const button = new ClayBuilder().add(puck(0.1, 0.07, 18), BRAND.periwinkle, { shade: 0.1 }).buildMesh('bathroom:flushHandle');
  button.position.set(0.18, BUTTON_Y - 0.02, -0.56);
  toilet.add(button);

  const WATER_Y = 0.6;
  const wc = [new THREE.Color('#C6D8EE'), new THREE.Color('#EEF4FB')];
  const waterGeo = circle(0.39, 48); waterGeo.rotateX(-Math.PI / 2);
  const water = new ClayBuilder().add(waterGeo, (x, y, z, c) => {
    const a = Math.atan2(z, x), r = Math.hypot(x, z);
    c.copy(wc[0]).lerp(wc[1], 0.5 + 0.5 * Math.sin(3 * a + r * 16));
  }, { shade: 0 }).buildMesh('bathroom:water');
  water.position.set(0, WATER_Y + 0.005, 0.01);
  water.scale.set(1, 1, 1.13);
  toilet.add(water);
  group.add(toilet);
  b.addShadow(TOILET_POS.x - 0.05, TOILET_POS.z - 0.15, 1.6, 1.4);

  // toilet paper (wall, right of toilet)
  b.add(capsule(0.025, 0.24, 2, 8), PALETTE.steel, { position: [2.0, 0.95, W + 0.2], rotation: [0, 0, Math.PI / 2] });
  b.add(puck(0.13, 0.2, 20), WHITE, { position: [2.1, 0.86, W + 0.2], rotation: [0, 0, Math.PI / 2] });

  // --- towel rail above the toilet
  b.add(capsule(0.03, 0.72, 3, 8), PALETTE.steel, { position: [0.88, 2.52, W + 0.12], rotation: [0, 0, Math.PI / 2] });
  b.add(roundedBox(0.56, 0.8, 0.07, 0.06), '#F4E1E9', { position: [0.88, 2.14, W + 0.17] });
  b.add(roundedBox(0.56, 0.12, 0.11, 0.05), lighten(BRAND.pink, 0.55), { position: [0.88, 2.0, W + 0.2] });

  // --- pedestal sink + oval mirror (left)
  const kx = -0.78, kz = -2.6;
  b.add(lathe([[0, 0], [0.2, 0], [0.22, 0.04], [0.13, 0.25], [0.12, 0.7], [0.2, 0.84], [0, 0.84]], 22), WHITE, { position: [kx, 0, kz] });
  b.add(lathe([[0, 0.78], [0.3, 0.8], [0.44, 0.92], [0.46, 1.02], [0.4, 1.04], [0.3, 0.96], [0, 0.94]], 28), WHITE, { position: [kx, 0, kz + 0.06], scale: [1, 1, 0.8] });
  b.add(capsule(0.035, 0.18, 3, 8), PALETTE.steel, { position: [kx, 1.12, kz - 0.22] });
  b.add(capsule(0.03, 0.12, 3, 8), PALETTE.steel, { position: [kx, 1.24, kz - 0.14], rotation: [Math.PI / 2, 0, 0] });
  b.add(sphere(0.05, 10, 8), BRAND.periwinkle, { position: [kx + 0.16, 1.1, kz - 0.22] });
  b.addShadow(kx, kz + 0.05, 1.1, 0.8);
  b.add(puck(0.5, 0.07, 36), WHITE, { position: [kx, 2.42, W], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1.28], shade: 0 });
  b.add(puck(0.42, 0.04, 36), PALETTE.glass, { position: [kx, 2.42, W + 0.05], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1.26], shade: 0 });
  b.add(capsule(0.035, 0.32, 3, 8), WHITE, { position: [kx - 0.16, 2.55, W + 0.1], rotation: [0, 0, -0.5] });
  b.add(capsule(0.025, 0.12, 3, 8), WHITE, { position: [kx - 0.03, 2.66, W + 0.1], rotation: [0, 0, -0.5] });

  // --- bathtub with bubbles and a clay duck (left, desktop)
  const ux = -3.4, uz = -2.25;
  b.add(roundedBox(2.5, 0.85, 1.15, 0.38), WHITE, { position: [ux, 0.5, uz] });
  b.add(roundedBox(2.15, 0.06, 0.82, 0.03), '#D3E0F2', { position: [ux, 0.9, uz], shade: 0 });
  for (const [dx, dz] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) b.add(sphere(0.09, 10, 8), PALETTE.steel, { position: [ux + dx, 0.06, uz + dz] });
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = 0.15 + (i % 3) * 0.18;
    b.add(blob(0.13 + (i % 3) * 0.04, { seed: i, wobble: 0.08, detail: 2 }), i % 2 ? '#FFFFFF' : lighten(BRAND.periwinkle, 0.82),
      { position: [ux + 0.35 + Math.cos(a) * r * 1.6, 0.96, uz + Math.sin(a) * r * 0.7], scale: [1, 0.7, 1], shade: 0.03 });
  }
  const dx = ux - 0.55, dy = 0.98, dz = uz + 0.15;
  b.add(blob(0.16, { seed: 21, wobble: 0.04, detail: 3 }), '#F6E3A6', { position: [dx, dy, dz], scale: [1.25, 0.85, 1] });
  b.add(sphere(0.11, 16, 12), '#F6E3A6', { position: [dx + 0.12, dy + 0.18, dz] });
  b.add(capsule(0.04, 0.05, 3, 8), lighten(BRAND.pink, 0.15), { position: [dx + 0.24, dy + 0.16, dz], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 0.7] });
  b.add(sphere(0.018, 6, 6), PALETTE.ink, { position: [dx + 0.17, dy + 0.22, dz + 0.08] });
  b.add(capsule(0.03, 0.9, 3, 8), PALETTE.steel, { position: [ux - 1.0, 1.5, W + 0.12] });
  b.add(capsule(0.03, 0.3, 3, 8), PALETTE.steel, { position: [ux - 1.0, 1.95, W + 0.28], rotation: [Math.PI / 2, 0, 0] });
  b.addShadow(ux, uz + 0.1, 3.1, 1.5);

  // --- bath mat in front of the tub
  b.add(puck(1, 0.04, 36), lighten(BRAND.lavender, 0.45), { position: [ux + 0.2, 0, -0.95], scale: [1.15, 1, 0.62], shade: 0 });
  b.add(torus(0.92, 0.035, 6, 40), lighten(BRAND.lavender, 0.3), { position: [ux + 0.2, 0.04, -0.95], rotation: [Math.PI / 2, 0, 0], scale: [1.15, 0.62, 1], shade: 0 });
  // small round mat before the toilet
  b.add(puck(0.62, 0.035, 32), lighten(BRAND.teal, 0.62), { position: [TOILET_POS.x - 0.2, 0, TOILET_POS.z + 0.75], scale: [1.2, 1, 0.8], shade: 0 });

  // --- bottle shelf + plant + basket (right, desktop)
  const sx = 3.7;
  b.add(roundedBox(1.5, 0.1, 0.32, 0.05), WHITE, { position: [sx, 2.1, W + 0.16] });
  [[BRAND.teal, 0.36], [BRAND.pink, 0.28], [BRAND.lavender, 0.42], [BRAND.periwinkle, 0.3]].forEach(([c, h], i) => {
    b.add(roundedBox(0.2, h, 0.2, 0.08), lighten(c, 0.4), { position: [sx - 0.5 + i * 0.33, 2.15 + h / 2, W + 0.16] });
    b.add(capsule(0.04, 0.04, 3, 8), WHITE, { position: [sx - 0.5 + i * 0.33, 2.2 + h, W + 0.16] });
  });
  b.add(lathe([[0, 0], [0.3, 0], [0.38, 0.5], [0.4, 0.55], [0, 0.55]], 24), lighten(BRAND.periwinkle, 0.5), { position: [3.3, 0, -2.4] });
  b.add(roundedBox(0.5, 0.18, 0.36, 0.09), '#F4E1E9', { position: [3.3, 0.6, -2.4], rotation: [0.1, 0.3, 0.12] });
  b.addShadow(3.3, -2.35, 1.0, 0.7);
  b.add(lathe([[0, 0], [0.24, 0], [0.3, 0.4], [0.33, 0.45], [0, 0.44]], 22), WHITE, { position: [4.6, 0, -2.45] });
  b.add(blob(0.3, { seed: 31, detail: 3 }), lighten(BRAND.teal, 0.25), { position: [4.6, 0.85, -2.45], scale: [1, 1.3, 1] });
  b.addShadow(4.6, -2.4, 1.0, 0.6);

  group.add(b.build('bathroom:static'));

  // --- contract points
  toilet.updateMatrix();
  const toiletSeat = SEAT_LOCAL.clone().applyMatrix4(toilet.matrix);
  const dropZones = { toilet: { position: toiletSeat.clone(), radius: 0.9 } };

  let flushT = -1;
  return makeRoom({
    id: 'bathroom',
    group,
    toiletSeat,
    dropZones,
    /** Start the flush animation (button press, water swirl, soft wobble). @returns {number} seconds */
    flush() { flushT = 0; return FLUSH_SECONDS; },
    update(dt) {
      if (flushT < 0) return;
      flushT += dt;
      const p = Math.min(1, flushT / FLUSH_SECONDS);
      const press = p < 0.12 ? ease.out(p / 0.12) : p < 0.3 ? 1 : p < 0.55 ? 1 - ease.inOut((p - 0.3) / 0.25) : 0;
      button.position.y = BUTTON_Y - 0.02 - press * 0.045;
      const swirl = Math.sin(Math.PI * Math.min(1, p * 1.15));
      water.rotation.y += dt * swirl * 13;
      const drain = Math.max(0, swirl);
      water.scale.set(1 - drain * 0.22, 1, (1 - drain * 0.22) * 1.13);
      water.position.y = WATER_Y + 0.005 - drain * 0.05;
      const w = Math.sin(p * Math.PI * 3) * (1 - p) * 0.03;
      toilet.scale.set(1 - w * 0.5, 1 + w, 1 - w * 0.5);
      if (p >= 1) { flushT = -1; toilet.scale.set(1, 1, 1); water.scale.set(1, 1, 1.13); water.position.y = WATER_Y + 0.005; button.position.y = BUTTON_Y - 0.02; }
    },
  });
}
