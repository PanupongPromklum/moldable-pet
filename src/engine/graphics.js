/**
 * Graphics level (owner 2026-11-24: "ตั้งค่า Graphic ให้ swap ไป Low High" — a slow
 * Android phone stuttered). Two levels; everything they change applies live, no reload.
 * The frame rate is its own choice, 60 or 30 (owner 2026-11-24: "30fps มันต่ำไป"), on either level.
 *
 *  - pixel ratio cap: the biggest cost on a weak phone is the number of pixels drawn
 *    (a 1080p phone at 1.75× draws ~3× the pixels of 1×).
 *  - frame rate (separate choice): 60 by default; 30 halves the work per second
 *    (and the heat / battery). 60 is a cap too, so a 120 Hz phone does not draw 120.
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
 * `dprTouch` / `dprMouse`: devicePixelRatio caps.
 * `petDetail`: pet body icosahedron detail, null = character.js default. `rich`: sheen + clear coat.
 * `faceScale`: eye / mouth canvas size (1 = 512 px). `faceHz`: most face redraws a second (0 = every frame).
 * Both are redone and uploaded to the GPU while the pet is touched (the eyes follow the finger).
 * `camera`: hand-tracking budget `{ hz, width }` (most detections a second, 0 = every camera frame; video width).
 * `aa`: edge smoothing (MSAA) of the screen and of the room picture. The biggest single cost on a weak GPU
 * (about half the frame time in the software-GL test) and the only knob that cannot change live: it is a
 * property of the GL context, so it applies at the next start (the settings sheet restarts the game).
 */
export const GRAPHICS_PRESETS = Object.freeze({
  high: Object.freeze({ bake: true, dprTouch: 1.75, dprMouse: 2, petDetail: null, rich: true, faceScale: 1, faceHz: 0, aa: true, camera: Object.freeze({ hz: 0, width: 960 }) }),
  low: Object.freeze({ bake: true, dprTouch: 1, dprMouse: 1, petDetail: 28, rich: false, faceScale: 0.5, faceHz: 20, aa: false, camera: Object.freeze({ hz: 15, width: 640 }) }),
});

/** Frame-rate choices (frame cap in fps), default first. */
export const FPS_CHOICES = Object.freeze([60, 30]);

/**
 * Frame cap: draw this screen refresh? Measured from the last drawn frame (not fixed slots), so a
 * 60.5 Hz screen never drifts into a dropped frame; 4 ms of slack absorbs vsync jitter.
 * 60 Hz screen → 60 / 30, 120 Hz → 60 / 30. `fps` 0 = draw every refresh.
 * @param {number} now ms @param {number} lastDraw ms of the last drawn frame @param {number} fps
 */
export const frameDue = (now, lastDraw, fps) => !(fps > 0) || now - lastDraw >= 1000 / fps - 4;

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

/** Valid frame-rate choice (anything else → 60). @returns {60|30} */
export const fpsChoice = (v) => (FPS_CHOICES.includes(Number(v)) ? Number(v) : FPS_CHOICES[0]);

/**
 * Saved level of this device.
 * @param {string|null} raw value of localStorage[GRAPHICS_KEY]
 * @returns {{ level: 'high'|'low', by: 'player'|'auto', fps: 60|30 }|null} null = nothing saved yet
 */
export function readGraphics(raw) {
  if (raw == null || raw === '') return null;
  let o = null;
  try { o = JSON.parse(raw); } catch { o = { level: raw }; }   // tolerate a bare "low"
  if (!o || !GRAPHICS_LEVELS.includes(o.level)) return null;
  return { level: o.level, by: o.by === 'player' ? 'player' : 'auto', fps: fpsChoice(o.fps) };
}

/** @param {'high'|'low'} level @param {'player'|'auto'} by @param {number} [fps] @returns {string} */
export const writeGraphics = (level, by, fps = FPS_CHOICES[0]) => JSON.stringify({ level, by, fps: fpsChoice(fps) });

/**
 * Pick the level to boot with.
 * @param {{ param?: string|null, saved?: {level:string, by:string}|null, device?: object, automated?: boolean }} o
 *   param = `?gfx=` URL value; automated = browser driven by tests (keeps the default high)
 * @returns {{ level: 'high'|'low', by: 'url'|'player'|'auto'|'guess'|'default', fps: 60|30 }} fps = saved choice or 60
 */
export function bootLevel({ param = null, saved = null, device = {}, automated = false } = {}) {
  const fps = fpsChoice(saved?.fps);
  if (GRAPHICS_LEVELS.includes(param)) return { level: param, by: 'url', fps };
  if (saved && GRAPHICS_LEVELS.includes(saved.level)) return { level: saved.level, by: saved.by, fps };
  if (automated) return { level: 'high', by: 'default', fps };
  return { level: guessLevel(device), by: 'guess', fps };
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
