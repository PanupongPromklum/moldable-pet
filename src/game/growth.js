/**
 * Growth & raised personality — live wiring (growth GDD 3.1–3.8).
 * Pure math lives in `growth-rules.js`; this module owns the open bucket, the
 * engaged window on the stage clock, the stage-up / trait / drift cards, the
 * pet's look (`pet.setGrowth`, `pet.setTraitMark`), the voice pitch
 * (`sfx.setPitchOffset`), kid-stage hints and trait idles.
 *
 * Every teammate call is optional (`?.`): the build keeps running while Clay's
 * `setGrowth` / Glaze's `showGrowthCard` / Echo's `setPitchOffset` land.
 * Growth never changes needs, coins or health (AC 10).
 * @module game/growth
 */
import {
  STAGES, MAX_DT, newBucket, addEvent, addMinigameSec, closeBucket, isEngaged, advanceTime, updateStage,
  pendingCards, markSeen, stepDrift, stageProgress, lookOf, leadingTrait, dayKeyOf, stageIndex,
} from './growth-rules.js';

/** Presentation timing (not balance); growth.json `glowSec` / `doubleStageGapSec` win. */
const FEEL = { glowSec: 1.2, cardGapSec: 1.5, cardMaxSec: 9, readyDelaySec: 0.6, behaviorLineCooldownSec: 60 };
/** Fallback copy (GDD 3.3 / 3.6 / 3.9) for keys growth.json lacks. */
const COPY = {
  cards: { stage: '{name}โตขึ้นแล้ว!', trait: '{name}โตเป็น{name}{trait}!', drift: 'ช่วงนี้{name}{trait}ขึ้นนะ' },
  lines: { stageUp: 'growUp', traitReveal: 'traitReveal', traitHint: 'traitHint', drift: 'traitDrift' },
  nearGrowText: 'อีกนิดจะโตแล้ว!', nearGrowProgress: 0.85,
  hint: (label) => `ดูท่าจะเป็นสาย${label}นะ…`,
  coachOnce: 'ตอนนี้{name}เติบโตได้แล้วนะ ดูแลบ่อยๆ แล้วจะรู้ว่าโตมาเป็นแบบไหน',
};
const fill = (t, o) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const pickOne = (a, r) => (Array.isArray(a) && a.length ? a[Math.floor(r() * a.length)] : null);

/**
 * @param {{
 *   cfg: object,                                  // resolved growth config (state.growthCfg)
 *   game: object, personas: object,
 *   getPet: () => object|null, hud: object, sfx: object, mood: object,
 *   isBlocked: () => boolean,                     // minigame / toilet / sheet / carried / moving (GDD 3.3)
 *   getMinigame: () => ({ active: boolean, paused: boolean, playing: boolean, id: string|null }),
 *   isVisible?: () => boolean, nowMs?: () => number, random?: () => number,
 *   onChange?: () => void,                         // chip / select refresh
 * }} deps
 */
export function createGrowth(deps) {
  const { cfg, game, personas, getPet, hud, sfx, mood, isBlocked, getMinigame } = deps;
  const isVisible = deps.isVisible || (() => document.visibilityState === 'visible');
  const nowMs = deps.nowMs || (() => Date.now());
  const random = deps.random || Math.random;
  let key = game.selected;
  let bucket = newBucket();
  let lastCareAt = -Infinity, time = 0;
  let cardOpen = false, cardT = 0, nextCardAt = 0, extraCards = [];
  let lookStage = null, lookMini = null, markShown = undefined, markHeld = false;
  let lastIdleT = 0, lastHintAt = null;
  let readyAt = FEEL.readyDelaySec;

  const g = () => game.growth(key);
  const name = (k = key) => personas[k]?.name || '';
  const traitLabel = (t) => cfg.traits?.[t]?.label || '';
  const cards = { ...COPY.cards, ...(cfg.cards || {}) };
  const lineIds = { ...COPY.lines, ...(cfg.lines || {}) };
  const glowSec = cfg.glowSec ?? FEEL.glowSec, gapSec = cfg.doubleStageGapSec ?? FEEL.cardGapSec;
  let lastBehaviorT = -999;
  /**
   * Say a persona line for a growth event with `{name}` / `{trait}` filled.
   * Trait-specific lists (`traits.<t>.lines.<event>`) win when `trait` is given.
   */
  function sayGrowth(event, trait) {
    const p = personas[key] || {};
    const list = (trait && p.traits?.[trait]?.lines?.[event]) || p.lines?.[event];
    const line = pickOne(list, random);
    if (!line) return false;
    hud.say(fill(line, { name: name(), trait: trait ? traitLabel(trait) : '' }), 2600);
    return true;
  }
  const playable = (k) => personas[k] && personas[k].playable !== false;   // ปาม does not grow (edge 14)

  /** Look follows the stage whose card has been shown (edge 9: old size until the card). */
  function applyLook(immediate = false) {
    const gr = g(); const pet = getPet();
    if (!gr || !pet) return;
    const mg = getMinigame();
    // registry games (round.js) apply the minigame size floor themselves via getGrowth/setGrowth;
    // only the Snack Rain controller relies on this module for it (edge 10)
    if (mg.active && mg.id !== 'snackRain') return;
    const L = lookOf(gr.stageSeen, cfg);
    const look = { ...L.look };
    if (mg.active) look.scale = Math.max(look.scale, cfg.minigameMinScale ?? 0.85);
    if (lookStage !== gr.stageSeen || lookMini !== mg.active || immediate) {
      try { pet.setGrowth?.(look, { transitionSec: immediate ? 0 : cfg.transitionSec }); } catch (e) { console.error('[growth] setGrowth', e); }
      try { sfx.setPitchOffset?.(L.pitchSemitones); } catch (e) { console.error('[growth] pitch', e); }
      lookStage = gr.stageSeen; lookMini = mg.active;
    }
    const mark = gr.stageSeen === 'grown' && !markHeld ? gr.trait : null;
    if (mark !== markShown || immediate) {
      try { pet.setTraitMark?.(mark); } catch (e) { console.error('[growth] trait mark', e); }
      markShown = mark;
    }
  }

  /** Close the open bucket into the current character's tally (+ drift). */
  function flushBucket(fraction) {
    const gr = g();
    if (!gr || bucket.sec <= 0) { bucket = newBucket(); return; }
    closeBucket(gr, bucket, key, cfg, fraction);
    bucket = newBucket();
    const changed = stepDrift(gr, key, cfg, nowMs());
    if (changed) extraCards.push({ kind: 'drift', trait: changed });
  }

  function cardFor(c) {
    const gr = g();
    if (c.kind === 'stage') {
      const L = lookOf(c.stage, cfg);
      return { kind: 'stage', name: fill(cards.stage, { name: name() }), stageLabel: L.label, traitLabel: '', because: cfg.stages?.[c.stage]?.newLine || '', charName: name(), stage: c.stage };
    }
    const t = c.trait || gr.trait;
    const tr = cfg.traits?.[t] || {};
    const o = { name: name(), trait: tr.label || '' };
    if (c.kind === 'trait') return { kind: 'trait', name: fill(cards.trait, o), stageLabel: lookOf('grown', cfg).label, traitLabel: tr.label || '', because: tr.because || '', charName: name(), stage: 'grown', trait: t };
    return { kind: 'drift', name: fill(cards.drift, o), stageLabel: lookOf(gr.stage, cfg).label, traitLabel: tr.label || '', because: tr.because || '', charName: name(), stage: gr.stage, trait: t };
  }

  /** Show the next queued card when the pet is in a normal state (GDD 3.3 step 1). */
  function showNextCard() {
    const gr = g();
    if (!gr || cardOpen || time < nextCardAt || time < readyAt || isBlocked()) return;
    const queue = [...pendingCards(gr), ...extraCards];
    if (!queue.length) return;
    const c = queue[0];
    if (c.kind === 'stage') {
      markSeen(gr, c.stage);
      if (c.stage === 'grown') markHeld = true;   // the mark appears with the trait card
      try { getPet()?.glow?.(glowSec); } catch { /* optional */ }
      sfx.play?.('sparkle');
      applyLook(false);
    } else if (c.kind === 'trait') {
      markHeld = false; applyLook(false);
    } else {
      extraCards.shift(); applyLook(false);
    }
    const view = cardFor(c);
    cardOpen = true; cardT = time;
    if (hud.showGrowthCard) hud.showGrowthCard(view);
    else hud.toast?.(`${view.name} ${view.because}`.trim(), 3600);
    if (c.kind === 'stage') { if (!sayGrowth(lineIds.stageUp)) mood.say('growUp', true); }
    else if (c.kind === 'trait') { mood.react?.('joy', 2); getPet()?.play?.('hop'); sayGrowth(lineIds.traitReveal, c.trait || gr.trait); }
    else sayGrowth(lineIds.drift, c.trait);
    game.persist?.();
    deps.onChange?.();
  }

  function closeCard() {
    if (!cardOpen) return;
    cardOpen = false; nextCardAt = time + gapSec;
    if (!hud.showGrowthCard) return;
    try { hud.hideGrowthCard?.(); } catch { /* optional */ }
  }

  /** Kid hint (GDD 3.6) and trait idle (GDD 3.5) — only in a free, normal state. */
  function idleBehaviour() {
    const gr = g(); const pet = getPet();
    if (!gr || !pet || isBlocked() || cardOpen || mood.needNow) return;
    if (gr.stage === 'kid') {
      const lead = leadingTrait(gr.tally, key, cfg);
      const every = (cfg.hint?.everyMinutes ?? 20) * 60;
      if (lastHintAt == null) lastHintAt = gr.activeSec;
      if (lead && gr.activeSec - lastHintAt >= every) {
        lastHintAt = gr.activeSec;
        const idle = cfg.traits?.[lead]?.idle;
        if (Array.isArray(idle) && idle.length && !pet.isBusy?.()) pet.play(idle[Math.floor(random() * idle.length)]);
        sayGrowth(lineIds.traitHint, lead);
      }
    } else if (gr.stageSeen === 'grown' && gr.trait) {
      const every = cfg.traitIdle?.everySeconds ?? 16;
      if (time - lastIdleT >= every && !pet.isBusy?.()) {
        lastIdleT = time;
        const tr = cfg.traits?.[gr.trait] || {};
        if (Array.isArray(tr.idle) && tr.idle.length) pet.play(tr.idle[Math.floor(random() * tr.idle.length)]);
        // trait behaviour line (askPet / askPlay / snackHint / decorLike / hello), on a long cooldown
        const cd = cfg.behaviorLineCooldownSec ?? FEEL.behaviorLineCooldownSec;
        if (tr.behaviorLine && time - lastBehaviorT >= cd) { lastBehaviorT = time; sayGrowth(tr.behaviorLine, gr.trait); }
      }
    }
  }

  const api = {
    /**
     * A care event (growth GDD 3.4 ids: strokePerSec, carryPerSec, talk, cameraHello,
     * poke, boing, squishPerSec, eat, eatLike, equip, buy, decorEquip, decorBuy,
     * flush) or an engagement-only event (`minigameStart`, `minigameEnd`).
     * Every call resets the engaged window.
     * @param {string} event @param {number} [amount] 1, or seconds for *PerSec
     */
    care(event, amount = 1) {
      lastCareAt = time;
      if (!playable(key)) return;
      addEvent(bucket, event, amount, cfg);
    },
    /** Per frame (stage clock). */
    update(dt, t) {
      time = t;
      const gr = g();
      if (!gr) return;
      if (!playable(key)) { applyLook(); return; }
      const mg = getMinigame();
      const inRound = !!(mg.active && mg.playing && !mg.paused);
      const engaged = isEngaged({ time, lastCareAt, inMinigame: inRound }, cfg);
      const step = Math.min(MAX_DT, Math.max(0, dt));
      const added = advanceTime(gr, step, { visible: isVisible(), engaged, dayKey: dayKeyOf(nowMs()) }, cfg);
      if (added > 0) {
        bucket.sec += step;
        if (inRound) addMinigameSec(bucket, mg.id, step, cfg);
        if (bucket.sec >= (cfg.bucketSec || 60)) flushBucket(1);
        const before = gr.stage;
        const r = updateStage(gr, key, cfg, nowMs());
        if (r.stageChanged || r.trait) { game.persist?.(); deps.onChange?.(); }
        if (before !== gr.stage) console.info(`[growth] ${key} ${before} → ${gr.stage}${r.trait ? ` (${r.trait})` : ''}`);
      }
      if (cardOpen && time - cardT > FEEL.cardMaxSec) closeCard();   // safety: a card never blocks the queue
      if (!cardOpen) showNextCard();
      applyLook();
      idleBehaviour();
    },
    /** The HUD card was closed (`onGrowthCardClose`). */
    onCardClose() { closeCard(); },
    get cardOpen() { return cardOpen; },
    /** Call before `game.select(newKey)`: closes a partial bucket for the old character (edge 5). */
    beforeCharacterChange() {
      const bs = cfg.bucketSec || 60;
      flushBucket(Math.min(1, bucket.sec / bs));
    },
    /** Call after the new pet is spawned. */
    onCharacterChanged(k = game.selected) {
      key = k; bucket = newBucket(); lastCareAt = -Infinity; lastHintAt = null;
      cardOpen = false; extraCards = []; lookStage = null; lookMini = null; markShown = undefined; markHeld = false;
      readyAt = time + FEEL.readyDelaySec;
      applyLook(true);
    },
    /** Re-apply the look (new pet object, minigame start / end). */
    refreshLook(immediate = true) { lookStage = null; lookMini = null; markShown = undefined; applyLook(immediate); },
    /** Voice for lines and the conversation context (growth GDD 3.2). */
    voice(k = key) {
      const gr = game.growth(k);
      const st = gr ? gr.stageSeen : 'grown';
      return { cfg, stage: st, vocabLevel: lookOf(st, cfg).vocabLevel, trait: st === 'grown' ? gr?.trait || null : null };
    },
    /**
     * Select-sheet / chip info (growth GDD 3.6): `{ stage, stageLabel, progress, hint, trait, traitLabel }`.
     * @param {string} [k]
     */
    info(k = key) {
      const gr = game.growth(k);
      if (!gr) return null;
      const st = gr.stageSeen;
      const progress = st === gr.stage ? stageProgress(gr.activeSec, st, cfg) : 1;
      let hint = '';
      if (st === 'grown' && gr.trait) hint = traitLabel(gr.trait);
      else if (progress >= (cfg.hint?.nearGrowProgress ?? COPY.nearGrowProgress)) hint = cfg.hint?.nearGrowText || COPY.nearGrowText;
      else if (st === 'kid') {
        const lead = leadingTrait(gr.tally, k, cfg);
        if (lead) hint = cfg.traits?.[lead]?.hint || COPY.hint(traitLabel(lead));
      }
      const trait = st === 'grown' ? gr.trait : null;
      return { stage: st, stageLabel: lookOf(st, cfg).label, progress, hint, trait, traitLabel: trait ? traitLabel(trait) : '' };
    },
    /** One-time coach after the v4 → v5 migration (growth GDD 3.9). */
    introText() { return fill(cfg.migration?.coachOnce || COPY.coachOnce, { name: name() }); },
    /**
     * Debug (`?debug`): add engaged seconds and optional tally points now, as if played.
     * @param {number} sec @param {Partial<Record<'cuddly'|'playful'|'foodie'|'stylish', number>>} [tally]
     */
    debugAdvance(sec, tally) {
      const gr = g(); if (!gr) return null;
      if (tally) for (const [c, v] of Object.entries(tally)) if (c in gr.tally) gr.tally[c] += v;
      gr.activeSec += Math.max(0, sec);
      updateStage(gr, key, cfg, nowMs());
      deps.onChange?.();
      return { ...gr, tally: { ...gr.tally } };
    },
    /** Debug snapshot. */
    get state() {
      const gr = g();
      return { key, time, lastCareAt, engaged: isEngaged({ time, lastCareAt, inMinigame: false }, cfg), bucket: { ...bucket, raw: { ...bucket.raw } }, growth: gr ? JSON.parse(JSON.stringify(gr)) : null, cardOpen, lookStage, pending: gr ? pendingCards(gr) : [], stages: STAGES, stageIndex };
    },
  };
  applyLook(true);
  return api;
}
