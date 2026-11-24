"""Owner 2026-11-24: graphics high / low setting for slow Android phones.

Checks the setting works (sheet radio, per-device storage, live switch, pet rebuilt
lighter, frame cap) and measures the same phone scene on both levels.
Chromium + SwiftShader (software GL): read the frame numbers as RELATIVE.
Phone emulation 390x844 at deviceScaleFactor 3 (a 1080p-class phone).

Run:  python3 -m http.server 8122   (repo root, another shell)
      python3 tests/visual/s8_graphics.py [three_dir]
Screenshots + numbers -> production/qa/evidence/s8-graphics-*.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s5_smoke as s
from playwright.sync_api import sync_playwright

s.THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
check = s.check
EVID = s.EVID
BASE = 'http://localhost:8122/index.html?debug'

MEASURE = """async (secs) => {
  const M = window.__moldablePet, r = M.stage.renderer, pet = M.getPet();
  const orig = r.render.bind(r), up = pet.update.bind(pet);
  let rMs = 0, uMs = 0, frames = 0, last = 0;
  const iv = [];
  r.render = (a, b) => { const t = performance.now(); orig(a, b); r.getContext().finish(); rMs += performance.now() - t; };
  pet.update = (a, b) => { const t = performance.now(); up(a, b); uMs += performance.now() - t; };
  M.stage.onAfterRender(() => { const t = performance.now(); if (last) iv.push(t - last); last = t; frames++; });
  // keep the pet squishing (the soft body is re-shaped every frame while it moves)
  const poke = setInterval(() => { const p = pet.object3d.position, V = p.constructor; pet.poke(new V(p.x + 0.2, p.y + 1.1, p.z + 0.6), 1); }, 300);
  await new Promise((res) => setTimeout(res, secs * 1000));
  clearInterval(poke); r.render = orig; pet.update = up;
  const sum = iv.reduce((a, b) => a + b, 0);
  const sz = { x: r.domElement.width, y: r.domElement.height };
  let verts = 0; pet.object3d.traverse((o) => { if (o.isMesh && o.geometry?.attributes?.position) verts += o.geometry.attributes.position.count; });
  let phys = 0, rich = 0; pet.object3d.traverse((o) => { const m = o.material; if (m?.isMeshPhysicalMaterial) { phys++; if (m.sheen > 0 || m.clearcoat > 0) rich++; } });
  return { fps: +(iv.length / (sum / 1000)).toFixed(1), frameMs: +(sum / iv.length).toFixed(1), renderMs: +(rMs / frames).toFixed(1), petUpdateMs: +(uMs / frames).toFixed(2),
    buffer: [sz.x, sz.y], pixels: sz.x * sz.y, petVerts: verts, physMaterials: phys, richMaterials: rich, dpr: r.getPixelRatio() };
}"""


def phone(pw, url, label, storage=None):
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, has_touch=True, is_mobile=True)
    ctx.add_init_script(s.STUB_SR)
    if storage:
        ctx.add_init_script(f"try {{ localStorage.setItem('mp-graphics', {json.dumps(storage)}); }} catch (e) {{}}")
    page = ctx.new_page()
    page.on('pageerror', lambda e: s.errors.append(f'{label} pageerror: {e}'))
    page.route('**/*', s.route)
    page.goto(url)
    page.wait_for_function('document.documentElement.dataset.boot', timeout=120000)
    s.wait(page, 'M && M.getPet()')
    page.evaluate("window.__moldablePet.selectCharacter('flower')")
    page.wait_for_timeout(2500)
    return b, page


def measure(page, secs=6):
    return page.evaluate(MEASURE, secs)


if __name__ == '__main__':
    os.makedirs(EVID, exist_ok=True)
    out = {}
    with sync_playwright() as pw:
        # 1. same scene on both levels (URL picks the level)
        for lv in ('high', 'low'):
            b, page = phone(pw, BASE + '&gfx=' + lv, lv)
            check(f'{lv}: boots on {lv}', page.evaluate('window.__moldablePet.gfx.level') == lv)
            out[lv] = measure(page)
            if lv == 'low':
                page_q_low = page.evaluate('window.__moldablePet.stage.quality')
            print('  ', lv, out[lv])
            page.screenshot(path=os.path.join(EVID, f's8-graphics-{lv}.png'), timeout=180000)
            b.close()
        h, l = out['high'], out['low']
        check('low draws fewer pixels', l['pixels'] < h['pixels'] * 0.5, f"{l['pixels']} vs {h['pixels']}")
        check('low pet has fewer vertices', l['petVerts'] < h['petVerts'] * 0.5, f"{l['petVerts']} vs {h['petVerts']}")
        check('low pet has no sheen / clear coat', l['richMaterials'] == 0 and h['richMaterials'] > 0, f"{l['richMaterials']} vs {h['richMaterials']}")
        check('low is not capped at 30 (frame rate is its own choice)', page_q_low['fps'] == 60, str(page_q_low))
        check('low renders a frame faster', l['renderMs'] < h['renderMs'], f"{l['renderMs']} vs {h['renderMs']} ms")

        # 2. the settings sheet switches live and the choice stays on this device
        b, page = phone(pw, BASE, 'sheet')
        check('tests boot on high (no guess under automation)', page.evaluate('window.__moldablePet.gfx.level') == 'high')
        page.click('.mp-gear'); page.wait_for_timeout(600)
        check('sheet shows high checked', page.get_attribute('.mp-set-seg[data-group="gfx"] .mp-seg-opt[data-v="high"]', 'aria-checked') == 'true')
        page.screenshot(path=os.path.join(EVID, 's8-graphics-sheet-high.png'), timeout=180000)
        v0 = page.evaluate('(() => { let n = 0; window.__moldablePet.getPet().object3d.traverse((o) => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; })()')
        check('sheet shows 60 FPS checked', page.get_attribute('.mp-set-seg[data-group="fps"] .mp-seg-opt[data-v="60"]', 'aria-checked') == 'true')
        page.click('.mp-set-seg[data-group="gfx"] .mp-seg-opt[data-v="low"]'); page.wait_for_timeout(1200)
        check('tap low: level low', page.evaluate('window.__moldablePet.gfx.level') == 'low')
        check('tap low: pixel ratio 1', page.evaluate('window.__moldablePet.stage.renderer.getPixelRatio()') == 1)
        v1 = page.evaluate('(() => { let n = 0; window.__moldablePet.getPet().object3d.traverse((o) => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; })()')
        check('tap low: pet rebuilt lighter', v1 < v0 * 0.5, f'{v1} vs {v0}')
        st = page.evaluate("localStorage.getItem('mp-graphics')")
        check('stored per device as a player choice', json.loads(st or '{}') == {'level': 'low', 'by': 'player', 'fps': 60}, st)
        check('not in the game save', 'graphics' not in (page.evaluate("localStorage.getItem('moldable-pet:v1')") or ''))
        check('hint follows the level', 'เบาลง' in page.inner_text('.mp-set-seg[data-group="gfx"] .mp-set-hint'))
        check('low keeps 60 fps', page.evaluate('window.__moldablePet.stage.quality.fps') == 60)
        page.click('.mp-set-seg[data-group="fps"] .mp-seg-opt[data-v="30"]'); page.wait_for_timeout(800)
        check('tap 30: frame cap 30', page.evaluate('window.__moldablePet.stage.quality.fps') == 30)
        check('tap 30: stored, level kept', json.loads(page.evaluate("localStorage.getItem('mp-graphics')") or '{}') == {'level': 'low', 'by': 'player', 'fps': 30})
        check('fps hint follows', 'แบต' in page.inner_text('.mp-set-seg[data-group="fps"] .mp-set-hint'))
        page.screenshot(path=os.path.join(EVID, 's8-graphics-sheet-low.png'), timeout=180000)
        m30 = measure(page, 4)
        check('30 FPS: at most ~30 frames a second', m30['fps'] <= 31.5, str(m30['fps']))
        page.keyboard.press('Escape'); page.wait_for_timeout(300)
        page.reload(); page.wait_for_function('document.documentElement.dataset.boot', timeout=120000)
        s.wait(page, 'M && M.getPet()')
        check('reopen: still low', page.evaluate('window.__moldablePet.gfx.level') == 'low')
        check('reopen: still 30 FPS', page.evaluate('window.__moldablePet.stage.quality.fps') == 30)
        page.evaluate("window.__moldablePet.setFps(60)")
        check('back to 60', page.evaluate('window.__moldablePet.stage.quality.fps') == 60)
        page.evaluate("window.__moldablePet.setGraphics('high', 'player')"); page.wait_for_timeout(1200)
        check('back to high: pet rich again', page.evaluate('(() => { let r = 0; window.__moldablePet.getPet().object3d.traverse((o) => { const m = o.material; if (m?.isMeshPhysicalMaterial && m.sheen > 0) r++; }); return r; })()') > 0)
        b.close()

        # 3. a weak phone left on the guess steps down by itself (swiftshader is slow enough)
        b, page = phone(pw, BASE, 'auto', storage=json.dumps({'level': 'high', 'by': 'auto'}))
        ok = s.wait(page, "M.gfx.level === 'low'", timeout=40000)
        check('slow first visit: steps down to low once', ok, page.evaluate('window.__moldablePet.gfx.level'))
        check('auto step-down is not stored as a player choice', json.loads(page.evaluate("localStorage.getItem('mp-graphics')") or '{}').get('by') == 'auto')
        b.close()
    with open(os.path.join(EVID, 's8-graphics.json'), 'w') as f:
        json.dump(out, f, indent=2)
    bad = [r for r in s.results if not r[1]]
    print(f'\n{len(s.results) - len(bad)} passed, {len(bad)} failed, {len(s.errors)} page errors')
    for e in s.errors[:12]:
        print('  ', e)
    sys.exit(1 if bad or s.errors else 0)
