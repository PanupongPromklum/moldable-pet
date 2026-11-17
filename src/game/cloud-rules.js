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

/** The cloud row's version stamp (`saved_at`), as a number (0 when missing). */
export const rowStamp = (row) => Number(row?.saved_at ?? row?.save?.savedAt) || 0;

/**
 * What to do when an account is signed in (owner 2026-11-16: a signed-in player plays the account's
 * save; when this device also has its own progress, ask which one to keep).
 * Owner 2026-11-17 (several devices): a device never decides by its own clock, because the game
 * writes the local save on boot before the cloud answers. It remembers `base` = the cloud stamp it
 * last downloaded or uploaded; when the cloud stamp is anything else, another device wrote since → pull.
 * @param {{ local: object|null, remote: {save: object, saved_at?: number}|null, linkedTo: string|null, userId: string, base?: number|null }} p
 *   linkedTo = the account this device save already belongs to; base = cloud stamp this device last synced
 * @returns {'push'|'pull'|'same'|'ask'}
 */
export function syncDecision({ local, remote, linkedTo, userId, base = null }) {
  const remoteOk = !!(remote && validSave(remote.save));
  if (!remoteOk) return 'push';                       // new account: it adopts this device's progress
  if (!hasProgress(local)) return 'pull';             // nothing to lose here: use the account
  if (linkedTo && linkedTo === userId) {              // same account: the account save is the truth
    const b = Number(base) || 0;
    return b && b === rowStamp(remote) ? 'push' : 'pull';   // unchanged since our last sync → ours is the continuation
  }
  return pickNewer(local, remote) === 'same' ? 'same' : 'ask';           // two different histories
}

/**
 * Before an upload: may this device write over the account save?
 * @param {{ remoteStamp: number, hasRow: boolean, base?: number|null, force?: boolean }} p
 * @returns {'push'|'pull'} pull = another device saved since this one last synced
 */
export function pushDecision({ remoteStamp, hasRow, base = null, force = false }) {
  if (force || !hasRow) return 'push';
  return (Number(base) || 0) === (Number(remoteStamp) || 0) ? 'push' : 'pull';
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
