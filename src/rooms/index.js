/**
 * rooms/index.js — room factory (owner: prop). Contract: docs/architecture/module-contracts.md
 * "Rooms and props — prop".
 *
 * @example
 *   const room = createRoom('bathroom');
 *   scene.add(room.group);
 *   room.update(dt, time);           // every frame
 *   room.flush?.();                  // bathroom only → seconds
 *   room.dispose();
 */
import { buildLiving } from './living.js';
import { buildKitchen } from './kitchen.js';
import { buildBathroom } from './bathroom.js';

/** Room ids in swipe order. */
export const ROOM_IDS = Object.freeze(['living', 'kitchen', 'bathroom']);

/** Thai display names (fallback; HUD titles belong to glaze). */
export const ROOM_NAMES_TH = Object.freeze({ living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', bathroom: 'ห้องน้ำ' });

const BUILDERS = { living: buildLiving, kitchen: buildKitchen, bathroom: buildBathroom };

/**
 * Build a room synchronously.
 * @param {'living'|'kitchen'|'bathroom'} id
 * @returns {{ id: string, group: import('three').Group, petSpot: import('three').Vector3, lights: import('three').Light[],
 *   dropZones: { toilet?: { position: import('three').Vector3, radius: number } },
 *   toiletSeat?: import('three').Vector3, flush?: () => number,
 *   update: (dt: number, time: number) => void, drawCalls: () => number, dispose: () => void }}
 */
export function createRoom(id) {
  const build = BUILDERS[id];
  if (!build) throw new Error(`createRoom: unknown room id "${id}" (expected one of ${ROOM_IDS.join(', ')})`);
  return build();
}
