/**
 * shell.js — shared pieces every room is built from (owner: prop).
 * Back wall at z = -3, floor at y = 0 reaching z = 6, both wide enough for x = -7..7
 * at the pet's depth on very wide desktop screens.
 */
import * as THREE from 'three';
import { roundedBox, gradientY, lighten, disposeTree, countDrawCalls } from '../props/clay.js';

export const WALL_Z = -3;
const HALF_W = 16;

/**
 * Add wall, floor and a rounded skirting trim to a builder.
 * @param {import('../props/clay.js').ClayBuilder} b
 * @param {{wall: string, floor: string, trim: string}} pal
 */
export function addShell(b, pal) {
  // Wall: very soft vertical gradient, a touch lighter at the top.
  const wall = new THREE.PlaneGeometry(HALF_W * 2, 10, 1, 8);
  b.add(wall, gradientY(pal.wall, lighten(pal.wall, 0.45), -5, 5), { position: [0, 5, WALL_Z], shade: 0 });
  // Floor: lighter toward the wall so the room reads deep without shadows.
  const floor = new THREE.PlaneGeometry(HALF_W * 2, 9.5, 1, 10);
  floor.rotateX(-Math.PI / 2);
  b.add(floor, (x, y, z, c) => c.set(pal.floor).lerp(new THREE.Color(lighten(pal.floor, 0.35)), THREE.MathUtils.clamp((-z + 4.75) / 9.5, 0, 1) ** 2 * 0.9),
    { position: [0, 0, WALL_Z + 4.75], shade: 0 });
  // Skirting: one long soft bead where wall meets floor.
  b.add(roundedBox(HALF_W * 2, 0.32, 0.22, 0.1), pal.trim, { position: [0, 0.16, WALL_Z + 0.05], shade: 0.04 });
}

/**
 * Wrap a built room into the contract object (docs/architecture/module-contracts.md).
 * @param {{id: string, group: THREE.Group, petSpot?: THREE.Vector3, dropZones?: object,
 *          toiletSeat?: THREE.Vector3, flush?: () => number, update?: (dt:number, t:number) => void}} o
 */
export function makeRoom(o) {
  o.group.name = 'room:' + o.id;
  o.group.userData.roomId = o.id;
  const room = {
    id: o.id,
    group: o.group,
    petSpot: o.petSpot ?? new THREE.Vector3(0, 0, 0),
    lights: [],
    dropZones: o.dropZones ?? {},
    update: o.update ?? (() => {}),
    /** Draw calls this room issues (for the perf budget, ≤ 60). */
    drawCalls: () => countDrawCalls(o.group),
    dispose() { o.group.removeFromParent(); disposeTree(o.group); },
  };
  if (o.toiletSeat) room.toiletSeat = o.toiletSeat;
  if (o.flush) room.flush = o.flush;
  return room;
}

/** Ease helpers for soft motion (no hard bounce). */
export const ease = {
  inOut: (t) => t * t * (3 - 2 * t),
  out: (t) => 1 - (1 - t) * (1 - t),
};
