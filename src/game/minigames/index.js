/**
 * Minigame registry (S5-06, wire-games). One table, one lifecycle, four games:
 * ฝนขนม `snackRain`, จำท่าทาง `mimic`, เป่าฟองสบู่ `bubbles`, กระโดดข้ามก้อน `hop`.
 * Design: design/gdd/minigames-2.md (+ minigame-snack-rain.md for the shared flow).
 * Contract: docs/architecture/module-contracts.md › Sprint 5 › Game.
 *
 * ## Registry entry
 * ```js
 * import { MINIGAMES, GAME_IDS, gameInfo } from './game/minigames/index.js';
 * MINIGAMES.hop = {
 *   id: 'hop', title: 'กระโดดข้ามก้อน', howTo: '…', controls: ['touch', 'head'],
 *   view: { extraWidth, hudReserve: { top, bottom } },   // camera framing suggestion for main
 *   available(data) → bool,     // false when minigames.json has no block for it (picker hides the card)
 *   create(ctx) → MinigameInstance,
 * };
 * gameInfo(id, data) → { id, title, howTo, controls }   // data-driven text for picker / intro card
 * ```
 *
 * ## ctx (main.js builds ONE object and passes it to every create; extra keys are ignored)
 * | key | needed by | what |
 * |---|---|---|
 * | `stage, game, hud, sfx, mood` | all | as in main today (game: `best()`, `setBest(id, score)`, `addCoins`, `bump`, `persist`) |
 * | `getPet()`, `getHome()` | all | pet API / room pet spot (Vector3) |
 * | `data` | all | whole `minigames.json` (null → defaults; each game reads `data[id]` + `data.picker`) |
 * | `props` | all | `src/props/minigame.js` module or null (each factory is feature-detected, fallbacks built in) |
 * | `getCharKey()`, `getPersona()` | all | favourite game (`picker.favorites`), `playGain`, `hurtExpr`, persona `lines` |
 * | `getControl()` | all | `'touch' \| 'head'` for this round (main still owns camera start/calibration) |
 * | `head` | bubbles, hop | the head control object: `axis()` −1..1 \| null; `roll()` degrees from neutral \| null (**wire-core to add**; hop falls back to an estimate from `axis()`) |
 * | `getControlX()` | snackRain | head → client x (unchanged Snack Rain path) |
 * | `foodIds, isLiked(foodId), makeFoodMesh(foodId)` | snackRain | food meshes (main passes `createFoodMesh` sized) |
 * | `makeMesh(kind, foodId)` | snackRain (optional) | full override of Snack Rain's mesh factory (main's current code) |
 * | `isFirstPlay(id)` | new games | true → coach line + `picker.firstPlayEasySec` easiest settings |
 * | `relaxed(id)` | new games | "โหมดสบายๆ" for this game (GDD 3.5), saved per game by wire-core |
 * | `minigameMinScale` | all | growth floor: pet size in game = max(stage scale, this) (needs `pet.getGrowth/setGrowth`) |
 * | `random`, `keyTarget` | all | rng (seeded in tests) and key event target (default `window`) |
 * | `reduceMotion` | new games | skip bounces/shakes |
 * | `onNeedsChanged()`, `onCoins(total)`, `onStateChange(active)`, `onEnd(result)` | all | callbacks |
 *
 * ## MinigameInstance (Snack Rain's lifecycle, unchanged, plus pointer ids and pads)
 * ```js
 * start() → bool          // idle → countdown (hud.startMinigame Promise drives "go") → play
 * update(dt, time)        // per frame, after gestures/care so the pet pose set here wins
 * pointerDown(x, y, id)   // client px, from window pointerdown when !hud.isHudPoint(x, y)
 * pointerMove(x, y, id, pressed)   // pressed = e.buttons || touch
 * pointerUp(id)
 * pointerX(x)             // legacy Snack Rain call (= pointerMove)
 * pad(id)                 // HUD handler onMimicPad(id) → mimic; no-op elsewhere
 * setPaused(p, by)        // by 'tab' (visibilitychange) | 'user'
 * again()                 // result card "เล่นอีก"
 * exit()                  // ✕ / "เกมอื่น" / character change; pays out an early exit
 * dispose()
 * active, phase ('idle'|'countdown'|'play'|'result'|'return'), paused, lastResult, state (debug)
 * ```
 * Keys are read by the instance on `ctx.keyTarget` (capture phase, so the room manager never sees them).
 * Result (`lastResult`, `onEnd(result)`): `{ id, score, coins, best, newBest, completed, fractionPlayed,
 * needs: { fun, social, hunger } (applied deltas), line? }`. Each game itself pays coins / best / needs
 * through `game.*` once, and shows `hud.showMinigameResult({ id, score, best, coins, line })`.
 * After `exit()` the instance eases the pet home (`phase 'return'`) and then calls `onStateChange(false)`.
 * @module game/minigames/index
 */
import { createSnackRain, resolveConfig as resolveSnackRain } from './snack-rain.js';
import { createMimic } from './mimic.js';
import { createBubbles } from './bubbles.js';
import { createHop } from './hop.js';
import { MIMIC_DEFAULTS } from './mimic-rules.js';
import { BUBBLES_DEFAULTS } from './bubbles-rules.js';
import { HOP_DEFAULTS } from './hop-rules.js';
import { PICKER_DEFAULTS } from './common-rules.js';

export { PICKER_DEFAULTS, resolvePicker } from './common-rules.js';

const snackRain = {
  id: 'snackRain', title: 'ฝนขนม', howTo: 'เลื่อนตัวไปรับขนมที่ตกลงมา', controls: ['touch', 'head'],
  view: { extraWidth: 2.6, hudReserve: { top: 380, bottom: 20 } },
  available: () => true,
  /** Wraps createSnackRain; behaviour is the Sprint 2–4 game. */
  create(ctx) {
    const { cfg } = resolveSnackRain(ctx.data?.snackRain);
    const sized = (mesh, native) => { mesh.scale.setScalar(cfg.itemSize / (native || cfg.itemSize)); mesh.userData.baseScale = mesh.scale.x; return mesh; };
    const P = ctx.props;
    const makeMesh = ctx.makeMesh || ((kind, foodId) => {
      if (kind === 'coin' && P?.createCoinMesh) return sized(P.createCoinMesh(), P.COIN_SIZE);
      if (kind === 'demon' && P?.createDemonMesh) return sized(P.createDemonMesh(), P.DEMON_SIZE);
      return ctx.makeFoodMesh ? ctx.makeFoodMesh(foodId || 'onigiri') : null;
    });
    const inst = createSnackRain({
      stage: ctx.stage, game: ctx.game, hud: ctx.hud, sfx: ctx.sfx, mood: ctx.mood,
      getPet: ctx.getPet, getHome: ctx.getHome, cfg, makeMesh, foodIds: ctx.foodIds,
      isLiked: ctx.isLiked, getPersona: ctx.getPersona, getControlX: ctx.getControlX, getControl: ctx.getControl,
      lostHint: ctx.lostHint, onNeedsChanged: ctx.onNeedsChanged, onCoins: ctx.onCoins, onStateChange: ctx.onStateChange,
      onEnd: ctx.onEnd, random: ctx.random, keyTarget: ctx.keyTarget,
    });
    inst.pointerDown = (x) => inst.pointerX(x);
    inst.pointerMove = (x, _y, _id, pressed) => { if (pressed !== false) inst.pointerX(x); };
    inst.pointerUp = () => {};
    inst.pad = () => {};
    return inst;
  },
};

const mimic = {
  id: 'mimic', title: MIMIC_DEFAULTS.title, howTo: MIMIC_DEFAULTS.howTo, controls: ['touch'],
  view: { extraWidth: 0.6, hudReserve: { top: 150, bottom: 250 } },
  available: (data) => !data || !!data.mimic,
  create: (ctx) => createMimic(ctx),
};

const bubbles = {
  id: 'bubbles', title: BUBBLES_DEFAULTS.title, howTo: BUBBLES_DEFAULTS.howTo, controls: ['touch', 'head'],
  view: { extraWidth: 2.6, hudReserve: { top: 380, bottom: 20 } },
  available: (data) => !data || !!data.bubbles,
  create: (ctx) => createBubbles(ctx),
};

const hop = {
  id: 'hop', title: HOP_DEFAULTS.title, howTo: HOP_DEFAULTS.howTo, controls: ['touch', 'head'],
  view: { extraWidth: 2.6, hudReserve: { top: 380, bottom: 40 } },
  available: (data) => !data || !!data.hop,
  create: (ctx) => createHop(ctx),
};

/** The four games, keyed by id. */
export const MINIGAMES = Object.freeze({ snackRain, mimic, bubbles, hop });

/** Picker order from `minigames.json › picker.order` (unknown ids dropped, missing appended). */
export function gameOrder(data) {
  const o = Array.isArray(data?.picker?.order) ? data.picker.order.filter((id) => MINIGAMES[id]) : [];
  for (const id of PICKER_DEFAULTS.order) if (!o.includes(id)) o.push(id);
  return o;
}

/** Ids in picker order. */
export const GAME_IDS = Object.freeze(PICKER_DEFAULTS.order.slice());

/**
 * Picker / intro text for one game (data wins over the defaults above).
 * @param {string} id @param {object|null} data minigames.json
 */
export function gameInfo(id, data) {
  const g = MINIGAMES[id]; if (!g) return null;
  const d = data?.[id] || {};
  return {
    id, title: typeof d.title === 'string' ? d.title : g.title,
    howTo: typeof d.howTo === 'string' ? d.howTo : g.howTo,
    controls: Array.isArray(d.controls) ? d.controls.slice() : g.controls.slice(),
    available: g.available(data),
  };
}

/** Favourite game of a character (`picker.favorites`), or null. */
export function favoriteOf(charKey, data) {
  const f = (data?.picker?.favorites || PICKER_DEFAULTS.favorites)[charKey];
  return MINIGAMES[f] ? f : null;
}
