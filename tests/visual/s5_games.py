"""S5-06 minigames evidence: plays mimic, bubbles and hop automatically in
tests/visual/minigame-demo.html (stage + room + pet + HUD + registry, no main.js)
at 390x844 (touch) and 1440x900 (mouse), checks score / coins / result / best and
that the page logs no errors, and saves production/qa/evidence/s5-game-*.png.

Input goes through the page's real listeners: synthetic PointerEvents on window
(the same path a finger or mouse takes), keys through the keyboard, mimic pads
through the HUD's pad buttons when Glaze's pads exist (else the onMimicPad path).

Run:  python3 tests/visual/s5_games.py [three_dir] [only: mimic,bubbles,hop,phone,desktop,head]
Serves the repo itself on :8126. Exit 1 on a failed check or a page error.
"""
import os, sys, json, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '-' else '/tmp/claude-0/npm/node_modules/three'
ONLY = [s for s in (sys.argv[2] if len(sys.argv) > 2 else '').split(',') if s]
PORT = 8126
BASE = f'http://localhost:{PORT}/tests/visual/minigame-demo.html'
EVID = os.path.join(ROOT, 'production', 'qa', 'evidence')
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
VIEWS = {'phone': (390, 844), 'desktop': (1440, 900)}
results, errors = [], []


def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('  ok   ' if ok else '  FAIL ') + name + (f'  [{info}]' if info else ''), flush=True)


def want(*tags):
    return not ONLY or any(t in ONLY for t in tags)


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a: None
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def route(r):
    url = r.request.url
    if url.startswith(CDN):
        path = os.path.join(THREE, url[len(CDN):].split('?')[0])
        if os.path.isfile(path):
            return r.fulfill(path=path, content_type='application/javascript')
        return r.fulfill(status=404, body='')
    if url.startswith('http://localhost'):
        return r.continue_()
    return r.abort()   # fonts, MediaPipe: offline


def open_page(browser, view, query):
    w, h = VIEWS[view]
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1,
                              has_touch=view == 'phone', is_mobile=view == 'phone')
    page = ctx.new_page()
    page.set_default_timeout(240000)
    page.route('**/*', route)
    page.on('pageerror', lambda e: errors.append(f'{view} {query}: {e}'))
    page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(f'{view} {query} console: {m.text}'))
    page.goto(f'{BASE}?{query}')
    page.wait_for_function('() => window.__demo && window.__demo.frames > 2', timeout=90000)
    return ctx, page


# ---------------------------------------------------------------- in-page bots
BOT_COMMON = """
window.__tap = (x, y, id = 1) => {
  const o = { clientX: x, clientY: y, pointerId: id, pointerType: window.__ptype, bubbles: true, buttons: 1 };
  window.dispatchEvent(new PointerEvent('pointerdown', o));
  window.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }));
};
window.__toScreen = (x, y, z) => { const v = new (window.__demo.pet.object3d.position.constructor)(x, y, z); const o = { x: 0, y: 0 }; window.__demo.stage.worldToScreen(v, o); return o; };
"""

BOT_MIMIC = """
(() => {
  const d = window.__demo; let last = 0, slipsWanted = 0;
  window.__bot = setInterval(() => {
    const inst = d.inst; if (!inst || inst.phase !== 'play') return;
    const s = inst.state; if (s.sub !== 'input' || performance.now() - last < 260) return;
    last = performance.now();
    let i = s.seq[s.idx];
    if (s.L >= window.__mimicTarget) i = (i + 1) % s.padCount;          // slip on purpose to end the round
    const id = s.poses[i];
    const el = document.querySelector(`#hud [data-pad-id="${id}"], #hud [data-mimic-pad="${id}"], #hud [data-pose="${id}"], [data-mimic-pad="${id}"]`);
    if (el) { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, pointerType: window.__ptype })); el.click?.(); window.__padVia = 'dom'; }
    else { inst.pad(id); window.__padVia = 'handler'; }
  }, 60);
})();
"""

BOT_BUBBLES = """
(() => {
  const d = window.__demo; let last = 0, wrongDone = 0;
  window.__bot = setInterval(() => {
    const inst = d.inst; if (!inst || inst.phase !== 'play' || performance.now() - last < 330) return;
    const s = inst.state; const list = s.list || [];
    const sorted = list.filter((b) => b.good).sort((a, b) => b.y - a.y);
    let pick = sorted[0];
    if (!wrongDone && s.elapsed > 12) { const w = list.find((b) => !b.good); if (w) { pick = w; wrongDone = 1; window.__wrongTapped = 1; } }
    if (!pick) return;
    last = performance.now();
    const p = window.__toScreen(pick.x, pick.y, pick.z);
    window.__tap(p.x, p.y);
  }, 40);
})();
"""

BOT_HOP = """
(() => {
  const d = window.__demo; let lastJump = 0;
  window.__bot = setInterval(() => {
    const inst = d.inst; if (!inst || inst.phase !== 'play') return;
    const s = inst.state;
    const ahead = s.obstacles.filter((o) => !o.passed && !o.hit && o.x > s.petX - 0.2).sort((a, b) => a.x - b.x);
    const o = ahead[0]; if (!o) return;
    const dist = o.x - s.petX, now = performance.now();
    if (!s.air && dist < 1.0 && dist > 0.45 && now - lastJump > 150) { lastJump = now; window.__tap(innerWidth / 2, innerHeight * 0.45); }
    else if (s.air && dist < 0.95 && dist > 0.4 && s.y < 0.6 && now - lastJump > 180) { lastJump = now; window.__tap(innerWidth / 2, innerHeight * 0.45); }
  }, 16);
})();
"""


def wait_phase(page, phase, timeout=120000):
    page.wait_for_function(f"() => window.__demo.inst && window.__demo.inst.phase === '{phase}'", timeout=timeout)


def run_game(browser, view, game):
    name = f'{game}-{view}'
    ctx, page = open_page(browser, view, f'game={game}&seed=7&pet={"splat" if game == "mimic" else "diamond" if game == "bubbles" else "flower"}')
    page.evaluate(f"window.__ptype = '{'touch' if view == 'phone' else 'mouse'}'; window.__mimicTarget = 5;")
    page.evaluate(BOT_COMMON)
    wait_phase(page, 'countdown', 30000)
    page.wait_for_timeout(700)
    page.screenshot(path=os.path.join(EVID, f's5-game-{name}-countdown.png'))
    wait_phase(page, 'play', 30000)
    page.evaluate({'mimic': BOT_MIMIC, 'bubbles': BOT_BUBBLES, 'hop': BOT_HOP}[game])
    # mid-round evidence
    if game == 'mimic':
        page.wait_for_function("() => window.__demo.inst.state.L >= 4 && window.__demo.inst.state.sub === 'show'", timeout=120000)
        page.wait_for_timeout(250)
    else:
        page.wait_for_function("() => window.__demo.inst.state.elapsed > 18", timeout=120000)
    page.screenshot(path=os.path.join(EVID, f's5-game-{name}-play.png'))
    mid = page.evaluate('() => window.__demo.inst.state')
    wait_phase(page, 'result', 240000)
    page.evaluate('clearInterval(window.__bot)')
    page.wait_for_timeout(900)
    page.screenshot(path=os.path.join(EVID, f's5-game-{name}-result.png'))
    r = page.evaluate('() => window.__demo.inst.lastResult')
    best = page.evaluate(f"() => (window.__demo.game.best?.() || {{}})['{game}']")
    coins_total = page.evaluate('() => window.__demo.game.coins')
    extra = page.evaluate('() => ({ pad: window.__padVia || null, wrong: window.__wrongTapped || 0, ends: window.__demo.results.length })')
    print(f'    {name}: result {json.dumps(r, ensure_ascii=False)} mid {json.dumps({k: mid.get(k) for k in ("L", "slips", "score", "streak", "clears", "bumps", "bubbles", "called")})} {extra}', flush=True)
    check(f'{name} result card reached, completed', r and r['completed'])
    check(f'{name} score > 0', r and r['score'] > 0, r and r['score'])
    check(f'{name} coins 5..60', r and 5 <= r['coins'] <= 60, r and r['coins'])
    check(f'{name} coins added to purse', coins_total is not None and coins_total >= r['coins'], coins_total)
    check(f'{name} best saved per game', best == r['score'], best)
    check(f'{name} needs applied (fun > 0, hunger < 0)', r and r['needs']['fun'] > 0 and r['needs']['hunger'] < 0, r and r['needs'])
    check(f'{name} onEnd called once', extra['ends'] == 1, extra['ends'])
    if game == 'mimic':
        check(f'{name} result line "ไปได้ถึง"', r and 'ไปได้ถึง' in (r.get('line') or ''), r and r.get('line'))
        check(f'{name} ended by 3 slips at L≥5', r and r['score'] >= (2 + 3 + 4) * 10, r and r['score'])
    if game == 'bubbles':
        check(f'{name} wrong-colour tap happened', extra['wrong'] == 1)
    if game == 'hop':
        check(f'{name} clears happened', mid.get('clears', 0) + mid.get('coinsGot', 0) > 3, mid.get('clears'))
    # "เล่นอีก" → countdown again, then exit → pet home
    page.evaluate('window.__demo.inst.again()')
    wait_phase(page, 'countdown', 10000)
    page.evaluate('window.__demo.inst.exit()')
    page.wait_for_function("() => window.__demo.inst.phase === 'idle'", timeout=20000)
    home = page.evaluate('() => { const p = window.__demo.pet.object3d.position, h = window.__demo.room.petSpot; return Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z); }')
    check(f'{name} again → countdown, exit → pet back home', home < 0.01, round(home, 4))
    ctx.close()


def run_head(browser):
    """Head control without a camera: fake roll trace → hop jumps; fake axis → bubbles pop star moves."""
    ctx, page = open_page(browser, 'phone', 'game=hop&seed=3&control=head')
    wait_phase(page, 'play', 30000)
    page.evaluate('window.__demo.fakeHead.roll = 0')
    page.wait_for_timeout(300)
    page.evaluate('window.__demo.fakeHead.roll = 13')
    page.wait_for_timeout(120)
    air = page.evaluate('() => window.__demo.inst.state.air')
    check('hop head flick 0° → 13° jumps', air)
    page.wait_for_timeout(1200)
    air2 = page.evaluate('() => window.__demo.inst.state.air')
    check('hop holding 13° does not jump again', not air2)
    page.evaluate('window.__demo.fakeHead.roll = null')
    page.wait_for_timeout(1200)
    page.screenshot(path=os.path.join(EVID, 's5-game-hop-phone-head-lost.png'))
    ctx.close()
    ctx, page = open_page(browser, 'phone', 'game=bubbles&seed=3&control=head')
    wait_phase(page, 'play', 30000)
    page.evaluate('window.__demo.fakeHead.axis = -1')
    page.wait_for_timeout(1500)
    page.evaluate('window.__demo.fakeHead.axis = 0.8')
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(EVID, 's5-game-bubbles-phone-head-star.png'))
    st = page.evaluate('() => window.__demo.inst.state')
    check('bubbles head mode runs (pop star)', st['control'] == 'head', st['control'])
    ctx.close()


def main():
    os.makedirs(EVID, exist_ok=True)
    httpd = serve()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'])
            for view in VIEWS:
                for game in ['mimic', 'bubbles', 'hop']:
                    if want(game, view):
                        try:
                            run_game(browser, view, game)
                        except Exception as e:   # keep going; report
                            check(f'{game}-{view} ran', False, str(e)[:300])
            if want('head'):
                try:
                    run_head(browser)
                except Exception as e:
                    check('head mode ran', False, str(e)[:300])
            browser.close()
    finally:
        httpd.shutdown()
    for e in errors:
        print('  PAGE ERROR', e)
    bad = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(bad)} passed, {len(bad)} failed, {len(errors)} page errors')
    sys.exit(1 if bad or errors else 0)


if __name__ == '__main__':
    main()
