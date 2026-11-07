/**
 * Conversation — pure game-side rules (conversation GDD 3.1, 3.8, 3.9, 3.11, 4.4).
 * The keyword brain, listener and babble are Echo's (`src/conversation/`,
 * `src/audio/listen.js`, `src/audio/babble.js`); this file only holds what the
 * game decides around them: which mode a press uses, how a `Reply` is made safe
 * for the UI, and how much a turn may change the needs.
 * Unit tests: tests/unit/talk.test.mjs.
 * @module game/talk-rules
 */

/** Character contract enums (module-contracts.md › Character). */
export const EXPRESSIONS = Object.freeze(['original', 'smile', 'joy', 'surprised', 'sad', 'wink', 'sleepy', 'grumpy', 'shy', 'hungry', 'eat']);
export const ACTIONS = Object.freeze(['hop', 'shake', 'nod', 'jelly', 'tilt', 'sway', 'chew', 'gulp', 'wiggle', 'shiver', 'yawn']);
export const FOLLOW_UPS = Object.freeze(['kitchen', 'bathroom', 'play', 'wardrobe', 'decor', 'sleep']);
/** Affection intents (GDD 3.8) used when conversation.json has no intent groups. */
export const AFFECTION = Object.freeze(['love', 'praise_cute', 'praise_smart', 'praise_good', 'miss_you', 'comfort', 'outfit', 'room', 'christmas', 'new_year', 'thanks', 'sorry']);
export const MAX_TEXT = 120;
/** In-app browsers that expose the API without it working (GDD 3.9 step 3). */
const IN_APP = /\b(Line|FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|BytedanceWebview)\b/i;

/**
 * Which mode a mic press uses (GDD 3.1 + 3.9 steps 1–5). `support` is the
 * listener's answer ('local' | 'remote' | 'none') or null when no listener loaded.
 * @param {{ setting: 'auto'|'talk'|'echo', session: null|'talk'|'echo', support: string|null,
 *   ua?: string, standalone?: boolean, ios?: boolean, online?: boolean }} o
 * @returns {{ mode: 'talk'|'echo', reason: string }}
 */
export function pickMode({ setting, session, support, ua = '', standalone = false, ios = false, online = true }) {
  if (setting === 'echo') return { mode: 'echo', reason: 'setting' };
  if (session === 'echo') return { mode: 'echo', reason: 'session' };
  if (!support || support === 'none') return { mode: 'echo', reason: 'unsupported' };
  if (ios && standalone) return { mode: 'echo', reason: 'standalone' };
  if (IN_APP.test(ua)) return { mode: 'echo', reason: 'in-app' };
  if (!online && support !== 'local') return { mode: 'echo', reason: 'offline' };
  return { mode: 'talk', reason: support };
}

/**
 * What a recognition error means (GDD 3.9 step 6).
 * @param {string} code
 * @returns {{ fallback: 'none'|'press'|'session', message: 'denied'|'offline'|null, silent: boolean, timeout: boolean }}
 */
export function errorEffect(code) {
  switch (code) {
    case 'not-allowed': case 'service-not-allowed': return { fallback: 'session', message: 'denied', silent: false, timeout: false };
    case 'language-not-supported': case 'start-timeout': case 'unsupported': return { fallback: 'session', message: null, silent: false, timeout: false };
    case 'network': return { fallback: 'press', message: 'offline', silent: false, timeout: false };
    case 'no-speech': return { fallback: 'none', message: null, silent: false, timeout: true };
    case 'aborted': return { fallback: 'none', message: null, silent: true, timeout: false };
    default: return { fallback: 'press', message: null, silent: false, timeout: false };
  }
}

/**
 * Make a brain `Reply` safe for the UI (GDD 3.11): unknown expression →
 * 'original', unknown action → null, text cut to 120 chars, followUp checked,
 * need deltas ignored here (the game computes them, `talkNeeds`).
 * @param {any} r
 */
export function sanitizeReply(r) {
  const o = r && typeof r === 'object' ? r : {};
  const text = typeof o.text === 'string' ? o.text.slice(0, MAX_TEXT) : '';
  return {
    intent: typeof o.intent === 'string' ? o.intent : 'unknown',
    confidence: Number.isFinite(o.confidence) ? Math.max(0, Math.min(1, o.confidence)) : 0,
    lineId: typeof o.lineId === 'string' ? o.lineId : null,
    text,
    expression: EXPRESSIONS.includes(o.expression) ? o.expression : 'original',
    action: ACTIONS.includes(o.action) ? o.action : null,
    followUp: FOLLOW_UPS.includes(o.followUp) ? o.followUp : null,
    voice: o.voice === 'sing' || o.voice === 'clip' ? o.voice : 'babble',
    source: o.source === 'ai' ? 'ai' : 'keyword',
  };
}

/** Intent gain group (GDD 3.8): affection 1.5, default 1, unknown 0.5, mean 0. */
export function intentGain(intent, conv) {
  const g = conv?.tuning?.intentGain || conv?.intentGain || {};
  const groups = Array.isArray(conv?.intents) ? conv.intents : [];
  const def = groups.find((i) => i && i.id === intent);
  let group = def?.group;
  if (!group) group = intent === 'unknown' ? 'unknown' : intent === 'mean' ? 'mean' : AFFECTION.includes(intent) ? 'affection' : 'default';
  const fall = { affection: 1.5, default: 1, unknown: 0.5, mean: 0 };
  const v = g[group] ?? g.default ?? fall[group] ?? 1;
  return Number.isFinite(v) ? v : 1;
}

/**
 * Need deltas for one turn (GDD 4.4), with the rolling per-minute social cap.
 * `history` is mutated: entries older than 60 s are dropped, this turn added.
 * @param {{ intent: string, petGain: number, nowSec: number, history: {t:number, social:number}[],
 *   actions: object, conv?: object }} o
 * @returns {{ social: number, fun: number }}
 */
export function talkNeeds({ intent, petGain, nowSec, history, actions, conv }) {
  const base = Number.isFinite(actions?.talkSocial) ? actions.talkSocial : 0.04;
  const cap = Number.isFinite(actions?.talkSocialCapPerMinute) ? actions.talkSocialCapPerMinute : 0.12;
  const funK = Number.isFinite(actions?.talkFun) ? actions.talkFun : 0.01;
  for (let i = history.length - 1; i >= 0; i--) if (nowSec - history[i].t >= 60) history.splice(i, 1);
  const used = history.reduce((a, h) => a + h.social, 0);
  const raw = base * (Number.isFinite(petGain) ? petGain : 1) * intentGain(intent, conv);
  const social = Math.max(0, Math.min(raw, Math.max(0, cap - used)));
  if (social > 0) history.push({ t: nowSec, social });
  const fun = intent === 'play' || intent === 'joke' || intent === 'sing' ? funK : 0;
  return { social: round6(social), fun };
}
const round6 = (v) => Math.round(v * 1e6) / 1e6;

/** A turn "understood" for growth (GDD 3.8: any intent but unknown / mean → talk care event). */
export const understood = (intent) => intent !== 'unknown' && intent !== 'mean';

/** Silence line for a character (`conversation.json lines_silence`, else persona `silence`, else "…?"). */
export function silenceLines(conv, persona, key) {
  const a = conv?.lines_silence?.[key];
  if (Array.isArray(a) && a.length) return a;
  const p = persona?.lines?.silence;
  if (Array.isArray(p) && p.length) return p;
  return ['…?'];
}
