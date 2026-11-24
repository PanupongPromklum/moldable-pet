/**
 * Settings sheet (owner 2026-11-16: music, sound effect volumes; things that do not need a button of
 * their own on the top bar live here). Opened by the gear on the top bar. Owner: glaze.
 * Display only: every change goes out through handlers (onMusicVolume, onSfxVolume, onCamera, onGraphics).
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
  graphicsHint: { high: 'ภาพละเอียด สวยที่สุด', low: 'เล่นลื่นขึ้น ประหยัดแบต เหมาะกับเครื่องรุ่นเก่า' },
};

/** Slider value 0..1 → whole percent text. Pure. */
export const pct = (v) => `${Math.round(Math.min(1, Math.max(0, Number(v) || 0)) * 100)}%`;

/**
 * @param {{ root: HTMLElement, slot: HTMLElement, icon: Function, call: Function }} deps
 *   slot = the top-bar container the gear button is appended to
 */
export function createSettings({ root, slot, icon, call }) {
  const S = SETTINGS_STRINGS;
  const st = { musicVol: 0.5, sfxVol: 0.8, camera: 'off', cameraAvailable: true, graphics: 'high' };
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

  const graphicsRow = () => `
    <div class="mp-set-row mp-set-gfx">
      <span class="mp-set-label" id="mp-set-gfx-l"><span class="mp-set-ico" aria-hidden="true">${icon('star', 20)}</span>${esc(S.graphics)}</span>
      <div class="mp-seg" role="radiogroup" aria-labelledby="mp-set-gfx-l">
        ${['high', 'low'].map((k) => `<button type="button" class="mp-seg-opt" role="radio" data-gfx="${k}" aria-checked="${st.graphics === k}" tabindex="${st.graphics === k ? 0 : -1}">${esc(S.graphicsLevel[k])}</button>`).join('')}
      </div>
      <small class="mp-set-hint">${esc(S.graphicsHint[st.graphics] || '')}</small>
    </div>`;
  /** Show a level without re-rendering the sheet (keeps focus on the pressed option). */
  function paintGraphics() {
    for (const b of card.querySelectorAll('.mp-seg-opt')) {
      const on = b.dataset.gfx === st.graphics;
      b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
    }
    const h = card.querySelector('.mp-set-gfx .mp-set-hint'); if (h) h.textContent = S.graphicsHint[st.graphics] || '';
  }
  function pickGraphics(k) {
    if (k !== 'high' && k !== 'low') return;
    const changed = k !== st.graphics;
    st.graphics = k; paintGraphics();
    if (changed) call('onGraphics', k);
  }

  function render() {
    const camOn = st.camera === 'on' || st.camera === 'loading';
    card.innerHTML = `
      <div class="mp-card5-in mp-set-in">
        <button type="button" class="mp-iconbtn mp-iconbtn--ghost mp-card5-x mp-set-x" aria-label="${esc(S.close)}">${icon('close', 20)}</button>
        <h2 class="mp-card5-title" id="mp-set-title">${esc(S.title)}</h2>
        ${slider('music', S.music, icon('wave', 20), st.musicVol)}
        ${slider('sfx', S.sfx, icon('sparkle', 20), st.sfxVol)}
        ${graphicsRow()}
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
    const g = ev.target.closest('.mp-seg-opt'); if (g) pickGraphics(g.dataset.gfx);
  });
  card.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.stopPropagation(); close(); return; }
    if (ev.target.closest?.('.mp-seg-opt') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) {
      ev.preventDefault();
      pickGraphics(st.graphics === 'high' ? 'low' : 'high');
      card.querySelector(`.mp-seg-opt[data-gfx="${st.graphics}"]`)?.focus({ preventScroll: true });
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
    /** @param {{musicVol?:number, sfxVol?:number, camera?:string, cameraAvailable?:boolean, graphics?:'high'|'low'}} o */
    set(o = {}) {
      Object.assign(st, o);
      if (!card.hidden) {
        if ('graphics' in o) paintGraphics();
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
