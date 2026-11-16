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

/**
 * Profile details for the HUD profile card (Google fills user_metadata).
 * @returns {{name: string, email: string, avatar: string}} empty strings when signed out
 */
export function accountInfo(user) {
  const m = user?.user_metadata || {};
  const avatar = [m.avatar_url, m.picture].find((u) => typeof u === 'string' && /^https:\/\//.test(u)) || '';
  return { name: m.full_name || m.name || '', email: user?.email || m.email || '', avatar };
}

/** The device save has real progress (the player picked a pet at least once). */
export function hasProgress(save) { return !!(save && save.chosen); }

/**
 * What to do when an account is signed in (owner 2026-11-16: a signed-in player plays the account's
 * save; when this device also has its own progress, ask which one to keep).
 * @param {{ local: object|null, remote: {save: object, saved_at?: number}|null, linkedTo: string|null, userId: string }} p
 *   linkedTo = the account this device save already belongs to (set after the first sync)
 * @returns {'push'|'pull'|'same'|'ask'}
 */
export function syncDecision({ local, remote, linkedTo, userId }) {
  const remoteOk = !!(remote && validSave(remote.save));
  if (!remoteOk) return 'push';                       // new account: it adopts this device's progress
  if (!hasProgress(local)) return 'pull';             // nothing to lose here: use the account
  if (linkedTo && linkedTo === userId) return pickNewer(local, remote);   // same lineage: newest wins
  return pickNewer(local, remote) === 'same' ? 'same' : 'ask';           // two different histories
}

/**
 * Short facts for the "which save?" choice.
 * @param {object} save @param {Record<string,string>} [names] character key → Thai name
 * @returns {{ pet: string, coins: number, savedAt: number }}
 */
export function saveSummary(save, names = {}) {
  const key = save?.selected;
  return { pet: (key && names[key]) || '', coins: Math.max(0, Math.floor(Number(save?.coins) || 0)), savedAt: Number(save?.savedAt) || 0 };
}
