// Conversation game-side rules (design/gdd/conversation.md 3.1, 3.8, 3.9, 3.11, 4.4; A8, A10).
// Run: node tests/unit/talk.test.mjs
import { test, assert, eq, near, deepEq, done } from './_harness.mjs';
import { pickMode, errorEffect, sanitizeReply, talkNeeds, intentGain, understood, silenceLines } from '../../src/game/talk-rules.js';

const ACT = { talkSocial: 0.04, talkSocialCapPerMinute: 0.12, talkFun: 0.01 };
console.log('talk rules');

test('pickMode: auto + supported → talk; setting echo, session echo, unsupported → echo', () => {
  eq(pickMode({ setting: 'auto', session: null, support: 'remote' }).mode, 'talk', 'auto');
  eq(pickMode({ setting: 'talk', session: null, support: 'local' }).mode, 'talk', 'talk');
  eq(pickMode({ setting: 'echo', session: null, support: 'remote' }).mode, 'echo', 'setting');
  eq(pickMode({ setting: 'auto', session: 'echo', support: 'remote' }).mode, 'echo', 'session');
  eq(pickMode({ setting: 'auto', session: null, support: 'none' }).reason, 'unsupported', 'none');
  eq(pickMode({ setting: 'auto', session: null, support: null }).mode, 'echo', 'no listener module');
});

test('pickMode: iOS home-screen app, in-app browsers, offline remote → echo; offline local → talk', () => {
  eq(pickMode({ setting: 'auto', session: null, support: 'remote', ios: true, standalone: true }).reason, 'standalone', 'standalone');
  eq(pickMode({ setting: 'auto', session: null, support: 'remote', ua: 'Mozilla/5.0 (iPhone) Line/13.1.0' }).reason, 'in-app', 'LINE');
  eq(pickMode({ setting: 'auto', session: null, support: 'remote', ua: 'Mozilla/5.0 [FBAN/FBIOS;FBAV/400]' }).reason, 'in-app', 'Facebook');
  eq(pickMode({ setting: 'auto', session: null, support: 'remote', online: false }).reason, 'offline', 'offline');
  eq(pickMode({ setting: 'auto', session: null, support: 'local', online: false }).mode, 'talk', 'local offline ok');
  eq(pickMode({ setting: 'auto', session: null, support: 'remote', ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36' }).mode, 'talk', 'plain Chrome');
});

test('errorEffect follows GDD 3.9 step 6', () => {
  deepEq(errorEffect('not-allowed'), { fallback: 'session', message: 'denied', silent: false, timeout: false }, 'denied');
  eq(errorEffect('language-not-supported').fallback, 'session', 'language');
  eq(errorEffect('start-timeout').fallback, 'session', 'Edge dead API');
  deepEq(errorEffect('network'), { fallback: 'press', message: 'offline', silent: false, timeout: false }, 'network');
  eq(errorEffect('no-speech').timeout, true, 'no-speech = timeout path');
  eq(errorEffect('aborted').silent, true, 'aborted silent');
});

test('A10 sanitizeReply: unknown expression → original, bad action → null, text ≤ 120, followUp checked', () => {
  const r = sanitizeReply({ intent: 'love', text: 'x'.repeat(200), expression: 'evil', action: 'explode', followUp: 'moon', needs: { social: 9 }, source: 'ai' });
  eq(r.expression, 'original', 'expr'); eq(r.action, null, 'action'); eq(r.text.length, 120, 'cut'); eq(r.followUp, null, 'followUp'); eq(r.source, 'ai', 'source');
  assert(!('needs' in r), 'brain need deltas are never trusted');
  const ok = sanitizeReply({ intent: 'ask_hungry', text: 'หิว!', expression: 'hungry', action: 'wiggle', followUp: 'kitchen' });
  eq(ok.expression, 'hungry', 'kept'); eq(ok.followUp, 'kitchen', 'kitchen');
  eq(sanitizeReply(null).intent, 'unknown', 'null reply');
});

test('A8 social: ไผ่ love +0.09, then capped at 0.12 per rolling minute; mean 0; unknown half', () => {
  const h = [];
  near(talkNeeds({ intent: 'love', petGain: 1.5, nowSec: 0, history: h, actions: ACT }).social, 0.09, 1e-9, 'first');
  near(talkNeeds({ intent: 'love', petGain: 1.5, nowSec: 10, history: h, actions: ACT }).social, 0.03, 1e-9, 'second');
  eq(talkNeeds({ intent: 'love', petGain: 1.5, nowSec: 20, history: h, actions: ACT }).social, 0, 'third');
  near(talkNeeds({ intent: 'love', petGain: 1.5, nowSec: 61, history: h, actions: ACT }).social, 0.09, 1e-9, 'first entry rolled out (0.03 still used)');
  eq(talkNeeds({ intent: 'mean', petGain: 1.5, nowSec: 0, history: [], actions: ACT }).social, 0, 'mean');
  near(talkNeeds({ intent: 'unknown', petGain: 1, nowSec: 0, history: [], actions: ACT }).social, 0.02, 1e-9, 'unknown half');
  near(talkNeeds({ intent: 'ask_hungry', petGain: 0.7, nowSec: 0, history: [], actions: ACT }).social, 0.028, 1e-9, 'ฟ้า ask_hungry');
});

test('talk fun only for play / joke / sing; groups from conversation.json win', () => {
  eq(talkNeeds({ intent: 'joke', petGain: 1, nowSec: 0, history: [], actions: ACT }).fun, 0.01, 'joke');
  eq(talkNeeds({ intent: 'greeting', petGain: 1, nowSec: 0, history: [], actions: ACT }).fun, 0, 'greeting');
  const conv = { intentGain: { affection: 2, default: 1, unknown: 0.5, mean: 0 }, intents: [{ id: 'greeting', group: 'affection' }] };
  eq(intentGain('greeting', conv), 2, 'data group');
  eq(intentGain('love', null), 1.5, 'fallback affection');
});

test('understood + silence lines', () => {
  assert(understood('love') && !understood('unknown') && !understood('mean'), 'understood');
  deepEq(silenceLines({ lines_silence: { flower: ['ฮัลโหลล?'] } }, null, 'flower'), ['ฮัลโหลล?'], 'data');
  deepEq(silenceLines(null, { lines: { silence: ['…?!'] } }, 'flower'), ['…?!'], 'persona');
  deepEq(silenceLines(null, null, 'x'), ['…?'], 'fallback');
});

done();
