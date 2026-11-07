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
 *
 * Sprint 3 (module-contracts.md › Sprint 3 additions): manual light/dark lamp
 * (saved `settings.theme`, the system scheme no longer decides), Snack Rain
 * intro card with the control choice (touch / head tilt via `input/head.js`,
 * saved `settings.minigameControl`), head-stroke petting (gestures).
 *
 * Sprint 4 (module-contracts.md › Sprint 4 additions): baked static scenery
 * (stage bake source = the room manager), furniture state in save v4
 * (`game/furniture.js`), the "แต่งห้อง" shop (preview / buy / equip / close
 * reverts unbought previews), lazily rendered shop thumbnails
 * (`engine/thumbs.js`), Christmas outfits through the wardrobe data.
 *
 * Sprint 5 (module-contracts.md › Sprint 5 additions): save v5, growth +
 * raised personality (`game/growth.js` fed from care / minigame / wardrobe /
 * decor / conversation events), the minigame picker over the registry
 * (`game/minigames/index.js`: snackRain, mimic, bubbles, hop; best per
 * character per game, lastGame, favourites), and conversation (`game/talk.js`:
 * one talk turn per mic press with Echo's listener / brain / babble, typed chat,
 * talk-back fallback, mic mode sheet, one-time privacy notice).
 * @module main
 */
import * as THREE from 'three';
import { createStage } from './engine/stage.js';
import { createGameState, safeLocalStorage, SAVE_KEY } from './game/state.js';
import { createRoomManager } from './game/rooms.js';
import { createMood } from './game/mood.js';
import { createCare } from './game/care.js';
import { createTimers } from './game/timers.js';
import { createGestures } from './input/gestures.js';
import { attachPointer } from './input/pointer.js';
import { createHands } from './input/hands.js';
import { createHeadControl } from './input/head.js';
import { equipItem, buyItem, wearReaction } from './game/wardrobe.js';
import { equipFurniture, revertPartial, decorView, findFurniture, isXmas } from './game/furniture.js';
import { createThumbnails } from './engine/thumbs.js';
import { resolveConfig } from './game/minigames/snack-rain.js';
import * as MinigamesMod from './game/minigames/index.js';
import { growthCfg } from './game/state.js';
import { createGrowth } from './game/growth.js';
import { createTalk } from './game/talk.js';
import { createCloud } from './game/cloud.js';
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
/** Snack Rain control choices for the intro card (labels: glaze's copy in hud.js wins when these are absent). */
const MINIGAME_CONTROLS = [
  { id: 'touch', label: 'นิ้ว / เมาส์', hint: 'ลากนิ้วหรือขยับเมาส์ซ้ายขวา' },
  { id: 'head', label: 'เอียงหัว', hint: 'ใช้กล้อง เอียงหัวซ้ายขวา' },
];
const MSG = {
  headFail: 'เปิดกล้องไม่ได้ ใช้นิ้วเล่นแทนนะ',
  headOpening: 'กำลังเปิดกล้อง… ครั้งแรกต้องโหลดโมเดลสักครู่',
};

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
  const [needs, foods, personas, wardrobe, minigames, furnitureCat, propMini, growthJson, conversation, cloudCfg] = await Promise.all([
    loadJSON('needs'), loadJSON('foods'), loadJSON('personas'), loadOptional('wardrobe'), loadOptional('minigames'),
    loadOptional('furniture'), import('./props/minigame.js').catch(() => null), loadOptional('growth'), loadOptional('conversation'), loadOptional('cloud'),
  ]);
  const data = { needs, foods, personas, wardrobe, minigames, furniture: furnitureCat, growth: growthJson, conversation };
  const gcfg = growthCfg(data);
  const game = createGameState({ data, storage: safeLocalStorage(), roomIds: ROOM_IDS });
  let hudRef = null;
  const cloud = createCloud({ cfg: cloudCfg || {}, storageKey: SAVE_KEY, getSave: () => game.save,
    onChange: (st) => hudRef?.setAccount?.(st), toast: (m) => hudRef?.toast?.(m, 3200) });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = $('app');

  // 2. stage
  const stage = createStage({ container: $('stage'), overlay: $('ov'), hudReserve: HUD_RESERVE.normal });
  const timers = createTimers();

  // 3. room manager (first room entered after everything is wired)
  let hud, care, gestures, mood, hands = null, minigame = null, growth = null, talkCtl = null;
  /** Sheets that block a growth card (GDD 3.3): wardrobe, decor, picker, intro, select. */
  const sheets = { wardrobe: false, picker: false, intro: false };
  let gameId = 'snackRain', backToPicker = false;
  const rooms = createRoomManager({
    scene: stage.scene, createRoom, roomIds: ROOM_IDS, reduceMotion,
    getFurniture: (id) => game.furniture(id),
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
    // the shop belongs to one room: revert its previews on the room that is leaving
    onLeave() { if (decorOpen) closeDecor(); },
  });
  // bake the active room's staticGroup (engine/bake.js); live while sliding between rooms
  stage.setBakeSource?.({ getRoom: () => rooms.room, isMoving: () => rooms.moving });

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
    growth?.refreshLook(true);
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
    ...(growth?.info(k) || {}),   // { stage, stageLabel, progress, hint, trait, traitLabel } (growth GDD 3.6)
  }));
  /** Chip: name + stage ring (Sprint 5). */
  const chipInfo = (k = game.selected) => {
    const i = growth?.info(k) || {};
    return { key: k, name: personas[k]?.name || '', stage: i.stage, stageLabel: i.stageLabel, progress: i.progress };
  };
  let pointer = null, talk = null;
  const handlers = {
    onRoom(dirOrId) { if (!minigame?.active) rooms.go(dirOrId); },
    onAction(id) {
      if (id === 'flush') care.flush();
      else if (id === 'play') openPicker();
    },
    /** Picker card → that game's intro card (minigames-2 GDD 3.1 step 3). */
    onMinigamePick(id) { pickGame(id); },
    onMinigamePickerClose() { sheets.picker = false; hud.hideMinigamePicker?.(); },
    /** Result card "เกมอื่น": leave the round, then the picker again. */
    onMinigameOther() { if (minigame.active) { backToPicker = true; minigame.exit(); } else openPicker(); },
    /** Intro "โหมดสบายๆ" switch, saved per game. */
    onMinigameRelaxed(on) { game.setRelaxed(gameId, !!on); game.persist(); },
    onMimicPad(id) { minigame.pad?.(id); },
    onGrowthCardClose() { growth?.onCardClose(); hud.hideGrowthCard?.(); },
    onWardrobeClose() { sheets.wardrobe = false; },
    onMicLongPress() { talkCtl.openSheet(); },
    onTalkMode(mode) { talkCtl.setMode(mode); hud.setTalkMode?.(mode === 'echo' ? 'echo' : 'talk'); },
    onTalkNoticeOk() { talkCtl.noticeOk(); },
    onTalkNoticeEcho() { talkCtl.noticeEcho(); },
    onTalkNoticeClose() { hud.hideTalkNotice?.(); },
    onTypeOpen() { talkCtl.openTypeBox(); },
    onTypeSend(text) { return talkCtl.typed(text); },
    /** Lamp button: "ปิดไฟ" (dark) / "เปิดไฟ" (light), saved. */
    onThemeToggle() { setTheme(game.settings.theme === 'dark' ? 'light' : 'dark', true); },
    /** Intro card: control picked ('touch' | 'head'), saved. */
    onMinigameControl(id) { game.setSetting('minigameControl', id); game.persist(); },
    /** Intro card "เริ่มเลย". */
    onMinigameReady() { readyMinigame(); },
    onMic() { talkCtl.press(); },
    onCamera() { hands?.toggle(); },
    /** Camera view toggle "ซ่อนภาพกล้อง / แสดงภาพกล้อง"; no arg = flip. */
    onCameraView(hidden) { hands?.setView(typeof hidden === 'boolean' ? hidden : !hands.hidden); },
    /** Character chip (avatar + name, top-left) opens the select screen. */
    onCharacterChip() { if (!minigame?.active) hud.showSelect(selectList(), game.selected); },
    onSelect(key) { selectCharacter(key); },
    onCloudSignIn() { cloud.signIn(); },
    onCloudSignOut() { cloud.signOut(); },
    onWardrobe() { openWardrobe(); },
    onEquip(slot, id) { equip(slot, id ?? null); },
    onBuy(id) { buy(id); },
    onDecor() { openDecor(); },
    onDecorPreview(slot, id) { decorPreview(slot, id ?? null); },
    onDecorEquip(slot, id) { decorEquip(slot, id); },
    onDecorBuy(id) { decorBuy(id); },
    onDecorClose() { closeDecor(false); },
    onMinigameExit() { if (headStarting) headCancel = true; sheets.intro = false; backToPicker = false; minigame?.exit(); },
    /** HUD countdown 3, 2, 1, then 0 = go. */
    onMinigameTick(n) { sfx.play(n > 0 ? 'tick' : 'go'); },
    onMinigameAgain() { minigame?.again(); },
    onFoodPointerDown(foodId, e) {
      if (!pointer || !gestures) return;
      const id = pointer.adopt(e);
      gestures.startFoodDrag(id, foodId, e.clientX, e.clientY, stage.now(), e.pointerType === 'mouse' ? 'mouse' : 'touch');
    },
  };
  // <html data-theme> must be right before the HUD reads it (index.html sets it from the save too)
  const themeParam = new URLSearchParams(location.search).get('theme');
  const bootTheme = themeParam === 'dark' || themeParam === 'light' ? themeParam : game.settings.theme;
  document.documentElement.dataset.theme = bootTheme;
  hud = createHUD($('hud'), handlers);
  hudRef = hud;
  hud.setCoins(game.coins);
  hud.setCameraView?.(!!game.settings.cameraHidden);
  hud.setFoods(foods.foods.map((f) => ({ id: f.id, name: f.name })));
  hud.setCamera('off', '');
  hud.setMic('off');
  hud.setCharacter(chipInfo());
  hud.setTalkMode?.(game.settings.talkMode === 'echo' ? 'echo' : 'talk');

  // 6. audio
  let unlocked = false;
  const unlock = () => { if (unlocked) return; unlocked = true; try { sfx.unlock(); } catch { /* ignore */ } };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
  let talkState = 'off';
  talk = createTalkback({
    getPitchOffset: () => sfx.getPitchOffset?.() || 0,
    onState(s) {
      if (talkState === 'playing' && s !== 'playing') mood.onTalkPhrase(stage.time);
      mood?.hold('talk', s === 'playing');
      talkState = s;
      hud.setMic(s);
      if (s !== 'playing') pet?.setTalkLevel(0);
    },
    onLevel(level) { pet?.setTalkLevel(level); },
  });

  // 7. mood + care + input
  mood = createMood({
    data, game, hud, sfx, timers, getPet,
    onCare: (ev, amount) => growth?.care(ev, amount),
    getVoice: () => growth?.voice() || null,
  });
  let lastHudNeeds = -9;
  const pushNeeds = () => { const n = game.needs(); if (n) hud.setNeeds(n); };
  care = createCare({
    stage, data, game, hud, sfx, mood, timers, getPet,
    getRoom: () => rooms.room, getRoomId: () => rooms.id,
    createFoodMesh, onNeedsChanged: pushNeeds,
    onCare: (ev) => growth?.care(ev),
    isPaused: () => !!minigame?.active,
    onToiletStage(st) { app.classList.toggle('toilet-sitting', st === 'sitting' || st === 'flushing'); },
  });
  gestures = createGestures({ stage, getPet, care, mood, rooms, actions: needs.actions, canInteract: () => !app.classList.contains('selecting') && !minigame?.active });
  pointer = attachPointer({ canvas: stage.canvas, gestures, getTime: () => stage.now(), onFirstGesture: unlock });
  hands = createHands({
    video: $('cam'), overlay: $('ov'), app, picker: $('cam-select'), stage, hud, gestures, mood, rooms, getTime: () => stage.now(),
    cameraHidden: !!game.settings.cameraHidden,
    onView(hidden) { game.setSetting('cameraHidden', hidden); game.persist(); hud.setCameraView?.(hidden); },
  });

  // 7b. theme (Sprint 3 #2): manual lamp, saved in settings.theme (default light).
  // The system colour scheme never decides; ?theme=light|dark pins one for tests (not saved).
  /**
   * Apply a theme everywhere in one tick: <html data-theme>, color-scheme and
   * theme-color metas, current + future rooms, stage lights, soft hands, lamp.
   * @param {'light'|'dark'} theme @param {boolean} [save]
   */
  function setTheme(theme, save = false) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    for (const meta of document.querySelectorAll('meta[name="color-scheme"]')) meta.setAttribute('content', `only ${t}`);
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) { meta.removeAttribute('media'); meta.setAttribute('content', THEME_COLOR[t]); }
    rooms.setTheme(t);          // the room manager also creates every new room in this theme
    stage.setTheme(t, propLights(t));
    try { RoomsMod.applyStageLights?.(t, stage.lights); } catch (e) { console.error('[theme] stage lights', e); }
    hands.setTheme(t);
    hud.setTheme?.(t);
    if (save) { game.setSetting('theme', t); game.persist(); }
  }
  setTheme(bootTheme);

  // 7c. wardrobe (owned shared, outfit per character)
  const wardrobeView = () => ({
    slots: data.wardrobe?.slots || SLOT_LABELS, items: data.wardrobe?.items || [],
    owned: game.owned.slice(), outfit: { ...game.outfit() }, coins: game.coins, charKey: game.selected,
    themes: data.wardrobe?.themes || null,
  });
  function openWardrobe() {
    if (minigame?.active) return;
    closeDecor();
    if (!hud.showWardrobe) { hud.toast('ตู้เสื้อผ้ากำลังมา', 2200); return; }
    if (!data.wardrobe) hud.toast('ยังโหลดรายการชุดไม่ได้ ลองรีเฟรชอีกครั้ง', 2600);
    sheets.wardrobe = true;
    hud.showWardrobe(wardrobeView());
  }
  /** Equip (economy GDD 3.5). Tapping the item already worn empties the slot. */
  function equip(slot, id) {
    if (id && game.outfit()?.[slot] === id) id = null;
    const r = equipItem(game.outfit(), slot, id, game.owned, data.wardrobe);
    if (!r.ok) { hud.updateWardrobe?.({ outfit: { ...game.outfit() } }); return false; }
    game.setOutfit(r.outfit);
    applyOutfit();
    if (r.item) growth?.care('equip');
    sfx.play('equip');
    if (isXmas(r.item)) sfx.play('jingle');
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
    growth?.care('buy');
    sfx.play('buy');
    mood.say('buy', true);
    hud.updateWardrobe?.({ owned: r.owned.slice(), coins: r.coins });
    equip(r.item.slot, id);   // a bought item goes on at once
    game.persist();
    return true;
  }

  // 7c2. furniture shop "แต่งห้อง" (Sprint 4). Furniture is shared by every
  // character; previews live only in the room object until bought / equipped.
  const thumbs = typeof RoomsMod.createFurniturePreview === 'function'
    ? createThumbnails({ stage, createPreview: (id, o) => RoomsMod.createFurniturePreview(id, o) }) : null;
  let decorOpen = false;
  const decorData = () => decorView(data.furniture, rooms.id, {
    owned: game.owned, furniture: game.furniture(rooms.id), coins: game.coins,
    thumbOf: (id) => thumbs?.get(id) || null, fallbackSlots: RoomsMod.FURNITURE_SLOTS?.[rooms.id] || [],
  });
  thumbs?.onReady(() => { if (decorOpen) hud.updateDecor?.({ items: decorData().items }); });
  function openDecor() {
    if (minigame?.active || rooms.moving) return;
    if (!hud.showDecor) { hud.toast('ร้านแต่งห้องกำลังมา', 2200); return; }
    if (!data.furniture) { hud.toast('ยังโหลดรายการของแต่งห้องไม่ได้ ลองรีเฟรชอีกครั้ง', 2600); return; }
    hud.hideWardrobe?.(); sheets.wardrobe = false;
    const view = decorData();
    decorOpen = true;
    hud.showDecor(view);
    thumbs?.request(view.items.map((it) => it.id));
  }
  /** Put every slot of the current room back to the saved furniture (unbought / unequipped previews). */
  function revertPreviews() {
    const room = rooms.room;
    if (!room?.setFurniture) return;
    const back = revertPartial(room.furniture, game.furniture(rooms.id));
    if (back) { try { room.setFurniture(back); } catch (e) { console.error('[decor] revert', e); } }
  }
  /** @param {boolean} hide also close the sheet (wire-initiated) */
  function closeDecor(hide = true) {
    if (!decorOpen) return;
    decorOpen = false;
    revertPreviews();
    if (hide) hud.hideDecor?.();
  }
  function decorPreview(slot, id) {
    const room = rooms.room;
    if (!decorOpen || !room?.setFurniture) return;
    const want = id ?? game.furniture(rooms.id)[slot];
    if (!want) return;
    const it = findFurniture(data.furniture, want);
    if (!it || it.room !== rooms.id || it.slot !== slot) return;
    try { room.setFurniture({ [slot]: want }); } catch (e) { console.error('[decor] preview', e); return; }
    if (id) { sfx.play('preview'); if (isXmas(it)) sfx.play('jingle'); }
  }
  function decorEquip(slot, id) {
    const all = game.furniture();
    const r = equipFurniture(all, rooms.id, slot, id, game.owned, data.furniture);
    if (!r.ok) {
      if (r.reason !== 'same') console.warn('[decor] equip', r.reason, id);
      hud.updateDecor?.({ furniture: game.furniture(rooms.id) });
      return false;
    }
    game.setFurniture(r.furniture);
    try { rooms.room?.setFurniture?.({ [slot]: r.furniture[rooms.id][slot] }); } catch (e) { console.error('[decor] equip', e); }
    growth?.care('decorEquip');
    sfx.play('place');
    if (isXmas(r.item)) sfx.play('jingle');
    hud.updateDecor?.({ furniture: game.furniture(rooms.id) });
    game.persist();
    return true;
  }
  function decorBuy(id) {
    const it = findFurniture(data.furniture, id);
    if (!it || it.room !== rooms.id) return false;
    const r = buyItem({ coins: game.coins, owned: game.owned }, id, data.furniture);
    if (!r.ok) {
      if (r.reason === 'coins') {
        hud.updateDecor?.({ coins: game.coins });
        hud.toast(`เหรียญยังไม่พอ ต้องใช้ ${r.price} เหรียญ`, 2600);
      } else if (r.reason === 'owned') hud.updateDecor?.({ owned: game.owned.slice() });
      return false;
    }
    game.setPurse(r.coins, r.owned);
    hud.setCoins(r.coins);
    growth?.care('decorBuy');
    sfx.play('buy');
    mood.say('buy', true);
    hud.updateDecor?.({ owned: r.owned.slice(), coins: r.coins });
    decorEquip(it.slot, id);   // a bought item goes in at once (wardrobe pattern)
    game.persist();
    return true;
  }

  // 7d. Minigames (Sprint 5): registry (game/minigames/index.js) behind one facade,
  // so the rest of main keeps calling `minigame.active / exit / update …`.
  const { MINIGAMES, gameOrder, gameInfo, favoriteOf } = MinigamesMod;
  const { cfg: snackCfg, missing } = resolveConfig(data.minigames?.snackRain);
  if (missing.length && data.minigames) console.warn('[snack-rain] minigames.json missing keys, defaults used:', missing.join(', '));
  const foodIds = foods.foods.map((f) => f.id);
  const ORIGIN = new THREE.Vector3();
  const sized = (mesh, native) => { mesh.scale.setScalar(snackCfg.itemSize / (native || snackCfg.itemSize)); mesh.userData.baseScale = mesh.scale.x; return mesh; };
  const instances = {};
  let cur = null;   // instance of the current / last game
  const viewOf = (id) => MINIGAMES[id]?.view || { extraWidth: MINIGAME_VIEW.extraWidth, hudReserve: HUD_RESERVE.minigame };
  /** One ctx object for every game (index.js › ctx table). */
  const mgCtx = {
    stage, game, hud, sfx, get mood() { return mood; }, getPet, data: data.minigames, props: propMini,
    getHome: () => rooms.room?.petSpot || ORIGIN,
    getCharKey: () => game.selected,
    getPersona: () => personas[game.selected],
    getControl: () => control,
    get head() { return headCtl; },
    // head tilt is the camera control (Sprint 3 #3); hands are not a minigame control any more
    getControlX: () => (control === 'head' ? headCtl.clientX(stage.size.left, stage.size.w) : null),
    foodIds,
    isLiked: (foodId) => (foods.likes?.[game.selected] || []).includes(foodId),
    makeFoodMesh: (foodId) => sized(createFoodMesh(foodId || 'onigiri'), FOOD_SIZE),
    makeMesh(kind, foodId) {
      if (kind === 'coin') return propMini?.createCoinMesh ? sized(propMini.createCoinMesh(), propMini.COIN_SIZE) : sized(fallbackMesh('coin'), 0.4);
      if (kind === 'demon') return propMini?.createDemonMesh ? sized(propMini.createDemonMesh(), propMini.DEMON_SIZE) : sized(fallbackMesh('demon'), 0.5);
      return sized(createFoodMesh(foodId || 'onigiri'), FOOD_SIZE);
    },
    isFirstPlay: (id) => game.isFirstPlay(id),
    relaxed: (id) => game.relaxed(id),
    minigameMinScale: gcfg.minigameMinScale,
    reduceMotion,
    onNeedsChanged: pushNeeds,
    onCoins(n) { hud.setCoins(n); },
    onStateChange(active) { onMinigameState(active); },
    onEnd(result) { onMinigameEnd(result); },
  };
  function instanceFor(id) {
    if (!MINIGAMES[id]) return null;
    if (!instances[id]) {
      try { instances[id] = MINIGAMES[id].create(mgCtx); } catch (e) { console.error(`[minigame] ${id} create`, e); return null; }
    }
    return instances[id];
  }
  const noop = () => {};
  /** Facade over the current instance (idle when none exists yet). */
  minigame = {
    get id() { return cur ? gameId : null; },
    get active() { return !!cur?.active; },
    get phase() { return cur?.phase || 'idle'; },
    get paused() { return !!cur?.paused; },
    get lastResult() { return cur?.lastResult || null; },
    get state() { return cur?.state || null; },
    start() { return cur ? cur.start() : false; },
    update(dt, t) { cur?.update(dt, t); },
    exit() { cur?.exit(); },
    again() { cur?.again(); },
    setPaused(p, by = 'tab') { cur?.setPaused?.(p, by); },
    pointerX(x) { (cur?.pointerX || noop)(x); },
    pointerDown(x, y, id) { (cur?.pointerDown || noop).call(cur, x, y, id); },
    pointerMove(x, y, id, pressed) { (cur?.pointerMove || noop).call(cur, x, y, id, pressed); },
    pointerUp(id) { (cur?.pointerUp || noop).call(cur, id); },
    pad(id) { (cur?.pad || noop).call(cur, id); },
  };
  function onMinigameState(active) {
    const v = viewOf(gameId);
    frame.to = active ? v.extraWidth : 0; frame.from = frame.now; frame.t = 0;
    stage.setHudReserve(active ? (v.hudReserve || HUD_RESERVE.minigame) : HUD_RESERVE.normal);
    app.classList.toggle('minigame', active);
    hands.setPassive(active);
    gestures.reset();
    if (active) { care.clearCoach(); talkCtl?.cancel(); }
    else { care.syncControls(); endHeadControl(); }
    growth?.refreshLook(false);
    growth?.care(active ? 'minigameStart' : 'minigameEnd');
    if (!active && backToPicker) { backToPicker = false; openPicker(); }
  }
  function onMinigameEnd(result) {
    const id = result?.id || gameId;
    game.markPlayed(id);
    game.setLastGame(id);
    growth?.care('minigameEnd');
    game.persist();
  }
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
  const canStartMinigame = () => !minigame.active && rooms.id === 'living' && !rooms.moving && !care.carrying;
  function startMinigame(id = gameId) {
    if (!canStartMinigame()) return false;
    const inst = instanceFor(id);
    if (!inst) return false;
    gameId = id; cur = inst;
    hud.hideWardrobe?.(); sheets.wardrobe = false;
    closeDecor();
    gestures.reset();
    unlock();
    const ok = minigame.start();
    if (ok) {
      game.setLastGame(id);
      hud.updateMinigame?.({ control });
      // calibrate from the very first countdown frame (trackPhase handles "again" / resume)
      if (control === 'head') headCtl.beginCalibration();
      lastPhase = minigame.phase;
    }
    return ok;
  }

  // 7e. Picker → intro → control (touch or head tilt) → round
  /** Active control of the current / next round: 'touch' | 'head'. */
  let control = 'touch', headStarting = false, headCancel = false;
  const headCtl = createHeadControl({ getTime: () => stage.now() });
  /** Picker view (minigames-2 GDD 3.1 step 2): best of this character, favourite, last played. */
  function pickerGames() {
    const fav = favoriteOf(game.selected, data.minigames);
    const best = game.best();
    return gameOrder(data.minigames).map((id) => gameInfo(id, data.minigames)).filter((g) => g && g.available).map((g) => ({
      id: g.id, title: g.title, howTo: g.howTo, controls: g.controls, best: best[g.id] || 0,
      favorite: g.id === fav, last: g.id === game.lastGame,
    }));
  }
  /** "เล่น": the picker (no picker in the HUD yet → Snack Rain intro, the Sprint 4 flow). */
  function openPicker() {
    if (!canStartMinigame() || headStarting) return false;
    hud.hideWardrobe?.(); sheets.wardrobe = false;
    closeDecor();
    if (!hud.showMinigamePicker) { pickGame('snackRain'); return true; }
    sheets.picker = true;
    hud.showMinigamePicker({ games: pickerGames(), charName: personas[game.selected]?.name || '' });
    mood.say(data.minigames?.picker?.lines?.open || 'pickGame', true);
    return true;
  }
  /** A picker card: that game's intro card (control choice when the game has several, relaxed switch, first-play coach). */
  function pickGame(id) {
    if (!MINIGAMES[id] || !canStartMinigame() || headStarting) return false;
    sheets.picker = false;
    hud.hideMinigamePicker?.();
    gameId = id;
    const info = gameInfo(id, data.minigames);
    const controls = MINIGAME_CONTROLS.filter((c) => info.controls.includes(c.id));
    if (!hud.showMinigameIntro) { control = 'touch'; startMinigame(id); return true; }
    const saved = game.settings.minigameControl;
    sheets.intro = true;
    hud.showMinigameIntro({
      id, title: info.title, howTo: info.howTo, controls,
      selected: controls.some((c) => c.id === saved) ? saved : 'touch',
      coach: game.isFirstPlay(id) ? (data.minigames?.[id]?.coach || '') : '',
      relaxed: id === 'snackRain' ? undefined : game.relaxed(id),
    });
    return true;
  }
  /** Sprint 3 name kept for tests: the intro of the current game. */
  function openMinigameIntro() { return pickGame(gameId); }
  /**
   * "เริ่มเลย": touch starts at once; head opens the camera (or shares the hand
   * camera) and loads the model first, then the countdown calibrates neutral.
   * Camera denied / unavailable → Thai toast and a touch round.
   */
  async function readyMinigame() {
    if (headStarting || minigame.active) return;
    unlock();
    sheets.intro = false;
    const allowed = gameInfo(gameId, data.minigames)?.controls || ['touch'];
    control = game.settings.minigameControl === 'head' && allowed.includes('head') ? 'head' : 'touch';
    if (control === 'head') {
      headStarting = true; headCancel = false;
      hud.toast(MSG.headOpening, 2600);
      const shared = hands.on ? hands.video : null;
      let r;
      try { r = await headCtl.start(shared); } catch (e) { console.warn('[head]', e); r = { ok: false }; }
      headStarting = false;
      if (headCancel) { headCancel = false; if (r.ok) headCtl.stop(); control = 'touch'; return; }   // intro closed meanwhile
      if (r.ok) { if (shared) hands.setSuspended(true); }
      else {
        control = 'touch';
        game.setSetting('minigameControl', 'touch'); game.persist();
        hud.toast(MSG.headFail, 3200);
      }
    }
    hud.hideMinigameIntro?.();
    if (!startMinigame(gameId)) endHeadControl();
  }
  /** After a round: release the camera unless the player had it on before (hand camera). */
  function endHeadControl() {
    if (headCtl.on) headCtl.stop();
    hands.setSuspended(false);
    control = 'touch';
  }
  let lastPhase = 'idle';
  /** Calibrate the neutral head pose while a countdown runs. */
  function trackPhase() {
    const ph = minigame.phase;
    if (ph === lastPhase) return;
    if (control === 'head') {
      if (ph === 'countdown') headCtl.beginCalibration();
      else if (lastPhase === 'countdown') headCtl.endCalibration();
    }
    lastPhase = ph;
  }
  // pointer during a round (normal gestures are off): drag / touch anywhere, or mouse move
  window.addEventListener('pointerdown', (e) => { if (minigame.active && !hud.isHudPoint?.(e.clientX, e.clientY)) minigame.pointerDown(e.clientX, e.clientY, e.pointerId); }, { passive: true });
  window.addEventListener('pointermove', (e) => { if (minigame.active) minigame.pointerMove(e.clientX, e.clientY, e.pointerId, e.pointerType === 'mouse' || !!e.buttons); }, { passive: true });
  window.addEventListener('pointerup', (e) => { if (minigame.active) minigame.pointerUp(e.pointerId); }, { passive: true });
  window.addEventListener('pointercancel', (e) => { if (minigame.active) minigame.pointerUp(e.pointerId); }, { passive: true });

  // 7f. growth (growth GDD 3.1–3.8)
  growth = createGrowth({
    cfg: gcfg, game, personas, getPet, hud, sfx, mood,
    isBlocked: () => minigame.active || care.sitting || care.carrying || rooms.moving || decorOpen
      || sheets.wardrobe || sheets.picker || sheets.intro || headStarting || app.classList.contains('selecting'),
    getMinigame: () => ({ active: minigame.active, paused: minigame.paused, playing: minigame.phase === 'play', id: minigame.id }),
    onChange() { hud.setCharacter(chipInfo()); },
  });
  growth.refreshLook(true);
  hud.setCharacter(chipInfo());

  // 7g. conversation (conversation GDD 3.1–3.11)
  const ROOM_NAMES = { living: 'living', kitchen: 'kitchen', bathroom: 'bathroom' };
  talkCtl = createTalk({
    hud, game, mood, sfx, talkback: talk, getPet, personas, actions: needs.actions, needsData: needs,
    foods, wardrobe: data.wardrobe,
    getConv: () => data.conversation,
    getVoice: () => growth.voice(),
    getTime: () => stage.time,
    unlock,
    canTalk: () => !minigame.active,
    onCare: (ev) => growth.care(ev),
    onNeedsChanged: pushNeeds,
    getContext() {
      const o = game.outfit() || {};
      const items = data.wardrobe?.items || [];
      const worn = Object.values(o).filter(Boolean);
      const v = growth.voice();
      return {
        charKey: game.selected, name: personas[game.selected]?.name || '', stage: v.stage, vocabLevel: v.vocabLevel, trait: v.trait,
        needs: { ...(game.needs() || {}) }, expression: mood.expression || 'original', room: ROOM_NAMES[rooms.id] || 'living',
        outfit: { head: o.head || null, eyes: o.eyes || null, body: o.body || null },
        likedItemsWorn: worn.filter((id) => items.find((it) => it.id === id)?.likes?.includes(game.selected)),
        xmasItemsVisible: worn.filter((id) => isXmas(items.find((it) => it.id === id))).length
          + Object.values(game.furniture(rooms.id)).filter((id) => isXmas(findFurniture(data.furniture, id))).length,
        sitting: !!care.sitting,
        decorCustom: (() => { const d = RoomsMod.FURNITURE_DEFAULTS?.[rooms.id] || {}; return Object.entries(game.furniture(rooms.id) || {}).filter(([slot, id]) => id && d[slot] && id !== d[slot]).length; })(),
        now: new Date(), awayMinutes: 0,
      };
    },
  });
  talkCtl.preload();

  function selectCharacter(key) {
    if (!personas[key] || personas[key].playable === false) return;
    if (minigame.active) minigame.exit();
    talkCtl.cancel();   // E11: a running turn is dropped
    const changed = key !== game.selected || !pet;
    if (changed) growth.beforeCharacterChange();   // growth edge 5: close the old character's bucket
    game.select(key);
    if (changed) { spawnPet(key); growth.onCharacterChanged(key); }
    gestures.reset();
    care.onCharacterChanged();
    mood.setCharacter(key, stage.time, { greet: true });
    hud.setCharacter(chipInfo(key));
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
  // Cloud save (Google sign-in) — hidden until assets/data/cloud.json is filled (docs/cloud-save.md).
  const persistLocal = game.persist.bind(game);
  game.persist = () => { const ok = persistLocal(); cloud.schedule(); return ok; };
  hud.setAccount?.(cloud.state);
  cloud.init();
  if (!game.chosen) { app.classList.add('selecting'); hud.showSelect(selectList(), game.selected); }
  // one-time coach after the v4 → v5 migration (growth GDD 3.9)
  if (game.growthIntro && game.chosen) {
    timers.after(4, () => { hud.toast(growth.introText(), 5200); game.clearGrowthIntro(); game.persist(); }, 'growth');
  } else if (game.growthIntro) game.clearGrowthIntro();

  let needsT = 0, saveT = 0;
  stage.onTick((dt, time) => {
    timers.update(time);
    hands.update(time);
    if (headCtl.on) headCtl.update();
    trackPhase();
    gestures.update(dt, time);
    care.update(dt, time);
    updateFrame(dt);
    minigame.update(dt, time);
    growth.update(dt, time);
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
    minigame.setPaused(document.hidden, 'tab');
    if (document.hidden) talkCtl.cancel();
    if (document.hidden) flushSave();
  });
  window.addEventListener('pagehide', flushSave);

  stage.start();
  setLoading(null);
  document.documentElement.dataset.boot = 'ok';
  // Installable web app + offline play (sw.js). Not under automation/debug, so tests stay deterministic.
  if ('serviceWorker' in navigator && !navigator.webdriver && !new URLSearchParams(location.search).has('debug')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('[sw]', e));
  }

  if (new URLSearchParams(location.search).has('debug')) {
    window.__moldablePet = { data, game, stage, rooms, mood, care, gestures, hands, head: headCtl, hud, getPet, selectCharacter, minigame, startMinigame, openMinigameIntro, readyMinigame, setTheme, getControl: () => control, equip, buy, openWardrobe, snackCfg,
      growth, talk: talkCtl, openPicker, pickGame, pickerGames, MINIGAMES, instances, getGameId: () => gameId,
      openDecor, closeDecor, decorPreview, decorEquip, decorBuy, thumbs, isDecorOpen: () => decorOpen };
  }
}

boot().catch((e) => {
  console.error(e);
  document.documentElement.dataset.boot = 'failed';
  setLoading('เปิดเกมไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง', true);
});
