"""Owner 2026-11-17: signed in on several devices, each device must play the account save.
Two browser contexts = two devices, one fake Supabase account (in this script), real game code.

Run:  python3 -m http.server 8122   (from the repo root, in another shell)
      python3 tests/visual/s7_cloud_devices.py [three_dir]
Exit 1 on a failed check or page error.
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s5_smoke as s
from playwright.sync_api import sync_playwright

s.THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
check = s.check
SB_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'
DB = {'row': None, 'writes': 0}
PAGES = []


def nap(sec):
    """Sleep while letting Playwright serve the fake cloud (time.sleep would block its routes)."""
    if PAGES:
        PAGES[0].wait_for_timeout(sec * 1000); return
    time.sleep(sec)

FAKE_SB = """
const api = (p, b) => fetch('/__fakedb/' + p, { method: 'POST', body: JSON.stringify(b || {}) }).then((r) => r.json());
const user = { id: 'u1', email: 'player@example.com', user_metadata: { full_name: 'Pim' } };
export function createClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: { user } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({}), signInWithOAuth: async () => ({}),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: await api('get'), error: null }) }) }),
      upsert: async (row) => { await api('put', row); return { error: null }; },
    }),
  };
}
"""


def route(r):
    url = r.request.url
    if url.startswith(SB_JS):
        return r.fulfill(body=FAKE_SB, content_type='application/javascript')
    if '/__fakedb/' in url:
        if url.endswith('/put'):
            DB['row'] = json.loads(r.request.post_data); DB['writes'] += 1
            print('   PUT', DB['row']['saved_at'], DB['row']['save'].get('coins'))
            return r.fulfill(body='{}', content_type='application/json')
        return r.fulfill(body=json.dumps(DB['row']), content_type='application/json')
    return s.route(r)


def coins(page):
    for _ in range(40):
        try:
            return page.evaluate('window.__moldablePet && document.documentElement.dataset.boot === "ok" ? window.__moldablePet.game.save.coins : null')
        except Exception:
            pass
        nap(.25)
    return None


def settle(page, want, timeout=45):
    """Wait (through reloads) until the game on this device shows `want` coins."""
    end = time.time() + timeout
    while time.time() < end:
        try:
            if page.evaluate('window.__moldablePet?.game?.save?.coins') == want and page.evaluate('document.documentElement.dataset.boot') == 'ok':
                return True
        except Exception:
            pass
        nap(.3)
    return False


def set_coins(page, n):
    """Play on this device: change the coins and save (retries while the page is reloading)."""
    for _ in range(60):
        try:
            if page.evaluate(f'(() => {{ const M = window.__moldablePet; if (!M || document.documentElement.dataset.boot !== "ok") return false; M.game.save.coins = {n}; M.game.persist(); return true; }})()'):
                return
        except Exception:
            pass
        nap(.5)


def device(b, name):
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    page.on('pageerror', lambda e: s.errors.append(f'{name} pageerror: {e}'))
    page.on('console', lambda m: print(f'   [{name}] {m.text}') if '[cloud]' in m.text or 'DBG' in m.text else None)
    page.route('**/*', route)
    page.goto(s.URL)
    page.wait_for_function('document.documentElement.dataset.boot', timeout=90000)
    return page


def reopen(page):
    """Close and open the game again on this device (the game may already be reloading itself)."""
    for _ in range(3):
        try:
            page.goto(s.URL, wait_until='commit'); return
        except Exception:
            nap(.5)


def cloud_coins():
    return (DB['row'] or {}).get('save', {}).get('coins')


def wait_cloud(n, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        if cloud_coins() == n:
            return True
        nap(.3)
    return False


if __name__ == '__main__':
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        PAGES.append(b.new_page())   # idle blank page: waits run here while the devices reload
        phone = device(b, 'phone')
        phone.evaluate("window.__moldablePet.selectCharacter('splat')"); nap(1)
        set_coins(phone, 111)
        check('phone uploads its save', wait_cloud(111), str(cloud_coins()))

        tablet = device(b, 'tablet')
        check('new tablet loads the account save', settle(tablet, 111), str(coins(tablet)))

        set_coins(phone, 500)
        check('phone plays on: cloud 500', wait_cloud(500), str(cloud_coins()))
        reopen(tablet)
        check('tablet reopened: account save (500), not its own boot save', settle(tablet, 500), str(coins(tablet)))
        nap(6)
        check('tablet did not overwrite the account', cloud_coins() == 500, str(cloud_coins()))

        set_coins(tablet, 700)
        check('tablet plays: cloud 700', wait_cloud(700), str(cloud_coins()))
        phone.evaluate("document.dispatchEvent(new Event('visibilitychange'))")   # phone back on screen
        check('phone back on screen: loads 700', settle(phone, 700), str(coins(phone)))

        # a tab left open on the phone saves on its timer: it must take the newer save, not push its old one
        set_coins(tablet, 900); wait_cloud(900)
        try:
            phone.evaluate("(() => { const M = window.__moldablePet; M.game.save.coins = 701; M.game.persist(); })()")
        except Exception:
            pass
        check('old tab saving: takes the account save (900)', settle(phone, 900), str(coins(phone)))
        nap(6)
        check('account still 900', cloud_coins() == 900, str(cloud_coins()))

        # device linked before this fix (no base stamp): account save wins once
        tablet.evaluate("localStorage.removeItem('mp-cloud-base')")
        set_coins(phone, 950); wait_cloud(950)
        reopen(tablet)
        check('device from before the fix: account save (950)', settle(tablet, 950), str(coins(tablet)))
        b.close()
    bad = [r for r in s.results if not r[1]]
    print(f'\n{len(s.results) - len(bad)} passed, {len(bad)} failed, {len(s.errors)} page errors')
    for e in s.errors[:12]:
        print('  ', e)
    sys.exit(1 if bad or s.errors else 0)
