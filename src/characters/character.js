/**
 * Moldable blob characters — body from traced silhouette, decal face rig, expressions, soft-body
 * deformers and body action clips. Ported from the approved prototype
 * (prototypes/squish-pet/index.html); the look is unchanged.
 *
 * Contract: docs/architecture/module-contracts.md, section "Character — clay".
 *
 * Every instance owns its geometry, materials and canvas textures; nothing mutable is shared at
 * module level, so creating / disposing characters to switch is clean.
 *
 * Scene graph (origin of `object3d` at the feet, floor y = 0, facing +Z):
 *   object3d ─ shadow (soft contact blob on the floor)
 *            └ hang (pivot at head top: dangling sway while carried)
 *               └ rig (hop / shift offsets)
 *                  └ squash (scale, pivot at feet)
 *                     └ turn (rotation, pivot at body centre) ─ body + face decals
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { SHAPES } from './shapes.js';
import { GENERIC, LOOK_AWAY, exprFor } from './expressions.js';
import { ACTIONS, resetFrame } from './actions.js';
import { drawEye, drawMouth, superD } from './face.js';

export { EXPRESSION_KEYS } from './expressions.js';
export { EXPRESSION_ACTION, EXPRESSION_TH } from './expressions.js';
export { ACTION_KEYS } from './actions.js';

/** Character keys in roster order (`pill` is "coming soon" in Sprint 1). */
export const CHARACTER_KEYS = Object.freeze(['splat', 'pill', 'gumdrop', 'diamond', 'cloud', 'flower']);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const TEX = 512;                 // face canvas size (px)
const SHAPE = { thick: .85, eye: 1.1 };
const DEF_K = 150, DEF_D = 7.5;  // dent / stretch spring (prototype clay wobble)
const MAX_DEFS = 7;

function isCoarse() {
  try { return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches; } catch { return false; }
}
function prefersReducedMotion() {
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
function canvasTex(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { c, g: c.getContext('2d'), t };
}
function radialTex(size, inner, outer) {
  const x = canvasTex(size), gr = x.g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); x.g.fillStyle = gr; x.g.fillRect(0, 0, size, size); x.t.needsUpdate = true;
  return x.t;
}
/** Damped spring step on {x, v} toward target (small overshoot at zeta ≈ .7). */
function spring(s, target, dt, k, zeta) {
  const c = 2 * zeta * Math.sqrt(k);
  s.v += (-k * (s.x - target) - c * s.v) * dt; s.x += s.v * dt;
}

/**
 * Create one character.
 * @param {string} key one of CHARACTER_KEYS
 * @param {{ detail?: number, idle?: boolean, shadow?: boolean }} [opts] detail = icosahedron detail
 *   (default 40 on touch devices, 56 otherwise); idle = breathing/saccades (default: off when the user
 *   prefers reduced motion); shadow = soft floor blob (default true).
 * @returns {object} character API (see module contract)
 */
export function createCharacter(key, opts = {}) {
  const C = SHAPES[key];
  if (!C) throw new Error(`createCharacter: unknown key "${key}"`);
  const E = C.eye, S = SHAPE.eye;
  const detail = opts.detail ?? (isCoarse() ? 40 : 56);
  let idle = opts.idle ?? !prefersReducedMotion();
  const mScale = clamp(Math.sqrt(E.w * E.h) / Math.sqrt(.1003 * .0826), .72, 1.1);

  /* ---------- scratch (per instance, reused every frame) ---------- */
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _ray = new THREE.Ray();
  const _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const frame = resetFrame({});

  /* ---------- materials & textures (owned) ---------- */
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xdcd9f3, roughness: .9, sheen: 1, sheenRoughness: .42, sheenColor: new THREE.Color(0xf7efff), envMapIntensity: .35 });
  const decalBase = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
  const eyeTex = [canvasTex(TEX), canvasTex(TEX)], mouthTex = canvasTex(TEX);
  const eyeMats = eyeTex.map(x => new THREE.MeshStandardMaterial({ map: x.t, roughness: .75, envMapIntensity: .4, ...decalBase }));
  const mouthMat = new THREE.MeshStandardMaterial({ map: mouthTex.t, roughness: .7, ...decalBase });
  const blushTex = radialTex(128, 'rgba(246,150,190,.85)', 'rgba(246,150,190,0)');
  const blushMat = new THREE.MeshBasicMaterial({ map: blushTex, opacity: 0, ...decalBase });
  const shadowTex = radialTex(128, 'rgba(70,70,130,0.42)', 'rgba(70,70,130,0)');
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });

  // colours (prototype applyColours); the stage may copy lightTint into its hemisphere light
  const top = new THREE.Color(C.colors.top), mid = new THREE.Color(C.colors.mid), bot = new THREE.Color(C.colors.bottom), hsl = {};
  bodyMat.color.copy(mid).lerp(new THREE.Color(1, 1, 1), .35);
  top.getHSL(hsl); bodyMat.sheenColor.setHSL(hsl.h, .5, .96);
  const lightTint = { sky: new THREE.Color(), ground: new THREE.Color() };
  lightTint.sky.setHSL(hsl.h, Math.min(1, hsl.s * 1.6 + .08), Math.max(hsl.l, .9));
  bot.getHSL(hsl); lightTint.ground.setHSL(hsl.h, Math.min(1, hsl.s * 1.5), hsl.l * .8);

  /* ---------- scene graph ---------- */
  const object3d = new THREE.Group(); object3d.name = `character:${key}`;
  const hang = new THREE.Group(), hangIn = new THREE.Group(), rig = new THREE.Group(), squash = new THREE.Group(), turn = new THREE.Group(), faceG = new THREE.Group();
  object3d.add(hang); hang.add(hangIn); hangIn.add(rig); rig.add(squash); squash.add(turn);
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .003; shadow.renderOrder = -1;
  shadow.visible = opts.shadow ?? true; object3d.add(shadow);

  /* ---------- body from the traced silhouette ---------- */
  const ico = new THREE.IcosahedronGeometry(1, detail); ico.deleteAttribute('normal'); ico.deleteAttribute('uv');
  const flatGeo = mergeVertices(ico); ico.dispose();
  const dirs = flatGeo.attributes.position.array.slice();
  const prof = C.profile, N = prof.length;
  let mean = 0; for (const v of prof) mean += v; mean /= N;
  const profR = (t) => { const u = ((t / (Math.PI * 2)) % 1 + 1) % 1 * N, i = Math.floor(u), f = u - i; return prof[i % N] * (1 - f) + prof[(i + 1) % N] * f; };
  const geo = { top: profR(Math.PI / 2), bot: profR(-Math.PI / 2), sideR: profR(0), sideL: profR(Math.PI) };
  const pos = flatGeo.attributes.position, ex = .86;
  const dFront = SHAPE.thick * C.req, dBack = dFront * .8;
  for (let i = 0; i < pos.count; i++) {
    const x = dirs[i * 3], y = dirs[i * 3 + 1], z = dirs[i * 3 + 2], c = Math.hypot(x, y);
    const r = mean + (profR(Math.atan2(y, x)) - mean) * Math.pow(c, 2.4);
    const k = c > 1e-7 ? Math.pow(c, ex) / c : 0, zz = Math.sign(z) * Math.pow(Math.abs(z), ex);
    pos.setXYZ(i, x * k * r, y * k * r, zz * (z > 0 ? dFront : dBack));
  }
  pos.needsUpdate = true; flatGeo.computeVertexNormals(); flatGeo.computeBoundingBox();
  const bb = flatGeo.boundingBox, floorY = bb.min.y, bodyW = bb.max.x - bb.min.x;
  const centreH = -floorY, topH = bb.max.y - floorY;            // heights above the feet
  turn.position.y = centreH;
  hang.position.y = topH; hangIn.position.y = -topH;

  // shallow eye sockets pressed into the clay
  const insetGeo = flatGeo.clone();
  {
    const ip = insetGeo.attributes.position, nor = flatGeo.attributes.normal;
    const grow = 1.12, depth = .16 * Math.min(E.w, E.h) * S, pupOff = [E.pdx * E.w * S, E.pdy * E.h * S];
    const cr = Math.cos(-E.rot), sr = Math.sin(-E.rot);
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (z > .1) {
        let f = 0;
        for (const [exx, ey] of E.pos) {
          const dx0 = x - exx, dy0 = y - ey, dx = dx0 * cr - dy0 * sr, dy = dx0 * sr + dy0 * cr;
          let d = superD(dx, dy, E.w * S * grow, E.h * S * grow, E.p);
          if (!E.clip) d = Math.min(d, Math.hypot((dx - pupOff[0]) / (E.pw * E.w * S * 1.15), (dy - pupOff[1]) / (E.ph * E.h * S * 1.15)));
          f = Math.max(f, 1 - smooth(.86, 1.14, d));
        }
        if (f > 0) { const dd = depth * f; x -= nor.getX(i) * dd; y -= nor.getY(i) * dd; z -= nor.getZ(i) * dd; }
      }
      ip.setXYZ(i, x, y, z);
    }
    ip.needsUpdate = true; insetGeo.computeVertexNormals(); insetGeo.computeBoundingSphere();
  }
  const basePos = Float32Array.from(insetGeo.attributes.position.array);
  const body = new THREE.Mesh(insetGeo, bodyMat); body.frustumCulled = false; body.name = 'body';
  turn.add(body, faceG);

  /* ---------- face decals ---------- */
  const flatProbe = new THREE.Mesh(flatGeo), insetProbe = new THREE.Mesh(insetGeo);
  flatProbe.updateMatrixWorld(); insetProbe.updateMatrixWorld();
  const probeRay = new THREE.Raycaster();
  const faceMeshes = [];
  function decal(x, y, size, mat, outPoint) {
    probeRay.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
    const hit = probeRay.intersectObject(flatProbe, false)[0]; if (!hit) return null;
    const h = new THREE.Object3D(); h.position.copy(hit.point); h.lookAt(hit.point.clone().add(hit.face.normal));
    const m = new THREE.Mesh(new DecalGeometry(insetProbe, hit.point, h.rotation, new THREE.Vector3(size, size, .24)), mat);
    m.frustumCulled = false; m.userData.base = Float32Array.from(m.geometry.attributes.position.array);
    if (outPoint) outPoint.copy(hit.point);
    faceG.add(m); faceMeshes.push(m);
    return m;
  }
  const BOX = Math.max(E.w, E.h) * S * 3.4, MBOX = .34 * Math.max(1, mScale);
  E.pos.forEach(([x, y], i) => decal(x, y, BOX, eyeMats[i]));
  const leftEye = E.pos[0][0] < E.pos[1][0] ? 0 : 1;
  const cheeks = [];
  E.pos.forEach(([x, y], i) => {
    const out = i === leftEye ? -1 : 1, p = new THREE.Vector3(x + out * E.w * S * .75, y - E.h * S * 1.55, dFront * .8);
    decal(p.x, p.y, .24 * mScale, blushMat, p);
    cheeks.push({ a: p, d: new THREE.Vector3(), dir: new THREE.Vector3(out * .45, -.12, .88).normalize(), invR2: 1 / (.21 * .21) });
  });
  const mouthLocal = new THREE.Vector3(C.mouth.x, C.mouth.y, dFront * .9);
  decal(C.mouth.x, C.mouth.y, MBOX, mouthMat, mouthLocal);
  const eyeLineY = Math.max(E.pos[0][1], E.pos[1][1]);
  const headMinY = Math.min(eyeLineY - E.h * S * 1.6, geo.top * .3);

  /* ---------- soft-body deformers ---------- */
  const defs = [];
  const active = [];
  let deformDirty = false;
  const puff = { x: 0, v: 0 };
  function newDef(anchor, R) {
    const d = { a: anchor.clone(), d: new THREE.Vector3(), v: new THREE.Vector3(), target: null, invR2: 1 / (R * R), held: false };
    defs.push(d);
    if (defs.length > MAX_DEFS) { const i = defs.findIndex(x => !x.target); if (i >= 0) defs.splice(i, 1); }
    return d;
  }
  function updateDefs(dt) {
    let n = 0;
    for (let j = 0; j < defs.length; j++) {
      const f = defs[j];
      if (f.target) {
        _v.copy(f.d); f.d.lerp(f.target, 1 - Math.exp(-dt * 20));
        f.v.copy(f.d).sub(_v).divideScalar(Math.max(dt, 1e-3)).multiplyScalar(.6);
      } else {
        f.v.x += (-DEF_K * f.d.x - DEF_D * f.v.x) * dt; f.v.y += (-DEF_K * f.d.y - DEF_D * f.v.y) * dt; f.v.z += (-DEF_K * f.d.z - DEF_D * f.v.z) * dt;
        f.d.addScaledVector(f.v, dt);
      }
      if (f.target || f.d.lengthSq() > 1e-7 || f.v.lengthSq() > 1e-5) defs[n++] = f;
    }
    defs.length = n;
  }
  function warp(src, dst, act) {
    const na = act.length;
    for (let i = 0; i < src.length; i += 3) {
      const x = src[i], y = src[i + 1], z = src[i + 2];
      let dx = 0, dy = 0, dz = 0;
      for (let j = 0; j < na; j++) {
        const f = act[j], ex2 = x - f.a.x, ey = y - f.a.y, ez = z - f.a.z, q = (ex2 * ex2 + ey * ey + ez * ez) * f.invR2;
        if (q > 9) continue;
        const w = Math.exp(-q); dx += f.d.x * w; dy += f.d.y * w; dz += f.d.z * w;
      }
      dst[i] = x + dx; dst[i + 1] = y + dy; dst[i + 2] = z + dz;
    }
  }
  function applyDeform() {
    active.length = 0;
    for (let j = 0; j < defs.length; j++) if (defs[j].d.lengthSq() > 1e-8) active.push(defs[j]);
    if (Math.abs(puff.x) > 1e-3) for (const c of cheeks) { c.d.copy(c.dir).multiplyScalar(.075 * puff.x); active.push(c); }
    const ip = insetGeo.attributes.position;
    if (!active.length) {
      if (!deformDirty) return;
      ip.array.set(basePos); ip.needsUpdate = true; insetGeo.computeVertexNormals();
      for (const m of faceMeshes) { const p = m.geometry.attributes.position; p.array.set(m.userData.base); p.needsUpdate = true; }
      deformDirty = false; return;
    }
    warp(basePos, ip.array, active); ip.needsUpdate = true; insetGeo.computeVertexNormals();
    for (const m of faceMeshes) { const p = m.geometry.attributes.position; warp(m.userData.base, p.array, active); p.needsUpdate = true; }
    deformDirty = true;
  }

  /* ---------- squish (two axes, damped spring) ---------- */
  const sq = { x: 0, vx: 0, y: 0, vy: 0, tx: 0, ty: 0 };
  function stepAxis(k, t, dt) {
    const v = k === 'x' ? 'vx' : 'vy';
    if (t > .005) { const p = sq[k]; sq[k] = lerp(sq[k], t, 1 - Math.exp(-dt * 14)); sq[v] = (sq[k] - p) / Math.max(dt, 1e-3) * .5; }
    else { sq[v] += (-170 * sq[k] - 8 * sq[v]) * dt; sq[k] += sq[v] * dt; }
    sq[k] = clamp(sq[k], -.25, .5);
  }

  /* ---------- expression state ---------- */
  let exprKey = 'original';
  let target = exprFor('original', C, mScale);
  const cur = JSON.parse(JSON.stringify(target));
  const openM = { w: .06 * mScale, up: .04 * mScale, down: .085 * mScale, curve: .006 * mScale, t: .003 * Math.sqrt(mScale), tongue: .55, q: 2.2, skew: 0 };
  const mFinal = { ...cur.mouth };
  const st = { eye: 1, pupil: 1, lidCurve: 1, lidU: [0, 0], lidL: [0, 0], tilt: [0, 0], arc: [1, 1], blink: 0, lx: 0, ly: 0 };
  const prevEye = new Int32Array(14).fill(-1e9), prevMouth = new Int32Array(8).fill(-1e9);
  const eyeQ = new Int32Array(14), mouthQ = new Int32Array(8);
  const MOUTH_FIELDS = ['w', 'up', 'down', 'curve', 't', 'tongue', 'q', 'skew'];

  let blink = 0, blinkT = -1, nextBlink = 1.6, sacX = 0, sacY = 0, nextSac = 1, clock = 0;
  const look = { x: 0, y: 0, ry: 0, rx: 0 };
  let focus = null; const focusPt = new THREE.Vector3();
  let mouthOverride = -1, talkTarget = 0, talk = 0, mouthOpen = 0;

  /* ---------- actions & poses ---------- */
  let act = null, actT = 0;
  const sit = { x: 0, v: 0 }, carry = { x: 0, v: 0 }, pend = { x: 0, v: 0 };
  let sitting = false, carried = false, prevX = NaN;

  /* ---------- helpers ---------- */
  function surfaceZ(lx, ly) {
    const r = profR(Math.atan2(ly, lx)), rho = Math.hypot(lx, ly);
    return dFront * Math.pow(Math.max(0, 1 - (rho / r) ** 2), .43);
  }
  function toLocal(worldPoint, out) {
    object3d.updateWorldMatrix(true, true);
    return turn.worldToLocal(out.copy(worldPoint));
  }
  function anchorFromWorld(worldPoint) {
    const l = toLocal(worldPoint, new THREE.Vector3());
    const r = profR(Math.atan2(l.y, l.x)), rho = Math.hypot(l.x, l.y);
    if (rho < r * 1.1 && l.z > -.05) l.z = surfaceZ(l.x, l.y);
    return l;
  }

  /* ---------- per-frame ---------- */
  function update(dtIn, time) {
    const dt = Math.min(Math.max(dtIn, 0), 1 / 20);
    clock = time ?? clock + dt;

    updateDefs(dt);
    stepAxis('x', sq.tx, dt); stepAxis('y', sq.ty, dt);

    // expression blend
    const k = 1 - Math.exp(-dt * 12);
    cur.eye = lerp(cur.eye, target.eye, k); cur.pupil = lerp(cur.pupil, target.pupil, k); cur.blush = lerp(cur.blush, target.blush, k);
    cur.sy = lerp(cur.sy, target.sy, k); cur.rx = lerp(cur.rx, target.rx, k); cur.rz = lerp(cur.rz, target.rz, k);
    cur.lidCurve = lerp(cur.lidCurve, target.lidCurve, k); cur.puff = lerp(cur.puff, target.puff, k);
    for (let i = 0; i < 2; i++) {
      cur.lidU[i] = lerp(cur.lidU[i], target.lidU[i], k); cur.lidL[i] = lerp(cur.lidL[i], target.lidL[i], k);
      cur.tilt[i] = lerp(cur.tilt[i], target.tilt[i], k); cur.look[i] = lerp(cur.look[i], target.look[i], k);
      cur.arc[i] = target.arc[i];
    }
    for (let j = 0; j < 8; j++) { const f = MOUTH_FIELDS[j]; cur.mouth[f] = lerp(cur.mouth[f], target.mouth[f], k); }

    // body action frame
    resetFrame(frame);
    if (act) { actT += dt / act.dur; if (actT >= 1) act = null; else act.f(actT, frame); }

    // blink and saccades
    if (clock > nextBlink && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += dt; blink = blinkT < .07 ? blinkT / .07 : blinkT < .1 ? 1 : Math.max(0, 1 - (blinkT - .1) / .1);
      if (blinkT > .2) { blinkT = -1; blink = 0; nextBlink = clock + 2 + Math.random() * 3.5; }
    }
    if (clock > nextSac) { sacX = (Math.random() - .5) * .3; sacY = (Math.random() - .5) * .2; nextSac = clock + 1.2 + Math.random() * 2.8; }

    // gaze
    let fx = 0, fy = 0;
    const useFocus = focus && !LOOK_AWAY.has(exprKey);
    if (useFocus) {
      object3d.updateWorldMatrix(true, false);
      _v.copy(focusPt); object3d.worldToLocal(_v);
      const dx = _v.x, dy = _v.y - centreH, dz = _v.z - dFront * .5, d = Math.max(1.2, dz * .35);
      fx = clamp(dx / d, -1.3, 1.3); fy = clamp(dy / d, -1.3, 1.3);
    }
    const gk = 1 - Math.exp(-dt * 14), hk = 1 - Math.exp(-dt * 5);
    look.x = lerp(look.x, useFocus ? fx * 1.1 : cur.look[0] + (idle ? sacX : 0), gk);
    look.y = lerp(look.y, useFocus ? fy * 1.1 : cur.look[1] + (idle ? sacY : 0), gk);
    look.ry = lerp(look.ry, useFocus ? fx * .3 : 0, hk);
    look.rx = lerp(look.rx, useFocus ? -fy * .14 : 0, hk);

    // eyes: redraw only when the drawn state changes
    st.eye = cur.eye; st.pupil = cur.pupil; st.lidCurve = cur.lidCurve; st.blink = blink; st.lx = look.x; st.ly = look.y;
    for (let i = 0; i < 2; i++) {
      const lu = cur.lidU[i], ll = cur.lidL[i];
      st.lidU[i] = lu + frame.lid * Math.max(0, 1 - lu - ll); st.lidL[i] = ll; st.tilt[i] = cur.tilt[i]; st.arc[i] = cur.arc[i];
    }
    eyeQ[0] = Math.round(st.eye * 1000); eyeQ[1] = Math.round(st.pupil * 1000); eyeQ[2] = Math.round(st.lidCurve * 1000);
    eyeQ[3] = Math.round(st.lidU[0] * 1000); eyeQ[4] = Math.round(st.lidU[1] * 1000); eyeQ[5] = Math.round(st.lidL[0] * 1000); eyeQ[6] = Math.round(st.lidL[1] * 1000);
    eyeQ[7] = Math.round(st.tilt[0] * 1000); eyeQ[8] = Math.round(st.tilt[1] * 1000); eyeQ[9] = Math.round(blink * 1000);
    eyeQ[10] = Math.round(look.x * 1000); eyeQ[11] = Math.round(look.y * 1000); eyeQ[12] = st.arc[0]; eyeQ[13] = st.arc[1];
    let eyeChanged = false;
    for (let j = 0; j < 14; j++) if (eyeQ[j] !== prevEye[j]) { eyeChanged = true; prevEye[j] = eyeQ[j]; }
    if (eyeChanged) {
      for (let i = 0; i < 2; i++) { drawEye(eyeTex[i].g, TEX, BOX, E, S, i, st); eyeTex[i].t.needsUpdate = true; }
    }

    // mouth: expression shape blended toward "open" by override / talk / action
    const tk = 1 - Math.exp(-dt * (talkTarget > talk ? 30 : 12));
    talk = lerp(talk, talkTarget, tk);
    const talkOpen = clamp((talk - .04) * 1.6, 0, .85);
    const want = Math.max(mouthOverride >= 0 ? mouthOverride : 0, talkOpen);
    mouthOpen = lerp(mouthOpen, want, 1 - Math.exp(-dt * 18));
    const mo = clamp(Math.max(mouthOpen, frame.mo), 0, 1);
    let mouthChanged = false;
    for (let j = 0; j < 8; j++) {
      const f = MOUTH_FIELDS[j], c0 = cur.mouth[f];
      const open = (f === 'curve' || f === 'skew') ? openM[f] : Math.max(c0, openM[f]);   // never smaller than the expression's own mouth
      const v = lerp(c0, open, mo);
      mFinal[f] = v; mouthQ[j] = Math.round(v * 10000);
      if (mouthQ[j] !== prevMouth[j]) { mouthChanged = true; prevMouth[j] = mouthQ[j]; }
    }
    if (mouthChanged) { drawMouth(mouthTex.g, TEX, MBOX, mFinal); mouthTex.t.needsUpdate = true; }
    blushMat.opacity = cur.blush * .9;

    // cheek puff (spring with a small overshoot)
    spring(puff, Math.max(cur.puff, frame.puff), dt, 140, .62);

    // poses
    spring(sit, sitting ? 1 : 0, dt, 90, .72);
    spring(carry, carried ? 1 : 0, dt, 90, .72);
    const s = clamp(sit.x, -.2, 1.2), c = clamp(carry.x, -.2, 1.2);

    // body transform
    let y = frame.y, sy = cur.sy * frame.sy, rx = cur.rx + frame.rx, ry = frame.ry, rz = cur.rz + frame.rz;
    if (idle) { sy *= 1 + .013 * Math.sin(clock * 2.3); rz += .015 * Math.sin(clock * .9); ry += .03 * Math.sin(clock * .55); }
    sy *= (1 - .1 * s) * (1 + .09 * c);
    rx += -.05 * s + .04 * c;
    const qx = sq.x, qy = sq.y, base = 1 / Math.sqrt(sy);
    const SXs = base * (1 - qx) * (1 + .6 * qy) * (1 + .04 * s), SYs = sy * (1 - qy) * (1 + .7 * qx), SZs = base * (1 + .3 * qx) * (1 + .6 * qy);
    squash.scale.set(SXs, SYs, SZs);
    rig.position.set(frame.x, y - (SYs - 1) * topH * Math.max(0, c), 0);
    turn.rotation.set(rx + look.rx, ry + look.ry, rz);

    // dangling pendulum: lags behind horizontal movement while carried
    const px = object3d.position.x;
    const vx = Number.isFinite(prevX) && dt > 0 ? (px - prevX) / dt : 0; prevX = px;
    spring(pend, c * (clamp(-vx * .09, -.35, .35) + .05 * Math.sin(clock * 2.1)), dt, 40, .35);
    hang.rotation.z = pend.x;

    // floor shadow
    const sh = 1 / (1 + Math.max(0, y) * 2.2), so = sh * (1 - clamp(c, 0, 1));
    shadow.scale.set(bodyW * 1.15 * SXs * sh, 1.5 * SZs * sh, 1); shadow.material.opacity = so; shadow.position.x = frame.x;

    applyDeform();
  }

  /* ---------- API ---------- */
  const api = {
    key,
    object3d,
    /** Colours the stage may copy into its hemisphere light (prototype tinted it per character). */
    lightTint,
    /** Approximate standing height in units (feet to head top). */
    height: topH,

    /** Advance animation; call every frame. */
    update,

    /** Set the facial expression (see EXPRESSION_KEYS). Unknown names are ignored. */
    setExpression(name) {
      if (name !== 'original' && !GENERIC[name]) return;
      exprKey = name; target = exprFor(name, C, mScale);
    },
    /** Current expression name. */
    getExpression() { return exprKey; },

    /** Play a body action clip (see ACTION_KEYS); replaces a playing one. Returns its duration (s), 0 if unknown. */
    play(action) {
      const a = ACTIONS[action]; if (!a) return 0;
      act = a; actT = 0; return a.dur;
    },
    /** True while an action clip is playing. */
    isBusy() { return act !== null; },

    /** Eyes and head follow a world point; null returns to the idle gaze. */
    lookAt(worldPointOrNull) {
      if (worldPointOrNull) { focus = true; focusPt.copy(worldPointOrNull); } else focus = null;
    },
    /** Mouth open override 0..1 (food near, talk-back); a negative value releases it. */
    setMouthOpen(t) { mouthOverride = t < 0 ? -1 : clamp(t, 0, 1); },
    /** Audio level 0..1 → mouth flap while talking. */
    setTalkLevel(level) { talkTarget = clamp(level || 0, 0, 1); },

    /**
     * Cheap silhouette hit test (no triangle raycast).
     * @param {THREE.Raycaster} raycaster
     * @returns {null | { point: THREE.Vector3, local: THREE.Vector3, region: 'head'|'body'|'mouth' }}
     *   point is on the front surface in world space; local is in body space (centre origin).
     */
    hitTest(raycaster) {
      object3d.updateWorldMatrix(true, true);
      _m.copy(turn.matrixWorld).invert();
      _ray.copy(raycaster.ray).applyMatrix4(_m);
      if (!_ray.intersectPlane(_plane, _v2)) return null;
      const r = profR(Math.atan2(_v2.y, _v2.x)), rho = Math.hypot(_v2.x, _v2.y);
      if (rho >= r * 1.04) return null;
      const local = new THREE.Vector3(_v2.x, _v2.y, surfaceZ(_v2.x, _v2.y));
      const point = turn.localToWorld(local.clone());
      const mrx = Math.max(.09, C.mouth.w * mScale * 1.6 + .05), mry = .08 + mouthOpen * .05;
      const region = Math.hypot((local.x - mouthLocal.x) / mrx, (local.y - mouthLocal.y) / mry) < 1 ? 'mouth'
        : local.y > headMinY ? 'head' : 'body';
      return { point, local, region };
    },

    /** Dent at a world point that springs back. */
    poke(worldPoint, strength = 1) {
      const f = newDef(anchorFromWorld(worldPoint), .3);
      f.d.set(0, 0, -.16 * strength); f.v.set(0, 0, -1 * strength);
    },

    /**
     * Start a soft-body stretch handle at a world point on the body.
     * @returns {{ move(worldPoint: THREE.Vector3): void, release(): number }} release returns stretch 0..1
     */
    beginGrab(worldPoint) {
      const f = newDef(anchorFromWorld(worldPoint), .62); f.held = true; f.target = new THREE.Vector3();
      let done = false;
      return {
        move(wp) {
          if (done) return;
          const l = toLocal(wp, _v);
          const d = f.target.copy(l).sub(f.a); d.z = 0;
          const L = d.length(); if (L > 1.1) d.multiplyScalar(1.1 / L);
          d.z = Math.min(L, 1.1) * .22;
        },
        release() {
          if (done) return 0; done = true;
          const s = clamp(f.target.length() / 1.1, 0, 1); f.target = null; f.held = false;
          return s;
        },
      };
    },

    /** Global squish targets, 0..0.45 each: x = side squeeze, y = top press. Springs back at 0. */
    setSquish(x, y) { sq.tx = clamp(x || 0, 0, .45); sq.ty = clamp(y || 0, 0, .45); },
    /** Dangling pose while carried (stretch down + pendulum sway). */
    setCarried(on) { carried = !!on; },
    /** Sitting pose (toilet). */
    setSitting(on) { sitting = !!on; },
    /** Turn breathing / idle gaze on or off. */
    setIdle(on) { idle = !!on; },

    /** World position of the mouth (on the face surface). */
    getMouthWorld(out) { object3d.updateWorldMatrix(true, true); return turn.localToWorld(out.copy(mouthLocal)); },
    /** World position of the top of the head. */
    getHeadTopWorld(out) { object3d.updateWorldMatrix(true, true); return turn.localToWorld(out.set(0, geo.top + .02, 0)); },

    /** Free all GPU resources and detach from the scene. */
    dispose() {
      object3d.removeFromParent();
      for (const m of faceMeshes) m.geometry.dispose();
      faceMeshes.length = 0; defs.length = 0; active.length = 0;
      flatGeo.dispose(); insetGeo.dispose(); shadowGeo.dispose();
      for (const x of eyeTex) x.t.dispose();
      mouthTex.t.dispose(); blushTex.dispose(); shadowTex.dispose();
      for (const m of [bodyMat, ...eyeMats, mouthMat, blushMat, shadowMat]) m.dispose();
    },
  };

  // first frame state
  update(0, 0);
  return api;
}

export { ACTIONS };
