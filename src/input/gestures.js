/**
 * Gesture layer shared by mouse, touch and webcam hands.
 * Sources call down/move/up/cancel with an id and client-space px; this module
 * decides poke, stretch, long-press carry, squish, petting rub, startle and room
 * swipe, and forwards food drags to care.
 *
 * Contract (module-contracts.md › Input): tap = poke · drag = stretch ·
 * long-press 0.5 s still = carry (hand pinch-hold 0.6 s) · two-finger pinch /
 * wheel = squish · rub above the head = pet · swipe on empty space = room.
 *
 * Sprint 3 #5 (phones): a drag that starts in the head zone (top
 * `petHeadZoneFromTop` of the body) and moves no faster than `petStrokeMaxSpeed`
 * is a stroke: it pets (speed window + grace from needs.json, see
 * `needs.strokeCounts`) and leaves small soft dents under the finger instead of
 * stretching. Faster head drags and drags from lower on the body still stretch.
 * @module input/gestures
 */
import * as THREE from 'three';
import { strokeCounts, inHeadZone, petNumber } from '../game/needs.js';

/** Input feel constants (px, seconds, world units) — not balance numbers. */
const IN = {
  tapSlopPx: 6, handSlopPx: 16,
  holdSeconds: { mouse: 0.5, touch: 0.5, pen: 0.5, hand: 0.6 },
  maxStretch: 1.1,
  swipeMinPx: 60, swipeShare: 0.14, swipeRatio: 1.6, swipeMaxSeconds: 0.7,
  slapPxPerSecond: 2200, slapGap: 0.9, slapStrength: 1.6,
  rubHalfWidth: 0.95, rubBelowHead: 0.75, rubAboveHead: 0.6,
  strokeHalfWidth: 0.95, strokeDentStrength: 0.28, strokeDentStep: 0.14, strokeDentEvery: 0.12,
  wheelScale: 0.0016, squishMax: 0.45, pinchScale: 0.9, squishHold: 0.25, squishDecay: 10,
  pressAboveWindow: 0.8, lookHoldSeconds: 2, lookAhead: 1.6,
  bodyHalfWidth: 1.0,
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * @param {{
 *   stage: ReturnType<import('../engine/stage.js').createStage>,
 *   getPet: () => object|null,
 *   care: ReturnType<import('../game/care.js').createCare>,
 *   mood: ReturnType<import('../game/mood.js').createMood>,
 *   rooms: { go(dir: number): boolean, moving: boolean },
 *   canInteract?: () => boolean,
 *   actions?: object,   // needs.json › actions (petting stroke numbers); defaults when absent
 * }} deps
 */
export function createGestures({ stage, getPet, care, mood, rooms, canInteract = () => true, actions = {} }) {
  const recs = new Map();
  const W = { a: new THREE.Vector3(), b: new THREE.Vector3(), head: new THREE.Vector3(), centre: new THREE.Vector3(), look: new THREE.Vector3() };
  const sq = { wheel: 0, wheelT: -9, pinch: 0, pinchT: -9, handX: 0, handY: 0 };
  let lastSlap = -9, lookX = 0, lookY = 0, lookT = -9;
  let now = 0;

  function petCentre(out) {
    const o = getPet()?.object3d;
    if (o) out.copy(o.position); else out.set(0, 0, 0);
    out.y += 1;
    return out;
  }
  function hitPet(x, y) {
    const pet = getPet();
    if (!pet) return null;
    return pet.hitTest(stage.rayFromScreen(x, y));
  }
  function touchCount() { let n = 0; for (const r of recs.values()) if (r.kind === 'touch' && r.mode !== 'done') n++; return n; }
  function pinchPair() { const out = []; for (const r of recs.values()) if (r.mode === 'pinch') out.push(r); return out.length === 2 ? out : null; }

  function endStretch(r, effects) {
    if (!r.grab) return;
    const amount = r.grab.release();
    r.grab = null;
    if (effects) mood.onRelease(typeof amount === 'number' ? amount : r.level, now);
    else mood.onRelease(0, now);
  }

  /** Rub above the head (pet) and fast swipe through the body (startle). */
  /** Pet body height in world units (feet → head top), for body-heights/s speeds. */
  function bodyHeight(pet) {
    pet.getHeadTopWorld(W.head);
    return Math.max(0.1, W.head.y - pet.object3d.position.y);
  }
  /**
   * One petting frame from a world-space speed: counts by the stroke speed window
   * + grace (needs GDD 4.2). Only an in-window frame restarts the grace clock.
   * @returns {boolean} counted
   */
  function petFrame(r, inZone, spdWorld, bodyH, dt, t) {
    const v = spdWorld / bodyH;
    if (!inZone || !strokeCounts(v, t - r.countT, actions)) return false;
    if (v >= petNumber(actions, 'petStrokeMinSpeed')) r.countT = t;
    mood.onPetTick(dt, t); r.petted = true;
    return true;
  }

  function rubAndSlap(r, x, y, t) {
    const pet = getPet(); if (!pet) return;
    const dt = clamp(t - r.lastT, 1 / 240, 0.2);
    const pxSpeed = Math.hypot(x - r.lastX, y - r.lastY) / dt;
    if (!stage.screenToPlane(x, y, petCentre(W.centre), W.a)) return;
    const bodyH = bodyHeight(pet);
    if (r.hasW) {
      const spd = Math.hypot(W.a.x - r.wx, W.a.y - r.wy) / dt;
      const inBand = Math.abs(W.a.x - W.head.x) < IN.rubHalfWidth && W.a.y > W.head.y - IN.rubBelowHead && W.a.y < W.head.y + IN.rubAboveHead;
      petFrame(r, inBand, spd, bodyH, dt, t);
    }
    if (pxSpeed > IN.slapPxPerSecond && t - lastSlap > IN.slapGap) {
      const hit = hitPet(x, y);
      if (hit) { lastSlap = t; pet.poke(hit.point, IN.slapStrength); mood.onSlap(t); r.petted = true; }
    }
    r.wx = W.a.x; r.wy = W.a.y; r.hasW = true;
  }

  /**
   * Finger stroke over the head: pet by speed, soft dents along the path.
   * World point on the plane through the press anchor (no allocation).
   */
  function stroke(r, x, y, t) {
    const pet = getPet(); if (!pet) return;
    const dt = clamp(t - r.lastT, 1 / 240, 0.2);
    if (!stage.screenToPlane(x, y, r.anchor, W.a)) return;
    const bodyH = bodyHeight(pet), feetY = pet.object3d.position.y;
    const step = Math.hypot(W.a.x - r.wx, W.a.y - r.wy);
    const inZone = Math.abs(W.a.x - pet.object3d.position.x) < IN.strokeHalfWidth && inHeadZone(W.a.y, feetY, W.head.y, actions);
    petFrame(r, inZone, step / dt, bodyH, dt, t);
    r.wx = W.a.x; r.wy = W.a.y;
    r.dentD += step;
    if (inZone && r.dentD >= IN.strokeDentStep && t - r.dentT >= IN.strokeDentEvery) {
      r.dentD = 0; r.dentT = t;
      const hit = hitPet(x, y);
      if (hit) pet.poke(hit.point, IN.strokeDentStrength);
    }
  }

  function track(r, x, y, t) { r.lastX = x; r.lastY = y; r.lastT = t; lookX = x; lookY = y; lookT = t; }

  const api = {
    /**
     * Pointer / hand-pinch pressed.
     * @param {string|number} id @param {number} x @param {number} y @param {number} t stage seconds
     * @param {'mouse'|'touch'|'pen'|'hand'} kind
     */
    down(id, x, y, t, kind = 'mouse') {
      now = t;
      if (!canInteract()) return;
      const r = { id, kind, x0: x, y0: y, t0: t, lastX: x, lastY: y, lastT: t, mode: 'empty', hit: null, grab: null, level: 0, petted: false, hasW: false, wx: 0, wy: 0, anchor: new THREE.Vector3(), head: false, countT: -9, dentT: -9, dentD: 0 };
      recs.set(id, r);
      if (kind === 'touch' && touchCount() >= 2) {
        // second finger: switch both to a two-finger squish
        for (const o of recs.values()) {
          if (o.kind !== 'touch' || o.mode === 'done') continue;
          if (o.mode === 'stretch') endStretch(o, false);
          if (o.mode === 'carry') care.endCarry(o.lastX, o.lastY);
          if (o.mode === 'food') care.endFood();
          o.mode = 'pinch';
        }
        const pair = pinchPair();
        if (pair) sq.pinchD0 = Math.max(20, Math.hypot(pair[0].lastX - pair[1].lastX, pair[0].lastY - pair[1].lastY));
        return;
      }
      if (rooms.moving) { r.mode = 'done'; return; }
      const hit = hitPet(x, y);
      if (hit) {
        r.mode = 'press'; r.hit = hit; r.anchor.copy(hit.point);
        // head zone (top share of the body): a slow drag from here strokes (Sprint 3 #5)
        const pet = getPet();
        if (kind !== 'hand' && pet) { bodyHeight(pet); r.head = inHeadZone(hit.point.y, pet.object3d.position.y, W.head.y, actions); }
      }
      track(r, x, y, t);
    },

    /** Pointer / hand-pinch moved. */
    move(id, x, y, t) {
      now = t;
      const r = recs.get(id); if (!r) return;
      const slop = r.kind === 'hand' ? IN.handSlopPx : IN.tapSlopPx;
      switch (r.mode) {
        case 'food': care.moveFood(x, y); break;
        case 'pinch': {
          r.lastX = x; r.lastY = y;
          const pair = pinchPair();
          if (pair && sq.pinchD0) {
            const d = Math.hypot(pair[0].lastX - pair[1].lastX, pair[0].lastY - pair[1].lastY);
            sq.pinch = clamp((1 - d / sq.pinchD0) * IN.pinchScale, 0, IN.squishMax); sq.pinchT = t;
          }
          return;
        }
        case 'press':
          if (Math.hypot(x - r.x0, y - r.y0) > slop) {
            const pet = getPet();
            if (!pet) break;
            if (r.head && stage.screenToPlane(x, y, r.anchor, W.b)) {
              // speed since the press, in body-heights/s: slow = stroke, fast = stretch
              const v = W.b.distanceTo(r.anchor) / bodyHeight(pet) / Math.max(1 / 240, t - r.t0);
              if (v <= petNumber(actions, 'petStrokeMaxSpeed')) {
                r.mode = 'stroke'; r.wx = r.anchor.x; r.wy = r.anchor.y; r.countT = -9; r.dentD = IN.strokeDentStep;
                stroke(r, x, y, t);
                break;
              }
            }
            r.grab = pet.beginGrab(r.hit.point); r.mode = 'stretch'; mood.onGrabStart(t);
          }
          break;
        case 'stroke': stroke(r, x, y, t); break;
        case 'stretch':
          if (r.grab && stage.screenToPlane(x, y, r.anchor, W.b)) {
            r.grab.move(W.b);
            r.level = clamp(W.b.distanceTo(r.anchor) / IN.maxStretch, 0, 1);
          }
          break;
        case 'carry': care.moveCarry(x, y); break;
        case 'empty': rubAndSlap(r, x, y, t); break;
        default: break;
      }
      track(r, x, y, t);
    },

    /** Pointer / hand-pinch released. */
    up(id, x, y, t) {
      now = t;
      const r = recs.get(id); if (!r) return;
      recs.delete(id);
      switch (r.mode) {
        case 'food': care.endFood(); break;
        case 'press': {
          const pet = getPet();
          if (pet && r.hit) { pet.poke(r.hit.point, 1); mood.onPoke(t); }
          break;
        }
        case 'stretch': endStretch(r, true); break;
        case 'carry': care.endCarry(x, y); break;
        case 'pinch': for (const o of recs.values()) if (o.mode === 'pinch') o.mode = 'done'; sq.pinchD0 = 0; break;
        case 'empty': {
          const dx = x - r.x0, dy = y - r.y0, dur = t - r.t0;
          const min = Math.max(IN.swipeMinPx, stage.size.w * IN.swipeShare);
          if (r.kind !== 'hand' && !r.petted && Math.abs(dx) > min && Math.abs(dx) > IN.swipeRatio * Math.abs(dy) && dur < IN.swipeMaxSeconds) rooms.go(dx < 0 ? 1 : -1);
          break;
        }
        default: break;
      }
    },

    /** Pointer lost (cancel, hand left the frame): end without tap or swipe. */
    cancel(id) {
      const r = recs.get(id); if (!r) return;
      recs.delete(id);
      if (r.mode === 'food') care.endFood();
      else if (r.mode === 'stretch') endStretch(r, true);
      else if (r.mode === 'carry') care.endCarry(r.lastX, r.lastY);
      else if (r.mode === 'pinch') { for (const o of recs.values()) if (o.mode === 'pinch') o.mode = 'done'; sq.pinchD0 = 0; }
    },

    /** Mouse moving with no button, or an open palm: petting rub / startle / gaze. */
    hover(id, x, y, t) {
      now = t;
      let r = recs.get(id);
      if (!r) { r = { id, kind: 'hover', mode: 'hover', lastX: x, lastY: y, lastT: t, hasW: false, wx: 0, wy: 0, petted: false, countT: -9 }; recs.set(id, r); }
      if (canInteract()) rubAndSlap(r, x, y, t);
      track(r, x, y, t);
    },
    /** Hover pointer left the canvas. */
    leave(id) { const r = recs.get(id); if (r && r.mode === 'hover') recs.delete(id); },

    /** Mouse wheel over the pet = squish. @returns {boolean} consumed */
    wheel(x, y, deltaY, t) {
      if (!canInteract() || !hitPet(x, y)) return false;
      sq.wheel = clamp(sq.wheel + deltaY * IN.wheelScale, 0, IN.squishMax); sq.wheelT = t;
      return true;
    },

    /** Food dragged out of the HUD tray (pointer or hand pinch). */
    startFoodDrag(id, foodId, x, y, t, kind = 'touch') {
      now = t;
      if (!canInteract() || !care.startFood(foodId, x, y)) return false;
      recs.set(id, { id, kind, mode: 'food', x0: x, y0: y, t0: t, lastX: x, lastY: y, lastT: t });
      return true;
    },

    /** Hand pointing: poke once when the fingertip enters the body. */
    point(id, x, y, t) {
      now = t;
      const key = id + ':pt';
      const hit = canInteract() ? hitPet(x, y) : null;
      const was = recs.get(key);
      if (hit && !was) { recs.set(key, { id: key, kind: 'hand', mode: 'point' }); getPet()?.poke(hit.point, 1); mood.onPoke(t); }
      else if (!hit && was) recs.delete(key);
      lookX = x; lookY = y; lookT = t;
    },
    /** Hand stopped pointing. */
    pointEnd(id) { recs.delete(id + ':pt'); },

    /**
     * Webcam squish this frame (palm press from above → y, two palms → x).
     * @param {number} x 0..0.45 @param {number} y 0..0.45
     */
    setHandSquish(x, y) { sq.handX = x; sq.handY = y; },

    /**
     * Pet-relative world geometry for hand logic.
     * @param {number} x @param {number} y client px
     * @param {THREE.Vector3} out world point on the pet plane
     * @returns {{ point: THREE.Vector3, petX: number, feetY: number, headY: number, halfWidth: number }|null}
     */
    petFrame(x, y, out) {
      const pet = getPet(); if (!pet) return null;
      if (!stage.screenToPlane(x, y, petCentre(W.centre), out)) return null;
      pet.getHeadTopWorld(W.head);
      return { point: out, petX: pet.object3d.position.x, feetY: pet.object3d.position.y, headY: W.head.y, halfWidth: IN.bodyHalfWidth };
    },
    /** Constants hands.js shares. */
    get feel() { return IN; },
    /** Active gesture ids and modes (debug / tests). */
    get active() { return [...recs.values()].map((r) => `${r.id}:${r.mode}`); },

    /** Drop every in-flight gesture (room change, character change). */
    reset() {
      for (const r of [...recs.values()]) api.cancel(r.id);
      recs.clear();
      sq.wheel = sq.pinch = sq.handX = sq.handY = 0;
    },

    /** Per frame: long-press timing, stretch gains, squish, gaze. */
    update(dt, t) {
      now = t;
      const pet = getPet();
      for (const r of recs.values()) {
        if (r.mode === 'press' && t - r.t0 >= (IN.holdSeconds[r.kind] ?? 0.5)) {
          r.mode = 'carry'; care.beginCarry(r.lastX, r.lastY);
        } else if (r.mode === 'stretch') mood.onStretch(r.level, dt, t);
      }
      if (t - sq.wheelT > IN.squishHold) sq.wheel *= Math.exp(-dt * IN.squishDecay);
      if (!pinchPair() && t - sq.pinchT > IN.squishHold) sq.pinch *= Math.exp(-dt * IN.squishDecay);
      if (sq.wheel < 0.004) sq.wheel = 0;
      if (sq.pinch < 0.004) sq.pinch = 0;
      const sx = sq.handX, sy = Math.max(sq.handY, sq.wheel, sq.pinch);
      if (pet) pet.setSquish(sx, sy);
      mood.onSquish(Math.max(sx, sy), dt, t);
      if (pet && !care.feeding) {
        if (t - lookT < IN.lookHoldSeconds) {
          petCentre(W.centre); W.centre.z += IN.lookAhead;
          if (stage.screenToPlane(lookX, lookY, W.centre, W.look)) pet.lookAt(W.look);
        } else pet.lookAt(null);
      }
    },
  };
  return api;
}
