/**
 * Expression presets for the Moldable blob characters.
 * The eight GENERIC presets and `original` are ported unchanged from the approved prototype
 * (prototypes/squish-pet/index.html). `hungry` and `eat` are new for the pet game.
 *
 * Preset fields: lidU/lidL [left,right] 0..1 eyelid cover, tilt [l,r] lid tilt (rad), arc [l,r]
 * direction of the closed-eye arc (1 = happy ∩, -1 = relaxed ∪), eye (eye scale), pupil (pupil
 * scale), look [x,y] idle gaze, blush 0..1, mouth (see M), sy body stretch, rx/rz body lean (rad),
 * puff 0..1 cheek puff (new).
 */

/** Mouth shape: half width, upper lip lift, lower lip drop, smile curve, line thickness, tongue 0..1, superellipse power, skew. */
export const M = (w, up, down, curve, t, tongue = 0, q = 2, skew = 0) => ({ w, up, down, curve, t, tongue, q, skew });

/** Shared presets (mouth values are for an eye size of mScale = 1; exprFor scales them per character). */
export const GENERIC = Object.freeze({
  smile:     { th: 'ยิ้ม', en: 'Smile', lidU: [0, 0], lidL: [.12, .12], tilt: [0, 0], arc: [1, 1], eye: 1, pupil: 1, look: [.3, -.1], blush: .2, mouth: M(.07, .003, .055, .012, .003, 0, 2.4), sy: 1, rx: 0, rz: 0 },
  joy:       { th: 'หัวเราะ', en: 'Joy', lidU: [.5, .5], lidL: [.5, .5], tilt: [0, 0], arc: [1, 1], eye: 1, pupil: 1, look: [0, 0], blush: .85, mouth: M(.09, .006, .095, .016, .003, .5, 2.4), sy: 1.02, rx: -.04, rz: 0 },
  surprised: { th: 'ตกใจ', en: 'Surprised', lidU: [0, 0], lidL: [0, 0], tilt: [0, 0], arc: [-1, -1], eye: 1.1, pupil: .72, look: [0, .1], blush: 0, mouth: M(.04, .042, .048, 0, .003), sy: 1.04, rx: -.05, rz: 0 },
  sad:       { th: 'เศร้า', en: 'Sad', lidU: [.34, .34], lidL: [0, 0], tilt: [.36, -.36], arc: [-1, -1], eye: 1, pupil: 1.02, look: [0, -.8], blush: 0, mouth: M(.055, 0, 0, -.026, .008), sy: .96, rx: .1, rz: 0 },
  wink:      { th: 'ขยิบตา', en: 'Wink', lidU: [0, .5], lidL: [0, .5], tilt: [0, 0], arc: [1, 1], eye: 1, pupil: 1, look: [.35, -.1], blush: .45, mouth: M(.068, .003, .05, .016, .003, .3, 2.4), sy: 1, rx: 0, rz: -.06 },
  sleepy:    { th: 'ง่วง', en: 'Sleepy', lidU: [.6, .6], lidL: [.06, .06], tilt: [.1, -.1], arc: [-1, -1], eye: 1, pupil: 1, look: [0, -.5], blush: .1, mouth: M(.026, .012, .018, 0, .003), sy: .97, rx: .05, rz: .04 },
  grumpy:    { th: 'งอน', en: 'Grumpy', lidU: [.4, .4], lidL: [.06, .06], tilt: [-.32, .32], arc: [-1, -1], eye: 1, pupil: .95, look: [-.8, -.1], blush: .35, mouth: M(.046, 0, 0, -.011, .008), sy: .98, rx: 0, rz: .05 },
  shy:       { th: 'เขิน', en: 'Shy', lidU: [.12, .12], lidL: [.3, .3], tilt: [0, 0], arc: [1, 1], eye: 1, pupil: 1, look: [-.7, -.7], blush: 1, mouth: M(.034, 0, 0, .018, .007), sy: .98, rx: .05, rz: -.08 },
  // new: droopy eyes looking down, small open mouth
  hungry:    { th: 'หิว', en: 'Hungry', lidU: [.3, .3], lidL: [0, 0], tilt: [.24, -.24], arc: [-1, -1], eye: 1, pupil: 1.06, look: [0, -.75], blush: 0, mouth: M(.03, .018, .034, -.004, .003, .35), sy: .97, rx: .07, rz: 0 },
  // new: happy closed eyes, cheeks puffed, small closed mouth
  eat:       { th: 'กิน', en: 'Eat', lidU: [.5, .5], lidL: [.5, .5], tilt: [0, 0], arc: [1, 1], eye: 1, pupil: 1, look: [0, 0], blush: .7, mouth: M(.036, 0, 0, .014, .008), sy: 1.02, rx: -.03, rz: 0, puff: .85 },
});

/** Every expression name accepted by `setExpression`. */
export const EXPRESSION_KEYS = Object.freeze(['original', ...Object.keys(GENERIC)]);

/** Thai labels for UI / debug. */
export const EXPRESSION_TH = Object.freeze({ original: 'ปกติ', ...Object.fromEntries(Object.entries(GENERIC).map(([k, v]) => [k, v.th])) });

/** Body action the prototype paired with each expression (optional; the game decides whether to play it). */
export const EXPRESSION_ACTION = Object.freeze({ joy: 'hop', grumpy: 'shake', surprised: 'jelly', shy: 'sway', sad: 'tilt', wink: 'nod', eat: 'chew' });

/** Expressions where the eyes avoid the look-at target. */
export const LOOK_AWAY = Object.freeze(new Set(['shy', 'grumpy', 'sad', 'sleepy', 'eat']));

/**
 * Build a fresh, mutable expression target for one character.
 * @param {string} k expression key
 * @param {object} C the character's SHAPES entry
 * @param {number} mScale mouth scale derived from the character's eye size
 * @returns {object} preset with per-character mouth and `original` resolved
 */
export function exprFor(k, C, mScale) {
  if (k === 'original') {
    const E = C.eye, mo = C.mouth;
    return { th: 'ปกติ', en: 'Original', lidU: [E.lidU, E.lidU], lidL: [0, 0], tilt: [0, 0], arc: [1, 1], eye: 1, pupil: 1, look: [E.pdx * 2, E.pdy * 2], lidCurve: E.lidU ? 0 : 1, blush: .1,
      mouth: { w: mo.w, up: mo.up, down: mo.down, curve: mo.curve, t: mo.t, tongue: 0, q: mo.q, skew: mo.skew }, sy: 1, rx: 0, rz: 0, puff: 0 };
  }
  const x = GENERIC[k], s = mScale;
  return { ...x, lidCurve: 1, puff: x.puff || 0, lidU: [...x.lidU], lidL: [...x.lidL], tilt: [...x.tilt], arc: [...x.arc], look: [...x.look],
    mouth: { ...x.mouth, w: x.mouth.w * s, up: x.mouth.up * s, down: x.mouth.down * s, curve: x.mouth.curve * s, t: x.mouth.t * Math.sqrt(s) } };
}
