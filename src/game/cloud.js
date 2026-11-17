/**
 * Cloud save with Google sign-in (Supabase Auth + one `pet_saves` row per player).
 * Owner: wire. Setup: docs/cloud-save.md. Rules: cloud-rules.js.
 *
 * Off unless assets/data/cloud.json has url + anonKey. supabase-js loads lazily from jsDelivr only
 * when enabled. A signed-in player plays the account's save (owner 2026-11-16): the device save is
 * linked to the account after the first sync, then the newest wins; when this device has its own
 * progress that is not from this account, the player is asked which one to keep (syncDecision).
 * Several devices (owner 2026-11-17): each device keeps `mp-cloud-base` = the cloud stamp it last
 * synced. An upload first checks the cloud stamp; if another device saved since, this device
 * downloads instead of overwriting. The check also runs when the game comes back to the screen.
 * After a pull the page reloads once so every system starts from the cloud save; while that happens
 * `locked` is true and the game must not write its old in-memory save (main.js persist wrapper).
 * Pushes are debounced and also sent when the page is hidden.
 * @module game/cloud
 */
import { cloudEnabled, validSave, accountLabel, accountInfo, syncDecision, pushDecision, rowStamp, saveSummary } from './cloud-rules.js';

/**
 * @param {{ cfg: object, storageKey: string, getSave: () => object, onChange?: (state: object) => void, toast?: (msg: string) => void,
 *   ask?: (choice: { device: object, cloud: object }) => Promise<'cloud'|'device'>, names?: Record<string,string> }} deps
 *   ask = show the "which save?" choice (summaries from saveSummary); without it the account save wins
 */
export function createCloud({ cfg, storageKey, getSave, onChange, toast, ask, names }) {
  const LINK = 'mp-cloud-link';   // id of the account this device save belongs to
  const linkTo = (id) => { try { localStorage.setItem(LINK, id); } catch { /* private mode */ } };
  const linked = () => { try { return localStorage.getItem(LINK); } catch { return null; } };
  const BASE = 'mp-cloud-base';   // cloud `saved_at` this device last downloaded or uploaded
  const setBase = (n) => { try { localStorage.setItem(BASE, String(Math.round(Number(n) || 0))); } catch { /* private mode */ } };
  const base = () => { try { return Number(localStorage.getItem(BASE)) || 0; } catch { return 0; } };
  let locked = false;             // a cloud save is being loaded: keep the old one off the disk
  let edits = 0, sent = 0;        // player changes (schedule calls) vs. the count already uploaded
  const state = { enabled: cloudEnabled(cfg), ready: false, signedIn: false, label: '', name: '', email: '', avatar: '', sync: 'idle', lastSync: 0 };
  const SIGNING = 'mp-cloud-signing';
  let sb = null, user = null, pushT = null;
  const emit = () => { try { onChange?.({ ...state }); } catch { /* ui only */ } };

  async function client() {
    if (sb || !state.enabled) return sb;
    const mod = await import(/* @vite-ignore */ cfg.supabaseJs);
    sb = mod.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    return sb;
  }

  /** Use the account save on this device: write it locally and reload once. */
  function adopt(row) {
    locked = true; clearTimeout(pushT); pushT = null;
    linkTo(user.id); setBase(rowStamp(row));
    localStorage.setItem(storageKey, JSON.stringify(row.save));
    sessionStorage.setItem('mp-cloud-pulled', '1');
    location.reload();
  }

  async function fetchRow(cols = 'save, saved_at') {
    const { data, error } = await sb.from(cfg.table).select(cols).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function pull() {
    if (!user || locked) return;
    const data = await fetchRow();
    const local = getSave();
    let what = syncDecision({ local, remote: data, linkedTo: linked(), userId: user.id, base: base() });
    if (what === 'ask') {
      let pick = 'cloud';
      try { if (ask) pick = await ask({ device: saveSummary(local, names), cloud: saveSummary(data.save, names) }); } catch { pick = 'cloud'; }
      what = pick === 'device' ? 'force' : 'pull';
    }
    if (what === 'pull' && validSave(data?.save)) { adopt(data); return; }
    linkTo(user.id);
    if (what === 'same') setBase(rowStamp(data));
    if (what === 'push' || what === 'force') await push(true);   // decision already checked the cloud
    state.lastSync = Date.now(); state.sync = 'saved'; emit();
  }

  async function push(force = false) {
    if (!user || !sb || locked) return;
    if (!force && linked() !== user.id) return;   // not synced yet: never overwrite the account save
    if (!force && edits === sent) return;           // only the timer autosave ran: nothing the player did
    const save = getSave(), mark = edits;
    if (!validSave(save)) return;
    state.sync = 'saving'; emit();
    try {
      if (!force) {   // another device saved since our last sync → take theirs, do not overwrite
        const row = await fetchRow('save, saved_at');
        if (pushDecision({ remoteStamp: rowStamp(row), hasRow: !!row, base: base(), force }) === 'pull' && validSave(row?.save)) { adopt(row); return; }
      }
      const stamp = Math.round(save.savedAt || Date.now());
      const { error } = await sb.from(cfg.table).upsert({ user_id: user.id, save, saved_at: stamp, updated_at: new Date().toISOString() });
      if (error) throw error;
      linkTo(user.id); setBase(stamp); sent = mark;
    } catch (e) { state.sync = 'error'; emit(); throw e; }
    state.lastSync = Date.now(); state.sync = 'saved'; emit();
  }

  /** Back on screen: if another device saved meanwhile, load it. */
  async function checkRemote() {
    if (!user || !sb || locked || linked() !== user.id) return;
    try {
      const row = await fetchRow('save, saved_at');
      if (row && validSave(row.save) && rowStamp(row) !== base()) adopt(row);
    } catch (e) { console.warn('[cloud] check', e); }
  }

  function setUser(u) {
    user = u || null;
    state.signedIn = !!user;
    state.label = user ? accountLabel(user) : '';
    Object.assign(state, accountInfo(user));
    if (!user) { state.sync = 'idle'; state.lastSync = 0; }
    emit();
  }

  const api = {
    get state() { return { ...state }; },
    /** True while an account save is being loaded (the page is about to reload): do not write the local save. */
    get locked() { return locked; },
    /** Restore the session (and finish the Google redirect), then sync once. */
    async init() {
      if (!state.enabled) { emit(); return; }
      try {
        await client();
        const { data } = await sb.auth.getSession();
        setUser(data?.session?.user);
        sb.auth.onAuthStateChange((ev, session) => {
          const was = state.signedIn;
          setUser(session?.user);
          if (!was && state.signedIn) pull().catch((e) => console.warn('[cloud] pull', e));
        });
        // "signed in" toast survives the one reload that a cloud pull may cause
        const justIn = state.signedIn && !!(sessionStorage.getItem(SIGNING) || sessionStorage.getItem('mp-cloud-hello'));
        sessionStorage.removeItem(SIGNING);
        if (state.signedIn) {
          const pulled = sessionStorage.getItem('mp-cloud-pulled');
          if (pulled) { sessionStorage.removeItem('mp-cloud-pulled'); state.lastSync = Date.now(); state.sync = 'saved'; checkRemote(); }
          else {
            if (justIn) sessionStorage.setItem('mp-cloud-hello', '1');
            await pull().catch((e) => { state.sync = 'error'; console.warn('[cloud] pull', e); });
          }
          sessionStorage.removeItem('mp-cloud-hello');
          if (justIn) toast?.(`เข้าสู่ระบบสำเร็จ สวัสดี ${state.name || state.label || ''} · บันทึกออนไลน์แล้ว`.replace('  ', ' '));
          else if (pulled) toast?.('โหลดข้อมูลจากบัญชีแล้ว');
        }
      } catch (e) { console.warn('[cloud] init', e); }
      state.ready = true; emit();
      document.addEventListener('visibilitychange', () => { if (document.hidden) api.flush(); else checkRemote(); });
    },
    async signIn() {
      if (!state.enabled) return;
      try {
        await client();
        const redirectTo = location.origin + location.pathname;
        sessionStorage.setItem(SIGNING, '1');
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
        if (error) throw error;
      } catch (e) { sessionStorage.removeItem(SIGNING); console.warn('[cloud] sign in', e); toast?.('เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้งนะ'); }
    },
    async signOut() {
      if (!sb) return;
      try { await api.flush(); await sb.auth.signOut(); toast?.('ออกจากระบบแล้ว ข้อมูลยังอยู่ในเครื่องนี้'); } catch (e) { console.warn('[cloud] sign out', e); }
      setUser(null);
    },
    /** Called after a local save the player caused: upload a little later (debounced). */
    schedule() {
      edits++;
      if (!user) return;
      clearTimeout(pushT);
      pushT = setTimeout(() => push().catch((e) => console.warn('[cloud] push', e)), (cfg.pushDelaySec ?? 4) * 1000);
    },
    /** "บันทึกตอนนี้" in the profile card: upload now and say so. */
    async syncNow() {
      if (!user) return;
      clearTimeout(pushT); pushT = null;
      try { await push(); toast?.('บันทึกออนไลน์แล้ว'); } catch (e) { console.warn('[cloud] sync', e); toast?.('บันทึกออนไลน์ไม่สำเร็จ ลองอีกครั้งนะ'); }
    },
    /** Upload now (page hidden / sign out). */
    async flush() {
      if (!user) return;
      clearTimeout(pushT); pushT = null;
      try { await push(); } catch (e) { console.warn('[cloud] flush', e); }
    },
  };
  return api;
}
