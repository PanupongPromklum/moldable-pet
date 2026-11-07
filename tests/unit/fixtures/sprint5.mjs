// Fixture factories for Sprint 5 unit tests (save v5 migration). Shapes follow
// docs/architecture/module-contracts.md › Sprint 5 additions and
// design/gdd/growth-personality.md AC 8; values are test constants.

/** Sprint 4 (v4) save as written by the live build: no growth, no talk settings, no lastGame. */
export function makeV4Save(now) {
  const needs = { hunger: 0.5, toilet: 0.6, fun: 0.7, social: 0.8 };
  const blank = { head: null, eyes: null, body: null };
  return {
    version: 4, selected: 'flower', room: 'living', chosen: true, coins: 310, savedAt: now,
    owned: ['bow-ribbon', 'glasses-round', 'sofa-classic', 'sofa-cloud', 'plant-pot', 'mat-bath'],
    furniture: { living: { sofa: 'sofa-cloud', corner: 'plant-pot' }, bathroom: { rug: 'mat-bath' } },
    settings: { cameraHidden: false, theme: 'light', minigameControl: 'touch' },
    chars: {
      flower: { needs, tLast: now - 1000, outfit: { ...blank }, best: { snackRain: 0 }, wearBonusAt: 0 },
      gumdrop: { needs, tLast: now - 1000, outfit: { ...blank }, best: { snackRain: 300 }, wearBonusAt: 0 },
      splat: { needs, tLast: now - 1000, outfit: { ...blank }, best: { snackRain: 0 }, wearBonusAt: 0 },
    },
  };
}
