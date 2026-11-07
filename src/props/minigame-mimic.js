/**
 * minigame-mimic.js — the small stage for "จำท่าทาง" (`mimic`,
 * design/gdd/minigames-2.md 3.2) (owner: prop). Re-exported by ./minigame.js.
 *
 * The pads are HUD (glaze); on stage the pet stands on a round clay podium under
 * a soft spotlight whose colour follows the pose being shown, so the colour cue
 * is also in the scene. Colour is never the only cue: the pad shape, face and
 * note carry the same information (GDD 3.5).
 *
 * | Part | Size | Origin | Draw calls |
 * |---|---|---|---|
 * | podium | `radius` (default 1.15) × 0.22 tall | top centre (pet stands at y = 0) | 1 (themed clay) |
 * | light pool | 0.9 × radius, on the podium top | — | 1 |
 * | beam (optional) | 3.2 tall cone above the podium | — | 1 |
 *
 * Themed: call `applyMinigameTheme(object3d, theme)`.
 *
 * @example
 *   const stage = createMimicStage(); scene.add(stage.object3d);
 *   stage.setGlow('wink');   // pose id or colour id; null = warm neutral
 *   // per frame: stage.update(dt);   // eases the light colour (no hard flashes)
 */
import * as THREE from 'three';
import { ClayBuilder, puck, torus, puffyStar, gradientY, getShadowTexture } from './clay.js';

/**
 * Pose colours (ids match `minigames.json → mimic.poses[].color`), plus a lookup
 * from pose id so `setGlow` accepts either.
 */
export const MIMIC_COLORS = Object.freeze({
  pink: '#F6B8CF', lilac: '#D6BEEA', sky: '#B2D3EF', lavender: '#C3C8EE', peach: '#F8CBB0', butter: '#F7E3A0',
});
const POSE_COLOR = { smile: 'pink', surprised: 'lilac', wink: 'sky', sleepy: 'lavender', shy: 'peach', joy: 'butter' };
const NEUTRAL = '#FFF4E2';

const COL = { top: '#EEE9F8', side: '#CFC8EA', sideLow: '#BDB5E0', rim: '#F6E6BE', star: '#FBEFC8' };
/** Evening tints (explicit: the automatic evening map is too heavy on a large lit disc). */
const EVE = { top: '#9A93CC', side: '#7871B3', sideLow: '#625C9D', rim: '#D3C394', star: '#E3D7AC' };

const BEAM_VERT = /* glsl */`
varying vec2 vUv;
varying float vF;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vF = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uStrength;
varying vec2 vUv;
varying float vF;
void main() {
  float a = uStrength * pow(1.0 - vUv.y, 1.4) * pow(vF, 1.6);
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Round clay podium + soft spotlight for the mimic game.
 * @param {{radius?: number, beam?: boolean}} [o]  `beam` (default true) draws the soft cone
 * @returns {{object3d: THREE.Group, setGlow: (idOrNull: string|null) => void, update: (dt: number) => void, dispose: () => void}}
 */
export function createMimicStage(o = {}) {
  const r = o.radius ?? 1.15, h = 0.22;
  const group = new THREE.Group();
  group.name = 'minigame:mimic-stage';

  const b = new ClayBuilder({ themed: true });
  b.add(puck(r, h, 48), gradientY(COL.sideLow, COL.side, 0, h * 0.8), { position: [0, -h, 0], shade: 0.08, night: gradientY(EVE.sideLow, EVE.side, 0, h * 0.8) });
  b.add(puck(r * 0.93, 0.03, 48), COL.top, { position: [0, -0.028, 0], shade: 0, night: EVE.top });
  b.add(torus(r * 0.965, 0.022, 8, 64), COL.rim, { rotation: [Math.PI / 2, 0, 0], position: [0, -0.012, 0], shade: 0.02, night: EVE.rim });
  for (let i = 0; i < 5; i++) {                       // little stars pressed into the front of the podium
    const a = Math.PI / 2 + (i - 2) * 0.42;
    b.add(puffyStar(0.045, 0.4), COL.star, { position: [Math.cos(a) * (r + 0.004), -h * 0.5, Math.sin(a) * (r + 0.004)], rotation: [0, Math.PI / 2 - a, 0], shade: 0, night: EVE.star });
  }
  const podium = b.buildMesh('mimic:podium');
  group.add(podium);

  const color = new THREE.Color(NEUTRAL), target = new THREE.Color(NEUTRAL);
  const poolGeo = new THREE.PlaneGeometry(r * 1.8, r * 1.8); poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({ map: getShadowTexture(), color, transparent: true, opacity: 0.7, depthWrite: false });
  poolMat.userData.theme = { light: { opacity: 0.7 }, dark: { opacity: 0.85 } };
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.name = 'mimic:pool'; pool.position.y = 0.006; pool.renderOrder = 1;
  group.add(pool);

  let beam = null, beamMat = null;
  if (o.beam !== false) {
    const bg = new THREE.CylinderGeometry(r * 0.3, r * 0.82, 3.2, 32, 1, true);
    bg.translate(0, 1.6, 0);
    beamMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color }, uStrength: { value: 0.16 } },
      vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false,
    });
    beamMat.userData.theme = {};
    beam = new THREE.Mesh(bg, beamMat);
    beam.name = 'mimic:beam'; beam.renderOrder = 3;
    beam.userData.beamStrength = { light: 0.16, dark: 0.22 };
    group.add(beam);
  }
  group.userData.minigameItem = 'mimicStage';
  group.userData.onTheme = (t) => { if (beamMat) beamMat.uniforms.uStrength.value = beam.userData.beamStrength[t]; };

  return {
    object3d: group,
    setGlow(id) {
      const key = id ? (MIMIC_COLORS[id] ? id : POSE_COLOR[id]) : null;
      target.set(key ? MIMIC_COLORS[key] : NEUTRAL);
    },
    update(dt) {
      // ~0.12 s ease toward the target: soft, never a hard flash (GDD 3.5: < 3 flashes / s)
      color.lerp(target, 1 - Math.exp(-Math.min(dt, 0.1) * 18));
      poolMat.color.copy(color);
    },
    dispose() {
      podium.geometry.dispose(); poolGeo.dispose(); poolMat.dispose();
      if (beam) { beam.geometry.dispose(); beamMat.dispose(); }
      group.removeFromParent();
    },
  };
}
