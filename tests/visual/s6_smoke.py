"""Owner 2026-11-16 UI smoke test: minimal top bar, profile sheet (account + round avatars),
settings sheet (music / effects volume, camera switch), "แต่ง" menu, "which save?" choice, music
start without errors. Phone 390x844 (touch) and desktop 1280x800, light + dark.

Run:  python3 -m http.server 8122   (from the repo root, in another shell)
      python3 tests/visual/s6_smoke.py [three_dir]       ONLY=phone|desktop to run one
Screenshots: production/qa/evidence/s6-smoke-*.png. Exit 1 on a failed check or page error.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s5_smoke as s
from playwright.sync_api import sync_playwright

s.THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
EVID = s.EVID
check, S = s.check, s.S
SIGNED_IN = "{enabled:true, signedIn:true, label:'Pim', name:'Pim Tester', email:'player@example.com', avatar:'', sync:'saved', lastSync: Date.now()-180000}"


def shot(page, name):
    page.screenshot(path=os.path.join(EVID, f's6-smoke-{name}.png'), timeout=180000)


def run(pw, label, vp, touch):
    print(f'{label} {vp["width"]}x{vp["height"]}')
    b, page = s.open_page(pw, label, vp, touch, stub=False)
    S(page, "M.selectCharacter('flower')"); time.sleep(1.5)
    page.evaluate("document.querySelectorAll('.mp-select-x').forEach((b) => b.click())"); time.sleep(.4)
    bar = page.evaluate("[...document.querySelectorAll('.mp-bar button')].filter((b) => b.offsetParent).map((b) => b.className).join(' | ')")
    check('top bar: chip, lamp, gear only (camera hidden while off)', '.mp-cam' not in bar and 'mp-gear' in bar and 'mp-who' in bar and 'mp-cam ' not in bar, bar)
    check('chip shows the round avatar', 'ava_pai.png' in page.evaluate("document.querySelector('.mp-who-ava img').src"))
    S(page, f"(M.hud.setAccount({SIGNED_IN}), 0)"); time.sleep(.3)
    check('signed-in badge on the chip', page.evaluate("!document.querySelector('.mp-who-acct').hidden"))
    shot(page, f'{label}-main')

    # "แต่ง" menu (living room: two choices)
    page.click('.mp-style-btn'); time.sleep(.4)
    check('style menu lists wardrobe + decor', page.locator('.mp-ward-btn:visible').count() == 1 and page.locator('.mp-decor-btn:visible').count() == 1)
    shot(page, f'{label}-style-menu')
    page.keyboard.press('Escape'); time.sleep(.3)
    check('Escape closes the style menu', page.locator('.mp-style-menu:visible').count() == 0)

    # settings
    page.click('.mp-gear'); time.sleep(.5)
    check('settings opens with two sliders + camera switch', page.locator('.mp-settings .mp-range').count() == 2 and page.locator('.mp-set-switchrow').count() == 1)
    page.evaluate("(() => { const r = document.querySelector('#mp-set-music'); r.value = 20; r.dispatchEvent(new Event('input', { bubbles: true })); })()")
    page.evaluate("(() => { const r = document.querySelector('#mp-set-sfx'); r.value = 0; r.dispatchEvent(new Event('input', { bubbles: true })); })()")
    time.sleep(.2)
    check('music slider sets musicVol', abs(S(page, 'M.game.settings.musicVol') - 0.2) < 1e-6, str(S(page, 'M.game.settings.musicVol')))
    check('effects slider at 0 reads "ปิด"', S(page, 'M.game.settings.sfxVol') == 0 and page.evaluate("document.querySelector('#mp-set-sfx').getAttribute('aria-valuetext')") == 'ปิด')
    shot(page, f'{label}-settings')
    page.keyboard.press('Escape'); time.sleep(.3)
    check('Escape closes settings', page.locator('.mp-settings:visible').count() == 0)

    # music module runs without errors once audio is unlocked
    page.mouse.click(5, vp['height'] // 2); time.sleep(.3)
    ok = page.evaluate("import('/src/audio/music.js').then((m) => { m.music.start(); return new Promise((r) => setTimeout(() => r(m.music.isPlaying()), 1200)); })")
    check('home music starts', ok is True, str(ok))

    # profile sheet = account + characters
    page.click('.mp-who'); time.sleep(.8)
    check('profile sheet: account block + 6 round avatars', page.locator('.mp-acct.is-in').count() == 1 and page.locator('.mp-card-pic img[src*="ava_"]').count() == 6)
    check('selected card check is white on the gradient', page.evaluate("getComputedStyle(document.querySelector('.mp-card-check .t-tube')).stroke") in ('rgb(255, 255, 255)', '#ffffff', '#FFFFFF'))
    shot(page, f'{label}-profile-in')
    S(page, "(M.hud.setAccount({enabled:true, signedIn:false}), 0)"); time.sleep(.3)
    check('signed out: Google button in the sheet', page.locator('.mp-acct-google').count() == 1)
    shot(page, f'{label}-profile-out')
    page.click('.mp-select-x'); time.sleep(.4)

    # which save?
    S(page, "(M.hud.askSaveChoice({device:{pet:'ไผ่',coins:120,savedAt:Date.now()-3600000}, cloud:{pet:'มิน',coins:340,savedAt:Date.now()-86400000}}).then((v) => { window.__pick = v; }), 0)")
    time.sleep(.5)
    check('save choice shows two options, account first', page.locator('.mp-savepick').count() == 2 and page.locator('.mp-savepick').first.get_attribute('data-pick') == 'cloud')
    shot(page, f'{label}-save-choice')
    page.click('[data-pick="device"]'); time.sleep(.3)
    check('choice resolves', page.evaluate('window.__pick') == 'device')

    # dark theme
    page.click('.mp-lamp'); time.sleep(1.5)
    shot(page, f'{label}-dark')
    page.click('.mp-gear'); time.sleep(.5); shot(page, f'{label}-dark-settings'); page.keyboard.press('Escape')
    check('no horizontal scroll', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    b.close()


if __name__ == '__main__':
    os.makedirs(EVID, exist_ok=True)
    only = os.environ.get('ONLY')
    with sync_playwright() as pw:
        for label, vp, touch in [('phone', {'width': 390, 'height': 844}, True), ('desktop', {'width': 1280, 'height': 800}, False)]:
            if only and only != label:
                continue
            run(pw, label, vp, touch)
    bad = [r for r in s.results if not r[1]]
    print(f'\n{len(s.results) - len(bad)} passed, {len(bad)} failed, {len(s.errors)} page errors')
    for e in s.errors[:12]:
        print('  ', e)
    sys.exit(1 if bad or s.errors else 0)
