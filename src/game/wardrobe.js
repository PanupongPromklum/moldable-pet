/**
 * Wardrobe rules — pure functions (no DOM, no storage, no clock).
 * Catalog comes from `assets/data/wardrobe.json` (loop):
 * `{ slots: { head, eyes, body }, items: [{ id, slot, name, price, starter, likes }] }`.
 * Contract: docs/architecture/module-contracts.md › Sprint 2 › Outfits.
 *
 * Save fields (wire): `owned: [ids]` shared by every character,
 * `chars[key].outfit: { head, eyes, body }` (null = empty slot).
 * Unit tests: tests/unit/wardrobe.test.mjs.
 * @module game/wardrobe
 */

/** Slot ids in display order (contract). Used when wardrobe.json has no `slots`. */
export const SLOT_IDS = Object.freeze(['head', 'eyes', 'body']);

/**
 * Slot ids from the catalog (falls back to the contract's three).
 * @param {object|null} wardrobe parsed wardrobe.json
 * @returns {string[]}
 */
export function slotIds(wardrobe) {
  const s = wardrobe && wardrobe.slots && typeof wardrobe.slots === 'object' ? Object.keys(wardrobe.slots) : [];
  return s.length ? s : SLOT_IDS.slice();
}

/** @returns {Record<string, null>} every slot empty */
export function emptyOutfit(wardrobe) {
  const o = {};
  for (const s of slotIds(wardrobe)) o[s] = null;
  return o;
}

/**
 * Catalog item by id.
 * @param {object|null} wardrobe
 * @param {string} id
 * @returns {{ id: string, slot: string, name?: string, price?: number, starter?: boolean, likes?: string[] }|null}
 */
export function findItem(wardrobe, id) {
  const items = wardrobe && Array.isArray(wardrobe.items) ? wardrobe.items : [];
  for (const it of items) if (it && it.id === id) return it;
  return null;
}

/** Price as a whole non-negative number (missing / bad → 0). */
export function priceOf(item) {
  const p = item && Number(item.price);
  return Number.isFinite(p) && p > 0 ? Math.floor(p) : 0;
}

/**
 * Ids owned from the start (`starter: true`).
 * @param {object|null} wardrobe
 * @returns {string[]}
 */
export function starterOwned(wardrobe) {
  const items = wardrobe && Array.isArray(wardrobe.items) ? wardrobe.items : [];
  return items.filter((it) => it && it.starter === true && typeof it.id === 'string').map((it) => it.id);
}

/**
 * Repair an `owned` list from a save: strings only, no duplicates, always
 * includes the starter items. Unknown ids are dropped when a catalog is given;
 * with no catalog (file failed to load) saved ids are kept so nothing is lost.
 * @param {any} raw
 * @param {object|null} wardrobe
 * @returns {string[]}
 */
export function sanitizeOwned(raw, wardrobe) {
  const out = [];
  const add = (id) => { if (typeof id === 'string' && !out.includes(id)) out.push(id); };
  if (Array.isArray(raw)) for (const id of raw) if (!wardrobe || findItem(wardrobe, id)) add(id);
  for (const id of starterOwned(wardrobe)) add(id);
  return out;
}

/**
 * Repair one character's outfit: every slot present, each value either null or
 * an owned item that belongs to that slot.
 * @param {any} raw
 * @param {object|null} wardrobe
 * @param {string[]} owned
 * @returns {Record<string, string|null>}
 */
export function sanitizeOutfit(raw, wardrobe, owned) {
  const out = emptyOutfit(wardrobe);
  if (!raw || typeof raw !== 'object') return out;
  for (const slot of Object.keys(out)) {
    const id = raw[slot];
    if (typeof id !== 'string') continue;
    if (!wardrobe) { out[slot] = id; continue; }
    const it = findItem(wardrobe, id);
    if (it && it.slot === slot && owned.includes(id)) out[slot] = id;
  }
  return out;
}

/**
 * Equip rule: one item per slot; equipping replaces whatever is in that slot.
 * `id = null` empties the slot. Does not mutate `outfit`.
 * @param {Record<string, string|null>} outfit
 * @param {string} slot
 * @param {string|null} id
 * @param {string[]} owned
 * @param {object|null} wardrobe
 * @returns {{ ok: boolean, reason?: 'badSlot'|'unknown'|'wrongSlot'|'notOwned', outfit: Record<string, string|null>, item?: object|null }}
 */
export function equipItem(outfit, slot, id, owned, wardrobe) {
  const next = { ...emptyOutfit(wardrobe), ...(outfit || {}) };
  if (!slotIds(wardrobe).includes(slot)) return { ok: false, reason: 'badSlot', outfit: next };
  if (id == null) { next[slot] = null; return { ok: true, outfit: next, item: null }; }
  const item = findItem(wardrobe, id);
  if (!item) return { ok: false, reason: 'unknown', outfit: next };
  if (item.slot !== slot) return { ok: false, reason: 'wrongSlot', outfit: next };
  if (!owned.includes(id)) return { ok: false, reason: 'notOwned', outfit: next };
  next[slot] = id;
  return { ok: true, outfit: next, item };
}

/**
 * Buy rule: item must exist, not be owned yet, and cost ≤ coins.
 * Does not mutate inputs.
 * @param {{ coins: number, owned: string[] }} state
 * @param {string} id
 * @param {object|null} wardrobe
 * @returns {{ ok: boolean, reason?: 'unknown'|'owned'|'coins', coins: number, owned: string[], price: number, item?: object }}
 */
export function buyItem(state, id, wardrobe) {
  const coins = Math.max(0, Math.floor(Number(state.coins) || 0));
  const owned = Array.isArray(state.owned) ? state.owned.slice() : [];
  const item = findItem(wardrobe, id);
  if (!item) return { ok: false, reason: 'unknown', coins, owned, price: 0 };
  const price = priceOf(item);
  if (owned.includes(id)) return { ok: false, reason: 'owned', coins, owned, price, item };
  if (price > coins) return { ok: false, reason: 'coins', coins, owned, price, item };
  owned.push(id);
  return { ok: true, coins: coins - price, owned, price, item };
}

/**
 * Persona line event for putting an item on: 'wearLike' when the character is
 * in the item's `likes`, else 'wearOk'.
 * @param {object|null} item
 * @param {string} charKey
 */
export function wearEvent(item, charKey) {
  return item && Array.isArray(item.likes) && item.likes.includes(charKey) ? 'wearLike' : 'wearOk';
}

/**
 * Reaction to putting an item on (economy GDD 3.5): liked → `reactions.like`
 * (wearLike line, persona `foodReaction.like` face/action, small need bonus at
 * most once per `bonusCooldownSeconds` per character); otherwise `reactions.ok`.
 * @param {object|null} item
 * @param {string} charKey
 * @param {object|null} wardrobe
 * @param {number} lastBonusMs wall-clock ms of this character's last bonus (0 = never)
 * @param {number} nowMs wall-clock ms
 * @returns {{ kind: 'like'|'ok', line: string, social: number, fun: number, bonus: boolean }}
 */
export function wearReaction(item, charKey, wardrobe, lastBonusMs, nowMs) {
  const kind = wearEvent(item, charKey) === 'wearLike' ? 'like' : 'ok';
  const rx = (wardrobe && wardrobe.reactions && wardrobe.reactions[kind]) || {};
  const line = typeof rx.line === 'string' ? rx.line : kind === 'like' ? 'wearLike' : 'wearOk';
  const social = Number(rx.social) || 0, fun = Number(rx.fun) || 0;
  const cd = Math.max(0, Number(wardrobe && wardrobe.bonusCooldownSeconds) || 0) * 1000;
  const bonus = (social > 0 || fun > 0) && (!(lastBonusMs > 0) || nowMs - lastBonusMs >= cd || nowMs < lastBonusMs);
  return { kind, line, social: bonus ? social : 0, fun: bonus ? fun : 0, bonus };
}
