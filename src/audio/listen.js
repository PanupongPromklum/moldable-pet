/**
 * Speech recognition wrapper for talking to the pet (conversation GDD 3.2, 3.9, 3.11). Owner: echo.
 *
 * Usage:
 *   import { createListener } from './audio/listen.js';
 *   const ear = createListener({ lang: 'th-TH', onState(s) {}, onInterim(text) {}, onError(code) {} });
 *   await ear.support();      // 'local' | 'remote' | 'none' — never prompts, safe before a gesture
 *   await ear.listenOnce();   // call inside the mic press → { alternatives: [{ text, confidence }], local } | null
 *   ear.stop();
 *
 * Never starts by itself: `recognition.start()` only runs inside `listenOnce()`, which the game calls
 * from a mic press. Error codes passed to onError: the browser's (`not-allowed`, `no-speech`,
 * `network`, `aborted`, `audio-capture`, `language-not-supported`, `service-not-allowed`) plus
 * `start-timeout` (no start event in `startTimeoutSec`) and `unsupported`.
 * @module audio/listen
 */

/** @returns {Function|null} the SpeechRecognition constructor, if any */
function getSR() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * @param {{ lang?: string, timeoutSec?: number, startTimeoutSec?: number, maxAlternatives?: number,
 *   onState?: (s: string) => void, onInterim?: (text: string) => void, onError?: (code: string) => void }} [opts]
 */
export function createListener(opts = {}) {
  const lang = opts.lang || 'th-TH';
  const timeoutSec = opts.timeoutSec ?? 7;
  const startTimeoutSec = opts.startTimeoutSec ?? 2;
  const maxAlt = opts.maxAlternatives ?? 3;
  let current = null;
  let local = false;

  async function support() {
    const SR = getSR();
    if (!SR) return 'none';
    // Not calling SR.available({ processLocally }) on purpose: in Chromium 2026 builds it crashed
    // the renderer seconds after boot (S5 smoke). Thai on-device packs are not documented anyway,
    // so 'remote' is the honest answer and the privacy notice says so (GDD 3.10).
    local = false;
    return 'remote';
  }

  /** One recognition, single-shot. Resolves null on silence, error or stop. */
  function listenOnce() {
    const SR = getSR();
    if (!SR) { opts.onError?.('unsupported'); return Promise.resolve(null); }
    stop();
    return new Promise((resolve) => {
      let rec;
      try { rec = new SR(); } catch { opts.onError?.('unsupported'); resolve(null); return; }
      current = rec;
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = maxAlt;
      if (local && 'processLocally' in rec) { try { rec.processLocally = true; } catch { /* ignore */ } }
      let finalAlts = null, started = false, settled = false;
      const timers = [];
      const finish = (v) => {
        if (settled) return;
        settled = true;
        timers.forEach(clearTimeout);
        if (current === rec) current = null;
        resolve(v);
      };
      rec.onstart = () => { started = true; opts.onState?.('listening'); };
      rec.onaudiostart = () => opts.onState?.('audiostart');
      rec.onresult = (ev) => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) {
            const alts = [];
            for (let j = 0; j < r.length; j++) if (r[j]?.transcript) alts.push({ text: r[j].transcript, confidence: Number(r[j].confidence) || 0 });
            if (alts.length) finalAlts = alts;
          } else interim += r[0]?.transcript || '';
        }
        if (interim) opts.onInterim?.(interim);
      };
      rec.onerror = (ev) => { opts.onError?.(ev?.error || 'unknown'); };
      rec.onend = () => { opts.onState?.('end'); finish(finalAlts ? { alternatives: finalAlts, local } : null); };
      timers.push(setTimeout(() => {
        if (!started) { opts.onError?.('start-timeout'); try { rec.abort(); } catch { /* ignore */ } finish(null); }
      }, startTimeoutSec * 1000));
      timers.push(setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } }, timeoutSec * 1000));
      try { rec.start(); } catch (e) { opts.onError?.(e?.name === 'NotAllowedError' ? 'not-allowed' : 'unsupported'); finish(null); }
    });
  }

  function stop() {
    const r = current;
    current = null;
    if (r) { try { r.abort(); } catch { /* ignore */ } }
  }

  return { support, listenOnce, stop };
}
