/**
 * kitchen-bath-shared.js — small helpers shared by the kitchen and bathroom
 * furniture/decor (owner: prop-utility, S4-03).
 *
 * TEMPORARY HOME: these belong in `src/props/clay.js` (owned by prop-living this
 * sprint). Kiln moves them there at integration; until then the kitchen and
 * bathroom import them from here.
 *
 * Everything returns plain BufferGeometry (position + normal, non-indexed) that a
 * {@link ClayBuilder} can take with `b.add(geo, colour, { position, rotation, scale })`.
 */
import * as THREE from 'three';
import { roundedBox, capsule, sphere, puck, BRAND, lighten, XMAS as CLAY_XMAS } from '../clay.js';

/**
 * Christmas tones: clay.js `XMAS` (prop-living, muted berry / sage / soft gold / cocoa)
 * plus a few extra steps the kitchen and bathroom need. Never bright red or green.
 * Extras to move into clay.js XMAS: berryLight, sageLight, tan, tanDeep, frost, iceDeep.
 */
export const XMAS = Object.freeze({
  ...CLAY_XMAS,
  berryLight: lighten(CLAY_XMAS.berry, 0.45),
  sageLight: lighten(CLAY_XMAS.sage, 0.4),
  tan: CLAY_XMAS.cocoa, tanDeep: '#CFA88E',       // gingerbread body / darker baked edge
  frost: '#8296D2',                               // DS border/primary value (Clay uses it too)
  iceDeep: '#C9D6F0',
});

/** Soft pastel tints used by both rooms (lightened brand stops). */
export const TINT = Object.freeze({
  pink: lighten(BRAND.pink, 0.45), pinkSoft: lighten(BRAND.pink, 0.62),
  peri: lighten(BRAND.periwinkle, 0.4), periSoft: lighten(BRAND.periwinkle, 0.65),
  lav: lighten(BRAND.lavender, 0.4), lavSoft: lighten(BRAND.lavender, 0.6),
  teal: lighten(BRAND.teal, 0.35), tealSoft: lighten(BRAND.teal, 0.6),
  lemon: '#F6DE9C', apple: lighten(BRAND.pink, 0.2), leaf: lighten(BRAND.teal, 0.25),
});

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

/**
 * Merge several primitives into one geometry, each with its own transform.
 * @param {Array<[THREE.BufferGeometry, {position?: number[], rotation?: number[], scale?: number|number[]}?]>} parts
 * @returns {THREE.BufferGeometry} non-indexed, position + normal only
 */
export function mergeParts(parts) {
  const list = parts.map(([geo, t = {}]) => {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    const s = t.scale ?? 1;
    const sv = Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s);
    _e.set(...(t.rotation ?? [0, 0, 0]));
    _m.compose(new THREE.Vector3(...(t.position ?? [0, 0, 0])), _q.setFromEuler(_e), sv);
    g.applyMatrix4(_m);
    return g;
  });
  const out = mergeSimple(list);
  for (const g of list) g.dispose();
  return out;
}

function mergeSimple(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}

/** Extrude a 2D shape (XY, facing +Z) with a soft rounded bevel; centred on z = 0. */
export function softShape(shape, depth = 0.02, bevel = 0.015, curveSegments = 8) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments,
  });
  g.translate(0, 0, -depth / 2);
  g.deleteAttribute('uv');
  g.clearGroups();
  return g;
}

/** Holly leaf (scalloped edge), length `len` along +X from the origin. Flat, facing +Z. */
export function hollyLeaf(len = 0.2, width = 0.09) {
  const s = new THREE.Shape();
  const n = 3, w = width / 2;
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) { const x = (i / n) * len, y = Math.sin((i / n) * Math.PI) * w * 1.15; top.push([x, y]); bot.push([x, -y]); }
  s.moveTo(0, 0);
  for (let i = 1; i <= n; i++) {
    const [x0, y0] = top[i - 1], [x1, y1] = top[i];
    s.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 * 0.45 + (i === 1 ? w * 0.2 : 0), x1, y1);
  }
  for (let i = n - 1; i >= 0; i--) {
    const [x0, y0] = bot[i + 1], [x1, y1] = bot[i];
    s.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 * 0.45 - (i === 0 ? w * 0.2 : 0), x1, y1);
  }
  return softShape(s, 0.006, 0.01, 5);
}

/** Five-point star with soft edges, outer radius `R`. Flat, facing +Z. */
export function starShape(R = 0.1, inner = 0.48) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * inner : R;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return softShape(s, R * 0.18, R * 0.16, 2);
}

/** Heart, about `size` wide. Flat, facing +Z, centred. */
export function heartShape(size = 0.1) {
  const k = size / 2, s = new THREE.Shape();
  s.moveTo(0, -k * 0.95);
  s.bezierCurveTo(-k * 0.25, -k * 0.6, -k * 1.05, -k * 0.2, -k * 1.0, k * 0.3);
  s.bezierCurveTo(-k * 0.95, k * 0.85, -k * 0.25, k * 0.95, 0, k * 0.45);
  s.bezierCurveTo(k * 0.25, k * 0.95, k * 0.95, k * 0.85, k * 1.0, k * 0.3);
  s.bezierCurveTo(k * 1.05, -k * 0.2, k * 0.25, -k * 0.6, 0, -k * 0.95);
  return softShape(s, size * 0.12, size * 0.12, 8);
}

/** Soft snowflake: six rounded arms with two twigs each. Flat, facing +Z, radius `R`. */
export function snowflake(R = 0.12, t = R * 0.13) {
  const parts = [[sphere(t * 1.6, 10, 8), { scale: [1, 1, 0.6] }]];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const dir = [Math.cos(a), Math.sin(a)];
    parts.push([capsule(t, R, 2, 6), { position: [dir[0] * R * 0.5, dir[1] * R * 0.5, 0], rotation: [0, 0, a - Math.PI / 2], scale: [1, 1, 0.6] }]);
    for (const s of [-1, 1]) {
      const bx = dir[0] * R * 0.62, by = dir[1] * R * 0.62, ba = a + s * 0.85;
      parts.push([capsule(t * 0.85, R * 0.3, 2, 6), { position: [bx + Math.cos(ba) * R * 0.15, by + Math.sin(ba) * R * 0.15, 0], rotation: [0, 0, ba - Math.PI / 2], scale: [1, 1, 0.6] }]);
    }
  }
  return mergeParts(parts);
}

/** A tube along points (Catmull-Rom), for piped icing, ribbons and vines. */
export function tubeAlong(points, radius = 0.02, segments = 64, radial = 6, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.5);
  const g = new THREE.TubeGeometry(curve, segments, radius, radial, closed);
  g.deleteAttribute('uv');
  return g;
}

/**
 * Wavy "piped icing" outline around a rounded rectangle in the XY plane.
 * @param {number} w @param {number} h  outline size
 * @param {number} r  corner radius
 * @param {number} [amp]  wave amplitude (in the plane)
 * @param {number} [waves] number of waves around
 */
export function icingOutline(w, h, r, amp = 0.018, waves = 28, thick = 0.022) {
  const pts = [];
  const N = waves * 6;
  const hw = w / 2 - r, hh = h / 2 - r;
  const per = 4 * (hw + hh) + 2 * Math.PI * r;
  for (let i = 0; i < N; i++) {
    let d = (i / N) * per;
    let x, y, nx, ny;
    const seg = [2 * hw, Math.PI * r / 2, 2 * hh, Math.PI * r / 2, 2 * hw, Math.PI * r / 2, 2 * hh, Math.PI * r / 2];
    let k = 0; while (d > seg[k]) { d -= seg[k]; k++; if (k > 7) { k = 7; break; } }
    const corner = (cx, cy, a0) => { const a = a0 + d / r; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; };
    switch (k) {
      case 0: [x, y, nx, ny] = [-hw + d, -hh - r, 0, -1]; break;
      case 1: [x, y, nx, ny] = corner(hw, -hh, -Math.PI / 2); break;
      case 2: [x, y, nx, ny] = [hw + r, -hh + d, 1, 0]; break;
      case 3: [x, y, nx, ny] = corner(hw, hh, 0); break;
      case 4: [x, y, nx, ny] = [hw - d, hh + r, 0, 1]; break;
      case 5: [x, y, nx, ny] = corner(-hw, hh, Math.PI / 2); break;
      case 6: [x, y, nx, ny] = [-hw - r, hh - d, -1, 0]; break;
      default: [x, y, nx, ny] = corner(-hw, -hh, Math.PI); break;
    }
    const o = Math.sin((i / N) * waves * Math.PI * 2) * amp;
    pts.push([x + nx * o, y + ny * o, 0]);
  }
  return tubeAlong(pts, thick, N * 2, 6, true);
}

/**
 * Horizontal stripes painter for {@link ClayBuilder.add} (local y).
 * @param {string[]} colors  repeating colours
 * @param {number} period    stripe height
 * @param {number} [y0]      phase
 */
export function stripesY(colors, period, y0 = 0) {
  const cs = colors.map((c) => new THREE.Color(c));
  return (x, y, z, c) => c.copy(cs[((Math.floor((y - y0) / period) % cs.length) + cs.length) % cs.length]);
}

/** Diagonal stripes painter (candy cane), along x + y. */
export function stripesDiag(a, b, period) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return (x, y, z, c) => c.copy(Math.floor((x + y + z) / period) % 2 ? ca : cb);
}

/**
 * Wall of rounded tiles with soft grout behind them.
 * @param {import('../clay.js').ClayBuilder} b
 * @param {{x0: number, x1: number, y0: number, y1: number, z: number, size: number, gap?: number,
 *   colors: string[], grout: string, groutNight?: string, night?: string[], depth?: number}} o
 */
export function tileWall(b, o) {
  const gap = o.gap ?? 0.035, d = o.depth ?? 0.035;
  const cols = Math.max(1, Math.round((o.x1 - o.x0) / o.size)), rows = Math.max(1, Math.round((o.y1 - o.y0) / o.size));
  const sx = (o.x1 - o.x0) / cols, sy = (o.y1 - o.y0) / rows;
  b.add(roundedBox(o.x1 - o.x0 + 0.02, o.y1 - o.y0 + 0.02, 0.02, 0.01, 1), o.grout,
    { position: [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, o.z], shade: 0, ...(o.groutNight ? { night: o.groutNight } : {}) });
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const k = (i + j) % o.colors.length;
    b.add(roundedBox(sx - gap, sy - gap, d, Math.min(sx, sy) * 0.22, 2), o.colors[k], {
      position: [o.x0 + sx * (i + 0.5), o.y0 + sy * (j + 0.5), o.z + d / 2], shade: 0.02,
      ...(o.night ? { night: o.night[k % o.night.length] } : {}),
    });
  }
}

/**
 * Flat oval floor mat (y = 0 up to `h`) with a soft rolled rim.
 * @returns {number} top surface height (place appliqués at this y)
 */
export function ovalMat(b, x, z, rx, rz, h, color, rim, rimNight) {
  b.add(puck(1, h, 48), color, { position: [x, 0, z], scale: [rx, 1, rz], shade: 0 });
  if (rim) {
    const pts = [];
    for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push([Math.cos(a) * (rx - h * 0.4), 0, Math.sin(a) * (rz - h * 0.4)]); }
    b.add(tubeAlong(pts, h * 0.75, 128, 6, true), rim,
      { position: [x, h * 0.6, z], shade: 0, ...(rimNight ? { night: rimNight } : {}) });
  }
  return h;
}

/** Ring of little bumps (scallops / pompoms) around an ellipse on the floor. */
export function scallopRing(b, x, z, rx, rz, n, r, y, color, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.add(sphere(r, 12, 8), typeof color === 'function' ? color(i) : color,
      { position: [x + Math.cos(a) * rx, y, z + Math.sin(a) * rz], scale: [1, o.flat ?? 0.45, 1], shade: 0, ...(o.t ?? {}) });
  }
}

/**
 * Lay a flat (XY, facing +Z) geometry onto the floor / a mat: returns bake transform.
 * @param {number} x @param {number} y @param {number} z @param {number} [spin] rotation around the up axis
 */
export function flatOnFloor(x, y, z, spin = 0, scale = 1) {
  return { position: [x, y, z], rotation: [-Math.PI / 2, 0, spin], scale };
}

/** Gingerbread person cookie (flat, facing +Z, about `h` tall). Returns geometry for the body. */
export function gingerbreadMan(h = 0.3) {
  const k = h / 0.3;
  return mergeParts([
    [sphere(0.06 * k, 16, 12), { position: [0, 0.09 * k, 0], scale: [1, 1, 0.35] }],
    [roundedBox(0.11 * k, 0.12 * k, 0.04 * k, 0.03 * k, 2), { position: [0, -0.01 * k, 0] }],
    [capsule(0.027 * k, 0.09 * k, 3, 8), { position: [-0.075 * k, 0.015 * k, 0], rotation: [0, 0, 1.15], scale: [1, 1, 0.7] }],
    [capsule(0.027 * k, 0.09 * k, 3, 8), { position: [0.075 * k, 0.015 * k, 0], rotation: [0, 0, -1.15], scale: [1, 1, 0.7] }],
    [capsule(0.03 * k, 0.07 * k, 3, 8), { position: [-0.035 * k, -0.1 * k, 0], rotation: [0, 0, -0.3], scale: [1, 1, 0.7] }],
    [capsule(0.03 * k, 0.07 * k, 3, 8), { position: [0.035 * k, -0.1 * k, 0], rotation: [0, 0, 0.3], scale: [1, 1, 0.7] }],
  ]);
}

/**
 * Bow made of two soft loops, a knot and two tails. Flat-ish, facing +Z, about `w` wide.
 * @returns {THREE.BufferGeometry}
 */
export function bow(w = 0.2) {
  const k = w / 0.2;
  return mergeParts([
    [new THREE.TorusGeometry(0.045 * k, 0.018 * k, 6, 16), { position: [-0.05 * k, 0.005 * k, 0], scale: [1.3, 0.85, 0.8] }],
    [new THREE.TorusGeometry(0.045 * k, 0.018 * k, 6, 16), { position: [0.05 * k, 0.005 * k, 0], scale: [1.3, 0.85, 0.8] }],
    [sphere(0.027 * k, 10, 8), { scale: [1, 1, 0.8] }],
    [capsule(0.016 * k, 0.08 * k, 2, 6), { position: [-0.03 * k, -0.06 * k, 0], rotation: [0, 0, -0.45], scale: [1.4, 1, 0.6] }],
    [capsule(0.016 * k, 0.08 * k, 2, 6), { position: [0.03 * k, -0.06 * k, 0], rotation: [0, 0, 0.45], scale: [1.4, 1, 0.6] }],
  ]);
}
