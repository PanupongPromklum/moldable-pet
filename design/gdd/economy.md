# Coin Economy (เหรียญ)

Owner: loop · Story: S2-07, S4-01 · Status: Draft v2 (2026-11-06) — v1 wardrobe numbers in use; Sprint 4 decor and Christmas numbers (section 10) awaiting owner sign-off
Data: `assets/data/wardrobe.json`, `assets/data/furniture.json`, `assets/data/minigames.json` (coin keys)
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
| Wardrobe items | 60–350 | 8 buyable basic items; 3 starter items (one per slot) are owned from the start at price 0. |
| Christmas outfits (S4) | 100–160 | 5 items, `theme: "xmas"`, on sale all year. See section 10. |
| Room decor (S4) | 70–260 | 26 buyable furniture items in 13 slots (13 basic, 13 Christmas); 13 defaults owned at price 0. See section 10. |

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
| head | hat-santa | หมวกซานต้า | 160 | | มิน (xmas) |
| head | antlers | เขากวาง | 140 | | ไผ่ (xmas) |
| eyes | glasses-snow | แว่นเกล็ดหิมะ | 140 | | ฟ้า (xmas) |
| body | scarf-xmas | ผ้าพันคอคริสต์มาส | 160 | | แอ๊ค (xmas) |
| body | bell-collar | กระดิ่ง | 100 | | ใหม่ (xmas) |

Why these likes (from the character bible): ไผ่'s signature item is "แว่นส่องใจผู้ใช้", so the round glasses (a starter) give the default character a happy first dress-up; she is loud and social (party hat, flower crown). ใหม่ blooms when praised (star badge) and loves craft and brand looks (bow, crown). มิน leads the team (tie, party hat for Rally, badge). แอ๊ค is neat and visual (bow tie, sparkle glasses, scarf). ฟ้า wants privacy and comfort (beanie, sunglasses, scarf). ปาม has no personality yet, so likes nothing and always says neutral `wearOk` lines.

Every item is liked by at least one character; every character likes exactly three basic items and exactly one Christmas item (four in total). ใหม่ and แอ๊ค have no liked starter, which gives them a first shopping goal (badge 60, bow tie 90).

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

1. **All items owned:** the wardrobe (or decor sheet) shows "ครบแล้ว!"; minigames still pay coins, which wait for the next sink (gacha). No wallet cap now.
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
| Room decor (`furniture.json`, S4) | second sink; prop meshes, glaze shop sheet, wire state |
| Future: gacha | more sinks on the same wallet |

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
3. Every item has at least one like; every playable character likes exactly 4 items (3 basic + 1 Christmas); `pill` likes none. Every item has `theme` `basic` or `xmas`.
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

## 10. Room decor and the Christmas set (Sprint 4)

Data: `assets/data/furniture.json` (v1), wardrobe.json v2 (`theme` on every item, 5 Christmas outfits). Contract: `module-contracts.md` → "Sprint 4 additions". Owner decisions: swap per slot, bought with coins; the Christmas set is on sale all year as its own category.

### 10.1 Rules
- 3 rooms, 13 slots, 3 items per slot: the **default** (today's look, owned from the start, price 0), one **basic** alternative and one **Christmas** piece. One item shows per slot; buying equips it at once; owned items can be swapped back any time for free.
- Same wallet and same buy flow as the wardrobe (3.5): in-sheet confirm, coins never negative, "เหรียญไม่พอ" in muted pink, hint "เล่นมินิเกมเพื่อเก็บเหรียญ". Try-before-you-buy preview costs nothing; closing the sheet reverts unbought previews.
- Furniture is **purely cosmetic**: no need effects, no likes, no stat. (Pet reactions to furniture are an open question, 10.6.) This keeps decor a free expression, not an optimisation.
- Nothing is timed or limited. "Christmas" is a style, not an event: no countdown, no "last chance", no price change in December.

### 10.2 Pricing rationale
Earning reference (Snack Rain option A, `minigames.json`): typical 36 coins per round, weak 21, strong 52; a round is about 1 minute with countdown and result. A **casual day** = about 15 rounds (15–20 minutes of minigames over a few visits) ≈ 540 coins for a typical player.

| Tier | Rule | Price | Typical rounds |
|---|---|---|---|
| Basic, small (mats, towel, plant) | ≈ 2 rounds | 70–90 | 1.9–2.5 |
| Basic, medium (rug, lamp, shelves, mirror, books) | ≈ 3 rounds | 90–120 | 2.5–3.3 |
| Basic, large (sofa, fridge) | ≈ 4 rounds | 140 | 3.9 |
| Christmas, small (mats, stocking, wreath) | ≈ 3 rounds | 100–120 | 2.8–3.3 |
| Christmas, medium (rug, garland, lamp, mirror, window) | ≈ 4 rounds | 130–160 | 3.6–4.4 |
| Christmas, hero (sofa, fridge, fireplace, tree) | 5–7 rounds | 200–260 | 5.6–7.2 |

Rules used: each Christmas piece costs more than the basic alternative in the same slot (about 1.3–1.5×, the hero pieces more), because it is the showpiece and the set is the long goal. Price follows how much of the screen the piece fills, so a big change costs more than a mat. The cheapest Christmas pieces (100) are affordable after 3 rounds, so a new player can get "a bit of Christmas" in the first session.

### 10.3 Catalog

| Room | Slot | Default (0) | Basic | Price | Christmas | Price |
|---|---|---|---|---|---|---|
| living | sofa โซฟา | โซฟานุ่มนิ่ม | โซฟาก้อนเมฆ | 140 | โซฟาซานต้า | 200 |
| living | rug พรม | พรมกลม | พรมดอกไม้ | 90 | พรมเกล็ดหิมะ | 130 |
| living | wall ของแต่งผนัง | รูปก้อนนุ่ม | ชั้นหนังสือ | 100 | พวงไฟวิบวับ | 130 |
| living | window หน้าต่าง | หน้าต่างกลม | หน้าต่างโค้ง | 120 | หน้าต่างหิมะ | 160 |
| living | corner มุมห้อง | ต้นไม้กระถาง | ต้นไม้ต้นสูง | 80 | ต้นคริสต์มาส | 260 |
| living | lamp โคมไฟ | โคมไฟตั้งพื้น | โคมไฟเห็ด | 100 | โคมไฟดาว | 140 |
| living | side ข้างโซฟา | โต๊ะจิบโกโก้ | กล่องของเล่น | 90 | เตาผิงอุ่นใจ | 240 |
| kitchen | fridge ตู้เย็น | ตู้เย็นคลาสสิก | ตู้เย็นย้อนยุค | 140 | ตู้เย็นขนมปังขิง | 200 |
| kitchen | wall ชั้นผนัง | ชั้นโหลขนม | ชั้นกระถางจิ๋ว | 90 | พวงสนกระดิ่ง | 120 |
| kitchen | rug พรม | พรมห้องครัว | พรมผลไม้ | 70 | พรมมนุษย์หิมะ | 100 |
| bathroom | mirror กระจก | กระจกวงรี | กระจกก้อนเมฆ | 100 | กระจกใบฮอลลี่ | 130 |
| bathroom | wall ราวผ้า | ราวผ้าขนหนู | ผ้าขนหนูลายทาง | 70 | ถุงเท้าซานต้า | 100 |
| bathroom | rug พรม | พรมห้องน้ำ | พรมเป็ดน้อย | 80 | พรมหิมะฟูฟู | 110 |

Names are ≤ 12 spacing glyphs (fit a ~110 px card at 13 px Prompt). The Christmas wreath is named พวงสนกระดิ่ง on purpose: "พวงหรีด" reads as a funeral wreath in Thai. Names hint at a look (มนุษย์หิมะ, ฟูฟู, ใบฮอลลี่) — prop may ask to rename if the mesh goes another way.

Christmas outfits (wardrobe, same slots as Sprint 2): หมวกซานต้า 160 · เขากวาง 140 · แว่นเกล็ดหิมะ 140 · ผ้าพันคอคริสต์มาส 160 · กระดิ่ง 100. Each playable character likes exactly one (มิน ซานต้า — the team leader who gives; ไผ่ เขากวาง — playful and loud; ฟ้า แว่นเกล็ดหิมะ — snow comes from clouds; แอ๊ค ผ้าพันคอคริสต์มาส — neat knitted pattern; ใหม่ กระดิ่ง — a small, soft voice that rings for her).

### 10.4 Pacing (option A, default, in data)

| Goal | Coins | Typical (36) | Weak (21) | Strong (52) |
|---|---|---|---|---|
| One basic piece | 70–140 | 2–4 rounds | 4–7 | 2–3 |
| One Christmas piece | 100–260 | 3–8 rounds | 5–13 | 2–5 |
| All 13 basic furniture | 1 270 | 36 rounds | 61 | 25 |
| All 13 Christmas furniture | 2 020 | 57 rounds | 97 | 39 |
| 5 Christmas outfits | 700 | 20 rounds | 34 | 14 |
| **Full Christmas set** (13 furniture + 5 outfits) | **2 720** | **76 rounds ≈ 5 casual days** | 130 ≈ 9 days | 53 ≈ 3.5 days |
| Everything (wardrobe 1 180 + decor 3 290 + Christmas outfits 700) | 5 170 | 144 rounds | 247 | 100 |

The Christmas living room alone (7 pieces, 1 300 coins) is about 36 typical rounds ≈ 2–3 casual days, so the room that matters most changes visibly within the first week. The Sprint 5 minigames are balanced to the same coins per minute (`minigames-2.md`), so they add variety, not speed.

### 10.5 Options for the owner (default A)
- **A. Steady (default, in data):** prices above. Full Christmas set 2 720 ≈ 5 casual days; every single piece ≤ 8 rounds.
- **B. Festive-light:** Christmas furniture × 0.8, Christmas outfits × 0.85 (rounded to 10) ≈ 2 220 ≈ 4 days. Faster joy; decor empties sooner before gacha exists.
- **C. Collector:** Christmas × 1.3 ≈ 3 540 ≈ 6–7 days. Longer goal, but weak players (children) would need about two weeks; Loop does not recommend it.

### 10.6 Edge cases
1. **Saved furniture id unknown** (removed later or hand-edited): the slot shows its default; the id is dropped from `owned` (wire, contract v4). Never refund.
2. **v3 save:** all slots at defaults; defaults are always owned.
3. **Preview of an unowned item, then the sheet closes or the app backgrounds:** the room reverts to the equipped item; nothing is charged.
4. **Buy pressed twice / coins exactly equal to the price:** same as wardrobe (3.5, AC 4–5).
5. **Theme filter "คริสต์มาส" in a slot with no owned Christmas item:** shows the one Christmas card with its price; never an empty tab (every slot has exactly one Christmas item).

### 10.7 Tuning knobs
| Knob | File | Default | Safe range | Affects |
|---|---|---|---|---|
| items[].price (basic) | furniture | 70–140 | 40–250 | rounds per basic piece |
| items[].price (xmas) | furniture | 100–260 | 60–400 | Christmas set goal length |
| items[].price (xmas outfits) | wardrobe | 100–160 | 60–300 | Christmas outfit goal |
| items[] order | furniture, wardrobe | default → basic → xmas | any | card order in the sheet |

### 10.8 Acceptance criteria
1. `furniture.json` parses; rooms/slots/labels/ids/order match the contract; 39 unique ids; exactly one `default: true` item at price 0 per slot; every other price is a positive integer; `theme` matches the contract list. (`tests/unit/furniture-data.test.mjs`)
2. No furniture id equals a wardrobe id. (same test)
3. Every Christmas piece costs more than the basic alternative in its slot. (same test)
4. A typical player (36/round) can buy any single basic piece in ≤ 4 rounds and any single Christmas piece in ≤ 8; the full Christmas set needs 60–90 typical rounds.
5. No decor screen shows a timer, a "limited" label, or a real-money price.

## Open questions for the owner
1. Economy pace: option A (default), B or C from the minigame GDD?
2. `startCoins`: 0 (play first) or, for example, 60 (buy the badge right away)?
3. Should a liked outfit give the small need bonus at all, or only a happy line and face?
4. Gacha later: allowed for under-18 players with earned coins only, or fixed-price shop only for them?
5. Decor and Christmas pacing: option A (default), B or C (10.5)?
6. Should the pet react to furniture (a happy line when its favourite piece is placed, no need bonus)? Default: no in Sprint 4; revisit with raised personality in Sprint 5.
