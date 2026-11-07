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
  /** S5 mic "thinking" — three soft dots. NEW, waiting for owner approval. */
  dots: '<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>',
  /** S5 typed chat send — a rounded paper plane. NEW, waiting for owner approval. */
  send: '<path d="M4.5 11.2L19.3 4.6c.6-.3 1.2.3.9.9l-6.6 14.8c-.3.6-1.2.6-1.4-.1l-1.6-5.5-5.5-1.6c-.7-.2-.7-1.1-.1-1.4z"/><path d="M10.6 13.4l4-4"/>',
  /** S5 small keyboard glyph (inside the type box). NEW, waiting for owner approval. */
  keyboard: '<rect x="2.5" y="6.5" width="19" height="11" rx="3"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M6.5 13.5h.01M17.5 13.5h.01M9.5 13.5h5"/>',
  /** S5 mic sheet "พูดตาม" — echo arcs. NEW, waiting for owner approval. */
  echo: '<path d="M12 4.5a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0V7A2.5 2.5 0 0 0 12 4.5z"/><path d="M6 10.5a6 6 0 0 0 12 0M12 16.5v3"/><path d="M3 7.5c-.7 1.9-.7 4.1 0 6M21 7.5c.7 1.9.7 4.1 0 6"/>',
  /** S5 mic sheet "คุยกัน" — two speech bubbles. NEW, waiting for owner approval. */
  chat: '<path d="M4 5.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.5 16v-2.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M18 9h1.5A1.5 1.5 0 0 1 21 10.5v5a1.5 1.5 0 0 1-1.5 1.5H18V19.5l-3-2.5h-3.5a1.5 1.5 0 0 1-1.5-1.5"/>',
  /** S5 privacy notice — a soft shield. NEW, waiting for owner approval. */
  shield: '<path d="M12 3.5l7 2.6v5.4c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6.1z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
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
export function icon(name, size = 24, opts = {}) {
  // Owner 2026-11-07: no outline icons in the game. A hand-drawn filled symbol wins; every other
  // icon is drawn as a Moldable "clay tube" graphic (tubeIcon). `opts.line` keeps the old outline (docs only).
  if (!opts.line && FILLED_ICONS[name] && !TUBE_PREFERRED.has(name)) return filledIcon(name, Math.round(size * 1.15));
  const body = LINE_ICONS[name];
  if (!body) return '';
  if (!opts.line) return tubeIcon(body, size, TUBE_FILL.has(name));
  return `<svg class="mp-ico" width="${size}" height="${size}" viewBox="0 0 24 24" ${LINE_ATTR} aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Icons whose shapes are closed, so they get a soft gradient body under the tube. */
const TUBE_FILL = new Set(['mic', 'stop', 'camera', 'camera-off', 'flush', 'lock', 'eye', 'eye-off', 'shirt', 'none', 'heart',
  'star', 'timer', 'lamp', 'lamp-off', 'sparkle', 'send', 'keyboard', 'chat', 'shield', 'echo', 'sofa', 'coin', 'gear', 'head-tilt']);
/** Small glyphs that read better as tubes than as the big filled symbol of the same name. */
const TUBE_PREFERRED = new Set(['keyboard']);
let tubeSeq = 0;

/**
 * Moldable "clay tube" icon: the 24-grid line drawing rendered as chunky rounded tubes in the brand
 * gradient (like the Typography "A" in the Moldable style guide), closed shapes filled with a soft
 * pastel gradient, a glossy highlight and a soft drop shadow. No dark outline. Colours come from
 * `--mp-tube-*` tokens (light/dark); on primary buttons CSS switches the tube to `currentColor`.
 * @param {string} body inner SVG of a LINE_ICONS entry
 * @param {number} size px
 * @param {boolean} fill give closed shapes a soft body
 */
export function tubeIcon(body, size = 24, fill = false) {
  const u = `mpt${++tubeSeq}`;
  const stop = (o, v, d) => `<stop offset="${o}" style="stop-color:var(${v},${d})"/>`;
  const defs = `<defs><linearGradient id="${u}-s" x1="0" y1="0" x2="1" y2="1">${stop(0, '--mp-tube-a', '#6E7DC4')}${stop(0.55, '--mp-tube-b', '#9C74B8')}${stop(1, '--mp-tube-c', '#C9779F')}</linearGradient>`
    + `<linearGradient id="${u}-f" x1=".2" y1="0" x2=".6" y2="1">${stop(0, '--mp-tube-fa', '#E4E9FA')}${stop(1, '--mp-tube-fb', '#F3D9E8')}</linearGradient>`
    + `<filter id="${u}-sh" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy=".7" stdDeviation=".6" style="flood-color:var(--mp-fico-shadow,#252941);flood-opacity:var(--mp-fico-shadow-a,.2)"/></filter></defs>`;
  const fillLayer = fill ? `<g class="t-fill" fill="url(#${u}-f)" stroke="url(#${u}-f)" stroke-width="2.2" stroke-linejoin="round">${body}</g>` : '';
  return `<svg class="mp-ico mp-tico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" style="color:var(--mp-tube-a,#6E7DC4)">${defs}`
    + `<g filter="url(#${u}-sh)">${fillLayer}<g class="t-tube" fill="none" stroke="url(#${u}-s)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${body}</g>`
    + `<g class="t-hl" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width=".6" stroke-linecap="round" stroke-linejoin="round" transform="translate(-.35 -.45)">${body}</g></g></svg>`;
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
  antlers: `<path d="M9 16.6C8.7 13 8.2 9.6 6.6 5.6M8.5 11c-1.4-.8-2.9-1-4.4-.6M7.7 8l1.8-2.6M15 16.6c.3-3.6.8-7 2.4-11M15.5 11c1.4-.8 2.9-1 4.4-.6M16.3 8l-1.8-2.6" style="stroke:var(--mp-acc-d);stroke-opacity:var(--mp-acc-fill-opacity);stroke-width:3.4"/><path d="M9 16.6C8.7 13 8.2 9.6 6.6 5.6M8.5 11c-1.4-.8-2.9-1-4.4-.6M7.7 8l1.8-2.6M15 16.6c.3-3.6.8-7 2.4-11M15.5 11c1.4-.8 2.9-1 4.4-.6M16.3 8l-1.8-2.6"/><path d="M4.5 18.2c4.8-2.6 10.2-2.6 15 0v1.8c-4.8-2.6-10.2-2.6-15 0z" ${F('a')}/>`,
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
  // Owner 2026-11-07: graphic, not outline — bodies at full fill, edges as thin brand-gradient tubes, soft shadow.
  const u = `mpa${++tubeSeq}`;
  const st = (o, v, d) => `<stop offset="${o}" style="stop-color:var(${v},${d})"/>`;
  return `<svg class="mp-acc-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="url(#${u}-s)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="--mp-acc-fill-opacity:1">`
    + `<defs><linearGradient id="${u}-s" x1="0" y1="0" x2="1" y2="1">${st(0, '--mp-tube-a', '#6E7DC4')}${st(1, '--mp-tube-c', '#C9779F')}</linearGradient>`
    + `<filter id="${u}-sh" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy=".7" stdDeviation=".6" style="flood-color:var(--mp-fico-shadow,#252941);flood-opacity:var(--mp-fico-shadow-a,.2)"/></filter></defs>`
    + `<g filter="url(#${u}-sh)">${body}</g></svg>`;
}

/** Names of all new line icons (for the icon sheet / demo). */
export const NEW_ICON_NAMES = ['hunger', 'toilet', 'fun', 'social', 'coin', 'gear', 'mic', 'stop', 'wave', 'camera', 'camera-off', 'arrow-left', 'arrow-right', 'chevron-down', 'flush', 'hand', 'check', 'lock', 'close', 'eye', 'eye-off', 'shirt', 'none', 'heart', 'star', 'timer', 'lamp', 'lamp-off', 'finger', 'head-tilt', 'sofa', 'sparkle', 'dots', 'send', 'keyboard', 'echo', 'chat', 'shield'];

/* ============================================================================
 * S4 — FILLED Moldable symbols. Owner-approved 2026-11-07 (board: design/ui/icon-samples-s4.html).
 * Live in hud.js for the four need meters, the coin, "แต่งห้อง" and "เล่น"; everything without a
 * filled version keeps its line icon. Code only, never added to the Figma DS.
 *
 * Style (owner's Figma "Style Guide Categories", design/art/reference/icon-style-*.png):
 * chunky soft rounded clay forms, no outlines, 2–4 overlapping shapes that are slightly
 * translucent, each filled with a vertical gradient from the brand family, a soft inner
 * highlight and a soft drop shadow. Every icon uses the same family of inks (owner decision:
 * not one colour per need). 48 × 48 grid; reads at 28–32 px inside the meter and at 96 px.
 *
 * Inks (top → bottom of each shape). Bottom stops are the DS gradient stops (§3.1) except
 * plum and periwinkle-deep, which come from the owner's style-guide image (all approved 2026-11-07):
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
  // S5 [เสนอ] — mimic pad / bubble colours named in minigames.json (pink, lilac, sky, lavender, peach, butter).
  // Soft pastels from the same family; no bright red, green or orange.
  sky: ['#D6E2EC', '#9BB0DE'],          // = blue
  lavender: ['#E6E2F8', '#ACA4DE'],     // [เสนอ]
  peach: ['#FCE7DC', '#EEB297'],        // [เสนอ]
  butter: ['#FBF2D4', '#E5C46C'],       // [เสนอ]
};

/** S5 face ink on pads and game cards (DS text/primary/default). */
const FACE = '#252941';

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

/* Owner 2026-11-07: แต่งตัว and ถาดอาหาร buttons get S4 filled symbols too (same rules: chunky soft forms,
 * brand inks, soft highlight + shadow, no outline). Code only, never in the Figma DS. */
Object.assign(FILLED_ICONS, {
  /** แต่งตัว — a chubby T-shirt with a soft collar and a little bow. */
  shirt: (k) => `
    <path d="M17 7.5l-9.6 4.6a2.6 2.6 0 0 0-1.4 3l1.6 5.3a2.3 2.3 0 0 0 3.1 1.5l2.8-1.2V39a3.5 3.5 0 0 0 3.5 3.5h13.6A3.5 3.5 0 0 0 34.1 39V20.7l2.8 1.2a2.3 2.3 0 0 0 3.1-1.5l1.6-5.3a2.6 2.6 0 0 0-1.4-3L30.6 7.5C29.4 11 27 12.9 23.8 12.9S18.2 11 17 7.5z" ${k('lilac')}/>
    <ellipse cx="18.6" cy="21" rx="3" ry="5.4" ${k.hl}/>
    <path d="M17 7.5c1.2 3.5 3.6 5.4 6.8 5.4s5.6-1.9 6.8-5.4l-2.8-1.3c-.9 2.3-2.2 3.5-4 3.5s-3.1-1.2-4-3.5z" ${k('pink')}/>
    <path d="M7.6 12l-1.6.8a2.6 2.6 0 0 0-1.4 3l1.6 5.3c.3 1 1.1 1.6 2 1.7z" ${k('peri')} opacity=".8"/>
    <path d="M40.4 12l1.6.8a2.6 2.6 0 0 1 1.4 3l-1.6 5.3c-.3 1-1.1 1.6-2 1.7z" ${k('peri')} opacity=".8"/>
    <path d="M23.8 25.5c-2-2.6-6-2.8-6 0v3.6c0 2.8 4 2.6 6 0 2 2.6 6 2.8 6 0v-3.6c0-2.8-4-2.6-6 0z" ${k('pink')}/>
    <circle cx="23.8" cy="27.3" r="2" ${k('plum')}/>`,

  /** ถาดอาหาร — a round tray with an onigiri and a cupcake. */
  tray: (k) => `
    <path d="M14.5 6.5c2.2 0 9.5 9.8 9.5 14.6 0 3.1-2 4.4-9.5 4.4S5 24.2 5 21.1C5 16.3 12.3 6.5 14.5 6.5z" ${k('lavender')}/>
    <ellipse cx="11.6" cy="14.6" rx="1.8" ry="3.4" ${k.hl} transform="rotate(30 11.6 14.6)"/>
    <rect x="10" y="18" width="9" height="7.5" rx="1.6" ${k('teal')}/>
    <path d="M27.5 18.5h15l-2.2 9h-10.6z" ${k('peri')}/>
    <path d="M26.2 19c0-5.4 3.9-9 8.8-9s8.8 3.6 8.8 9z" ${k('pink')}/>
    <circle cx="35" cy="7.6" r="2.6" ${k('plum')}/>
    <ellipse cx="31" cy="13.6" rx="2.4" ry="1.3" ${k.hl} transform="rotate(-25 31 13.6)"/>
    <rect x="2.5" y="26" width="43" height="9.5" rx="4.75" ${k('blue')}/>
    <rect x="8" y="34.5" width="32" height="6.5" rx="3.25" ${k('lilac')} opacity=".9"/>
    <ellipse cx="12.5" cy="28.9" rx="6" ry="1.6" ${k.hl}/>`,
});

/* ---- S5 filled symbols. NEW, waiting for owner approval (board: design/ui/icon-samples-s5.html). ----
 * Same rules as S4: chunky soft forms, no outline, brand inks, soft highlight + shadow. Faces use
 * FACE ink (#252941) dots and arcs only, like the characters. Pose icons take their ink from
 * `opts.ink` (minigames.json mimic.poses[].color) so pads and bubbles share one colour table. */
const eye = (x, y, r = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${FACE}"/>`;
const arc = (d, w = 2.2) => `<path d="${d}" fill="none" stroke="${FACE}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="2.8" ry="1.7" fill="#EB92B3" fill-opacity=".55"/>`;
Object.assign(FILLED_ICONS, {
  /** ฝนขนม — a wrapped candy and a drop falling into a round bowl. */
  snackRain: (k) => `
    <path d="M9.5 13.5l-4.5-3 .8 6.2zM22.5 9.5l4.5-3-.8 6.2z" ${k('lilac')}/>
    <ellipse cx="16" cy="12" rx="7.2" ry="5.6" ${k('pink')} transform="rotate(-18 16 12)"/>
    <ellipse cx="13.6" cy="10" rx="2.4" ry="1.3" ${k.hl} transform="rotate(-25 13.6 10)"/>
    <circle cx="34.5" cy="13" r="5" ${k('plum')}/>
    <ellipse cx="33" cy="11.4" rx="1.8" ry="1.1" ${k.hl}/>
    <path d="M6 25.5h36a2.3 2.3 0 0 1 2.2 2.8C42.6 36.6 34.4 42.5 24 42.5S5.4 36.6 3.8 28.3A2.3 2.3 0 0 1 6 25.5z" ${k('blue')} opacity=".95"/>
    <ellipse cx="13" cy="31" rx="5" ry="2.1" ${k.hl} transform="rotate(12 13 31)"/>`,

  /** จำท่าทาง — two blob faces copying each other, with a note. */
  mimic: (k) => `
    <circle cx="31.5" cy="20" r="11.5" ${k('lilac')}/>
    ${eye(27.8, 18.5, 1.8)}${eye(35.2, 18.5, 1.8)}${arc('M28.5 23.5q3 2.6 6 0', 1.9)}
    <circle cx="17.5" cy="30" r="13" ${k('pink')} opacity=".95"/>
    <ellipse cx="12.4" cy="23.6" rx="3.4" ry="2" ${k.hl} transform="rotate(-30 12.4 23.6)"/>
    ${eye(13.4, 29, 2)}${eye(21.8, 29, 2)}${arc('M14 34q3.5 3 7 0', 2)}
    <path d="M40.5 33.5v-8.2l4-1.2" fill="none" stroke="#A578B5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="38.6" cy="34.4" rx="2.9" ry="2.3" ${k('plum')} transform="rotate(-20 38.6 34.4)"/>`,

  /** เป่าฟองสบู่ — three see-through bubbles rising from a wand. */
  bubbles: (k) => `
    <path d="M7.5 43.5l9-10" fill="none" stroke="#7E7CB8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="19" cy="30.5" r="5.2" fill="none" stroke="#7E7CB8" stroke-width="2.6"/>
    <circle cx="32" cy="16" r="11.5" ${k('blue')} opacity=".85"/>
    <path d="M25.5 11.5a8 8 0 0 1 6-4.5" fill="none" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="13.5" cy="14" r="7" ${k('pink')} opacity=".85"/>
    <path d="M9.6 11.5a4.6 4.6 0 0 1 3.4-2.6" fill="none" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="2" stroke-linecap="round"/>
    <circle cx="38" cy="35" r="6" ${k('lilac')} opacity=".88"/>
    <path d="M34.6 33a4 4 0 0 1 2.8-2.4" fill="none" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="1.8" stroke-linecap="round"/>`,

  /** กระโดดข้ามก้อน — a blob in mid-hop over a soft pebble. */
  hop: (k) => `
    <rect x="3" y="40" width="42" height="5" rx="2.5" ${k('blue')} opacity=".8"/>
    <rect x="27" y="29" width="15" height="11.5" rx="5.5" ${k('peri')}/>
    <ellipse cx="31.5" cy="32" rx="3" ry="1.6" ${k.hl}/>
    <circle cx="8" cy="33" r="1.7" ${k('plum')} opacity=".7"/><circle cx="10.5" cy="26" r="1.9" ${k('plum')} opacity=".8"/>
    <path d="M18.5 5.5c6.6 0 11.5 4.6 11.5 10.6 0 5.4-4.6 8.4-11.5 8.4S7 21.5 7 16.1C7 10.1 11.9 5.5 18.5 5.5z" ${k('pink')}/>
    <ellipse cx="13.6" cy="10.4" rx="3.4" ry="1.9" ${k.hl} transform="rotate(-25 13.6 10.4)"/>
    ${eye(15.2, 14.6, 1.9)}${eye(23, 14.6, 1.9)}${arc('M16.5 18.6q2.6 2.3 5.2 0', 1.9)}`,

  /** พิมพ์คุย — a chunky keyboard with a small speech bubble. */
  keyboard: (k) => `
    <rect x="3.5" y="19" width="41" height="23" rx="8" ${k('lilac')}/>
    <ellipse cx="11" cy="23.2" rx="4.4" ry="1.8" ${k.hl}/>
    <g fill="#FFFFFF" fill-opacity=".78"><rect x="9" y="25.5" width="5" height="4.5" rx="1.8"/><rect x="16.5" y="25.5" width="5" height="4.5" rx="1.8"/><rect x="24" y="25.5" width="5" height="4.5" rx="1.8"/><rect x="31.5" y="25.5" width="7" height="4.5" rx="1.8"/><rect x="13" y="33" width="20" height="4.5" rx="2.2"/></g>
    <path d="M27 3.5h14a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-6.5l-4.5 3.8v-3.8H27a4 4 0 0 1-4-4v-5a4 4 0 0 1 4-4z" ${k('pink')} opacity=".95"/>
    <circle cx="29" cy="10" r="1.5" fill="#FFFFFF"/><circle cx="34" cy="10" r="1.5" fill="#FFFFFF"/><circle cx="39" cy="10" r="1.5" fill="#FFFFFF"/>`,

  /** โตขึ้น — a sprout with two leaves in a round blob pot, plus a sparkle. */
  growth: (k) => `
    <path d="M23 31V20" fill="none" stroke="#7FA9B1" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M23 22c-1-6.5-6-10-13-9.5.4 6.6 5.6 10.4 13 9.5z" ${k('teal')}/>
    <path d="M23.5 19.5c.6-7 5.6-11.6 13.5-11.5-.2 7.4-5.4 12.2-13.5 11.5z" ${k('blue')}/>
    <ellipse cx="29.5" cy="12" rx="2.8" ry="1.4" ${k.hl} transform="rotate(-35 29.5 12)"/>
    <path d="M10.5 29h25a2 2 0 0 1 2 2.3l-1.6 8.2a5 5 0 0 1-4.9 4H15a5 5 0 0 1-4.9-4l-1.6-8.2a2 2 0 0 1 2-2.3z" ${k('pink')} opacity=".95"/>
    <ellipse cx="15.5" cy="33.6" rx="3.4" ry="1.7" ${k.hl}/>
    <path d="M40.5 23c.6 3.3 1.6 4.3 4.9 4.9-3.3.6-4.3 1.6-4.9 4.9-.6-3.3-1.6-4.3-4.9-4.9 3.3-.6 4.3-1.6 4.9-4.9z" ${k('plum')}/>`,

  /* Mimic poses: frame shape + face (shape and face carry the meaning, the ink only adds to it). */
  /** ยิ้ม — circle, smiling. */
  'pose-smile': (k) => `
    <circle cx="24" cy="24.5" r="18" ${k(k.ink || 'pink')}/>
    <ellipse cx="15.8" cy="15.6" rx="4.4" ry="2.5" ${k.hl} transform="rotate(-35 15.8 15.6)"/>
    ${eye(18, 22.5)}${eye(30, 22.5)}${arc('M18 29q6 5.2 12 0', 2.4)}`,
  /** ตกใจ — star, round "O" mouth. */
  'pose-surprised': (k) => `
    <path d="M24.0 9.0 L28.8 19.4 L40.2 20.7 L31.8 28.5 L34.0 39.8 L24.0 34.2 L14.0 39.8 L16.2 28.5 L7.8 20.7 L19.2 19.4z" ${k(k.ink || 'lilac')} stroke="url(#${k.id(k.ink || 'lilac')})" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="18.6" cy="18" rx="2.6" ry="1.5" ${k.hl} transform="rotate(-30 18.6 18)"/>
    ${eye(19.8, 24, 2)}${eye(28.2, 24, 2)}<ellipse cx="24" cy="30" rx="2.4" ry="2.9" fill="${FACE}"/>`,
  /** ขยิบตา — drop, one eye winking. */
  'pose-wink': (k) => `
    <path d="M24 5.5c6.5 8.4 15 15.4 15 24.2a15 15 0 0 1-30 0C9 20.9 17.5 13.9 24 5.5z" ${k(k.ink || 'sky')}/>
    <ellipse cx="17" cy="22" rx="3.2" ry="2" ${k.hl} transform="rotate(-40 17 22)"/>
    ${arc('M15.6 29q2.6-2.6 5.2 0', 2.3)}${eye(30.4, 28.6)}${arc('M19.5 35q4.5 3.4 9 0', 2.3)}`,
  /** ง่วง — moon, eyes closed, a small "z". */
  'pose-sleepy': (k) => `
    <mask id="${k.id('moon')}"><rect width="48" height="48" fill="#FFFFFF"/><circle cx="33.5" cy="13.5" r="12.5" fill="#000000"/></mask>
    <circle cx="23" cy="25" r="18.5" ${k(k.ink || 'lavender')} mask="url(#${k.id('moon')})"/>
    <ellipse cx="11.4" cy="20.5" rx="2" ry="3.4" ${k.hl} transform="rotate(20 11.4 20.5)"/>
    ${arc('M11.5 28.2q2.3 2 4.6 0', 2.2)}${arc('M18.6 34.4q2.3 2 4.6 0', 2.2)}${arc('M17.6 39.2q1.6.9 3.1-.4', 2)}
    ${arc('M36 25.5h5l-5 5.5h5', 2)}`,
  /** เขิน — heart, happy closed eyes and blush. */
  'pose-shy': (k) => `
    <path d="M24 42C10 33 5 25 5 18a9.6 9.6 0 0 1 19-2.6A9.6 9.6 0 0 1 43 18c0 7-5 15-19 24z" ${k(k.ink || 'peach')}/>
    <ellipse cx="12" cy="15.5" rx="3.4" ry="2" ${k.hl} transform="rotate(-30 12 15.5)"/>
    ${arc('M14.6 23.5q2.5-2.6 5 0', 2.2)}${arc('M28.4 23.5q2.5-2.6 5 0', 2.2)}${blush(13.5, 28.5)}${blush(34.5, 28.5)}
    ${arc('M21.2 30.2q1.4 1.1 2.8 0q1.4-1.1 2.8 0', 2)}`,
  /** ดีใจ — sun, big open smile. */
  'pose-joy': (k) => `
    <g ${k(k.ink || 'butter')}><circle cx="41.5" cy="24" r="4.4"/><circle cx="36.4" cy="36.4" r="4.4"/><circle cx="24" cy="41.5" r="4.4"/><circle cx="11.6" cy="36.4" r="4.4"/><circle cx="6.5" cy="24" r="4.4"/><circle cx="11.6" cy="11.6" r="4.4"/><circle cx="24" cy="6.5" r="4.4"/><circle cx="36.4" cy="11.6" r="4.4"/></g>
    <circle cx="24" cy="24" r="14.5" ${k(k.ink || 'butter')}/>
    <ellipse cx="18" cy="16.4" rx="3.6" ry="2" ${k.hl} transform="rotate(-30 18 16.4)"/>
    ${arc('M16.6 22.5q2.4-2.6 4.8 0', 2.2)}${arc('M26.6 22.5q2.4-2.6 4.8 0', 2.2)}
    <path d="M18 27.2h12a6 6 0 0 1-12 0z" fill="${FACE}"/><path d="M21 31.2a4 4 0 0 0 6 0" fill="#EB92B3" fill-opacity=".8"/>`,
});

/** Ids of the filled sample icons, in board order. */
export const FILLED_ICON_NAMES = ['hunger', 'toilet', 'fun', 'social', 'coin', 'decor'];

/**
 * S5 bubble-colour pattern (minigames.json bubbles.colors[].pattern) as a small line glyph, so the
 * colour call never relies on colour alone. 24 grid, FACE ink. NEW, waiting for owner approval.
 * @param {'heart'|'star'|'dot'|'stripe'|string} pattern
 * @param {number} [size=18]
 * @returns {string} `<svg>` markup, decorative
 */
export function patternGlyph(pattern, size = 18) {
  const P = {
    heart: '<path d="M12 18.5s-6-3.7-6-8a3.3 3.3 0 0 1 6-1.9 3.3 3.3 0 0 1 6 1.9c0 4.3-6 8-6 8z" fill="currentColor"/>',
    star: '<path d="M12 5l2 4.6 5 .5-3.8 3.3 1.1 4.9L12 15.7l-4.3 2.6 1.1-4.9L5 10.1l5-.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    dot: '<circle cx="8" cy="9" r="2.3" fill="currentColor"/><circle cx="16" cy="9" r="2.3" fill="currentColor"/><circle cx="12" cy="16" r="2.3" fill="currentColor"/>',
    stripe: '<path d="M5 9.5h14M5 14.5h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  };
  const body = P[pattern] || P.dot;
  return `<svg class="mp-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** S5 filled icons (NEW, waiting for owner approval), in board order. */
export const FILLED_ICON_NAMES_S5 = ['snackRain', 'mimic', 'bubbles', 'hop', 'keyboard', 'growth',
  'pose-smile', 'pose-surprised', 'pose-wink', 'pose-sleepy', 'pose-shy', 'pose-joy'];

let filledSeq = 0;

/**
 * Build a FILLED Moldable icon (S4) as an SVG string. Call it once per placement: ids are unique per call.
 * @param {string} name key of FILLED_ICONS (hunger | toilet | fun | social | coin | decor)
 * @param {number} [size=32] rendered size in px
 * @param {{uid?: string, title?: string, ink?: string}} [opts] uid = stable id prefix; title = accessible name;
 *        ink = S5 pose icons only: a FILLED_INKS name (pink | lilac | sky | lavender | peach | butter …)
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
  k.ink = opts.ink && FILLED_INKS[opts.ink] ? opts.ink : null;   // S5 pose icons: colour from the data
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
