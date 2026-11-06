/**
 * living-basic.js — basic ("พื้นฐาน") living-room furniture (owner: prop-living).
 * Registers: sofa-classic*, sofa-cloud, rug-round*, rug-flower, frame-blob*, wall-books,
 * window-round*, window-arch, plant-pot*, plant-tall, lamp-floor*, lamp-mushroom,
 * table-mug*, toy-box. (* = slot default, today's look refined.)
 */
import { registerFurniture } from '../../rooms/furniture.js';
import { brandGradientX } from '../clay.js';
import {
  A, W, sofaBody, pillow, archWindow, skyCloud, nightSky, arcLampBody, leafMesh, pot, sway,
  THREE, PALETTE, NIGHT, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, gradientY, tube,
} from './living-common.js';

const WHITE = '#FFFFFF';
const INK = PALETTE.ink;

/* ================================================================== sofa */

registerFurniture('sofa-classic', ({ b }) => {
  sofaBody(b, { base: '#D3CDEB', back: '#DCD7F1', arm: '#D8D2EE', seat: '#E3DEF4', cushion: '#E3DEF4', foot: '#BFB6E0', stitch: '#C8C1E5', button: '#CFC8EA' });
  const z = A.sofa.z - 0.02;
  pillow(b, 1.3, 1.04, z, 0.52, lighten(BRAND.pink, 0.55), { tilt: 0.18, seam: lighten(BRAND.pink, 0.35) });
  pillow(b, -1.3, 1.02, z, 0.48, lighten(BRAND.periwinkle, 0.5), { tilt: -0.14, seam: lighten(BRAND.periwinkle, 0.3) });
  // tiny heart on the pink pillow
  for (const s of [-1, 1]) b.add(sphere(0.045, 10, 8), lighten(BRAND.pink, 0.15), { position: [1.3 + s * 0.035, 1.06, z + 0.12], scale: [1, 1, 0.4] });
  b.add(sphere(0.042, 10, 8), lighten(BRAND.pink, 0.15), { position: [1.3, 1.025, z + 0.115], scale: [1, 1.2, 0.4], rotation: [0, 0, Math.PI / 4] });
});

registerFurniture('sofa-cloud', ({ b }) => {
  const sz = A.sofa.z;
  const C1 = lighten(BRAND.periwinkle, 0.8), C2 = lighten(BRAND.periwinkle, 0.88), C3 = '#FFFFFF';
  b.add(roundedBox(3.2, 0.56, 1.0, 0.27), C1, { position: [0, 0.36, sz + 0.02] });
  // cloud back: overlapping puffs along a gentle arc
  [[-1.3, 1.02, 0.42], [-0.68, 1.18, 0.5], [0, 1.26, 0.55], [0.68, 1.18, 0.5], [1.3, 1.02, 0.42]].forEach(([x, y, r], i) =>
    b.add(sphere(r, 28, 18), i % 2 ? C2 : C1, { position: [x, y, sz - 0.34], scale: [1.05, 1, 0.55], shade: 0.05 }));
  b.add(roundedBox(3.1, 0.6, 0.38, 0.18), C1, { position: [0, 0.85, sz - 0.36] });
  // round puff arms
  for (const s of [-1, 1]) {
    b.add(sphere(0.42, 26, 18), C2, { position: [s * 1.62, 0.62, sz + 0.08], scale: [0.85, 1, 1.2], shade: 0.06 });
    b.add(sphere(0.22, 18, 12), C3, { position: [s * 1.66, 0.82, sz + 0.42], scale: [1, 1, 0.6], shade: 0.04 });
    // puffy seat cushion
    b.add(blob(0.5, { seed: 3 + s, wobble: 0.05, detail: 3 }), C3, { position: [s * 0.66, 0.72, sz + 0.1], scale: [1.4, 0.34, 0.8], shade: 0.05 });
    for (const z of [-0.34, 0.34]) b.add(sphere(0.085, 12, 8), lighten(BRAND.lavender, 0.45), { position: [s * 1.45, 0.05, sz + z], scale: [1, 0.7, 1] });
  }
  // tiny cloud cushion + sun cushion
  b.add(blob(0.24, { seed: 12, wobble: 0.1, detail: 3 }), WHITE, { position: [-1.28, 1.02, sz + 0.02], scale: [1.25, 0.8, 0.45], rotation: [-0.1, 0, -0.1] });
  b.add(puck(0.24, 0.14, 26), '#F7E4B8', { position: [1.3, 1.04, sz + 0.02], rotation: [Math.PI / 2 - 0.12, 0, 0] });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.add(sphere(0.045, 8, 6), '#F7E4B8', { position: [1.3 + Math.cos(a) * 0.3, 1.04 + Math.sin(a) * 0.3, sz + 0.06], scale: [1, 1, 0.5] }); }
  b.add(sphere(0.02, 6, 6), INK, { position: [1.24, 1.08, sz + 0.17] }); b.add(sphere(0.02, 6, 6), INK, { position: [1.36, 1.08, sz + 0.17] });
  b.addShadow(0, sz + 0.12, 4.2, 1.6);
  b.addWallShadow(0, 1.1, W + 0.035, 3.9, 2.0, 0.45);
});

/* ================================================================== rug */

registerFurniture('rug-round', ({ b }) => {
  const { x, z, rx, rz } = A.rug;
  const C0 = '#D9D4F0', C1 = '#E3DFF5';
  b.add(puck(1, 0.035, 48), C0, { position: [x, 0, z], scale: [rx, 1, rz], shade: 0 });
  b.add(puck(1, 0.042, 48), C1, { position: [x, 0, z], scale: [rx * 0.8, 1, rz * 0.76], shade: 0 });
  // stitched ring between the bands + little dots on the inner field
  const n = 56;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2;
    b.addStitches([x + Math.cos(a) * rx * 0.89, 0.04, z + Math.sin(a) * rz * 0.87], [x + Math.cos(a2) * rx * 0.89, 0.04, z + Math.sin(a2) * rz * 0.87], 1, '#C7C0E6', { r: 0.012 });
  }
  for (const [dx, dz, c] of [[-1.25, 0.55, BRAND.pink], [1.3, 0.5, BRAND.teal], [-0.7, 0.95, BRAND.periwinkle], [0.75, 0.98, BRAND.lavender], [0, 1.15, BRAND.pink]]) {
    b.add(puck(0.07, 0.02, 14), lighten(c, 0.45), { position: [x + dx, 0.042, z + dz * 0.8], scale: [1, 1, 0.7], shade: 0 });
  }
});

registerFurniture('rug-flower', ({ b }) => {
  const { x, z, rx, rz } = A.rug;
  const P1 = lighten(BRAND.pink, 0.62), P2 = lighten(BRAND.lavender, 0.55);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    b.add(puck(0.62, 0.035, 32), i % 2 ? P2 : P1, { position: [x + Math.cos(a) * rx * 0.52, 0, z + Math.sin(a) * rz * 0.52], scale: [rx * 0.62, 1, rz * 0.62], shade: 0 });
  }
  b.add(puck(1, 0.03, 40), lighten(BRAND.pink, 0.7), { position: [x, 0, z], scale: [rx * 0.72, 1, rz * 0.72], shade: 0 });
  b.add(puck(0.62, 0.045, 32), '#F8E7BE', { position: [x, 0, z], scale: [1.5, 1, 1.1], shade: 0, night: '#8A7DB6' });   // warm cream turns muddy orange under the evening tint
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.add(puck(0.07, 0.02, 12), '#F2D9A2', { position: [x + Math.cos(a) * 0.62, 0.045, z + Math.sin(a) * 0.46], shade: 0, night: '#B4A6DA' }); }
  // stitched petal veins
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    b.addStitches([x + c * rx * 0.42, 0.04, z + s * rz * 0.42], [x + c * rx * 0.82, 0.04, z + s * rz * 0.82], 5, i % 2 ? lighten(BRAND.lavender, 0.3) : lighten(BRAND.pink, 0.4), { r: 0.012 });
  }
});

/* ================================================================== wall */

registerFurniture('frame-blob', ({ b }) => {
  const { x, y } = A.wall;
  b.addWallShadow(x + 0.03, y - 0.06, W, 0.95, 1.05, 0.55);
  b.add(roundedBox(0.68, 0.8, 0.08, 0.16), '#FBF0F4', { position: [x, y, W + 0.04] });
  b.add(roundedBox(0.52, 0.64, 0.03, 0.12), WHITE, { position: [x, y, W + 0.085], shade: 0 });
  b.add(blob(0.2, { seed: 3, wobble: 0.14 }), brandGradientX(-0.25, 0.25, 0.35), { position: [x, y, W + 0.12], scale: [1.05, 1, 0.22], shade: 0 });
  // tiny round frame with a heart, lower right
  const hx = x + 0.5, hy = y - 0.34;
  b.addWallShadow(hx + 0.02, hy - 0.03, W, 0.4, 0.4, 0.45);
  b.add(torus(0.12, 0.03, 8, 24), lighten(BRAND.periwinkle, 0.55), { position: [hx, hy, W + 0.04] });
  b.add(circle(0.11, 24), WHITE, { position: [hx, hy, W + 0.03] });
  for (const s of [-1, 1]) b.add(sphere(0.03, 8, 6), lighten(BRAND.pink, 0.25), { position: [hx + s * 0.024, hy + 0.012, W + 0.05], scale: [1, 1, 0.4] });
  b.add(sphere(0.03, 8, 6), lighten(BRAND.pink, 0.25), { position: [hx, hy - 0.014, W + 0.05], scale: [1, 1.2, 0.4], rotation: [0, 0, Math.PI / 4] });
  // hanging string + pin
  b.add(capsule(0.006, 0.3, 2, 4), '#E4DDF2', { position: [x - 0.12, y + 0.5, W + 0.02], rotation: [0, 0, -0.55] });
  b.add(capsule(0.006, 0.3, 2, 4), '#E4DDF2', { position: [x + 0.12, y + 0.5, W + 0.02], rotation: [0, 0, 0.55] });
  b.add(sphere(0.025, 8, 6), lighten(BRAND.pink, 0.3), { position: [x, y + 0.6, W + 0.03] });
});

registerFurniture('wall-books', ({ b }) => {
  const { x, y } = A.wall;
  const sy = y - 0.28;
  b.addWallShadow(x, sy - 0.08, W, 1.3, 0.35, 0.6);
  b.add(roundedBox(1.08, 0.08, 0.3, 0.04), WHITE, { position: [x, sy, W + 0.15] });
  for (const s of [-1, 1]) b.add(roundedBox(0.05, 0.16, 0.22, 0.02), '#EDE9F7', { position: [x + s * 0.4, sy - 0.1, W + 0.1] });
  const books = [[BRAND.pink, 0.4, 0.1], [BRAND.lavender, 0.46, 0.12], [BRAND.periwinkle, 0.36, 0.09], [BRAND.teal, 0.42, 0.11]];
  let bx = x - 0.46;
  books.forEach(([c, h, t], i) => {
    b.add(roundedBox(t, h, 0.24, 0.035), lighten(c, 0.4), { position: [bx + t / 2, sy + 0.04 + h / 2, W + 0.15] });
    b.add(roundedBox(t + 0.004, 0.03, 0.245, 0.012), lighten(c, 0.15), { position: [bx + t / 2, sy + 0.04 + h * 0.72, W + 0.15], shade: 0 });
    bx += t + 0.012;
  });
  b.add(roundedBox(0.1, 0.38, 0.24, 0.035), lighten(BRAND.pink, 0.55), { position: [bx + 0.09, sy + 0.22, W + 0.15], rotation: [0, 0, -0.32] });
  // mini blob figurine with a face
  const fx = x + 0.2, fy = sy + 0.04;
  b.add(blob(0.12, { seed: 7, wobble: 0.08, detail: 3 }), brandGradientX(-0.12, 0.12, 0.35), { position: [fx, fy + 0.11, W + 0.16], scale: [1.05, 0.95, 0.9] });
  for (const s of [-1, 1]) b.add(sphere(0.012, 6, 6), INK, { position: [fx + s * 0.04, fy + 0.13, W + 0.27] });
  b.add(sphere(0.018, 6, 6), lighten(BRAND.pink, 0.35), { position: [fx + 0.07, fy + 0.1, W + 0.25], scale: [1, 0.6, 0.4] });
  // tiny succulent
  const px = x + 0.42;
  b.add(lathe([[0, 0], [0.06, 0], [0.075, 0.1], [0, 0.1]], 14), WHITE, { position: [px, sy + 0.04, W + 0.15] });
  for (let i = 0; i < 5; i++) { const a = i * 1.26; b.add(sphere(0.04, 10, 8), lighten(BRAND.teal, 0.35), { position: [px + Math.cos(a) * 0.03, sy + 0.18, W + 0.15 + Math.sin(a) * 0.03], scale: [0.8, 1.3, 0.8], rotation: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }); }
  // upper little shelf with a round clock
  const cy = y + 0.3;
  b.addWallShadow(x - 0.22, cy - 0.02, W, 0.45, 0.45, 0.45);
  b.add(puck(0.17, 0.06, 26), lighten(BRAND.periwinkle, 0.6), { position: [x - 0.22, cy, W + 0.01], rotation: [Math.PI / 2, 0, 0] });
  b.add(circle(0.13, 26), WHITE, { position: [x - 0.22, cy, W + 0.075] });
  b.add(roundedBox(0.02, 0.09, 0.01, 0.008), INK, { position: [x - 0.22, cy + 0.035, W + 0.08] });
  b.add(roundedBox(0.07, 0.018, 0.01, 0.008), INK, { position: [x - 0.19, cy, W + 0.08] });
  b.add(sphere(0.018, 6, 6), BRAND.pink, { position: [x - 0.22, cy, W + 0.085] });
});

/* ================================================================== window */

registerFurniture('window-round', ({ b }) => {
  const { x: wx, y: wy, r: R } = A.window;
  b.addWallShadow(wx + 0.03, wy - 0.05, W, R * 2.7, R * 2.7, 0.45);
  b.add(torus(R, 0.1, 10, 40), WHITE, { position: [wx, wy, W + 0.04], shade: 0.03 });
  b.addGlow(circle(R, 40), gradientY('#F7E3EE', '#CFE0F6', -R, R * 0.8), { position: [wx, wy, W], night: gradientY(NIGHT.skyLow, NIGHT.skyHigh, -R, R * 0.8) });
  skyCloud(b, wx - 0.2, wy + 0.18, 1.2, 2, NIGHT.cloud);
  skyCloud(b, wx + 0.24, wy - 0.06, 1.0, 5, NIGHT.cloud);
  // soft far hills at the bottom of the view
  b.addGlow(blob(0.3, { seed: 4, detail: 2, wobble: 0.05 }), lighten(BRAND.teal, 0.62), { position: [wx - 0.15, wy - R * 0.95, W + 0.005], scale: [1.6, 0.6, 0.05], night: '#6E6AA8' });
  nightSky(b, wx, wy, [0.25, 0.25, 0.16], [[-0.28, 0.3, 0.09], [-0.05, 0.38, 0.06], [0.08, 0.16, 0.07], [-0.34, 0.02, 0.06], [0.32, -0.1, 0.07]]);
  b.add(roundedBox(R * 1.9, 0.06, 0.05, 0.025), WHITE, { position: [wx, wy, W + 0.05] });
  b.add(roundedBox(0.06, R * 1.9, 0.05, 0.025), WHITE, { position: [wx, wy, W + 0.05] });
  const sy = wy - R - 0.08;
  b.add(roundedBox(R * 2.2, 0.1, 0.26, 0.05), WHITE, { position: [wx, sy, W + 0.11] });
  b.addWallShadow(wx, sy - 0.1, W, R * 2.6, 0.26, 0.5);
  // little dome lamp on the sill (glows in the evening)
  const sl = [wx + 0.36, sy + 0.05, W + 0.13];
  b.add(puck(0.08, 0.04, 16), WHITE, { position: sl });
  b.add(capsule(0.016, 0.07, 2, 6), WHITE, { position: [sl[0], sl[1] + 0.07, sl[2]] });
  b.addLamp(lathe([[0, 0], [0.13, 0], [0.135, 0.02], [0.105, 0.09], [0.05, 0.13], [0, 0.14]], 20), lighten(BRAND.pink, 0.55), { position: [sl[0], sl[1] + 0.1, sl[2]], shade: 0.03 });
  b.addHalo(sl[0], sl[1] + 0.12, W + 0.02, 1.1, NIGHT.lamp, 0.3);
  // tiny pot on the other side
  b.add(lathe([[0, 0], [0.06, 0], [0.075, 0.11], [0, 0.11]], 14), lighten(BRAND.lavender, 0.4), { position: [wx - 0.36, sy + 0.05, W + 0.13] });
  b.add(blob(0.07, { seed: 9, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [wx - 0.36, sy + 0.22, W + 0.13], scale: [1, 1.2, 1] });
});

registerFurniture('window-arch', ({ b }) => {
  const frame = lighten(BRAND.pink, 0.78);
  const o = archWindow(b, { frame, skyDay: ['#FBE7E4', '#CFE3F3'], skyNight: [NIGHT.skyLow, NIGHT.skyHigh] });
  b.addWallShadow(o.x + 0.03, o.y - 0.04, W, o.w * 1.6, o.h * 1.35, 0.4);
  skyCloud(b, o.x - 0.15, o.y + 0.28, 1.1, 8, NIGHT.cloud);
  skyCloud(b, o.x + 0.2, o.y - 0.05, 0.9, 6, NIGHT.cloud);
  b.addGlow(blob(0.3, { seed: 7, detail: 2, wobble: 0.05 }), lighten(BRAND.teal, 0.6), { position: [o.x + 0.1, o.y - o.h / 2 + 0.02, W + 0.005], scale: [1.4, 0.5, 0.05], night: '#6E6AA8' });
  nightSky(b, o.x, o.y, [-0.2, 0.3, 0.14], [[0.22, 0.38, 0.07], [0.05, 0.15, 0.06], [0.28, 0.05, 0.06], [-0.28, -0.05, 0.05]]);
  // scalloped valance on top
  for (let i = 0; i < 5; i++) b.add(sphere(0.1, 14, 10), lighten(BRAND.pink, 0.6), { position: [o.x - 0.36 + i * 0.18, o.y + o.h / 2 + 0.05, W + 0.1], scale: [1, 0.75, 0.45] });
  // sill: cactus pot + mug
  b.add(lathe([[0, 0], [0.07, 0], [0.085, 0.12], [0, 0.12]], 14), WHITE, { position: [o.x - 0.32, o.sillY + 0.05, W + 0.13] });
  b.add(capsule(0.055, 0.1, 4, 10), lighten(BRAND.teal, 0.3), { position: [o.x - 0.32, o.sillY + 0.27, W + 0.13] });
  b.add(capsule(0.03, 0.04, 3, 8), lighten(BRAND.teal, 0.3), { position: [o.x - 0.25, o.sillY + 0.28, W + 0.13], rotation: [0, 0, -0.9] });
  b.add(sphere(0.025, 8, 6), lighten(BRAND.pink, 0.2), { position: [o.x - 0.32, o.sillY + 0.39, W + 0.13] });
  b.add(lathe([[0, 0], [0.06, 0], [0.065, 0.12], [0, 0.11]], 14), lighten(BRAND.lavender, 0.45), { position: [o.x + 0.3, o.sillY + 0.05, W + 0.13] });
  b.add(torus(0.035, 0.01, 4, 10, Math.PI), lighten(BRAND.lavender, 0.45), { position: [o.x + 0.37, o.sillY + 0.11, W + 0.13], rotation: [0, 0, -Math.PI / 2] });
});

/* ================================================================== corner */

registerFurniture('plant-pot', ({ b, live, onUpdate }) => {
  const { x, z } = A.corner;
  const h = pot(b, x, z, { r: 0.3, h: 0.62, color: lighten(BRAND.lavender, 0.3), band: lighten(BRAND.lavender, 0.55), saucer: lighten(BRAND.lavender, 0.5) });
  const L1 = lighten(BRAND.teal, 0.2), L2 = lighten(BRAND.teal, 0.42);
  const leaves = leafMesh([
    { rx: 0, rz: 0, len: 0.9, color: L1 }, { rx: 0.2, rz: 0.55, len: 0.75, color: L2 }, { rx: -0.15, rz: -0.6, len: 0.8, color: L2 },
    { rx: 0.4, rz: 0.15, len: 0.6, color: L1 }, { rx: -0.35, rz: -0.2, len: 0.65, color: L1 }, { rx: 0.1, rz: 1.0, len: 0.55, color: L1 }, { rx: 0, rz: -1.05, len: 0.55, color: L2 },
  ], 'living:plantLeaves');
  leaves.position.set(x, h - 0.04, z);
  live.add(leaves);
  onUpdate(sway(leaves));
});

registerFurniture('plant-tall', ({ b, live, onUpdate }) => {
  const { x, z } = A.corner;
  const h = pot(b, x, z - 0.05, { r: 0.28, h: 0.95, color: lighten(BRAND.periwinkle, 0.6), band: WHITE });
  // three little white feet under the tall pot
  for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.5; b.add(sphere(0.05, 8, 6), WHITE, { position: [x + Math.cos(a) * 0.2, 0.03, z - 0.05 + Math.sin(a) * 0.2] }); }
  const D = lighten(BRAND.teal, 0.12), L = lighten(BRAND.teal, 0.34), V = lighten(BRAND.teal, 0.5);
  const leaves = leafMesh([
    { rx: 0, rz: 0.05, len: 1.45, w: 0.55, color: D }, { rx: 0.15, rz: 0.32, len: 1.2, w: 0.6, color: L }, { rx: -0.12, rz: -0.3, len: 1.25, w: 0.6, color: L },
    { rx: 0.3, rz: -0.08, len: 1.0, w: 0.5, color: V }, { rx: -0.3, rz: 0.12, len: 1.05, w: 0.5, color: D }, { rx: 0.05, rz: 0.62, len: 0.8, w: 0.55, color: D }, { rx: 0, rz: -0.62, len: 0.85, w: 0.55, color: V },
  ], 'living:tallLeaves');
  leaves.position.set(x, h - 0.05, z - 0.05);
  live.add(leaves);
  onUpdate(sway(leaves, 0.55, 0.025, 1.3));
});

/* ================================================================== lamp */

registerFurniture('lamp-floor', ({ b }) => {
  const [hx, hy, hz] = arcLampBody(b, '#E3DEF4', '#D8D2EE');
  b.addLamp(lathe([[0, 0], [0.38, 0], [0.39, 0.04], [0.34, 0.16], [0.22, 0.3], [0.07, 0.36], [0, 0.37]], 26), lighten(BRAND.pink, 0.62), { position: [hx, hy - 0.12, hz], shade: 0.03 });
  b.add(torus(0.375, 0.02, 6, 30), lighten(BRAND.pink, 0.45), { position: [hx, hy - 0.11, hz], rotation: [Math.PI / 2, 0, 0], shade: 0 });
  b.addGlow(sphere(0.09, 12, 8), '#FFF6EE', { position: [hx, hy - 0.13, hz], scale: [1, 0.5, 1] });
});

registerFurniture('lamp-mushroom', ({ b }) => {
  const { x, z, headX, headY, headZ } = A.lamp;
  const STEM = '#FBF3EA';
  b.add(puck(0.28, 0.12), lighten(BRAND.lavender, 0.55), { position: [x, 0, z] });
  b.add(tube([[x, 0.08, z], [x + 0.02, 0.9, z + 0.05], [x + 0.3, 1.6, (z + headZ) / 2], [headX, headY - 0.05, headZ]], 0.09, { segments: 40, radial: 12 }), STEM, {});
  b.add(blob(0.13, { seed: 5, detail: 2, wobble: 0.15 }), STEM, { position: [x, 0.12, z], scale: [1.4, 0.6, 1.4] });
  // cap (lamp material glows at night) + cream dots
  const cap = lighten(BRAND.pink, 0.45);
  b.addLamp(lathe([[0, 0], [0.5, 0], [0.52, 0.04], [0.46, 0.17], [0.32, 0.3], [0.14, 0.37], [0, 0.38]], 30), cap, { position: [headX, headY - 0.06, headZ], shade: 0.04 });
  for (const [a, r, y, s] of [[0.2, 0.3, 0.2, 0.055], [1.3, 0.38, 0.12, 0.05], [2.3, 0.22, 0.27, 0.045], [-0.7, 0.36, 0.15, 0.05], [-1.6, 0.2, 0.28, 0.04], [0.8, 0.1, 0.34, 0.035]]) {
    const px = Math.sin(a) * r, pz = Math.cos(a) * r;
    b.add(sphere(s, 10, 8), '#FFF8EE', { position: [headX + px, headY - 0.06 + y, headZ + pz], scale: [1, 0.55, 1], shade: 0 });
  }
  b.addGlow(puck(0.42, 0.02, 26), '#FFF3E4', { position: [headX, headY - 0.07, headZ] });
  b.addShadow(x, z, 0.9, 0.55);
  b.addHalo(headX, headY - 0.1, W + 0.02, 2.5, NIGHT.lamp, 0.36);
  b.addHalo(headX, headY - 0.25, headZ + 0.6, 1.1, NIGHT.lamp, 0.18);
});

/* ================================================================== side */

registerFurniture('table-mug', ({ b }) => {
  const { x, z } = A.side;
  const T = '#FFFFFF', L = '#E3DEF4';
  b.add(puck(0.38, 0.09, 30), T, { position: [x, 0.6, z] });
  b.add(torus(0.37, 0.02, 6, 30), L, { position: [x, 0.64, z], rotation: [Math.PI / 2, 0, 0], shade: 0 });
  b.add(capsule(0.06, 0.48, 3, 10), L, { position: [x, 0.34, z] });
  b.add(puck(0.25, 0.07, 24), L, { position: [x, 0, z] });
  // mug with soft steam, plate of cookies, tiny book
  const mx = x - 0.1, mz = z + 0.06, my = 0.69;
  b.add(lathe([[0, 0], [0.09, 0], [0.1, 0.02], [0.1, 0.18], [0.085, 0.19], [0, 0.17]], 18), lighten(BRAND.teal, 0.45), { position: [mx, my, mz] });
  b.add(torus(0.05, 0.016, 6, 12), lighten(BRAND.teal, 0.45), { position: [mx + 0.11, my + 0.1, mz] });
  // hot cocoa (โกโก้) with two mini marshmallows
  b.add(puck(0.085, 0.01, 16), '#C9A08C', { position: [mx, my + 0.17, mz], shade: 0, night: '#5E4A6A' });
  for (const [dx, dz] of [[-0.03, 0.01], [0.025, -0.02]]) b.add(roundedBox(0.04, 0.03, 0.04, 0.012), WHITE, { position: [mx + dx, my + 0.185, mz + dz], rotation: [0, dx * 20, 0] });
  b.add(sphere(0.03, 8, 6), INK, { position: [mx - 0.03, my + 0.11, mz + 0.095], scale: [1, 1, 0.3] });
  b.add(sphere(0.03, 8, 6), INK, { position: [mx + 0.03, my + 0.11, mz + 0.095], scale: [1, 1, 0.3] });
  b.addGlow(tube([[mx, my + 0.22, mz], [mx + 0.04, my + 0.3, mz], [mx - 0.02, my + 0.38, mz], [mx + 0.03, my + 0.45, mz]], 0.012, { segments: 16, radial: 5 }), '#FFFFFF', { night: '#B9B1E2' });
  b.add(puck(0.13, 0.025, 20), WHITE, { position: [x + 0.17, my, z - 0.04] });
  for (const [dx, dz] of [[-0.03, 0], [0.05, 0.03], [0.01, -0.05]]) b.add(puck(0.05, 0.025, 14), '#F1D9BE', { position: [x + 0.17 + dx, my + 0.025, z - 0.04 + dz] });
  b.add(roundedBox(0.22, 0.04, 0.16, 0.015), lighten(BRAND.pink, 0.5), { position: [x + 0.02, my + 0.02, z - 0.18], rotation: [0, 0.4, 0] });
  b.addShadow(x, z, 0.95, 0.65);
});

registerFurniture('toy-box', ({ b }) => {
  const { x, z } = A.side;
  const BOX = lighten(BRAND.periwinkle, 0.52), LID = lighten(BRAND.periwinkle, 0.72);
  b.add(roundedBox(0.82, 0.5, 0.56, 0.12), BOX, { position: [x, 0.27, z] });
  b.add(roundedBox(0.7, 0.04, 0.44, 0.02), lighten(BRAND.periwinkle, 0.25), { position: [x, 0.5, z], shade: 0 });
  b.add(roundedBox(0.86, 0.08, 0.6, 0.04), LID, { position: [x, 0.66, z - 0.36], rotation: [-1.2, 0, 0] });
  b.add(roundedBox(0.86, 0.06, 0.06, 0.03), LID, { position: [x, 0.52, z + 0.27] });
  // heart badge on the front
  const hz = z + 0.285;
  for (const s of [-1, 1]) b.add(sphere(0.06, 12, 8), lighten(BRAND.pink, 0.35), { position: [x + s * 0.045, 0.31, hz], scale: [1, 1, 0.35] });
  b.add(sphere(0.058, 12, 8), lighten(BRAND.pink, 0.35), { position: [x, 0.27, hz], scale: [1, 1.2, 0.35], rotation: [0, 0, Math.PI / 4] });
  // toys peeking out: ball, block, star wand, bunny ears
  b.add(sphere(0.13, 18, 12), (px, py, pz, c) => c.set(Math.abs(py) < 0.04 ? WHITE : lighten(BRAND.pink, 0.35)), { position: [x - 0.2, 0.6, z + 0.05] });
  b.add(roundedBox(0.18, 0.18, 0.18, 0.05), lighten(BRAND.teal, 0.45), { position: [x + 0.05, 0.58, z + 0.06], rotation: [0.3, 0.5, 0.2] });
  b.add(capsule(0.018, 0.4, 2, 6), WHITE, { position: [x + 0.25, 0.7, z - 0.05], rotation: [0, 0, -0.35] });
  b.add(blob(0.09, { detail: 3, fn: (d, out) => { const a = Math.atan2(d.y, d.x) - Math.PI / 2; const r = 0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.cos(a * 5), 1.6); out.set(d.x * r, d.y * r, d.z * 0.4); } }),
    '#F5DFA6', { position: [x + 0.33, 0.93, z - 0.05], rotation: [0, 0, -0.35] });
  for (const s of [-1, 1]) b.add(capsule(0.04, 0.16, 4, 10), WHITE, { position: [x - 0.02 + s * 0.06, 0.72, z - 0.12], rotation: [0, 0, s * -0.15] });
  b.addShadow(x, z, 1.15, 0.8);
});
