# Sprint 5 — เติบโต + นิสัย · พูดคุย · มินิเกมใหม่ 3 เกม

Start: 2026-11-07 · Producer: Kiln · Contract: `docs/architecture/module-contracts.md` → "Sprint 5 additions" (v5)
Owner: "ทำส่วนอื่นต่อเลย" — GDD defaults apply to every open question.

| ID | Owner | Story | Type |
|---|---|---|---|
| S5-01 | loop | `growth.json`, minigames.json (picker/mimic/bubbles/hop), conversation.json numbers, personas new events (growth, minigames, talk) for 5 characters + ปาม neutral | Config |
| S5-02 | clay | `setGrowth` (baby/kid/grown proportions), `setTraitMark` (5 marks), mimic-readable poses | Visual |
| S5-03 | echo | listen.js, babble.js, keyword brain + conversation.json intents/lines, `setPitchOffset`, sfx note/call | Logic + Audio |
| S5-04 | prop | bubble meshes, hop obstacles + ground strip, mimic stage bits | Visual |
| S5-05 | glaze | picker, mimic pads, growth card, select stage/progress, mic thinking/caption/hints/notice/mic sheet/typed chat | UI |
| S5-06 | wire-games | minigame registry + mimic, bubbles, hop (+ rules tests) | Logic |
| S5-07 | wire-core | save v5 + growth rules/wiring, conversation + typed chat wiring, picker wiring, smoke test | Integration |

## Definition of done
Unit tests pass; `s5_smoke.py` + earlier smokes pass at 390×844 and 1440×900, light + dark, no page errors; screenshots in `production/qa/evidence/s5-*` for baby/kid/grown + trait marks, picker, each game, growth card, conversation (talk notice, caption, typed chat).

## Results
_(filled at integration)_
