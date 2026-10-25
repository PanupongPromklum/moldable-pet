# Moldable Pet — วิธีใช้โฟลเดอร์นี้

เกมเลี้ยงสัตว์เลี้ยงแนว My Talking Tom ที่ใช้ตัวละครก้อนนุ่มของ Moldable โฟลเดอร์นี้คือ "สตูดิโอ" ของเกม มีทั้งเอกสาร ต้นแบบ และทีม Agent

## เปิดใช้ทีม
เปิดโฟลเดอร์นี้ใน **Claude Code** (แท็บ Code ในแอป Claude บน Mac หรือคำสั่ง `claude` ใน Terminal ที่โฟลเดอร์นี้) ทีม Agent, skill และ hook จะทำงานเฉพาะเมื่อเปิดจากโฟลเดอร์นี้เท่านั้น

## ทีมของเรา (เรียกชื่อได้เลย เช่น "ให้ glaze ออกแบบหน้าเลือกตัวละคร")
| ชื่อ | หน้าที่ |
|---|---|
| kiln | หัวหน้าทีม วางแผน แบ่งงาน รวมงาน ตรวจคุณภาพ |
| loop | ออกแบบระบบเกม ค่าความต้องการ เหรียญ มินิเกม กาชา |
| clay | ตัวละคร 3D สีหน้า ท่าทาง ชุด |
| prop | ห้อง ของในห้อง อาหาร ของแต่งห้อง |
| glaze | HUD เมนู ไอคอน ข้อความในเกม Figma |
| wire | เขียนโค้ด การสัมผัส ระบบเซฟ เอาขึ้นเว็บ |
| echo | เสียงเอฟเฟกต์ พูดตามเสียง สคริปต์อัดเสียง |

ทั้ง 7 คนเป็นหัวหน้าฝ่าย และใช้วิธีทำงานของผู้เชี่ยวชาญ 34 คนจากชุด Claude Code Game Studios ใน `.claude/agents/`

## คำสั่งที่ใช้บ่อย
- `/help` — ไม่รู้จะทำอะไรต่อ
- `/sprint-plan` — วางแผนสปรินต์
- `/design-system needs` — เขียนเอกสารระบบทีละหัวข้อ (เช่น ระบบความต้องการ)
- `/ux-design hud` และ `/ux-review` — สเปก HUD และตรวจก่อนส่ง
- `/art-bible`, `/asset-spec` — คุมสไตล์ภาพ และสเปกของที่ต้องทำ
- `/playtest-report` — สรุปผลเทสต์กับเพื่อน

ชุดนี้ทำงานแบบ "ถามก่อนเขียนไฟล์" ทุกครั้ง ตามกฎใน `CLAUDE.md`

## โครงสร้าง
- `design/gdd/game-concept.md` แผนเกมและสิ่งที่ตัดสินใจแล้ว
- `design/art/moldable-design.md` Brand guideline
- `design/narrative/character-bible.md` ตัวละคร 6 ตัว
- `prototypes/squish-pet/index.html` ต้นแบบที่เล่นได้
- `src/` โค้ดเกมจริง (เริ่มใน Sprint 1)
- `production/session-state/active.md` สถานะล่าสุด

## ที่ปรับจากชุดต้นฉบับ
- ชุดต้นฉบับรองรับ Godot, Unity, Unreal เราใช้ **เว็บ + Three.js** จึงย้าย Agent เฉพาะเอนจิน 15 ตัวไปไว้ที่ `docs/ccgs-unused-agents/`
- คำสั่ง `/setup-engine` ไม่ต้องใช้ ค่าเอนจินกรอกไว้แล้วใน `.claude/docs/technical-preferences.md`
- คำสั่งที่ผูกกับเอนจิน (`/test-setup`, `/smoke-check`, `/perf-profile` บางส่วน) อาจถามหา Godot/Unity ให้ตอบว่าใช้ Web/Three.js
- README ต้นฉบับอยู่ที่ `docs/ccgs-framework/` (สัญญาอนุญาต MIT ใน `LICENSE`)
