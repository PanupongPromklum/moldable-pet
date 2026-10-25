/**
 * shell.js — shared pieces every room is built from (owner: prop).
 * Back wall at z = -3, floor at y = 0 reaching z = 6, both wide enough for x = -7..7
 * at the pet's depth on very wide desktop screens.
 */
import * as THREE from 'three';
import { roundedBox, gradientY, lighten, disposeTree, countDrawCalls, applyTheme } from '../props/clay.js';

export const WALL_Z = -3;
const HALF_W = 16;

/**
 * Add wall, floor and a rounded skirting trim to a builder.
 * @param {import('../props/clay.js').ClayBuilder} b
 * @param {{wall: string, floor: string, trim: string}} pal
 * @param {{wall: string, floor: string, trim: string}} [night]  evening tints (dark theme)
 */
export function addShell(b, pal, night) {
  const n = night ?? pal;
  // Wall: very soft vertical gradient, a touch lighter at the top (evening: a gentle lift only).
  const wall = new THREE.PlaneGeometry(HALF_W * 2, 10, 1, 8);
  b.add(wall, gradientY(pal.wall, lighten(pal.wall, 0.45), -5, 5),
    { position: [0, 5, WALL_Z], shade: 0, night: gradientY(n.wall, lighten(n.wall, 0.1), -5, 5) });
  // Floor: lighter toward the wall so the room reads deep without shadows.
  const floor = new THREE.PlaneGeometry(HALF_W * 2, 9.5, 1, 10);
  floor.rotateX(-Math.PI / 2);
  const floorPaint = (base, lift) => {
    const a = new THREE.Color(base), bb = new THREE.Color(lighten(base, lift));
    return (x, y, z, c) => c.copy(a).lerp(bb, THREE.MathUtils.clamp((-z + 4.75) / 9.5, 0, 1) ** 2 * 0.9);
  };
  b.add(floor, floorPaint(pal.floor, 0.35), { position: [0, 0, WALL_Z + 4.75], shade: 0, night: floorPaint(n.floor, 0.12) });
  // Skirting: one long soft bead where wall meets floor.
  b.add(roundedBox(HALF_W * 2, 0.32, 0.22, 0.1), pal.trim, { position: [0, 0.16, WALL_Z + 0.05], shade: 0.04, night: n.trim });
}

/**
 * Suggested stage lights per room theme, for wire's stage (hemisphere + key +
 * fill + rim, as in `src/engine/stage.js`). `light` equals the current stage
 * values; `dark` is the evening look: dimmer, cooler sky, warm lamp-like key.
 * Colours are sRGB hex; `clear` is a page/background colour that matches the walls.
 */
export const ROOM_THEME_LIGHTS = Object.freeze({
  light: Object.freeze({
    hemi: { sky: '#FFE1F2', ground: '#9CB0EA', intensity: 2.1 },
    key: { color: '#FFF5FB', intensity: 1.5 },
    fill: { color: '#A8B8FF', intensity: 0.55 },
    rim: { color: '#FFFFFF', intensity: 1.3 },
    clear: '#F2F1FB',
  }),
  dark: Object.freeze({
    hemi: { sky: '#C9BDF0', ground: '#4A4C8C', intensity: 1.55 },
    key: { color: '#FFE2CC', intensity: 1.05 },
    fill: { color: '#8E9CFF', intensity: 0.45 },
    rim: { color: '#D6CCFF', intensity: 0.9 },
    clear: '#2C2A4A',
  }),
});

/**
 * Apply {@link ROOM_THEME_LIGHTS} to a stage's lights (helper for wire; optional).
 * @param {'light'|'dark'} theme
 * @param {{hemi?: THREE.HemisphereLight, key?: THREE.DirectionalLight, fill?: THREE.DirectionalLight, rim?: THREE.DirectionalLight}} lights
 */
export function applyStageLights(theme, lights) {
  const v = ROOM_THEME_LIGHTS[theme === 'dark' ? 'dark' : 'light'];
  if (lights.hemi) { lights.hemi.color.set(v.hemi.sky); lights.hemi.groundColor.set(v.hemi.ground); lights.hemi.intensity = v.hemi.intensity; }
  for (const k of ['key', 'fill', 'rim']) if (lights[k]) { lights[k].color.set(v[k].color); lights[k].intensity = v[k].intensity; }
}

/**
 * Wrap a built room into the contract object (docs/architecture/module-contracts.md).
 * @param {{id: string, group: THREE.Group, petSpot?: THREE.Vector3, dropZones?: object,
 *          toiletSeat?: THREE.Vector3, flush?: () => number, update?: (dt:number, t:number) => void,
 *          onTheme?: (theme: 'light'|'dark') => void}} o
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
    theme: 'light',
    /**
     * Switch between the day look and the evening look (dark theme). Swaps vertex
     * colours and material values in place — no rebuild, safe to call every frame.
     * @param {'light'|'dark'} theme
     */
    setTheme(theme) {
      const t = theme === 'dark' ? 'dark' : 'light';
      applyTheme(o.group, t);
      room.theme = t;
      o.onTheme?.(t);
    },
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
