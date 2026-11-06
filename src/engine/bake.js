/**
 * Bake — renders the active room's `staticGroup` once into an offscreen target
 * and composites it as the screen background, so each frame only draws the
 * live parts (room.liveGroup, pet, food, FX). Contract:
 * docs/architecture/module-contracts.md › Sprint 4 › "Bake — wire".
 *
 * How it stays identical to the live render:
 *  - same renderer, scene, camera (incl. view offset), lights and environment;
 *    the target matches the drawing buffer (pixel ratio included), MSAA when the
 *    canvas is antialiased.
 *  - the target is HalfFloat and linear (three renders targets without tone
 *    mapping / sRGB); the composite quad applies the renderer's tone mapping and
 *    output colour space per pixel, exactly what each material does on screen.
 *  - the static depth is baked too and written back with gl_FragDepth, so a live
 *    part behind a static one is still hidden by it (correct occlusion both ways).
 *
 * When it re-bakes: anything in the signature changes — room object,
 * `staticVersion`, the number of static children, camera matrices (framing,
 * view offset, aspect), drawing-buffer size / pixel ratio, light colours /
 * intensities / local positions, environment intensity, tone mapping, theme. A
 * discrete change bakes at once (one frame); a signature that keeps changing
 * (framing ease, resize drag) renders live until it settles, then bakes once.
 * While the room manager slides between rooms the frame is rendered live, and
 * the incoming room is pre-baked at its rest position in the first frame of the
 * slide so the slide ends without a hitch.
 *
 * Falls back to live rendering (returns false from `render`) when disabled
 * (`?nobake`, quality hook), unsupported (WebGL1 / no float colour buffers /
 * incomplete framebuffer), the room has no `staticGroup` (teammate code not in
 * yet) or the room is hidden (camera AR view).
 *
 * Per-frame path allocates nothing.
 * @module engine/bake
 */
import * as THREE from 'three';

/** Max sample count for the bake target (only when the canvas has MSAA). */
const BAKE_SAMPLES = 4;
/** Numbers in the signature that are not lights (camera 32 + misc 8). */
const SIG_FIXED = 40;
/** Max lights tracked in the signature (each: rgb, intensity, world pos xyz, extra). */
const SIG_LIGHTS = 16, SIG_PER_LIGHT = 8;

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = /* glsl */`
uniform sampler2D tColor;
uniform sampler2D tDepth;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tColor, vUv);
  gl_FragDepth = texture2D(tDepth, vUv).r;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * @param {{ renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, enabled?: boolean }} opts
 */
export function createBake({ renderer, scene, camera, enabled = true }) {
  const gl = renderer.getContext();
  const caps = renderer.capabilities;
  let supported = !!caps.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  let reason = supported ? '' : 'unsupported';
  const aa = !!gl.getContextAttributes()?.antialias;

  let rt = null;
  const size = new THREE.Vector2();
  function ensureTarget() {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, size.x | 0), h = Math.max(1, size.y | 0);
    if (rt && rt.width === w && rt.height === h) return rt;
    if (rt) { rt.setSize(w, h); return rt; }
    const depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false,
      depthBuffer: true, stencilBuffer: false, depthTexture,
      samples: aa ? Math.min(BAKE_SAMPLES, caps.maxSamples || 0) : 0,
    });
    rt.texture.name = 'bake:color';
    mat.uniforms.tColor.value = rt.texture;
    mat.uniforms.tDepth.value = depthTexture;
    return rt;
  }

  // Full-screen composite, drawn first (renderOrder), writes colour + baked depth.
  const mat = new THREE.ShaderMaterial({
    name: 'bake:composite', vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { tColor: { value: null }, tDepth: { value: null } },
    depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth, blending: THREE.NoBlending, toneMapped: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.name = 'bake:background';
  quad.frustumCulled = false; quad.matrixAutoUpdate = false; quad.renderOrder = -1e9; quad.visible = false;
  quad.raycast = () => {};   // never pickable
  scene.add(quad);

  // ---- signature (no allocation per frame) ----
  const SIG_N = SIG_FIXED + SIG_LIGHTS * SIG_PER_LIGHT;
  const cur = new Float64Array(SIG_N), last = new Float64Array(SIG_N), baked = new Float64Array(SIG_N);
  let bakedRoom = null, bakedOk = false, changedFrames = 0;
  const lightList = [];       // lights the bake depends on (stage lights + room lights), refreshed per bake key
  let lightsFor = null, lightsVersion = -1;

  function collectLights(room) {
    lightList.length = 0;
    for (const c of scene.children) if (c.isLight) lightList.push(c);
    room.group.traverse((o) => { if (o.isLight && lightList.length < SIG_LIGHTS) lightList.push(o); });
    lightsFor = room; lightsVersion = room.staticVersion;
  }

  function signature(room, out) {
    if (lightsFor !== room || lightsVersion !== room.staticVersion) collectLights(room);
    const p = camera.projectionMatrix.elements, m = camera.matrixWorld.elements;
    for (let i = 0; i < 16; i++) { out[i] = p[i]; out[16 + i] = m[i]; }
    renderer.getDrawingBufferSize(size);
    out[32] = size.x; out[33] = size.y; out[34] = room.staticVersion | 0; out[35] = room.staticGroup.children.length;
    out[36] = renderer.toneMapping; out[37] = renderer.toneMappingExposure;
    out[38] = typeof scene.environmentIntensity === 'number' ? scene.environmentIntensity : 1;
    out[39] = room.theme === 'dark' ? 1 : 0;
    let k = SIG_FIXED;
    for (let i = 0; i < SIG_LIGHTS; i++, k += SIG_PER_LIGHT) {
      const l = lightList[i];
      if (!l) { for (let j = 0; j < SIG_PER_LIGHT; j++) out[k + j] = 0; continue; }
      out[k] = l.color.r; out[k + 1] = l.color.g; out[k + 2] = l.color.b;
      out[k + 3] = l.visible ? l.intensity : -1;
      // local position: a room light slides with its room, so world space would change every slide frame
      out[k + 4] = l.position.x; out[k + 5] = l.position.y; out[k + 6] = l.position.z;
      out[k + 7] = l.groundColor ? l.groundColor.r + l.groundColor.g * 3 + l.groundColor.b * 9 : 0;
    }
    return out;
  }
  const same = (a, b) => { for (let i = 0; i < SIG_N; i++) if (a[i] !== b[i]) return false; return true; };

  // ---- visibility helpers ----
  const hasLight = (o) => { let f = false; o.traverse((x) => { if (x.isLight) f = true; }); return f; };
  /** Push the top-most nodes under `o` that contain no light (hiding them keeps every light on). */
  function collectDrawables(o, out) {
    for (const c of o.children) { if (!hasLight(c)) out.push(c); else if (!c.isLight) collectDrawables(c, out); }
  }
  const saved = [];           // [object, visible, object, visible, …] (bake pass only)
  function hide(o) { saved.push(o, o.visible); o.visible = false; }
  function restore() { for (let i = saved.length - 2; i >= 0; i -= 2) saved[i].visible = saved[i + 1]; saved.length = 0; }

  // live pass: static drawables of the baked room, cached per static key
  let staticList = [], staticVis = [], staticKeyRoom = null, staticKeyVer = -1, staticKeyLen = -1;
  function staticDrawables(room) {
    const sg = room.staticGroup;
    if (staticKeyRoom !== room || staticKeyVer !== room.staticVersion || staticKeyLen !== sg.children.length) {
      staticList = []; collectDrawables(sg, staticList);
      staticVis = new Array(staticList.length).fill(true);
      staticKeyRoom = room; staticKeyVer = room.staticVersion; staticKeyLen = sg.children.length;
    }
    return staticList;
  }

  let bakes = 0, lastBakeMs = 0, mode = 'live';
  const restPos = new THREE.Vector3();

  /** Render the room's static content into the target (rest position). */
  function bake(room) {
    const t0 = performance.now();
    const target = ensureTarget();
    // only static content + every light that is present at rest
    for (const c of scene.children) { if (c === room.group || c.isLight) continue; hide(c); }
    for (const c of room.group.children) { if (c === room.staticGroup) continue; if (c.isLight) continue; if (!hasLight(c)) hide(c); else { const l = []; collectDrawables(c, l); for (const x of l) hide(x); } }
    const g = room.group;
    restPos.copy(g.position); g.position.set(0, 0, 0);
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);   // autoClear: same clear colour / alpha as the screen
    if (bakes === 0) {
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) { supported = false; reason = 'framebuffer ' + st; }
    }
    renderer.setRenderTarget(prevTarget);
    g.position.copy(restPos);
    restore();
    bakes++; lastBakeMs = performance.now() - t0;
    bakedRoom = room; bakedOk = supported;
  }

  /**
   * Render one frame. Returns false when the caller must render the scene live
   * (bake off / unavailable / transition / settling).
   * @param {{ room: object|null, moving: boolean }} src
   * @returns {boolean} rendered
   */
  function render(src) {
    quad.visible = false;
    const room = src.room;
    if (!enabled || !supported || !room || !room.staticGroup || !room.group || !room.group.visible || !room.staticGroup.visible || room.group.parent !== scene) {
      mode = !enabled ? 'off' : !supported ? 'unsupported' : 'live'; changedFrames = 0; return false;
    }
    signature(room, cur);
    const changed = !same(cur, last);
    last.set(cur);
    changedFrames = changed ? changedFrames + 1 : 0;
    const valid = bakedOk && bakedRoom === room && same(cur, baked);
    if (src.moving) {
      // pre-bake the incoming room once (at rest) so the slide ends on a ready bake
      if (!valid && changedFrames <= 1) { bake(room); baked.set(cur); }
      mode = 'transition'; return false;
    }
    if (!valid) {
      if (changedFrames > 1) { mode = 'settling'; return false; }   // still animating → live until it settles
      bake(room); baked.set(cur);
      if (!bakedOk) { mode = 'unsupported'; return false; }
    }
    // live pass over the baked background: hide static drawables, keep static lights
    const list = staticDrawables(room);
    for (let i = 0; i < list.length; i++) { staticVis[i] = list[i].visible; list[i].visible = false; }
    quad.visible = true;
    renderer.render(scene, camera);
    quad.visible = false;
    for (let i = 0; i < list.length; i++) list[i].visible = staticVis[i];
    mode = 'baked';
    return true;
  }

  return {
    render,
    /** Turn baking on/off (quality hook, ?nobake). */
    setEnabled(on) { enabled = !!on; if (!enabled) bakedOk = false; },
    get enabled() { return enabled; },
    get supported() { return supported; },
    /** Force a re-bake on the next frame. */
    invalidate() { bakedOk = false; },
    /** Debug / perf numbers. */
    stats() {
      return { enabled, supported, reason, mode, bakes, room: bakedRoom ? bakedRoom.id || null : null, version: bakedRoom ? baked[34] : null, lastBakeMs: Math.round(lastBakeMs * 10) / 10,
        target: rt ? [rt.width, rt.height, rt.samples] : null, staticDrawables: staticList.length };
    },
    dispose() { quad.removeFromParent(); quad.geometry.dispose(); mat.dispose(); if (rt) { rt.depthTexture?.dispose(); rt.dispose(); } rt = null; },
  };
}
