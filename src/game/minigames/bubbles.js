/**
 * เป่าฟองสบู่ (`bubbles`) — round controller. The pet blows bubbles that float
 * up; it calls a colour; the player taps bubbles of that colour (or coin bubbles).
 * Design: design/gdd/minigames-2.md 3.3, 4.2, 5.6–5.8. Rules: bubbles-rules.js.
 * Controls: tap / click bubbles (≤ maxTouches fingers) · keys ←→ / head tilt move
 * the "ดาวป๊อป" pop star (head mode: bubbles rise × popStar.riseScale).
 * Props (prop, feature-detected): createBubbleMesh({ color, pattern, coin }),
 * createPopBurst({ color }), createPopStar(); fallbacks are plain clay spheres.
 * @module game/minigames/bubbles
 */
import * as THREE from 'three';
import { createRound, createPool, fitSize } from './round.js';
import {
  resolveBubbles, spawnRateAt, riseAt, colorCount, pickBubble, nextCallIn, nextCallColor,
  mustForceCalled, newBubblesState, callColor, popBubble, pickTarget, bubblesCoins, isGood,
} from './bubbles-rules.js';
import { streakMult, clamp } from './common-rules.js';

export * from './bubbles-rules.js';

/** Presentation feel (not balance). */
const FEEL = { playWidthMax: 6, spawnBelow: 0.2, popSec: 0.3, wobble: 2.2, starFollow: 10, z: 0.8, lostSec: 0.7 };
/** Fallback tints (pastel) when Prop's bubble mesh is missing. */
const TINT = { pink: 0xF4BCD0, lilac: 0xD3C2EE, sky: 0xB9DAF3, butter: 0xF4E2A6, coin: 0xF2D79A };

export function createBubbles(ctx) {
  const { cfg } = resolveBubbles(ctx.data?.bubbles);
  const P = ctx.props;
  const scene = ctx.stage.scene;

  return createRound(ctx, 'bubbles', { ...cfg, coach: 'แตะฟองสีที่เพื่อนเรียกนะ ฟองรุ้งมีเหรียญ!' }, (shell) => {
    const area = shell.area;
    const live = [];      // { mesh, key, x, y, r, coin, color, phase, speedK, x0 }
    const pops = [];      // { mesh, key, t, s0 }
    const touches = new Set();
    const tmp = new THREE.Vector3();
    let st = newBubblesState(0), nColors = 4, spawnAcc = 0, callT = 0, warned = false, sinceNone = 0;
    let star = null, starX = 0, starOn = false, keyDir = 0, held = { l: false, r: false }, lostT = 0, hint = '';
    let half = 2, cx = 0, bottomY = 0, topY = 4, worldH = 5, petLift = 0, zB = 0.8;

    const pool = createPool(scene, (key) => {
      const coin = key === 'coin';
      const c = coin ? null : cfg.colors[Number(key.slice(2))];
      let m = null;
      if (P?.createBubbleMesh) { try { m = P.createBubbleMesh(coin ? 'coin' : c?.id, { pattern: c?.pattern }); } catch (e) { console.warn('[bubbles] prop mesh', e); } }
      if (!m) {
        m = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: coin ? TINT.coin : (TINT[c?.id] || 0xDDDDDD), roughness: 0.25, metalness: 0, transparent: true, opacity: 0.82 });
        m.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat));
        if (coin && P?.createCoinMesh) { const k = P.createCoinMesh(); k.scale.setScalar(1.4); m.add(k); }
      }
      return fitSize(m, cfg.bubbleSize);
    });
    const propBursts = [];
    const burstPool = createPool(scene, (key) => {
      let m = null;
      if (!m) m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 20), new THREE.MeshBasicMaterial({ color: TINT[key] || 0xFFFFFF, transparent: true, opacity: 0.8 }));
      return m;
    });

    function layout() {
      shell.measure();
      half = Math.min(area.w, FEEL.playWidthMax) / 2 - cfg.bubbleSize * 0.6;
      cx = area.cx; worldH = area.h; topY = area.top + cfg.bubbleSize;
      const home = ctx.getHome();
      bottomY = home.y + 1.1; zB = home.z + FEEL.z;
    }

    function headMode() { return shell.control === 'head'; }
    function spawn(force) {
      if (live.length >= cfg.spawn.maxOnScreen && !force) return;
      let b = pickBubble(shell.random(), shell.random(), st.called, nColors, cfg);
      if (force) b = { coin: false, color: st.called };
      const key = b.coin ? 'coin' : 'c:' + b.color;
      const mesh = pool.take(key); if (!mesh) return;
      const x0 = cx + (shell.random() * 2 - 1) * half * 0.35;   // from the wand, spreads as it rises
      const it = { mesh, key, x: x0, y: bottomY, r: cfg.bubbleSize / 2, coin: b.coin, color: b.color, phase: shell.random() * 6.28, speedK: 0.9 + shell.random() * 0.2, x0, xt: cx + (shell.random() * 2 - 1) * half };
      mesh.position.set(it.x, it.y, zB);
      live.push(it);
      if (!ctx.reduceMotion) ctx.getPet()?.play?.('jelly');
    }

    function popAt(i, viaStar) {
      const it = live[i];
      const r = popBubble(st, it, cfg, viaStar);
      if (r.outcome === 'pass') return false;
      st = r.state;
      const bk = it.coin ? 'coin' : cfg.colors[it.color]?.id;
      let pb = null;
      if (P?.createPopBurst) { try { pb = P.createPopBurst(bk, { reducedMotion: !!ctx.reduceMotion, soft: r.outcome === 'wrong' }); } catch { pb = null; } }
      if (pb?.object3d) { pb.object3d.position.copy(it.mesh.position); scene.add(pb.object3d); propBursts.push(pb); }
      const burst = pb ? null : burstPool.take(bk);
      if (burst) { burst.position.copy(it.mesh.position); pops.push({ mesh: burst, key: bk, t: 0, s0: burst.userData.baseScale }); }
      pool.give(it.mesh, it.key);
      live.splice(i, 1);
      if (r.outcome === 'coin') shell.sfx('coin');
      else if (r.outcome === 'good') shell.sfx('pop');
      else { shell.sfx('pop', { volume: 0.4 }); ctx.mood?.react?.('surprised', 0.6); if (!ctx.reduceMotion) ctx.getPet()?.play?.('tilt'); shell.say(cfg.lines.wrong); }
      if (r.outcome !== 'wrong' && !ctx.reduceMotion) petLift = 1;
      shell.pushHud(true);
      return true;
    }

    function call(first) {
      const c = nextCallColor(shell.random(), first ? -1 : st.called, nColors);
      st = first ? { ...st, called: c, prevCalled: -1, sinceCall: 0 } : callColor(st, c);
      callT = nextCallIn(shell.random(), cfg); warned = false;
      const col = cfg.colors[c];
      shell.say(cfg.lines.call, true, { color: col.label, fallback: `ฟองสี${col.label}!` });
      shell.pushHud(true);
    }

    function setStar(on) {
      starOn = on;
      if (on && !star) {
        let m = null;
        if (P?.createPopStar) { try { m = P.createPopStar(); } catch { m = null; } }
        if (!m) {
          const s = new THREE.Shape();
          for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.14 : 0.32; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
          m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: 0xF7E3A1, roughness: 0.6 }));
        }
        star = m; starX = cx;
      }
      if (star) { if (on) scene.add(star); else scene.remove(star); }
    }

    return {
      begin() {
        layout();
        nColors = colorCount(cfg, shell.relaxed);
        st = newBubblesState(0); spawnAcc = 0; sinceNone = 0; touches.clear(); held = { l: false, r: false }; keyDir = 0; lostT = 0; hint = '';
        call(true);
        const p = ctx.getPet(); if (p) { const h = ctx.getHome(); p.object3d.position.set(h.x, h.y, h.z); }
        setStar(headMode());
      },
      countdown() { if (shell.resized()) layout(); },
      play(dt) {
        if (shell.resized()) layout();
        const t = shell.elapsed = Math.min(cfg.durationSec, shell.elapsed + dt);
        st.sinceCall += dt;   // mutable field in the round state (not shared)
        // colour calls
        callT -= dt;
        if (!warned && callT <= cfg.call.warnSec) { warned = true; shell.sfx('call', null, 'chirp'); hint = 'เปลี่ยนสี!'; shell.pushHud(true); }
        if (callT <= 0) { call(false); hint = ''; }
        // spawn
        const easy = shell.easySec;
        spawnAcc = Math.min(2, spawnAcc + spawnRateAt(t, cfg, easy) * dt);
        if (spawnAcc >= 1) { spawnAcc -= 1; spawn(false); }
        let calledOn = 0;
        for (let i = 0; i < live.length; i++) if (!live[i].coin && live[i].color === st.called) calledOn++;
        sinceNone = calledOn ? 0 : sinceNone + dt;
        if (mustForceCalled(calledOn, st.sinceCall, sinceNone, cfg)) { sinceNone = 0; spawn(true); }
        // motion
        const rise = riseAt(t, cfg, { easySec: easy, star: headMode(), relaxed: shell.relaxed }) * worldH;
        let n = 0;
        for (let i = 0; i < live.length; i++) {
          const it = live[i];
          it.y += rise * it.speedK * dt;
          it.x += (it.xt - it.x) * (1 - Math.exp(-0.8 * dt));
          const sway = Math.sin(shell.clock * FEEL.wobble + it.phase) * cfg.drift * area.w * 0.5;
          it.mesh.position.set(it.x + sway, it.y, zB);
          if (!ctx.reduceMotion) it.mesh.rotation.z = Math.sin(shell.clock * 1.3 + it.phase) * 0.15;
          if (it.y > topY) { pool.give(it.mesh, it.key); continue; }   // floated away: no effect
          live[n++] = it;
        }
        live.length = n;
        // pop star (keys or head)
        if (starOn && star) {
          if (headMode()) {
            const a = ctx.head?.axis?.();
            if (a == null) { lostT += dt; } else { lostT = 0; starX += (cx + a * half - starX) * (1 - Math.exp(-FEEL.starFollow * dt)); }
            const h = lostT > FEEL.lostSec ? 'หันหน้าให้กล้องเห็นนะ' : (hint === 'หันหน้าให้กล้องเห็นนะ' ? '' : hint);
            if (h !== hint) { hint = h; shell.pushHud(true); }
          }
          if (keyDir) starX += keyDir * cfg.popStar.keySpeed * 2 * half * dt;
          starX = clamp(starX, cx - half, cx + half);
          const sy = area.bottom + cfg.popStar.y * area.h;
          star.position.set(starX, sy, zB + 0.05);
          star.rotation.z += dt * 0.8;
          for (let i = live.length - 1; i >= 0; i--) {
            const it = live[i], dx = it.mesh.position.x - starX, dy = it.y - sy, R = cfg.popStar.radius + it.r;
            if (dx * dx + dy * dy < R * R && isGood(st, it, cfg)) popAt(i, true);
          }
        }
        // pet: holds the wand at the bottom, small lift on a good pop
        const pet = ctx.getPet();
        if (pet && petLift > 0) { petLift = Math.max(0, petLift - dt * 4); const h = ctx.getHome(); pet.object3d.position.y = h.y + Math.sin(petLift * Math.PI) * 0.08; }
        if (t >= cfg.durationSec) shell.finish();
      },
      always(dt) {
        let n = 0;
        for (let i = 0; i < pops.length; i++) {
          const f = pops[i];
          f.t = Math.min(1, f.t + dt / FEEL.popSec);
          f.mesh.scale.setScalar(f.s0 * (1 + f.t * 0.8));
          if (f.mesh.material) f.mesh.material.opacity = 0.8 * (1 - f.t);
          if (f.t >= 1) burstPool.give(f.mesh, f.key); else pops[n++] = f;
        }
        pops.length = n;
        let k = 0;
        for (const pb of propBursts) { let fin = true; try { fin = pb.update(dt); } catch { fin = true; } if (fin) { pb.object3d.parent?.remove(pb.object3d); pb.dispose?.(); } else propBursts[k++] = pb; }
        propBursts.length = k;
      },
      hud() {
        const col = cfg.colors[st.called] || cfg.colors[0];
        return {
          score: st.score, streak: st.streak, multiplier: streakMult(st.streak, cfg.streak),
          coins: st.coinPops * cfg.coinValue, timeLeft: Math.max(0, cfg.durationSec - shell.elapsed),
          call: { color: col.id, label: col.label, pattern: col.pattern }, hint,
        };
      },
      payout(completed) {
        return { score: st.score, coins: bubblesCoins(st.score, st.coinPops, cfg, completed), f: shell.elapsed / cfg.durationSec };
      },
      key(e, down) {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') held.l = down;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') held.r = down;
        else return false;
        keyDir = (held.r ? 1 : 0) - (held.l ? 1 : 0);
        if (down && !starOn) setStar(true);
        return true;
      },
      pointerDown(x, y, id) {
        if (touches.size >= cfg.maxTouches && !touches.has(id)) return;
        touches.add(id);
        if (!shell.toWorld(x, y, tmp, FEEL.z)) return;
        // hit test against drawn positions (sway included)
        for (let i = 0; i < live.length; i++) { live[i].hx = live[i].x; live[i].x = live[i].mesh.position.x; }
        const i = pickTarget(live, tmp.x, tmp.y, st, cfg);
        for (let j = 0; j < live.length; j++) live[j].x = live[j].hx;
        if (i >= 0) popAt(i, false);
      },
      pointerUp(id) { touches.delete(id); },
      onPause() { held = { l: false, r: false }; keyDir = 0; touches.clear(); },
      clear() {
        for (const it of live) pool.give(it.mesh, it.key);
        for (const f of pops) burstPool.give(f.mesh, f.key);
        for (const pb of propBursts) { pb.object3d.parent?.remove(pb.object3d); pb.dispose?.(); }
        live.length = 0; pops.length = 0; propBursts.length = 0;
        if (star) scene.remove(star);
        starOn = false;
        const pet = ctx.getPet(); if (pet) pet.object3d.position.y = ctx.getHome().y;
      },
      debug() {
        return { score: st.score, streak: st.streak, coinPops: st.coinPops, called: cfg.colors[st.called]?.id, bubbles: live.length,
          list: live.map((b) => ({ x: b.mesh.position.x, y: b.y, z: b.mesh.position.z, coin: b.coin, color: cfg.colors[b.color]?.id, good: isGood(st, b, cfg) })) };
      },
    };
  });
}
