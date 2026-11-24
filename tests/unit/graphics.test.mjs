// Graphics level rules (engine/graphics.js, owner 2026-11-24). Run: node tests/unit/graphics.test.mjs
import { test, assert, eq, done } from './_harness.mjs';
import { GRAPHICS_PRESETS, FPS_CHOICES, fpsChoice, frameDue, guessLevel, readGraphics, writeGraphics, bootLevel, isSlow, richMaterials } from '../../src/engine/graphics.js';

console.log('graphics');
test('low draws fewer pixels and lightens the pet; frame rate is not part of the level', () => {
  const h = GRAPHICS_PRESETS.high, l = GRAPHICS_PRESETS.low;
  assert(l.dprTouch < h.dprTouch && l.dprMouse < h.dprMouse, 'pixel ratio caps');
  assert(!('fps' in l) && !('fps' in h), 'no fps in the level (owner 2026-11-24: 60 on low too)');
  assert(l.petDetail > 0 && h.petDetail == null, 'low pet detail');
  eq(l.rich, false, 'low drops sheen + clear coat'); eq(h.rich, true, 'high keeps them');
});
test('guess: weak touch devices start on low, desktops on high', () => {
  eq(guessLevel({ coarse: true, deviceMemory: 2, hardwareConcurrency: 8 }), 'low', '2 GB phone');
  eq(guessLevel({ coarse: true, deviceMemory: 8, hardwareConcurrency: 4 }), 'low', '4 cores');
  eq(guessLevel({ coarse: true, deviceMemory: 8, hardwareConcurrency: 8 }), 'high', 'strong phone');
  eq(guessLevel({ coarse: true }), 'high', 'unknown (iOS reports neither memory nor a low core count)');
  eq(guessLevel({ coarse: false, deviceMemory: 2, hardwareConcurrency: 2 }), 'high', 'mouse');
});
test('frame rate: 60 default, 30 allowed, anything else → 60', () => {
  eq(FPS_CHOICES[0], 60, 'default 60');
  eq(fpsChoice(30), 30, '30'); eq(fpsChoice('30'), 30, 'string 30'); eq(fpsChoice(45), 60, '45 → 60'); eq(fpsChoice(undefined), 60, 'missing');
});
test('frame cap: even 60 / 30 on 60 Hz, 120 Hz and a slightly fast 60.5 Hz screen', () => {
  const run = (hz, fps, secs = 10, jitter = 0) => {
    let last = -1e9, drawn = 0, worstGap = 0, prev = null;
    for (let i = 0; i < hz * secs; i++) {
      const t = i * 1000 / hz + (i % 2 ? jitter : -jitter);
      if (frameDue(t, last, fps)) { if (prev != null) worstGap = Math.max(worstGap, t - prev); prev = t; last = t; drawn++; }
    }
    return { fps: drawn / secs, worstGap };
  };
  const near = (a, b) => Math.abs(a - b) <= 1;
  let r = run(60, 60); assert(near(r.fps, 60), `60 Hz cap 60 → ${r.fps}`);
  r = run(60, 60, 10, 1.5); assert(near(r.fps, 60), `60 Hz cap 60 with jitter → ${r.fps}`);
  r = run(60.5, 60); assert(near(r.fps, 60.5) && r.worstGap < 20, `60.5 Hz never drops a frame → ${r.fps}, gap ${r.worstGap}`);
  r = run(60, 30); assert(near(r.fps, 30) && r.worstGap < 40, `60 Hz cap 30 → ${r.fps}`);
  r = run(120, 60); assert(near(r.fps, 60) && r.worstGap < 20, `120 Hz cap 60 → ${r.fps}`);
  r = run(120, 30); assert(near(r.fps, 30), `120 Hz cap 30 → ${r.fps}`);
  eq(run(120, 0).fps, 120, 'no cap draws every refresh');
});
test('saved level: round trip, bad values ignored', () => {
  const r = readGraphics(writeGraphics('low', 'player', 30));
  eq(r.level, 'low', 'level'); eq(r.by, 'player', 'by'); eq(r.fps, 30, 'fps');
  eq(readGraphics(writeGraphics('low', 'player')).fps, 60, 'fps default 60');
  eq(readGraphics('{"level":"low","by":"player"}').fps, 60, 'saved before the fps choice → 60');
  eq(readGraphics('low').level, 'low', 'bare value');
  eq(readGraphics('low').by, 'auto', 'bare value is not a player choice');
  eq(readGraphics(null), null, 'nothing'); eq(readGraphics('{"level":"ultra"}'), null, 'unknown level'); eq(readGraphics('{bad'), null, 'broken json');
});
test('boot: url > saved > automation default > device guess', () => {
  const weak = { coarse: true, deviceMemory: 2 };
  eq(bootLevel({ param: 'low', saved: { level: 'high', by: 'player' } }).level, 'low', 'url wins');
  eq(bootLevel({ saved: { level: 'high', by: 'player' }, device: weak }).level, 'high', 'player choice beats the guess');
  eq(bootLevel({ device: weak, automated: true }).level, 'high', 'tests keep high');
  const g = bootLevel({ device: weak });
  eq(g.level, 'low', 'guess'); eq(g.by, 'guess', 'marked as a guess');
  eq(bootLevel({ param: 'ultra', device: weak }).level, 'low', 'bad url value ignored');
  eq(bootLevel({ device: weak }).fps, 60, 'guess boots at 60 fps, also on low');
  eq(bootLevel({ saved: { level: 'high', by: 'auto', fps: 30 } }).fps, 30, 'saved 30 kept');
});
test('slow: under the fps floor only after a full window', () => {
  const frames = (ms, secs) => Array.from({ length: Math.ceil(secs * 1000 / ms) }, () => ms);
  eq(isSlow(frames(50, 4)), true, '20 fps for 4 s');
  eq(isSlow(frames(33.4, 4)), false, '30 fps (battery saver) is fine');
  eq(isSlow(frames(50, 2)), false, 'window not full yet');
  eq(isSlow([]), false, 'no frames');
});
test('rich materials: off on low, back to their own values on high, physical only', () => {
  const phys = { isMeshPhysicalMaterial: true, sheen: 0.8, clearcoat: 0.18, userData: {} };
  const std = { isMeshStandardMaterial: true, sheen: 0.5, userData: {} };
  const root = { traverse(fn) { [{ material: phys }, { material: [phys, std] }, {}].forEach(fn); } };
  eq(richMaterials(root, false), 1, 'shared material changed once');
  eq(phys.sheen, 0, 'sheen off'); eq(phys.clearcoat, 0, 'clear coat off'); eq(std.sheen, 0.5, 'standard untouched');
  eq(richMaterials(root, false), 0, 'idempotent');
  eq(richMaterials(root, true), 1, 'restore');
  eq(phys.sheen, 0.8, 'sheen back'); eq(phys.clearcoat, 0.18, 'clear coat back');
});
done();
