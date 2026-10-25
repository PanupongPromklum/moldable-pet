/**
 * Shared Web Audio context and master bus for Moldable Pet (owner: echo).
 *
 * One AudioContext for the whole game (iOS limits how many may exist). Every
 * sound goes through a bus, then a shared master chain:
 *
 *   bus(sfx | voice | music) → glue compressor → make-up gain → peak limiter → soft clipper (≤ -1 dBFS) → destination
 *
 * Nothing here throws: if Web Audio is missing, getters return null and callers
 * simply stay silent. The game must make sense with sound off.
 */

/** Default gains per bus. Gentle overall level; music sits under SFX. */
const BUS_GAIN = { sfx: 0.75, voice: 0.6, music: 0.45 };
/** Make-up gain after the glue compressor (linear). */
const MAKEUP = 1.0;
/** Music ducking under SFX / voice: depth (linear multiplier) and timings (s). */
const DUCK = { depth: 0.55, attack: 0.03, hold: 0.25, release: 0.4 };

let ctx = null;
let master = null;
const buses = {};
let duckUntil = 0;

/**
 * Get (lazily create) the shared AudioContext. Handles `webkitAudioContext`.
 * @returns {AudioContext|null} null when Web Audio is unavailable.
 */
export function getAudioContext() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC({ latencyHint: 'interactive' }); }
  catch { try { ctx = new AC(); } catch { ctx = null; } }
  return ctx;
}

/**
 * Resume the context. Call this synchronously inside a user gesture (iOS Safari).
 * Also plays a one-sample silent buffer, which is what unlocks older iOS.
 * @returns {Promise<boolean>} true when the context is running.
 */
export function resumeAudio() {
  const c = getAudioContext();
  if (!c) return Promise.resolve(false);
  try {
    const b = c.createBuffer(1, 1, c.sampleRate);
    const s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
  } catch { /* ignore */ }
  let p;
  try { p = c.state === 'running' ? Promise.resolve() : c.resume(); } catch { p = Promise.resolve(); }
  return Promise.resolve(p).then(() => c.state === 'running', () => false);
}

/** Soft clip curve: linear up to 0.6, smooth knee, never above ~0.86 (≈ -1.3 dBFS). */
function clipCurve(n = 2048) {
  const curve = new Float32Array(n);
  const knee = 0.6, room = 0.29;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    const y = a < knee ? a : knee + room * Math.tanh((a - knee) / room);
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

function getMaster() {
  if (master) return master;
  const c = getAudioContext();
  if (!c) return null;
  try {
    const glue = c.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 8; glue.ratio.value = 2.5;
    glue.attack.value = 0.003; glue.release.value = 0.15;
    const limit = c.createDynamicsCompressor();
    limit.threshold.value = -3; limit.knee.value = 0; limit.ratio.value = 20;
    limit.attack.value = 0.001; limit.release.value = 0.08;
    const clip = c.createWaveShaper();
    clip.curve = clipCurve(); clip.oversample = '2x';
    const makeup = c.createGain(); makeup.gain.value = MAKEUP;
    glue.connect(makeup); makeup.connect(limit); limit.connect(clip); clip.connect(c.destination);
    master = glue;
  } catch { master = null; }
  return master;
}

/**
 * Get a named bus (a GainNode feeding the master chain).
 * @param {'sfx'|'voice'|'music'} name
 * @returns {GainNode|null}
 */
export function getBus(name) {
  if (buses[name]) return buses[name];
  const c = getAudioContext(), m = getMaster();
  if (!c || !m) return null;
  try {
    const g = c.createGain();
    g.gain.value = BUS_GAIN[name] ?? 0.7;
    g.connect(m);
    buses[name] = g;
    return g;
  } catch { return null; }
}

/**
 * Get a bus only if it already exists (never creates the AudioContext).
 * @param {'sfx'|'voice'|'music'} name
 * @returns {GainNode|null}
 */
export function peekBus(name) { return buses[name] || null; }

/** Default gain of a bus (linear). */
export function busDefaultGain(name) { return BUS_GAIN[name] ?? 0.7; }

/**
 * Duck the music bus under an SFX or voice for `seconds` (plus hold/release).
 * No-op until a music bus exists.
 * @param {number} [seconds=0] length of the sound doing the ducking.
 */
export function duckMusic(seconds = 0) {
  const g = buses.music, c = ctx;
  if (!g || !c) return;
  try {
    const t = c.currentTime, base = BUS_GAIN.music;
    const end = Math.max(duckUntil, t + seconds + DUCK.hold);
    const p = g.gain;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
    p.linearRampToValueAtTime(base * DUCK.depth, t + DUCK.attack);
    p.setValueAtTime(base * DUCK.depth, end);
    p.linearRampToValueAtTime(base, end + DUCK.release);
    duckUntil = end;
  } catch { /* ignore */ }
}
