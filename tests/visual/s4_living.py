"""S4-02 living room evidence: furniture slots (defaults, alt sets, Christmas), light + dark,
phone 390x844 and desktop 1440x900, plus draw calls / triangles for staticGroup vs liveGroup
and a setFurniture / staticVersion / preview API check.

Run:  python3 -m http.server 8124   (from the repo root, in another shell)
      python3 tests/visual/s4_living.py [three_dir] [only-substring]
Screenshots: production/qa/evidence/s4-living-*.png. Exit 1 on a failed check or page error.
"""
import os, sys, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '-' else '/tmp/claude-0/npm/node_modules/three'
ONLY = sys.argv[2] if len(sys.argv) > 2 else ''
BASE = 'http://localhost:8124/tests/visual/furniture-demo.html'
EVID = os.path.join(ROOT, 'production', 'qa', 'evidence')
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
VIEWS = {'phone': (390, 844), 'desktop': (1440, 900)}
SETS = ['default', 'alt1', 'xmas']
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


def open_page(browser, view, query):
    w, h = VIEWS[view]
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1,
                              has_touch=view == 'phone', is_mobile=view == 'phone')
    page = ctx.new_page()
    page.set_default_timeout(180000)
    page.route('**/*', route)
    page.on('pageerror', lambda e: errors.append(f'{view} {query}: {e}'))
    page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(f'{view} {query} console: {m.text}'))
    page.goto(f'{BASE}?{query}')
    page.wait_for_function('() => window.__demo && window.__demo.frames > 2', timeout=60000)
    return ctx, page


def main():
    os.makedirs(EVID, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'])
        stats = {}
        for view in VIEWS:
            for theme in ['light', 'dark']:
                for s in SETS + ['alt2']:
                    name = f'{view}-{s}-{theme}'
                    if ONLY and not any(o in name for o in ONLY.split(',')):
                        continue
                    ctx, page = open_page(browser, view, f'room=living&theme={theme}&set={s}&ui=0')
                    page.wait_for_timeout(600)
                    page.screenshot(path=os.path.join(EVID, f's4-living-{name}.png'))
                    stats[name] = page.evaluate('() => window.__demo.stats()')
                    print(name, json.dumps({k: stats[name][k] for k in ('static', 'live', 'total')}))
                    ctx.close()
        # shop thumbnail framing (createFurniturePreview through the demo's preview view)
        for item, theme in [('sofa-xmas', 'light'), ('garland-xmas', 'dark'), ('xmas-tree', 'light'), ('fireplace-xmas', 'dark'), ('table-mug', 'light'), ('lamp-mushroom', 'light')]:
            name = f'preview-{item}-{theme}'
            if ONLY and not any(o in name for o in ONLY.split(',')):
                continue
            ctx, page = open_page(browser, 'phone', f'room=living&theme={theme}&preview={item}&pet=0&ui=0')
            page.set_viewport_size({'width': 360, 'height': 360})
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(EVID, f's4-living-{name}.png'))
            ctx.close()
        # API checks (one page)
        if not ONLY or 'api' in ONLY:
            ctx, page = open_page(browser, 'phone', 'room=living&ui=0')
            r = page.evaluate("""() => { const d = window.__demo, room = d.room; const v0 = room.staticVersion;
              const warn = []; const ow = console.warn; console.warn = (m) => warn.push(String(m));
              room.setFurniture({ corner: 'xmas-tree' }); const v1 = room.staticVersion;
              room.setFurniture({ corner: 'xmas-tree' }); const v2 = room.staticVersion;
              room.setFurniture({ sofa: 'nope', rug: 'mat-kitchen', zzz: 'sofa-cloud' }); const v3 = room.staticVersion;
              room.setTheme('dark'); const v4 = room.staticVersion; room.setTheme('dark'); const v5 = room.staticVersion;
              room.setFurniture({ corner: null }); console.warn = ow;
              const pv = d.createFurniturePreview('xmas-tree'); const fit = { r: pv.fit.radius, c: pv.fit.center.toArray() }; pv.dispose();
              return { v0, v1, v2, v3, v4, v5, warn: warn.length, corner: room.furniture.corner, slots: Object.keys(room.furniture).length, fit,
                inGroup: room.group.children.includes(room.staticGroup) && room.group.children.includes(room.liveGroup) }; }""")
            check('setFurniture bumps staticVersion', r['v1'] == r['v0'] + 1, str(r))
            check('same item is a no-op', r['v2'] == r['v1'])
            check('bad ids warn and are ignored', r['v3'] == r['v2'] and r['warn'] >= 3)
            check('theme change bumps staticVersion once', r['v4'] == r['v3'] + 1 and r['v5'] == r['v4'])
            check('null slot → default item', r['corner'] == 'plant-pot')
            check('all 7 slots filled', r['slots'] == 7)
            check('group holds static + live', r['inGroup'])
            check('preview fit radius sane', 0.3 < r['fit']['r'] < 3, str(r['fit']))
            pv = page.evaluate("""async () => { const d = window.__demo, out = {}; const { FURNITURE_ITEMS } = await import('/src/rooms/index.js'); const items = Object.entries(FURNITURE_ITEMS).filter(([, v]) => v.room === 'living').map(([k]) => k);
              for (const id of items) for (const th of ['light', 'dark']) { try { const p = d.createFurniturePreview(id, { theme: th }); let meshes = 0; p.object3d.traverse((m) => { if (m.isMesh) meshes++; });
                p.update(0.016, 1.0); out[id + ':' + th] = { r: +p.fit.radius.toFixed(2), meshes }; p.dispose(); } catch (e) { out[id + ':' + th] = { err: String(e) }; } }
              return out; }""")
            bad = {k: v for k, v in pv.items() if 'err' in v or not (0.15 < v['r'] < 3.5) or v['meshes'] < 1}
            check(f'createFurniturePreview works for all {len(pv) // 2} living items (light + dark)', len(pv) == 42 and not bad, json.dumps(bad) if bad else ', '.join(f"{k.split(':')[0]} r={v['r']}" for k, v in pv.items() if k.endswith(':light')))
            for rid in ['kitchen', 'bathroom']:
                n = page.evaluate(f"() => {{ window.__demo.setRoom('{rid}'); const r = window.__demo.room; return [r.drawCalls(), !!r.flush, Object.keys(r.furniture).length]; }}")
                check(f'{rid} still builds', n[0] > 0 and n[2] == 3, str(n))
            ctx.close()
        browser.close()
    sp = os.path.join(EVID, 's4-living-stats.json')
    old = {}
    if ONLY and os.path.isfile(sp):   # partial run: keep the other views' numbers
        with open(sp) as f:
            old = json.load(f)
    with open(sp, 'w') as f:
        json.dump({**old, **stats}, f, indent=1, sort_keys=True)
    for e in errors:
        print('  ERR ', e)
    failed = [r for r in results if not r[1]]
    print(f'{len(results) - len(failed)}/{len(results)} checks ok, {len(errors)} page errors')
    sys.exit(1 if failed or errors else 0)


if __name__ == '__main__':
    main()
