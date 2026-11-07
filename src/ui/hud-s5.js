/**
 * Moldable Pet — Sprint 5 HUD pieces (owner: glaze). Story S5-05.
 *
 * Implements "Sprint 5 additions → HUD — glaze" in docs/architecture/module-contracts.md.
 * createHUD (hud.js) installs this module and merges its methods into the HUD API, so wire
 * still talks to one `hud` object. Display only: nothing here changes game state.
 *
 * Specs: design/gdd/growth-personality.md 3.3, 3.5, 3.6, 3.8 · design/gdd/minigames-2.md 3.1–3.5 ·
 * design/gdd/conversation.md 3.1, 3.2, 3.6, 3.9, 3.10.
 *
 * ── API (all on `hud`) ─────────────────────────────────────────────────────────
 * Growth    showGrowthCard({ kind:'stage'|'trait'|'drift', name, stageLabel, traitLabel, because, line? })
 *           hideGrowthCard()                        → handler onGrowthCardClose() when the player closes it
 *           setCharacter({ key, name, stage, stageLabel, progress })   chip avatar gets a growth ring
 *           showSelect(chars)  chars[i] += { stage, stageLabel, progress 0..1, hint, traitLabel? }
 * Picker    showMinigamePicker({ games:[{ id, title, howTo, best, controls, favorite, last, icon? }], charName })
 *           hideMinigamePicker()                    → onMinigamePick(id); onMinigamePickerClose() (X / Escape)
 * Result    showMinigameResult({ score, best, coins, headline? })  "เกมอื่น" → onMinigameOther() when given
 * Game HUD  startMinigame({ id, title, durationSec, countdown?, control?, hint? })
 *           updateMinigame({ …, round, slips, slipsMax?, sequence:{ length, done, phase:'watch'|'repeat' },
 *                            call:{ color, label, pattern?, warn? } | null })
 * Pads      showMimicPads([{ id, label, icon, color? }]) · flashMimicPad(id, 'demo'|'ok'|'wrong'|'hint', ms?)
 *           setMimicPadsEnabled(bool) · hideMimicPads()            → onMimicPad(id)  (tap, click, keys 1–6, ←↑→↓)
 * Talk      setMic('thinking') · caption(textOrNull, ms?) · showTalkHints(hints[] | null)
 *           showTalkNotice({ name?, local? }) · hideTalkNotice()   → onTalkNoticeOk(), onTalkNoticeEcho(),
 *                                                                       onTalkNoticeClose() (Escape, optional)
 *           mic long-press / right-click / context-menu key → onMicLongPress() if given, else the HUD opens
 *           showMicSheet({ mode }) itself · showMicSheet({ mode:'talk'|'echo', available? }) · hideMicSheet()
 *                                                                    → onTalkMode('talk'|'echo')
 *           setTalkMode('talk'|'echo')              optional: mic label/aria say "คุย" or "พูดตาม"
 *           showTypeBox() · hideTypeBox()           → onTypeSend(text), onTypeClose() (optional)
 *           The keyboard button beside the mic shows when handlers.onTypeSend is given and opens the box.
 *           pulseFollowUp(id)  'kitchen'|'bathroom'|'play'|'wardrobe'|'decor'|'sleep' — 3 s soft pulse
 *
 * @module ui/hud-s5
 */
import { icon, filledIcon, patternGlyph, FILLED_INKS } from './icons.js';

/** Thai copy for the S5 pieces; merged into HUD_STRINGS (override with options.strings). */
export const HUD_S5_STRINGS = {
  growth: {
    stageTitle: (n) => `${n}โตขึ้นแล้ว!`,
    traitTitle: (n, t) => `${n}โตเป็น${n}${t}!`,
    driftTitle: (n, t) => `ช่วงนี้${n}${t}ขึ้นนะ`,
    ok: 'เย้!',
    okDrift: 'ดีจัง',
    close: 'ปิดการ์ด',
    near: 'อีกนิดจะโตแล้ว!',
    grown: 'โตเต็มที่แล้ว',
    words: ['เพิ่งเริ่มโต', 'โตไปครึ่งทาง', 'ใกล้จะโตแล้ว', 'อีกนิดจะโตแล้ว'],
    chipAria: (n, stage, words) => `เปลี่ยนตัวละคร ตอนนี้คือ${n} ${stage} ${words}`.trim(),
  },
  picker: {
    title: 'เล่นอะไรดี',
    close: 'ปิดเลือกเกม',
    group: 'มินิเกม',
    best: 'สถิติ',
    noBest: 'ยังไม่เคยเล่น',
    fav: (n) => `${n}ชอบ`,
    last: 'เล่นล่าสุด',
    controls: { touch: 'นิ้ว / เมาส์', head: 'เอียงหัว' },
    aria: (g) => [g.title, g.howTo, g.bestText, g.ctlText, g.favText, g.lastText].filter(Boolean).join(' · '),
  },
  result: { other: 'เกมอื่น', close: 'กลับห้อง' },
  intro: { relaxed: 'โหมดสบายๆ', relaxedHint: 'ช้าลง ใจเย็นๆ' },
  hints: {
    snackRain: null,   // the S3 copy in HUD_STRINGS.game is used
    mimic: { touch: 'ดูท่าของเพื่อน แล้วกดปุ่มตามให้ครบ', mouse: 'ดูท่าของเพื่อน แล้วคลิกหรือกดเลข 1–6 ตาม' },
    bubbles: { touch: 'แตะฟองสีที่เพื่อนเรียก', mouse: 'คลิกฟองสีที่เรียก หรือพาดาวด้วยลูกศร', head: 'เอียงหัวพาดาวไปชนฟองสีที่เรียก' },
    hop: { touch: 'แตะตรงไหนก็ได้เพื่อกระโดด', mouse: 'คลิกหรือกด Space เพื่อกระโดด', head: 'สะบัดหัวเพื่อกระโดด' },
  },
  game5: {
    round: (n) => `${n} ท่า`,
    roundAria: (n) => `ลำดับนี้ยาว ${n} ท่า`,
    slips: 'โอกาส',
    slipsAria: (left, max) => `เหลือโอกาส ${left} จาก ${max}`,
    watch: 'ดูนะ…',
    repeat: 'ถึงตาเธอแล้ว',
    seqAria: (done, len) => `กดแล้ว ${done} จาก ${len} ท่า`,
    call: (l) => `ฟองสี${l}`,
    callWarn: 'เปลี่ยนสี!',
    padsGroup: 'ท่าทาง',
    padOk: 'ถูก',
    padWrong: 'อุ๊ย',
  },
  talk: {
    thinking: 'กำลังคิด…',
    offTalk: { label: 'แตะเพื่อคุย', aria: (n) => `คุยกับ${n}` },
    offEcho: { label: 'แตะให้พูดตาม', aria: (n) => `ให้${n}พูดตามเสียงเธอ` },
    longPress: 'กดค้างเพื่อเลือกวิธีคุย',
    hintsLead: 'ลองพูดว่า',
    heard: 'ได้ยินว่า',
    noticeTitle: (n) => `คุยกับ${n}`,
    noticeRemote: 'เบราว์เซอร์จะส่งเสียงพูดของคุณไปแปลงเป็นข้อความที่ระบบของ Google หรือ Apple เกมไม่เก็บเสียงและข้อความไว้เลย',
    noticeLocal: 'เสียงของคุณแปลงเป็นข้อความบนเครื่องนี้ ไม่ถูกส่งออกไปไหน',
    noticeOk: 'คุยเลย',
    noticeEcho: 'ใช้พูดตามแทน',
    sheetTitle: (n) => `เลือกวิธีคุยกับ${n}`,
    sheetClose: 'ปิด',
    modes: {
      talk: { label: 'คุยกัน', hint: (n) => `พูดกับ${n} แล้ว${n}ตอบ` },
      echo: { label: 'พูดตาม', hint: (n) => `${n}พูดตามเสียงเธอ อยู่บนเครื่องนี้` },
    },
    unavailable: 'เบราว์เซอร์นี้ยังคุยกันไม่ได้',
    typeBtn: 'พิมพ์คุย',
    typePlaceholder: (n) => `พิมพ์คุยกับ${n}…`,
    typeLabel: (n) => `ข้อความถึง${n}`,
    typeSend: 'ส่ง',
    typeClose: 'ปิดช่องพิมพ์',
  },
};

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('en-US');

/** Game id → filled card icon. */
export const GAME_ICONS = { snackRain: 'snackRain', mimic: 'mimic', bubbles: 'bubbles', hop: 'hop' };

/** Need/feature followUp ids (conversation GDD 3.6). */
export const FOLLOW_UP_IDS = ['kitchen', 'bathroom', 'play', 'wardrobe', 'decor', 'sleep'];

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable, no DOM)
// ---------------------------------------------------------------------------

/**
 * Words for the growth progress (the GDD shows no minutes). Pure.
 * @param {number} progress 0..1 to the next stage
 * @param {string} [stage] 'baby' | 'kid' | 'grown'
 * @param {object} [S] HUD_S5_STRINGS.growth
 * @returns {string}
 */
export function growthWords(progress, stage, S = HUD_S5_STRINGS.growth) {
  if (stage === 'grown') return S.grown;
  const p = clamp01(progress);
  if (p >= 0.85) return S.words[3];
  if (p >= 0.6) return S.words[2];
  if (p >= 0.3) return S.words[1];
  return S.words[0];
}

/**
 * Hint line on a character card (growth GDD 3.6): "อีกนิดจะโตแล้ว!" from 85 % before grown,
 * otherwise wire's trait hint (kid stage), nothing for a baby without a hint. Pure.
 * @param {{stage?:string, progress?:number, hint?:string}} c
 * @param {object} [S] HUD_S5_STRINGS.growth
 * @returns {string}
 */
export function selectHint(c, S = HUD_S5_STRINGS.growth) {
  if (!c || !c.stage) return c && c.hint ? String(c.hint) : '';
  if (c.stage !== 'grown' && clamp01(c.progress) >= 0.85) return S.near;
  return c.hint ? String(c.hint) : '';
}

/**
 * Growth card copy. Pure.
 * @param {{kind?:string, name?:string, stageLabel?:string, traitLabel?:string, because?:string, line?:string}} d
 * @param {object} [S] HUD_S5_STRINGS.growth
 * @returns {{kind:string, title:string, pills:string[], line:string, button:string}}
 */
export function growthCardText(d = {}, S = HUD_S5_STRINGS.growth) {
  const kind = ['stage', 'trait', 'drift'].includes(d.kind) ? d.kind : 'stage';
  const n = d.name || '';
  const t = d.traitLabel || '';
  const line = String(d.line ?? d.because ?? '');
  if (kind === 'trait') return { kind, title: S.traitTitle(n, t), pills: [d.stageLabel, t].filter(Boolean), line, button: S.ok };
  if (kind === 'drift') return { kind, title: S.driftTitle(n, t), pills: t ? [t] : [], line, button: S.okDrift };
  return { kind, title: S.stageTitle(n), pills: d.stageLabel ? [d.stageLabel] : [], line, button: S.ok };
}

/**
 * Grid columns for the mimic pads: one row up to 4, then 3 × 2 (6 pads). Pure.
 * @param {number} n pad count
 * @returns {number}
 */
export function padColumns(n) {
  const k = Math.max(1, Math.floor(Number(n) || 0));
  return k <= 4 ? k : 3;
}

/**
 * Mimic keyboard: '1'..'6' → 0..5, and ← ↑ → ↓ → 0..3 (minigames GDD 3.2 rule 7). Pure.
 * @param {string} key KeyboardEvent.key
 * @param {number} n pads on screen
 * @returns {number} index or -1
 */
export function mimicKeyIndex(key, n) {
  const arrows = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 };
  let i = -1;
  if (/^[1-9]$/.test(key)) i = Number(key) - 1;
  else if (key in arrows) i = arrows[key];
  return i >= 0 && i < n ? i : -1;
}

/**
 * Should Enter in the type box send? Never while an IME (Thai) is composing: the Enter that
 * commits a composition must not send. Pure.
 * @param {{key:string, isComposing?:boolean, keyCode?:number, shiftKey?:boolean}} ev
 * @param {boolean} composing the box's own compositionstart/end flag
 * @returns {boolean}
 */
export function shouldSendOnEnter(ev, composing) {
  if (!ev || ev.key !== 'Enter') return false;
  if (composing || ev.isComposing || ev.keyCode === 229) return false;
  return !ev.shiftKey;
}

/**
 * Clean typed text before it goes to wire: trim, collapse whitespace, cap length. Pure.
 * @param {string} text
 * @param {number} [max=80]
 * @returns {string} '' when nothing is left
 */
export function cleanTyped(text, max = 80) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Which HUD control a reply's followUp should pulse (never moves the player). Pure.
 * @param {string} id 'kitchen'|'bathroom'|'play'|'wardrobe'|'decor'|'sleep'
 * @param {string} room current room
 * @param {string[]} [rooms] swipe order
 * @returns {{kind:'room', room:string, dir:-1|1}|{kind:'ctx'|'ward'|'decor'|'lamp'}|null}
 */
export function followUpTarget(id, room, rooms = ['living', 'kitchen', 'bathroom']) {
  const toRoom = (r) => {
    const a = rooms.indexOf(room); const b = rooms.indexOf(r);
    if (a < 0 || b < 0) return null;
    const n = rooms.length;
    const fwd = (b - a + n) % n;
    return { kind: 'room', room: r, dir: fwd <= n - fwd ? 1 : -1 };
  };
  switch (id) {
    case 'kitchen': return room === 'kitchen' ? { kind: 'ctx' } : toRoom('kitchen');
    case 'bathroom': return room === 'bathroom' ? null : toRoom('bathroom');
    case 'play': return room === 'living' ? { kind: 'ctx' } : toRoom('living');
    case 'wardrobe': return room === 'living' ? { kind: 'ward' } : toRoom('living');
    case 'decor': return { kind: 'decor' };
    case 'sleep': return { kind: 'lamp' };
    default: return null;
  }
}

/**
 * Picker card that gets the first keyboard focus: the last-played game, else the first. Pure.
 * @param {{id:string, last?:boolean}[]} games
 * @returns {string|null}
 */
export function pickerFocusId(games) {
  const list = (games || []).filter((g) => g && g.id);
  const last = list.find((g) => g.last);
  return (last || list[0] || {}).id || null;
}

/**
 * Picker card neighbour for arrow keys in the 2-column grid. Pure.
 * @param {number} i current index
 * @param {string} key ArrowLeft/Right/Up/Down, Home, End
 * @param {number} n cards
 * @param {number} [cols=2]
 * @returns {number}
 */
export function gridMove(i, key, n, cols = 2) {
  const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[key];
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  if (d === undefined) return i;
  const j = i + d;
  return j >= 0 && j < n ? j : i;
}

// ---------------------------------------------------------------------------
// DOM part
// ---------------------------------------------------------------------------

/**
 * Install the S5 pieces into a HUD created by createHUD. Internal: hud.js calls it.
 * @param {object} ctx { root, el, state, S, call, handlers, api, reducedMotion, finePointer, portrait,
 *                     coinDot, bump, measure, placeToast, gameHintText }
 * @returns {{api:object, hooks:object}} methods for the public API + hooks hud.js calls
 */
export function installS5(ctx) {
  const { root, el, state, S, call, handlers, reducedMotion, finePointer } = ctx;
  const T = S.talk; const G = S.growth;
  const has = (name) => typeof handlers[name] === 'function';
  const s5 = state.s5 = {
    talkMode: 'talk', picker: null, growth: null, notice: null, micSheet: null, type: null,
    pads: null, padTimers: new Map(), caption: { on: false, w: 0, h: 0, timer: 0 }, hints: null,
    follow: [], press: { timer: 0, long: false, x: 0, y: 0 }, game: null, lastComposeEnd: 0,
  };

  // ---------- extra DOM ----------
  el.micWrap = root.querySelector('.mp-mic-wrap');
  el.micWrap.insertAdjacentHTML('beforeend', `
    <button type="button" class="mp-iconbtn mp-typebtn mp-tip" data-tip="${esc(T.typeBtn)}" aria-label="${esc(T.typeBtn)}" hidden>${filledIcon('keyboard', 28)}</button>`);
  el.typeBtn = el.micWrap.querySelector('.mp-typebtn');
  el.typeBtn.hidden = !has('onTypeSend');

  el.bottom.insertAdjacentHTML('afterbegin', `<div class="mp-hints" aria-live="polite" hidden></div>`);
  el.hints = el.bottom.querySelector('.mp-hints');

  root.insertAdjacentHTML('beforeend', `
    <div class="mp-caption" aria-live="polite" hidden><span class="mp-caption-ico" aria-hidden="true">${icon('mic', 14)}</span><span class="mp-caption-text"></span></div>
    <section class="mp-ward mp-picker" role="dialog" aria-modal="false" hidden></section>
    <section class="mp-ward mp-micsheet" role="dialog" aria-modal="false" hidden></section>
    <section class="mp-card5 mp-growth" role="dialog" aria-modal="false" hidden></section>
    <section class="mp-card5 mp-notice" role="dialog" aria-modal="true" hidden></section>
    <section class="mp-typebox" role="dialog" aria-modal="false" hidden></section>`);
  el.caption = root.querySelector('.mp-caption');
  el.captionText = root.querySelector('.mp-caption-text');
  el.picker = root.querySelector('.mp-picker');
  el.micSheet = root.querySelector('.mp-micsheet');
  el.growth = root.querySelector('.mp-growth');
  el.notice = root.querySelector('.mp-notice');
  el.typeBox = root.querySelector('.mp-typebox');

  // Game layer: colour-call chip + mimic round/slips in the sub row, pads at the bottom.
  const sub = root.querySelector('.mp-game-sub');
  sub.insertAdjacentHTML('afterbegin', `
    <span class="mp-game-call" hidden><span class="mp-call-sw" aria-hidden="true"></span><span class="mp-call-text"></span><span class="mp-call-warn" hidden></span></span>
    <span class="mp-game-round" hidden>${filledIcon('mimic', 20)}<span class="mp-num"></span></span>
    <span class="mp-game-slips" hidden><span class="mp-slips-l"></span><span class="mp-slips-dots" aria-hidden="true"></span></span>`);
  el.call = sub.querySelector('.mp-game-call'); el.callSw = sub.querySelector('.mp-call-sw');
  el.callText = sub.querySelector('.mp-call-text'); el.callWarn = sub.querySelector('.mp-call-warn');
  el.round = sub.querySelector('.mp-game-round'); el.slips = sub.querySelector('.mp-game-slips');
  el.gameCol.insertAdjacentHTML('beforeend', `<div class="mp-pads" hidden></div>`);
  el.pads = el.gameCol.querySelector('.mp-pads');
  // Keep the result / intro cards above the pads.
  el.gameCol.appendChild(el.result); el.gameCol.appendChild(el.intro);

  // ---------- helpers ----------
  const hideCol = (on) => { el.col.inert = on; if (on) el.col.setAttribute('aria-hidden', 'true'); else el.col.removeAttribute('aria-hidden'); };
  const anyModal = () => !!(state.select || state.game || state.intro || s5.notice);
  const restore = (rf) => { if (rf && rf.focus && document.contains(rf) && !rf.closest('[hidden]')) rf.focus({ preventScroll: true }); };
  const focusIn = (node, sel) => { const f = node.querySelector(sel); if (f) f.focus({ preventScroll: true }); };
  const inkBottom = (ink) => (FILLED_INKS[ink] || FILLED_INKS.pink)[1];
  const ctlLabel = (id) => (S.picker.controls[id] || (S.game.controls[id] && S.game.controls[id].label) || id);
  const CTL_ICON = { touch: 'finger', head: 'head-tilt' };

  // ======================= growth card =======================
  function renderGrowth() {
    const g = s5.growth;
    const t = growthCardText(g.data, G);
    el.growth.dataset.kind = t.kind;
    el.growth.setAttribute('aria-labelledby', 'mp-growth-title');
    el.growth.innerHTML = `
      <div class="mp-card5-in">
        <button type="button" class="mp-iconbtn mp-iconbtn--soft mp-card5-x" aria-label="${esc(G.close)}">${icon('close', 20)}</button>
        <span class="mp-growth-pic" aria-hidden="true">
          <span class="mp-growth-spark mp-growth-spark--a">${icon('sparkle', 18)}</span>
          <span class="mp-growth-spark mp-growth-spark--b">${icon('sparkle', 14)}</span>
          ${filledIcon('growth', 64)}
        </span>
        ${t.pills.length ? `<span class="mp-growth-pills">${t.pills.map((p, i) => `<span class="mp-pill${i ? ' mp-pill--trait' : ''}">${esc(p)}</span>`).join('')}</span>` : ''}
        <h2 class="mp-card5-title" id="mp-growth-title">${esc(t.title)}</h2>
        ${t.line ? `<p class="mp-card5-line">${esc(t.line)}</p>` : ''}
        <button type="button" class="mp-btn-primary mp-growth-ok">${esc(t.button)}</button>
      </div>`;
  }
  function closeGrowth(fire) {
    const g = s5.growth;
    if (!g) return;
    s5.growth = null;
    el.growth.hidden = true; el.growth.innerHTML = '';
    root.classList.remove('is-growth');
    restore(g.returnFocus);
    if (fire) call('onGrowthCardClose');
  }
  el.growth.addEventListener('click', (ev) => {
    if (ev.target.closest('.mp-growth-ok, .mp-card5-x')) closeGrowth(true);
  });
  el.growth.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); closeGrowth(true); } });

  // ======================= minigame picker =======================
  function pickerGame(g) {
    const P = S.picker;
    const best = Number(g.best) > 0 ? Math.floor(Number(g.best)) : 0;
    const ctl = (Array.isArray(g.controls) && g.controls.length ? g.controls : ['touch']).filter(Boolean);
    return {
      ...g, ctl, best,
      bestText: best ? `${P.best} ${fmt(best)}` : P.noBest,
      ctlText: ctl.map(ctlLabel).join(' หรือ '),
      favText: g.favorite ? P.fav(s5.picker.charName) : '',
      lastText: g.last ? P.last : '',
    };
  }
  function renderPicker(focusId) {
    const p = s5.picker;
    const P = S.picker;
    const cards = p.games.map((raw) => {
      const g = pickerGame(raw);
      const ico = filledIcon(raw.icon || GAME_ICONS[g.id] || 'fun', 44);
      return `
      <button type="button" class="mp-gcard${g.last ? ' is-last' : ''}${g.favorite ? ' is-fav' : ''}" data-id="${esc(g.id)}" aria-label="${esc(P.aria(g))}">
        <span class="mp-gcard-top">
          <span class="mp-gcard-ico" aria-hidden="true">${ico}</span>
          <span class="mp-gcard-tags" aria-hidden="true">
            ${g.favorite ? `<span class="mp-gtag mp-gtag--fav">${icon('heart', 12)}<span>${esc(g.favText)}</span></span>` : ''}
            ${g.last ? `<span class="mp-gtag mp-gtag--last">${esc(P.last)}</span>` : ''}
          </span>
        </span>
        <span class="mp-gcard-title" aria-hidden="true">${esc(g.title)}</span>
        <span class="mp-gcard-how" aria-hidden="true">${esc(g.howTo || '')}</span>
        <span class="mp-gcard-foot" aria-hidden="true">
          <span class="mp-gcard-best${g.best ? '' : ' is-none'}">${g.best ? `${icon('star', 14)}<span class="mp-num">${fmt(g.best)}</span>` : `<span>${esc(P.noBest)}</span>`}</span>
          <span class="mp-gcard-ctl">${g.ctl.map((c) => `<span class="mp-gctl" title="${esc(ctlLabel(c))}">${icon(CTL_ICON[c] || 'finger', 16)}</span>`).join('')}</span>
        </span>
      </button>`;
    }).join('');
    el.picker.setAttribute('aria-labelledby', 'mp-picker-title');
    el.picker.innerHTML = `
      <div class="mp-ward-panel mp-picker-panel">
        <div class="mp-ward-head">
          <h2 class="mp-ward-title" id="mp-picker-title">${esc(P.title)}</h2>
          <button type="button" class="mp-iconbtn mp-iconbtn--soft mp-picker-x" aria-label="${esc(P.close)}">${icon('close', 20)}</button>
        </div>
        <div class="mp-ward-body"><div class="mp-gcards" role="group" aria-label="${esc(P.group)}">${cards}</div></div>
      </div>`;
    if (focusId) focusIn(el.picker, `.mp-gcard[data-id="${CSS.escape(focusId)}"]`);
  }
  function closePicker(fire) {
    const p = s5.picker;
    if (!p) return;
    s5.picker = null;
    el.picker.hidden = true; el.picker.innerHTML = '';
    root.classList.remove('is-picker');
    if (fire) { restore(p.returnFocus); call('onMinigamePickerClose'); }
  }
  el.picker.addEventListener('click', (ev) => {
    if (!s5.picker) return;
    if (ev.target.closest('.mp-picker-x')) { closePicker(true); return; }
    const c = ev.target.closest('.mp-gcard');
    if (c) call('onMinigamePick', c.dataset.id);
  });
  el.picker.addEventListener('keydown', (ev) => {
    if (!s5.picker) return;
    if (ev.key === 'Escape') { ev.stopPropagation(); closePicker(true); return; }
    const c = ev.target.closest('.mp-gcard');
    if (!c) return;
    const list = [...el.picker.querySelectorAll('.mp-gcard')];
    const i = list.indexOf(c);
    const j = gridMove(i, ev.key, list.length, 2);
    if (j !== i) { ev.preventDefault(); ev.stopPropagation(); list[j].focus({ preventScroll: true }); }
    else if (ev.key.startsWith('Arrow')) { ev.preventDefault(); ev.stopPropagation(); }
  });

  // ======================= game HUD bits =======================
  function renderCall(c) {
    if (!c || !c.color) { el.call.hidden = true; return; }
    const pattern = c.pattern || ({ pink: 'heart', lilac: 'star', sky: 'dot', blue: 'dot', butter: 'stripe' }[c.color]) || 'dot';
    const ink = FILLED_INKS[c.color] || FILLED_INKS.sky;
    el.call.hidden = false;
    el.call.style.setProperty('--call-a', ink[0]);
    el.call.style.setProperty('--call-b', ink[1]);
    const same = el.call.dataset.color === c.color;
    el.call.dataset.color = c.color;
    el.callSw.innerHTML = patternGlyph(pattern, 18);
    el.callText.textContent = S.game5.call(c.label || c.color);
    el.callWarn.hidden = !c.warn;
    el.callWarn.textContent = c.warn ? S.game5.callWarn : '';
    el.call.classList.toggle('is-warn', !!c.warn);
    if (!same) ctx.bump(el.call, 'is-new');
  }
  function renderRound(g) {
    const n = Math.max(0, Math.floor(Number(g.round) || 0));
    el.round.hidden = !n;
    if (n) {
      el.round.querySelector('.mp-num').textContent = S.game5.round(n);
      el.round.setAttribute('aria-label', S.game5.roundAria(n));
    }
    const max = Math.max(1, Math.floor(Number(g.slipsMax) || 3));
    const used = Math.min(max, Math.max(0, Math.floor(Number(g.slips) || 0)));
    el.slips.hidden = g.slips == null;
    if (g.slips != null) {
      el.slips.querySelector('.mp-slips-l').textContent = S.game5.slips;
      el.slips.setAttribute('aria-label', S.game5.slipsAria(max - used, max));
      el.slips.querySelector('.mp-slips-dots').innerHTML = Array.from({ length: max }, (_, i) => `<span class="mp-slip${i < max - used ? '' : ' is-used'}"></span>`).join('');
    }
  }
  function renderSeq() {
    const p = s5.pads; if (!p) return;
    const head = el.pads.querySelector('.mp-pads-head');
    const seq = s5.game && s5.game.sequence;
    if (!head) return;
    if (!seq || !seq.length) { head.hidden = true; return; }
    head.hidden = false;
    const len = Math.max(0, Math.floor(seq.length));
    const done = Math.min(len, Math.max(0, Math.floor(seq.done || 0)));
    const watch = seq.phase === 'watch';
    head.dataset.phase = watch ? 'watch' : 'repeat';
    head.querySelector('.mp-pads-phase').innerHTML = `${watch ? icon('eye', 16) : icon('finger', 16)}<span>${esc(watch ? S.game5.watch : S.game5.repeat)}</span>`;
    const dots = head.querySelector('.mp-pads-seq');
    dots.setAttribute('aria-label', S.game5.seqAria(done, len));
    dots.innerHTML = Array.from({ length: len }, (_, i) => `<span class="mp-seq${i < done ? ' is-done' : ''}"></span>`).join('');
  }

  // ======================= mimic pads =======================
  function renderPads() {
    const p = s5.pads;
    const cols = padColumns(p.list.length);
    el.pads.style.setProperty('--cols', String(cols));
    el.pads.dataset.n = String(p.list.length);
    const keys = finePointer.matches;
    el.pads.innerHTML = `
      <div class="mp-pads-head" hidden><span class="mp-pads-phase"></span><span class="mp-pads-seq" role="img"></span></div>
      <div class="mp-pads-grid" role="group" aria-label="${esc(S.game5.padsGroup)}">
        ${p.list.map((pad, i) => `
        <button type="button" class="mp-pad" data-id="${esc(pad.id)}" data-i="${i}" style="--pad-ink:${inkBottom(pad.color)}" aria-label="${esc(pad.label)}" ${p.enabled ? '' : 'aria-disabled="true"'}>
          <span class="mp-pad-ico" aria-hidden="true">${filledIcon(`pose-${pad.icon || pad.id}`, 56, { ink: pad.color }) || filledIcon('fun', 56)}</span>
          <span class="mp-pad-label">${esc(pad.label)}</span>
          ${keys ? `<span class="mp-pad-key mp-num" aria-hidden="true">${i + 1}</span>` : ''}
          <span class="mp-pad-badge" aria-hidden="true"></span>
        </button>`).join('')}
      </div>`;
    el.pads.classList.toggle('is-off', !p.enabled);
    renderSeq();
  }
  function padEl(id) { return el.pads.querySelector(`.mp-pad[data-id="${CSS.escape(String(id))}"]`); }
  function activatePad(btn) {
    const p = s5.pads;
    if (!p || !p.enabled || !btn) return;
    ctx.bump(btn, 'is-press');
    call('onMimicPad', btn.dataset.id);
  }
  el.pads.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest('.mp-pad');
    if (!b || ev.button > 0) return;
    b.dataset.ptr = String(Date.now());
    activatePad(b);
  });
  el.pads.addEventListener('click', (ev) => {
    const b = ev.target.closest('.mp-pad');
    if (!b) return;
    const ptr = Number(b.dataset.ptr || 0);
    delete b.dataset.ptr;
    if (ptr && Date.now() - ptr < 1500) return;             // already handled on pointerdown
    activatePad(b);                                         // keyboard Enter / Space
  });
  const onKey = (ev) => {
    const p = s5.pads;
    if (!p || !p.enabled || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (state.intro || el.result.hidden === false || s5.notice) return;
    const t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const i = mimicKeyIndex(ev.key, p.list.length);
    if (i < 0) return;
    ev.preventDefault();
    activatePad(el.pads.querySelector(`.mp-pad[data-i="${i}"]`));
  };
  window.addEventListener('keydown', onKey);

  // ======================= caption + hints =======================
  function hideCaption() {
    const c = s5.caption;
    clearTimeout(c.timer);
    c.on = false;
    el.caption.hidden = true;
    ctx.positionBubble();
  }
  function renderHints() {
    const h = s5.hints;
    const show = !!(h && h.length) && !root.classList.contains('is-flush');
    el.hints.hidden = !show;
    root.classList.toggle('is-hints', show);
    if (!show) { el.hints.innerHTML = ''; return; }
    el.hints.innerHTML = `<span class="mp-hints-lead">${icon('chat', 16)}<span>${esc(T.hintsLead)}</span></span>${h.map((t) => `<span class="mp-hint">“${esc(t)}”</span>`).join('')}`;
  }

  // ======================= mic: long press, sheet =======================
  const LONG_MS = 550;
  function openMicSheetFromPress() {
    if (has('onMicLongPress')) call('onMicLongPress');
    else api.showMicSheet({ mode: s5.talkMode });
  }
  el.mic.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    const pr = s5.press;
    pr.long = false; pr.x = ev.clientX; pr.y = ev.clientY;
    clearTimeout(pr.timer);
    pr.timer = setTimeout(() => { pr.long = true; el.mic.classList.remove('is-holding'); openMicSheetFromPress(); }, LONG_MS);
    if (!reducedMotion.matches) el.mic.classList.add('is-holding');
  });
  const cancelPress = () => { clearTimeout(s5.press.timer); el.mic.classList.remove('is-holding'); };
  el.mic.addEventListener('pointerup', cancelPress);
  el.mic.addEventListener('pointercancel', cancelPress);
  el.mic.addEventListener('pointerleave', cancelPress);
  el.mic.addEventListener('pointermove', (ev) => {
    if (Math.hypot(ev.clientX - s5.press.x, ev.clientY - s5.press.y) > 12) cancelPress();
  });
  el.mic.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    cancelPress();
    if (s5.press.long) return;            // the touch long-press already opened it
    s5.press.long = true;                 // swallow the click that may follow
    openMicSheetFromPress();
  });
  // hud.js routes mic clicks through this, so a long press never also starts a turn.
  function micClickAllowed() {
    if (s5.press.long) { s5.press.long = false; return false; }
    return true;
  }

  function renderMicSheet(focus) {
    const m = s5.micSheet;
    const n = state.char.name;
    const opts = ['talk', 'echo'].map((id) => {
      const on = m.mode === id;
      const off = id === 'talk' && m.available === false;
      const d = T.modes[id];
      return `
        <button type="button" class="mp-opt${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-mode="${id}" ${off ? 'aria-disabled="true"' : ''}
          aria-label="${esc(d.label)}" aria-describedby="mp-mode-hint-${id}">
          <span class="mp-opt-pic" aria-hidden="true">${icon(id === 'talk' ? 'chat' : 'echo', 28)}</span>
          <span class="mp-opt-check" aria-hidden="true">${on ? icon('check', 14) : ''}</span>
          <span class="mp-opt-label">${esc(d.label)}</span>
          <span class="mp-opt-hint" id="mp-mode-hint-${id}">${esc(off ? T.unavailable : d.hint(n))}</span>
        </button>`;
    }).join('');
    el.micSheet.setAttribute('aria-labelledby', 'mp-micsheet-title');
    el.micSheet.innerHTML = `
      <div class="mp-ward-panel mp-micsheet-panel">
        <div class="mp-ward-head">
          <h2 class="mp-ward-title" id="mp-micsheet-title">${esc(T.sheetTitle(n))}</h2>
          <button type="button" class="mp-iconbtn mp-iconbtn--soft mp-micsheet-x" aria-label="${esc(T.sheetClose)}">${icon('close', 20)}</button>
        </div>
        <div class="mp-intro-opts mp-micsheet-opts" role="radiogroup" aria-label="${esc(T.sheetTitle(n))}">${opts}</div>
      </div>`;
    if (focus) focusIn(el.micSheet, focus);
  }
  function closeMicSheet() {
    const m = s5.micSheet;
    if (!m) return;
    s5.micSheet = null;
    el.micSheet.hidden = true; el.micSheet.innerHTML = '';
    root.classList.remove('is-micsheet');
    restore(m.returnFocus);
  }
  function pickMode(id) {
    const m = s5.micSheet;
    if (!m) return;
    if (id === 'talk' && m.available === false) return;
    m.mode = id;
    s5.talkMode = id;
    ctx.renderMic();
    call('onTalkMode', id);
    closeMicSheet();
  }
  el.micSheet.addEventListener('click', (ev) => {
    if (ev.target.closest('.mp-micsheet-x')) { closeMicSheet(); return; }
    const o = ev.target.closest('.mp-opt');
    if (o) pickMode(o.dataset.mode);
  });
  el.micSheet.addEventListener('keydown', (ev) => {
    const m = s5.micSheet;
    if (!m) return;
    if (ev.key === 'Escape') { ev.stopPropagation(); closeMicSheet(); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key) && ev.target.closest('.mp-opt')) {
      ev.preventDefault(); ev.stopPropagation();
      const next = ev.target.closest('.mp-opt').dataset.mode === 'talk' ? 'echo' : 'talk';
      focusIn(el.micSheet, `.mp-opt[data-mode="${next}"]`);
    }
  });

  // ======================= privacy notice =======================
  function renderNotice() {
    const nt = s5.notice;
    const n = nt.name || state.char.name;
    el.notice.setAttribute('aria-labelledby', 'mp-notice-title');
    el.notice.setAttribute('aria-describedby', 'mp-notice-body');
    el.notice.innerHTML = `
      <div class="mp-card5-in mp-notice-in">
        <div class="mp-notice-head">
          <span class="mp-notice-ico" aria-hidden="true">${icon('shield', 26)}</span>
          <h2 class="mp-card5-title" id="mp-notice-title">${esc(T.noticeTitle(n))}</h2>
        </div>
        <p class="mp-notice-body" id="mp-notice-body">${esc(nt.local ? T.noticeLocal : T.noticeRemote)}</p>
        <div class="mp-notice-actions">
          <button type="button" class="mp-btn-outline mp-notice-echo">${esc(T.noticeEcho)}</button>
          <button type="button" class="mp-btn-primary mp-notice-ok">${icon('chat', 22)}<span>${esc(T.noticeOk)}</span></button>
        </div>
      </div>`;
  }
  function closeNotice() {
    const nt = s5.notice;
    if (!nt) return;
    s5.notice = null;
    el.notice.hidden = true; el.notice.innerHTML = '';
    root.classList.remove('is-notice');
    if (!state.select && !state.game && !state.intro) hideCol(false);
    restore(nt.returnFocus);
  }
  el.notice.addEventListener('click', (ev) => {
    if (ev.target.closest('.mp-notice-ok')) { closeNotice(); call('onTalkNoticeOk'); return; }
    if (ev.target.closest('.mp-notice-echo')) { closeNotice(); call('onTalkNoticeEcho'); }
  });
  el.notice.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.stopPropagation(); closeNotice(); call('onTalkNoticeClose'); return; }
    if (ev.key === 'Tab') {   // keep focus inside the modal notice
      const f = [...el.notice.querySelectorAll('button')];
      const i = f.indexOf(document.activeElement);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); }
      else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
    }
  });

  // ======================= typed chat =======================
  function renderType() {
    const n = state.char.name;
    el.typeBox.setAttribute('aria-label', T.typeLabel(n));
    el.typeBox.innerHTML = `
      <div class="mp-typebox-in">
        <button type="button" class="mp-iconbtn mp-iconbtn--soft mp-type-x" aria-label="${esc(T.typeClose)}">${icon('close', 20)}</button>
        <label class="mp-type-field">
          <span class="mp-sr">${esc(T.typeLabel(n))}</span>
          <input class="mp-type-input" type="text" lang="th" maxlength="80" autocomplete="off" autocorrect="off" autocapitalize="off"
            spellcheck="false" enterkeyhint="send" placeholder="${esc(T.typePlaceholder(n))}">
        </label>
        <button type="button" class="mp-iconbtn mp-type-send" aria-label="${esc(T.typeSend)}" disabled>${icon('send', 22)}</button>
      </div>`;
    el.typeInput = el.typeBox.querySelector('.mp-type-input');
    el.typeSend = el.typeBox.querySelector('.mp-type-send');
    const it = el.typeInput;
    it.addEventListener('compositionstart', () => { s5.type && (s5.type.composing = true); });
    it.addEventListener('compositionend', () => { if (s5.type) { s5.type.composing = false; s5.lastComposeEnd = performance.now(); } syncSend(); });
    it.addEventListener('input', syncSend);
    it.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeType(true); return; }
      if (ev.key !== 'Enter') return;
      ev.stopPropagation();
      // Safari fires compositionend just BEFORE the committing Enter's keydown: treat an Enter in
      // the same moment as part of the composition.
      const justComposed = performance.now() - s5.lastComposeEnd < 40;
      if (!shouldSendOnEnter(ev, (s5.type && s5.type.composing) || justComposed)) return;
      ev.preventDefault();
      sendTyped();
    });
  }
  function syncSend() { if (el.typeSend) el.typeSend.disabled = !cleanTyped(el.typeInput.value); }
  function sendTyped() {
    const text = cleanTyped(el.typeInput.value);
    if (!text) return;
    el.typeInput.value = '';
    syncSend();
    call('onTypeSend', text);
    el.typeInput.focus({ preventScroll: true });
  }
  function closeType(fire) {
    const t = s5.type;
    if (!t) return;
    s5.type = null;
    el.typeBox.hidden = true; el.typeBox.innerHTML = '';
    root.classList.remove('is-typing');
    if (vv) { vv.removeEventListener('resize', placeType); vv.removeEventListener('scroll', placeType); }
    root.style.removeProperty('--mp-kb');
    restore(t.returnFocus && !t.returnFocus.closest('[hidden]') ? t.returnFocus : el.typeBtn);
    if (fire) call('onTypeClose');
  }
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  /** Lift the box above the on-screen keyboard (iOS keeps layout height; visualViewport shrinks). */
  function placeType() {
    if (!vv) return;
    const kb = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    root.style.setProperty('--mp-kb', `${Math.round(kb)}px`);
  }
  el.typeBox.addEventListener('click', (ev) => {
    if (ev.target.closest('.mp-type-x')) { closeType(true); return; }
    if (ev.target.closest('.mp-type-send')) sendTyped();
  });
  el.typeBtn.addEventListener('click', () => { call('onTypeOpen'); api.showTypeBox(); });

  // ======================= followUp pulse =======================
  function clearFollow() {
    for (const f of s5.follow) { clearTimeout(f.timer); f.node.classList.remove('is-follow'); }
    s5.follow = [];
  }

  // ======================= public API =======================
  const api = {
    /**
     * Small growth card (growth GDD 3.3 / 3.5 / 3.8). Bottom card, the pet stays visible above;
     * the normal bottom cluster hides. "เย้!" / ✕ / Escape close it and call onGrowthCardClose.
     * Wire queues it until the room is calm (no sheet, minigame, toilet or carry).
     * @param {{kind:'stage'|'trait'|'drift', name:string, stageLabel?:string, traitLabel?:string, because?:string, line?:string}} data
     */
    showGrowthCard(data = {}) {
      const first = !s5.growth;
      s5.growth = { data, returnFocus: first ? document.activeElement : s5.growth.returnFocus };
      renderGrowth();
      el.growth.hidden = false;
      root.classList.add('is-growth');
      ctx.bump(el.growth, 'is-in');
      focusIn(el.growth, '.mp-growth-ok');
    },
    /** Close the growth card without calling a handler. */
    hideGrowthCard() { closeGrowth(false); },

    /**
     * Minigame picker sheet (minigames GDD 3.1): ≤ 45 % height, 2 × 2 cards in `games` order.
     * Tap a card → onMinigamePick(id) (the sheet stays open until wire shows the intro or calls
     * hideMinigamePicker). ✕ / Escape → onMinigamePickerClose(). The last-played card gets the focus.
     * @param {{games:{id:string, title:string, howTo?:string, best?:number, controls?:string[], favorite?:boolean, last?:boolean, icon?:string}[], charName?:string}} data
     */
    showMinigamePicker(data = {}) {
      if (state.ward) ctx.api.hideWardrobe();
      if (state.decor) ctx.closeDecorSelf();
      if (s5.micSheet) closeMicSheet();
      const first = !s5.picker;
      s5.picker = {
        games: (data.games || []).filter((g) => g && g.id),
        charName: data.charName || state.char.name,
        returnFocus: first ? document.activeElement : s5.picker.returnFocus,
      };
      renderPicker(pickerFocusId(s5.picker.games));
      el.picker.hidden = false;
      root.classList.add('is-picker');
    },
    hideMinigamePicker() { closePicker(false); },

    /**
     * Mimic pads (minigames GDD 3.2): big targets in the bottom band, 1 row up to 4, 3 × 2 for 6.
     * Each pad = pose face + frame shape + label (+ key number with a mouse), colour only adds.
     * @param {{id:string, label:string, icon?:string, color?:string}[]} pads icon = pose id (smile …), color = ink name
     */
    showMimicPads(pads = []) {
      s5.pads = { list: pads.filter((p) => p && p.id), enabled: s5.pads ? s5.pads.enabled : false };
      renderPads();
      el.pads.hidden = false;
      el.game.classList.add('has-pads');
    },
    /**
     * Light one pad. demo = the pet shows this pose · ok = right tap · wrong = soft slip · hint = gentle
     * "this one next" glow. Flashes stay ≥ 260 ms so nothing blinks faster than 3 × per second.
     * @param {string} id
     * @param {'demo'|'ok'|'wrong'|'hint'} [kind='demo']
     * @param {number} [ms] override the default length (demo 420, ok 300, wrong 560, hint 1200)
     */
    flashMimicPad(id, kind = 'demo', ms) {
      const b = padEl(id);
      if (!b) return;
      const k = ['demo', 'ok', 'wrong', 'hint'].includes(kind) ? kind : 'demo';
      const dur = Math.max(260, Number(ms) || { demo: 420, ok: 300, wrong: 560, hint: 1200 }[k]);
      const t = s5.padTimers.get(b);
      if (t) clearTimeout(t);
      b.classList.remove('is-demo', 'is-ok', 'is-wrong', 'is-hint');
      void b.offsetWidth;
      b.classList.add(`is-${k}`);
      b.querySelector('.mp-pad-badge').innerHTML = k === 'ok' ? icon('check', 14) : k === 'wrong' ? `<span>${esc(S.game5.padWrong)}</span>` : '';
      s5.padTimers.set(b, setTimeout(() => { b.classList.remove(`is-${k}`); s5.padTimers.delete(b); }, dur));
    },
    /** @param {boolean} on false during the watch phase (pads look resting, taps and keys are ignored) */
    setMimicPadsEnabled(on) {
      if (!s5.pads) return;
      s5.pads.enabled = !!on;
      el.pads.classList.toggle('is-off', !on);
      el.pads.querySelectorAll('.mp-pad').forEach((b) => { if (on) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true'); });
    },
    hideMimicPads() {
      s5.padTimers.forEach((t) => clearTimeout(t)); s5.padTimers.clear();
      s5.pads = null;
      el.pads.hidden = true; el.pads.innerHTML = '';
      el.game.classList.remove('has-pads');
    },

    /**
     * What the pet heard: a small grey caption under the speech bubble (conversation GDD 3.2).
     * Without `ms` it stays until replaced or cleared (interim text); with `ms` it hides itself.
     * @param {string|null} text
     * @param {number} [ms] e.g. 2000 (captionSec)
     */
    caption(text, ms) {
      const c = s5.caption;
      clearTimeout(c.timer);
      if (!text) { hideCaption(); return; }
      el.captionText.textContent = text;
      el.caption.setAttribute('aria-label', `${T.heard} ${text}`);
      el.caption.hidden = false;
      c.on = true;
      c.w = el.caption.offsetWidth; c.h = el.caption.offsetHeight;
      ctx.positionBubble();
      if (ms) c.timer = setTimeout(hideCaption, ms);
    },

    /**
     * "ลองพูดว่า" chips above the mic (display only). Takes the coach mark's place while shown.
     * @param {string[]|null} hints [] or null hides them
     */
    showTalkHints(hints) {
      s5.hints = Array.isArray(hints) ? hints.map((h) => (typeof h === 'string' ? h : h && h.text)).filter(Boolean).slice(0, 4) : null;
      renderHints();
    },

    /**
     * One-time privacy notice before the first recognition (conversation GDD 3.10). Modal, no
     * browser dialog. "คุยเลย" → onTalkNoticeOk · "ใช้พูดตามแทน" → onTalkNoticeEcho ·
     * Escape → onTalkNoticeClose (no choice made; nothing starts).
     * @param {{name?:string, local?:boolean}} [opts] local = recognition stays on this device
     */
    showTalkNotice(opts = {}) {
      if (s5.micSheet) closeMicSheet();
      const first = !s5.notice;
      s5.notice = { name: opts.name, local: !!opts.local, returnFocus: first ? document.activeElement : s5.notice.returnFocus };
      renderNotice();
      el.notice.hidden = false;
      root.classList.add('is-notice');
      hideCol(true);
      focusIn(el.notice, '.mp-notice-ok');
    },
    hideTalkNotice() { closeNotice(); },

    /**
     * Small sheet "คุยกัน / พูดตาม" (conversation GDD 3.1). Picking one calls onTalkMode(id) and closes.
     * @param {{mode?:'talk'|'echo'|'auto', available?:boolean}} [opts] available false = talk is greyed out
     */
    showMicSheet(opts = {}) {
      if (anyModal() || s5.picker) return;
      if (state.ward) ctx.api.hideWardrobe();
      if (state.decor) ctx.closeDecorSelf();
      if (s5.type) closeType(false);
      const first = !s5.micSheet;
      let mode = opts.mode === 'echo' || opts.mode === 'talk' ? opts.mode : s5.talkMode;
      if (opts.available === false) mode = 'echo';
      s5.micSheet = { mode, available: opts.available, returnFocus: first ? el.mic : s5.micSheet.returnFocus };
      renderMicSheet(`.mp-opt[data-mode="${mode}"]`);
      el.micSheet.hidden = false;
      root.classList.add('is-micsheet');
    },
    hideMicSheet() { closeMicSheet(); },

    /** Optional: tell the mic which mode a tap starts, so its label and aria match. @param {'talk'|'echo'} mode */
    setTalkMode(mode) { s5.talkMode = mode === 'echo' ? 'echo' : 'talk'; ctx.renderMic(); },

    /**
     * Typed chat box (conversation GDD, typed chat). Replaces the bottom cluster and rides above the
     * on-screen keyboard. Enter (not while composing Thai) or the send button → onTypeSend(text);
     * the box stays open for the next line. Escape / ✕ → onTypeClose().
     */
    showTypeBox() {
      if (anyModal()) return;
      if (s5.micSheet) closeMicSheet();
      if (state.ward) ctx.api.hideWardrobe();
      if (state.decor) ctx.closeDecorSelf();
      if (s5.type) { el.typeInput.focus({ preventScroll: true }); return; }
      s5.type = { composing: false, returnFocus: el.typeBtn };
      renderType();
      el.typeBox.hidden = false;
      root.classList.add('is-typing');
      if (vv) { vv.addEventListener('resize', placeType); vv.addEventListener('scroll', placeType); placeType(); }
      el.typeInput.focus({ preventScroll: true });
    },
    hideTypeBox() { closeType(false); },

    /**
     * Gently pulse the button or room arrow that matches a reply's followUp, for 3 s. Never moves
     * the player. Reduced motion: a steady ring instead of the pulse.
     * @param {'kitchen'|'bathroom'|'play'|'wardrobe'|'decor'|'sleep'} id
     */
    pulseFollowUp(id) {
      clearFollow();
      const t = followUpTarget(id, state.room);
      if (!t) return;
      const nodes = [];
      if (t.kind === 'room') {
        nodes.push(t.dir > 0 ? el.next : el.prev);
        const dot = el.dots.find((d) => d.dataset.room === t.room);
        if (dot) nodes.push(dot);
      } else if (t.kind === 'ctx') nodes.push(el.ctx);
      else if (t.kind === 'ward') nodes.push(el.wardBtn);
      else if (t.kind === 'decor') nodes.push(state.room === 'kitchen' && !el.tray.hidden ? el.trayDecor : el.decorBtn);
      else if (t.kind === 'lamp') nodes.push(el.lamp);
      for (const node of nodes) {
        if (!node || node.hidden || node.closest('[hidden]')) continue;
        node.classList.remove('is-follow'); void node.offsetWidth; node.classList.add('is-follow');
        s5.follow.push({ node, timer: setTimeout(() => node.classList.remove('is-follow'), 3000) });
      }
    },
  };

  // ======================= hooks for hud.js =======================
  const hooks = {
    micClickAllowed,
    /** Mic label + aria for the S5 states. */
    micCopy(st) {
      if (st === 'thinking') return { label: T.thinking, aria: () => T.thinking, ico: 'dots' };
      if (st === 'off') return s5.talkMode === 'echo' ? { ...T.offEcho, ico: 'mic' } : { ...T.offTalk, ico: 'mic' };
      return null;
    },
    longPressHint: T.longPress,
    /** Chip ring + aria (growth). */
    chip(c) {
      const ava = el.who.querySelector('.mp-who-ava');
      const on = !!c.stage;
      ava.classList.toggle('has-growth', on);
      if (!on) return;
      const grown = c.stage === 'grown';
      ava.dataset.stage = c.stage;
      ava.style.setProperty('--grow', String(grown ? 1 : clamp01(c.progress)));
      el.who.setAttribute('aria-label', G.chipAria(c.name, c.stageLabel || '', growthWords(c.progress, c.stage, G)));
    },
    /** Extra lines on a character select card. */
    selectCard(c) {
      if (!c || c.locked || !c.stage) return { html: '', aria: '', name: c && c.name };
      const grown = c.stage === 'grown';
      const p = grown ? 1 : clamp01(c.progress);
      const hint = selectHint(c, G);
      const words = growthWords(p, c.stage, G);
      return {
        name: grown && c.traitLabel ? `${c.name} · ${c.traitLabel}` : c.name,
        html: `
        <span class="mp-card-grow">
          <span class="mp-grow-ring${grown ? ' is-grown' : ''}" style="--grow:${p}" aria-hidden="true">${filledIcon('growth', 16)}</span>
          <span class="mp-card-stage">${esc(c.stageLabel || '')}</span>
        </span>
        ${hint ? `<span class="mp-card-hint">${esc(hint)}</span>` : ''}`,
        aria: [c.stageLabel, words, hint].filter(Boolean).join(' '),
      };
    },
    /** Minigame start: per-game look + hint. */
    startGame(opts) {
      s5.game = { id: opts.id || 'snackRain', sequence: null };
      el.game.dataset.game = s5.game.id;
      renderCall(null);
      renderRound({ round: 0, slips: null });
      el.round.hidden = true; el.slips.hidden = true;
    },
    gameHint(control) {
      const id = s5.game && s5.game.id;
      const h = S.hints[id];
      if (!h) return null;
      if (control === 'head' && h.head) return h.head;
      return finePointer.matches ? (h.mouse || h.touch) : h.touch;
    },
    updateGame(u) {
      if (!s5.game) return;
      if ('call' in u) renderCall(u.call);
      if (u.round != null || u.slips != null || u.slipsMax != null) {
        s5.game.round = u.round ?? s5.game.round;
        s5.game.slips = u.slips ?? s5.game.slips;
        s5.game.slipsMax = u.slipsMax ?? s5.game.slipsMax;
        renderRound(s5.game);
      }
      if ('sequence' in u) { s5.game.sequence = u.sequence; renderSeq(); }
    },
    endGame() {
      s5.game = null;
      delete el.game.dataset.game;
      renderCall(null);
      el.round.hidden = true; el.slips.hidden = true;
      api.hideMimicPads();
    },
    /** Caption box size for the bubble layout ({ w, h } or null). */
    captionBox() { return s5.caption.on ? s5.caption : null; },
    placeCaption(left, top) { el.caption.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`; },
    renderHints,
    roomChanged() {
      if (s5.picker && state.room !== 'living') closePicker(true);
      clearFollow();
    },
    /** A big layer opened (select, minigame, intro): close the small S5 sheets. */
    closeSheets() {
      if (s5.micSheet) closeMicSheet();
      if (s5.type) closeType(true);
    },
    anyOpen() { return !!(s5.picker || s5.growth || s5.notice || s5.micSheet || s5.type); },
    dispose() {
      window.removeEventListener('keydown', onKey);
      clearTimeout(s5.caption.timer); clearTimeout(s5.press.timer);
      s5.padTimers.forEach((t) => clearTimeout(t));
      clearFollow();
      if (vv) { vv.removeEventListener('resize', placeType); vv.removeEventListener('scroll', placeType); }
      root.classList.remove('is-growth', 'is-picker', 'is-notice', 'is-micsheet', 'is-typing', 'is-hints');
    },
  };
  return { api, hooks };
}
