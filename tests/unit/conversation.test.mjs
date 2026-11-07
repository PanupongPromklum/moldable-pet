// Keyword brain + babble plan (design/gdd/conversation.md 3.3–3.6, 4.2, 4.3).
// Run: node tests/unit/conversation.test.mjs
import { readFileSync } from 'node:fs';
import { test, assert, eq, done } from './_harness.mjs';
import { normalize } from '../../src/conversation/normalize.js';
import { compileMatcher, matchIntent, checkWhen, createKeywordBrain } from '../../src/conversation/keyword-brain.js';
import { planBabble, seededRng } from '../../src/audio/babble.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../../assets/data/${f}.json`, import.meta.url), 'utf8'));
const conv = load('conversation'), personas = load('personas'), foods = load('foods'), wardrobe = load('wardrobe');
const M = compileMatcher(conv, personas);
const intentOf = (t, key = 'flower') => matchIntent(M, t, key).intent;
const fixedRng = () => 0.42;
const ctx = (o = {}) => ({ charKey: 'flower', name: 'ไผ่', stage: 'grown', needs: { hunger: 0.6, toilet: 0.6, fun: 0.6, social: 0.6 },
  expression: 'original', room: 'living', outfit: {}, likedItemsWorn: [], xmasItemsVisible: 0, now: new Date(2026, 5, 10, 14), awayMinutes: 0, recent: [], ...o });

console.log('conversation brain');

test('normalize collapses repeats and drops spaces / ๆ', () => {
  eq(normalize('หิวววว ไหมมม').text, 'หิวไหม', 'repeat');
  eq(normalize('น่ารักๆ').text, 'น่ารัก', 'mai yamok');
});
test('exact match: หิวไหมครับ → ask_hungry', () => eq(intentOf('หิวไหมครับ'), 'ask_hungry', 'hungry'));
test('longest first: น่ารัก is praise_cute, not love', () => eq(intentOf('น่ารักจัง'), 'praise_cute', 'cute'));
test('สวัสดีปีใหม่ → new_year, not greeting or the name ใหม่', () => {
  const m = matchIntent(M, 'สวัสดีปีใหม่', 'flower');
  eq(m.intent, 'new_year', 'new year');
  eq(m.otherPet, false, 'ใหม่ not counted as another pet');
});
test('negation: ไม่รัก and ไม่น่ารัก → mean', () => {
  eq(intentOf('ไม่รัก'), 'mean', 'not love');
  eq(intentOf('ไม่น่ารักเลย'), 'mean', 'not cute');
});
test('short keyword needs a boundary: ราคาเท่าไหร่ is not outfit (เท่)', () => assert(intentOf('ราคาเท่าไหร่') !== 'outfit', 'no เท่'));
test('short keyword at a boundary: รักนะ → love', () => eq(intentOf('รัก นะ'), 'love', 'love'));
test('near pass catches a typo: ขอบคูณ → thanks', () => eq(intentOf('ขอบคูณมาก'), 'thanks', 'typo'));
test('pet name alone → call_name; other pet name flags otherPet', () => {
  eq(intentOf('ไผ่'), 'call_name', 'own name');
  const m = matchIntent(M, 'มิน', 'flower');
  eq(m.intent, 'unknown', 'other name is not an intent');
  eq(m.otherPet, true, 'otherPet');
});
test('nonsense → unknown', () => eq(intentOf('กขฃคฅฆ'), 'unknown', 'unknown'));
test('alternatives: best alternative wins', () => {
  eq(matchIntent(M, { alternatives: [{ text: 'กขค', confidence: 0.9 }, { text: 'หิวไหม', confidence: 0.5 }] }, 'flower').intent, 'ask_hungry', 'alt');
});
test('checkWhen: needs, lowNeed, late, room, likedWorn', () => {
  assert(checkWhen('needs.hunger < low', ctx({ needs: { hunger: 0.1 } })), 'hunger low');
  assert(!checkWhen('needs.hunger < low', ctx()), 'hunger ok');
  assert(checkWhen('lowNeed == toilet', ctx({ needs: { hunger: 0.25, toilet: 0.1, fun: 0.9, social: 0.9 } })), 'lowest');
  assert(checkWhen('late', ctx({ now: new Date(2026, 5, 10, 22) })), 'late');
  assert(checkWhen('room == kitchen', ctx({ room: 'kitchen' })), 'room');
  assert(checkWhen('likedWorn > 0', ctx({ likedItemsWorn: ['bow'] })), 'liked');
});
test('reply: hungry pet answers with the low variant + kitchen followUp, deterministic rng', () => {
  const brain = createKeywordBrain({ data: conv, personas, foods, wardrobe, rng: fixedRng });
  const r = brain.replySync('หิวไหม', ctx({ needs: { hunger: 0.1, toilet: 0.6, fun: 0.6, social: 0.6 } }));
  eq(r.intent, 'ask_hungry', 'intent');
  assert(r.lineId && r.lineId.includes('ask_hungry_low_grown'), `low grown line, got ${r.lineId}`);
  eq(r.followUp, 'kitchen', 'followUp');
  eq(r.source, 'keyword', 'source');
});
test('reply: stage variants (baby line for a baby)', () => {
  const brain = createKeywordBrain({ data: conv, personas, foods, wardrobe, rng: fixedRng });
  const r = brain.replySync('หิวไหม', ctx({ stage: 'baby', needs: { hunger: 0.1 } }));
  assert(r.lineId.includes('_baby_'), `baby line, got ${r.lineId}`);
});
test('reply: same line never twice in a row', () => {
  let i = 0; const rng = () => [0.1, 0.1, 0.1, 0.1][i++ % 4];
  const brain = createKeywordBrain({ data: conv, personas, foods, wardrobe, rng });
  const a = brain.replySync('รักนะ', ctx()), b = brain.replySync('รักนะ', ctx());
  assert(a.lineId !== b.lineId || !a.lineId, 'no repeat');
});
test('reply: placeholders filled, no braces left', () => {
  const brain = createKeywordBrain({ data: conv, personas, foods, wardrobe, rng: fixedRng });
  for (const t of ['ชอบกินอะไร', 'ชื่ออะไร', 'ชุดสวย']) {
    const r = brain.replySync(t, ctx({ outfit: { head: 'hat-santa' } }));
    assert(!/[{}]/.test(r.text), `${t}: ${r.text}`);
  }
});
test('reply: ปาม (no table) uses the neutral table; garbage input never throws', () => {
  const brain = createKeywordBrain({ data: conv, personas, foods, wardrobe, rng: fixedRng });
  const r = brain.replySync('สวัสดี', ctx({ charKey: 'pill', name: 'ปาม' }));
  assert(r.text && r.text !== '…?', `neutral text, got ${r.text}`);
  const z = brain.replySync(null, ctx());
  eq(z.intent, 'unknown', 'null input');
});
test('every intent × character × stage has a reply line', () => {
  const brain = createKeywordBrain({ data: conv, personas, foods, wardrobe, rng: fixedRng });
  for (const key of ['flower', 'splat', 'gumdrop', 'diamond', 'cloud']) for (const stage of ['baby', 'kid', 'grown']) {
    for (const it of conv.intents) {
      const kw = it.keywords?.[0]; if (!kw) continue;
      const r = brain.replySync(kw, ctx({ charKey: key, name: personas[key].name, stage }));
      assert(r.lineId, `${key}/${stage}/${it.id} (${kw}) → ${r.intent} no line`);
    }
  }
});
test('babble plan: deterministic, 2–14 syllables, baby higher than grown', () => {
  const a = planBabble('หิวไหมจ๊ะ', { charKey: 'flower', stage: 'grown', seed: 'x', tuning: conv.tuning });
  const b = planBabble('หิวไหมจ๊ะ', { charKey: 'flower', stage: 'grown', seed: 'x', tuning: conv.tuning });
  eq(JSON.stringify(a), JSON.stringify(b), 'same seed same plan');
  const long = planBabble('ก'.repeat(200), { charKey: 'flower', tuning: conv.tuning });
  eq(long.syllables.length, 14, 'cap');
  const baby = planBabble('หิวไหมจ๊ะ', { charKey: 'flower', stage: 'baby', seed: 'x', tuning: conv.tuning });
  const avg = (p) => p.syllables.reduce((s, x) => s + x.hz, 0) / p.syllables.length;
  assert(avg(baby) > avg(a), 'baby pitch higher');
  assert(seededRng('a')() !== seededRng('b')(), 'seeds differ');
});

done();
