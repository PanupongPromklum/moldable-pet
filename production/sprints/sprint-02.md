# Sprint 2 — feedback fixes, outfits, first minigame

Date: 2026-10-25. Source: owner playtest feedback. Contracts: `docs/architecture/module-contracts.md` → "Sprint 2 additions".

| # | Story | Owner | Done when |
|---|---|---|---|
| S2-01 | Contrast audit + real dark theme; white text on primary; no browser auto-invert | glaze | both themes pass 4.5:1 text / 3:1 status; screenshots light + dark |
| S2-02 | Remove settings gear; character chip opens select | glaze + wire | gear gone, chip works on touch/mouse/keyboard |
| S2-03 | Toilet flow: one coach before, one button while sitting | glaze + wire | never two "กดชักโครก" at once |
| S2-04 | Camera: hide video, show stylized hands only (saved choice) | glaze (toggle) + wire (render) | toggle works, hands visible on both themes |
| S2-05 | Rooms evening look for dark theme | prop | `room.setTheme('dark')` |
| S2-06 | Outfit system: 11 items in 3 slots on all 6 shapes | clay | `pet.setOutfit` meets contract, demo shows all items on all shapes |
| S2-07 | Wardrobe catalog, prices, starter items; Snack Rain GDD + numbers; coin economy | loop | `wardrobe.json`, `minigames.json`, `design/gdd/minigame-snack-rain.md`, `design/gdd/economy.md` |
| S2-08 | Wardrobe sheet + minigame HUD + coin animation | glaze | contract methods, phone + desktop |
| S2-09 | Coin + demon meshes | prop | `src/props/minigame.js` |
| S2-10 | New sfx: coin, catch, bonk, tick, go, win, equip, buy | echo | in `sfx.js` |
| S2-11 | Wiring: outfits save/buy/equip, Snack Rain logic (touch, mouse, keys, hands), coins | wire | playable end to end |
| S2-12 | Integration, smoke test phone + desktop + dark, deploy | kiln | live on GitHub Pages |
