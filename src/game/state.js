/**
 * Game state and save — needs per character key (owner decision 2026-10-25),
 * selected character, current room, wall-clock decay, localStorage save.
 *
 * Save key `moldable-pet:v1`, shape:
 * { version: 1, selected, room, chosen, coins, savedAt, chars: { <key>: { needs: {…}, tLast } } }
 *
 * The pure helpers (`newSave`, `migrateSave`, `tickSave`) are unit-tested in
 * `tests/unit/needs.test.mjs`. `createGameState` wraps them with an injected
 * storage and clock.
 * @module game/state
 */
import { startLevels, sanitizeLevels, decayNeeds, addNeed } from './needs.js';

export const SAVE_KEY = 'moldable-pet:v1';
export const SAVE_VERSION = 1;
export const DEFAULT_CHARACTER = 'flower';
export const DEFAULT_ROOM = 'living';

/**
 * @typedef {{ needs: object, foods: object, personas: object }} GameData
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
  for (const k of characterKeys(data)) chars[k] = { needs: startLevels(data.needs), tLast: now };
  return { version: SAVE_VERSION, selected: DEFAULT_CHARACTER, room: DEFAULT_ROOM, chosen: false, coins: 0, savedAt: now, chars };
}

/**
 * Turn anything read from storage into a valid current-version save.
 * Handles: null / non-object, version 0 (a single `needs` object, pre per-character),
 * bad numbers, missing characters, missing tLast (→ now, no catch-up), unknown keys.
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
  out.coins = Number.isFinite(src.coins) && src.coins >= 0 ? Math.floor(src.coins) : 0;
  out.savedAt = Number.isFinite(src.savedAt) ? src.savedAt : now;
  for (const k of keys) {
    const c = src.chars && src.chars[k];
    if (!c || typeof c !== 'object') continue;
    out.chars[k] = {
      needs: sanitizeLevels(c.needs, data.needs),
      tLast: Number.isFinite(c.tLast) ? c.tLast : now,
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
