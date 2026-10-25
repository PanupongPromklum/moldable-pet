/**
 * Face drawing for the decal eyes and mouth (canvas 2D), ported from the approved prototype.
 * Pure functions: they draw into the canvas context they are given and hold no state.
 */

export const INK = '#202429';
export const WHITE = '#f4f4f6';
const TONGUE = '#ee8fb0';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/** Superellipse path centred at 0,0 with half sizes a, b and power p. */
export function superPath(g, a, b, p) {
  g.beginPath();
  for (let i = 0; i <= 96; i++) {
    const t = i / 96 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

/** Superellipse distance (1 = on the outline). */
export const superD = (dx, dy, a, b, p) => Math.pow(Math.pow(Math.abs(dx) / a, p) + Math.pow(Math.abs(dy) / b, p), 1 / p);

/**
 * Draw one eye.
 * @param {CanvasRenderingContext2D} g target context (size TEX)
 * @param {number} TEX canvas size in px
 * @param {number} BOX decal size in body units
 * @param {object} E eye data from SHAPES
 * @param {number} S eye scale
 * @param {number} i eye index 0/1
 * @param {object} st { eye, pupil, lidCurve, lidU[], lidL[], tilt[], arc[], blink, lx, ly }
 */
export function drawEye(g, TEX, BOX, E, S, i, st) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, TEX, TEX);
  g.translate(TEX / 2, TEX / 2); g.scale(TEX / BOX, -TEX / BOX);
  const w = E.w * S * st.eye, h = E.h * S * st.eye;
  let lu = st.lidU[i], ll = st.lidL[i]; const sum = lu + ll;
  if (sum > .8) { const f = lerp(sum, 1, clamp((sum - .8) / .1, 0, 1)) / sum; lu *= f; ll *= f; }
  lu += st.blink * Math.max(0, 1 - lu - ll);
  if (lu + ll > .97) {
    const dir = st.blink > .5 && st.lidU[i] + st.lidL[i] < .9 ? -1 : st.arc[i];
    const aw = Math.max(w, h * .8);
    g.lineCap = 'round'; g.lineWidth = Math.max(.012, .15 * Math.min(w, h)) * 1.05; g.strokeStyle = INK; g.beginPath();
    if (dir > 0) { g.moveTo(-aw * .8, -h * .18); g.quadraticCurveTo(0, h * .7, aw * .8, -h * .18); }
    else { g.moveTo(-aw * .82, h * .08); g.quadraticCurveTo(0, -h * .55, aw * .82, h * .08); }
    g.stroke(); return;
  }
  g.save(); g.rotate(E.rot);
  superPath(g, w, h, E.p); g.fillStyle = WHITE; g.fill();
  if (E.clip) { g.save(); superPath(g, w, h, E.p); g.clip(); }
  const lim = E.clip ? 1.2 : 2.2;
  g.save(); g.translate(clamp(st.lx, -lim, lim) * w * .5, clamp(st.ly, -lim, lim) * h * .5); g.rotate(E.prot);
  g.fillStyle = INK; g.beginPath(); g.ellipse(0, 0, E.pw * w * st.pupil, E.ph * h * st.pupil, 0, 0, Math.PI * 2); g.fill(); g.restore();
  if (E.clip) g.restore();
  g.restore();
  const W = Math.max(w, h) * 2.4, c = st.lidCurve;
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  g.save(); g.rotate(st.tilt[i]);
  if (lu > .005) { const y = h - lu * 2 * h; g.beginPath(); g.moveTo(-W, y + h * .12 * c); g.quadraticCurveTo(0, y - h * .14 * c, W, y + h * .12 * c); g.lineTo(W, h * 3); g.lineTo(-W, h * 3); g.closePath(); g.fill(); }
  if (ll > .005) { const y = -h + ll * 2 * h; g.beginPath(); g.moveTo(-W, y - h * .1 * c); g.quadraticCurveTo(0, y + h * .14 * c, W, y - h * .1 * c); g.lineTo(W, -h * 3); g.lineTo(-W, -h * 3); g.closePath(); g.fill(); }
  g.restore(); g.globalCompositeOperation = 'source-over';
}

function edgeTop(m, x) {
  const u = Math.abs(x / m.w), e = Math.pow(Math.max(0, 1 - Math.pow(u, m.q)), 1 / m.q);
  return m.curve * u * u + m.skew * (x / m.w) + m.up * e + m.t * Math.pow(e, .4);
}
function edgeBot(m, x) {
  const u = Math.abs(x / m.w), e = Math.pow(Math.max(0, 1 - Math.pow(u, m.q)), 1 / m.q);
  return m.curve * u * u + m.skew * (x / m.w) - m.down * e - m.t * Math.pow(e, .4);
}
function mouthPath(g, m, N = 64) {
  g.beginPath();
  for (let i = 0; i <= N; i++) { const x = -m.w + 2 * m.w * i / N; i ? g.lineTo(x, edgeTop(m, x)) : g.moveTo(x, edgeTop(m, x)); }
  for (let i = N - 1; i > 0; i--) { const x = -m.w + 2 * m.w * i / N; g.lineTo(x, edgeBot(m, x)); }
  g.closePath();
}

/**
 * Draw the mouth.
 * @param {CanvasRenderingContext2D} g target context (size TEX)
 * @param {number} TEX canvas size in px
 * @param {number} MBOX decal size in body units
 * @param {object} m mouth { w, up, down, curve, t, tongue, q, skew }
 */
export function drawMouth(g, TEX, MBOX, m) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, TEX, TEX);
  g.translate(TEX / 2, TEX / 2); g.scale(TEX / MBOX, -TEX / MBOX);
  g.lineJoin = 'round'; g.lineWidth = .0035; g.fillStyle = INK; g.strokeStyle = INK;
  mouthPath(g, m); g.fill(); g.stroke();
  if (m.tongue > .02 && m.down > .025) {
    g.save(); mouthPath(g, m); g.clip();
    g.fillStyle = TONGUE; g.beginPath(); g.ellipse(0, edgeBot(m, 0), m.w * .56, m.tongue * m.down * 1.2, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}
