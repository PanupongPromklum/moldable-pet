"""Re-render the character portraits (select cards) and round avatars from the live 3D model.

Run:  python3 -m http.server 8122   (repo root, another shell)
      python3 tools/render-portraits.py [three_dir]
Writes assets/ui/characters/char_<name>.png (full body, transparent) and ava_<name>.png (round avatar:
dark circle like Figma 9JQVk9nzZTidPDIQkeddkc node 4966:803, character head + face inside).
"""
import base64, io, os, sys
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/npm/node_modules/three'
CDN = 'https://cdn.jsdelivr.net/npm/three@0.162.0/'
OUT = os.path.join(ROOT, 'assets', 'ui', 'characters')
NAMES = {'splat': 'mai', 'pill': 'two', 'gumdrop': 'min', 'diamond': 'ack', 'cloud': 'fah', 'flower': 'pai'}
AVA_BG = (12, 13, 13, 255)      # Figma avatar circle
AVA = 256                        # avatar px (shown at 36–64 px, 2–4x for sharp phones)


def route(r):
    url = r.request.url
    if url.startswith(CDN):
        p = os.path.join(THREE, url[len(CDN):].split('?')[0])
        return r.fulfill(path=p, content_type='application/javascript') if os.path.isfile(p) else r.fulfill(status=404, body='')
    return r.continue_() if url.startswith('http://localhost') else r.abort()


def img(data_url):
    return Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1]))).convert('RGBA')


def trim(im, pad=6):
    bb = im.getbbox()
    if not bb: return im
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    page = b.new_context(viewport={'width': 640, 'height': 640}).new_page()
    page.on('pageerror', lambda e: print('PAGEERR', e))
    page.route('**/*', route)
    page.goto('http://localhost:8122/tools/render-portraits.html')
    page.wait_for_function('window.ready === true', timeout=120000)
    for k, n in NAMES.items():
        full = trim(img(page.evaluate(f"window.renderPortrait('{k}', 'full')")))
        full.thumbnail((360, 360), Image.LANCZOS)
        full.save(os.path.join(OUT, f'char_{n}.png'), optimize=True)
        face = img(page.evaluate(f"window.renderPortrait('{k}', 'face')")).resize((AVA * 2, AVA * 2), Image.LANCZOS)
        S = AVA * 2
        bg = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ImageDraw.Draw(bg).ellipse((0, 0, S - 1, S - 1), fill=AVA_BG)
        bg.alpha_composite(face)
        mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).ellipse((0, 0, S - 1, S - 1), fill=255)
        out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(bg, (0, 0), mask)
        out.resize((AVA, AVA), Image.LANCZOS).save(os.path.join(OUT, f'ava_{n}.png'), optimize=True)
        print('ok', k)
    b.close()
