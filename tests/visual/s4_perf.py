"""Sprint 4 perf measurement (S4-06): draw calls, triangles, frame time per room.

Same method for "before" and "after" so the numbers compare:
  * Chromium + SwiftShader (software GL, 2 cores here): absolute fps is far below a
    real phone, so read the numbers as RELATIVE (bake vs live, before vs after).
  * Phone: 390x844, touch + mobile emulation, deviceScaleFactor 3 (a real phone;
    the stage caps it). Desktop: 1440x900, mouse, deviceScaleFactor 1.
  * Per room: wait 1.5 s after the room settles, then sample `seconds` s of
    requestAnimationFrame intervals (avg, p95), renderer.render() CPU time, and
    renderer.info (calls / triangles of the last frame, all passes summed).
  * Scene breakdown: draw calls + triangles per top-level scene child (room
    static / live, pet, other), transparent mesh count, pet vertex count.

Run:  python3 -m http.server 8122   (repo root, another shell)
      python3 tests/visual/s4_perf.py [url] [label] [three_dir]
      e.g.  python3 tests/visual/s4_perf.py 'http://localhost:8122/index.html?debug' after
            python3 tests/visual/s4_perf.py 'http://localhost:8122/index.html?debug&nobake' after-nobake
Writes JSON to production/qa/evidence/s4-perf-<label>.json and prints a table.
"""
import os, sys, json, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8122/index.html?debug'
LABEL = sys.argv[2] if len(sys.argv) > 2 else 'run'
THREE = sys.argv[3] if len(sys.argv) > 3 else '/tmp/claude-0/npm/node_modules/three'
SECONDS = float(os.environ.get('PERF_SECONDS', '5'))
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
EVID = os.path.join(ROOT, 'production', 'qa', 'evidence')


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


HOOK = """() => {
  const M = window.__moldablePet, st = M.stage, r = st.renderer;
  if (window.__perf) return;
  const P = window.__perf = { on: false, dts: [], renders: [], last: 0, calls: 0, tris: 0, passes: 0 };
  const orig = r.render.bind(r);
  let frameCalls = 0, frameTris = 0, framePasses = 0;
  r.render = (s, c) => { const t0 = performance.now(); orig(s, c); const dt = performance.now() - t0;
    if (P.on) P.renders.push(dt);
    frameCalls += r.info.render.calls; frameTris += r.info.render.triangles; framePasses++; };
  const raf = (t) => { if (P.on && P.last) P.dts.push(t - P.last); P.last = t;
    if (framePasses) { P.calls = frameCalls; P.tris = frameTris; P.passes = framePasses; }
    frameCalls = 0; frameTris = 0; framePasses = 0; requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}"""

BREAKDOWN = """() => {
  const M = window.__moldablePet, st = M.stage, r = st.renderer, scene = st.scene;
  const out = { groups: {}, transparent: 0, meshes: 0 };
  const count = (o, key) => {
    o.traverseVisible((m) => {
      if (!(m.isMesh || m.isPoints || m.isLine)) return;
      const g = out.groups[key] || (out.groups[key] = { calls: 0, tris: 0 });
      const geo = m.geometry; if (!geo) return;
      const n = geo.index ? geo.index.count : (geo.attributes.position ? geo.attributes.position.count : 0);
      const mats = Array.isArray(m.material) ? m.material.length : 1;
      g.calls += mats; g.tris += Math.round(n / 3) * (m.isInstancedMesh ? m.count : 1);
      out.meshes++; if ((Array.isArray(m.material) ? m.material : [m.material]).some((x) => x && x.transparent)) out.transparent++;
    });
  };
  const pet = M.getPet();
  const room = M.rooms.room;
  for (const ch of scene.children) {
    if (!ch.visible) continue;
    let key = ch.name || ch.type;
    if (pet && ch === pet.object3d) key = 'pet';
    else if (room && ch === room.group) {
      if (room.staticGroup && room.liveGroup) {
        // only what the stage actually draws live this frame
        const bakedNow = !!(st.bake && st.bake.stats().mode === 'baked');
        for (const sub of ch.children) count(sub, sub === room.staticGroup ? (bakedNow ? 'room.static(baked)' : 'room.static(live)') : (sub === room.liveGroup ? 'room.live' : 'room.other'));
        continue;
      }
      key = 'room';
    }
    else if (ch.isLight) continue;
    count(ch, key);
  }
  let petVerts = 0; if (pet) pet.object3d.traverse((m) => { if (m.isMesh && m.geometry?.attributes?.position) petVerts = Math.max(petVerts, m.geometry.attributes.position.count); });
  const gl = r.getContext();
  const caps = { pixelRatio: r.getPixelRatio(), buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], antialias: !!gl.getContextAttributes().antialias, petVerts,
    bake: st.bake ? st.bake.stats() : null, quality: st.quality ? st.quality.get?.() : null };
  return { ...out, caps };
}"""


def measure(page, room):
    page.evaluate(f"() => window.__moldablePet.rooms.go('{room}')")
    page.wait_for_function(f"() => {{ const M = window.__moldablePet; return M.rooms.id === '{room}' && !M.rooms.moving; }}", timeout=300000)   # software GL: a slide can take a minute
    time.sleep(1.5)
    page.evaluate("() => { const P = window.__perf; P.dts = []; P.renders = []; P.on = true; }")
    t0 = time.time()
    h0 = page.evaluate("() => performance.memory ? performance.memory.usedJSHeapSize : 0")
    time.sleep(SECONDS)
    h1 = page.evaluate("() => performance.memory ? performance.memory.usedJSHeapSize : 0")
    el = time.time() - t0
    d = page.evaluate("() => { const P = window.__perf; P.on = false; return { dts: P.dts, renders: P.renders, calls: P.calls, tris: P.tris, passes: P.passes }; }")
    dts = sorted(d['dts'][1:]) or [0]
    rs = sorted(d['renders']) or [0]
    p95 = lambda a: a[min(len(a) - 1, int(len(a) * 0.95))]
    bd = page.evaluate(BREAKDOWN)
    return {
        'room': room, 'frames': len(dts), 'fps': round(len(dts) / el, 2),
        'frameAvgMs': round(sum(dts) / len(dts), 1), 'frameP95Ms': round(p95(dts), 1),
        'renderAvgMs': round(sum(rs) / len(rs), 2), 'renderP95Ms': round(p95(rs), 2),
        'calls': d['calls'], 'tris': d['tris'], 'passes': d['passes'],
        'heapDeltaKB': round((h1 - h0) / 1024, 1), 'breakdown': bd,
    }


def run(pw, label, vp, touch, dsf):
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-precise-memory-info'])
    ctx = b.new_context(viewport=vp, device_scale_factor=dsf, has_touch=touch, is_mobile=touch)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.route('**/*', route)
    page.goto(URL)
    page.wait_for_function("document.documentElement.dataset.boot", timeout=60000)
    page.evaluate("() => { const M = window.__moldablePet; M.selectCharacter('flower'); }")
    page.evaluate(HOOK)
    rows = [measure(page, r) for r in ['living', 'kitchen', 'bathroom']]
    b.close()
    return {'viewport': f"{vp['width']}x{vp['height']}@{dsf}", 'touch': touch, 'rows': rows, 'errors': errs}


if __name__ == '__main__':
    os.makedirs(EVID, exist_ok=True)
    only = os.environ.get('ONLY')
    out = {'url': URL, 'label': LABEL, 'seconds': SECONDS}
    with sync_playwright() as pw:
        for name, vp, touch, dsf in [('phone', {'width': 390, 'height': 844}, True, 3), ('desktop', {'width': 1440, 'height': 900}, False, 1)]:
            if only and only != name:
                continue
            out[name] = run(pw, name, vp, touch, dsf)
    with open(os.path.join(EVID, f's4-perf-{LABEL}.json'), 'w') as f:
        json.dump(out, f, indent=1)
    for name in ['phone', 'desktop']:
        if name not in out:
            continue
        o = out[name]
        print(f"\n{LABEL} {name} {o['viewport']}  caps {json.dumps(o['rows'][0]['breakdown']['caps'])}")
        print(f"{'room':9} {'calls':>5} {'tris':>7} {'fps':>5} {'avg ms':>7} {'p95 ms':>7} {'render ms':>9} {'heap KB/5s':>10}  groups")
        for r in o['rows']:
            g = ' '.join(f"{k}:{v['calls']}/{v['tris']}" for k, v in r['breakdown']['groups'].items())
            print(f"{r['room']:9} {r['calls']:>5} {r['tris']:>7} {r['fps']:>5} {r['frameAvgMs']:>7} {r['frameP95Ms']:>7} {r['renderAvgMs']:>9} {r['heapDeltaKB']:>10}  {g}  transp:{r['breakdown']['transparent']}")
        if o['errors']:
            print('  page errors:', o['errors'][:3])
