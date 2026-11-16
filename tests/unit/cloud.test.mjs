// Cloud save rules (docs/cloud-save.md). Run: node tests/unit/cloud.test.mjs
import { test, assert, eq, done } from './_harness.mjs';
import { cloudEnabled, pickNewer, validSave, accountLabel, accountInfo, syncDecision, saveSummary, hasProgress } from '../../src/game/cloud-rules.js';
import { agoText, initialOf } from '../../src/ui/profile.js';

console.log('cloud rules');
const KEY = 'sb_publishable_' + 'x'.repeat(30);
test('enabled only with an https url and a key', () => {
  eq(cloudEnabled({ url: '', anonKey: '' }), false, 'empty');
  eq(cloudEnabled({ url: 'http://x.supabase.co', anonKey: KEY }), false, 'http');
  eq(cloudEnabled({ url: 'https://x.supabase.co', anonKey: 'short' }), false, 'short key');
  eq(cloudEnabled({ url: 'https://x.supabase.co', anonKey: KEY }), true, 'ok');
  eq(cloudEnabled(null), false, 'null');
});
test('newest save wins; 1 s tolerance; missing sides', () => {
  eq(pickNewer({ savedAt: 5000 }, null), 'push', 'no remote row → push');
  eq(pickNewer(null, { save: { savedAt: 1 }, saved_at: 1 }), 'pull', 'no local → pull');
  eq(pickNewer({ savedAt: 10_000 }, { save: {}, saved_at: 20_000 }), 'pull', 'remote newer');
  eq(pickNewer({ savedAt: 20_000 }, { save: {}, saved_at: 10_000 }), 'push', 'local newer');
  eq(pickNewer({ savedAt: 20_000 }, { save: {}, saved_at: 20_500 }), 'same', 'within 1 s');
});
test('validSave checks the basic shape', () => {
  assert(validSave({ version: 5, chars: {} }), 'ok');
  assert(!validSave({ version: '5', chars: {} }), 'bad version');
  assert(!validSave({ version: 5 }), 'no chars');
  assert(!validSave(null), 'null');
});
test('account label: name, else email local part', () => {
  eq(accountLabel({ user_metadata: { full_name: 'Panupong' }, email: 'p@x.com' }), 'Panupong', 'name');
  eq(accountLabel({ email: 'pet.lover@gmail.com' }), 'pet.lover', 'email');
  eq(accountLabel(null), '', 'none');
});
test('accountInfo: Google photo + name + email; only https photos; empty when signed out', () => {
  const u = { email: 'p@x.com', user_metadata: { full_name: 'Panupong P', avatar_url: 'https://lh3.googleusercontent.com/a/x' } };
  eq(JSON.stringify(accountInfo(u)), JSON.stringify({ name: 'Panupong P', email: 'p@x.com', avatar: 'https://lh3.googleusercontent.com/a/x' }), 'full');
  eq(accountInfo({ user_metadata: { picture: 'javascript:alert(1)' } }).avatar, '', 'unsafe photo dropped');
  eq(JSON.stringify(accountInfo(null)), JSON.stringify({ name: '', email: '', avatar: '' }), 'signed out');
});
test('profile: "last saved" text and the photo fallback letter', () => {
  const now = 1_000_000_000;
  eq(agoText(now - 20_000, now), 'เมื่อสักครู่', 'seconds');
  eq(agoText(now - 3 * 60_000, now), '3 นาทีที่แล้ว', 'minutes');
  eq(agoText(now - 2 * 3_600_000, now), '2 ชั่วโมงที่แล้ว', 'hours');
  eq(agoText(0, now), '', 'never');
  eq(initialOf('panupong'), 'P', 'latin'); eq(initialOf(''), '?', 'empty');
});
test('sign-in sync: account save is used; ask only when both sides have their own progress', () => {
  const remote = { save: { version: 5, chars: {}, savedAt: 1000 }, saved_at: 1000 };
  const played = { version: 5, chars: {}, chosen: true, savedAt: 5000 };
  const fresh = { version: 5, chars: {}, chosen: false, savedAt: 9000 };
  eq(syncDecision({ local: played, remote: null, linkedTo: null, userId: 'u1' }), 'push', 'no account save → upload this device');
  eq(syncDecision({ local: fresh, remote, linkedTo: null, userId: 'u1' }), 'pull', 'fresh device → account save, even if newer');
  eq(syncDecision({ local: played, remote, linkedTo: null, userId: 'u1' }), 'ask', 'two histories → ask');
  eq(syncDecision({ local: played, remote, linkedTo: 'u2', userId: 'u1' }), 'ask', 'device belongs to another account → ask');
  eq(syncDecision({ local: played, remote, linkedTo: 'u1', userId: 'u1' }), 'push', 'same account, device newer → upload');
  eq(syncDecision({ local: played, remote: { ...remote, saved_at: 9000 }, linkedTo: 'u1', userId: 'u1' }), 'pull', 'same account, cloud newer → download');
  eq(syncDecision({ local: { ...played, savedAt: 1200 }, remote, linkedTo: null, userId: 'u1' }), 'same', 'identical saves → nothing to ask');
  assert(!hasProgress(null) && hasProgress(played), 'progress = picked a pet');
});
test('saveSummary: pet name, whole coins, time', () => {
  eq(JSON.stringify(saveSummary({ selected: 'flower', coins: 12.7, savedAt: 3 }, { flower: 'ไผ่' })), JSON.stringify({ pet: 'ไผ่', coins: 12, savedAt: 3 }), 'summary');
  eq(saveSummary(null).pet, '', 'empty');
});
done();
