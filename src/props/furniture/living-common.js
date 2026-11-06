/**
 * living-common.js — slot anchors and shared part builders for the living room
 * furniture (owner: prop-living). Every item of a slot builds around the same anchor.
 *
 * Phone framing (390×844, pet centre stage) only shows about x = ±1.7 at the back wall and
 * the pet covers about x = ±1.35 below y ≈ 2.1 there, so the anchors are chosen so each slot
 * shows a recognisable part on a phone:
 *   window, wall  → the wall band above the pet's head (y ≈ 2.25 … 3.3)
 *   lamp          → arc lamp: base tucked behind the sofa's left arm, shade hanging above it
 *   side          → in front of the sofa's left arm, peeking out left of the pet
 *   corner        → in front of the sofa's right arm, tall enough to rise right of the pet's head
 *   sofa          → centred behind the pet (arms and pillows show on both sides)
 *   rug           → on the floor under and in front of the pet
 */
import * as THREE from 'three';
import { WALL_Z } from '../../rooms/shell.js';
import {
  ClayBuilder, PALETTE, NIGHT, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, gradientY, tube,
} from '../clay.js';

/** Wall surface z for wall-mounted parts. */
export const W = WALL_Z + 0.04;

/** Slot anchors (room space). */
export const A = Object.freeze({
  sofa: { x: 0, z: -2.42 },
  rug: { x: 0, z: 0.8, rx: 2.25, rz: 1.35 },
  window: { x: -0.5, y: 2.8, r: 0.5 },
  wall: { x: 0.98, y: 2.78 },
  corner: { x: 1.45, z: -1.5 },
  lamp: { x: -2.2, z: -2.72, headX: -1.32, headY: 2.38, headZ: -2.5 },
  side: { x: -1.32, z: -1.32 },
});

/* ------------------------------------------------------------------ sofa */

/**
 * Classic rounded sofa body: base, back, arms, seat + back cushions with stitched seams,
 * tufting buttons and little feet. Colours per part.
 * @param {ClayBuilder} b
 * @param {{base: string, back: string, arm: string, seat: string, cushion: string, foot: string, stitch: string, button?: string}} c
 */
export function sofaBody(b, c) {
  const sz = A.sofa.z;
  b.add(roundedBox(3.3, 0.5, 0.95, 0.2), c.base, { position: [0, 0.34, sz] });
  b.add(roundedBox(3.3, 1.0, 0.42, 0.2), c.back, { position: [0, 0.99, sz - 0.36] });
  for (const s of [-1, 1]) {
    b.add(roundedBox(0.46, 0.82, 1.02, 0.22), c.arm, { position: [s * 1.72, 0.49, sz + 0.02] });
    // arm top roll
    b.add(capsule(0.17, 0.72, 4, 14), c.arm, { position: [s * 1.72, 0.86, sz + 0.03], rotation: [Math.PI / 2, 0, 0] });
    b.addStitches([s * 1.72, 0.2, sz + 0.535], [s * 1.72, 0.74, sz + 0.535], 6, c.stitch, { r: 0.01 });
    // seat cushion with front seam
    b.add(roundedBox(1.46, 0.28, 0.82, 0.13), c.seat, { position: [s * 0.74, 0.71, sz + 0.07] });
    b.addStitches([s * 0.74 - 0.62, 0.71, sz + 0.485], [s * 0.74 + 0.62, 0.71, sz + 0.485], 12, c.stitch, { r: 0.011 });
    // back cushion, slight tilt, seam + two tufting buttons
    b.add(roundedBox(1.4, 0.66, 0.26, 0.13), c.cushion, { position: [s * 0.73, 1.1, sz - 0.2], rotation: [-0.12, 0, 0] });
    b.addStitches([s * 0.73 - 0.58, 1.38, sz - 0.03], [s * 0.73 + 0.58, 1.38, sz - 0.03], 11, c.stitch, { r: 0.01 });
    for (const bx of [-0.32, 0.32]) b.add(sphere(0.035, 10, 8), c.button ?? c.stitch, { position: [s * 0.73 + bx, 1.1, sz - 0.05], scale: [1, 1, 0.6] });
    for (const z of [-0.36, 0.36]) b.add(puck(0.075, 0.1, 12), c.foot, { position: [s * 1.6, 0, sz + z] });
  }
  b.addShadow(0, sz + 0.12, 4.3, 1.6);
  b.addWallShadow(0, 1.05, W, 4.0, 1.9, 0.5);
}

/** Soft square throw pillow, tilted, with a seam ring. */
export function pillow(b, x, y, z, w, color, o = {}) {
  b.add(roundedBox(w, w * 0.95, 0.2, w * 0.26), color, { position: [x, y, z], rotation: [-0.16, 0, o.tilt ?? 0] });
  if (o.seam) {
    const r = w * 0.5 - 0.06;
    b.add(torus(r, 0.008, 4, 28), o.seam, { position: [x, y, z + 0.1], rotation: [-0.16, 0, o.tilt ?? 0], scale: [1, 0.95, 1], shade: 0 });
  }
}

/* ------------------------------------------------------------------ window */

/**
 * Arched window frame + sky + mullions + sill (used by window-arch and window-snow).
 * @param {ClayBuilder} b
 * @param {{frame: string, skyDay: string[], skyNight: string[], w?: number, h?: number}} o
 * @returns {{ x: number, y: number, w: number, h: number, sillY: number }}
 */
export function archWindow(b, o) {
  const x = A.window.x, y = A.window.y, w = o.w ?? 0.86, h = o.h ?? 1.06, r = w / 2;
  const yb = y - h / 2, yc = y + h / 2 - r;       // bottom, arch centre
  const sh = new THREE.Shape();
  sh.moveTo(-r, yb - y); sh.lineTo(r, yb - y); sh.lineTo(r, yc - y); sh.absarc(0, yc - y, r, 0, Math.PI, false); sh.lineTo(-r, yb - y);
  const sky = new THREE.ShapeGeometry(sh, 24);
  b.addGlow(sky, gradientY(o.skyDay[0], o.skyDay[1], -h / 2, h / 2), { position: [x, y, W], night: gradientY(o.skyNight[0], o.skyNight[1], -h / 2, h / 2) });
  const ft = 0.075;
  b.add(torus(r, ft, 10, 30, Math.PI), o.frame, { position: [x, yc, W + 0.04], shade: 0.02 });
  for (const s of [-1, 1]) b.add(capsule(ft, yc - yb, 3, 10), o.frame, { position: [x + s * r, (yc + yb) / 2, W + 0.04], shade: 0.02 });
  b.add(roundedBox(w + 0.15, 0.13, 0.12, 0.06), o.frame, { position: [x, yb, W + 0.05] });
  b.add(roundedBox(0.05, h - 0.06, 0.05, 0.024), o.frame, { position: [x, y - 0.03, W + 0.05] });
  b.add(roundedBox(w, 0.05, 0.05, 0.024), o.frame, { position: [x, yc - 0.05, W + 0.05] });
  const sillY = yb - 0.07;
  b.add(roundedBox(w + 0.32, 0.1, 0.26, 0.05), o.frame, { position: [x, sillY, W + 0.12] });
  b.addWallShadow(x, sillY - 0.12, W, w + 0.5, 0.3, 0.5);
  return { x, y, w, h, sillY };
}

/** Small cloud puff for a window sky (glow). */
export function skyCloud(b, x, y, s, seed, night) {
  b.addGlow(blob(0.1 * s, { seed, detail: 2 }), '#FFFFFF', { position: [x, y, W + 0.01], scale: [1.9, 0.75, 0.2], night });
}

/** Night sky details: moon + soft stars (dark theme only). `stars`: [[dx, dy, size]]. */
export function nightSky(b, x, y, moon, stars) {
  if (moon) { b.addHalo(x + moon[0], y + moon[1], W + 0.015, moon[2] * 2.1, NIGHT.moon, 0.95); b.addHalo(x + moon[0], y + moon[1], W + 0.016, moon[2], NIGHT.moon, 0.9); }
  for (const [dx, dy, s] of stars) b.addHalo(x + dx, y + dy, W + 0.014, s, NIGHT.star, 0.95);
}

/* ------------------------------------------------------------------ lamp */

/**
 * Arc floor lamp body (base behind the sofa's left arm, pole arching over it).
 * @returns {number[]} the hanging point [x, y, z] of the head
 */
export function arcLampBody(b, color, baseColor) {
  const { x, z, headX, headY, headZ } = A.lamp;
  b.add(puck(0.26, 0.09), baseColor, { position: [x, 0, z] });
  b.add(puck(0.12, 0.08), color, { position: [x, 0.08, z] });
  const top = headY + 0.5;
  b.add(tube([[x, 0.1, z], [x, 1.6, z], [x + 0.05, top - 0.1, z + 0.03], [x + 0.35, top + 0.05, (z + headZ) / 2], [headX, top - 0.05, headZ], [headX, headY + 0.26, headZ]], 0.04, { segments: 48, radial: 8 }), color, {});
  b.addShadow(x, z, 0.8, 0.5);
  b.addHalo(headX, headY - 0.1, W + 0.02, 2.4, NIGHT.lamp, 0.34);
  b.addHalo(headX, headY - 0.2, headZ + 0.6, 1.0, NIGHT.lamp, 0.16);
  return [headX, headY, headZ];
}

/* ------------------------------------------------------------------ plants */

/**
 * Swaying leaf bundle as one live mesh, origin at its base.
 * @param {{len: number, rx: number, rz: number, color: string, w?: number}[]} leaves
 * @param {string} name
 */
export function leafMesh(leaves, name) {
  const lb = new ClayBuilder({ themed: true });
  for (const l of leaves) {
    const len = l.len, w = l.w ?? 0.7;
    lb.add(blob(0.16, { seed: l.rx * 7 + l.rz * 3 + len, wobble: 0.06, detail: 2 }), l.color, {
      position: [Math.sin(l.rz) * -len * 0.5, Math.cos(l.rz) * len * 0.5 * Math.cos(l.rx), Math.sin(l.rx) * len * 0.5],
      rotation: [l.rx, 0, l.rz], scale: [w, len * 3.1, 0.32],
    });
  }
  return lb.buildMesh(name);
}

/** Simple rounded pot (lathe) with a rim band and soil top. Returns the rim height. */
export function pot(b, x, z, o) {
  const h = o.h, r = o.r;
  b.add(lathe([[0, 0], [r * 0.78, 0], [r * 0.95, 0.05], [r, h * 0.85], [r * 1.12, h * 0.9], [r * 1.1, h], [0, h - 0.02]], 26), o.color, { position: [x, 0, z] });
  if (o.band) b.add(torus(r * 0.985, 0.022, 6, 32), o.band, { position: [x, h * 0.45, z], rotation: [Math.PI / 2, 0, 0], shade: 0 });
  b.add(puck(r * 0.98, 0.03, 22), '#D9C8C0', { position: [x, h - 0.04, z], shade: 0, night: '#4A4268' });
  if (o.saucer) b.add(puck(r * 1.15, 0.05, 24), o.saucer, { position: [x, 0, z] });
  b.addShadow(x, z, r * 3.4, r * 2.2);
  return h;
}

/** Swaying update for a leaf mesh. */
export function sway(mesh, speed = 0.7, amt = 0.035, phase = 0) {
  return (dt, t) => { mesh.rotation.z = Math.sin(t * speed + phase) * amt; mesh.rotation.x = Math.sin(t * speed * 0.7 + 1 + phase) * amt * 0.6; };
}

export { THREE, PALETTE, NIGHT, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, gradientY, tube, ClayBuilder };
