# Needs System (ความต้องการ)

Owner: loop · Story: S1-01 · Status: Draft v1.1 (2026-10-26, Sprint 3 petting retune), numbers awaiting owner sign-off
Data: `assets/data/needs.json`, `assets/data/foods.json`, `assets/data/personas.json`
Contract: `docs/architecture/module-contracts.md` (ids and shapes are binding)

## 1. Overview

The pet has four needs: **hunger** (อิ่ม), **toilet** (ห้องน้ำ), **fun** (สนุก) and **social** (ใกล้ชิด). Each is a level from 0 to 1, where 1 means satisfied. Levels drop in real time, also while the game is closed (catch-up is capped). The player refills them by touch: feeding in the kitchen, carrying the pet to the toilet and flushing, playing (poke, stretch, squish, boing), and petting or talking. Each character's personality scales how fast each need drops and how strongly it reacts. Needs change only the pet's face, idle motion and speech. **The pet never dies, never gets sick, and nothing is lost through neglect.**

## 2. Player Fantasy

"My blob missed me, and I know exactly what it wants." When the player opens the game, the face and a short line tell them the one thing the pet needs most, and 1–2 minutes of care turn it back to a smile. Each character feels like a real person from the studio: ไผ่ gets lonely fast and says so loudly, ฟ้า enjoys being left alone, ใหม่ quietly says "it's fine, I can wait". Neglect brings sad faces, never guilt or punishment, so the game suits all ages.

Target rhythm: a casual player who checks in 2–3 times a day always finds 1–2 needs to care for, and never finds the pet in a worse state than "low" from absence alone.

## 3. Detailed Rules

### 3.1 Levels and states
- Every need has a level `L` in [0, 1], plus thresholds `good` (0.75), `low` (0.3) and `urgent` (0.12) in `needs.json`.
- State of a need: `urgent` if L ≤ urgent · `low` if L ≤ low · `good` if L ≥ good · otherwise `ok`.
- New save: levels start at `needs.<id>.start` (hunger 0.55, toilet 0.75, fun 0.7, social 0.6), so the first session has something to do in the kitchen and the living room right away.

### 3.2 Decay (time)
- Each tick, every need drops by `decayPerHour × needRates[need]` per real-time hour (`needRates` from the persona).
- Decay uses wall-clock time (`Date.now()`), not frame time.
- A gap between two ticks longer than `offlineGapSeconds` (60 s: app closed, tab hidden, phone locked) is treated as **offline catch-up**: the gap is capped at `offlineCapHours` (12 h), and offline decay cannot push a need below `offlineFloor` (0.15). A need already below the floor stays where it is (offline never raises a level).
- Online decay (gaps ≤ 60 s) has no floor and can reach 0.

### 3.3 Refilling (actions)
All values in `needs.json → actions`; persona gains from `personas.json`.

| Gesture | Effect | Persona scale |
|---|---|---|
| Pet (slow stroke over the head, or mouse rub above it) | social +0.065/s, slowing above 0.7 (see 4.2); fun +0.02/s | × petGain |
| Poke (tap) | fun +0.01 per poke | × playGain |
| Poke spam (≥ 5 pokes in 2 s) | no fun gain; `pokeSpam` line | — |
| Stretch (drag) | fun +0.02/s; above stretch 0.8 (`stretchBigThreshold`) the gain × 0.25 (`hardFunScale`) and `stretchBig` line | × playGain |
| Boing (release with stretch ≥ 0.5) | fun +0.03 once | × playGain |
| Squish (pinch / wheel) | fun +0.02/s; above 0.22 (`squishHardThreshold`) gain × 0.25 and `squishHard` line | × playGain |
| Carried | social +0.01/s | — |
| Talk-back phrase played | social +0.04 per phrase | × petGain |
| Camera turned on (first hand seen) | social +0.05 once per camera session, `cameraHello` | — |
| Slap (fast swipe hit) | no need change; mood/face only | — |
| Eat a food | see 3.4 | — |
| Flush while sitting | toilet = 1; if toilet was ≤ low, fun +0.05 (`flushReliefFun`) and `relieved` line | — |

All results are clamped to [0, 1].

**Petting stroke (Sprint 3, phones).** A drag that starts in the head zone (top `petHeadZoneFromTop` = 40% of the body height) strokes instead of stretching. Every frame where the finger (or mouse) moves inside the head zone at a speed between `petStrokeMinSpeed` (0.12) and `petStrokeMaxSpeed` (4.0) body-heights per second counts as petting. Speeds are measured in body-heights per second (pet height on screen = 1), so a phone and a desktop accept the same stroke. Pauses shorter than `petStrokeGraceSeconds` (0.25 s), such as turning the finger round at the end of a stroke, keep counting. Slower than the minimum is a resting finger (no gain); faster than the maximum is no longer petting (the slap check is separate and pixel-based, and must stay above the stroke maximum).

### 3.4 Eating
1. Food is dropped in the mouth radius (wire's input rule).
2. If hunger ≥ `eat.fullThreshold` (0.95): the pet refuses, says `full`, the food returns to the tray. No need changes.
3. If the last bite was less than `eat.cooldownSeconds` (1.5 s) ago, the drop is treated as a miss (food returns).
4. Otherwise the reaction is chosen: `like` if the food is in `foods.likes[char]`, `dislike` if in `foods.dislikes[char]`, else `ok`.
5. The pet chews (expr `eat`, action `chew`) for the base chew time × `persona.foodReaction.chewTimeScale`, then `gulp`.
6. Apply: hunger += food.hunger × reaction.hungerScale · fun += food.fun + reaction.funBonus · toilet += food.toilet (if a food has no `toilet` field, use −`eatToiletCost`). Clamp.
7. Play `persona.foodReaction[reaction]` expr + action and a line from the reaction's event (`eatLike` / `eatOk` / `eatDislike`).
- Disliked food is still eaten (never refused for taste) so a young player is never blocked; it just fills less and the pet shows it.

### 3.5 Toilet
- When toilet ≤ low, the pet shows the toilet face and says `toiletNeed` (on cooldown).
- Carry the pet onto the toilet zone → it sits. If toilet > `toiletNoNeedAbove` (0.7) it says `toiletNoNeed` first.
- The flush button always works while sitting: toilet = 1, plays `flush` line. Relief bonus and `relieved` line only if toilet was ≤ low before the flush.
- There are no accidents. Toilet at 0 only means the urgent face.

### 3.6 Mood from needs (face, idle motion, speech)
Config: `needs.json → moods`.
1. **Interaction faces win.** While grabbed, hurt, eating or reacting, the interaction expression (grabExpr, hurtExpr, foodReaction, prototype mood engine) is shown. Need moods apply only when the pet is idle.
2. Otherwise pick the first need, in `moods.priority` order (toilet → hunger → social → fun), that is `urgent`; if none, the first that is `low`.
3. The face for that need and state is `persona.moodOverrides["<need>.<state>"]` if present, else `moods.states[need][state].expr`. The pet plays `idle` every `idleEverySeconds` and says the state's `line` event at most once per `lineCooldownSeconds` (45 s), and immediately when a need first crosses into `low`.
4. If no need is low or urgent: `allGood.expr` (smile) when every need is `good`, else `neutral.expr` (original).
5. On return after more than `backAfterMinutes` (20 min) away: say `back` first, then the need line after the cooldown.

| Need | low | urgent | Line |
|---|---|---|---|
| hunger | hungry + jelly (tummy wobble) | hungry + jelly, more often | hungry |
| toilet | shy + wiggle | surprised + shiver | toiletNeed |
| fun | sleepy + yawn | sad + sway | sleepy |
| social | sad + tilt (looks for you) | sad + sway | lonely |

Overrides: ฟ้า (cloud) social low = smile, urgent = sleepy (she likes quiet). ปาม (pill) social low = sleepy.

### 3.7 Personality
`personas.json` per character key. Contract fields (`ignoreSeconds`, `petGain`, `playGain`, `pokeAnnoy`, `stretchAnnoy`, `squishAnnoy`, `grabExpr`, `hurtExpr`, `lonelyExpr`) keep the prototype values and meaning. Added: `needRates` (decay multipliers), `foodReaction`, `moodOverrides`, `playable`.

| Char | hunger | toilet | fun | social | Why |
|---|---|---|---|---|---|
| ไผ่ flower | 1.1 | 1.0 | 1.4 | 1.6 | ENFP, high energy, bored and lonely fast |
| ใหม่ splat | 0.9 | 1.0 | 0.9 | 1.2 | quiet, needs reassurance more than play |
| มิน gumdrop | 1.0 | 1.0 | 1.0 | 1.2 | team person, balanced |
| แอ๊ค diamond | 0.9 | 1.0 | 0.9 | 1.15 | entertains self with details, wants to be noticed |
| ฟ้า cloud | 1.15 | 0.9 | 0.8 | 0.5 | fast worker (fast metabolism), very private |
| ปาม pill | 1.0 | 1.0 | 1.0 | 1.0 | neutral until a personality is decided |

Petting response (`petGain`) and seconds of steady stroking (formula 4.2):

| Char | petGain | social 0.3 → 0.75 | 0.75 → 1.0 | Why |
|---|---|---|---|---|
| ไผ่ flower | 1.5 | 4.7 | 4.4 | lonely fastest, so answers touch most |
| ใหม่ splat | 1.4 | 5.0 | 4.7 | reassurance means a lot to her |
| มิน gumdrop | 1.05 | 6.6 | 6.3 | balanced |
| ปาม pill | 1.0 | 7.0 | 6.6 | reference character |
| แอ๊ค diamond | 0.9 | 7.8 | 7.3 | likes being noticed, a little reserved |
| ฟ้า cloud | 0.7 | 10.0 | 9.4 | private, slow to warm up, but clearly responds |

Sprint 3 changes: ไผ่ 1.25 → 1.5, ใหม่ 1.45 → 1.4 (so ไผ่ responds most), ฟ้า 0.6 → 0.7 (still least, now clearly visible). petGain also scales the touch-joy mood and talk-back social.

Hours from full (1.0) to `low` (0.3) while online:

| Char | hunger | toilet* | fun | social |
|---|---|---|---|---|
| ไผ่ | 4.5 | 6.4 | 2.9 | 1.9 |
| ใหม่ | 5.6 | 6.4 | 4.4 | 2.5 |
| มิน | 5.0 | 6.4 | 4.0 | 2.5 |
| แอ๊ค | 5.6 | 6.4 | 4.4 | 2.6 |
| ฟ้า | 4.3 | 7.1 | 5.0 | 6.1 |
| ปาม | 5.0 | 6.4 | 4.0 | 3.0 |

\* time only. Each meal also costs toilet (0.04–0.12 per food), so in practice toilet reaches low after ~4–5 h of normal feeding.

Food likes (foods.json): ใหม่ bun, cupcake / dislikes apple (loud crunch) · มิน onigiri, bun / no dislikes (open-minded) · แอ๊ค cupcake, apple (pretty food) / dislikes banana (bruises brown) · ฟ้า onigiri, apple (simple, fast, not messy) / dislikes cupcake (too sweet, sticky) · ไผ่ cupcake, banana / dislikes milk (boring) · ปาม none.

## 4. Formulas

### 4.1 Decay
```
r(n, c)   = decayPerHour[n] × needRates[c][n]            // level per hour
Δh_on     = (t_now − t_last) / 3 600 000                 // when gap ≤ offlineGapSeconds
L'        = clamp(L − r × Δh_on, 0, 1)

Δh_off    = min((t_now − t_last) / 3 600 000, offlineCapHours)   // when gap > offlineGapSeconds
L'        = max(L − r × Δh_off, min(L, offlineFloor))
```
| Variable | Meaning | Default | Range |
|---|---|---|---|
| decayPerHour[n] | base loss per hour | hunger 0.14, toilet 0.11, fun 0.175, social 0.23 | 0.05–0.35 |
| needRates[c][n] | persona multiplier | 0.5–1.6 | 0.4–2.0 |
| r | effective loss per hour | 0.099–0.368 | — |
| offlineCapHours | max offline hours counted | 12 | 6–24 |
| offlineFloor | lowest level offline decay can reach | 0.15 | 0–0.3 |
| t_now, t_last | ms timestamps (`Date.now()`) | — | t_now ≥ t_last, see 5.2 |

Time from level A down to B: `h = (A − B) / r`.

### 4.2 Action gains
```
continuous:  L' = clamp(L + rate × gain × dt, 0, 1)        // dt in seconds
              hard stretch/squish: rate × hardFunScale
one-shot:    L' = clamp(L + amount × gain, 0, 1)
gain = petGain (pet, talk-back) | playGain (poke, stretch, squish, boing) | 1 (others)
```

Petting social has a soft taper near the top, so it is quick from low but never instant to full:
```
taper(L)  = 1                                                     if L ≤ s
          = 1 − (1 − m) × (L − s) / (1 − s)                       if L > s
social'   = clamp(L + petPerSecond.social × petGain × taper(L) × dt, 0, 1)
fun'      = clamp(fun + petPerSecond.fun × petGain × dt, 0, 1)      // no taper
counts only while petStrokeMinSpeed ≤ v ≤ petStrokeMaxSpeed (v in body-heights/s),
or within petStrokeGraceSeconds after the last counted frame
```
| Variable | Meaning | Default | Range |
|---|---|---|---|
| petPerSecond.social (b) | base social per second of stroking | 0.065 | 0.04–0.1 |
| petSocialTaperStart (s) | level where petting starts to slow | 0.7 | 0.6–0.9 |
| petSocialTaperMin (m) | rate multiplier left at social 1.0 | 0.35 | 0.2–1.0 (1 = no taper) |
| petGain (g) | persona multiplier | 0.7–1.5 | 0.4–2.0 |

Time from A to B: below s, `t = (B − A) / (b g)`; above s, with k = (1 − m)/(1 − s), `t = ln[(1 − k(A − s)) / (1 − k(B − s))] / (b g k)`.

Worked example (ปาม, g = 1.0, social 0.3 → 0.75): 0.3 → 0.7 = 0.4 / 0.065 = 6.15 s. k = 0.65 / 0.3 = 2.167; 0.7 → 0.75 = ln(1 / 0.892) / (0.065 × 2.167) = 0.81 s. Total **7.0 s**. Going on to 1.0 adds ln(0.892 / 0.35) / 0.141 = 6.6 s, so a full fill from 0.3 is about 13.6 s. ไผ่ (g = 1.5) does 0.3 → 0.75 in 4.7 s; ฟ้า (g = 0.7) in 10.0 s.

Options considered (default A applied for the phone playtest; owner decides):
- **A. Taper (default):** b 0.065, taper from 0.7 to 0.35×. Low → good in ~7 s, last quarter slower. Feels responsive, full still takes effort.
- **B. Flat:** b 0.06, no taper (m = 1). 0.3 → 0.75 in 7.5 s, 0.3 → 1.0 in 11.7 s. Simplest, but full arrives abruptly.
- **C. Strong start, steep taper:** b 0.08, s 0.6, m 0.2. Low → good in ~6.0 s, then the last 0.25 crawls (~7.8 s). Most dramatic first seconds; may feel stingy at the top.


### 4.3 Eating
```
k        = like | ok | dislike
hunger'  = clamp(hunger + food.hunger × reactions[k].hungerScale, 0, 1)
fun'     = clamp(fun + food.fun + reactions[k].funBonus, 0, 1)
toilet'  = clamp(toilet + (food.toilet ?? −eatToiletCost), 0, 1)
refused if hunger ≥ fullThreshold
```

### 4.4 Worked example (ไผ่, default character)
ไผ่ closes the game at 12:00 with hunger 0.9, toilet 0.8, fun 0.85, social 0.9, and comes back at 15:00 (gap 3 h > 60 s, so offline catch-up, under the 12 h cap).
- hunger: r = 0.14 × 1.1 = 0.154 → 0.9 − 0.462 = **0.438** (ok)
- toilet: r = 0.11 × 1.0 = 0.11 → 0.8 − 0.33 = **0.47** (ok)
- fun: r = 0.175 × 1.4 = 0.245 → 0.85 − 0.735 = 0.115 → floored to **0.15** (low)
- social: r = 0.23 × 1.6 = 0.368 → 0.9 − 1.104 < 0 → floored to **0.15** (low)

Mood: away 3 h > 20 min → `back` line first. No need is urgent; first `low` in priority order is social → face `sad`, idle `tilt`, then `lonely` line.
Care: petting gives social 0.065 × 1.5 = 0.0975/s up to 0.7 (5.7 s from 0.15), then tapers; 0.15 → 0.75 takes about 6.2 s and 0.15 → 1.0 about 10.6 s. Feeding a cupcake (liked): hunger 0.438 + 0.15 = 0.588, fun 0.15 + 0.10 + 0.08 = 0.33, toilet 0.47 − 0.05 = 0.42.
If instead ไผ่ was away 30 h: Δh_off = 12 h, every need ends at 0.15 (low, never urgent).

## 5. Edge Cases

1. **Offline for days.** Catch-up counts at most 12 h, and offline decay stops at 0.15. The player returns to a pet with low (never urgent) needs, a `back` line and a sad-but-fine face. No other penalty, no lost items, nothing dies.
2. **Clock moved backwards** (t_now < t_last, e.g. timezone or manual change). Treat Δh = 0: no decay and no gain. Set t_last = t_now and save. A later forward jump is capped by `offlineCapHours`, so the player cannot gain or lose more than 12 h of decay by moving the clock.
3. **All needs at 0** (only reachable online, e.g. heavy eating drains toilet while the tab is open for hours). The pet shows the face for the first urgent need in priority order (toilet → surprised + shiver), keeps reacting to every gesture normally, and lines stay on the 45 s cooldown so it does not nag. Each need refills at its normal rate. The pet never faints, dies or gets sick.
4. **Eating when full** (hunger ≥ 0.95). The food is refused and returns to the tray, `full` line, no need changes. Eating at, say, 0.9 is allowed and hunger is clamped to 1.0 (the overflow is lost; toilet cost still applies).
5. **Toilet when not needed** (toilet > 0.7). The pet sits, says `toiletNoNeed`; flushing still works and sets toilet to 1, but no relief bonus and no `relieved` line. Repeated flushing gives nothing extra, so it cannot be farmed.
6. **Disliked food when very hungry.** Still eaten; fills 80% and fun −0.03 (clamped at 0). Never refused for taste.
7. **Rapid feeding.** A drop inside the 1.5 s cooldown counts as a miss, so a player cannot dump the whole tray in one second.
8. **Corrupt or missing save** (NaN, out of range, unknown key). Clamp each level to [0, 1]; if not a number, use `start`. Missing t_last → set to now (no catch-up).
9. **Switching character.** Needs are stored per character key. On switch, the newly selected character gets offline catch-up for the time since it was last active, using its own needRates (see Open question 2).
10. **Two tabs open.** Last save wins; at most a few seconds of action gain can be lost. Acceptable for Sprint 1.
11. **Locked character (ปาม).** `playable: false`; its data exists so the select screen and later sprints can use it, but needs are not simulated for it in Sprint 1.

## 6. Dependencies

| System | Direction | What |
|---|---|---|
| Game core (wire, `src/main.js`) | reads this | loads the three JSON files, runs the tick, offline catch-up, eat/flush rules, mood selection, save `moldable-pet:v1` |
| Character (clay) | this drives it | expression names and action names used in `moods`, `foodReaction`, `grabExpr` etc. must exist in `setExpression` / `play` |
| HUD (glaze) | this drives it | `hud.setNeeds` levels; states `low` and `urgent` drive the muted-pink low look; `hud.say` shows the lines (bubble width for ≤ ~28 Thai characters); `needs.<id>.label` and food `name` for labels |
| Rooms and props (prop) | shared ids | food ids for meshes, toilet zone and flush for the toilet rule |
| Audio (echo) | this drives it | events (eat, flush, relieved) trigger SFX; lines are the base for `voice-script.md` |
| Character bible (narrative) | source | personalities behind needRates, food likes and lines |
| Future: coins, minigames, sleep/energy | will depend on this | minigames add fun; energy would join `moods.priority` |

Each of these docs should list the needs system back as a dependency when they are written.

## 7. Tuning Knobs

| Knob | File | Default | Safe range | Affects |
|---|---|---|---|---|
| needs.*.decayPerHour | needs | 0.14 / 0.11 / 0.175 / 0.23 | 0.05–0.35 | how often each need asks for care |
| needs.*.low | needs | 0.3 | 0.2–0.4 (> urgent) | when the face and line start |
| needs.*.urgent | needs | 0.12 | 0.05–0.2 (< low, < offlineFloor to keep absence gentle) | strong face |
| needs.*.good | needs | 0.75 | 0.6–0.9 | when the pet smiles |
| needs.*.start | needs | 0.55 / 0.75 / 0.7 / 0.6 | 0.4–1.0 | first-session tasks |
| offlineCapHours | needs | 12 | 6–24 | worst case after absence |
| offlineFloor | needs | 0.15 | 0–0.3 | how sad a returning player finds the pet |
| offlineGapSeconds | needs | 60 | 30–300 | when a gap counts as offline |
| backAfterMinutes | needs | 20 | 5–120 | when `back` is said |
| actions.petPerSecond | needs | social 0.065, fun 0.02 | social 0.04–0.1, fun 0.01–0.04 | petting time to refill (low → good ≈ 5–10 s) |
| actions.petSocialTaperStart | needs | 0.7 | 0.6–0.9 | where petting starts to slow |
| actions.petSocialTaperMin | needs | 0.35 | 0.2–1.0 | how slow the last stretch to full is (1 = no taper) |
| actions.petStrokeMinSpeed | needs | 0.12 body-heights/s | 0.05–0.3 | slowest stroke that counts (lower = gentler fingers accepted) |
| actions.petStrokeMaxSpeed | needs | 4.0 body-heights/s | 2–6 (below the slap speed) | fastest stroke that still counts |
| actions.petStrokeGraceSeconds | needs | 0.25 s | 0–0.5 | pause allowed when the finger turns round |
| actions.petHeadZoneFromTop | needs | 0.4 (of body height) | 0.25–0.5 | where a drag strokes instead of stretches |
| actions.pokeFun | needs | 0.01 | 0–0.03 | value of a tap |
| actions.stretch/squishFunPerSecond | needs | 0.02 | 0.01–0.05 | play time to refill fun |
| actions.boingFun | needs | 0.03 | 0–0.06 | reward for big releases |
| actions.hardFunScale | needs | 0.25 | 0–0.5 | discourages rough play |
| actions.talkSocial / cameraHelloSocial | needs | 0.04 / 0.05 | 0–0.1 | value of voice and camera |
| actions.flushReliefFun | needs | 0.05 | 0–0.1 | reward for timely toilet |
| actions.toiletNoNeedAbove | needs | 0.7 | 0.5–0.9 | when the pet says it does not need to go |
| actions.eatToiletCost | needs | 0.08 | 0.04–0.15 | fallback toilet cost per food |
| actions.eat.fullThreshold | needs | 0.95 | 0.85–1.0 | when food is refused |
| actions.eat.cooldownSeconds | needs | 1.5 | 0.5–3 | feeding speed |
| moods.lineCooldownSeconds | needs | 45 | 20–120 | how chatty need lines are |
| moods.states.*.idleEverySeconds | needs | 5–14 | 3–30 | how visible a need is |
| foods[].hunger / fun / toilet | foods | 0.12–0.4 / 0–0.1 / −0.04…−0.12 | hunger 0.1–0.45, fun 0–0.15, toilet −0.15…0 | meal size, treats vs staples |
| reactions.like.funBonus | foods | 0.08 | 0–0.15 | reward for knowing the pet |
| reactions.dislike.hungerScale / funBonus | foods | 0.8 / −0.03 | 0.5–1.0 / −0.1…0 | cost of a disliked food |
| needRates.* | personas | 0.5–1.6 | 0.4–2.0 | personality pace |
| petGain / playGain | personas | petGain 0.7–1.5, playGain 0.6–1.5 | 0.4–2.0 | how much a character enjoys touch / play |
| ignoreSeconds | personas | 12–40 | 8–60 | short-term "ignored" mood (prototype engine) |
| foodReaction.chewTimeScale | personas | 0.6–1.3 | 0.5–1.5 | eating speed per character |

Options for the owner on how absence feels (pick one; default is A):
- **A. Gentle (default):** offlineFloor 0.15. Absence alone shows low faces, never urgent. Kind for kids, less drama.
- **B. Talking Tom drama:** offlineFloor 0.05. After a long absence the pet is at urgent faces. Stronger pull to come back, more guilt.
- **C. Sleepy pet:** offlineFloor 0.15 and offline decay × 0.5 (would add a key `offlineDecayScale`). Fewer needs after a night; returning feels calmer but a 2-visit player has less to do.

## 8. Acceptance Criteria

Unit tests (pure functions, injected clock):
1. Data loads: all three files parse; `needs` has exactly hunger, toilet, fun, social; `foods` has the 6 contract ids; `personas` has splat, pill, gumdrop, diamond, cloud, flower with every contract field and all 23 contract events (2–3 lines each).
2. Every expression and action named in the data is in the character contract lists.
3. Online decay: pill with hunger 1.0 and 5 h of 1-second ticks ends at 0.30 ± 0.005; flower with social 1.0 after 1.9 h ends at 0.30 ± 0.01.
4. Offline: flower at hunger 0.9, gap 3 h → 0.438 ± 0.001; social 0.9, gap 3 h → 0.15 exactly.
5. Offline cap: a 30 h gap gives the same result as a 12 h gap.
6. Offline floor does not raise: a need at 0.05 stays 0.05 after a 10 h gap.
7. Clock backwards: t_now = t_last − 1 h → no level changes, t_last becomes t_now.
8. Eating: flower, hunger 0.438, cupcake → hunger 0.588, fun +0.18, toilet −0.05 (± 0.001). At hunger 0.96 any food is refused and levels are unchanged.
9. Dislike: flower eats milk at hunger 0.5 → hunger 0.596, fun max(0, fun − 0.03), toilet −0.12.
10. Flush: toilet 0.2 → 1.0 and fun +0.05; toilet 0.8 → 1.0, fun unchanged, `toiletNoNeed` event raised.
11. Mood: toilet 0.1 and hunger 0.1 → toilet urgent face (`surprised`); all needs ≥ 0.75 → `smile`; cloud with social 0.2 → `smile` (override).
12. No level ever leaves [0, 1] after 10 000 random actions and ticks (seeded).
12a. Petting: pill, social 0.3, petting ticks of 1/60 s → reaches 0.75 after 7.0 ± 0.1 s; flower after 4.7 ± 0.1 s; cloud after 10.0 ± 0.1 s. Pill from 0.75 to ≥ 0.999 takes 6.6 ± 0.2 s (taper works). A stroke at 0.1 or 4.5 body-heights/s gives no gain; at 0.12–4.0 it does.

Playtest / manual:
13. On a phone, a full care pass from all needs at 0.15 takes ≤ 2.5 minutes.
13a. On a phone, a slow one-finger stroke over the head raises ใกล้ชิด visibly within 2 s and takes it from low to good in under 10 s for every character except ฟ้า (≤ 11 s).
14. No line in personas.json overflows the speech bubble at 390 px width (glaze to confirm; target ≤ 28 Thai characters).
15. No code path produces death, sickness, or loss of items from low needs.

## Open questions for the owner
1. Absence feel: option A, B or C above?
2. Needs per character (each blob keeps its own levels, current assumption) or one shared set for the household?
3. Should ไผ่ (default) really get lonely in under 2 h while the app is closed, or soften social to 1.4?
4. Thresholds use the same low/urgent for every need; ok, or should toilet warn earlier (low 0.35)?
