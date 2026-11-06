/**
 * living-xmas.js — Christmas ("คริสต์มาส") living-room furniture (owner: prop-living).
 * Registers: sofa-xmas, rug-snow, garland-xmas, window-snow, xmas-tree, lamp-star, fireplace-xmas.
 * Colours: brand pastels + XMAS tints from clay.js (muted berry / sage / cream / soft gold).
 * Live parts: tree and garland twinkle lights (1 bulb mesh + 1 night-only halo mesh each),
 * fireplace flame (1 mesh + 1 glow).
 */
import { registerFurniture } from '../../rooms/furniture.js';
import { XMAS, puffyStar, getShadowTexture } from '../clay.js';
import {
  A, W, sofaBody, pillow, archWindow, nightSky, arcLampBody, pot,
  THREE, PALETTE, NIGHT, BRAND, lighten, roundedBox, capsule, sphere, torus, lathe, puck, blob, circle, gradientY, tube, ClayBuilder,
} from './living-common.js';

const WHITE = '#FFFFFF';
const INK = PALETTE.ink;
const BAUBLES = [lighten(BRAND.pink, 0.3), lighten(BRAND.periwinkle, 0.3), lighten(BRAND.lavender, 0.25), XMAS.gold, lighten(BRAND.teal, 0.35)];

/** Small bow (two loops + knot + tails) facing +Z. */
function bow(b, x, y, z, s, color) {
  for (const k of [-1, 1]) {
    b.add(sphere(0.07 * s, 12, 8), color, { position: [x + k * 0.07 * s, y + 0.01 * s, z], scale: [1.2, 0.8, 0.5], rotation: [0, 0, k * 0.35] });
    b.add(capsule(0.022 * s, 0.09 * s, 2, 6), color, { position: [x + k * 0.04 * s, y - 0.07 * s, z], rotation: [0, 0, k * 0.4] });
  }
  b.add(sphere(0.035 * s, 10, 8), color, { position: [x, y, z + 0.02 * s], shade: 0 });
}

/** Sage puff garland along a curve, with baubles hanging under it. */
function garland(b, pts, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const n = o.puffs ?? 26, P = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    curve.getPoint(i / n, P);
    b.add(blob(o.r ?? 0.075, { seed: i * 3.1, wobble: 0.18, detail: 2 }), i % 3 ? XMAS.sage : XMAS.pine, { position: P.toArray(), scale: [1.2, 1, 0.8], shade: 0.05 });
  }
  const bn = o.baubles ?? 6;
  for (let i = 0; i < bn; i++) {
    curve.getPoint((i + 0.5) / bn, P);
    const r = o.br ?? 0.05;
    b.add(sphere(r, 14, 10), BAUBLES[i % BAUBLES.length], { position: [P.x, P.y - r * 1.4, P.z + 0.04], shade: 0.06 });
    b.add(capsule(r * 0.32, r * 0.3, 2, 6), XMAS.goldDeep, { position: [P.x, P.y - r * 0.35, P.z + 0.04], shade: 0 });
  }
}

/* ================================================================== sofa */

registerFurniture('sofa-xmas', ({ b }) => {
  sofaBody(b, {
    base: lighten(XMAS.berry, 0.32), back: lighten(XMAS.berry, 0.4), arm: lighten(XMAS.berry, 0.36),
    seat: XMAS.cream, cushion: XMAS.cream, foot: XMAS.cocoa, stitch: XMAS.berry, button: XMAS.berryDeep,
  });
  const sz = A.sofa.z;
  // Santa coat details: fluffy white trim along the back top and both arm rolls
  for (let i = 0; i <= 22; i++) {
    b.add(blob(0.085, { seed: i * 2.7, wobble: 0.2, detail: 2 }), WHITE, { position: [-1.58 + i * (3.16 / 22), 1.5, sz - 0.34], scale: [1.25, 0.95, 1.6], shade: 0.04 });
  }
  for (const k of [-1, 1]) for (let i = 0; i <= 7; i++) {
    b.add(blob(0.08, { seed: i * 3.3 + k, wobble: 0.2, detail: 2 }), WHITE, { position: [k * 1.72, 1.03, sz - 0.42 + i * 0.13], scale: [1.4, 0.9, 1.1], shade: 0.04 });
  }
  // belt across the base front with a soft-gold buckle
  b.add(roundedBox(3.24, 0.13, 0.04, 0.03), '#9E8DB4', { position: [0, 0.38, sz + 0.47], shade: 0 });
  b.add(roundedBox(0.3, 0.22, 0.06, 0.05), XMAS.gold, { position: [0, 0.38, sz + 0.49] });
  b.add(roundedBox(0.17, 0.11, 0.07, 0.03), lighten(XMAS.berry, 0.32), { position: [0, 0.38, sz + 0.5], shade: 0 });
  // little Santa hat slumped on the left arm
  const hx = -1.7, hy = 1.06, hz = sz + 0.36;
  const lean = -0.38;   // tip flops toward the middle of the sofa
  b.add(lathe([[0, 0], [0.16, 0], [0.13, 0.12], [0.07, 0.24], [0, 0.31]], 18), lighten(XMAS.berry, 0.15), { position: [hx, hy, hz], rotation: [0, 0, lean] });
  b.add(lathe([[0.1, 0], [0.16, -0.045], [0.205, -0.03], [0.215, 0.01], [0.2, 0.05], [0.15, 0.06], [0.1, 0.04]], 20), WHITE, { position: [hx, hy, hz], rotation: [0, 0, lean], shade: 0.03 });
  b.add(sphere(0.06, 12, 8), WHITE, { position: [hx - Math.sin(lean) * 0.31, hy + Math.cos(lean) * 0.31, hz], shade: 0.03 });
  // pillows: cream with a gold star, sage with a snowflake
  pillow(b, -1.3, 1.02, sz - 0.02, 0.5, XMAS.cream, { tilt: -0.14, seam: XMAS.berry });
  b.add(puffyStar(0.13, 0.35, { detail: 3 }), XMAS.gold, { position: [-1.3, 1.03, sz + 0.12], rotation: [-0.16, 0, -0.14] });
  pillow(b, 1.36, 1.06, sz + 0.02, 0.46, lighten(XMAS.berry, 0.15), { tilt: 0.18, seam: XMAS.cream });
  for (let i = 0; i < 3; i++) b.add(roundedBox(0.22, 0.026, 0.02, 0.012), WHITE, { position: [1.36, 1.07, sz + 0.14], rotation: [-0.16, 0, 0.18 + (i * Math.PI) / 3], shade: 0 });
  b.add(sphere(0.025, 8, 6), WHITE, { position: [1.36, 1.07, sz + 0.15], shade: 0 });
});

/* ================================================================== rug */

registerFurniture('rug-snow', ({ b }) => {
  const { x, z, rx, rz } = A.rug;
  const ICE = lighten(BRAND.periwinkle, 0.62);
  // scalloped snow edge
  const n = 30;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; b.add(puck(0.22, 0.03, 16), WHITE, { position: [x + Math.cos(a) * rx * 0.95, 0, z + Math.sin(a) * rz * 0.93], scale: [1, 1, 0.8], shade: 0 }); }
  b.add(puck(1, 0.038, 48), ICE, { position: [x, 0, z], scale: [rx * 0.97, 1, rz * 0.95], shade: 0 });
  b.add(puck(1, 0.044, 48), lighten(BRAND.periwinkle, 0.75), { position: [x, 0, z], scale: [rx * 0.72, 1, rz * 0.7], shade: 0 });
  // big snowflake: 3 bars + V branches + centre
  const fy = 0.05, S = 0.62;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    b.add(roundedBox(2 * S * 1.45, 0.022, 0.11, 0.02), WHITE, { position: [x, fy, z], rotation: [0, a, 0], scale: [1, 1, 1], shade: 0 });
    for (const k of [-1, 1]) for (const t of [0.55, 0.85]) {
      const cx = x + Math.cos(a) * k * S * t * 1.45, cz = z - Math.sin(a) * k * S * t;
      for (const v of [-1, 1]) b.add(roundedBox(0.24, 0.022, 0.08, 0.02), WHITE, { position: [cx, fy, cz], rotation: [0, a + v * 0.9 * k, 0], shade: 0 });
    }
  }
  b.add(puck(0.16, 0.03, 18), WHITE, { position: [x, 0.045, z], shade: 0 });
  // small six-arm flakes on the front band (the part of the rug the pet never covers)
  for (const [dx, dz, fs] of [[-1.45, 0.62, 0.17], [-0.62, 1.02, 0.14], [0.55, 1.05, 0.15], [1.42, 0.6, 0.17], [-1.75, -0.2, 0.13], [1.78, -0.15, 0.13]]) {
    for (let i = 0; i < 3; i++) b.add(roundedBox(fs * 2, 0.02, 0.035, 0.012), WHITE, { position: [x + dx, 0.052, z + dz], rotation: [0, (i * Math.PI) / 3, 0], shade: 0 });
    b.add(puck(fs * 0.28, 0.02, 10), lighten(BRAND.periwinkle, 0.5), { position: [x + dx, 0.056, z + dz], shade: 0 });
  }
  // tiny dots ring
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; b.add(puck(0.035, 0.02, 10), WHITE, { position: [x + Math.cos(a) * rx * 0.83, 0.04, z + Math.sin(a) * rz * 0.81], shade: 0 }); }
});

/* ================================================================== wall */

registerFurniture('garland-xmas', ({ b, live, onUpdate, onTheme }) => {
  const { x, y } = A.wall;
  const z = W + 0.08;
  const pts = [[x - 0.62, y + 0.34, z], [x - 0.31, y + 0.08, z + 0.02], [x, y + 0.3, z], [x + 0.31, y + 0.08, z + 0.02], [x + 0.62, y + 0.34, z]];
  b.addWallShadow(x, y + 0.12, W, 1.6, 0.6, 0.35);
  garland(b, pts, { puffs: 30, baubles: 6 });
  for (const p of [pts[0], pts[2], pts[4]]) bow(b, p[0], p[1] + 0.03, p[2] + 0.07, 1, XMAS.berry);
  // fairy-light wire draped across the front of the puffs (static) + twinkling bulbs on it (live, in front)
  const wire = new THREE.CatmullRomCurve3(pts.map(([px, py, pz]) => new THREE.Vector3(px, py - 0.03, pz + 0.1)));
  const wp = wire.getPoints(40).map((v, i) => [v.x, v.y - Math.sin((i / 40) * Math.PI * 4) * 0.025, v.z]);
  b.add(tube(wp, 0.008, { segments: 80, radial: 4 }), XMAS.goldDeep, { shade: 0 });
  const bulbs = [];
  for (let i = 0; i < 14; i++) { const q = wp[Math.round(((i + 0.5) / 14) * 40)]; bulbs.push([q[0], q[1] - 0.02, q[2] + 0.025]); }
  twinkleLights({ live, onUpdate, onTheme }, bulbs, { name: 'living:garlandLights', r: 0.028, speed: 2.1 });
  // mini wreath below the middle hook
  const wy = y - 0.28;
  b.addWallShadow(x + 0.02, wy - 0.03, W, 0.62, 0.62, 0.45);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(blob(0.07, { seed: i * 1.7, wobble: 0.18, detail: 2 }), i % 2 ? XMAS.sage : XMAS.pine, { position: [x + Math.cos(a) * 0.19, wy + Math.sin(a) * 0.19, W + 0.06], scale: [1.2, 1, 0.8] });
  }
  for (let i = 0; i < 5; i++) { const a = 0.6 + i * 1.25; b.add(sphere(0.03, 8, 6), XMAS.berryDeep, { position: [x + Math.cos(a) * 0.2, wy + Math.sin(a) * 0.2, W + 0.12], shade: 0 }); }
  bow(b, x, wy - 0.2, W + 0.12, 0.9, XMAS.berry);
  b.add(capsule(0.006, 0.32, 2, 4), '#E4DDF2', { position: [x, wy + 0.36, W + 0.02] });
});

/* ================================================================== window */

registerFurniture('window-snow', ({ b }) => {
  const o = archWindow(b, { frame: WHITE, skyDay: ['#EEF3FB', '#C7D9F1'], skyNight: [XMAS.snowSkyLow, XMAS.snowSkyHigh] });
  b.addWallShadow(o.x + 0.03, o.y - 0.04, W, o.w * 1.6, o.h * 1.35, 0.4);
  const yb = o.y - o.h / 2;
  // snowy hills + a tiny snowy pine outside
  b.addGlow(blob(0.3, { seed: 3, detail: 2, wobble: 0.05 }), WHITE, { position: [o.x - 0.18, yb + 0.05, W + 0.006], scale: [1.3, 0.55, 0.05], night: '#C6C4EC' });
  b.addGlow(blob(0.3, { seed: 8, detail: 2, wobble: 0.05 }), '#F4F7FD', { position: [o.x + 0.25, yb + 0.02, W + 0.007], scale: [1.1, 0.45, 0.05], night: '#B4B3E2' });
  for (const [ty, tr] of [[0.0, 0.13], [0.09, 0.1], [0.17, 0.07]]) {
    b.addGlow(lathe([[0, 0], [tr, 0], [0, tr * 1.4]], 10), lighten(XMAS.pine, 0.3), { position: [o.x + 0.24, yb + 0.15 + ty, W + 0.004], scale: [1, 1, 0.1], night: '#7A86B4' });
  }
  // falling flakes (soft dots) + night stars and moon
  for (const [dx, dy, s] of [[-0.3, 0.35, 0.022], [-0.12, 0.2, 0.018], [0.08, 0.38, 0.02], [0.27, 0.22, 0.017], [-0.25, 0.02, 0.02], [0.02, 0.05, 0.016], [0.3, -0.02, 0.019], [-0.05, 0.5, 0.017], [0.18, 0.55, 0.015], [-0.18, 0.62, 0.016]]) {
    b.addGlow(sphere(s, 8, 6), WHITE, { position: [o.x + dx, o.y + dy - 0.1, W + 0.01], scale: [1, 1, 0.3] });
  }
  nightSky(b, o.x, o.y, [0.2, 0.32, 0.12], [[-0.2, 0.42, 0.06], [0.0, 0.25, 0.05]]);
  // snow on the arch and the sill
  const r = o.w / 2, yc = o.y + o.h / 2 - r;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (0.08 + 0.84 * (i / 8));
    b.add(blob(0.06 + (i % 3) * 0.012, { seed: i * 2.3, detail: 2, wobble: 0.15 }), WHITE, { position: [o.x + Math.cos(a) * (r + 0.07), yc + Math.sin(a) * (r + 0.07) + 0.02, W + 0.08], scale: [1.4, 0.8, 0.9], shade: 0.02 });
  }
  for (let i = 0; i < 9; i++) b.add(blob(0.07, { seed: i * 1.9 + 4, detail: 2, wobble: 0.15 }), WHITE, { position: [o.x - 0.52 + i * 0.13, o.sillY + 0.06, W + 0.14], scale: [1.3, 0.6, 1.4], shade: 0.02 });
  // sill: little snowman + candle (glows in the evening)
  const sx = o.x - 0.34, sy = o.sillY + 0.08;
  b.add(sphere(0.07, 14, 10), WHITE, { position: [sx, sy + 0.06, W + 0.14] });
  b.add(sphere(0.05, 14, 10), WHITE, { position: [sx, sy + 0.17, W + 0.14] });
  for (const k of [-1, 1]) b.add(sphere(0.008, 6, 4), INK, { position: [sx + k * 0.018, sy + 0.185, W + 0.187] });
  b.add(capsule(0.008, 0.03, 2, 5), '#F2C6A4', { position: [sx, sy + 0.17, W + 0.2], rotation: [Math.PI / 2, 0, 0] });
  b.add(roundedBox(0.1, 0.022, 0.08, 0.01), XMAS.berry, { position: [sx, sy + 0.12, W + 0.14], shade: 0 });
  b.add(lathe([[0, 0], [0.05, 0], [0.05, 0.03], [0.035, 0.03], [0.03, 0.09], [0, 0.09]], 12), XMAS.berryDeep, { position: [sx, sy + 0.21, W + 0.14] });
  const cx = o.x + 0.34;
  b.add(puck(0.07, 0.025, 14), XMAS.gold, { position: [cx, sy, W + 0.14] });
  b.add(capsule(0.035, 0.12, 3, 10), XMAS.cream, { position: [cx, sy + 0.1, W + 0.14] });
  b.addLamp(sphere(0.025, 10, 8), XMAS.flame, { position: [cx, sy + 0.22, W + 0.14], scale: [1, 1.5, 1], shade: 0 });
  b.addHalo(cx, sy + 0.22, W + 0.16, 0.8, NIGHT.lamp, 0.4);
});

/* ================================================================== corner: tree */

registerFurniture('xmas-tree', ({ b, live, onUpdate, onTheme }) => {
  const { x, z } = A.corner;
  // knit basket pot
  b.add(lathe([[0, 0], [0.3, 0], [0.36, 0.06], [0.38, 0.4], [0.4, 0.44], [0, 0.44]], 28), XMAS.cream, { position: [x, 0, z] });
  for (let i = 0; i < 3; i++) b.add(torus(0.375, 0.018, 5, 32), XMAS.berry, { position: [x, 0.12 + i * 0.1, z], rotation: [Math.PI / 2, 0, 0], shade: 0 });
  b.add(capsule(0.07, 0.12, 3, 8), XMAS.cocoa, { position: [x, 0.48, z] });
  b.addShadow(x, z, 1.7, 1.1);
  // soft tiers
  const tiers = [[0.5, 0.74, 0.78], [0.98, 0.6, 0.7], [1.44, 0.45, 0.62], [1.86, 0.3, 0.55]];
  for (const [y, r, h] of tiers) {
    b.add(lathe([[0, 0], [r * 0.86, 0], [r, 0.05], [r * 0.95, 0.12], [r * 0.6, h * 0.55], [r * 0.25, h * 0.88], [0, h]], 30),
      gradientY(XMAS.pine, lighten(XMAS.pine, 0.22), 0, h), { position: [x, y, z], shade: 0.05 });
    // frosting dabs on the rim (front half)
    for (let i = 0; i < 5; i++) {
      const a = -1.1 + i * 0.55;
      b.add(blob(0.05, { seed: i + y * 7, detail: 2, wobble: 0.2 }), WHITE, { position: [x + Math.sin(a) * r * 0.97, y + 0.08, z + Math.cos(a) * r * 0.97], scale: [1.4, 0.6, 1], shade: 0 });
    }
  }
  const top = tiers[3][0] + tiers[3][2];
  // ribbon spiral (cream) + baubles + twinkle lights along it
  const spiral = (t) => {
    const y = 0.62 + t * (top - 0.75), rad = 0.74 * (1 - (y - 0.5) / (top - 0.4)) + 0.05;
    const a = t * Math.PI * 5.2 - 1.6;
    return [x + Math.sin(a) * rad, y, z + Math.cos(a) * rad, a];
  };
  const rib = []; for (let i = 0; i <= 40; i++) rib.push(spiral(i / 40).slice(0, 3));
  b.add(tube(rib, 0.022, { segments: 160, radial: 6 }), XMAS.cream, { shade: 0 });
  const bp = [[0.62, -0.7, 0.62], [0.7, 0.55, 0.68], [1.1, 0.05, 0.55], [1.15, -0.95, 0.48], [1.55, 0.6, 0.4], [1.62, -0.35, 0.38], [2.0, 0.15, 0.24], [0.88, 1.1, 0.6], [1.3, 1.25, 0.42]];
  bp.forEach(([y, a, r], i) => {
    const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
    b.add(sphere(0.065, 14, 10), BAUBLES[i % BAUBLES.length], { position: [px, y, pz], shade: 0.06 });
    b.add(capsule(0.02, 0.02, 2, 6), XMAS.goldDeep, { position: [px, y + 0.07, pz], shade: 0 });
  });
  // star on top (lamp material: glows at night)
  b.addLamp(puffyStar(0.19, 0.45), XMAS.gold, { position: [x, top + 0.12, z + 0.02], shade: 0.05 });
  b.addHalo(x, top + 0.12, z + 0.1, 0.9, NIGHT.star, 0.45);
  b.addHalo(x, 1.4, W + 0.02, 2.6, NIGHT.lamp, 0.22);
  // presents at the base
  const gift = (gx, gz, w, h, c, rc, ry) => {
    b.add(roundedBox(w, h, w, 0.05), c, { position: [gx, h / 2, gz], rotation: [0, ry, 0] });
    b.add(roundedBox(w + 0.01, h + 0.01, 0.05, 0.02), rc, { position: [gx, h / 2, gz], rotation: [0, ry, 0], shade: 0 });
    b.add(roundedBox(0.05, h + 0.01, w + 0.01, 0.02), rc, { position: [gx, h / 2, gz], rotation: [0, ry, 0], shade: 0 });
    bow(b, gx, h + 0.03, gz, 0.55, rc);
    b.addShadow(gx, gz, w * 2, w * 1.6);
  };
  gift(x + 0.48, z + 0.5, 0.3, 0.26, lighten(BRAND.periwinkle, 0.45), XMAS.cream, 0.3);
  gift(x + 0.1, z + 0.62, 0.22, 0.2, XMAS.cream, XMAS.berry, -0.2);

  // ---- live: twinkle lights on the front of the tree (1 mesh) + night halos (1 mesh)
  const pts = [];
  for (let i = 0; i < 20; i++) {
    const [px, py, pz, a] = spiral(0.04 + (i / 20) * 0.92);
    if (Math.cos(a) < 0.05) continue;                  // front half only (never behind the static tree)
    pts.push([px, py + 0.02, pz + 0.025]);
  }
  twinkleLights({ live, onUpdate, onTheme }, pts, { name: 'living:treeLights' });
});

/**
 * Twinkling fairy lights as ONE live bulb mesh + ONE night-only halo mesh.
 * Callers must place every point on the camera-facing surface of the static part
 * (the baked background has no depth, so a bulb behind clay would draw on top of it).
 * @param {{live: THREE.Group, onUpdate: Function, onTheme: Function}} ctx
 * @param {number[][]} pts  bulb centres [x, y, z] in room space
 * @param {{name: string, r?: number, colors?: string[], speed?: number}} o
 */
function twinkleLights({ live, onUpdate, onTheme }, pts, o) {
  const cols = (o.colors ?? [XMAS.flameCore, XMAS.gold, lighten(BRAND.pink, 0.35), lighten(BRAND.periwinkle, 0.4)]).map((c) => new THREE.Color(c));
  const r = o.r ?? 0.032, speed = o.speed ?? 1.7;
  const bulbs = [], halos = [], phase = [], base = [];
  pts.forEach(([px, py, pz], i) => {
    const s = new THREE.SphereGeometry(r, 8, 6).toNonIndexed(); s.scale(1, 1.15, 1); s.translate(px, py, pz);
    bulbs.push(s); phase.push(i * 2.39); base.push(cols[i % cols.length]);
    const h = new THREE.PlaneGeometry(r * 7, r * 7).toNonIndexed(); h.translate(px, py, pz + 0.035);
    halos.push(h);
  });
  const bulbGeo = mergeList(bulbs), haloGeo = mergeList(halos);
  const bc = new Float32Array(bulbGeo.attributes.position.count * 3); bulbGeo.setAttribute('color', new THREE.BufferAttribute(bc, 3));
  const hc = new Float32Array(haloGeo.attributes.position.count * 4); haloGeo.setAttribute('color', new THREE.BufferAttribute(hc, 4));
  const bulbMesh = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  bulbMesh.name = o.name;
  const haloMesh = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ map: getShadowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  haloMesh.name = o.name + 'Glow'; haloMesh.renderOrder = 3; haloMesh.userData.themeOnly = 'dark'; haloMesh.visible = false;
  live.add(bulbMesh, haloMesh);
  const vb = bulbs.length ? bulbGeo.attributes.position.count / bulbs.length : 0, vh = halos.length ? haloGeo.attributes.position.count / halos.length : 0;
  let dark = false;
  const tmp = new THREE.Color();
  const paint = (t) => {
    for (let i = 0; i < base.length; i++) {
      const k = 0.5 + 0.5 * Math.sin(t * speed + phase[i]);
      tmp.copy(base[i]).multiplyScalar(dark ? 0.75 + 0.45 * k : 0.85 + 0.2 * k);
      for (let v = 0, q = i * vb * 3; v < vb; v++, q += 3) { bc[q] = tmp.r; bc[q + 1] = tmp.g; bc[q + 2] = tmp.b; }
      const al = 0.25 + 0.6 * k;
      for (let v = 0, q = i * vh * 4; v < vh; v++, q += 4) { hc[q] = base[i].r; hc[q + 1] = base[i].g; hc[q + 2] = base[i].b; hc[q + 3] = al; }
    }
    bulbGeo.attributes.color.needsUpdate = true; haloGeo.attributes.color.needsUpdate = true;
  };
  paint(0);
  onTheme((th) => { dark = th === 'dark'; paint(0); });
  onUpdate((dt, t) => paint(t));
}

function mergeList(list) {
  const pos = [], uv = [];
  let hasUv = list.length > 0 && !!list[0].attributes.uv;
  for (const g of list) { pos.push(...g.attributes.position.array); if (hasUv && g.attributes.uv) uv.push(...g.attributes.uv.array); g.dispose(); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (hasUv) out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

/* ================================================================== lamp */

registerFurniture('lamp-star', ({ b }) => {
  const [hx, hy, hz] = arcLampBody(b, XMAS.cream, lighten(XMAS.berry, 0.3));
  b.add(capsule(0.008, 0.12, 2, 4), XMAS.goldDeep, { position: [hx, hy + 0.18, hz] });
  b.addLamp(puffyStar(0.3, 0.42), XMAS.gold, { position: [hx, hy - 0.05, hz], shade: 0.05 });
  b.addGlow(puffyStar(0.12, 0.3, { detail: 3 }), '#FFF6E2', { position: [hx, hy - 0.05, hz + 0.1] });
  // two tiny stars dangling from the arc
  for (const [dx, len] of [[0.35, 0.35], [0.6, 0.22]]) {
    const sx = hx - dx, sy = hy + 0.48 - len;
    b.add(capsule(0.005, len, 2, 4), XMAS.goldDeep, { position: [sx, hy + 0.5 - len / 2, hz - 0.02] });
    b.addLamp(puffyStar(0.07, 0.4, { detail: 3 }), XMAS.gold, { position: [sx, sy - 0.05, hz - 0.02], shade: 0 });
  }
  bow(b, hx + 0.02, hy + 0.3, hz + 0.05, 0.7, XMAS.berry);
});

/* ================================================================== side: fireplace */

registerFurniture('fireplace-xmas', ({ b, live, onUpdate, onTheme }) => {
  const { x, z } = A.side;
  const BODY = XMAS.cream, TRIM = lighten(XMAS.berry, 0.2);
  const d = 0.5, front = z + d / 2;
  b.add(roundedBox(1.22, 0.1, 0.72, 0.05), lighten(XMAS.cocoa, 0.45), { position: [x, 0.05, z + 0.08] });
  b.add(roundedBox(1.02, 0.96, d, 0.17), BODY, { position: [x, 0.58, z] });
  // brick-ish soft tiles on the face (static detail)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) for (const s of [-1, 1]) {
    b.add(roundedBox(0.11, 0.07, 0.02, 0.03), lighten(XMAS.berry, 0.6), { position: [x + s * (0.4 - c * 0.07 - (r % 2) * 0.035), 0.24 + r * 0.17, front + 0.005], shade: 0 });
  }
  // opening: warm interior panel inside an arch frame
  const ow = 0.5, oh = 0.56, oy = 0.16, orad = ow / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-orad, 0); sh.lineTo(orad, 0); sh.lineTo(orad, oh - orad); sh.absarc(0, oh - orad, orad, 0, Math.PI, false); sh.lineTo(-orad, 0);
  b.addGlow(new THREE.ShapeGeometry(sh, 16), gradientY('#F2C3A6', '#8F7397', 0, oh), { position: [x, oy, front + 0.004], night: gradientY('#F5B98F', '#5E4A78', 0, oh) });
  b.add(torus(orad + 0.035, 0.045, 8, 24, Math.PI), TRIM, { position: [x, oy + oh - orad, front + 0.02] });
  for (const s of [-1, 1]) b.add(capsule(0.045, oh - orad, 3, 8), TRIM, { position: [x + s * (orad + 0.035), oy + (oh - orad) / 2, front + 0.02] });
  // logs (low in the opening; the live flame sits above them)
  b.add(capsule(0.045, 0.3, 3, 10), XMAS.cocoa, { position: [x - 0.02, oy + 0.05, front + 0.03], rotation: [0, 0, Math.PI / 2 + 0.12] });
  b.add(capsule(0.04, 0.26, 3, 10), lighten(XMAS.cocoa, 0.15), { position: [x + 0.03, oy + 0.08, front + 0.05], rotation: [0, 0, Math.PI / 2 - 0.18] });
  // mantel + garland + candles
  const my = 1.08;
  b.add(roundedBox(1.22, 0.11, 0.64, 0.05), TRIM, { position: [x, my, z + 0.04] });
  garland(b, [[x - 0.56, my + 0.02, z + 0.37], [x - 0.28, my - 0.08, z + 0.39], [x, my + 0.0, z + 0.38], [x + 0.28, my - 0.08, z + 0.39], [x + 0.56, my + 0.02, z + 0.37]], { puffs: 20, baubles: 4, r: 0.06, br: 0.04 });
  for (const s of [-1, 1]) {
    const cx = x + s * 0.44;
    b.add(puck(0.06, 0.02, 12), XMAS.gold, { position: [cx, my + 0.055, z - 0.05] });
    b.add(capsule(0.032, 0.14 + (s > 0 ? 0.06 : 0), 3, 10), WHITE, { position: [cx, my + 0.16 + (s > 0 ? 0.03 : 0), z - 0.05] });
    b.addLamp(sphere(0.022, 8, 6), XMAS.flame, { position: [cx, my + 0.3 + (s > 0 ? 0.06 : 0), z - 0.05], scale: [1, 1.5, 1], shade: 0 });
    b.addHalo(cx, my + 0.3 + (s > 0 ? 0.06 : 0), z + 0.05, 0.6, NIGHT.lamp, 0.4);
  }
  b.add(blob(0.07, { seed: 3, detail: 2 }), lighten(BRAND.teal, 0.3), { position: [x, my + 0.12, z - 0.08], scale: [1, 1.1, 1] });
  b.add(puffyStar(0.07, 0.4, { detail: 3 }), XMAS.gold, { position: [x, my + 0.24, z - 0.06] });
  // stockings hanging from the mantel front
  const stocking = (sx, c, cuff, toeDir) => {
    const zz = front + 0.12;
    b.add(capsule(0.006, 0.06, 2, 4), XMAS.goldDeep, { position: [sx, my - 0.07, zz] });
    b.add(roundedBox(0.17, 0.07, 0.08, 0.03), cuff, { position: [sx, my - 0.13, zz] });
    b.add(capsule(0.07, 0.16, 4, 10), c, { position: [sx, my - 0.3, zz], scale: [1, 1, 0.6] });
    b.add(capsule(0.065, 0.08, 4, 10), c, { position: [sx + toeDir * 0.06, my - 0.43, zz], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 0.6] });
    b.add(sphere(0.03, 8, 6), cuff, { position: [sx + toeDir * 0.13, my - 0.43, zz + 0.01], scale: [1, 1, 0.6], shade: 0 });
  };
  stocking(x - 0.27, XMAS.berry, WHITE, 1);
  stocking(x + 0.25, XMAS.sage, XMAS.cream, -1);
  b.add(sphere(0.03, 10, 8), XMAS.gold, { position: [x + 0.25, my - 0.19, front + 0.17] });
  b.addShadow(x, z + 0.05, 1.6, 1.1);
  b.addHalo(x, 0.4, front + 0.4, 1.6, NIGHT.lamp, 0.28);

  // ---- live: flame (glow blobs) + soft flicker glow, both inside the opening
  const fb = new ClayBuilder({ themed: false });
  fb.add(blob(0.1, { seed: 1, wobble: 0.1, detail: 2 }), XMAS.flame, { position: [0, 0.1, 0], scale: [0.9, 1.5, 0.3], shade: 0 });
  fb.add(blob(0.06, { seed: 2, wobble: 0.1, detail: 2 }), XMAS.flame, { position: [-0.08, 0.06, 0.005], scale: [0.9, 1.4, 0.3], shade: 0 });
  fb.add(blob(0.06, { seed: 4, wobble: 0.1, detail: 2 }), XMAS.flame, { position: [0.08, 0.07, 0.005], scale: [0.9, 1.3, 0.3], shade: 0 });
  fb.add(blob(0.055, { seed: 5, wobble: 0.08, detail: 2 }), XMAS.flameCore, { position: [0, 0.08, 0.02], scale: [0.9, 1.4, 0.3], shade: 0 });
  const flame = fb.buildMesh('living:fireFlame', new THREE.MeshBasicMaterial({ vertexColors: true }));
  flame.position.set(x, oy + 0.15, front + 0.012);
  const glowMat = new THREE.MeshBasicMaterial({ map: getShadowTexture(), color: XMAS.flame, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48), glowMat);
  glow.name = 'living:fireGlow'; glow.renderOrder = 3; glow.position.set(x, oy + 0.2, front + 0.03);
  live.add(flame, glow);
  let dark = false;
  onTheme((th) => { dark = th === 'dark'; });
  onUpdate((dt, t) => {
    const f = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.1 + 1) * 0.3 + Math.sin(t * 3.1) * 0.2;
    flame.scale.set(1 - f * 0.05, 1 + f * 0.1, 1);
    flame.rotation.z = Math.sin(t * 2.3) * 0.05;
    glowMat.opacity = (dark ? 0.55 : 0.22) + f * (dark ? 0.12 : 0.05);
  });
});
