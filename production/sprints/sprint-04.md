# Sprint 4 — แต่งห้อง + คริสต์มาส + ฉากอบ + ไอคอนแบบใหม่ (ตัวอย่าง)

Start: 2026-11-06 · Producer: Kiln · Contract: `docs/architecture/module-contracts.md` → "Sprint 4 additions" (v4)

## Owner interview (2026-11-06)
| Question | Answer |
|---|---|
| Furniture system | Swap per slot, bought with coins |
| Christmas set | On sale all year (own category) |
| Growth / evolution | C — pick a character, it grows with age; raised personality at full growth |
| Conversation | Free keyword + scripted lines now, designed so AI can plug in later |
| New minigames | จำท่าทาง, เป่าฟองสบู่, กระโดดข้ามก้อน |
| Icon style | Filled Moldable symbols (Figma "Style Guide Categories", node 2507-1823) — same brand gradient for every icon |
| Growth pace | A few hours of play to full growth |
| Split | 2 sprints: S4 = this file, S5 = growth/personality + conversation + 3 minigames |
| Icons | Owner wants to see samples before they replace the HUD icons |

## Stories
| ID | Owner | Story | Type |
|---|---|---|---|
| S4-01 | loop | `furniture.json` (13 slots, 39 items, prices), Christmas outfit prices + `theme` in wardrobe.json, economy note | Config |
| S4-02 | prop-living | Living room: static/live split, 7 slots × 3 items, more detail and cuteness | Visual |
| S4-03 | prop-utility | Kitchen + bathroom: static/live split, 3 slots × 3 items each, more detail | Visual |
| S4-04 | clay | Christmas outfits ×5 on all six silhouettes | Visual |
| S4-05 | glaze | Furniture shop sheet + "แต่งห้อง" button; Christmas outfit thumbnails in the wardrobe; icon sample board | UI |
| S4-06 | wire | Bake engine, furniture state + save v4, shop wiring, thumbnails, perf numbers before/after | Integration |
| S4-07 | echo | `place`, `jingle`, `preview` SFX | Audio |
| S5-D1 | loop | GDD: growth stages + raised personality (`design/gdd/growth-personality.md`) | Design |
| S5-D2 | loop | GDD: 3 minigames (`design/gdd/minigames-2.md`) | Design |
| S5-D3 | echo | GDD: conversation (`design/gdd/conversation.md`) | Design |

## Definition of done
Unit tests pass; Playwright smoke on 390×844 and 1440×900, light + dark, no page errors; screenshots in `production/qa/evidence/` for every room with defaults and with the Christmas set, the shop sheet, Christmas outfits on every character, and the icon sample board; bake on/off draw-call and frame-time numbers recorded below.

## Results

### S4-06 bake — before / after (wire, 2026-11-07)
Method (same every run, `tests/visual/s4_perf.py`): Playwright Chromium + SwiftShader software GL; phone 390×844 touch, deviceScaleFactor 3 (stage caps DPR at 1.75 → 682×1477 buffer, MSAA); desktop 1440×900 mouse, DPR 1. Per room: wait 1.5 s after the slide ends, sample 5 s of rAF intervals; draw calls / triangles = `renderer.info` of the last frame, all passes. Software GL is ~100× slower than a phone GPU, so read frame times **relatively**. JSON: `production/qa/evidence/s4-perf-{before,after-nobake,after}.json`.

Cells: draw calls / triangles / frame avg ms / frame p95 ms.

| Room | View | Before (Sprint 3 rooms, live) | After, `?nobake` (S4 rooms, all live) | After, baked |
|---|---|---|---|---|
| living | phone | 12 / 59.5k / 1178 / 1450 | 28 / 116.2k / 4258 / 4533 | **10 / 37.8k / 771 / 917** |
| kitchen | phone | 11 / 66.4k / 919 / 1000 | 16 / 105.6k / 3183 / 3583 | **9 / 35.8k / 878 / 1200** |
| bathroom | phone | 14 / 60.0k / 723 / 783 | 20 / 112.1k / 2511 / 2733 | **12 / 42.7k / 824 / 1200** |
| living | desktop | 13 / 93.7k / 1287 / 1367 | 29 / 149.1k / 4872 / 5050 | **10 / 70.7k / 1036 / 1167** |
| kitchen | desktop | 11 / 99.3k / 1230 / 1283 | 17 / 138.8k / 4422 / 5116 | **9 / 68.8k / 869 / 1200** |
| bathroom | desktop | 14 / 92.9k / 1423 / 1533 | 20 / 145.0k / 5378 / 6283 | **12 / 75.6k / 1333 / 1700** |

Reading: the S4 rooms carry about 2× the static detail (70–78k static triangles per room). Rendered live that costs 3–5× the frame time; baked, each frame draws only the live parts + pet + one full-screen composite, so frames are back at or below the Sprint 3 level with fewer draw calls and 30–40% fewer triangles than before. A bake costs one frame (~250–650 ms in software GL, a few ms on a GPU) and happens only on room switch, furniture change, theme, resize/DPR or framing change. What is left per frame is mostly the pet (7 calls, 35.6k triangles on phone, 68.5k on desktop) — the next perf lever is Clay's pet mesh density on phones. A baked frame matches the live one (mean pixel difference 1.8/255 on the living room, differences only on anti-aliased edges and the animated pet).

Quality hook: `stage.setQuality({ bake, dprTouch, dprMouse })` (defaults bake on, DPR caps 1.75 touch / 2 mouse); no UI yet. `?nobake` turns the bake off for A/B.

### Kiln integration (2026-11-07)
- Owner approved the filled icon board (2026-11-07 01:05); Glaze switched the live HUD (meters, coin, แต่งห้อง, เล่น) — other buttons keep line icons. Dark "bad state" ground is now muted #3A2E33 (was #731412).
- Tests: unit 115/115 (8 files) · `s4_smoke.py` 65/65 phone + desktop · `s3_smoke.py` 49/49 · `s4_utility.py` 30/30 · `s4_living.py` 11/11 · 0 page errors.
- Evidence: `s4-wire-*` (real game, phone + desktop, baked, decor preview/buy, Christmas living light/dark, minigame view), `s4-living-*`, `s4-kitchen-*`, `s4-bathroom-*`, `s4-xmas-outfits-*`, `s4-decor-*`, `s4-wardrobe-xmas-*`, `s4-icon-samples-*`, `s4-hud-filled-*`.
- Agents were cut off twice by session pauses and relaunched to continue from disk; Wire's work was complete on disk (smoke passes) though its final report never arrived.

### Open for the owner (defaults apply if no answer)
1. Christmas tints (berry, sage, soft gold, cocoa…) are [เสนอ] — approve into the brand guideline? [use as is]
2. Snow turns dusky mauve at night like the rest of the evening look. [keep]
3. Decor/Christmas price pace A steady / B lighter / C collector [A — full Christmas set ≈ 76 Snack Rain rounds]
4. Conversation (S5): speech recognition sends voice to Google/Apple — OK with a one-time Thai notice + "ใช้พูดตามแทน" option? [yes]
5. Growth (S5): 45 / 180 engaged minutes to kid / grown, no offline growth, played characters start as kid. [yes]
6. Typed chat "พิมพ์คุย" alongside voice (S5). [yes]

### Next
Sprint 5: growth + raised personality, conversation (keyword brain), minigame picker + จำท่าทาง / เป่าฟองสบู่ / กระโดดข้ามก้อน. Perf: pet mesh density on phones is the next lever; graphics quality setting UI (hook exists).
