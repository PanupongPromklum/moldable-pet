"""Sprint 5 smoke test (S5-07) on the live entry (index.html?debug):
save v5, growth stages + trait card, minigame picker + each new game starts and exits,
typed chat through the keyword brain, a talk turn with a stubbed SpeechRecognition,
the echo fallback when recognition is missing. Phone 390x844 (touch) and desktop 1440x900.

Run:  python3 -m http.server 8122   (from the repo root, in another shell)
      python3 tests/visual/s5_smoke.py [three_dir]       ONLY=phone|desktop to run one
Screenshots: production/qa/evidence/s5-smoke-*.png. Exit 1 on a failed check or page error.
"""
import os, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
URL = 'http://localhost:8122/index.html?debug'
EVID = os.path.join(ROOT, 'production', 'qa', 'evidence')
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
results, errors = [], []

# A fake recogniser that "hears" window.__heard, so a talk turn runs end to end without a mic.
STUB_SR = """
window.__heard = 'หิวไหม';
class FakeSR {
  constructor() { this.lang = ''; }
  start() { setTimeout(() => { this.onstart && this.onstart(); }, 30);
    setTimeout(() => { const alt = { transcript: window.__heard, confidence: 0.9 }; const res = [alt]; res.isFinal = true;
      this.onresult && this.onresult({ resultIndex: 0, results: [res] }); this.onend && this.onend(); }, 200); }
  stop() {} abort() { this.onend && this.onend(); }
}
window.SpeechRecognition = FakeSR;
"""


def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('  ok   ' if ok else '  FAIL ') + name + (f'  [{info}]' if info else ''))


def route(r):
    url = r.request.url
    if url.startswith(CDN):
        path = os.path.join(THREE, url[len(CDN):].split('?')[0])
        return r.fulfill(path=path, content_type='application/javascript') if os.path.isfile(path) else r.fulfill(status=404, body='')
    return r.continue_() if url.startswith('http://localhost') else r.abort()


def S(page, expr):
    return page.evaluate(f'async () => {{ const M = window.__moldablePet; return {expr}; }}')


def wait(page, expr, timeout=120000):
    try:
        page.wait_for_function(f'() => {{ const M = window.__moldablePet; return !!({expr}); }}', timeout=timeout)
        return True
    except Exception:
        return False


def shot(page, name):
    page.screenshot(path=os.path.join(EVID, f's5-smoke-{name}.png'), timeout=180000)


def open_page(pw, label, vp, touch, stub=True):
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport=vp, device_scale_factor=2 if touch else 1, has_touch=touch, is_mobile=touch)
    if stub:
        ctx.add_init_script(STUB_SR)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{label} pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'{label} console: {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.route('**/*', route)
    page.goto(URL)
    page.wait_for_function('document.documentElement.dataset.boot', timeout=90000)
    return b, page


def run(pw, label, vp, touch):
    print(f'{label} {vp["width"]}x{vp["height"]}')
    b, page = open_page(pw, label, vp, touch)
    check('boot ok', page.evaluate('document.documentElement.dataset.boot') == 'ok')
    S(page, "M.selectCharacter('flower')")
    time.sleep(1)
    check('save v5 with growth for the pet', S(page, "M.game.save.version === 5 && !!M.growth.state.growth"))
    check('new pet starts as baby', S(page, "M.growth.state.growth.stage === 'baby'"), S(page, "M.growth.state.growth.stage"))
    shot(page, f'{label}-baby')

    # growth: kid card, then grown with a cuddly tally → trait
    S(page, "M.growth.debugAdvance(46 * 60)")
    check('46 engaged minutes → kid', wait(page, "M.growth.state.growth.stage === 'kid'", 10000))
    time.sleep(1.5)
    shot(page, f'{label}-kid-card')
    page.keyboard.press('Escape'); S(page, "(M.growth.onCardClose(), 0)")
    S(page, "M.growth.debugAdvance(140 * 60, { cuddly: 60, playful: 8, foodie: 6, stylish: 4 })")
    check('180 min → grown with trait cuddly', wait(page, "M.growth.state.growth.stage === 'grown' && M.growth.state.growth.trait === 'cuddly'", 10000),
          str(S(page, "JSON.stringify(M.growth.state.growth)")))
    time.sleep(1.5)
    shot(page, f'{label}-grown-trait')
    for _ in range(3):
        S(page, "(M.growth.onCardClose(), 0)")
    S(page, "(M.hud.hideGrowthCard && M.hud.hideGrowthCard(), 0)")

    # typed chat → brain
    r = S(page, "M.talk.typed('หิวไหม').then((r) => r && r.intent)")
    check('typed chat: หิวไหม → ask_hungry', r == 'ask_hungry', str(r))
    r = S(page, "M.talk.typed('น่ารักจัง').then((r) => r && r.intent)")
    check('typed chat: น่ารักจัง → praise_cute', r == 'praise_cute', str(r))
    time.sleep(0.6)
    shot(page, f'{label}-typed-reply')

    # talk turn with the stubbed recogniser (notice first, then OK → turn)
    S(page, "(M.game.setSetting('talkNoticeSeen', false), 0)")
    S(page, "M.talk.press()")
    check('first press shows the privacy notice', wait(page, "document.querySelector('.mp-talk-notice, [data-sheet=\"talk-notice\"], .mp-notice')", 8000)
          or S(page, "!!M.hud.isTalkNoticeOpen?.()"))
    shot(page, f'{label}-talk-notice')
    page.evaluate("window.__heard = 'รักนะ'")
    S(page, "M.talk.noticeOk()")
    check('talk turn hears รักนะ → love', wait(page, "M.talk.state.history.length > 0 || !M.talk.busy", 15000))
    time.sleep(0.8)
    shot(page, f'{label}-talk-caption')

    # picker + each new game
    S(page, "(M.openPicker(), 0)")
    time.sleep(1)
    check('picker lists 4 games', S(page, "M.pickerGames().length === 4"))
    shot(page, f'{label}-picker')
    for gid in ['mimic', 'bubbles', 'hop']:
        S(page, f"(M.pickGame('{gid}'), 0)")
        time.sleep(1)
        S(page, "(M.readyMinigame && M.readyMinigame(), 0)")
        ok = wait(page, f"M.getGameId() === '{gid}' && M.minigame.active", 60000)
        check(f'{gid} starts', ok, str(S(page, "M.getGameId()")))
        time.sleep(5)
        shot(page, f'{label}-game-{gid}')
        S(page, "(M.minigame.exit(), 0)")
        wait(page, "!M.minigame.active", 30000)
        S(page, "(M.hud.hideMinigamePicker && M.hud.hideMinigamePicker(), 0)")
        time.sleep(0.5)
    check('no horizontal scroll', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    b.close()

    # no recogniser → echo fallback
    b, page = open_page(pw, label + '-nosr', vp, touch, stub=False)
    page.evaluate("delete window.SpeechRecognition; delete window.webkitSpeechRecognition")
    mode = S(page, "M.talk.modeNow().then((m) => m.mode)")
    check('no recognition → echo (talk-back)', mode == 'echo', str(mode))
    b.close()


if __name__ == '__main__':
    os.makedirs(EVID, exist_ok=True)
    only = os.environ.get('ONLY')
    with sync_playwright() as pw:
        for label, vp, touch in [('phone', {'width': 390, 'height': 844}, True), ('desktop', {'width': 1440, 'height': 900}, False)]:
            if only and only != label:
                continue
            run(pw, label, vp, touch)
    bad = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(bad)} passed, {len(bad)} failed, {len(errors)} page errors')
    for e in errors[:12]:
        print('  ', e)
    sys.exit(1 if bad or errors else 0)
