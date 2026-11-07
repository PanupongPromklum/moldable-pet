/**
 * Conversation wiring — one talk turn per mic press, typed chat, and the
 * talk-back (`echo`) fallback (conversation GDD 3.1, 3.2, 3.6, 3.8–3.11).
 *
 * Echo's modules (`audio/listen.js` createListener, `audio/babble.js`
 * createBabble, `conversation/keyword-brain.js` createKeywordBrain) are loaded
 * lazily and feature-detected: when any is missing the mic simply runs today's
 * talk-back, so nothing breaks while they land. `recognition.start()` and
 * `getUserMedia()` only ever run inside a mic press (A11).
 *
 * Privacy (GDD 3.10): the transcript lives in memory for one turn, shows as a
 * caption, and is dropped. Only `settings.talkMode` / `talkNoticeSeen` are saved.
 * @module game/talk
 */
import { pickMode, errorEffect, sanitizeReply, talkNeeds, understood, silenceLines } from './talk-rules.js';

/** Thai copy (GDD 3.9). */
const MSG = {
  denied: 'เปิดไมค์และ Siri/การป้อนตามคำบอกก่อน หรือใช้พูดตามแทน',
  offline: 'ต้องต่อเน็ตเพื่อคุยกันนะ ตอนนี้ใช้พูดตามก่อน',
  inApp: 'เปิดใน Safari/Chrome เพื่อคุยกับน้องได้',
  micFail: 'เปิดไมค์ไม่ได้ในเบราว์เซอร์นี้',
  micDenied: 'ยังไม่ได้อนุญาตให้ใช้ไมค์ ลองอนุญาตที่แถบที่อยู่ของเบราว์เซอร์',
};
/** Defaults for conversation.json keys while it is missing (GDD 7.1). */
const DEF = { captionSec: 2, thinkingShowSec: 0.6, hintAfterMisses: 2, brainTimeoutSec: 5, startTimeoutSec: 2, followUpPulseSec: 3, bubbleMs: 2600 };

/**
 * @param {{
 *   hud: object, game: object, mood: object, sfx: object, talkback: object,
 *   getPet: () => object|null, personas: object, actions: object,
 *   getConv: () => object|null, getContext: () => object, getVoice: () => ({ stage: string }),
 *   getTime: () => number, onCare?: (ev: string) => void, onNeedsChanged?: () => void,
 *   unlock?: () => void, canTalk?: () => boolean,
 *   modules?: () => Promise<{ createListener?: Function, createBabble?: Function, createKeywordBrain?: Function }>,
 *   env?: { ua?: string, standalone?: boolean, ios?: boolean, online?: () => boolean },
 * }} deps
 */
export function createTalk(deps) {
  const { hud, game, mood, sfx, talkback, getPet, personas, actions } = deps;
  const env = deps.env || {
    ua: navigator.userAgent || '',
    ios: /iP(hone|ad|od)/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    standalone: !!navigator.standalone || matchMedia('(display-mode: standalone)').matches,
    online: () => navigator.onLine !== false,
  };
  let mods = null, modsP = null, ear = null, babble = null, brain = null, support = null;
  let session = null;               // 'talk' | 'echo' for this page session (GDD 3.9 step 7)
  let busy = false, turnId = 0, misses = 0;
  const history = [];               // social given per turn (rolling cap)
  const recent = [];                // { intent, at } for the brain context
  let lastHurtAt = null, deniedShown = false, inAppShown = false, voiceT = 0;
  const conv = () => deps.getConv?.() || null;
  /** A tuning knob: conversation.json `tuning.ui|listen|<root>` (GDD 7.1), else the default. */
  const ui = (k) => { const c = conv(); const t = c?.tuning || c || {}; return t.ui?.[k] ?? t.listen?.[k] ?? t[k] ?? DEF[k]; };

  /** Load Echo's modules once; each may be missing. */
  function load() {
    if (modsP) return modsP;
    const imp = deps.modules || (async () => {
      const [l, b, k] = await Promise.all([
        import('../audio/listen.js').catch(() => null),
        import('../audio/babble.js').catch(() => null),
        import('../conversation/keyword-brain.js').catch(() => null),
      ]);
      return { createListener: l?.createListener, createBabble: b?.createBabble, createKeywordBrain: k?.createKeywordBrain };
    });
    modsP = imp().then((m) => { mods = m || {}; return mods; }).catch(() => { mods = {}; return mods; });
    return modsP;
  }

  function getBrain() {
    if (brain || !mods?.createKeywordBrain || !conv()) return brain;
    try {
      brain = mods.createKeywordBrain({ data: conv(), personas, foods: deps.foods || null, wardrobe: deps.wardrobe || null, rng: Math.random });
    } catch (e) { console.error('[talk] brain', e); brain = null; }
    return brain;
  }
  function getBabble() {
    if (babble || !mods?.createBabble) return babble;
    try { babble = mods.createBabble({ tuning: conv()?.tuning || {} }); } catch (e) { console.error('[talk] babble', e); babble = null; }
    return babble;
  }
  function getEar() {
    if (ear || !mods?.createListener) return ear;
    try {
      ear = mods.createListener({
        lang: conv()?.lang || 'th-TH',
        timeoutSec: conv()?.tuning?.listen?.timeoutSec, startTimeoutSec: conv()?.tuning?.listen?.startTimeoutSec, maxAlternatives: conv()?.tuning?.listen?.maxAlternatives,
        onState(s) { started = true; if (s === 'listening' || s === 'start' || s === 'audiostart') hud.setMic('listening'); },
        onInterim(text) { if (busy && text) hud.caption?.(text, 0); },
        onError(code) { lastError = code; },
      });
    } catch (e) { console.error('[talk] listener', e); ear = null; }
    return ear;
  }
  let started = false, lastError = null;

  async function resolveSupport() {
    if (support !== null) return support;
    await load();
    const e = getEar();
    if (!e || !getBrain()) { support = 'none'; return support; }
    try { support = (await e.support()) || 'none'; } catch { support = 'none'; }
    return support;
  }

  /** The mode the next press uses (async: first press checks support). */
  async function modeNow() {
    const s = await resolveSupport();
    return pickMode({ setting: game.settings.talkMode, session, support: s, ua: env.ua, standalone: env.standalone, ios: env.ios, online: env.online() });
  }

  // ---- echo (talk-back, unchanged) ----
  async function echoToggle() {
    try {
      if (talkback.isOn()) talkback.stop();
      else await talkback.start();
    } catch (e) {
      console.warn('talkback', e);
      hud.setMic('off');
      hud.toast(e && e.name === 'NotAllowedError' ? MSG.micDenied : MSG.micFail, 3200);
    }
  }

  // ---- reply ----
  function caption(text) {
    const sec = ui('captionSec');
    if (sec > 0 && text) hud.caption?.(text, sec * 1000);
  }

  /**
   * Apply a reply to the pet and needs (GDD 3.2 step 5).
   * @param {any} raw Reply from the brain @param {string} heardText for the caption
   */
  function applyReply(raw, heardText) {
    const r = sanitizeReply(raw);
    const pet = getPet();
    const now = deps.getTime();
    mood.touch?.(now);
    mood.react?.(r.expression, 2.2);
    if (r.action && pet && !pet.isBusy?.()) pet.play(r.action);
    if (r.text) hud.say(r.text, Math.max(DEF.bubbleMs, r.text.length * 90));
    caption(heardText);
    // needs: the game computes and caps (GDD 4.4); brain deltas are never trusted
    const d = talkNeeds({ intent: r.intent, petGain: personas[game.selected]?.petGain ?? 1, nowSec: now, history, actions, conv: conv() });
    if (d.social) game.bump('social', d.social);
    if (d.fun) game.bump('fun', d.fun);
    if (d.social || d.fun) deps.onNeedsChanged?.();
    // growth: one conversation message = one `talk` care event (growth GDD 3.4), mean ones excluded
    if (r.intent !== 'mean') deps.onCare?.('talk');
    deps.onIntent?.(r.intent, understood(r.intent));
    if (r.intent === 'mean') lastHurtAt = Date.now();
    recent.push({ intent: r.intent, at: Date.now() }); if (recent.length > 6) recent.shift();
    // hints after misses (E7)
    if (r.intent === 'unknown') { misses++; if (misses >= ui('hintAfterMisses')) { hud.showTalkHints?.(hintsFor()); } }
    else { misses = 0; hud.showTalkHints?.([]); }
    if (r.followUp) hud.pulseFollowUp?.(r.followUp, ui('followUpPulseSec') * 1000);
    speak(r);
    return r;
  }

  function hintsFor() {
    const h = conv()?.hints || {};
    const n = game.needs() || {};
    const low = (id) => { const t = deps.needsData?.needs?.[id]?.low ?? 0.3; return (n[id] ?? 1) < t; };
    if (low('hunger') && h.hungry) return h.hungry.slice(0, 3);
    if (low('toilet') && h.toilet) return h.toilet.slice(0, 3);
    if (low('fun') && h.fun) return h.fun.slice(0, 3);
    return (h.default || ['สวัสดี', 'หิวไหม', 'น่ารักจัง']).slice(0, 3);
  }

  /** Babble voice, envelope → mouth (GDD 3.7). Sound off → silent, the bubble carries it. */
  function speak(r) {
    const pet = getPet();
    const b = getBabble();
    if (!b || !r.text) return 0;
    mood.hold?.('talk', true);
    let dur = 0;
    try {
      dur = b.say(r.text, { charKey: game.selected, stage: deps.getVoice().stage, seed: r.lineId || r.text, kind: r.voice === 'sing' ? 'sing' : 'talk', onLevel: (l) => getPet()?.setTalkLevel?.(l) }) || 0;
    } catch (e) { console.error('[talk] babble', e); }
    const id = ++voiceT;
    setTimeout(() => { if (id !== voiceT) return; pet?.setTalkLevel?.(0); mood.hold?.('talk', false); }, Math.max(300, dur * 1000 + 120));
    return dur;
  }

  /** Brain call with the slow-brain thinking beat and the keyword fallback (GDD 3.2 step 4, 3.11). */
  async function think(heard) {
    const b = getBrain();
    if (!b) return null;
    const ctx = context();
    let slowT = setTimeout(() => { hud.setMic('thinking'); mood.react?.('surprised', 0.8); }, ui('thinkingShowSec') * 1000);
    try {
      const timeout = new Promise((res) => setTimeout(() => res(null), ui('brainTimeoutSec') * 1000));
      const r = await Promise.race([Promise.resolve(b.reply(heard, ctx)).catch(() => null), timeout]);
      return r || { intent: 'unknown', text: '', expression: 'surprised', action: 'tilt' };
    } finally { clearTimeout(slowT); slowT = null; }
  }

  function context() {
    const base = deps.getContext?.() || {};
    return { ...base, recent: recent.slice(), lastHurtAt };
  }

  /** One talk turn (GDD 3.2). */
  async function turn() {
    const id = ++turnId;
    busy = true; started = false; lastError = null;
    const pet = getPet();
    hud.setMic('listening');
    pet?.lookAt?.(null);
    if (pet && !pet.isBusy?.()) pet.play('tilt');
    mood.react?.('original', 1);
    const e = getEar();
    let heard = null;
    // dead API (Edge): no start event within startTimeoutSec → unsupported for the session
    const deadT = setTimeout(() => { if (!started && busy && id === turnId) { lastError = 'start-timeout'; try { e.stop(); } catch { /* */ } } }, ui('startTimeoutSec') * 1000);
    try { heard = await e.listenOnce(); } catch (err) { lastError = lastError || err?.error || err?.code || err?.name || 'unknown'; }
    clearTimeout(deadT);
    if (id !== turnId) return;   // cancelled (character switch, E11)
    if (lastError && !heard) {
      const fx = errorEffect(lastError === 'NotAllowedError' ? 'not-allowed' : lastError);
      if (fx.silent) { end(); return; }
      if (!fx.timeout) {
        if (fx.fallback === 'session') session = 'echo';
        if (fx.message === 'denied') { if (!deniedShown) { deniedShown = true; hud.toast(MSG.denied, 4200); } end(); return; }   // no retry loop (E19)
        if (fx.message === 'offline') hud.toast(MSG.offline, 3200);
        end();
        if (fx.fallback !== 'none') await echoToggle();
        return;
      }
    }
    if (!heard || (typeof heard === 'object' && !(heard.alternatives || []).some((a) => a?.text))) {
      // silence (GDD 3.2 step 3): persona silence line, no need change
      const lines = silenceLines(conv(), personas[game.selected], game.selected);
      hud.say(lines[Math.floor(Math.random() * lines.length)], DEF.bubbleMs);
      end(); return;
    }
    session = 'talk';
    const text = typeof heard === 'string' ? heard : heard.alternatives.find((a) => a?.text)?.text || '';
    const reply = await think(heard);
    if (id !== turnId) return;
    end();
    try { sfx.unlock?.(); } catch { /* E16: resume audio after recognition, before babble */ }
    if (reply) applyReply(reply, text);
  }
  function end() { busy = false; hud.setMic('off'); }

  const api = {
    /** Mic button (GDD 3.1). */
    async press() {
      deps.unlock?.();
      if (deps.canTalk && !deps.canTalk()) return;
      if (busy) return;   // one turn at a time (E8)
      if (talkback.isOn()) { await echoToggle(); return; }
      const m = await modeNow();
      if (m.reason === 'in-app' && !inAppShown) { inAppShown = true; hud.toast(MSG.inApp, 3600); }
      if (m.mode === 'echo') { await echoToggle(); return; }
      if (!game.settings.talkNoticeSeen && hud.showTalkNotice) {
        hud.showTalkNotice({ name: personas[game.selected]?.name || '', local: support === 'local' });
        return;   // the notice buttons continue the turn inside their own tap
      }
      await turn();
    },
    /** Notice "คุยเลย". */
    async noticeOk() { game.setSetting('talkNoticeSeen', true); game.persist(); hud.hideTalkNotice?.(); await turn(); },
    /** Notice "ใช้พูดตามแทน": saves echo and starts talk-back (A12). */
    async noticeEcho() { game.setSetting('talkNoticeSeen', true); game.setSetting('talkMode', 'echo'); game.persist(); hud.hideTalkNotice?.(); await echoToggle(); },
    /** Long press: the mode sheet (GDD 3.1). */
    openSheet() { hud.showMicSheet?.({ mode: game.settings.talkMode === 'echo' ? 'echo' : 'talk' }); },
    /** Sheet choice 'talk' | 'echo' | 'auto'. */
    setMode(mode) {
      game.setSetting('talkMode', mode);
      if (mode === 'talk') session = null;   // an explicit choice gets one more try after a failure
      if (mode === 'echo') api.cancel();
      game.persist(); hud.hideMicSheet?.();
    },
    /** Load Echo's modules and check support early (no prompt, no start), so the first press stays inside its gesture. */
    preload() { return resolveSupport().catch(() => 'none'); },
    /** Keyboard button: the typed chat box (typed chat = same brain, GDD 3.11 free alternative). */
    async openTypeBox() { await load(); hud.showTypeBox?.(); },
    /**
     * Typed chat → same brain and reply path. Falls back to a persona line when
     * the brain has not landed yet.
     * @param {string} text @returns {Promise<object|null>} sanitised reply
     */
    async typed(text) {
      const t = String(text || '').trim().slice(0, 200);
      if (!t || busy) return null;
      deps.unlock?.();
      await load();
      busy = true;
      try {
        const r = getBrain() ? await think(t) : null;
        end();
        if (r) return applyReply(r, t);
        mood.say?.('pet', true);
        deps.onCare?.('talk');
        return null;
      } finally { busy = false; }
    },
    /** Typed chat is usable (keyword brain + data loaded). */
    get canType() { return !!getBrain(); },
    /** Cancel a running turn (character switch, minigame start). */
    cancel() { if (!busy) return; turnId++; busy = false; try { ear?.stop(); } catch { /* */ } hud.setMic('off'); },
    get busy() { return busy; },
    /** Debug: effective mode for the next press. */
    modeNow,
    /** Debug snapshot. */
    get state() { return { session, support, busy, misses, history: history.slice(), modules: mods ? Object.keys(mods).filter((k) => mods[k]) : null }; },
  };
  return api;
}
