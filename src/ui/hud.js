/**
 * Moldable Pet — in-game HUD (owner: glaze). Stories S1-04, S2-01..04, S2-08.
 *
 * Implements "HUD — glaze" + "Sprint 2 additions" in docs/architecture/module-contracts.md.
 * Display only: the HUD never changes game state; it reports intent through the
 * handlers passed to createHUD and shows what wire tells it to show.
 *
 * Needs `tokens.css` and `hud.css` to be loaded by the page.
 *
 * ── Sprint 2 API changes (for wire) ─────────────────────────────────────────
 * Removed   onSettings (the gear is gone). Transitional: if onCharacterChip is not
 *           given, the chip falls back to onSettings so an old main.js keeps working.
 * Handlers  onCharacterChip()            character chip (avatar + name, top-left)
 *           onWardrobe()                 "แต่งตัว" button (living room)
 *           onWardrobeClose()            optional: the sheet closed itself (X, Escape)
 *           onEquip(slot, idOrNull)      tap an owned item / "ถอด"
 *           onBuy(id)                    confirmed inside the sheet
 *           onCameraView(hidden)         camera on: "ซ่อนภาพกล้อง / แสดงภาพกล้อง"
 *           onMinigameExit(), onMinigameAgain()
 *           onMinigameTick(n)            optional: countdown 3, 2, 1, then 0 = go (for sfx tick/go)
 * Methods   setCameraView(hidden)        reflect the saved choice; the toggle waits for it
 *           showWardrobe(data), hideWardrobe(), updateWardrobe(partial)
 *           startMinigame({ title, durationSec, countdown = 3 }) → Promise resolved at "go"
 *           updateMinigame({ score, timeLeft, streak, coins }), showMinigameResult({ score, best, coins }),
 *           endMinigame()
 *           setCoins(n) now counts up/down with a "+N"/"−N" float (instant with reduced motion).
 *
 * ── Toilet flow (S2-03) — one control at a time ─────────────────────────────
 * Chosen rule: `setFlushVisible(true)` is the "sitting" stage. It clears the coach mark,
 * hides room navigation and shows ONE centred primary "กดชักโครก" button. While it is
 * visible, `coach(text)` calls are ignored, so a coach and the button never show together.
 * `setFlushVisible(false)` returns to normal (coach stays cleared until the next coach()).
 * Before sitting wire shows `coach('ลากตัวไปที่ชักโครก')` only (no button). No new method.
 *
 * @module ui/hud
 */
import { icon, foodIcon, accessoryIcon } from './icons.js';

/** Room ids in swipe order (matches ROOM_IDS in src/rooms). */
export const HUD_ROOMS = ['living', 'kitchen', 'bathroom'];

/** Need ids in display order. */
export const HUD_NEEDS = ['hunger', 'toilet', 'fun', 'social'];

/** Wardrobe slots in display order (contract). */
export const HUD_SLOTS = ['head', 'eyes', 'body'];

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
  chip: (n) => `เปลี่ยนตัวละคร ตอนนี้คือ${n}`,
  prevRoom: 'ห้องก่อนหน้า',
  nextRoom: 'ห้องถัดไป',
  roomsGroup: 'ห้อง',
  keyHint: 'เปลี่ยนห้อง',
  play: 'เล่น',
  wardrobe: 'แต่งตัว',
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
  cameraView: { hide: 'ซ่อนภาพกล้อง', show: 'แสดงภาพกล้อง' },
  select: {
    brand: 'Moldable Pet',
    title: 'เลือกเพื่อนก้อนนุ่ม',
    sub: 'เลือกได้ 1 ตัว เปลี่ยนทีหลังได้ที่มุมซ้ายบน',
    group: 'ตัวละคร',
    soon: 'เร็วๆ นี้',
    lockedRole: 'ยังไม่มีนิสัย',
    confirm: (n) => `เลือก${n}`,
    close: 'ปิด',
    current: 'เลือกอยู่',
  },
  ward: {
    title: 'แต่งตัว',
    close: 'ปิดตู้เสื้อผ้า',
    slots: { head: 'หัว', eyes: 'ตา', body: 'ตัว' },
    none: 'ถอด',
    noneEmpty: 'ว่างอยู่',
    owned: 'มีแล้ว',
    wearing: 'ใส่อยู่',
    likes: (n) => `${n}ชอบ`,
    price: (p) => `${p} เหรียญ`,
    ask: (name) => `ซื้อ${name}เลยไหม`,
    after: (left) => `ซื้อแล้วเหลือ ${left} เหรียญ`,
    short: (need) => `เหรียญยังไม่พอ ขาดอีก ${need}`,
    earn: 'เล่นฝนขนมเพื่อรับเหรียญเพิ่ม',
    buy: 'ซื้อ',
    cancel: 'ยกเลิก',
    itemAria: (name, meta) => `${name} ${meta}`,
  },
  game: {
    title: 'ฝนขนม',
    exit: 'ออกจากเกม',
    score: 'คะแนน',
    streak: 'ติดกัน',
    secs: (s) => `${s} วินาที`,
    go: 'เริ่ม!',
    hintTouch: 'ลากนิ้วซ้ายขวาเพื่อรับขนม',
    hintMouse: 'ขยับเมาส์หรือกดลูกศรซ้ายขวาเพื่อรับขนม',
    resultTitle: 'จบรอบแล้ว',
    newBest: 'สถิติใหม่!',
    best: 'สถิติสูงสุด',
    coins: 'เหรียญที่ได้',
    again: 'เล่นอีกครั้ง',
    back: 'กลับห้อง',
  },
};

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
const int0 = (v) => Math.max(0, Math.floor(Number(v) || 0));
const fmt = (n) => Number(n).toLocaleString('en-US');
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
 * State of one wardrobe item for display. Pure, unit-testable.
 * @param {{id:string, slot:string, price?:number}} item
 * @param {{owned:Set<string>|string[], outfit:object, coins:number}} w
 * @returns {{owned:boolean, equipped:boolean, affordable:boolean}}
 */
export function wardrobeItemState(item, w) {
  const owned = w.owned instanceof Set ? w.owned.has(item.id) : (w.owned || []).includes(item.id);
  const equipped = !!w.outfit && w.outfit[item.slot] === item.id;
  return { owned, equipped, affordable: owned || int0(w.coins) >= int0(item.price) };
}

/**
 * Create the HUD inside `root` (normally `<div id="hud">`).
 *
 * @param {HTMLElement} root container that covers the viewport
 * @param {object} handlers see the API list at the top of this file
 * @param {(dirOrId: -1|1|string) => void} [handlers.onRoom]
 * @param {(id: 'flush'|'play') => void} [handlers.onAction]
 * @param {() => void} [handlers.onMic]
 * @param {() => void} [handlers.onCamera]
 * @param {(hidden: boolean) => void} [handlers.onCameraView]
 * @param {() => void} [handlers.onCharacterChip]
 * @param {(charKey: string) => void} [handlers.onSelect]
 * @param {(foodId: string, ev: PointerEvent) => void} [handlers.onFoodPointerDown]
 * @param {() => void} [handlers.onWardrobe]
 * @param {() => void} [handlers.onWardrobeClose]
 * @param {(slot: string, id: string|null) => void} [handlers.onEquip]
 * @param {(id: string) => void} [handlers.onBuy]
 * @param {() => void} [handlers.onMinigameExit]
 * @param {() => void} [handlers.onMinigameAgain]
 * @param {(n: number) => void} [handlers.onMinigameTick]
 * @param {object} [options] optional, not part of the contract
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
  const mq = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : { matches: false });
  const reducedMotion = mq('(prefers-reduced-motion: reduce)');
  const finePointer = mq('(hover: hover) and (pointer: fine)');
  const coinDot = '<span class="mp-coin-dot" aria-hidden="true"><span></span></span>';

  const state = {
    room: 'living', char: { key: 'flower', name: 'ไผ่' }, mic: 'off', camera: 'off', camHidden: false,
    coins: null, coinShown: 0, coinRaf: 0, flush: false, trayOpen: true, needs: {}, coachText: null,
    bubble: { on: false, x: -1, y: -1, w: 0, h: 0, timer: 0 },
    toastTimer: 0, camMsgTimer: 0, select: null, ward: null, game: null,
  };

  root.classList.add('mp-hud');
  root.setAttribute('data-room', state.room);
  root.innerHTML = `
  <div class="mp-col">
    <div class="mp-top">
      <div class="mp-bar">
        <button type="button" class="mp-who">
          <span class="mp-who-ava"><img alt="" src="${portrait('flower')}"></span>
          <span class="mp-who-text"><span class="mp-who-name"></span><span class="mp-who-room"></span></span>
          <span class="mp-who-more">${icon('chevron-down', 16)}</span>
        </button>
        <div class="mp-bar-end">
          <div class="mp-coins mp-hit" role="group">
            ${coinDot}
            <span class="mp-coin-n mp-num">0</span>
            <span class="mp-coin-plus mp-num" aria-hidden="true"></span>
          </div>
          <button type="button" class="mp-iconbtn mp-cam" data-state="off" aria-pressed="false">${icon('camera', 22)}<span class="mp-cam-spin" aria-hidden="true"></span></button>
        </div>
      </div>
      <div class="mp-meters mp-hit">
        ${HUD_NEEDS.map((id, i) => `
        <div class="mp-meter is-full" data-need="${id}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="${esc(needLabel(id))}">
          <span class="mp-blob" style="--blob: var(--mp-blob-${i + 1})">
            <span class="mp-blob-ring" aria-hidden="true"></span>
            <span class="mp-blob-cup" aria-hidden="true"><span class="mp-blob-ico">${icon(id, 24)}</span></span>
            <span class="mp-blob-fill" aria-hidden="true"><span class="mp-blob-ico">${icon(id, 24)}</span></span>
            <span class="mp-blob-badge mp-num" aria-hidden="true">!</span>
          </span>
          <span class="mp-meter-label">${esc(needLabel(id))}</span>
        </div>`).join('')}
      </div>
      <div class="mp-status" aria-live="polite">
        <button type="button" class="mp-camview" hidden></button>
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
      <div class="mp-flush-row" hidden>
        <button type="button" class="mp-btn-primary mp-flush">${icon('flush', 22)}<span>${esc(S.flush)}</span></button>
      </div>
      <div class="mp-nav">
        <button type="button" class="mp-iconbtn mp-iconbtn--glass mp-prev" aria-label="${esc(S.prevRoom)}">${icon('arrow-left', 20)}</button>
        <div class="mp-dots" role="group" aria-label="${esc(S.roomsGroup)}">
          ${HUD_ROOMS.map((id) => `<button type="button" class="mp-dot" data-room="${id}" aria-label="${esc(S.rooms[id])}"><span></span></button>`).join('')}
        </div>
        <button type="button" class="mp-iconbtn mp-iconbtn--glass mp-next" aria-label="${esc(S.nextRoom)}">${icon('arrow-right', 20)}</button>
        <span class="mp-kbd" aria-hidden="true"><kbd>${icon('arrow-left', 14)}</kbd><kbd>${icon('arrow-right', 14)}</kbd><span>${esc(S.keyHint)}</span></span>
      </div>
      <div class="mp-actions">
        <div class="mp-actions-start">
          <button type="button" class="mp-ctx mp-ctx--outline mp-ward-btn" hidden>${icon('shirt', 22)}<span>${esc(S.wardrobe)}</span></button>
        </div>
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
  <section class="mp-ward" role="dialog" aria-modal="false" aria-label="${esc(S.ward.title)}" hidden></section>
  <div class="mp-game" hidden>
    <div class="mp-game-col">
      <div class="mp-game-top">
        <button type="button" class="mp-iconbtn mp-game-x" aria-label="${esc(S.game.exit)}">${icon('close', 20)}</button>
        <div class="mp-game-mid">
          <div class="mp-game-title"></div>
          <div class="mp-game-time" role="progressbar" aria-valuemin="0"><span class="mp-game-time-fill"></span></div>
        </div>
        <div class="mp-game-score"><span class="mp-game-score-l">${esc(S.game.score)}</span><span class="mp-game-score-n mp-num">0</span></div>
      </div>
      <div class="mp-game-sub">
        <span class="mp-game-coins">${coinDot}<span class="mp-num mp-game-coins-n">+0</span></span>
        <span class="mp-game-streak" hidden>${icon('star', 16)}<span></span></span>
        <span class="mp-game-secs">${icon('timer', 16)}<span class="mp-num"></span></span>
      </div>
      <div class="mp-game-center">
        <div class="mp-game-count" aria-live="assertive" hidden><span class="mp-num"></span></div>
        <div class="mp-game-hint" hidden></div>
      </div>
      <section class="mp-result" role="dialog" aria-modal="true" hidden></section>
    </div>
  </div>
  <div class="mp-select" role="dialog" aria-modal="true" hidden></div>`;

  const $ = (sel) => root.querySelector(sel);
  const el = {
    col: $('.mp-col'), top: $('.mp-top'), bottom: $('.mp-bottom'),
    who: $('.mp-who'), name: $('.mp-who-name'), roomName: $('.mp-who-room'), ava: $('.mp-who-ava img'),
    coins: $('.mp-coins'), coinN: $('.mp-coin-n'), coinPlus: $('.mp-coin-plus'),
    cam: $('.mp-cam'), camView: $('.mp-camview'), camMsg: $('.mp-cam-msg'),
    toast: $('.mp-toast'), toastIco: $('.mp-toast-ico'), toastText: $('.mp-toast-text'), toastX: $('.mp-toast-x'),
    coach: $('.mp-coach'), coachText: $('.mp-coach-text'),
    flushRow: $('.mp-flush-row'), flush: $('.mp-flush'),
    prev: $('.mp-prev'), next: $('.mp-next'), dots: [...root.querySelectorAll('.mp-dot')],
    actions: $('.mp-actions'), mic: $('.mp-mic'), micIco: $('.mp-mic-ico'), micLabel: $('.mp-mic-label'),
    ctx: $('.mp-ctx[data-ctx]'), wardBtn: $('.mp-ward-btn'),
    tray: $('.mp-tray'), trayGrid: $('.mp-tray-grid'), trayX: $('.mp-tray-x'),
    bubble: $('.mp-bubble'), bubbleText: $('.mp-bubble-text'), bubbleTail: $('.mp-bubble-tail'),
    ward: $('.mp-ward'),
    game: $('.mp-game'), gameX: $('.mp-game-x'), gameTitle: $('.mp-game-title'), gameTime: $('.mp-game-time'),
    gameTimeFill: $('.mp-game-time-fill'), gameScore: $('.mp-game-score-n'), gameCoins: $('.mp-game-coins-n'),
    gameStreak: $('.mp-game-streak'), gameSecs: $('.mp-game-secs .mp-num'), gameCount: $('.mp-game-count'),
    gameHint: $('.mp-game-hint'), result: $('.mp-result'),
    select: $('.mp-select'),
    meters: Object.fromEntries(HUD_NEEDS.map((id) => [id, root.querySelector(`.mp-meter[data-need="${id}"]`)])),
  };

  // ---------- wiring ----------
  el.prev.addEventListener('click', () => call('onRoom', -1));
  el.next.addEventListener('click', () => call('onRoom', 1));
  el.dots.forEach((d) => d.addEventListener('click', () => call('onRoom', d.dataset.room)));
  el.who.addEventListener('click', () => {
    if (handlers.onCharacterChip) call('onCharacterChip');
    else call('onSettings'); // transitional fallback for a Sprint 1 main.js
  });
  el.cam.addEventListener('click', () => call('onCamera'));
  el.camView.addEventListener('click', () => call('onCameraView', !state.camHidden));
  el.mic.addEventListener('click', () => call('onMic'));
  el.toastX.addEventListener('click', () => hideToast());
  el.flush.addEventListener('click', () => call('onAction', 'flush'));
  el.wardBtn.addEventListener('click', () => call('onWardrobe'));
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
  el.gameX.addEventListener('click', () => call('onMinigameExit'));

  // Cached geometry for placeBubble (no layout reads per frame).
  const geo = { vw: window.innerWidth, vh: window.innerHeight, minTop: 0 };
  const measure = () => {
    geo.vw = window.innerWidth; geo.vh = window.innerHeight;
    const r = (state.game ? $('.mp-game-top') : el.top).getBoundingClientRect();
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
    const sitting = room === 'bathroom' && state.flush;
    root.classList.toggle('is-flush', sitting);
    el.flushRow.hidden = !sitting;
    el.wardBtn.hidden = room !== 'living';
    let ctx = null;
    if (room === 'living') ctx = { id: 'play', ico: 'fun', text: S.play, kind: 'outline' };
    else if (room === 'kitchen') ctx = { id: 'tray', ico: 'hunger', text: S.tray, kind: 'outline' };
    el.ctx.hidden = !ctx;
    if (ctx) {
      el.ctx.dataset.ctx = ctx.id;
      el.ctx.className = `mp-ctx mp-ctx--${ctx.kind}`;
      el.ctx.innerHTML = `${icon(ctx.ico, 22)}<span>${esc(ctx.text)}</span>`;
    }
    renderCoach();
  }

  function renderCoach() {
    const text = root.classList.contains('is-flush') ? null : state.coachText;
    el.coachText.textContent = text || '';
    el.coach.hidden = !text;
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

  function renderCamView() {
    const on = state.camera === 'on';
    el.camView.hidden = !on;
    if (!on) return;
    const text = state.camHidden ? S.cameraView.show : S.cameraView.hide;
    el.camView.dataset.hidden = String(state.camHidden);
    el.camView.innerHTML = `${icon(state.camHidden ? 'eye' : 'eye-off', 20)}<span>${esc(text)}</span>`;
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

  /** Re-trigger a CSS animation class. */
  function bump(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

  function paintCoins(n) { el.coinN.textContent = fmt(Math.round(n)); }
  function animateCoins(from, to) {
    cancelAnimationFrame(state.coinRaf);
    if (reducedMotion.matches || typeof requestAnimationFrame !== 'function') { state.coinShown = to; paintCoins(to); return; }
    const t0 = performance.now();
    const dur = Math.min(900, 380 + Math.abs(to - from) * 12);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - k) ** 3;
      state.coinShown = from + (to - from) * e;
      paintCoins(state.coinShown);
      if (k < 1) state.coinRaf = requestAnimationFrame(step);
    };
    state.coinRaf = requestAnimationFrame(step);
  }

  // ---------- character select ----------
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
        <span class="mp-card-pic" style="background:var(--mp-tint-${esc(c.key)}, var(--mp-bg-light))">
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
  el.select.addEventListener('click', onSelectClick);
  el.select.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && state.select && state.select.closable) api.hideSelect();
  });

  // ---------- wardrobe (S2-08) ----------
  function slotLabel(slot) {
    const w = state.ward;
    return (w.slots && w.slots[slot] && w.slots[slot].label) || S.ward.slots[slot] || slot;
  }
  function slotOrder() {
    const w = state.ward;
    const keys = w.slots ? Object.keys(w.slots) : [];
    return keys.length ? keys : HUD_SLOTS;
  }

  function renderWardrobe(focusSel) {
    const w = state.ward;
    if (!w) return;
    const s = S.ward;
    const slots = slotOrder();
    if (!slots.includes(w.tab)) w.tab = slots[0];
    const items = (w.items || []).filter((it) => it.slot === w.tab);
    const equippedId = w.outfit ? w.outfit[w.tab] || null : null;
    const charName = state.char.name;

    const tabs = slots.map((slot) => {
      const on = slot === w.tab;
      const worn = w.outfit && w.outfit[slot];
      return `<button type="button" class="mp-ward-tab${on ? ' is-on' : ''}" role="tab" id="mp-ward-tab-${slot}" aria-controls="mp-ward-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-slot="${esc(slot)}">
        <span>${esc(slotLabel(slot))}</span>${worn ? '<span class="mp-ward-tab-dot" aria-hidden="true"></span>' : ''}</button>`;
    }).join('');

    let body;
    const confirmItem = w.confirm && (w.items || []).find((it) => it.id === w.confirm);
    if (confirmItem) {
      const price = int0(confirmItem.price);
      const coins = int0(w.coins);
      const ok = coins >= price;
      body = `
        <div class="mp-buy" role="group" aria-labelledby="mp-buy-q">
          <span class="mp-buy-pic">${accessoryIcon(confirmItem.id, 56)}</span>
          <div class="mp-buy-text">
            <p class="mp-buy-q" id="mp-buy-q">${esc(s.ask(confirmItem.name))}</p>
            <p class="mp-buy-price">${coinDot}<span class="mp-num">${fmt(price)}</span></p>
            ${ok ? `<p class="mp-buy-sub">${esc(s.after(fmt(coins - price)))}</p>`
              : `<p class="mp-buy-sub is-short">${esc(s.short(fmt(price - coins)))}</p><p class="mp-buy-sub">${esc(s.earn)}</p>`}
          </div>
          <div class="mp-buy-actions">
            <button type="button" class="mp-btn-outline mp-buy-no">${esc(s.cancel)}</button>
            <button type="button" class="mp-btn-primary mp-buy-yes" ${ok ? '' : 'disabled'}>${esc(s.buy)} <span class="mp-num">${fmt(price)}</span></button>
          </div>
        </div>`;
    } else {
      const tiles = [`
        <button type="button" class="mp-item mp-item--none${equippedId ? '' : ' is-on'}" data-id="" aria-pressed="${!equippedId}" aria-label="${esc(s.itemAria(s.none, equippedId ? '' : s.noneEmpty))}">
          <span class="mp-item-pic">${icon('none', 28)}</span>
          <span class="mp-item-name">${esc(s.none)}</span>
          <span class="mp-item-meta">${equippedId ? '&nbsp;' : esc(s.noneEmpty)}</span>
        </button>`];
      for (const it of items) {
        const st = wardrobeItemState(it, w);
        const liked = Array.isArray(it.likes) && it.likes.includes(w.charKey);
        const metaText = st.equipped ? s.wearing : st.owned ? s.owned : s.price(fmt(int0(it.price)));
        const meta = st.equipped ? `${icon('check', 14)}<span>${esc(s.wearing)}</span>`
          : st.owned ? `<span>${esc(s.owned)}</span>`
          : `${coinDot}<span class="mp-num">${fmt(int0(it.price))}</span>`;
        tiles.push(`
        <button type="button" class="mp-item${st.equipped ? ' is-on' : ''}${st.owned ? ' is-owned' : ''}${st.affordable ? '' : ' is-short'}" data-id="${esc(it.id)}" aria-pressed="${st.equipped}" aria-label="${esc(s.itemAria(it.name, metaText + (liked ? ' ' + s.likes(charName) : '')))}">
          <span class="mp-item-pic">${accessoryIcon(it.id, 40)}${liked ? `<span class="mp-item-like" title="${esc(s.likes(charName))}">${icon('heart', 12)}</span>` : ''}</span>
          <span class="mp-item-name">${esc(it.name)}</span>
          <span class="mp-item-meta">${meta}</span>
        </button>`);
      }
      body = `<div class="mp-items">${tiles.join('')}</div>`;
    }

    el.ward.innerHTML = `
      <div class="mp-ward-panel">
        <div class="mp-ward-head">
          <h2 class="mp-ward-title">${esc(s.title)}</h2>
          <span class="mp-ward-coins" aria-label="${esc(S.coins(fmt(int0(w.coins))))}">${coinDot}<span class="mp-num">${fmt(int0(w.coins))}</span></span>
          <button type="button" class="mp-iconbtn mp-iconbtn--soft mp-ward-x" aria-label="${esc(s.close)}">${icon('close', 20)}</button>
        </div>
        <div class="mp-ward-tabs" role="tablist" aria-label="${esc(s.title)}">${tabs}</div>
        <div class="mp-ward-body" id="mp-ward-panel" role="tabpanel" aria-labelledby="mp-ward-tab-${esc(w.tab)}">${body}</div>
      </div>`;
    if (focusSel) {
      const f = el.ward.querySelector(focusSel);
      if (f) f.focus({ preventScroll: true });
    }
  }

  el.ward.addEventListener('click', (ev) => {
    const w = state.ward;
    if (!w) return;
    if (ev.target.closest('.mp-ward-x')) { api.hideWardrobe(); call('onWardrobeClose'); return; }
    const tab = ev.target.closest('.mp-ward-tab');
    if (tab) { w.tab = tab.dataset.slot; w.confirm = null; renderWardrobe(`.mp-ward-tab[data-slot="${CSS.escape(w.tab)}"]`); return; }
    if (ev.target.closest('.mp-buy-no')) {
      const id = w.confirm; w.confirm = null;
      renderWardrobe(`.mp-item[data-id="${CSS.escape(id || '')}"]`); return;
    }
    if (ev.target.closest('.mp-buy-yes')) { if (w.confirm) call('onBuy', w.confirm); return; }
    const tile = ev.target.closest('.mp-item');
    if (!tile) return;
    const id = tile.dataset.id || null;
    if (!id) { call('onEquip', w.tab, null); return; }
    const it = (w.items || []).find((x) => x.id === id);
    if (!it) return;
    const st = wardrobeItemState(it, w);
    if (st.equipped) call('onEquip', it.slot, null);      // tap again = take off
    else if (st.owned) call('onEquip', it.slot, it.id);
    else { w.confirm = it.id; renderWardrobe(st.affordable ? '.mp-buy-yes' : '.mp-buy-no'); }
  });
  el.ward.addEventListener('keydown', (ev) => {
    const w = state.ward;
    if (!w) return;
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      if (w.confirm) { const id = w.confirm; w.confirm = null; renderWardrobe(`.mp-item[data-id="${CSS.escape(id)}"]`); }
      else { api.hideWardrobe(); call('onWardrobeClose'); }
      return;
    }
    if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && ev.target.closest('.mp-ward-tab')) {
      ev.preventDefault(); ev.stopPropagation();
      const slots = slotOrder();
      const i = slots.indexOf(w.tab);
      w.tab = slots[(i + (ev.key === 'ArrowRight' ? 1 : slots.length - 1)) % slots.length];
      w.confirm = null;
      renderWardrobe(`.mp-ward-tab[data-slot="${CSS.escape(w.tab)}"]`);
    }
  });

  // ---------- minigame (S2-08) ----------
  function renderGameNumbers() {
    const g = state.game;
    if (!g) return;
    el.gameScore.textContent = fmt(g.score);
    el.gameCoins.textContent = `+${fmt(g.coins)}`;
    const left = Math.max(0, Math.ceil(g.timeLeft));
    el.gameSecs.textContent = String(left);
    el.gameSecs.parentElement.setAttribute('aria-label', S.game.secs(left));
    const k = g.durationSec > 0 ? clamp01(g.timeLeft / g.durationSec) : 0;
    el.gameTimeFill.style.transform = `scaleX(${k})`;
    el.gameTime.setAttribute('aria-valuemax', String(g.durationSec));
    el.gameTime.setAttribute('aria-valuenow', String(left));
    el.gameTime.setAttribute('aria-valuetext', S.game.secs(left));
    el.game.classList.toggle('is-late', g.started && g.timeLeft <= 5);
    el.gameStreak.hidden = !(g.streak >= 2);
    el.gameStreak.querySelector('span').textContent = `${S.game.streak} ×${g.streak}`;
  }

  function clearCountdown() {
    const g = state.game;
    if (g) { g.countTimers.forEach(clearTimeout); g.countTimers = []; }
    el.gameCount.hidden = true;
  }

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

    /**
     * Set the coin count. Counts up/down to the new value with a "+N"/"−N" float
     * (instant when the player prefers reduced motion). The first call paints directly.
     * @param {number} n coin count
     */
    setCoins(n) {
      const v = int0(n);
      const prev = state.coins;
      state.coins = v;
      el.coins.setAttribute('aria-label', S.coins(fmt(v)));
      if (state.ward) { state.ward.coins = v; renderWardrobe(); }
      if (prev === null || prev === v) { cancelAnimationFrame(state.coinRaf); state.coinShown = v; paintCoins(v); return; }
      const d = v - prev;
      el.coinPlus.textContent = d > 0 ? `+${fmt(d)}` : `−${fmt(-d)}`;
      el.coinPlus.classList.toggle('is-minus', d < 0);
      bump(el.coinPlus, 'is-up');
      bump(el.coins, 'is-bump');
      animateCoins(state.coinShown, v);
    },

    /** @param {'living'|'kitchen'|'bathroom'} id */
    setRoom(id) {
      if (!HUD_ROOMS.includes(id)) return;
      if (id !== state.room && id === 'kitchen') state.trayOpen = true;
      state.room = id;
      if (id !== 'living' && state.ward) api.hideWardrobe();
      renderRoom();
    },

    /** @param {{key:string, name:string}} c */
    setCharacter(c = {}) {
      state.char = { key: c.key || state.char.key, name: c.name || state.char.name };
      el.name.textContent = state.char.name;
      el.ava.src = portrait(state.char.key);
      el.who.setAttribute('aria-label', S.chip(state.char.name));
      renderMic();
      if (state.ward) { state.ward.charKey = state.char.key; renderWardrobe(); }
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
      bump(el.bubble, 'is-in');
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
      bump(el.toast, 'is-in');
      state.toastTimer = setTimeout(hideToast, ms);
    },

    /**
     * Coach mark above the room nav. Ignored while the flush button is visible (S2-03).
     * @param {string|null} text null hides it
     */
    coach(text) {
      if (root.classList.contains('is-flush')) return;
      state.coachText = text || null;
      renderCoach();
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
      renderCamView();
    },

    /**
     * Reflect the camera view choice (S2-04). The toggle shows only while the camera is 'on'.
     * Tapping it calls onCameraView(!hidden); call this back to flip the label.
     * @param {boolean} hidden true = video hidden, stylized hands only
     */
    setCameraView(hidden) {
      state.camHidden = !!hidden;
      renderCamView();
    },

    /** @param {{id:string, name:string}[]} foods kitchen tray contents */
    setFoods(foods = []) {
      el.trayGrid.style.setProperty('--n', String(Math.max(1, foods.length)));
      el.trayGrid.innerHTML = foods.map((f) => `
        <button type="button" class="mp-food" data-food-id="${esc(f.id)}" aria-label="${esc(f.name)}">
          ${foodIcon(f.id, 44)}<span class="mp-food-name">${esc(f.name)}</span>
        </button>`).join('');
    },

    /**
     * Toilet "sitting" stage (S2-03): true clears the coach, hides room nav and shows
     * one centred "กดชักโครก" button (bathroom only). false returns to normal.
     * @param {boolean} on
     */
    setFlushVisible(on) {
      const was = state.flush;
      state.flush = !!on;
      if (state.flush) state.coachText = null;
      renderRoom();
      if (state.flush && !was && state.room === 'bathroom' && el.col.contains(document.activeElement)) el.flush.focus({ preventScroll: true });
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
     * Wardrobe sheet (S2-08). Covers at most the bottom 45 % so the pet stays visible.
     * Room nav, mic and contextual buttons hide while it is open; needs and coins stay.
     * @param {{slots?:object, items:{id:string, slot:string, name:string, price?:number, likes?:string[]}[],
     *          owned:string[], outfit:{head?:string|null, eyes?:string|null, body?:string|null},
     *          coins:number, charKey?:string}} data wardrobe.json + save state
     */
    showWardrobe(data = {}) {
      const firstOpen = !state.ward;
      state.ward = {
        slots: data.slots || null, items: data.items || [], owned: new Set(data.owned || []),
        outfit: { ...(data.outfit || {}) }, coins: data.coins ?? state.coins ?? 0,
        charKey: data.charKey || state.char.key, tab: firstOpen ? null : state.ward.tab, confirm: null,
        returnFocus: firstOpen ? document.activeElement : state.ward.returnFocus,
      };
      if (!state.ward.tab) state.ward.tab = slotOrder()[0];
      root.classList.add('is-wardrobe');
      el.ward.hidden = false;
      renderWardrobe(firstOpen ? '.mp-ward-tab.is-on' : null);
    },

    /**
     * Patch the open wardrobe; any of the showWardrobe fields. A pending buy confirmation
     * closes once its item appears in `owned`.
     * @param {object} partial
     */
    updateWardrobe(partial = {}) {
      const w = state.ward;
      if (!w) return;
      if (partial.items) w.items = partial.items;
      if (partial.slots) w.slots = partial.slots;
      if (partial.owned) w.owned = new Set(partial.owned);
      if (partial.outfit) w.outfit = { ...w.outfit, ...partial.outfit };
      if (partial.coins != null) w.coins = partial.coins;
      if (partial.charKey) w.charKey = partial.charKey;
      const active = document.activeElement;
      const activeId = active && el.ward.contains(active) && active.closest('.mp-item') ? active.dataset.id : undefined;
      let focus = activeId !== undefined ? `.mp-item[data-id="${CSS.escape(activeId)}"]` : null;
      if (w.confirm && w.owned.has(w.confirm)) { focus = `.mp-item[data-id="${CSS.escape(w.confirm)}"]`; w.confirm = null; }
      renderWardrobe(focus);
    },

    hideWardrobe() {
      if (!state.ward) return;
      const rf = state.ward.returnFocus;
      state.ward = null;
      el.ward.hidden = true;
      el.ward.innerHTML = '';
      root.classList.remove('is-wardrobe');
      if (rf && rf.focus && document.contains(rf) && !rf.closest('[hidden]')) rf.focus({ preventScroll: true });
    },

    /**
     * Start the minigame HUD: hides the normal HUD, runs a 3-2-1 countdown.
     * Calls onMinigameTick(3), (2), (1), (0 = go) for sfx.
     * @param {{title?:string, durationSec:number, countdown?:number}} opts
     * @returns {Promise<void>} resolves when "go" shows — start the round then
     */
    startMinigame(opts = {}) {
      if (state.game) clearCountdown();
      if (state.ward) api.hideWardrobe();
      const durationSec = Math.max(1, Number(opts.durationSec) || 45);
      const count = Math.max(0, Math.floor(opts.countdown ?? 3));
      state.game = { durationSec, timeLeft: durationSec, score: 0, coins: 0, streak: 0, started: false, countTimers: [] };
      const g = state.game;
      el.gameTitle.textContent = opts.title || S.game.title;
      el.result.hidden = true; el.result.innerHTML = '';
      el.game.hidden = false;
      el.game.classList.remove('is-late', 'is-result');
      root.classList.add('is-game');
      el.col.inert = true; el.col.setAttribute('aria-hidden', 'true');
      el.gameHint.textContent = finePointer.matches ? S.game.hintMouse : S.game.hintTouch;
      el.gameHint.hidden = false;
      renderGameNumbers();
      measure();
      const show = (n) => {
        el.gameCount.hidden = false;
        el.gameCount.classList.toggle('is-go', n === 0);
        el.gameCount.querySelector('span').textContent = n === 0 ? S.game.go : String(n);
        bump(el.gameCount, 'is-tick');
        call('onMinigameTick', n);
      };
      return new Promise((resolve) => {
        for (let i = 0; i <= count; i++) {
          g.countTimers.push(setTimeout(() => {
            if (state.game !== g) return;
            const n = count - i;
            show(n);
            if (n === 0) {
              g.started = true;
              g.countTimers.push(setTimeout(() => { if (state.game === g) { el.gameCount.hidden = true; el.gameHint.hidden = true; } }, 700));
              resolve();
            }
          }, i * 1000));
        }
      });
    },

    /** @param {{score?:number, timeLeft?:number, streak?:number, coins?:number}} u */
    updateMinigame(u = {}) {
      const g = state.game;
      if (!g) return;
      if (u.score != null && int0(u.score) !== g.score) {
        if (int0(u.score) > g.score) bump(el.gameScore, 'is-pop');
        g.score = int0(u.score);
      }
      if (u.timeLeft != null) g.timeLeft = Math.max(0, Number(u.timeLeft) || 0);
      if (u.streak != null) g.streak = int0(u.streak);
      if (u.coins != null) {
        if (int0(u.coins) > g.coins) bump(el.gameCoins.parentElement, 'is-pop');
        g.coins = int0(u.coins);
      }
      renderGameNumbers();
    },

    /** Result card with "เล่นอีกครั้ง" (onMinigameAgain) and "กลับห้อง" (onMinigameExit). */
    showMinigameResult(r = {}) {
      const g = state.game;
      if (!g) return;
      clearCountdown();
      el.gameHint.hidden = true;
      const score = int0(r.score ?? g.score);
      const best = int0(r.best);
      const coins = int0(r.coins ?? g.coins);
      const isBest = score > 0 && score >= best;
      const s = S.game;
      el.game.classList.add('is-result');
      el.result.setAttribute('aria-labelledby', 'mp-result-title');
      el.result.innerHTML = `
        <div class="mp-result-card">
          ${isBest ? `<span class="mp-result-badge">${icon('star', 16)}<span>${esc(s.newBest)}</span></span>` : ''}
          <h2 class="mp-result-title" id="mp-result-title">${esc(s.resultTitle)}</h2>
          <div class="mp-result-score"><span class="mp-num">${fmt(score)}</span><span class="mp-result-l">${esc(s.score)}</span></div>
          <div class="mp-result-row">
            <div class="mp-result-cell"><span class="mp-result-l">${esc(s.best)}</span><span class="mp-num mp-result-v">${fmt(Math.max(best, score))}</span></div>
            <div class="mp-result-cell"><span class="mp-result-l">${esc(s.coins)}</span><span class="mp-result-v">${coinDot}<span class="mp-num">+${fmt(coins)}</span></span></div>
          </div>
          <div class="mp-result-actions">
            <button type="button" class="mp-btn-outline mp-result-back">${esc(s.back)}</button>
            <button type="button" class="mp-btn-primary mp-result-again">${esc(s.again)}</button>
          </div>
        </div>`;
      el.result.hidden = false;
      el.result.querySelector('.mp-result-again').focus({ preventScroll: true });
    },

    /** Leave the minigame HUD and restore the normal HUD. */
    endMinigame() {
      if (!state.game) return;
      clearCountdown();
      state.game = null;
      el.game.hidden = true;
      el.result.hidden = true; el.result.innerHTML = '';
      root.classList.remove('is-game');
      el.col.inert = false; el.col.removeAttribute('aria-hidden');
      measure();
    },

    /**
     * Food under a screen point (used by hand tracking). Rect based, so it works
     * even when another layer sits above the HUD.
     * @returns {string|null} food id
     */
    foodElementAt(x, y) {
      if (el.tray.hidden || state.select || state.ward || state.game) return null;
      for (const b of el.trayGrid.querySelectorAll('[data-food-id]')) {
        const r = b.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return b.dataset.foodId;
      }
      return null;
    },

    /** @returns {boolean} true when (x, y) is over an interactive HUD element */
    isHudPoint(x, y) {
      const t = document.elementFromPoint(x, y);
      return !!t && t !== root && root.contains(t) && !t.classList.contains('mp-game') && !t.classList.contains('mp-game-col');
    },

    /** Remove listeners and DOM. */
    dispose() {
      window.removeEventListener('resize', measure);
      clearTimeout(state.toastTimer); clearTimeout(state.camMsgTimer); clearTimeout(state.bubble.timer);
      cancelAnimationFrame(state.coinRaf);
      clearCountdown();
      root.innerHTML = '';
      root.classList.remove('mp-hud', 'is-selecting', 'is-wardrobe', 'is-game', 'is-flush');
    },
  };

  el.result.addEventListener('click', (ev) => {
    if (ev.target.closest('.mp-result-again')) call('onMinigameAgain');
    else if (ev.target.closest('.mp-result-back')) call('onMinigameExit');
  });

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
