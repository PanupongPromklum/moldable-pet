/**
 * Moldable Pet — in-game HUD (owner: glaze). Story S1-04.
 *
 * Implements the "HUD — glaze" contract in docs/architecture/module-contracts.md.
 * Display only: the HUD never changes game state; it reports intent through the
 * handlers passed to createHUD and shows what wire tells it to show.
 *
 * Needs `tokens.css` and `hud.css` to be loaded by the page.
 *
 * @module ui/hud
 */
import { icon, foodIcon } from './icons.js';

/** Room ids in swipe order (matches ROOM_IDS in src/rooms). */
export const HUD_ROOMS = ['living', 'kitchen', 'bathroom'];

/** Need ids in display order. */
export const HUD_NEEDS = ['hunger', 'toilet', 'fun', 'social'];

/**
 * Default thresholds (story S1-04). Pass loop's `needs.json` as `options.needs`
 * to use per-need `good` / `low` / `urgent` values instead.
 */
export const DEFAULT_THRESHOLDS = { good: 0.7, low: 0.25, urgent: 0.1 };

/** Character key → portrait file in assets/ui/characters/. */
const PORTRAITS = {
  splat: 'char_mai.png', pill: 'char_two.png', gumdrop: 'char_min.png',
  diamond: 'char_ack.png', cloud: 'char_fah.png', flower: 'char_pai.png',
};
/** Soft card ground per character on the select screen. */
const CARD_TINT = {
  splat: '#FBF0F4', pill: '#F5F5F5', gumdrop: '#F2F1FB',
  diamond: '#EDF4F6', cloud: '#E7EFF8', flower: '#F2F1FB',
};

/**
 * All player-facing HUD copy (Thai). Override any key with `options.strings`.
 * Functions receive the values they format.
 */
export const HUD_STRINGS = {
  needs: { hunger: 'อิ่ม', toilet: 'ห้องน้ำ', fun: 'สนุก', social: 'ใกล้ชิด' },
  rooms: { living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', bathroom: 'ห้องน้ำ' },
  percent: (p) => `${p} เปอร์เซ็นต์`,
  low: 'ต่ำ',
  urgent: 'ด่วน',
  coins: (n) => `เหรียญ ${n}`,
  settings: 'ตั้งค่า',
  prevRoom: 'ห้องก่อนหน้า',
  nextRoom: 'ห้องถัดไป',
  roomsGroup: 'ห้อง',
  keyHint: 'เปลี่ยนห้อง',
  play: 'เล่น',
  tray: 'ถาดอาหาร',
  traySub: 'ลากไปที่ปาก',
  trayClose: 'ปิดถาดอาหาร',
  flush: 'กดชักโครก',
  closeToast: 'ปิดการแจ้งเตือน',
  mic: {
    off: { label: 'แตะเพื่อคุย', aria: (n) => `คุยกับ${n} ${n}จะพูดตาม` },
    listening: { label: 'กำลังฟัง', aria: () => 'กำลังฟัง แตะเพื่อปิดไมค์' },
    recording: { label: 'กำลังอัดเสียง', aria: () => 'กำลังอัดเสียง แตะเพื่อปิดไมค์' },
    playing: { label: 'กำลังพูดตาม', aria: (n) => `${n}กำลังพูดตาม` },
  },
  camera: {
    off: { aria: 'เปิดกล้องเพื่อใช้มือเล่น', msg: '' },
    loading: { aria: 'กำลังเปิดกล้อง', msg: 'กำลังเปิดกล้อง…' },
    on: { aria: 'ปิดกล้อง', msg: 'ยกมือขึ้นมาหน้ากล้องได้เลย' },
    error: { aria: 'เปิดกล้องไม่ได้ แตะเพื่อลองใหม่', msg: 'เปิดกล้องไม่ได้' },
  },
  select: {
    brand: 'Moldable Pet',
    title: 'เลือกเพื่อนก้อนนุ่ม',
    sub: 'เลือกได้ 1 ตัว เปลี่ยนได้ทีหลังในตั้งค่า',
    group: 'ตัวละคร',
    soon: 'เร็วๆ นี้',
    lockedRole: 'ยังไม่มีนิสัย',
    confirm: (n) => `เลือก${n}`,
    close: 'ปิด',
    current: 'เลือกอยู่',
  },
};

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Classify a need level into a display state. Pure, unit-testable.
 * @param {number} level 0..1 (1 = satisfied)
 * @param {{good:number, low:number, urgent:number}} [t]
 * @returns {'full'|'half'|'low'|'urgent'}
 */
export function needState(level, t = DEFAULT_THRESHOLDS) {
  const v = clamp01(level);
  if (v < t.urgent) return 'urgent';
  if (v < t.low) return 'low';
  if (v >= t.good) return 'full';
  return 'half';
}

/**
 * Clamp a speech bubble so it stays inside the viewport. Pure, unit-testable.
 * @param {number} x head-top x in px
 * @param {number} y head-top y in px
 * @param {number} w bubble width
 * @param {number} h bubble height (tail included)
 * @param {{vw:number, vh:number, minTop:number, margin:number}} box
 * @returns {{left:number, top:number, tail:number}} tail = tail x inside the bubble
 */
export function clampBubble(x, y, w, h, box) {
  const m = box.margin;
  const left = Math.max(m, Math.min(box.vw - m - w, x - w / 2));
  const top = Math.max(box.minTop, Math.min(box.vh - m - h, y - h - 6));
  const tail = Math.max(22, Math.min(w - 22, x - left));
  return { left, top, tail };
}

/**
 * Create the HUD inside `root` (normally `<div id="hud">`).
 *
 * @param {HTMLElement} root container that covers the viewport
 * @param {object} handlers
 * @param {(dirOrId: -1|1|string) => void} [handlers.onRoom]
 * @param {(id: 'flush'|'play') => void} [handlers.onAction]
 * @param {() => void} [handlers.onMic]
 * @param {() => void} [handlers.onCamera]
 * @param {() => void} [handlers.onSettings]
 * @param {(charKey: string) => void} [handlers.onSelect]
 * @param {(foodId: string, ev: PointerEvent) => void} [handlers.onFoodPointerDown]
 * @param {object} [options] optional, not part of the v1.1 contract
 * @param {object} [options.needs] `needs.json` → `needs` (labels, good/low/urgent per need)
 * @param {object} [options.strings] partial override of HUD_STRINGS
 * @returns {object} HUD API (see module-contracts.md)
 */
export function createHUD(root, handlers = {}, options = {}) {
  const S = { ...HUD_STRINGS, ...(options.strings || {}) };
  const needCfg = options.needs || {};
  const thresholds = (id) => ({ ...DEFAULT_THRESHOLDS, ...(needCfg[id] || {}) });
  const needLabel = (id) => (needCfg[id] && needCfg[id].label) || S.needs[id];
  const call = (name, ...args) => { try { handlers[name] && handlers[name](...args); } catch (err) { console.error('[hud]', name, err); } };
  const portrait = (key) => new URL(`../../assets/ui/characters/${PORTRAITS[key] || PORTRAITS.flower}`, import.meta.url).href;

  const state = {
    room: 'living', char: { key: 'flower', name: 'ไผ่' }, mic: 'off', camera: 'off',
    coins: null, flush: false, trayOpen: true, needs: {},
    bubble: { on: false, x: -1, y: -1, w: 0, h: 0, timer: 0 },
    toastTimer: 0, camMsgTimer: 0, select: null,
  };

  root.classList.add('mp-hud');
  root.setAttribute('data-room', state.room);
  root.innerHTML = `
  <div class="mp-col">
    <div class="mp-top">
      <div class="mp-bar">
        <div class="mp-who mp-hit">
          <span class="mp-who-ava"><img alt="" src="${portrait('flower')}"></span>
          <span class="mp-who-text"><span class="mp-who-name"></span><span class="mp-who-room"></span></span>
        </div>
        <div class="mp-bar-end">
          <div class="mp-coins mp-hit" role="group">
            <span class="mp-coin-dot" aria-hidden="true"><span></span></span>
            <span class="mp-coin-n mp-num">0</span>
            <span class="mp-coin-plus mp-num" aria-hidden="true"></span>
          </div>
          <button type="button" class="mp-iconbtn mp-cam" data-state="off" aria-pressed="false">${icon('camera', 22)}<span class="mp-cam-spin" aria-hidden="true"></span></button>
          <button type="button" class="mp-iconbtn mp-gear" aria-label="${esc(S.settings)}">${icon('gear', 22)}</button>
        </div>
      </div>
      <div class="mp-meters mp-hit">
        ${HUD_NEEDS.map((id, i) => `
        <div class="mp-meter is-full" data-need="${id}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="${esc(needLabel(id))}">
          <span class="mp-blob" style="--blob: var(--mp-blob-${i + 1})">
            <span class="mp-blob-ring" aria-hidden="true"></span>
            <span class="mp-blob-cup"><span class="mp-blob-fill"></span></span>
            <span class="mp-blob-ico">${icon(id, 24)}</span>
            <span class="mp-blob-badge mp-num" aria-hidden="true">!</span>
          </span>
          <span class="mp-meter-label">${esc(needLabel(id))}</span>
        </div>`).join('')}
      </div>
      <div class="mp-status" aria-live="polite">
        <div class="mp-cam-msg" hidden></div>
        <div class="mp-toast mp-hit" role="status" hidden>
          <span class="mp-toast-ico" aria-hidden="true"></span>
          <span class="mp-toast-text"></span>
          <button type="button" class="mp-iconbtn mp-iconbtn--ghost mp-toast-x" aria-label="${esc(S.closeToast)}">${icon('close', 18)}</button>
        </div>
      </div>
    </div>

    <div class="mp-bottom">
      <div class="mp-coach" role="status" aria-live="polite" hidden>${icon('hand', 20)}<span class="mp-coach-text"></span></div>
      <div class="mp-nav">
        <button type="button" class="mp-iconbtn mp-iconbtn--glass mp-prev" aria-label="${esc(S.prevRoom)}">${icon('arrow-left', 20)}</button>
        <div class="mp-dots" role="group" aria-label="${esc(S.roomsGroup)}">
          ${HUD_ROOMS.map((id) => `<button type="button" class="mp-dot" data-room="${id}" aria-label="${esc(S.rooms[id])}"><span></span></button>`).join('')}
        </div>
        <button type="button" class="mp-iconbtn mp-iconbtn--glass mp-next" aria-label="${esc(S.nextRoom)}">${icon('arrow-right', 20)}</button>
        <span class="mp-kbd" aria-hidden="true"><kbd>${icon('arrow-left', 14)}</kbd><kbd>${icon('arrow-right', 14)}</kbd><span>${esc(S.keyHint)}</span></span>
      </div>
      <div class="mp-actions">
        <div class="mp-actions-start"></div>
        <div class="mp-mic-wrap">
          <button type="button" class="mp-mic" data-state="off">
            <span class="mp-mic-ring" aria-hidden="true"></span>
            <span class="mp-mic-face"><span class="mp-mic-ico">${icon('mic', 32)}</span></span>
          </button>
          <span class="mp-mic-label" aria-hidden="true"></span>
        </div>
        <div class="mp-actions-end">
          <button type="button" class="mp-ctx" data-ctx="play"></button>
        </div>
      </div>
      <section class="mp-tray mp-hit" aria-label="${esc(S.tray)}" hidden>
        <span class="mp-tray-handle" aria-hidden="true"></span>
        <div class="mp-tray-head">
          <span class="mp-tray-title">${esc(S.tray)}</span>
          <span class="mp-tray-sub">${esc(S.traySub)}</span>
          <button type="button" class="mp-iconbtn mp-iconbtn--soft mp-tray-x" aria-label="${esc(S.trayClose)}">${icon('chevron-down', 20)}</button>
        </div>
        <div class="mp-tray-grid"></div>
      </section>
    </div>
  </div>
  <div class="mp-bubble" aria-live="polite" hidden><div class="mp-bubble-text"></div><span class="mp-bubble-tail" aria-hidden="true"></span></div>
  <div class="mp-select" role="dialog" aria-modal="true" hidden></div>`;

  const $ = (sel) => root.querySelector(sel);
  const el = {
    col: $('.mp-col'), top: $('.mp-top'),
    name: $('.mp-who-name'), roomName: $('.mp-who-room'), ava: $('.mp-who-ava img'),
    coins: $('.mp-coins'), coinN: $('.mp-coin-n'), coinPlus: $('.mp-coin-plus'),
    cam: $('.mp-cam'), gear: $('.mp-gear'), camMsg: $('.mp-cam-msg'),
    toast: $('.mp-toast'), toastIco: $('.mp-toast-ico'), toastText: $('.mp-toast-text'), toastX: $('.mp-toast-x'),
    coach: $('.mp-coach'), coachText: $('.mp-coach-text'),
    prev: $('.mp-prev'), next: $('.mp-next'), dots: [...root.querySelectorAll('.mp-dot')],
    actions: $('.mp-actions'), mic: $('.mp-mic'), micIco: $('.mp-mic-ico'), micLabel: $('.mp-mic-label'),
    ctx: $('.mp-ctx'), tray: $('.mp-tray'), trayGrid: $('.mp-tray-grid'), trayX: $('.mp-tray-x'),
    bubble: $('.mp-bubble'), bubbleText: $('.mp-bubble-text'), bubbleTail: $('.mp-bubble-tail'),
    select: $('.mp-select'),
    meters: Object.fromEntries(HUD_NEEDS.map((id) => [id, root.querySelector(`.mp-meter[data-need="${id}"]`)])),
  };

  // ---------- wiring ----------
  el.prev.addEventListener('click', () => call('onRoom', -1));
  el.next.addEventListener('click', () => call('onRoom', 1));
  el.dots.forEach((d) => d.addEventListener('click', () => call('onRoom', d.dataset.room)));
  el.gear.addEventListener('click', () => call('onSettings'));
  el.cam.addEventListener('click', () => call('onCamera'));
  el.mic.addEventListener('click', () => call('onMic'));
  el.toastX.addEventListener('click', () => hideToast());
  el.trayX.addEventListener('click', () => { state.trayOpen = false; renderRoom(); el.ctx.focus({ preventScroll: true }); });
  el.ctx.addEventListener('click', () => {
    const c = el.ctx.dataset.ctx;
    if (c === 'tray') { state.trayOpen = true; renderRoom(); return; }
    call('onAction', c);
  });
  el.trayGrid.addEventListener('pointerdown', (ev) => {
    const btn = ev.target.closest('[data-food-id]');
    if (!btn) return;
    btn.classList.add('is-lifted');
    const done = () => {
      btn.classList.remove('is-lifted');
      window.removeEventListener('pointerup', done);
      window.removeEventListener('pointercancel', done);
    };
    window.addEventListener('pointerup', done);
    window.addEventListener('pointercancel', done);
    call('onFoodPointerDown', btn.dataset.foodId, ev);
  });

  // Cached geometry for placeBubble (no layout reads per frame).
  const geo = { vw: window.innerWidth, vh: window.innerHeight, minTop: 0 };
  const measure = () => {
    geo.vw = window.innerWidth; geo.vh = window.innerHeight;
    const r = el.top.getBoundingClientRect();
    geo.minTop = Math.min(r.bottom + 8, geo.vh * 0.4);
    if (state.bubble.on) sizeBubble();
  };
  window.addEventListener('resize', measure);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(el.top);

  // ---------- renderers ----------
  function renderRoom() {
    const room = state.room;
    root.setAttribute('data-room', room);
    el.roomName.textContent = S.rooms[room] || '';
    el.dots.forEach((d) => {
      const on = d.dataset.room === room;
      d.classList.toggle('is-on', on);
      if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    const trayShown = room === 'kitchen' && state.trayOpen;
    el.tray.hidden = !trayShown;
    el.actions.hidden = trayShown;
    let ctx = null;
    if (room === 'living') ctx = { id: 'play', ico: 'fun', text: S.play, kind: 'outline' };
    else if (room === 'kitchen') ctx = { id: 'tray', ico: 'hunger', text: S.tray, kind: 'outline' };
    else if (room === 'bathroom' && state.flush) ctx = { id: 'flush', ico: 'flush', text: S.flush, kind: 'primary' };
    el.ctx.hidden = !ctx;
    if (ctx) {
      el.ctx.dataset.ctx = ctx.id;
      el.ctx.className = `mp-ctx mp-ctx--${ctx.kind}`;
      el.ctx.innerHTML = `${icon(ctx.ico, 22)}<span>${esc(ctx.text)}</span>`;
    }
  }

  function renderMic() {
    const m = S.mic[state.mic] || S.mic.off;
    el.mic.dataset.state = state.mic;
    el.mic.setAttribute('aria-label', m.aria(state.char.name));
    el.mic.setAttribute('aria-pressed', String(state.mic !== 'off'));
    el.micLabel.textContent = m.label;
    const ico = state.mic === 'recording' ? 'stop' : state.mic === 'playing' ? 'wave' : 'mic';
    el.micIco.innerHTML = icon(ico, state.mic === 'recording' ? 30 : 32);
  }

  function setCamMsg(text, autoHideMs) {
    clearTimeout(state.camMsgTimer);
    el.camMsg.textContent = text || '';
    el.camMsg.hidden = !text;
    el.camMsg.dataset.state = state.camera;
    if (text && autoHideMs) state.camMsgTimer = setTimeout(() => { el.camMsg.hidden = true; }, autoHideMs);
  }

  function hideToast() {
    clearTimeout(state.toastTimer);
    el.toast.classList.remove('is-in');
    el.toast.hidden = true;
  }

  function sizeBubble() {
    const b = state.bubble;
    b.w = el.bubble.offsetWidth; b.h = el.bubble.offsetHeight;
    positionBubble();
  }
  function positionBubble() {
    const b = state.bubble;
    if (!b.on || b.x < 0) return;
    const p = clampBubble(b.x, b.y, b.w, b.h, { vw: geo.vw, vh: geo.vh, minTop: geo.minTop, margin: 12 });
    el.bubble.style.transform = `translate3d(${Math.round(p.left)}px, ${Math.round(p.top)}px, 0)`;
    el.bubbleTail.style.left = `${Math.round(p.tail)}px`;
  }

  function renderSelect(chars, currentKey) {
    const sel = state.select;
    const s = S.select;
    const cards = chars.map((c) => {
      const locked = !!c.locked;
      const on = sel.chosen === c.key;
      const role = locked ? (c.role || s.lockedRole) : (c.role || '');
      const label = locked ? `${c.name} ${s.soon}` : `${c.name} ${role} ${c.mbti || ''}${c.key === currentKey ? ' ' + s.current : ''}`;
      return `
      <button type="button" class="mp-card${on ? ' is-on' : ''}${locked ? ' is-locked' : ''}" role="radio" aria-checked="${on}" ${locked ? 'aria-disabled="true"' : ''} data-key="${esc(c.key)}" aria-label="${esc(label.trim())}">
        <span class="mp-card-pic" style="background:${CARD_TINT[c.key] || '#F2F1FB'}">
          <img alt="" src="${portrait(c.key)}">
          ${locked ? `<span class="mp-card-soon">${icon('lock', 14)}${esc(s.soon)}</span>` : ''}
          ${on ? `<span class="mp-card-check" aria-hidden="true">${icon('check', 16)}</span>` : ''}
        </span>
        <span class="mp-card-row"><span class="mp-card-name">${esc(c.name)}</span>${!locked && c.mbti ? `<span class="mp-card-mbti mp-num">${esc(c.mbti)}</span>` : ''}</span>
        <span class="mp-card-role">${esc(role)}</span>
      </button>`;
    }).join('');
    const chosen = chars.find((c) => c.key === sel.chosen);
    el.select.setAttribute('aria-label', s.title);
    el.select.innerHTML = `
      <div class="mp-select-panel">
        <div class="mp-select-head">
          <div class="mp-select-titles">
            <span class="mp-select-brand mp-num">${esc(s.brand)}</span>
            <h1 class="mp-select-title">${esc(s.title)}</h1>
            <p class="mp-select-sub">${esc(s.sub)}</p>
          </div>
          ${sel.closable ? `<button type="button" class="mp-iconbtn mp-select-x" aria-label="${esc(s.close)}">${icon('close', 20)}</button>` : ''}
        </div>
        <div class="mp-cards" role="radiogroup" aria-label="${esc(s.group)}">${cards}</div>
        <div class="mp-select-foot">
          <button type="button" class="mp-btn-primary mp-select-go" ${chosen ? '' : 'disabled'}>${esc(chosen ? s.confirm(chosen.name) : s.confirm(''))}</button>
        </div>
      </div>`;
  }

  function onSelectClick(ev) {
    const sel = state.select;
    if (!sel) return;
    if (ev.target.closest('.mp-select-x')) { api.hideSelect(); return; }
    if (ev.target.closest('.mp-select-go')) { if (sel.chosen) call('onSelect', sel.chosen); return; }
    const card = ev.target.closest('.mp-card');
    if (!card || card.classList.contains('is-locked')) return;
    sel.chosen = card.dataset.key;
    renderSelect(sel.chars, sel.current);
    const again = el.select.querySelector(`.mp-card[data-key="${CSS.escape(sel.chosen)}"]`);
    if (again) again.focus({ preventScroll: true });
  }
  function onSelectKey(ev) {
    if (ev.key === 'Escape' && state.select && state.select.closable) api.hideSelect();
  }
  el.select.addEventListener('click', onSelectClick);
  el.select.addEventListener('keydown', onSelectKey);

  // ---------- public API ----------
  const api = {
    /** @param {{hunger?:number, toilet?:number, fun?:number, social?:number}} needs 0..1 */
    setNeeds(needs = {}) {
      for (const id of HUD_NEEDS) {
        if (!(id in needs)) continue;
        const v = clamp01(needs[id]);
        state.needs[id] = v;
        const m = el.meters[id];
        const st = needState(v, thresholds(id));
        const pct = Math.round(v * 100);
        m.className = `mp-meter is-${st}`;
        m.style.setProperty('--level', String(v));
        m.setAttribute('aria-valuenow', String(pct));
        m.setAttribute('aria-valuetext', S.percent(pct) + (st === 'low' ? ` ${S.low}` : st === 'urgent' ? ` ${S.urgent}` : ''));
      }
    },

    /** @param {number} n coin count */
    setCoins(n) {
      const v = Math.max(0, Math.floor(Number(n) || 0));
      const prev = state.coins;
      state.coins = v;
      const txt = v.toLocaleString('en-US');
      el.coinN.textContent = txt;
      el.coins.setAttribute('aria-label', S.coins(txt));
      if (prev !== null && v > prev) {
        el.coinPlus.textContent = `+${(v - prev).toLocaleString('en-US')}`;
        el.coinPlus.classList.remove('is-up'); void el.coinPlus.offsetWidth; el.coinPlus.classList.add('is-up');
      }
    },

    /** @param {'living'|'kitchen'|'bathroom'} id */
    setRoom(id) {
      if (!HUD_ROOMS.includes(id)) return;
      if (id !== state.room && id === 'kitchen') state.trayOpen = true;
      state.room = id;
      renderRoom();
    },

    /** @param {{key:string, name:string}} c */
    setCharacter(c = {}) {
      state.char = { key: c.key || state.char.key, name: c.name || state.char.name };
      el.name.textContent = state.char.name;
      el.ava.src = portrait(state.char.key);
      renderMic();
    },

    /**
     * Show a speech bubble above the pet. Position it with placeBubble.
     * @param {string} text
     * @param {number} [ms] display time; default 1.5 s + reading time
     */
    say(text, ms) {
      const b = state.bubble;
      clearTimeout(b.timer);
      if (!text) { el.bubble.hidden = true; b.on = false; return; }
      el.bubbleText.textContent = text;
      el.bubble.hidden = false;
      el.bubble.classList.remove('is-in'); void el.bubble.offsetWidth; el.bubble.classList.add('is-in');
      b.on = true;
      sizeBubble();
      const dur = ms ?? Math.max(1800, 1500 + String(text).length * 70);
      b.timer = setTimeout(() => { el.bubble.hidden = true; b.on = false; }, dur);
    },

    /** Screen px of the pet's head top; call every frame. Cheap: no layout reads. */
    placeBubble(x, y) {
      state.bubble.x = x; state.bubble.y = y;
      positionBubble();
    },

    /**
     * Toast under the need meters.
     * @param {string} text
     * @param {number} [ms=4000]
     * @param {{icon?: string, tone?: 'warn'|'info'}} [opts] optional extension: need/line icon name and tone
     */
    toast(text, ms = 4000, opts = {}) {
      clearTimeout(state.toastTimer);
      if (!text) { hideToast(); return; }
      const tone = opts.tone || (opts.icon ? 'warn' : 'info');
      el.toast.dataset.tone = tone;
      el.toastIco.innerHTML = opts.icon ? icon(opts.icon, 22) : '';
      el.toastIco.hidden = !opts.icon;
      el.toastText.textContent = text;
      el.toast.hidden = false;
      el.toast.classList.remove('is-in'); void el.toast.offsetWidth; el.toast.classList.add('is-in');
      state.toastTimer = setTimeout(hideToast, ms);
    },

    /** @param {string|null} text coach mark, null hides it */
    coach(text) {
      el.coachText.textContent = text || '';
      el.coach.hidden = !text;
    },

    /** @param {'off'|'listening'|'recording'|'playing'} s */
    setMic(s) {
      state.mic = S.mic[s] ? s : 'off';
      renderMic();
    },

    /**
     * @param {'off'|'loading'|'on'|'error'} s
     * @param {string} [message] shown under the meters; default copy per state, '' hides it
     */
    setCamera(s, message) {
      state.camera = S.camera[s] ? s : 'off';
      const c = S.camera[state.camera];
      el.cam.dataset.state = state.camera;
      el.cam.setAttribute('aria-label', c.aria);
      el.cam.setAttribute('aria-pressed', String(state.camera === 'on'));
      el.cam.setAttribute('aria-busy', String(state.camera === 'loading'));
      el.cam.querySelector('.mp-ico').outerHTML = icon(state.camera === 'error' ? 'camera-off' : 'camera', 22);
      const msg = message ?? c.msg;
      setCamMsg(msg, state.camera === 'on' ? 4000 : state.camera === 'off' ? 2500 : 0);
    },

    /** @param {{id:string, name:string}[]} foods kitchen tray contents */
    setFoods(foods = []) {
      el.trayGrid.style.setProperty('--n', String(Math.max(1, foods.length)));
      el.trayGrid.innerHTML = foods.map((f) => `
        <button type="button" class="mp-food" data-food-id="${esc(f.id)}" aria-label="${esc(f.name)}">
          ${foodIcon(f.id, 44)}<span class="mp-food-name">${esc(f.name)}</span>
        </button>`).join('');
    },

    /** @param {boolean} on show the flush button (bathroom, pet seated) */
    setFlushVisible(on) {
      state.flush = !!on;
      renderRoom();
    },

    /**
     * Character select overlay.
     * @param {{key:string, name:string, role?:string, mbti?:string, locked?:boolean}[]} chars
     * @param {string} [currentKey] current character; when set, the overlay can be closed
     */
    showSelect(chars = [], currentKey) {
      const firstOpen = !state.select;
      state.select = {
        chars, current: currentKey, closable: !!currentKey,
        chosen: chars.some((c) => c.key === currentKey && !c.locked) ? currentKey : null,
        returnFocus: firstOpen ? document.activeElement : state.select.returnFocus,
      };
      renderSelect(chars, currentKey);
      el.select.hidden = false;
      root.classList.add('is-selecting');
      el.col.setAttribute('aria-hidden', 'true');
      el.col.inert = true;
      const f = el.select.querySelector('.mp-card[aria-checked="true"]') || el.select.querySelector('.mp-card:not(.is-locked)');
      if (f) f.focus({ preventScroll: true });
    },

    hideSelect() {
      if (!state.select) return;
      const rf = state.select.returnFocus;
      state.select = null;
      el.select.hidden = true;
      el.select.innerHTML = '';
      root.classList.remove('is-selecting');
      el.col.removeAttribute('aria-hidden');
      el.col.inert = false;
      if (rf && rf.focus && document.contains(rf)) rf.focus({ preventScroll: true });
    },

    /**
     * Food under a screen point (used by hand tracking). Rect based, so it works
     * even when another layer sits above the HUD.
     * @returns {string|null} food id
     */
    foodElementAt(x, y) {
      if (el.tray.hidden || state.select) return null;
      for (const b of el.trayGrid.querySelectorAll('[data-food-id]')) {
        const r = b.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return b.dataset.foodId;
      }
      return null;
    },

    /** @returns {boolean} true when (x, y) is over an interactive HUD element */
    isHudPoint(x, y) {
      const t = document.elementFromPoint(x, y);
      return !!t && t !== root && root.contains(t);
    },

    /** Remove listeners and DOM. */
    dispose() {
      window.removeEventListener('resize', measure);
      clearTimeout(state.toastTimer); clearTimeout(state.camMsgTimer); clearTimeout(state.bubble.timer);
      root.innerHTML = '';
      root.classList.remove('mp-hud', 'is-selecting');
    },
  };

  // initial paint
  api.setCharacter(state.char);
  el.coinN.textContent = '0';
  el.coins.setAttribute('aria-label', S.coins('0'));
  api.setNeeds({ hunger: 1, toilet: 1, fun: 1, social: 1 });
  api.setCamera('off', '');
  renderMic();
  renderRoom();
  requestAnimationFrame(measure);
  return api;
}
