# Sprint 1 — MVP vertical slice

Dates: 2026-10-25 → playable link the same day (first pass), polish after the owner's feedback.
Goal: a pet you can feed, take to the toilet and play with — on a phone, on a desktop, and with your hands through the webcam.

| # | Story | Owner | Done when |
|---|---|---|---|
| S1-01 | Needs model + numbers (hunger, toilet, fun, social), foods, personas for 5 characters + neutral ปาม | loop | `assets/data/*.json` + `design/gdd/needs-system.md` |
| S1-02 | Character module from the prototype + new actions (mouth open, chew, gulp, wiggle, carried, sitting) | clay | `src/characters/` meets the contract |
| S1-03 | Clay rooms: living, kitchen, bathroom (toilet + flush) and 6 foods | prop | `src/rooms/`, `src/props/` meet the contract |
| S1-04 | HUD: needs, coins, room nav, contextual buttons, mic, camera, food tray, select screen, bubbles, toasts, coach marks + new icons | glaze | `src/ui/` meets the contract, 390×844 and 1280×800 |
| S1-05 | SFX set + talk-back voice + voice script | echo | `src/audio/` + `design/narrative/voice-script.md` |
| S1-06 | Game core: boot, rooms switch, needs tick + save, mood/reactions, mouse/touch/hand gestures, feed, carry to toilet, flush | wire | `index.html` + `src/main.js` playable end to end |
| S1-07 | Integration, smoke test (phone + desktop), deploy to GitHub Pages | kiln | link works on a phone and a desktop |

Contracts: `docs/architecture/module-contracts.md`.
Out of scope: coins earning, minigames, decoration, gacha, accounts/online.
