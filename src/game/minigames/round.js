/**
 * Shared round shell for the Sprint 5 minigames (mimic, bubbles, hop): the flow
 * Snack Rain already has — countdown (Glaze's `hud.startMinigame` Promise or the
 * stage clock), tab / user pause with a resume countdown, key capture, Esc exit,
 * payout once (coins, best, needs × fraction played × playGain × favourite),
 * result card, pet easing home, pet size floor. GDD: minigames-2.md 3.0.
 *
 * Each game passes hooks; the shell calls them on the stage clock `dt`.
 * @module game/minigames/round
 */
import * as THREE from 'three';
import { needDeltas, resolvePicker, clamp01 } from './common-rules.js';

const FEEL = { returnSeconds: 0.5, hudEvery: 0.1, scaleSec: 0.3 };

/**
 * @typedef {object} RoundHooks
 * @property {() => boolean|void} begin            new round: reset state, place objects (false = cannot start)
 * @property {(dt:number) => void} [countdown]       per frame during the countdown
 * @property {(dt:number) => void} play              per frame while playing (call shell.finish() to end)
 * @property {(dt:number) => void} [always]          per frame in every non-idle phase (fades, bobs)
 * @property {() => object} hud                      extra fields for hud.updateMinigame
 * @property {(completed:boolean) => {score:number, coins:number, f:number, line?:string}} payout
 * @property {(e:KeyboardEvent, down:boolean) => boolean} [key]   true = consumed
 * @property {(x:number, y:number, id:number) => void} [pointerDown]
 * @property {(x:number, y:number, id:number, pressed:boolean) => void} [pointerMove]
 * @property {(id:number) => void} [pointerUp]
 * @property {(id:string) => void} [pad]
 * @property {(paused:boolean) => void} [onPause]
 * @property {() => void} clear                      remove every scene object of the round
 * @property {() => void} [dispose]
 * @property {() => object} [debug]
 */

/**
 * @param {object} ctx registry ctx (see index.js)
 * @param {string} id game id
 * @param {object} cfg resolved game config (title, countdownSec, pauseResumeCountdownSec, needs, lines …)
 * @param {(shell: object) => RoundHooks} build
 */
export function createRound(ctx, id, cfg, build) {
  const { stage, game, hud, sfx, mood, getPet, getHome } = ctx;
  const keyTarget = ctx.keyTarget || (typeof window !== 'undefined' ? window : null);
  const random = ctx.random || Math.random;
  const picker = resolvePicker(ctx.data?.picker).cfg;
  const durationSec = cfg.durationSec || cfg.maxSec || 45;

  let phase = 'idle', paused = false, pausedBy = '', countLeft = 0, lastCount = -1, hudDriven = false, countToken = 0;
  let elapsed = 0, clock = 0, hudT = -9, lastResult = null, returnFrom = new THREE.Vector3(), returnT = 0;
  let savedGrowth = null, savedRotY = 0, firstPlay = false, relaxed = false, control = 'touch';
  const lineT = {};
  const v = { a: new THREE.Vector3(), through: new THREE.Vector3() };
  const area = { left: -2, right: 2, top: 4, bottom: -1, w: 4, h: 5, cx: 0, sizeW: 0, sizeH: 0 };

  const shell = {
    ctx, cfg, id, random, picker,
    get phase() { return phase; },
    get elapsed() { return elapsed; },
    set elapsed(t) { elapsed = t; },
    get clock() { return clock; },
    get paused() { return paused; },
    get firstPlay() { return firstPlay; },
    get relaxed() { return relaxed; },
    get control() { return control; },
    /** Seconds of first-play easiest settings (0 after the first play). */
    get easySec() { return firstPlay ? picker.firstPlayEasySec : 0; },
    area,
    /** Visible play rectangle at the pet's depth (world units); cheap, call when the view may change. */
    measure() {
      const home = getHome();
      v.through.set(home.x, home.y + 1, home.z);
      const s = stage.size, midY = s.top + s.h / 2;
      let left = home.x - 2, right = home.x + 2, top = home.y + 4, bottom = home.y - 1;
      if (stage.screenToPlane(s.left, midY, v.through, v.a)) left = v.a.x;
      if (stage.screenToPlane(s.left + s.w, midY, v.through, v.a)) right = v.a.x;
      if (stage.screenToPlane(s.left + s.w / 2, s.top, v.through, v.a)) top = v.a.y;
      if (stage.screenToPlane(s.left + s.w / 2, s.top + s.h, v.through, v.a)) bottom = v.a.y;
      area.left = left; area.right = right; area.top = top; area.bottom = bottom;
      area.w = Math.max(0.5, right - left); area.h = Math.max(0.5, top - bottom); area.cx = (left + right) / 2;
      area.sizeW = s.w; area.sizeH = s.h;
      return area;
    },
    /** True when the viewport changed since the last measure. */
    resized() { return stage.size.w !== area.sizeW || stage.size.h !== area.sizeH; },
    /** Client px → world point on the camera-facing plane through the pet spot (+ zOffset) (false when off-plane). */
    toWorld(x, y, out, zOffset = 0) {
      const home = getHome();
      v.through.set(home.x, home.y + 1, home.z + zOffset);
      return !!stage.screenToPlane(x, y, v.through, out);
    },
    /** Play a sound if it exists (Echo adds new names in parallel). */
    sfx(name, opts, fallback) {
      try {
        const names = ctx.sfxNames;
        if (names && !names.includes(name) && fallback) name = fallback;
        sfx?.play?.(name, opts);
      } catch (e) { /* audio never breaks a round */ }
    },
    /** Persona line with the shared `picker.lineCooldownSec` cooldown (force skips it). */
    say(event, force = false, vars = null) {
      if (!event) return false;
      if (!force && clock - (lineT[event] ?? -99) < picker.lineCooldownSec) return false;
      let ok = false;
      if (vars) {
        const lines = ctx.getPersona?.()?.lines?.[event];
        let line = Array.isArray(lines) && lines.length ? lines[Math.floor(random() * lines.length) % lines.length] : (typeof lines === 'string' ? lines : null);
        if (!line && vars.fallback) line = vars.fallback;
        if (line) { for (const k of Object.keys(vars)) line = line.split('{' + k + '}').join(vars[k]); hud.say?.(line, 2200); ok = true; }
      } else ok = !!mood?.say?.(event, true);
      if (ok) lineT[event] = clock;
      return ok;
    },
    persona() { return ctx.getPersona?.() || {}; },
    /** Push HUD numbers (throttled unless forced). */
    pushHud(force) {
      if (!force && clock - hudT < FEEL.hudEvery) return;
      hudT = clock;
      hud.updateMinigame?.({
        countdown: phase === 'countdown' ? Math.max(0, Math.ceil(countLeft)) : 0,
        paused, control, ...hooks.hud(),
      });
    },
    /** End the round by rule (completed): pay out and show the result card. */
    finish() { if (phase === 'play') finish(); },
    /** Pause for the game's own reason (e.g. mimic AFK); resume with setPaused(false, by). */
    setPaused,
  };

  const hooks = build(shell);

  function favorite() { const k = ctx.getCharKey?.(); return !!k && (picker.favorites || {})[k] === id; }

  function scaleFloor(on) {
    const pet = getPet(); const min = Number(ctx.minigameMinScale) || 0;
    if (!pet?.getGrowth || !pet?.setGrowth) return;
    try {
      if (on && min > 0) {
        const g = pet.getGrowth();
        if (g && g.scale < min) { savedGrowth = { ...g }; pet.setGrowth({ ...g, scale: min }, { transitionSec: FEEL.scaleSec }); }
      } else if (!on && savedGrowth) { pet.setGrowth(savedGrowth, { transitionSec: FEEL.scaleSec }); savedGrowth = null; }
    } catch (e) { console.error('[minigame] growth', e); }
  }

  function onKey(e) {
    if (phase !== 'play' && phase !== 'countdown') return;
    const down = e.type === 'keydown';
    if (e.key === 'Escape') { if (down) exit(); e.preventDefault(); e.stopPropagation(); return; }
    if (phase === 'play' && !paused && hooks.key?.(e, down)) { e.preventDefault(); e.stopPropagation(); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); }
  }

  function go() {
    if (phase !== 'countdown' || paused) return;
    phase = 'play';
    if (!hudDriven) shell.sfx('go');
    shell.pushHud(true);
  }

  function runCountdown(seconds) {
    phase = 'countdown'; countLeft = seconds; lastCount = -1;
    const token = ++countToken;
    let p = null;
    try { p = hud.startMinigame?.({ id, title: cfg.title, durationSec, countdown: seconds, control }); } catch (e) { console.error('[minigame] hud', e); }
    hudDriven = !!(p && typeof p.then === 'function');
    if (hudDriven) p.then(() => { if (token === countToken) go(); });
    shell.pushHud(true);
  }

  function setPaused(p, by = 'user') {
    if (phase === 'idle' || phase === 'result' || phase === 'return') return;
    if (p) {
      if (paused) return;
      paused = true; pausedBy = by;
      hooks.onPause?.(true);
    } else {
      if (!paused || (pausedBy === 'user' && by !== 'user') || (pausedBy === 'afk' && by === 'tab')) return;
      const was = pausedBy;
      paused = false; pausedBy = '';
      hooks.onPause?.(false);
      if (was !== 'afk' && (phase === 'play' || phase === 'countdown')) runCountdown(cfg.pauseResumeCountdownSec ?? 3);
    }
    shell.pushHud(true);
  }

  function begin() {
    const pet = getPet(); if (!pet) return false;
    hooks.clear();
    control = ctx.getControl?.() === 'head' && cfg.controls?.includes('head') ? 'head' : 'touch';
    firstPlay = !!ctx.isFirstPlay?.(id);
    relaxed = !!ctx.relaxed?.(id);
    elapsed = 0; paused = false; pausedBy = '';
    shell.measure();
    if (hooks.begin() === false) return false;
    mood?.hold?.('minigame', true);
    runCountdown(cfg.countdownSec ?? 3);
    shell.say(cfg.lines?.start, true);
    if (favorite()) shell.say(picker.lines?.favorite || 'favGame', true);
    if (firstPlay && cfg.coach) hud.toast?.(cfg.coach, 3200);
    return true;
  }

  function start() {
    if (phase !== 'idle') return false;
    keyTarget?.addEventListener('keydown', onKey, true);
    keyTarget?.addEventListener('keyup', onKey, true);
    const pet = getPet();
    savedRotY = pet ? pet.object3d.rotation.y : 0;
    ctx.onStateChange?.(true);
    scaleFloor(true);
    if (!begin()) { phase = 'countdown'; exit(); return false; }
    return true;
  }

  /** Pay out once. Completed: by rule; else an early exit (no minimum, needs × f). */
  function settle(completed) {
    const p = hooks.payout(completed);
    const prevBest = Number(game.best?.()?.[id]) || 0;
    const best = game.setBest ? game.setBest(id, p.score) : Math.max(prevBest, p.score);
    const total = game.addCoins ? game.addCoins(p.coins) : 0;
    const gain = Number(shell.persona().playGain) || 1;
    const d = needDeltas(cfg.needs, clamp01(p.f), gain, favorite() ? picker.favoriteFunScale : 1);
    game.bump?.('fun', d.fun); game.bump?.('social', d.social); game.bump?.('hunger', d.hunger);
    ctx.onNeedsChanged?.();
    ctx.onCoins?.(total);
    game.persist?.();
    const r = { id, score: p.score, coins: p.coins, best, newBest: p.score > prevBest, completed, fractionPlayed: clamp01(p.f), needs: d, line: p.line };
    lastResult = r;
    try { ctx.onEnd?.(r); } catch (e) { console.error('[minigame] onEnd', e); }
    return r;
  }

  function finish() {
    phase = 'result';
    const r = settle(true);
    shell.sfx('win');
    shell.say(cfg.lines?.end || 'minigameWin', true);
    mood?.react?.(r.newBest ? 'joy' : 'smile', 2.2);
    getPet()?.play?.('hop');
    if (hud.showMinigameResult) hud.showMinigameResult({ id, score: r.score, best: r.best, coins: r.coins, line: r.line });
    else { hud.toast?.(`${r.line ? r.line + ' · ' : ''}ได้ ${r.score} คะแนน · +${r.coins} เหรียญ`, 3200); exit(); }
    return r;
  }

  function exit() {
    if (phase === 'idle' || phase === 'return') return;
    if ((phase === 'play' || phase === 'countdown') && elapsed > 0) settle(false);
    keyTarget?.removeEventListener('keydown', onKey, true);
    keyTarget?.removeEventListener('keyup', onKey, true);
    hooks.clear();
    paused = false; pausedBy = ''; countToken++;
    const pet = getPet();
    pet?.setMouthOpen?.(-1); pet?.lookAt?.(null); pet?.setSquish?.(0, 0);
    mood?.hold?.('minigame', false);
    hud.endMinigame?.();
    scaleFloor(false);
    if (pet) { returnFrom.copy(pet.object3d.position); returnT = 0; phase = 'return'; }
    else { phase = 'idle'; ctx.onStateChange?.(false); }
  }

  function update(dt) {
    clock += dt;
    if (phase === 'idle') return;
    hooks.always?.(dt);
    if (phase === 'return') {
      const pet = getPet(); if (!pet) { phase = 'idle'; ctx.onStateChange?.(false); return; }
      returnT = Math.min(1, returnT + dt / FEEL.returnSeconds);
      const k = returnT * returnT * (3 - 2 * returnT);
      pet.object3d.position.lerpVectors(returnFrom, getHome(), k);
      pet.object3d.rotation.y += (savedRotY - pet.object3d.rotation.y) * k;
      if (returnT >= 1) { pet.object3d.rotation.y = savedRotY; phase = 'idle'; ctx.onStateChange?.(false); }
      return;
    }
    if (paused || phase === 'result') return;
    if (phase === 'countdown') {
      if (!hudDriven) {
        countLeft -= dt;
        const c = Math.ceil(countLeft);
        if (c !== lastCount && c > 0) { lastCount = c; shell.sfx('tick'); shell.pushHud(true); }
        if (countLeft <= 0) go();
      }
      hooks.countdown?.(dt);
      return;
    }
    hooks.play(dt);
    shell.pushHud(false);
  }

  const active = () => phase === 'play' && !paused;
  return {
    start, exit, update, setPaused,
    again() { if (phase === 'result') begin(); },
    pointerDown(x, y, pid = 0) { if (active()) hooks.pointerDown?.(x, y, pid); },
    pointerMove(x, y, pid = 0, pressed = true) { if (active()) hooks.pointerMove?.(x, y, pid, pressed); },
    pointerUp(pid = 0) { hooks.pointerUp?.(pid); },
    /** Legacy Snack Rain call: treated as a move with no tap. */
    pointerX(x) { if (active()) hooks.pointerMove?.(x, stage.size.top + stage.size.h / 2, 0, false); },
    pad(pid) { if (phase === 'play') hooks.pad?.(pid); },
    get active() { return phase !== 'idle'; },
    get phase() { return phase; },
    get paused() { return paused; },
    get lastResult() { return lastResult; },
    get state() { return { id, phase, paused, elapsed, control, firstPlay, relaxed, ...(hooks.debug?.() || {}) }; },
    dispose() { exit(); hooks.clear(); hooks.dispose?.(); },
  };
}

/**
 * Object pool by key (no allocation per frame once warm).
 * @param {THREE.Object3D} parent
 * @param {(key:string) => THREE.Object3D|null} make
 */
export function createPool(parent, make) {
  const pools = new Map();
  return {
    take(key) {
      let p = pools.get(key); if (!p) { p = []; pools.set(key, p); }
      let m = p.pop();
      if (!m) {
        try { m = make(key); } catch (e) { console.error('[minigame] mesh', key, e); m = null; }
        if (!m) return null;
        if (m.userData.baseScale == null) m.userData.baseScale = m.scale.x;
      }
      m.visible = true; m.rotation.set(0, 0, 0); m.scale.setScalar(m.userData.baseScale);
      parent.add(m);
      return m;
    },
    give(m, key) { parent.remove(m); m.visible = false; pools.get(key)?.push(m); },
    clear() { pools.clear(); },
  };
}

/** Uniformly scale an object so its largest dimension is `size` (sets userData.baseScale). */
export function fitSize(obj, size) {
  const box = new THREE.Box3().setFromObject(obj);
  const s = new THREE.Vector3(); box.getSize(s);
  const m = Math.max(s.x, s.y, s.z) || 1;
  obj.scale.multiplyScalar(size / m);
  obj.userData.baseScale = obj.scale.x;
  return obj;
}
