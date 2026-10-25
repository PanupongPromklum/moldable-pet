// Fixture factories for Sprint 2 unit tests (wardrobe, save v2, Snack Rain).
// Shapes follow docs/architecture/module-contracts.md › Sprint 2 additions; the
// numbers are test constants, not balance values (the real ones are loop's).

/** A small wardrobe catalog: two starters, priced items in every slot. */
export function makeWardrobe() {
  return {
    slots: { head: { label: 'หัว' }, eyes: { label: 'ตา' }, body: { label: 'ตัว' } },
    items: [
      { id: 'bow-ribbon', slot: 'head', name: 'โบว์', price: 0, starter: true, likes: ['flower'] },
      { id: 'hat-beanie', slot: 'head', name: 'หมวกไหมพรม', price: 40, starter: false, likes: ['cloud'] },
      { id: 'hat-party', slot: 'head', name: 'หมวกปาร์ตี้', price: 60, starter: false, likes: [] },
      { id: 'glasses-round', slot: 'eyes', name: 'แว่นกลม', price: 0, starter: true, likes: ['diamond'] },
      { id: 'glasses-sun', slot: 'eyes', name: 'แว่นกันแดด', price: 80, starter: false, likes: [] },
      { id: 'tie-neck', slot: 'body', name: 'เน็คไท', price: 50, starter: false, likes: ['gumdrop'] },
      { id: 'scarf', slot: 'body', name: 'ผ้าพันคอ', price: 70, starter: false, likes: [] },
    ],
  };
}

/**
 * A complete snackRain block with the GDD's worked-example numbers
 * (design/gdd/minigame-snack-rain.md §4.6), independent of the live data file.
 */
export function makeSnackRain(over = {}) {
  return {
    title: 'ฝนขนม', durationSec: 45, countdownSec: 3, pauseResumeCountdownSec: 3,
    lanesOrWidth: 0.86, playWidthMaxUnits: 6, catchRadius: 0.55, itemSize: 0.45,
    move: { keySpeed: 1.1, followPerSec: 14 },
    spawn: { startPerSec: 0.9, endPerSec: 2.0, rampPower: 1.3, maxOnScreen: 6, minGapSec: 0.22, edgeMargin: 0.06 },
    fallSpeed: { start: 0.32, end: 0.62, jitter: 0.08 },
    items: {
      snack: { weight: 0.74, points: 10, likedBonus: 5, foods: ['onigiri', 'banana'] },
      coin: { weight: 0.16, points: 15, coins: 2 },
      demon: { weight: 0.1, points: -20, graceSec: 8, rampSec: 17, maxInARow: 1, grumpySec: 0.8 },
    },
    streak: { step: 4, bonusPerStep: 0.5, maxMultiplier: 3, resetOnMiss: false, resetOnDemon: true },
    coinsPerPoints: 40, minCoinsPerRound: 5, minCoinsOnlyIfComplete: true, maxCoinsPerRound: 60,
    needs: { fun: 0.25, social: 0.1, hunger: -0.05 },
    lines: { start: 'minigameStart', demon: 'minigameDemon', end: 'minigameWin', demonLineCooldownSec: 6 },
    ...over,
  };
}

/** Seeded PRNG (mulberry32) for deterministic simulations. */
export function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** Sprint 1 (v1) save as written by the live build: no owned / outfit / settings / best. */
export function makeV1Save(now) {
  return {
    version: 1, selected: 'cloud', room: 'kitchen', chosen: true, coins: 120, savedAt: now,
    chars: {
      cloud: { needs: { hunger: 0.4, toilet: 0.5, fun: 0.6, social: 0.7 }, tLast: now - 1000 },
      flower: { needs: { hunger: 0.9, toilet: 0.9, fun: 0.9, social: 0.9 }, tLast: now - 2000 },
    },
  };
}

/** In-memory storage with the safeLocalStorage shape. */
export function memStorage() {
  const mem = new Map();
  return { mem, getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); return true; } };
}
