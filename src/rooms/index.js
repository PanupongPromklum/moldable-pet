/**
 * rooms/index.js — room factory (owner: prop). Contract: docs/architecture/module-contracts.md
 * "Rooms and props — prop" and "Sprint 4 additions → Rooms — prop".
 *
 * @example
 *   const room = createRoom('living', { theme: 'dark', furniture: { sofa: 'sofa-xmas' } });
 *   scene.add(room.group);               // = staticGroup + liveGroup
 *   room.update(dt, time);               // every frame
 *   room.setFurniture({ corner: 'xmas-tree' });   // rebuilds that slot only, staticVersion++
 *   room.flush?.();                      // bathroom only → seconds
 *   room.setTheme('dark');               // evening look; 'light' = day look (default)
 *   room.dispose();
 *
 *   const p = createFurniturePreview('xmas-tree');  // shop thumbnail: { object3d, fit: { center, radius }, update, dispose }
 */
import { buildLiving } from './living.js';
import { buildKitchen } from './kitchen.js';
import { buildBathroom } from './bathroom.js';
import { FURNITURE_DEFAULTS, FURNITURE_SLOTS } from './furniture.js';

export { ROOM_THEME_LIGHTS, applyStageLights } from './shell.js';
export {
  FURNITURE_SLOTS, FURNITURE_DEFAULTS, FURNITURE_ITEMS, createFurniturePreview, hasFurnitureBuilder,
} from './furniture.js';

/** Room ids in swipe order. */
export const ROOM_IDS = Object.freeze(['living', 'kitchen', 'bathroom']);

/** Thai display names (fallback; HUD titles belong to glaze). */
export const ROOM_NAMES_TH = Object.freeze({ living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', bathroom: 'ห้องน้ำ' });

const BUILDERS = { living: buildLiving, kitchen: buildKitchen, bathroom: buildBathroom };

/**
 * Build a room synchronously, with every furniture slot filled.
 * @param {'living'|'kitchen'|'bathroom'} id
 * @param {{theme?: 'light'|'dark', furniture?: Record<string, string|null>}} [o]
 *   `theme`: start in this theme (same as calling `setTheme` after).
 *   `furniture`: { slot: itemId } — missing slots get the default item; unknown ids warn and fall back to the default.
 * @returns {{ id: string, group: import('three').Group, staticGroup: import('three').Group, liveGroup: import('three').Group,
 *   staticVersion: number, furniture: Record<string, string>, setFurniture: (partial: Record<string, string|null>) => Record<string, string>,
 *   petSpot: import('three').Vector3, lights: import('three').Light[],
 *   dropZones: { toilet?: { position: import('three').Vector3, radius: number } },
 *   toiletSeat?: import('three').Vector3, flush?: () => number,
 *   update: (dt: number, time: number) => void, drawCalls: () => number, dispose: () => void,
 *   theme: 'light'|'dark', setTheme: (theme: 'light'|'dark') => void }}
 */
export function createRoom(id, o = {}) {
  const build = BUILDERS[id];
  if (!build) throw new Error(`createRoom: unknown room id "${id}" (expected one of ${ROOM_IDS.join(', ')})`);
  const room = build();
  room.setTheme(o.theme ?? 'light');
  room.setFurniture({ ...FURNITURE_DEFAULTS[id], ...(o.furniture ?? {}) });
  const missing = FURNITURE_SLOTS[id].filter((s) => !room.furniture[s]);   // ignored (bad) ids → default
  if (missing.length) room.setFurniture(Object.fromEntries(missing.map((s) => [s, null])));
  room.staticVersion = 1;
  return room;
}
