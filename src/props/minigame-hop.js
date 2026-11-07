/**
 * minigame-hop.js — obstacles, scrolling ground and coin for "กระโดดข้ามก้อน"
 * (`hop`, design/gdd/minigames-2.md 3.4) (owner: prop). Re-exported by ./minigame.js.
 *
 * Side view: the camera looks down -Z, the ground scrolls toward -X, obstacles sit
 * on z = 0 and face +Z (the camera). World units (1 = prototype body radius).
 *
 * | Prop | Size (w × h) | Origin | Draw calls |
 * |---|---|---|---|
 * | `pebble` ก้อนกรวด (sleepy clay stone) | 0.50 × 0.38 | bottom centre (ground contact) | 2 (body + shadow) |
 * | `cushion` หมอนนุ่ม (tufted pillow) | 0.66 × 0.40 | bottom centre | 2 |
 * | `demon` ปีศาจลูกค้า (Snack Rain mesh) | 0.50 × ~0.45 | bottom centre | 2 |
 * | ground (`createHopGround`) | `width` × 1.3 deep, top at y = 0 | top centre | 2 (slab + scrolling deco) |
 * | coin (`createHopCoin`) | 0.40 | centre | 1 |
 *
 * All heights stay well under `hop.jump.height` (1.1), so one jump clears any
 * kind and two side by side need the double jump. Exact sizes are in
 * {@link HOP_OBSTACLE_SIZE} and on each group's `userData` for hit tests.
 *
 * Obstacles are not themed (like the coin and demon: matte pastel reads on both
 * themes); the ground is themed — run `applyMinigameTheme(root, theme)`.
 *
 * @example
 *   const ground = createHopGround(7); scene.add(ground.object3d);
 *   const rock = createHopObstacle('pebble'); rock.position.set(4, 0, 0); scene.add(rock);
 *   // per frame:
 *   ground.scroll(speed * dt); rock.position.x -= speed * dt;
 *   rock.userData.body.rotation.z = Math.sin(t * 9) * 0.1;   // soft rock, never a full spin (face stays up)
 */
import * as THREE from 'three';
import {
  ClayBuilder, roundedBox, capsule, sphere, torus, blob, gradientY, topCoat,
  getSharedClayMaterial, getShadowTexture,
} from './clay.js';
import { createCoinMesh, getDemonGeometry } from './minigame-snack.js';

/** Obstacle kinds (ids match `minigames.json → hop.spawn.kinds`). */
export const HOP_OBSTACLE_KINDS = Object.freeze(['pebble', 'cushion', 'demon']);
/** Bounding size per kind, world units (filled on first build; `userData` carries the same). */
export const HOP_OBSTACLE_SIZE = {};
/** Ground decoration repeat length, world units. */
export const HOP_GROUND_TILE = 1.6;
/** Ground depth (z), world units. */
export const HOP_GROUND_DEPTH = 1.3;

const COL = {
  stoneLow: '#C7BFD8', stoneTop: '#E4DEEE', speck: '#F3EFF8', ink: '#5E5478', blush: '#EFB3C9',
  pillow: '#F2C9DB', pillowTop: '#F8DDE8', button: '#CBA5D1', tassel: '#E7B0C8', seam: '#E6B6CB',
  grass: '#CFE5DE', grassEdge: '#B9D9D1', soil: '#F1E1D4', soilLow: '#E5CDBD', pebble: '#E3D2C4', tuft: '#A9CFC6', flower: '#F2B6CC', flowerMid: '#FBE7A8',
};

/* -------------------------------------------------------------- obstacles */

const RECIPES = {
  pebble(b) {
    // a chubby lavender-grey stone, slightly flat, with a sleepy face (it is a friend, not a hazard)
    b.add(blob(0.22, { seed: 11, wobble: 0.06, detail: 4 }), gradientY(COL.stoneLow, COL.stoneTop, -0.2, 0.2), { scale: [1.14, 0.86, 0.95], shade: 0.08 });
    for (const [x, y, s] of [[-0.12, 0.1, 0.022], [0.15, 0.06, 0.016], [0.07, 0.15, 0.014], [-0.17, -0.02, 0.013]]) {
      b.add(sphere(s, 8, 6), COL.speck, { position: [x, y, 0.17 - Math.abs(x) * 0.35], scale: [1, 1, 0.4], shade: 0 });
    }
    // closed sleepy eyes (∪) and a tiny "o" mouth
    for (const s of [-1, 1]) b.add(torus(0.026, 0.008, 5, 14, Math.PI), COL.ink, { position: [s * 0.06, 0.01, 0.2], rotation: [0, s * 0.25, Math.PI], shade: 0 });
    b.add(torus(0.012, 0.006, 5, 12), COL.ink, { position: [0, -0.05, 0.204], shade: 0 });
    for (const s of [-1, 1]) b.add(sphere(0.026, 10, 6), COL.blush, { position: [s * 0.115, -0.035, 0.18], rotation: [0, s * 0.5, 0], scale: [1.2, 0.65, 0.3], shade: 0 });
  },

  cushion(b) {
    // a puffy square floor cushion seen from the front: superellipse pillow (thinner at the edges),
    // a tufted centre button with soft creases, and four little corner tassels
    b.add(blob(1, {
      detail: 5,
      fn: (d, out) => {
        const P = 3.2;
        const k = Math.pow(Math.pow(Math.abs(d.x), P) + Math.pow(Math.abs(d.y), P) + Math.pow(Math.abs(d.z), P), -1 / P);
        const x = d.x * k, y = d.y * k, z = d.z * k;
        const edge = Math.max(Math.abs(x), Math.abs(y));
        out.set(x * 0.31, y * 0.185, z * 0.21 * (0.55 + 0.45 * (1 - edge * edge)));
      },
    }), gradientY(COL.pillow, COL.pillowTop, -0.18, 0.18), { shade: 0.08 });
    b.add(sphere(0.036, 12, 8), COL.button, { position: [0, 0.0, 0.205], scale: [1, 1, 0.55], shade: 0.04 });
    for (const a of [0.6, 2.2, 3.8, 5.4]) {
      b.add(capsule(0.007, 0.05, 2, 6), COL.seam, { position: [Math.cos(a) * 0.065, Math.sin(a) * 0.045, 0.197], rotation: [0, 0, a + Math.PI / 2], scale: [1, 1, 0.5], shade: 0 });
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      b.add(sphere(0.026, 10, 8), COL.tassel, { position: [sx * 0.288, sy * 0.158, 0.01], shade: 0.03 });
    }
  },
};

/** Evening tints for the large ground surfaces (explicit, lighter than the automatic map). */
const EVE = { grass: '#7F9DB4', grassEdge: '#6C8DA8', soil: '#86779F', soilLow: '#706289' };

const geoCache = new Map();
function obstacleGeometry(kind) {
  if (geoCache.has(kind)) return geoCache.get(kind);
  let g;
  if (kind === 'demon') {
    g = getDemonGeometry();     // shared with Snack Rain (already centred, 0.5 across)
  } else {
    const b = new ClayBuilder();
    RECIPES[kind](b);
    g = b.buildMesh().geometry;
    g.computeBoundingBox();
    const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
    g.translate(-c.x, -c.y, -c.z);
    g.computeBoundingBox(); g.computeBoundingSphere();
    g.userData.shared = true;
  }
  if (!g.boundingBox) g.computeBoundingBox();
  const s = new THREE.Vector3(); g.boundingBox.getSize(s);
  HOP_OBSTACLE_SIZE[kind] = { width: +s.x.toFixed(3), height: +s.y.toFixed(3), depth: +s.z.toFixed(3) };
  geoCache.set(kind, g);
  return g;
}

let shadowGeo = null, shadowMat = null;
function sharedShadow() {
  if (!shadowMat) {
    shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2); shadowGeo.userData.shared = true;
    shadowMat = new THREE.MeshBasicMaterial({ map: getShadowTexture(), color: '#5A5290', transparent: true, opacity: 0.28, depthWrite: false });
    shadowMat.name = 'hop-shadow-shared';
    shadowMat.userData.shared = true;
    shadowMat.userData.theme = { light: { color: '#5A5290', opacity: 0.28 }, dark: { color: '#120E2C', opacity: 0.42 } };
  }
  return [shadowGeo, shadowMat];
}

/**
 * One hop obstacle.
 * @param {'pebble'|'cushion'|'demon'} kind  unknown kinds fall back to `pebble`
 * @param {{shadow?: boolean, material?: THREE.Material}} [o]  `shadow` (default true) adds a soft
 *   contact shadow; `material` replaces the shared clay (e.g. a transparent copy for a bump fade)
 * @returns {THREE.Group} origin at the bottom centre (put it at y = 0 on the ground), faces +Z.
 *   `userData = { minigameItem: 'hop:<kind>', kind, width, height, depth, body }` —
 *   `body` is the mesh to rock / squash; it pivots at its own centre.
 */
export function createHopObstacle(kind, o = {}) {
  if (!HOP_OBSTACLE_KINDS.includes(kind)) kind = 'pebble';
  const g = obstacleGeometry(kind);
  const size = HOP_OBSTACLE_SIZE[kind];
  const group = new THREE.Group();
  group.name = 'minigame:hop:' + kind;
  const body = new THREE.Mesh(g, o.material ?? getSharedClayMaterial());
  body.name = 'body';
  body.position.y = size.height / 2 - (kind === 'demon' ? 0.012 : 0.004);   // tiny sink so it sits in the clay
  group.add(body);
  if (o.shadow !== false) {
    const [sg, sm] = sharedShadow();
    const sh = new THREE.Mesh(sg, sm);
    sh.name = 'shadow'; sh.renderOrder = 1;
    sh.position.y = 0.006;
    sh.scale.set(size.width * 1.25, 1, size.depth * 1.1);
    group.add(sh);
  }
  group.userData = { minigameItem: 'hop:' + kind, kind, ...size, body };
  return group;
}

/**
 * A hop coin (the shared clay coin, 0.4 across, centred, faces +Z). Spin it on Y.
 * @param {{material?: THREE.Material}} [o]
 * @returns {THREE.Group}
 */
export function createHopCoin(o = {}) { return createCoinMesh(o); }

/* ----------------------------------------------------------------- ground */

/** Static ground slab: soft sage grass on top, peach-sand clay front. */
function buildSlab(len) {
  const b = new ClayBuilder({ themed: true });
  const H = 0.36, D = HOP_GROUND_DEPTH;
  b.add(roundedBox(len, H, D, 0.12, 3), topCoat(COL.soil, COL.grass, H / 2 - 0.07, 0.025), { position: [0, -H / 2, 0], shade: 0.1, night: topCoat(EVE.soil, EVE.grass, H / 2 - 0.07, 0.025) });
  // a darker band low on the front gives the strip weight without a hard shadow
  b.add(roundedBox(len, 0.08, 0.04, 0.02, 2), COL.soilLow, { position: [0, -H + 0.07, D / 2 - 0.006], shade: 0, night: EVE.soilLow });
  const m = b.buildMesh('hop-ground:slab');
  return m;
}

/** Decorations for one tile, x in [0, T). Same layout every tile so it repeats cleanly. */
function addTileDeco(b, x0) {
  const T = HOP_GROUND_TILE, D = HOP_GROUND_DEPTH, front = D / 2;
  // scalloped grass lip along the front top edge
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * (T / n);
    b.add(sphere(0.085, 9, 5), COL.grassEdge, { position: [x, -0.05, front - 0.035], scale: [1.25, 0.7, 0.55], shade: 0.04, night: EVE.grassEdge });
  }
  // tufts (three soft blades), a tiny flower, two pebbles on top
  for (const [tx, tz] of [[0.25, 0.1], [1.05, -0.25]]) {
    for (const [dx, a, l] of [[-0.03, 0.35, 0.06], [0, 0, 0.09], [0.03, -0.35, 0.06]]) {
      b.add(capsule(0.016, l, 2, 6), COL.tuft, { position: [x0 + tx + dx, l / 2 + 0.01, tz], rotation: [0, 0, a], shade: 0.05 });
    }
  }
  const fx = x0 + 0.7, fz = 0.3;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    b.add(sphere(0.026, 8, 6), COL.flower, { position: [fx + Math.cos(a) * 0.03, 0.012, fz + Math.sin(a) * 0.03], scale: [1, 0.45, 1], shade: 0 });
  }
  b.add(sphere(0.018, 8, 6), COL.flowerMid, { position: [fx, 0.02, fz], scale: [1, 0.6, 1], shade: 0 });
  b.add(sphere(0.045, 10, 6), COL.pebble, { position: [x0 + 1.35, 0.004, 0.18], scale: [1.3, 0.45, 1], shade: 0.04 });
  b.add(sphere(0.03, 8, 6), COL.pebble, { position: [x0 + 0.45, 0.003, -0.35], scale: [1.3, 0.45, 1], shade: 0.04 });
  // little clay pebbles pressed into the front face
  for (const [px, py, r] of [[0.3, -0.2, 0.03], [0.95, -0.15, 0.022], [1.4, -0.24, 0.026]]) {
    b.add(sphere(r, 8, 6), COL.soilLow, { position: [x0 + px, py, front + 0.002], scale: [1.3, 1, 0.35], shade: 0, night: EVE.soil });
  }
}

/**
 * A long clay ground strip for the hop game whose decorations scroll and tile.
 * The slab itself is uniform along X, so only one merged decoration mesh moves.
 * @param {number} width  visible play width in world units (the strip is built a tile longer on each side)
 * @returns {{object3d: THREE.Group, scroll: (dx: number) => void, setOffset: (x: number) => void,
 *   tileLength: number, depth: number, width: number, dispose: () => void}}
 *   Top surface at y = 0, centred on x = 0, z = 0 (front edge at z = +depth/2).
 *   `scroll(dx)` moves the ground by `dx` toward -X (pass `speed * dt`); no allocation.
 *   Themed: call `applyMinigameTheme(object3d, theme)`.
 */
export function createHopGround(width = 7) {
  const T = HOP_GROUND_TILE;
  const tiles = Math.ceil(width / T) + 3;
  const span = tiles * T;
  const group = new THREE.Group();
  group.name = 'minigame:hop-ground';
  const slab = buildSlab(width + 2 * T);
  const b = new ClayBuilder({ themed: true });
  for (let i = 0; i < tiles; i++) addTileDeco(b, -span / 2 + i * T);
  const deco = b.buildMesh('hop-ground:deco');
  // the deco mesh spans [-span/2, span/2]; we shift it within [0, T) so it always covers the view
  deco.frustumCulled = false;
  group.add(slab, deco);
  let off = 0;
  const setOffset = (x) => { off = ((x % T) + T) % T; deco.position.x = -off; };
  return {
    object3d: group,
    scroll(dx) { setOffset(off + dx); },
    setOffset,
    tileLength: T,
    depth: HOP_GROUND_DEPTH,
    width,
    dispose() { slab.geometry.dispose(); deco.geometry.dispose(); group.removeFromParent(); },
  };
}
