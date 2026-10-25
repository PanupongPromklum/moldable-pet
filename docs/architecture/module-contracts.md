# Module contracts — Moldable Pet (Sprint 1)

Owner: kiln. Every team member codes against these interfaces so work can run in parallel.
Change a contract only through kiln; note the change at the bottom.

Plain ES modules, no build step. `index.html` (repo root) holds the import map:
`three` → `https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js`,
`three/addons/` → `https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/`.
Import Three as `import * as THREE from 'three'`. No other runtime dependency except
MediaPipe Tasks Vision 0.10.14, loaded dynamically only when the camera is turned on.

Reference implementation for look and feel: `prototypes/squish-pet/index.html`
(character body/face/deformers, mood engine, mouse + touch + hand gestures, SFX synth).

## Folder ownership

| Path | Owner |
|---|---|
| `index.html`, `src/main.js`, `src/engine/`, `src/game/`, `src/input/` | wire |
| `src/characters/` | clay |
| `src/rooms/`, `src/props/`, `design/art/asset-style-sheet.md` | prop |
| `src/ui/` (hud.js, hud.css, tokens.css, icons.js) | glaze |
| `src/audio/`, `design/narrative/voice-script.md` | echo |
| `assets/data/*.json`, `design/gdd/needs-system.md` | loop |

## World conventions
- Units: 1 = roughly the prototype body radius. Y up. Floor at y = 0.
- The pet stands at the room's `petSpot` (default `(0, 0, 0)`), feet on the floor, about 2 units tall, facing +Z (the camera).
- Camera (wire): perspective, fov ≈ 30°, around `(0, 1.2, 8)` looking at `(0, 1, 0)`; framing adapts so the pet fills ~45% of the screen height on a phone and stays centred on desktop.
- Rooms must look complete from x = −7 to 7 at the pet's depth (wide desktop screens), back wall at z ≈ −3, floor to z ≈ 4.
- Screen reserve for HUD: top 120 px and bottom 160 px on a 390×844 phone. Keep the pet and important props out of those bands.

## Character keys
`splat` ใหม่ · `pill` ปาม (no personality yet, shown as coming soon) · `gumdrop` มิน · `diamond` แอ๊ค · `cloud` ฟ้า · `flower` ไผ่ (default).
Playable in Sprint 1: splat, gumdrop, diamond, cloud, flower.

## Needs (loop defines numbers; everyone uses these ids)
`hunger` (อิ่ม), `toilet` (ห้องน้ำ), `fun` (สนุก), `social` (ใกล้ชิด).
Each is a **level 0..1 where 1 = satisfied** (hunger 1 = full, toilet 1 = no need to go).

## Food ids (loop numbers, prop meshes, glaze tray icons)
`onigiri` ข้าวปั้น · `banana` กล้วย · `cupcake` คัพเค้ก · `apple` แอปเปิล · `bun` ซาลาเปา · `milk` นม

## Data files — loop (`assets/data/`)
- `needs.json`: `{ "needs": { "<id>": { "label": "อิ่ม", "start": 0.8, "decayPerHour": 0.12, "low": 0.3, "urgent": 0.12 } }, "actions": { "petPerSecond": {"social": 0.04, "fun": 0.02}, "pokeFun": 0.01, "stretchFunPerSecond": 0.02, "squishFunPerSecond": 0.02, "flush": {"toilet": 1}, "eatToiletCost": 0.08 }, "offlineCapHours": 12 }`
- `foods.json`: `{ "foods": [ { "id": "onigiri", "name": "ข้าวปั้น", "hunger": 0.3, "fun": 0.0, "toilet": -0.08 } ], "likes": { "<charKey>": ["<foodId>"] }, "dislikes": { "<charKey>": ["<foodId>"] } }`
- `personas.json`: per character key `{ "name", "ignoreSeconds", "petGain", "playGain", "pokeAnnoy", "stretchAnnoy", "squishAnnoy", "grabExpr", "hurtExpr", "lonelyExpr", "lines": { "<event>": ["…", "…"] } }`. Events: `hello, poke, pokeSpam, pet, grab, stretchBig, boing, squish, squishHard, lonely, sleepy, slap, back, hungry, eatLike, eatOk, eatDislike, full, toiletNeed, carried, relieved, flush, cameraHello`. `pill` gets neutral short lines.
Exact shape may grow; keys above must exist.

## Character — clay (`src/characters/character.js`)
```js
import { createCharacter, CHARACTER_KEYS } from './characters/character.js';
const pet = createCharacter('flower');   // synchronous
scene.add(pet.object3d);                 // THREE.Group, origin at the feet
pet.update(dt, time);                    // every frame
pet.setExpression(name);                 // original|smile|joy|surprised|sad|wink|sleepy|grumpy|shy|hungry|eat
pet.play(action);                        // hop|shake|nod|jelly|tilt|sway|chew|gulp|wiggle|shiver|yawn ; returns duration (s)
pet.isBusy();                            // an action is playing
pet.lookAt(worldPointOrNull);            // eyes + head follow, null = idle gaze
pet.setMouthOpen(t);                     // 0..1 override (food near, talk-back); <0 releases override
pet.setTalkLevel(level);                 // 0..1 audio level → mouth flap while talking
pet.hitTest(raycaster);                  // → null | { point: Vector3 (world), local: Vector3, region: 'head'|'body'|'mouth' }
pet.poke(worldPoint, strength=1);        // dent that springs back
const g = pet.beginGrab(worldPoint);     // soft-body stretch handle
g.move(worldPoint); g.release();         // release returns stretch amount 0..1 (for boing reaction)
pet.setSquish(x, y);                     // 0..0.45 each, x = side squeeze, y = top press
pet.setCarried(bool);                    // dangling pose while carried
pet.setSitting(bool);                    // sitting pose (toilet)
pet.getMouthWorld(outVec3); pet.getHeadTopWorld(outVec3);
pet.dispose();
```
Body shapes, colours and face data come from the prototype `DATA` (move it to `src/characters/shapes.js`). Keep vertex count mobile-friendly (≈ icosahedron detail 40 on touch devices, 56 on desktop).

## Rooms and props — prop (`src/rooms/`, `src/props/`)
```js
import { createRoom, ROOM_IDS } from './rooms/index.js';   // ROOM_IDS = ['living', 'kitchen', 'bathroom']
const room = createRoom('kitchen');      // synchronous
scene.add(room.group);
room.petSpot;                            // Vector3 where the pet stands
room.lights;                             // optional extra lights already inside room.group
room.dropZones;                          // { toilet?: { position: Vector3, radius: number }, mouthHint?: … }
room.toiletSeat;                         // bathroom only: Vector3 where the pet sits
room.flush();                            // bathroom only: plays the flush animation, returns duration (s)
room.update(dt, time);
room.dispose();

import { createFoodMesh } from './props/foods.js';
const food = createFoodMesh('banana');   // THREE.Group about 0.45 units across, origin at its centre
```
Shared clay material helpers in `src/props/clay.js` (matte, rounded). Ambient + key lighting is set by wire's stage; rooms may add soft fill/accent lights only.

## HUD — glaze (`src/ui/hud.js` + `hud.css` + `tokens.css` + `icons.js`)
```js
import { createHUD } from './ui/hud.js';
const hud = createHUD(document.getElementById('hud'), {
  onRoom(dirOrId) {},            // -1 | +1 | 'living' | 'kitchen' | 'bathroom'
  onAction(id) {},               // 'flush' | 'play'
  onMic() {}, onCamera() {}, onSettings() {},
  onSelect(charKey) {},
  onFoodPointerDown(foodId, pointerEvent) {},   // start of a drag from the tray
});
hud.setNeeds({ hunger, toilet, fun, social });  // 0..1
hud.setCoins(n);
hud.setRoom(id);                         // updates dots, title, contextual buttons, tray visibility
hud.setCharacter({ key, name });
hud.say(text, ms);                        // speech bubble
hud.placeBubble(x, y);                    // screen px of the pet's head top, called every frame
hud.toast(text, ms);
hud.coach(textOrNull);                    // coach mark
hud.setMic(state);                        // 'off' | 'listening' | 'recording' | 'playing'
hud.setCamera(state, message);            // 'off' | 'loading' | 'on' | 'error'
hud.setFoods(foods);                      // [{ id, name }] for the kitchen tray
hud.setFlushVisible(bool);
hud.showSelect(chars, currentKey); hud.hideSelect();   // chars: [{ key, name, role, mbti, locked }]
hud.foodElementAt(x, y);                  // → foodId | null (used by hand tracking)
hud.isHudPoint(x, y);                     // true when (x, y) is over an interactive HUD element
```
The HUD root covers the viewport with `pointer-events: none`; only controls take pointer events. Light theme, tokens from design.md + approved values (primary #5A68B5). Works from 360 px phones to 1920 px desktops: on wide screens HUD clusters sit in a centred column max 520 px wide. New icons (food, toilet, mic, camera, gear, hand) drawn on a 24 px grid, stroke 1.5, round caps — kept in `icons.js` only, never added to the Figma DS.

## Audio — echo (`src/audio/`)
```js
import { sfx } from './audio/sfx.js';
sfx.unlock();                              // call on first user gesture
sfx.play(name, { volume } = {});           // pop|pick|boing|chirp|squish|slap|chew|gulp|flush|sparkle|whoosh|tap|giggle|yawn
sfx.setEnabled(bool);
import { createTalkback } from './audio/talkback.js';
const tb = createTalkback({ onState(state) {}, onLevel(level) {} });  // state: off|listening|recording|playing
await tb.start(); tb.stop(); tb.isOn();
```
Talk-back: mic permission only on the first press; voice activity detection; record the phrase; play it back pitched up (+5 to +7 semitones, chipmunk-ish but clear); `onLevel` drives the mouth during playback; ignore the pet's own playback (do not re-trigger).

## Game core — wire
`src/main.js` boots: load `assets/data/*.json` → stage → room manager → character → HUD → audio → input (pointer + optional hands) → mood/needs loop. Needs decay from wall-clock time (`Date.now()`), saved in `localStorage` key `moldable-pet:v1` (try/catch everywhere), offline catch-up capped by `offlineCapHours`.

Input (mouse, touch and webcam hands share one gesture layer):
- tap/click pet = poke · drag on pet = stretch · long-press pet 0.5 s without moving = pick up and carry · two-finger pinch / mouse wheel on pet = squish · rub back and forth above the head = pet · swipe on empty space or HUD arrows/keys ←→ = change room.
- Kitchen: drag a food from the tray toward the pet; the mouth opens as it nears; drop within the mouth radius = eat; elsewhere = food returns.
- Bathroom: carry the pet onto the toilet zone → pet sits → "กดชักโครก" → flush → toilet = 1.
- Camera (HUD button): video behind the room (mirrored, semi-transparent), hand skeleton overlay. Point = poke, pinch = grab/stretch, pinch-hold still 0.6 s on the pet = carry, open palm rub over head = pet, palm press from above = squish, two palms = side squish, fast swipe = startle, pinch over a tray food = pick it up.

## Owner decisions (2026-10-25, after Loop's questions)
- **Needs are per character.** `state.js` keeps a needs set for every character key; switching characters shows that character's own needs. Every character's needs keep decaying in real time, playable or not on screen.
- **Return after absence** (gap ≥ `needs.json backAfterMinutes`): pick a reaction style at random using `personas.json <key>.returnStyles` weights — `gentle` (smile + `back` line), `dramatic` (persona `hurtExpr` + `lonely` then `back` line, a short shake), `sleepy` (`sleepy` expression + yawn + `sleepy` line, then `back`).
- ไผ่'s loneliness timing and the toilet warning thresholds stay as Loop set them.

## Sprint 2 additions (2026-10-25, kiln)

### Owner feedback to fix
1. **Contrast in both themes.** Text on primary (#5A68B5) fills is white (#FFFFFF), never dark. Add a real **dark theme** (`prefers-color-scheme: dark`) that meets 4.5:1 for text and 3:1 for meter fills/rings/status against their surfaces; need levels and states must be readable in both themes. Declare `color-scheme: light dark` and `<meta name="color-scheme" content="light dark">` so browsers do not auto-invert ("force dark") the page. Rooms get a matching evening look in dark mode (`room.setTheme('light'|'dark')`).
2. **No settings button.** Remove the gear. Tapping the character chip (avatar + name, top-left) opens the character select. `onSettings` is removed; the chip calls `onCharacterChip()`.
3. **Toilet flow shows one control at a time.** Before sitting: one coach mark "ลากตัวไปที่ชักโครก" (no button). While sitting: one primary button "กดชักโครก" (no coach mark, room nav hidden). After flushing: back to normal. Never show a coach and a button with the same words together.
4. **Camera view options.** When the camera is on, a toggle "ซ่อนภาพกล้อง / แสดงภาพกล้อง". Hidden = the room shows normally (no video) and only soft stylized hands are drawn (rounded clay-like hands in a brand tint with a light outline, not a skeleton). Shown = current AR view. The choice is saved.

### Outfits — clay (3D), loop (catalog), glaze (UI), wire (state)
Slots: `head`, `eyes`, `body`. One item per slot (equipping replaces the item in that slot; items in different slots never overlap visually). Fits all six characters.
Item ids (fixed): head `hat-beanie` (หมวกไหมพรม), `hat-party` (หมวกปาร์ตี้), `bow-ribbon` (โบว์), `crown-flower` (มงกุฎดอกไม้) · eyes `glasses-round` (แว่นกลม), `glasses-sun` (แว่นกันแดด), `glasses-star` (แว่นดาว) · body `tie-neck` (เน็คไท), `tie-bow` (หูกระต่าย), `scarf` (ผ้าพันคอ), `badge-star` (เข็มกลัดดาว).
```js
pet.setOutfit({ head: 'bow-ribbon', eyes: null, body: 'tie-neck' });  // null = empty slot
pet.getOutfit();
import { ACCESSORY_IDS, SLOT_OF } from './characters/accessories.js';
```
Clay places each item from per-shape anchors (head top, eye line and both eye centres, chest front below the mouth) so it sits correctly on every silhouette, follows squash/stretch, carry and sitting, and never covers the eyes or mouth (except eyewear over the eyes). Clay-style matte meshes, brand-tint colours.

`assets/data/wardrobe.json` (loop): `{ "slots": { "head": {"label":"หัว"}, "eyes": {"label":"ตา"}, "body": {"label":"ตัว"} }, "items": [ { "id", "slot", "name", "price", "starter": bool, "likes": ["<charKey>"] } ] }` — starter items are owned from the start; others cost coins.
Save (wire): `owned: [ids]` shared across characters; `chars[key].outfit: {head, eyes, body}` per character.
HUD (glaze): a wardrobe button "แต่งตัว" in the living room; `hud.showWardrobe({ slots, items, owned, outfit, coins, charKey })`, `hud.hideWardrobe()`, `hud.updateWardrobe(partial)`; handlers `onWardrobe()`, `onEquip(slot, idOrNull)`, `onBuy(id)` (confirmation inside the sheet, no browser dialogs). The pet stays visible while dressing (sheet covers at most the bottom 45%).

### Minigame "ฝนขนม" (Snack Rain) — loop (design + numbers), wire (logic), prop (meshes), glaze (HUD), echo (sfx)
Started from the living room "เล่น" button. 45 s round (data-driven). Snacks, coins and the occasional little "ปีศาจลูกค้า" (client-demon blob) fall from the top. The player moves the pet left/right — drag/touch anywhere, mouse move, arrow keys, or hand x-position with the camera — and the pet catches with its open mouth. Snack = points, coin = points + coin, demon = lose a little and the pet makes a "หงุดหงิด" face; streak multiplier. End: result card with score, coins earned, best score; fun and social rise, hunger drops a little. Coins are spent in the wardrobe.
`assets/data/minigames.json` (loop): `{ "snackRain": { "durationSec", "lanesOrWidth", "spawn": { "startPerSec", "endPerSec" }, "fallSpeed": { "start", "end" }, "items": { "snack": {"weight","points"}, "coin": {"weight","points","coins"}, "demon": {"weight","points"} }, "streak": { "step", "maxMultiplier" }, "coinsPerPoints": n, "maxCoinsPerRound": n, "needs": { "fun", "social", "hunger" } } }`.
Prop: `createCoinMesh()`, `createDemonMesh()` (cute small grumpy blob, clay style) in `src/props/minigame.js`.
HUD: `hud.startMinigame({ title, durationSec })`, `hud.updateMinigame({ score, timeLeft, streak, coins })`, `hud.showMinigameResult({ score, best, coins })`, `hud.endMinigame()`; handlers `onMinigameExit()`, `onMinigameAgain()`. Normal HUD (needs, nav, mic, tray) hides during play; a 3-2-1 countdown.
Echo sfx names added: `coin`, `catch`, `bonk`, `tick`, `go`, `win`, `equip`, `buy`.
Coins: `hud.setCoins(n)` animates the change.

## Change log
- 2026-10-25 v1 — kiln.
- 2026-10-25 v1.1 — per-character needs, random return style (owner decisions).
- 2026-10-25 v2 — Sprint 2: contrast + dark theme, character chip instead of settings, one-control toilet flow, hidden-camera hands, outfits, Snack Rain minigame + coins.
