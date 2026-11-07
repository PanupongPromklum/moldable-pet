/**
 * Trait marks (story S5-02, growth GDD 3.5 "signature"): tiny canvas-drawn stickers and glints that
 * show a grown character's raised personality. They are NOT outfit items: they use no head / eyes /
 * body anchor, never cover the eyes or the mouth, and work with every outfit.
 *
 *   cheerful → pinker cheeks + a little sun glint that pops up now and then
 *   cuddly   → heart-shaped cheeks + a soft catchlight in the eyes
 *   playful  → a star sticker on one cheek that springs up (again on hop / jelly / shake)
 *   foodie   → a rounder belly (~4 %) + a few crumbs at the mouth corner for 10 s after eating
 *   stylish  → a softer gloss on the clay + a twinkle by the head while wearing an outfit item
 *
 * Colours come from the brand tints (pink #EB92B3, lilac #CBA5D1) plus the soft neutrals already used
 * by the outfits (cream, tan). No bright red, no texture noise; edges are soft, shapes rounded.
 * Pure drawing helpers: each call returns a new texture the character owns and disposes.
 */
import * as THREE from 'three';

/** Every trait id `pet.setTraitMark` accepts (null clears). */
export const TRAIT_MARK_IDS = Object.freeze(['cheerful', 'cuddly', 'playful', 'foodie', 'stylish']);
/** Thai trait names (debug / demo; the shipped labels live in assets/data/growth.json). */
export const TRAIT_MARK_TH = Object.freeze({ cheerful: 'ร่าเริง', cuddly: 'ขี้อ้อน', playful: 'ขี้เล่น', foodie: 'นักกิน', stylish: 'สายแฟ' });

const SIZE = 128;

function tex(draw) {
  const c = document.createElement('canvas'); c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.translate(SIZE / 2, SIZE / 2); g.scale(SIZE / 2, -SIZE / 2);     // unit box -1..1, y up
  draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function heartPath(g, s) {
  g.beginPath();
  g.moveTo(0, -.78 * s);
  g.bezierCurveTo(-.2 * s, -.56 * s, -.86 * s, -.2 * s, -.86 * s, .2 * s);
  g.bezierCurveTo(-.86 * s, .62 * s, -.32 * s, .78 * s, 0, .42 * s);
  g.bezierCurveTo(.32 * s, .78 * s, .86 * s, .62 * s, .86 * s, .2 * s);
  g.bezierCurveTo(.86 * s, -.2 * s, .2 * s, -.56 * s, 0, -.78 * s);
  g.closePath();
}
function starPath(g, n, ro, ri, rot = Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro, a = rot + i * Math.PI / n;
    i ? g.lineTo(r * Math.cos(a), r * Math.sin(a)) : g.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  g.closePath();
}
/** Soft-edged fill: a blurred copy under a crisp one, so the sticker reads at phone size without a hard rim. */
function soft(g, path, fill, blur = .06) {
  g.save(); g.filter = `blur(${Math.round(blur * SIZE / 2)}px)`; path(); g.fillStyle = fill; g.fill(); g.restore();
  path(); g.fillStyle = fill; g.fill();
}

/**
 * Draw one mark texture.
 * @param {'heart'|'sun'|'star'|'crumbs'|'twinkle'} kind
 * @returns {THREE.CanvasTexture}
 */
export function markTexture(kind) {
  switch (kind) {
    case 'heart':      // blush-like cheek heart (drawn with the blush material: soft, slightly see-through)
      return tex((g) => {
        g.save(); g.filter = 'blur(5px)'; heartPath(g, .9); g.fillStyle = 'rgba(235,146,179,.75)'; g.fill(); g.restore();
        heartPath(g, .78); g.fillStyle = 'rgba(240,150,186,.95)'; g.fill();
        g.globalAlpha = .55; g.beginPath(); g.ellipse(-.36, .3, .16, .1, .5, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
      });
    case 'sun':        // tiny sun glint: cream core, rounded petal rays in soft pink
      return tex((g) => {
        g.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          g.beginPath(); g.moveTo(.5 * Math.cos(a), .5 * Math.sin(a)); g.lineTo(.84 * Math.cos(a), .84 * Math.sin(a));
          g.lineWidth = .17; g.strokeStyle = '#F2AFC7'; g.stroke();
        }
        soft(g, () => { g.beginPath(); g.arc(0, 0, .4, 0, Math.PI * 2); }, '#FFF3DC', .05);
        g.beginPath(); g.arc(0, 0, .4, 0, Math.PI * 2); g.lineWidth = .07; g.strokeStyle = '#F2AFC7'; g.stroke();
        g.globalAlpha = .8; g.beginPath(); g.arc(-.13, .14, .1, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
      });
    case 'star':       // clay star sticker: lilac with a cream border and a soft highlight
      return tex((g) => {
        g.lineJoin = 'round';
        starPath(g, 5, .9, .44); g.lineWidth = .2; g.strokeStyle = '#FBF4EA'; g.stroke(); g.fillStyle = '#FBF4EA'; g.fill();
        starPath(g, 5, .74, .36); g.lineWidth = .1; g.strokeStyle = '#CBA5D1'; g.stroke(); g.fillStyle = '#CBA5D1'; g.fill();
        g.globalAlpha = .6; g.beginPath(); g.ellipse(-.14, .26, .14, .08, .6, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
      });
    case 'crumbs':     // three biscuit crumbs, soft tan
      return tex((g) => {
        const dots = [[-.32, .1, .3, '#E3C9AC'], [.3, .3, .22, '#D2B596'], [.18, -.36, .19, '#E3C9AC']];
        for (const [x, y, r, c] of dots) {
          soft(g, () => { g.beginPath(); g.ellipse(x, y, r, r * .82, .4, 0, Math.PI * 2); }, c, .03);
          g.globalAlpha = .6; g.beginPath(); g.arc(x - r * .3, y + r * .3, r * .28, 0, Math.PI * 2); g.fillStyle = '#FBF4EA'; g.fill(); g.globalAlpha = 1;
        }
      });
    case 'twinkle':    // four-point glint for the stylish head sparkle
    default:
      return tex((g) => {
        g.save(); g.filter = 'blur(6px)'; g.beginPath(); g.arc(0, 0, .46, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); g.restore();
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2, b = a + Math.PI / 4;
          const px = .95 * Math.cos(a), py = .95 * Math.sin(a), qx = .16 * Math.cos(b), qy = .16 * Math.sin(b);
          i ? g.quadraticCurveTo(0, 0, px, py) : g.moveTo(px, py);
          g.quadraticCurveTo(0, 0, qx, qy);
        }
        g.quadraticCurveTo(0, 0, .95, 0); g.closePath();
        g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = .05; g.strokeStyle = '#E7D6F0'; g.stroke();
      });
  }
}
