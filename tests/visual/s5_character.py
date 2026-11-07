"""S5-02 character bench (clay): growth stages, trait marks, baby + Christmas outfit, mimic poses.
Renders tests/visual/character-demo.html?bench through window.renderCells and saves evidence:
  production/qa/evidence/s5-growth-*.png, s5-trait-*.png, s5-mimic-poses-*.png
Also checks world-space queries scale with growth (head top, mouth, hit test, outfit kept).

Run:  python3 tests/visual/s5_character.py [three_dir]     (starts its own static server on :8125)
Software GL (swiftshader); checks read state, never frame timing. Exit 1 on a failed check or page error.
"""
import os, sys, subprocess, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
PORT = 8125
URL = f'http://localhost:{PORT}/tests/visual/character-demo.html?bench'
EVID = os.path.join(ROOT, 'production', 'qa', 'evidence')
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
KEYS = ['splat', 'pill', 'gumdrop', 'diamond', 'cloud', 'flower']
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


def cells(page, name, cells_js, cols, rows, opts='{}'):
    out = page.evaluate(f'() => renderCells({cells_js}, {cols}, {rows}, {opts})')
    page.screenshot(path=os.path.join(EVID, name), timeout=180000)
    return out


def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
            page = b.new_page(viewport={'width': 1200, 'height': 800})
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
            page.route('**/*', route)
            page.goto(URL)
            page.wait_for_function('window.__ready === true && !!window.renderCells', timeout=120000)

            # 1. growth: each character baby / kid / grown at true relative size (one shared camera)
            for k in KEYS:
                js = json.dumps([{'key': k, 'growth': st, 'label': f'{k} · {st}'} for st in ['baby', 'kid', 'grown']])
                out = cells(page, f's5-growth-{k}.png', js, 3, 1, '{ "dist": 6.2, "lookY": 0.95 }')
                hs = [o['height'] for o in out]
                check(f'growth {k}: heights baby < kid < grown', hs[0] < hs[1] < hs[2], ', '.join(f'{h:.2f}' for h in hs))
            # all six at baby, face close-up (phone-size read)
            js = json.dumps([{'key': k, 'growth': 'baby', 'expr': 'smile', 'label': k} for k in KEYS])
            cells(page, 's5-growth-all-baby.png', js, 3, 2, '{ "dist": 4.6, "lookY": 0.75 }')
            js = json.dumps([{'key': k, 'growth': 'baby', 'expr': 'surprised', 'label': k + ' surprised'} for k in KEYS])
            cells(page, 's5-growth-all-baby-surprised.png', js, 3, 2, '{ "dist": 4.6, "lookY": 0.75 }')

            # 2. baby + Christmas outfit, every character; one with round glasses at kid
            js = json.dumps([{'key': k, 'growth': 'baby', 'outfit': {'head': 'hat-santa', 'eyes': 'glasses-snow', 'body': 'scarf-xmas'}, 'label': k} for k in KEYS])
            out = cells(page, 's5-growth-baby-xmas.png', js, 3, 2, '{ "dist": 4.8, "lookY": 0.8 }')
            check('baby xmas: outfit kept on every character', all(o['outfit']['head'] == 'hat-santa' and o['outfit']['eyes'] == 'glasses-snow' for o in out))
            js = json.dumps([{'key': k, 'growth': 'baby', 'outfit': {'head': 'antlers', 'eyes': 'glasses-round', 'body': 'bell-collar'}, 'label': k} for k in KEYS])
            cells(page, 's5-growth-baby-xmas-2.png', js, 3, 2, '{ "dist": 4.8, "lookY": 0.8 }')

            # 3. trait marks: each trait on all six (grown), plus baby
            for t in ['cheerful', 'cuddly', 'playful', 'foodie', 'stylish']:
                extra = {}
                if t == 'stylish': extra = {'outfit': {'head': 'bow-ribbon'}}
                js = json.dumps([{'key': k, 'trait': t, 'label': f'{k} · {t}', **extra} for k in KEYS])
                if t == 'foodie':   # crumbs show after eating
                    js = js.replace('"label"', '"action": "chew", "actionT": 0.95, "label"')
                out = cells(page, f's5-trait-{t}.png', js, 3, 2, '{ "dist": 4.4, "lookY": 0.95 }')
                check(f'trait {t}: set on all six', all(o['trait'] == t for o in out))
            js = json.dumps([{'key': k, 'trait': t, 'growth': 'baby', 'label': f'{k} · {t} · baby'} for k, t in zip(KEYS, ['cheerful', 'cuddly', 'playful', 'foodie', 'stylish', 'cuddly'])])
            cells(page, 's5-trait-baby.png', js.replace('"trait": "foodie",', '"trait": "foodie", "action": "gulp", "actionT": 0.9,'), 3, 2, '{ "dist": 4.0, "lookY": 0.7 }')
            js = json.dumps([{'key': 'flower', 'trait': t, 'outfit': {'head': 'hat-santa', 'eyes': 'glasses-star', 'body': 'tie-bow'}, 'label': t} for t in ['cheerful', 'cuddly', 'playful', 'foodie', 'stylish']] + [{'key': 'diamond', 'trait': 'foodie', 'outfit': {'body': 'tie-neck'}, 'label': 'diamond foodie + tie'}])
            cells(page, 's5-trait-with-outfits.png', js.replace('"trait": "foodie", "outfit": {"head"', '"trait": "foodie", "action": "chew", "actionT": 0.95, "outfit": {"head"'), 3, 2, '{ "dist": 4.4, "lookY": 0.95 }')

            # 4. mimic poses: six poses, frozen at a readable frame, at phone-like cell size
            poses = page.evaluate('() => window.__mimic || null')
            for k in ['flower', 'cloud', 'diamond']:
                js = f'''(await import('../../src/characters/character.js')).MIMIC_POSES.map(p => ({{ key: '{k}', expr: p.expression, action: p.action, actionT: {{ nod: .22, hop: .16, tilt: .5, sway: .35, wiggle: .3, jelly: .12 }}[p.action], label: p.label + ' · ' + p.id }}))'''
                out = page.evaluate(f'async () => renderCells({js}, 3, 2, {{ dist: 5.6, lookY: 0.95 }})')
                page.screenshot(path=os.path.join(EVID, f's5-mimic-poses-{k}.png'), timeout=180000)
                check(f'mimic {k}: 6 poses rendered', len(out) == 6)
            # phone size: 390 px wide, 3×2 cells of 130 px
            page.set_viewport_size({'width': 390, 'height': 300})
            js = '''(await import('../../src/characters/character.js')).MIMIC_POSES.map(p => ({ key: 'gumdrop', expr: p.expression, action: p.action, actionT: { nod: .22, hop: .16, tilt: .5, sway: .35, wiggle: .3, jelly: .12 }[p.action], label: p.label }))'''
            page.evaluate(f'async () => renderCells({js}, 3, 2, {{ dist: 5.6, lookY: 0.95 }})')
            page.screenshot(path=os.path.join(EVID, 's5-mimic-poses-phone.png'), timeout=180000)
            page.set_viewport_size({'width': 1200, 'height': 800})

            # 5. API checks: world points scale with growth, hit test, transition eases, minigame min scale
            r = page.evaluate('''async () => {
              const M = await import('../../src/characters/character.js');
              const T = window.THREE, out = {};
              const p = M.createCharacter('gumdrop', { idle: false });
              p.setOutfit({ head: 'hat-santa', eyes: 'glasses-round', body: 'scarf' });
              const v = new T.Vector3(), m = new T.Vector3();
              p.update(1/60, 0); p.getHeadTopWorld(v); p.getMouthWorld(m); out.grownHead = v.y; out.grownMouth = m.y;
              p.setGrowth(window.STAGES.baby); p.update(1/60, .02); p.getHeadTopWorld(v); p.getMouthWorld(m); out.babyHead = v.y; out.babyMouth = m.y;
              out.babyHeight = p.height;
              const cam = new T.PerspectiveCamera(30, 1, .1, 60); cam.position.set(0, m.y, 6); cam.lookAt(0, m.y, 0); cam.updateMatrixWorld();
              const rc = new T.Raycaster(); rc.set(new T.Vector3(m.x, m.y, 6), new T.Vector3(0, 0, -1));
              const h = p.hitTest(rc); out.mouthHit = h && h.region;
              rc.set(new T.Vector3(0, v.y - .08, 6), new T.Vector3(0, 0, -1)); const hh = p.hitTest(rc); out.headHit = hh && hh.region;
              rc.set(new T.Vector3(0, out.grownHead - .05, 6), new T.Vector3(0, 0, -1)); out.missAboveBaby = p.hitTest(rc) === null;
              p.setGrowth(window.STAGES.grown, { transitionSec: 2.5 });
              let mid = null, t = .02; for (let i = 0; i < 75; i++) { t += 1/60; p.update(1/60, t); }
              mid = p.getGrowth(); out.midScale = mid.current.scale; out.midTransitioning = mid.transitioning;
              for (let i = 0; i < 120; i++) { t += 1/60; p.update(1/60, t); }
              out.endScale = p.getGrowth().current.scale; out.endTransitioning = p.getGrowth().transitioning;
              out.outfitAfter = p.getOutfit();
              p.setGrowth({ scale: Math.max(.7, 0.85) }); out.minigameScale = p.getGrowth().scale;
              p.setTraitMark('nope'); out.badTrait = p.getTraitMark();
              p.setTraitMark('playful'); out.trait = p.getTraitMark(); p.setTraitMark(null); out.cleared = p.getTraitMark();
              p.setGrowth({ scale: 99 }); out.clamped = p.getGrowth().scale;
              const b = p.beginGrab(v); b.move(v.clone().add(new T.Vector3(.3, 0, 0))); for (let i = 0; i < 10; i++) { t += 1/60; p.update(1/60, t); } out.grab = b.release();
              p.setSitting(true); p.setCarried(true); for (let i = 0; i < 20; i++) { t += 1/60; p.update(1/60, t); }
              p.dispose();
              return out;
            }''')
            print('  api', json.dumps(r))
            check('baby head top lower than grown', r['babyHead'] < r['grownHead'] * .8)
            check('baby height ~0.7 × grown', abs(r['babyHeight'] / (r['grownHead']) - .7) < .05, f"{r['babyHeight']:.3f} vs {r['grownHead']:.3f}")
            check('baby hit test: mouth region at mouth world point', r['mouthHit'] == 'mouth', str(r['mouthHit']))
            check('baby hit test: head region below head top', r['headHit'] == 'head', str(r['headHit']))
            check('baby hit test: miss where the grown head was', r['missAboveBaby'])
            check('transition mid-way between 0.7 and 1', .72 < r['midScale'] < .98 and r['midTransitioning'], f"{r['midScale']:.3f}")
            check('transition ends at 1', abs(r['endScale'] - 1) < 1e-6 and not r['endTransitioning'])
            check('outfit kept through growth', r['outfitAfter'] == {'head': 'hat-santa', 'eyes': 'glasses-round', 'body': 'scarf'})
            check('unknown trait → null', r['badTrait'] is None)
            check('trait set / cleared', r['trait'] == 'playful' and r['cleared'] is None)
            check('growth scale clamped', abs(r['clamped'] - 1.2) < 1e-6)
            check('grab works on a grown-from-baby pet', r['grab'] > 0)
            b.close()
    finally:
        srv.terminate()
    for e in errors: print('  page error:', e)
    check('no page errors', not errors, f'{len(errors)}')
    bad = [n for n, ok, _ in results if not ok]
    print(f'\n{len(results) - len(bad)} passed, {len(bad)} failed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
