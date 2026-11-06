/**
 * living.js — ห้องนั่งเล่น (owner: prop-living).
 *
 * Fixed part of the room (never swapped): shell with a soft wainscot and dotted
 * wallpaper, toy ball (live, rocks gently), and wide-screen decor (cabinet, shelves,
 * bookcase, pouf, big plant). The seven furniture slots (sofa, rug, wall, window,
 * corner, lamp, side) are built by the items registered in
 * `src/props/furniture/living-basic.js` and `living-xmas.js`; anchors are in
 * `living-common.js`. Evening look (setTheme('dark')): dusk sky with moon and stars in
 * the window, lamps glow warmly, halos on the wall.
 */
import * as THREE from 'three';
import { ClayBuilder, PALETTE, NIGHT, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, brandGradientX } from '../props/clay.js';
import { addShell, makeRoom } from './shell.js';
import { W } from '../props/furniture/living-common.js';
import '../props/furniture/living-basic.js';
import '../props/furniture/living-xmas.js';

const P = PALETTE.living;
const N = NIGHT.living;
const WHITE = '#FFFFFF';
const INK = PALETTE.ink;

/** Build the living room (fixed part; createRoom fills the slots). @returns {ReturnType<typeof makeRoom>} */
export function buildLiving() {
  const b = new ClayBuilder({ shadowColor: P.shadow, shadowOpacity: 0.22, themed: true, nightShadowColor: N.shadow });
  addShell(b, P, N);
  const liveGroup = new THREE.Group();

  // --- wall dressing: soft wainscot band, rounded chair rail, panel insets, dotted wallpaper
  b.add(roundedBox(32, 1.0, 0.04, 0.02), '#ECEAF8', { position: [0, 0.55, W - 0.01], shade: 0, night: '#55528A' });
  b.add(roundedBox(32, 0.08, 0.1, 0.04), WHITE, { position: [0, 1.07, W + 0.02], shade: 0, night: '#6A67A0' });
  for (let i = -10; i <= 10; i++) b.add(roundedBox(1.15, 0.6, 0.02, 0.1), '#F1EFFA', { position: [i * 1.45, 0.6, W + 0.02], shade: 0, night: '#5B5891' });
  const dot = lighten(P.wall, 0.75);
  for (let r = 0; r < 9; r++) for (let c = -17; c <= 17; c++) {
    const x = c * 0.42 + (r % 2) * 0.21, y = 1.45 + r * 0.42;
    b.add(circle(0.03, 10), dot, { position: [x, y, W - 0.025], shade: 0, night: '#625F98' });
  }

  // --- right wide-screen decor: cabinet with books, vase and figurines, framed blob, yarn basket
  const cx = 3.6, cz = -2.55;
  b.add(roundedBox(2.0, 0.92, 0.7, 0.18), lighten(BRAND.periwinkle, 0.62), { position: [cx, 0.5, cz] });
  for (const s of [-1, 1]) {
    b.add(roundedBox(0.9, 0.72, 0.04, 0.12), lighten(BRAND.periwinkle, 0.72), { position: [cx + s * 0.48, 0.5, cz + 0.35] });
    b.add(sphere(0.04, 10, 8), WHITE, { position: [cx + s * 0.1, 0.56, cz + 0.39] });
    b.add(puck(0.06, 0.06, 10), lighten(BRAND.periwinkle, 0.4), { position: [cx + s * 0.85, 0, cz + 0.22] });
  }
  b.add(roundedBox(2.06, 0.08, 0.76, 0.04), WHITE, { position: [cx, 0.98, cz] });
  const books = [[BRAND.pink, 0.5], [BRAND.lavender, 0.58], [BRAND.periwinkle, 0.44], [BRAND.teal, 0.4]];
  books.forEach(([c, h], i) => b.add(roundedBox(0.15, h, 0.4, 0.05), lighten(c, 0.35), { position: [cx - 0.78 + i * 0.17, 1.02 + h / 2, cz], rotation: [0, 0, i === 3 ? -0.2 : 0] }));
  b.add(lathe([[0, 0], [0.12, 0], [0.18, 0.12], [0.16, 0.26], [0.07, 0.36], [0.08, 0.42], [0, 0.42]], 18), WHITE, { position: [cx + 0.5, 1.02, cz] });
  for (const [dx, dy, c] of [[-0.06, 0.62, BRAND.pink], [0.07, 0.6, BRAND.lavender], [0, 0.7, BRAND.periwinkle]]) {
    b.add(capsule(0.008, 0.2, 2, 4), lighten(BRAND.teal, 0.3), { position: [cx + 0.5 + dx * 0.5, 1.02 + dy - 0.12, cz] });
    b.add(sphere(0.055, 12, 8), lighten(c, 0.35), { position: [cx + 0.5 + dx, 1.02 + dy, cz] });
  }
  // two little blob figurines
  for (const [fx, s, seed] of [[cx - 0.05, 0.12, 4], [cx + 0.18, 0.09, 9]]) {
    b.add(blob(s, { seed, wobble: 0.08, detail: 3 }), brandGradientX(-s, s, 0.4), { position: [fx, 1.02 + s, cz + 0.1] });
    for (const k of [-1, 1]) b.add(sphere(s * 0.1, 6, 4), INK, { position: [fx + k * s * 0.35, 1.02 + s * 1.15, cz + 0.1 + s * 0.92] });
  }
  b.addShadow(cx, cz + 0.05, 2.6, 0.9);
  b.addWallShadow(cx, 0.6, W + 0.035, 2.4, 1.2, 0.4);
  b.addWallShadow(cx + 0.02, 2.42, W, 0.9, 0.9, 0.5);
  b.add(roundedBox(0.6, 0.6, 0.06, 0.2), WHITE, { position: [cx, 2.45, W + 0.03] });
  b.add(blob(0.2, { seed: 8 }), brandGradientX(-0.25, 0.25, 0.4), { position: [cx, 2.45, W + 0.08], scale: [1.1, 1, 0.18], shade: 0 });
  // yarn basket
  b.add(lathe([[0, 0], [0.22, 0], [0.27, 0.22], [0.29, 0.26], [0, 0.25]], 22), '#F3E3D3', { position: [2.45, 0, -1.9] });
  for (const [dx, dz, c] of [[-0.08, 0, BRAND.pink], [0.1, 0.03, BRAND.teal], [0.0, -0.08, BRAND.lavender]]) b.add(sphere(0.12, 14, 10), lighten(c, 0.4), { position: [2.45 + dx, 0.3, -1.9 + dz] });
  b.add(capsule(0.012, 0.35, 2, 5), lighten(BRAND.pink, 0.4), { position: [2.66, 0.35, -1.85], rotation: [0.2, 0, -0.5] });
  b.addShadow(2.45, -1.88, 0.8, 0.55);
  // big leafy plant at the far right
  b.add(lathe([[0, 0], [0.3, 0], [0.38, 0.6], [0.42, 0.66], [0, 0.66]], 24), WHITE, { position: [5.55, 0, -2.4] });
  for (const [dx, dy, s, seed] of [[0, 1.3, 0.5, 31], [-0.35, 1.0, 0.38, 32], [0.35, 1.05, 0.4, 33], [0.05, 1.75, 0.34, 34]]) {
    b.add(blob(s, { seed, detail: 3, wobble: 0.1 }), lighten(BRAND.teal, 0.2 + (seed % 2) * 0.15), { position: [5.55 + dx, dy, -2.4], scale: [1, 1.15, 0.9] });
  }
  b.addShadow(5.55, -2.35, 1.3, 0.8);

  // --- left wide-screen decor: wall shelf, pouf, bookcase
  const sx = -3.75;
  b.addWallShadow(sx, 2.0, W, 1.9, 0.35, 0.5);
  b.add(roundedBox(1.6, 0.1, 0.32, 0.05), WHITE, { position: [sx, 2.08, W + 0.16] });
  b.add(lathe([[0, 0], [0.11, 0], [0.13, 0.18], [0, 0.18]], 16), lighten(BRAND.pink, 0.45), { position: [sx - 0.45, 2.13, W + 0.16] });
  b.add(blob(0.13, { seed: 4, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [sx - 0.45, 2.41, W + 0.16], scale: [1, 1.2, 1] });
  b.add(roundedBox(0.34, 0.3, 0.2, 0.08), lighten(BRAND.lavender, 0.45), { position: [sx + 0.4, 2.28, W + 0.16] });
  b.add(blob(0.1, { seed: 6, wobble: 0.08, detail: 3 }), brandGradientX(-0.1, 0.1, 0.4), { position: [sx, 2.23, W + 0.16] });
  for (const k of [-1, 1]) b.add(sphere(0.01, 6, 4), INK, { position: [sx + k * 0.035, 2.25, W + 0.25] });
  b.add(puck(0.55, 0.5, 28), lighten(BRAND.lavender, 0.45), { position: [-3.3, 0, -1.5] });
  b.add(torus(0.5, 0.06, 8, 28), lighten(BRAND.lavender, 0.3), { position: [-3.3, 0.42, -1.5], rotation: [Math.PI / 2, 0, 0] });
  b.addStitches([-3.82, 0.25, -1.0], [-2.78, 0.25, -1.0], 10, lighten(BRAND.lavender, 0.25), { r: 0.012 });
  b.addShadow(-3.3, -1.5, 1.5, 1.1);
  const bx = -5.4, bz = -2.6;
  b.add(roundedBox(1.3, 2.1, 0.6, 0.16), WHITE, { position: [bx, 1.05, bz] });
  for (let r = 0; r < 3; r++) {
    b.add(roundedBox(1.1, 0.5, 0.05, 0.06), lighten(BRAND.periwinkle, 0.8), { position: [bx, 0.42 + r * 0.62, bz + 0.27] });
    for (let i = 0; i < 4 - (r % 2); i++) {
      const c = [BRAND.pink, BRAND.lavender, BRAND.periwinkle, BRAND.teal][(i + r) % 4], h = 0.3 + ((i + r) % 3) * 0.05;
      b.add(roundedBox(0.12, h, 0.3, 0.04), lighten(c, 0.38), { position: [bx - 0.4 + i * 0.15 + r * 0.05, 0.2 + r * 0.62 + h / 2, bz + 0.12] });
    }
  }
  b.add(sphere(0.13, 14, 10), lighten(BRAND.pink, 0.45), { position: [bx + 0.3, 0.95, bz + 0.12] });
  b.addShadow(bx, bz + 0.05, 1.8, 0.9);
  b.addWallShadow(bx, 1.1, W + 0.035, 1.6, 2.4, 0.35);

  // --- toy ball on the rug, front right of the pet (rocks gently)
  const ball = new ClayBuilder({ themed: true }).add(sphere(0.22, 28, 18), (x, y, z, c) => {
    const a = Math.atan2(z, x); const k = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 6) % 3;
    c.set(Math.abs(y) > 0.19 ? WHITE : [lighten(BRAND.pink, 0.3), lighten(BRAND.periwinkle, 0.3), WHITE][k]);
  }, { shade: 0.1 }).buildMesh('living:toyBall');
  const ballPos = new THREE.Vector3(1.08, 0.22 + 0.045, 1.2);
  ball.position.copy(ballPos);
  liveGroup.add(ball);
  b.addShadow(ballPos.x, ballPos.z + 0.04, 0.65, 0.42, 0.05);

  const staticGroup = new THREE.Group();
  staticGroup.add(b.build('living:static'));

  return makeRoom({
    id: 'living',
    staticGroup,
    liveGroup,
    update(dt, t) {
      ball.rotation.z = Math.sin(t * 0.9) * 0.08;
      ball.position.x = ballPos.x - Math.sin(t * 0.9) * 0.08 * 0.22;
    },
  });
}
