/**
 * Moldable Pet — HUD icons (owner: glaze).
 *
 * Line icons: 24 px grid, stroke 1.5, round caps and joins, `currentColor`, in the
 * Mold/Icon style. They live in code only and are never added to the Figma DS
 * (owner decision 2026-10-25). Every icon here is a NEW icon drawn by glaze.
 *
 * Food icons: small filled clay-style pictures on a 48 px grid for the kitchen tray.
 *
 * @module ui/icons
 */

const LINE_ATTR = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

/** Inner SVG markup of each line icon (24 × 24 viewBox). */
export const LINE_ICONS = {
  /** อิ่ม — a warm bowl. */
  hunger: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 3.5c-.8 1 .8 2 0 3.5M12.5 3.5c-.8 1 .8 2 0 3.5M16 3.5c-.8 1 .8 2 0 3.5"/>',
  /** ห้องน้ำ — toilet seen from the side. */
  toilet: '<path d="M6 3.5h6.5a1 1 0 0 1 1 1V10H5V4.5a1 1 0 0 1 1-1z"/><path d="M3.5 10h17a.5.5 0 0 1 .5.5 6.5 6.5 0 0 1-6.5 6.5h-5A6.5 6.5 0 0 1 3 10.5a.5.5 0 0 1 .5-.5z"/><path d="M9 17l-1 3.5h7.5L14.5 17"/>',
  /** สนุก — a play ball. */
  fun: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.4 2.6 14.6 0 17"/><path d="M12 3.5c-2.6 2.4-2.6 14.6 0 17"/>',
  /** ใกล้ชิด — an open hand offering a heart. */
  social: '<path d="M12 10.25s-3.75-2.3-3.75-5.1A2.15 2.15 0 0 1 12 3.75a2.15 2.15 0 0 1 3.75 1.4c0 2.8-3.75 5.1-3.75 5.1z"/><path d="M3.5 13.5H6l3 1.5h3.5a1.5 1.5 0 0 1 0 3H9"/><path d="M12.5 18l5-1.8a1.5 1.5 0 0 1 1.6 2.4l-1.6 1.9h-9L6 19H3.5"/>',
  /** Coin with an inner ring (drawn on its own, the HUD also has a gradient coin). */
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  mic: '<path d="M12 3.5a3 3 0 0 0-3 3v5.5a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3z"/><path d="M18.5 11.5a6.5 6.5 0 0 1-13 0"/><path d="M12 18v2.5M9 20.5h6"/>',
  /** Mic recording — rounded stop square. */
  stop: '<rect x="7" y="7" width="10" height="10" rx="2.5"/>',
  /** Mic playing — voice wave. */
  wave: '<path d="M4 12h1.5M8 8.5v7M12 5v14M16 8.5v7M18.5 12H20"/>',
  camera: '<path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.5-2h5.6l1.5 2h2.2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.75" r="3.25"/>',
  'camera-off': '<path d="M9.2 4.5h5.6l1.5 2h2.2a2 2 0 0 1 2 2v8.3"/><path d="M18.5 19.5h-13a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-1.95"/><path d="M14.1 15.1a3.25 3.25 0 0 1-4.6-4.6"/><path d="M3.5 3.5l17 17"/>',
  'arrow-left': '<path d="M14.5 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M9.5 6l6 6-6 6"/>',
  'chevron-down': '<path d="M6 9.5l6 6 6-6"/>',
  /** กดชักโครก — a water drop. */
  flush: '<path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  /** Coach marks and hand interaction. */
  hand: '<path d="M9 11V5a1.5 1.5 0 0 1 3 0v5"/><path d="M12 10V8.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.2-2.3L4.5 15a1.5 1.5 0 0 1 2.4-1.8L9 15"/>',
  check: '<path d="M5.5 12.5l4 4 9-9"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2"/>',
  close: '<path d="M7 7l10 10M17 7L7 17"/>',
  /** S2-04 camera view toggle. */
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.4 3.2M6.3 7.4C3.9 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3.5 3.5l17 17"/>',
  /** S2-08 แต่งตัว — a T-shirt. */
  shirt: '<path d="M9 4.5L4 7l1.5 4.5 2.5-1v9h8v-9l2.5 1L20 7l-5-2.5c-.4 1.4-1.6 2.3-3 2.3S9.4 5.9 9 4.5z"/>',
  /** ถอด — empty slot. */
  none: '<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/>',
  heart: '<path d="M12 19s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2c0 4.9-7 9.2-7 9.2z"/>',
  star: '<path d="M12 3.5l2.3 5.3 5.8.6-4.4 3.8 1.3 5.7-5-3-5 3 1.3-5.7-4.4-3.8 5.8-.6z"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M10 3.5h4"/>',
  /** S3 ปิดไฟ / เปิดไฟ — a bulb; `lamp` = light on (rays), `lamp-off` = light off. NEW, waiting for owner approval. */
  lamp: '<path d="M10 16v-1.2c0-1.4-2.5-2.6-2.5-5.3a4.5 4.5 0 0 1 9 0c0 2.7-2.5 3.9-2.5 5.3V16z"/><path d="M10 18.5h4M10.8 21h2.4"/><path d="M12 1.75v1.5M5.6 3.6l1.1 1.1M18.4 3.6l-1.1 1.1M3.5 9.5H5M19 9.5h1.5"/>',
  'lamp-off': '<path d="M10 16v-1.2c0-1.4-2.5-2.6-2.5-5.3a4.5 4.5 0 0 1 9 0c0 2.7-2.5 3.9-2.5 5.3V16z"/><path d="M10 18.5h4M10.8 21h2.4"/><path d="M10.6 8a1.8 1.8 0 0 1 1.4-.9"/>',
  /** S3 minigame control "นิ้ว / เมาส์" — a pointing finger with a tap arc. NEW, waiting for owner approval. */
  finger: '<path d="M8.2 4.2a3.2 3.2 0 0 1 5.6 0"/><path d="M9.5 16.5V7a1.5 1.5 0 0 1 3 0v5"/><path d="M12.5 12v-1a1.5 1.5 0 0 1 3 0v1"/><path d="M15.5 12.5a1.5 1.5 0 0 1 3 0V16a5.5 5.5 0 0 1-5.5 5.5h-1a4.8 4.8 0 0 1-4-2.1l-2.6-3.7a1.4 1.4 0 0 1 2.2-1.7l1.9 2.5"/>',
  /** S3 minigame control "เอียงหัว" — a tilted face under a two-way arc. NEW, waiting for owner approval. */
  'head-tilt': '<circle cx="12" cy="14.5" r="6.5"/><circle cx="9.6" cy="13.4" r=".95" fill="currentColor" stroke="none"/><circle cx="14.6" cy="14.9" r=".95" fill="currentColor" stroke="none"/><path d="M10.6 17.6c1 .5 2 .6 3 .3"/><path d="M5 8.5a9 9 0 0 1 14 0"/><path d="M7.3 7.85L5 8.5l.15-2.4M16.7 7.85L19 8.5l-.15-2.4"/>',
  /** S4 แต่งห้อง — a small sofa. NEW, waiting for owner approval. */
  sofa: '<path d="M6 11V8.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V11"/><path d="M6 13.5a2 2 0 0 0-4 0V17a1.5 1.5 0 0 0 1.5 1.5h17A1.5 1.5 0 0 0 22 17v-3.5a2 2 0 0 0-4 0V15H6z"/><path d="M5 18.5V20M19 18.5V20"/>',
  /** S4 ลองดู (preview) — a sparkle. NEW, waiting for owner approval. */
  sparkle: '<path d="M12 3.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z"/><path d="M19 17.5v3M17.5 19h3"/>',
};
LINE_ICONS.bowl = LINE_ICONS.hunger;
LINE_ICONS.ball = LINE_ICONS.fun;
LINE_ICONS.play = LINE_ICONS.fun;
LINE_ICONS['heart-hand'] = LINE_ICONS.social;

/** Inner SVG markup of each food icon (48 × 48 viewBox, filled). */
export const FOOD_ICONS = {
  onigiri: '<path d="M24 9c3 0 15 18 15 24 0 4-3 6-6 6H15c-3 0-6-2-6-6 0-6 12-24 15-24z" fill="#FFFFFF" stroke="#D9D6EA" stroke-width="1.5"/><rect x="17" y="30" width="14" height="9" rx="2" fill="#3A3F5C"/><ellipse cx="20" cy="18" rx="1.6" ry="3" fill="#E7EFF8"/>',
  banana: '<path d="M8 27c5 9 20 11 29 1 3-3 4-8 3-12l-2-1c-1 5-5 10-11 12-6 2-13 1-19 0z" fill="#F6DD9A"/><path d="M11 29c6 5 17 6 24-1" stroke="#E9C47A" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M38 15l1.5-3.5" stroke="#8A6A5C" stroke-width="2.5" stroke-linecap="round"/><path d="M8 27l-1.5 .5" stroke="#8A6A5C" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="22" cy="31" rx="5" ry="1.4" fill="#FFFFFF" opacity="0.5"/>',
  cupcake: '<path d="M13 25h22l-3 13a3 3 0 0 1-3 2.3H19a3 3 0 0 1-3-2.3z" fill="#CBA5D1"/><path d="M19.5 26l1 13M24 26v13M28.5 26l-1 13" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/><path d="M11 25c0-4 3-6 6-6 0-4 3-7 7-7s7 3 7 7c3 0 6 2 6 6 0 1.5-1 2-2 2H13c-1 0-2-.5-2-2z" fill="#FBEFF3"/><circle cx="24" cy="10.5" r="3" fill="#EB92B3"/><ellipse cx="18" cy="21" rx="2.6" ry="1.3" fill="#FFFFFF" opacity="0.8"/>',
  apple: '<path d="M24 14c-4-3-12-2-13 6-1 8 5 18 10 18 1.5 0 2-1 3-1s1.5 1 3 1c5 0 11-10 10-18-1-8-9-9-13-6z" fill="#EB92B3"/><path d="M24 14c0-3 1-6 4-8" stroke="#8A6A5C" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M26 9c3-3 7-2 8-1-2 3-5 3-8 1z" fill="#7FA9B1"/><ellipse cx="17" cy="21" rx="2.5" ry="4" fill="#FFFFFF" opacity="0.45"/>',
  bun: '<path d="M8 32c0-10 7-18 16-18s16 8 16 18c0 4-3 6-7 6H15c-4 0-7-2-7-6z" fill="#FFFFFF" stroke="#E6E1EE" stroke-width="1.5"/><path d="M24 14c-1.5 3-1 5 0 6M24 14c-4 1-6 3-6.5 6M24 14c4 1 6 3 6.5 6" stroke="#E6E1EE" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="24" cy="15" r="2" fill="#EB92B3"/><ellipse cx="15.5" cy="27" rx="2.4" ry="3.6" fill="#F5F5F5"/>',
  milk: '<path d="M15 17l4-8h10l4 8v20a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3z" fill="#FFFFFF" stroke="#9BB0DE" stroke-width="2" stroke-linejoin="round"/><path d="M15 17h18" stroke="#9BB0DE" stroke-width="2"/><rect x="18" y="23" width="12" height="10" rx="4" fill="#E7EFF8"/><circle cx="24" cy="28" r="2" fill="#9BB0DE"/>',
};

/**
 * Build a line icon as an SVG string.
 * @param {string} name key of LINE_ICONS
 * @param {number} [size=24] rendered size in px
 * @returns {string} `<svg>` markup, decorative (aria-hidden)
 */
export function icon(name, size = 24) {
  const body = LINE_ICONS[name];
  if (!body) return '';
  return `<svg class="mp-ico" width="${size}" height="${size}" viewBox="0 0 24 24" ${LINE_ATTR} aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * Build a food icon as an SVG string.
 * @param {string} id food id (onigiri | banana | cupcake | apple | bun | milk)
 * @param {number} [size=44] rendered size in px
 * @returns {string} `<svg>` markup, decorative (aria-hidden); a soft placeholder blob for unknown ids
 */
export function foodIcon(id, size = 44) {
  const body = FOOD_ICONS[id] || '<circle cx="24" cy="25" r="13" fill="#E7EFF8"/>';
  return `<svg class="mp-food-ico" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * Accessory thumbnails for the wardrobe (S2-08). 24 px grid, stroke 1.5, round caps,
 * `currentColor` outline plus a soft fill from the DS gradient stops (tokens
 * --mp-acc-a..d, --mp-acc-fill-opacity). NEW drawings by glaze, waiting for owner approval.
 * Fills use inline style so they can read CSS custom properties (dark theme).
 */
const F = (v, op = 'var(--mp-acc-fill-opacity)') => `style="fill:var(--mp-acc-${v});fill-opacity:${op}"`;
export const ACCESSORY_ICONS = {
  'hat-beanie': `<path d="M5 15.5a7 7 0 0 1 14 0z" ${F('b')}/><rect x="4" y="15.5" width="16" height="3.5" rx="1.75" ${F('c')}/><circle cx="12" cy="6.4" r="1.9" ${F('a')}/><path d="M9.5 10.8v4.7M14.5 10.8v4.7"/>`,
  'hat-party': `<path d="M12 5.5L6.5 19.5h11z" ${F('c')}/><path d="M9.9 11h4.2M8.1 15.5h7.8"/><circle cx="12" cy="4" r="1.5" ${F('a')}/><path d="M5.5 19.5h13"/>`,
  'bow-ribbon': `<path d="M12 12C9 8 4.5 7.5 4.5 10v4c0 2.5 4.5 2 7.5-2z" ${F('a')}/><path d="M12 12c3-4 7.5-4.5 7.5-2v4c0 2.5-4.5 2-7.5-2z" ${F('a')}/><path d="M10.8 14l-1.8 5M13.2 14l1.8 5"/><rect x="10.5" y="10" width="3" height="4" rx="1.2" ${F('c', 1)}/>`,
  'crown-flower': `<path d="M3.5 17c5.3-2.2 11.7-2.2 17 0"/><circle cx="6.8" cy="13.6" r="2.6" ${F('a')}/><circle cx="12" cy="12.2" r="3" ${F('c')}/><circle cx="17.2" cy="13.6" r="2.6" ${F('b')}/><circle cx="12" cy="12.2" r=".6"/>`,
  'glasses-round': `<circle cx="7.3" cy="13" r="3.6" ${F('b')}/><circle cx="16.7" cy="13" r="3.6" ${F('b')}/><path d="M10.9 12.6c.7-.6 1.5-.6 2.2 0M3.7 12.4L2.5 10.3M20.3 12.4l1.2-2.1"/>`,
  'glasses-sun': `<path d="M3.5 10.5h6.5V13a3 3 0 0 1-3 3h-.5a3 3 0 0 1-3-3z" ${F('lens', 0.85)}/><path d="M14 10.5h6.5V13a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" ${F('lens', 0.85)}/><path d="M10 11.6c1.3-.9 2.7-.9 4 0M3.5 10.5l-1-1.2M20.5 10.5l1-1.2"/>`,
  'glasses-star': `<path d="M7 8.6l1.12 2.66 2.87.24-2.18 1.89.66 2.81L7 14.7l-2.47 1.5.66-2.81-2.18-1.89 2.87-.24z" ${F('a')}/><path d="M17 8.6l1.12 2.66 2.87.24-2.18 1.89.66 2.81L17 14.7l-2.47 1.5.66-2.81-2.18-1.89 2.87-.24z" ${F('a')}/><path d="M10.9 12.4c.7-.5 1.5-.5 2.2 0"/>`,
  'tie-neck': `<path d="M7 4.5l3 1M17 4.5l-3 1"/><path d="M10 5.5h4l-.8 3h-2.4z" ${F('a')}/><path d="M10.8 8.5L9 16.5l3 3.5 3-3.5-1.8-8z" ${F('c')}/><path d="M10.2 13.6l3.8-2"/>`,
  'tie-bow': `<path d="M10.5 12L5.5 8.6A1 1 0 0 0 4 9.4v5.2a1 1 0 0 0 1.5.8z" ${F('a')}/><path d="M13.5 12l5-3.4a1 1 0 0 1 1.5.8v5.2a1 1 0 0 1-1.5.8z" ${F('a')}/><rect x="10.5" y="10.5" width="3" height="3" rx="1" ${F('c', 1)}/>`,
  scarf: `<path d="M5 9.5c4 2 10 2 14 0v3c-4 2-10 2-14 0z" ${F('a')}/><path d="M14.4 13.6l1.6 5.9h-3.5l-.4-5.5" ${F('b')}/><path d="M13 19.5V21M14.4 19.5V21M15.8 19.5V21M9.2 11.3v2.9"/>`,
  'badge-star': `<circle cx="12" cy="12" r="7.5" ${F('b')}/><path d="M12 8.7l.94 2.31 2.48.18-1.9 1.6.6 2.42L12 13.9l-2.12 1.31.6-2.42-1.9-1.6 2.48-.18z" ${F('a', 1)}/>`,
  // S4 Christmas set (fixed ids in module-contracts.md). Same pastel stops, no bright red/green:
  // berry = --mp-acc-a (pink), pine = --mp-acc-d (grey-teal), snow = white trim. NEW, waiting for owner approval.
  'hat-santa': `<path d="M5.5 16C6 10.5 9 6.2 13.4 5.6c3.1-.4 5.3 1.6 5.7 4.8L18 16z" ${F('a')}/><rect x="4" y="15.5" width="16" height="4" rx="2" style="fill:#FFFFFF"/><circle cx="19.2" cy="12" r="2.1" style="fill:#FFFFFF"/>`,
  antlers: `<path d="M8.6 15.5C8 12 6.6 9.6 4.6 7.8M6.6 10.4l-2.6.3M7.8 12.6l-2.5 1.3M15.4 15.5c.6-3.5 2-5.9 4-7.7M17.4 10.4l2.6.3M16.2 12.6l2.5 1.3"/><path d="M4.5 19.5c4.6-2.4 10.4-2.4 15 0"/><ellipse cx="9.8" cy="16.4" rx="1.6" ry="1.1" ${F('a')}/><ellipse cx="14.2" cy="16.4" rx="1.6" ry="1.1" ${F('a')}/><path d="M8.6 15.5c-.7-.2-1.2-.8-1.3-1.5M15.4 15.5c.7-.2 1.2-.8 1.3-1.5" ${F('d')}/>`,
  'glasses-snow': `<circle cx="7.3" cy="13" r="3.6" ${F('b')}/><circle cx="16.7" cy="13" r="3.6" ${F('b')}/><path d="M7.3 11.3v3.4M5.85 12.15l2.9 1.7M5.85 13.85l2.9-1.7M16.7 11.3v3.4M15.25 12.15l2.9 1.7M15.25 13.85l2.9-1.7" stroke-width="1"/><path d="M10.9 12.6c.7-.6 1.5-.6 2.2 0M3.7 12.4L2.5 10.3M20.3 12.4l1.2-2.1"/>`,
  'scarf-xmas': `<path d="M5 9.5c4 2 10 2 14 0v3c-4 2-10 2-14 0z" ${F('d')}/><path d="M14.4 13.6l1.6 5.9h-3.5l-.4-5.5" ${F('a')}/><path d="M8.5 10.7v3.1M12 11.1v3.1M15.5 10.7v3.1"/><path d="M13 19.5V21M14.4 19.5V21M15.8 19.5V21"/>`,
  'bell-collar': `<path d="M4.5 8.5c4.5 2.5 10.5 2.5 15 0V11c-4.5 2.5-10.5 2.5-15 0z" ${F('a')}/><path d="M12 13c-2.6 0-4 2-4 4.4v1.1h8v-1.1C16 15 14.6 13 12 13z" ${F('c')}/><path d="M12 12.3V13"/><circle cx="12" cy="19.9" r="1.1" ${F('c', 1)}/>`,
};

/**
 * Build an accessory thumbnail as an SVG string.
 * @param {string} id accessory id (see module-contracts.md, Outfits)
 * @param {number} [size=40]
 * @returns {string} `<svg>` markup, decorative; a soft blob for unknown ids
 */
export function accessoryIcon(id, size = 40) {
  const body = ACCESSORY_ICONS[id] || `<circle cx="12" cy="12" r="7" ${F('b')}/>`;
  return `<svg class="mp-acc-ico" width="${size}" height="${size}" viewBox="0 0 24 24" ${LINE_ATTR} aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Names of all new line icons (for the icon sheet / demo). */
export const NEW_ICON_NAMES = ['hunger', 'toilet', 'fun', 'social', 'coin', 'gear', 'mic', 'stop', 'wave', 'camera', 'camera-off', 'arrow-left', 'arrow-right', 'chevron-down', 'flush', 'hand', 'check', 'lock', 'close', 'eye', 'eye-off', 'shirt', 'none', 'heart', 'star', 'timer', 'lamp', 'lamp-off', 'finger', 'head-tilt', 'sofa', 'sparkle'];

/* ============================================================================
 * S4 — FILLED Moldable symbols (SAMPLES, waiting for owner approval).
 * NOT used by the live HUD yet: hud.js keeps the line icons until the owner approves
 * (module-contracts.md → Sprint 4 → Icons). Code only, never added to the Figma DS.
 *
 * Style (owner's Figma "Style Guide Categories", design/art/reference/icon-style-*.png):
 * chunky soft rounded clay forms, no outlines, 2–4 overlapping shapes that are slightly
 * translucent, each filled with a vertical gradient from the brand family, a soft inner
 * highlight and a soft drop shadow. Every icon uses the same family of inks (owner decision:
 * not one colour per need). 48 × 48 grid; reads at 28–32 px inside the meter and at 96 px.
 *
 * Inks (top → bottom of each shape). Bottom stops are the DS gradient stops (§3.1) except
 * plum and periwinkle-deep, which come from the owner's style-guide image:
 *   blue  #D6E2EC [เสนอ] → #9BB0DE [DS]      teal  #D2E3E6 [เสนอ] → #7FA9B1 [DS]
 *   pink  #F8DCE8 [เสนอ] → #EB92B3 [DS]      lilac #EADFF2 [เสนอ] → #CBA5D1 [DS]
 *   plum  #D3B1DA [เสนอ] → #A578B5 [เสนอ]    peri  #C3C8EE [เสนอ] → #7E7CB8 [เสนอ]
 *   brand = Decorations/Gradient 1 [DS] (coin face)
 * Shadow colour/alpha come from CSS custom properties --mp-fico-shadow / --mp-fico-shadow-a
 * (tokens.css) so the dark theme gets a deeper shadow.
 *
 * SVG ids: every call gets a unique prefix (`mpf<n>`), so any number of icons can share one
 * page without gradient/filter id clashes. Pass `opts.uid` for a stable prefix (tests, SSR).
 * ==========================================================================*/

/** Ink stops [top, bottom] (see the table above). */
export const FILLED_INKS = {
  blue: ['#D6E2EC', '#9BB0DE'],
  teal: ['#D2E3E6', '#7FA9B1'],
  pink: ['#F8DCE8', '#EB92B3'],
  lilac: ['#EADFF2', '#CBA5D1'],
  plum: ['#D3B1DA', '#A578B5'],
  peri: ['#C3C8EE', '#7E7CB8'],
};

/**
 * Filled icon bodies. Each is a function of a helper `k` that turns an ink name into a
 * `fill="url(#…)"` attribute and knows the highlight gradient (`k.hl`) and clip ids (`k.id`).
 * 48 × 48 viewBox. Drawing order = back to front.
 */
export const FILLED_ICONS = {
  /** อิ่ม — a plump rice mound in a round bowl. */
  hunger: (k) => `
    <path d="M12.5 25C12.5 15.6 17.6 10 24 10s11.5 5.6 11.5 15z" ${k('pink')}/>
    <ellipse cx="19.4" cy="16.2" rx="3.6" ry="2.2" ${k.hl} transform="rotate(-28 19.4 16.2)"/>
    <rect x="17" y="36" width="14" height="6.5" rx="3.2" ${k('peri')}/>
    <path d="M6.2 22.5h35.6a2.3 2.3 0 0 1 2.3 2.6C42.9 34.2 34.6 40.5 24 40.5S5.1 34.2 3.9 25.1a2.3 2.3 0 0 1 2.3-2.6z" ${k('blue')} opacity=".93"/>
    <ellipse cx="13.6" cy="28.6" rx="5.2" ry="2.3" ${k.hl} transform="rotate(14 13.6 28.6)"/>`,

  /** ห้องน้ำ — a round toilet from the side: tank, seat and bowl. */
  toilet: (k) => `
    <rect x="7.5" y="5" width="16" height="21" rx="6" ${k('lilac')}/>
    <ellipse cx="13.2" cy="10.6" rx="2.6" ry="3.6" ${k.hl}/>
    <path d="M17.5 35.5h13l1.6 5.6a1.8 1.8 0 0 1-1.7 2.3H17.6a1.8 1.8 0 0 1-1.7-2.3z" ${k('peri')}/>
    <path d="M7 24h34a2.4 2.4 0 0 1 2.3 3c-1.6 6.6-7.4 11-14.8 11h-9.6C12 38 7 33.6 5 27a2.4 2.4 0 0 1 2-3z" ${k('blue')} opacity=".94"/>
    <rect x="4" y="19.5" width="40" height="7" rx="3.5" ${k('pink')} opacity=".92"/>
    <ellipse cx="14.5" cy="31" rx="4.4" ry="1.9" ${k.hl}/>`,

  /** สนุก — a bouncy ball with a soft band and a sparkle. */
  fun: (k) => `
    <clipPath id="${k.id('ball')}"><circle cx="22" cy="26.5" r="15.5"/></clipPath>
    <circle cx="22" cy="26.5" r="15.5" ${k('blue')}/>
    <g clip-path="url(#${k.id('ball')})">
      <path d="M17 8C24 15 24.5 34 16 44l9 1c7.5-10 6.5-28-1-37z" ${k('pink')} opacity=".9"/>
      <path d="M30 9c5.5 6 6.5 23 .5 34l5 .5c5.5-10 4.5-25-.5-33z" ${k('lilac')} opacity=".9"/>
    </g>
    <ellipse cx="15" cy="18.5" rx="4.4" ry="2.6" ${k.hl} transform="rotate(-35 15 18.5)"/>
    <path d="M39.5 3.5c.7 4 1.9 5.2 5.9 5.9-4 .7-5.2 1.9-5.9 5.9-.7-4-1.9-5.2-5.9-5.9 4-.7 5.2-1.9 5.9-5.9z" ${k('plum')}/>`,

  /** ใกล้ชิด — two hearts leaning together. */
  social: (k) => `
    <path d="M17 29.5c-6.6-3.9-11-8.3-11-13.4C6 12.7 8.6 10 11.8 10c2.2 0 4.1 1.2 5.2 3.1C18.1 11.2 20 10 22.2 10c3.2 0 5.8 2.7 5.8 6.1 0 5.1-4.4 9.5-11 13.4z" ${k('lilac')}/>
    <ellipse cx="11.6" cy="14.8" rx="2.4" ry="1.5" ${k.hl} transform="rotate(-30 11.6 14.8)"/>
    <path d="M30 41.5c-8.4-4.9-14-10.5-14-17 0-4.3 3.3-7.7 7.4-7.7 2.8 0 5.2 1.5 6.6 3.9 1.4-2.4 3.8-3.9 6.6-3.9 4.1 0 7.4 3.4 7.4 7.7 0 6.5-5.6 12.1-14 17z" ${k('pink')} opacity=".92"/>
    <ellipse cx="22.6" cy="23" rx="3.4" ry="2" ${k.hl} transform="rotate(-32 22.6 23)"/>`,

  /** เหรียญ — a thick coin: deeper edge, brand-gradient face, soft sparkle. */
  coin: (k) => `
    <circle cx="24" cy="27" r="17" ${k('peri')}/>
    <circle cx="24" cy="23.5" r="17" ${k.brand}/>
    <circle cx="24" cy="23.5" r="11" fill="#FFFFFF" fill-opacity=".22"/>
    <path d="M24 15.5c.8 4.6 2.6 6.4 7.2 7.2-4.6.8-6.4 2.6-7.2 7.2-.8-4.6-2.6-6.4-7.2-7.2 4.6-.8 6.4-2.6 7.2-7.2z" fill="#FFFFFF" fill-opacity=".92"/>
    <ellipse cx="15.2" cy="14.6" rx="4.6" ry="2.4" ${k.hl} transform="rotate(-38 15.2 14.6)"/>`,

  /** แต่งห้อง — a chunky sofa with a sparkle. */
  decor: (k) => `
    <rect x="10" y="38" width="4.5" height="5" rx="2" ${k('peri')}/><rect x="33.5" y="38" width="4.5" height="5" rx="2" ${k('peri')}/>
    <rect x="9" y="13.5" width="30" height="18" rx="7.5" ${k('lilac')}/>
    <ellipse cx="16.5" cy="18.2" rx="4.4" ry="2.1" ${k.hl}/>
    <rect x="8" y="27" width="32" height="11.5" rx="5.5" ${k('blue')} opacity=".94"/>
    <rect x="3" y="21.5" width="10" height="18" rx="5" ${k('pink')} opacity=".92"/>
    <rect x="35" y="21.5" width="10" height="18" rx="5" ${k('pink')} opacity=".92"/>
    <ellipse cx="7" cy="25.6" rx="2" ry="2.6" ${k.hl}/>
    <path d="M40 2.5c.6 3.3 1.6 4.3 4.9 4.9-3.3.6-4.3 1.6-4.9 4.9-.6-3.3-1.6-4.3-4.9-4.9 3.3-.6 4.3-1.6 4.9-4.9z" ${k('plum')}/>`,
};
FILLED_ICONS.decorate = FILLED_ICONS.decor;

/** Ids of the filled sample icons, in board order. */
export const FILLED_ICON_NAMES = ['hunger', 'toilet', 'fun', 'social', 'coin', 'decor'];

let filledSeq = 0;

/**
 * Build a FILLED Moldable icon (S4 sample) as an SVG string. Not used by the live HUD yet.
 * @param {string} name key of FILLED_ICONS (hunger | toilet | fun | social | coin | decor)
 * @param {number} [size=32] rendered size in px
 * @param {{uid?: string, title?: string}} [opts] uid = stable id prefix; title = accessible name
 *        (without a title the icon is decorative: aria-hidden)
 * @returns {string} `<svg>` markup; '' for an unknown name
 */
export function filledIcon(name, size = 32, opts = {}) {
  const body = FILLED_ICONS[name];
  if (!body) return '';
  const uid = String(opts.uid || `mpf${++filledSeq}`).replace(/[^\w-]/g, '');
  const used = new Set();
  const k = (ink) => { used.add(ink); return `fill="url(#${uid}-${ink})"`; };
  k.id = (part) => `${uid}-${part}`;
  k.hl = `fill="url(#${uid}-hl)"`;
  k.brand = `fill="url(#${uid}-brand)"`;
  const markup = body(k);
  const grads = [...used].map((ink) => {
    const [a, b] = FILLED_INKS[ink];
    return `<linearGradient id="${uid}-${ink}" x1=".25" y1="0" x2=".55" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  }).join('');
  const defs = `<defs>${grads}
    <linearGradient id="${uid}-brand" x1="0" y1=".1" x2="1" y2=".9"><stop offset="0" stop-color="#7FA9B1"/><stop offset=".35" stop-color="#9BB0DE"/><stop offset=".7" stop-color="#CBA5D1"/><stop offset="1" stop-color="#EB92B3"/></linearGradient>
    <radialGradient id="${uid}-hl"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    <filter id="${uid}-sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" style="flood-color:var(--mp-fico-shadow,#252941);flood-opacity:var(--mp-fico-shadow-a,.2)"/></filter></defs>`;
  const a11y = opts.title ? `role="img" aria-label="${String(opts.title).replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="mp-fico" width="${size}" height="${size}" viewBox="0 0 48 48" ${a11y} focusable="false">${defs}<g filter="url(#${uid}-sh)">${markup}</g></svg>`;
}
