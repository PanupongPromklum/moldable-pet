/**
 * Body action clips. Each clip is `{ dur, f(t, o) }`: t runs 0..1, f writes offsets into the
 * reusable frame object `o` (no allocation per frame). Every clip returns to neutral at t = 1.
 *
 * Frame fields: y (lift), x (side shift), sy (stretch multiplier), rx/ry/rz (rad), mo (mouth open
 * 0..1), puff (cheek puff 0..1), lid (extra eyelid close 0..1).
 *
 * hop/shake/nod/jelly/tilt/sway are the approved prototype clips; chew/gulp/wiggle/shiver/yawn are
 * new pet-game clips built with the same soft ease-out envelopes (no hard bounce).
 */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

/** Reset a frame object to neutral. */
export function resetFrame(o) { o.y = 0; o.x = 0; o.sy = 1; o.rx = 0; o.ry = 0; o.rz = 0; o.mo = 0; o.puff = 0; o.lid = 0; return o; }

export const ACTIONS = Object.freeze({
  hop:   { dur: 1.5, f(t, o) { const ph = (t * 3) % 1, fade = t > .9 ? (1 - t) / .1 : 1; o.y = .22 * Math.sin(Math.PI * ph) * fade; o.sy = lerp(1, .97 - .09 * Math.cos(TAU * ph), fade); o.rz = .09 * Math.sin(TAU * t * 1.5) * fade; } },
  shake: { dur: 1.1, f(t, o) { o.ry = .42 * Math.sin(t * Math.PI * 6) * Math.pow(1 - t, 1.2); o.rz = .05 * Math.sin(t * Math.PI * 6) * (1 - t); } },
  nod:   { dur: 1.0, f(t, o) { const s = Math.sin(t * Math.PI * 4); o.rx = .2 * Math.max(0, s) * (1 - t * .5); o.sy = 1 - .045 * Math.abs(s) * (1 - t); } },
  jelly: { dur: 1.3, f(t, o) { o.sy = 1 - .2 * Math.sin(t * Math.PI * 7) * Math.exp(-3.2 * t); o.rz = .03 * Math.sin(t * Math.PI * 5) * (1 - t); } },
  tilt:  { dur: 1.7, f(t, o) { const b = Math.pow(Math.sin(Math.PI * t), .55); o.rz = .3 * b; o.rx = -.05 * b; } },
  sway:  { dur: 2.0, f(t, o) { const f = Math.sin(Math.PI * t); o.rz = .16 * Math.sin(t * Math.PI * 4) * f; o.y = .04 * Math.abs(Math.sin(t * Math.PI * 4)) * f; } },

  /** Four soft chews with puffed cheeks. */
  chew:  { dur: 1.8, f(t, o) {
    const env = smooth(0, .08, t) * (1 - smooth(.86, 1, t)), c = .5 - .5 * Math.cos(TAU * 4 * t);
    o.mo = .3 * c * env; o.puff = .9 * env; o.sy = 1 - .03 * c * env; o.rx = .035 * c * env; o.rz = .02 * Math.sin(TAU * 2 * t) * env;
  } },
  /** Squeeze, swallow (stretch up, cheeks deflate), small settle wobble. */
  gulp:  { dur: 1.0, f(t, o) {
    const a = smooth(0, .28, t) - smooth(.28, .5, t), b = smooth(.3, .48, t) * (1 - smooth(.48, .9, t));
    const settle = t > .5 ? .018 * Math.sin(TAU * 3 * (t - .5)) * Math.exp(-6 * (t - .5)) * (1 - smooth(.9, 1, t)) : 0;
    o.sy = 1 - .06 * a + .045 * b + settle; o.rx = .1 * a - .05 * b; o.puff = .9 * (1 - smooth(.22, .42, t)); o.lid = .35 * a;
  } },
  /** Needs the toilet: side-to-side squirm. */
  wiggle: { dur: 1.8, f(t, o) {
    const env = Math.pow(Math.sin(Math.PI * t), .6), s = Math.sin(TAU * 5 * t);
    o.rz = .075 * s * env; o.x = .035 * s * env; o.ry = -.12 * Math.sin(TAU * 5 * t + .8) * env; o.sy = 1 - .035 * Math.abs(s) * env; o.lid = .15 * env;
  } },
  /** Cold / scared: fast tiny tremble, slightly huddled. */
  shiver: { dur: 1.3, f(t, o) {
    const env = smooth(0, .1, t) * (1 - smooth(.7, 1, t)), j = Math.sin(TAU * 14 * t);
    o.rz = .02 * j * env; o.x = .012 * j * env; o.ry = .025 * Math.sin(TAU * 11 * t + 1) * env; o.sy = 1 - .04 * env; o.lid = .1 * env;
  } },
  /** Big slow yawn: mouth opens wide, eyes squeeze, lean back and stretch. */
  yawn:  { dur: 2.4, f(t, o) {
    const open = smooth(.1, .45, t) * (1 - smooth(.7, .92, t)), after = Math.sin(Math.PI * smooth(.8, 1, t));
    o.mo = open; o.lid = .75 * open; o.sy = 1 + .06 * open - .025 * after; o.rx = -.09 * open; o.rz = .03 * open;
  } },
});

/** Every action name accepted by `play`. */
export const ACTION_KEYS = Object.freeze(Object.keys(ACTIONS));
