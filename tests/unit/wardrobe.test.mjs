// Wardrobe buy / equip rules. Run: node tests/unit/wardrobe.test.mjs
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, deepEq, done } from './_harness.mjs';
import { makeWardrobe, rng } from './fixtures/sprint2.mjs';
import {
  starterOwned, sanitizeOwned, sanitizeOutfit, emptyOutfit, equipItem, buyItem, wearEvent, wearReaction, slotIds,
} from '../../src/game/wardrobe.js';

console.log('wardrobe');

test('starter items are owned from the start', () => {
  const W = makeWardrobe();
  deepEq(starterOwned(W), ['bow-ribbon', 'glasses-round'], 'starters');
  deepEq(sanitizeOwned(undefined, W), ['bow-ribbon', 'glasses-round'], 'no save → starters');
});

test('sanitizeOwned keeps bought items, adds starters, drops unknown and duplicates', () => {
  deepEq(sanitizeOwned(['scarf', 'scarf', 'nope', 7], makeWardrobe()), ['scarf', 'bow-ribbon', 'glasses-round'], 'owned');
});

test('sanitizeOwned with no catalog keeps saved ids (late data file never wipes purchases)', () => {
  deepEq(sanitizeOwned(['scarf', 'hat-party'], null), ['scarf', 'hat-party'], 'kept');
});

test('empty outfit has the three contract slots, all null', () => {
  deepEq(emptyOutfit(makeWardrobe()), { head: null, eyes: null, body: null }, 'outfit');
  deepEq(slotIds(null), ['head', 'eyes', 'body'], 'fallback slots');
});

test('equip puts one item per slot: a second head item replaces the first', () => {
  const W = makeWardrobe();
  const owned = ['bow-ribbon', 'hat-beanie', 'glasses-round'];
  const a = equipItem(emptyOutfit(W), 'head', 'bow-ribbon', owned, W);
  const b = equipItem(a.outfit, 'eyes', 'glasses-round', owned, W);
  const c = equipItem(b.outfit, 'head', 'hat-beanie', owned, W);
  assert(a.ok && b.ok && c.ok, 'all ok');
  deepEq(c.outfit, { head: 'hat-beanie', eyes: 'glasses-round', body: null }, 'replaced head only');
  deepEq(b.outfit, { head: 'bow-ribbon', eyes: 'glasses-round', body: null }, 'input not mutated');
});

test('equip null empties the slot', () => {
  const W = makeWardrobe();
  const r = equipItem({ head: 'bow-ribbon', eyes: null, body: null }, 'head', null, ['bow-ribbon'], W);
  assert(r.ok, 'ok'); eq(r.outfit.head, null, 'head');
});

test('equip refuses an item that is not owned, unknown, or in another slot', () => {
  const W = makeWardrobe();
  const o = emptyOutfit(W), owned = starterOwned(W);
  eq(equipItem(o, 'body', 'scarf', owned, W).reason, 'notOwned', 'not owned');
  eq(equipItem(o, 'head', 'ghost-hat', owned, W).reason, 'unknown', 'unknown');
  eq(equipItem(o, 'head', 'glasses-round', owned, W).reason, 'wrongSlot', 'wrong slot');
  eq(equipItem(o, 'tail', null, owned, W).reason, 'badSlot', 'bad slot');
  deepEq(equipItem(o, 'body', 'scarf', owned, W).outfit, o, 'outfit unchanged on refusal');
});

test('buy without enough coins fails and changes nothing', () => {
  const W = makeWardrobe();
  const owned = starterOwned(W);
  const r = buyItem({ coins: 69, owned }, 'scarf', W);
  assert(!r.ok, 'refused'); eq(r.reason, 'coins', 'reason'); eq(r.coins, 69, 'coins kept'); eq(r.price, 70, 'price reported');
  deepEq(r.owned, owned, 'owned unchanged');
});

test('buy with exactly enough coins deducts the price and adds the item', () => {
  const W = makeWardrobe();
  const r = buyItem({ coins: 70, owned: starterOwned(W) }, 'scarf', W);
  assert(r.ok, 'bought'); eq(r.coins, 0, 'coins'); assert(r.owned.includes('scarf'), 'owned');
});

test('buy refuses an already-owned or unknown item', () => {
  const W = makeWardrobe();
  eq(buyItem({ coins: 999, owned: ['scarf'] }, 'scarf', W).reason, 'owned', 'owned');
  eq(buyItem({ coins: 999, owned: [] }, 'cape', W).reason, 'unknown', 'unknown');
});

test('outfit from a save drops unowned and wrong-slot items', () => {
  const W = makeWardrobe();
  deepEq(sanitizeOutfit({ head: 'hat-party', eyes: 'bow-ribbon', body: 'tie-neck' }, W, ['bow-ribbon', 'tie-neck']),
    { head: null, eyes: null, body: 'tie-neck' }, 'clean');
});

test('wearEvent: wearLike for a liked item, wearOk otherwise', () => {
  const W = makeWardrobe();
  eq(wearEvent(W.items[0], 'flower'), 'wearLike', 'flower likes bow');
  eq(wearEvent(W.items[0], 'cloud'), 'wearOk', 'cloud ok');
});

test('economy AC5: coins never go negative over 1000 seeded buy/equip operations', () => {
  const W = makeWardrobe(), r = rng(3);
  let coins = 100, owned = starterOwned(W), outfit = emptyOutfit(W);
  for (let i = 0; i < 1000; i++) {
    const it = W.items[Math.floor(r() * W.items.length)];
    if (r() < 0.5) { const b = buyItem({ coins, owned }, it.id, W); coins = b.coins; owned = b.owned; }
    else outfit = equipItem(outfit, it.slot, r() < 0.2 ? null : it.id, owned, W).outfit;
    if (r() < 0.1) coins += 15;
    assert(coins >= 0 && Number.isInteger(coins), `coins ${coins} at op ${i}`);
    for (const s of Object.keys(outfit)) assert(outfit[s] === null || owned.includes(outfit[s]), 'worn item is owned');
  }
});

const RX = { ...makeWardrobe(), reactions: { like: { line: 'wearLike', social: 0.03, fun: 0.02 }, ok: { line: 'wearOk', social: 0, fun: 0 } }, bonusCooldownSeconds: 600 };
test('economy AC6: a liked item twice within 600 s gives the need bonus once', () => {
  const T = 1_700_000_000_000, bow = RX.items[0];
  const a = wearReaction(bow, 'flower', RX, 0, T);
  assert(a.bonus && a.social === 0.03 && a.fun === 0.02 && a.line === 'wearLike', JSON.stringify(a));
  const b = wearReaction(bow, 'flower', RX, T, T + 599_000);
  assert(!b.bonus && b.social === 0 && b.kind === 'like', 'cooldown');
  assert(wearReaction(bow, 'flower', RX, T, T + 600_000).bonus, 'after cooldown');
});

test('not-liked item: wearOk line, no bonus', () => {
  const r = wearReaction(RX.items[0], 'cloud', RX, 0, 1);
  assert(r.kind === 'ok' && r.line === 'wearOk' && !r.bonus, JSON.stringify(r));
});

const real = fileURLToPath(new URL('../../assets/data/wardrobe.json', import.meta.url));
if (existsSync(real)) {
  test('assets/data/wardrobe.json: 11 contract ids in the right slots, starters owned from the start', () => {
    const W = JSON.parse(readFileSync(real, 'utf8'));
    const SLOT = { 'hat-beanie': 'head', 'hat-party': 'head', 'bow-ribbon': 'head', 'crown-flower': 'head', 'glasses-round': 'eyes', 'glasses-sun': 'eyes', 'glasses-star': 'eyes', 'tie-neck': 'body', 'tie-bow': 'body', scarf: 'body', 'badge-star': 'body' };
    deepEq(W.items.map((i) => i.id).sort(), Object.keys(SLOT).sort(), 'ids');
    for (const it of W.items) eq(it.slot, SLOT[it.id], it.id);
    const st = sanitizeOwned(undefined, W);
    assert(st.length >= 3 && slotIds(W).every((s) => st.some((id) => SLOT[id] === s)), `starter per slot: ${st}`);
  });
} else console.log('  skip  wardrobe.json not present');

done();
