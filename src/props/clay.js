/**
 * clay.js — shared matte-clay helpers for every room, prop and food (owner: prop).
 *
 * Everything static in a room is built through a {@link ClayBuilder}: each part is
 * tinted with vertex colours and merged, so a whole room costs about three draw
 * calls (clay, glow, soft shadows) plus its few animated parts.
 *
 * Look rules (design/art/asset-style-sheet.md): matte, rounded, no textures,
 * no hard shadows, pastel tints lightened from the brand gradient.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Brand gradient stops (design/art/moldable-design.md §3.1). */
export const BRAND = Object.freeze({ teal: '#7FA9B1', periwinkle: '#9BB0DE', lavender: '#CBA5D1', pink: '#EB92B3' });

/** Approved room tints and shared prop colours. Hex strings (sRGB). */
export const PALETTE = Object.freeze({
  living: { wall: '#F2F1FB', floor: '#E6E4F6', trim: '#E9E7F7', shadow: '#5A5290' },
  kitchen: { wall: '#FBF0F4', floor: '#F4E1E9', trim: '#F7E6EE', shadow: '#7A4A6E' },
  bathroom: { wall: '#EDF4F6', floor: '#DCEAEE', trim: '#E4EFF2', shadow: '#3C5A6E' },
  white: '#FFFFFF', cream: '#FDF8F4', glass: '#E7EFF8', steel: '#C9D7E8', ink: '#5B6683',
});

/**
 * Evening (dark theme) shell tints: deeper muted lavender / indigo, never black.
 * Props without an explicit night colour go through {@link toEvening}.
 */
export const NIGHT = Object.freeze({
  living: { wall: '#5B5890', floor: '#4A477A', trim: '#615E97', shadow: '#120E2C' },
  kitchen: { wall: '#665689', floor: '#544674', trim: '#6B5B8F', shadow: '#170E2A' },
  bathroom: { wall: '#525F92', floor: '#434F80', trim: '#5A6799', shadow: '#0E1430' },
  /** Window sky: dusk glow at the bottom, soft indigo at the top. */
  skyLow: '#A07EB2', skyHigh: '#383C7C', cloud: '#7A72AE',
  /** Warm lamp light (emissive on shades, halo on the wall). */
  lamp: '#FFD9B8', star: '#FFF4DA', moon: '#FFF1D2',
});

/** Theme switching values for the shared materials (not gameplay numbers). */
const THEME_MAT = {
  light: { clayEnv: 0.35, lampEmissive: 0, shadowBoost: 1 },
  dark: { clayEnv: 0.22, lampEmissive: 0.62, shadowBoost: 1.25 },
};

const _hsl = { h: 0, s: 0, l: 0 };
const EVENING_HUE = 0.7;   // ≈ 252°, muted indigo

/**
 * Map a light-theme clay colour to its evening tint: hue drifts toward indigo,
 * saturation is muted, lightness drops but keeps the light-theme ordering so
 * props stay readable against the walls. Works in sRGB HSL.
 * @param {THREE.Color} c  input (linear working space, as from `Color.set`)
 * @param {THREE.Color} [out]  receives the result (may be `c`)
 * @returns {THREE.Color}
 */
export function toEvening(c, out = new THREE.Color()) {
  c.getHSL(_hsl, THREE.SRGBColorSpace);
  let dh = EVENING_HUE - _hsl.h;
  if (dh > 0.5) dh -= 1; else if (dh < -0.5) dh += 1;
  // Work with chroma, not HSL saturation: near-white pastels have high S but tiny chroma,
  // and keeping S while lowering L would turn them vivid.
  const chroma = _hsl.s * (1 - Math.abs(2 * _hsl.l - 1));
  const amt = 0.45 - Math.min(1, chroma * 3) * 0.2;
  const h = (_hsl.h + dh * amt + 1) % 1;
  const l = THREE.MathUtils.clamp(0.6 - (1 - _hsl.l) * 1.05, 0.18, 0.64);
  const c2 = Math.min(0.2, chroma * 0.9 + 0.07);
  const s = Math.min(1, c2 / Math.max(1e-3, 1 - Math.abs(2 * l - 1)));
  return out.setHSL(h, s, l, THREE.SRGBColorSpace);
}

/**
 * Mix a colour toward white.
 * @param {string|number} hex  sRGB colour
 * @param {number} t           0 = unchanged, 1 = white
 * @returns {string} sRGB hex string
 */
export function lighten(hex, t) {
  const c = new THREE.Color(hex);
  return '#' + c.lerp(new THREE.Color('#FFFFFF'), t).getHexString();
}

/**
 * Matte clay material. Standard (not physical) for phone budgets.
 * @param {{color?: string|number, roughness?: number, vertexColors?: boolean, envMapIntensity?: number, transparent?: boolean, opacity?: number}} [o]
 * @returns {THREE.MeshStandardMaterial}
 */
export function createClayMaterial(o = {}) {
  return new THREE.MeshStandardMaterial({
    color: o.color ?? 0xffffff,
    roughness: o.roughness ?? 0.9,
    metalness: 0,
    vertexColors: o.vertexColors ?? true,
    envMapIntensity: o.envMapIntensity ?? 0.35,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
  });
}

let sharedClay = null;
let sharedGlow = null;
let shadowTex = null;

/** The one shared vertex-coloured clay material. Never dispose it from a room. */
export function getSharedClayMaterial() {
  if (!sharedClay) { sharedClay = createClayMaterial(); sharedClay.name = 'clay-shared'; }
  return sharedClay;
}

/** Shared unlit vertex-coloured material for soft light sources (sky in windows, lamp glow). */
export function getSharedGlowMaterial() {
  if (!sharedGlow) { sharedGlow = new THREE.MeshBasicMaterial({ vertexColors: true }); sharedGlow.name = 'glow-shared'; }
  return sharedGlow;
}

let sharedHalo = null;
/** Shared additive soft-dot material (night halos and stars). Never dispose it from a room. */
export function getSharedHaloMaterial() {
  if (!sharedHalo) {
    sharedHalo = new THREE.MeshBasicMaterial({
      map: getShadowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    sharedHalo.name = 'halo-shared';
  }
  return sharedHalo;
}

/** Shared soft radial texture for blob shadows (generated, not an image file). */
export function getShadowTexture() {
  if (shadowTex) return shadowTex;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + 0.5) / size * 2 - 1, dy = (y + 0.5) / size * 2 - 1;
    const d = Math.min(1, Math.hypot(dx, dy));
    const a = Math.pow(1 - d, 1.6) * (1 - d * d);       // soft falloff, zero at the rim
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(a * 255);
  }
  shadowTex = new THREE.DataTexture(data, size, size);
  shadowTex.magFilter = THREE.LinearFilter; shadowTex.minFilter = THREE.LinearFilter;
  shadowTex.needsUpdate = true;
  return shadowTex;
}

/* ------------------------------------------------------------------ geometry */

/** Rounded box. `r` is the corner radius (clamped to half the smallest side). */
export function roundedBox(w, h, d, r = Math.min(w, h, d) * 0.3, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
}

/** Capsule standing on Y. `length` is the straight middle part. */
export function capsule(radius, length, capSeg = 5, radial = 14) {
  return new THREE.CapsuleGeometry(radius, length, capSeg, radial);
}

/** Sphere. */
export function sphere(radius, ws = 20, hs = 14) {
  return new THREE.SphereGeometry(radius, ws, hs);
}

/** Torus lying in the XY plane (rotate x by PI/2 for a ring on the floor). `arc` < 2π gives a handle. */
export function torus(R, r, radial = 10, tubular = 28, arc = Math.PI * 2) {
  return new THREE.TorusGeometry(R, r, radial, tubular, arc);
}

/** Lathe from [x, y] pairs around Y. */
export function lathe(points, segments = 24) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y)), segments);
}

/**
 * Soft disc / cushion: a flat cylinder with fully rounded edge, standing on y = 0.
 * @param {number} radius  outer radius
 * @param {number} height  thickness
 */
export function puck(radius, height, segments = 28) {
  const r = Math.min(height / 2, radius * 0.5);
  const pts = [[0, 0]];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI; pts.push([radius - r + Math.cos(a) * r, r + Math.sin(a) * r]); }
  pts.push([0, height]);
  return lathe(pts, segments);
}

/**
 * Smooth deformed sphere ("blob"). `fn(dir, out)` receives the unit direction and
 * writes the displaced point into `out` (default: wobbly blob from `seed`).
 * @param {number} radius
 * @param {{detail?: number, seed?: number, wobble?: number, fn?: (dir: THREE.Vector3, out: THREE.Vector3) => void}} [o]
 */
export function blob(radius, o = {}) {
  let g = new THREE.IcosahedronGeometry(1, o.detail ?? 4);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const seed = o.seed ?? 1, wob = o.wobble ?? 0.12;
  const fn = o.fn ?? ((d, out) => {
    const n = Math.sin(d.x * 2.1 + seed) * Math.cos(d.y * 1.7 + seed * 1.3) + 0.5 * Math.sin(d.z * 2.7 + seed * 2.1);
    out.copy(d).multiplyScalar(1 + wob * n);
  });
  const p = g.attributes.position, d = new THREE.Vector3(), out = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    fn(d, out); out.multiplyScalar(radius);
    p.setXYZ(i, out.x, out.y, out.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Flat circle facing +Z (used for sky discs and decals). */
export function circle(radius, segments = 40) {
  return new THREE.CircleGeometry(radius, segments);
}

/* ------------------------------------------------------------------ building */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _n = new THREE.Color();
const _n2 = new THREE.Color();

/**
 * Prepare a geometry for merging: transform, drop to non-indexed position/normal,
 * add a vertex colour that darkens gently toward the bottom (clay "contact" shade).
 * @param {THREE.BufferGeometry} geo  consumed (do not reuse)
 * @param {string|number|((x:number,y:number,z:number,c:THREE.Color)=>void)} color  colour or per-vertex painter (local space)
 * @param {{position?: number[], rotation?: number[], scale?: number|number[], shade?: number,
 *   night?: string|number|'same'|((x:number,y:number,z:number,c:THREE.Color)=>void)}} [t]
 *   `night` adds a `colorNight` attribute for the dark theme: a colour, a painter,
 *   'same' (keep the light colour) or omitted with `t.themed` → {@link toEvening}.
 * @returns {THREE.BufferGeometry}
 */
export function bake(geo, color, t = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  const hy = Math.max(1e-6, max.y - min.y);
  const shade = t.shade ?? 0.07;
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const night = t.night ?? (t.themed ? 'auto' : null);
  const ncol = night ? new Float32Array(pos.count * 3) : null;
  const npaint = typeof night === 'function';
  if (typeof color !== 'function') _c.set(color);
  if (night && !npaint && night !== 'auto' && night !== 'same') _n.set(night);
  else if (night === 'auto' && typeof color !== 'function') toEvening(_c, _n);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (typeof color === 'function') color(x, y, z, _c2); else _c2.copy(_c);
    const f = 1 - shade * (1 - (y - min.y) / hy);
    col[i * 3] = _c2.r * f; col[i * 3 + 1] = _c2.g * f; col[i * 3 + 2] = _c2.b * f;
    if (ncol) {
      if (npaint) night(x, y, z, _n2);
      else if (night === 'same') _n2.copy(_c2);
      else if (night === 'auto' && typeof color === 'function') toEvening(_c2, _n2);
      else _n2.copy(_n);
      ncol[i * 3] = _n2.r * f; ncol[i * 3 + 1] = _n2.g * f; ncol[i * 3 + 2] = _n2.b * f;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (ncol) g.setAttribute('colorNight', new THREE.BufferAttribute(ncol, 3));
  const s = t.scale ?? 1;
  const sv = Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s);
  _e.set(...(t.rotation ?? [0, 0, 0]));
  _m.compose(new THREE.Vector3(...(t.position ?? [0, 0, 0])), _q.setFromEuler(_e), sv);
  g.applyMatrix4(_m);
  return g;
}

/**
 * Vertical gradient painter for {@link bake}: colour `a` at y0, `b` at y1 (local space).
 * @returns {(x:number,y:number,z:number,c:THREE.Color)=>void}
 */
export function gradientY(a, b, y0, y1) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return (x, y, z, c) => c.copy(ca).lerp(cb, THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1));
}

/** Brand-gradient painter along X (for blob decor), `x0..x1` local span. */
export function brandGradientX(x0, x1, lift = 0.25) {
  const stops = [BRAND.teal, BRAND.periwinkle, BRAND.lavender, BRAND.pink].map((h) => new THREE.Color(lighten(h, lift)));
  const at = [0, 0.35, 0.7, 1];
  return (x, y, z, c) => {
    const t = THREE.MathUtils.clamp((x - x0) / (x1 - x0) * 0.85 + (y - x0) / (x1 - x0) * 0.15, 0, 1);
    let i = 0; while (i < 2 && t > at[i + 1]) i++;
    c.copy(stops[i]).lerp(stops[i + 1], (t - at[i]) / (at[i + 1] - at[i]));
  };
}

/**
 * Collects static parts and merges them into a few meshes.
 * - `add()` → lit matte clay (one draw call for all)
 * - `addGlow()` → unlit soft colour, for sky and lamp light (one draw call)
 * - `addLamp()` → lit clay lamp shades that glow gently in the dark theme (one draw call)
 * - `addHalo()` → soft additive dots (lamp halos, stars) shown only in the dark theme (one draw call)
 * - `addShadow()` → soft blob shadow on the floor (one transparent draw call)
 *
 * With `themed: true` every part also carries a dark-theme colour, and the built
 * meshes switch with {@link applyTheme} (a colour copy, no rebuild).
 */
export class ClayBuilder {
  /** @param {{shadowColor?: string, shadowOpacity?: number, themed?: boolean, nightShadowColor?: string}} [o] */
  constructor(o = {}) {
    this.clay = []; this.glow = []; this.lamps = []; this.halos = []; this.shadows = [];
    this.shadowColor = o.shadowColor ?? '#5A5290';
    this.shadowOpacity = o.shadowOpacity ?? 0.2;
    this.themed = o.themed ?? false;
    this.nightShadowColor = o.nightShadowColor ?? '#120E2C';
  }

  /** Add a lit clay part. See {@link bake} for arguments. @returns {this} */
  add(geo, color, t = {}) { this.clay.push(bake(geo, color, { themed: this.themed, ...t })); return this; }

  /** Add an unlit glow part (no contact shade). Night colour defaults to the same colour. @returns {this} */
  addGlow(geo, color, t = {}) {
    this.glow.push(bake(geo, color, { shade: 0, ...(this.themed ? { night: 'same' } : {}), ...t })); return this;
  }

  /**
   * Add a lamp shade: lit clay that gets a warm emissive glow in the dark theme.
   * Night colour defaults to the light colour (the glow does the work).
   * @returns {this}
   */
  addLamp(geo, color, t = {}) {
    this.lamps.push(bake(geo, color, { ...(this.themed ? { night: 'same' } : {}), ...t })); return this;
  }

  /**
   * Add a soft additive dot facing +Z (a lamp halo on the wall, a star, the moon).
   * Visible only in the dark theme.
   * @param {number} x @param {number} y @param {number} z  centre
   * @param {number} size  full width
   * @param {string} color
   * @param {number} [strength=1]  0..1
   * @returns {this}
   */
  addHalo(x, y, z, size, color, strength = 1) {
    const g = new THREE.PlaneGeometry(size, size).toNonIndexed();
    g.translate(x, y, z);
    const n = g.attributes.position.count, a = new Float32Array(n * 4);
    _c.set(color);
    for (let i = 0; i < n; i++) { a[i * 4] = _c.r; a[i * 4 + 1] = _c.g; a[i * 4 + 2] = _c.b; a[i * 4 + 3] = strength; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 4));
    g.deleteAttribute('normal');
    this.halos.push(g);
    return this;
  }

  /**
   * Add a soft elliptical floor shadow.
   * @param {number} x @param {number} z centre on the floor
   * @param {number} w @param {number} d full width / depth
   * @param {number} [y=0.006] height (lift it when the shadow sits on a rug)
   * @param {number} [strength=1] 0..1, scales this shadow's darkness
   */
  addShadow(x, z, w, d, y = 0.006, strength = 1) {
    const g = new THREE.PlaneGeometry(w, d).toNonIndexed();
    g.rotateX(-Math.PI / 2); g.translate(x, y + this.shadows.length * 0.0004, z);
    const n = g.attributes.position.count, a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = 1; a[i * 4 + 3] = strength; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 4));
    g.deleteAttribute('normal');
    this.shadows.push(g);
    return this;
  }

  /**
   * Merge everything into a group of at most three meshes.
   * @param {string} [name]
   * @returns {THREE.Group}
   */
  build(name = 'clay-static') {
    const group = new THREE.Group(); group.name = name;
    if (this.clay.length) {
      const m = new THREE.Mesh(mergeAndFree(this.clay), getSharedClayMaterial()); m.name = name + ':clay'; group.add(m);
    }
    if (this.glow.length) {
      const m = new THREE.Mesh(mergeAndFree(this.glow), getSharedGlowMaterial()); m.name = name + ':glow'; group.add(m);
    }
    if (this.lamps.length) {
      const mat = createClayMaterial();
      mat.name = name + ':lamp';
      mat.emissive.set(NIGHT.lamp);
      mat.emissiveIntensity = 0;
      mat.userData.theme = { light: { emissiveIntensity: THEME_MAT.light.lampEmissive }, dark: { emissiveIntensity: THEME_MAT.dark.lampEmissive } };
      const m = new THREE.Mesh(mergeAndFree(this.lamps), mat); m.name = name + ':lamp'; group.add(m);
    }
    if (this.halos.length) {
      const m = new THREE.Mesh(mergeAndFree(this.halos), getSharedHaloMaterial());
      m.name = name + ':halo'; m.renderOrder = 2; m.visible = false; m.userData.themeOnly = 'dark';
      group.add(m);
    }
    if (this.shadows.length) {
      const mat = new THREE.MeshBasicMaterial({
        map: getShadowTexture(), color: this.shadowColor, transparent: true, opacity: this.shadowOpacity,
        vertexColors: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      mat.userData.theme = {
        light: { color: this.shadowColor, opacity: this.shadowOpacity },
        dark: { color: this.nightShadowColor, opacity: Math.min(0.6, this.shadowOpacity * THEME_MAT.dark.shadowBoost) },
      };
      const m = new THREE.Mesh(mergeAndFree(this.shadows), mat); m.name = name + ':shadow'; m.renderOrder = 1; group.add(m);
    }
    this.clay = []; this.glow = []; this.lamps = []; this.halos = []; this.shadows = [];
    return group;
  }

  /**
   * Merge only the clay parts into one mesh (for an animated prop made of many parts).
   * @param {string} [name] @param {THREE.Material} [material]
   * @returns {THREE.Mesh}
   */
  buildMesh(name = 'clay-part', material = getSharedClayMaterial()) {
    const m = new THREE.Mesh(mergeAndFree(this.clay), material); m.name = name; this.clay = []; return m;
  }
}

function mergeAndFree(list) {
  const g = mergeGeometries(list, false);
  for (const x of list) x.dispose();
  g.computeBoundingSphere();
  const night = g.attributes.colorNight;
  if (night) {
    // Keep both palettes on the CPU; the live `color` buffer is overwritten on a theme switch.
    g.userData.themeColors = { light: g.attributes.color.array.slice(), dark: night.array };
    g.userData.theme = 'light';
    g.deleteAttribute('colorNight');
  }
  return g;
}

/**
 * Switch everything under `root` to a theme without rebuilding: copies the stored
 * vertex colours into each themed geometry, updates themed materials
 * (`material.userData.theme`) and shows/hides `userData.themeOnly` objects.
 * Also sets the shared clay material's environment strength (affects every
 * shared-clay prop in the scene, which is intended: foods match the room).
 * @param {THREE.Object3D} root
 * @param {'light'|'dark'} theme
 */
export function applyTheme(root, theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  getSharedClayMaterial().envMapIntensity = THEME_MAT[t].clayEnv;
  root.traverse((o) => {
    if (o.userData.themeOnly) o.visible = o.userData.themeOnly === t;
    const g = o.geometry;
    if (g && g.userData.themeColors && g.userData.theme !== t) {
      const attr = g.attributes.color;
      attr.array.set(g.userData.themeColors[t]);
      attr.needsUpdate = true;
      g.userData.theme = t;
    }
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      const v = m.userData.theme && m.userData.theme[t];
      if (!v) continue;
      for (const k of Object.keys(v)) {
        if (m[k] && m[k].isColor) m[k].set(v[k]); else m[k] = v[k];
      }
    }
  });
}

/**
 * Count draw calls an object will issue (visible meshes; multi-material counts per group).
 * @param {THREE.Object3D} root
 * @returns {number}
 */
export function countDrawCalls(root) {
  let n = 0;
  root.traverseVisible((o) => { if (o.isMesh || o.isLine || o.isPoints) n += Array.isArray(o.material) ? Math.max(1, o.geometry.groups.length) : 1; });
  return n;
}

/**
 * Dispose geometries (and non-shared materials) under `root`. Shared clay/glow
 * materials and the shadow texture are kept.
 * @param {THREE.Object3D} root
 */
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) if (m !== sharedClay && m !== sharedGlow && m !== sharedHalo) m.dispose();
  });
}
