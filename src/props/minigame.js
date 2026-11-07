/**
 * minigame.js — barrel for every minigame prop (owner: prop). Import from here.
 * Contracts: docs/architecture/module-contracts.md "Sprint 2 additions → Minigame"
 * and "Sprint 5 additions"; looks per design/gdd/minigames-2.md 3.2–3.5.
 *
 * Sizes and origins (world units; 1 = prototype body radius; everything faces +Z):
 * | Export | Size | Origin | Draw calls | Module |
 * |---|---|---|---|---|
 * | `createCoinMesh()` / `createHopCoin()` | 0.40 across | centre | 1 | minigame-snack.js |
 * | `createDemonMesh()` | 0.50 across | centre | 1 | minigame-snack.js |
 * | `createBubbleMesh(colorId)` | 0.50 diameter | centre | 2 | minigame-bubbles.js |
 * | `createPopBurst(colorId)` / `popBubble(mesh)` | ~0.8 at the end | centre | 2 (1 reduced motion) | minigame-bubbles.js |
 * | `createBubbleWand()` | 0.70 tall | bottom of the grip | 3 | minigame-bubbles.js |
 * | `createPopStar()` | 0.50 across | centre | 2 | minigame-bubbles.js |
 * | `createHopObstacle(kind)` | pebble 0.50×0.38, cushion 0.66×0.40, demon 0.50×0.45 | bottom centre | 2 | minigame-hop.js |
 * | `createHopGround(width)` | width × 1.3 deep | top centre (y = 0 is the surface) | 2 | minigame-hop.js |
 * | `createMimicStage()` | radius 1.15 | top centre | 3 | minigame-mimic.js |
 *
 * Every geometry is cached and shared (`userData.shared`, so `disposeTree()` keeps
 * it); bubble shells share one material per colour. Nothing allocates per frame.
 *
 * Themes: the ground, podium, soap and glow materials follow the light/dark theme
 * through {@link applyMinigameTheme}; coin, demon, obstacles and bubble symbols
 * are matte pastel clay that reads on both themes.
 */
import { applyTheme } from './clay.js';
import { applySoapTheme } from './minigame-bubbles.js';

export { COIN_SIZE, DEMON_SIZE, createCoinMesh, createDemonMesh, getCoinGeometry, getDemonGeometry } from './minigame-snack.js';
export {
  BUBBLE_SIZE, WAND_SIZE, POP_STAR_SIZE, BUBBLE_COLORS, BUBBLE_PATTERNS,
  createBubbleMesh, getBubbleParts, createSoapMaterial, createPopBurst, popBubble, createBubbleWand, createPopStar, applySoapTheme,
} from './minigame-bubbles.js';
export {
  HOP_OBSTACLE_KINDS, HOP_OBSTACLE_SIZE, HOP_GROUND_TILE, HOP_GROUND_DEPTH, createHopObstacle, createHopGround, createHopCoin,
} from './minigame-hop.js';
export { MIMIC_COLORS, createMimicStage } from './minigame-mimic.js';

/**
 * Switch minigame props under `root` to a theme: themed clay vertex colours,
 * themed materials (`userData.theme`), shared soap shells, the mimic beam.
 * @param {import('three').Object3D} root
 * @param {'light'|'dark'} theme
 */
export function applyMinigameTheme(root, theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  applyTheme(root, t);
  applySoapTheme(t, root);
  root.traverse((o) => { if (typeof o.userData.onTheme === 'function') o.userData.onTheme(t); });
}
