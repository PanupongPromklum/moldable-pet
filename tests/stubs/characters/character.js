// TEST STUB of Clay's src/characters/character.js (contract only, not the real look).
import * as THREE from 'three';

export const CHARACTER_KEYS = ['splat', 'pill', 'gumdrop', 'diamond', 'cloud', 'flower'];
const COLORS = { splat: 0xdda2bf, pill: 0xd59fc5, gumdrop: 0xb4add9, diamond: 0x8babc1, cloud: 0xadbddc, flower: 0xc8cbe8 };
const DUR = { hop: 0.5, shake: 0.6, nod: 0.5, jelly: 0.7, tilt: 0.8, sway: 1.2, chew: 1.0, gulp: 0.35, wiggle: 0.9, shiver: 0.7, yawn: 1.4 };

export function createCharacter(key) {
  const object3d = new THREE.Group(); object3d.name = 'pet:' + key;
  const squash = new THREE.Group(); object3d.add(squash);
  const mat = new THREE.MeshPhysicalMaterial({ color: COLORS[key] || 0xc8cbe8, roughness: 0.9, sheen: 1, sheenRoughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat); body.position.y = 1; squash.add(body);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1e1e1e });
  for (const x of [-0.3, 0.3]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), eyeM); e.position.set(x, 1.25, 0.93); squash.add(e); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), new THREE.MeshBasicMaterial({ color: 0x45121d })); mouth.position.set(0, 0.85, 0.97); mouth.scale.set(1, 0.2, 0.4); squash.add(mouth);
  const st = { expr: 'original', act: null, actT: 0, mouth: -1, talk: 0, sq: { x: 0, y: 0 }, carried: false, sitting: false, grab: null, lastPlayed: null, lookAt: null };
  const v = new THREE.Vector3();
  return {
    object3d, state: st,
    update(dt, time) {
      let y = 0, rz = 0;
      if (st.act) { st.actT += dt; const k = st.actT / st.act.d; if (k >= 1) st.act = null; else { if (st.act.name === 'hop') y = Math.sin(k * Math.PI) * 0.3; else rz = Math.sin(k * Math.PI * 4) * 0.08; } }
      const g = st.grab ? Math.min(0.6, st.grab.amount) : 0;
      squash.scale.set(1 - st.sq.x + st.sq.y * 0.5, (1 - st.sq.y) * (1 + g * 0.5) * (st.sitting ? 0.9 : 1), 1);
      squash.position.y = y; squash.rotation.z = rz + (st.carried ? Math.sin(time * 3) * 0.08 : 0);
      const open = st.mouth >= 0 ? st.mouth : st.talk;
      mouth.scale.set(1 + open * 0.3, 0.2 + open * 1.4, 0.4);
    },
    setExpression(name) { st.expr = name; },
    play(action) { const d = DUR[action] || 0.6; st.act = { name: action, d }; st.actT = 0; st.lastPlayed = action; return d; },
    isBusy() { return !!st.act; },
    lookAt(p) { st.lookAt = p ? p.clone() : null; },
    setMouthOpen(t) { st.mouth = t; },
    setTalkLevel(l) { st.talk = l; },
    hitTest(raycaster) {
      const hit = raycaster.intersectObject(body, false)[0];
      if (!hit) return null;
      const local = object3d.worldToLocal(hit.point.clone());
      return { point: hit.point.clone(), local, region: local.y > 1.4 ? 'head' : local.y < 1.0 && local.z > 0.6 && Math.abs(local.x) < 0.3 ? 'mouth' : 'body' };
    },
    poke() { st.act = { name: 'poke', d: 0.25 }; st.actT = 0; },
    beginGrab(p) { const a = p.clone(); const g = { amount: 0, move(q) { g.amount = q.distanceTo(a) / 1.1; }, release() { const s = Math.min(1, g.amount); st.grab = null; return s; } }; st.grab = g; return g; },
    setSquish(x, y) { st.sq.x = x; st.sq.y = y; st.sqMax = Math.max(st.sqMax || 0, x, y); },
    setCarried(b) { st.carried = b; },
    setSitting(b) { st.sitting = b; },
    getMouthWorld(out) { return mouth.getWorldPosition(out); },
    getHeadTopWorld(out) { object3d.updateMatrixWorld(); return out.copy(object3d.localToWorld(v.set(0, 2.05, 0))); },
    dispose() { object3d.traverse((o) => { o.geometry?.dispose(); }); },
  };
}
