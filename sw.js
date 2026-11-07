/* Moldable Pet service worker (wire). Installable web app + plays offline after the first visit.
 * Strategy: game files (same origin) = network first, cache fallback, so a new deploy shows up on the
 * next open; CDN libraries (three, fonts, MediaPipe) = cache first (versioned URLs never change).
 * Bump VERSION on every deploy that changes the file list. */
const VERSION = 'mp-20261107-1303';
const SHELL = ['./', 'assets/data/cloud.json', 'assets/data/conversation.json', 'assets/data/foods.json', 'assets/data/furniture.json', 'assets/data/growth.json', 'assets/data/minigames.json', 'assets/data/needs.json', 'assets/data/personas.json', 'assets/data/wardrobe.json', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-48.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-192.png', 'assets/icons/icon-maskable-512.png', 'assets/ui/characters/char_ack.png', 'assets/ui/characters/char_fah.png', 'assets/ui/characters/char_mai.png', 'assets/ui/characters/char_min.png', 'assets/ui/characters/char_pai.png', 'assets/ui/characters/char_two.png', 'index.html', 'manifest.webmanifest', 'src/audio/babble.js', 'src/audio/context.js', 'src/audio/dsp.js', 'src/audio/listen.js', 'src/audio/sfx.js', 'src/audio/talkback.js', 'src/characters/accessories.js', 'src/characters/actions.js', 'src/characters/character.js', 'src/characters/expressions.js', 'src/characters/face.js', 'src/characters/fit.js', 'src/characters/marks.js', 'src/characters/shapes.js', 'src/conversation/keyword-brain.js', 'src/conversation/normalize.js', 'src/engine/bake.js', 'src/engine/stage.js', 'src/engine/thumbs.js', 'src/game/care.js', 'src/game/cloud-rules.js', 'src/game/cloud.js', 'src/game/furniture.js', 'src/game/growth-rules.js', 'src/game/growth.js', 'src/game/minigames/bubbles-rules.js', 'src/game/minigames/bubbles.js', 'src/game/minigames/common-rules.js', 'src/game/minigames/hop-rules.js', 'src/game/minigames/hop.js', 'src/game/minigames/index.js', 'src/game/minigames/mimic-rules.js', 'src/game/minigames/mimic.js', 'src/game/minigames/round.js', 'src/game/minigames/snack-rain-rules.js', 'src/game/minigames/snack-rain.js', 'src/game/mood.js', 'src/game/needs.js', 'src/game/rooms.js', 'src/game/state.js', 'src/game/talk-rules.js', 'src/game/talk.js', 'src/game/timers.js', 'src/game/wardrobe.js', 'src/input/gestures.js', 'src/input/hands.js', 'src/input/head-rules.js', 'src/input/head.js', 'src/input/pointer.js', 'src/main.js', 'src/props/clay.js', 'src/props/foods.js', 'src/props/furniture/bathroom-items.js', 'src/props/furniture/kitchen-bath-shared.js', 'src/props/furniture/kitchen-items.js', 'src/props/furniture/living-basic.js', 'src/props/furniture/living-common.js', 'src/props/furniture/living-xmas.js', 'src/props/minigame-bubbles.js', 'src/props/minigame-hop.js', 'src/props/minigame-mimic.js', 'src/props/minigame-snack.js', 'src/props/minigame.js', 'src/rooms/bathroom.js', 'src/rooms/furniture.js', 'src/rooms/index.js', 'src/rooms/kitchen.js', 'src/rooms/living.js', 'src/rooms/shell.js', 'src/ui/hud-s5.js', 'src/ui/hud.css', 'src/ui/hud.js', 'src/ui/icons.js', 'src/ui/tokens.css'];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|storage\.googleapis\.com)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k.startsWith('mp-')).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
    return;
  }
  if (CDN.test(req.url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
