// Data checks for assets/data/furniture.json (S4-01, contract v4 "Sprint 4 additions").
// Run: node tests/unit/furniture-data.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, deepEq, done } from './_harness.mjs';

console.log('furniture data');

const load = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../assets/data/${name}.json`, import.meta.url)), 'utf8'));
const F = load('furniture');
const W = load('wardrobe');

/** Contract table: room → slot → [default, basic, xmas] ids, in tab order. */
const CONTRACT = {
  living: {
    sofa: ['sofa-classic', 'sofa-cloud', 'sofa-xmas'],
    rug: ['rug-round', 'rug-flower', 'rug-snow'],
    wall: ['frame-blob', 'wall-books', 'garland-xmas'],
    window: ['window-round', 'window-arch', 'window-snow'],
    corner: ['plant-pot', 'plant-tall', 'xmas-tree'],
    lamp: ['lamp-floor', 'lamp-mushroom', 'lamp-star'],
    side: ['table-mug', 'toy-box', 'fireplace-xmas'],
  },
  kitchen: {
    fridge: ['fridge-classic', 'fridge-retro', 'fridge-gingerbread'],
    wall: ['shelf-jars', 'shelf-plants', 'wreath-xmas'],
    rug: ['mat-kitchen', 'mat-fruit', 'mat-snow'],
  },
  bathroom: {
    mirror: ['mirror-oval', 'mirror-cloud', 'mirror-holly'],
    wall: ['towel-rail', 'towel-stripes', 'stocking-xmas'],
    rug: ['mat-bath', 'mat-duck', 'mat-snow-bath'],
  },
};
const LABELS = {
  living: { sofa: 'โซฟา', rug: 'พรม', wall: 'ของแต่งผนัง', window: 'หน้าต่าง', corner: 'มุมห้อง', lamp: 'โคมไฟ', side: 'ข้างโซฟา' },
  kitchen: { fridge: 'ตู้เย็น', wall: 'ชั้นผนัง', rug: 'พรม' },
  bathroom: { mirror: 'กระจก', wall: 'ราวผ้า', rug: 'พรม' },
};

test('rooms and slots match the contract, in tab order, with Thai labels', () => {
  deepEq(Object.keys(F.rooms), ['living', 'kitchen', 'bathroom'], 'rooms');
  for (const [room, slots] of Object.entries(CONTRACT)) {
    deepEq(Object.keys(F.rooms[room].slots), Object.keys(slots), `${room} slot order`);
    for (const s of Object.keys(slots)) eq(F.rooms[room].slots[s].label, LABELS[room][s], `${room}.${s} label`);
  }
});

test('themes basic and xmas exist with labels', () => {
  eq(F.themes.basic.label, 'พื้นฐาน', 'basic'); eq(F.themes.xmas.label, 'คริสต์มาส', 'xmas');
});

test('39 items, unique ids, exactly the contract ids in display order (default first)', () => {
  eq(F.items.length, 39, 'count');
  eq(new Set(F.items.map((i) => i.id)).size, 39, 'unique');
  const want = Object.entries(CONTRACT).flatMap(([room, slots]) => Object.entries(slots).flatMap(([slot, ids]) => ids.map((id) => `${room}/${slot}/${id}`)));
  deepEq(F.items.map((i) => `${i.room}/${i.slot}/${i.id}`), want, 'order');
});

test('every slot has exactly one default, priced 0; every other item costs > 0 coins (integer)', () => {
  for (const [room, slots] of Object.entries(CONTRACT)) for (const slot of Object.keys(slots)) {
    const inSlot = F.items.filter((i) => i.room === room && i.slot === slot);
    const defs = inSlot.filter((i) => i.default === true);
    eq(defs.length, 1, `${room}.${slot} defaults`);
    eq(defs[0].price, 0, `${room}.${slot} default price`);
    eq(defs[0].id, slots[slot][0], `${room}.${slot} default id`);
    for (const i of inSlot) {
      eq(typeof i.default, 'boolean', `${i.id} default flag`);
      assert(Number.isInteger(i.price) && (i.default ? i.price === 0 : i.price > 0), `${i.id} price ${i.price}`);
    }
  }
});

test('theme: the 13 contract Christmas ids are xmas, everything else basic; defaults are basic', () => {
  const XMAS = ['sofa-xmas', 'rug-snow', 'garland-xmas', 'window-snow', 'xmas-tree', 'lamp-star', 'fireplace-xmas', 'fridge-gingerbread', 'wreath-xmas', 'mat-snow', 'mirror-holly', 'stocking-xmas', 'mat-snow-bath'];
  for (const i of F.items) eq(i.theme, XMAS.includes(i.id) ? 'xmas' : 'basic', i.id);
});

test('every Christmas piece costs more than the basic alternative in its slot', () => {
  for (const [room, slots] of Object.entries(CONTRACT)) for (const [slot, [, basic, xmas]] of Object.entries(slots)) {
    const p = (id) => F.items.find((i) => i.id === id).price;
    assert(p(xmas) > p(basic), `${room}.${slot}: ${xmas} ${p(xmas)} ≤ ${basic} ${p(basic)}`);
  }
});

test('every item has a short Thai name (≤ 12 spacing glyphs, fits a ~110 px card)', () => {
  const cols = (s) => [...s].filter((c) => !/\p{Mn}/u.test(c)).length;
  for (const i of F.items) {
    assert(typeof i.name === 'string' && /[฀-๿]/.test(i.name), `${i.id} name`);
    assert(cols(i.name) <= 12, `${i.id} "${i.name}" is ${cols(i.name)} glyphs`);
  }
});

test('furniture ids never clash with wardrobe ids', () => {
  const wardrobe = new Set(W.items.map((i) => i.id));
  for (const i of F.items) assert(!wardrobe.has(i.id), `clash: ${i.id}`);
});

test('wardrobe: every item has a theme; the 5 Christmas outfits are xmas with a price and a like', () => {
  const XMAS = { 'hat-santa': 'head', antlers: 'head', 'glasses-snow': 'eyes', 'scarf-xmas': 'body', 'bell-collar': 'body' };
  for (const it of W.items) {
    assert(it.theme === 'basic' || it.theme === 'xmas', `${it.id} theme`);
    eq(it.theme === 'xmas', it.id in XMAS, `${it.id} xmas flag`);
  }
  for (const [id, slot] of Object.entries(XMAS)) {
    const it = W.items.find((i) => i.id === id);
    assert(it, `${id} present`); eq(it.slot, slot, `${id} slot`);
    assert(Number.isInteger(it.price) && it.price > 0 && it.starter === false, `${id} price/starter`);
    assert(Array.isArray(it.likes) && it.likes.length >= 1, `${id} likes`);
  }
});

test('wardrobe: every playable character likes exactly 4 items (3 basic + 1 Christmas); pill none', () => {
  for (const k of ['splat', 'gumdrop', 'diamond', 'cloud', 'flower']) {
    const liked = W.items.filter((i) => i.likes.includes(k));
    eq(liked.length, 4, `${k} likes`); eq(liked.filter((i) => i.theme === 'xmas').length, 1, `${k} xmas likes`);
  }
  eq(W.items.filter((i) => i.likes.includes('pill')).length, 0, 'pill');
});

done();
