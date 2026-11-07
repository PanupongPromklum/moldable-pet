/**
 * Cloud save with Google sign-in (Supabase Auth + one `pet_saves` row per player).
 * Owner: wire. Setup: docs/cloud-save.md. Rules: cloud-rules.js.
 *
 * Off unless assets/data/cloud.json has url + anonKey. supabase-js loads lazily from jsDelivr only
 * when enabled. Newest save wins (save.savedAt). After a pull the page reloads once so every system
 * starts from the cloud save. Pushes are debounced and also sent when the page is hidden.
 * @module game/cloud
 */
import { cloudEnabled, pickNewer, validSave, accountLabel } from './cloud-rules.js';

/**
 * @param {{ cfg: object, storageKey: string, getSave: () => object, onChange?: (state: object) => void, toast?: (msg: string) => void }} deps
 */
export function createCloud({ cfg, storageKey, getSave, onChange, toast }) {
  const state = { enabled: cloudEnabled(cfg), ready: false, signedIn: false, label: '', busy: false, lastSync: 0 };
  let sb = null, user = null, pushT = null;
  const emit = () => { try { onChange?.({ ...state }); } catch { /* ui only */ } };

  async function client() {
    if (sb || !state.enabled) return sb;
    const mod = await import(/* @vite-ignore */ cfg.supabaseJs);
    sb = mod.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    return sb;
  }

  async function pull() {
    if (!user) return;
    const { data, error } = await sb.from(cfg.table).select('save, saved_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const local = getSave();
    const what = pickNewer(local, data);
    if (what === 'pull' && validSave(data.save)) {
      localStorage.setItem(storageKey, JSON.stringify(data.save));
      sessionStorage.setItem('mp-cloud-pulled', '1');
      location.reload();
      return;
    }
    if (what === 'push') await push();
    state.lastSync = Date.now();
  }

  async function push() {
    if (!user || !sb) return;
    const save = getSave();
    if (!validSave(save)) return;
    const { error } = await sb.from(cfg.table).upsert({ user_id: user.id, save, saved_at: Math.round(save.savedAt || Date.now()), updated_at: new Date().toISOString() });
    if (error) throw error;
    state.lastSync = Date.now();
  }

  function setUser(u) {
    user = u || null;
    state.signedIn = !!user;
    state.label = user ? accountLabel(user) : '';
    emit();
  }

  const api = {
    get state() { return { ...state }; },
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
        if (state.signedIn) {
          if (sessionStorage.getItem('mp-cloud-pulled')) { sessionStorage.removeItem('mp-cloud-pulled'); toast?.('โหลดข้อมูลจากบัญชีแล้ว'); }
          else await pull();
        }
      } catch (e) { console.warn('[cloud] init', e); }
      state.ready = true; emit();
      document.addEventListener('visibilitychange', () => { if (document.hidden) api.flush(); });
    },
    async signIn() {
      if (!state.enabled) return;
      try {
        await client();
        const redirectTo = location.origin + location.pathname;
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
        if (error) throw error;
      } catch (e) { console.warn('[cloud] sign in', e); toast?.('เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้งนะ'); }
    },
    async signOut() {
      if (!sb) return;
      try { await api.flush(); await sb.auth.signOut(); toast?.('ออกจากระบบแล้ว ข้อมูลยังอยู่ในเครื่องนี้'); } catch (e) { console.warn('[cloud] sign out', e); }
      setUser(null);
    },
    /** Called after every local persist: upload a little later (debounced). */
    schedule() {
      if (!user) return;
      clearTimeout(pushT);
      pushT = setTimeout(() => push().catch((e) => console.warn('[cloud] push', e)), (cfg.pushDelaySec ?? 4) * 1000);
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
