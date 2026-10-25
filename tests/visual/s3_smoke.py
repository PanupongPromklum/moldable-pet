"""Sprint 3 wire smoke test on the live entry (index.html?debug): manual light/dark
(lamp, saved, survives reload, system scheme ignored), Snack Rain intro card →
touch round, head-tilt control (camera denied → touch fallback; simulated face
landmarks → calibration + tilt moves the pet), head-stroke petting on touch,
lower-body drag still stretches, mouse hover-rub on desktop, slim soft hands.
Phone 390x844 (touch, system dark) and desktop 1280x800 (mouse, system light).

Run:  python3 -m http.server 8122   (from the repo root, in another shell)
      python3 tests/visual/s3_smoke.py [three_dir]
Software rendering runs at ~2 fps: checks read state, never frame timing.
Screenshots: production/qa/evidence/s3-wire-*.png. Exit 1 on a failed check or page error.
"""
import os, sys, json, time, math
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
URL = 'http://localhost:8122/index.html?debug'
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


def shot(page, name):
    page.screenshot(path=os.path.join(EVID, f's3-wire-{name}.png'))


JS_PT = """([type, id, x, y, kind]) => {
  const target = type === 'pointerdown' ? (document.elementFromPoint(x, y) || document.getElementById('gl')) : window;
  target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: kind, clientX: x, clientY: y, isPrimary: true, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
}"""


def pt(page, type_, pid, x, y, kind='touch'):
    page.evaluate(JS_PT, [type_, pid, x, y, kind])


def body_px(page):
    """Screen px of the pet's feet and head top (x, y each)."""
    return page.evaluate("""() => { const M = window.__moldablePet, pet = M.getPet();
      const f = pet.object3d.position.clone(), h = f.clone(); pet.getHeadTopWorld(h); f.z = h.z;
      const a = {x:0,y:0}, b = {x:0,y:0}; M.stage.worldToScreen(f, a); M.stage.worldToScreen(h, b); return [a.x, a.y, b.x, b.y]; }""")


def face(deg, nose_x=0.5):
    """Face Landmarker-shaped fixture: outer eye corners (33, 263) rolled by deg (+ = player's right), nose tip (1)."""
    L = [{'x': 0.5, 'y': 0.5} for _ in range(478)]
    t = math.radians(deg); a = 4 / 3; hs = 0.12
    L[33] = {'x': 0.5 - hs * math.cos(t) / a, 'y': 0.45 + hs * math.sin(t)}
    L[263] = {'x': 0.5 + hs * math.cos(t) / a, 'y': 0.45 - hs * math.sin(t)}
    L[1] = {'x': nose_x, 'y': 0.53}
    return L


def palm(cx, cy=0.62, s=0.11):
    pts = [(0, 0.9), (-0.45, 0.65), (-0.75, 0.35), (-0.95, 0.1), (-1.1, -0.1),
           (-0.4, 0.0), (-0.45, -0.45), (-0.48, -0.75), (-0.5, -1.0),
           (0, -0.05), (0, -0.55), (0, -0.9), (0, -1.15),
           (0.38, 0.0), (0.42, -0.45), (0.45, -0.75), (0.47, -0.98),
           (0.72, 0.1), (0.8, -0.25), (0.85, -0.5), (0.88, -0.7)]
    return [{'x': cx + x * s, 'y': cy + y * s} for x, y in pts]


def boot(page):
    page.wait_for_function("document.documentElement.dataset.boot", timeout=40000)
    return page.evaluate("document.documentElement.dataset.boot") == 'ok'


def pick(page, key):
    page.click(f'.mp-card[data-key="{key}"]')
    time.sleep(0.2)
    page.click('.mp-select-go')
    time.sleep(0.4)


def theme_state(page):
    return page.evaluate("""() => ({ html: document.documentElement.dataset.theme,
      cs: document.querySelector('meta[name=color-scheme]').content,
      tc: [...document.querySelectorAll('meta[name=theme-color]')].map((m) => m.content + (m.media ? '@' + m.media : '')).join(','),
      lamp: document.querySelector('.mp-lamp')?.dataset.theme, room: window.__moldablePet.rooms.room.theme,
      saved: window.__moldablePet.game.settings.theme, hemi: window.__moldablePet.stage.lights.hemi.intensity })""")


def run(pw, label, viewport, touch, scheme):
    print(f'{label} {viewport["width"]}x{viewport["height"]} system {scheme}')
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport=viewport, device_scale_factor=1, has_touch=touch, is_mobile=touch, color_scheme=scheme)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{label} pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'{label} console: {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.route('**/*', route)
    page.goto(URL)
    check('boot ok', boot(page))
    t = theme_state(page)
    check(f'new save: light theme even with system {scheme}', t['html'] == 'light' and t['cs'] == 'only light' and t['room'] == 'light' and t['saved'] == 'light' and t['lamp'] == 'light', json.dumps(t))
    check('save v3', S(page, 'M.game.save.version') == 3 and S(page, 'M.game.settings.minigameControl') == 'touch')
    time.sleep(0.4)
    pick(page, 'flower')
    check('no horizontal scroll', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    shot(page, f'{label}-light')

    # ---- lamp: dark, saved, reload keeps it ----
    page.click('.mp-lamp')
    time.sleep(0.4)
    t = theme_state(page)
    check('lamp → dark everywhere', t['html'] == 'dark' and t['cs'] == 'only dark' and t['tc'] == '#1E1E1E' and t['room'] == 'dark' and t['saved'] == 'dark' and t['lamp'] == 'dark', json.dumps(t))
    S(page, "M.rooms.go('kitchen')")
    wait(page, "!M.rooms.moving && M.rooms.id === 'kitchen'")
    check('room created on switch is dark', S(page, 'M.rooms.room.theme') == 'dark')
    S(page, "M.rooms.go('living')")
    wait(page, "!M.rooms.moving && M.rooms.id === 'living'")
    page.reload()
    check('reload boots', boot(page))
    t = theme_state(page)
    check('dark theme persists after reload', t['html'] == 'dark' and t['cs'] == 'only dark' and t['room'] == 'dark' and t['lamp'] == 'dark', json.dumps(t))
    shot(page, f'{label}-dark')

    # ---- petting ----
    kind = 'touch' if touch else 'mouse'
    fx, fy, hx, hy = body_px(page)
    S(page, '(M.game.needs().social = 0.3, 0)')
    if touch:
        # stroke: press in the head zone (15% down from the top), slow side-to-side drag
        sx, sy = hx, hy + (fy - hy) * 0.15
        s0 = S(page, 'M.game.needs().social')
        pt(page, 'pointerdown', 41, sx, sy, kind)
        modes = set()
        for i in range(1, 49):
            time.sleep(0.04)
            pt(page, 'pointermove', 41, sx + 40 * math.sin(i * 0.25), sy, kind)
            if i % 8 == 0:
                modes |= set(a.split(':')[-1] for a in S(page, 'M.gestures.active'))
        shot(page, f'{label}-stroke')
        pt(page, 'pointerup', 41, sx, sy, kind)
        s1 = S(page, 'M.game.needs().social')
        check('head stroke = stroke mode (no stretch, no carry)', 'stroke' in modes and 'stretch' not in modes and 'carry' not in modes and not S(page, 'M.care.carrying'), str(modes))
        check('head stroke raises social', s1 > s0 + 0.03, f'{s0:.3f} -> {s1:.3f}')
        # a drag from low on the body still stretches
        lx, ly = fx, fy + (hy - fy) * 0.3
        pt(page, 'pointerdown', 42, lx, ly, kind)
        for i in range(1, 5):
            time.sleep(0.03); pt(page, 'pointermove', 42, lx + 12 * i, ly + 6 * i, kind)
        m = S(page, 'M.gestures.active')
        pt(page, 'pointerup', 42, lx + 48, ly + 24, kind)
        check('lower-body drag stretches', any(a.endswith(':stretch') for a in m), str(m))
        # a fast flick from the head is a stretch, not a stroke
        # (one evaluate: the busy software-rendered page makes each round trip ~1 s)
        m = page.evaluate("""([x, y, kind]) => { const ev = (type, X, Y) => (type === 'pointerdown' ? document.elementFromPoint(X, Y) : window)
            .dispatchEvent(new PointerEvent(type, { pointerId: 43, pointerType: kind, clientX: X, clientY: Y, isPrimary: true, bubbles: true, cancelable: true, button: 0, buttons: 1 }));
          ev('pointerdown', x, y); const t0 = performance.now(); while (performance.now() - t0 < 30) {} ev('pointermove', x + 140, y - 60);
          return window.__moldablePet.gestures.active; }""", [sx, sy, kind])
        pt(page, 'pointerup', 43, sx + 140, sy - 60, kind)
        check('fast head drag stretches', any(a.endswith(':stretch') for a in m), str(m))
    else:
        # mouse hover-rub just above the head top keeps petting
        s0 = S(page, 'M.game.needs().social')
        for i in range(48):
            time.sleep(0.03)
            page.mouse.move(hx + 50 * math.sin(i * 0.3), hy - 8)
        s1 = S(page, 'M.game.needs().social')
        check('mouse hover-rub raises social', s1 > s0 + 0.03, f'{s0:.3f} -> {s1:.3f}')
        page.mouse.move(viewport['width'] - 20, viewport['height'] / 2)

    # ---- Snack Rain intro → touch round ----
    S(page, '(M.snackCfg.durationSec = 30, 0)')
    page.click('.mp-ctx[data-ctx="play"]')
    time.sleep(0.4)
    check('intro card opens with saved choice (touch)', page.locator('.mp-intro:not([hidden]) .mp-opt[data-control="touch"].is-on').count() == 1)
    shot(page, f'{label}-intro')
    page.click('.mp-opt[data-control="head"]')
    time.sleep(0.2)
    check('choice saved: head', S(page, 'M.game.settings.minigameControl') == 'head')
    page.click('.mp-opt[data-control="touch"]')
    time.sleep(0.2)
    page.click('.mp-intro-go')
    check('touch round starts', wait(page, "M.minigame.active && M.minigame.phase === 'countdown'", 8000) and S(page, 'M.getControl()') == 'touch')
    check('countdown → play', wait(page, "M.minigame.phase === 'play'", 30000))
    W, H = viewport['width'], viewport['height']
    if touch:
        pt(page, 'pointerdown', 51, W * 0.8, H * 0.6); pt(page, 'pointermove', 51, W * 0.82, H * 0.6); pt(page, 'pointerup', 51, W * 0.82, H * 0.6)
    else:
        page.mouse.move(W * 0.8, H * 0.6); page.mouse.move(W * 0.81, H * 0.61)
    time.sleep(0.3)
    check('touch/mouse drives the pet', S(page, 'M.minigame.state.source') == 'pointer' and S(page, 'M.minigame.state.targetX') > S(page, 'M.minigame.state.area.centre'))
    shot(page, f'{label}-round-touch')
    page.keyboard.press('Escape')
    check('Esc leaves the round', wait(page, '!M.minigame.active', 20000))

    # ---- head control, camera unavailable → toast + touch ----
    page.click('.mp-ctx[data-ctx="play"]')
    time.sleep(0.3)
    page.click('.mp-opt[data-control="head"]')
    time.sleep(0.2)
    page.click('.mp-intro-go')
    ok = wait(page, "M.minigame.active", 20000)
    toast = page.evaluate("document.querySelector('.mp-toast-text')?.textContent || ''")
    check('camera unavailable → touch round + Thai toast', ok and S(page, 'M.getControl()') == 'touch' and 'ใช้นิ้วเล่นแทน' in toast and S(page, 'M.game.settings.minigameControl') == 'touch', toast)
    page.keyboard.press('Escape')
    wait(page, '!M.minigame.active', 20000)

    # ---- head control with simulated face landmarks (an in-page timer plays the camera: 20 frames/s) ----
    S(page, "(M.game.setSetting('minigameControl', 'head'), 0)")
    page.evaluate("""(L) => { window.__face = L; const M = window.__moldablePet; M.head.debugFeed(L);
      window.__faceTimer = setInterval(() => M.head.debugFeed(window.__face), 50); }""", face(5))
    S(page, '(M.readyMinigame(), 0)')
    check('head round starts (calibrating in countdown)', wait(page, "M.minigame.active && M.head.calibrating", 15000) and S(page, 'M.getControl()') == 'head')
    check('countdown → play (head)', wait(page, "M.minigame.phase === 'play'", 30000))
    st = S(page, 'M.head.state')
    check('neutral calibrated from the countdown (5°)', abs(st['neutral']['roll'] - 5) < 0.01 and st['samples'] >= 1, json.dumps(st['neutral']))
    page.evaluate("(L) => { window.__face = L; }", face(25))
    ok = wait(page, "M.minigame.state.targetX > M.minigame.state.area.centre + 0.3 * M.minigame.state.area.petHalfRange", 20000)
    c = S(page, 'M.minigame.state')
    check('tilt right 20° from neutral → pet target right', ok and c['source'] == 'camera', f"{c['targetX']:.2f} centre {c['area']['centre']:.2f}")
    page.evaluate("(L) => { window.__face = L; }", face(-15))
    ok = wait(page, "M.minigame.state.targetX < M.minigame.state.area.centre - 0.3 * M.minigame.state.area.petHalfRange", 20000)
    check('tilt left → pet target left', ok, f"{S(page, 'M.minigame.state.targetX'):.2f}")
    shot(page, f'{label}-round-head')
    page.evaluate("() => clearInterval(window.__faceTimer)")
    page.keyboard.press('Escape')
    check('head control off after the round', wait(page, '!M.minigame.active && !M.head.on', 20000))

    # ---- slim soft hands (camera image hidden) ----
    S(page, '(M.hands.setView(true), 0)')
    page.evaluate("(L) => window.__moldablePet.hands.debugFeed([L])", palm(0.62, 0.55, 0.13))
    time.sleep(0.6)
    shot(page, f'{label}-softhands-dark')
    page.click('.mp-lamp')
    page.evaluate("(L) => window.__moldablePet.hands.debugFeed([L])", palm(0.62, 0.55, 0.13))
    time.sleep(0.6)
    check('lamp → light again', theme_state(page)['html'] == 'light')
    shot(page, f'{label}-softhands-light')
    page.evaluate("() => window.__moldablePet.hands.debugFeed(null)")
    S(page, '(M.hands.setView(false), 0)')
    b.close()


if __name__ == '__main__':
    os.makedirs(EVID, exist_ok=True)
    only = os.environ.get('ONLY')
    with sync_playwright() as pw:
        for label, vp, touch, scheme in [('phone', {'width': 390, 'height': 844}, True, 'dark'), ('desktop', {'width': 1280, 'height': 800}, False, 'light')]:
            if only and only != label:
                continue
            run(pw, label, vp, touch, scheme)
    for e in errors:
        print('  ERR  ' + e)
    bad = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(bad)} passed, {len(bad)} failed, {len(errors)} page errors')
    sys.exit(1 if bad or errors else 0)
