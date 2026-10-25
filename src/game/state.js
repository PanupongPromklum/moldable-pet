/**
 * Game state and save — needs per character key (owner decision 2026-10-25),
 * selected character, current room, wall-clock decay, localStorage save.
 *
 * Save key `moldable-pet:v1` (the key stays; `version` inside moves), shape v2:
 * { version: 2, selected, room, chosen, coins, savedAt,
 *   owned: [itemIds],                       // shared by every character (Sprint 2)
 *   settings: { cameraHidden: bool },       // camera view choice (S2-04)
 *   chars: { <key>: { needs: {…}, tLast,
 *     outfit: { head, eyes, body },         // per character (S2-11)
 *     best: { snackRain: number },          // best minigame score per character (snack-rain GDD 3.8)
 *     wearBonusAt: ms } } }                 // last outfit need bonus (economy GDD 3.5 cooldown)
 * v0 (prototype) and v1 (Sprint 1, no outfits / settings / best) saves migrate.
 *
 * The pure helpers (`newSave`, `migrateSave`, `tickSave`) are unit-tested in
 * `tests/unit/needs.test.mjs`. `createGameState` wraps them with an injected
 * storage and clock.
 * @module game/state
 */
import { startLevels, sanitizeLevels, decayNeeds, addNeed } from './needs.js';
import { sanitizeOwned, sanitizeOutfit, emptyOutfit } from './wardrobe.js';

export const SAVE_KEY = 'moldable-pet:v1';
export const SAVE_VERSION = 2;
export const DEFAULT_CHARACTER = 'flower';
export const DEFAULT_ROOM = 'living';

/**
 * @typedef {{ needs: object, foods: object, personas: object, wardrobe?: object|null, minigames?: object|null }} GameData
 */

/** Character keys that have persona data (every one of them is simulated). */
export function characterKeys(data) {
  return Object.keys(data.personas).filter((k) => !k.startsWith('_'));
}

/**
 * New save: every character starts at `needs.<id>.start`.
 * @param {GameData} data
 * @param {number} now ms
 */
export function newSave(data, now) {
  const chars = {};
  const wardrobe = data.wardrobe || null;
  for (const k of characterKeys(data)) chars[k] = newChar(data, now);
  const start = Number(wardrobe?.startCoins);
  return {
    version: SAVE_VERSION, selected: DEFAULT_CHARACTER, room: DEFAULT_ROOM, chosen: false,
    coins: Number.isFinite(start) && start > 0 ? Math.floor(start) : 0, savedAt: now,
    owned: sanitizeOwned(null, wardrobe), settings: { cameraHidden: false }, chars,
  };
}

function newChar(data, now) {
  return { needs: startLevels(data.needs), tLast: now, outfit: emptyOutfit(data.wardrobe || null), best: { snackRain: 0 }, wearBonusAt: 0 };
}

/**
 * Turn anything read from storage into a valid current-version save.
 * Handles: null / non-object, version 0 (a single `needs` object, pre per-character),
 * version 1 (no owned / outfit / settings / best → starter items owned, empty
 * outfits, camera shown, best 0), bad numbers, missing characters, missing tLast
 * (→ now, no catch-up), unknown keys, outfits naming unowned or wrong-slot items.
 * @param {any} raw parsed JSON or null
 * @param {GameData} data
 * @param {number} now ms
 * @param {string[]} [roomIds] valid room ids, to reject an unknown saved room
 */
export function migrateSave(raw, data, now, roomIds) {
  const base = newSave(data, now);
  if (!raw || typeof raw !== 'object') return base;
  let src = raw;
  // v0 (prototype era): { needs: {...}, tLast, charKey }
  if (!src.version && src.needs && !src.chars) {
    const key = typeof src.charKey === 'string' ? src.charKey : DEFAULT_CHARACTER;
    src = { version: 1, selected: key, chosen: true, chars: { [key]: { needs: src.needs, tLast: src.tLast } } };
  }
  const keys = characterKeys(data);
  const out = base;
  if (typeof src.selected === 'string' && keys.includes(src.selected)) out.selected = src.selected;
  if (typeof src.room === 'string' && (!roomIds || roomIds.includes(src.room))) out.room = src.room;
  out.chosen = !!src.chosen;
  // a Sprint 1 save keeps its coins (always 0 there); startCoins only seeds brand-new saves
  out.coins = Number.isFinite(src.coins) && src.coins >= 0 ? Math.floor(src.coins) : 0;
  out.savedAt = Number.isFinite(src.savedAt) ? src.savedAt : now;
  const wardrobe = data.wardrobe || null;
  out.owned = sanitizeOwned(src.owned, wardrobe);
  out.settings = { cameraHidden: !!(src.settings && src.settings.cameraHidden) };
  const score = (b) => (b && Number.isFinite(b.snackRain) && b.snackRain > 0 ? Math.floor(b.snackRain) : 0);
  for (const k of keys) {
    const c = src.chars && src.chars[k];
    if (!c || typeof c !== 'object') continue;
    out.chars[k] = {
      needs: sanitizeLevels(c.needs, data.needs),
      tLast: Number.isFinite(c.tLast) ? c.tLast : now,
      outfit: sanitizeOutfit(c.outfit, wardrobe, out.owned),
      best: { snackRain: score(c.best) },
      wearBonusAt: Number.isFinite(c.wearBonusAt) && c.wearBonusAt > 0 ? c.wearBonusAt : 0,
    };
  }
  return out;
}

/**
 * Advance every character's needs to `now` (in place on `save.chars`).
 * @param {object} save
 * @param {GameData} data
 * @param {number} now ms
 * @returns {{ gapMs: number, offline: boolean }} gap of the selected character
 */
export function tickSave(save, data, now) {
  let info = { gapMs: 0, offline: false };
  for (const k of Object.keys(save.chars)) {
    const c = save.chars[k];
    const rates = data.personas[k]?.needRates;
    const r = decayNeeds(c.needs, rates, data.needs, c.tLast, now);
    c.needs = r.levels; c.tLast = r.tLast;
    if (k === save.selected) info = { gapMs: r.gapMs, offline: r.offline };
  }
  return info;
}

/**
 * localStorage wrapped so that no read or write can throw (private mode, quota,
 * blocked storage). Pass to `createGameState`.
 * @returns {{ getItem(k:string): string|null, setItem(k:string, v:string): boolean }}
 */
export function safeLocalStorage() {
  return {
    getItem(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
    setItem(k, v) { try { window.localStorage.setItem(k, v); return true; } catch { return false; } },
  };
}

/**
 * Live game state holder.
 * @param {{ data: GameData, storage: {getItem:Function,setItem:Function}, now?: () => number, roomIds?: string[] }} opts
 */
export function createGameState({ data, storage, now = () => Date.now(), roomIds }) {
  let raw = null;
  try { const s = storage.getItem(SAVE_KEY); raw = s ? JSON.parse(s) : null; } catch { raw = null; }
  const fresh = !raw;
  const save = migrateSave(raw, data, now(), roomIds);

  return {
    /** True when there was no readable save. */
    fresh,
    /** The save object (read-only outside this module, mutate through methods). */
    get save() { return save; },
    get selected() { return save.selected; },
    get room() { return save.room; },
    get chosen() { return save.chosen; },
    get coins() { return save.coins; },
    /** Item ids owned (shared across characters). */
    get owned() { return save.owned; },
    get settings() { return save.settings; },
    /** Best scores of a character (default: selected), e.g. `{ snackRain }`. */
    best(key = save.selected) { return save.chars[key]?.best || { snackRain: 0 }; },
    /** Wall-clock ms of the character's last outfit need bonus. */
    wearBonusAt(key = save.selected) { return save.chars[key]?.wearBonusAt || 0; },
    setWearBonusAt(ms, key = save.selected) { const c = save.chars[key]; if (c) c.wearBonusAt = ms; },
    /** Wall clock (injected) in ms. */
    now,
    /** Outfit of a character (default: selected). */
    outfit(key = save.selected) { return save.chars[key]?.outfit || null; },
    /** Replace a character's outfit (already validated by wardrobe.equipItem). */
    setOutfit(outfit, key = save.selected) { const c = save.chars[key]; if (c) c.outfit = { ...outfit }; },
    /** Replace coins + owned after a buy (wardrobe.buyItem result). */
    setPurse(coins, owned) { save.coins = Math.max(0, Math.floor(coins)); save.owned = owned.slice(); },
    /** Add earned coins (never negative). @returns {number} new total */
    addCoins(n) { save.coins = Math.max(0, save.coins + Math.floor(Number(n) || 0)); return save.coins; },
    /** Record a minigame score for a character (default: selected). @returns {number} best */
    setBest(game, score, key = save.selected) {
      const c = save.chars[key]; if (!c) return 0;
      const b = Math.max(c.best[game] || 0, Math.floor(score) || 0); c.best[game] = b; return b;
    },
    /** Change one setting (e.g. cameraHidden). */
    setSetting(k, v) { save.settings[k] = v; },
    /** Live levels of the selected character (mutated in place by `bump`). */
    needs(key = save.selected) { return save.chars[key]?.needs; },
    /** Add to one need of the selected character, clamped. */
    bump(need, amount) { const n = save.chars[save.selected]?.needs; if (n) addNeed(n, need, amount); },
    /** Replace the selected character's levels (eat / flush results). */
    setLevels(levels) { const c = save.chars[save.selected]; if (c) Object.assign(c.needs, levels); },
    select(key) { if (save.chars[key]) { save.selected = key; save.chosen = true; } },
    setRoom(id) { save.room = id; },
    /** Wall-clock decay for every character; returns the selected one's gap. */
    tick() { return tickSave(save, data, now()); },
    /** @returns {boolean} written */
    persist() {
      save.savedAt = now();
      try { return storage.setItem(SAVE_KEY, JSON.stringify(save)) !== false; } catch { return false; }
    },
  };
}
