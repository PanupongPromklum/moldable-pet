"""S4-03 kitchen + bathroom evidence: furniture slots (defaults, alternatives, Christmas), light + dark,
phone 390x844 and desktop 1440x900, a thumbnail sheet of every item preview, draw calls /
triangles for staticGroup vs liveGroup, and API checks (setFurniture, toilet / flush / dropZones).

Run:  python3 -m http.server 8124   (from the repo root, in another shell)
      python3 tests/visual/s4_utility.py [three_dir] [only-substring]
Screenshots: production/qa/evidence/s4-kitchen-*.png, s4-bathroom-*.png, s4-utility-previews-*.png
Stats: production/qa/evidence/s4-utility-stats.json. Exit 1 on a failed check or page error.
"""
import os, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '-' else '/tmp/claude-0/npm/node_modules/three'
ONLY = sys.argv[2] if len(sys.argv) > 2 else ''
BASE = 'http://localhost:8124/tests/visual/furniture-demo.html'
EVID = os.path.join(ROOT, 'production', 'qa', 'evidence')
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
VIEWS = {'phone': (390, 844), 'desktop': (1440, 900)}
ROOMS = ['kitchen', 'bathroom']
SETS = ['default', 'alt1', 'xmas']
ITEMS = {
    'kitchen': ['fridge-classic', 'fridge-retro', 'fridge-gingerbread', 'shelf-jars', 'shelf-plants', 'wreath-xmas',
                'mat-kitchen', 'mat-fruit', 'mat-snow'],
    'bathroom': ['mirror-oval', 'mirror-cloud', 'mirror-holly', 'towel-rail', 'towel-stripes', 'stocking-xmas',
                 'mat-bath', 'mat-duck', 'mat-snow-bath'],
}
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


def open_page(browser, size, query, mobile=False):
    w, h = size
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, has_touch=mobile, is_mobile=mobile)
    page = ctx.new_page()
    page.route('**/*', route)
    page.on('pageerror', lambda e: errors.append(f'{query}: {e}'))
    page.on('console', lambda m: (m.type == 'error' and 'Failed to load resource' not in m.text or
                                  m.type == 'warning' and 'no builder registered' in m.text) and errors.append(f'{query} console: {m.text}'))
    page.goto(f'{BASE}?{query}')
    page.wait_for_function('() => window.__demo && window.__demo.frames > 2', timeout=120000)
    return ctx, page


def sheet(paths, out, cols=3):
    from PIL import Image
    ims = [Image.open(p) for p in paths]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    o = Image.new('RGB', (w * cols, h * rows), 'white')
    for i, im in enumerate(ims):
        o.paste(im, ((i % cols) * w, (i // cols) * h))
    o.save(out)
    for p in paths:
        os.remove(p)


def main():
    os.makedirs(EVID, exist_ok=True)
    stats = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'])
        for room in ROOMS:
            for view in VIEWS:
                for theme in ['light', 'dark']:
                    for s in SETS:
                        name = f'{room}-{view}-{s}-{theme}'
                        if ONLY and ONLY not in name:
                            continue
                        ctx, page = open_page(browser, VIEWS[view], f'room={room}&theme={theme}&set={s}&ui=0', view == 'phone')
                        page.wait_for_timeout(600)
                        page.screenshot(path=os.path.join(EVID, f's4-{name}.png'), timeout=240000)
                        stats[name] = page.evaluate('() => window.__demo.stats()')
                        print(name, json.dumps({k: stats[name][k] for k in ('static', 'live', 'total', 'frameCalls')}))
                        ctx.close()
        # thumbnail sheets (createFurniturePreview, one page per item)
        for room in ROOMS:
            for theme in ['light', 'dark']:
                if ONLY and ONLY not in f'preview-{room}-{theme}':
                    continue
                shots = []
                for item in ITEMS[room]:
                    ctx, page = open_page(browser, (260, 260), f'room={room}&theme={theme}&preview={item}&ui=0&pet=0')
                    page.wait_for_timeout(300)
                    path = os.path.join(EVID, f'_tmp-{item}.png')
                    page.screenshot(path=path, timeout=120000)
                    shots.append(path)
                    ctx.close()
                sheet(shots, os.path.join(EVID, f's4-utility-previews-{room}-{theme}.png'))
        # API checks
        if not ONLY or 'api' in ONLY:
            ctx, page = open_page(browser, VIEWS['phone'], 'room=bathroom&ui=0', True)
            r = page.evaluate("""() => { const d = window.__demo, room = d.room, v0 = room.staticVersion;
              const warn = []; const ow = console.warn; console.warn = (m) => warn.push(String(m));
              const live0 = room.liveGroup.getObjectByName('bathroom:toilet');
              room.setFurniture({ mirror: 'mirror-holly' }); const v1 = room.staticVersion;
              room.setFurniture({ mirror: 'mirror-holly' }); const v2 = room.staticVersion;
              room.setFurniture({ mirror: 'fridge-retro', towel: 'towel-rail', wall: 'nope' }); const v3 = room.staticVersion;
              room.setFurniture({ mirror: null }); console.warn = ow;
              const dur = room.flush(); let wobble = 0; const btn = room.liveGroup.getObjectByName('bathroom:flushHandle'); const by = btn.position.y;
              let minBtn = by; for (let i = 0; i < 40; i++) { room.update(1 / 30, i / 30); minBtn = Math.min(minBtn, btn.position.y); wobble = Math.max(wobble, Math.abs(live0.scale.y - 1)); }
              const staticToilet = !!room.staticGroup.getObjectByName('bathroom:toilet');
              return { v0, v1, v2, v3, warn: warn.length, mirror: room.furniture.mirror, slots: Object.keys(room.furniture),
                dur, pressed: by - minBtn, wobble, back: live0.scale.y, seat: room.toiletSeat && room.toiletSeat.toArray(),
                zone: room.dropZones.toilet && room.dropZones.toilet.radius, live: !!live0, staticToilet,
                pet: room.petSpot.toArray(), liveNames: room.liveGroup.children.map((c) => c.name) }; }""")
            check('bathroom setFurniture bumps staticVersion', r['v1'] == r['v0'] + 1, str(r['v0']) + '->' + str(r['v1']))
            check('bathroom same item is a no-op', r['v2'] == r['v1'])
            check('wrong slot / unknown ids warn and are ignored', r['v3'] == r['v2'] and r['warn'] >= 3, str(r['warn']))
            check('null slot -> default mirror', r['mirror'] == 'mirror-oval')
            check('bathroom slots', r['slots'] == ['mirror', 'wall', 'rug'], str(r['slots']))
            check('toilet is live, not baked', r['live'] and not r['staticToilet'])
            check('flush presses the button and wobbles, then settles', r['dur'] > 0 and r['pressed'] > 0.02 and r['wobble'] > 0.005 and abs(r['back'] - 1) < 1e-6,
                  f"dur {r['dur']} press {r['pressed']:.3f} wobble {r['wobble']:.3f}")
            check('toiletSeat + dropZones.toilet', r['seat'] is not None and r['zone'] and r['zone'] > 0, str(r['seat']))
            check('petSpot at the origin', r['pet'] == [0, 0, 0], str(r['pet']))
            print('  bathroom live:', r['liveNames'])
            k = page.evaluate("""() => { const d = window.__demo; d.setRoom('kitchen'); const room = d.room; const v0 = room.staticVersion;
              room.setFurniture({ fridge: 'fridge-gingerbread', wall: 'wreath-xmas', rug: 'mat-snow' });
              return { v0, v1: room.staticVersion, f: room.furniture, slots: Object.keys(room.furniture), pet: room.petSpot.toArray(),
                liveNames: room.liveGroup.children.map((c) => c.name) }; }""")
            check('kitchen slots', k['slots'] == ['fridge', 'wall', 'rug'], str(k['slots']))
            check('kitchen multi-slot swap bumps staticVersion once', k['v1'] == k['v0'] + 1)
            check('kitchen petSpot at the origin', k['pet'] == [0, 0, 0])
            print('  kitchen live:', k['liveNames'])
            pv = page.evaluate("""(items) => items.map((id) => { const p = window.__demo.createFurniturePreview(id); let meshes = 0;
              p.object3d.traverse((o) => { if (o.isMesh) meshes++; }); p.update(0.016, 1); const r = p.fit.radius; p.dispose(); return [id, r, meshes]; })""",
                               ITEMS['kitchen'] + ITEMS['bathroom'])
            for id_, rad, meshes in pv:
                check(f'preview {id_}', 0.25 < rad < 3.5 and meshes > 0, f'r {rad:.2f}, {meshes} meshes')
            ctx.close()
        browser.close()
    if stats:   # merge, so a partial run (only-substring) keeps the other entries
        sp = os.path.join(EVID, 's4-utility-stats.json')
        old = json.load(open(sp)) if os.path.isfile(sp) else {}
        old.update(stats)
        with open(sp, 'w') as f:
            json.dump(dict(sorted(old.items())), f, indent=1)
    for e in errors:
        print('  ERR ', e)
    failed = [r for r in results if not r[1]]
    print(f'{len(results) - len(failed)}/{len(results)} checks ok, {len(errors)} page errors')
    sys.exit(1 if failed or errors else 0)


if __name__ == '__main__':
    main()
