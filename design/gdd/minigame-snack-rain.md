# Minigame: Snack Rain (ฝนขนม)

Owner: loop · Story: S2-07 · Status: Draft v1 (2026-10-25), numbers awaiting owner sign-off
Data: `assets/data/minigames.json` → `snackRain`; lines in `assets/data/personas.json`
Contract: `docs/architecture/module-contracts.md` → "Sprint 2 additions" (ids, keys and HUD calls are binding)

## 1. Overview

Snack Rain is a 45-second catch game started from the living room "เล่น" button. Snacks, coins and the occasional small "ปีศาจลูกค้า" (client-demon blob) fall from the top of the screen. The player slides the pet left and right; anything that reaches the pet's open mouth is caught. Snacks give points, coins give points plus a coin, a demon takes a few points away and makes the pet pull a grumpy face. Consecutive catches build a streak multiplier. At the end a result card shows score, coins earned and best score; the pet's fun and social rise and hunger drops a little. Coins are spent in the wardrobe (`design/gdd/economy.md`). Nothing in the game can hurt the pet, and a bad round still pays a little.

## 2. Player Fantasy

"My pet and I are playing together." The pet is the hero on screen, mouth open, cheeks bulging with each catch. The round starts calm enough that a child can catch nearly everything, then the rain thickens into a happy rush in the last 15 seconds. Demons are a comic "oops", never a fail state: the pet huffs, the streak resets, play continues. Each character plays in its own voice: ไผ่ squeals, ใหม่ apologises softly, ฟ้า is irritated and fast. One round is short enough to play while waiting for something, and the coins make a new hat feel earned.

## 3. Detailed Rules

### 3.1 Flow
1. Living room, player presses "เล่น" (HUD `onAction('play')`). The game enters minigame mode: normal HUD hides (`hud.startMinigame({ title, durationSec })`), room nav and swipes are off, the pet moves to the play line and opens its mouth.
2. Countdown `countdownSec` (3-2-1, sfx `tick`, then `go`). Pet says a `minigameStart` line.
3. Play for `durationSec`. The timer counts only while playing (see pause, 5.2).
4. Time up: objects still falling fade out (not scored). Sfx `win`, pet says `minigameWin`, `hud.showMinigameResult({ score, best, coins })`. Coins and needs are applied at this moment (4.6, 4.7).
5. Result card: "เล่นอีก" (`onMinigameAgain`, back to step 2) or exit (`onMinigameExit`, back to the living room, `hud.endMinigame()`).

### 3.2 Play area
- The pet stays on a horizontal line at its normal floor position. Only its x changes.
- Play width = `lanesOrWidth` × visible width at the pet's depth, capped at `playWidthMaxUnits` (wide desktops). Default 0.86 = continuous movement across 86% of the screen.
- If `lanesOrWidth` is an integer ≥ 2, the area is split into that many lanes and the pet snaps to the nearest lane centre (kept as an accessibility option; not the default).
- Objects spawn above the top edge at a random x inside the play width minus `spawn.edgeMargin` on each side, and fall straight down.
- HUD reserve bands (top 120 px, bottom 160 px) stay clear of score/timer clutter; the minigame HUD sits in the top band.

### 3.3 Controls (all four share one target-x)

| Input | Rule |
|---|---|
| Touch | Touch or drag anywhere: the pet's target x = finger x (absolute, mapped to the play width). Lift = pet stays where it is. No tap needed to catch. |
| Mouse | Pet's target x = cursor x while the cursor is over the canvas; no click needed. Leaving the window = pet stays. |
| Keys | ← / → or A / D move the target at `move.keySpeed` play widths per second while held. Esc = pause sheet (resume / exit). |
| Hands (camera on) | Target x = x of the palm centre of the most visible hand, mirrored to match the mirrored video. Hand lost > 1 s: pet stays, soft coach "ยกมือให้กล้องเห็น". |

The pet eases toward the target: `x += (target − x) × (1 − e^(−followPerSec × dt))`. Keys move the target, not the pet, so all inputs feel the same. The last input used wins.

### 3.4 Objects
- **Snack** (one of the 6 food ids, random): `points`. If the food is in the current character's `foods.json likes`, +`likedBonus` before the multiplier and the pet does a small happy chew. Sfx `catch`.
- **Coin**: `points` and `coins` coins (counted on the card at the end). Sfx `coin`.
- **Demon**: `points` (negative, flat), streak reset, pet face `hurtExpr` from its persona for `grumpySec` ("หงุดหงิด"; ใหม่ looks hurt, not angry, per persona), sfx `bonk`, line `minigameDemon` at most every `demonLineCooldownSec`. Score never goes below 0. Coins are never lost.
- Demons do not spawn in the first `graceSec`, then their weight ramps up over `rampSec`. Never more than `maxInARow` demons in a row.
- Missing a snack or coin (it falls past) has no penalty; it fades into the floor. With `resetOnMiss: false` it also keeps the streak.
- At most `maxOnScreen` objects falling at once, and at least `minGapSec` between spawns.

### 3.5 Catching
An object is caught when its centre comes within `catchRadius` of the pet's mouth point (`pet.getMouthWorld`) while it is still above the mouth. One object is scored once. Two objects in the same frame are both scored, in spawn order.

### 3.6 Streak
Each catch of a snack or coin adds 1 to the streak. A demon hit sets it to 0. The multiplier shows on the HUD (`hud.updateMinigame({ streak })`).

### 3.7 Personality
- Lines: `minigameStart`, `minigameDemon`, `minigameWin` from `personas.json`.
- Fun reward is scaled by the persona's existing `playGain` (ไผ่ 1.5, ฟ้า 0.6), so energetic characters gain more fun from play, in line with the needs GDD.
- Demon face uses the persona `hurtExpr`.

### 3.8 Best score
One best score per character key (each blob has its own needs and own record; owner may switch to one shared best, see Open questions). Saved by wire.

## 4. Formulas

Let `t` = seconds of play elapsed (0..D), `D` = `durationSec`, `p = t / D`, `e = p ^ rampPower`.

### 4.1 Spawn rate and fall speed
- `rate(t) = startPerSec + (endPerSec − startPerSec) × e` (objects/s). Expected spawns per round ≈ D × (start + (end − start) / (rampPower + 1)) = 45 × (0.9 + 1.1 / 2.3) ≈ **62**.
- `fall(t) = (start + (end − start) × e) × (1 ± jitter)` in visible play heights per second. The mouth line sits about 0.6 of the height below the spawn line, so time to reach the mouth ≈ 1.9 s at the start, 1.0 s at the end.

### 4.2 Item choice
- `wDemon(t) = demon.weight × clamp((t − graceSec) / rampSec, 0, 1)`, and 0 if the previous spawn was a demon.
- P(kind) = w(kind) / (wSnack + wCoin + wDemon(t)).
- Expected demons per round ≈ **4**, all after 8 s.

### 4.3 Multiplier and points
- `mult(streak) = min(maxMultiplier, 1 + floor(streak / step) × bonusPerStep)` with streak counted after this catch.
- Defaults: catches 1–3 ×1, 4–7 ×1.5, 8–11 ×2, 12–15 ×2.5, 16+ ×3.
- Catch: `score += round((points + liked × likedBonus) × mult)`, where `round` is JS `Math.round` (halves round up: 22.5 → 23).
- Demon: `score = max(0, score + demon.points)`; `streak = 0`.

### 4.4 Coins
- `caughtCoins = coinsCaught × coin.coins`
- `bonusCoins = floor(score / coinsPerPoints)`
- `coinsEarned = min(maxCoinsPerRound, max(minFloor, caughtCoins + bonusCoins))`, where `minFloor = minCoinsPerRound` if the round was completed (or `minCoinsOnlyIfComplete` is false), else 0.

### 4.5 Needs on round end
`f = clamp(t_played / D, 0, 1)` (1 for a completed round).
- `fun += needs.fun × playGain × f`
- `social += needs.social × f`
- `hunger += needs.hunger × f` (negative, so hunger drops)
All clamped to [0, 1]. Applied once per round.

### 4.6 Worked example (ไผ่, completed round)
- At t = 22.5 s: p = 0.5, e = 0.5^1.3 = 0.406. rate = 0.9 + 1.1 × 0.406 = 1.35 objects/s; fall = 0.32 + 0.30 × 0.406 = 0.44 heights/s.
- At t = 16 s: wDemon = 0.1 × (8 / 17) = 0.047, so P(demon) = 0.047 / 0.947 = 5.0%.
- Streak sequence: catch a banana (liked by ไผ่) at streak 4 → round((10 + 5) × 1.5) = 23. A coin at streak 16 → round(15 × 3) = 45 points and +2 coins. A demon at score 300 → 280, streak 0.
- Round end: score 925, 7 coins caught → 14 + floor(925 / 40) = 14 + 23 = **37 coins**.
- Needs: ไผ่ playGain 1.5 → fun +0.375, social +0.10, hunger −0.05. ฟ้า (playGain 0.6) would get fun +0.15.

### 4.7 Pacing check (400 seeded simulated rounds, scratch script, positions not modelled)

| Player | Catch rate | Dodge rate | Avg score | Avg coins |
|---|---|---|---|---|
| Weak (young child) | 45% | 40% | 490 | 21 |
| Typical | 65% | 60% | 925 | 36 |
| Strong | 85% | 80% | 1445 | 52 |
| Perfect | 100% | 100% | 1905 | 60 (cap) |

Typical player: 120-coin item after 3.3 rounds, the 350-coin crown after 9.7 rounds, whole catalog (1180) after about 33 rounds.

## 5. Edge Cases

1. **Tab hidden / app backgrounded / phone locked:** pause immediately (`visibilitychange`); the timer stops, falling objects freeze. On return: `pauseResumeCountdownSec` countdown, then continue. Needs keep decaying in real time as usual.
2. **Exit mid-round (Esc sheet or exit):** the round ends now. Coins = caught + bonus from current score, no minimum (stops tap-start-quit farming). Needs scaled by f. No `minigameWin` line; `best` still updates if beaten.
3. **Hunger at 0:** the round is still allowed (the pet never gets sick); hunger simply stays at 0 and the pet says a `hungry` line after the result. No need ever blocks play.
4. **Fun already 1:** the round still pays coins; fun stays clamped at 1.
5. **Camera on, hand lost:** pet holds position; no pause (the player may be switching hands). Camera turned off mid-round: falls back to touch/mouse/keys with no pause.
6. **Two inputs at once (mouse moving while keys held):** last input event wins the target.
7. **Very wide desktop:** play width capped at `playWidthMaxUnits` so the pet never travels the full 1920 px.
8. **Very narrow phone (360 px):** play width is screen-relative, and objects keep `itemSize`; `catchRadius` is world-space so small screens are not harder.
9. **Clock change / device time jump during the round:** play time uses frame `dt` (clamped to 0.1 s per frame), never `Date.now()`, so the round cannot be skipped or extended.
10. **Character switch:** not possible during a round (chip is hidden with the normal HUD).
11. **Coins overflow:** none expected; wallet is an integer, no cap (see economy).
12. **Lanes mode:** the target snaps to the nearest lane; keys move one lane per press instead of continuous speed.
13. **Demon caught during the grumpy face:** applies again (penalty and reset), but the line respects its cooldown.

## 6. Dependencies

| System | Uses | Owner |
|---|---|---|
| Needs (`design/gdd/needs-system.md`) | fun/social/hunger deltas, `playGain`, clamping | loop |
| Economy (`design/gdd/economy.md`) | coins earned feed the wallet | loop |
| Foods (`foods.json`) | snack ids and `likes` for the liked bonus | loop |
| Personas (`personas.json`) | lines `minigameStart/Demon/Win`, `hurtExpr`, `playGain` | loop |
| Character (`pet.getMouthWorld`, `setMouthOpen`, `setExpression`, `play('chew')`) | catching, faces | clay |
| Props (`createCoinMesh`, `createDemonMesh`, `createFoodMesh`) | falling meshes | prop |
| HUD (`startMinigame`, `updateMinigame`, `showMinigameResult`, `endMinigame`, `setCoins`) | display | glaze |
| Audio (`tick`, `go`, `catch`, `coin`, `bonk`, `win`) | feedback | echo |
| Input (pointer, keys, hands) and save (`coins`, best score) | logic | wire |

## 7. Tuning Knobs

All in `minigames.json → snackRain`.

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| durationSec | 45 | 30–90 | round length, coins per round |
| countdownSec / pauseResumeCountdownSec | 3 / 3 | 2–5 | readiness |
| lanesOrWidth | 0.86 | 0.6–0.95 (continuous) or 3–5 (lanes) | travel distance, difficulty |
| playWidthMaxUnits | 6.0 | 4–8 | desktop travel |
| catchRadius | 0.55 | 0.4–0.8 | forgiveness |
| itemSize | 0.45 | 0.35–0.6 | readability |
| move.keySpeed | 1.1 | 0.7–1.8 | keyboard feel |
| move.followPerSec | 14 | 8–25 | snappiness of drag/mouse/hand |
| spawn.startPerSec / endPerSec | 0.9 / 2.0 | 0.6–1.2 / 1.5–2.8 | density, pace curve |
| spawn.rampPower | 1.3 | 1.0–2.0 | how long the gentle start lasts |
| spawn.maxOnScreen / minGapSec | 6 / 0.22 | 4–8 / 0.15–0.4 | clutter |
| spawn.edgeMargin | 0.06 | 0.03–0.12 | objects near screen edges |
| fallSpeed.start / end | 0.32 / 0.62 | 0.25–0.4 / 0.5–0.8 | reaction time |
| fallSpeed.jitter | 0.08 | 0–0.15 | variety |
| items.snack/coin weight | 0.74 / 0.16 | 0.6–0.85 / 0.08–0.25 | coin flow |
| items.snack.points / likedBonus | 10 / 5 | 5–20 / 0–10 | score feel, food memory |
| items.coin.points / coins | 15 / 2 | 10–30 / 1–3 | coin flow |
| items.demon.weight | 0.1 | 0.04–0.15 | challenge |
| items.demon.points | −20 | −50…−5 | sting |
| items.demon.graceSec / rampSec | 8 / 17 | 5–15 / 5–25 | how rare demons are early |
| items.demon.grumpySec | 0.8 | 0.4–1.5 | face time |
| streak.step / bonusPerStep / maxMultiplier | 4 / 0.5 / 3 | 3–8 / 0.25–1 / 2–4 | skill reward |
| streak.resetOnMiss | false | bool | true = much harder for kids |
| coinsPerPoints | 40 | 25–60 | main coin pacing lever |
| minCoinsPerRound / maxCoinsPerRound | 5 / 60 | 0–10 / 40–100 | floor for kids, ceiling for experts |
| needs.fun / social / hunger | 0.25 / 0.1 / −0.05 | 0.1–0.4 / 0–0.2 / −0.15…0 | care value of play |
| lines.demonLineCooldownSec | 6 | 3–15 | chattiness |

Pacing options for the owner (default A):
- **A. Steady (default):** coinsPerPoints 40, max 60. Typical 36 coins/round; crown after ~10 rounds.
- **B. Generous:** coinsPerPoints 30, max 70. Typical ~44/round; crown after ~8 rounds. Faster joy, catalog empties in ~27 rounds before gacha exists.
- **C. Skill-heavy:** streak.resetOnMiss true, coinsPerPoints 30. Strong players earn far more than kids; more "game", less cosy.

## 8. Acceptance Criteria

Unit tests (pure functions, seeded RNG, injected dt):
1. Data loads: `snackRain` has every contract key (`durationSec, lanesOrWidth, spawn.startPerSec, spawn.endPerSec, fallSpeed.start, fallSpeed.end, items.snack/coin/demon weight+points, coin.coins, streak.step, streak.maxMultiplier, coinsPerPoints, maxCoinsPerRound, needs.fun/social/hunger`).
2. rate(22.5) = 1.347 ± 0.002; fall(22.5) without jitter = 0.442 ± 0.002.
3. No demon spawns before t = 8 s across 1000 seeded rounds; never two demons in a row.
4. mult: streak 3 → 1, 4 → 1.5, 11 → 2, 16 → 3, 40 → 3.
5. Liked banana at streak 4 for flower → +23 points.
6. Demon at score 10 → 0 (never negative), streak → 0, coins unchanged.
7. Coins: score 925 + 7 coins caught → 37. Score 0, completed → 5. Score 0, exited early → 0. Score 5000 → 60.
8. Needs: flower completed round from fun 0.5 / social 0.5 / hunger 0.5 → 0.875 / 0.6 / 0.45. Exit at half time → 0.6875 / 0.55 / 0.475. Hunger 0.02 → 0 (clamped).
9. Pause: 10 s hidden does not reduce timeLeft.
10. Seeded 400-round simulation of the "typical" profile averages 30–42 coins.

Playtest / manual (phone + desktop, light + dark):
11. A first-time child (or tester using one thumb) catches ≥ 80% of objects in the first 10 s.
12. Pet is controllable by touch, mouse, arrow keys and hand; pet never leaves the screen.
13. Last 10 s feel busy but readable (≤ 6 objects on screen).
14. A demon hit never ends the round, never removes coins, and never shows a sick or "dead" state.
15. Result card shows score, best and coins; the coin counter animates in the HUD after exit.

## Open questions for the owner
1. Pacing: option A, B or C (7. Tuning Knobs)?
2. Best score per character (default) or one shared best?
3. Should a daily first round pay a bonus (e.g. ×2 coins once per day) to bring players back gently? Not in data yet.
