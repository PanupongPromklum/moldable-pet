# Graphics setting (high / low)

Owner 2026-11-24: a low-spec Android phone stuttered badly. Settings now has
**กราฟิก: สูง / ต่ำ**. Code: `src/engine/graphics.js` (levels, rules),
`src/engine/stage.js` (`setQuality`), `src/main.js` (`setGraphics`), `src/ui/settings.js` (the row).

## What low changes (all live, no reload)

| Knob | High | Low | Why it helps |
|---|---|---|---|
| Pixel ratio cap (touch / mouse) | 1.75 / 2 | 1 / 1 | A weak phone is limited by how many pixels it paints. A 1080p phone at 1.75× paints ~3× the pixels of 1×. |
| Frame cap | screen rate (60) | 30 fps | Half the work per second; less heat, so the phone does not throttle itself after a few minutes. |
| Pet body detail | 50 (touch) / 72 | 28 | The soft body is re-shaped on the CPU every frame it squishes (every vertex + normals, then sent to the GPU). ~⅓ of the vertices. |
| Pet sheen + clear coat | on | off | The two extra light layers are the most expensive pixel shader in the scene. Colour and shape stay. |
| Room bake | on | on | Both levels draw the room once and reuse it as a picture (Sprint 4). |

Measured (`tests/visual/s8_graphics.py`, software GL, relative numbers only, phone 390×844 @3×):
high 4.6 fps / pet update 7.9 ms, low 15.2 fps / 3.1 ms; pixels 1.0 M → 0.33 M; pet vertices 46 k → 15.5 k.

## Rules

- The level belongs to the **device**: `localStorage['mp-graphics'] = {"level","by"}`. It is not in the
  save, so cloud sync never carries a phone's "low" to a desktop.
- Boot order: `?gfx=high|low` → saved level → under automation (`navigator.webdriver`) high → a guess:
  touch device with ≤ 3 GB memory or ≤ 4 cores starts on low.
- First visits without a player choice: if the game runs under 24 fps for 4 s (after 3 s warm-up),
  it steps down to low once and shows a toast. A choice made in settings (`by: "player"`) is never changed.
- The automatic step-down does not rebuild the pet (it may be in the player's hand); the lighter body
  comes with the next character change or visit. A choice in settings rebuilds it at once.
