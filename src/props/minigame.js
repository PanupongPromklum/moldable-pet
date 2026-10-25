/**
 * minigame.js — clay meshes for the "ฝนขนม" (Snack Rain) minigame (owner: prop).
 * Contract: docs/architecture/module-contracts.md "Sprint 2 additions → Minigame".
 *
 * Both meshes share one cached geometry each (built on first use) and the shared
 * matte clay material, so any number of falling coins/demons costs one draw call
 * per visible instance and no extra geometry memory. Snacks reuse
 * `createFoodMesh()` from ./foods.js.
 *
 * @example
 *   import { createCoinMesh, createDemonMesh } from './props/minigame.js';
 *   const coin = createCoinMesh();   // THREE.Group ~0.4 units across, origin at centre, faces +Z
 *   const demon = createDemonMesh(); // THREE.Group ~0.5 units across, origin at centre, faces +Z
 *   scene.add(coin, demon);
 *   coin.rotation.y += dt * 2;       // a slow spin reads well (the star is on both faces)
 */
import * as THREE from 'three';
import { ClayBuilder, capsule, sphere, torus, lathe, puck, blob, gradientY, getSharedClayMaterial } from './clay.js';

/** Largest dimension of the coin, world units. */
export const COIN_SIZE = 0.4;
/** Largest dimension of the client-demon, world units. */
export const DEMON_SIZE = 0.5;

/** Coin and demon tints (soft, matte; muted pink/plum for the "bad" item, never bright red). */
const COL = {
  coin: '#F2D79A', coinRim: '#E6C47E', coinStar: '#FBEBC4',
  demonTop: '#A57599', demonLow: '#C79ABD', horn: '#7C5A86', ink: '#43345A', cheek: '#E8A3BF', white: '#FFFFFF',
};

/** Five-point star outline (soft, chunky proportions). */
function starShape(outer, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

const RECIPES = {
  coin(b) {
    // chunky disc facing +Z (puck stands on Y → turn it so its thickness runs along Z)
    const T = 0.1;
    b.add(puck(0.2, T, 36), COL.coin, { rotation: [Math.PI / 2, 0, 0], position: [0, 0, -T / 2], shade: 0.06 });
    for (const side of [1, -1]) {
      // raised inner ring and a softly bevelled star on both faces
      b.add(torus(0.152, 0.014, 8, 40), COL.coinRim, { position: [0, 0, side * (T / 2 - 0.004)], shade: 0 });
      const star = new THREE.ExtrudeGeometry(starShape(0.088, 0.042), {
        depth: 0.006, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 4,
      });
      b.add(star, COL.coinStar, { position: [0, -0.004, side * (T / 2 - 0.006)], rotation: [0, side > 0 ? 0 : Math.PI, 0], shade: 0.04 });
    }
  },

  demon(b) {
    const R = 0.2;
    // round body, darker plum on top fading to a lighter pink belly
    b.add(blob(R, { seed: 7, wobble: 0.04, detail: 4 }), gradientY(COL.demonLow, COL.demonTop, -R, R), { scale: [1.1, 0.95, 0.95], shade: 0.08 });
    // tiny rounded horns, tilted outward
    for (const s of [-1, 1]) {
      b.add(lathe([[0, 0], [0.042, 0], [0.04, 0.03], [0.028, 0.07], [0.014, 0.096], [0, 0.104]], 14), COL.horn,
        { position: [s * 0.095, 0.15, -0.01], rotation: [0, 0, -s * 0.5], shade: 0.05 });
    }
    // eyes: dark ovals with a small highlight
    for (const s of [-1, 1]) {
      b.add(sphere(0.032, 14, 10), COL.ink, { position: [s * 0.07, 0.025, 0.172], scale: [0.85, 1.1, 0.5], shade: 0 });
      b.add(sphere(0.01, 8, 6), COL.white, { position: [s * 0.07 + 0.01, 0.04, 0.186], shade: 0 });
    }
    // grumpy brows: inner ends lower ("\ /")
    b.add(capsule(0.014, 0.06, 3, 8), COL.ink, { position: [-0.072, 0.092, 0.162], rotation: [0, 0, 1.15], shade: 0 });
    b.add(capsule(0.014, 0.06, 3, 8), COL.ink, { position: [0.072, 0.092, 0.162], rotation: [0, 0, -1.15], shade: 0 });
    // small frown (upper half of a ring = ∩)
    b.add(torus(0.036, 0.011, 6, 16, Math.PI), COL.ink, { position: [0, -0.085, 0.176], shade: 0 });
    // soft cheeks
    for (const s of [-1, 1]) b.add(sphere(0.03, 12, 8), COL.cheek, { position: [s * 0.125, -0.045, 0.148], rotation: [0, s * 0.6, 0], scale: [1.2, 0.7, 0.35], shade: 0 });
    // stubby arms and feet
    for (const s of [-1, 1]) {
      b.add(capsule(0.03, 0.03, 4, 10), COL.demonLow, { position: [s * 0.215, -0.05, 0.02], rotation: [0, 0, s * 0.9], shade: 0.05 });
      b.add(sphere(0.042, 14, 10), COL.demonTop, { position: [s * 0.08, -0.175, 0.04], scale: [1.15, 0.6, 1.2], shade: 0.06 });
    }
  },
};

const SIZE = { coin: COIN_SIZE, demon: DEMON_SIZE };
const cache = new Map();

function buildGeometry(kind) {
  const b = new ClayBuilder();
  RECIPES[kind](b);
  const g = b.buildMesh().geometry;
  g.computeBoundingBox();
  const size = new THREE.Vector3(), centre = new THREE.Vector3();
  g.boundingBox.getSize(size); g.boundingBox.getCenter(centre);
  const s = SIZE[kind] / Math.max(size.x, size.y, size.z);
  g.translate(-centre.x, -centre.y, -centre.z);
  g.scale(s, s, s);
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.shared = true;   // disposeTree() keeps it
  return g;
}

function make(kind, o) {
  if (!cache.has(kind)) cache.set(kind, buildGeometry(kind));
  const mesh = new THREE.Mesh(cache.get(kind), o.material ?? getSharedClayMaterial());
  mesh.name = 'minigame:' + kind;
  const group = new THREE.Group();
  group.name = 'minigame:' + kind;
  group.userData.minigameItem = kind;
  group.add(mesh);
  return group;
}

/**
 * A chunky clay coin (soft gold-cream, star emboss on both faces).
 * @param {{material?: THREE.Material}} [o]  pass your own material to fade one coin (default: shared clay)
 * @returns {THREE.Group} {@link COIN_SIZE} across, origin at its centre, faces +Z, `userData.minigameItem = 'coin'`
 */
export function createCoinMesh(o = {}) { return make('coin', o); }

/**
 * A small grumpy client-demon blob (ปีศาจลูกค้า): muted plum body, tiny horns,
 * frowning brows and mouth. Mischievous, not scary.
 * @param {{material?: THREE.Material}} [o]  pass your own material to fade one demon (default: shared clay)
 * @returns {THREE.Group} {@link DEMON_SIZE} across, origin at its centre, faces +Z, `userData.minigameItem = 'demon'`
 */
export function createDemonMesh(o = {}) { return make('demon', o); }
