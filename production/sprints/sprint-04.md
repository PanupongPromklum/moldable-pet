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
_(filled at integration)_
