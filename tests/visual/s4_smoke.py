"""Sprint 4 wire smoke test (S4-06) on the live entry (index.html?debug):
bake (static room rendered once, live parts per frame), room switches re-bake,
furniture shop open / preview / close-revert / buy / equip, shop thumbnails,
save v4 + reload persistence, theme re-bake, minigame-view re-bake, a Christmas
outfit through the wardrobe data, raycast picking with the bake on, `?nobake`.
Phone 390x844 (touch) and desktop 1440x900 (mouse).

Run:  python3 -m http.server 8122   (from the repo root, in another shell)
      python3 tests/visual/s4_smoke.py [three_dir]
Software rendering is slow: checks read state, never frame timing.
Screenshots: production/qa/evidence/s4-wire-*.png. Exit 1 on a failed check or page error.
"""
import os, sys, json, time
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


def wait(page, expr, timeout=120000):
    try:
        page.wait_for_function(f'() => {{ const M = window.__moldablePet; return !!({expr}); }}', timeout=timeout)
        return True
    except Exception:
        return False


def shot(page, name):
    page.screenshot(path=os.path.join(EVID, f's4-wire-{name}.png'), timeout=180000)   # ?nobake frames are slow in software GL


def boot(page):
    page.wait_for_function("document.documentElement.dataset.boot", timeout=60000)
    return page.evaluate("document.documentElement.dataset.boot") == 'ok'


def bake(page):
    return S(page, 'M.stage.bake.stats()')


def baked_room(page, room, after=-1):
    """Wait until the stage shows a bake of `room` newer than bake count `after`."""
    return wait(page, f"(() => {{ const s = M.stage.bake.stats(); return s.mode === 'baked' && s.room === '{room}' && s.bakes > {after}; }})()")


def go_room(page, room):
    S(page, f"M.rooms.go('{room}')")
    return wait(page, f"!M.rooms.moving && M.rooms.id === '{room}'", 300000)   # software GL: a slide can take a minute


def click(page, sel):
    page.locator(sel).first.click()
    time.sleep(0.25)


def card(item):
    return f'.mp-item[data-id="{item}"]'


def tab(slot):
    return f'.mp-ward-tab[data-slot="{slot}"]'


def run(pw, label, viewport, touch):
    print(f'{label} {viewport["width"]}x{viewport["height"]}')
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport=viewport, device_scale_factor=2 if touch else 1, has_touch=touch, is_mobile=touch)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{label} pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'{label} console: {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.route('**/*', route)
    page.goto(URL)
    check('boot ok', boot(page))
    check('new save is v4 with furniture defaults', S(page, "M.game.save.version === 4 && M.game.furniture('living').corner === 'plant-pot' && M.game.owned.includes('plant-pot')"))
    S(page, "M.selectCharacter('flower')")
    check('living baked', baked_room(page, 'living'), json.dumps(bake(page)))
    check('no horizontal scroll', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    shot(page, f'{label}-living-baked')

    # raycast picking still works with the bake on (tap the pet → a gesture starts)
    hit = page.evaluate("""() => { const M = window.__moldablePet, pet = M.getPet(), p = pet.object3d.position.clone(), h = p.clone();
      pet.getHeadTopWorld(h); p.lerp(h, 0.45); const s = { x: 0, y: 0 }; M.stage.worldToScreen(p, s);
      return s; }""")
    kind = 'touch' if touch else 'mouse'
    page.evaluate("""([x, y, kind]) => { const t = document.elementFromPoint(x, y);
      t.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: kind, clientX: x, clientY: y, isPrimary: true, bubbles: true, cancelable: true, button: 0, buttons: 1 })); }""", [hit['x'], hit['y'], kind])
    time.sleep(0.1)
    active = S(page, 'M.gestures.active')
    page.evaluate("""([x, y, kind]) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: kind, clientX: x, clientY: y, isPrimary: true, bubbles: true, cancelable: true }))""", [hit['x'], hit['y'], kind])
    check('pet is still pickable with the bake on', len(active) > 0, str(active))

    # room switches: each room baked after its slide
    for room in ['kitchen', 'bathroom', 'living']:
        n = bake(page)['bakes']
        ok = go_room(page, room)
        check(f'switch to {room} re-bakes', ok and baked_room(page, room, n - 1 if room == 'living' else n), json.dumps(bake(page)))
        if room != 'living':
            shot(page, f'{label}-{room}-baked')

    # furniture shop
    S(page, '(M.game.addCoins(600), M.hud.setCoins(M.game.coins), 0)')
    coins0 = S(page, 'M.game.coins')
    click(page, '.mp-decor-btn')
    check('decor sheet opens', S(page, 'M.isDecorOpen()') and page.locator('.mp-item--decor').count() > 0)
    check('thumbnails render (lazy, cached)', wait(page, "M.thumbs && M.thumbs.pending === 0 && M.thumbs.size >= 21", 120000) and wait(page, "document.querySelectorAll('.mp-item--decor img').length > 0"), f"size {S(page, 'M.thumbs && M.thumbs.size')}")
    click(page, tab('corner'))
    n = bake(page)['bakes']
    click(page, card('xmas-tree'))
    check('preview shows the item in the room, save unchanged', S(page, "M.rooms.room.furniture.corner === 'xmas-tree' && M.game.furniture('living').corner === 'plant-pot'"))
    check('preview re-bakes', baked_room(page, 'living', n), json.dumps(bake(page)))
    shot(page, f'{label}-decor-preview')
    click(page, '.mp-decor-x')
    check('close reverts the unbought preview', S(page, "!M.isDecorOpen() && M.rooms.room.furniture.corner === 'plant-pot'"))

    click(page, '.mp-decor-btn')
    click(page, tab('corner'))
    click(page, card('xmas-tree'))
    click(page, card('xmas-tree'))          # second tap → confirmation
    check('buy confirmation shows', page.locator('.mp-buy-yes').count() == 1)
    click(page, '.mp-buy-yes')
    price = S(page, "M.data.furniture.items.find((i) => i.id === 'xmas-tree').price")
    check('buy: coins spent, owned, equipped, saved', S(page, f"M.game.coins === {coins0 - price} && M.game.owned.includes('xmas-tree') && M.game.furniture('living').corner === 'xmas-tree' && M.rooms.room.furniture.corner === 'xmas-tree'"),
          f"coins {S(page, 'M.game.coins')} price {price}")
    click(page, card('plant-pot'))
    check('equip an owned default', S(page, "M.game.furniture('living').corner === 'plant-pot' && M.rooms.room.furniture.corner === 'plant-pot'"))
    click(page, card('xmas-tree'))
    check('equip the bought item again (no charge)', S(page, f"M.game.furniture('living').corner === 'xmas-tree' && M.game.coins === {coins0 - price}"))
    # a second Christmas piece in another slot, bought straight through the API
    S(page, "M.decorPreview('side', 'fireplace-xmas')")
    S(page, "M.decorBuy('fireplace-xmas')")
    click(page, tab('corner'))
    shot(page, f'{label}-decor-bought')
    click(page, '.mp-decor-x')
    check('bought items stay after close', S(page, "M.rooms.room.furniture.corner === 'xmas-tree' && M.rooms.room.furniture.side === 'fireplace-xmas'"))
    check('living re-baked with the new furniture', baked_room(page, 'living'))
    shot(page, f'{label}-living-xmas')

    # kitchen shop: preview then switch room → preview reverted, saved untouched
    go_room(page, 'kitchen')
    click(page, '.mp-decor-btn') if page.locator('.mp-decor-btn:visible').count() else S(page, 'M.openDecor()')
    S(page, "M.decorPreview('fridge', 'fridge-gingerbread')")
    check('kitchen preview', S(page, "M.rooms.room.furniture.fridge === 'fridge-gingerbread'"))
    go_room(page, 'living')
    check('room switch closes the shop; kitchen save untouched', S(page, "!M.isDecorOpen() && M.game.furniture('kitchen').fridge === 'fridge-classic'"))

    # Christmas outfit through the wardrobe data
    S(page, '(M.game.addCoins(400), M.hud.setCoins(M.game.coins), 0)')
    S(page, "M.buy('hat-santa')")
    check('Christmas outfit bought + worn', S(page, "M.game.owned.includes('hat-santa') && M.game.outfit().head === 'hat-santa'"))

    # reload: furniture + owned persist (shared save)
    S(page, 'M.game.persist()')
    page.reload()
    check('reload boots', boot(page))
    check('furniture persists after reload', S(page, "M.game.save.version === 4 && M.rooms.room.furniture.corner === 'xmas-tree' && M.rooms.room.furniture.side === 'fireplace-xmas' && M.game.owned.includes('xmas-tree')"),
          json.dumps(S(page, 'M.rooms.room.furniture')))
    check('outfit persists after reload', S(page, "M.game.outfit().head === 'hat-santa'"))
    check('baked after reload', baked_room(page, 'living'))
    S(page, "M.selectCharacter('cloud')")
    check('furniture is shared across characters', S(page, "M.rooms.room.furniture.corner === 'xmas-tree' && M.game.furniture('living').corner === 'xmas-tree'"))
    S(page, "M.selectCharacter('flower')")

    # theme re-bake
    n = bake(page)['bakes']
    click(page, '.mp-lamp')
    check('theme switch re-bakes', baked_room(page, 'living', n) and S(page, "M.rooms.room.theme === 'dark'"), json.dumps(bake(page)))
    time.sleep(0.5)
    shot(page, f'{label}-living-xmas-dark')
    click(page, '.mp-lamp')
    baked_room(page, 'living')

    # minigame view: framing + HUD reserve change → live while easing, then re-baked
    n = bake(page)['bakes']
    S(page, 'M.startMinigame()')
    check('minigame view re-bakes', wait(page, 'M.minigame.active') and baked_room(page, 'living', n), json.dumps(bake(page)))
    shot(page, f'{label}-minigame-baked')
    S(page, 'M.minigame.exit()')
    n = bake(page)['bakes']
    check('back to the normal view re-bakes', baked_room(page, 'living', n))

    # resize re-bake (desktop only: phones do not resize in this test)
    if not touch:
        n = bake(page)['bakes']
        page.set_viewport_size({'width': 1280, 'height': 800})
        check('resize re-bakes', baked_room(page, 'living', n), json.dumps(bake(page)))
        page.set_viewport_size(viewport)
        baked_room(page, 'living')
    b.close()

    # ?nobake renders everything live
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport=viewport, device_scale_factor=2 if touch else 1, has_touch=touch, is_mobile=touch)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{label} nobake pageerror: {e}'))
    page.route('**/*', route)
    page.goto(URL + '&nobake')
    check('?nobake boots', boot(page))
    S(page, "M.selectCharacter('flower')")
    time.sleep(1.5)
    st = bake(page)
    check('?nobake renders live (no bake)', st['mode'] == 'off' and st['bakes'] == 0, json.dumps(st))
    shot(page, f'{label}-living-nobake')
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
    for e in errors[:10]:
        print('  ', e)
    sys.exit(1 if bad or errors else 0)
