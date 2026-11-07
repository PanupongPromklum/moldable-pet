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
 *                     └ turn (rotation, pivot at body centre) ─ body + face decals + outfit
 *
 * Outfit items (story S2-06, src/characters/accessories.js) live in `turn`, so they share the
 * body's squash/stretch, carry sway, sitting pose and head turn; each item also rides the
 * soft-body dent (poke / grab / cheek puff) measured at its anchor.
 *
 * Growth (story S5-02, design/gdd/growth-personality.md 3.2): an extra `grow` group between
 * `object3d` and `hang` scales everything (body, face, outfit, floor shadow) about the feet, so
 * world-space queries (hitTest, getMouthWorld, getHeadTopWorld) stay right at every stage and
 * `object3d.scale` stays free for the game. Bigger baby eyes are a face re-layout: the eye centres
 * move apart / up so the inner gap and the mouth gap never shrink, the eye sockets, decals, blush,
 * trait marks, outfit fit and worn items are rebuilt once at the half-way point of the eased
 * transition (eyes themselves redraw continuously). Trait marks: src/characters/marks.js.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { SHAPES } from './shapes.js';
import { GENERIC, LOOK_AWAY, exprFor } from './expressions.js';
import { ACTIONS, resetFrame } from './actions.js';
import { drawEye, drawMouth, superD } from './face.js';
import { buildAccessory, disposeAccessory, SLOT_OF, SLOTS } from './accessories.js';
import { createFit } from './fit.js';
import { markTexture, TRAIT_MARK_IDS } from './marks.js';

export { EXPRESSION_KEYS } from './expressions.js';
export { EXPRESSION_ACTION, EXPRESSION_TH } from './expressions.js';
export { ACTION_KEYS } from './actions.js';
export { ACCESSORY_IDS, SLOT_OF, SLOTS, ACCESSORY_TH, XMAS_ACCESSORY_IDS } from './accessories.js';
export { TRAIT_MARK_IDS, TRAIT_MARK_TH } from './marks.js';

/**
 * Mimic minigame poses (minigames-2 GDD 3.2): six face + body combos that read apart at phone size.
 * Order = pad order (the game starts with the first four). `label` is the short Thai pad label.
 * @type {ReadonlyArray<{ id: string, expression: string, action: string, label: string }>}
 */
export const MIMIC_POSES = Object.freeze([
  { id: 'smile', expression: 'smile', action: 'nod', label: 'ยิ้ม' },
  { id: 'surprised', expression: 'surprised', action: 'hop', label: 'ตกใจ' },
  { id: 'wink', expression: 'wink', action: 'tilt', label: 'ขยิบตา' },
  { id: 'sleepy', expression: 'sleepy', action: 'sway', label: 'ง่วง' },
  { id: 'shy', expression: 'shy', action: 'wiggle', label: 'เขิน' },
  { id: 'joy', expression: 'joy', action: 'jelly', label: 'ดีใจ' },
].map(Object.freeze));

/** Growth fields `setGrowth` accepts, with the clamp range each is held to (GDD 7.1 safe ranges, widened a little). */
export const GROWTH_RANGE = Object.freeze({
  scale: [.5, 1.2], eyeScale: [.8, 1.4], roundness: [.9, 1.2], jiggle: [.5, 1.6], hopScale: [.4, 1.2],
});
const GROWTH_KEYS = Object.keys(GROWTH_RANGE);
const GROWN = Object.freeze({ scale: 1, eyeScale: 1, roundness: 1, jiggle: 1, hopScale: 1 });

/** Character keys in roster order (`pill` is "coming soon" in Sprint 1). */
export const CHARACTER_KEYS = Object.freeze(['splat', 'pill', 'gumdrop', 'diamond', 'cloud', 'flower']);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const TEX = 512;                 // mouth canvas size (px)
const BOX_MARGIN = 1.2;          // eye decal box headroom for the eye growing / moving during a transition
const ETEX = Math.round(TEX * BOX_MARGIN / 8) * 8;   // eye canvas size: same px per unit as before
const MARK_ORDER = 3;            // trait marks draw after blush / eyes
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

/** Ease-in-out for the growth transition (GDD 3.3: "ease-in-out 2.5 s, no hard bounce"). */
const easeInOut = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Create one character.
 * @param {string} key one of CHARACTER_KEYS
 * @param {{ detail?: number, idle?: boolean, shadow?: boolean, growth?: object, trait?: string|null }} [opts]
 *   detail = icosahedron detail (default 40 on touch devices, 56 otherwise); idle = breathing/saccades
 *   (default: off when the user prefers reduced motion); shadow = soft floor blob (default true);
 *   growth = initial `setGrowth` values (applied instantly); trait = initial `setTraitMark` id.
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
  const eyeTex = [canvasTex(ETEX), canvasTex(ETEX)], mouthTex = canvasTex(TEX);
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
  const grow = new THREE.Group(); grow.name = 'grow';
  const hang = new THREE.Group(), hangIn = new THREE.Group(), rig = new THREE.Group(), squash = new THREE.Group(), turn = new THREE.Group(), faceG = new THREE.Group();
  object3d.add(grow); grow.add(hang); hang.add(hangIn); hangIn.add(rig); rig.add(squash); squash.add(turn);
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .003; shadow.renderOrder = -1;
  shadow.visible = opts.shadow ?? true; grow.add(shadow);

  /* ---------- growth state (S5-02) ---------- */
  const gCur = { ...GROWN }, gFrom = { ...GROWN }, gTo = { ...GROWN };
  let gT = 1, gDur = 0;
  const clampGrowth = (k, v) => clamp(Number.isFinite(v) ? v : gTo[k], GROWTH_RANGE[k][0], GROWTH_RANGE[k][1]);
  if (opts.growth) for (const k of GROWTH_KEYS) if (k in opts.growth) gCur[k] = gFrom[k] = gTo[k] = clampGrowth(k, opts.growth[k]);

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

  /* ---------- eye layout per eye scale (S5-02) ---------- */
  // Bigger (baby) eyes grow outward and a little upward around fixed inner edges, so the gap
  // between the eyes and the gap above the mouth never shrink (pill / gumdrop / diamond / cloud eyes
  // are nearly touching at k = 1). At k = 1 this is exactly the traced layout.
  const eyeMidX = (E.pos[0][0] + E.pos[1][0]) / 2;
  function eyeLayout(k) {
    const w = E.w * S, h = E.h * S;
    return E.pos.map(([x, y]) => [x + Math.sign(x - eyeMidX || 1) * w * (k - 1), y + h * (k - 1) * .5]);
  }

  // rest geometry = flat body + eye sockets (the soft-body base; decals are projected onto it)
  const restGeo = flatGeo.clone(), insetGeo = flatGeo.clone();
  const fpos = flatGeo.attributes.position, fnor = flatGeo.attributes.normal;
  function buildSockets(k, P) {
    const rp = restGeo.attributes.position, Sk = S * k;
    const grow = 1.12, depth = .16 * Math.min(E.w, E.h) * Sk, pupOff = [E.pdx * E.w * Sk, E.pdy * E.h * Sk];
    const cr = Math.cos(-E.rot), sr = Math.sin(-E.rot);
    for (let i = 0; i < fpos.count; i++) {
      let x = fpos.getX(i), y = fpos.getY(i), z = fpos.getZ(i);
      if (z > .1) {
        let f = 0;
        for (const [exx, ey] of P) {
          const dx0 = x - exx, dy0 = y - ey, dx = dx0 * cr - dy0 * sr, dy = dx0 * sr + dy0 * cr;
          let d = superD(dx, dy, E.w * Sk * grow, E.h * Sk * grow, E.p);
          if (!E.clip) d = Math.min(d, Math.hypot((dx - pupOff[0]) / (E.pw * E.w * Sk * 1.15), (dy - pupOff[1]) / (E.ph * E.h * Sk * 1.15)));
          f = Math.max(f, 1 - smooth(.86, 1.14, d));
        }
        if (f > 0) { const dd = depth * f; x -= fnor.getX(i) * dd; y -= fnor.getY(i) * dd; z -= fnor.getZ(i) * dd; }
      }
      rp.setXYZ(i, x, y, z);
    }
    rp.needsUpdate = true; restGeo.computeVertexNormals(); restGeo.computeBoundingSphere(); restGeo.computeBoundingBox();
  }
  const basePos = new Float32Array(fpos.array.length);
  const body = new THREE.Mesh(insetGeo, bodyMat); body.frustumCulled = false; body.name = 'body';
  turn.add(body, faceG);

  /* ---------- foodie belly (trait mark): a soft ~4 % bulge low on the front ---------- */
  const fitMouthBottom = C.mouth.y - .1 * mScale - .006;
  const bellyY = floorY + .36 * topH, bellySy = .24 * topH, bellyA = .04 * topH / 1.7 * 1.0;
  /** Belly push weight 0..1 at a body point (front-facing, below the open mouth). */
  const bellyW = (x, y, nz) => Math.exp(-(((y - bellyY) / bellySy) ** 2) - (x / (bodyW * .55)) ** 2)
    * (1 - smooth(fitMouthBottom - .18, fitMouthBottom - .04, y)) * smooth(-.35, .4, nz);
  let bellyDisp = null; const belly = { x: 0, target: 0, built: -1 };
  function refreshBase() {
    const rp = restGeo.attributes.position.array, b = belly.x;
    if (b > 1e-3) {
      if (!bellyDisp) {
        bellyDisp = new Float32Array(rp.length); const rn = restGeo.attributes.normal.array;
        for (let i = 0; i < rp.length; i += 3) {
          const w = bellyW(rp[i], rp[i + 1], rn[i + 2]) * bellyA;
          bellyDisp[i] = rn[i] * w * .6; bellyDisp[i + 1] = rn[i + 1] * w * .3; bellyDisp[i + 2] = rn[i + 2] * w;
        }
      }
      for (let i = 0; i < rp.length; i++) basePos[i] = rp[i] + bellyDisp[i] * b;
    } else basePos.set(rp);
    belly.built = b; deformDirty = true;
  }

  /* ---------- face decals ---------- */
  const flatProbe = new THREE.Mesh(flatGeo);
  // decal probe: front triangles of the rest geometry only (shares its attributes; DecalGeometry walks every triangle)
  const probeGeo = new THREE.BufferGeometry();
  probeGeo.setAttribute('position', restGeo.attributes.position); probeGeo.setAttribute('normal', restGeo.attributes.normal);
  {
    const ix = restGeo.index.array, keep = [];
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t], b = ix[t + 1], c = ix[t + 2];
      if (Math.max(fpos.getZ(a), fpos.getZ(b), fpos.getZ(c)) > -.02) keep.push(a, b, c);
    }
    probeGeo.setIndex(keep);
  }
  const insetProbe = new THREE.Mesh(probeGeo);
  flatProbe.updateMatrixWorld(); insetProbe.updateMatrixWorld();
  const probeRay = new THREE.Raycaster();
  const faceMeshes = [];
  /** Project a decal at body (x, y). Returns { geometry, point } or null. */
  function decalGeo(x, y, size, rot = 0) {
    probeRay.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
    const hit = probeRay.intersectObject(flatProbe, false)[0]; if (!hit) return null;
    const h = new THREE.Object3D(); h.position.copy(hit.point); h.lookAt(hit.point.clone().add(hit.face.normal)); if (rot) h.rotateZ(rot);
    return { geometry: new DecalGeometry(insetProbe, hit.point, h.rotation, new THREE.Vector3(size, size, .24)), point: hit.point };
  }
  function decal(x, y, size, mat, outPoint) {
    const d = decalGeo(x, y, size); if (!d) return null;
    const m = new THREE.Mesh(d.geometry, mat);
    m.frustumCulled = false; m.userData.base = Float32Array.from(m.geometry.attributes.position.array);
    if (outPoint) outPoint.copy(d.point);
    faceG.add(m); faceMeshes.push(m);
    return m;
  }
  const leftEye = E.pos[0][0] < E.pos[1][0] ? 0 : 1;
  const cheeks = [];
  const mouthLocal = new THREE.Vector3(C.mouth.x, C.mouth.y, dFront * .9);
  let faceK = 1, eyeP = E.pos, BOX = 1, eyeLineY = 0, headMinY = 0;
  const MBOX = .34 * Math.max(1, mScale);
  /** Cheek centre for eye i at eye scale k (k = 1: the traced blush spot). */
  function cheekAt(i, k, P = eyeP) {
    const out = i === leftEye ? -1 : 1, [x, y] = P[i];
    return [x + out * E.w * S * k * .75, y - E.h * S * k * 1.55, out];
  }

  /* ---------- outfit (S2-06) ---------- */
  const outfitG = new THREE.Group(); outfitG.name = 'outfit'; turn.add(outfitG);
  const outfit = { head: null, eyes: null, body: null };
  const worn = { head: null, eyes: null, body: null };      // { group, anchor, tick? }
  const calmItems = prefersReducedMotion();                 // reduced motion: hanging parts stay still
  let fit = null;
  let fitK = 1;                                             // eye scale the current items were built for
  const getFit = () => fit || (fitK = faceK, fit = createFit({
    profile: prof, positions: flatGeo.attributes.position.array, bbox: bb, eye: { ...E, pos: eyeP }, eyeScale: S * faceK,
    mouth: C.mouth, mScale, top: bb.max.y, bottom: bb.min.y,
  }));
  const eyesPivot = new THREE.Vector3();
  function rebuildItems() {
    fit = null;
    for (const s of SLOTS) {
      if (!worn[s]) continue;
      disposeAccessory(worn[s].group); worn[s] = null;
      const it = buildAccessory(outfit[s], getFit()); outfitG.add(it.group); worn[s] = it;
    }
  }
  function eyesPivotOf(f) { return eyesPivot.set((f.eyes[0].x + f.eyes[1].x) / 2, (f.eyes[0].cy + f.eyes[1].cy) / 2, (f.eyes[0].z + f.eyes[1].z) / 2); }

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
        const K = DEF_K / gCur.jiggle, D = DEF_D / Math.sqrt(gCur.jiggle);   // jigglier = softer, same damping ratio
        f.v.x += (-K * f.d.x - D * f.v.x) * dt; f.v.y += (-K * f.d.y - D * f.v.y) * dt; f.v.z += (-K * f.d.z - D * f.v.z) * dt;
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
  /** Outfit items ride the soft-body displacement at their anchor (same falloff as `warp`). */
  function dentAt(a, p) {
    for (let j = 0; j < active.length; j++) {
      const f = active[j], ex2 = a.x - f.a.x, ey = a.y - f.a.y, ez = a.z - f.a.z;
      const q = (ex2 * ex2 + ey * ey + ez * ez) * f.invR2; if (q > 9) continue;
      p.addScaledVector(f.d, Math.exp(-q));
    }
    return p;
  }
  function rideItems() {
    for (const s of SLOTS) {
      const w = worn[s]; if (!w) continue;
      const p = w.group.position; p.set(0, 0, 0);
      if (s === 'eyes') {
        // during a growth transition the lenses follow the eyes between face rebuilds
        const r = eyeKNow() / fitK; w.group.scale.setScalar(r);
        if (r !== 1) p.copy(eyesPivotOf(getFit())).multiplyScalar(1 - r);
      } else if (s === 'body' && belly.x > 1e-3) p.z += bellyA * belly.x * bellyW(w.anchor.x, Math.min(w.anchor.y, fitMouthBottom - .2), 1) * .8;
      dentAt(w.anchor, p);
    }
    for (const m of marks) { m.group.position.copy(m.anchor); dentAt(m.anchor, m.group.position); }
  }
  function applyDeform() {
    active.length = 0;
    for (let j = 0; j < defs.length; j++) if (defs[j].d.lengthSq() > 1e-8) active.push(defs[j]);
    if (Math.abs(puff.x) > 1e-3) for (const c of cheeks) { c.d.copy(c.dir).multiplyScalar(.075 * puff.x); active.push(c); }
    if (Math.abs(belly.x - belly.built) > .004) refreshBase();
    rideItems();
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
    else { sq[v] += (-170 / gCur.jiggle * sq[k] - 8 / Math.sqrt(gCur.jiggle) * sq[v]) * dt; sq[k] += sq[v] * dt; }
    sq[k] = clamp(sq[k], -.25, .5);
  }

  /* ---------- expression state ---------- */
  let exprKey = 'original';
  let target = exprFor('original', C, mScale);
  const cur = JSON.parse(JSON.stringify(target));
  const openM = { w: .06 * mScale, up: .04 * mScale, down: .085 * mScale, curve: .006 * mScale, t: .003 * Math.sqrt(mScale), tongue: .55, q: 2.2, skew: 0 };
  const mFinal = { ...cur.mouth };
  const st = { eye: 1, pupil: 1, lidCurve: 1, lidU: [0, 0], lidL: [0, 0], tilt: [0, 0], arc: [1, 1], blink: 0, lx: 0, ly: 0, glint: 0, off: [[0, 0], [0, 0]] };
  const NQ = 17, prevEye = new Int32Array(NQ).fill(-1e9), prevMouth = new Int32Array(8).fill(-1e9);
  const eyeQ = new Int32Array(NQ), mouthQ = new Int32Array(8);
  const MOUTH_FIELDS = ['w', 'up', 'down', 'curve', 't', 'tongue', 'q', 'skew'];

  let blink = 0, blinkT = -1, nextBlink = 1.6, sacX = 0, sacY = 0, nextSac = 1, clock = 0;
  const look = { x: 0, y: 0, ry: 0, rx: 0 };
  let focus = null; const focusPt = new THREE.Vector3();
  let mouthOverride = -1, talkTarget = 0, talk = 0, mouthOpen = 0;

  /* ---------- actions & poses ---------- */
  let act = null, actT = 0;
  const sit = { x: 0, v: 0 }, carry = { x: 0, v: 0 }, pend = { x: 0, v: 0 };
  let sitting = false, carried = false, prevX = NaN;

  /* ---------- trait marks (S5-02, growth GDD 3.5) ---------- */
  const marks = [];                                        // { kind, group, mesh, anchor, pop: {x, v} }
  const markTex = {}, markMats = [];
  const getMarkTex = (k) => markTex[k] || (markTex[k] = markTexture(k));
  let markId = null, markClock0 = 0, crumbUntil = -1, crumbSec = 10;
  const glossBase = { roughness: bodyMat.roughness, sheenRoughness: bodyMat.sheenRoughness, envMapIntensity: bodyMat.envMapIntensity };
  function markMat(kind, lit, extra = {}) {
    const base = { map: getMarkTex(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, ...extra };
    const m = lit ? new THREE.MeshStandardMaterial({ roughness: .8, envMapIntensity: .4, ...base }) : new THREE.MeshBasicMaterial(base);
    markMats.push(m); return m;
  }
  function addMark(kind, mesh, point) {
    mesh.frustumCulled = false; mesh.renderOrder = MARK_ORDER;
    const group = new THREE.Group(); group.add(mesh); group.position.copy(point); group.scale.setScalar(1e-4); group.visible = false;
    faceG.add(group);
    const m = { kind, group, mesh, anchor: point.clone(), pop: { x: 0, v: 0 } };
    marks.push(m); return m;
  }
  /** A decal mark: projected on the rest body, recentred on its anchor so it can pop (scale) in place. */
  function addDecalMark(kind, x, y, size, mat, rot = 0) {
    const d = decalGeo(x, y, size, rot); if (!d) return null;
    d.geometry.translate(-d.point.x, -d.point.y, -d.point.z);
    return addMark(kind, new THREE.Mesh(d.geometry, mat), d.point);
  }
  function clearMarks() {
    for (const m of marks) { m.group.removeFromParent(); m.mesh.geometry.dispose(); }
    marks.length = 0; for (const m of markMats) m.dispose(); markMats.length = 0;
  }
  function buildMarks() {
    clearMarks();
    const id = markId, k = faceK, ms = mScale; if (!id) return;
    if (id === 'cuddly') {
      for (const i of [0, 1]) { const [x, y] = cheekAt(i, k); addDecalMark('heart', x, y, .12 * ms, markMat('heart', false)); }
    } else if (id === 'cheerful') {
      const [x, y, out] = cheekAt(1 - leftEye, k);
      addDecalMark('sun', x + out * .04 * ms, y + .012, .1 * ms, markMat('sun', false));
    } else if (id === 'playful') {
      const [x, y, out] = cheekAt(leftEye, k);
      addDecalMark('star', x + out * .012, y - .004, .12 * ms, markMat('star', true), -.24 * out);
    } else if (id === 'foodie') {
      const side = Math.sign(E.pos[1 - leftEye][0] - C.mouth.x) || 1;
      const hw = Math.max(C.mouth.w, .07 * mScale);
      addDecalMark('crumbs', C.mouth.x + side * (hw + .03 * ms), C.mouth.y - .022 * ms, .068 * ms, markMat('crumbs', true));
    } else if (id === 'stylish') {
      // twinkle just outside the head outline, upper right (in front of hats: it is a glint, not an item)
      const th = 1.0, r = profR(th) * 1.03;
      const geo = new THREE.PlaneGeometry(.12 * ms, .12 * ms);
      addMark('twinkle', new THREE.Mesh(geo, markMat('twinkle', false, { depthTest: false, polygonOffset: false })), new THREE.Vector3(r * Math.cos(th), r * Math.sin(th), dFront * .35));
    }
  }
  function applyMarkLook() {
    const gl = markId === 'stylish';
    bodyMat.roughness = gl ? .66 : glossBase.roughness; bodyMat.sheenRoughness = gl ? .3 : glossBase.sheenRoughness;
    bodyMat.envMapIntensity = gl ? .6 : glossBase.envMapIntensity;
    belly.target = markId === 'foodie' ? 1 : 0;
  }
  function stepMarks(dt) {
    const tt = clock - markClock0, dressed = !!(outfit.head || outfit.eyes || outfit.body);
    for (const m of marks) {
      let target = 1, sc = 1;
      if (m.kind === 'sun') target = calmItems ? 1 : (tt % 6.5) < 2.2 ? 1 : 0;          // pops up for 2.2 s of every 6.5 s
      else if (m.kind === 'crumbs') target = clock < crumbUntil ? 1 : 0;
      else if (m.kind === 'twinkle') {
        target = dressed ? 1 : 0;
        if (!calmItems) { const ph = (tt % 3.4) / 3.4; sc = .45 + .55 * Math.sin(Math.PI * smooth(0, .4, ph)) ** 2; m.mesh.rotation.z = tt * .5; }
      }
      spring(m.pop, target, dt, 150, .58);                                               // small overshoot, no hard bounce
      const v = Math.max(0, m.pop.x) * sc;
      m.group.scale.setScalar(Math.max(1e-4, v)); m.group.visible = v > .01;
    }
    belly.x = lerp(belly.x, belly.target, 1 - Math.exp(-dt * 2.2));
    if (Math.abs(belly.x - belly.target) < .003) belly.x = belly.target;
  }

  /* ---------- face (re)layout for an eye scale ---------- */
  const eyeKNow = () => gCur.eyeScale;
  function rebuildFace(k) {
    faceK = k; eyeP = eyeLayout(k);
    buildSockets(k, eyeP); bellyDisp = null; refreshBase();
    for (const m of faceMeshes) { m.removeFromParent(); m.geometry.dispose(); }
    faceMeshes.length = 0;
    BOX = Math.max(E.w, E.h) * S * k * 3.4 * BOX_MARGIN;
    eyeP.forEach(([x, y], i) => decal(x, y, BOX, eyeMats[i]));
    cheeks.length = 0;
    eyeP.forEach((_, i) => {
      const [cx, cy, out] = cheekAt(i, k), p = new THREE.Vector3(cx, cy, dFront * .8);
      decal(p.x, p.y, .24 * mScale, blushMat, p);
      cheeks.push({ a: p, d: new THREE.Vector3(), dir: new THREE.Vector3(out * .45, -.12, .88).normalize(), invR2: 1 / (.21 * .21) });
    });
    decal(C.mouth.x, C.mouth.y, MBOX, mouthMat, mouthLocal);
    eyeLineY = Math.max(eyeP[0][1], eyeP[1][1]);
    headMinY = Math.min(eyeLineY - E.h * S * k * 1.6, geo.top * .3);
    prevEye.fill(-1e9); prevMouth.fill(-1e9);
    buildMarks(); rebuildItems();
  }

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

    // growth: eased toward the target; the face re-lays out once, half way through an eye-scale change
    if (gT < 1) {
      gT = gDur > 0 ? Math.min(1, gT + dt / gDur) : 1;
      const e = easeInOut(gT); for (const k of GROWTH_KEYS) gCur[k] = lerp(gFrom[k], gTo[k], e);
    }
    { const span = Math.abs(gTo.eyeScale - faceK); if (span > 1e-4 && Math.abs(gCur.eyeScale - faceK) >= span * .5 - 1e-6) rebuildFace(gTo.eyeScale); }
    grow.scale.set(gCur.scale * gCur.roundness, gCur.scale, gCur.scale * Math.sqrt(gCur.roundness));
    const J = gCur.jiggle;

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
    if (frame.y > 0) frame.y *= gCur.hopScale;
    frame.sy = 1 + (frame.sy - 1) * J;

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
    const kNow = eyeKNow();
    st.eye = cur.eye * kNow; st.pupil = cur.pupil; st.glint = markId === 'cuddly' ? 1 : 0;
    if (kNow !== faceK) { const L = eyeLayout(kNow); for (let i = 0; i < 2; i++) { st.off[i][0] = L[i][0] - eyeP[i][0]; st.off[i][1] = L[i][1] - eyeP[i][1]; } }
    else { st.off[0][0] = st.off[0][1] = st.off[1][0] = st.off[1][1] = 0; } st.lidCurve = cur.lidCurve; st.blink = blink; st.lx = look.x; st.ly = look.y;
    for (let i = 0; i < 2; i++) {
      const lu = cur.lidU[i], ll = cur.lidL[i];
      st.lidU[i] = lu + frame.lid * Math.max(0, 1 - lu - ll); st.lidL[i] = ll; st.tilt[i] = cur.tilt[i]; st.arc[i] = cur.arc[i];
    }
    eyeQ[0] = Math.round(st.eye * 1000); eyeQ[1] = Math.round(st.pupil * 1000); eyeQ[2] = Math.round(st.lidCurve * 1000);
    eyeQ[3] = Math.round(st.lidU[0] * 1000); eyeQ[4] = Math.round(st.lidU[1] * 1000); eyeQ[5] = Math.round(st.lidL[0] * 1000); eyeQ[6] = Math.round(st.lidL[1] * 1000);
    eyeQ[7] = Math.round(st.tilt[0] * 1000); eyeQ[8] = Math.round(st.tilt[1] * 1000); eyeQ[9] = Math.round(blink * 1000);
    eyeQ[10] = Math.round(look.x * 1000); eyeQ[11] = Math.round(look.y * 1000); eyeQ[12] = st.arc[0]; eyeQ[13] = st.arc[1];
    eyeQ[14] = Math.round(st.glint * 1000); eyeQ[15] = Math.round(kNow * 1000); eyeQ[16] = Math.round(faceK * 1000);
    let eyeChanged = false;
    for (let j = 0; j < NQ; j++) if (eyeQ[j] !== prevEye[j]) { eyeChanged = true; prevEye[j] = eyeQ[j]; }
    if (eyeChanged) {
      for (let i = 0; i < 2; i++) { drawEye(eyeTex[i].g, ETEX, BOX, E, S, i, st); eyeTex[i].t.needsUpdate = true; }
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
    blushMat.opacity = Math.max(cur.blush, markId === 'cheerful' ? .55 : 0) * .9;

    // cheek puff (spring with a small overshoot)
    spring(puff, Math.max(cur.puff, frame.puff), dt, 140, .62);

    // poses
    spring(sit, sitting ? 1 : 0, dt, 90, .72);
    spring(carry, carried ? 1 : 0, dt, 90, .72);
    const s = clamp(sit.x, -.2, 1.2), c = clamp(carry.x, -.2, 1.2);

    // body transform
    let y = frame.y, sy = cur.sy * frame.sy, rx = cur.rx + frame.rx, ry = frame.ry, rz = cur.rz + frame.rz;
    if (idle) { sy *= 1 + .013 * J * Math.sin(clock * 2.3); rz += .015 * Math.sin(clock * .9); ry += .03 * Math.sin(clock * .55); }
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

    // swinging outfit parts (bell, pom-pom, S4-04): gentle pendulums driven by the body's motion
    if (!calmItems && (worn.head?.tick || worn.eyes?.tick || worn.body?.tick)) {
      turn.updateWorldMatrix(true, false);
      for (const sl of SLOTS) worn[sl]?.tick?.(dt, turn.matrixWorld);
    }

    if (marks.length || belly.x !== belly.target) stepMarks(dt);

    applyDeform();
  }

  /* ---------- API ---------- */
  const api = {
    key,
    object3d,
    /** Colours the stage may copy into its hemisphere light (prototype tinted it per character). */
    lightTint,
    /** Approximate standing height in object3d units (feet to head top), at the current growth scale. */
    get height() { return topH * gCur.scale; },

    /** Advance animation; call every frame. */
    update,

    /** Set the facial expression (see EXPRESSION_KEYS). Unknown names are ignored. */
    setExpression(name) {
      if (name !== 'original' && !GENERIC[name]) return;
      exprKey = name; target = exprFor(name, C, mScale);
      if (name === 'eat' && markId === 'foodie') crumbUntil = Math.max(crumbUntil, clock + 1.5 + crumbSec);
    },
    /** Current expression name. */
    getExpression() { return exprKey; },

    /** Play a body action clip (see ACTION_KEYS); replaces a playing one. Returns its duration (s), 0 if unknown. */
    play(action) {
      const a = ACTIONS[action]; if (!a) return 0;
      act = a; actT = 0;
      if (markId === 'playful' && (action === 'hop' || action === 'jelly' || action === 'shake')) for (const m of marks) m.pop.v += 4.5;
      if (markId === 'foodie' && (action === 'chew' || action === 'gulp')) crumbUntil = Math.max(crumbUntil, clock + a.dur + crumbSec);
      return a.dur;
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
      const f = newDef(anchorFromWorld(worldPoint), .3), j = gCur.jiggle;
      f.d.set(0, 0, -.16 * strength * j); f.v.set(0, 0, -1 * strength * j);
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

    /**
     * Dress the character. One item per slot; `null` empties a slot, a missing key keeps it.
     * Unknown ids and ids in the wrong slot are ignored. Only changed slots are rebuilt.
     * @param {{ head?: string|null, eyes?: string|null, body?: string|null }} o
     */
    setOutfit(o = {}) {
      for (const s of SLOTS) {
        if (!(s in o)) continue;
        const id = o[s] ?? null;
        if (id !== null && SLOT_OF[id] !== s) continue;
        if (id === outfit[s]) continue;
        if (worn[s]) { disposeAccessory(worn[s].group); worn[s] = null; }
        outfit[s] = id;
        if (id) { const it = buildAccessory(id, getFit()); outfitG.add(it.group); worn[s] = it; }
      }
      rideItems();
    },
    /** Current outfit `{ head, eyes, body }` (ids or null). */
    getOutfit() { return { ...outfit }; },

    /**
     * Life-stage proportions (growth GDD 3.2), multipliers on the grown look; a missing key keeps
     * its target. Values are clamped to GROWTH_RANGE. `scale` scales the whole character (outfits,
     * shadow, hit test and world points included) about the feet; `eyeScale` enlarges the eyes
     * (re-laid out so they never touch each other or the mouth); `roundness` widens x (and z by
     * its square root); `jiggle` softens the dent / squish springs and enlarges the wobble;
     * `hopScale` multiplies action lift. Eased with a smooth ease-in-out over `transitionSec`
     * (default 0 = instant, e.g. on load; growth.json `transitionSec` 2.5 for the stage-up moment).
     * The face rebuild at the half-way point costs one heavier frame (decals + outfit refit).
     * @param {{ scale?: number, eyeScale?: number, roundness?: number, jiggle?: number, hopScale?: number }} g
     * @param {{ transitionSec?: number }} [o]
     */
    setGrowth(g = {}, o = {}) {
      for (const k of GROWTH_KEYS) { gFrom[k] = gCur[k]; if (g && k in g) gTo[k] = clampGrowth(k, +g[k]); }
      const sec = Math.max(0, +o.transitionSec || 0);
      if (sec > 0) { gT = 0; gDur = sec; return; }
      Object.assign(gCur, gTo); gT = 1;
      if (Math.abs(gTo.eyeScale - faceK) > 1e-4) rebuildFace(gTo.eyeScale);
      grow.scale.set(gCur.scale * gCur.roundness, gCur.scale, gCur.scale * Math.sqrt(gCur.roundness));
    },
    /** Target growth values plus `transitioning` (true while easing) and `current` (this frame's values). */
    getGrowth() { return { ...gTo, transitioning: gT < 1, current: { ...gCur } }; },

    /**
     * Show the raised-personality mark (growth GDD 3.5): 'cheerful'|'cuddly'|'playful'|'foodie'|'stylish',
     * null (or anything unknown) clears it. Marks are not outfit items and never cover eyes or mouth.
     * @param {string|null} id
     * @param {{ crumbSec?: number }} [o] foodie crumbs linger this long after eating (growth.json `traits.foodie.crumbSec`, default 10)
     */
    setTraitMark(id, o = {}) {
      if (Number.isFinite(o.crumbSec)) crumbSec = Math.max(0, o.crumbSec);
      const v = TRAIT_MARK_IDS.includes(id) ? id : null;
      if (v === markId) return;
      markId = v; markClock0 = clock; crumbUntil = -1;
      buildMarks(); applyMarkLook();
    },
    /** Current trait mark id or null. */
    getTraitMark() { return markId; },
    /** Foodie crumbs now, for `sec` seconds (the game may call this after any eat; chew / gulp / 'eat' do it already). */
    showCrumbs(sec = crumbSec) { if (markId === 'foodie') crumbUntil = clock + Math.max(0, sec); },

    /** Free all GPU resources and detach from the scene. */
    dispose() {
      object3d.removeFromParent();
      for (const s of SLOTS) { if (worn[s]) disposeAccessory(worn[s].group); worn[s] = null; outfit[s] = null; }
      for (const m of faceMeshes) m.geometry.dispose();
      faceMeshes.length = 0; defs.length = 0; active.length = 0;
      clearMarks(); for (const k in markTex) markTex[k].dispose();
      flatGeo.dispose(); insetGeo.dispose(); restGeo.dispose(); probeGeo.dispose(); shadowGeo.dispose();
      for (const x of eyeTex) x.t.dispose();
      mouthTex.t.dispose(); blushTex.dispose(); shadowTex.dispose();
      for (const m of [bodyMat, ...eyeMats, mouthMat, blushMat, shadowMat]) m.dispose();
    },
  };

  // first frame state
  if (opts.trait) markId = TRAIT_MARK_IDS.includes(opts.trait) ? opts.trait : null;
  rebuildFace(gCur.eyeScale); applyMarkLook();
  if (markId === 'foodie') belly.x = 1;
  update(0, 0);
  return api;
}

export { ACTIONS };
