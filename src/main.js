/**
 * Moldable Pet — boot and frame loop.
 * Order (module-contracts.md › Game core): data → stage → room manager →
 * character → HUD → audio → input (pointer + optional hands) → mood/needs loop.
 * Every other module is reached only through its contract API.
 * @module main
 */
import { createStage } from './engine/stage.js';
import { createGameState, safeLocalStorage } from './game/state.js';
import { createRoomManager } from './game/rooms.js';
import { createMood } from './game/mood.js';
import { createCare } from './game/care.js';
import { createTimers } from './game/timers.js';
import { createGestures } from './input/gestures.js';
import { attachPointer } from './input/pointer.js';
import { createHands } from './input/hands.js';
import { createCharacter, CHARACTER_KEYS } from './characters/character.js';
import { createRoom, ROOM_IDS } from './rooms/index.js';
import { createFoodMesh } from './props/foods.js';
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

async function boot() {
  // 1. data
  const [needs, foods, personas] = await Promise.all([loadJSON('needs'), loadJSON('foods'), loadJSON('personas')]);
  const data = { needs, foods, personas };
  const game = createGameState({ data, storage: safeLocalStorage(), roomIds: ROOM_IDS });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = $('app');

  // 2. stage
  const stage = createStage({ container: $('stage'), overlay: $('ov') });
  const timers = createTimers();

  // 3. room manager (first room entered after everything is wired)
  let hud, care, gestures, mood;
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
  }
  spawnPet(game.selected);

  // 5. HUD
  const keys = (Array.isArray(CHARACTER_KEYS) && CHARACTER_KEYS.length ? CHARACTER_KEYS : Object.keys(personas)).filter((k) => personas[k]);
  const selectList = () => keys.map((k) => ({
    key: k, name: personas[k].name,
    role: personas[k].role || ROSTER[k]?.role || '', mbti: personas[k].mbti || ROSTER[k]?.mbti || '',
    locked: personas[k].playable === false,
  }));
  let pointer = null, hands = null, talk = null;
  hud = createHUD($('hud'), {
    onRoom(dirOrId) { rooms.go(dirOrId); },
    onAction(id) {
      if (id === 'flush') care.flush();
      else if (id === 'play') hud.toast('มินิเกมจะมาเร็วๆ นี้', 2200);
    },
    onMic() { toggleTalk(); },
    onCamera() { hands?.toggle(); },
    onSettings() { hud.showSelect(selectList(), game.selected); },
    onSelect(key) { selectCharacter(key); },
    onFoodPointerDown(foodId, e) {
      if (!pointer || !gestures) return;
      const id = pointer.adopt(e);
      gestures.startFoodDrag(id, foodId, e.clientX, e.clientY, stage.now(), e.pointerType === 'mouse' ? 'mouse' : 'touch');
    },
  });
  hud.setCoins(0);
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
  });
  gestures = createGestures({ stage, getPet, care, mood, rooms, canInteract: () => !app.classList.contains('selecting') });
  pointer = attachPointer({ canvas: stage.canvas, gestures, getTime: () => stage.now(), onFirstGesture: unlock });
  hands = createHands({ video: $('cam'), overlay: $('ov'), app, picker: $('cam-select'), stage, hud, gestures, mood, rooms, getTime: () => stage.now() });

  function selectCharacter(key) {
    if (!personas[key] || personas[key].playable === false) return;
    const changed = key !== game.selected || !pet;
    game.select(key);
    if (changed) spawnPet(key);
    gestures.reset();
    care.onCharacterChanged();
    mood.setCharacter(key, stage.time, { greet: true });
    hud.setCharacter({ key, name: personas[key].name });
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
  window.addEventListener('pagehide', flushSave);

  stage.start();
  setLoading(null);
  document.documentElement.dataset.boot = 'ok';

  if (new URLSearchParams(location.search).has('debug')) {
    window.__moldablePet = { data, game, stage, rooms, mood, care, gestures, hands, hud, getPet, selectCharacter };
  }
}

boot().catch((e) => {
  console.error(e);
  document.documentElement.dataset.boot = 'failed';
  setLoading('เปิดเกมไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง', true);
});
