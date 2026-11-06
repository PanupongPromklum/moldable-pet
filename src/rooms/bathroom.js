/**
 * bathroom.js — ห้องน้ำ (owner: prop-utility, S4-03).
 * Fixed decor: rounded toilet (bowl, seat, open lid, tank, push button) back-right of
 * the pet, pedestal sink with soap and a toothbrush cup back-left, tiled wainscot,
 * globe sconce, toilet-paper holder; bathtub with bubbles and a clay duck, bottle
 * shelf, plant and round window for wide screens.
 * Furniture slots (src/props/furniture/bathroom-items.js): `mirror`, `wall`, `rug`.
 *
 * Static / live split (Sprint 4 bake): live = toilet group (body, flush button,
 * water — wobble and flush), tub bubbles (one instanced mesh) and the bobbing duck.
 * Everything else is static. Evening look (setTheme('dark')): the globe sconce
 * glows, the small round window (wide screens) shows a dusk sky with soft stars.
 *
 * Contract extras: `toiletSeat` (room-local = world while room.group sits at the
 * origin), `dropZones.toilet`, `flush()` → duration in seconds.
 */
import * as THREE from 'three';
import {
  ClayBuilder, PALETTE, NIGHT, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, gradientY,
  getSharedClayMaterial,
} from '../props/clay.js';
import { addShell, makeRoom, WALL_Z, ease } from './shell.js';
import { TINT, tileWall, heartShape } from '../props/furniture/kitchen-bath-shared.js';
import '../props/furniture/bathroom-items.js';   // registers mirror / wall / rug items

const P = PALETTE.bathroom;
const N = NIGHT.bathroom;
const W = WALL_Z + 0.04;
/** Flush animation length in seconds (animation timing, not a gameplay value). */
export const FLUSH_SECONDS = 1.2;
/** Toilet placement: back-right of petSpot, about 2.1 units away, turned toward the pet. */
const TOILET_POS = new THREE.Vector3(1.0, 0, -1.85);
const TOILET_YAW = -0.38;
const SEAT_LOCAL = new THREE.Vector3(0, 0.8, 0.04);

/** Build the bathroom. @returns {ReturnType<typeof makeRoom>} */
export function buildBathroom() {
  const WHITE = '#FFFFFF';
  const b = new ClayBuilder({ shadowColor: P.shadow, shadowOpacity: 0.2, themed: true, nightShadowColor: N.shadow });
  addShell(b, P, N);
  const staticGroup = new THREE.Group(), liveGroup = new THREE.Group();

  // --- wainscot: rounded tiles across the visible wall, white cap with tiny beads
  b.add(roundedBox(32, 1.25, 0.05, 0.02), P.trim, { position: [0, 0.62, W], shade: 0, night: N.trim });
  tileWall(b, { x0: -6.6, x1: 6.6, y0: 0.05, y1: 1.22, z: W + 0.025, size: 0.31, colors: ['#F4F9FB', '#E4EFF4', '#F4F9FB', lighten(BRAND.periwinkle, 0.8)],
    grout: '#DDE9EF', groutNight: N.trim, night: [N.trim, lighten(N.trim, 0.06), N.trim, lighten(N.trim, 0.1)] });
  b.add(roundedBox(32, 0.09, 0.12, 0.045), '#FFFFFF', { position: [0, 1.27, W + 0.03], shade: 0 });
  for (let i = 0; i < 44; i++) b.add(sphere(0.022, 8, 6), i % 2 ? TINT.periSoft : TINT.pinkSoft, { position: [-6.45 + i * 0.3, 1.27, W + 0.095], scale: [1, 1, 0.6], shade: 0 });

  // --- toilet (own group so it can wobble on flush)
  const toilet = new THREE.Group();
  toilet.name = 'bathroom:toilet';
  toilet.position.copy(TOILET_POS);
  toilet.rotation.y = TOILET_YAW;
  const tb = new ClayBuilder({ themed: true });
  tb.add(lathe([[0, 0], [0.3, 0], [0.33, 0.04], [0.27, 0.18], [0.25, 0.36], [0.32, 0.47], [0, 0.47]], 28), WHITE, { scale: [1, 1, 1.12], shade: 0.08 });
  tb.add(lathe([[0, 0.4], [0.34, 0.42], [0.47, 0.54], [0.53, 0.66], [0.53, 0.71], [0.45, 0.735], [0.4, 0.66], [0.3, 0.6], [0, 0.58]], 32), WHITE, { scale: [1, 1, 1.15], shade: 0.06 });
  tb.add(puck(0.34, 0.025, 24), PALETTE.steel, { scale: [1, 1, 1.12], shade: 0 });
  tb.add(torus(0.44, 0.07, 10, 36), lighten(BRAND.periwinkle, 0.72), { position: [0, 0.77, 0.02], rotation: [Math.PI / 2, 0, 0], scale: [1, 1.14, 1], shade: 0.02 });
  tb.add(roundedBox(0.92, 0.86, 0.36, 0.17), WHITE, { position: [0, 1.17, -0.56], shade: 0.05 });
  tb.add(roundedBox(0.98, 0.1, 0.42, 0.05), lighten(BRAND.periwinkle, 0.78), { position: [0, 1.63, -0.56], shade: 0 });
  tb.add(roundedBox(0.3, 0.26, 0.5, 0.12), WHITE, { position: [0, 0.6, -0.42] }); // neck between bowl and tank
  tb.add(puck(0.47, 0.06, 32), lighten(BRAND.periwinkle, 0.72), { position: [0, 1.25, -0.31], rotation: [Math.PI / 2 - 0.2, 0, 0], scale: [1, 1, 1.12], shade: 0 });
  tb.add(heartShape(0.16), lighten(BRAND.pink, 0.45), { position: [0, 1.2, -0.37], scale: [1, 1, 0.4], shade: 0 });
  tb.add(torus(0.4, 0.018, 6, 36), lighten(BRAND.periwinkle, 0.55), { position: [0, 0.71, 0.02], rotation: [Math.PI / 2, 0, 0], scale: [1.2, 1.32, 1], shade: 0 });
  const toiletBody = tb.buildMesh('bathroom:toiletBody');
  toilet.add(toiletBody);

  const BUTTON_Y = 1.69;
  const button = new ClayBuilder({ themed: true }).add(puck(0.1, 0.07, 18), BRAND.periwinkle, { shade: 0.1 }).buildMesh('bathroom:flushHandle');
  button.position.set(0.18, BUTTON_Y - 0.02, -0.56);
  toilet.add(button);

  const WATER_Y = 0.6;
  const wc = [new THREE.Color('#C6D8EE'), new THREE.Color('#EEF4FB')];
  const waterGeo = circle(0.39, 48); waterGeo.rotateX(-Math.PI / 2);
  const water = new ClayBuilder({ themed: true }).add(waterGeo, (x, y, z, c) => {
    const a = Math.atan2(z, x), r = Math.hypot(x, z);
    c.copy(wc[0]).lerp(wc[1], 0.5 + 0.5 * Math.sin(3 * a + r * 16));
  }, { shade: 0 }).buildMesh('bathroom:water');
  water.position.set(0, WATER_Y + 0.005, 0.01);
  water.scale.set(1, 1, 1.13);
  toilet.add(water);
  liveGroup.add(toilet);
  b.addShadow(TOILET_POS.x - 0.05, TOILET_POS.z - 0.15, 1.6, 1.4);

  // toilet paper (wall, right of toilet) with a tiny shelf and a plant on it
  b.add(capsule(0.025, 0.26, 2, 8), PALETTE.steel, { position: [2.0, 0.95, W + 0.2], rotation: [0, 0, Math.PI / 2] });
  b.add(puck(0.13, 0.22, 20), WHITE, { position: [2.1, 0.86, W + 0.2], rotation: [0, 0, Math.PI / 2] });
  b.add(puck(0.045, 0.23, 12), '#EEE6EA', { position: [2.1, 0.86, W + 0.2], rotation: [0, 0, Math.PI / 2] });
  b.add(roundedBox(0.1, 0.24, 0.012, 0.03), WHITE, { position: [2.1, 0.68, W + 0.33] });
  b.add(roundedBox(0.4, 0.06, 0.22, 0.03), WHITE, { position: [2.08, 1.16, W + 0.13] });
  b.add(lathe([[0, 0], [0.07, 0], [0.08, 0.1], [0, 0.1]], 14), TINT.pink, { position: [1.98, 1.19, W + 0.13] });
  b.add(blob(0.08, { seed: 41, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [1.98, 1.35, W + 0.13], scale: [1, 1.2, 1] });

  // --- pedestal sink (left, under the mirror slot) with soap and a toothbrush cup
  const kx = -0.78, kz = -2.6;
  b.add(lathe([[0, 0], [0.2, 0], [0.22, 0.04], [0.13, 0.25], [0.12, 0.7], [0.2, 0.84], [0, 0.84]], 22), WHITE, { position: [kx, 0, kz] });
  b.add(lathe([[0, 0.78], [0.3, 0.8], [0.44, 0.92], [0.46, 1.02], [0.4, 1.04], [0.3, 0.96], [0, 0.94]], 28), WHITE, { position: [kx, 0, kz + 0.06], scale: [1, 1, 0.8] });
  b.add(torus(0.43, 0.014, 5, 32), TINT.periSoft, { position: [kx, 1.0, kz + 0.06], rotation: [Math.PI / 2, 0, 0], scale: [1, 0.8, 1], shade: 0 });
  b.add(capsule(0.035, 0.18, 3, 8), PALETTE.steel, { position: [kx, 1.12, kz - 0.22] });
  b.add(capsule(0.03, 0.12, 3, 8), PALETTE.steel, { position: [kx, 1.24, kz - 0.14], rotation: [Math.PI / 2, 0, 0] });
  b.add(sphere(0.05, 10, 8), BRAND.periwinkle, { position: [kx + 0.16, 1.1, kz - 0.22] });
  b.add(sphere(0.05, 10, 8), TINT.pink, { position: [kx - 0.16, 1.1, kz - 0.22] });
  // soap dish + soap (right of the tap)
  b.add(puck(0.09, 0.025, 16), TINT.tealSoft, { position: [kx + 0.3, 1.02, kz - 0.05], scale: [1.3, 1, 1] });
  b.add(roundedBox(0.13, 0.05, 0.08, 0.025), TINT.pinkSoft, { position: [kx + 0.3, 1.06, kz - 0.05] });
  // toothbrush cup (left of the tap)
  const tbx = kx - 0.3, tby = 1.0, tbz = kz - 0.1;
  b.add(lathe([[0, 0], [0.06, 0], [0.065, 0.02], [0.07, 0.15], [0, 0.15]], 16), TINT.lav, { position: [tbx, tby, tbz] });
  [[-0.025, 0.2, TINT.teal], [0.025, -0.18, TINT.pink]].forEach(([dx, a, c]) => {
    b.add(capsule(0.012, 0.22, 2, 6), c, { position: [tbx + dx - Math.sin(a) * 0.12, tby + 0.24, tbz], rotation: [0, 0, a] });
    b.add(roundedBox(0.025, 0.06, 0.03, 0.01), WHITE, { position: [tbx + dx - Math.sin(a) * 0.24, tby + 0.37, tbz + 0.01], rotation: [0, 0, a] });
  });
  b.addShadow(kx, kz + 0.05, 1.1, 0.8);
  // globe sconce right of the mirror (glows in the evening)
  const gx = kx + 0.82, gy = 2.72;
  b.add(roundedBox(0.16, 0.24, 0.05, 0.06), WHITE, { position: [gx, gy - 0.06, W + 0.03] });
  b.add(capsule(0.025, 0.08, 2, 6), PALETTE.steel, { position: [gx, gy - 0.06, W + 0.11], rotation: [Math.PI / 2, 0, 0] });
  b.addLamp(sphere(0.14, 20, 14), lighten(BRAND.periwinkle, 0.75), { position: [gx, gy + 0.04, W + 0.22], shade: 0.04 });
  b.addHalo(gx, gy, W + 0.02, 1.7, NIGHT.lamp, 0.3);
  b.addHalo(gx, gy + 0.04, W + 0.42, 0.55, NIGHT.lamp, 0.18);

  // --- small round window (right, wide screens)
  const wx = 2.45, wy = 2.62, R = 0.36;
  b.add(torus(R, 0.08, 10, 36), WHITE, { position: [wx, wy, W + 0.04], shade: 0.03 });
  b.addGlow(circle(R, 36), gradientY('#E9F2F8', '#CFE0F6', -R, R * 0.8),
    { position: [wx, wy, W], night: gradientY(NIGHT.skyLow, NIGHT.skyHigh, -R, R * 0.8) });
  b.addGlow(blob(0.08, { seed: 4, detail: 2 }), '#FFFFFF', { position: [wx - 0.08, wy + 0.1, W + 0.01], scale: [1.8, 0.7, 0.2], night: NIGHT.cloud });
  for (const [ax, ay, s_] of [[0.14, 0.18, 0.07], [-0.16, -0.04, 0.05], [0.1, -0.16, 0.06], [0.2, 0.0, 0.05]]) {
    b.addHalo(wx + ax, wy + ay, W + 0.014, s_, NIGHT.star, 0.95);
  }

  // --- bathtub with bubbles and a clay duck (left, desktop)
  const ux = -3.4, uz = -2.25;
  b.add(roundedBox(2.5, 0.85, 1.15, 0.38), WHITE, { position: [ux, 0.5, uz] });
  b.add(roundedBox(2.15, 0.06, 0.82, 0.03), '#D3E0F2', { position: [ux, 0.9, uz], shade: 0 });
  for (const [dx, dz] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) b.add(sphere(0.09, 10, 8), PALETTE.steel, { position: [ux + dx, 0.06, uz + dz] });
  // bubbles + duck are live (soft bob); a static foam bed under them hides the seam
  for (let i = 0; i < 5; i++) b.add(blob(0.16, { seed: 50 + i, wobble: 0.06, detail: 2 }), i % 2 ? '#FFFFFF' : lighten(BRAND.periwinkle, 0.85),
    { position: [ux + 0.35 + (i - 2) * 0.34, 0.92, uz + (i % 2 ? 0.12 : -0.1)], scale: [1.3, 0.35, 1.2], shade: 0, night: '#AEB2DC' });
  b.add(capsule(0.03, 0.9, 3, 8), PALETTE.steel, { position: [ux - 1.0, 1.5, W + 0.12] });
  b.add(capsule(0.03, 0.3, 3, 8), PALETTE.steel, { position: [ux - 1.0, 1.95, W + 0.28], rotation: [Math.PI / 2, 0, 0] });
  b.addShadow(ux, uz + 0.1, 3.1, 1.5);

  // --- bath mat in front of the tub
  b.add(puck(1, 0.04, 36), lighten(BRAND.lavender, 0.45), { position: [ux + 0.2, 0, -0.95], scale: [1.15, 1, 0.62], shade: 0 });
  b.add(torus(0.92, 0.035, 6, 40), lighten(BRAND.lavender, 0.3), { position: [ux + 0.2, 0.04, -0.95], rotation: [Math.PI / 2, 0, 0], scale: [1.15, 0.62, 1], shade: 0 });

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

  staticGroup.add(b.build('bathroom:static'));

  // --- live: tub bubbles (one instanced mesh) and the bobbing duck (one mesh)
  const bubbleGeo = new ClayBuilder({ themed: true }).add(blob(1, { seed: 3, wobble: 0.08, detail: 2 }), '#FFFFFF', { shade: 0.03, night: '#B9BDE4' }).buildMesh('tmp').geometry;
  const BUB = [];
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.15 + (i % 3) * 0.18; BUB.push([ux + 0.35 + Math.cos(a) * r * 1.6, 1.03, uz + Math.sin(a) * r * 0.7, 0.13 + (i % 3) * 0.04]); }
  const bubbles = new THREE.InstancedMesh(bubbleGeo, getSharedClayMaterial(), BUB.length);
  bubbles.name = 'bathroom:bubbles';
  bubbles.frustumCulled = false;   // instance spread is small; the parent room is always in view
  liveGroup.add(bubbles);
  // evening tones set by hand: the automatic shift turns the pale yellow a muddy brown
  const DUCK_NIGHT = '#CDB98A';
  const duckB = new ClayBuilder({ themed: true });
  duckB.add(blob(0.16, { seed: 21, wobble: 0.04, detail: 3 }), '#F6E3A6', { scale: [1.25, 0.85, 1], night: DUCK_NIGHT });
  duckB.add(sphere(0.11, 16, 12), '#F6E3A6', { position: [0.12, 0.18, 0], night: DUCK_NIGHT });
  duckB.add(blob(0.07, { seed: 2, detail: 2 }), '#F9EDC4', { position: [-0.04, 0.03, 0.13], scale: [1.4, 0.8, 0.4], night: '#D6C79E' });
  duckB.add(capsule(0.04, 0.05, 3, 8), lighten(BRAND.pink, 0.15), { position: [0.24, 0.16, 0], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 0.7] });
  for (const s of [-1, 1]) duckB.add(sphere(0.018, 6, 6), PALETTE.ink, { position: [0.17, 0.22, s * 0.08] });
  duckB.add(sphere(0.025, 8, 6), lighten(BRAND.pink, 0.45), { position: [0.18, 0.17, 0.095], scale: [1, 0.7, 0.4] });
  const duck = duckB.buildMesh('bathroom:duck');
  const DUCK = new THREE.Vector3(ux - 0.55, 1.05, uz + 0.15);
  duck.position.copy(DUCK); duck.rotation.y = -0.5;
  liveGroup.add(duck);
  const mtx = new THREE.Matrix4(), bp = new THREE.Vector3(), bq = new THREE.Quaternion(), bs = new THREE.Vector3();
  const updateTub = (t) => {
    BUB.forEach(([x, y, z, r], i) => {
      const k = 1 + Math.sin(t * 1.6 + i * 1.7) * 0.06;
      bp.set(x, y + Math.sin(t * 1.2 + i) * 0.012, z); bs.set(r * k, r * 0.6 / k, r * k);
      bubbles.setMatrixAt(i, mtx.compose(bp, bq, bs));
    });
    bubbles.instanceMatrix.needsUpdate = true;
    duck.position.y = DUCK.y + Math.sin(t * 1.4) * 0.02;
    duck.rotation.z = Math.sin(t * 1.4 + 0.8) * 0.06;
  };
  updateTub(0);

  // --- contract points
  toilet.updateMatrix();
  const toiletSeat = SEAT_LOCAL.clone().applyMatrix4(toilet.matrix);
  const dropZones = { toilet: { position: toiletSeat.clone(), radius: 0.9 } };

  let flushT = -1;
  return makeRoom({
    id: 'bathroom',
    staticGroup,
    liveGroup,
    toiletSeat,
    dropZones,
    /** Start the flush animation (button press, water swirl, soft wobble). @returns {number} seconds */
    flush() { flushT = 0; return FLUSH_SECONDS; },
    update(dt, t = 0) {
      updateTub(t);
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
