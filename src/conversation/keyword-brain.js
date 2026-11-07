/**
 * Keyword brain — the free, on-device conversation brain (conversation GDD 3.4–3.6, 3.11, 4.2).
 * Pure: no DOM, no audio. Unit tests: tests/unit/conversation.test.mjs.
 *
 * Usage:
 *   import { createKeywordBrain } from './conversation/keyword-brain.js';
 *   const brain = createKeywordBrain({ data: conversationJson, personas, foods, wardrobe, rng: Math.random });
 *   const reply = await brain.reply('หิวไหม', context);          // typed text, or
 *   const reply = await brain.reply({ alternatives: [{ text, confidence }] }, context);   // recognition
 *   // reply: { intent, confidence, lineId, text, expression, action, needs: {}, followUp, voice, source: 'keyword' }
 *
 * `context` is the TalkContext of GDD 3.11 (charKey, name, stage, needs, expression, room, outfit,
 * likedItemsWorn, xmasItemsVisible, now, awayMinutes, recent, lastHurtAt, sitting, decorCustom).
 * The brain never rejects: anything unexpected resolves to the `unknown` reply.
 * @module conversation/keyword-brain
 */
import { normalize, toneFree, stripTones, codeLength, levenshtein } from './normalize.js';

const DEF_MATCH = { minScore: 0.5, passWeights: [1, 0.85, 0.7], shortKeywordMax: 3, nameWeight: 0.5 };
const STAGE_FALLBACK = { baby: ['baby', 'kid', 'grown'], kid: ['kid', 'grown', 'baby'], grown: ['grown', 'kid', 'baby'] };
const NEED_IDS = ['hunger', 'toilet', 'fun', 'social'];
const DEF_LOW = 0.3, DEF_GOOD = 0.75, AWAY_MIN = 60;

/**
 * Compile the keyword tables once.
 * @param {object} data conversation.json
 * @param {object} personas personas.json
 */
export function compileMatcher(data, personas = {}) {
  const intents = Array.isArray(data?.intents) ? data.intents : [];
  const order = new Map(intents.map((it, i) => [it.id, i]));
  const kws = [];
  for (const it of intents) {
    for (const raw of it.keywords || []) {
      const norm = normalize(raw).text;
      if (!norm) continue;
      kws.push({ intent: it.id, norm, tf: stripTones(norm), len: codeLength(norm), weight: it.weight ?? 1, negated: it.negated || null });
    }
  }
  kws.sort((a, b) => b.len - a.len || order.get(a.intent) - order.get(b.intent));
  const lang = data?.language || {};
  const negators = (lang.negators || ['ไม่ได้', 'ไม่ค่อย', 'ไม่']).map((w) => normalize(w).text).filter(Boolean).sort((a, b) => b.length - a.length);
  const boundaryWords = (lang.boundaryWords || []).map((w) => normalize(w).text).filter(Boolean).sort((a, b) => b.length - a.length);
  const names = Object.entries(personas || {})
    .filter(([, p]) => p && typeof p === 'object' && p.name)
    .map(([key, p]) => ({ key, norm: normalize(p.name).text }));
  return { intents, order, kws, negators, boundaryWords, names, match: { ...DEF_MATCH, ...(data?.tuning?.match || {}) } };
}

/**
 * Score every intent for one piece of text (GDD 3.4, 4.2 S_i before the confidence factor).
 * @param {ReturnType<typeof compileMatcher>} M
 * @param {string} text
 * @param {string} [charKey] current pet (its name counts as call_name)
 * @returns {{ scores: Map<string, number>, otherPet: boolean, named: boolean }}
 */
export function scoreText(M, text, charKey) {
  const n = normalize(text);
  const T = n.text;
  const masked = new Uint8Array(T.length);
  const best = new Map(), distinct = new Map();
  const credit = (intent, value, kw) => {
    if (value > (best.get(intent) || 0)) best.set(intent, value);
    if (!distinct.has(intent)) distinct.set(intent, new Set());
    distinct.get(intent).add(kw);
  };
  const free = (a, b) => { for (let i = a; i < b; i++) if (masked[i]) return false; return true; };
  const mask = (a, b) => { for (let i = a; i < b; i++) masked[i] = 1; };
  const negBefore = (pos) => M.negators.find((ng) => pos >= ng.length && T.slice(pos - ng.length, pos) === ng && free(pos - ng.length, pos)) || null;
  const leftOk = (pos) => pos === 0 || n.bounds.has(pos) || masked[pos - 1] === 1
    || M.boundaryWords.some((w) => pos >= w.length && T.slice(pos - w.length, pos) === w) || !!negBefore(pos);
  const rightOk = (end) => end === T.length || n.bounds.has(end) || masked[end] === 1
    || M.boundaryWords.some((w) => T.startsWith(w, end));
  const short = M.match.shortKeywordMax;
  const [w1, w2, w3] = M.match.passWeights;

  const hit = (kw, a, b, passW) => {
    let intent = kw.intent;
    const ng = negBefore(a);
    if (ng && kw.negated) { intent = kw.negated; mask(a - ng.length, a); }
    mask(a, b);
    credit(intent, kw.weight * passW, kw.norm);
  };

  // Pass 1 (exact) for every keyword, longest first; masks as it goes.
  const done = new Set();
  for (const kw of M.kws) {
    let from = 0, found = false;
    for (;;) {
      const a = T.indexOf(kw.norm, from);
      if (a < 0) break;
      const b = a + kw.norm.length;
      from = a + 1;
      if (!free(a, b)) continue;
      if (kw.len <= short && !(leftOk(a) && rightOk(b))) continue;
      hit(kw, a, b, w1); found = true;
    }
    if (found) done.add(kw);
  }
  // Pass 2 (tone-free), keywords ≥ 4 code points.
  const tf = toneFree(n);
  for (const kw of M.kws) {
    if (done.has(kw) || kw.len < 4 || !kw.tf) continue;
    const a2 = tf.text.indexOf(kw.tf);
    if (a2 < 0) continue;
    const a = tf.map[a2], b = tf.map[a2 + kw.tf.length - 1] + 1;
    if (!free(a, b)) continue;
    hit(kw, a, b, w2); done.add(kw);
  }
  // Pass 3 (near: edit distance ≤ 1), keywords ≥ 5 code points.
  for (const kw of M.kws) {
    if (done.has(kw) || kw.len < 5) continue;
    const L = kw.norm.length;
    outer: for (let len = L - 1; len <= L + 1; len++) {
      for (let a = 0; a + len <= T.length; a++) {
        if (!free(a, a + len)) continue;
        if (levenshtein(T.slice(a, a + len), kw.norm, 1) <= 1) { hit(kw, a, a + len, w3); done.add(kw); break outer; }
      }
    }
  }
  // Names (boundary rule like short keywords).
  let otherPet = false, named = false;
  for (const nm of M.names) {
    let from = 0;
    for (;;) {
      const a = T.indexOf(nm.norm, from);
      if (a < 0) break;
      from = a + 1;
      const b = a + nm.norm.length;
      if (!free(a, b) || !(leftOk(a) && rightOk(b))) continue;
      mask(a, b);
      if (nm.key === charKey) { named = true; credit('call_name', M.match.nameWeight, nm.norm); }
      else otherPet = true;
    }
  }
  const scores = new Map();
  for (const [intent, v] of best) scores.set(intent, v + Math.min(0.3, 0.1 * ((distinct.get(intent)?.size || 1) - 1)));
  return { scores, otherPet, named };
}

/**
 * Pick the intent for a heard input (GDD 4.2).
 * @param {ReturnType<typeof compileMatcher>} M
 * @param {string|{alternatives: {text: string, confidence?: number}[]}} heard
 * @param {string} [charKey]
 * @returns {{ intent: string, score: number, otherPet: boolean, named: boolean }}
 */
export function matchIntent(M, heard, charKey) {
  const alts = typeof heard === 'string' ? [{ text: heard, confidence: 1 }]
    : (heard?.alternatives || []).filter((a) => a && typeof a.text === 'string').slice(0, 3);
  const total = new Map();
  let otherPet = false, named = false;
  for (const alt of alts) {
    const c = Number.isFinite(alt.confidence) && alt.confidence > 0 ? Math.min(1, alt.confidence) : 1;
    const r = scoreText(M, alt.text, charKey);
    otherPet ||= r.otherPet; named ||= r.named;
    for (const [i, s] of r.scores) { const v = s * (0.6 + 0.4 * c); if (v > (total.get(i) || 0)) total.set(i, v); }
  }
  let intent = 'unknown', score = 0;
  for (const [i, s] of total) {
    if (s > score || (s === score && (M.order.get(i) ?? 99) < (M.order.get(intent) ?? 99))) { intent = i; score = s; }
  }
  if (score < M.match.minScore) intent = 'unknown';
  return { intent, score, otherPet, named };
}

/**
 * Evaluate one variant condition from conversation.json (`when`).
 * @param {string} when @param {object} ctx TalkContext @param {object} extra { otherPet, hintNow, firstToday }
 */
export function checkWhen(when, ctx = {}, extra = {}) {
  if (!when) return true;
  const needs = ctx.needs || {};
  const low = ctx.thresholds?.low ?? DEF_LOW, good = ctx.thresholds?.good ?? DEF_GOOD;
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const h = now.getHours(), m = now.getMonth() + 1, d = now.getDate();
  const lowNeed = () => {
    let id = null, v = Infinity;
    for (const k of NEED_IDS) if ((needs[k] ?? 1) < low && needs[k] < v) { v = needs[k]; id = k; }
    return id;
  };
  const outfitCount = Object.values(ctx.outfit || {}).filter(Boolean).length;
  let mt;
  if ((mt = when.match(/^needs\.(\w+)\s*(<|>=)\s*(low|good)$/))) {
    const v = needs[mt[1]] ?? 1, t = mt[3] === 'low' ? low : good;
    return mt[2] === '<' ? v < t : v >= t;
  }
  if ((mt = when.match(/^lowNeed == (\w+)$/))) return lowNeed() === mt[1];
  if ((mt = when.match(/^room == (\w+)$/))) return ctx.room === mt[1];
  if ((mt = when.match(/^month == (\d+)$/))) return m === Number(mt[1]);
  switch (when) {
    case 'likedWorn > 0': return (ctx.likedItemsWorn || []).length > 0;
    case 'outfitCount > 0': return outfitCount > 0;
    case 'xmasItemsVisible > 0': return (ctx.xmasItemsVisible || 0) > 0;
    case 'decorCustom > 0': return (ctx.decorCustom || 0) > 0;
    case 'late': return h >= 20 || h < 5;
    case 'morning': return h >= 5 && h < 11;
    case 'newYearSeason': return (m === 12 && d >= 26) || (m === 1 && d <= 15);
    case 'firstToday': return !!extra.firstToday;
    case 'hurtRecent': return Number.isFinite(ctx.lastHurtAt) && now.getTime() - ctx.lastHurtAt < (extra.sorryMs ?? 120000);
    case 'away': return (ctx.awayMinutes || 0) > AWAY_MIN;
    case 'sadNow': return ['sad', 'grumpy'].includes(ctx.expression) || (needs.social ?? 1) < low;
    case 'onToilet': return !!ctx.sitting && ctx.room === 'bathroom';
    case 'otherPet': return !!extra.otherPet;
    case 'hintNow': return !!extra.hintNow;
    default: return false;
  }
}

/**
 * @param {{ data: object, personas?: object, foods?: object, wardrobe?: object, rng?: () => number }} opts
 */
export function createKeywordBrain({ data, personas = {}, foods = null, wardrobe = null, rng = Math.random } = {}) {
  const M = compileMatcher(data, personas);
  const intentDefs = new Map((data?.intents || []).map((i) => [i.id, i]));
  const special = data?.special || {};
  const responses = data?.responses || {};
  const sorryMs = (data?.tuning?.sorryMakeUpSec ?? 120) * 1000;
  const lastLine = new Map();
  let greetDay = null;

  const foodNames = new Map((foods?.foods || []).map((f) => [f.id, f.name]));
  const itemNames = new Map((wardrobe?.items || []).map((it) => [it.id, it.name]));

  function fill(text, ctx) {
    let ok = true;
    const out = text.replace(/\{(\w+)\}/g, (_, k) => {
      let v = null;
      if (k === 'name') v = ctx.name || personas?.[ctx.charKey]?.name || null;
      else if (k === 'food') {
        const likes = foods?.likes?.[ctx.charKey] || [];
        const pool = likes.map((id) => foodNames.get(id)).filter(Boolean);
        v = pool.length ? pool[Math.floor(rng() * pool.length) % pool.length] : null;
      } else if (k === 'item') {
        const worn = Object.values(ctx.outfit || {}).filter(Boolean).map((id) => itemNames.get(id)).filter(Boolean);
        v = worn[0] || null;
      }
      if (!v) ok = false;
      return v || '';
    });
    return ok ? out : null;
  }

  /** Lines for (table, intent, variant) at the nearest stage. */
  function linesFor(table, intent, variant, stage) {
    const byStage = table?.[intent]?.[variant];
    if (!byStage) return null;
    for (const s of STAGE_FALLBACK[stage] || STAGE_FALLBACK.grown) if (Array.isArray(byStage[s]) && byStage[s].length) return byStage[s];
    return null;
  }

  function pickLine(intent, variants, ctx) {
    const tables = [responses[ctx.charKey], responses._neutral].filter(Boolean);
    for (const table of tables) {
      for (const v of variants) {
        const lines = linesFor(table, intent, v, ctx.stage || 'grown');
        if (!lines) continue;
        const key = `${ctx.charKey}|${intent}|${v}|${ctx.stage}`;
        const filled = lines.map((l) => ({ l, text: typeof l.text === 'string' ? fill(l.text, ctx) : null })).filter((x) => x.text);
        if (!filled.length) continue;
        const last = lastLine.get(key);
        const pool = filled.length > 1 ? filled.filter((x) => x.l.id !== last) : filled;
        const pick = pool[Math.floor(rng() * pool.length) % pool.length];
        lastLine.set(key, pick.l.id);
        return { ...pick.l, text: pick.text };
      }
    }
    return null;
  }

  function variantsFor(intent, ctx, extra) {
    const defs = intentDefs.get(intent)?.variants || special[intent]?.variants || [{ id: 'default' }];
    const list = defs.filter((v) => checkWhen(v.when, ctx, extra)).map((v) => v.id);
    if (!list.includes('default')) list.push('default');
    return list;
  }

  /**
   * @param {string|{alternatives: {text: string, confidence?: number}[]}} heard
   * @param {object} ctx TalkContext
   */
  function replySync(heard, ctx = {}) {
    const now = ctx.now instanceof Date ? ctx.now : new Date();
    const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const recent = ctx.recent || [];
    const m = matchIntent(M, heard ?? '', ctx.charKey);
    const extra = {
      otherPet: m.otherPet,
      hintNow: recent.length > 0 && recent[recent.length - 1].intent === 'unknown',
      firstToday: greetDay !== day,
      sorryMs,
    };
    const intent = m.intent;
    if (intent === 'greeting' || intent === 'good_morning') greetDay = day;
    const line = pickLine(intent, variantsFor(intent, ctx, extra), ctx)
      || pickLine('unknown', variantsFor('unknown', ctx, extra), ctx);
    return {
      intent,
      confidence: Math.max(0, Math.min(1, m.score)),
      lineId: line?.id || null,
      text: line?.text || '…?',
      expression: line?.expression || (intent === 'unknown' ? 'surprised' : 'smile'),
      action: line?.action ?? (intent === 'unknown' ? 'tilt' : null),
      needs: {},
      followUp: line?.followUp || null,
      voice: intent === 'sing' ? 'sing' : 'babble',
      source: 'keyword',
    };
  }

  return {
    id: 'keyword',
    /** @returns {Promise<object>} never rejects */
    reply(heard, ctx) {
      try { return Promise.resolve(replySync(heard, ctx)); }
      catch (e) {
        console.error('[keyword-brain]', e);
        return Promise.resolve({ intent: 'unknown', confidence: 0, lineId: null, text: '…?', expression: 'surprised', action: 'tilt', needs: {}, followUp: null, voice: 'babble', source: 'keyword' });
      }
    },
    replySync,
    /** Silence line for when nothing was heard. */
    silence(ctx = {}) { return pickLine('silence', ['default'], ctx); },
  };
}
