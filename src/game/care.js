/**
 * Care actions — feeding (kitchen), carrying, toilet + flush (bathroom).
 * Input (gestures.js) calls these with client-space px; rules come from
 * needs.js and the data files.
 * @module game/care
 */
import * as THREE from 'three';
import { eatFood, flushToilet, toiletNoNeed } from './needs.js';

/** Interaction geometry in world units / seconds (input feel, not balance). */
const FEEL = {
  foodAhead: 0.9,      // food plane sits this far in front of the pet centre
  mouthRadius: 0.5,    // drop inside → eat
  mouthFar: 1.7,       // mouth starts opening
  mouthNear: 0.35,     // fully open
  returnSeconds: 0.5, swallowSeconds: 0.2,
  hopSeconds: 0.5, hopHeight: 0.35, carryFollow: 18, carryLift: 0.25,
  toiletSlack: 1.3,    // multiplier on the toilet zone radius for the pet body
  coachSeconds: 4.5,
};
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * @param {{
 *   stage: ReturnType<import('../engine/stage.js').createStage>,
 *   data: object, game: object, hud: object, sfx: object,
 *   mood: ReturnType<import('./mood.js').createMood>,
 *   timers: ReturnType<import('./timers.js').createTimers>,
 *   getPet: () => object|null, getRoom: () => object|null, getRoomId: () => string|null,
 *   createFoodMesh: (id: string) => THREE.Object3D,
 *   onNeedsChanged?: () => void,
 * }} deps
 */
export function createCare(deps) {
  const { stage, data, game, hud, sfx, mood, timers, getPet, getRoom, getRoomId, createFoodMesh, onNeedsChanged } = deps;
  const scene = stage.scene;
  const v = { anchor: new THREE.Vector3(), hit: new THREE.Vector3(), mouth: new THREE.Vector3(), tray: new THREE.Vector3(), target: new THREE.Vector3(), offset: new THREE.Vector3(), centre: new THREE.Vector3() };
  let food = null;   // { mesh, id, phase, t, from: Vector3, to: Vector3, s0 }
  let carry = null;  // { target: Vector3 }
  let hop = null;    // { from, to, t }
  let sitting = false;
  let lastEat = -99;

  const petObj = () => getPet()?.object3d;
  function petCentre(out) {
    const o = petObj();
    if (o) out.copy(o.position); else out.set(0, 0, 0);
    out.y += 1;
    return out;
  }
  const ORIGIN = new THREE.Vector3();
  function homeSpot() { return getRoom()?.petSpot || ORIGIN; }

  function disposeMesh(mesh) {
    scene.remove(mesh);
    mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  // ---------------- feeding ----------------
  function foodPlanePoint(x, y, out) {
    petCentre(v.anchor); v.anchor.z += FEEL.foodAhead;
    return stage.screenToPlane(x, y, v.anchor, out);
  }

  function releaseMouth() { const pet = getPet(); if (pet) { pet.setMouthOpen(-1); pet.lookAt(null); } }

  function returnFood() {
    if (!food) return;
    foodPlanePoint(stage.size.left + stage.size.w / 2, stage.size.top + stage.size.h - 70, v.tray);
    food.phase = 'return'; food.t = 0; food.from = food.mesh.position.clone(); food.to = v.tray.clone(); food.s0 = food.mesh.scale.x;
    releaseMouth();
  }

  function finishEat(foodId) {
    const pet = getPet();
    const key = game.selected;
    const res = eatFood(game.needs(), foodId, key, data.foods, data.needs);
    if (res.outcome === 'eaten') { game.setLevels(res.levels); onNeedsChanged?.(); }
    const kind = res.kind || 'ok';
    const fr = data.personas[key]?.foodReaction?.[kind];
    pet?.play('gulp'); sfx.play('gulp');
    timers.after(0.35, () => {
      if (fr) { mood.react(fr.expr, 1.8); getPet()?.play(fr.action); }
      mood.say(data.foods.reactions[kind].line, true);
      if (kind === 'like') sfx.play('sparkle');
      mood.hold('eating', false);
    }, 'eat');
  }

  /** Begin dragging a food from the tray. @returns {boolean} started */
  function startFood(foodId, x, y) {
    if (food || getRoomId() !== 'kitchen' || !getPet()) return false;
    let mesh;
    try { mesh = createFoodMesh(foodId); } catch (e) { console.error(e); return false; }
    if (!mesh) return false;
    scene.add(mesh);
    food = { mesh, id: foodId, phase: 'drag', t: 0 };
    if (foodPlanePoint(x, y, v.hit)) mesh.position.copy(v.hit);
    sfx.play('pick');
    hud.coach(null);
    return true;
  }

  function moveFood(x, y) {
    if (!food || food.phase !== 'drag') return;
    if (foodPlanePoint(x, y, v.hit)) food.mesh.position.lerp(v.hit, 0.85);
  }

  function endFood() {
    if (!food || food.phase !== 'drag') return;
    const pet = getPet();
    if (!pet) { returnFood(); return; }
    pet.getMouthWorld(v.mouth);
    const d = food.mesh.position.distanceTo(v.mouth);
    if (d > FEEL.mouthRadius) { returnFood(); return; }
    const now = stage.time;
    const res = eatFood(game.needs(), food.id, game.selected, data.foods, data.needs, { nowSeconds: now, lastEatSeconds: lastEat });
    if (res.outcome === 'full') {
      mood.say('full', true); pet.play('shake'); returnFood(); return;
    }
    if (res.outcome !== 'eaten') { returnFood(); return; }
    lastEat = now;
    food.phase = 'eat'; food.t = 0; food.from = food.mesh.position.clone(); food.to = v.mouth.clone(); food.s0 = food.mesh.scale.x;
    const foodId = food.id;
    pet.lookAt(null);
    mood.hold('eating', true);
    const chewBase = pet.play('chew') || 1;
    pet.setMouthOpen(-1);
    sfx.play('chew');
    const chew = chewBase * (data.personas[game.selected]?.foodReaction?.chewTimeScale ?? 1);
    mood.react('eat', chew + 0.2);
    timers.after(chew, () => finishEat(foodId), 'eat');
  }

  // ---------------- carry + toilet ----------------
  function stand() {
    if (!sitting) return;
    sitting = false;
    getPet()?.setSitting(false);
    mood.hold('sitting', false);
    hud.setFlushVisible(false);
    hud.coach(null);
  }

  function hopHome() {
    const o = petObj(); if (!o) return;
    hop = { from: o.position.clone(), to: homeSpot().clone(), t: 0 };
  }

  /** Long-press picked the pet up. */
  function beginCarry(x, y) {
    const o = petObj(); if (!o) return;
    cancelFood();
    stand();
    hop = null;
    petCentre(v.centre);
    stage.screenToPlane(x, y, v.centre, v.hit);
    v.offset.copy(o.position).sub(v.hit);
    v.offset.y += FEEL.carryLift;
    carry = { target: o.position.clone() };
    getPet().setCarried(true);
    mood.onCarryStart(stage.time);
  }

  function moveCarry(x, y) {
    if (!carry) return;
    const o = petObj(); if (!o) return;
    v.centre.copy(carry.target); v.centre.y += 1;
    if (stage.screenToPlane(x, y, v.centre, v.hit)) {
      carry.target.copy(v.hit).add(v.offset);
      carry.target.z = homeSpot().z;
      if (carry.target.y < 0) carry.target.y = 0;
    }
  }

  function sit(room) {
    const o = petObj(); if (!o) return;
    o.position.copy(room.toiletSeat || room.dropZones.toilet.position);
    getPet().setSitting(true);
    sitting = true;
    mood.hold('sitting', true);
    hud.setFlushVisible(true);
    hud.coach('กดชักโครก');
    if (toiletNoNeed(game.needs(), data.needs)) mood.say('toiletNoNeed', true);
    else sfx.play('pop');
  }

  /** Released after a carry. */
  function endCarry(x, y) {
    if (!carry) return;
    carry = null;
    getPet()?.setCarried(false);
    mood.onCarryEnd();
    const room = getRoom();
    const zone = room?.dropZones?.toilet;
    if (zone) {
      const ray = stage.rayFromScreen(x, y).ray;
      const o = petObj();
      const near = ray.distanceToPoint(zone.position) < zone.radius
        || (o && Math.hypot(o.position.x - zone.position.x, o.position.z - zone.position.z) < zone.radius * FEEL.toiletSlack);
      if (near) { sit(room); return; }
    }
    hopHome();
  }

  /** HUD flush button. */
  function flush() {
    const room = getRoom();
    if (!sitting || !room || typeof room.flush !== 'function') return false;
    const d = room.flush() || 1.2;
    sfx.play('flush');
    const res = flushToilet(game.needs(), data.needs);
    game.setLevels(res.levels); onNeedsChanged?.();
    hud.setFlushVisible(false);
    hud.coach(null);
    mood.say('flush', true);
    if (res.relieved) timers.after(Math.min(1, d * 0.6), () => { mood.say('relieved', true); mood.react('joy', 1.6); }, 'toilet');
    timers.after(d, () => { stand(); hopHome(); }, 'toilet');
    return true;
  }

  function cancelFood() {
    if (!food) return;
    disposeMesh(food.mesh); food = null;
    releaseMouth();
    timers.cancel('eat');
    mood.hold('eating', false);
  }

  return {
    startFood, moveFood, endFood, beginCarry, moveCarry, endCarry, flush,
    get feeding() { return !!food && food.phase === 'drag'; },
    get carrying() { return !!carry; },
    get sitting() { return sitting; },

    /** Room switched: drop everything and stand the pet at the new petSpot. */
    onRoomChanged(room, id) {
      cancelFood();
      if (carry) { carry = null; getPet()?.setCarried(false); mood.onCarryEnd(); }
      stand(); hop = null;
      timers.cancel('toilet');
      const o = petObj(); if (o && room?.petSpot) o.position.copy(room.petSpot);
      hud.setFlushVisible(false);
      const tip = id === 'kitchen' ? 'ลากอาหารไปที่ปากได้เลย' : id === 'bathroom' ? 'กดค้างที่ตัวเพื่ออุ้มไปนั่งชักโครก' : null;
      hud.coach(tip);
      timers.cancel('coach');
      if (tip) timers.after(FEEL.coachSeconds, () => { if (!sitting) hud.coach(null); }, 'coach');
    },

    /** New character instance: forget poses on the old one. */
    onCharacterChanged() {
      cancelFood(); carry = null; hop = null; sitting = false;
      mood.hold('sitting', false);
      hud.setFlushVisible(false);
      const o = petObj(); if (o) o.position.copy(homeSpot());
    },

    update(dt, time) {
      const pet = getPet();
      if (food) {
        if (food.phase === 'drag' && pet) {
          pet.getMouthWorld(v.mouth);
          const d = food.mesh.position.distanceTo(v.mouth);
          pet.setMouthOpen(smooth(FEEL.mouthFar, FEEL.mouthNear, d));
          pet.lookAt(food.mesh.position);
        } else if (food.phase === 'return' || food.phase === 'eat') {
          const dur = food.phase === 'eat' ? FEEL.swallowSeconds : FEEL.returnSeconds;
          food.t = Math.min(1, food.t + dt / dur);
          const k = 1 - Math.pow(1 - food.t, 3);
          food.mesh.position.lerpVectors(food.from, food.to, k);
          food.mesh.position.y += food.phase === 'return' ? Math.sin(food.t * Math.PI) * 0.25 : 0;
          const s = food.s0 * (1 - k * (food.phase === 'eat' ? 0.9 : 1));
          food.mesh.scale.setScalar(Math.max(0.001, s));
          if (food.t >= 1) { disposeMesh(food.mesh); food = null; }
        }
      }
      const o = petObj();
      if (carry && o) {
        o.position.lerp(carry.target, 1 - Math.exp(-dt * FEEL.carryFollow));
        mood.onCarried(dt, time);
      } else if (hop && o) {
        hop.t = Math.min(1, hop.t + dt / FEEL.hopSeconds);
        const k = hop.t * hop.t * (3 - 2 * hop.t);
        o.position.lerpVectors(hop.from, hop.to, k);
        o.position.y += Math.sin(hop.t * Math.PI) * FEEL.hopHeight;
        if (hop.t >= 1) { hop = null; o.position.copy(homeSpot()); }
      }
    },
  };
}
