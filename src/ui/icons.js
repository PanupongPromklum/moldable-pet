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

/** Names of all new line icons (for the icon sheet / demo). */
export const NEW_ICON_NAMES = ['hunger', 'toilet', 'fun', 'social', 'coin', 'gear', 'mic', 'stop', 'wave', 'camera', 'camera-off', 'arrow-left', 'arrow-right', 'chevron-down', 'flush', 'hand', 'check', 'lock', 'close'];
