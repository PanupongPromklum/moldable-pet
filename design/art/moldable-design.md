# Moldable Studio — Content Design Guidelines (design.md)

> **วิธีใช้ไฟล์นี้กับ Claude:** แนบไฟล์นี้ (และโฟลเดอร์ assets ถ้ามี) แล้วสั่งงาน เช่น
> *"ใช้ design.md นี้ ทำโพสต์ IG carousel 5 หน้าเรื่อง Jakob's Law"*
> Claude ต้องอ่านไฟล์นี้ทั้งหมดก่อนเริ่ม และ **ห้ามเดา** ค่าที่ไม่มีในไฟล์ — ถ้าข้อมูลไม่พอให้ถามก่อน
>
> Version 1.0 · 2026-10-15 · สร้างจากโปรเจกต์ IG Reel "3 กฎ UX" (Hick's / Fitts's / Miller's Law)
> หัวข้อที่มีป้าย **`[TBD]`** = ยังไม่ได้กำหนด ต้องให้เจ้าของแบรนด์เติมก่อนใช้งานจริง

---

## 0. กฎเหล็ก (อ่านก่อนทุกงาน)

1. ใช้ **ของจริงจาก Design System / Brand Guideline** เสมอ (สี, ฟอนต์, โลโก้, ไอคอน) — ห้ามวาดโลโก้ใหม่ ห้ามเดาค่าสี
2. ภาษาหลักของคอนเทนต์คือ **ไทย** ใช้ฟอนต์ **Prompt** · ภาษาอังกฤษ/ตัวเลข/ชื่อเฉพาะใช้ **Poppins**
3. ทุกชิ้นงานต้อง **จัดกึ่งกลางสมดุล** และ **อยู่ใน safe zone** ของแพลตฟอร์ม (ดูข้อ 6)
4. **ห้ามมี element แหว่ง/ถูกตัดขอบ** โดยไม่ตั้งใจ (ข้อความ, การ์ด, ป๊อปอัป, ปุ่ม) — ยกเว้น glow พื้นหลังและ transition ที่ตั้งใจ
5. งานวีดีโอ/ภาพชุด: **ทำ storyboard ใน Figma ให้อนุมัติก่อน** แล้วค่อยผลิตจริง (ดูข้อ 12)
6. ปิดท้ายวีดีโอทุกชิ้นด้วย **โลโก้ Moldable** (ไม่ใส่ handle/URL เว้นแต่ brief สั่ง)

---

## 1. แหล่งอ้างอิง (Source of truth)

| สิ่งที่ใช้ | ลิงก์ / Key |
|---|---|
| Design System (Figma) | https://www.figma.com/design/8XeyTmHdA7oBI78xAahgsv/Moldable-Design-system?node-id=12-4 |
| Library key | `lk-36f950612848eff8d54070519e91e9de8795cfdd683a907d6e35c85fc7dc47cbc5f37cd819ddff05ea3b2a4ed13e47ec4fbeb2c4f0fe436b00ea240f4d7e2975` |
| Brand Guideline (Figma) | https://www.figma.com/design/Vq4GFoFOIALsCjuwaKwCdn/Moldable-Brand-Guildeline?node-id=949-1548 |
| ตัวอย่างงานจริง (Storyboard) | https://www.figma.com/design/7JXHxxbX44volBhYjyNerS |
| Figma team ที่ใช้สร้างไฟล์ | ibitz design team (`team::868050306257732285`) |

**สำหรับ Claude ที่มี Figma MCP:** ค้นด้วย `search_design_system` + `includeLibraryKeys=[library key ข้างบน]` แล้ว import ด้วย key ในตารางด้านล่าง

---

## 2. Brand essence

- **ชื่อ:** Moldable Studio — ทีม UX/UI design (UX/UI design · Website development · Branding CI)
- **แนวคิดหลัก:** *Moldable = ปั้นได้* → รูปทรงโค้งมน ลื่นไหล blob/gooey, เปลี่ยนรูปได้, ยืดหยุ่น
- **บุคลิกภาพ:** เป็นมิตร · ชัดเจน · มืออาชีพแต่ไม่แข็ง · ชอบอธิบายเรื่องยากให้เข้าใจง่าย
- **Voice & Tone (ฉบับเต็ม):** `[TBD]` — มีหัวข้อใน Brand Guideline แต่ยังไม่ถูกเขียนลงไฟล์นี้ ให้เติมจาก Figma หน้า "Voice and Tone"

---

## 3. สี (Color tokens)

### 3.1 Brand gradient — `Decorations/Gradient 1` (style key `7c57717f70cf054018913271d43e1d8c73027386`)

| Stop | Hex |
|---|---|
| 0% | `#7FA9B1` (ฟ้าอมเทา) |
| 35% | `#9BB0DE` (ฟ้าลาเวนเดอร์) |
| 70% | `#CBA5D1` (ม่วงลาเวนเดอร์) |
| 100% | `#EB92B3` (ชมพู) |

CSS: `linear-gradient(118deg, #7FA9B1 0%, #9BB0DE 35%, #CBA5D1 70%, #EB92B3 100%)`

ใช้กับ: โลโก้, คำเน้นในหัวข้อ, ไอคอนสถานะ "ถูก/ดี", glow พื้นหลัง, blob, ขอบการ์ดที่เน้น
`Decorations/Gradient 2` (`#F5F5F5 → #E6E6E6`) = gradient เทาอ่อน สำหรับพื้นโหมดสว่าง

### 3.2 Semantic color variables (collection "Colors", 2 modes)

| Variable | Variable key | Light | **Dark (default สำหรับคอนเทนต์)** |
|---|---|---|---|
| background/default/default | `cfe55ff6…cb` | `#FFFFFF` | **`#1E1E1E`** |
| background/default/light | `93fcc333…19b` | `#F5F5F5` | **`#2C2C2C`** |
| background/primary/light | `4aa07ab7…5be` | `#E7EFF8` | **`#40496F`** |
| background/primary/default | — | `[TBD]` | **`#6978C2`** |
| background/danger/light | `cc88de85…a0` | `#FFEBEB` | **`#731412`** |
| text/default/default | `94b63c59…732` | `#1E1E1E` | **`#E6E6E6`** |
| text/primary/default | `90f01bb7…3b7` | `#252941` | **`#D3E0F2`** |
| text/secondary/default | `e9e2fc03…962` | `#45121D` | **`#F9D9E6`** |
| text/danger/default | `fb99496c…02` | `#FFD1D1` | **`#FFD1D1`** |
| text/default/disabled | `ce24aa3e…202` | `[TBD]` | **`#757575`** |
| text/default/on-light (ปุ่ม outline) | — | `[TBD]` | **`#B3B3B3`** |
| text/primary/on-light (ลิงก์) | — | `[TBD]` | **`#9BB0DE`** |
| border/primary/default | `d6310254…ca` | `#6978C2` | **`#8296D2`** |
| border/default/on-light | — | `[TBD]` | **`#444444`** |

(key เต็มของแต่ละตัวค้นได้ด้วย `search_design_system` ชื่อเดียวกัน)

### 3.3 การใช้สีในคอนเทนต์

- **Default theme = Dark:** พื้น `#1E1E1E` + glow gradient จาง ๆ (opacity 12–30%, blur ใหญ่) ลอยช้า ๆ
- **ข้อความหลัก** `#E6E6E6` · **ข้อความรอง/คำอธิบาย** `#D3E0F2` · **ข้อความจาง** `#757575`
- **สถานะ ✅ ถูก/ดี:** brand gradient
- **สถานะ ❌ ผิด/ไม่ดี:** ชมพูหม่น `#FFD1D1` + พื้น `#731412` — **ห้ามใช้แดงสด/เขียวสด** หรือสีนอกแบรนด์
- พื้นผิวการ์ด `#2C2C2C`, ขอบการ์ดเน้น `#8296D2` @50% หรือ gradient

---

## 4. Typography

| บทบาท | ฟอนต์ | น้ำหนัก |
|---|---|---|
| ภาษาอังกฤษ, ตัวเลข, ชื่อกฎ/ชื่อเฉพาะ, wordmark | **Poppins** (ฟอนต์ของ DS) | Medium 500 / SemiBold 600 |
| ภาษาไทยทั้งหมด (รวม ฿) | **Prompt** (Poppins ไม่มีอักษรไทย) | Regular 400 / Medium 500 / SemiBold 600 |

Text styles ใน DS (Poppins): `Heading/Heading-3xl-Semibold` 30 · `2xl` 24 · `xl` 20 · `Subheading-xl-Regular` 20 · `Body-xl` 20 · `Body-md` 16 — **ขนาดนี้ออกแบบมาสำหรับ UI** สำหรับคอนเทนต์ให้ใช้ family/weight เดียวกันแต่ขยายตามสเกลด้านล่าง

### สเกลขนาดสำหรับคอนเทนต์ (อ้างอิงแคนวาสกว้าง 1080 px)

| ระดับ | ขนาด | Line-height | ใช้กับ |
|---|---|---|---|
| Display | 160–180 | 1.3 | ตัวเลข/คำเปิดใหญ่ ("3 กฎ UX") |
| H1 | 92–104 | 1.4 | หัวข้อหลักของฉาก (ไม่เกิน 2 บรรทัด) |
| H2 | 56–76 | 1.35–1.45 | หัวข้อรอง, label เน้น |
| Body L | 40–48 | 1.4–1.45 | คำอธิบาย |
| Body | 32–34 | 1.45 | ข้อความใน UI mockup |
| Min | **28** | 1.5 | เล็กสุดที่ยอมให้คนอ่าน (UI ประกอบภาพเล็กกว่านี้ได้ถ้าไม่ต้องอ่าน) |

กฎภาษาไทย:
- line-height ≥ 1.4 เสมอ (สระบน/วรรณยุกต์ซ้อนจะไม่โดนตัด)
- **ห้ามเว้นวรรคกลางวลีไทย** โดยไม่ตั้งใจ (เช่น "ใช้แล้วหงุดหงิด?" ไม่ใช่ "ใช้แล้ว หงุดหงิด?")
- 1 บรรทัดบนจอไม่เกิน ~8 คำ · หัวข้อ ≤ 2 บรรทัด
- ข้อความ gradient: ใช้ background-clip:text และต้องตรวจว่าวรรณยุกต์ไม่ถูกตัด

---

## 5. โลโก้

Component set **`Logo`** (key `9c884bd74378ddccc38e25d1bc50dbf9c55db68b`)

- **Type:** `Logo` (สัญลักษณ์ M) · `Lockup + Horizontal` · `Lockup + Vertical`
- **Size:** Extra large / Large / Medium / Small / Extra small
- **Appearance:** `Brand` (gradient) · `White` · `Black`
- โครงสร้าง: ตัว **M ทรงภูเขาโค้งมน** + **หยด blob** มุมขวาล่าง + wordmark **MOLDABLE / STUDIO** (Lockup Vertical จัดชิดซ้าย)

กฎ:
- บนพื้นมืดใช้ `Brand` (ค่าเริ่มต้น) หรือ `White` · บนพื้นสว่างใช้ `Brand` หรือ `Black`
- ใช้ instance/SVG จาก DS เท่านั้น — **ห้ามบิดสัดส่วน, ห้ามเปลี่ยนสี gradient, ห้ามใส่เงา/outline**
- Outro วีดีโอ: Lockup Vertical Brand กว้าง ~550 px (บนแคนวาส 1080) วางกึ่งกลาง + glow gradient ด้านหลัง ค้าง ≥ 1 วินาที
- Clear space ขั้นต่ำ / ขนาดเล็กสุด: `[TBD]` (ดูหน้า Logo ใน Brand Guideline)

---

## 6. Layout & Safe zones

### 6.1 ขนาดตามแพลตฟอร์ม

| Format | ขนาด | Safe zone ข้อความสำคัญ |
|---|---|---|
| IG / TikTok Reel, Story | 1080×1920 | บน 250 · ล่าง 420 · ขวา 120 · **ซ้าย 120 (ให้สมมาตร)** → พื้นที่ใช้งาน x 120–960, y 250–1500 |
| IG Feed portrait | 1080×1350 | ขอบ ≥ 80 ทุกด้าน (grid preview ตัดเป็น 1080×1080 กลางภาพ — ข้อความหลักไว้ช่วงกลาง) |
| IG Square / Carousel | 1080×1080 | ขอบ ≥ 80 |
| Landscape (YouTube/Slide) | 1920×1080 | ขอบ ≥ 96 |

### 6.2 หลักการจัดวาง
- **สมดุลกึ่งกลาง:** ระยะขอบซ้าย = ขวา, กลุ่มเนื้อหาจัดกึ่งกลางแนวตั้งของ safe area (ไม่กองด้านบน)
- ตำแหน่งหัวข้อ/UI **คงที่ตลอดฉาก** เพื่อไม่ให้ภาพกระโดดตอนเปลี่ยนสถานะ
- โครงฉากมาตรฐาน (Reel): `Chip + Badge` → `Headline 2 บรรทัด` → `ภาพ/UI ประกอบ` (กล่องสูงคงที่)
- Radius: การ์ด 24–32 · pill/ปุ่ม 999 (DS radius: `rounded-2xl`=16, `rounded-4xl`=32, `rounded-full`=999)

---

## 7. Components สำหรับคอนเทนต์

| Component | สเปก |
|---|---|
| **Law/Topic Chip** | pill พื้น `#2C2C2C` ขอบ 2px `#8296D2` · ตัวเลข gradient + ชื่อ Poppins SemiBold 44 · padding 16/40 |
| **Status Badge** | วงกลม 90–112 · ❌ พื้น `#731412` ไอคอน x `#FFD1D1` · ✅ พื้น gradient ไอคอน check `#1E1E1E` |
| **DS Default buttons** | key `00c79d0f6ba9347b468d8472d02c79907cda313b` · Primary/Filled `#6978C2` ตัวอักษร `#D3E0F2` · Default/Outline ขอบ `#444444` ตัวอักษร `#B3B3B3` · Primary/Text `#9BB0DE` · radius full (ข้อความไทยให้ override เป็น Prompt) |
| **Card** | พื้น `#2C2C2C`, radius 28–32, ขอบ `#8296D2`@50% หรือ gradient 3px |
| **Info pill** | pill `#2C2C2C` ขอบ `#757575`@60% · Prompt Medium 34 |
| **Phone mockup** | กรอบ radius 56, ขอบ 6px `#757575`@80%, notch `#1E1E1E` |
| **CTA "เซฟ"** | pill พื้น `#40496F` + ไอคอน bookmark gradient + Prompt SemiBold 60 |

## 8. Iconography
- ใช้ไอคอนจาก DS (stroke 2px, grid 24, ปลายมน) เช่น `clock`, `cursor-click-01`, `bookmark`, `check`, `x`, `zap-fast`, `layout-alt-02` (มีชุด `Mold/Icon/*` ด้วย)
- สีไอคอน: `#E6E6E6` ปกติ · gradient เมื่อเน้น · `#FFD1D1` สถานะผิด · `#757575` จาง
- ห้ามวาดไอคอนใหม่จากเส้น/รูปทรงพื้นฐาน — import SVG จาก DS

## 9. Shapes — Blob / Gooey
- รูปทรงประจำแบรนด์: **blob โค้งมนไม่สมมาตร** เติม brand gradient (path ตัวอย่างใน `assets/blobs.svg`)
- เอฟเฟกต์ "gooey" (blur + alpha threshold) ใช้ตอนรูปทรงรวม/แยกตัว — สื่อว่า "ปั้นได้"
- ใช้เป็น: transition, ตัวเลขลำดับ, ตัวแทนแนวคิด, ก่อนกลายเป็นหยดของโลโก้ในฉากปิด

---

## 10. Motion guidelines

| หัวข้อ | ค่า |
|---|---|
| Easing หลัก | `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out นุ่ม) |
| Easing เข้า-ออก (ย้าย/wipe) | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Spring | damping 14–17, stiffness 100–130, mass 0.9 — overshoot เล็กน้อย **ห้ามเด้งแรง/กระตุก** |
| Text reveal | ทีละคำ fade + เลื่อนขึ้น 34px, 12–14 เฟรม, stagger 4–6 เฟรม |
| เวลาอ่าน | ข้อความค้าง ≥ 1.5 วินาที + 0.3 วินาที/คำ |
| เปลี่ยน ❌ → ✅ | morph ในที่เดิม (ไม่ตัดฉาก) 15–25 เฟรม, badge ย่อ→สลับ→เด้ง |
| Scene transition | blob gradient ปาดทแยง ~16 เฟรม (ไม่ปิดเต็มจอ) หรือ blob ขยาย/หด |
| Background | glow gradient ลอยช้ามาก (คาบ ~20–30 วินาที) |
| FPS | 30 |
| Hook | 3 วินาทีแรกต้องมีภาพ+ข้อความตั้งแต่เฟรมแรก (เฟรม 0 คือ thumbnail) |

**โครงเรื่องวีดีโอมาตรฐาน (30–45 วินาที):** Hook คำถาม (3s) → Intro หัวข้อ (3s) → เนื้อหา ❌→✅ ต่อหัวข้อ (~9s/ข้อ) → Recap การ์ดสรุป + "เซฟไว้ดูตอนออกแบบ" ค้าง ≥ 3s → Logo outro (3–4s)

## 11. Sound guidelines
- เพลง: lo-fi / soft electronic ~100 BPM, คอร์ดอบอุ่น (เช่น Fmaj7–Am7–Dm7–B♭maj7), ช่วง hook โล่ง (ไม่มีกลอง), จบด้วยคอร์ด major ตอนโลโก้
- SFX palette: pop นุ่ม (element เข้า), whoosh (เปลี่ยนฉาก), liquid swoosh (blob), tick-tock (เวลา), error blip/buzz เบา (❌), ding (✅), tap/click (กดปุ่ม), chime (โลโก้)
- Music ducking ใต้ SFX · Loudness **-14 LUFS**, true peak ≤ -1 dBTP
- ใช้เฉพาะเสียงที่มีสิทธิ์ใช้ หรือสังเคราะห์เอง (ตัวอย่าง: `tools/synth.py`)
- คลิปต้อง **เข้าใจได้แม้ปิดเสียง** (ข้อความบนจอเล่าเรื่องครบ)

## 12. Copy & tone (คอนเทนต์ความรู้)
- กลุ่มคนดูหลัก: คนทั่วไปที่สนใจดีไซน์ + นักออกแบบ UX/UI มือใหม่
- เป้าหมาย: ให้ **เซฟ/แชร์** → เนื้อหาต้องเป็น cheat sheet
- น้ำเสียง: เป็นกันเอง อ่านง่าย ไทยเป็นหลัก คงศัพท์/ชื่อกฎเป็นอังกฤษ
- Hook = ตั้งคำถามที่คนดูเคยเจอ ("ทำไมบางแอป… ใช้แล้วหงุดหงิด?")
- สูตรต่อหัวข้อ: **สิ่งที่เกิดขึ้น (❌)** → **Tip ที่ทำได้ทันที (✅)**
- ห้ามอ้างข้อมูล/สถิติที่ไม่มีแหล่งอ้างอิง

## 13. Production workflow (สำหรับ Claude)
1. **สัมภาษณ์ brief** (หัวข้อ, ความยาว, กลุ่มเป้าหมาย, เป้าหมาย, platform, เสียง) ถ้าข้อมูลไม่ครบ
2. **Storyboard ใน Figma** (ไฟล์ draft ใหม่ใน ibitz design team): key frame เต็มความละเอียด + โน้ต Timecode / Motion / Text / SFX + layer safe zone ซ่อน → **รออนุมัติ**
3. **ผลิต:** ภาพนิ่ง = Figma · วีดีโอ = Remotion (React) ตาม storyboard (1 ฉาก = 1 Sequence) โดยใช้ token ในไฟล์นี้
4. **Preview** low-res + ภาพนิ่งซ้อน safe zone → รับ feedback → render final
5. ส่งมอบ: MP4 H.264 1080×1920 30fps + เสียงแยก WAV + SFX cue sheet (CSV)

## 14. QA checklist ก่อนส่ง
- [ ] ข้อความสำคัญอยู่ใน safe zone และจัดกึ่งกลางสมดุล
- [ ] ไม่มี element แหว่ง/ทับกันโดยไม่ตั้งใจ (ตรวจทุกเฟรมคีย์และช่วง transition)
- [ ] ภาษาไทยใช้ Prompt, สะกดถูก, ไม่มีเว้นวรรคผิด, วรรณยุกต์ไม่ถูกตัด
- [ ] สีมาจาก token เท่านั้น, สถานะผิดใช้ชมพูหม่น
- [ ] โลโก้มาจาก DS ไม่บิดสัดส่วน, ค้างตอนจบ ≥ 1s
- [ ] ข้อความแต่ละชุดมีเวลาอ่านพอ
- [ ] เนื้อหาความรู้ถูกต้อง
- [ ] เสียง -14 LUFS, ดูรู้เรื่องแม้ปิดเสียง
- [ ] ความยาว/ขนาด/fps ตรง brief

## 15. Do / Don't
**Do:** โค้งมน · gradient แบรนด์เป็นจุดเน้นเดียว · พื้นมืดสะอาด · whitespace เยอะ · motion นุ่ม · เปรียบเทียบ ❌/✅ ด้วยภาพ
**Don't:** สีนอกแบรนด์สด ๆ · เงาหนัก/3D · ฟอนต์อื่นนอก Poppins/Prompt · ข้อความแน่นเกิน 2 บรรทัดหัวข้อ · bounce แรง · ตัด element ที่ขอบ · ใส่ handle/URL ในเฟรมโลโก้โดยไม่ได้สั่ง

---

## 16. Prompt template (คัดลอกไปใช้)

```text
ใช้ design.md ที่แนบเป็น guideline หลัก (อ่านทั้งไฟล์ก่อน และห้ามเดาค่าที่ไม่มี)
งาน: [ภาพ IG carousel / Reel / Story / ปก YouTube / ...]
หัวข้อ: [...]
ขนาด/ความยาว: [...]
กลุ่มเป้าหมาย: [...]  เป้าหมาย: [เซฟ/แชร์ · ให้ความรู้ · หาลูกค้า]
ข้อความที่ต้องมี / ห้ามมี: [...]
เสียง: [เพลง+SFX / เงียบ / ไฟล์ที่แนบ]
ขั้นตอน: ทำ storyboard ใน Figma ให้ดูก่อน → รออนุมัติ → ผลิตจริง → ส่ง preview → final
```
