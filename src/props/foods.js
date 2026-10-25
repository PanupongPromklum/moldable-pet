/**
 * foods.js — clay food meshes (owner: prop). Ids match assets/data/foods.json (loop).
 *
 * Each food is one merged, vertex-coloured mesh (one draw call) using the shared
 * clay material, wrapped in a Group whose origin is the food's centre and whose
 * largest side is FOOD_SIZE units. Geometry is cached per id and shared, so
 * creating a food every drag is cheap; do not dispose the geometry.
 */
import * as THREE from 'three';
import { ClayBuilder, BRAND, PALETTE, lighten, roundedBox, capsule, sphere, torus, lathe, blob, getSharedClayMaterial } from './clay.js';

/** Largest side of every food, in world units. */
export const FOOD_SIZE = 0.45;
/** Food ids in tray order. */
export const FOOD_IDS = Object.freeze(['onigiri', 'banana', 'cupcake', 'apple', 'bun', 'milk']);
/** Thai names (fallback only; foods.json `name` is the source of truth). */
export const FOOD_NAMES_TH = Object.freeze({ onigiri: 'ข้าวปั้น', banana: 'กล้วย', cupcake: 'คัพเค้ก', apple: 'แอปเปิล', bun: 'ซาลาเปา', milk: 'นม' });

const RECIPES = {
  onigiri(b) {
    // rounded triangle of rice, nori band at the bottom front, tiny sesame dots
    b.add(blob(0.5, {
      detail: 5,
      fn: (d, out) => {
        const a = Math.atan2(d.y, d.x);
        const k = 1 + 0.16 * Math.cos(3 * (a - Math.PI / 2));
        out.set(d.x * k, d.y * k, d.z * 0.62);
      },
    }), '#FFFFFF', { shade: 0.06 });
    b.add(roundedBox(0.42, 0.34, 0.66, 0.08), PALETTE.ink, { position: [0, -0.33, 0], shade: 0.04 });
    for (const [x, y] of [[-0.2, 0.15], [0.14, 0.25], [0.24, -0.02], [-0.05, 0.38]]) b.add(capsule(0.012, 0.02, 2, 6), '#F1E6D4', { position: [x, y, 0.3], rotation: [0, 0, x * 3] });
  },
  banana(b) {
    // bent ellipsoid, darker tips
    b.add(blob(1, {
      detail: 4,
      fn: (d, out) => {
        const x = d.x * 1.25, y = d.y * 0.27, z = d.z * 0.27;
        out.set(x, y + 0.42 * x * x - 0.2, z);
      },
    }), (x, y, z, c) => c.set(Math.abs(x) > 1.12 ? '#B9A185' : '#F6DE8D').lerp(new THREE.Color('#F9EBB7'), y > 0.15 + 0.42 * x * x - 0.2 ? 0.4 : 0), { shade: 0.1 });
    b.add(capsule(0.06, 0.14, 3, 8), '#C9B08D', { position: [-1.28, 0.55, 0], rotation: [0, 0, 0.7] });
  },
  cupcake(b) {
    // ribbed liner, swirl of frosting, cherry, sprinkles
    const liner = new THREE.CylinderGeometry(0.42, 0.31, 0.42, 36, 1, false);
    const p = liner.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.035 * Math.cos(a * 12);
      p.setX(i, x * k); p.setZ(i, z * k);
    }
    liner.computeVertexNormals();
    b.add(liner, lighten(BRAND.lavender, 0.3), { position: [0, -0.22, 0], shade: 0.12 });
    const FROST = lighten(BRAND.pink, 0.62);
    b.add(torus(0.33, 0.15, 12, 32), FROST, { position: [0, 0.02, 0], rotation: [Math.PI / 2, 0, 0] });
    b.add(torus(0.21, 0.13, 12, 28), FROST, { position: [0, 0.18, 0], rotation: [Math.PI / 2, 0, 0.6] });
    b.add(sphere(0.15, 18, 12), FROST, { position: [0, 0.31, 0], scale: [1, 1.1, 1] });
    b.add(sphere(0.1, 16, 12), BRAND.pink, { position: [0.02, 0.5, 0] });
    b.add(capsule(0.012, 0.1, 2, 6), '#B79A86', { position: [0.06, 0.62, 0], rotation: [0, 0, -0.5] });
    const sprinkle = [BRAND.teal, BRAND.periwinkle, '#FFFFFF', BRAND.lavender];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.3, r = 0.2 + (i % 3) * 0.06, y = 0.08 + (i % 3) * 0.08;
      b.add(capsule(0.016, 0.04, 2, 6), lighten(sprinkle[i % 4], 0.15), { position: [Math.cos(a) * r, y + 0.1, Math.sin(a) * r], rotation: [a, a * 0.7, 1.2] });
    }
  },
  apple(b) {
    b.add(blob(0.5, {
      detail: 5,
      fn: (d, out) => {
        const rxz = Math.hypot(d.x, d.z);
        const dent = d.y > 0 ? 0.22 * Math.exp(-(rxz * rxz) / 0.05) : 0.12 * Math.exp(-(rxz * rxz) / 0.04);
        out.set(d.x * 1.04, d.y * 0.92 - Math.sign(d.y) * dent, d.z * 1.04);
      },
    }), (x, y, z, c) => c.set('#F2A7B2').lerp(new THREE.Color('#F7C9C0'), THREE.MathUtils.clamp(-y * 1.2 + 0.1, 0, 0.6)), { shade: 0.08 });
    b.add(capsule(0.03, 0.14, 3, 8), '#B79A86', { position: [0.02, 0.42, 0], rotation: [0, 0, -0.25] });
    b.add(blob(0.1, { detail: 2, wobble: 0.03 }), lighten(BRAND.teal, 0.2), { position: [0.14, 0.47, 0], rotation: [0.2, 0, -0.9], scale: [1.4, 0.55, 0.3] });
    b.add(sphere(0.07, 10, 8), '#FFFFFF', { position: [-0.22, 0.18, 0.4], scale: [1.2, 0.7, 0.3] });
  },
  bun(b) {
    // ซาลาเปา: soft dome, pleats meeting at a twisted top, pink dot
    b.add(lathe([[0, -0.3], [0.38, -0.3], [0.5, -0.24], [0.54, -0.12], [0.5, 0.04], [0.38, 0.18], [0.2, 0.27], [0, 0.29]], 36), '#FBF4EC', { shade: 0.1 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.add(capsule(0.025, 0.2, 3, 6), '#F3E7DA', { position: [Math.cos(a) * 0.15, 0.24, Math.sin(a) * 0.15], rotation: [Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05] });
    }
    b.add(sphere(0.07, 12, 10), '#F7EDE2', { position: [0, 0.31, 0], scale: [1, 0.8, 1] });
    b.add(sphere(0.045, 10, 8), lighten(BRAND.pink, 0.3), { position: [0, 0.36, 0], scale: [1, 0.6, 1] });
  },
  milk(b) {
    b.add(lathe([[0, 0], [0.25, 0], [0.28, 0.04], [0.29, 0.56], [0.24, 0.7], [0.14, 0.8], [0.13, 0.88], [0, 0.88]], 30), '#FFFFFF', { position: [0, -0.5, 0], shade: 0.06 });
    b.add(lathe([[0.296, 0], [0.296, 0.26], [0, 0.26]], 30), lighten(BRAND.periwinkle, 0.35), { position: [0, -0.3, 0], shade: 0 });
    b.add(roundedBox(0.32, 0.12, 0.32, 0.05), BRAND.periwinkle, { position: [0, 0.42, 0], scale: [1, 1, 1], shade: 0.05 });
    b.add(blob(0.07, { detail: 2, seed: 3 }), '#FFFFFF', { position: [0, -0.17, 0.29], scale: [1.3, 1, 0.3], shade: 0 });
  },
};

const cache = new Map();

function buildGeometry(id) {
  const b = new ClayBuilder();
  RECIPES[id](b);
  const mesh = b.buildMesh();
  const g = mesh.geometry;
  g.computeBoundingBox();
  const box = g.boundingBox, size = new THREE.Vector3(), centre = new THREE.Vector3();
  box.getSize(size); box.getCenter(centre);
  const s = FOOD_SIZE / Math.max(size.x, size.y, size.z);
  g.translate(-centre.x, -centre.y, -centre.z);
  g.scale(s, s, s);
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.shared = true;
  return g;
}

/**
 * Create a clay food.
 * @param {string} id  one of {@link FOOD_IDS}
 * @param {{material?: THREE.Material}} [o]  pass your own material to fade one food (default: shared clay)
 * @returns {THREE.Group} about FOOD_SIZE across, origin at its centre, `userData.foodId` set
 */
export function createFoodMesh(id, o = {}) {
  let key = id;
  if (!RECIPES[key]) { console.warn(`createFoodMesh: unknown food "${id}", using apple`); key = 'apple'; }
  if (!cache.has(key)) cache.set(key, buildGeometry(key));
  const mesh = new THREE.Mesh(cache.get(key), o.material ?? getSharedClayMaterial());
  mesh.name = 'food:' + key;
  const group = new THREE.Group();
  group.name = 'food:' + id;
  group.userData.foodId = id;
  group.add(mesh);
  return group;
}
