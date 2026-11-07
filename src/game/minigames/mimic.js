/**
 * จำท่าทาง (`mimic`) — round controller. The pet shows a sequence of poses
 * (face + short action, pad glow, note); the player taps the pads back (Simon).
 * Design: design/gdd/minigames-2.md 3.2, 4.1, 5.1–5.5. Rules: mimic-rules.js.
 * HUD (glaze): showMimicPads / flashMimicPad / setMimicPadsEnabled / hideMimicPads,
 * handler onMimicPad(id) → instance.pad(id). Without Glaze's pads a small DOM
 * fallback row is shown so the game stays playable.
 * Controls: tap / click pads · keys 1–6 · ←↑→↓ for the first 4. No head mode (GDD 3.2 #7).
 * @module game/minigames/mimic
 */
import { createRound } from './round.js';
import {
  resolveMimic, newMimicState, pressPad, useHint, endCheck, showSec, padsFor, hintAfter,
  mimicCoins, mimicFraction,
} from './mimic-rules.js';

export * from './mimic-rules.js';

const ARROWS = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 };
/** Fallback pad tints (pastel; Glaze's HUD uses its own tokens). */
const TINT = { pink: '#F7CADB', lilac: '#DCCBF2', sky: '#C4E0F6', lavender: '#D5D2F2', peach: '#F9D7C2', butter: '#F7E8B5' };
const SHAPE_GLYPH = { circle: '●', star: '★', drop: '💧', moon: '☾', heart: '♥', sun: '☀' };

/**
 * @param {object} ctx registry ctx (index.js)
 */
export function createMimic(ctx) {
  const { cfg } = resolveMimic(ctx.data?.mimic);
  const hud = ctx.hud;
  // Clay's MIMIC_POSES (character.js) may override face/action per pose: array of
  // { id, expr, action } or an object keyed by pose id. ctx.mimicPoses wins; else a lazy import.
  const poses = cfg.poses.map((p) => ({ ...p }));
  function mergeClay(list) {
    if (!list) return;
    const byId = Array.isArray(list) ? Object.fromEntries(list.filter((x) => x && x.id).map((x) => [x.id, x])) : list;
    for (const p of poses) { const c = byId[p.id]; if (c) { if (c.expr || c.expression) p.expr = c.expr || c.expression; if (c.action) p.action = c.action; } }
  }
  if (ctx.mimicPoses) mergeClay(ctx.mimicPoses);
  else import('../../characters/character.js').then((m) => mergeClay(m.MIMIC_POSES)).catch(() => {});

  return createRound(ctx, 'mimic', { ...cfg, durationSec: cfg.maxSec, coach: 'ดูเพื่อนทำท่า แล้วแตะปุ่มตามลำดับนะ' }, (shell) => {
    let st = null, sub = 'show', subT = 0, showIdx = 0, showOn = false, idleT = 0, afkT = 0, padCount = 0, hinted = false;
    let fallbackEl = null, ended = '';

    const pet = () => ctx.getPet();
    const padList = (n) => poses.slice(0, n).map((p, i) => ({ id: p.id, label: p.label, icon: p.shape, color: p.color, shape: p.shape, note: p.note, index: i }));

    function showPads(n) {
      padCount = n;
      if (hud.showMimicPads) { hud.showMimicPads(padList(n)); removeFallback(); }
      else buildFallback(n);
    }
    function padsEnabled(on) {
      hud.setMimicPadsEnabled?.(on);
      if (fallbackEl) fallbackEl.style.opacity = on ? '1' : '0.55';
    }
    function flash(i, kind) {
      const p = poses[i]; if (!p) return;
      hud.flashMimicPad?.(p.id, kind);
      const b = fallbackEl?.children[i];
      if (b) { b.style.transform = 'scale(1.08)'; b.style.boxShadow = kind === 'wrong' ? '0 0 0 4px #E9A9BE' : '0 0 0 4px #5A68B5'; setTimeout(() => { b.style.transform = ''; b.style.boxShadow = ''; }, 260); }
    }

    // ---- DOM fallback pads (only when the HUD has no showMimicPads) ----
    function buildFallback(n) {
      if (typeof document === 'undefined') return;
      removeFallback();
      const el = document.createElement('div');
      el.className = 'mp-mimic-fallback';
      el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);display:flex;flex-wrap:wrap;gap:10px;justify-content:center;z-index:4;pointer-events:auto;transition:opacity .2s';
      poses.slice(0, n).forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.mimicPad = p.id;
        b.setAttribute('aria-label', p.label);
        b.style.cssText = `width:76px;height:76px;border-radius:24px;border:0;background:${TINT[p.color] || '#EEE'};font:500 13px/1.1 Prompt,Poppins,sans-serif;color:#1E1E1E;display:grid;place-content:center;gap:2px;transition:transform .15s,box-shadow .15s;box-shadow:0 3px 10px rgba(30,30,30,.1)`;
        b.innerHTML = `<span style="font-size:24px">${SHAPE_GLYPH[p.shape] || '●'}</span><span>${p.label}</span>`;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onPad(p.id); });
        el.append(b);
      });
      document.body.append(el);
      fallbackEl = el;
    }
    function removeFallback() { fallbackEl?.remove(); fallbackEl = null; }

    // ---- pet pose ----
    function perform(i, sec) {
      const p = poses[i], pt = pet(); if (!p || !pt) return;
      ctx.mood?.react?.(p.expr, Math.max(0.3, sec));
      if (!ctx.reduceMotion && p.action) { try { pt.play?.(p.action); } catch { /* unknown action */ } }
      shell.sfx('note', { index: p.note - 1, note: p.note }, 'tap');
    }

    function startShow() {
      const n = padsFor(st.L, cfg);
      if (n !== padCount) showPads(n);
      sub = 'show'; subT = 0; showIdx = 0; showOn = false;
      padsEnabled(false);
      shell.pushHud(true);
    }
    function startInput() { sub = 'input'; subT = 0; idleT = 0; afkT = 0; hinted = false; padsEnabled(true); shell.pushHud(true); }
    function between() {
      const why = endCheck(st, shell.elapsed, cfg);
      if (why) { ended = why; shell.finish(); return; }
      sub = 'between'; subT = 0; padsEnabled(false);
    }

    function onPad(pid) {
      if (shell.phase !== 'play') return;
      if (shell.paused) { if (afkT >= cfg.afkPauseSec) { afkT = 0; idleT = 0; shell.setPaused(false, 'afk'); } else return; }
      if (sub !== 'input') return;   // taps during the show are ignored, never a slip (GDD 5.4)
      const i = poses.findIndex((p) => p.id === pid);
      if (i < 0 || i >= padCount) return;
      idleT = 0; afkT = 0;
      const r = pressPad(st, i, cfg, shell.random);
      st = r.state;
      if (r.outcome === 'ok' || r.outcome === 'complete') { flash(i, 'ok'); perform(i, cfg.mirrorSec); }
      if (r.outcome === 'complete') {
        shell.sfx('sparkle');
        shell.say(cfg.lines.good);
        between();
      } else if (r.outcome === 'slip') {
        flash(i, 'wrong');
        shell.sfx('pop', { volume: 0.5 });
        ctx.mood?.react?.('shy', 1.0);
        shell.say(cfg.lines.slip);
        between();
      }
      shell.pushHud(true);
    }

    return {
      begin() {
        st = newMimicState(cfg, shell.random);
        ended = ''; padCount = 0;
        const p = pet(); if (p) { const h = ctx.getHome(); p.object3d.position.set(h.x, h.y, h.z); }
        showPads(padsFor(st.L, cfg));
        padsEnabled(false);
        sub = 'wait';
      },
      countdown() {},
      play(dt) {
        if (sub === 'wait') { startShow(); }
        // the round timer runs in every sub-phase except AFK pause (handled by the shell pause)
        shell.elapsed = shell.elapsed + dt;
        subT += dt;
        if (sub === 'show') {
          const relaxed = shell.relaxed || shell.elapsed < shell.easySec;
          const on = showSec(st.L, cfg, { relaxed, replay: st.replay });
          const slot = on + cfg.gapSec;
          const idx = Math.floor(subT / slot);
          if (idx >= st.seq.length) { startInput(); return; }
          const inOn = subT - idx * slot < on;
          if (inOn && (idx !== showIdx || !showOn)) { showIdx = idx; showOn = true; flash(st.seq[idx], 'demo'); perform(st.seq[idx], on); }
          if (!inOn) showOn = false;
        } else if (sub === 'input') {
          idleT += dt; afkT += dt;
          if (!hinted && idleT >= hintAfter(cfg, shell.relaxed)) { hinted = true; st = useHint(st); flash(st.seq[st.idx], 'demo'); }
          if (afkT >= cfg.afkPauseSec) { hud.toast?.('ยังเล่นอยู่ไหม? แตะปุ่มเพื่อเล่นต่อ', 4000); shell.setPaused(true, 'afk'); }
        } else if (sub === 'between') {
          if (subT >= cfg.betweenSec) startShow();
        }
      },
      hud() {
        const coins = mimicCoins(st?.score || 0, cfg, false);
        return {
          score: st?.score || 0, coins, timeLeft: Math.max(0, cfg.maxSec - shell.elapsed),
          round: st?.L || cfg.startLength, slips: st?.slips || 0, slipsMax: cfg.slipsPerRound,
          sequence: st ? { length: st.seq.length, index: st.idx, phase: sub } : null,
        };
      },
      payout(completed) {
        const reached = st?.best || 0;
        const line = reached > 0 ? (ended === 'max' ? `จำได้ครบ ${reached} ท่าเลย!` : `ไปได้ถึง ${reached} ท่า!`) : 'ลองใหม่อีกทีนะ';
        return { score: st?.score || 0, coins: mimicCoins(st?.score || 0, cfg, completed), f: mimicFraction(shell.elapsed, cfg, completed), line };
      },
      key(e, down) {
        if (!down || e.repeat) return ['1', '2', '3', '4', '5', '6'].includes(e.key) || e.key in ARROWS;
        let i = -1;
        if (e.key >= '1' && e.key <= '6') i = Number(e.key) - 1;
        else if (e.key in ARROWS) i = ARROWS[e.key];
        if (i < 0) return false;
        if (poses[i]) onPad(poses[i].id);
        return true;
      },
      pad: onPad,
      onPause(p) {
        // paused in the show phase → replay the sequence from the start after resume (GDD 5.1)
        if (!p && sub === 'show') { subT = 0; showIdx = 0; showOn = false; }
      },
      clear() { hud.hideMimicPads?.(); removeFallback(); padCount = 0; },
      debug() { return st ? { L: st.L, seq: st.seq.slice(), idx: st.idx, slips: st.slips, score: st.score, sub, poses: poses.map((p) => p.id), padCount } : { sub }; },
    };
  });
}
