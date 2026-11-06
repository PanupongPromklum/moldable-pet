/**
 * furniture.js — furniture slots, item registry and per-slot rebuilds (owner: prop).
 * Contract: docs/architecture/module-contracts.md → "Sprint 4 additions" (slot and item ids are fixed).
 *
 * ── How a room uses it (prop-living, prop-utility) ─────────────────────────────
 *
 * 1. Register one builder per item id, at module load, in the room file or in
 *    `src/props/furniture/<room>-*.js` (imported by the room file):
 *
 *      import { registerFurniture } from './furniture.js';
 *      registerFurniture('fridge-retro', (ctx) => {
 *        const { b, live, onUpdate, onTheme, W } = ctx;
 *        b.add(roundedBox(0.9, 2.4, 0.8, 0.24), '#FFFFFF', { position: [-0.8, 1.24, -2.5] });  // static clay
 *        b.addShadow(-0.8, -2.4, 1.5, 1.1);                                                     // static soft shadow
 *        const m = new ClayBuilder({ themed: true }).add(sphere(0.1), '#FFF').buildMesh('kitchen:fridgeMagnet');
 *        live.add(m);                                         // animated / interactive → live
 *        onUpdate((dt, t) => { m.rotation.z = Math.sin(t) * 0.05; });
 *        onTheme((theme) => { ... });                         // optional, after vertex colours switch
 *        return { toilet?: …anything extra… };                // optional, kept as room.slotParts[slot]
 *      });
 *
 *    The builder places parts in ROOM space (same coordinates as the rest of the
 *    room: floor y = 0, back wall at WALL_Z = -3, pet at the origin). The three
 *    items of one slot should share a footprint/anchor, defined as a constant in
 *    the room file.
 *
 * 2. Build the fixed part of the room (shell + decor that is never swapped) and
 *    hand both groups to `makeRoom` (shell.js):
 *
 *      return makeRoom({ id: 'kitchen', staticGroup, liveGroup, update, ... });
 *
 *    `makeRoom` attaches the slot manager below. `createRoom(id, { theme, furniture })`
 *    (index.js) then fills every slot (missing slots → default item).
 *
 * ── ctx passed to a builder ────────────────────────────────────────────────────
 *   b         ClayBuilder (themed, room shadow colours). Everything added here is
 *             merged into the slot's static sub-group (≈ 2–5 draw calls per slot,
 *             baked by wire anyway).
 *   live      THREE.Group inside room.liveGroup for this slot. Only parts that move
 *             or react. Keep it light: every live mesh costs a draw call per frame.
 *   onUpdate  (fn(dt, time)) per-frame callback while the item is shown.
 *   onTheme   (fn(theme)) called after a theme switch (and once right after build).
 *   room      room id ('living' | 'kitchen' | 'bathroom').
 *   preview   true when built for a shop thumbnail (createFurniturePreview).
 *   P, N, W   PALETTE[room], NIGHT[room], wall surface z (WALL_Z + 0.04).
 *
 * ── Rules for builders ─────────────────────────────────────────────────────────
 *   - Static parts go in `b`, never in `live` (the baked background is the point).
 *   - The baked background has no depth: a live part must never sit BEHIND a static
 *     part from the camera's view (it would draw on top of it). Put twinkle lights
 *     and flames on the front surface / inside an opening, not behind a frame.
 *   - Items of the same slot replace each other: stay inside the slot footprint
 *     so swapping never leaves a gap or overlaps a neighbour.
 *   - Every slot must show at least a recognisable part on a 390×844 phone in the
 *     normal framing (pet centre stage, HUD bands top 120 px / bottom 160 px).
 *   - Colours: palette constants from clay.js (BRAND, PALETTE, NIGHT, XMAS). No
 *     bright red or green.
 *
 * ── Room API added by the slot manager (contract) ──────────────────────────────
 *   room.furniture                 { slot: itemId } currently shown (all slots filled)
 *   room.setFurniture(partial)     swap only the named slots; null → default item;
 *                                  unknown id / wrong room or slot → console.warn + ignore.
 *                                  Returns a copy of room.furniture.
 *   room.staticGroup               everything that never moves (wire bakes it)
 *   room.liveGroup                 animated / interactive parts
 *   room.staticVersion             +1 whenever staticGroup content changes
 *   room.slotParts                 { slot: whatever the builder returned } (optional extras)
 *
 *   FURNITURE_SLOTS                { living: ['sofa', …], kitchen: […], bathroom: […] }
 *   FURNITURE_DEFAULTS             { living: { sofa: 'sofa-classic', … }, … }
 *   FURNITURE_ITEMS                { itemId: { room, slot, theme: 'basic'|'xmas', default: bool } }
 *   createFurniturePreview(itemId, { theme }?)
 *                                  → { object3d, fit: { center, radius }, update(dt, t), dispose() }
 */
import * as THREE from 'three';
import { ClayBuilder, PALETTE, NIGHT, applyTheme, disposeTree } from '../props/clay.js';
import { WALL_Z } from './shell.js';   // circular with shell.js on purpose: used only at call time

/* ------------------------------------------------------------------ fixed ids */

/** Item table from the contract (art data, not gameplay numbers — prices live in furniture.json). */
const TABLE = {
  living: {
    sofa: ['sofa-classic', 'sofa-cloud', 'sofa-xmas'],
    rug: ['rug-round', 'rug-flower', 'rug-snow'],
    wall: ['frame-blob', 'wall-books', 'garland-xmas'],
    window: ['window-round', 'window-arch', 'window-snow'],
    corner: ['plant-pot', 'plant-tall', 'xmas-tree'],
    lamp: ['lamp-floor', 'lamp-mushroom', 'lamp-star'],
    side: ['table-mug', 'toy-box', 'fireplace-xmas'],
  },
  kitchen: {
    fridge: ['fridge-classic', 'fridge-retro', 'fridge-gingerbread'],
    wall: ['shelf-jars', 'shelf-plants', 'wreath-xmas'],
    rug: ['mat-kitchen', 'mat-fruit', 'mat-snow'],
  },
  bathroom: {
    mirror: ['mirror-oval', 'mirror-cloud', 'mirror-holly'],
    wall: ['towel-rail', 'towel-stripes', 'stocking-xmas'],
    rug: ['mat-bath', 'mat-duck', 'mat-snow-bath'],
  },
};
const XMAS_IDS = new Set(['sofa-xmas', 'rug-snow', 'garland-xmas', 'window-snow', 'xmas-tree', 'lamp-star', 'fireplace-xmas',
  'fridge-gingerbread', 'wreath-xmas', 'mat-snow', 'mirror-holly', 'stocking-xmas', 'mat-snow-bath']);

/** Slot ids per room, in display order. */
export const FURNITURE_SLOTS = Object.freeze(Object.fromEntries(
  Object.entries(TABLE).map(([room, slots]) => [room, Object.freeze(Object.keys(slots))])));

/** Default item per slot (first in each row). */
export const FURNITURE_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(TABLE).map(([room, slots]) => [room, Object.freeze(Object.fromEntries(Object.entries(slots).map(([s, ids]) => [s, ids[0]])))])));

/** Every furniture item id → { room, slot, theme, default }. */
export const FURNITURE_ITEMS = Object.freeze(Object.fromEntries(
  Object.entries(TABLE).flatMap(([room, slots]) => Object.entries(slots).flatMap(([slot, ids]) =>
    ids.map((id, i) => [id, Object.freeze({ room, slot, theme: XMAS_IDS.has(id) ? 'xmas' : 'basic', default: i === 0 })])))));

/* ------------------------------------------------------------------ registry */

const BUILDERS = new Map();
const warned = new Set();
function warnOnce(key, msg) { if (warned.has(key)) return; warned.add(key); console.warn(msg); }

/**
 * Register the builder of one furniture item (call at module load).
 * @param {string} itemId  an id from FURNITURE_ITEMS
 * @param {(ctx: FurnitureCtx) => any} build
 */
export function registerFurniture(itemId, build) {
  if (!FURNITURE_ITEMS[itemId]) { console.warn(`registerFurniture: "${itemId}" is not a contract item id`); return; }
  BUILDERS.set(itemId, build);
}

/** @returns {boolean} whether an item has a registered builder */
export function hasFurnitureBuilder(itemId) { return BUILDERS.has(itemId); }

/**
 * @typedef {object} FurnitureCtx
 * @property {ClayBuilder} b
 * @property {THREE.Group} live
 * @property {(fn: (dt: number, t: number) => void) => void} onUpdate
 * @property {(fn: (theme: 'light'|'dark') => void) => void} onTheme
 * @property {string} room
 * @property {boolean} preview
 * @property {object} P
 * @property {object} N
 * @property {number} W
 */

/**
 * Build one item into fresh static/live groups.
 * @returns {{ stat: THREE.Group, live: THREE.Group, updates: Function[], themes: Function[], extra: any }}
 */
function buildItem(itemId, { preview = false } = {}) {
  const info = FURNITURE_ITEMS[itemId];
  const room = info.room;
  const b = new ClayBuilder({
    shadowColor: PALETTE[room].shadow, shadowOpacity: 0.22, themed: true, nightShadowColor: NIGHT[room].shadow,
  });
  const live = new THREE.Group(); live.name = `${room}:${info.slot}:live:${itemId}`;
  const updates = [], themes = [];
  let extra;
  const build = BUILDERS.get(itemId);
  if (build) {
    extra = build({
      b, live, room, preview,
      onUpdate: (fn) => updates.push(fn),
      onTheme: (fn) => themes.push(fn),
      P: PALETTE[room], N: NIGHT[room], W: WALL_Z + 0.04,
    });
  } else {
    warnOnce(itemId, `furniture: no builder registered for "${itemId}" yet (slot left empty)`);
  }
  const stat = b.build(`${room}:${info.slot}:static:${itemId}`);
  stat.userData.itemId = itemId; live.userData.itemId = itemId;
  return { stat, live, updates, themes, extra };
}

/* ------------------------------------------------------------------ slot manager */

/**
 * Give a room object its furniture slots (called by makeRoom). Adds
 * `furniture`, `setFurniture`, `slotParts` and wraps `update`/`setTheme`/`dispose`.
 * The room must already have `id`, `staticGroup`, `liveGroup`, `theme` and `staticVersion`.
 * @param {object} room
 */
export function attachFurniture(room) {
  const slots = FURNITURE_SLOTS[room.id] ?? [];
  /** @type {Record<string, {stat: THREE.Group, live: THREE.Group, updates: Function[], themes: Function[]}>} */
  const shown = {};
  room.furniture = {};
  room.slotParts = {};

  room.setFurniture = (partial = {}) => {
    let changed = false;
    for (const [slot, raw] of Object.entries(partial ?? {})) {
      if (!slots.includes(slot)) { console.warn(`setFurniture: room "${room.id}" has no slot "${slot}"`); continue; }
      const id = raw == null ? FURNITURE_DEFAULTS[room.id][slot] : raw;
      const info = FURNITURE_ITEMS[id];
      if (!info) { console.warn(`setFurniture: unknown item id "${id}"`); continue; }
      if (info.room !== room.id || info.slot !== slot) { console.warn(`setFurniture: "${id}" belongs to ${info.room}/${info.slot}, not ${room.id}/${slot}`); continue; }
      if (room.furniture[slot] === id && shown[slot]) continue;
      const old = shown[slot];
      if (old) {
        old.stat.removeFromParent(); old.live.removeFromParent();
        disposeTree(old.stat); disposeTree(old.live);
      }
      const it = buildItem(id);
      it.stat.name = `${room.id}:slot:${slot}`;
      room.staticGroup.add(it.stat); room.liveGroup.add(it.live);
      applyTheme(it.stat, room.theme); applyTheme(it.live, room.theme);
      for (const fn of it.themes) fn(room.theme);
      shown[slot] = it;
      room.furniture[slot] = id;
      room.slotParts[slot] = it.extra;
      changed = true;
    }
    if (changed) room.staticVersion++;
    return { ...room.furniture };
  };

  const baseUpdate = room.update;
  room.update = (dt, t) => {
    baseUpdate(dt, t);
    for (const s in shown) for (const fn of shown[s].updates) fn(dt, t);
  };
  const baseTheme = room.setTheme;
  room.setTheme = (theme) => {
    baseTheme(theme);
    for (const s in shown) for (const fn of shown[s].themes) fn(room.theme);
  };
}

/* ------------------------------------------------------------------ preview */

/**
 * Build one furniture item alone, for shop thumbnails. Parts sit where they sit
 * in the room; `fit` frames the visible clay (soft shadows and night-only halos are ignored).
 * @param {string} itemId
 * @param {{theme?: 'light'|'dark'}} [o]
 * @returns {{ object3d: THREE.Group, fit: { center: THREE.Vector3, radius: number }, update: (dt: number, t: number) => void, dispose: () => void }}
 */
export function createFurniturePreview(itemId, o = {}) {
  const info = FURNITURE_ITEMS[itemId];
  if (!info) throw new Error(`createFurniturePreview: unknown item id "${itemId}"`);
  const it = buildItem(itemId, { preview: true });
  const object3d = new THREE.Group(); object3d.name = 'preview:' + itemId;
  object3d.add(it.stat, it.live);
  const theme = o.theme === 'dark' ? 'dark' : 'light';
  applyTheme(object3d, theme);
  for (const fn of it.themes) fn(theme);
  // fit: union of visible, non-shadow meshes
  object3d.updateMatrixWorld(true);
  const box = new THREE.Box3(), tmp = new THREE.Box3();
  object3d.traverse((m) => {
    if (!m.isMesh || !m.visible || /:(shadow|halo)$/.test(m.name) || m.userData.fitIgnore) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); box.union(tmp);
  });
  const center = new THREE.Vector3(), radius = box.isEmpty() ? 1 : box.getBoundingSphere(new THREE.Sphere()).radius;
  if (!box.isEmpty()) box.getCenter(center);
  return {
    object3d,
    fit: { center, radius },
    update(dt, t) { for (const fn of it.updates) fn(dt, t); },
    dispose() { object3d.removeFromParent(); disposeTree(object3d); },
  };
}
