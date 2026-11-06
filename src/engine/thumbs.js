/**
 * Shop thumbnails — renders furniture previews (Prop's `createFurniturePreview`)
 * to small PNG data URLs, once per session, lazily (only items someone asked
 * for, a few per frame), cached by item id. Contract: module-contracts.md ›
 * Sprint 4 › Furniture shop ("wire renders createFurniturePreview items to small
 * PNG data URLs once per session (offscreen, cached)").
 *
 * Method: inside the frame loop, BEFORE the main render, draw the preview into
 * a scissored corner of the game canvas (same renderer, tone mapping, sRGB
 * output and MSAA as the game) and copy that region into a 2D canvas right
 * away; the main render then clears and redraws the whole canvas in the same
 * frame, so the corner is never shown. No second WebGL context, no float
 * read-back.
 * @module engine/thumbs
 */
import * as THREE from 'three';
import { STAGE_LIGHTS } from './stage.js';

/** Thumbnail size in CSS px (the HUD card shows ~110 px), rendered at 2× for sharp phones. */
const THUMB = { css: 128, scale: 2, fov: 26, elevation: 0.32, margin: 1.12, perFrame: 1 };

/**
 * @param {{ stage: ReturnType<import('./stage.js').createStage>, createPreview: (id: string, o?: object) => { object3d: THREE.Object3D, fit: { center: THREE.Vector3, radius: number }, update?: Function, dispose?: Function } }} deps
 */
export function createThumbnails({ stage, createPreview }) {
  const { renderer } = stage;
  const cache = new Map();          // id → dataURL | '' (failed)
  const queue = [];                 // ids waiting
  const waiting = new Set();
  let listener = null;

  const px = THUMB.css * THUMB.scale;
  const out = document.createElement('canvas');
  out.width = px; out.height = px;
  const ctx = out.getContext('2d');

  const scene = new THREE.Scene();
  scene.environment = stage.scene.environment;
  const L = STAGE_LIGHTS.light;
  const hemi = new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.intensity);
  const key = new THREE.DirectionalLight(L.key.color, L.key.intensity); key.position.set(1.4, 4.6, 4.2);
  const fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity); fill.position.set(-2.2, -1.4, 3.2);
  const rim = new THREE.DirectionalLight(L.rim.color, L.rim.intensity); rim.position.set(-2.6, 2.6, -3.2);
  scene.add(hemi, key, fill, rim);
  const cam = new THREE.PerspectiveCamera(THUMB.fov, 1, 0.05, 100);
  const dir = new THREE.Vector3(0, THUMB.elevation, 1).normalize();
  const vp = new THREE.Vector4(), sc = new THREE.Vector4(), buf = new THREE.Vector2();

  function renderOne(id) {
    let p = null;
    try {
      p = createPreview(id, { theme: 'light' });
      scene.add(p.object3d);
      p.update?.(0, 0);
      const { center, radius } = p.fit;
      const dist = (radius * THUMB.margin) / Math.sin(THREE.MathUtils.degToRad(THUMB.fov / 2));
      cam.position.copy(center).addScaledVector(dir, dist);
      cam.near = Math.max(0.01, dist - radius * 2); cam.far = dist + radius * 4;
      cam.lookAt(center); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      renderer.getDrawingBufferSize(buf);
      const pr = renderer.getPixelRatio();
      const side = Math.min(px, buf.x, buf.y);
      // viewport / scissor are in CSS px (three multiplies by the pixel ratio)
      renderer.getViewport(vp); renderer.getScissor(sc);
      const scis = renderer.getScissorTest();
      renderer.setViewport(0, 0, side / pr, side / pr);
      renderer.setScissor(0, 0, side / pr, side / pr);
      renderer.setScissorTest(true);
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
      ctx.clearRect(0, 0, px, px);
      ctx.drawImage(renderer.domElement, 0, buf.y - side, side, side, 0, 0, px, px);
      renderer.setScissorTest(scis);
      renderer.setViewport(vp); renderer.setScissor(sc);
      return out.toDataURL('image/png');
    } catch (e) {
      console.warn('[thumbs]', id, e);
      return '';
    } finally {
      if (p) { scene.remove(p.object3d); try { p.dispose?.(); } catch { /* ignore */ } }
    }
  }

  /** Per frame (before render): render up to `perFrame` queued thumbnails. */
  function pump() {
    if (!queue.length) return;
    const done = [];
    for (let i = 0; i < THUMB.perFrame && queue.length; i++) {
      const id = queue.shift();
      waiting.delete(id);
      cache.set(id, renderOne(id));
      done.push(id);
    }
    if (listener) listener(done, !queue.length);
  }
  stage.onTick(pump);

  return {
    /** Cached data URL or null (not rendered yet / failed). */
    get(id) { const v = cache.get(id); return v ? v : null; },
    /**
     * Queue ids (already cached ones are skipped). `onReady(ids, finished)` is
     * called after each frame that rendered some.
     * @param {string[]} ids
     */
    request(ids) { for (const id of ids) if (!cache.has(id) && !waiting.has(id)) { waiting.add(id); queue.push(id); } },
    /** @param {((ids: string[], finished: boolean) => void)|null} fn */
    onReady(fn) { listener = fn; },
    get pending() { return queue.length; },
    get size() { return cache.size; },
  };
}
