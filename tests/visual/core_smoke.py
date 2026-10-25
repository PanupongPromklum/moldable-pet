"""S1-06 core smoke test on the stub page (tests/visual/core-with-stubs.html).

Run:  python3 -m http.server 8105   (from the repo root, in another shell)
      python3 tests/visual/core_smoke.py [three_dir]
three_dir defaults to /tmp/claude-0/npm/node_modules/three (jsDelivr is routed there).
Screenshots go to production/qa/evidence/. Exit code 1 on any failed check or page error.
"""
import os, sys, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
URL = 'http://localhost:8105/tests/visual/core-with-stubs.html?debug'
EVID = os.path.join(ROOT, 'production', 'qa', 'evidence')
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
results, errors = [], []


def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('  ok   ' if ok else '  FAIL ') + name + (f'  [{info}]' if info else ''))


def route(r):
    url = r.request.url
    if url.startswith(CDN):
        path = os.path.join(THREE, url[len(CDN):].split('?')[0])
        if os.path.isfile(path):
            return r.fulfill(path=path, content_type='application/javascript')
        return r.fulfill(status=404, body='')
    if url.startswith('http://localhost'):
        return r.continue_()
    return r.abort()


JS_PT = """([type, id, x, y, kind]) => {
  const target = type === 'pointerdown' ? (document.elementFromPoint(x, y) || document.getElementById('gl')) : window;
  target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: kind, clientX: x, clientY: y, isPrimary: id === 1 || id === 11, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
}"""


def pt(page, type_, pid, x, y, kind='touch'):
    page.evaluate(JS_PT, [type_, pid, x, y, kind])


def drag(page, pid, a, b, steps=8, kind='touch', dwell=0.016):
    pt(page, 'pointerdown', pid, *a, kind)
    for i in range(1, steps + 1):
        time.sleep(dwell)
        pt(page, 'pointermove', pid, a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps, kind)
    pt(page, 'pointerup', pid, *b, kind)


def S(page, expr):
    return page.evaluate(f'() => {{ const M = window.__moldablePet; return {expr}; }}')


def screen_of(page, xyz):
    return page.evaluate("""([x, y, z]) => { const M = window.__moldablePet; const o = {x:0,y:0};
      const v = M.getPet().object3d.position.clone().set(x, y, z); M.stage.worldToScreen(v, o); return [o.x, o.y]; }""", xyz)


def pet_xy(page, dy=1.0):
    p = S(page, '(() => { const p = M.getPet().object3d.position; return [p.x, p.y, p.z]; })()')
    return screen_of(page, [p[0], p[1] + dy, p[2] + 0.9])


def wait(page, expr, timeout=15000):
    """Wait for a JS condition (M = window.__moldablePet). SwiftShader runs ~3-4 fps, so animations are slow."""
    try:
        page.wait_for_function(f'() => {{ const M = window.__moldablePet; return !!({expr}); }}', timeout=timeout)
        return True
    except Exception:
        return False


def boot(page):
    page.goto(URL)
    page.wait_for_function("document.documentElement.dataset.boot", timeout=30000)
    check('boot ok', page.evaluate("document.documentElement.dataset.boot") == 'ok')
    time.sleep(0.6)


def phone(pw):
    print('phone 390x844 (touch)')
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('phone pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('phone console: ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.route('**/*', route)
    boot(page)
    check('first run shows select', page.locator('[data-sel].on').count() == 1)
    check('locked pill disabled', page.locator('[data-char="pill"][disabled]').count() == 1)
    page.click('[data-char="flower"]')
    time.sleep(0.3)
    check('selected flower, select closed', S(page, 'M.game.selected') == 'flower' and page.locator('[data-sel].on').count() == 0)
    check('no horizontal scroll', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))

    x, y = pet_xy(page)
    check('pet centred between HUD bands', 120 < y < 844 - 160 and abs(x - 195) < 5, f'{x:.0f},{y:.0f}')
    head = pet_xy(page, 2.05)
    feet = pet_xy(page, 0)
    check('pet height share of screen', 0.25 < (feet[1] - head[1]) / 844 < 0.5, f'{(feet[1] - head[1]) / 844:.2f}')

    S(page, 'window.__sfxStub.log.length = 0')
    page.touchscreen.tap(x, y)
    time.sleep(0.25)
    check('tap pet = poke (pop sfx)', 'pop' in S(page, 'window.__sfxStub.log'))

    fun0 = S(page, 'M.game.needs().fun')
    pt(page, 'pointerdown', 5, x, y)
    for i in range(1, 16):
        time.sleep(0.03); pt(page, 'pointermove', 5, x + i * 6, y - i * 4)
    stretching = S(page, "M.getPet().state.grab !== null")
    time.sleep(0.4)
    pt(page, 'pointerup', 5, x + 90, y - 60)
    check('drag pet = stretch (grab active, fun up)', stretching and S(page, 'M.game.needs().fun') > fun0, f'fun {fun0:.4f}->{S(page, "M.game.needs().fun"):.4f}')

    pt(page, 'pointerdown', 6, x, y)
    time.sleep(0.75)
    carrying = S(page, 'M.care.carrying')
    pt(page, 'pointermove', 6, x + 40, y - 60)
    time.sleep(0.2)
    pt(page, 'pointerup', 6, x + 40, y - 60)
    check('long-press 0.5 s = carry', carrying)
    check('drop elsewhere hops home', wait(page, 'Math.abs(M.getPet().object3d.position.x) < 0.01 && !M.care.carrying'))

    # two-finger pinch squish
    pt(page, 'pointerdown', 7, x - 80, y); pt(page, 'pointerdown', 8, x + 80, y)
    for i in range(1, 8):
        time.sleep(0.03); pt(page, 'pointermove', 7, x - 80 + i * 8, y); pt(page, 'pointermove', 8, x + 80 - i * 8, y)
    sq = S(page, 'M.getPet().state.sq.y')
    pt(page, 'pointerup', 7, x - 24, y); pt(page, 'pointerup', 8, x + 24, y)
    check('two-finger pinch = squish', sq > 0.1, f'{sq:.2f}')

    # petting: start on empty space, rub back and forth above the head
    hx, hy = pet_xy(page, 1.9)
    soc0 = S(page, 'M.game.needs().social')
    pt(page, 'pointerdown', 9, 20, hy)
    for i in range(40):
        time.sleep(0.02)
        pt(page, 'pointermove', 9, hx + (60 if i % 6 < 3 else -60), hy)
    pt(page, 'pointerup', 9, hx, hy)
    check('rub above head = pet (social up)', S(page, 'M.game.needs().social') > soc0, f'{soc0:.3f}->{S(page, "M.game.needs().social"):.3f}')

    # swipe on empty space → next room
    time.sleep(1.0)
    # one in-page burst: a real swipe takes ~0.2 s, but each Playwright call waits on the slow (SwiftShader) main thread
    page.evaluate("""() => { const fire = (type, x) => (type === 'pointerdown' ? document.getElementById('gl') : window).dispatchEvent(
      new PointerEvent(type, { pointerId: 10, pointerType: 'touch', clientX: x, clientY: 600, bubbles: true, cancelable: true, buttons: 1 }));
      fire('pointerdown', 360); for (let i = 1; i <= 6; i++) fire('pointermove', 360 - 50 * i); fire('pointerup', 60); }""")
    check('swipe on empty = next room', wait(page, "M.rooms.id === 'kitchen' && !M.rooms.moving"), S(page, 'M.rooms.id'))

    # feeding
    S(page, "(M.game.needs().hunger = 0.4, 0)")
    time.sleep(1.6)
    btn = page.locator('[data-food="cupcake"]').bounding_box()
    fx, fy = btn['x'] + btn['width'] / 2, btn['y'] + btn['height'] / 2
    mx, my = S(page, "(() => { const v = M.getPet().object3d.position.clone(); M.getPet().getMouthWorld(v); const o={x:0,y:0}; M.stage.worldToScreen(v, o); return [o.x, o.y]; })()")
    pt(page, 'pointerdown', 11, fx, fy)
    for i in range(1, 11):
        time.sleep(0.03); pt(page, 'pointermove', 11, fx + (mx - fx) * i / 10, fy + (my - fy) * i / 10)
    mouth_open = S(page, 'M.getPet().state.mouth')
    page.screenshot(path=os.path.join(EVID, 's1-06-core-phone-feeding.png'))
    pt(page, 'pointerup', 11, mx, my)
    wait(page, 'M.game.needs().hunger > 0.5', 8000)
    h1 = S(page, 'M.game.needs().hunger')
    check('food near mouth opens it', mouth_open > 0.5, f'{mouth_open:.2f}')
    check('drop in mouth = eat (hunger 0.4 → ~0.55)', 0.53 < h1 < 0.57, f'{h1:.3f}')

    # toilet
    page.evaluate("() => window.__moldablePet.rooms.go('bathroom')")
    wait(page, '!M.rooms.moving')
    S(page, "(M.game.needs().toilet = 0.2, 0)")
    x, y = pet_xy(page)
    tx, ty = screen_of(page, S(page, "(() => { const p = M.rooms.room.dropZones.toilet.position; return [p.x, p.y, p.z]; })()"))
    pt(page, 'pointerdown', 12, x, y)
    time.sleep(0.7)
    for i in range(1, 9):
        time.sleep(0.03); pt(page, 'pointermove', 12, x + (tx - x) * i / 8, y + (ty - y) * i / 8)
    time.sleep(0.3)
    pt(page, 'pointerup', 12, tx, ty)
    time.sleep(0.3)
    check('carry onto toilet = sit + flush button', S(page, 'M.care.sitting') and S(page, 'M.hud.last.flush') is True)
    page.screenshot(path=os.path.join(EVID, 's1-06-core-phone-toilet.png'))
    page.click('.flush')
    time.sleep(0.3)
    check('flush → toilet = 1', S(page, 'M.game.needs().toilet') > 0.999, f"{S(page, 'M.game.needs().toilet'):.5f}")
    check('stands up after flush', wait(page, '!M.care.sitting && Math.abs(M.getPet().object3d.position.x) < 0.01'))

    page.evaluate("() => window.__moldablePet.rooms.go('living')")
    wait(page, '!M.rooms.moving')
    time.sleep(0.5)
    page.screenshot(path=os.path.join(EVID, 's1-06-core-phone.png'))

    # mic (stub talkback) and save round trip
    page.click('[data-a="mic"]')
    time.sleep(0.3)
    check('mic → talkback listening', S(page, 'M.hud.last.mic') == 'listening')
    page.click('[data-a="mic"]')
    S(page, 'M.game.persist()')
    saved = page.evaluate("JSON.parse(localStorage.getItem('moldable-pet:v1'))")
    check('save v1 with per-character needs', saved['version'] == 1 and len(saved['chars']) == 6 and saved['selected'] == 'flower')
    page.reload()
    page.wait_for_function("document.documentElement.dataset.boot")
    time.sleep(0.4)
    check('reload keeps selection, no select screen', S(page, 'M.game.selected') == 'flower' and page.locator('[data-sel].on').count() == 0)

    # return after absence: pretend the last tick was 3 h ago
    page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('moldable-pet:v1'));
      for (const k in s.chars) s.chars[k].tLast -= 3 * 3600e3; localStorage.setItem('moldable-pet:v1', JSON.stringify(s)); }""")
    page.evaluate("() => { window.__moldablePet.game.persist = () => true; }")  # keep the edited save for the reload
    page.reload()
    page.wait_for_function("document.documentElement.dataset.boot")
    time.sleep(0.5)
    n = S(page, 'M.game.needs()')
    check('offline catch-up floors social at 0.15 (then online decay)', 0.149 < n['social'] <= 0.15, json.dumps(n))
    said = S(page, 'M.hud.last.say')
    lines = S(page, "[...M.data.personas.flower.lines.back, ...M.data.personas.flower.lines.lonely, ...M.data.personas.flower.lines.sleepy]")
    check('return reaction line shown', said in lines, said)
    b.close()


def desktop(pw):
    print('desktop 1280x800 (mouse)')
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('desktop pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('desktop console: ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.route('**/*', route)
    boot(page)
    page.click('[data-char="cloud"]')
    time.sleep(0.3)
    x, y = pet_xy(page)
    check('desktop pet centred', abs(x - 640) < 5 and 120 < y < 640, f'{x:.0f},{y:.0f}')
    S(page, 'window.__sfxStub.log.length = 0')
    page.mouse.click(x, y)
    time.sleep(0.2)
    check('click = poke', 'pop' in S(page, 'window.__sfxStub.log'))
    page.mouse.move(x, y); page.mouse.down()
    for i in range(1, 12):
        page.mouse.move(x + i * 8, y + i * 3); time.sleep(0.02)
    grab = S(page, 'M.getPet().state.grab !== null')
    page.mouse.up()
    check('mouse drag = stretch', grab)
    page.mouse.move(x, y)
    S(page, 'M.getPet().state.sqMax = 0')
    for _ in range(6):
        page.mouse.wheel(0, 60); time.sleep(0.03)
    check('wheel on pet = squish', wait(page, 'M.getPet().state.sqMax > 0.1'), f'{S(page, "M.getPet().state.sqMax"):.2f}')
    page.keyboard.press('ArrowRight')
    check('→ key = next room', wait(page, "M.rooms.id === 'kitchen' && !M.rooms.moving"))
    page.keyboard.press('ArrowLeft')
    wait(page, "M.rooms.id === 'living' && !M.rooms.moving")
    time.sleep(0.5)
    page.screenshot(path=os.path.join(EVID, 's1-06-core-desktop.png'))
    b.close()


if __name__ == '__main__':
    os.makedirs(EVID, exist_ok=True)
    with sync_playwright() as pw:
        phone(pw)
        desktop(pw)
    for e in errors:
        print('  ERR  ' + e)
    bad = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(bad)} passed, {len(bad)} failed, {len(errors)} page errors')
    sys.exit(1 if bad or errors else 0)
