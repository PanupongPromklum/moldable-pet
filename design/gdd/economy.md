# Coin Economy (เหรียญ)

Owner: loop · Story: S2-07 · Status: Draft v1 (2026-10-25), numbers awaiting owner sign-off
Data: `assets/data/wardrobe.json`, `assets/data/minigames.json` (coin keys)
Related: `design/gdd/minigame-snack-rain.md`, `design/gdd/needs-system.md`

## 1. Overview

Coins (เหรียญ) are the game's only currency. In Sprint 2 they are earned in one place (Snack Rain) and spent in one place (the wardrobe). Coins are earned by play only. **There is no real money anywhere: no purchase of coins, no ads for coins, no paid gacha.** One wallet is shared by the whole household of characters, and bought items are owned by everyone (`owned: [ids]` in the save), while each character wears its own outfit. Later, room decoration and a cosmetic gacha plug in as further sinks, using the same wallet.

## 2. Player Fantasy

"I earned this hat by playing with my pet, and my pet loves it." Prices are low enough that the first purchase arrives in the first session (the 60-coin badge after about 2 rounds), and the crown is a goal for a few days of casual play. Buying never feels like a trap: prices are visible, nothing is timed or limited, and nothing can be lost.

## 3. Detailed Rules

### 3.1 Wallet
- `coins`: non-negative integer in the save (wire), shared across characters. New save starts at `wardrobe.json startCoins` (default 0).
- Shown top-right on the HUD (`hud.setCoins(n)`, animated).
- Never decreases except by a purchase the player confirmed. Neglect, demons and needs never cost coins.

### 3.2 Sources (now)

| Source | Amount | Notes |
|---|---|---|
| Snack Rain round | 5–60, typical 36 | coins caught × 2 + floor(score / 40), min 5 for a completed round, max 60. See minigame GDD 4.4. |

### 3.3 Sinks (now)

| Sink | Price range | Notes |
|---|---|---|
| Wardrobe items | 60–350 | 8 buyable items; 3 starter items (one per slot) are owned from the start at price 0. |

### 3.4 Wardrobe catalog

| Slot | id | Name | Price | Starter | Liked by |
|---|---|---|---|---|---|
| head | hat-beanie | หมวกไหมพรม | 0 | yes | ฟ้า |
| head | hat-party | หมวกปาร์ตี้ | 90 | | ไผ่, มิน |
| head | bow-ribbon | โบว์ | 120 | | ใหม่ |
| head | crown-flower | มงกุฎดอกไม้ | 350 | | ใหม่, ไผ่ |
| eyes | glasses-round | แว่นกลม | 0 | yes | ไผ่ |
| eyes | glasses-sun | แว่นกันแดด | 120 | | ฟ้า |
| eyes | glasses-star | แว่นดาว | 200 | | แอ๊ค |
| body | tie-neck | เน็คไท | 0 | yes | มิน |
| body | badge-star | เข็มกลัดดาว | 60 | | ใหม่, มิน |
| body | tie-bow | หูกระต่าย | 90 | | แอ๊ค |
| body | scarf | ผ้าพันคอ | 150 | | แอ๊ค, ฟ้า |

Why these likes (from the character bible): ไผ่'s signature item is "แว่นส่องใจผู้ใช้", so the round glasses (a starter) give the default character a happy first dress-up; she is loud and social (party hat, flower crown). ใหม่ blooms when praised (star badge) and loves craft and brand looks (bow, crown). มิน leads the team (tie, party hat for Rally, badge). แอ๊ค is neat and visual (bow tie, sparkle glasses, scarf). ฟ้า wants privacy and comfort (beanie, sunglasses, scarf). ปาม has no personality yet, so likes nothing and always says neutral `wearOk` lines.

Every item is liked by at least one character; every character likes exactly three. ใหม่ and แอ๊ค have no liked starter, which gives them a first shopping goal (badge 60, bow tie 90).

### 3.5 Buying and equipping
- Buy: in the wardrobe sheet, tap an unowned item → in-sheet confirm "ซื้อ <name> <price> เหรียญ?" → coins −price, item added to `owned`, sfx `buy`, pet says a `buy` line, the item is equipped on the current character. Not enough coins: the price shows in muted pink with "เหรียญไม่พอ", the confirm button is disabled, and a hint "เล่นฝนขนมเพื่อเก็บเหรียญ" is shown. No browser dialogs.
- Equip: tap an owned item → equipped in its slot (replaces the old one), sfx `equip`. Tap the equipped item again → slot empty.
- Reaction: if the current character is in the item's `likes` → `wearLike` line and the persona's `foodReaction.like` face/action, plus `reactions.like` need bonus (social +0.03, fun +0.02) at most once per `bonusCooldownSeconds` (600) per character, so toggling a hat cannot farm needs. Otherwise `wearOk` line with `foodReaction.ok`.

### 3.6 Pacing (option A, default)

| Milestone | Coins | Typical rounds (36/round) | Weak player (21/round) |
|---|---|---|---|
| Cheapest item (badge) | 60 | 1.7 | 2.9 |
| Mid item (bow, sunglasses) | 120 | 3.3 | 5.7 |
| Priciest (crown) | 350 | 9.7 | 16.7 |
| Whole catalog | 1180 | 33 | 56 |

At about 1 minute per round (45 s + countdown + result), a typical player owns everything after roughly 35–40 minutes of Snack Rain spread over several days.

## 4. Formulas

- `coinsEarned` per round: see `design/gdd/minigame-snack-rain.md` 4.4.
- `roundsToBuy(price) = ceil(price / avgCoinsPerRound)`; avg from the 400-round simulation (typical 36, weak 21, strong 52).
- Catalog cost `C = Σ price(non-starter) = 60 + 90 + 90 + 120 + 120 + 150 + 200 + 350 = 1180`.
- Price tiers: cheap 60–90 (≈ 2–3 rounds), mid 120–150 (≈ 3–4), rare 200 (≈ 6), top 350 (≈ 10).
- Worked example: a typical player at 0 coins plays 4 rounds (36 × 4 = 144), buys the bow (120), keeps 24; six more rounds (24 + 216 = 240) buys the sparkle glasses (200), keeps 40.

## 5. Edge Cases

1. **All items owned:** the wardrobe shows "ครบแล้ว!"; Snack Rain still pays coins, which wait for the next sink (decor, gacha). No wallet cap now.
2. **Save edited by hand (localStorage):** accepted. Single player, no real money, nothing to protect; wire only clamps coins to a non-negative integer and drops unknown item ids.
3. **Item id removed from the catalog in a later version:** owned list drops it silently; if equipped, the slot becomes empty. Never refund automatically (nothing is lost because the item no longer exists to wear).
4. **Price changed in a later version:** owned items stay owned; no refund or charge.
5. **Buy pressed twice fast:** the second press is ignored while the first resolves; coins can never go negative.
6. **Equip on ปาม (coming soon):** not selectable in Sprint 2, but data supports it (likes empty).
7. **Starter items:** always in `owned`, even in an old save made before Sprint 2 (wire adds them on load).

## 6. Dependencies

| System | Relationship |
|---|---|
| Snack Rain (`minigame-snack-rain.md`) | only coin source now |
| Wardrobe UI (glaze), outfits 3D (clay), save (wire) | the sink, owned list, per-character outfit |
| Needs (`needs-system.md`) | small social/fun bonus on a liked outfit |
| Personas (`personas.json`) | `wearLike`, `wearOk`, `buy` lines; `foodReaction` faces |
| Future: room decor, gacha | more sinks on the same wallet |

## 7. Tuning Knobs

| Knob | File | Default | Safe range | Affects |
|---|---|---|---|---|
| startCoins | wardrobe | 0 | 0–100 | first purchase without playing |
| items[].price | wardrobe | 60–350 | 30–600 | goals and pacing |
| items[].starter | wardrobe | 1 per slot | 1–2 per slot | first dress-up |
| items[].likes | wardrobe | 1–2 chars | any | personality reactions |
| reactions.like.social / fun | wardrobe | 0.03 / 0.02 | 0–0.08 | care value of dressing |
| bonusCooldownSeconds | wardrobe | 600 | 120–3600 | anti-farming of the outfit bonus |
| coinsPerPoints, coin.coins, min/maxCoinsPerRound | minigames | 40, 2, 5/60 | see minigame GDD | coins per round |

## 8. Acceptance Criteria

1. `wardrobe.json` parses, has slots head/eyes/body with labels หัว/ตา/ตัว, exactly the 11 contract ids, each with `slot` matching the contract, `name`, integer `price ≥ 0`, `starter` bool, `likes` ⊆ character keys.
2. Exactly one starter per slot; starters have price 0; non-starters price > 0.
3. Every item has at least one like; every playable character likes exactly 3 items; `pill` likes none.
4. Buying with coins ≥ price: coins −price, id in owned, `buy` line. With coins < price: nothing changes.
5. Coins never go negative under 1000 random buy/equip operations (seeded).
6. Equipping a liked item twice within 600 s gives the need bonus once.
7. A typical simulated player reaches 120 coins in ≤ 4 rounds and 350 in 9–12 rounds.
8. No screen or code path offers real-money purchase, ads for coins, or timed/limited offers.

## 9. Later: gacha plug-in (design direction, not built)

Planned for "ต่อยอด" in `game-concept.md`: gacha for decor, outfits and characters. Constraints Loop will design to:
- **Cosmetic only, coins only.** Pulls cost earned coins (e.g. 100 coins/pull, 10-pull at 900). No premium currency, no real money, no ads.
- **Published rates** in the pull screen and in data (`gacha.json`: per pool `rates` by rarity, summing to 100%, with each item's individual chance shown).
- **Pity rule:** a guaranteed rare or better within N pulls (proposal N = 10), counter shown to the player and saved; plus a hard guarantee of the featured item within a fixed number (proposal 40).
- **No dead pulls:** a duplicate converts to coins (proposal 50% of the pull cost) so a pull is never wasted.
- **Characters** (if gacha-able) are also earnable by a fixed coin price or care milestones, so no character is gacha-locked.
- **Wallet tie-in:** gacha becomes the long-term sink once the wardrobe and decor are bought out, replacing the need for a wallet cap.

**Legal / policy check required before gacha ships (flag for the owner):** loot-box and gacha rules differ by country and by store, especially for players under 18 (for example rate-disclosure laws, bans on "complete gacha" combos, and store policies requiring published odds). Even with no real money, the owner should get a check for the target countries (at least Thailand) and the stores used, and decide whether under-18 players see gacha at all or only fixed-price shops. Loop will not ship a gacha design without that decision.

## Open questions for the owner
1. Economy pace: option A (default), B or C from the minigame GDD?
2. `startCoins`: 0 (play first) or, for example, 60 (buy the badge right away)?
3. Should a liked outfit give the small need bonus at all, or only a happy line and face?
4. Gacha later: allowed for under-18 players with earned coins only, or fixed-price shop only for them?
