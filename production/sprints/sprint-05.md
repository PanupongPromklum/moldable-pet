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

## Results (Kiln integration, 2026-11-07)
All seven agents stopped at the 5-hour usage limit (11:00). Owner: "do what you can yourself, avoid extra agents" — Kiln finished the rest directly.

**Finished by Kiln**
- Echo's missing modules: `src/conversation/keyword-brain.js` (3 passes, longest-first masking, short-keyword boundaries, negation, names, context variants, stage fallback, no-repeat, placeholders), `src/audio/listen.js`, `src/audio/babble.js`; `tests/unit/conversation.test.mjs` (19). sfx `note`, `call`, `setPitchOffset` (pet-voice sounds + talk-back follow the life-stage pitch).
- **Crash found and fixed:** calling `SpeechRecognition.available({ processLocally })` crashed the Chromium renderer seconds after boot. `listen.js` no longer calls it and reports `remote` (honest; the privacy notice already says Google/Apple).
- Prop ↔ game API mismatches: `createHopGround(width)` got an object (NaN geometry), its `{ object3d, scroll }` result was added as an Object3D, `createBubbleMesh(colorId, opts)` / `createPopBurst(colorId, opts)` got objects.
- Hop presentation: prop obstacles kept at native size with bottom origin (refit counted the shadow disc), obstacles drawn ×1.6 (hit box unchanged), play lane + pet moved to z +1.5 so the living-room toy ball no longer covers obstacles.
- Framing: Snack Rain / bubbles / hop reserve top 380 px so the pet and room sit lower and the empty strip under the floor shrinks.
- `decorCustom` added to the talk context; ไผ่'s snack-only win line reworded (now shared by all games).
- `tests/visual/s5_smoke.py` (stubbed recogniser): v5 save, baby → kid card → grown + trait, typed chat, privacy notice + talk turn, picker, each new game starts/exits, echo fallback.

**Tests:** unit 16 files all pass · `s5_smoke.py` 30/30 phone + desktop, 0 page errors · `s4_smoke.py` 65/65 · `s3_smoke.py` 49/49 (both updated for save v5 and the picker), 0 page errors.
**Evidence:** `s5-smoke-*`, `s5-kiln-hop-lane-phone.png`, `s5-kiln-bubbles-phone.png`, plus the agents' `s5-growth-*`, `s5-trait-*`, `s5-mimic-poses-*`, `s5-props-*`, `s5-game-*`.

**Open / not done**
- Real phone checks: Thai recognition quality, babble loudness, head control in bubbles/hop.
- Glaze's own HUD screenshots at 360 px and dark theme for the new sheets were not re-taken after the cut-off (smoke shots are light, 390 + 1440).
- Optional baby / trait-specific lines (Loop note 4) not written yet.

