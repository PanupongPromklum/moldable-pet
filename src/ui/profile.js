/**
 * Account block of the profile sheet (owner 2026-11-16: profile and character choice live in one
 * sheet, opened from the pet chip). Shows whether the Google cloud save is signed in: photo, name,
 * email, save status, "บันทึกตอนนี้" and sign out; or the Google sign-in button. Also the
 * "which save?" choice shown when this device and the account both have progress.
 * Pure string builders; hud.js renders them and routes clicks by `data-act`.
 * Owner: glaze.
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
  outShort: 'ข้อมูลอยู่ในเครื่องนี้เท่านั้น',
  googleShort: 'เข้าสู่ระบบ',
  recommended: 'แนะนำ',
  choiceTitle: 'จะใช้ข้อมูลชุดไหนดี',
  choiceBody: 'เครื่องนี้มีข้อมูลการเล่นอยู่แล้ว และบัญชี Google ก็มีข้อมูลอีกชุด เลือกชุดที่จะเล่นต่อ',
  choiceCloud: 'ใช้ข้อมูลจากบัญชี Google',
  choiceDevice: 'ใช้ข้อมูลในเครื่องนี้',
  choiceNote: 'ชุดที่ไม่ได้เลือกจะถูกแทนที่ด้วยชุดที่เลือก',
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

function photo(a, size) {
  const l = esc(initialOf(a.name || a.label || a.email));
  return a.avatar
    ? `<img alt="" src="${esc(a.avatar)}" referrerpolicy="no-referrer" width="${size}" height="${size}" data-l="${l}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'mp-prof-letter',textContent:this.dataset.l}))">`
    : `<span class="mp-prof-letter">${l}</span>`;
}

function statusLine(a) {
  const S = PROFILE_STRINGS;
  if (a.sync === 'saving') return `<span class="mp-prof-dot is-saving"></span>${esc(S.saving)}`;
  if (a.sync === 'error') return `<span class="mp-prof-dot is-error"></span>${esc(S.error)}`;
  const t = agoText(a.lastSync);
  return `<span class="mp-prof-dot"></span>${esc(S.saved)}${t ? ` · ${esc(S.last(t))}` : ''}`;
}

/**
 * Account block markup ('' when cloud save is off). Buttons carry data-act = signin | signout | sync.
 * @param {{enabled:boolean, signedIn:boolean, label?:string, name?:string, email?:string, avatar?:string, sync?:string, lastSync?:number}|null} a
 * @param {{ googleG: string }} deps
 */
export function accountBlock(a, { googleG }) {
  const S = PROFILE_STRINGS;
  if (!a || !a.enabled) return '';
  if (!a.signedIn) {
    return `<section class="mp-acct is-out" aria-label="${esc(S.title)}">
      <span class="mp-acct-ava is-out" aria-hidden="true">${PERSON}</span>
      <span class="mp-acct-text"><b>${esc(S.outTitle)}</b><small>${esc(S.outShort)}</small></span>
      <button type="button" class="mp-acct-google" data-act="signin">${googleG}<span>${esc(S.googleShort)}</span></button>
    </section>`;
  }
  return `<section class="mp-acct is-in" aria-label="${esc(S.title)}">
    <span class="mp-acct-ava" aria-hidden="true">${photo(a, 44)}</span>
    <span class="mp-acct-text"><b>${esc(a.name || a.label || '')}</b><small class="mp-num">${esc(a.email || '')}</small>
      <span class="mp-acct-status" role="status">${statusLine(a)}</span></span>
    <span class="mp-acct-btns">
      <button type="button" class="mp-acct-link" data-act="sync" ${a.sync === 'saving' ? 'disabled' : ''}>${esc(S.syncNow)}</button>
      <button type="button" class="mp-acct-link" data-act="signout">${esc(S.signOut)}</button>
    </span>
  </section>`;
}

/**
 * "Which save?" card (cloud sync conflict). Buttons carry data-pick = cloud | device.
 * @param {{ device: {pet:string, coins:number, savedAt:number}, cloud: {pet:string, coins:number, savedAt:number} }} c
 * @param {{ googleG: string, coinDot: () => string }} deps
 */
export function saveChoiceCard(c, { googleG, coinDot }) {
  const S = PROFILE_STRINGS;
  const opt = (pick, title, sum, ico, rec) => `
    <button type="button" class="mp-savepick${rec ? ' is-rec' : ''}" data-pick="${pick}">
      <span class="mp-savepick-ico" aria-hidden="true">${ico}</span>
      <span class="mp-savepick-text"><b>${esc(title)}</b>
        <small>${esc(sum.pet || '—')} · ${coinDot()}<span class="mp-num">${Math.floor(sum.coins || 0)}</span>${sum.savedAt ? ` · ${esc(S.last(agoText(sum.savedAt)))}` : ''}</small></span>
      ${rec ? `<span class="mp-savepick-rec">${esc(S.recommended)}</span>` : ''}
    </button>`;
  return `<div class="mp-card5-in mp-savechoice-in">
    <h2 class="mp-card5-title" id="mp-savechoice-title">${esc(S.choiceTitle)}</h2>
    <p class="mp-card5-line" id="mp-savechoice-body">${esc(S.choiceBody)}</p>
    ${opt('cloud', S.choiceCloud, c.cloud, googleG, true)}
    ${opt('device', S.choiceDevice, c.device, PHONE, false)}
    <p class="mp-savechoice-note">${esc(S.choiceNote)}</p>
  </div>`;
}
const PHONE = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="2.5" width="12" height="19" rx="3" fill="currentColor"/><rect x="10" y="17.6" width="4" height="1.6" rx=".8" fill="#fff"/></svg>';
