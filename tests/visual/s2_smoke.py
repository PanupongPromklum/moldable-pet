"""S2-11 smoke test on the live entry (index.html?debug): theme, character chip,
wardrobe buy/equip, Snack Rain round (keys + mouse/touch + simulated hand),
toilet one-control flow, camera-hidden soft hands. Phone 390x844 and desktop
1280x800, light and dark.

Run:  python3 -m http.server 8115   (from the repo root, in another shell)
      python3 tests/visual/s2_smoke.py [three_dir]
Screenshots: production/qa/evidence/s2-11-*.png. Exit 1 on a failed check or page error.
"""
import os, sys, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
URL = 'http://localhost:8115/index.html?debug'
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


def S(page, expr):
    return page.evaluate(f'() => {{ const M = window.__moldablePet; return {expr}; }}')


def wait(page, expr, timeout=20000):
    try:
        page.wait_for_function(f'() => {{ const M = window.__moldablePet; return !!({expr}); }}', timeout=timeout)
        return True
    except Exception:
        return False


def pick(page, key):
    page.click(f'.mp-card[data-key="{key}"]')
    time.sleep(0.2)
    page.click('.mp-select-go')
    time.sleep(0.4)


def shot(page, name):
    page.screenshot(path=os.path.join(EVID, f's2-11-{name}.png'))


def visible_count(page, text):
    return page.evaluate("""(t) => [...document.querySelectorAll('#hud *')].filter((e) => {
      if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(t))) return false;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
      for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || a.hidden) return false; }
      return true; }).length""", text)


JS_PT = """([type, id, x, y, kind]) => {
  const target = type === 'pointerdown' ? (document.elementFromPoint(x, y) || document.getElementById('gl')) : window;
  target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: kind, clientX: x, clientY: y, isPrimary: true, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
}"""


def pt(page, type_, pid, x, y, kind='touch'):
    page.evaluate(JS_PT, [type_, pid, x, y, kind])


def screen_of(page, xyz):
    return page.evaluate("""([x, y, z]) => { const M = window.__moldablePet; const o = {x:0,y:0};
      const v = M.getPet().object3d.position.clone().set(x, y, z); M.stage.worldToScreen(v, o); return [o.x, o.y]; }""", xyz)


def pet_xy(page, dy=1.0):
    p = S(page, '(() => { const p = M.getPet().object3d.position; return [p.x, p.y, p.z]; })()')
    return screen_of(page, [p[0], p[1] + dy, p[2] + 0.9])


# open palm, normalized video coords (wrist low, fingers up), centred at cx
def palm(cx, cy=0.62, s=0.11):
    pts = [(0, 0.9), (-0.45, 0.65), (-0.75, 0.35), (-0.95, 0.1), (-1.1, -0.1),
           (-0.4, 0.0), (-0.45, -0.45), (-0.48, -0.75), (-0.5, -1.0),
           (0, -0.05), (0, -0.55), (0, -0.9), (0, -1.15),
           (0.38, 0.0), (0.42, -0.45), (0.45, -0.75), (0.47, -0.98),
           (0.72, 0.1), (0.8, -0.25), (0.85, -0.5), (0.88, -0.7)]
    return [{'x': cx + x * s, 'y': cy + y * s} for x, y in pts]


def run(pw, label, viewport, touch, scheme):
    print(f'{label} {viewport["width"]}x{viewport["height"]} {scheme}')
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport=viewport, device_scale_factor=1, has_touch=touch, is_mobile=touch, color_scheme=scheme)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{label}/{scheme} pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'{label}/{scheme} console: {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.route('**/*', route)
    page.goto(URL)
    page.wait_for_function("document.documentElement.dataset.boot", timeout=40000)
    check('boot ok', page.evaluate("document.documentElement.dataset.boot") == 'ok')
    check('theme follows prefers-color-scheme', page.evaluate("document.documentElement.dataset.theme") == scheme)
    check('color-scheme meta = light dark', page.evaluate("document.querySelector('meta[name=color-scheme]').content") == 'light dark')
    check('room themed', S(page, 'M.rooms.room.theme') == scheme)
    check('save v2 with starters owned', S(page, 'M.game.save.version') == 2 and set(S(page, 'M.game.owned')) >= {'hat-beanie', 'glasses-round', 'tie-neck'})
    time.sleep(0.5)
    pick(page, 'flower')
    check('select → flower', S(page, 'M.game.selected') == 'flower')
    check('no settings gear', page.locator('.mp-gear').count() == 0)
    check('no horizontal scroll', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))

    # character chip opens select
    page.click('.mp-who')
    time.sleep(0.3)
    check('chip opens character select', page.locator('.mp-select:not([hidden])').count() == 1)
    pick(page, 'cloud')
    check('chip select → cloud', S(page, 'M.game.selected') == 'cloud' and page.locator('.mp-select:not([hidden])').count() == 0)
    shot(page, f'{label}-{scheme}-living')

    # wardrobe: equip a starter, buy one with coins, fail one without
    S(page, '(M.game.addCoins(200 - M.game.coins), M.hud.setCoins(M.game.coins), 0)')
    page.click('.mp-ward-btn')
    time.sleep(0.4)
    check('wardrobe opens', page.locator('.mp-ward:not([hidden])').count() == 1)
    page.click('.mp-item[data-id="hat-beanie"]')
    time.sleep(0.3)
    check('equip starter beanie (cloud)', S(page, 'M.game.outfit().head') == 'hat-beanie')
    clay_ok = S(page, "typeof M.getPet().getOutfit === 'function'")
    if clay_ok:
        check('pet.getOutfit matches', S(page, 'M.getPet().getOutfit().head') == 'hat-beanie')
    page.click('.mp-ward-tab[data-slot="body"]')
    time.sleep(0.2)
    page.click('.mp-item[data-id="scarf"]')
    time.sleep(0.2)
    page.click('.mp-buy-yes')
    time.sleep(0.4)
    check('buy scarf 150: coins 200 → 50, owned, worn', S(page, 'M.game.coins') == 50 and 'scarf' in S(page, 'M.game.owned') and S(page, 'M.game.outfit().body') == 'scarf',
          f"coins {S(page, 'M.game.coins')} body {S(page, 'M.game.outfit().body')}")
    r = S(page, "M.buy('crown-flower')")
    check('cannot buy crown 350 with 50 coins', r is False and S(page, 'M.game.coins') == 50 and 'crown-flower' not in S(page, 'M.game.owned'))
    shot(page, f'{label}-{scheme}-wardrobe')
    page.click('.mp-ward-x')
    time.sleep(0.3)
    S(page, 'M.game.persist()')
    saved = page.evaluate("JSON.parse(localStorage.getItem('moldable-pet:v1'))")
    check('outfit saved per character', saved['chars']['cloud']['outfit'] == {'head': 'hat-beanie', 'eyes': None, 'body': 'scarf'} and saved['chars']['flower']['outfit']['body'] is None)

    # Snack Rain: short round for the slow software renderer
    S(page, '(M.snackCfg.durationSec = 7, 0)')
    coins0 = S(page, 'M.game.coins')
    page.click('.mp-ctx[data-ctx="play"]')
    check('minigame starts, gestures off', wait(page, "M.minigame.active && M.minigame.phase === 'countdown'", 5000) and page.locator('#app.minigame').count() == 1)
    check('countdown → play (HUD promise)', wait(page, "M.minigame.phase === 'play'", 15000))
    x0 = S(page, 'M.minigame.state.petX')
    page.keyboard.down('ArrowRight'); time.sleep(1.2); page.keyboard.up('ArrowRight')
    x1 = S(page, 'M.minigame.state.petX')
    check('→ key moves the pet right (room unchanged)', x1 > x0 + 0.2 and S(page, 'M.rooms.id') == 'living', f'{x0:.2f}->{x1:.2f}')
    half = S(page, 'M.minigame.state.area.petHalfRange')
    page.keyboard.down('ArrowRight'); time.sleep(2.5); page.keyboard.up('ArrowRight')
    check('pet clamped on screen', S(page, 'M.minigame.state.petX') <= half + 1e-6, f"{S(page, 'M.minigame.state.petX'):.2f} <= {half:.2f}")
    # pointer / mouse anywhere → target x
    W, H = viewport['width'], viewport['height']
    if touch:
        pt(page, 'pointerdown', 21, W * 0.2, H * 0.6); pt(page, 'pointermove', 21, W * 0.25, H * 0.6); pt(page, 'pointerup', 21, W * 0.25, H * 0.6)
    else:
        page.mouse.move(W * 0.25, H * 0.6); page.mouse.move(W * 0.24, H * 0.62)
    time.sleep(0.3)
    check('touch/mouse sets target x (left)', S(page, 'M.minigame.state.targetX') < 0 and S(page, "M.minigame.state.source") == 'pointer', f"{S(page, 'M.minigame.state.targetX'):.2f}")
    check('normal gestures off during the round', S(page, 'M.gestures.active.filter((a) => !a.includes(":hover")).length') == 0)
    shot(page, f'{label}-{scheme}-snackrain')
    # paused while hidden: timeLeft must not move
    S(page, "(M.minigame.setPaused(true, 'tab'), 0)")
    e0 = S(page, 'M.minigame.state.elapsed'); time.sleep(1.0); e1 = S(page, 'M.minigame.state.elapsed')
    check('pause stops the round clock', e1 == e0, f'{e0:.2f} {e1:.2f}')
    S(page, "(M.minigame.setPaused(false, 'tab'), 0)")
    check('resume countdown → play', wait(page, "M.minigame.phase === 'play'", 15000))
    check('round ends → result', wait(page, "M.minigame.phase === 'result'", 90000))
    res = S(page, 'M.minigame.lastResult')
    time.sleep(0.5)
    check('coins added (≥ min 5) and best saved', S(page, 'M.game.coins') == coins0 + res['coins'] and res['coins'] >= 5 and S(page, 'M.game.best().snackRain') == res['best'], json.dumps(res))
    check('result card shown', page.locator('.mp-result:not([hidden])').count() == 1)
    shot(page, f'{label}-{scheme}-result')
    page.click('.mp-result-back')
    check('exit → pet back at petSpot, normal HUD', wait(page, "!M.minigame.active && Math.abs(M.getPet().object3d.position.x - M.rooms.room.petSpot.x) < 1e-3", 15000) and page.locator('#app.minigame').count() == 0)

    # hand x drives the pet (simulated landmarks)
    S(page, '(M.snackCfg.durationSec = 30, M.startMinigame(), 0)')
    wait(page, "M.minigame.phase === 'play'", 15000)
    page.evaluate("(L) => window.__moldablePet.hands.debugFeed([L])", palm(0.2))   # mirrored: video x 0.2 → screen right
    time.sleep(0.5)
    check('hand x drives the pet', S(page, 'M.minigame.state.source') == 'hand' and S(page, 'M.minigame.state.targetX') > 0, f"{S(page, 'M.minigame.state.targetX'):.2f}")
    page.evaluate("() => window.__moldablePet.hands.debugFeed(null)")
    page.keyboard.press('Escape')
    check('Esc leaves the round', wait(page, '!M.minigame.active', 15000))

    # camera hidden: soft hands over the normal room
    page.evaluate("(L) => window.__moldablePet.hands.debugFeed([L])", palm(0.62, 0.55, 0.13))
    S(page, '(M.hands.setView(true), 0)')
    page.evaluate("(L) => window.__moldablePet.hands.debugFeed([L])", palm(0.62, 0.55, 0.13))
    time.sleep(0.5)
    check('camera hidden: class + room visible + saved', page.locator('#app.ar.cam-hidden').count() == 1 and S(page, 'M.rooms.room.group.visible') and S(page, 'M.game.settings.cameraHidden') is True)
    shot(page, f'{label}-{scheme}-softhands')
    S(page, '(M.hands.setView(false), 0)')
    page.evaluate("() => window.__moldablePet.hands.debugFeed(null)")

    # toilet: coach only when low and not sitting; one flush button while sitting
    S(page, "M.rooms.go('bathroom')")
    wait(page, "!M.rooms.moving && M.rooms.id === 'bathroom'")
    S(page, "(M.game.needs().toilet = 0.2, 0)")
    time.sleep(0.6)
    check('before sitting: one coach, no flush button', visible_count(page, 'ลากตัวไปที่ชักโครก') == 1 and visible_count(page, 'กดชักโครก') == 0,
          f"coach {visible_count(page, 'ลากตัวไปที่ชักโครก')} btn {visible_count(page, 'กดชักโครก')}")
    x, y = pet_xy(page)
    tx, ty = screen_of(page, S(page, "(() => { const p = M.rooms.room.dropZones.toilet.position; return [p.x, p.y, p.z]; })()"))
    kind = 'touch' if touch else 'mouse'
    pt(page, 'pointerdown', 31, x, y, kind)
    time.sleep(0.8)
    for i in range(1, 9):
        time.sleep(0.03); pt(page, 'pointermove', 31, x + (tx - x) * i / 8, y + (ty - y) * i / 8, kind)
    time.sleep(0.3)
    pt(page, 'pointerup', 31, tx, ty, kind)
    time.sleep(0.6)
    check('sitting: exactly one "กดชักโครก", no coach, nav hidden', S(page, 'M.care.sitting') and visible_count(page, 'กดชักโครก') == 1 and visible_count(page, 'ลากตัวไปที่ชักโครก') == 0
          and page.evaluate("(() => { const n = document.querySelector('.mp-nav'); return !n || n.offsetParent === null || getComputedStyle(n).visibility === 'hidden'; })()"),
          f"sitting {S(page, 'M.care.sitting')} btn {visible_count(page, 'กดชักโครก')}")
    shot(page, f'{label}-{scheme}-toilet')
    page.click('.mp-flush')
    time.sleep(0.3)
    check('after flush: toilet 1, no button, no coach', S(page, 'M.game.needs().toilet') > 0.999 and visible_count(page, 'กดชักโครก') == 0)
    check('stands up after flush', wait(page, '!M.care.sitting', 20000))
    b.close()


if __name__ == '__main__':
    os.makedirs(EVID, exist_ok=True)
    only = os.environ.get('ONLY')
    with sync_playwright() as pw:
        for label, vp, touch in [('phone', {'width': 390, 'height': 844}, True), ('desktop', {'width': 1280, 'height': 800}, False)]:
            for scheme in ['light', 'dark']:
                if only and only not in f'{label}-{scheme}':
                    continue
                run(pw, label, vp, touch, scheme)
    for e in errors:
        print('  ERR  ' + e)
    bad = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(bad)} passed, {len(bad)} failed, {len(errors)} page errors')
    sys.exit(1 if bad or errors else 0)
