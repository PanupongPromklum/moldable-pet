/**
 * Settings sheet (owner 2026-11-16: music, sound effect volumes; things that do not need a button of
 * their own on the top bar live here). Opened by the gear on the top bar. Owner: glaze.
 * Display only: every change goes out through handlers (onMusicVolume, onSfxVolume, onCamera, onGraphics, onFps).
 * Graphics high / low (owner 2026-11-24): a two-option radio group; the level itself lives in engine/graphics.js.
 * @module ui/settings
 */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Thai copy for the settings sheet. */
export const SETTINGS_STRINGS = {
  open: 'ตั้งค่า',
  title: 'ตั้งค่า',
  close: 'ปิด',
  music: 'เพลง',
  sfx: 'เสียงเอฟเฟกต์',
  off: 'ปิด',
  camera: 'เล่นด้วยมือผ่านกล้อง',
  cameraHint: 'โบกมือหน้ากล้องเพื่อเล่นกับเพื่อน',
  cameraState: { off: 'ปิดอยู่', loading: 'กำลังเปิด…', on: 'เปิดอยู่', error: 'เปิดไม่ได้' },
  graphics: 'กราฟิก',
  graphicsLevel: { high: 'สูง', low: 'ต่ำ' },
  graphicsHint: { high: 'ภาพละเอียด สวยที่สุด', low: 'ภาพเบาลง เหมาะกับเครื่องรุ่นเก่า' },
  fps: 'ความลื่น',
  fpsLevel: { 60: '60 FPS', 30: '30 FPS' },
  fpsHint: { 60: 'ภาพเคลื่อนไหวลื่นที่สุด', 30: 'ประหยัดแบต เครื่องร้อนน้อยลง' },
};

/** Slider value 0..1 → whole percent text. Pure. */
export const pct = (v) => `${Math.round(Math.min(1, Math.max(0, Number(v) || 0)) * 100)}%`;

/**
 * @param {{ root: HTMLElement, slot: HTMLElement, icon: Function, call: Function }} deps
 *   slot = the top-bar container the gear button is appended to
 */
export function createSettings({ root, slot, icon, call }) {
  const S = SETTINGS_STRINGS;
  const st = { musicVol: 0.5, sfxVol: 0.8, camera: 'off', cameraAvailable: true, graphics: 'high', fps: 60 };
  let returnFocus = null;

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'mp-iconbtn mp-gear mp-tip';
  btn.dataset.tip = S.open; btn.setAttribute('aria-label', S.open); btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = icon('gear', 22);
  slot.appendChild(btn);

  const card = document.createElement('section');
  card.className = 'mp-card5 mp-settings'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'mp-set-title');
  root.appendChild(card);

  const slider = (id, label, ico, v) => `
    <div class="mp-set-row">
      <label class="mp-set-label" for="mp-set-${id}"><span class="mp-set-ico" aria-hidden="true">${ico}</span>${esc(label)}</label>
      <span class="mp-set-val mp-num" aria-hidden="true">${v <= 0 ? esc(S.off) : pct(v)}</span>
      <input type="range" class="mp-range" id="mp-set-${id}" data-set="${id}" min="0" max="100" step="5" value="${Math.round(v * 100)}"
        style="--v:${Math.round(v * 100)}%" aria-valuetext="${v <= 0 ? esc(S.off) : pct(v)}">
    </div>`;

  /** Two-option radio groups (owner 2026-11-24): graphics high / low, frame rate 60 / 30. */
  const GROUPS = {
    gfx: { key: 'graphics', icon: 'star', label: () => S.graphics, opts: ['high', 'low'], text: (k) => S.graphicsLevel[k], hint: (k) => S.graphicsHint[k], handler: 'onGraphics', parse: (v) => v },
    fps: { key: 'fps', icon: 'timer', label: () => S.fps, opts: [60, 30], text: (k) => S.fpsLevel[k], hint: (k) => S.fpsHint[k], handler: 'onFps', parse: Number, num: true },
  };
  const segRow = (id) => {
    const g = GROUPS[id], cur = st[g.key];
    return `
    <div class="mp-set-row mp-set-seg" data-group="${id}">
      <span class="mp-set-label" id="mp-set-${id}-l"><span class="mp-set-ico" aria-hidden="true">${icon(g.icon, 20)}</span>${esc(g.label())}</span>
      <div class="mp-seg" role="radiogroup" aria-labelledby="mp-set-${id}-l">
        ${g.opts.map((k) => `<button type="button" class="mp-seg-opt${g.num ? ' mp-num' : ''}" role="radio" data-v="${k}" aria-checked="${cur === k}" tabindex="${cur === k ? 0 : -1}">${esc(g.text(k))}</button>`).join('')}
      </div>
      <small class="mp-set-hint">${esc(g.hint(cur) || '')}</small>
    </div>`;
  };
  /** Show a group's value without re-rendering the sheet (keeps focus on the pressed option). */
  function paintGroup(id) {
    const g = GROUPS[id], row = card.querySelector(`.mp-set-seg[data-group="${id}"]`); if (!row) return;
    for (const b of row.querySelectorAll('.mp-seg-opt')) {
      const on = g.parse(b.dataset.v) === st[g.key];
      b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
    }
    const h = row.querySelector('.mp-set-hint'); if (h) h.textContent = g.hint(st[g.key]) || '';
  }
  function pick(id, raw) {
    const g = GROUPS[id]; if (!g) return;
    const v = g.parse(raw); if (!g.opts.includes(v)) return;
    const changed = v !== st[g.key];
    st[g.key] = v; paintGroup(id);
    if (changed) call(g.handler, v);
  }

  function render() {
    const camOn = st.camera === 'on' || st.camera === 'loading';
    card.innerHTML = `
      <div class="mp-card5-in mp-set-in">
        <button type="button" class="mp-iconbtn mp-iconbtn--ghost mp-card5-x mp-set-x" aria-label="${esc(S.close)}">${icon('close', 20)}</button>
        <h2 class="mp-card5-title" id="mp-set-title">${esc(S.title)}</h2>
        ${slider('music', S.music, icon('wave', 20), st.musicVol)}
        ${slider('sfx', S.sfx, icon('sparkle', 20), st.sfxVol)}
        ${segRow('gfx')}
        ${segRow('fps')}
        ${st.cameraAvailable ? `
        <button type="button" class="mp-set-switchrow" role="switch" aria-checked="${camOn}" data-state="${esc(st.camera)}">
          <span class="mp-set-ico" aria-hidden="true">${icon(st.camera === 'error' ? 'camera-off' : 'camera', 20)}</span>
          <span class="mp-set-text"><b>${esc(S.camera)}</b><small>${esc(st.camera === 'off' ? S.cameraHint : S.cameraState[st.camera] || '')}</small></span>
          <span class="mp-switch-track" aria-hidden="true"><span class="mp-switch-knob"></span></span>
        </button>` : ''}
      </div>`;
  }

  function open() {
    returnFocus = card.hidden ? document.activeElement : returnFocus;
    render(); card.hidden = false; root.classList.add('is-settings'); btn.setAttribute('aria-expanded', 'true');
    card.querySelector('input')?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden) return;
    card.hidden = true; card.innerHTML = ''; root.classList.remove('is-settings'); btn.setAttribute('aria-expanded', 'false');
    try { returnFocus?.focus?.({ preventScroll: true }); } catch { /* gone */ }
  }

  btn.addEventListener('click', () => (card.hidden ? open() : close()));
  card.addEventListener('input', (ev) => {
    const r = ev.target.closest('input[type="range"]'); if (!r) return;
    const v = Math.min(1, Math.max(0, Number(r.value) / 100));
    r.style.setProperty('--v', `${Math.round(v * 100)}%`);
    const txt = v <= 0 ? S.off : pct(v);
    r.setAttribute('aria-valuetext', txt);
    const out = r.parentElement.querySelector('.mp-set-val'); if (out) out.textContent = txt;
    if (r.dataset.set === 'music') { st.musicVol = v; call('onMusicVolume', v); } else { st.sfxVol = v; call('onSfxVolume', v); }
  });
  card.addEventListener('click', (ev) => {
    if (ev.target === card || ev.target.closest('.mp-set-x')) { close(); return; }
    if (ev.target.closest('.mp-set-switchrow')) call('onCamera');
    const o = ev.target.closest('.mp-seg-opt'); if (o) pick(o.closest('.mp-set-seg').dataset.group, o.dataset.v);
  });
  card.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.stopPropagation(); close(); return; }
    const segOpt = ev.target.closest?.('.mp-seg-opt');
    if (segOpt && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) {
      ev.preventDefault();
      const row = segOpt.closest('.mp-set-seg'), id = row.dataset.group, g = GROUPS[id];
      const other = g.opts.find((k) => k !== st[g.key]);
      pick(id, String(other));
      row.querySelector(`.mp-seg-opt[data-v="${other}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (ev.key === 'Tab') {
      const f = [...card.querySelectorAll('button, input')];
      const i = f.indexOf(document.activeElement);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); }
      else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
    }
  });

  return {
    /** @param {{musicVol?:number, sfxVol?:number, camera?:string, cameraAvailable?:boolean, graphics?:'high'|'low', fps?:60|30}} o */
    set(o = {}) {
      Object.assign(st, o);
      if (!card.hidden) {
        if ('graphics' in o) paintGroup('gfx');
        if ('fps' in o) paintGroup('fps');
        const sw = card.querySelector('.mp-set-switchrow');
        if (sw && ('camera' in o)) {    // keep focus on the switch while the camera starts
          const had = document.activeElement === sw;
          render(); if (had) card.querySelector('.mp-set-switchrow')?.focus({ preventScroll: true });
        }
      }
    },
    open, close,
    get isOpen() { return !card.hidden; },
  };
}
