// Furniture rules + save v4 (S4-06). Run: node tests/unit/furniture.test.mjs
import { test, assert, eq, deepEq, done } from './_harness.mjs';
import { makeWardrobe, memStorage } from './fixtures/sprint2.mjs';
import { makeFurniture, makeV3Save } from './fixtures/sprint4.mjs';
import {
  defaultFurniture, defaultOwnedFurniture, sanitizeOwnedAll, sanitizeFurniture, equipFurniture,
  revertPartial, decorView, slotIdsOf, defaultItemId, isXmas, findFurniture,
} from '../../src/game/furniture.js';
import { buyItem } from '../../src/game/wardrobe.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrateSave, newSave, createGameState, SAVE_KEY, SAVE_VERSION } from '../../src/game/state.js';

const load = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../assets/data/${f}`, import.meta.url)), 'utf8'));
const BASE = { needs: load('needs.json'), foods: load('foods.json'), personas: load('personas.json') };
const T0 = 1_700_000_000_000;
const ROOMS = ['living', 'kitchen', 'bathroom'];

console.log('furniture');

test('defaultFurniture_fillsEverySlot_withTheDefaultItem', () => {
  // Arrange
  const cat = makeFurniture();
  // Act
  const d = defaultFurniture(cat);
  // Assert
  deepEq(d, { living: { sofa: 'sofa-classic', corner: 'plant-pot' }, bathroom: { rug: 'mat-bath' } }, 'defaults');
});

test('defaultItemId_noDefaultFlag_fallsBackToFirstItemOfSlot', () => {
  const cat = makeFurniture();
  cat.items = cat.items.map((it) => ({ ...it, default: false }));
  eq(defaultItemId(cat, 'living', 'sofa'), 'sofa-classic', 'first of slot');
  eq(defaultItemId(cat, 'living', 'nope'), null, 'unknown slot');
});

test('slotIdsOf_followsCatalogOrder_andFallsBack', () => {
  deepEq(slotIdsOf(makeFurniture(), 'living'), ['sofa', 'corner'], 'catalog slots');
  deepEq(slotIdsOf(null, 'kitchen', ['fridge', 'wall']), ['fridge', 'wall'], 'fallback');
  deepEq(slotIdsOf({ items: [{ id: 'a', room: 'kitchen', slot: 'rug' }] }, 'kitchen'), ['rug'], 'slots from items');
});

test('sanitizeOwnedAll_bothCatalogs_dropsUnknownIds_addsStartersAndDefaults', () => {
  // Arrange
  const raw = ['scarf', 'sofa-cloud', 'ghost-item', 'scarf', 7, null];
  // Act
  const o = sanitizeOwnedAll(raw, makeWardrobe(), makeFurniture());
  // Assert
  deepEq(o, ['scarf', 'sofa-cloud', 'bow-ribbon', 'glasses-round', 'sofa-classic', 'plant-pot', 'mat-bath'], 'owned');
});

test('sanitizeOwnedAll_furnitureCatalogMissing_keepsUnknownIds (nothing bought is lost)', () => {
  const o = sanitizeOwnedAll(['scarf', 'sofa-cloud', 'ghost'], makeWardrobe(), null);
  assert(o.includes('sofa-cloud') && o.includes('ghost') && o.includes('bow-ribbon'), JSON.stringify(o));
  const o2 = sanitizeOwnedAll(['scarf', 'sofa-cloud'], null, makeFurniture());
  assert(o2.includes('scarf') && o2.includes('sofa-cloud') && o2.includes('sofa-classic'), JSON.stringify(o2));
});

test('sanitizeFurniture_unownedWrongSlotOrUnknown_fallsBackToDefault', () => {
  // Arrange
  const cat = makeFurniture();
  const owned = ['sofa-xmas'];
  const raw = { living: { sofa: 'sofa-xmas', corner: 'xmas-tree' }, bathroom: { rug: 'sofa-cloud' }, attic: { x: 'y' } };
  // Act
  const f = sanitizeFurniture(raw, cat, owned);
  // Assert: owned item kept; unowned tree → default; wrong-room id → default; unknown room dropped
  deepEq(f, { living: { sofa: 'sofa-xmas', corner: 'plant-pot' }, bathroom: { rug: 'mat-bath' } }, 'furniture');
});

test('sanitizeFurniture_noCatalog_keepsSavedStrings', () => {
  const f = sanitizeFurniture({ living: { sofa: 'sofa-cloud', rug: 5 }, kitchen: 'x' }, null, []);
  deepEq(f, { living: { sofa: 'sofa-cloud' }, kitchen: {}, bathroom: {} }, 'kept');
});

test('equipFurniture_ownedItem_equips_withoutMutatingInput', () => {
  const cat = makeFurniture();
  const cur = defaultFurniture(cat);
  const r = equipFurniture(cur, 'living', 'sofa', 'sofa-cloud', ['sofa-cloud'], cat);
  eq(r.ok, true, 'ok'); eq(r.furniture.living.sofa, 'sofa-cloud', 'equipped'); eq(cur.living.sofa, 'sofa-classic', 'input untouched');
  eq(r.item.id, 'sofa-cloud', 'item');
});

test('equipFurniture_rejects_notOwned_wrongSlot_unknown_badSlot_same', () => {
  const cat = makeFurniture();
  const cur = defaultFurniture(cat);
  eq(equipFurniture(cur, 'living', 'sofa', 'sofa-xmas', [], cat).reason, 'notOwned', 'not owned');
  eq(equipFurniture(cur, 'living', 'corner', 'sofa-cloud', ['sofa-cloud'], cat).reason, 'wrongSlot', 'wrong slot');
  eq(equipFurniture(cur, 'bathroom', 'rug', 'sofa-cloud', ['sofa-cloud'], cat).reason, 'wrongSlot', 'wrong room');
  eq(equipFurniture(cur, 'living', 'sofa', 'ghost', [], cat).reason, 'unknown', 'unknown');
  eq(equipFurniture(cur, 'living', 'lamp', 'sofa-cloud', [], cat).reason, 'badSlot', 'bad slot');
  eq(equipFurniture(cur, 'living', 'sofa', 'sofa-classic', [], cat).reason, 'same', 'already equipped');
});

test('equipFurniture_null_putsTheDefaultBack (defaults always owned)', () => {
  const cat = makeFurniture();
  const cur = { ...defaultFurniture(cat), living: { sofa: 'sofa-cloud', corner: 'plant-pot' } };
  const r = equipFurniture(cur, 'living', 'sofa', null, [], cat);
  eq(r.ok, true, 'ok'); eq(r.furniture.living.sofa, 'sofa-classic', 'default');
});

test('buyItem_onFurnitureCatalog_spendsCoins_andRejectsDoubleBuyOrTooFewCoins', () => {
  // Arrange (the wardrobe purchase rule is reused for furniture: same items[]/price shape)
  const cat = makeFurniture();
  const owned = defaultOwnedFurniture(cat);
  // Act
  const ok = buyItem({ coins: 200, owned }, 'sofa-xmas', cat);
  const twice = buyItem({ coins: ok.coins, owned: ok.owned }, 'sofa-xmas', cat);
  const poor = buyItem({ coins: 79, owned }, 'mat-duck', cat);
  const exact = buyItem({ coins: 80, owned }, 'mat-duck', cat);
  // Assert
  eq(ok.ok, true, 'bought'); eq(ok.coins, 0, 'exact coins → 0'); assert(ok.owned.includes('sofa-xmas'), 'owned');
  eq(twice.reason, 'owned', 'double buy'); eq(poor.reason, 'coins', 'too few'); eq(poor.price, 80, 'price'); eq(exact.ok, true, 'exact');
});

test('revertPartial_listsOnlySlotsThatDiffer', () => {
  deepEq(revertPartial({ sofa: 'sofa-xmas', corner: 'plant-pot' }, { sofa: 'sofa-classic', corner: 'plant-pot' }), { sofa: 'sofa-classic' }, 'one slot');
  eq(revertPartial({ sofa: 'sofa-classic' }, { sofa: 'sofa-classic' }), null, 'nothing');
});

test('decorView_buildsTheContractShape_forOneRoom', () => {
  const cat = makeFurniture();
  const v = decorView(cat, 'living', { owned: ['sofa-classic'], furniture: { sofa: 'sofa-classic', corner: 'plant-pot' }, coins: 50, thumbOf: (id) => (id === 'sofa-xmas' ? 'data:x' : null) });
  deepEq(v.slots, [{ id: 'sofa', label: 'โซฟา' }, { id: 'corner', label: 'มุมห้อง' }], 'slots');
  eq(v.items.length, 5, 'only living items');
  deepEq(v.items[2], { id: 'sofa-xmas', slot: 'sofa', room: 'living', name: 'โซฟาซานต้า', price: 200, theme: 'xmas', default: false, thumb: 'data:x' }, 'item');
  eq(v.items[0].thumb, null, 'missing thumb → null'); eq(v.coins, 50, 'coins'); deepEq(v.themes, cat.themes, 'themes');
  assert(isXmas(findFurniture(cat, 'xmas-tree')) && !isXmas(findFurniture(cat, 'sofa-cloud')), 'isXmas');
});

console.log('save v4');
const DATA = { ...BASE, wardrobe: makeWardrobe(), furniture: makeFurniture() };

test('newSave_isV4_withDefaultFurniture_andDefaultsOwned', () => {
  const s = newSave(DATA, T0);
  eq(s.version, SAVE_VERSION, 'version');
  deepEq(s.furniture, defaultFurniture(DATA.furniture), 'furniture');
  for (const id of ['sofa-classic', 'plant-pot', 'mat-bath', 'bow-ribbon']) assert(s.owned.includes(id), `owned ${id}`);
});

test('migrateSave_v3_keepsEverything_andAddsDefaultFurniture', () => {
  // Arrange
  const v3 = makeV3Save(T0);
  // Act
  const m = migrateSave(JSON.parse(JSON.stringify(v3)), DATA, T0, ROOMS);
  // Assert
  eq(m.version, SAVE_VERSION, 'version'); eq(m.selected, 'gumdrop', 'selected'); eq(m.room, 'bathroom', 'room'); eq(m.coins, 310, 'coins');
  deepEq(m.settings, { ...v3.settings, talkMode: 'auto', talkNoticeSeen: false }, 'settings (v5 adds talk settings)');
  deepEq(m.chars.gumdrop.needs, v3.chars.gumdrop.needs, 'needs'); eq(m.chars.gumdrop.tLast, T0 - 1000, 'tLast');
  deepEq(m.chars.gumdrop.outfit, v3.chars.gumdrop.outfit, 'outfit'); eq(m.chars.gumdrop.best.snackRain, 220, 'best');
  eq(m.chars.gumdrop.wearBonusAt, T0 - 5000, 'bonus');
  assert(m.owned.includes('scarf') && m.owned.includes('sofa-classic') && m.owned.includes('mat-bath'), 'owned');
  deepEq(m.furniture, defaultFurniture(DATA.furniture), 'all defaults');
});

test('migrateSave_v4_roundTripsFurniture_andDropsTamperedIds', () => {
  const s = newSave(DATA, T0);
  s.owned.push('sofa-xmas', 'ghost');
  s.furniture.living.sofa = 'sofa-xmas'; s.furniture.living.corner = 'xmas-tree'; s.furniture.bathroom.rug = 'ghost';
  const m = migrateSave(JSON.parse(JSON.stringify(s)), DATA, T0);
  eq(m.furniture.living.sofa, 'sofa-xmas', 'bought item kept');
  eq(m.furniture.living.corner, 'plant-pot', 'unowned → default');
  eq(m.furniture.bathroom.rug, 'mat-bath', 'unknown → default');
  assert(!m.owned.includes('ghost'), 'unknown id dropped from owned');
});

test('createGameState_furniturePersistsThroughStorage_sharedByCharacters', () => {
  const st = memStorage();
  const a = createGameState({ data: DATA, storage: st, now: () => T0 });
  const r = buyItem({ coins: 500, owned: a.owned }, 'xmas-tree', DATA.furniture);
  a.setPurse(r.coins, r.owned);
  const e = equipFurniture(a.furniture(), 'living', 'corner', 'xmas-tree', a.owned, DATA.furniture);
  a.setFurniture(e.furniture);
  a.select('cloud');
  assert(a.persist(), 'persist');
  const b = createGameState({ data: DATA, storage: st, now: () => T0 });
  eq(JSON.parse(st.mem.get(SAVE_KEY)).version, SAVE_VERSION, 'on disk current version');
  eq(b.furniture('living').corner, 'xmas-tree', 'furniture kept'); eq(b.coins, 240, 'coins');
  b.select('flower'); eq(b.furniture('living').corner, 'xmas-tree', 'same for every character');
  const copy = b.furniture('living'); copy.corner = 'x'; eq(b.furniture('living').corner, 'xmas-tree', 'getter returns a copy');
});

test('createGameState_noFurnitureData_bootsWithEmptyRooms_andKeepsSavedIds', () => {
  const st = memStorage();
  const s = newSave(DATA, T0); s.owned.push('sofa-cloud'); s.furniture.living.sofa = 'sofa-cloud';
  st.setItem(SAVE_KEY, JSON.stringify(s));
  const g = createGameState({ data: { ...BASE, wardrobe: makeWardrobe() }, storage: st, now: () => T0 });
  eq(g.furniture('living').sofa, 'sofa-cloud', 'kept'); assert(g.owned.includes('sofa-cloud'), 'owned kept');
  deepEq(Object.keys(g.furniture()), ROOMS, 'rooms');
});

done();
