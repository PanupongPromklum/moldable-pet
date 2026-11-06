/**
 * Furniture rules — pure functions (no DOM, no storage, no clock, no Three).
 * Catalog: `assets/data/furniture.json` (loop):
 * `{ rooms: { <room>: { label, slots: { <slot>: { label } } } }, themes: { basic, xmas },
 *    items: [{ id, room, slot, name, price, theme, default }] }`.
 * Contract: docs/architecture/module-contracts.md › Sprint 4 additions (fixed slot + item ids).
 * Economy rules: design/gdd/economy.md § 10 (default items owned, price 0; unknown saved
 * ids → slot default and dropped from `owned`; never refund).
 *
 * Save fields (wire, save v4): `furniture: { living: {slot: id}, kitchen: {…}, bathroom: {…} }`
 * shared by every character; furniture ids live in the shared `owned` list next to
 * wardrobe ids. Buying reuses `wardrobe.buyItem` (same `items[]` + `price` shape).
 * Unit tests: tests/unit/furniture.test.mjs.
 * @module game/furniture
 */
import { findItem as findWardrobeItem, starterOwned } from './wardrobe.js';

/** Room ids that own furniture (contract order). Used when the catalog has no `rooms`. */
export const FURNITURE_ROOMS = Object.freeze(['living', 'kitchen', 'bathroom']);

/** @param {any} cat @returns {object[]} catalog items (valid objects with a string id) */
function itemsOf(cat) {
  return cat && Array.isArray(cat.items) ? cat.items.filter((it) => it && typeof it.id === 'string') : [];
}

/**
 * Room ids of the catalog (falls back to the contract's three).
 * @param {object|null} cat parsed furniture.json
 * @returns {string[]}
 */
export function furnitureRooms(cat) {
  const r = cat && cat.rooms && typeof cat.rooms === 'object' ? Object.keys(cat.rooms) : [];
  return r.length ? r : FURNITURE_ROOMS.slice();
}

/**
 * Slot ids of a room in tab order: `rooms.<room>.slots` keys, else the slots
 * found on that room's items, else `fallback` (e.g. Prop's FURNITURE_SLOTS[room]).
 * @param {object|null} cat
 * @param {string} room
 * @param {string[]} [fallback]
 * @returns {string[]}
 */
export function slotIdsOf(cat, room, fallback = []) {
  const s = cat?.rooms?.[room]?.slots;
  if (s && typeof s === 'object' && Object.keys(s).length) return Object.keys(s);
  const seen = [];
  for (const it of itemsOf(cat)) if (it.room === room && typeof it.slot === 'string' && !seen.includes(it.slot)) seen.push(it.slot);
  return seen.length ? seen : fallback.slice();
}

/**
 * Catalog item by id.
 * @param {object|null} cat
 * @param {string} id
 * @returns {{ id: string, room: string, slot: string, name?: string, price?: number, theme?: string, default?: boolean }|null}
 */
export function findFurniture(cat, id) {
  for (const it of itemsOf(cat)) if (it.id === id) return it;
  return null;
}

/** Items of one room in display order (catalog order). */
export function itemsForRoom(cat, room) {
  return itemsOf(cat).filter((it) => it.room === room);
}

/** True for the Christmas set (`theme: "xmas"`). */
export function isXmas(item) { return !!item && item.theme === 'xmas'; }

/**
 * Default item of one slot: the item flagged `default: true`, else the first
 * item of that slot in catalog order, else null.
 * @param {object|null} cat @param {string} room @param {string} slot
 * @returns {string|null}
 */
export function defaultItemId(cat, room, slot) {
  let first = null;
  for (const it of itemsOf(cat)) {
    if (it.room !== room || it.slot !== slot) continue;
    if (it.default === true) return it.id;
    if (!first) first = it.id;
  }
  return first;
}

/**
 * Every room with every slot at its default item.
 * @param {object|null} cat
 * @returns {Record<string, Record<string, string>>}
 */
export function defaultFurniture(cat) {
  const out = {};
  for (const room of furnitureRooms(cat)) {
    out[room] = {};
    for (const slot of slotIdsOf(cat, room)) {
      const id = defaultItemId(cat, room, slot);
      if (id) out[room][slot] = id;
    }
  }
  return out;
}

/** Ids of every slot default (always owned). */
export function defaultOwnedFurniture(cat) {
  const out = [];
  const d = defaultFurniture(cat);
  for (const room of Object.keys(d)) for (const slot of Object.keys(d[room])) if (!out.includes(d[room][slot])) out.push(d[room][slot]);
  return out;
}

/**
 * Repair the shared `owned` list for both catalogs: strings only, no
 * duplicates, wardrobe starters and furniture defaults always included.
 * An id is dropped only when BOTH catalogs loaded and neither knows it
 * (economy GDD 10.6 #1); if either file failed to load, unknown ids are kept,
 * because they may belong to the missing catalog (nothing bought is ever lost).
 * @param {any} raw
 * @param {object|null} wardrobe parsed wardrobe.json
 * @param {object|null} furniture parsed furniture.json
 * @returns {string[]}
 */
export function sanitizeOwnedAll(raw, wardrobe, furniture) {
  const strict = !!wardrobe && !!furniture;
  const known = (id) => !!findWardrobeItem(wardrobe, id) || !!findFurniture(furniture, id);
  const out = [];
  const add = (id) => { if (typeof id === 'string' && !out.includes(id)) out.push(id); };
  if (Array.isArray(raw)) for (const id of raw) if (!strict || known(id)) add(id);
  for (const id of starterOwned(wardrobe)) add(id);
  for (const id of defaultOwnedFurniture(furniture)) add(id);
  return out;
}

/**
 * Repair the saved furniture: every catalog room and slot present; each value
 * an owned item of exactly that room and slot, else the slot default. With no
 * catalog (file failed to load) saved strings are kept as they are (Prop's
 * `createRoom` falls back to its own defaults for anything it does not know).
 * @param {any} raw `{ room: { slot: id } }`
 * @param {object|null} cat
 * @param {string[]} owned already sanitized
 * @returns {Record<string, Record<string, string>>}
 */
export function sanitizeFurniture(raw, cat, owned) {
  const src = raw && typeof raw === 'object' ? raw : {};
  if (!cat) {
    const out = {};
    for (const room of FURNITURE_ROOMS) {
      out[room] = {};
      const r = src[room];
      if (r && typeof r === 'object') for (const slot of Object.keys(r)) if (typeof r[slot] === 'string') out[room][slot] = r[slot];
    }
    return out;
  }
  const out = defaultFurniture(cat);
  for (const room of Object.keys(out)) {
    const r = src[room];
    if (!r || typeof r !== 'object') continue;
    for (const slot of Object.keys(out[room])) {
      const id = r[slot];
      if (typeof id !== 'string') continue;
      const it = findFurniture(cat, id);
      if (it && it.room === room && it.slot === slot && (it.default === true || owned.includes(id))) out[room][slot] = id;
    }
  }
  return out;
}

/**
 * Equip rule: one item per slot; the item must exist, belong to this room and
 * slot, and be owned (defaults always count as owned). `id = null` puts the
 * slot default back. Does not mutate `furniture`.
 * @param {Record<string, Record<string, string>>} furniture
 * @param {string} room
 * @param {string} slot
 * @param {string|null} id
 * @param {string[]} owned
 * @param {object|null} cat
 * @returns {{ ok: boolean, reason?: 'badSlot'|'unknown'|'wrongSlot'|'notOwned'|'same', furniture: Record<string, Record<string, string>>, item?: object|null }}
 */
export function equipFurniture(furniture, room, slot, id, owned, cat) {
  const next = {};
  for (const r of Object.keys(furniture || {})) next[r] = { ...furniture[r] };
  if (!next[room]) next[room] = {};
  if (!slotIdsOf(cat, room).includes(slot)) return { ok: false, reason: 'badSlot', furniture: next };
  const want = id == null ? defaultItemId(cat, room, slot) : id;
  const item = findFurniture(cat, want);
  if (!item) return { ok: false, reason: 'unknown', furniture: next };
  if (item.room !== room || item.slot !== slot) return { ok: false, reason: 'wrongSlot', furniture: next };
  if (item.default !== true && !(owned || []).includes(want)) return { ok: false, reason: 'notOwned', furniture: next };
  if (next[room][slot] === want) return { ok: false, reason: 'same', furniture: next, item };
  next[room][slot] = want;
  return { ok: true, furniture: next, item };
}

/**
 * Slots whose shown item differs from the equipped one (unbought or not yet
 * equipped previews) → the `room.setFurniture` partial that reverts them.
 * @param {Record<string, string>} shown what the room shows now
 * @param {Record<string, string>} equipped the saved room furniture
 * @returns {Record<string, string>|null} null when nothing to revert
 */
export function revertPartial(shown, equipped) {
  let out = null;
  for (const slot of Object.keys(equipped || {})) {
    if (shown && shown[slot] !== equipped[slot]) (out || (out = {}))[slot] = equipped[slot];
  }
  return out;
}

/**
 * Shop view of one room for `hud.showDecor` (contract shape). `thumbOf(id)`
 * returns a cached data URL or null (the HUD shows a placeholder until
 * `updateDecor` brings it).
 * @param {object|null} cat
 * @param {string} room
 * @param {{ owned: string[], furniture: Record<string, string>, coins: number, thumbOf?: (id: string) => string|null, fallbackSlots?: string[] }} s
 */
export function decorView(cat, room, { owned, furniture, coins, thumbOf = () => null, fallbackSlots = [] }) {
  const slotDefs = cat?.rooms?.[room]?.slots || {};
  return {
    room,
    slots: slotIdsOf(cat, room, fallbackSlots).map((id) => ({ id, label: slotDefs[id]?.label || id })),
    items: itemsForRoom(cat, room).map((it) => ({
      id: it.id, slot: it.slot, room: it.room, name: it.name || it.id, price: Math.max(0, Math.floor(Number(it.price) || 0)),
      theme: it.theme || 'basic', default: it.default === true, thumb: thumbOf(it.id) || null,
    })),
    owned: owned.slice(),
    furniture: { ...(furniture || {}) },
    coins,
    themes: cat?.themes || null,
  };
}
