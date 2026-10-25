/**
 * Pure DSP helpers for talk-back (owner: echo). No Web Audio here, so every
 * function is deterministic and unit-testable in Node.
 */

/** Talk-back tuning (seconds / linear amplitude). */
export const VAD_DEFAULTS = Object.freeze({
  hangover: 0.6,      // silence that ends a phrase
  minPhrase: 0.3,     // shorter voiced phrases are ignored
  maxPhrase: 5,       // hard cap; phrase ends here
  preRoll: 0.2,       // audio kept from before the trigger so the first syllable is not cut
  tail: 0.15,         // silence kept after the last voiced chunk
  calibrate: 0.35,    // first seconds after start only learn the noise floor
  startRatio: 3.0,    // rms must exceed floor × this to start
  keepRatio: 1.8,     // and floor × this to count as still talking
  minStart: 0.012,    // absolute minimum start threshold
  minKeep: 0.007,
  startChunks: 2,     // consecutive loud chunks needed to start
});

/** Root-mean-square of a Float32Array. */
export function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return buf.length ? Math.sqrt(s / buf.length) : 0;
}

/**
 * Voice activity detector driven by chunks of mono samples.
 * Feed it with push(chunk); it returns an event:
 *   null | { type: 'start' } | { type: 'end', samples: Float32Array } | { type: 'discard' }
 * @param {number} sampleRate
 * @param {Partial<typeof VAD_DEFAULTS>} [opts]
 */
export function createVad(sampleRate, opts = {}) {
  const o = { ...VAD_DEFAULTS, ...opts };
  let floor = 0.004;
  let seen = 0;            // samples seen since reset
  let loudRun = 0;
  let recording = false;
  let chunks = [];         // recorded chunks
  let recLen = 0;
  let lastVoiceEnd = 0;    // sample index (within recording) where voice last ended
  let firstVoice = 0;
  const pre = [];
  let preLen = 0;

  function concat(list, len) {
    const out = new Float32Array(len);
    let p = 0;
    for (const c of list) { out.set(c.subarray(0, Math.min(c.length, len - p)), p); p += c.length; if (p >= len) break; }
    return out;
  }

  function finish() {
    const voiced = (lastVoiceEnd - firstVoice) / sampleRate;
    const keep = Math.min(recLen, lastVoiceEnd + Math.round(o.tail * sampleRate));
    const samples = concat(chunks, keep);
    recording = false; chunks = []; recLen = 0; loudRun = 0;
    if (voiced < o.minPhrase) return { type: 'discard' };
    return { type: 'end', samples };
  }

  return {
    /** Current noise-floor estimate (rms). */
    get floor() { return floor; },
    /** True while a phrase is being recorded. */
    get recording() { return recording; },
    /** Forget everything (call after playback, or on restart). keepFloor keeps the learned floor. */
    reset(keepFloor = true) {
      if (!keepFloor) { floor = 0.004; seen = 0; }
      recording = false; chunks = []; recLen = 0; loudRun = 0; pre.length = 0; preLen = 0;
    },
    /**
     * @param {Float32Array} chunk mono samples (copied internally)
     * @returns {null|{type:'start'}|{type:'end',samples:Float32Array}|{type:'discard'}}
     */
    push(chunk) {
      const c = new Float32Array(chunk);
      const r = rms(c);
      seen += c.length;
      const startThr = Math.max(o.minStart, floor * o.startRatio);
      const keepThr = Math.max(o.minKeep, floor * o.keepRatio);

      if (!recording) {
        // Floor: falls fast, rises slowly (speech should not lift it much).
        floor = r < floor ? floor * 0.6 + r * 0.4 : floor * 0.985 + r * 0.015;
        pre.push(c); preLen += c.length;
        while (pre.length > 1 && preLen - pre[0].length >= o.preRoll * sampleRate) preLen -= pre.shift().length;
        if (seen < o.calibrate * sampleRate) return null;
        loudRun = r > startThr ? loudRun + 1 : 0;
        if (loudRun >= o.startChunks) {
          recording = true;
          chunks = pre.slice(); recLen = preLen;
          firstVoice = Math.max(0, recLen - c.length * loudRun);
          lastVoiceEnd = recLen;
          pre.length = 0; preLen = 0;
          return { type: 'start' };
        }
        return null;
      }

      chunks.push(c); recLen += c.length;
      if (r > keepThr) lastVoiceEnd = recLen;
      if ((recLen - lastVoiceEnd) / sampleRate >= o.hangover) return finish();
      if (recLen / sampleRate >= o.maxPhrase) { lastVoiceEnd = recLen; return finish(); }
      return null;
    },
  };
}

/**
 * WSOLA time stretch (waveform-similarity overlap-add). Output length ≈ input × factor.
 * @param {Float32Array} x
 * @param {number} factor >1 = longer
 * @param {number} sampleRate
 */
export function timeStretch(x, factor, sampleRate) {
  const N = Math.max(64, Math.round(sampleRate * 0.04) & ~1); // 40 ms frames
  const Hs = N / 2;                                            // output hop (50% overlap)
  const Ha = Hs / factor;                                      // input hop
  const tol = Math.round(sampleRate * 0.008);                  // ±8 ms search
  const outLen = Math.ceil(x.length * factor) + N;
  const y = new Float32Array(outLen);
  const wsum = new Float32Array(outLen);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const at = (i) => (i >= 0 && i < x.length ? x[i] : 0);
  const STEP = 4; // correlation decimation (keeps it cheap on phones)

  let prevPos = 0;
  for (let k = 0; ; k++) {
    const outPos = k * Hs;
    if (outPos >= outLen - N) break;
    const nominal = Math.round(k * Ha);
    if (nominal >= x.length) break;
    let best = nominal;
    if (k > 0) {
      const natural = prevPos + Hs; // where the previous frame would continue
      let bestScore = -Infinity;
      for (let d = -tol; d <= tol; d += 2) {
        const cand = nominal + d;
        if (cand < 0) continue;
        let s = 0;
        for (let i = 0; i < N; i += STEP) s += at(cand + i) * at(natural + i);
        if (s > bestScore) { bestScore = s; best = cand; }
      }
    }
    for (let i = 0; i < N; i++) {
      y[outPos + i] += at(best + i) * win[i];
      wsum[outPos + i] += win[i];
    }
    prevPos = best;
  }
  const len = Math.min(outLen, Math.round(x.length * factor));
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = wsum[i] > 1e-3 ? y[i] / wsum[i] : 0;
  return out;
}

/** Linear-interpolation resample by `ratio` (>1 = shorter and higher). */
export function resample(x, ratio) {
  const len = Math.max(1, Math.floor(x.length / ratio));
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const p = i * ratio, j = Math.floor(p), f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? x[j] ?? 0) * f;
  }
  return out;
}

/**
 * Pitch shift keeping duration about the same: WSOLA stretch by r, then resample by r.
 * @param {Float32Array} x mono samples
 * @param {number} sampleRate
 * @param {number} semitones e.g. 6
 * @returns {Float32Array}
 */
export function pitchShift(x, sampleRate, semitones) {
  const r = Math.pow(2, semitones / 12);
  return resample(timeStretch(x, r, sampleRate), r);
}

/**
 * Clean up a phrase for playback: remove DC, normalise peak to `target`
 * (boost capped at `maxGain` so room noise is not blown up), 10 ms fades.
 * Mutates and returns x.
 */
export function finishPhrase(x, sampleRate, target = 0.8, maxGain = 6) {
  let mean = 0;
  for (let i = 0; i < x.length; i++) mean += x[i];
  mean /= x.length || 1;
  let peak = 0;
  for (let i = 0; i < x.length; i++) { x[i] -= mean; peak = Math.max(peak, Math.abs(x[i])); }
  const g = peak > 0 ? Math.min(maxGain, target / peak) : 1;
  const fade = Math.min(Math.round(sampleRate * 0.01), Math.floor(x.length / 2));
  for (let i = 0; i < x.length; i++) {
    let e = 1;
    if (i < fade) e = i / fade;
    else if (i >= x.length - fade) e = (x.length - 1 - i) / fade;
    x[i] *= g * e;
  }
  return x;
}

/**
 * Mouth-flap envelope: one 0..1 value per `fps` frame.
 * @returns {Float32Array}
 */
export function levelEnvelope(x, sampleRate, fps = 30) {
  const hop = Math.max(1, Math.round(sampleRate / fps));
  const n = Math.ceil(x.length / hop);
  const env = new Float32Array(n);
  let max = 0;
  for (let k = 0; k < n; k++) {
    env[k] = rms(x.subarray(k * hop, Math.min(x.length, (k + 1) * hop)));
    max = Math.max(max, env[k]);
  }
  for (let k = 0; k < n; k++) {
    const v = max > 0 ? env[k] / max : 0;
    env[k] = v < 0.08 ? 0 : Math.min(1, Math.pow(v, 0.7)); // small gate, gentle curve
  }
  return env;
}
