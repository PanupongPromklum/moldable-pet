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
export const NEW_ICON_NAMES = ['hunger', 'toilet', 'fun', 'social', 'coin', 'gear', 'mic', 'stop', 'wave', 'camera', 'camera-off', 'arrow-left', 'arrow-right', 'chevron-down', 'flush', 'hand', 'check', 'lock', 'close', 'eye', 'eye-off', 'shirt', 'none', 'heart', 'star', 'timer'];
