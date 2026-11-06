// Fixture factories for Sprint 4 unit tests (furniture, save v4). Shapes follow
// docs/architecture/module-contracts.md › Sprint 4 additions; prices are test
// constants, not loop's balance values.

/** A small furniture catalog: two rooms, default + basic + xmas per slot. */
export function makeFurniture() {
  return {
    rooms: {
      living: { label: 'ห้องนั่งเล่น', slots: { sofa: { label: 'โซฟา' }, corner: { label: 'มุมห้อง' } } },
      bathroom: { label: 'ห้องน้ำ', slots: { rug: { label: 'พรม' } } },
    },
    themes: { basic: { label: 'พื้นฐาน' }, xmas: { label: 'คริสต์มาส' } },
    items: [
      { id: 'sofa-classic', room: 'living', slot: 'sofa', name: 'โซฟานุ่มนิ่ม', price: 0, theme: 'basic', default: true },
      { id: 'sofa-cloud', room: 'living', slot: 'sofa', name: 'โซฟาก้อนเมฆ', price: 140, theme: 'basic', default: false },
      { id: 'sofa-xmas', room: 'living', slot: 'sofa', name: 'โซฟาซานต้า', price: 200, theme: 'xmas', default: false },
      { id: 'plant-pot', room: 'living', slot: 'corner', name: 'ต้นไม้กระถาง', price: 0, theme: 'basic', default: true },
      { id: 'xmas-tree', room: 'living', slot: 'corner', name: 'ต้นคริสต์มาส', price: 260, theme: 'xmas', default: false },
      { id: 'mat-bath', room: 'bathroom', slot: 'rug', name: 'พรมห้องน้ำ', price: 0, theme: 'basic', default: true },
      { id: 'mat-duck', room: 'bathroom', slot: 'rug', name: 'พรมเป็ดน้อย', price: 80, theme: 'basic', default: false },
    ],
  };
}

/** Sprint 3 (v3) save as written by the live build: no furniture field. */
export function makeV3Save(now) {
  return {
    version: 3, selected: 'gumdrop', room: 'bathroom', chosen: true, coins: 310, savedAt: now,
    owned: ['bow-ribbon', 'glasses-round', 'scarf'],
    settings: { cameraHidden: true, theme: 'dark', minigameControl: 'head' },
    chars: {
      gumdrop: { needs: { hunger: 0.4, toilet: 0.5, fun: 0.6, social: 0.7 }, tLast: now - 1000,
        outfit: { head: 'bow-ribbon', eyes: null, body: 'scarf' }, best: { snackRain: 220 }, wearBonusAt: now - 5000 },
    },
  };
}
