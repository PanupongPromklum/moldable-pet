/**
 * Graphics level (owner 2026-11-24: "ตั้งค่า Graphic ให้ swap ไป Low High" — a slow
 * Android phone stuttered). Two levels; everything they change applies live, no reload.
 *
 *  - pixel ratio cap: the biggest cost on a weak phone is the number of pixels drawn
 *    (a 1080p phone at 1.75× draws ~3× the pixels of 1×).
 *  - frame cap: 30 fps on low halves the work per second (and the heat / battery).
 *  - pet body detail: the soft body is re-shaped on the CPU every frame it squishes
 *    (positions + normals of every vertex, then uploaded); low uses ~⅓ of the vertices.
 *  - rich materials: the pet's satin sheen + clear coat are the most expensive pixel
 *    shader in the scene; low turns those two layers off (colour and shape stay).
 *
 * The level belongs to the DEVICE, not the account: it is stored in its own
 * localStorage key, never in the save, so cloud sync never moves it between devices.
 * First visit with no choice: a guess from the device, then one automatic step down
 * to low if the game runs below `SLOW` fps for a few seconds. A choice the player
 * makes in the settings sheet is never changed by the game.
 *
 * Pure helpers (`guessLevel`, `readGraphics`, `isSlow`, `richMaterials`) are
 * unit-tested in tests/unit/graphics.test.mjs.
 * @module engine/graphics
 */

/** Levels, best first. */
export const GRAPHICS_LEVELS = Object.freeze(['high', 'low']);
/** localStorage key (per device; not part of the save). */
export const GRAPHICS_KEY = 'mp-graphics';

/**
 * Presentation knobs per level (not gameplay numbers).
 * `dprTouch` / `dprMouse`: devicePixelRatio caps. `fps`: frame cap, 0 = the screen's rate.
 * `petDetail`: pet body icosahedron detail, null = character.js default. `rich`: sheen + clear coat.
 */
export const GRAPHICS_PRESETS = Object.freeze({
  high: Object.freeze({ bake: true, dprTouch: 1.75, dprMouse: 2, fps: 0, petDetail: null, rich: true }),
  low: Object.freeze({ bake: true, dprTouch: 1, dprMouse: 1, fps: 30, petDetail: 28, rich: false }),
});

/** Auto step-down: average fps below `fps` over `seconds`, after `warmup` seconds on screen. */
export const SLOW = Object.freeze({ fps: 24, seconds: 4, warmup: 3 });

/**
 * First guess for a device with no saved level. Touch devices with little memory
 * or few cores start on low; everything else on high.
 * @param {{ deviceMemory?: number, hardwareConcurrency?: number, coarse?: boolean }} d
 * @returns {'high'|'low'}
 */
export function guessLevel(d = {}) {
  if (!d.coarse) return 'high';
  const mem = Number(d.deviceMemory), cores = Number(d.hardwareConcurrency);
  if (Number.isFinite(mem) && mem > 0 && mem <= 3) return 'low';
  if (Number.isFinite(cores) && cores > 0 && cores <= 4) return 'low';
  return 'high';
}

/**
 * Saved level of this device.
 * @param {string|null} raw value of localStorage[GRAPHICS_KEY]
 * @returns {{ level: 'high'|'low', by: 'player'|'auto' }|null} null = nothing saved yet
 */
export function readGraphics(raw) {
  if (raw == null || raw === '') return null;
  let o = null;
  try { o = JSON.parse(raw); } catch { o = { level: raw }; }   // tolerate a bare "low"
  if (!o || !GRAPHICS_LEVELS.includes(o.level)) return null;
  return { level: o.level, by: o.by === 'player' ? 'player' : 'auto' };
}

/** @param {'high'|'low'} level @param {'player'|'auto'} by @returns {string} */
export const writeGraphics = (level, by) => JSON.stringify({ level, by });

/**
 * Pick the level to boot with.
 * @param {{ param?: string|null, saved?: {level:string, by:string}|null, device?: object, automated?: boolean }} o
 *   param = `?gfx=` URL value; automated = browser driven by tests (keeps the default high)
 * @returns {{ level: 'high'|'low', by: 'url'|'player'|'auto'|'guess'|'default' }}
 */
export function bootLevel({ param = null, saved = null, device = {}, automated = false } = {}) {
  if (GRAPHICS_LEVELS.includes(param)) return { level: param, by: 'url' };
  if (saved && GRAPHICS_LEVELS.includes(saved.level)) return { level: saved.level, by: saved.by };
  if (automated) return { level: 'high', by: 'default' };
  return { level: guessLevel(device), by: 'guess' };
}

/**
 * Frame intervals (ms) → too slow? Needs at least `SLOW.seconds` worth of frames.
 * @param {number[]} intervals
 * @param {{fps:number, seconds:number}} [cfg]
 */
export function isSlow(intervals, cfg = SLOW) {
  let sum = 0;
  for (const v of intervals) sum += v;
  if (!intervals.length || sum < cfg.seconds * 1000) return false;
  return intervals.length / (sum / 1000) < cfg.fps;
}

/** Keys turned off on low, with the value that means "off" in three.js (0 drops the shader layer). */
const RICH_KEYS = ['sheen', 'clearcoat'];

/**
 * Turn the rich layers of every MeshPhysicalMaterial under `root` off (rich=false)
 * or back to their own values (rich=true). Idempotent; materials made later are
 * caught by the next call. Changing a layer between 0 and >0 recompiles that
 * material once (three.js keys the program on `> 0`).
 * @param {{ traverse: Function }} root
 * @param {boolean} rich
 * @returns {number} materials changed
 */
export function richMaterials(root, rich) {
  let n = 0;
  const seen = new Set();
  root.traverse((o) => {
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of list) {
      if (!m || !m.isMeshPhysicalMaterial || seen.has(m)) continue;
      seen.add(m);
      const kept = m.userData.mpRich;
      if (!rich && !kept) {
        const k = {};
        for (const key of RICH_KEYS) { k[key] = m[key]; m[key] = 0; }
        m.userData.mpRich = k; n++;
      } else if (rich && kept) {
        for (const key of RICH_KEYS) m[key] = kept[key];
        delete m.userData.mpRich; n++;
      }
    }
  });
  return n;
}
