# Graphics setting (high / low)

Owner 2026-11-24: a low-spec Android phone stuttered badly. Settings now has
**กราฟิก: สูง / ต่ำ** and, as its own choice, **ความลื่น: 60 / 30 FPS** (owner: "30fps มันต่ำไป",
so low no longer forces 30). Code: `src/engine/graphics.js` (levels, rules),
`src/engine/stage.js` (`setQuality`), `src/main.js` (`setGraphics`), `src/ui/settings.js` (the row).

## What low changes (all live, no reload)

| Knob | High | Low | Why it helps |
|---|---|---|---|
| Pixel ratio cap (touch / mouse) | 1.75 / 2 | 1 / 1 | A weak phone is limited by how many pixels it paints. A 1080p phone at 1.75× paints ~3× the pixels of 1×. |
| Pet body detail | 50 (touch) / 72 | 28 | The soft body is re-shaped on the CPU every frame it squishes (every vertex + normals, then sent to the GPU). ~⅓ of the vertices. |
| Pet sheen + clear coat | on | off | The two extra light layers are the most expensive pixel shader in the scene. Colour and shape stay. |
| Edge smoothing (MSAA) | on | **off** | The biggest single cost on a weak GPU: in the software-GL test it was half the frame time (15 → 30 fps on its own). Edges look a little stepped on low. It belongs to the GL context, so it cannot change live: choosing a level that needs the other one **restarts the game once** (saved first). The automatic step-down does not restart; it applies at the next visit. |
| Face textures (eyes + mouth) | 512 px, redrawn on every change | 256 px, at most 20 redraws a second | While you drag or poke, the eyes follow the finger and three canvases were redrawn and uploaded to the GPU every frame (`texSubImage2D` was 22% of the main-thread time in a drag). Now 6%. |
| Hand camera | 960 px video, every camera frame | 640 px video, at most 15 detections a second | The hand model runs on the main thread. Not measured with the real model (it cannot load in the test sandbox). |
| Hand skeleton layer | up to 2× | follows the pixel ratio (1×) | A smaller canvas to clear and upload every frame. |
| Room bake | on | on | Both levels draw the room once and reuse it as a picture (Sprint 4). It is worth keeping: without it the same scene ran 3× slower in the test. |

Frame rate (either level): **60** (default) or **30**. Both are caps, so a 120 Hz phone draws 60, not 120.
30 halves the work per second and the heat. The cap is measured from the last drawn frame
(`frameDue` in graphics.js), so a 60.5 Hz screen never drifts into a dropped frame.

## Changing rooms (both levels)

Rooms used to be rebuilt at every room change (~0.15 s on a desktop; ~0.5–0.7 s with a 4× slower CPU),
which froze a weak phone. Now (`game/rooms.js`) every room is built once behind the loading screen
(`warmAll`, with its shaders pre-compiled), then kept; a change only puts the kept room back in the scene.
A room change takes ~1 ms of script. Cost: ~0.5 s longer start on a desktop, more on a weak phone, once.

## What is still drawn every frame

Everything in a room that never moves (walls, floor, sofa, shelves, window, rug, …, ~70–80 k triangles)
is already drawn once into a picture and reused (engine/bake.js). Only what moves is drawn each frame:
the pet (the main cost, ~59 k triangles on high, ~16 k on low), and small animated bits: the toy ball,
swaying plant leaves, kitchen steam, bath bubbles, the duck and the toilet (~0.2–2 k triangles each).
Baking those would freeze them and save almost nothing.

Measured (`tests/visual/s8_graphics.py`, software GL, relative numbers only, phone 390×844 @3×):
high 4.6 fps, low 25.4 fps; pixels 1.0 M → 0.33 M; pet vertices 46 k → 15.5 k.
Dragging the pet (4× slower CPU): 6.9 → 8.3 fps before the antialias change; face texture upload 1133 → 286 ms per 4 s.
Room change: script time 510–711 ms → 1–3 ms (4× slower CPU).

## Rules

- The level belongs to the **device**: `localStorage['mp-graphics'] = {"level","by","fps"}`. It is not in the
  save, so cloud sync never carries a phone's "low" to a desktop.
- Boot order: `?gfx=high|low` → saved level → under automation (`navigator.webdriver`) high → a guess:
  touch device with ≤ 3 GB memory or ≤ 4 cores starts on low.
- First visits without a player choice: if the game runs under 24 fps for 4 s (after 3 s warm-up),
  it steps down to low once and shows a toast. A choice made in settings (`by: "player"`) is never changed.
- The automatic step-down does not rebuild the pet (it may be in the player's hand) and does not restart
  the game; the lighter body and no edge smoothing come with the next visit. A choice in settings restarts the game.
