# Minigames 2: จำท่าทาง · เป่าฟองสบู่ · กระโดดข้ามก้อน (+ ตัวเลือกเกม)

Owner: loop · Story: S5-D2 · Status: Draft v1 (2026-11-06), numbers awaiting owner sign-off
Data: `assets/data/minigames.json` (draft blocks in section 7.2; `snackRain` unchanged)
Related: `design/gdd/minigame-snack-rain.md` (shared flow, pause, coins rules), `design/gdd/economy.md`, `design/gdd/growth-personality.md`, `design/gdd/needs-system.md`

## 1. Overview

เพิ่มมินิเกม 3 เกมที่ owner เลือก ต่อจากฝนขนม: **จำท่าทาง** (`mimic`) ตัวละครทำหน้า/ท่าเป็นลำดับ ผู้เล่นกดตามแบบ Simon · **เป่าฟองสบู่** (`bubbles`) ตัวละครเป่าฟองหลายสีแล้วเรียกสี ผู้เล่นแตะฟองสีนั้น · **กระโดดข้ามก้อน** (`hop`) ตัวละครวิ่งอยู่กับที่ ผู้เล่นแตะให้กระโดดข้ามก้อนนุ่มๆ ที่กลิ้งมา ทุกเกมใช้ flow เดียวกับฝนขนม (intro → 3-2-1 → เล่น → การ์ดผล) **ไม่มี game over ที่ลงโทษแรง** ไม่มีเสียเหรียญ และให้เหรียญ **ต่อนาทีใกล้เคียงกัน** (ผู้เล่นทั่วไป ~32–37 เหรียญ/นาที) เพื่อไม่ให้เกมไหนเป็นทางหาเหรียญที่ดีที่สุดเกมเดียว ปุ่ม "เล่น" ในห้องนั่งเล่นจะเปิด **ตัวเลือกเกม** 4 การ์ดก่อน

## 2. Player Fantasy

"วันนี้อยากเล่นอะไรกับไผ่ดี?" — มินิเกมคือการ *เล่นด้วยกัน* กับสัตว์เลี้ยง ไม่ใช่การแข่ง: จำท่าทางคือเล่นเลียนแบบกัน (ใกล้ชิด) เป่าฟองคือเล่นสบายๆ สีสวย กระโดดคือได้วิ่งเล่นกระฉับกระเฉง เด็กเล็กเล่นได้ทุกเกมโดยไม่รู้สึกแพ้ ผู้เล่นเก่งยังมีสถิติ best score ให้ไล่ ตัวละครแต่ละตัวมีเกมโปรดของตัวเองและดีใจเมื่อได้เล่น

## 3. Detailed Rules

### 3.0 Shared rules (all three games)
- Flow, pause on `visibilitychange`, resume countdown, frame-`dt` timing (clamp 0.1 s), exit mid-round, character switch blocked, normal HUD hidden: **same as Snack Rain** (`minigame-snack-rain.md` 3.1, 5.1–5.2, 5.9–5.10).
- **No fail state ends a round early** except จำท่าทาง's 3 slips, which ends with praise ("ไปได้ถึง 7 ท่าเลย!"), never "แพ้".
- **Coins are never lost.** Score never goes below 0. Mistakes only reset the streak.
- Streak multiplier (bubbles, hop): same rule as Snack Rain — `mult = min(maxMultiplier, 1 + floor(streak / step) × bonusPerStep)`, defaults step 4, bonus 0.5, max 3.
- Coins per round: `min(maxCoinsPerRound, max(minFloor, coinPickups × coinValue + floor(score / coinsPerPoints)))`, `minFloor = minCoinsPerRound` only for a completed round (5); cap 60. Calibrated per game (4.4).
- Needs at round end: `need += needs.<id> × f` (fun also × persona `playGain`, and × `picker.favoriteFunScale` if it is the character's favourite game); `f` = fraction played (1 for a completed round). Clamped [0, 1]. Applied once.
- Pet size in any minigame: `max(stage.scale, growth.minigameMinScale)` (growth GDD 5.10).
- **Best score per character per game**, saved by wire (`chars[key].best[gameId]`; the existing Snack Rain best migrates into `best.snackRain`).
- **First play of each game** (per save): one coach line on the intro card and the first `firstPlayEasySec` (8 s) at the easiest settings.
- Head control uses the existing Sprint 3 pipeline (MediaPipe Face Landmarker, `src/input/head-rules.js`): it gives **head roll** (tilt left/right, degrees, calibrated neutral, dead zone 4°, full 20°) and a secondary nose-x cue. It does **not** give pitch (nod) or facial expressions today.
- Persona lines (new events): `pickGame`, `favGame`, `mimicGood`, `mimicSlip`, `bubbleCall` (uses `{color}` = `bubbles.colors[].label`), `bubbleWrong`, `hopBump`, and per-game start lines `mimicStart`, `bubbleStart`, `hopStart` (added in S5-01 because today's `minigameStart` lines talk about snacks); existing `minigameWin` (end) and `minigameDemon` (hop demon) reused. Each game's `lines` block in `minigames.json` names its events (`start`, `end`, …); the picker's are `picker.lines.open` / `favorite`. All lines cooldown `lineCooldownSec` (6 s).

### 3.1 Minigame picker (from "เล่น")
1. ห้องนั่งเล่น กด "เล่น" (`onAction('play')`) → ชีตเลือกเกม (สูงไม่เกิน 45% เหมือนชีตชุด ตัวละครยังเห็นด้านบน) ตัวละครพูด `pickGame` ("เล่นอะไรกันดี?")
2. การ์ด 4 ใบ grid 2×2 ตามลำดับ `picker.order`: ฝนขนม, จำท่าทาง, เป่าฟองสบู่, กระโดดข้ามก้อน แต่ละใบมี ภาพไอคอน ชื่อเกม วิธีเล่น 1 บรรทัด best score ของตัวละครนี้ ป้ายการควบคุม (นิ้ว/เมาส์ · เอียงหัว ถ้ามี) ป้ายหัวใจ "<ชื่อ>ชอบ" บนเกมโปรดของตัวละคร และวงแหวน "เล่นล่าสุด" บนเกมล่าสุด (focus เริ่มต้นสำหรับคีย์บอร์ด)
3. แตะการ์ด → การ์ด intro ของเกมนั้น (`hud.showMinigameIntro` เดิม: วิธีเล่น + เลือกการควบคุมถ้าเกมมีหลายแบบ) → "พร้อม" → 3-2-1 ถ้าเป็นเกมโปรด ตัวละครพูด `favGame`
4. การ์ดผล: "เล่นอีก" (เกมเดิม), **"เกมอื่น"** (กลับชีตเลือกเกม), ✕ (กลับห้อง)
5. ทุกเกมเปิดให้เล่นตั้งแต่แรก ไม่มีปลดล็อก ไม่มีค่าเข้าเล่น
6. จากห้องถึงเริ่มนับถอยหลัง = 2 แตะ (การ์ด → พร้อม) เท่ากับวันนี้ +1
7. เกมโปรด (`picker.favorites`): ไผ่ → กระโดดข้ามก้อน (พลังล้น อยู่นิ่งไม่ได้) · ใหม่ → จำท่าทาง (เลียนแบบแล้วได้คำชม = มั่นใจขึ้น) · มิน → ฝนขนม (เก็บของให้ทีม) · แอ๊ค → เป่าฟองสบู่ (สีสัน Visual Feeling) · ฟ้า → เป่าฟองสบู่ (สงบ ทำเร็ว) · ปาม → ไม่มี เกมโปรดให้แค่ fun × 1.2 และประโยคดีใจ **ไม่ให้เหรียญเพิ่ม**

Proposed HUD contract (kiln to fix): `hud.showMinigamePicker({ games: [{ id, title, howTo, best, controls, favorite, last }] })`, `hud.hideMinigamePicker()`, handlers `onMinigamePick(id)`, `onMinigameOther()` (result card "เกมอื่น").

### 3.2 จำท่าทาง (`mimic`)
**Pads (ท่า):** ปุ่มใหญ่ ≥ 76 px เรียงเป็นวงที่แถบล่าง แต่ละท่าต่างกัน 4 ทาง: หน้าตัวละครบนปุ่ม รูปทรงกรอบ สี และโน้ตดนตรี (pentatonic) — ตาบอดสีเล่นได้ ปิดเสียงก็เล่นได้

| Pose id | ชื่อ | expression + action | สี (glaze token) | รูปทรง | โน้ต |
|---|---|---|---|---|---|
| `smile` | ยิ้ม | smile + nod | ชมพู | วงกลม | 1 |
| `surprised` | ตกใจ | surprised + hop | ม่วงอ่อน | ดาว | 2 |
| `wink` | ขยิบตา | wink + tilt | ฟ้า | หยดน้ำ | 3 |
| `sleepy` | ง่วง | sleepy + sway | ลาเวนเดอร์ | พระจันทร์ | 4 |
| `shy` | เขิน | shy + wiggle | พีช | หัวใจ | 5 |
| `joy` | ดีใจ | joy + jelly | เหลืองนวล | ดวงอาทิตย์ | 6 |

**Rules**
1. เริ่มด้วย 4 ท่าแรก ลำดับยาว `startLength` (2) ทุกลำดับใหม่ = ลำดับเดิม + 1 ท่าสุ่ม (แบบ Simon จำต่อจากเดิม) ท่าเดียวกันไม่เกิน 2 ครั้งติดกัน เมื่อความยาวถึง `pads.addAt` (6) เพิ่มเป็น 6 ท่า (`pads.max`)
2. **ช่วงดู:** ตัวละครทำท่าทีละท่า (หน้า + action สั้นๆ) ปุ่มนั้นเรืองแสง + โน้ต ใช้เวลา `showSec(L)` ต่อท่า + ช่องว่าง `gapSec`
3. **ช่วงทำตาม:** ผู้เล่นแตะปุ่มตามลำดับ ทุกครั้งที่แตะ ตัวละครทำท่าตามสั้นๆ 0.35 s + โน้ต **ไม่มีจับเวลาต่อการแตะ** ถ้าไม่แตะ `hintAfterSec` (6 s) ปุ่มถัดไปจะกระพริบเบาๆ เป็นคำใบ้ (ลำดับนั้นได้คะแนนครึ่งเดียว)
4. **ถูกทั้งลำดับ:** ตัวละครดีใจ `mimicGood` ("เก่งมาก!") คะแนน + `L × pointsPerPose` แล้วต่อด้วยลำดับยาว L+1 หลังพัก 1 s
5. **กดผิด (slip):** เสียง "ปุ๊" นุ่มๆ (ไม่ใช่เสียง buzzer) ตัวละครยิ้มเขิน `mimicSlip` ("อุ๊ย ไม่เป็นไร ดูอีกทีน้า") แล้วโชว์ลำดับเดิมอีกครั้งช้าลง (`showSec × slipReplaySlow` 1.25) ถ้าพลาดลำดับเดิมเป็นครั้งที่ 2 ความยาวลดลง 1 (ไม่ต่ำกว่า 2) "ลองสั้นลงหน่อยนะ" โอกาสแสดงเป็นจุดกลม 3 จุดที่ค่อยๆ จางลง (ไม่ใช่หัวใจแตก)
6. **จบรอบ** เมื่อ: พลาดครบ `slipsPerRound` (3) · หรือจบลำดับความยาว `maxLength` (12) · หรือเวลาเกิน `maxSec` (75 s) — กรณีเวลา จะจบหลังลำดับที่กำลังเล่นอยู่เสร็จ (ไม่ตัดกลางลำดับ) การ์ดผลแสดง "ไปได้ถึง X ท่า!"
7. **Controls:** แตะ/คลิกปุ่ม · คีย์ 1–6 หรือ ←↑→↓ สำหรับ 4 ท่าแรก · **ไม่มีโหมดเอียงหัวใน S5:** เลือก 1 ใน 4–6 ปุ่มด้วยการเอียงซ้าย/ขวาอย่างเดียวช้าและเมื่อย (ต้องเลื่อน + ค้าง) ซึ่งขัดกับความสนุกของเกมจำ ทางที่ดีกว่าในอนาคตคือโหมด **"ทำหน้าตาม"** ใช้ face blendshapes (ยิ้ม อ้าปาก หลับตา ขยิบตา) ของ Face Landmarker ที่มีใน tasks-vision 0.10.14 (`outputFaceBlendshapes`) — ต้องเปิด option ใหม่และทดสอบบนมือถือก่อน จึงเป็นคำถาม owner ข้อ 3
8. **Difficulty curve:** `showSec` 0.75 s (L = 2) → 0.50 s (L ≥ 10) แบบเส้นตรง จำนวนท่า 4 → 6 ที่ L = 6 นอกนั้นยากขึ้นจากความยาวเอง
9. AFK: ช่วงทำตามไม่มีการแตะ 20 s → pause sheet "ยังเล่นอยู่ไหม?" (เวลาหยุด)

### 3.3 เป่าฟองสบู่ (`bubbles`)
**Look:** ตัวละครถือที่เป่าฟองที่แถบล่าง เป่าฟองขึ้นไปลอยช้าๆ เป็นเส้นโค้งนิ่มๆ แล้วลอยหายไปด้านบน ฟองมี 4 สี และ **ลายในฟอง** ต่างกันเสมอ: ชมพู (หัวใจ) · ม่วงอ่อน (ดาว) · ฟ้า (จุด) · เหลืองนวล (ทาง) ไม่มีแดงสดหรือเขียวสด ฟองเหรียญ = ฟองรุ้งอ่อนๆ มีเหรียญข้างใน

**Rules**
1. **การเรียกสี:** ตัวละครพูด `bubbleCall` "ฟองสี{color}!" และชิปเล็กบนแถบบนแสดงสี + ลาย + ชื่อสีค้างไว้ตลอด ที่เป่าฟองเรืองแสงเป็นสีนั้น เปลี่ยนสีทุก `call.everySec` (7 s ± `call.jitterSec` 1) มีเสียงกริ๊งเตือน + "เปลี่ยนสี!" ล่วงหน้า `call.warnSec` (0.8 s) สีใหม่ไม่ซ้ำสีเดิม ภายใน 1 s หลังเปลี่ยนต้องมีฟองสีที่เรียกบนจออย่างน้อย `call.minOnScreen` (2) ฟอง (spawn บังคับ)
2. **Spawn:** อัตรา `spawn.startPerSec` 1.1 → `endPerSec` 2.2 ฟอง/วินาที (curve `rampPower` 1.3) ฟองที่เกิดเป็นสีที่เรียก `targetShare` 40% ฟองเหรียญ `coinShare` 7% ที่เหลือแบ่งเท่ากันในสีอื่น บนจอไม่เกิน `spawn.maxOnScreen` (9)
3. **Motion:** ลอยขึ้น `rise.start` 0.18 → `rise.end` 0.30 ความสูงจอ/วินาที ส่ายซ้ายขวา `drift` 0.06 ความกว้าง ขนาดฟอง `bubbleSize` 0.5 หน่วย (≥ 56 px บนมือถือ) พื้นที่แตะ × `hitScale` 1.3
4. **แตะฟองสีที่เรียก:** ฟองแตก (sfx `pop`) +10 × mult streak +1 ตัวละครเด้งเบาๆ · **ฟองเหรียญ:** +15 × mult และ +2 เหรียญ streak +1 (sfx `coin`) แตะได้ทุกเวลาไม่ขึ้นกับสี · **แตะผิดสี:** ฟองแตกเสียง "ปุ๊" เบาๆ streak → 0 ไม่เสียคะแนน ตัวละครเอียงหัว `bubbleWrong` ("อุ๊ย สีนี้ไม่ใช่น้า") · ฟองที่ลอยหายไปไม่มีผลอะไร
5. ฟองซ้อนกันใต้นิ้ว: เลือกฟองสีที่เรียก (หรือเหรียญ) ที่อยู่ใกล้นิ้วที่สุดในรัศมีก่อน — ใจดีกับผู้เล่น · หลายนิ้วพร้อมกันได้สูงสุด 2 จุด
6. รอบละ `durationSec` 45 s
7. **Controls:** แตะ/คลิกที่ฟอง · **คีย์บอร์ดและเอียงหัว (ทางเลือก):** "ดาวป๊อป" ลอยอยู่ที่แถบกลางจอ (`popStar.y` 55% ของความสูงเล่น) เลื่อนซ้าย/ขวาด้วย ←→ หรือการเอียงหัว (ใช้ `poseToAxis` เดิม) ฟองสีที่เรียกและฟองเหรียญที่แตะดาวแตกเอง ฟองผิดสีลอยผ่านด้านหลัง **ไม่รีเซ็ต streak** (หลบยากกว่าการแตะ) ในโหมดนี้ฟองลอยช้าลง × `popStar.riseScale` 0.85 — ทำได้ด้วย roll ที่มีอยู่แล้ว ไม่ต้องเพิ่มระบบกล้อง
8. **Difficulty curve:** อัตราเกิดและความเร็วลอยเพิ่มตาม `p^1.3` ช่วง 8 s แรกของการเล่นครั้งแรกใช้ค่าเริ่มต้นตลอด

### 3.4 กระโดดข้ามก้อน (`hop`)
**Look:** ตัวละครยืนที่ 30% จากซ้ายของพื้นที่เล่น หันข้างเล็กน้อย (~30°) ทำท่าวิ่งอยู่กับที่ (เด้งเบาๆ) แถบพื้นดินเหนียวเลื่อนจากขวาไปซ้าย **ก้อน** กลิ้งเข้ามา: `pebble` ก้อนกรวดดินเหนียวเล็ก · `cushion` หมอนนุ่ม · `demon` ปีศาจลูกค้าตัวจิ๋วทำหน้าบึ้ง (mesh เดิมจาก Snack Rain) ทุกก้อนข้ามได้ด้วยการกระโดดครั้งเดียว บางก้อนมีเหรียญลอยเป็นโค้งอยู่ด้านบน

**Rules**
1. **กระโดด:** แตะ = กระโดด ลอยอยู่ `jump.airSec` 0.62 s สูง `jump.height` 1.1 หน่วย **กระโดดซ้อนกลางอากาศได้ 1 ครั้ง** (+`jump.doubleAirSec` 0.35 s) สำหรับก้อนคู่ · แตะก่อนแตะพื้นไม่เกิน `jump.bufferSec` 0.15 s จะกระโดดต่อทันทีที่ลง (input buffer ใจดี)
2. **Spawn:** ช่วงห่าง `spawn.gapStartSec` 1.9 → `gapEndSec` 1.1 s (± `gapJitter` 15%) แต่ไม่น้อยกว่า `jump.airSec × spawn.minGapAir` (1.6) ความเร็วพื้น `speed.start` 2.6 → `speed.end` 4.2 หน่วย/วินาที **ก้อนคู่** (สองก้อนติดกัน ต้องกระโดดซ้อน) เริ่มหลัง `doubles.afterSec` 20 s โอกาส `doubles.share` 15% เหรียญลอยเหนือก้อน `coinShare` 30%
3. **ข้ามได้:** +10 × mult streak +1 (sfx `whoosh` เบาๆ) · **เก็บเหรียญ:** +15 × mult และ +2 เหรียญ (sfx `coin`)
4. **ชนก้อน:** ไม่มีตาย ไม่หยุดเกม ตัวละครบีบตัวนุ่มๆ (`setSquish` pulse 0.3 s) เสียง "บุ๋ง" (sfx `boing`) streak → 0 ก้อนกลิ้งออกไปด้านข้างเบาๆ แล้วตัวละครกะพริบโปร่งเล็กน้อย `bumpGraceSec` 0.5 s (ชนซ้ำไม่ได้) ความเร็วไม่ลด ชนปีศาจ: หน้าตาม persona `hurtExpr` (ใหม่ดูเสียใจ ไม่โกรธ) + `minigameDemon` ตาม cooldown · ชนก้อนอื่น: `hopBump` ("อุ๊ย!")
5. รอบละ `durationSec` 45 s
6. **Controls:** แตะตรงไหนก็ได้นอก HUD · คลิกเมาส์ · Space / ↑ / W · **เอียงหัว = "สะบัดหัว" (tilt flick):** เมื่อมุม roll เทียบ neutral ข้ามจากต่ำกว่า `headFlick.offDeg` (6°) ไปเกิน `headFlick.onDeg` (12°) ภายใน `headFlick.withinSec` (0.25 s) ไม่ว่าซ้ายหรือขวา = กระโดด 1 ครั้ง ต้องกลับมาต่ำกว่า 6° ก่อนจึงกระโดดได้อีก (สะบัดสองครั้งเร็วๆ = กระโดดซ้อน) ใช้ roll ที่มีอยู่แล้วทั้งหมด
   - **ทำไมไม่ใช้พยักหน้า (nod):** ระบบ head วันนี้ไม่มี pitch ต้องประมาณจากตำแหน่งจมูกเทียบเส้นตา ซึ่งปนกับการขยับหน้าเข้า-ออกกล้องและการหัวเราะ เสี่ยงกระโดดเองโดยไม่ตั้งใจ จึงเก็บเป็นการทดลองภายหลัง (คำถาม owner ข้อ 4)
   - โหมดหัวมี latency ของกล้อง (~100–200 ms บนมือถือ) จึงชดเชย: ความเร็วพื้น × `headMode.speedScale` 0.8 และเวลาลอย × `headMode.airScale` 1.15 ไม่มีก้อนคู่ในโหมดหัว
7. **Difficulty curve:** ความเร็วและความถี่เพิ่มตาม `p^1.3` ก้อนคู่หลัง 20 s ครั้งแรกที่เล่น 8 s แรกช้าสุด

### 3.5 Accessibility (all games)
- ทุกข้อมูลที่ใช้สีมีรูปทรง/ลายคู่เสมอ (pads, bubbles) และมีชื่อเป็นข้อความ
- ไม่มีแสงกระพริบเร็วกว่า 3 ครั้ง/วินาที ประกายต่างๆ นุ่มและช้า เคารพ `prefers-reduced-motion`: ตัดการเด้งตัว/สั่นจอ เหลือแค่เปลี่ยนสีหน้า
- เล่นได้ด้วยมือเดียว ปุ่มและเป้าแตะ ≥ 56 px (pads ≥ 76 px)
- เสียงเป็นแค่ตัวช่วย ทุกเกมเล่นได้เมื่อปิดเสียง (โน้ต = ปุ่มเรืองแสง, การเรียกสี = ชิปสีค้างบนจอ)
- **"โหมดสบายๆ"** (`relaxed`, สวิตช์บนการ์ด intro ของทุกเกม จำค่าไว้ต่อเกม): mimic `showSec × 1.4` และ hint หลัง 3 s · bubbles เหลือ 3 สี ลอยช้า × 0.8 · hop ความเร็ว × 0.8 ไม่มีก้อนคู่ · ฝนขนม ใช้โหมด lanes เดิม — เหรียญคิดด้วยสูตรเดิม (โหมดสบายๆ มีของน้อยลงจึงได้คะแนนใกล้เคียงกัน ไม่ใช่ทางลัดหาเหรียญ ดู AC 12)
- ข้อความเป็นไทยสั้นๆ อ่านง่าย ตัวเลขใช้ Poppins

## 4. Formulas

Let `t` = seconds played, `D` = `durationSec`, `p = t / D`, `e = p ^ rampPower`, `lerp(a, b, x) = a + (b − a) × x`.

### 4.1 จำท่าทาง
- `showSec(L) = lerp(showStartSec, showEndSec, clamp((L − startLength) / (showRampLength − startLength), 0, 1))` → L = 2: 0.75 s, L = 6: 0.625 s, L ≥ 10: 0.50 s
- Show phase length ≈ `L × (showSec + gapSec)`; L = 6 → 6 × 0.775 = 4.65 s
- `pads(L) = L ≥ pads.addAt ? pads.max : pads.start` (4 → 6)
- Completed sequence: `score += L × pointsPerPose × (hintUsed ? hintScale : 1)`
- Slip: `slips += 1`; second slip at the same L → `L = max(startLength, L − 1)`
- End: `slips ≥ slipsPerRound || L > maxLength || (t ≥ maxSec && no sequence in progress)`
- Coins: `min(60, max(minFloor, floor(score / coinsPerPoints)))`, `coinsPerPoints` 5.5
- Worked example: typical child reaches L = 6, slips at 7 three times → score = (2+3+4+5+6) × 10 = 200 → floor(200 / 5.5) = **36 coins**. Reaching L = 9 → (2+…+9) × 10 = 440 → **60** (cap).
- `f` for needs: 1 if the round ended by rule; else `t / maxSec`.

### 4.2 เป่าฟองสบู่
- `rate(t) = lerp(startPerSec, endPerSec, e)`; expected bubbles per round ≈ `D × (start + (end − start) / (rampPower + 1))` = 45 × (1.1 + 1.1 / 2.3) ≈ **71**, of which ≈ 28 called-colour and ≈ 5 coin bubbles
- `rise(t) = lerp(rise.start, rise.end, e)`; time on screen ≈ 1 / rise ≈ 5.6 s → 3.3 s
- Called-colour pop: `score += round(10 × mult(streak))`; coin bubble: `score += round(15 × mult)`, `coins += 2`; wrong colour: `streak = 0`
- Coins: `min(60, max(minFloor, 2 × coinPops + floor(score / 12)))`
- Worked example: 20 pops at average mult 1.75 ≈ 350 points + 4 coin bubbles → 8 + floor(350 / 12) = 8 + 29 = **37 coins**

### 4.3 กระโดดข้ามก้อน
- `gap(t) = max(lerp(gapStartSec, gapEndSec, e) × (1 ± gapJitter), jump.airSec × minGapAir)` → 1.9 s → 1.1 s, never under 0.99 s
- `speed(t) = lerp(speed.start, speed.end, e)` units/s; expected obstacles per round ≈ **29**
- Clear: `score += round(10 × mult)`; coin: `score += round(15 × mult)`, `coins += 2`; bump: `streak = 0`
- Coins: `min(60, max(minFloor, 2 × coinsGot + floor(score / 14)))`
- Head flick: `hop when |roll − neutral| > onDeg and the last time it was < offDeg is within withinSec`; re-arm when `|roll − neutral| < offDeg`
- Worked example: 23 clears (78%), mult average 1.6 → ≈ 370 points + 5 coins → 10 + floor(370 / 14) = 10 + 26 = **36 coins**

### 4.4 Balance check (400 seeded simulated rounds per profile; scratch script, positions not modelled)

Coins per minute include ~15 s of countdown and result card (a 45 s game ≈ 1 minute per round).

| Profile | ฝนขนม (S2) | จำท่าทาง | เป่าฟองสบู่ | กระโดดข้ามก้อน |
|---|---|---|---|---|
| Weak (young child) | 21 /round · 21 /min | 29 /round (66 s) · 22 /min | 22 · 22 /min | 22 · 22 /min |
| Typical | 36 · 36 /min | 52 /round (80 s) · 32 /min | 37 · 37 /min | 37 · 37 /min |
| Strong | 52 · 52 /min | 60 /round (84 s) · 36 /min | 55 · 55 /min | 55 · 55 /min |

- Typical players earn within ±12% per minute in every game, so the best way to earn coins is "the game you like". จำท่าทาง is slightly lower per minute on purpose: it has no time pressure and the longest rounds; it pays the most per round, which feels good to children.
- Strong players earn most in the 45 s action games (≤ 55/min), as in Snack Rain today; the 60 cap and 45 s rounds bound it.
- The Christmas set (economy 10.4) therefore takes the same ~76 typical rounds whichever games are played.

### 4.5 Needs per completed round (before `playGain` and favourite scale)

| Game | fun | social | hunger | Why |
|---|---|---|---|---|
| ฝนขนม (unchanged) | +0.25 | +0.10 | −0.05 | |
| จำท่าทาง | +0.20 | +0.15 | −0.03 | เล่นเลียนแบบกัน = ใกล้ชิด เคลื่อนไหวน้อย |
| เป่าฟองสบู่ | +0.25 | +0.10 | −0.03 | สบายๆ |
| กระโดดข้ามก้อน | +0.30 | +0.05 | −0.08 | วิ่งเยอะ หิวขึ้น → ชวนไปป้อนอาหาร |

Example: ไผ่ (playGain 1.5) completes กระโดดข้ามก้อน, her favourite: fun +0.30 × 1.5 × 1.2 = +0.54, social +0.05, hunger −0.08.

## 5. Edge Cases

1. **Background / tab hidden / lock:** pause, timer stops; resume countdown (shared). จำท่าทาง paused in show phase replays the sequence from the start after resume.
2. **Exit mid-round:** coins from current score with no minimum; needs × f; best updates if beaten (shared).
3. **จำท่าทาง AFK:** 20 s without a tap in the input phase → pause sheet; never counts as a slip.
4. **จำท่าทาง tap during show phase:** ignored (pads dimmed) — never a slip.
5. **จำท่าทาง reaches `maxLength`:** round ends with a special win line and sparkle; score capped by the formula, coins hit the cap.
6. **เป่าฟองสบู่: no called-colour bubble on screen** (bad luck): the spawn guarantee adds one within 1 s of the call and whenever none exist for 1.5 s.
7. **เป่าฟองสบู่: tap lands between two bubbles:** nearest called colour/coin inside `hitScale` wins; else nearest bubble.
8. **เป่าฟองสบู่: colour changes while a finger is on its way:** a pop of the *previous* colour within `call.graceSec` (0.4 s) after the change still counts as correct.
9. **กระโดดข้ามก้อน: spam taps:** one jump + one double jump in the air; further taps are ignored until landing (buffer keeps at most one).
10. **กระโดดข้ามก้อน head flick false triggers** (laughing, talking): flick needs the speed rule (`withinSec`) and the re-arm; slow head drift never jumps. Camera lost > `HEAD_FEEL.lostSeconds` (0.7 s): soft coach "หันหน้าให้กล้องเห็นนะ", obstacles keep coming but bumps do not reset the streak while the face is lost.
11. **Camera denied/unavailable for a head mode:** fall back to touch with the existing Thai message (Sprint 3 #3).
12. **Very wide desktop:** play width capped (`playWidthMaxUnits`, shared idea): bubbles spawn inside the capped width; hop shows the pet at 30% of the capped width.
13. **Small phone (360 px):** pads wrap to 2 rows of 3 at 6 poses; bubble size is world-space and the hit area never under 48 px.
14. **Pet is ก้อนจิ๋ว:** minigame scale floor (shared rules) keeps hit areas fair.
15. **Data missing for a game** (old minigames.json): that card is hidden in the picker; Snack Rain always shows.
16. **Hunger 0 / fun 1:** games still allowed and still pay coins (pet never gets sick).

## 6. Dependencies

| System | Uses | Owner |
|---|---|---|
| Snack Rain GDD | shared flow, pause, coin rules, intro/result cards, head control choice | loop |
| Economy (`economy.md`) | coins per minute parity; sinks (wardrobe, decor, Christmas) | loop |
| Needs (`needs-system.md`) | round-end deltas, `playGain` | loop |
| Growth (`growth-personality.md`) | minigame time counts as engaged; `minigameMix`; `minigameMinScale` | loop |
| Personas (`personas.json`) | new line events (3.0), `hurtExpr`, `playGain`, `picker.favorites` | loop (+ echo for voice) |
| Character (clay) | `setExpression`, `play`, `setSquish`, side-facing run bob, wand pose | clay |
| Props (prop) | bubble mesh (4 colours + patterns, coin bubble), pop star, pebble, cushion, scrolling floor strip; demon and coin meshes reused | prop |
| HUD (glaze) | picker sheet, pads, colour-call chip, slip dots, relaxed toggle, "เกมอื่น" | glaze |
| Audio (echo) | `note` (6 pitches), `pop`, `tap`, `coin`, `boing`, `whoosh`, new `call` chime, `hop` | echo |
| Input (wire) | head roll + new flick detector, keys, multi-touch for bubbles | wire |
| Save (wire) | `best[gameId]` per character, `settings.minigameControl[gameId]`, `settings.relaxed[gameId]`, last played game | wire |

## 7. Tuning Knobs

### 7.1 Table

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| `picker.favoriteFunScale` | 1.2 | 1–1.5 | joy of the favourite game (fun only) |
| `mimic.startLength` / `maxLength` | 2 / 12 | 2–3 / 8–16 | entry and ceiling |
| `mimic.pads.start` / `max` / `addAt` | 4 / 6 / 6 | 3–4 / 4–6 / 4–9 | memory load |
| `mimic.showStartSec` / `showEndSec` / `showRampLength` | 0.75 / 0.5 / 10 | 0.6–1.0 / 0.4–0.7 / 6–14 | pace of the show |
| `mimic.gapSec` | 0.15 | 0.1–0.3 | readability |
| `mimic.hintAfterSec` / `hintScale` | 6 / 0.5 | 3–12 / 0–1 | help for kids |
| `mimic.slipsPerRound` / `slipReplaySlow` | 3 / 1.25 | 2–5 / 1–1.6 | forgiveness |
| `mimic.maxSec` | 75 | 60–120 | round length, coins per minute |
| `mimic.pointsPerPose` / `coinsPerPoints` | 10 / 5.5 | — / 4–8 | coins |
| `bubbles.durationSec` | 45 | 30–60 | round length |
| `bubbles.spawn.startPerSec` / `endPerSec` / `rampPower` | 1.1 / 2.2 / 1.3 | 0.8–1.5 / 1.6–3 / 1–2 | density |
| `bubbles.rise.start` / `end` | 0.18 / 0.30 | 0.12–0.25 / 0.22–0.4 | reaction time |
| `bubbles.targetShare` / `coinShare` | 0.4 / 0.07 | 0.3–0.6 / 0.04–0.12 | how busy, coin flow |
| `bubbles.call.everySec` / `warnSec` / `graceSec` | 7 / 0.8 / 0.4 | 5–12 / 0.5–1.5 / 0.2–0.8 | switching load |
| `bubbles.bubbleSize` / `hitScale` | 0.5 / 1.3 | 0.4–0.7 / 1.1–1.6 | forgiveness |
| `bubbles.coinsPerPoints` | 12 | 9–16 | coins |
| `hop.jump.airSec` / `height` / `doubleAirSec` / `bufferSec` | 0.62 / 1.1 / 0.35 / 0.15 | 0.5–0.8 / 0.8–1.4 / 0.2–0.5 / 0.05–0.25 | feel |
| `hop.spawn.gapStartSec` / `gapEndSec` / `gapJitter` / `minGapAir` | 1.9 / 1.1 / 0.15 / 1.6 | 1.5–2.5 / 0.9–1.5 / 0–0.3 / 1.3–2 | density, fairness |
| `hop.speed.start` / `end` | 2.6 / 4.2 | 2–3.2 / 3.4–5 | reaction time |
| `hop.doubles.afterSec` / `share` | 20 / 0.15 | 10–45 / 0–0.3 | challenge |
| `hop.headFlick.onDeg` / `offDeg` / `withinSec` | 12 / 6 / 0.25 | 9–18 / 4–8 / 0.15–0.4 | head jump sensitivity |
| `hop.headMode.speedScale` / `airScale` | 0.8 / 1.15 | 0.6–1 / 1–1.3 | latency compensation |
| `hop.coinsPerPoints` | 14 | 10–18 | coins |
| `*.minCoinsPerRound` / `maxCoinsPerRound` | 5 / 60 | 0–10 / 40–100 | floor and ceiling |
| `*.needs.fun / social / hunger` | see 4.5 | 0.1–0.4 / 0–0.2 / −0.15…0 | care value of play |
| `*.relaxed.*` | see 3.5 | 0.6–1 | accessibility mode |

### 7.2 Draft additions to `assets/data/minigames.json` (S5 implementation; `snackRain` unchanged)
```json
{
  "picker": {
    "order": ["snackRain", "mimic", "bubbles", "hop"],
    "favorites": { "flower": "hop", "splat": "mimic", "gumdrop": "snackRain", "diamond": "bubbles", "cloud": "bubbles" },
    "favoriteFunScale": 1.2,
    "firstPlayEasySec": 8,
    "lineCooldownSec": 6
  },
  "mimic": {
    "title": "จำท่าทาง", "howTo": "ดูท่าของเพื่อน แล้วกดตามให้ครบ",
    "controls": ["touch"],
    "poses": [
      { "id": "smile",     "label": "ยิ้ม",    "expr": "smile",     "action": "nod",    "color": "pink",     "shape": "circle", "note": 1 },
      { "id": "surprised", "label": "ตกใจ",   "expr": "surprised", "action": "hop",    "color": "lilac",    "shape": "star",   "note": 2 },
      { "id": "wink",      "label": "ขยิบตา", "expr": "wink",      "action": "tilt",   "color": "sky",      "shape": "drop",   "note": 3 },
      { "id": "sleepy",    "label": "ง่วง",    "expr": "sleepy",    "action": "sway",   "color": "lavender", "shape": "moon",   "note": 4 },
      { "id": "shy",       "label": "เขิน",    "expr": "shy",       "action": "wiggle", "color": "peach",    "shape": "heart",  "note": 5 },
      { "id": "joy",       "label": "ดีใจ",    "expr": "joy",       "action": "jelly",  "color": "butter",   "shape": "sun",    "note": 6 }
    ],
    "startLength": 2, "maxLength": 12,
    "pads": { "start": 4, "max": 6, "addAt": 6 },
    "showStartSec": 0.75, "showEndSec": 0.5, "showRampLength": 10, "gapSec": 0.15,
    "mirrorSec": 0.35, "betweenSec": 1.0,
    "hintAfterSec": 6, "hintScale": 0.5,
    "slipsPerRound": 3, "slipReplaySlow": 1.25, "stepBackAfterSlipsAtLength": 2,
    "afkPauseSec": 20,
    "maxSec": 75,
    "pointsPerPose": 10, "coinsPerPoints": 5.5,
    "minCoinsPerRound": 5, "minCoinsOnlyIfComplete": true, "maxCoinsPerRound": 60,
    "needs": { "fun": 0.2, "social": 0.15, "hunger": -0.03 },
    "relaxed": { "showScale": 1.4, "hintAfterSec": 3 },
    "lines": { "good": "mimicGood", "slip": "mimicSlip" }
  },
  "bubbles": {
    "title": "เป่าฟองสบู่", "howTo": "แตะฟองสีที่เพื่อนเรียก",
    "controls": ["touch", "head"],
    "durationSec": 45, "countdownSec": 3,
    "colors": [
      { "id": "pink",   "label": "ชมพู",     "pattern": "heart" },
      { "id": "lilac",  "label": "ม่วง",      "pattern": "star" },
      { "id": "sky",    "label": "ฟ้า",       "pattern": "dot" },
      { "id": "butter", "label": "เหลือง",    "pattern": "stripe" }
    ],
    "spawn": { "startPerSec": 1.1, "endPerSec": 2.2, "rampPower": 1.3, "maxOnScreen": 9 },
    "rise": { "start": 0.18, "end": 0.30 },
    "drift": 0.06,
    "bubbleSize": 0.5, "hitScale": 1.3, "maxTouches": 2,
    "targetShare": 0.4, "coinShare": 0.07,
    "call": { "everySec": 7, "jitterSec": 1, "warnSec": 0.8, "graceSec": 0.4, "minOnScreen": 2, "emptyRescueSec": 1.5 },
    "points": { "target": 10, "coin": 15 }, "coinValue": 2,
    "streak": { "step": 4, "bonusPerStep": 0.5, "maxMultiplier": 3, "resetOnWrong": true },
    "popStar": { "y": 0.55, "radius": 0.45, "riseScale": 0.85, "keySpeed": 1.1 },
    "coinsPerPoints": 12,
    "minCoinsPerRound": 5, "minCoinsOnlyIfComplete": true, "maxCoinsPerRound": 60,
    "needs": { "fun": 0.25, "social": 0.1, "hunger": -0.03 },
    "relaxed": { "colors": 3, "riseScale": 0.8 },
    "lines": { "call": "bubbleCall", "wrong": "bubbleWrong" }
  },
  "hop": {
    "title": "กระโดดข้ามก้อน", "howTo": "แตะเพื่อกระโดดข้ามก้อนนุ่มๆ",
    "controls": ["touch", "head"],
    "durationSec": 45, "countdownSec": 3,
    "petX": 0.3,
    "jump": { "airSec": 0.62, "height": 1.1, "doubleAirSec": 0.35, "bufferSec": 0.15 },
    "spawn": { "gapStartSec": 1.9, "gapEndSec": 1.1, "gapJitter": 0.15, "minGapAir": 1.6, "rampPower": 1.3,
               "kinds": { "pebble": 0.45, "cushion": 0.35, "demon": 0.2 } },
    "speed": { "start": 2.6, "end": 4.2 },
    "doubles": { "afterSec": 20, "share": 0.15 },
    "coinShare": 0.3,
    "points": { "clear": 10, "coin": 15 }, "coinValue": 2,
    "streak": { "step": 4, "bonusPerStep": 0.5, "maxMultiplier": 3, "resetOnBump": true },
    "bumpGraceSec": 0.5, "bumpSquish": 0.3,
    "headFlick": { "onDeg": 12, "offDeg": 6, "withinSec": 0.25 },
    "headMode": { "speedScale": 0.8, "airScale": 1.15, "doubles": false },
    "coinsPerPoints": 14,
    "minCoinsPerRound": 5, "minCoinsOnlyIfComplete": true, "maxCoinsPerRound": 60,
    "needs": { "fun": 0.3, "social": 0.05, "hunger": -0.08 },
    "relaxed": { "speedScale": 0.8, "doubles": false },
    "lines": { "bump": "hopBump", "demon": "minigameDemon" }
  }
}
```

## 8. Acceptance Criteria

Unit tests (pure rules modules per game, seeded RNG, injected `dt`):
1. Data: `picker`, `mimic`, `bubbles`, `hop` blocks parse; every key in 7.2 exists; `picker.order` lists exactly the 4 game ids; each favourite is a known game id.
2. Mimic: `showSec(2)` = 0.75, `showSec(6)` = 0.625, `showSec(12)` = 0.5 (± 0.001); `pads(5)` = 4, `pads(6)` = 6; a new sequence keeps the previous one as its prefix; no pose 3 times in a row over 1 000 seeded sequences.
3. Mimic: completed L = 6 adds 60 (30 with hint); second slip at L = 5 → next L = 4; slip at L = 2 twice → L stays 2; 3 slips end the round; time ≥ 75 s ends only after the current sequence.
4. Mimic coins: score 200 → 36; 440 → 60; 0 completed → 5; exit early with 0 → 0.
5. Bubbles: expected spawn count over 1 000 seeded rounds 71 ± 3; after every colour call a called-colour bubble exists within 1 s; a wrong-colour pop sets streak 0 and leaves score unchanged; a previous-colour pop 0.3 s after a change counts as correct.
6. Bubbles coins: 4 coin pops + score 350 → 37.
7. Hop: no gap under `airSec × minGapAir` in 1 000 seeded rounds; no doubles before 20 s or in head mode; a bump sets streak 0 and never changes coins; at most 1 double jump per airtime.
8. Hop head flick: roll sequence 0° → 13° in 0.2 s → hop; 0° → 13° over 0.5 s → no hop; holding 13° → one hop only; back to 5° then 13° fast → second hop.
9. Hop coins: 5 coins + score 370 → 36.
10. Needs: ไผ่ completes hop (favourite) from fun 0.3 → 0.84; from hunger 0.05 → 0 (clamped).
11. Balance: seeded 400-round simulation of the typical profile gives coins per minute (with 15 s overhead) between 30 and 42 for all four games; weak profile ≥ 18 per minute in each.
12. Relaxed mode: the typical profile's coins per minute in relaxed mode stays within ±15% of normal for each game.

Playtest / manual (phone 390×844 + desktop, light + dark, touch, mouse, keys, head):
13. From the living room, a first-time child can start any game in ≤ 3 taps and understands the goal from the intro line (5 of 5 testers).
14. Mimic pads are distinguishable in grayscale (screenshot test) and with sound off.
15. Bubble colours are distinguishable in grayscale by pattern; the colour chip is always visible.
16. Hop with head flick: a tester clears ≥ 60% of obstacles after one practice round; laughing or talking does not trigger jumps more than once per round.
17. No game shows a "แพ้ / game over" message, a sick or crying pet, or loses coins.
18. Result card offers "เล่นอีก", "เกมอื่น" and ✕; best score per character per game is saved and shown on the picker card.

## Open questions for the owner
1. Favourite games per character (3.1 #7) — keep, or no favourites at all?
2. Mimic: 3 slips per round (default), or unlimited slips with only the 75 s timer (even gentler)?
3. Mimic "ทำหน้าตาม" camera mode (copy the face with your own face via face blendshapes) as a later feature — worth a prototype?
4. Hop head control: tilt flick (default, works with today's camera code) — or prototype nodding later?
5. Should the picker remember the last game and let "เล่น" long-press start it directly? Default: no, always show the picker.
