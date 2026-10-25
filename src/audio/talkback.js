/**
 * Talk-back (owner: echo): the pet listens, records what the player says and
 * repeats it in a higher voice, driving its mouth from the playback level.
 *
 * Contract (docs/architecture/module-contracts.md, "Audio — echo"):
 *   const tb = createTalkback({ onState(state) {}, onLevel(level) {} });
 *   await tb.start(); tb.stop(); tb.isOn();
 *   state: off | listening | recording | playing
 *
 * Flow: off → listening → recording → playing → listening …
 * - Mic permission is requested only inside start() (call it from the mic button press).
 * - Voice activity detection on chunk RMS against a running noise-floor estimate,
 *   0.6 s hangover ends a phrase, phrases < 0.3 s are ignored, 5 s cap (see dsp.js).
 * - Capture: AudioWorklet from an inline Blob URL, ScriptProcessor fallback, raw
 *   Float32 (no MediaRecorder, so no codec differences between browsers).
 * - Playback: WSOLA time stretch + resample (+6 semitones, same duration); falls back
 *   to plain playbackRate if processing fails. Listening pauses during playback so the
 *   pet never hears itself, then resumes after a short cooldown.
 */
import { getAudioContext, resumeAudio, getBus, duckMusic } from './context.js';
import { createVad, pitchShift, finishPhrase, levelEnvelope, rms } from './dsp.js';

const CHUNK = 2048;
const LEVEL_FPS = 30;
const COOLDOWN_MS = 350;

const WORKLET_SRC = `
class TbCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(${CHUNK}); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('tb-capture', TbCapture);`;

const workletLoaded = new WeakMap(); // AudioContext → Promise<boolean>

function loadWorklet(ctx) {
  if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return Promise.resolve(false);
  if (!workletLoaded.has(ctx)) {
    let url = null;
    const p = (async () => {
      try {
        url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
        await ctx.audioWorklet.addModule(url);
        return true;
      } catch { return false; }
      finally { if (url) URL.revokeObjectURL(url); }
    })();
    workletLoaded.set(ctx, p);
  }
  return workletLoaded.get(ctx);
}

/**
 * Create a talk-back controller.
 * @param {object} [opts]
 * @param {(state: 'off'|'listening'|'recording'|'playing') => void} [opts.onState]
 * @param {(level: number) => void} [opts.onLevel] 0..1 at ~30 Hz during playback (mouth), 0 when done.
 * @param {(level: number) => void} [opts.onInputLevel] optional 0..1 mic level while listening/recording (meters).
 * @param {(err: Error) => void} [opts.onError] optional; called when the mic is denied or unavailable.
 * @param {number} [opts.semitones=6] pitch shift (+5..+7 recommended).
 * @param {'wsola'|'rate'} [opts.method='wsola'] 'rate' = plain playbackRate (shorter, chipmunk).
 * @param {object} [opts.vad] overrides for dsp.VAD_DEFAULTS.
 */
export function createTalkback(opts = {}) {
  const {
    onState = () => {}, onLevel = () => {}, onInputLevel = null, onError = null,
    semitones = 6, method = 'wsola', vad: vadOpts = {},
  } = opts;

  let state = 'off';
  let session = 0;          // bumps on every start/stop so stale async work is dropped
  let stream = null, source = null, capture = null, sink = null;
  let vad = null;
  let paused = false;
  let player = null, levelTimer = 0, cooldownTimer = 0;
  let starting = null;      // pending start() promise (double-press guard)

  const safe = (fn, ...a) => { try { fn(...a); } catch { /* caller bug must not break audio */ } };
  function setState(s) { if (s !== state) { state = s; safe(onState, s); } }

  function onChunk(chunk) {
    if (state === 'off' || paused || !vad) return;
    if (onInputLevel) safe(onInputLevel, Math.min(1, rms(chunk) * 6));
    const ev = vad.push(chunk);
    if (!ev) return;
    if (ev.type === 'start') setState('recording');
    else if (ev.type === 'discard') setState('listening');
    else if (ev.type === 'end') play(ev.samples);
  }

  function play(samples) {
    const ctx = getAudioContext(), bus = getBus('voice');
    if (!ctx || !bus) { setState('listening'); return; }
    paused = true;
    setState('playing');
    if (onInputLevel) safe(onInputLevel, 0);
    const my = session;
    // Yield one tick so the 'playing' state can paint before the DSP work.
    setTimeout(() => {
      if (my !== session) return;
      const sr = ctx.sampleRate;
      let data = null, rate = 1;
      if (method === 'wsola') {
        try { data = pitchShift(samples, sr, semitones); } catch { data = null; }
      }
      if (!data) { data = samples; rate = Math.pow(2, semitones / 12); }
      finishPhrase(data, sr);
      const env = levelEnvelope(data, sr, LEVEL_FPS);
      let src;
      try {
        const buf = ctx.createBuffer(1, data.length, sr);
        buf.getChannelData(0).set(data);
        src = ctx.createBufferSource();
        src.buffer = buf; src.playbackRate.value = rate;
        src.connect(bus);
      } catch { resumeListening(my); return; }
      const t0 = ctx.currentTime + 0.02, dur = data.length / sr / rate;
      duckMusic(dur);
      src.onended = () => { if (player === src) player = null; finishPlayback(my); };
      player = src;
      try { src.start(t0); } catch { resumeListening(my); return; }
      clearInterval(levelTimer);
      levelTimer = setInterval(() => {
        const k = Math.floor(((ctx.currentTime - t0) * rate) * LEVEL_FPS);
        safe(onLevel, k >= 0 && k < env.length ? env[k] : 0);
      }, 1000 / LEVEL_FPS);
    }, 0);
  }

  function finishPlayback(my) {
    clearInterval(levelTimer); levelTimer = 0;
    safe(onLevel, 0);
    resumeListening(my);
  }

  function resumeListening(my) {
    if (my !== session) return;
    clearTimeout(cooldownTimer);
    // Short cooldown: room echo of the pet's own voice is not treated as speech.
    cooldownTimer = setTimeout(() => {
      if (my !== session) return;
      if (vad) vad.reset(true);
      paused = false;
      setState('listening');
    }, COOLDOWN_MS);
  }

  function teardown() {
    clearInterval(levelTimer); levelTimer = 0;
    clearTimeout(cooldownTimer); cooldownTimer = 0;
    if (player) { try { player.onended = null; player.stop(); } catch { /* ignore */ } player = null; }
    for (const n of [source, capture, sink]) { try { n && n.disconnect(); } catch { /* ignore */ } }
    if (capture && capture.port) { try { capture.port.onmessage = null; capture.port.close(); } catch { /* ignore */ } }
    if (capture && 'onaudioprocess' in capture) capture.onaudioprocess = null;
    if (stream) { for (const t of stream.getTracks()) { try { t.stop(); } catch { /* ignore */ } } }
    stream = source = capture = sink = null;
    vad = null; paused = false;
  }

  const api = {
    /**
     * Turn talk-back on. Call from the mic button's click/tap handler: it resumes
     * the AudioContext inside the gesture, then asks for the mic (first press only;
     * the browser remembers the answer).
     * @returns {Promise<boolean>} true when listening; false if denied/unavailable (never throws).
     */
    start() {
      if (state !== 'off') return Promise.resolve(true);
      if (starting) return starting;
      starting = startInner().finally(() => { starting = null; });
      return starting;
    },

    /** Turn talk-back off: stops playback and releases the mic tracks. */
    stop() {
      session++;
      starting = null;
      const wasPlaying = state === 'playing';
      teardown();
      if (wasPlaying) safe(onLevel, 0);
      if (onInputLevel) safe(onInputLevel, 0);
      setState('off');
    },

    /** @returns {boolean} true while listening, recording or playing. */
    isOn() { return state !== 'off'; },

    /** @returns {'off'|'listening'|'recording'|'playing'} current state. */
    getState() { return state; },
  };
  return api;

  /** Resume audio inside the gesture, ask for the mic, build the capture graph. */
  async function startInner() {
    const my = ++session;
    const ctx = getAudioContext();
    const resumed = resumeAudio(); // synchronous part runs inside the gesture (iOS)
    const md = globalThis.navigator && navigator.mediaDevices;
    if (!ctx || !md || !md.getUserMedia) {
      safe(onError || (() => {}), new Error('Microphone or Web Audio unavailable (needs https).'));
      return false;
    }
    try {
      const s = await md.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (my !== session) { s.getTracks().forEach((t) => t.stop()); return false; }
      stream = s;
      await resumed;
      source = ctx.createMediaStreamSource(stream);
      sink = ctx.createGain(); sink.gain.value = 0; sink.connect(ctx.destination); // keeps the graph pulling
      if (await loadWorklet(ctx)) {
        if (my !== session) { teardown(); return false; }
        capture = new AudioWorkletNode(ctx, 'tb-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
        capture.port.onmessage = (e) => onChunk(e.data);
      } else {
        capture = ctx.createScriptProcessor(CHUNK, 1, 1);
        capture.onaudioprocess = (e) => onChunk(e.inputBuffer.getChannelData(0));
      }
      source.connect(capture); capture.connect(sink);
      vad = createVad(ctx.sampleRate, vadOpts);
      paused = false;
      setState('listening');
      return true;
    } catch (err) {
      if (my === session) { teardown(); setState('off'); }
      safe(onError || (() => {}), err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }
}
