/**
 * Stage — renderer, scene, lights, environment map, camera framing, resize and
 * the frame loop, plus screen ↔ world helpers used by input.
 * Lighting is ported from the prototype (hemisphere + key + fill + rim,
 * RoomEnvironment PMREM, NeutralToneMapping, transparent clear).
 * @module engine/stage
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Presentation constants (not gameplay numbers). */
const VIEW = {
  fov: 30,
  petHeight: 2.0,          // world units, contract
  petWidth: 2.2,           // widest character + a little room
  heightShare: 0.45,       // pet fills ~45% of the screen height when it fits
  widthShare: 0.8,         // never wider than 80% of the screen width
  bandShare: 0.82,         // never taller than 82% of the space between the HUD bands
  lookAtY: 1.0,
  camLift: 0.2,            // camera y above lookAt, scaled by distance / 8
  dprTouch: 1.75,
  dprMouse: 2,
  maxDt: 1 / 20,
};

/**
 * Stage light presets per theme (presentation, not gameplay). Light = the
 * prototype's daytime pastel; dark = a soft evening look that matches Prop's
 * `room.setTheme('dark')`. Prop may export its own preset as `stageLights` from
 * `rooms/index.js` with the same shape; main.js passes it to `setTheme`.
 */
export const STAGE_LIGHTS = Object.freeze({
  light: { hemi: { sky: 0xffe1f2, ground: 0x9cb0ea, intensity: 2.1 }, key: { color: 0xfff5fb, intensity: 1.5 }, fill: { color: 0xa8b8ff, intensity: 0.55 }, rim: { color: 0xffffff, intensity: 1.3 }, env: 1 },
  dark: { hemi: { sky: 0xc9bff2, ground: 0x4b5590, intensity: 1.55 }, key: { color: 0xffe6cf, intensity: 1.25 }, fill: { color: 0x8c9cff, intensity: 0.6 }, rim: { color: 0xc4ccff, intensity: 1.1 }, env: 0.75 },
});

/**
 * @param {{ container: HTMLElement, overlay?: HTMLCanvasElement, hudReserve?: {top:number, bottom:number} }} opts
 */
export function createStage({ container, overlay, hudReserve = { top: 120, bottom: 160 } }) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? VIEW.dprTouch : VIEW.dprMouse));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.id = 'gl';
  canvas.setAttribute('aria-label', 'สัตว์เลี้ยงของคุณ');
  container.insertBefore(canvas, overlay || null);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.1, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xffe1f2, 0x9cb0ea, 2.1);
  const key = new THREE.DirectionalLight(0xfff5fb, 1.5); key.position.set(1.4, 4.6, 4.2);
  const fill = new THREE.DirectionalLight(0xa8b8ff, 0.55); fill.position.set(-2.2, -1.4, 3.2);
  const rim = new THREE.DirectionalLight(0xffffff, 1.3); rim.position.set(-2.6, 2.6, -3.2);
  scene.add(hemi, key, fill, rim);

  const focus = new THREE.Vector3(0, VIEW.lookAtY, 0);
  let extraWidth = 0;
  const reserve = { ...hudReserve };
  const size = { w: 1, h: 1, left: 0, top: 0 };
  const ovCtx = overlay ? overlay.getContext('2d') : null;

  function frame() {
    const { w, h } = size;
    const band = Math.max(80, h - reserve.top - reserve.bottom);
    const petPx = Math.min(h * VIEW.heightShare, band * VIEW.bandShare, w * VIEW.widthShare * (VIEW.petHeight / (VIEW.petWidth + extraWidth)));
    const worldH = VIEW.petHeight * h / petPx;
    const dist = worldH / (2 * Math.tan(THREE.MathUtils.degToRad(VIEW.fov / 2)));
    camera.aspect = w / h;
    camera.position.set(focus.x, focus.y + VIEW.camLift * dist / 8, focus.z + dist);
    camera.lookAt(focus);
    // shift the image so the pet centre sits in the middle of the free band
    const bandCentre = reserve.top + band / 2;
    camera.setViewOffset(w, h, 0, h / 2 - bandCentre, w, h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function resize() {
    const r = container.getBoundingClientRect();
    size.w = Math.max(1, Math.round(r.width)); size.h = Math.max(1, Math.round(r.height));
    size.left = r.left; size.top = r.top;
    renderer.setSize(size.w, size.h, false);
    if (overlay) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      overlay.width = Math.round(size.w * dpr); overlay.height = Math.round(size.h * dpr);
    }
    frame();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---- screen ↔ world (no allocation per call) ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const camDir = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  /**
   * Point the shared raycaster through a client-space point.
   * @param {number} x clientX
   * @param {number} y clientY
   * @returns {THREE.Raycaster} shared instance, valid until the next call
   */
  function rayFromScreen(x, y) {
    ndc.set(((x - size.left) / size.w) * 2 - 1, -((y - size.top) / size.h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster;
  }

  /**
   * Intersect a client-space point with the camera-facing plane through `through`.
   * @param {number} x clientX
   * @param {number} y clientY
   * @param {THREE.Vector3} through a point on the plane (e.g. the pet centre)
   * @param {THREE.Vector3} out receives the hit
   * @returns {THREE.Vector3|null} `out`, or null if parallel
   */
  function screenToPlane(x, y, through, out) {
    camera.getWorldDirection(camDir);
    plane.setFromNormalAndCoplanarPoint(camDir, through);
    return rayFromScreen(x, y).ray.intersectPlane(plane, out);
  }

  /**
   * Project a world point to client-space px.
   * @param {THREE.Vector3} v
   * @param {{x:number, y:number}} out
   */
  function worldToScreen(v, out) {
    tmp.copy(v).project(camera);
    out.x = size.left + (tmp.x + 1) / 2 * size.w;
    out.y = size.top + (1 - tmp.y) / 2 * size.h;
    return out;
  }

  /**
   * World units per screen px at the depth of a point (for px thresholds → world).
   * @param {THREE.Vector3} at
   */
  function worldPerPx(at) {
    const d = camera.position.distanceTo(at);
    return 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / size.h;
  }

  // ---- loop ----
  const ticks = [];
  const clock = new THREE.Clock(false);
  let running = false, frameMs = 0;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    frameMs = performance.now();
    const dt = Math.min(clock.getDelta(), VIEW.maxDt);
    const time = clock.elapsedTime;
    for (let i = 0; i < ticks.length; i++) ticks[i](dt, time);
    renderer.render(scene, camera);
    for (let i = 0; i < after.length; i++) after[i](dt, time);
  }
  const after = [];

  return {
    renderer, scene, camera, canvas, coarse, size,
    /** Overlay 2D context (hand skeletons), or null. */
    overlayCtx: ovCtx,
    /** Register a per-frame callback run before render: fn(dt, time). */
    onTick(fn) { ticks.push(fn); },
    /** Register a per-frame callback run after render (overlays, DOM placement). */
    onAfterRender(fn) { after.push(fn); },
    start() { if (running) return; running = true; clock.start(); requestAnimationFrame(loop); },
    stop() { running = false; clock.stop(); },
    /** Seconds since start at the current frame (same clock as tick `time`). */
    get time() { return clock.elapsedTime; },
    /**
     * Live seconds on the same clock, for input events between frames: on a slow
     * frame the frame time can be stale by hundreds of ms, which would make a
     * fresh press look like a long-press.
     */
    now() { return running ? clock.elapsedTime + (performance.now() - frameMs) / 1000 : clock.elapsedTime; },
    /**
     * Frame a floor point (usually the room's petSpot). `width` adds world units
     * that must also fit across the screen (e.g. a toilet beside the pet).
     * @param {THREE.Vector3} v @param {number} [width]
     */
    /**
     * Light the scene for a theme.
     * @param {'light'|'dark'} theme
     * @param {object} [preset] same shape as STAGE_LIGHTS.light (e.g. Prop's); missing parts use ours
     */
    setTheme(theme, preset) {
      const base = STAGE_LIGHTS[theme === 'dark' ? 'dark' : 'light'];
      const p = preset && typeof preset === 'object' ? preset : base;
      const pick = (k) => ({ ...base[k], ...(p[k] || {}) });
      const h = pick('hemi');
      hemi.color.set(h.sky); hemi.groundColor.set(h.ground); hemi.intensity = h.intensity;
      for (const [k, l] of [['key', key], ['fill', fill], ['rim', rim]]) { const c = pick(k); l.color.set(c.color); l.intensity = c.intensity; }
      const env = typeof p.env === 'number' ? p.env : base.env;
      if ('environmentIntensity' in scene) scene.environmentIntensity = env;
    },
    setFocus(v, width = 0) { focus.set(v.x, v.y + VIEW.lookAtY, v.z); extraWidth = Math.max(0, width); frame(); },
    /** Update the HUD bands kept clear of the pet (px). */
    setHudReserve(r) { Object.assign(reserve, r); frame(); },
    rayFromScreen, screenToPlane, worldToScreen, worldPerPx,
    dispose() { ro.disconnect(); this.stop(); renderer.dispose(); },
  };
}
