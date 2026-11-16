/**
 * Profile button (top bar) + profile card for the Google cloud save (owner 2026-11-16:
 * "ไม่มีอะไรบอกว่า Login สำเร็จหรือเปล่า"). Shows at a glance whether the player is signed in,
 * and opens a small card with the account photo, name, email, save status and sign in / sign out.
 * Owner: glaze. Hidden entirely when cloud save is not configured.
 * @module ui/profile
 */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Thai copy for the profile UI. */
export const PROFILE_STRINGS = {
  btnIn: (name) => `โปรไฟล์ของ ${name} · บันทึกออนไลน์แล้ว`,
  btnOut: 'เข้าสู่ระบบ · ยังไม่ได้บันทึกออนไลน์',
  title: 'โปรไฟล์',
  outTitle: 'ยังไม่ได้เข้าสู่ระบบ',
  outBody: 'ตอนนี้ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น เข้าสู่ระบบด้วย Google เพื่อเก็บไว้ออนไลน์ แล้วเล่นต่อได้ทุกเครื่อง',
  google: 'เข้าสู่ระบบด้วย Google',
  saved: 'บันทึกออนไลน์แล้ว',
  saving: 'กำลังบันทึก…',
  error: 'บันทึกออนไลน์ไม่สำเร็จ จะลองใหม่อีกครั้ง',
  last: (t) => `ล่าสุด ${t}`,
  syncNow: 'บันทึกตอนนี้',
  signOut: 'ออกจากระบบ',
  close: 'ปิด',
  everywhere: 'เล่นต่อได้ทุกเครื่องที่เข้าบัญชีนี้',
};

/** "เมื่อสักครู่" / "3 นาทีที่แล้ว" / "2 ชั่วโมงที่แล้ว" / "1 วันที่แล้ว". Pure, for tests. */
export function agoText(ms, now = Date.now()) {
  if (!ms) return '';
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'เมื่อสักครู่';
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}

/** First letter for the photo fallback (Thai or Latin), upper-cased. */
export function initialOf(name) {
  const t = String(name || '').trim();
  return t ? [...t][0].toUpperCase() : '?';
}

const PERSON = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8.2" r="4.2" fill="currentColor"/><path d="M3.8 20.2c.9-4.1 4.2-6.4 8.2-6.4s7.3 2.3 8.2 6.4c.1.5-.3.9-.8.9H4.6c-.5 0-.9-.4-.8-.9z" fill="currentColor"/></svg>';

/**
 * @param {{ root: HTMLElement, slot: HTMLElement, icon: Function, googleG: string, call: (name: string, ...a: any[]) => void,
 *   onOpen?: () => void, onClose?: () => void }} deps  slot = where the top-bar button goes
 */
export function createProfile({ root, slot, icon, googleG, call, onOpen, onClose }) {
  const S = PROFILE_STRINGS;
  let acc = null, returnFocus = null, tick = 0;

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'mp-iconbtn mp-prof-btn mp-tip'; btn.hidden = true;
  slot.prepend(btn);
  const card = document.createElement('section');
  card.className = 'mp-card5 mp-prof'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'mp-prof-title');
  root.appendChild(card);

  const photo = (a, size) => {
    const letter = `<span class="mp-prof-letter" style="font-size:${Math.round(size * .42)}px">${esc(initialOf(a.name || a.label || a.email))}</span>`;
    return a.avatar
      ? `<img alt="" src="${esc(a.avatar)}" referrerpolicy="no-referrer" width="${size}" height="${size}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'mp-prof-letter',textContent:this.dataset.l,style:'font-size:${Math.round(size * .42)}px'}))" data-l="${esc(initialOf(a.name || a.label || a.email))}">`
      : letter;
  };

  function renderBtn() {
    const a = acc;
    btn.hidden = !(a && a.enabled);
    if (btn.hidden) return;
    btn.dataset.state = a.signedIn ? (a.sync === 'error' ? 'error' : 'in') : 'out';
    const label = a.signedIn ? S.btnIn(a.name || a.label || '') : S.btnOut;
    btn.setAttribute('aria-label', label); btn.dataset.tip = a.signedIn ? (a.name || a.label || S.title) : S.google;
    const badge = a.signedIn ? (a.sync === 'saving' ? '<span class="mp-prof-spin"></span>' : icon(a.sync === 'error' ? 'close' : 'check', 12)) : '';
    const keyNow = `${a.signedIn}|${a.avatar}|${a.name}|${a.label}`;
    if (keyNow === btn.dataset.key && a.signedIn) { const b = btn.querySelector('.mp-prof-badge'); if (b) b.innerHTML = badge; return; }
    btn.dataset.key = keyNow;
    btn.innerHTML = a.signedIn
      ? `<span class="mp-prof-ava">${photo(a, 36)}</span><span class="mp-prof-badge" aria-hidden="true">${badge}</span>`
      : `<span class="mp-prof-ava is-out">${PERSON}</span><span class="mp-prof-badge is-out" aria-hidden="true">${googleG}</span>`;
  }

  function statusLine(a) {
    if (a.sync === 'saving') return `<span class="mp-prof-dot is-saving"></span>${esc(S.saving)}`;
    if (a.sync === 'error') return `<span class="mp-prof-dot is-error"></span>${esc(S.error)}`;
    const t = agoText(a.lastSync);
    return `<span class="mp-prof-dot"></span>${esc(S.saved)}${t ? ` · ${esc(S.last(t))}` : ''}`;
  }

  function renderCard() {
    const a = acc || {};
    if (a.signedIn) {
      card.innerHTML = `
      <div class="mp-card5-in mp-prof-in">
        <button type="button" class="mp-iconbtn mp-iconbtn--ghost mp-card5-x mp-prof-x" aria-label="${esc(S.close)}">${icon('close', 20)}</button>
        <span class="mp-prof-big">${photo(a, 72)}<span class="mp-prof-badge mp-prof-badge--big" aria-hidden="true">${icon('check', 14)}</span></span>
        <h2 class="mp-card5-title mp-prof-name" id="mp-prof-title">${esc(a.name || a.label || S.title)}</h2>
        ${a.email ? `<p class="mp-prof-mail mp-num">${esc(a.email)}</p>` : ''}
        <p class="mp-prof-status" role="status">${statusLine(a)}</p>
        <p class="mp-prof-note">${icon('shield', 16)}<span>${esc(S.everywhere)}</span></p>
        <div class="mp-prof-actions">
          <button type="button" class="mp-btn-outline mp-prof-out">${esc(S.signOut)}</button>
          <button type="button" class="mp-btn-primary mp-prof-sync" ${a.sync === 'saving' ? 'disabled' : ''}>${esc(S.syncNow)}</button>
        </div>
      </div>`;
    } else {
      card.innerHTML = `
      <div class="mp-card5-in mp-prof-in">
        <button type="button" class="mp-iconbtn mp-iconbtn--ghost mp-card5-x mp-prof-x" aria-label="${esc(S.close)}">${icon('close', 20)}</button>
        <span class="mp-prof-big is-out">${PERSON}</span>
        <h2 class="mp-card5-title" id="mp-prof-title">${esc(S.outTitle)}</h2>
        <p class="mp-prof-body">${esc(S.outBody)}</p>
        <button type="button" class="mp-prof-google">${googleG}<span>${esc(S.google)}</span></button>
      </div>`;
    }
  }

  function open() {
    if (!acc || !acc.enabled) return;
    returnFocus = card.hidden ? document.activeElement : returnFocus;
    renderCard(); card.hidden = false; root.classList.add('is-prof');
    onOpen?.();
    clearInterval(tick); tick = setInterval(() => { if (!card.hidden && acc?.signedIn) { const p = card.querySelector('.mp-prof-status'); if (p) p.innerHTML = statusLine(acc); } }, 30000);
    (card.querySelector('.mp-prof-google, .mp-prof-sync') || card.querySelector('button'))?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden) return;
    card.hidden = true; card.innerHTML = ''; root.classList.remove('is-prof'); clearInterval(tick);
    onClose?.();
    try { returnFocus?.focus?.({ preventScroll: true }); } catch { /* gone */ }
  }

  btn.addEventListener('click', () => (card.hidden ? open() : close()));
  card.addEventListener('click', (ev) => {
    if (ev.target === card || ev.target.closest('.mp-prof-x')) { close(); return; }
    if (ev.target.closest('.mp-prof-google')) { call('onCloudSignIn'); return; }
    if (ev.target.closest('.mp-prof-sync')) { call('onCloudSync'); return; }
    if (ev.target.closest('.mp-prof-out')) { close(); call('onCloudSignOut'); }
  });
  card.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.stopPropagation(); close(); return; }
    if (ev.key === 'Tab') {
      const f = [...card.querySelectorAll('button:not([disabled])')];
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); }
      else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
    }
  });

  return {
    /** @param {{enabled:boolean, signedIn:boolean, label?:string, name?:string, email?:string, avatar?:string, sync?:'idle'|'saving'|'saved'|'error', lastSync?:number}|null} a */
    set(a) {
      acc = a ? { ...a } : null;
      renderBtn();
      if (!card.hidden) {
        if (!acc || !acc.enabled) close();
        else { const focusSync = document.activeElement?.classList?.contains('mp-prof-sync'); renderCard(); if (focusSync) card.querySelector('.mp-prof-sync, .mp-prof-out')?.focus({ preventScroll: true }); }
      }
    },
    open, close,
    get isOpen() { return !card.hidden; },
  };
}
