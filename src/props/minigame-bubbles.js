/**
 * minigame-bubbles.js — soap bubbles, pop bursts, bubble wand and pop star for
 * "เป่าฟองสบู่" (`bubbles`, design/gdd/minigames-2.md 3.3, 3.5) (owner: prop).
 * Re-exported by ./minigame.js.
 *
 * Sizes and origins (world units; 1 = prototype body radius):
 * | Prop | Size | Origin | Faces | Draw calls |
 * |---|---|---|---|---|
 * | bubble (`createBubbleMesh`) | {@link BUBBLE_SIZE} diameter | centre | +Z (camera) | 2 (symbol + shell) |
 * | pop burst (`createPopBurst`) | grows to ~1.6 × bubble | centre | +Z | 2 (ring + drops), 1 with reducedMotion |
 * | wand (`createBubbleWand`) | {@link WAND_SIZE} tall | bottom of the handle (grip) | +Z, ring at +Y | 3 |
 * | pop star (`createPopStar`) | {@link POP_STAR_SIZE} across | centre | +Z | 2 (star + halo) |
 *
 * Colour-blind safe: every colour carries its own symbol inside the bubble
 * (pink = heart, lilac = star, sky = three dots, butter = stripes; coin bubble = a
 * coin in a rainbow shell). The symbol is the primary cue, the tint is secondary,
 * and the tints also differ in lightness. Pass `{ pattern }` to follow
 * `minigames.json → bubbles.colors[].pattern` when the data changes.
 *
 * Cost: geometry is cached and shared (one shell sphere for every bubble, one
 * symbol geometry per colour); each colour has one cached shell material. Nothing
 * allocates per frame. For many bubbles, {@link getBubbleParts} hands out the raw
 * geometry + material pairs for an InstancedMesh per colour (the shell shader
 * supports instancing).
 *
 * @example
 *   import { createBubbleMesh, popBubble } from './props/minigame.js';
 *   const b = createBubbleMesh('pink'); scene.add(b);     // b.userData = { minigameItem: 'bubble', colorId, pattern, radius }
 *   // on tap:
 *   const burst = popBubble(b);                          // hides b, adds a burst to b.parent
 *   // every frame until it returns true (it then removes and frees itself):
 *   burst.update(dt);
 */
import * as THREE from 'three';
import { ClayBuilder, capsule, sphere, torus, puffyStar, circle, getSharedClayMaterial, getShadowTexture } from './clay.js';
import { heartShape } from './furniture/kitchen-bath-shared.js';
import { getCoinGeometry, COIN_SIZE } from './minigame-snack.js';

/** Bubble diameter, world units (matches `bubbles.bubbleSize` default; scale the group for other sizes). */
export const BUBBLE_SIZE = 0.5;
/** Bubble wand height (grip to top of the ring), world units. */
export const WAND_SIZE = 0.7;
/** Pop star width, world units (its hit radius is `bubbles.popStar.radius`, a gameplay number). */
export const POP_STAR_SIZE = 0.5;

/**
 * Bubble colours: shell tint, symbol tint and default pattern. Ids match
 * `minigames.json → bubbles.colors[].id`. Soft pastels from the brand family;
 * never bright red or green. `coin` is the rainbow coin bubble.
 */
export const BUBBLE_COLORS = Object.freeze({
  pink:   { shell: '#F6B8CF', symbol: '#E07FA8', pattern: 'heart',  label: 'ชมพู' },
  lilac:  { shell: '#D6BEEA', symbol: '#A985CC', pattern: 'star',   label: 'ม่วง' },
  sky:    { shell: '#B2D3EF', symbol: '#6F9FD0', pattern: 'dot',    label: 'ฟ้า' },
  butter: { shell: '#F7E3A0', symbol: '#E2B54E', pattern: 'stripe', label: 'เหลือง' },
  coin:   { shell: '#F4E9F6', symbol: '#F2D79A', pattern: 'coin',   label: 'เหรียญ' },
});
/** Patterns a bubble can carry. */
export const BUBBLE_PATTERNS = Object.freeze(['heart', 'star', 'dot', 'stripe', 'coin']);

const R = BUBBLE_SIZE / 2;
const SYMBOL = 0.22;   // symbol width, ~44% of the bubble: ≥ 25 px when a bubble is 56 px

/* ------------------------------------------------------------ shell shader */

/** Theme values for the shell (look only). */
const SHELL_THEME = {
  light: { core: 0.13, rim: 0.7, glint: 1.0, milk: 0.35 },
  dark: { core: 0.2, rim: 0.78, glint: 0.8, milk: 0.5 },
};

const SHELL_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 mv = modelViewMatrix * p;
  vN = normalize(normalMatrix * n);
  vV = normalize(-mv.xyz);
  vY = normal.y;
  gl_Position = projectionMatrix * mv;
}`;

const SHELL_FRAG = /* glsl */`
uniform vec3 uTint;
uniform float uCore;
uniform float uRim;
uniform float uMilk;
uniform float uGlint;
uniform float uRainbow;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(vV);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.2);
  // soft soap sheen: a pastel hue band that drifts with the rim and height
  float h = fres * 1.6 + vY * 0.35;
  vec3 sheen = mix(vec3(1.0), 0.5 + 0.5 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67))), 0.45);
  vec3 col = mix(uTint, uTint * sheen * 1.08, 0.55 * fres);
  col = mix(col, sheen, uRainbow * (0.35 + 0.5 * fres));
  col = mix(col, vec3(1.0), uMilk * fres);
  float a = mix(uCore, uRim, fres);
  // two soft round glints, fixed in view space (top-left big, bottom-right small)
  float g1 = smoothstep(0.935, 0.965, dot(N, normalize(vec3(-0.5, 0.56, 0.66))));
  float g2 = smoothstep(0.978, 0.99, dot(N, normalize(vec3(0.56, -0.5, 0.66)))) * 0.6;
  float g = clamp((g1 + g2) * uGlint, 0.0, 1.0);
  col = mix(col, vec3(1.0), g);
  a = max(a, g * 0.92);
  gl_FragColor = vec4(col, a * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const shellMats = new Map();
let shellTheme = 'light';

/**
 * A new soap-shell material (translucent, fresnel rim, glints). Cheap: no lights.
 * @param {string|number} tint  sRGB colour
 * @param {{rainbow?: number, opacity?: number}} [o]
 * @returns {THREE.ShaderMaterial}
 */
export function createSoapMaterial(tint, o = {}) {
  const v = SHELL_THEME[shellTheme];
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: new THREE.Color(tint) },
      uCore: { value: v.core }, uRim: { value: v.rim }, uMilk: { value: v.milk }, uGlint: { value: v.glint },
      uRainbow: { value: o.rainbow ?? 0 }, uOpacity: { value: o.opacity ?? 1 },
    },
    vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG,
    transparent: true, depthWrite: false,
  });
  m.name = 'soap';
  m.userData.soap = true;
  return m;
}

function shellMaterial(colorId) {
  if (!shellMats.has(colorId)) {
    const c = BUBBLE_COLORS[colorId] ?? BUBBLE_COLORS.sky;
    const m = createSoapMaterial(c.shell, { rainbow: colorId === 'coin' ? 1 : 0 });
    m.name = 'soap:' + colorId;
    m.userData.shared = true;
    shellMats.set(colorId, m);
  }
  return shellMats.get(colorId);
}

/**
 * Switch every soap material under `root` (and the cached shared ones) to a theme.
 * Called by `applyMinigameTheme` in ./minigame.js; safe to call on its own.
 * @param {'light'|'dark'} theme
 * @param {THREE.Object3D} [root]
 */
export function applySoapTheme(theme, root) {
  shellTheme = theme === 'dark' ? 'dark' : 'light';
  const v = SHELL_THEME[shellTheme];
  const set = (m) => { m.uniforms.uCore.value = v.core; m.uniforms.uRim.value = v.rim; m.uniforms.uMilk.value = v.milk; m.uniforms.uGlint.value = v.glint; };
  for (const m of shellMats.values()) set(m);
  root?.traverse((o) => { if (o.material?.userData?.soap) set(o.material); });
}

/* --------------------------------------------------------------- geometry */

let shellGeo = null;
function shellGeometry() {
  if (!shellGeo) { shellGeo = new THREE.SphereGeometry(R, 28, 18); shellGeo.deleteAttribute('uv'); shellGeo.userData.shared = true; }
  return shellGeo;
}

const SYMBOLS = {
  heart(b, col) { b.add(heartShape(SYMBOL * 0.95), col, { scale: [1, 1, 1.6], shade: 0.04 }); },
  star(b, col) { b.add(puffyStar(SYMBOL * 0.56, 0.5, { inner: 0.5 }), col, { rotation: [0, 0, 0], shade: 0.04 }); },
  dot(b, col) {
    // three round dots in a triangle (reads as "dots" even at 24 px)
    const r = SYMBOL * 0.19, d = SYMBOL * 0.28;
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
      b.add(sphere(r, 14, 10), col, { position: [Math.cos(a) * d, Math.sin(a) * d - 0.008, 0], scale: [1, 1, 0.62], shade: 0.04 });
    }
  },
  stripe(b, col) {
    // three diagonal soft bars (candy stripes) clipped to a round badge outline
    const t = SYMBOL * 0.1, gap = SYMBOL * 0.3;
    const lens = [SYMBOL * 0.5, SYMBOL * 0.78, SYMBOL * 0.5];
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * gap;
      b.add(capsule(t, lens[i], 3, 10), col, {
        position: [off * Math.SQRT1_2, off * Math.SQRT1_2, 0], rotation: [0, 0, Math.PI / 4], scale: [1, 1, 0.62], shade: 0.04,
      });
    }
  },
};

const symbolGeos = new Map();
function symbolGeometry(colorId, pattern) {
  const key = colorId + ':' + pattern;
  if (!symbolGeos.has(key)) {
    const b = new ClayBuilder();
    const col = (BUBBLE_COLORS[colorId] ?? BUBBLE_COLORS.sky).symbol;
    (SYMBOLS[pattern] ?? SYMBOLS.dot)(b, col);
    const g = b.buildMesh().geometry;
    g.computeBoundingBox();
    const c = new THREE.Vector3(); g.boundingBox.getCenter(c); g.translate(-c.x, -c.y, -c.z);
    g.computeBoundingSphere();
    g.userData.shared = true;
    symbolGeos.set(key, g);
  }
  return symbolGeos.get(key);
}

const COIN_IN_BUBBLE = 0.58;   // coin scale inside the coin bubble (~0.23 across)

/**
 * Raw parts of a bubble, for an InstancedMesh per colour (both geometries and
 * both materials are shared; never dispose them).
 * @param {string} colorId  one of {@link BUBBLE_COLORS} (unknown ids fall back to `sky` look)
 * @param {{pattern?: string}} [o]  symbol override (`bubbles.colors[].pattern`)
 * @returns {{shellGeometry: THREE.BufferGeometry, shellMaterial: THREE.ShaderMaterial,
 *   symbolGeometry: THREE.BufferGeometry, symbolMaterial: THREE.Material, symbolScale: number, pattern: string}}
 *   Draw the symbol first (opaque), then the shell (`renderOrder` 1). Multiply the
 *   symbol's instance matrix by `symbolScale`.
 */
export function getBubbleParts(colorId, o = {}) {
  const pattern = colorId === 'coin' ? 'coin' : (o.pattern ?? BUBBLE_COLORS[colorId]?.pattern ?? 'dot');
  return {
    shellGeometry: shellGeometry(),
    shellMaterial: shellMaterial(colorId),
    symbolGeometry: pattern === 'coin' ? getCoinGeometry() : symbolGeometry(colorId, pattern),
    symbolMaterial: getSharedClayMaterial(),
    symbolScale: pattern === 'coin' ? COIN_IN_BUBBLE : 1,
    pattern,
  };
}

/**
 * A translucent pastel soap bubble with a clay symbol inside.
 * @param {string} colorId  'pink' | 'lilac' | 'sky' | 'butter' | 'coin' (see {@link BUBBLE_COLORS})
 * @param {{pattern?: string, material?: THREE.Material}} [o]  `pattern` overrides the symbol;
 *   `material` replaces the shell material (e.g. `createSoapMaterial(tint)` to fade one bubble
 *   via `uniforms.uOpacity`)
 * @returns {THREE.Group} {@link BUBBLE_SIZE} across, origin at its centre, faces +Z;
 *   `userData = { minigameItem: 'bubble', colorId, pattern, radius }`; children `symbol`, `shell`
 */
export function createBubbleMesh(colorId, o = {}) {
  const p = getBubbleParts(colorId, o);
  const g = new THREE.Group();
  g.name = 'minigame:bubble:' + colorId;
  const sym = new THREE.Mesh(p.symbolGeometry, p.symbolMaterial);
  sym.name = 'symbol';
  sym.scale.setScalar(p.symbolScale);
  if (p.pattern === 'coin') sym.rotation.y = 0.35;
  const shell = new THREE.Mesh(p.shellGeometry, o.material ?? p.shellMaterial);
  shell.name = 'shell';
  shell.renderOrder = 1;
  g.add(sym, shell);
  g.userData = { minigameItem: 'bubble', colorId, pattern: p.pattern, radius: R };
  return g;
}

/* ------------------------------------------------------------- pop burst */

let ringGeo = null, dropGeo = null;
const DROPS = 7;

/**
 * A short pop: a soap ring that widens and fades plus small droplets flying out.
 * Lasts ~0.34 s (0.26 s when soft). Respect `prefers-reduced-motion` with
 * `reducedMotion: true` (ring only, barely grows).
 * @param {string} colorId  bubble colour (`coin` gives warm gold droplets)
 * @param {{soft?: boolean, reducedMotion?: boolean, scale?: number}} [o]
 *   `soft` = the quiet wrong-colour "ปุ๊" (smaller, fewer, greyer drops)
 * @returns {{object3d: THREE.Group, update: (dt: number) => boolean, dispose: () => void}}
 *   `update(dt)` returns true once finished; at that point the burst has removed itself
 *   from its parent and freed its two materials (geometry is shared).
 */
export function createPopBurst(colorId, o = {}) {
  if (!ringGeo) { ringGeo = new THREE.TorusGeometry(R * 0.95, 0.016, 6, 36); ringGeo.userData.shared = true; }
  if (!dropGeo) { dropGeo = new THREE.SphereGeometry(0.034, 8, 6); dropGeo.userData.shared = true; }
  const c = BUBBLE_COLORS[colorId] ?? BUBBLE_COLORS.sky;
  const soft = !!o.soft, rm = !!o.reducedMotion;
  const tint = new THREE.Color(colorId === 'coin' ? '#F2D79A' : c.symbol);
  if (soft) tint.lerp(new THREE.Color('#C9C6DA'), 0.5);
  const ringTint = tint.clone().lerp(new THREE.Color('#FFFFFF'), 0.45);

  const group = new THREE.Group();
  group.name = 'minigame:pop:' + colorId;
  group.scale.setScalar(o.scale ?? 1);
  const ringMat = new THREE.MeshBasicMaterial({ color: ringTint, transparent: true, depthWrite: false, opacity: 0.9 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.renderOrder = 2;
  group.add(ring);

  let drops = null, dropMat = null;
  const n = rm ? 0 : soft ? 4 : DROPS;
  const dirs = [];
  if (n) {
    dropMat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, depthWrite: false, opacity: 1 });
    drops = new THREE.InstancedMesh(dropGeo, dropMat, n);
    drops.renderOrder = 2;
    drops.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4 + (i % 2) * 0.15;
      dirs.push([Math.cos(a), Math.sin(a), 0.7 + 0.3 * ((i * 37) % 5) / 4]);
    }
    group.add(drops);
  }

  const dur = soft ? 0.26 : 0.34;
  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let t = 0, done = false;

  function pose(p) {
    const e = 1 - Math.pow(1 - p, 3);   // ease-out, no overshoot (soft motion rule)
    const grow = rm ? 0.12 : soft ? 0.35 : 0.6;
    ring.scale.setScalar(1 + grow * e);
    ringMat.opacity = (soft ? 0.55 : 0.9) * Math.pow(1 - p, 1.5);
    if (drops) {
      const reach = R * (soft ? 1.0 : 1.05) + (soft ? 0.12 : 0.24) * e;
      for (let i = 0; i < n; i++) {
        const d = dirs[i];
        pos.set(d[0] * reach * d[2], d[1] * reach * d[2] - 0.05 * p * p, 0.02);
        sc.setScalar((soft ? 0.75 : 1) * (1 - 0.65 * p) * (0.8 + 0.2 * d[2]));
        drops.setMatrixAt(i, m4.compose(pos, q, sc));
      }
      drops.instanceMatrix.needsUpdate = true;
      dropMat.opacity = Math.pow(1 - p, 1.2);
    }
  }
  pose(0);

  function dispose() {
    if (done) return;
    done = true;
    group.removeFromParent();
    ringMat.dispose();
    if (dropMat) dropMat.dispose();
    if (drops) drops.dispose();
  }

  return {
    object3d: group,
    update(dt) {
      if (done) return true;
      t += Math.min(dt, 0.1);
      const p = Math.min(1, t / dur);
      pose(p);
      if (p >= 1) { dispose(); return true; }
      return false;
    },
    dispose,
  };
}

/**
 * Pop a bubble made by {@link createBubbleMesh}: hides it and adds a burst at its
 * position (and scale) to the bubble's parent. Keep calling `burst.update(dt)`.
 * The bubble itself is not removed or disposed (pool it or remove it yourself).
 * @param {THREE.Object3D} bubble
 * @param {{soft?: boolean, reducedMotion?: boolean}} [o]
 * @returns {ReturnType<typeof createPopBurst>}
 */
export function popBubble(bubble, o = {}) {
  const burst = createPopBurst(bubble.userData.colorId ?? 'sky', { ...o, scale: bubble.scale.x });
  burst.object3d.position.copy(bubble.position);
  if (bubble.parent) bubble.parent.add(burst.object3d);
  bubble.visible = false;
  return burst;
}

/* ------------------------------------------------------------------ wand */

let wandGeo = null, wandRingGeo = null, wandFilmGeo = null;

/**
 * The bubble wand the pet holds (ที่เป่าฟอง). The ring glows softly in the called
 * colour and holds a thin soap film.
 * @returns {{object3d: THREE.Group, setColor: (colorId: string|null) => void}}
 *   {@link WAND_SIZE} tall, origin at the bottom of the grip, ring centre at
 *   y ≈ 0.58, faces +Z. `setColor(null)` = neutral cream ring.
 */
export function createBubbleWand() {
  if (!wandGeo) {
    const b = new ClayBuilder();
    b.add(capsule(0.03, 0.12, 4, 12), '#F3D9E4', { position: [0, 0.09, 0], shade: 0.06 });     // soft grip
    b.add(capsule(0.017, 0.36, 3, 10), '#FDF8F4', { position: [0, 0.3, 0], shade: 0.03 });       // stick
    b.add(sphere(0.034, 12, 8), '#F3D9E4', { position: [0, 0.008, 0], shade: 0.05 });            // end knob
    wandGeo = b.buildMesh().geometry; wandGeo.userData.shared = true;
    wandRingGeo = torus(0.11, 0.024, 10, 36); wandRingGeo.userData.shared = true;
    wandFilmGeo = circle(0.104, 32); wandFilmGeo.userData.shared = true;
  }
  const group = new THREE.Group();
  group.name = 'minigame:wand';
  const stick = new THREE.Mesh(wandGeo, getSharedClayMaterial()); stick.name = 'stick';
  const ringMat = new THREE.MeshStandardMaterial({ color: '#FDF8F4', roughness: 0.85, metalness: 0, emissive: '#000000' });
  const ring = new THREE.Mesh(wandRingGeo, ringMat); ring.name = 'ring'; ring.position.y = 0.584;
  const filmMat = createSoapMaterial('#FFFFFF');
  filmMat.uniforms.uGlint.value = 0; filmMat.uniforms.uCore.value = 0.22;   // flat film: no fresnel, so a steady alpha
  const film = new THREE.Mesh(wandFilmGeo, filmMat); film.name = 'film'; film.position.y = 0.584; film.renderOrder = 1;
  group.add(stick, ring, film);

  function setColor(colorId) {
    const c = colorId && BUBBLE_COLORS[colorId];
    ringMat.color.set(c ? c.shell : '#FDF8F4');
    ringMat.emissive.set(c ? c.symbol : '#000000');
    ringMat.emissiveIntensity = c ? 0.28 : 0;
    filmMat.uniforms.uTint.value.set(c ? c.shell : '#FFFFFF');
  }
  group.userData.minigameItem = 'wand';
  group.userData.dispose = () => { ringMat.dispose(); filmMat.dispose(); };
  return { object3d: group, setColor };
}

/* -------------------------------------------------------------- pop star */

let starGeo = null, haloGeo = null;

/**
 * The "ดาวป๊อป" for keyboard / head-tilt mode (3.3 rule 7): a chubby butter star
 * with a tiny happy face and a soft glow behind it.
 * @returns {THREE.Group} {@link POP_STAR_SIZE} across, origin at its centre, faces +Z;
 *   `userData.minigameItem = 'popStar'`
 */
export function createPopStar() {
  if (!starGeo) {
    const b = new ClayBuilder();
    b.add(puffyStar(0.25, 0.55, { inner: 0.56 }), '#F7DE92', { shade: 0.05 });
    for (const s of [-1, 1]) b.add(sphere(0.019, 10, 8), '#5E5478', { position: [s * 0.05, 0.02, 0.07], scale: [0.85, 1.1, 0.5], shade: 0 });
    b.add(torus(0.026, 0.008, 5, 14, Math.PI), '#5E5478', { position: [0, -0.024, 0.071], rotation: [0, 0, Math.PI], shade: 0 });
    for (const s of [-1, 1]) b.add(sphere(0.02, 10, 6), '#F2A9C4', { position: [s * 0.088, -0.02, 0.06], scale: [1.2, 0.7, 0.3], shade: 0 });
    starGeo = b.buildMesh().geometry; starGeo.computeBoundingBox();
    const s = POP_STAR_SIZE / (starGeo.boundingBox.max.x - starGeo.boundingBox.min.x);
    starGeo.scale(s, s, s); starGeo.userData.shared = true;
    haloGeo = new THREE.PlaneGeometry(POP_STAR_SIZE * 1.9, POP_STAR_SIZE * 1.9); haloGeo.userData.shared = true;
  }
  const g = new THREE.Group(); g.name = 'minigame:popStar';
  const star = new THREE.Mesh(starGeo, getSharedClayMaterial()); star.name = 'star';
  const haloMat = new THREE.MeshBasicMaterial({ map: getShadowTexture(), color: '#FFE9A8', transparent: true, opacity: 0.55, depthWrite: false });
  haloMat.userData.theme = { light: { opacity: 0.55 }, dark: { opacity: 0.8 } };
  const halo = new THREE.Mesh(haloGeo, haloMat); halo.name = 'halo'; halo.position.z = -0.08;
  g.add(halo, star);
  g.userData.minigameItem = 'popStar';
  return g;
}

/** @internal coin size inside the coin bubble, for tests */
export const COIN_BUBBLE_COIN_SIZE = COIN_SIZE * COIN_IN_BUBBLE;
