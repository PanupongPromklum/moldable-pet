/**
 * กระโดดข้ามก้อน (`hop`) — round controller. The pet runs in place at 30% of
 * the play width; soft obstacles roll in from the right; tap to jump (one double
 * jump in the air, a kind input buffer). Bumps never end the round.
 * Design: design/gdd/minigames-2.md 3.4, 4.3, 5.9–5.10. Rules: hop-rules.js.
 * Controls: tap / click anywhere outside the HUD · Space / ↑ / W · head tilt flick.
 * Props (prop, feature-detected): createHopObstacle(kind) for 'pebble' | 'cushion',
 * createDemonMesh / createCoinMesh (Snack Rain), createHopGround({ width }) with an
 * optional `userData.scroll(dx)`; fallbacks are simple clay shapes.
 * @module game/minigames/hop
 */
import * as THREE from 'three';
import { createRound, createPool, fitSize } from './round.js';
import {
  resolveHop, speedAt, gapAt, pickObstacle, newJump, jumpY, pressJump, stepJump,
  newHopState, applyHop, hopCoins, createFlick,
} from './hop-rules.js';
import { streakMult } from './common-rules.js';

export * from './hop-rules.js';

/** Presentation feel (not balance): sizes are world units. */
const FEEL = {
  playWidthMax: 7, z: 1.5, petHalf: 0.32, faceSide: 0.5, coinLift: 1.25, doubleGap: 0.75,
  size: { pebble: 0.42, cushion: 0.5, demon: 0.5 }, height: { pebble: 0.34, cushion: 0.4, demon: 0.45 },
  visualScale: 1.6,   // obstacles drawn bigger than their hit box so they read next to the (wide) pet
  bobHz: 3.2, bobY: 0.05, rollAwaySec: 0.45, lostSec: 0.7, groundDepth: 1.6,
};
const TINT = { pebble: 0xC9B8A6, cushion: 0xF3C9D6, ground: 0xE9DCCB, dash: 0xD9C7B2 };
const HEAD_FULL = 20, HEAD_DEAD = 4;   // HEAD_FEEL (input/head-rules.js): used only to estimate roll from axis()

export function createHop(ctx) {
  const { cfg } = resolveHop(ctx.data?.hop);
  const P = ctx.props;
  const scene = ctx.stage.scene;

  return createRound(ctx, 'hop', { ...cfg, coach: 'แตะจอเพื่อกระโดด แตะอีกครั้งกลางอากาศ = กระโดดสูงขึ้น' }, (shell) => {
    const area = shell.area;
    const live = [];      // { mesh, coinMesh, kind, x, h, half, coin, passed, hit, away }
    const j = newJump();
    let st = newHopState(), nextGap = 1, sinceSpawn = 0, grace = 0, squishT = 0, demonLineT = -99;
    let petX = 0, groundY = 0, rightX = 4, leftX = -4, ground = null, zH = 0.4;
    let flick = createFlick(cfg.headFlick), lostT = 0, hint = '', mode = {};

    const pool = createPool(scene, (kind) => {
      let m = null;
      if (kind === 'coin') m = P?.createCoinMesh ? P.createCoinMesh() : null;
      else if (kind === 'demon') m = P?.createDemonMesh ? P.createDemonMesh() : null;
      else if (P?.createHopObstacle) {
        // Prop obstacles are already sized in world units (HOP_OBSTACLE_SIZE) with the origin at the
        // bottom centre; refitting them would count the soft shadow disc and shrink them.
        try { m = P.createHopObstacle(kind); } catch { m = null; }
        if (m) { m.scale.multiplyScalar(FEEL.visualScale); m.userData.baseScale = m.scale.x; m.userData.originBottom = true; return m; }
      }
      if (!m) {
        m = new THREE.Group();
        const geo = kind === 'cushion' ? new THREE.BoxGeometry(0.5, 0.36, 0.42) : new THREE.SphereGeometry(0.24, 18, 12);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: TINT[kind] || 0xF2D79A, roughness: 0.85 }));
        if (kind === 'pebble') mesh.scale.set(1, 0.75, 0.9);
        if (kind === 'coin') { mesh.geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.07, 20); mesh.rotation.x = Math.PI / 2; }
        m.add(mesh);
      }
      return fitSize(m, kind === 'coin' ? 0.38 : FEEL.size[kind] * FEEL.visualScale);
    });

    function makeGround() {
      if (ground) return ground;
      let g = null;
      if (P?.createHopGround) {
        try {
          const pg = P.createHopGround(FEEL.playWidthMax + 4);
          if (pg?.object3d) { g = pg.object3d; g.userData.scroll = (dx) => pg.scroll(dx); g.userData.topY = 0; }
        } catch { g = null; }
      }
      if (!g) {
        g = new THREE.Group();
        const w = FEEL.playWidthMax + 4;
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, FEEL.groundDepth), new THREE.MeshStandardMaterial({ color: TINT.ground, roughness: 0.95 })));
        const dashes = new THREE.Group(); dashes.name = 'dashes';
        const dg = new THREE.BoxGeometry(0.35, 0.02, 0.12), dm = new THREE.MeshStandardMaterial({ color: TINT.dash, roughness: 0.95 });
        for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(dg, dm); d.position.set(-w / 2 + i * (w / 12), 0.07, 0.35); dashes.add(d); }
        g.add(dashes);
        g.userData.scroll = (dx) => { for (const d of dashes.children) { d.position.x -= dx; if (d.position.x < -w / 2) d.position.x += w; } };
      }
      ground = g;
      return g;
    }

    function layout() {
      shell.measure();
      const w = Math.min(area.w, FEEL.playWidthMax);
      leftX = area.cx - w / 2; rightX = area.cx + w / 2;
      petX = leftX + w * cfg.petX;
      const home = ctx.getHome(); groundY = home.y; zH = home.z + FEEL.z;
      if (ground) ground.position.set(area.cx, groundY - (ground.userData.topY ?? 0.06), zH - 0.2);
    }

    function spawn() {
      const t = shell.elapsed;
      const o = pickObstacle(shell.random(), shell.random(), shell.random(), t, cfg, mode);
      add(o.kind, rightX + 0.6, o.coin);
      if (o.double) add(pickObstacle(shell.random(), 1, 1, t, cfg, mode).kind, rightX + 0.6 + FEEL.doubleGap, false);
    }
    function add(kind, x, coin) {
      const mesh = pool.take(kind); if (!mesh) return;
      const h = FEEL.height[kind];
      const lift = mesh.userData.originBottom ? 0 : (h * FEEL.visualScale) / 2;
      mesh.position.set(x, groundY + lift, zH);
      if (kind === 'demon') mesh.rotation.y = -0.4;
      let coinMesh = null;
      if (coin) { coinMesh = pool.take('coin'); coinMesh?.position.set(x, groundY + FEEL.coinLift, zH); }
      live.push({ mesh, coinMesh, kind, x, h, lift, half: FEEL.size[kind] * 0.45, coin: !!coinMesh, passed: false, hit: false, away: 0 });
    }

    function jump() {
      const r = pressJump(j, cfg, mode);
      if (r === 'jump' || r === 'double') { shell.sfx('whoosh', { volume: r === 'double' ? 0.5 : 0.7 }); if (r === 'jump') ctx.getPet()?.setSquish?.(0, 0.12); }
    }

    function bump(o) {
      o.hit = true; o.away = 0.0001;
      const keep = mode.head && lostT > FEEL.lostSec;   // face lost: bumps keep the streak (GDD 5.10)
      st = applyHop(st, 'bump', cfg, keep).state;
      grace = cfg.bumpGraceSec; squishT = cfg.bumpSquish;
      ctx.getPet()?.setSquish?.(0.3, 0.3);
      shell.sfx('boing');
      if (o.kind === 'demon') {
        ctx.mood?.react?.(shell.persona().hurtExpr || 'grumpy', 0.8);
        if (shell.clock - demonLineT >= (cfg.lines.demonLineCooldownSec ?? 6) && shell.say(cfg.lines.demon)) demonLineT = shell.clock;
      } else shell.say(cfg.lines.bump);
      shell.pushHud(true);
    }

    function give(o) { pool.give(o.mesh, o.kind); if (o.coinMesh) pool.give(o.coinMesh, 'coin'); }

    function placePet(dt) {
      const pet = ctx.getPet(); if (!pet) return;
      const home = ctx.getHome();
      const bob = j.air || ctx.reduceMotion ? 0 : Math.abs(Math.sin(shell.clock * FEEL.bobHz * Math.PI)) * FEEL.bobY;
      pet.object3d.position.set(petX, home.y + jumpY(j) + bob, home.z + FEEL.z);
      pet.object3d.rotation.y += (FEEL.faceSide - pet.object3d.rotation.y) * (1 - Math.exp(-8 * dt));
    }

    return {
      begin() {
        mode = { head: shell.control === 'head', relaxed: shell.relaxed, easySec: shell.easySec };
        st = newHopState(); Object.assign(j, newJump()); flick = createFlick(cfg.headFlick);
        sinceSpawn = 0; grace = 0; squishT = 0; lostT = 0; hint = '';
        scene.add(makeGround());
        layout();
        nextGap = 1.0;   // first obstacle after 1 s of play
      },
      countdown(dt) { if (shell.resized()) layout(); placePet(dt); },
      play(dt) {
        if (shell.resized()) layout();
        const t = shell.elapsed = Math.min(cfg.durationSec, shell.elapsed + dt);
        // head flick
        if (mode.head) {
          let deg = ctx.head?.roll?.();
          if (deg === undefined) { const a = ctx.head?.axis?.(); deg = a == null ? null : (a === 0 ? 0 : HEAD_DEAD + Math.abs(a) * (HEAD_FULL - HEAD_DEAD)); }
          if (deg == null) lostT += dt; else lostT = 0;
          if (flick.update(deg, t)) jump();
          const h = lostT > FEEL.lostSec ? 'หันหน้าให้กล้องเห็นนะ' : '';
          if (h !== hint) { hint = h; shell.pushHud(true); }
        }
        // spawn
        sinceSpawn += dt;
        if (sinceSpawn >= nextGap) { sinceSpawn = 0; nextGap = gapAt(t, shell.random(), cfg, mode); spawn(); }
        // jump + pet
        const land = stepJump(j, dt, cfg, mode);
        if (land === 'land') ctx.getPet()?.setSquish?.(0.12, 0);
        if (squishT > 0) { squishT -= dt; if (squishT <= 0) ctx.getPet()?.setSquish?.(0, 0); }
        else if (land === 'air' && j.t > 0.12) ctx.getPet()?.setSquish?.(0, 0);
        grace = Math.max(0, grace - dt);
        placePet(dt);
        // obstacles
        const speed = speedAt(t, cfg, mode);
        if (ground?.userData.scroll) ground.userData.scroll(speed * dt);
        const y = jumpY(j);
        let n = 0;
        for (let i = 0; i < live.length; i++) {
          const o = live[i];
          o.x -= speed * dt;
          if (o.away > 0) {   // rolls aside softly after a bump
            o.away += dt / FEEL.rollAwaySec;
            o.mesh.position.set(o.x, groundY + o.lift + Math.sin(Math.min(1, o.away) * Math.PI) * 0.25, zH - o.away * 1.2);
          } else {
            o.mesh.position.x = o.x;
            if (o.kind !== 'demon') o.mesh.rotation.z += speed * dt / Math.max(0.1, o.half * 2);
          }
          if (o.coinMesh) { o.coinMesh.position.x = o.x; o.coinMesh.rotation.y += dt * 2.2; }
          const overlap = Math.abs(o.x - petX) < FEEL.petHalf + o.half;
          if (!o.hit && !o.passed && overlap && y < o.h && grace <= 0) bump(o);
          if (!o.hit && !o.passed && o.x < petX - FEEL.petHalf - o.half) {
            o.passed = true;
            const r = applyHop(st, o.coin ? 'coin' : 'clear', cfg); st = r.state;
            if (o.coin) { shell.sfx('coin'); if (o.coinMesh) { pool.give(o.coinMesh, 'coin'); o.coinMesh = null; } }
            shell.pushHud(true);
          }
          if (o.x < leftX - 1 || o.away > 1) { give(o); continue; }
          live[n++] = o;
        }
        live.length = n;
        if (t >= cfg.durationSec) shell.finish();
      },
      hud() {
        return {
          score: st.score, streak: st.streak, multiplier: streakMult(st.streak, cfg.streak),
          coins: st.coinsGot * cfg.coinValue, timeLeft: Math.max(0, cfg.durationSec - shell.elapsed), hint,
        };
      },
      payout(completed) { return { score: st.score, coins: hopCoins(st.score, st.coinsGot, cfg, completed), f: shell.elapsed / cfg.durationSec }; },
      key(e, down) {
        const k = e.key;
        if (k !== ' ' && k !== 'ArrowUp' && k !== 'w' && k !== 'W') return false;
        if (down && !e.repeat) jump();
        return true;
      },
      pointerDown() { jump(); },
      clear() {
        for (const o of live) give(o);
        live.length = 0;
        if (ground) scene.remove(ground);
        Object.assign(j, newJump());
        ctx.getPet()?.setSquish?.(0, 0);
      },
      debug() {
        return { score: st.score, streak: st.streak, clears: st.clears, bumps: st.bumps, coinsGot: st.coinsGot, air: j.air, y: jumpY(j), petX,
          obstacles: live.map((o) => ({ x: o.x, kind: o.kind, h: o.h, half: o.half, passed: o.passed, hit: o.hit, coin: o.coin })) };
      },
    };
  });
}
