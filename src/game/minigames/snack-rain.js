/**
 * Snack Rain (ฝนขนม) — round controller. Catch falling snacks and coins with the
 * pet's open mouth, dodge the little client-demons.
 * Design: design/gdd/minigame-snack-rain.md (loop). Contract: module-contracts.md
 * › Sprint 2 › Minigame. Numbers: `assets/data/minigames.json` › `snackRain`.
 *
 * Pure rules live in `snack-rain-rules.js` (re-exported here, unit-tested in
 * tests/unit/snack-rain.test.mjs). This file owns scene objects, pet movement
 * and HUD calls, and runs on the stage clock `dt` (never Date.now), so a hidden
 * tab or a device clock jump cannot skip or extend a round.
 * @module game/minigames/snack-rain
 */
import * as THREE from 'three';
import {
  newRoundState, applyCatch, applyMiss, roundCoins, roundNeedDeltas, streakMultiplier,
  spawnRate, fallSpeedAt, pickKind, canSpawn, playArea, spawnX, laneX, nearestLane,
} from './snack-rain-rules.js';

export * from './snack-rain-rules.js';

/** Presentation feel (not balance): mouth opening, fades, pet body. */
const FEEL = { mouthFar: 2.4, mouthNear: 0.5, returnSeconds: 0.5, fadeSeconds: 0.35, hudEvery: 0.1, petHalf: 0.9, itemZAhead: 0.05, spin: 1.6, coinSpin: 2.2, handLostSeconds: 1 };
/** Hint when the camera control (head tilt) loses the player; main may pass its own. */
const LOST_HINT = 'หันหน้าเข้ากล้องนะ';
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * @param {{
 *   stage: object, game: object, hud: object, sfx: object, mood: object,
 *   getPet: () => object|null, getHome: () => THREE.Vector3,
 *   cfg: object,
 *   makeMesh: (kind: string, foodId?: string) => THREE.Object3D,   // sized; userData.baseScale optional
 *   foodIds: string[], isLiked?: (foodId: string) => boolean,
 *   getPersona?: () => object,
 *   getControlX?: () => number|null,   // camera control (head tilt) → client x; null = not tracking
 *   getControl?: () => string,         // active control id for the HUD chip ('touch' | 'head')
 *   lostHint?: string,
 *   onNeedsChanged?: () => void, onCoins?: (total: number) => void,
 *   onStateChange?: (active: boolean) => void,
 *   random?: () => number, keyTarget?: EventTarget,
 * }} deps
 */
export function createSnackRain(deps) {
  const { stage, game, hud, sfx, mood, getPet, getHome, cfg, makeMesh, onNeedsChanged, onCoins, onStateChange } = deps;
  // Sprint 3: the camera control is head tilt (hand x is no longer a minigame control)
  const getControlX = deps.getControlX || deps.getHandX || null;
  const lostHint = deps.lostHint || LOST_HINT;
  const random = deps.random || Math.random;
  const keyTarget = deps.keyTarget || window;
  const foods = (Array.isArray(cfg.items.snack?.foods) && cfg.items.snack.foods.length ? cfg.items.snack.foods : deps.foodIds) || ['onigiri'];
  const scene = stage.scene;
  const pools = new Map();   // pool key → Object3D[]
  const live = [];           // falling { mesh, kind, food, key, x, y, speed, spin, liked }
  const fading = [];         // { mesh, key, t, s0 }
  const v = { mouth: new THREE.Vector3(), a: new THREE.Vector3(), through: new THREE.Vector3() };

  // phase: idle | countdown | play | result | return ; 'countdown' also serves resume-after-pause
  let phase = 'idle', countLeft = 0, lastCount = -1, hudDriven = false, countToken = 0;
  let paused = false, pausedBy = '';
  let elapsed = 0, spawnAcc = 0, sinceSpawn = 99, demonsInARow = 0, hudT = -9, clock = 0;
  let st = newRoundState();
  let area = { half: 2, lanes: 0, petHalfRange: 1.5, spawnHalf: 1.8 }, centre = 0;
  let topY = 4, worldH = 6, itemZ = 0.9, sizeW = 0, sizeH = 0;
  let petX = 0, targetX = 0, keyDir = 0, lane = 0;
  const held = { l: false, r: false };
  let source = 'none', lastCamX = null, camLostT = 0, hint = '';
  let demonLineT = -99, returnFrom = 0, returnT = 0;

  function persona() { return deps.getPersona?.() || {}; }

  function measure() {
    const home = getHome();
    v.through.set(home.x, home.y + 1, home.z);
    const s = stage.size;
    const midY = s.top + s.h / 2;
    let left = home.x - 2, right = home.x + 2, top = 4, bottom = -1;
    if (stage.screenToPlane(s.left, midY, v.through, v.a)) left = v.a.x;
    if (stage.screenToPlane(s.left + s.w, midY, v.through, v.a)) right = v.a.x;
    if (stage.screenToPlane(s.left + s.w / 2, s.top, v.through, v.a)) top = v.a.y;
    if (stage.screenToPlane(s.left + s.w / 2, s.top + s.h, v.through, v.a)) bottom = v.a.y;
    area = playArea(right - left, cfg, FEEL.petHalf);
    centre = (left + right) / 2;
    worldH = Math.max(1, top - bottom);
    topY = top + cfg.itemSize;
    const pet = getPet();
    if (pet) { pet.getMouthWorld(v.mouth); itemZ = v.mouth.z + FEEL.itemZAhead; }
    sizeW = s.w; sizeH = s.h;
  }

  function clampTarget(x) {
    const lo = centre - area.petHalfRange, hi = centre + area.petHalfRange;
    return x < lo ? lo : x > hi ? hi : x;
  }

  // ---------------- objects (pooled: no allocation per frame) ----------------
  function take(key, kind, food) {
    let pool = pools.get(key);
    if (!pool) { pool = []; pools.set(key, pool); }
    let mesh = pool.pop();
    if (!mesh) {
      try { mesh = makeMesh(kind, food); } catch (e) { console.error('[snack-rain] mesh', kind, e); mesh = null; }
      if (!mesh) return null;
      if (mesh.userData.baseScale == null) mesh.userData.baseScale = mesh.scale.x;
    }
    mesh.visible = true; mesh.rotation.set(0, 0, 0); mesh.scale.setScalar(mesh.userData.baseScale);
    scene.add(mesh);
    return mesh;
  }
  function give(mesh, key) {
    scene.remove(mesh);
    mesh.visible = false;
    pools.get(key)?.push(mesh);
  }
  function fadeAll() {
    for (const it of live) fading.push({ mesh: it.mesh, key: it.key, t: 0, s0: it.mesh.scale.x });
    live.length = 0;
  }
  function clearAll() {
    for (const it of live) give(it.mesh, it.key);
    for (const f of fading) give(f.mesh, f.key);
    live.length = 0; fading.length = 0;
  }

  function spawn() {
    const kind = pickKind(random(), elapsed, cfg, demonsInARow);
    demonsInARow = kind === 'demon' ? demonsInARow + 1 : 0;
    const food = kind === 'snack' ? foods[Math.floor(random() * foods.length) % foods.length] : null;
    const key = food ? 'snack:' + food : kind;
    const mesh = take(key, kind, food); if (!mesh) return;
    const x = centre + spawnX(random(), area);
    const it = { mesh, kind, food, key, x, y: topY, speed: fallSpeedAt(elapsed, cfg, random()) * worldH, spin: (random() - 0.5) * FEEL.spin, liked: !!(food && deps.isLiked?.(food)) };
    mesh.position.set(x, topY, itemZ);
    live.push(it);
  }

  // ---------------- HUD ----------------
  function pushHud(force) {
    if (!force && clock - hudT < FEEL.hudEvery) return;
    hudT = clock;
    hud.updateMinigame?.({
      score: st.score, streak: st.streak, coins: st.coinsCaught * (cfg.items.coin?.coins || 0),
      multiplier: streakMultiplier(st.streak, cfg.streak),
      timeLeft: Math.max(0, cfg.durationSec - elapsed),
      countdown: phase === 'countdown' ? Math.max(0, Math.ceil(countLeft)) : 0,
      paused, hint, control: deps.getControl?.() || 'touch',
    });
  }

  // ---------------- input ----------------
  function onKey(e) {
    if (phase !== 'play' && phase !== 'countdown') return;
    const down = e.type === 'keydown';
    const k = e.key;
    let dir = 0;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { held.l = down; dir = -1; }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { held.r = down; dir = 1; }
    // Esc leaves the round (early-exit rules, GDD 5.2). The GDD's pause sheet needs a HUD
    // surface that does not exist yet, so Esc mirrors the HUD's exit button for now.
    else if (k === 'Escape' && down) { exit(); e.preventDefault(); e.stopPropagation(); return; }
    else return;
    if (area.lanes && down && !e.repeat) { lane = nearestLane(targetX - centre, area) + dir; targetX = clampTarget(centre + laneX(lane, area)); }
    keyDir = area.lanes ? 0 : (held.r ? 1 : 0) - (held.l ? 1 : 0);
    source = 'keys';
    e.preventDefault(); e.stopPropagation();   // the room manager must not change room
  }

  function setScreenX(x, from) {
    if (phase !== 'play' && phase !== 'countdown') return;
    const s = stage.size, home = getHome();
    v.through.set(home.x, home.y + 1, home.z);
    if (!stage.screenToPlane(x, s.top + s.h / 2, v.through, v.a)) return;
    targetX = area.lanes ? centre + laneX(nearestLane(v.a.x - centre, area), area) : v.a.x;
    targetX = clampTarget(targetX);
    source = from;
  }

  function setPaused(p, by) {
    if (phase === 'idle' || phase === 'result' || phase === 'return') return;
    if (p) {
      if (paused) return;
      paused = true; pausedBy = by;
      held.l = held.r = false; keyDir = 0;
    } else {
      if (!paused || (pausedBy === 'user' && by !== 'user')) return;   // tab return never cancels a user pause
      paused = false; pausedBy = '';
      if (phase === 'play' || phase === 'countdown') runCountdown(cfg.pauseResumeCountdownSec);
    }
    pushHud(true);
  }

  function go() {
    if (phase !== 'countdown' || paused) return;
    phase = 'play';
    if (!hudDriven) sfx.play('go');
    pushHud(true);
  }

  /**
   * 3-2-1. Glaze's `hud.startMinigame` runs the visible countdown and returns a
   * Promise at "go" (sfx via onMinigameTick); when it does, the round starts on
   * that Promise. Without it, this controller counts down on the stage clock.
   */
  function runCountdown(seconds) {
    phase = 'countdown'; countLeft = seconds; lastCount = -1;
    const token = ++countToken;
    let p = null;
    try { p = hud.startMinigame?.({ title: cfg.title, durationSec: cfg.durationSec, countdown: seconds, control: deps.getControl?.() || 'touch' }); } catch (e) { console.error('[snack-rain] hud', e); }
    hudDriven = !!(p && typeof p.then === 'function');
    if (hudDriven) p.then(() => { if (token === countToken) go(); });
    pushHud(true);
  }

  // ---------------- round ----------------
  function begin() {
    const pet = getPet(); if (!pet) return false;
    clearAll();
    measure();
    st = newRoundState();
    elapsed = 0; spawnAcc = 0; sinceSpawn = 99; demonsInARow = 0; paused = false; pausedBy = ''; hint = '';
    petX = pet.object3d.position.x; targetX = clampTarget(getHome().x); lane = area.lanes ? nearestLane(targetX - centre, area) : 0;
    keyDir = 0; held.l = held.r = false; source = 'none'; lastCamX = null; camLostT = 0;
    mood.hold?.('minigame', true);
    runCountdown(cfg.countdownSec);
    mood.say?.(cfg.lines.start, true);
    return true;
  }

  function start() {
    if (phase !== 'idle') return false;
    keyTarget.addEventListener('keydown', onKey, true);
    keyTarget.addEventListener('keyup', onKey, true);
    onStateChange?.(true);
    if (!begin()) { phase = 'countdown'; exit(); return false; }
    return true;
  }

  /**
   * End the round and pay out. Completed: result card. Exited early: no
   * minimum coins, needs scaled by time played, no win line (GDD 5.2).
   */
  function settle(completed) {
    const pet = getPet();
    pet?.setMouthOpen(-1); pet?.lookAt(null);
    const coins = roundCoins(st.score, st.coinsCaught, cfg, completed);
    const prevBest = game.best?.()?.snackRain || 0;
    const best = game.setBest ? game.setBest('snackRain', st.score) : Math.max(prevBest, st.score);
    const total = game.addCoins ? game.addCoins(coins) : 0;
    const d = roundNeedDeltas(cfg, elapsed, Number(persona().playGain) || 1);
    game.bump('fun', d.fun); game.bump('social', d.social); game.bump('hunger', d.hunger);
    onNeedsChanged?.();
    onCoins?.(total);
    game.persist?.();
    return { score: st.score, best, coins, newBest: st.score > prevBest, completed };
  }

  function finish() {
    fadeAll();
    phase = 'result';
    const r = settle(true);
    sfx.play('win');
    mood.say?.(cfg.lines.end, true);
    mood.react?.(r.newBest ? 'joy' : 'smile', 2.2);
    getPet()?.play?.('hop');
    if (hud.showMinigameResult) hud.showMinigameResult({ score: r.score, best: r.best, coins: r.coins });
    else { hud.toast?.(`ได้ ${r.score} คะแนน · +${r.coins} เหรียญ`, 3200); exit(); }
    lastResult = r;
    return r;
  }
  let lastResult = null;

  /** Leave the minigame (result card exit, pause sheet exit, character change). */
  function exit() {
    if (phase === 'idle' || phase === 'return') return;
    if (phase === 'play' || phase === 'countdown') {
      if (elapsed > 0) lastResult = settle(false);
    }
    keyTarget.removeEventListener('keydown', onKey, true);
    keyTarget.removeEventListener('keyup', onKey, true);
    clearAll();
    paused = false; pausedBy = ''; countToken++;
    const pet = getPet();
    pet?.setMouthOpen(-1); pet?.lookAt(null);
    mood.hold?.('minigame', false);
    hud.endMinigame?.();
    returnFrom = pet ? pet.object3d.position.x : 0; returnT = 0;
    phase = pet ? 'return' : 'idle';
    if (phase === 'idle') onStateChange?.(false);
  }

  function catchItem(it) {
    const pet = getPet();
    const r = applyCatch(st, it.kind, cfg, it.liked);
    st = r.state;
    if (it.kind === 'demon') {
      sfx.play('bonk');
      mood.react?.(persona().hurtExpr || 'grumpy', cfg.items.demon.grumpySec);
      pet?.play?.('shake');
      if (clock - demonLineT >= cfg.lines.demonLineCooldownSec && mood.say?.(cfg.lines.demon, true)) demonLineT = clock;
    } else {
      sfx.play(it.kind === 'coin' ? 'coin' : 'catch');
      if (pet && !pet.isBusy?.()) pet.play(it.liked ? 'chew' : 'gulp');
      if (it.liked) mood.react?.('joy', 0.8);
    }
    pushHud(true);
  }

  function movePet(dt) {
    const pet = getPet(); if (!pet) return;
    // the camera eases out during the countdown; re-measure until play (no allocation)
    if (phase === 'countdown' || stage.size.w !== sizeW || stage.size.h !== sizeH) { measure(); targetX = clampTarget(targetX); }
    const cx = getControlX ? getControlX() : null;
    if (cx != null) { camLostT = 0; if (cx !== lastCamX) { lastCamX = cx; setScreenX(cx, 'camera'); } }
    else if (source === 'camera') camLostT += dt;
    const h = source === 'camera' && camLostT > FEEL.handLostSeconds ? lostHint : '';
    if (h !== hint) { hint = h; pushHud(true); }
    if (keyDir) targetX = clampTarget(targetX + keyDir * cfg.move.keySpeed * 2 * area.half * dt);
    petX += (targetX - petX) * (1 - Math.exp(-cfg.move.followPerSec * dt));
    const home = getHome();
    pet.object3d.position.set(petX, home.y, home.z);
  }

  function updatePlay(dt) {
    const pet = getPet(); if (!pet) return;
    elapsed = Math.min(cfg.durationSec, elapsed + dt);
    sinceSpawn += dt;
    spawnAcc = Math.min(1.5, spawnAcc + spawnRate(elapsed, cfg) * dt);
    if (spawnAcc >= 1 && canSpawn(live.length, sinceSpawn, cfg)) { spawnAcc -= 1; sinceSpawn = 0; spawn(); }

    pet.getMouthWorld(v.mouth);
    let nearD = Infinity, near = null, n = 0;
    for (let i = 0; i < live.length; i++) {   // spawn order: two catches in one frame score in order
      const it = live[i];
      it.y -= it.speed * dt;
      it.mesh.position.y = it.y;
      if (it.kind === 'coin') it.mesh.rotation.y += FEEL.coinSpin * dt; else it.mesh.rotation.z += it.spin * dt;
      const dx = it.x - v.mouth.x, dy = it.y - v.mouth.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < cfg.catchRadius && dy > -cfg.catchRadius * 0.5) { catchItem(it); give(it.mesh, it.key); continue; }
      if (it.y < -cfg.itemSize) { st = applyMiss(st, it.kind, cfg); give(it.mesh, it.key); continue; }
      if (it.kind !== 'demon' && dy > -0.2 && d < nearD) { nearD = d; near = it; }
      live[n++] = it;
    }
    live.length = n;
    pet.setMouthOpen(near ? smooth(FEEL.mouthFar, FEEL.mouthNear, nearD) : 0);
    pet.lookAt(near ? near.mesh.position : null);
    pushHud(false);
    if (elapsed >= cfg.durationSec) finish();
  }

  function updateFades(dt) {
    let n = 0;
    for (let i = 0; i < fading.length; i++) {
      const f = fading[i];
      f.t = Math.min(1, f.t + dt / FEEL.fadeSeconds);
      f.mesh.scale.setScalar(Math.max(0.001, f.s0 * (1 - f.t)));
      if (f.t >= 1) give(f.mesh, f.key); else fading[n++] = f;
    }
    fading.length = n;
  }

  return {
    start, exit,
    /** Result card "เล่นอีก": back to the countdown. */
    again() {
      if (phase !== 'result') return;
      begin();
    },
    /** True from start until the pet is back home (normal gestures stay off). */
    get active() { return phase !== 'idle'; },
    get phase() { return phase; },
    get paused() { return paused; },
    get lastResult() { return lastResult; },
    /** Debug / tests snapshot. */
    get state() { return { ...st, elapsed, phase, paused, petX, targetX, source, items: live.length, area: { ...area, centre } }; },
    /** Touch / drag anywhere, or mouse move: follow this client x. */
    pointerX(x) { setScreenX(x, 'pointer'); },
    /**
     * Pause / resume. `by = 'tab'` for visibilitychange (resume shows the
     * pauseResumeCountdownSec countdown); `by = 'user'` for Esc / a pause button.
     */
    setPaused,
    /** Per frame, after gestures and care so the pet pose set here wins. */
    update(dt) {
      clock += dt;
      if (phase === 'idle') return;
      updateFades(dt);
      if (phase === 'return') {
        const pet = getPet(); if (!pet) { phase = 'idle'; onStateChange?.(false); return; }
        returnT = Math.min(1, returnT + dt / FEEL.returnSeconds);
        const k = returnT * returnT * (3 - 2 * returnT);
        const home = getHome();
        pet.object3d.position.set(lerp(returnFrom, home.x, k), home.y, home.z);
        if (returnT >= 1) { phase = 'idle'; onStateChange?.(false); }
        return;
      }
      if (paused || phase === 'result') return;
      if (phase === 'countdown') {
        if (!hudDriven) {
          countLeft -= dt;
          const c = Math.ceil(countLeft);
          if (c !== lastCount && c > 0) { lastCount = c; sfx.play('tick'); pushHud(true); }
          if (countLeft <= 0) go();
        }
        movePet(dt);
        return;
      }
      movePet(dt);
      updatePlay(dt);
    },
    /** Remove listeners and pooled meshes (shared Prop geometry is not disposed). */
    dispose() { exit(); clearAll(); pools.clear(); },
  };
}
