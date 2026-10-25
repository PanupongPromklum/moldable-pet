/**
 * Moldable Pet — boot and frame loop.
 * Order (module-contracts.md › Game core): data → stage → room manager →
 * character → HUD → audio → input (pointer + optional hands) → mood/needs loop.
 * Every other module is reached only through its contract API.
 *
 * Sprint 2 (module-contracts.md › Sprint 2 additions): light/dark theme, the
 * character chip opens the select screen, one-control toilet flow, camera view
 * toggle, outfits (owned / per-character outfit / buy / equip) and the Snack
 * Rain minigame. Every Sprint 2 call into a teammate's module is optional
 * (`?.`) so the build keeps running while pieces land.
 * @module main
 */
import * as THREE from 'three';
import { createStage } from './engine/stage.js';
import { createGameState, safeLocalStorage } from './game/state.js';
import { createRoomManager } from './game/rooms.js';
import { createMood } from './game/mood.js';
import { createCare } from './game/care.js';
import { createTimers } from './game/timers.js';
import { createGestures } from './input/gestures.js';
import { attachPointer } from './input/pointer.js';
import { createHands } from './input/hands.js';
import { equipItem, buyItem, wearReaction } from './game/wardrobe.js';
import { createSnackRain, resolveConfig } from './game/minigames/snack-rain.js';
import { createCharacter, CHARACTER_KEYS } from './characters/character.js';
import * as RoomsMod from './rooms/index.js';
import { createFoodMesh, FOOD_SIZE } from './props/foods.js';
import { createHUD } from './ui/hud.js';
import { sfx } from './audio/sfx.js';
import { createTalkback } from './audio/talkback.js';

/** Select-screen roles and MBTI (design/narrative/character-bible.md), used when personas.json has none. */
const ROSTER = {
  splat: { role: 'CI / Branding', mbti: 'INFJ' },
  pill: { role: 'เร็วๆ นี้', mbti: '—' },
  gumdrop: { role: 'CEO', mbti: 'ENFJ' },
  diamond: { role: 'UI / Motion', mbti: 'ISFJ' },
  cloud: { role: 'Handoff / Dev', mbti: 'INFJ' },
  flower: { role: 'UX / CX', mbti: 'ENFP' },
};
const TIMING = { needsTickSeconds: 1, hudNeedsSeconds: 0.2, saveSeconds: 5 };
const { createRoom, ROOM_IDS } = RoomsMod;
/** Slot labels used when wardrobe.json has not landed (contract names). */
const SLOT_LABELS = { head: { label: 'หัว' }, eyes: { label: 'ตา' }, body: { label: 'ตัว' } };
/**
 * Camera framing during Snack Rain (presentation, not balance): extra world
 * width that must fit across the screen, so on a phone the pet gets room to
 * travel (~5.6 units visible at 390 px instead of 2.8). Desktop is height-bound
 * and barely changes. Eased over `frameSeconds`.
 */
const MINIGAME_VIEW = { extraWidth: 2.6, frameSeconds: 0.45 };
/** HUD bands: normal play vs Snack Rain (the pet sits lower so snacks fall through most of the screen). */
const HUD_RESERVE = { normal: { top: 120, bottom: 160 }, minigame: { top: 260, bottom: 30 } };
const THEME_COLOR = { light: '#F5F5F5', dark: '#1E1E1E' };

const $ = (id) => document.getElementById(id);

async function loadJSON(name) {
  const res = await fetch(new URL(`../assets/data/${name}.json`, import.meta.url));
  if (!res.ok) throw new Error(`${name}.json ${res.status}`);
  return res.json();
}

function setLoading(text, failed = false) {
  const el = $('loading');
  if (!el) return;
  if (text == null) { el.classList.add('done'); setTimeout(() => { el.hidden = true; }, 400); return; }
  el.hidden = false; el.classList.toggle('failed', failed);
  const t = el.querySelector('[data-text]') || el;
  t.textContent = text;
}

/** Data file that may not exist yet (Sprint 2 files): null instead of failing boot. */
async function loadOptional(name) {
  try { return await loadJSON(name); } catch (e) { console.warn(`[data] ${name}.json not loaded, using defaults`, e.message); return null; }
}

/** Prop's stage light preset for a theme (`ROOM_THEME_LIGHTS`), same shape as stage STAGE_LIGHTS. */
function propLights(theme) { return RoomsMod.ROOM_THEME_LIGHTS?.[theme]; }

/** Fallback minigame meshes while src/props/minigame.js has not landed. */
function fallbackMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'coin') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 24), new THREE.MeshStandardMaterial({ color: 0xF2C978, roughness: 0.55 }));
    m.rotation.x = Math.PI / 2; g.add(m);
  } else {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), new THREE.MeshStandardMaterial({ color: 0xB59ACB, roughness: 0.8 }));
    m.scale.set(1.1, 0.9, 1); g.add(m);
  }
  return g;
}

async function boot() {
  // 1. data
  const [needs, foods, personas, wardrobe, minigames, propMini] = await Promise.all([
    loadJSON('needs'), loadJSON('foods'), loadJSON('personas'), loadOptional('wardrobe'), loadOptional('minigames'),
    import('./props/minigame.js').catch(() => null),
  ]);
  const data = { needs, foods, personas, wardrobe, minigames };
  const game = createGameState({ data, storage: safeLocalStorage(), roomIds: ROOM_IDS });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = $('app');

  // 2. stage
  const stage = createStage({ container: $('stage'), overlay: $('ov'), hudReserve: HUD_RESERVE.normal });
  const timers = createTimers();

  // 3. room manager (first room entered after everything is wired)
  let hud, care, gestures, mood, hands = null, minigame = null;
  const rooms = createRoomManager({
    scene: stage.scene, createRoom, roomIds: ROOM_IDS, reduceMotion,
    onEnter(room, id) {
      game.setRoom(id);
      // keep a toilet (or other drop zone) on screen next to the pet on narrow phones
      const zone = room.dropZones?.toilet;
      if (zone) {
        const mid = room.petSpot.clone().lerp(zone.position, 0.5); mid.y = room.petSpot.y;
        stage.setFocus(mid, Math.abs(zone.position.x - room.petSpot.x) + zone.radius);
      } else stage.setFocus(room.petSpot);
      gestures?.reset();
      care?.onRoomChanged(room, id);
      hud?.setRoom(id);
      game.persist();
    },
  });

  // 4. character
  let pet = null;
  const getPet = () => pet;
  function spawnPet(key) {
    if (pet) { stage.scene.remove(pet.object3d); pet.dispose(); }
    pet = createCharacter(key);
    stage.scene.add(pet.object3d);
    const spot = rooms.room?.petSpot;
    if (spot) pet.object3d.position.copy(spot);
    applyOutfit();
  }
  /** Put the selected character's saved outfit on (Clay's setOutfit, optional). */
  function applyOutfit() {
    const o = game.outfit();
    try { if (o) pet?.setOutfit?.(o); } catch (e) { console.error('[outfit]', e); }
  }
  spawnPet(game.selected);

  // 5. HUD
  const keys = (Array.isArray(CHARACTER_KEYS) && CHARACTER_KEYS.length ? CHARACTER_KEYS : Object.keys(personas)).filter((k) => personas[k]);
  const selectList = () => keys.map((k) => ({
    key: k, name: personas[k].name,
    role: personas[k].role || ROSTER[k]?.role || '', mbti: personas[k].mbti || ROSTER[k]?.mbti || '',
    locked: personas[k].playable === false,
  }));
  let pointer = null, talk = null;
  const handlers = {
    onRoom(dirOrId) { if (!minigame?.active) rooms.go(dirOrId); },
    onAction(id) {
      if (id === 'flush') care.flush();
      else if (id === 'play') startMinigame();
    },
    onMic() { toggleTalk(); },
    onCamera() { hands?.toggle(); },
    /** Camera view toggle "ซ่อนภาพกล้อง / แสดงภาพกล้อง"; no arg = flip. */
    onCameraView(hidden) { hands?.setView(typeof hidden === 'boolean' ? hidden : !hands.hidden); },
    /** Character chip (avatar + name, top-left) opens the select screen. */
    onCharacterChip() { if (!minigame?.active) hud.showSelect(selectList(), game.selected); },
    onSelect(key) { selectCharacter(key); },
    onWardrobe() { openWardrobe(); },
    onEquip(slot, id) { equip(slot, id ?? null); },
    onBuy(id) { buy(id); },
    onMinigameExit() { minigame?.exit(); },
    /** HUD countdown 3, 2, 1, then 0 = go. */
    onMinigameTick(n) { sfx.play(n > 0 ? 'tick' : 'go'); },
    onMinigameAgain() { minigame?.again(); },
    onFoodPointerDown(foodId, e) {
      if (!pointer || !gestures) return;
      const id = pointer.adopt(e);
      gestures.startFoodDrag(id, foodId, e.clientX, e.clientY, stage.now(), e.pointerType === 'mouse' ? 'mouse' : 'touch');
    },
  };
  hud = createHUD($('hud'), handlers);
  hud.setCoins(game.coins);
  hud.setCameraView?.(!!game.settings.cameraHidden);
  hud.setFoods(foods.foods.map((f) => ({ id: f.id, name: f.name })));
  hud.setCamera('off', '');
  hud.setMic('off');
  hud.setCharacter({ key: game.selected, name: personas[game.selected]?.name || '' });

  // 6. audio
  let unlocked = false;
  const unlock = () => { if (unlocked) return; unlocked = true; try { sfx.unlock(); } catch { /* ignore */ } };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
  let talkState = 'off';
  talk = createTalkback({
    onState(s) {
      if (talkState === 'playing' && s !== 'playing') mood.onTalkPhrase(stage.time);
      mood?.hold('talk', s === 'playing');
      talkState = s;
      hud.setMic(s);
      if (s !== 'playing') pet?.setTalkLevel(0);
    },
    onLevel(level) { pet?.setTalkLevel(level); },
  });
  async function toggleTalk() {
    unlock();
    try {
      if (talk.isOn()) talk.stop();
      else await talk.start();
    } catch (e) {
      console.warn('talkback', e);
      hud.setMic('off');
      hud.toast(e && e.name === 'NotAllowedError' ? 'ยังไม่ได้อนุญาตให้ใช้ไมค์ ลองอนุญาตที่แถบที่อยู่ของเบราว์เซอร์' : 'เปิดไมค์ไม่ได้ในเบราว์เซอร์นี้', 3200);
    }
  }

  // 7. mood + care + input
  mood = createMood({ data, game, hud, sfx, timers, getPet });
  let lastHudNeeds = -9;
  const pushNeeds = () => { const n = game.needs(); if (n) hud.setNeeds(n); };
  care = createCare({
    stage, data, game, hud, sfx, mood, timers, getPet,
    getRoom: () => rooms.room, getRoomId: () => rooms.id,
    createFoodMesh, onNeedsChanged: pushNeeds,
    isPaused: () => !!minigame?.active,
    onToiletStage(st) { app.classList.toggle('toilet-sitting', st === 'sitting' || st === 'flushing'); },
  });
  gestures = createGestures({ stage, getPet, care, mood, rooms, canInteract: () => !app.classList.contains('selecting') && !minigame?.active });
  pointer = attachPointer({ canvas: stage.canvas, gestures, getTime: () => stage.now(), onFirstGesture: unlock });
  hands = createHands({
    video: $('cam'), overlay: $('ov'), app, picker: $('cam-select'), stage, hud, gestures, mood, rooms, getTime: () => stage.now(),
    cameraHidden: !!game.settings.cameraHidden,
    onView(hidden) { game.setSetting('cameraHidden', hidden); game.persist(); hud.setCameraView?.(hidden); },
  });

  // 7b. theme: prefers-color-scheme (live), ?theme=light|dark overrides for testing
  const themeParam = new URLSearchParams(location.search).get('theme');
  const darkMq = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const t = themeParam === 'dark' || themeParam === 'light' ? themeParam : darkMq.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    rooms.setTheme(t);
    stage.setTheme(t, propLights(t));
    hands.setTheme(t);
    // the two media-scoped metas already follow the OS; a ?theme override pins both
    if (themeParam) for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute('content', THEME_COLOR[t]);
  }
  if (darkMq.addEventListener) darkMq.addEventListener('change', applyTheme); else darkMq.addListener?.(applyTheme);
  applyTheme();

  // 7c. wardrobe (owned shared, outfit per character)
  const wardrobeView = () => ({
    slots: data.wardrobe?.slots || SLOT_LABELS, items: data.wardrobe?.items || [],
    owned: game.owned.slice(), outfit: { ...game.outfit() }, coins: game.coins, charKey: game.selected,
  });
  function openWardrobe() {
    if (minigame?.active) return;
    if (!hud.showWardrobe) { hud.toast('ตู้เสื้อผ้ากำลังมา', 2200); return; }
    if (!data.wardrobe) hud.toast('ยังโหลดรายการชุดไม่ได้ ลองรีเฟรชอีกครั้ง', 2600);
    hud.showWardrobe(wardrobeView());
  }
  /** Equip (economy GDD 3.5). Tapping the item already worn empties the slot. */
  function equip(slot, id) {
    if (id && game.outfit()?.[slot] === id) id = null;
    const r = equipItem(game.outfit(), slot, id, game.owned, data.wardrobe);
    if (!r.ok) { hud.updateWardrobe?.({ outfit: { ...game.outfit() } }); return false; }
    game.setOutfit(r.outfit);
    applyOutfit();
    sfx.play('equip');
    hud.updateWardrobe?.({ outfit: { ...r.outfit } });
    if (r.item) {
      const now = game.now();
      const rx = wearReaction(r.item, game.selected, data.wardrobe, game.wearBonusAt(), now);
      if (rx.bonus) { game.bump('social', rx.social); game.bump('fun', rx.fun); game.setWearBonusAt(now); pushNeeds(); }
      mood.say(rx.line, true);
      const fr = personas[game.selected]?.foodReaction?.[rx.kind];
      mood.react(fr?.expr || (rx.kind === 'like' ? 'joy' : 'smile'), 1.6);
      if (pet && !pet.isBusy()) pet.play(fr?.action || (rx.kind === 'like' ? 'hop' : 'nod'));
    }
    game.persist();
    return true;
  }
  function buy(id) {
    const r = buyItem({ coins: game.coins, owned: game.owned }, id, data.wardrobe);
    if (!r.ok) {
      if (r.reason === 'coins') {
        hud.updateWardrobe?.({ coins: game.coins, error: { id, reason: 'coins', price: r.price } });
        hud.toast(`เหรียญยังไม่พอ ต้องใช้ ${r.price} เหรียญ`, 2600);
      }
      return false;   // 'owned': a second fast press is ignored (economy GDD 5.5)
    }
    game.setPurse(r.coins, r.owned);
    hud.setCoins(r.coins);
    sfx.play('buy');
    mood.say('buy', true);
    hud.updateWardrobe?.({ owned: r.owned.slice(), coins: r.coins });
    equip(r.item.slot, id);   // a bought item goes on at once
    game.persist();
    return true;
  }

  // 7d. Snack Rain
  const { cfg: snackCfg, missing } = resolveConfig(data.minigames?.snackRain);
  if (missing.length && data.minigames) console.warn('[snack-rain] minigames.json missing keys, defaults used:', missing.join(', '));
  const foodIds = foods.foods.map((f) => f.id);
  const ORIGIN = new THREE.Vector3();
  const sized = (mesh, native) => { mesh.scale.setScalar(snackCfg.itemSize / (native || snackCfg.itemSize)); mesh.userData.baseScale = mesh.scale.x; return mesh; };
  minigame = createSnackRain({
    stage, game, hud, sfx, mood, getPet, cfg: snackCfg, foodIds,
    getHome: () => rooms.room?.petSpot || ORIGIN,
    getHandX: () => hands.primaryX(),
    getPersona: () => personas[game.selected],
    isLiked: (foodId) => (foods.likes?.[game.selected] || []).includes(foodId),
    makeMesh(kind, foodId) {
      if (kind === 'coin') return propMini?.createCoinMesh ? sized(propMini.createCoinMesh(), propMini.COIN_SIZE) : sized(fallbackMesh('coin'), 0.4);
      if (kind === 'demon') return propMini?.createDemonMesh ? sized(propMini.createDemonMesh(), propMini.DEMON_SIZE) : sized(fallbackMesh('demon'), 0.5);
      return sized(createFoodMesh(foodId || 'onigiri'), FOOD_SIZE);
    },
    onNeedsChanged: pushNeeds,
    onCoins(n) { hud.setCoins(n); },
    onStateChange(active) {
      frame.to = active ? MINIGAME_VIEW.extraWidth : 0; frame.from = frame.now; frame.t = 0;
      stage.setHudReserve(active ? HUD_RESERVE.minigame : HUD_RESERVE.normal);
      app.classList.toggle('minigame', active);
      hands.setPassive(active);
      gestures.reset();
      if (active) care.clearCoach(); else care.syncControls();
    },
  });
  const frame = { now: 0, from: 0, to: 0, t: 1 };
  /** Ease the camera framing toward `frame.to` (only while it changes). */
  function updateFrame(dt) {
    if (frame.t >= 1) return;
    frame.t = Math.min(1, frame.t + dt / MINIGAME_VIEW.frameSeconds);
    const k = frame.t * frame.t * (3 - 2 * frame.t);
    frame.now = frame.from + (frame.to - frame.from) * k;
    const spot = rooms.room?.petSpot;
    if (spot) stage.setFocus(spot, frame.now);
  }
  function startMinigame() {
    if (minigame.active || rooms.id !== 'living' || rooms.moving || care.carrying) return;
    hud.hideWardrobe?.();
    gestures.reset();
    unlock();
    minigame.start();
  }
  // drag / touch anywhere, or mouse move: the pet follows x (normal gestures are off)
  window.addEventListener('pointerdown', (e) => { if (minigame.active && !hud.isHudPoint?.(e.clientX, e.clientY)) minigame.pointerX(e.clientX); }, { passive: true });
  window.addEventListener('pointermove', (e) => { if (minigame.active && (e.pointerType === 'mouse' || e.buttons)) minigame.pointerX(e.clientX); }, { passive: true });

  function selectCharacter(key) {
    if (!personas[key] || personas[key].playable === false) return;
    if (minigame.active) minigame.exit();
    const changed = key !== game.selected || !pet;
    game.select(key);
    if (changed) spawnPet(key);
    gestures.reset();
    care.onCharacterChanged();
    mood.setCharacter(key, stage.time, { greet: true });
    hud.setCharacter({ key, name: personas[key].name });
    if (!changed) applyOutfit();
    hud.updateWardrobe?.({ outfit: { ...game.outfit() }, charKey: key });
    pushNeeds();
    hud.hideSelect();
    app.classList.remove('selecting');
    game.persist();
  }

  // 8. needs loop: wall-clock decay + return after absence + autosave
  const backMs = needs.backAfterMinutes * 60000;
  const startInfo = game.tick();
  rooms.go(game.room);
  const returning = !game.fresh && game.chosen && startInfo.gapMs >= backMs;
  mood.setCharacter(game.selected, 0, { greet: !returning && game.chosen });
  if (returning) mood.returnAfterAbsence(0);
  pushNeeds();
  if (!game.chosen) { app.classList.add('selecting'); hud.showSelect(selectList(), game.selected); }

  let needsT = 0, saveT = 0;
  stage.onTick((dt, time) => {
    timers.update(time);
    hands.update(time);
    gestures.update(dt, time);
    care.update(dt, time);
    updateFrame(dt);
    minigame.update(dt, time);
    if (minigame.active || app.classList.contains('minigame')) mood.keepAwake?.(time);
    mood.update(dt, time);
    pet?.update(dt, time);
    rooms.update(dt, time);
    if (time - needsT >= TIMING.needsTickSeconds) {
      needsT = time;
      const info = game.tick();
      if (info.gapMs >= backMs && game.chosen) mood.returnAfterAbsence(time);
    }
    if (time - lastHudNeeds >= TIMING.hudNeedsSeconds) { lastHudNeeds = time; pushNeeds(); }
    if (time - saveT >= TIMING.saveSeconds) { saveT = time; game.persist(); }
  });
  const head = { x: 0, y: 0 };
  let headV = null;
  stage.onAfterRender(() => {
    hands.draw();
    if (!pet) return;
    headV = headV || pet.object3d.position.clone();
    pet.getHeadTopWorld(headV);
    stage.worldToScreen(headV, head);
    hud.placeBubble(head.x, head.y);
  });

  const flushSave = () => { game.tick(); game.persist(); };
  document.addEventListener('visibilitychange', () => {
    minigame.setPaused(document.hidden);
    if (document.hidden) flushSave();
  });
  window.addEventListener('pagehide', flushSave);

  stage.start();
  setLoading(null);
  document.documentElement.dataset.boot = 'ok';

  if (new URLSearchParams(location.search).has('debug')) {
    window.__moldablePet = { data, game, stage, rooms, mood, care, gestures, hands, hud, getPet, selectCharacter, minigame, startMinigame, equip, buy, openWardrobe, snackCfg };
  }
}

boot().catch((e) => {
  console.error(e);
  document.documentElement.dataset.boot = 'failed';
  setLoading('เปิดเกมไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง', true);
});
