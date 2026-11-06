/**
 * Outfit accessories (stories S2-06, S4-04): 16 clay items (11 basic + 5 Christmas) in 3 slots that fit all six blob shapes.
 *
 * Contract: docs/architecture/module-contracts.md → "Sprint 2 additions → Outfits".
 *   import { ACCESSORY_IDS, SLOT_OF } from './characters/accessories.js';
 *   pet.setOutfit({ head, eyes, body }); pet.getOutfit();
 *
 * Every builder takes a per-shape `fit` (src/characters/fit.js: head top, eye centres and lens
 * sizes, chest anchor, front/back height map) and returns `{ group, anchor }`:
 *  - `group` holds meshes whose geometry is already in the character's body space (the `turn`
 *    group); the character parents it there so the item follows squash/stretch, carry, sitting
 *    and head turn, and offsets `group.position` by the soft-body dent at `anchor` (poke / grab).
 *  - each item owns its geometries and materials; `disposeAccessory(group)` frees them.
 *  - optional `tick(dt, turnMatrixWorld)` (S4-04: bell, santa pom-pom) swings a hanging part; the
 *    character calls it once per frame after posing (skipped under prefers-reduced-motion).
 *
 * Look: soft matte clay (rough physical material with sheen like the bodies), rounded bevels,
 * brand tints #7FA9B1 #9BB0DE #CBA5D1 #EB92B3 plus soft neutrals; no textures, no hard shadows.
 */
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Slot of every item id (Sprint 2 basics + Sprint 4 Christmas set, grouped by slot). */
export const SLOT_OF = Object.freeze({
  'hat-beanie': 'head', 'hat-party': 'head', 'bow-ribbon': 'head', 'crown-flower': 'head', 'hat-santa': 'head', 'antlers': 'head',
  'glasses-round': 'eyes', 'glasses-sun': 'eyes', 'glasses-star': 'eyes', 'glasses-snow': 'eyes',
  'tie-neck': 'body', 'tie-bow': 'body', 'scarf': 'body', 'badge-star': 'body', 'scarf-xmas': 'body', 'bell-collar': 'body',
});
/** All item ids, slot order head → eyes → body. */
export const ACCESSORY_IDS = Object.freeze(Object.keys(SLOT_OF));
/** Outfit slots. */
export const SLOTS = Object.freeze(['head', 'eyes', 'body']);
/** Thai names (debug / demo; the shipped names live in assets/data/wardrobe.json). */
export const ACCESSORY_TH = Object.freeze({
  'hat-beanie': 'หมวกไหมพรม', 'hat-party': 'หมวกปาร์ตี้', 'bow-ribbon': 'โบว์', 'crown-flower': 'มงกุฎดอกไม้',
  'hat-santa': 'หมวกซานต้า', 'antlers': 'เขากวาง',
  'glasses-round': 'แว่นกลม', 'glasses-sun': 'แว่นกันแดด', 'glasses-star': 'แว่นดาว', 'glasses-snow': 'แว่นเกล็ดหิมะ',
  'tie-neck': 'เน็คไท', 'tie-bow': 'หูกระต่าย', 'scarf': 'ผ้าพันคอ', 'badge-star': 'เข็มกลัดดาว',
  'scarf-xmas': 'ผ้าพันคอคริสต์มาส', 'bell-collar': 'กระดิ่ง',
});
/** Christmas set ids (Sprint 4; the shop theme itself lives in wardrobe.json `theme`). */
export const XMAS_ACCESSORY_IDS = Object.freeze(['hat-santa', 'antlers', 'glasses-snow', 'scarf-xmas', 'bell-collar']);

/** Palette: brand tints + soft neutrals. */
const COL = { teal: '#7FA9B1', blue: '#9BB0DE', lilac: '#CBA5D1', pink: '#EB92B3', cream: '#FBF4EA', ink: '#565A7C', lens: '#3E4364', white: '#FFFFFF' };
/**
 * Christmas tones. `frost` is the DS border/primary value (#8296D2); the rest are [เสนอ] proposals
 * (not in design.md yet): muted berry / pine-sage / soft gold / antler tan, all HSL s ≤ 60 %,
 * large surfaces l ≥ 70 % (asset-style-sheet §3). Never bright red or bright green.
 */
const XM = {
  berry: '#D98BA5', berryDeep: '#CC8299', sage: '#A9C6B2', sageDeep: '#95B59F',
  gold: '#E6CF9F', goldDeep: '#D6BC86', tan: '#E3C9AC', tanDeep: '#D2B596', frost: '#8296D2', snow: '#FFFFFF',
};

/* ---------------------------------------------------------------- helpers */

function clay(hex, extra = {}) {
  const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl);
  return new THREE.MeshPhysicalMaterial({
    color: c, roughness: .86, sheen: .8, sheenRoughness: .45, sheenColor: new THREE.Color().setHSL(hsl.h, .45, .95),
    envMapIntensity: .35, ...extra,
  });
}
function mesh(geo, mat, name) { const m = new THREE.Mesh(geo, mat); m.name = name || ''; return m; }

/** Closed superellipse loop around the body at height y (front half zF > 0, back half zB < 0). */
function loopPoints(cx, y, a, zF, zB, p = 2.4, n = 48, sag = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const x = cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
    const z = (s > 0 ? zF : -zB) * Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
    pts.push(new THREE.Vector3(x, y - sag * Math.max(0, s) ** 2, z));
  }
  return pts;
}
function tubeLoop(pts, r, seg = 72, radial = 10) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), seg, r, radial, true);
}
/** Polygon with rounded corners as a THREE.Shape (or Path when asPath). */
function roundedPoly(pts, r, asPath = false) {
  const s = asPath ? new THREE.Path() : new THREE.Shape(), n = pts.length, A = [], B = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, la * .45), rb = Math.min(r, lb * .45);
    A.push([p[0] + (a[0] - p[0]) / la * ra, p[1] + (a[1] - p[1]) / la * ra]);
    B.push([p[0] + (b[0] - p[0]) / lb * rb, p[1] + (b[1] - p[1]) / lb * rb]);
  }
  s.moveTo(B[n - 1][0], B[n - 1][1]);
  for (let i = 0; i < n; i++) { s.lineTo(A[i][0], A[i][1]); s.quadraticCurveTo(pts[i][0], pts[i][1], B[i][0], B[i][1]); }
  return s;
}
/** Clip a polygon to the half-plane x ≤ c (Sutherland–Hodgman). */
function clipX(pts, c) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = a[0] <= c, ib = b[0] <= c;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (c - a[0]) / (b[0] - a[0]); out.push([c, a[1] + t * (b[1] - a[1])]); }
  }
  return out;
}
function starPts(ro, ri, k = 5, rot = Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < k * 2; i++) { const t = rot + i * Math.PI / k, r = i % 2 ? ri : ro; pts.push([Math.cos(t) * r, Math.sin(t) * r]); }
  return pts;
}
function ellipsePath(rx, ry, rot, asPath = true, n = 28) {
  const s = asPath ? new THREE.Path() : new THREE.Shape(), c = Math.cos(rot), si = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const t = i / n * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry, X = x * c - y * si, Y = x * si + y * c;
    i ? s.lineTo(X, Y) : s.moveTo(X, Y);
  }
  return s;
}
function soft(shape, depth, bevel, curveSegments = 4) {
  const ex = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .85, bevelSegments: 2, curveSegments });
  ex.deleteAttribute('uv'); ex.deleteAttribute('normal');
  const g = mergeVertices(ex, 1e-5); ex.dispose();   // shared vertices → soft, rounded clay shading
  g.translate(0, 0, -depth / 2); g.computeVertexNormals();
  return g;
}
/**
 * Shrink-wrap a flat geometry (built around 0,0 in the xy plane) onto the body front at (ax, ay):
 * every vertex lands at the surface height plus `gap` plus its own local z. Optional in-plane
 * rotation `rot`. Normals are recomputed.
 */
function wrap(geo, fit, ax, ay, gap, rot = 0) {
  const p = geo.attributes.position, c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < p.count; i++) {
    const lx = p.getX(i), ly = p.getY(i), x = ax + lx * c - ly * s, y = ay + lx * s + ly * c;
    p.setXYZ(i, x, y, fit.frontZ(x, y) + gap + p.getZ(i));
  }
  p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
}
/** Unit lathe (radius 1, height 1) reshaped into a body-hugging dome: x·a, z·(zF|zB), y·H. */
function shapeLathe(geo, cx, yb, a, H, zF, zB) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, cx + x * a, yb + y * H, z * (z > 0 ? zF : -zB));
  }
  p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
}
/** Lens frame: an Object3D at the eye, facing out of the face (normal blended toward +Z). */
function lensFrame(fit, e, lift) {
  const o = new THREE.Object3D(), n = e.n.clone().add(new THREE.Vector3(0, 0, .8)).normalize();
  o.position.set(e.x, e.cy, e.z + lift);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  o.updateMatrix();
  return o;
}
function lensPoint(frame, x, y, z = 0) { return new THREE.Vector3(x, y, z).applyMatrix4(frame.matrix); }
function ellipseLocal(rx, ry, rot, p = 2, n = 56) {
  const pts = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
    const x = rx * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / p), y = ry * Math.sign(st) * Math.pow(Math.abs(st), 2 / p);
    pts.push(new THREE.Vector3(x * c - y * s, x * s + y * c, 0));
  }
  return pts;
}
/** Bridge + short temple arms shared by all eyewear. Lenses: [{ frame, inner: [x,y], outer: [x,y] }] (left, right). */
function eyewearLinks(fit, g, mat, lenses, tube, bridgeLift = .028) {
  const [L, R] = lenses, pL = lensPoint(L.frame, ...L.inner), pR = lensPoint(R.frame, ...R.inner);
  if (!L.merged && pL.distanceTo(pR) > tube * 2.2) {
    const mid = pL.clone().add(pR).multiplyScalar(.5);
    const zs = fit.frontZ(mid.x, mid.y) + tube + bridgeLift;
    const ctrl = new THREE.Vector3(mid.x, mid.y + .018, Math.max(zs, mid.z + .012));
    g.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(pL, ctrl, pR), 16, tube * .9, 8), mat, 'bridge'));
  }
  for (const [lens, side] of [[L, -1], [R, 1]]) {
    const o = lensPoint(lens.frame, ...lens.outer), e = lens.e;
    const sp = fit.span(e.cy, e.x);
    let ex = o.x + side * .05;
    if (sp) ex = side < 0 ? Math.max(ex, sp.l + .035) : Math.min(ex, sp.r - .035);
    const ey = e.cy + .012, ez = fit.frontZ(ex, ey) - .03;
    const ctrl = new THREE.Vector3(o.x + side * .015, (o.y + ey) / 2, Math.max(o.z - .01, ez + .02));
    g.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(o, ctrl, new THREE.Vector3(ex, ey, ez)), 12, tube * .75, 8), mat, 'arm'));
  }
}
function eyesAnchor(fit) {
  const [a, b] = fit.eyes, x = (a.x + b.x) / 2, y = (a.cy + b.cy) / 2;
  return new THREE.Vector3(x, y, fit.frontZ(x, y));
}
/** Head cross-section ring data at height y. */
function section(fit, y, nearX) {
  const sp = fit.span(y, nearX) || { cx: nearX, hw: .15, l: nearX - .15, r: nearX + .15 };
  return { ...sp, zF: Math.max(.04, fit.frontZ(sp.cx, y)), zB: Math.min(-.04, fit.backZ(sp.cx, y)) };
}
function maxTop(fit, l, r) { let t = -Infinity; for (let i = 0; i <= 16; i++) t = Math.max(t, fit.topAt(l + (r - l) * i / 16)); return t; }

/** Position + normal only, shared vertices merged, smooth normals (soft clay shading, no seams). */
function smoothGeo(geo) {
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'color') geo.deleteAttribute(k);
  const g = mergeVertices(geo, 1e-5); geo.dispose(); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
/** Merge several geometries of one material into one mesh geometry (fewer draw calls). */
function mergeAll(geos) {
  for (const g of geos) for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const out = mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g));
  geos.forEach(g => g.dispose());
  return mergeVertices(out, 1e-6);
}
/**
 * Reshape the rings of a TubeGeometry: `fn(i, u)` → { k, ky } scales each ring's offset from the
 * path (k = radial / horizontal, ky = vertical; omit ky for a uniform scale).
 */
function shapeTube(tube, fn) {
  const { path, tubularSegments: seg, radialSegments: rad } = tube.parameters, p = tube.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    path.getPointAt(i / seg, c); const { k, ky = k } = fn(i, i / seg);
    for (let j = 0; j <= rad; j++) {
      const n = i * (rad + 1) + j;
      p.setXYZ(n, c.x + (p.getX(n) - c.x) * k, c.y + (p.getY(n) - c.y) * ky, c.z + (p.getZ(n) - c.z) * k);
    }
  }
  p.needsUpdate = true;
  return tube;
}
/** Per-ring vertex colours for a TubeGeometry (stripes across a knitted band). */
function tubeColors(tube, colorAt) {
  const { tubularSegments: seg, radialSegments: rad } = tube.parameters, arr = new Float32Array((seg + 1) * (rad + 1) * 3), c = new THREE.Color();
  for (let i = 0; i <= seg; i++) { c.set(colorAt(i / seg)); for (let j = 0; j <= rad; j++) c.toArray(arr, (i * (rad + 1) + j) * 3); }
  tube.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return tube;
}
/**
 * Closed loop that hugs the real body surface at height y (front from the height map, back from the
 * back map, sides from the silhouette span), pushed `off` outward. The front droops by `sag`.
 */
function hugLoop(fit, y, nearX, off, sag = 0, n = 64) {
  const sp = fit.span(y, nearX) || { cx: nearX, hw: .2 }, pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), yy = y - sag * Math.max(0, s) ** 2;
    const sp2 = fit.span(yy, sp.cx) || sp, zF = fit.frontZ(sp2.cx, yy), zB = fit.backZ(sp2.cx, yy);
    // march out along the ellipse direction until the point leaves the body
    let lo = 0, hi = 1.6;
    const at = k => [sp2.cx + c * sp2.hw * k, (s > 0 ? zF : -zB) * s * k];
    for (let it = 0; it < 18; it++) {
      const m = (lo + hi) / 2, [x, z] = at(m);
      const inBody = fit.inside(x, yy) && z <= fit.frontZ(x, yy) + 1e-4 && z >= fit.backZ(x, yy) - 1e-4;
      inBody ? lo = m : hi = m;
    }
    const [x, z] = at(lo), nx = c / Math.max(.05, sp2.hw), nz = s / Math.max(.05, s > 0 ? zF : -zB), L = Math.hypot(nx, nz) || 1;
    pts.push(new THREE.Vector3(x + nx / L * off, yy, z + nz / L * off));
  }
  return pts;
}
/**
 * Gentle pendulum for a hanging part (bell, pom-pom). The `pivot` swings toward the effective
 * gravity at `local` (its point in body space): gravity minus the point's world acceleration,
 * so carry, hops and squash make it jiggle; a damped spring with a small overshoot (never a hard
 * bounce). `backMax` limits the swing into the body (−X rotation).
 * @returns {(dt: number, turnMatrixWorld: THREE.Matrix4) => void}
 */
function pendulum(pivot, local, { k = 55, zeta = .3, gain = .35, maxA = .45, backMax = .08 } = {}) {
  const pw = new THREE.Vector3(), prev = new THREE.Vector3(), vel = new THREE.Vector3(), acc = new THREE.Vector3(), a = new THREE.Vector3();
  const d = new THREE.Vector3(), inv = new THREE.Matrix4(), st = { x: 0, vx: 0, z: 0, vz: 0 }, c = 2 * zeta * Math.sqrt(k);
  let ready = false;
  return function tick(dt, M) {
    pw.copy(local).applyMatrix4(M);
    if (!ready) { prev.copy(pw); vel.set(0, 0, 0); ready = true; return; }
    if (!(dt > 0)) return;
    const v = d.copy(pw).sub(prev).divideScalar(dt); prev.copy(pw);
    a.copy(v).sub(vel).divideScalar(dt); vel.copy(v);
    if (a.length() > 30) a.setLength(30);                       // teleports (room change) never fling it
    acc.lerp(a, 1 - Math.exp(-dt * 18));
    d.set(0, -9.8, 0).addScaledVector(acc, -gain).transformDirection(inv.copy(M).invert());
    const tz = clamp(Math.atan2(d.x, -d.y), -maxA, maxA), tx = clamp(Math.atan2(-d.z, -d.y), -maxA, backMax);
    st.vx += (-k * (st.x - tx) - c * st.vx) * dt; st.x += st.vx * dt;
    st.vz += (-k * (st.z - tz) - c * st.vz) * dt; st.z += st.vz * dt;
    // smooth saturation (no hard stop): the swing eases into its limits, and barely into the body
    const rx = st.x > 0 ? backMax * Math.tanh(st.x / backMax) : -maxA * Math.tanh(-st.x / maxA);
    pivot.rotation.set(rx, 0, maxA * Math.tanh(st.z / maxA));
  };
}

/* ---------------------------------------------------------------- head */

function hatBeanie(fit) {
  const g = new THREE.Group(), s = fit.size, cuffR = .036 * s;
  const yb = Math.max(fit.head.top - .3 * s, fit.head.minY + cuffR * .9);
  const sec = section(fit, yb, fit.head.x);
  const a = sec.hw * 1.05 + .014, zF = sec.zF * 1.07 + .014, zB = sec.zB * 1.07 - .014;
  const capH = maxTop(fit, sec.l, sec.r) - yb;
  const H = clamp(Math.max(capH * 1.12 + .06, .8 * a + .07), .16, .72);
  const prof = []; for (let i = 0; i <= 18; i++) { const t = i / 18 * Math.PI / 2; prof.push(new THREE.Vector2(Math.pow(Math.cos(t), 2 / 2.5), Math.pow(Math.sin(t), 2 / 2.5))); }
  const domeMat = clay(COL.teal, { side: THREE.DoubleSide }), cuffMat = clay('#92B9BF'), pomMat = clay(COL.cream);
  g.add(mesh(shapeLathe(new THREE.LatheGeometry(prof, 48, Math.PI), sec.cx, yb, a, H, zF, zB), domeMat, 'dome'));
  for (const [dy, k] of [[cuffR * .3, .3], [cuffR * 1.75, .14]]) {
    const yy = yb + dy, sk = 1 + (dy / H) * -.08;   // the dome narrows a little at the upper roll
    g.add(mesh(tubeLoop(loopPoints(sec.cx, yy, a * sk + cuffR * k, zF * sk + cuffR * k, zB * sk - cuffR * k), cuffR), cuffMat, 'cuff'));
  }
  const pr = clamp(.32 * a, .065, .1) * s;
  const pom = mesh(new THREE.SphereGeometry(pr, 24, 16), pomMat, 'pom');
  pom.position.set(sec.cx, yb + H + pr * .55, (zF + zB) / 2 * .5); g.add(pom);
  return { group: g, anchor: new THREE.Vector3(sec.cx, fit.head.top, 0) };
}

function hatParty(fit) {
  const g = new THREE.Group(), s = fit.size, brimR = .032 * s;
  const sp0 = fit.span(fit.head.top - .12, fit.head.x) || { cx: fit.head.x, hw: .2 };
  const ap = clamp(sp0.hw * .7, .13, .21) * s;
  // sink until the head is about as wide as the hat base (pointy tops), within the eye clearance
  const top = fit.topAt(sp0.cx);
  let yb = top - .03;
  for (let y = top - .03; y > top - .16; y -= .01) { yb = y; const sp = fit.span(y, sp0.cx); if (sp && sp.hw > ap * .8) break; }
  yb = Math.max(yb, fit.head.minY + brimR);
  const zr = (fit.frontZ(sp0.cx, yb) + fit.backZ(sp0.cx, yb)) / 2 + .02;
  const Hp = ap * 2.4;
  const hat = new THREE.Group(); hat.position.set(sp0.cx, yb, zr); hat.rotation.z = -.16; g.add(hat);
  const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(Math.max(.02, (1 - t) * (1 + .1 * Math.sin(Math.PI * t))), t)); }
  const cone = new THREE.LatheGeometry(prof, 40, Math.PI); cone.scale(ap, Hp, ap); cone.computeVertexNormals();
  hat.add(mesh(cone, clay(COL.blue, { side: THREE.DoubleSide }), 'cone'));
  const brim = new THREE.TorusGeometry(ap * 1.02, brimR, 10, 40); brim.rotateX(Math.PI / 2);
  hat.add(mesh(brim, clay(COL.cream), 'brim'));
  const pom = mesh(new THREE.SphereGeometry(ap * .32, 20, 14), clay(COL.pink), 'pom'); pom.position.y = Hp + ap * .12; hat.add(pom);
  const dotMat = clay(COL.cream), dotGeo = new THREE.SphereGeometry(ap * .13, 14, 10);
  for (const [t, phi] of [[.22, -.55], [.3, .6], [.5, 0], [.68, -.45]]) {
    const r = ap * (1 - t) * (1 + .1 * Math.sin(Math.PI * t)), d = mesh(dotGeo, dotMat, 'dot');
    d.position.set(Math.sin(phi) * r, t * Hp, Math.cos(phi) * r); d.scale.set(1, 1, .45);
    d.lookAt(d.position.clone().multiplyScalar(2).setY(d.position.y)); hat.add(d);
  }
  return { group: g, anchor: new THREE.Vector3(sp0.cx, yb, zr) };
}

function bowRibbon(fit) {
  const g = new THREE.Group(), s = clamp(.18 * fit.size, .14, .2);
  const sp = fit.span(fit.head.top - .1, fit.head.x) || { cx: fit.head.x, hw: .2 };
  const bx = sp.cx + sp.hw * .42;
  let by = fit.topAt(bx) - .025;
  by = Math.max(by, fit.head.minY + .68 * s);
  const ry = by - .04, bz = (fit.frontZ(bx, ry) + fit.backZ(bx, ry)) / 2 + .03 + .25 * fit.frontZ(bx, ry);
  const slope = (fit.topAt(bx + .04) - fit.topAt(bx - .04)) / .08;
  const bow = new THREE.Group(); bow.position.set(bx, by, bz); bow.rotation.z = clamp(Math.atan(slope), -.5, .5); g.add(bow);
  const m = clay(COL.pink), knotM = clay(COL.pink);
  const loopGeo = new THREE.SphereGeometry(1, 28, 18);
  for (const side of [-1, 1]) {
    const l = mesh(loopGeo, m, 'loop'); l.scale.set(.5 * s, .33 * s, .22 * s); l.position.set(side * .5 * s, .04 * s, 0); l.rotation.z = side * .28; bow.add(l);
    const tail = mesh(loopGeo, m, 'tail'); tail.scale.set(.11 * s, .3 * s, .08 * s); tail.position.set(side * .22 * s, -.34 * s, -.03 * s); tail.rotation.z = side * .42; bow.add(tail);
  }
  const knot = mesh(new THREE.SphereGeometry(.2 * s, 20, 14), knotM, 'knot'); knot.scale.set(1, 1.05, .9); knot.position.z = .06 * s; bow.add(knot);
  return { group: g, anchor: new THREE.Vector3(bx, by, bz) };
}

function crownFlower(fit) {
  const g = new THREE.Group(), s = fit.size, fr = clamp(.068 * s, .056, .078), vine = .02 * s;
  const yc = Math.max(fit.head.top - .11 * s, fit.head.minY + fr * .95);
  const sec = section(fit, yc, fit.head.x);
  const a = sec.hw + .012, zF = sec.zF * 1.06 + .012, zB = sec.zB * 1.06 - .012;
  g.add(mesh(tubeLoop(loopPoints(sec.cx, yc, a, zF, zB), vine), clay(COL.teal), 'vine'));
  const petalGeo = new THREE.SphereGeometry(1, 10, 7), coreGeo = new THREE.SphereGeometry(1, 10, 7);
  const petalMats = [clay(COL.pink), clay(COL.lilac), clay(COL.cream)], coreMat = clay(COL.cream), coreMat2 = clay(COL.pink);
  // flowers along the front half of the ring, spaced by arc length
  const arc = Math.PI * Math.sqrt((a * a + zF * zF) / 2);
  const n = clamp(Math.floor(arc / (fr * 2.3)), 3, 7);
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 + (i - (n - 1) / 2) * (Math.PI * .92 / Math.max(1, n - 1));
    const c = Math.cos(t), si = Math.sin(t), p = 2.4;
    const x = sec.cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), z = zF * Math.pow(Math.abs(si), 2 / p);
    const out = new THREE.Vector3(c / a, 0, si / zF).normalize();
    const f = new THREE.Group(); f.position.set(x + out.x * .008, yc + .012, z + out.z * .008);
    f.lookAt(f.position.clone().add(out).add(new THREE.Vector3(0, .55, 0)));
    const pm = petalMats[i % 3];
    for (let k = 0; k < 5; k++) {
      const th = k / 5 * Math.PI * 2 + i, pe = mesh(petalGeo, pm, 'petal');
      pe.scale.set(fr * .5, fr * .5, fr * .26); pe.position.set(Math.cos(th) * fr * .55, Math.sin(th) * fr * .55, 0); f.add(pe);
    }
    const core = mesh(coreGeo, pm === petalMats[2] ? coreMat2 : coreMat, 'core'); core.scale.set(fr * .34, fr * .34, fr * .24); core.position.z = fr * .14; f.add(core);
    g.add(f);
  }
  return { group: g, anchor: new THREE.Vector3(sec.cx, fit.head.top, 0) };
}

/* ---------------------------------------------------------------- eyes */

function glassesRound(fit) {
  const g = new THREE.Group(), tube = fit.tube, m = clay(COL.ink);
  const lenses = fit.eyes.map((e, i) => {
    const frame = lensFrame(fit, e, tube + .012);
    const ring = mesh(tubeLoop(ellipseLocal(e.rx, e.ry, e.rot), tube, 64, 8), m, 'rim');
    ring.applyMatrix4(frame.matrix); g.add(ring);
    const glint = mesh(new THREE.TorusGeometry(Math.min(e.rx, e.ry) * .62, tube * .28, 6, 16, Math.PI * .42), clay(COL.white, { transparent: true, opacity: .75 }), 'glint');
    glint.rotation.z = Math.PI * .58; glint.position.z = -tube * .2; glint.applyMatrix4(frame.matrix); g.add(glint);
    const sgn = i ? -1 : 1;
    return { e, frame, inner: [sgn * e.rx * Math.cos(e.rot), sgn * e.rx * Math.sin(e.rot)], outer: [-sgn * e.rx * Math.cos(e.rot), -sgn * e.rx * Math.sin(e.rot)] };
  });
  eyewearLinks(fit, g, m, lenses, tube);
  return { group: g, anchor: eyesAnchor(fit) };
}

function glassesSun(fit) {
  const g = new THREE.Group(), tube = fit.tube * 1.15, m = clay(COL.teal);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: COL.lens, roughness: .5, transparent: true, opacity: .74, depthWrite: false, envMapIntensity: .3, side: THREE.DoubleSide });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false });
  const lenses = fit.eyes.map((e, i) => {
    const rx = e.rx * 1.04, ry = e.ry, frame = lensFrame(fit, e, tube + .012);
    const ring = mesh(tubeLoop(ellipseLocal(rx, ry, e.rot, 3.2), tube, 64, 8), m, 'rim'); ring.applyMatrix4(frame.matrix); g.add(ring);
    const pts = ellipseLocal(rx, ry, e.rot, 3.2).map(p => new THREE.Vector2(p.x, p.y));
    const lens = mesh(new THREE.ShapeGeometry(new THREE.Shape(pts), 1), lensMat, 'lens'); lens.renderOrder = 3; lens.position.z = -tube * .2; lens.applyMatrix4(frame.matrix); g.add(lens);
    const gl = mesh(new THREE.CapsuleGeometry(tube * .45, Math.min(rx, ry) * .5, 4, 8), glintMat, 'glint'); gl.renderOrder = 4;
    gl.rotation.z = -.6; gl.position.set(-rx * .42, ry * .38, tube * .1); gl.applyMatrix4(frame.matrix); g.add(gl);
    const sgn = i ? -1 : 1;
    return { e, frame, inner: [sgn * rx * Math.cos(e.rot), sgn * rx * Math.sin(e.rot)], outer: [-sgn * rx * Math.cos(e.rot), -sgn * rx * Math.sin(e.rot)] };
  });
  eyewearLinks(fit, g, m, lenses, tube);
  return { group: g, anchor: eyesAnchor(fit) };
}

function glassesStar(fit) {
  const g = new THREE.Group(), tube = fit.tube, m = clay(COL.pink);
  const lenses = fit.eyes.map((e, i) => {
    const ro = e.star, ri = Math.max(ro * .64, e.hole + .02), depth = .012, bevel = .01, sgn = i ? -1 : 1;
    // close-set eyes (cloud): the two stars meet at the midline instead of covering the other eye
    const half = Math.abs(fit.eyes[1].x - fit.eyes[0].x) / 2 + .002;
    let pts = starPts(ro, ri, 5, Math.PI / 2 + sgn * .12), merged = false, hx = e.eyeHW * 1.1;
    if (ro > half - bevel) {
      merged = true;
      const cut = half - bevel * .5;
      pts = sgn > 0 ? clipX(pts, cut) : clipX(pts.map(p => [-p[0], p[1]]), cut).map(p => [-p[0], p[1]]);
      hx = Math.min(hx, cut - .008);            // the hole must stay inside the cut edge
    }
    const shape = roundedPoly(pts, ro * .18);
    shape.holes.push(ellipsePath(hx, e.eyeHH * 1.1, e.rot));
    const frame = lensFrame(fit, e, depth / 2 + bevel + .012 + i * .002);
    const star = mesh(soft(shape, depth, bevel, 3), m, 'star');
    star.applyMatrix4(frame.matrix); g.add(star);
    const ix = merged ? half : ri * .98;
    return { e, frame, inner: [sgn * ix, 0], outer: [-sgn * ri * .98, 0], merged };
  });
  eyewearLinks(fit, g, m, lenses, tube);
  return { group: g, anchor: eyesAnchor(fit) };
}

/* ---------------------------------------------------------------- body */

function tieNeck(fit) {
  const g = new THREE.Group(), s = fit.size, { x, topY, bottomY } = fit.chest, m = clay(COL.blue), mk = clay('#8C9FD0');
  const kh = .08 * s, kwT = .056 * s, kwB = .037 * s;
  const knot = roundedPoly([[-kwT, kh / 2], [kwT, kh / 2], [kwB, -kh / 2], [-kwB, -kh / 2]], .018);
  const ky = topY - kh / 2 - .012;
  g.add(mesh(wrap(soft(knot, .02, .012), fit, x, ky, .032), mk, 'knot'));
  const L = clamp(ky - kh / 2 - bottomY, .14, .38 * s), wB = .07 * s, top = ky - kh * .3;
  const blade = roundedPoly([[-kwB * .9, 0], [kwB * .9, 0], [wB, -L * .78], [0, -L], [-wB, -L * .78]], .03);
  g.add(mesh(wrap(soft(blade, .016, .01), fit, x, top, .018), m, 'blade'));
  return { group: g, anchor: new THREE.Vector3(x, ky, fit.frontZ(x, ky)) };
}

function tieBow(fit) {
  const g = new THREE.Group(), s = fit.size, { x, topY } = fit.chest, m = clay(COL.pink), mk = clay('#E27FA5');
  const h = .12 * s, y = topY - h / 2 - .01;
  const sp = fit.span(y, x);
  const w = Math.min(.17 * s, sp ? sp.hw * .7 : .17);
  for (const side of [-1, 1]) {
    const wing = roundedPoly([[side * .02, .022], [side * w, h / 2], [side * w * 1.04, -h / 2], [side * .02, -.022]], .035);
    g.add(mesh(wrap(soft(wing, .022, .012), fit, x, y, .026), m, 'wing'));
  }
  const knot = roundedPoly([[-.032 * s, .036 * s], [.032 * s, .036 * s], [.032 * s, -.036 * s], [-.032 * s, -.036 * s]], .02);
  g.add(mesh(wrap(soft(knot, .026, .014), fit, x, y, .05), mk, 'knot'));
  return { group: g, anchor: new THREE.Vector3(x, y, fit.frontZ(x, y)) };
}

function scarf(fit) {
  const g = new THREE.Group(), s = fit.size, r = clamp(.066 * s, .056, .076), { x, topY } = fit.chest;
  const ys = topY - r - .006, sag = .055 * s;
  const sec = section(fit, ys, x);
  const m = clay(COL.teal), stripe = clay(COL.cream);
  // one chunky band (two overlapping rolls) hugging the body just under the mouth; the front droops like cloth
  const rolls = [[ys, 1, sag, m], [ys - r * .85, 1.01, sag * 1.12, m]];
  for (const [y, k, sg, mat] of rolls) {
    const sc = section(fit, y - sg * .5, x);
    const a = sc.hw * .93 * k + r * .2, zF = sc.zF * 1.04 + r * .5, zB = sc.zB * 1.04 - r * .5;
    g.add(mesh(tubeLoop(loopPoints(sc.cx, y, a, zF, zB, 2.4, 48, sg), r, 72, 10), mat, 'roll'));
  }
  // knot and a hanging tail on the front, to one side of the chest centre
  const t = Math.PI / 2 - .55, c = Math.cos(t), si = Math.sin(t), p = 2.4;
  const a0 = sec.hw * .93 + r * .2, zF0 = sec.zF * 1.04 + r * .5;
  const kx = sec.cx + a0 * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), ky = ys - sag * si * si - r * .7, kz = fit.frontZ(kx, ky) + r * 1.1;
  const knot = mesh(new THREE.SphereGeometry(r * 1.25, 20, 14), m, 'knot'); knot.scale.set(1, .95, .7);
  knot.position.set(kx, ky, Math.max(kz, zF0 * Math.pow(si, 2 / p))); g.add(knot);
  const tw = r * 2.1, L = clamp(ky - fit.chest.bottomY, .18, .32 * s), tilt = -.14;
  const tail = roundedPoly([[-tw / 2, 0], [tw / 2, 0], [tw / 2 * 1.1, -L], [-tw / 2 * 1.1, -L]], .03);
  g.add(mesh(wrap(soft(tail, .022, .012), fit, kx, ky - r * .2, r * 1.1, tilt), m, 'tail'));
  for (const f of [.6, .8]) {
    const w = tw / 2 * (1 + .1 * f) + .003;
    const band = roundedPoly([[-w, -L * f + .013], [w, -L * f + .013], [w, -L * f - .013], [-w, -L * f - .013]], .008);
    g.add(mesh(wrap(soft(band, .024, .008), fit, kx, ky - r * .2, r * 1.1 + .007, tilt), stripe, 'stripe'));
  }
  return { group: g, anchor: new THREE.Vector3(sec.cx, ys, fit.frontZ(sec.cx, ys)) };
}

function badgeStar(fit) {
  const g = new THREE.Group(), s = fit.size, { x, topY } = fit.chest;
  const y = topY - .085 * s, sp = fit.span(y, x) || { cx: x, hw: .3, l: x - .3, r: x + .3 };
  const right = sp.r - x, left = x - sp.l, side = right >= left * .8 ? 1 : -1;
  const bx = x + side * Math.min(Math.max(right, left) * .5, .3);
  const rd = .062 * s;
  g.add(mesh(wrap(soft(ellipsePath(rd, rd, 0, false), .016, .01), fit, bx, y, .022), clay(COL.pink), 'disc'));
  g.add(mesh(wrap(soft(roundedPoly(starPts(rd * .82, rd * .38), .012), .016, .009), fit, bx, y, .046), clay(COL.cream), 'star'));
  return { group: g, anchor: new THREE.Vector3(bx, y, fit.frontZ(bx, y)) };
}

/* ---------------------------------------------------------------- Christmas set (story S4-04) */

/** Sphere geometry placed by scale / z-rotation / position (for merged multi-part pieces). */
function blob(r, sx, sy, sz, x, y, z, rz = 0, ws = 16, hs = 12) {
  const geo = new THREE.SphereGeometry(r, ws, hs); geo.scale(sx, sy, sz); if (rz) geo.rotateZ(rz); geo.translate(x, y, z);
  return geo;
}
/** Small two-loop bow (merged), facing +Z, centred on the origin. */
function bowGeo(b) {
  return mergeAll([
    blob(1, .5 * b, .32 * b, .2 * b, -.48 * b, .03 * b, 0, -.3), blob(1, .5 * b, .32 * b, .2 * b, .48 * b, .03 * b, 0, .3),
    blob(1, .1 * b, .26 * b, .07 * b, -.2 * b, -.3 * b, -.02 * b, -.4), blob(1, .1 * b, .26 * b, .07 * b, .2 * b, -.3 * b, -.02 * b, .4),
    blob(1, .19 * b, .2 * b, .17 * b, 0, 0, .05 * b),
  ]);
}

/**
 * หมวกซานต้า — berry cone that hugs the head like the beanie, then flops to one side; fluffy cream
 * brim and a pom-pom on a gentle pendulum at the tip.
 */
function hatSanta(fit) {
  const g = new THREE.Group(), s = fit.size, brimR = clamp(.05 * s, .042, .058);
  const yb = Math.max(fit.head.top - .3 * s, fit.head.minY + brimR * .9);
  const sec = section(fit, yb, fit.head.x);
  const a = sec.hw * 1.05 + .014, zF = sec.zF * 1.07 + .014, zB = sec.zB * 1.07 - .014;
  const capH = maxTop(fit, sec.l, sec.r) - yb;
  const H = clamp(capH * 1.1 + .05, .14, .7) + .5 * s;          // unbent height
  // profile radius per height: a soft cone, never inside the head
  const N = 30, need = new Array(N + 1).fill(0), r = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = yb + t * H, sp = fit.span(y, sec.cx);
    if (sp) need[i] = Math.max((Math.max(sec.cx - sp.l, sp.r - sec.cx) + .016) / a, (fit.frontZ(sec.cx, y) + .016) / zF, (.016 - fit.backZ(sec.cx, y)) / -zB);
    r.push(Math.max(Math.pow(1 - t, .8) * (1 + .14 * Math.sin(Math.PI * t)), need[i], .085));
  }
  for (let i = N - 1; i >= 0; i--) r[i] = Math.max(r[i], r[i + 1]);
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < N; i++) r[i] = Math.max((r[i - 1] + 2 * r[i] + r[i + 1]) / 4, need[i]);
  const cone = new THREE.LatheGeometry(r.map((v, i) => new THREE.Vector2(v, i / N)), 40, Math.PI);
  shapeLathe(cone, sec.cx, yb, a, H, zF, zB);
  // bend: straight up to just above the head, then a flop toward `sg` whose curvature ramps up
  // toward the tip and stays below 1 / (local half-width), so the inside of the bend never folds
  const sg = fit.head.x > .03 ? -1 : 1, t0 = clamp((capH * 1.05 + .04) / H, .3, .72), Lb = (1 - t0) * H;
  const pr = clamp(.36 * a, .072, .11) * s, P0y = yb + t0 * H, SM = 60, ds = Lb / SM;
  const radAt = t => { const f = clamp(t, 0, 1) * N, i = Math.min(N - 1, Math.floor(f)); return (r[i] + (r[i + 1] - r[i]) * (f - i)) * Math.max(a, zF, -zB); };
  const spineFor = thT => {
    const sp = [{ x: sec.cx, y: P0y, th: 0 }], kb = thT * 2.2 / Lb;
    let th = 0, x = sec.cx, y = P0y;
    for (let j = 1; j <= SM; j++) {
      const u = (j - .5) / SM, kk = Math.min(kb * Math.pow(u, 1.2), .8 / Math.max(radAt(t0 + u * (1 - t0)), 1e-3));
      const thm = th + kk * ds / 2; th += kk * ds;
      x += sg * Math.sin(thm) * ds; y += Math.cos(thm) * ds; sp.push({ x, y, th });
    }
    return sp;
  };
  let spine = null;
  for (let thT = 2.1; thT > .8; thT -= .1) {                      // droop less if the pom would touch the head
    spine = spineFor(thT);
    const e = spine[SM], py = e.y - pr * .55, top = fit.topAt(e.x);
    if (py - pr > Math.max(Number.isFinite(top) ? top + .012 : -Infinity, fit.head.minY)) break;
  }
  const p = cone.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - yb) / H; if (t <= t0) continue;
    const f = Math.min(SM, (t - t0) / (1 - t0) * SM), j = Math.min(SM - 1, Math.floor(f)), w = f - j, A0 = spine[j], A1 = spine[j + 1];
    const sx = A0.x + (A1.x - A0.x) * w, sy = A0.y + (A1.y - A0.y) * w, th = A0.th + (A1.th - A0.th) * w;
    const ox = p.getX(i) - sec.cx, c = Math.cos(th), si = Math.sin(th);
    p.setX(i, sx + ox * c); p.setY(i, sy - sg * ox * si);
  }
  p.needsUpdate = true;
  g.add(mesh(smoothGeo(cone), clay(XM.berry, { side: THREE.DoubleSide }), 'cone'));
  // fluffy brim: one chunky cream roll with soft lumps
  const yy = yb + brimR * .3, k = brimR * .35;
  const brimPts = loopPoints(sec.cx, yy, a + k, zF + k, zB - k), arc = brimPts.reduce((L, q, i) => L + q.distanceTo(brimPts[(i + 1) % brimPts.length]), 0);
  const lumps = Math.max(10, Math.round(arc / (brimR * 2.1)));
  const brim = shapeTube(tubeLoop(brimPts, brimR, 120, 12), (_, u) => ({ k: 1 + .1 * Math.cos(u * Math.PI * 2 * lumps) }));
  g.add(mesh(smoothGeo(brim), clay(COL.cream), 'brim'));
  // pom-pom on a pendulum at the tip
  const tip = spine[SM], pivot = new THREE.Group(); pivot.position.set(tip.x, tip.y, 0); g.add(pivot);
  const pom = mesh(new THREE.SphereGeometry(pr, 22, 16), clay(COL.cream), 'pom'); pom.position.y = -pr * .55; pivot.add(pom);
  return { group: g, anchor: new THREE.Vector3(sec.cx, fit.head.top, 0), tick: pendulum(pivot, pivot.position.clone(), { k: 45, zeta: .3, maxA: .45, backMax: .4 }) };
}

/** เขากวาง — two small rounded clay antlers set into the head top, a tiny berry bow on one. */
function antlers(fit) {
  const g = new THREE.Group(), s = fit.size, r0 = clamp(.062 * s, .05, .07), A = 1.5 * s;   // sized to read at phone size
  const sp = fit.span(fit.head.top - .1, fit.head.x) || { cx: fit.head.x, hw: .2 };
  // narrow heads (diamond, gumdrop) keep both bases on the crown, not out on the slope
  const off = clamp(sp.hw * .5, Math.min(.12, sp.hw * .42), .26), parts = [];
  const branch = (pts, ra, rb) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x * A, y * A, 0)));
    const t = shapeTube(new THREE.TubeGeometry(c, 16, ra, 8, false), (_, u) => ({ k: 1 - (1 - rb / ra) * u }));
    const e = c.getPoint(1);
    return [t, blob(rb * 1.12, 1, 1, 1, e.x, e.y, e.z, 0, 12, 9)];
  };
  let bowAt = null;
  for (const side of [-1, 1]) {
    const bx = sp.cx + side * off;
    let top = fit.topAt(bx); if (!Number.isFinite(top)) top = fit.head.top;
    const by = Math.max(top - .03, fit.head.minY + r0);
    const zm = (fit.frontZ(bx, by - .03) + fit.backZ(bx, by - .03)) / 2;
    const sl = (fit.topAt(bx + .03) - fit.topAt(bx - .03)) / .06;
    const rz = clamp(Math.atan(Number.isFinite(sl) ? sl : 0) * .6 - side * .2, -.6, .6);
    const geos = [
      ...branch([[0, -.03], [side * .01, .05], [side * .04, .115], [side * .05, .17]], r0, r0 * .78),
      ...branch([[side * .02, .075], [side * .0, .105], [-side * .014, .13]], r0 * .8, r0 * .66),
      ...branch([[side * .012, .025], [side * .045, .045], [side * .068, .075]], r0 * .78, r0 * .64),
      blob(r0 * 1.08, 1, 1, 1, 0, -.03 * A, 0, 0, 12, 9),
    ];
    const M = new THREE.Matrix4().compose(new THREE.Vector3(bx, by, zm), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), new THREE.Vector3(1, 1, 1));
    for (const geo of geos) { geo.applyMatrix4(M); parts.push(geo); }
    if (side > 0) bowAt = { x: bx - Math.sin(rz) * .02, y: by + .02, z: Math.max(zm + r0 * 1.2, fit.frontZ(bx, by) + .016), rz };
  }
  g.add(mesh(mergeAll(parts), clay(XM.tan), 'antlers'));
  const bow = bowGeo(.1 * s); bow.rotateZ(bowAt.rz * .5); bow.translate(bowAt.x, bowAt.y, bowAt.z);
  g.add(mesh(bow, clay(XM.berry), 'bow'));
  return { group: g, anchor: new THREE.Vector3(sp.cx, fit.head.top, 0) };
}

/**
 * แว่นเกล็ดหิมะ — round frames with six short snowflake arms ending in snow balls. Arms that would
 * reach the mouth, cross the midline (close-set eyes), leave the silhouette or rise into the head
 * zone are shortened or dropped, so the frames never meet the mouth or a head item.
 */
function glassesSnow(fit) {
  const g = new THREE.Group(), tube = fit.tube * 1.35, m = clay(XM.frost), frost = [], snow = [];
  const midX = (fit.eyes[0].x + fit.eyes[1].x) / 2, M = fit.mouth, ball = tube * 1.55;
  const lenses = fit.eyes.map((e, i) => {
    const frame = lensFrame(fit, e, tube + .012 + i * .002), sgn = i ? -1 : 1, cr = Math.cos(e.rot), srt = Math.sin(e.rot);
    const ring = tubeLoop(ellipseLocal(e.rx, e.ry, e.rot), tube, 64, 8); ring.applyMatrix4(frame.matrix); frost.push(ring);
    const len0 = clamp(.62 * Math.min(e.rx, e.ry), .03, .07);
    for (let k = 0; k < 6; k++) {
      const th = Math.PI / 2 + k * Math.PI / 3, c = Math.cos(th), si = Math.sin(th);
      const sx = e.rx * c * cr - e.ry * si * srt, sy = e.rx * c * srt + e.ry * si * cr, dx = c * cr - si * srt, dy = c * srt + si * cr;
      const ok = L => {
        const ex = e.x + sx + dx * L, ey = e.cy + sy + dy * L;
        if (sgn * (ex - midX) > -ball - .006) return false;                                   // midline
        if (Math.abs(ex - M.x) < M.hw + ball + .01 && ey - ball < M.top + .01) return false;    // mouth
        if (ey + ball > fit.eyeZoneTop) return false;                                          // head zone
        return fit.inside(ex, ey);
      };
      let L = len0; while (L > .014 && !ok(L)) L -= .006;
      if (L <= .014) continue;
      const a0 = lensPoint(frame, sx, sy), a1 = lensPoint(frame, sx + dx * L, sy + dy * L);
      a1.z = Math.max(fit.frontZ(a1.x, a1.y) + ball * .8, a0.z - .02);
      frost.push(new THREE.TubeGeometry(new THREE.LineCurve3(a0, a1), 4, tube * .8, 8, false));
      snow.push(blob(ball, 1, 1, .8, a1.x, a1.y, a1.z, 0, 12, 9));
    }
    return { e, frame, inner: [sgn * e.rx * cr, sgn * e.rx * srt], outer: [-sgn * e.rx * cr, -sgn * e.rx * srt] };
  });
  g.add(mesh(mergeAll(frost), m, 'frame'));
  if (snow.length) g.add(mesh(mergeAll(snow), clay(XM.snow), 'snow'));
  eyewearLinks(fit, g, m, lenses, tube);
  return { group: g, anchor: eyesAnchor(fit) };
}

/**
 * ผ้าพันคอคริสต์มาส — chunky knitted band with berry / cream / sage stripes (vertex colours, one
 * mesh), a knot and two crossed striped tails with cream fringe. Distinct from the teal `scarf`.
 */
function scarfXmas(fit) {
  const g = new THREE.Group(), s = fit.size, r = clamp(.076 * s, .062, .086), { x, topY } = fit.chest;
  const ys = topY - r - .006, sag = .05 * s;
  const sec = section(fit, ys - sag * .5, x);
  const a = sec.hw * .93 + r * .22, zF = sec.zF * 1.04 + r * .5, zB = sec.zB * 1.04 - r * .5;
  const STRIPES = [XM.berry, XM.berry, XM.berry, COL.cream, XM.sage, XM.sage, XM.sage, COL.cream], UNITS = 48;  // UNITS % 8 = 0 → seamless
  const knitMat = clay('#FFFFFF', { vertexColors: true, sheenColor: new THREE.Color('#F6F2F4') });
  // two overlapping rolls (one chunky band), stripes offset so the rows read as one knit
  const rolls = [];
  for (const [y, kk, sg, ph] of [[ys, 1, sag, 0], [ys - r * .85, 1.01, sag * 1.12, 2]]) {
    const sc = section(fit, y - sg * .5, x);
    const aa = sc.hw * .93 * kk + r * .22, zzF = sc.zF * 1.04 + r * .5, zzB = sc.zB * 1.04 - r * .5;
    const band = tubeLoop(loopPoints(sc.cx, y, aa, zzF, zzB, 2.4, 48, sg), r, 144, 10);
    shapeTube(band, (_, u) => ({ k: 1 + .03 * Math.cos(u * Math.PI * 2 * 36) }));  // soft knit rows
    tubeColors(band, u => STRIPES[(Math.floor(u * UNITS + 1e-6) + ph) % STRIPES.length]);
    rolls.push(smoothGeo(band));
  }
  g.add(mesh(mergeGeometries(rolls), knitMat, 'band')); rolls.forEach(r2 => r2.dispose());
  // knot on the front, to one side of the chest centre
  const t = Math.PI / 2 - .5, c = Math.cos(t), si = Math.sin(t), pw = 2.4;
  const kx = sec.cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / pw), ky = ys - sag * si * si - r * .7;
  const kz = Math.max(fit.frontZ(kx, ky) + r * 1.1, zF * Math.pow(si, 2 / pw));
  const bucket = { [XM.berry]: [blob(r * 1.22, 1, .95, .7, kx, ky, kz, 0, 20, 14)], [XM.sage]: [], [COL.cream]: [] };   // one mesh per colour
  // two tails (sage behind, berry in front), stripes laid on top, cream fringe
  const tw = r * 2.4, L = clamp(ky - fit.chest.bottomY, .2, .34 * s);
  const tails = [
    { tilt: .3, L: L * .8, base: XM.sage, bands: [[.42, COL.cream], [.58, XM.berry], [.74, COL.cream]], gap: r * 1.05, dx: r * .45 },
    { tilt: -.1, L, base: XM.berry, bands: [[.42, COL.cream], [.58, XM.sage], [.74, COL.cream]], gap: r * 1.05 + .02, dx: 0 },
  ];
  for (const T of tails) {
    const ax = kx + T.dx, ay = ky - r * .2, w0 = tw / 2;
    const tail = roundedPoly([[-w0, 0], [w0, 0], [w0 * 1.1, -T.L], [-w0 * 1.1, -T.L]], .03);
    bucket[T.base].push(wrap(soft(tail, .022, .012), fit, ax, ay, T.gap, T.tilt));
    for (const [f, hex] of T.bands) {
      const w = w0 * (1 + .1 * f) + .003, h = hex === COL.cream ? .012 : .022;
      const b = roundedPoly([[-w, -T.L * f + h], [w, -T.L * f + h], [w, -T.L * f - h], [-w, -T.L * f - h]], .008);
      bucket[hex].push(wrap(soft(b, .024, .008), fit, ax, ay, T.gap + .007, T.tilt));
    }
    const cs = Math.cos(T.tilt), sn = Math.sin(T.tilt), fl = .055 * s, fr = .015 * s;
    for (let k = 0; k < 4; k++) {
      const lx = (-.75 + k * .5) * w0 * 1.1, ly = -T.L - fl * .35, fx = ax + lx * cs - ly * sn, fy = ay + lx * sn + ly * cs;
      const geo = new THREE.CapsuleGeometry(fr, fl, 3, 8); geo.rotateZ(T.tilt); geo.translate(fx, fy, fit.frontZ(fx, fy) + T.gap);
      bucket[COL.cream].push(geo);
    }
  }
  for (const [hex, geos] of Object.entries(bucket)) g.add(mesh(mergeAll(geos), clay(hex), 'knit'));
  return { group: g, anchor: new THREE.Vector3(sec.cx, ys, fit.frontZ(sec.cx, ys)) };
}

/** กระดิ่ง — soft berry ribbon collar hugging the body, small cream bow, soft-gold bell that jiggles. */
function bellCollar(fit) {
  const g = new THREE.Group(), s = fit.size, { x, topY } = fit.chest;
  const bh = .058 * s, bt = .017, sag = .035 * s, yc = topY - bh - .01, n = 64;
  const pts = hugLoop(fit, yc, x, bt + .004, sag, n);
  const ribbon = shapeTube(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 96, 1, 12, true), () => ({ k: bt, ky: bh }));
  g.add(mesh(smoothGeo(ribbon), clay(XM.berry), 'ribbon'));
  const P = pts[n / 4];                                              // front centre
  const bow = bowGeo(bh * 2.3); bow.translate(P.x, P.y + bh * .05, P.z + bt + .012);
  g.add(mesh(bow, clay(COL.cream), 'bow'));
  // bell on a pendulum below the bow
  const rb = .092 * s, rr = .026 * s, pivot = new THREE.Group();
  const drop = rr * 1.4 + rb * .92, bellY = P.y - bh * .55 - drop;
  pivot.position.set(P.x, P.y - bh * .55, Math.max(P.z + bt + .014, fit.frontZ(P.x, bellY) + rb + .008));
  g.add(pivot);
  const ring = new THREE.TorusGeometry(rr, rr * .38, 8, 18); ring.translate(0, -rr * .7, 0);
  const seam = new THREE.TorusGeometry(rb * 1.005, rb * .085, 8, 32); seam.rotateX(Math.PI / 2); seam.translate(0, -drop + rb * .08, 0);
  const slot = new THREE.CapsuleGeometry(rb * .11, rb * .5, 3, 8); slot.rotateZ(Math.PI / 2); slot.scale(1, 1, .6); slot.translate(0, -drop - rb * .42, rb * .86);
  pivot.add(mesh(mergeAll([ring, seam, slot]), clay(XM.goldDeep), 'bell-trim'));
  const bell = mesh(new THREE.SphereGeometry(rb, 24, 16), clay(XM.gold), 'bell'); bell.position.y = -drop; pivot.add(bell);
  return { group: g, anchor: new THREE.Vector3(P.x, P.y, P.z), tick: pendulum(pivot, pivot.position.clone(), { k: 60, zeta: .32, maxA: .42, backMax: .06 }) };
}

const BUILDERS = Object.freeze({
  'hat-beanie': hatBeanie, 'hat-party': hatParty, 'bow-ribbon': bowRibbon, 'crown-flower': crownFlower,
  'hat-santa': hatSanta, 'antlers': antlers,
  'glasses-round': glassesRound, 'glasses-sun': glassesSun, 'glasses-star': glassesStar, 'glasses-snow': glassesSnow,
  'tie-neck': tieNeck, 'tie-bow': tieBow, 'scarf': scarf, 'badge-star': badgeStar,
  'scarf-xmas': scarfXmas, 'bell-collar': bellCollar,
});

/**
 * Build one accessory for a character's fit.
 * @param {string} id one of ACCESSORY_IDS
 * @param {object} fit from createFit (src/characters/fit.js)
 * @returns {{ group: THREE.Group, anchor: THREE.Vector3 } | null} null for an unknown id
 */
export function buildAccessory(id, fit) {
  const b = BUILDERS[id]; if (!b) return null;
  const out = b(fit);
  out.group.name = `accessory:${id}`;
  out.group.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return out;
}

/** Free every geometry and material of an accessory group and detach it. */
export function disposeAccessory(group) {
  if (!group) return;
  const geos = new Set(), mats = new Set();
  group.traverse(o => { if (o.isMesh) { geos.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m)); } });
  geos.forEach(x => x.dispose()); mats.forEach(x => x.dispose());
  group.removeFromParent();
}
