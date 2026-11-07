/**
 * Cloud save — pure rules (no network). Unit tests: tests/unit/cloud.test.mjs.
 * @module game/cloud-rules
 */

/** Cloud is configured when both the project URL and the public (anon / publishable) key are set. */
export function cloudEnabled(cfg) {
  return !!(cfg && typeof cfg.url === 'string' && /^https:\/\//.test(cfg.url) && typeof cfg.anonKey === 'string' && cfg.anonKey.length > 20);
}

/**
 * Which save wins when a player signs in or reopens the game (newest `savedAt` wins).
 * @param {{savedAt?: number}|null} local @param {{save: object, saved_at?: number}|null} remote row
 * @returns {'push'|'pull'|'same'}
 */
export function pickNewer(local, remote) {
  const l = Number(local?.savedAt) || 0;
  const r = Number(remote?.saved_at ?? remote?.save?.savedAt) || 0;
  if (!remote || !remote.save) return 'push';
  if (!local) return 'pull';
  if (r > l + 1000) return 'pull';     // 1 s tolerance: the same save written from this device
  if (l > r + 1000) return 'push';
  return 'same';
}

/** A save object is usable (basic shape check before replacing local data). */
export function validSave(s) {
  return !!(s && typeof s === 'object' && Number.isFinite(s.version) && s.chars && typeof s.chars === 'object');
}

/** Short label for the signed-in account (email local part, or name). */
export function accountLabel(user) {
  const m = user?.user_metadata || {};
  return m.full_name || m.name || (user?.email ? user.email.replace(/@.*/, '') : '');
}
