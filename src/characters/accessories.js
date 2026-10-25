/**
 * Outfit accessories (story S2-06): 11 clay items in 3 slots that fit all six blob shapes.
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
 *
 * Look: soft matte clay (rough physical material with sheen like the bodies), rounded bevels,
 * brand tints #7FA9B1 #9BB0DE #CBA5D1 #EB92B3 plus soft neutrals; no textures, no hard shadows.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Slot of every item id. */
export const SLOT_OF = Object.freeze({
  'hat-beanie': 'head', 'hat-party': 'head', 'bow-ribbon': 'head', 'crown-flower': 'head',
  'glasses-round': 'eyes', 'glasses-sun': 'eyes', 'glasses-star': 'eyes',
  'tie-neck': 'body', 'tie-bow': 'body', 'scarf': 'body', 'badge-star': 'body',
});
/** All item ids, slot order head → eyes → body. */
export const ACCESSORY_IDS = Object.freeze(Object.keys(SLOT_OF));
/** Outfit slots. */
export const SLOTS = Object.freeze(['head', 'eyes', 'body']);
/** Thai names (debug / demo; the shipped names live in assets/data/wardrobe.json). */
export const ACCESSORY_TH = Object.freeze({
  'hat-beanie': 'หมวกไหมพรม', 'hat-party': 'หมวกปาร์ตี้', 'bow-ribbon': 'โบว์', 'crown-flower': 'มงกุฎดอกไม้',
  'glasses-round': 'แว่นกลม', 'glasses-sun': 'แว่นกันแดด', 'glasses-star': 'แว่นดาว',
  'tie-neck': 'เน็คไท', 'tie-bow': 'หูกระต่าย', 'scarf': 'ผ้าพันคอ', 'badge-star': 'เข็มกลัดดาว',
});

/** Palette: brand tints + soft neutrals. */
const COL = { teal: '#7FA9B1', blue: '#9BB0DE', lilac: '#CBA5D1', pink: '#EB92B3', cream: '#FBF4EA', ink: '#565A7C', lens: '#3E4364', white: '#FFFFFF' };

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

const BUILDERS = Object.freeze({
  'hat-beanie': hatBeanie, 'hat-party': hatParty, 'bow-ribbon': bowRibbon, 'crown-flower': crownFlower,
  'glasses-round': glassesRound, 'glasses-sun': glassesSun, 'glasses-star': glassesStar,
  'tie-neck': tieNeck, 'tie-bow': tieBow, 'scarf': scarf, 'badge-star': badgeStar,
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
