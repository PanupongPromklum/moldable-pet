# Growth & Raised Personality (การเติบโตและนิสัยที่เลี้ยงมา)

Owner: loop · Story: S5-D1 · Status: Draft v1 (2026-11-06), numbers awaiting owner sign-off
Data (future): `assets/data/growth.json` (draft in section 7.2) · persona tendencies in `personas.json`
Related: `design/gdd/needs-system.md`, `design/gdd/economy.md`, `design/gdd/minigames-2.md`, `design/gdd/conversation.md` (echo, S5-D3), `docs/architecture/module-contracts.md`

Owner decisions (sprint-04 interview): **option C** — ผู้เล่นเลือก 1 ใน 5 ตัวละครเหมือนเดิม ตัวละครโตตามอายุ พอโตเต็มวัยจะมี "นิสัยที่เลี้ยงมา" ตามวิธีที่ผู้เล่นดูแล · **ความเร็ว: ไม่กี่ชั่วโมงของการเล่น** จนโตเต็มวัย

## 1. Overview

ตัวละครแต่ละตัวมี **อายุการเลี้ยง** (`activeSec`) ที่นับเฉพาะเวลาที่ผู้เล่นอยู่ด้วยและดูแลจริง ไม่นับเวลาที่ปิดแอป เมื่อสะสมครบเกณฑ์ ตัวละครจะโตจาก **ก้อนจิ๋ว** (`baby`) → **ก้อนซน** (`kid`) → **ก้อนโต** (`grown`) รวมประมาณ **3 ชั่วโมงของการเล่น** แต่ละขั้นเปลี่ยนขนาดตัว สัดส่วนตา ความนิ่มเด้ง ระดับเสียง และระดับคำพูด ระหว่างโต เกมจะจด **สไตล์การเลี้ยง** เป็นคะแนนสี่ด้าน — อ้อน (`cuddly`), เล่น (`playful`), กิน (`foodie`), แต่งตัว/แต่งห้อง (`stylish`) — นาทีละหนึ่งแต้มแบ่งตามสิ่งที่ผู้เล่นทำในนาทีนั้น ตอนโตเต็มวัย ด้านที่เด่นที่สุดจะกลายเป็นนิสัย (ขี้อ้อน / ขี้เล่น / นักกิน / สายแฟ) และถ้าเลี้ยงครบทุกด้านสมดุลจะได้ **ร่าเริง** (`cheerful`) นิสัยนี้เปลี่ยนท่าทางตอนว่าง ประโยคที่พูด และมีจุดเด่นเล็กๆ บนตัว โดยรูปทรง สี และหน้าตาของตัวละครแบรนด์ยังเหมือนเดิม การเติบโตไม่ขึ้นกับค่าความต้องการ (needs) — ตัวละครไม่ตาย ไม่ป่วย และไม่โตช้าลงเพราะถูกทิ้ง

## 2. Player Fantasy

"ไผ่ของฉันเคยตัวจิ๋วพูดได้แค่ 'อุ๊!' ตอนนี้โตแล้วและกลายเป็นไผ่ขี้อ้อน เพราะฉันชอบลูบหัวเขา" — ผู้เล่นรู้สึกว่าตัวละครเป็น *ของตัวเอง* ไม่ใช่ของทุกคน ความผูกพันมาจากการเห็นการเปลี่ยนแปลงทีละนิดและเห็นว่าสิ่งที่ตัวเองทำมีผลจริง ไม่มีนิสัยไหน "ไม่ดี" ทุกนิสัยน่ารักเท่ากัน ไม่มีทางเลี้ยงผิด และไม่ต้องรีบ: การเติบโตเกิดจากการอยู่ด้วยกัน ไม่ใช่การกดเร็ว

## 3. Detailed Rules

### 3.1 Growth time — อะไรนับเป็นเวลาเลี้ยง
- นับต่อตัวละคร เฉพาะตัวที่อยู่บนจอ (`selected`) ตัวอื่นไม่โต
- นับด้วย frame `dt` (clamp 0.1 s ต่อเฟรม) ไม่ใช้ `Date.now()` จึงปรับนาฬิกาเครื่องเพื่อโกงไม่ได้
- นับเมื่อ **ทั้งสองข้อ** เป็นจริง:
  1. หน้าเว็บมองเห็นอยู่ (`document.visibilityState === 'visible'`)
  2. **กำลังดูแล (engaged):** อยู่ในรอบมินิเกม (ไม่ pause) **หรือ** มี care event ภายใน `engagedWindowSec` (45 s) ที่ผ่านมา
- **Care events** (ทุกอันรีเซ็ตหน้าต่าง engaged): ลูบหัว (stroke), จิ้ม (poke), ยืด/ปล่อยเด้ง (stretch, boing), บีบ (squish), อุ้ม (carry), ป้อนอาหาร (eat), ชักโครก (flush), พูดคุย/อัดเสียง (talkback phrase, conversation message), ทักทายผ่านกล้อง (cameraHello), ใส่/ซื้อชุด (equip, buy), วาง/ซื้อของแต่งห้อง (decorEquip, decorBuy), เริ่มหรือจบมินิเกม
- **ไม่นับ:** เปิดแอปทิ้งไว้เฉยๆ เกิน 45 s, เปลี่ยนห้องเฉยๆ, เปิด/ปิดไฟ, เปิดชีตเลือกตัวละคร, ระยะ pause ของมินิเกม
- **Offline:** ค่าเริ่มต้นไม่โตระหว่างปิดแอป (`offline.minutesPerHour = 0`) มีปุ่มปรับใน data ให้โตนิดหน่อยได้ (ดู 7 และคำถาม owner ข้อ 2)
- **Soft cap ต่อวัน:** มีใน data แต่ปิดไว้ (`dailySoftCap.minutes = 0`) ถ้าเปิด เวลาที่เล่นเกินจำนวนนาทีต่อวันจะนับช้าลง (`rate`) เพื่อให้ "ค่อยๆ โตหลายวัน" แทนการเล่นรวดเดียว

### 3.2 Life stages

| | `baby` ก้อนจิ๋ว | `kid` ก้อนซน | `grown` ก้อนโต |
|---|---|---|---|
| เริ่มที่เวลาเลี้ยง | 0 นาที | 45 นาที | 180 นาที (3 ชม.) |
| ระยะเวลาในขั้น | 45 นาที | 135 นาที | ถาวร |
| ขนาดตัวรวม (`scale`) | 0.70 | 0.85 | 1.00 |
| ขนาดตา (`eyeScale`, เทียบตัว) | 1.30 | 1.12 | 1.00 |
| ความกลม (`roundness`, กว้างขึ้นเล็กน้อย) | 1.08 | 1.03 | 1.00 |
| ความนิ่มเด้ง (`jiggle`, × spring ของ prototype) | 1.30 | 1.15 | 1.00 |
| ความสูงตอนกระโดด (`hopScale`) | 0.70 | 0.90 | 1.00 |
| เสียงสูงขึ้น (`pitchSemitones`, บวกกับ sfx และ talkback) | +3 | +1.5 | 0 |
| ระดับคำพูด (`vocabLevel`) | 1 อ้อแอ้ | 2 ประโยคสั้น | 3 เต็ม + นิสัย |
| คำใบ้นิสัย | — | มี (3.6) | นิสัยจริง |

- **รูปลักษณ์แบรนด์คงเดิมทุกขั้น:** สีตัว ทรง silhouette (แฉก/หยด/ปริซึม/เมฆ/ดอกไม้) ตำแหน่งตาและปากเหมือนเดิม เปลี่ยนแค่สัดส่วนตามตาราง (ตาโตขึ้นแบบหน้าเด็ก) clay เป็นคนตัดสินรายละเอียดภาพ
- **ระดับคำพูด:**
  - 1 อ้อแอ้: ประโยคสั้นมาก 1–2 คำ เสียงสูง เช่น "อุ๊!", "หม่ำๆ!", "งื้ออ", "ห้องน้ำ!" อ่านจาก `personas.<key>.lines.baby.<event>` ถ้าไม่มีใช้ชุดกลาง `growth.json babble.<event>`
  - 2 ประโยคสั้น: ใช้ประโยค persona ชุดปัจจุบัน (ที่มีอยู่แล้ว)
  - 3 เต็ม: ประโยค persona ปัจจุบัน ปนกับประโยคของนิสัย `personas.<key>.traits.<trait>.lines.<event>` สัดส่วน `traitLineShare` (0.5)
  - ระบบสนทนา (echo, S5-D3) รับ `vocabLevel` และ `trait` เพื่อเลือกระดับคำตอบ
- **Needs ไม่เปลี่ยนตามขั้น** ในเวอร์ชันนี้ (`stages.*.needRateScale = 1`) เพื่อไม่ให้ช่วงเด็กเหนื่อยเกินไป

### 3.3 Stage-up moment
1. เมื่อ `activeSec` ข้ามเกณฑ์ ขั้นใหม่ถูก **จองไว้** (queued) และแสดงเมื่อ: อยู่ในห้องปกติ ไม่มีชีตเปิด ไม่อยู่ในมินิเกม ไม่นั่งชักโครก ไม่ถูกอุ้ม
2. ตัวละครเรืองแสงนุ่มๆ 1.2 s (sfx `sparkle`) แล้วขยายตัวแบบ ease-in-out 2.5 s ไม่มีเด้งแรง
3. การ์ดเล็ก (glaze): "<ชื่อ>โตขึ้นแล้ว!" + ชื่อขั้น + สิ่งใหม่ 1 บรรทัด เช่น "พูดเก่งขึ้นแล้วนะ" แล้วตัวละครพูดประโยค `growUp`
4. ตอนถึง `grown`: การ์ด **เผยนิสัย** "<ชื่อ>โตเป็น<ชื่อ><นิสัย>!" เช่น "ไผ่โตเป็นไผ่ขี้อ้อน!" พร้อมเหตุผลหนึ่งบรรทัดจากด้านที่เด่น (`traits.<id>.because` เช่น "เพราะเธอลูบหัวไผ่บ่อยมาก") และสำหรับ `cheerful` "เพราะเธอดูแลครบทุกอย่างเลย"
5. ตัวละคร **ไม่หดเล็กลงอีก** ไม่ว่าเกิดอะไรขึ้น (ดู 5)

### 3.4 Care-style tally — นาทีละหนึ่งแต้ม
เวลาเลี้ยงถูกตัดเป็น **ถัง (bucket)** ละ `bucketSec` (60 s ของเวลาที่นับ) ระหว่างถังหนึ่ง เกมรวมน้ำหนักของ care event ลงสี่ด้าน เมื่อถังปิด ถังนั้นให้แต้มรวมประมาณ 1 แบ่งตามสัดส่วนน้ำหนัก (สูตร 4.2) การ normalize ต่อถังทำให้ **กดรัวไม่ได้เปรียบ**: จิ้ม 200 ครั้งในหนึ่งนาทีก็ได้ไม่เกินหนึ่งแต้ม

| Event | ด้าน | น้ำหนัก |
|---|---|---|
| ลูบหัว (stroke) | cuddly | 1 ต่อวินาทีที่ลูบ |
| อุ้ม (carry) | cuddly | 0.5 ต่อวินาที |
| พูดคุย/อัดเสียง 1 ประโยค (talkback, conversation) | cuddly | 3 |
| ทักผ่านกล้อง (cameraHello) | cuddly | 3 |
| จิ้ม (poke) | playful | 1 |
| ยืดแล้วปล่อยเด้ง (boing) | playful | 2 |
| บีบ (squish) | playful | 1 ต่อวินาที |
| ป้อนอาหาร 1 ชิ้น | foodie | 4 (ของที่ชอบ 5) |
| ใส่ชุด / ซื้อชุด | stylish | 3 / 4 |
| วางของแต่งห้อง / ซื้อของแต่งห้อง | stylish | 3 / 4 |
| ชักโครก (flush) | กลาง: แบ่งเท่ากันสี่ด้าน | 2 |
| เล่นมินิเกม | ตาม mix ของเกม (ตารางล่าง) | 0.1 ต่อวินาที |

- น้ำหนักแต่ละด้านในหนึ่งถังถูกจำกัดที่ `capPerBucket` (6) ก่อน normalize
- **มินิเกมมีน้ำหนักครึ่งเดียว:** นาทีที่เล่นมินิเกมเต็มนาทีให้แต้มรวม `minigameMinuteWeight` (0.5) เพราะทุกคนเล่นมินิเกมเพื่อหาเหรียญ ถ้าให้เต็มนาที "ขี้เล่น" จะชนะทุกคน

| มินิเกม | mix |
|---|---|
| `snackRain` ฝนขนม | playful 0.6 · foodie 0.4 |
| `mimic` จำท่าทาง | cuddly 0.5 · playful 0.5 (ผลัดกันเลียนแบบ = ผูกพัน) |
| `bubbles` เป่าฟองสบู่ | playful 0.7 · stylish 0.3 (สีสัน) |
| `hop` กระโดดข้ามก้อน | playful 1.0 |

- **ตัวคูณด้าน (`categoryScale`):** stylish × 1.5 เพราะการแต่งตัว/แต่งห้องเกิดไม่บ่อยตามธรรมชาติ ด้านอื่น × 1
- **ตัวคูณตามตัวละคร (`personaBias`)**: ดู 3.7
- tally สะสมตลอดช่วง baby และ kid ไม่มีการลดลง

### 3.5 Raised personality at `grown`
คำนวณครั้งเดียวตอนข้ามเกณฑ์ `grown` (สูตร 4.3):
1. ถ้า tally รวมน้อยกว่า `minTallyForTrait` (20 แต้ม) → `cheerful` (กรณี save ที่ migrate มาแล้วเล่นน้อย)
2. หาด้านที่สัดส่วนสูงสุด ถ้าสัดส่วนนั้น **ต่ำกว่า** `balancedMaxShare` ของตัวละคร (ค่าเริ่ม 0.36) → `cheerful` (เลี้ยงสมดุล)
3. ถ้าด้านอันดับ 1 และ 2 ห่างกันไม่ถึง `tieMargin` (0.02) → เลือกตาม `tendencyOrder` ของตัวละคร
4. ไม่อย่างนั้น → ด้านที่สูงสุด

| Trait id | ชื่อ | มาจาก | ท่าว่าง (idle, `pet.play`) | พฤติกรรมเด่น | จุดเด่นบนตัว (signature) |
|---|---|---|---|---|---|
| `cheerful` | ร่าเริง | เลี้ยงสมดุล | hop, jelly, nod | ทักทายบ่อยขึ้น ยิ้มเป็นค่าเริ่ม | แก้มชมพูมีประกายรูปดวงอาทิตย์เล็กๆ โผล่เป็นครั้งคราว |
| `cuddly` | ขี้อ้อน | ลูบ อุ้ม คุย | wiggle, tilt | ว่าง 20 s จะเอียงหัวขอให้ลูบ (`askPet`) และเอนตัวไปทางนิ้ว/เมาส์ | แก้มรูปหัวใจ ประกายในตาใหญ่ขึ้นนิดหนึ่ง |
| `playful` | ขี้เล่น | จิ้ม ยืด บีบ มินิเกม | hop, shake, jelly | ขยับไปมารอบ `petSpot` ±0.3 หน่วย ชวนเล่นเกม (`askPlay`) | สติกเกอร์ดาวเล็กๆ บนแก้มข้างหนึ่ง เด้งสปริงขึ้นนิดหนึ่ง |
| `foodie` | นักกิน | ป้อนอาหาร ฝนขนม | chew, gulp | มองไปทางตู้เย็น/ถาดอาหาร พูดถึงขนม (`snackHint`) | ท้องกลมขึ้น ~4% และมีเศษขนมจุดเล็กที่มุมปากหลังกิน 10 s |
| `stylish` | สายแฟ | แต่งตัว แต่งห้อง | sway, tilt + wink | โพสท่าให้กล้องเมื่อใส่ชุดใหม่ ชมของแต่งห้อง (`decorLike`) | ผิวเงานุ่มขึ้น (highlight) และประกายเล็กๆ บนหัวเมื่อใส่ชุดอย่างน้อย 1 ชิ้น |

- ท่าว่างของนิสัยเล่นทุก `idleEverySeconds` (16 s) เมื่อ **ไม่มี** mood state จาก needs (needs ต่ำมีสิทธิ์ก่อนเสมอ)
- **Signature ไม่ใช่ชิ้นในช่องชุด:** ไม่ใช้ anchor ของ head/eyes/body ไม่บังตาหรือปาก ใช้ได้กับชุดทุกแบบ ขนาดไม่เกิน ~8% ของพื้นที่หน้า สีมาจากพาเลตแบรนด์ (ชมพูอ่อน ม่วงอ่อน) ไม่ใช้แดงสด
- ชื่อที่แสดง: ชิปตัวละครยังเป็นชื่อเดิม ("ไผ่") ชีตเลือกตัวละครแสดง "ไผ่ · ขี้อ้อน"

### 3.6 Kid-stage hint (ให้ผู้เล่นรู้ว่ากำลังเลี้ยงไปทางไหน)
- ตั้งแต่ขั้น `kid` เมื่อ tally รวม ≥ `hint.minTally` (15) ทุก `hint.everyMinutes` (20 นาทีของเวลาเลี้ยง) ตัวละครเล่นท่าว่างของนิสัยที่ **กำลังนำ** 1 ครั้ง และพูดประโยค `traitHint` ของนิสัยนั้น
- ชีตเลือกตัวละคร (glaze) แสดงขั้น + วงแหวนความคืบหน้าไปขั้นถัดไป (ไม่แสดงตัวเลขนาที) + คำใบ้ "ดูท่าจะเป็นสายขี้อ้อนนะ…" ถ้ายังสมดุลจะเป็น "ดูท่าจะร่าเริงนะ…" เมื่อความคืบหน้า ≥ 85% แสดง "อีกนิดจะโตแล้ว!"
- คำใบ้เป็นแค่การบอก ไม่ล็อก ผู้เล่นยังเปลี่ยนทิศได้จนถึงวันโต

### 3.7 Per-character tendencies (จาก character bible + `personas.json`)

| ตัว | `personaBias` (cuddly / playful / foodie / stylish) | `balancedMaxShare` | `tendencyOrder` | เหตุผล |
|---|---|---|---|---|
| ไผ่ `flower` | 1.1 / 1.2 / 1.0 / 0.9 | 0.36 | playful, cuddly, foodie, stylish | ENFP พลังล้น อยู่นิ่งไม่ได้ ชอบคุย (playGain 1.5, social rate 1.6) |
| ใหม่ `splat` | 1.25 / 0.9 / 1.0 / 1.1 | 0.36 | cuddly, stylish, foodie, playful | เสียงเบา ได้คำชมแล้วมั่นใจ (petGain 1.4) สาย CI/แบรนด์ชอบความสวยงาม |
| มิน `gumdrop` | 1.0 / 1.0 / 1.0 / 1.0 | 0.40 | cuddly, playful, foodie, stylish | CEO ดูแลรอบด้าน ใจแลกใจ → ร่าเริงง่ายกว่าคนอื่น |
| แอ๊ค `diamond` | 1.0 / 0.9 / 0.9 / 1.3 | 0.36 | stylish, cuddly, playful, foodie | เนี้ยบ ชอบความสวยงาม Visual Feeling |
| ฟ้า `cloud` | 0.85 / 1.0 / 1.15 / 1.0 | 0.36 | foodie, playful, stylish, cuddly | ส่วนตัวสูง ไม่ชอบถูกกอดมาก (social rate 0.5) หิวไว (hunger 1.15) |
| ปาม `pill` | 1 / 1 / 1 / 1 | 0.36 | cuddly, playful, foodie, stylish | ยังไม่มีบุคลิก (ยังเล่นไม่ได้) |

Bias เป็นแค่ "แนวโน้ม" (±10–30%) ผู้เล่นยังเลี้ยงให้เป็นนิสัยไหนก็ได้ทุกตัว เช่น ฟ้าขี้อ้อนก็ได้ถ้าลูบบ่อยจริงๆ — แบบนั้นยิ่งน่ารักเพราะ "ปกติฟ้าไม่ให้ใครกอดนะ"

### 3.8 Drift after growing (นิสัยค่อยๆ เปลี่ยนได้)
- หลังโต tally ยังเดินต่อแต่ **ค่อยๆ ลืมของเก่า**: ทุกถังคูณ tally เดิมด้วย `(1 − drift.decayPerBucket)` (0.01 ≈ half-life 69 นาทีเล่น) ก่อนบวกถังใหม่
- ทุกถังคำนวณ "นิสัยที่ควรเป็นตอนนี้" (candidate) ด้วยกฎ 3.5 ถ้า candidate ≠ นิสัยปัจจุบัน **ติดต่อกัน** `drift.confirmMinutes` (30 นาทีเล่น) และห่างจากการเปลี่ยนครั้งก่อน ≥ `drift.minGapMinutes` (120) → เปลี่ยนนิสัย
- การเปลี่ยนนิ่มๆ: การ์ดเล็ก "ช่วงนี้<ชื่อ>ขี้เล่นขึ้นนะ" ไม่มีเสียงเตือน ไม่ใช่การลงโทษ
- ไม่มีปุ่ม "เลี้ยงใหม่" ใน S5 (คำถาม owner ข้อ 4)

### 3.9 Existing saves (migration v4 → v5, wire)
Options considered:
- A. ทุกตัวเริ่มเป็น `baby` — น่ารัก ได้เห็นโตตั้งแต่ต้น แต่ตัวที่ผู้เล่นเลี้ยงมาแล้วหดลงทันที ให้ความรู้สึก "ของหาย"
- **B. (ค่าเริ่ม)** ตัวที่ **เคยเล่นแล้ว** เริ่มที่ `kid` (`activeSec = kidAtMinutes × 60`) ตัวที่ยังไม่เคยเล่นเริ่ม `baby` — ขนาด 0.85 ใกล้ของเดิม ประโยคเหมือนเดิม และยังมีเวลา 135 นาทีให้สร้างนิสัย
- C. ทุกตัวเริ่ม `grown` + `cheerful` — ไม่มีอะไรหาย แต่ผู้เล่นเดิมไม่ได้เห็นระบบใหม่เลย

"เคยเล่นแล้ว" = ตัวที่ `selected` อยู่ใน save **หรือ** มี best score มินิเกม > 0 **หรือ** ใส่ชุดอยู่อย่างน้อย 1 ช่อง tally เริ่มที่ 0 ทุกตัว `stageSeen = stage` (ไม่เด้งการ์ดตอนโหลด) และแสดง coach ครั้งเดียว "ตอนนี้<ชื่อ>เติบโตได้แล้วนะ ดูแลบ่อยๆ แล้วจะรู้ว่าโตมาเป็นแบบไหน" save ใหม่: ทุกตัวเริ่ม `baby`

### 3.10 Save fields (v5, per character, wire)
```json
"chars": { "flower": { "growth": {
  "activeSec": 0,
  "stage": "baby",
  "stageSeen": "baby",
  "tally": { "cuddly": 0, "playful": 0, "foodie": 0, "stylish": 0 },
  "trait": null,
  "traitAt": 0,
  "drift": { "candidate": null, "minutes": 0, "lastChangeAt": 0 },
  "day": { "key": "2026-11-06", "sec": 0 }
} } }
```
- `stage` เก็บไว้เพื่อกฎ "ไม่หด" (5.6) `stageSeen` = ขั้นล่าสุดที่โชว์การ์ดแล้ว `trait` = null จนกว่าจะโต `traitAt` / `lastChangeAt` เป็น ms epoch (ใช้แสดงผลเท่านั้น ไม่ใช้นับเวลา) `drift.minutes` = จำนวนถังติดต่อกันที่ candidate ไม่ตรง `day` ใช้กับ soft cap (เวลาท้องถิ่น)
- ถังที่ยังไม่ปิด (< 60 s) ไม่บันทึก เสียได้มากสุด 1 นาทีของ tally ต่อครั้งที่ปิดแอป — ยอมรับได้

### 3.10b Persona line events (fixed in S5-01, `personas.json`)
| Event id | When | Placeholder |
|---|---|---|
| `growUp` | after the stage card (baby → kid, kid → grown) | — |
| `traitReveal` | after the trait card at `grown` | `{trait}` = `traits.<id>.label` |
| `traitDrift` | after the drift card | `{trait}` = new trait label |
| `traits.<id>.lines.traitHint` | kid-stage hint (3.6), from the leading trait's set | — |
| `askPet` / `askPlay` / `snackHint` / `decorLike` | trait behaviour of cuddly / playful / foodie / stylish (`growth.json traits.<id>.behaviorLine`; cheerful uses `hello`), at most once per `behaviorLineCooldownSec` (60 s) | — |

Lines are written for `{trait}` with "แบบ" ("เราเป็นแบบ{trait}แล้ว!") so every label reads naturally. `lines.baby.<event>` per persona and grown trait lines `traits.<id>.lines.<event>` (other than `traitHint`) are optional: missing → `growth.json babble.<event>` for babies, plain persona lines for grown (so `traitLineShare` has no effect until trait lines are written). Per-character growth numbers live only in `growth.json personas.<key>` (not in `personas.json`). `growth.json` also carries the card text templates (`cards.*`), `lines.*` (event id map), `migration.*` (3.9), `hint.nearGrowProgress` / `nearGrowText` (3.6), `glowSec` and `doubleStageGapSec` (3.3, 5.8).

### 3.11 Proposed interfaces (for kiln to fix in the contract)
- clay: `pet.setGrowth({ scale, eyeScale, roundness, jiggle, hopScale })` (eased by the character over `transitionSec`), `pet.setTraitMark(traitIdOrNull)`
- echo: `sfx.setPitchOffset(semitones)`, talkback adds the same offset; conversation reads `{ vocabLevel, trait }`
- glaze: `hud.showGrowthCard({ kind: 'stage'|'trait'|'drift', name, stageLabel, traitLabel, because })`, character select gains `{ stage, progress, hint }` per character
- wire: `src/game/growth-rules.js` pure functions (4.x) + `growth.js` wiring; events from existing care/minigame/wardrobe/decor code paths

## 4. Formulas

Variables: `dt` frame seconds (≤ 0.1) · `E` engaged (0/1) · `V` visible (0/1) · `T` = `activeSec` · `K` = `kidAtMinutes × 60` = 2 700 · `G` = `grownAtMinutes × 60` = 10 800 · `c ∈ {cuddly, playful, foodie, stylish}`.

### 4.1 Growth time and stage
- `E = inMinigameUnpaused || (now − lastCareAt) ≤ engagedWindowSec`
- `r = (dailySoftCap.minutes > 0 && day.sec ≥ dailySoftCap.minutes × 60) ? dailySoftCap.rate : 1`
- `T += dt × V × E × r`
- Offline on return (gap `g` hours): `T += min(offline.capMinutes, g × offline.minutesPerHour) × 60` (default 0)
- `stage = T ≥ G ? 'grown' : T ≥ K ? 'kid' : 'baby'`, then `stage = max(stage, savedStage)` (never shrinks)
- Progress to next stage (for the ring): baby `T / K`, kid `(T − K) / (G − K)`, grown 1
- Expected real time: at 15–20 engaged minutes a day, `grown` after **9–12 days**; a player who sits 1 hour a day, 3 days

### 4.2 Bucket tally
Inside one bucket, `raw_c = Σ weight(event) for events mapped to c` (neutral events add `weight/4` to each c; minigame seconds add `0.1 × mix_c` per second). Then:
- `w_c = min(capPerBucket, raw_c)`, `W = Σ w_c`
- `m = minigameSec / bucketSec` (0..1), `P = 1 − (1 − minigameMinuteWeight) × m` (0.5..1)
- if `W > 0`: `tally_c += P × (w_c / W) × categoryScale_c × personaBias[char]_c`
- after grown: first `tally_c ×= (1 − drift.decayPerBucket)`

### 4.3 Trait choice
- `S = Σ tally_c`, `s_c = tally_c / S`; sort descending → `top`, `second`
- `trait = S < minTallyForTrait ? 'cheerful' : s_top < balancedMaxShare[char] ? 'cheerful' : (s_top − s_second < tieMargin ? first of tendencyOrder[char] among {top, second} : top)`

### 4.4 Worked example (ไผ่, 180 minutes of engaged play)
Assume 70 minutes of minigames (mostly Snack Rain) and 110 minutes of room care. Bias for ไผ่: cuddly 1.1, playful 1.2, foodie 1.0, stylish 0.9; stylish scale 1.5.

**Mixed player** — room minutes on average 35% cuddly, 25% playful, 20% foodie, 10% stylish, 10% neutral (toilet):
- Minigame minutes, P = 0.5: playful 70 × 0.5 × 0.6 × 1.2 = 25.2; foodie 70 × 0.5 × 0.4 = 14.0
- Room minutes, P = 1 (neutral 10% → 2.5% each): cuddly 110 × 0.375 × 1.1 = 45.4; playful 110 × 0.275 × 1.2 = 36.3; foodie 110 × 0.225 = 24.8; stylish 110 × 0.125 × 1.5 × 0.9 = 18.6
- Totals: cuddly 45.4, playful 61.5, foodie 38.8, stylish 18.6, S = 164.3 → shares 0.28 / **0.37** / 0.24 / 0.11
- s_top = 0.37 ≥ 0.36 → **ไผ่ขี้เล่น** (just; ไผ่'s nature shows). The same player with มิน (no bias, threshold 0.40): playful 0.33 → **มินร่าเริง**.

**Petting player** — room minutes 60% cuddly, 15% playful, 15% foodie, 5% stylish, 5% neutral: cuddly 110 × 0.6125 × 1.1 = 74.1; playful 25.2 + 110 × 0.1625 × 1.2 = 46.7; foodie 14.0 + 17.9 = 31.9; stylish 110 × 0.0625 × 1.35 = 9.3; S = 162.0 → cuddly **0.46** → **ไผ่ขี้อ้อน**.

The final tuning pass should run a seeded simulation of 4 player profiles × 5 characters (AC 9).

## 5. Edge Cases

1. **แอปเปิดทิ้งไว้ทั้งคืน:** หลัง 45 s ไม่มี care event ก็หยุดนับ ได้เวลาเพิ่มสูงสุด 45 s
2. **Auto-clicker / จิ้มรัว:** ทำให้ engaged ตลอด (นับเวลา) แต่ tally ได้ไม่เกิน 1 แต้มต่อนาที และเป็น playful อย่างเดียว เวลาโตเร็วกว่าคนเล่นจริงไม่ได้ เพราะเวลานับตามนาฬิกา ไม่ใช่ตามจำนวนครั้ง
3. **แท็บซ่อน / ล็อกจอ:** หยุดนับทันที (`visibilitychange`) มินิเกม pause ตามเดิม
4. **เปลี่ยนนาฬิกาเครื่อง:** ไม่มีผล ใช้ `dt` ที่ clamp แล้ว มีผลเฉพาะ soft cap รายวัน (`day.key`) ซึ่งปิดไว้เป็นค่าเริ่ม
5. **เปลี่ยนตัวละครกลางถัง:** ปิดถังทันทีให้ตัวเดิม โดยใช้ `P × (เวลาจริงในถัง / bucketSec)` แล้วเริ่มถังใหม่ให้ตัวใหม่
6. **ข้อมูลเปลี่ยน (เกณฑ์ใน growth.json ถูกปรับ):** ขั้นคำนวณใหม่จาก `T` แต่ไม่ต่ำกว่า `stage` ที่บันทึกไว้ — ตัวละครไม่หดเด็ดขาด ถ้าเกณฑ์ลดลงจนข้ามขั้น จะเล่นการ์ดโตตามปกติ
7. **Save ถูกแก้มือ:** `activeSec` clamp เป็นจำนวน ≥ 0, tally ค่าติดลบหรือไม่ใช่ตัวเลข → 0, trait ไม่รู้จัก → คำนวณใหม่ (ถ้าโตแล้ว) หรือ null, stage ไม่รู้จัก → คำนวณจาก `T`
8. **ข้ามสองขั้นในครั้งเดียว** (offline growth เปิดอยู่ หรือเกณฑ์ลด): เล่นการ์ด kid แล้วตามด้วย grown ห่างกัน 1.5 s ไม่ข้าม
9. **ถึงเกณฑ์ระหว่างมินิเกม / ชักโครก / ชีตเปิด / ถูกอุ้ม:** จองไว้ แสดงหลังกลับมาสถานะปกติ เวลาและ tally นับต่อตามปกติ ตัวละครยังใช้ขนาดเดิมจนการ์ดแสดง
10. **มินิเกมตอนตัวจิ๋ว:** ขนาดในมินิเกม = `max(stage.scale, minigameMinScale)` (0.85) และ hitbox/ปากเป็น world-space เดิม เด็กกับผู้ใหญ่จึงเล่นยากเท่ากัน
11. **ชุดบนตัวจิ๋ว:** ชุดติดตาม anchor และขนาดตัวอยู่แล้ว แว่นต้องตามระยะห่างตาหลัง `eyeScale` (clay ตรวจทุกขั้น × ทุกทรง)
12. **Needs ต่ำมากตลอด:** ไม่ทำให้โตช้าลงและไม่ส่งผลต่อนิสัย (ไม่มีนิสัย "ถูกทิ้ง") ตัวละครแค่ทำหน้าตาม mood เดิม
13. **ไม่ทำ care event ด้านใดเลยทั้งถัง (W = 0)** เช่น มีแค่การเปลี่ยนห้อง: ถังนั้นไม่ให้แต้ม แต่เวลานับถ้ายัง engaged
14. **`pill` (ยังเล่นไม่ได้):** ไม่โตจนกว่าจะเล่นได้ data มีไว้แล้ว
15. **Drift ไปมา:** ต้อง 30 นาทีติดต่อกัน + ห่างกัน 120 นาที จึงเปลี่ยนได้มากสุดราวๆ ครั้งต่อ 2 ชั่วโมงเล่น และ decay ทำให้ต้องเปลี่ยนวิธีเลี้ยงจริงนานพอ

## 6. Dependencies

| System | Relationship | Owner |
|---|---|---|
| Needs (`needs-system.md`) | ไม่มีผลต่อกัน (ตั้งใจ) ยกเว้น mood idle มีสิทธิ์ก่อน trait idle; ต้องเพิ่มหมายเหตุใน needs GDD | loop |
| Personas (`personas.json`) | events ใหม่ `growUp`, `traitReveal`, `traitDrift`, `askPet`, `askPlay`, `snackHint`, `decorLike`, `traits.<id>.lines.traitHint` (3.10b); optional `lines.baby.*`, `traits.<id>.lines.*`; ตัวเลขต่อตัว (bias, balancedMaxShare, tendencyOrder) อยู่ที่ `growth.json personas` | loop (lines with echo) |
| Minigames (`minigame-snack-rain.md`, `minigames-2.md`) | เวลามินิเกมนับ engaged; mix ต่อเกม; ขนาดขั้นต่ำในมินิเกม | loop |
| Economy / wardrobe / furniture | equip/buy/decor events → stylish | loop |
| Conversation (`conversation.md`, S5-D3) | อ่าน `vocabLevel`, `trait`; ส่ง conversation event → cuddly | echo |
| Character (clay) | `setGrowth`, `setTraitMark`, idle actions, outfit fit ทุกขั้น | clay |
| Audio (echo) | pitch offset ต่อขั้น, sfx `sparkle` ตอนโต | echo |
| HUD (glaze) | การ์ดโต/เผยนิสัย/drift, ชีตเลือกตัวละครแสดงขั้น วงแหวน คำใบ้ | glaze |
| Save / game core (wire) | `chars[key].growth`, migration v4→v5, นับเวลา, ถัง, events | wire |

## 7. Tuning Knobs

### 7.1 Table

| Knob | Default | Safe range | Unit | Affects |
|---|---|---|---|---|
| `stages.kid.atMinutes` | 45 | 20–90 | engaged minutes | ช่วงเบบี๋ยาวแค่ไหน |
| `stages.grown.atMinutes` | 180 | 120–360 | engaged minutes | เวลารวมจนโต ("ไม่กี่ชั่วโมง") |
| `stages.*.scale` | 0.70 / 0.85 / 1 | 0.6–1 | × body | ความต่างของขั้น |
| `stages.*.eyeScale` | 1.30 / 1.12 / 1 | 1–1.4 | × eyes | ความเป็นหน้าเด็ก |
| `stages.*.roundness` / `jiggle` / `hopScale` | ดู 3.2 | 1–1.15 / 1–1.4 / 0.6–1 | × | ความรู้สึกตัวเล็ก |
| `stages.*.pitchSemitones` | 3 / 1.5 / 0 | 0–4 | semitones | เสียงเด็ก (ระวังรวมกับ talkback +5..+7 ไม่เกิน +10) |
| `stages.*.vocabLevel` | 1 / 2 / 3 | 1–3 | level | ระดับคำพูด |
| `stages.*.needRateScale` | 1 | 0.8–1.2 | × decay | ความเหนื่อยในช่วงเด็ก |
| `transitionSec` | 2.5 | 1–4 | s | ความนุ่มของการโต |
| `engagedWindowSec` | 45 | 20–120 | s | วางมือได้นานแค่ไหนโดยยังนับ |
| `offline.minutesPerHour` / `capMinutes` | 0 / 10 | 0–3 / 0–30 | min | โตตอนไม่อยู่ |
| `dailySoftCap.minutes` / `rate` | 0 (off) / 0.5 | 0–120 / 0.25–1 | min / × | กระจายการโตหลายวัน |
| `bucketSec` | 60 | 30–120 | s | ความละเอียดของ tally |
| `capPerBucket` | 6 | 3–12 | weight | กันการกดรัว |
| `minigameMinuteWeight` | 0.5 | 0.3–1 | × | มินิเกมผลักไปทางขี้เล่นแค่ไหน |
| `categoryScale.stylish` | 1.5 | 1–2 | × | โอกาสได้สายแฟ |
| `events.*` | ดู 3.4 | 0–6 | weight | ด้านที่แต่ละการกระทำให้ |
| `minigameMix.*` | ดู 3.4 | sums to 1 | share | ด้านที่แต่ละเกมให้ |
| `minTallyForTrait` | 20 | 0–60 | points | save ที่เล่นน้อย → ร่าเริง |
| `balancedMaxShare` (global / ต่อตัว) | 0.36 (มิน 0.40) | 0.30–0.45 | share | โอกาสได้ร่าเริง |
| `tieMargin` | 0.02 | 0–0.05 | share | ใช้นิสัยตามธรรมชาติตัวละครเมื่อสูสี |
| `personaBias.*` | ดู 3.7 | 0.7–1.4 | × | แนวโน้มต่อตัว |
| `hint.minTally` / `everyMinutes` | 15 / 20 | 5–40 / 10–40 | points / min | คำใบ้ช่วง kid |
| `traitIdle.everySeconds` | 16 | 8–40 | s | ท่าว่างของนิสัยบ่อยแค่ไหน |
| `traitLineShare` | 0.5 | 0.2–0.8 | share | ประโยคนิสัยปนกับประโยคปกติ |
| `drift.decayPerBucket` / `confirmMinutes` / `minGapMinutes` | 0.01 / 30 / 120 | 0–0.03 / 15–90 / 60–600 | × / min / min | นิสัยเปลี่ยนได้ง่ายแค่ไหนหลังโต |
| `minigameMinScale` | 0.85 | 0.7–1 | × body | ความยุติธรรมของมินิเกมตอนตัวเล็ก |

### 7.2 Draft `assets/data/growth.json` (to be created in S5 implementation)
```json
{
  "_meta": { "owner": "loop", "story": "S5-D1", "version": 1, "doc": "design/gdd/growth-personality.md",
    "units": { "atMinutes": "engaged minutes (frame dt while visible and engaged)", "scale/eyeScale/roundness/jiggle/hopScale": "multipliers on the grown look", "pitchSemitones": "added to sfx and talkback pitch", "events.*": "weight per event or per second (*PerSec)", "share": "0..1 fraction of the tally" } },
  "stages": {
    "baby":  { "label": "ก้อนจิ๋ว", "atMinutes": 0,   "scale": 0.70, "eyeScale": 1.30, "roundness": 1.08, "jiggle": 1.30, "hopScale": 0.70, "pitchSemitones": 3,   "vocabLevel": 1, "needRateScale": 1 },
    "kid":   { "label": "ก้อนซน",   "atMinutes": 45,  "scale": 0.85, "eyeScale": 1.12, "roundness": 1.03, "jiggle": 1.15, "hopScale": 0.90, "pitchSemitones": 1.5, "vocabLevel": 2, "needRateScale": 1 },
    "grown": { "label": "ก้อนโต",   "atMinutes": 180, "scale": 1.00, "eyeScale": 1.00, "roundness": 1.00, "jiggle": 1.00, "hopScale": 1.00, "pitchSemitones": 0,   "vocabLevel": 3, "needRateScale": 1 }
  },
  "transitionSec": 2.5,
  "engagedWindowSec": 45,
  "offline": { "minutesPerHour": 0, "capMinutes": 10 },
  "dailySoftCap": { "minutes": 0, "rate": 0.5 },
  "bucketSec": 60,
  "capPerBucket": 6,
  "minigameMinuteWeight": 0.5,
  "minigameWeightPerSec": 0.1,
  "categoryScale": { "cuddly": 1, "playful": 1, "foodie": 1, "stylish": 1.5 },
  "events": {
    "strokePerSec": { "cuddly": 1 }, "carryPerSec": { "cuddly": 0.5 }, "talk": { "cuddly": 3 }, "cameraHello": { "cuddly": 3 },
    "poke": { "playful": 1 }, "boing": { "playful": 2 }, "squishPerSec": { "playful": 1 },
    "eat": { "foodie": 4 }, "eatLike": { "foodie": 5 },
    "equip": { "stylish": 3 }, "buy": { "stylish": 4 }, "decorEquip": { "stylish": 3 }, "decorBuy": { "stylish": 4 },
    "flush": { "neutral": 2 }
  },
  "minigameMix": {
    "snackRain": { "playful": 0.6, "foodie": 0.4 },
    "mimic":     { "cuddly": 0.5, "playful": 0.5 },
    "bubbles":   { "playful": 0.7, "stylish": 0.3 },
    "hop":       { "playful": 1.0 }
  },
  "traits": {
    "cheerful": { "label": "ร่าเริง", "because": "เพราะเธอดูแลครบทุกอย่างเลย",       "idle": ["hop", "jelly", "nod"],     "mark": "sun-cheeks" },
    "cuddly":   { "label": "ขี้อ้อน", "because": "เพราะเธอลูบหัวและคุยด้วยบ่อยมาก",  "idle": ["wiggle", "tilt"],          "mark": "heart-cheeks", "askPetAfterSec": 20 },
    "playful":  { "label": "ขี้เล่น", "because": "เพราะเธอชวนเล่นสนุกบ่อยมาก",       "idle": ["hop", "shake", "jelly"],   "mark": "star-sticker", "wanderUnits": 0.3 },
    "foodie":   { "label": "นักกิน",  "because": "เพราะเธอป้อนของอร่อยบ่อยมาก",      "idle": ["chew", "gulp"],            "mark": "round-belly", "crumbSec": 10 },
    "stylish":  { "label": "สายแฟ",  "because": "เพราะเธอแต่งตัวแต่งห้องให้บ่อยมาก", "idle": ["sway", "tilt"],            "mark": "gloss-glint" }
  },
  "traitIdle": { "everySeconds": 16 },
  "traitLineShare": 0.5,
  "minTallyForTrait": 20,
  "balancedMaxShare": 0.36,
  "tieMargin": 0.02,
  "hint": { "minTally": 15, "everyMinutes": 20 },
  "drift": { "decayPerBucket": 0.01, "confirmMinutes": 30, "minGapMinutes": 120 },
  "minigameMinScale": 0.85,
  "personas": {
    "flower":  { "bias": { "cuddly": 1.1,  "playful": 1.2, "foodie": 1.0,  "stylish": 0.9 }, "balancedMaxShare": 0.36, "tendencyOrder": ["playful", "cuddly", "foodie", "stylish"] },
    "splat":   { "bias": { "cuddly": 1.25, "playful": 0.9, "foodie": 1.0,  "stylish": 1.1 }, "balancedMaxShare": 0.36, "tendencyOrder": ["cuddly", "stylish", "foodie", "playful"] },
    "gumdrop": { "bias": { "cuddly": 1.0,  "playful": 1.0, "foodie": 1.0,  "stylish": 1.0 }, "balancedMaxShare": 0.40, "tendencyOrder": ["cuddly", "playful", "foodie", "stylish"] },
    "diamond": { "bias": { "cuddly": 1.0,  "playful": 0.9, "foodie": 0.9,  "stylish": 1.3 }, "balancedMaxShare": 0.36, "tendencyOrder": ["stylish", "cuddly", "playful", "foodie"] },
    "cloud":   { "bias": { "cuddly": 0.85, "playful": 1.0, "foodie": 1.15, "stylish": 1.0 }, "balancedMaxShare": 0.36, "tendencyOrder": ["foodie", "playful", "stylish", "cuddly"] },
    "pill":    { "bias": { "cuddly": 1.0,  "playful": 1.0, "foodie": 1.0,  "stylish": 1.0 }, "balancedMaxShare": 0.36, "tendencyOrder": ["cuddly", "playful", "foodie", "stylish"] }
  },
  "babble": {
    "hello": ["อุ๊!", "หวัดดี!"], "hungry": ["หม่ำๆ!", "หิวว"], "toiletNeed": ["ฉี่!", "งื้ออ"], "lonely": ["อุ้มหน่อย…", "งื้อ…"],
    "pet": ["ฮิๆ", "อีก!"], "poke": ["อุ๊!", "เอ๊ะ!"], "eatLike": ["อร่อย!", "ชอบ!"], "growUp": ["โตแล้ว!"]
  }
}
```

## 8. Acceptance Criteria

Unit tests (pure `growth-rules.js`, injected time and data, seeded):
1. 60 s of frames with `V = 1`, a care event every 30 s → `T` = 60 ± 0.1. Same with no event after t = 0 → `T` = 45 ± 0.1 (engaged window). Same with `V = 0` → `T` = 0.
2. `stageOf(T)`: 2 699 → baby, 2 700 → kid, 10 799 → kid, 10 800 → grown. With saved stage `grown` and `T` = 0 → grown (never shrinks).
3. A bucket of 200 pokes and nothing else adds exactly `P × 1 × bias.playful` to playful and 0 elsewhere (spam capped).
4. A full minigame minute of Snack Rain for มิน adds playful 0.3 and foodie 0.2 (P = 0.5).
5. Flush-only bucket adds 0.25 to each of the four (before scale/bias).
6. Trait: tallies {40, 60, 40, 20} for ไผ่ → playful (0.375 ≥ 0.36); same tallies for มิน → cheerful (0.375 < 0.40); tallies (cuddly, playful, foodie, stylish) {59, 60, 20, 20} for ใหม่ → shares 0.371 / 0.377, within 0.02 → **cuddly** by `tendencyOrder` (playful would win without the tie rule); S = 10 → cheerful.
7. Drift: grown as cuddly; once the candidate (rule 3.5 on the decayed tally) has been playful for 29 consecutive buckets → still cuddly; at the 30th → playful, but only if ≥ 120 engaged minutes since the last change (otherwise it waits and changes at the first bucket that satisfies both).
8. Migration: a v4 save with `selected: flower` and gumdrop best 300 → flower and gumdrop `kid` at `T = 2 700`, others `baby` at 0; all `trait: null`, tallies 0; save version 5.
9. Seeded simulation of 4 profiles (mixed, petting, feeding, dressing/decorating) × 5 characters over 180 engaged minutes: every trait (all 5) is reached by at least one profile for every character; the mixed profile yields `cheerful` for at least 2 characters.
10. No code path changes needs, coins, or health from growth or trait.

Playtest / manual (phone 390×844 + desktop, light + dark):
11. A new save starts at ก้อนจิ๋ว; the pet looks clearly smaller with bigger eyes and still reads as the same brand character (owner check, screenshots of all 5 × 3 stages in `production/qa/evidence/`).
12. Outfits (all 16) and the trait marks fit at every stage on every silhouette; eyewear stays on the eyes.
13. Stage-up never interrupts a minigame, the toilet flow, or an open sheet; it plays within 2 s after returning to the room.
14. Baby lines are short babble; kid uses today's lines; grown mixes in trait lines.
15. The kid-stage hint and the select-sheet ring are visible and understandable to a child tester ("รู้ไหมว่าไผ่จะโตเป็นแบบไหน?").

## Open questions for the owner
1. Time to grow: 45 / 180 engaged minutes (default) — or shorter (30 / 120) or longer (60 / 240)?
2. Offline growth: none (default) — or a little (2 minutes per hour away, at most 10 per absence) so daily check-ins also count?
3. Migration: option B (played characters start as ก้อนซน, default), A (everyone back to baby) or C (everyone grown + ร่าเริง)?
4. A "เลี้ยงใหม่" button later (start the character again from baby, keeping outfits and coins)? Default: not in S5.
5. Five traits (ร่าเริง, ขี้อ้อน, ขี้เล่น, นักกิน, สายแฟ) — keep, rename, or add one (e.g. ขี้เซา from sleep/quiet time)?
