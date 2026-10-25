/**
 * Mood engine — the prototype's short-term mood (joy / annoy / surprise / shy,
 * ignore timer, speech cooldowns) extended with needs (GDD 3.6): need faces,
 * idle behaviours, need lines, care gains, and the return-after-absence styles
 * (owner decision 2026-10-25).
 *
 * Need numbers come from data. The short-term mood dynamics below (`TUNE`) are the
 * prototype's feel constants; they are presentation timing, kept in one place so
 * Loop can move them into `assets/data/` later.
 * @module game/mood
 */
import { pickNeedMood, needState, pickReturnStyle } from './needs.js';

const TUNE = {
  sayKindCooldown: 3.5, sayGlobalCooldown: 1.4, bubbleMs: 2300,
  exprSettle: 0.18, idleMinGap: 1.8,
  joyPet: 0.32, annoyPetCalm: 0.25, shyPet: 0.04, chirpEvery: 1.4,
  pokeSurprise: 0.75, pokeSpamAnnoy: 0.2, grabSurprise: 0.45, boingJoy: 0.08,
  slapAnnoy: 0.3, stretchAnnoy: 0.6, stretchJoy: 0.12, squishShy: 0.5, squishAnnoy: 0.4, squishJoy: 0.05,
  joyDecay: 0.03, joyDecayIgnored: 0.06, annoyDecay: 0.07, surpriseDecay: 1.3, shyDecay: 0.22,
  sleepyIgnoreScale: 2.2, needLineAfterReturn: 6,
};

const pick = (a) => (Array.isArray(a) && a.length ? a[Math.floor(Math.random() * a.length)] : null);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * @param {{
 *   data: { needs: object, foods: object, personas: object },
 *   game: ReturnType<import('./state.js').createGameState>,
 *   hud: object, sfx: object, timers: ReturnType<import('./timers.js').createTimers>,
 *   getPet: () => object|null, random?: () => number,
 * }} deps
 */
export function createMood({ data, game, hud, sfx, timers, getPet, random = Math.random }) {
  const A = data.needs.actions;
  const m = { joy: 0.2, annoy: 0, surprise: 0, shy: 0, lastTouch: 0, petT: -9, pokes: [], lonelySaid: false, sleepySaid: false, winkT: -9, nextWink: 6 };
  let key = game.selected;
  let override = null, overrideT = 0;
  let exprKey = '', exprCand = '', candT = 0;
  let stretch = -1, squish = 0, carried = false;
  const holds = new Set();
  const sayLast = {}; let sayGlobal = -99, chirpT = -9, now = 0;
  let lastIdleT = 0, needLineT = -999;
  const prevState = {};
  let cameraHelloDone = false;

  const P = () => data.personas[key] || data.personas.flower;

  /**
   * Show a persona line for an event, with per-kind and global cooldowns.
   * @param {string} event personas.json line event
   * @param {boolean} [force] skip cooldowns
   * @returns {boolean} spoken
   */
  function say(event, force = false) {
    if (!force && (now - (sayLast[event] ?? -99) < TUNE.sayKindCooldown || now - sayGlobal < TUNE.sayGlobalCooldown)) return false;
    const line = pick(P().lines?.[event]);
    if (!line) return false;
    sayLast[event] = now; sayGlobal = now;
    hud.say(line, TUNE.bubbleMs);
    return true;
  }

  /** Hold an interaction face for `seconds` (eating, reactions, return styles). */
  function react(expr, seconds) {
    override = expr; overrideT = now + seconds;
    setExpr(expr, true);
  }

  function setExpr(k, immediate) {
    const pet = getPet();
    if (!pet) return;
    if (k !== exprKey || immediate) { exprKey = k; exprCand = k; pet.setExpression(k); }
  }

  function play(action) {
    const pet = getPet();
    if (pet && !pet.isBusy()) pet.play(action);
  }

  function touch(time) {
    if (time - m.lastTouch > P().ignoreSeconds) say('back');
    m.lastTouch = time; m.lonelySaid = false; m.sleepySaid = false;
  }

  function pickExpr(time, needMood) {
    if (override && time < overrideT) return override;
    override = null;
    const p = P();
    if (m.surprise > 0.55) return 'surprised';
    if (m.annoy > 0.62) return 'grumpy';
    if (carried) return p.grabExpr;
    if (stretch >= 0) return stretch > A.stretchBigThreshold ? 'surprised' : p.grabExpr;
    if (squish > 0.04) return squish > A.squishHardThreshold ? (m.annoy > 0.3 ? 'grumpy' : 'joy') : 'shy';
    if (time - m.petT < 0.5 || m.joy > 0.62) return 'joy';
    if (m.shy > 0.45) return 'shy';
    if (m.annoy > 0.32) return p.hurtExpr;
    if (needMood.need) return needMood.expr;
    const L = time - m.lastTouch;
    if (L > p.ignoreSeconds * TUNE.sleepyIgnoreScale) return 'sleepy';
    if (L > p.ignoreSeconds) return p.lonelyExpr;
    if (m.joy > 0.28) {
      if (time > m.nextWink) { m.winkT = time + 0.7; m.nextWink = time + 7 + random() * 6; }
      return time < m.winkT ? 'wink' : 'smile';
    }
    return needMood.expr;
  }

  function interacting() { return holds.size > 0 || stretch >= 0 || squish > 0.04 || carried; }

  return {
    say, react,
    /** Current expression name. */
    get expression() { return exprKey; },
    get characterKey() { return key; },

    /** Mark an interaction in progress (e.g. 'sitting', 'eating') — need idles pause. */
    hold(reason, on) { if (on) holds.add(reason); else holds.delete(reason); },

    /**
     * Switch persona; resets short-term mood.
     * @param {string} k character key
     * @param {number} time stage seconds
     * @param {{ greet?: boolean }} [opts]
     */
    setCharacter(k, time, { greet = true } = {}) {
      key = k; now = time;
      Object.assign(m, { joy: 0.25, annoy: 0, surprise: 0, shy: 0, lastTouch: time, petT: -9, pokes: [], lonelySaid: false, sleepySaid: false });
      override = null; exprKey = ''; stretch = -1; squish = 0; carried = false;
      for (const k2 of Object.keys(prevState)) delete prevState[k2];
      needLineT = time - data.needs.moods.lineCooldownSeconds + TUNE.needLineAfterReturn;
      setExpr('original', true);
      if (greet) say('hello', true);
    },

    // ---- gestures → mood + need gains ----
    /** Tap on the pet. @returns {boolean} spam (no fun gain) */
    onPoke(time) {
      const p = P(), S = A.pokeSpam; touch(time);
      m.surprise = Math.max(m.surprise, TUNE.pokeSurprise); m.annoy += p.pokeAnnoy;
      m.pokes = m.pokes.filter((t) => time - t < S.windowSeconds); m.pokes.push(time);
      const spam = m.pokes.length >= S.count;
      if (spam) { m.annoy += TUNE.pokeSpamAnnoy; say('pokeSpam', true); game.bump('fun', S.fun); }
      else { say('poke'); game.bump('fun', A.pokeFun * p.playGain); }
      sfx.play('pop');
      return spam;
    },
    /** Rubbing above the head, called every frame it happens. */
    onPetTick(dt, time) {
      const p = P(); touch(time);
      m.joy += dt * TUNE.joyPet * p.petGain; m.annoy -= dt * TUNE.annoyPetCalm; m.shy += dt * TUNE.shyPet; m.petT = time;
      game.bump('social', A.petPerSecond.social * p.petGain * dt);
      game.bump('fun', A.petPerSecond.fun * p.petGain * dt);
      say('pet');
      if (time - chirpT > TUNE.chirpEvery) { chirpT = time; sfx.play('chirp'); }
    },
    onGrabStart(time) { touch(time); m.surprise = Math.max(m.surprise, TUNE.grabSurprise); say('grab'); sfx.play('pick'); stretch = 0; },
    /** While stretching; `level` 0..1. */
    onStretch(level, dt, time) {
      const p = P(); touch(time); stretch = level;
      if (level > A.stretchBigThreshold) {
        m.annoy += dt * p.stretchAnnoy * TUNE.stretchAnnoy; say('stretchBig');
        game.bump('fun', A.stretchFunPerSecond * A.hardFunScale * p.playGain * dt);
      } else {
        m.joy += dt * TUNE.stretchJoy * p.playGain;
        game.bump('fun', A.stretchFunPerSecond * p.playGain * dt);
      }
    },
    /** Stretch released; `amount` from grab.release(). */
    onRelease(amount, time) {
      touch(time); stretch = -1;
      if (amount >= A.boingMinStretch) {
        say('boing'); m.joy += TUNE.boingJoy * P().playGain; sfx.play('boing'); play('jelly');
        game.bump('fun', A.boingFun * P().playGain);
      }
    },
    /** Squish level this frame (0..0.45). Call with 0 when nothing squeezes. */
    onSquish(level, dt, time) {
      const was = squish; squish = level;
      if (level <= 0.04) return;
      const p = P(); touch(time);
      if (was <= 0.04) sfx.play('squish');
      if (level < A.squishHardThreshold) {
        m.shy += dt * TUNE.squishShy; say('squish');
        game.bump('fun', A.squishFunPerSecond * p.playGain * dt);
      } else {
        m.annoy += dt * TUNE.squishAnnoy * p.squishAnnoy; m.joy += dt * TUNE.squishJoy * p.playGain; say('squishHard');
        game.bump('fun', A.squishFunPerSecond * A.hardFunScale * p.playGain * dt);
      }
    },
    /** Fast swipe through the pet (startle). */
    onSlap(time) { touch(time); m.surprise = 1; m.annoy += TUNE.slapAnnoy; say('slap', true); sfx.play('slap'); },
    onCarryStart(time) { touch(time); carried = true; stretch = -1; say('carried', true); sfx.play('pick'); },
    onCarried(dt, time) { touch(time); game.bump('social', A.carriedSocialPerSecond * dt); },
    onCarryEnd() { carried = false; },
    /** A talk-back phrase finished playing. */
    onTalkPhrase(time) { touch(time); game.bump('social', A.talkSocial * P().petGain); },
    /** First hand seen in a camera session. */
    onCameraHello(time) {
      if (cameraHelloDone) return;
      cameraHelloDone = true; touch(time);
      game.bump('social', A.cameraHelloSocial); say('cameraHello', true); play('hop');
    },
    /** Camera turned off: next session may greet again. */
    resetCameraHello() { cameraHelloDone = false; },

    /**
     * Return after absence (gap ≥ backAfterMinutes): weighted gentle / dramatic / sleepy.
     * @returns {string} chosen style
     */
    returnAfterAbsence(time) {
      now = time; m.lastTouch = time;
      const p = P();
      const style = pickReturnStyle(p.returnStyles, random());
      if (style === 'dramatic') {
        react(p.hurtExpr, 2.6); say('lonely', true); getPet()?.play('shake');
        timers.after(2.4, () => { say('back', true); react('smile', 1.6); }, 'return');
      } else if (style === 'sleepy') {
        react('sleepy', 3); say('sleepy', true); getPet()?.play('yawn'); sfx.play('yawn');
        timers.after(2.6, () => { say('back', true); react('smile', 1.6); }, 'return');
      } else {
        react('smile', 2.5); say('back', true); getPet()?.play('hop');
      }
      needLineT = time - data.needs.moods.lineCooldownSeconds + TUNE.needLineAfterReturn;
      return style;
    },

    /** Per frame. */
    update(dt, time) {
      now = time;
      const p = P();
      const levels = game.needs();
      const needMood = levels ? pickNeedMood(levels, data.needs, p) : { need: null, expr: 'original' };

      // need lines: immediately on first crossing into low/urgent, then on cooldown
      if (levels) {
        for (const id of data.needs.moods.priority) {
          const st = needState(levels[id], data.needs.needs[id]);
          const bad = st === 'low' || st === 'urgent';
          const wasBad = prevState[id] === 'low' || prevState[id] === 'urgent';
          if (prevState[id] !== undefined && bad && !wasBad && needMood.need === id && time - needLineT > TUNE.needLineAfterReturn) {
            if (say(needMood.line, true)) needLineT = time;
          }
          prevState[id] = st;
        }
      }
      if (needMood.need && !interacting() && time - needLineT > data.needs.moods.lineCooldownSeconds) {
        if (say(needMood.line, true)) needLineT = time;
      }

      // need idle behaviour (wiggle, jelly, yawn…)
      if (needMood.need && !interacting() && !(override && time < overrideT) && time - lastIdleT > needMood.idleEverySeconds) {
        const pet = getPet();
        if (pet && !pet.isBusy()) { pet.play(needMood.idle); lastIdleT = time; }
      }

      // prototype ignore timer
      const L = time - m.lastTouch;
      if (!needMood.need && L > p.ignoreSeconds && !m.lonelySaid) { m.lonelySaid = true; say('lonely', true); }
      if (!needMood.need && L > p.ignoreSeconds * TUNE.sleepyIgnoreScale && !m.sleepySaid) { m.sleepySaid = true; say('sleepy', true); }

      m.joy = clamp01(m.joy - dt * (L > p.ignoreSeconds ? TUNE.joyDecayIgnored : TUNE.joyDecay));
      m.annoy = clamp01(m.annoy - dt * TUNE.annoyDecay);
      m.surprise = clamp01(m.surprise - dt * TUNE.surpriseDecay);
      m.shy = clamp01(m.shy - dt * TUNE.shyDecay);

      const k = pickExpr(time, needMood);
      if (k !== exprCand) { exprCand = k; candT = time; }
      if (k !== exprKey && (k === 'surprised' || time - candT > TUNE.exprSettle)) {
        exprKey = k; getPet()?.setExpression(k);
      }
    },
  };
}
