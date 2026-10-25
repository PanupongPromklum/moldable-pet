// Save v1 → v2 migration (owned, outfits, settings, best). Run: node tests/unit/save-migration.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, deepEq, done } from './_harness.mjs';
import { makeWardrobe, makeV1Save, memStorage } from './fixtures/sprint2.mjs';
import { migrateSave, createGameState, newSave, SAVE_KEY, SAVE_VERSION } from '../../src/game/state.js';

const load = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../assets/data/${f}`, import.meta.url)), 'utf8'));
const BASE = { needs: load('needs.json'), foods: load('foods.json'), personas: load('personas.json') };
const DATA = { ...BASE, wardrobe: makeWardrobe() };
const T0 = 1_700_000_000_000;

console.log('save migration');

test('new save is v2 with starter items owned, empty outfits, camera shown, best 0', () => {
  const s = newSave(DATA, T0);
  eq(s.version, SAVE_VERSION, 'version'); eq(SAVE_VERSION, 2, 'v2');
  deepEq(s.owned, ['bow-ribbon', 'glasses-round'], 'owned');
  deepEq(s.chars.flower.outfit, { head: null, eyes: null, body: null }, 'outfit');
  deepEq(s.settings, { cameraHidden: false }, 'settings');
  deepEq(s.chars.flower.best, { snackRain: 0 }, 'best per character');
  eq(s.coins, 0, 'no startCoins → 0');
});

test('new save starts with wardrobe startCoins; a migrated v1 save keeps its own coins', () => {
  const W = { ...DATA, wardrobe: { ...makeWardrobe(), startCoins: 60 } };
  eq(newSave(W, T0).coins, 60, 'new');
  eq(migrateSave(makeV1Save(T0), W, T0).coins, 120, 'v1 coins kept');
});

test('v1 save migrates: needs, coins, room kept; owned/outfit/settings/best added', () => {
  const v1 = makeV1Save(T0);
  const m = migrateSave(v1, DATA, T0, ['living', 'kitchen', 'bathroom']);
  eq(m.version, SAVE_VERSION, 'version');
  eq(m.selected, 'cloud', 'selected'); eq(m.room, 'kitchen', 'room'); eq(m.coins, 120, 'coins');
  deepEq(m.chars.cloud.needs, v1.chars.cloud.needs, 'needs kept');
  eq(m.chars.cloud.tLast, T0 - 1000, 'tLast kept');
  deepEq(m.owned, ['bow-ribbon', 'glasses-round'], 'starters owned');
  for (const k of Object.keys(m.chars)) {
    deepEq(m.chars[k].outfit, { head: null, eyes: null, body: null }, `outfit ${k}`);
    eq(m.chars[k].best.snackRain, 0, `best ${k}`); eq(m.chars[k].wearBonusAt, 0, `bonus ${k}`);
  }
  eq(m.settings.cameraHidden, false, 'camera');
});

test('v2 save round-trips outfit, owned, settings and best', () => {
  const s = newSave(DATA, T0);
  s.owned.push('scarf'); s.chars.gumdrop.outfit = { head: 'bow-ribbon', eyes: null, body: 'scarf' };
  s.settings.cameraHidden = true; s.chars.gumdrop.best.snackRain = 340; s.chars.gumdrop.wearBonusAt = T0 - 5;
  const m = migrateSave(JSON.parse(JSON.stringify(s)), DATA, T0);
  deepEq(m.chars.gumdrop.outfit, { head: 'bow-ribbon', eyes: null, body: 'scarf' }, 'outfit');
  assert(m.owned.includes('scarf'), 'owned'); eq(m.settings.cameraHidden, true, 'camera');
  eq(m.chars.gumdrop.best.snackRain, 340, 'best'); eq(m.chars.flower.best.snackRain, 0, 'other best'); eq(m.chars.gumdrop.wearBonusAt, T0 - 5, 'bonus time');
});

test('tampered save: outfit naming an unbought item is emptied, bad best → 0', () => {
  const s = newSave(DATA, T0);
  s.chars.flower.outfit = { head: 'hat-party', eyes: 'glasses-round', body: 'tie-neck' };
  s.chars.flower.best = { snackRain: -5 }; s.owned = 'all'; s.coins = -30;
  const m = migrateSave(s, DATA, T0);
  deepEq(m.chars.flower.outfit, { head: null, eyes: 'glasses-round', body: null }, 'outfit');
  eq(m.chars.flower.best.snackRain, 0, 'best'); eq(m.coins, 0, 'coins clamped'); deepEq(m.owned, ['bow-ribbon', 'glasses-round'], 'owned');
});

test('no wardrobe data (file missing): saved owned ids and outfit strings are preserved', () => {
  const s = newSave(DATA, T0);
  s.owned = ['scarf']; s.chars.flower.outfit = { head: null, eyes: null, body: 'scarf' };
  const m = migrateSave(JSON.parse(JSON.stringify(s)), BASE, T0);
  deepEq(m.owned, ['scarf'], 'owned'); eq(m.chars.flower.outfit.body, 'scarf', 'outfit');
});

test('createGameState: coins, purse and outfit persist through storage', () => {
  const st = memStorage();
  const a = createGameState({ data: DATA, storage: st, now: () => T0 });
  eq(a.addCoins(50), 50, 'add'); eq(a.addCoins(-80), 0, 'never negative');
  a.setPurse(30, [...a.owned, 'scarf']);
  a.setOutfit({ head: null, eyes: 'glasses-round', body: 'scarf' }, 'cloud');
  eq(a.setBest('snackRain', 120), 120, 'best'); eq(a.setBest('snackRain', 80), 120, 'best keeps max');
  eq(a.setBest('snackRain', 50, 'cloud'), 50, 'cloud has its own best');
  a.setSetting('cameraHidden', true);
  assert(a.persist(), 'persist');
  eq(JSON.parse(st.mem.get(SAVE_KEY)).version, SAVE_VERSION, 'version on disk');
  const b = createGameState({ data: DATA, storage: st, now: () => T0 });
  eq(b.coins, 30, 'coins'); assert(b.owned.includes('scarf'), 'owned');
  deepEq(b.outfit('cloud'), { head: null, eyes: 'glasses-round', body: 'scarf' }, 'outfit');
  eq(b.best().snackRain, 120, 'best'); eq(b.best('cloud').snackRain, 50, 'cloud best'); eq(b.settings.cameraHidden, true, 'setting');
});

done();
