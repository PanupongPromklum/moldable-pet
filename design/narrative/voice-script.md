# Voice Script — Moldable Pet (สคริปต์อัดเสียงพากย์)

เจ้าของ: Echo (audio) · อัปเดต: 2026-10-25 · Story: S1-05 · สถานะ canon: **Provisional** (ร่างให้เจ้าของอนุมัติ)
อ้างอิง: `design/narrative/character-bible.md`, `assets/data/personas.json` (ข้อความในเกม), `design/art/moldable-design.md` §11

## 0. หลักการ
- **บทพูด = ข้อความในบับเบิล** ทุกบรรทัดในตารางคัดมาจาก `personas.json` ตรงตัวอักษร (สร้างจากไฟล์ด้วยสคริปต์ ไม่พิมพ์ใหม่) ถ้านักพากย์ด้นสดแล้วดีกว่า ให้แก้ทั้งสองที่พร้อมกัน ผ่าน Loop
- เหตุการณ์ `happy` (มีความสุข) **ยังไม่มีใน personas.json** บทในสคริปต์นี้เป็นร่างใหม่ → ส่งให้ Loop เพิ่ม key `happy` ก่อนอัด
- เกมต้อง **เข้าใจได้แม้ปิดเสียง**: สีหน้า + บับเบิลข้อความเล่าครบเสมอ เสียงพากย์เป็นของเสริม
- ห้ามเลียนเสียงคนดัง/คนจริง ห้ามใช้เสียงที่ไม่มีสิทธิ์ นักพากย์ต้องเซ็นยินยอมให้ใช้เสียงในเกม
- ไม่ใช้คำหยาบ ไม่ดุแรง เล่นได้ทุกวัย ความยาวทุกบรรทัด ≤ 120 ตัวอักษร
- เสียงพากย์ประจำตัว **ไม่ผ่าน pitch shift** (คนละระบบกับ "พูดตาม" ที่เกมแปลงเสียงผู้เล่นให้สูงขึ้น +6 semitone) ให้นักพากย์ใช้เสียงจริงที่สดใส

## 1. รูปแบบชื่อไฟล์
`<ตัวละคร>_<เหตุการณ์>_<เทค 2 หลัก>.wav` ตัวพิมพ์เล็กทั้งหมด เช่น `pai_fed_like_01.wav`
เก็บที่ `assets/audio/voice/<prefix>/` (เช่น `assets/audio/voice/pai/pai_fed_like_01.wav`)

| ตัวละคร | character key | prefix |
|---|---|---|
| ไผ่ (ดอกไม้ ม่วงอ่อน) | `flower` | `pai` |
| ใหม่ (แฉก ชมพู) | `splat` | `mai` |
| มิน (หยด ม่วง) | `gumdrop` | `min` |
| แอ๊ค (ปริซึม เขียว) | `diamond` | `ack` |
| ฟ้า (เมฆ ฟ้า) | `cloud` | `fah` |
| ปาม (สี่เหลี่ยม ชมพู) | `pill` | `pam` — ยังไม่อัด ดูข้อ 8 |

เลขเทค `_01`, `_02`, `_03` ตรงกับลำดับบรรทัดใน `personas.json lines.<event>` (index 0, 1, 2) เกมสุ่มเล่นเทคเดียวกับข้อความที่ขึ้นบับเบิล

**ชื่อเหตุการณ์ในไฟล์ ↔ key ใน personas.json:** `hello`=hello · `hungry`=hungry · `fed_like`=eatLike · `fed_ok`=eatOk · `fed_dislike`=eatDislike · `full`=full · `toilet_need`=toiletNeed · `carried`=carried · `relieved`=relieved · `petted`=pet · `poked`=poke · `poked_too_much`=pokeSpam · `stretched`=stretchBig · `squished`=squish · `lonely`=lonely · `sleepy`=sleepy · `happy`=*(ใหม่)* · `back`=back · `camera_hello`=cameraHello · `grabbed`=grab · `boing`=boing · `squished_hard`=squishHard · `slapped`=slap · `flush`=flush · `toilet_no_need`=toiletNoNeed
เสียงไม่มีคำ (ไม่มีบับเบิล): `giggle`, `yawn`, `eat_munch`

## 2. คิวการแสดงตามเหตุการณ์ (ใช้กับทุกตัว แล้วปรับตามนิสัยในข้อ 3–7)
| เหตุการณ์ | คิว |
|---|---|
| hello / back | เจอหน้ากัน ยิ้มในเสียง `back` = เพิ่งได้เจอหลังหายไป มีอารมณ์คิดถึงปน |
| hungry | ท้องว่าง ขออาหาร ไม่ร้องไห้ ไม่โวยวาย |
| fed_like | ถูกใจจริง พลังขึ้น เสียงสว่างที่สุดในหมวดกิน |
| fed_ok | พอใจธรรมดา สั้น สบายๆ |
| fed_dislike | ไม่ชอบแต่สุภาพ ไม่รังเกียจแรง (เล่นได้ทุกวัย) |
| full | อิ่มแปล้ ขอพัก |
| toilet_need | รีบนิดๆ ตลกมากกว่าทุกข์ (ห้ามเสียงเจ็บปวด) |
| relieved / flush | ผ่อนคลาย ถอนหายใจโล่ง / สนุกกับน้ำหมุน |
| carried / grabbed | ลอยขึ้นจากพื้น ตกใจเล็กน้อยหรือตื่นเต้น |
| petted | อุ่นใจ ช้าลง นุ่ม |
| poked | ตอบสั้นๆ ไว ตามจังหวะการจิ้ม |
| poked_too_much | เริ่มรำคาญ (ระดับของแต่ละตัวต่างกันมาก) แต่ไม่ดุ ไม่หยาบ |
| stretched / squished / squished_hard / boing | ร่างกายถูกยืด/บีบ ใส่ "แรงกาย" ในเสียงได้ (เสียงอัด เสียงยืด) |
| slapped | ตกใจ เจ็บนิดเดียว จบเร็ว |
| lonely | เบาลง เว้นจังหวะ ไม่ร้องไห้ |
| sleepy | ช้า ลมหายใจเยอะ หาวได้ |
| happy | สุขเต็มที่ในแบบของตัวเอง |
| camera_hello | ทักมือผู้เล่นในกล้อง ตื่นตาตื่นใจ |
| giggle / yawn / eat_munch | เสียงไม่มีคำ 1–2 วินาที เทคละแบบไม่ซ้ำกัน |

## 3. ไผ่ (`pai`) — UX/CX, ENFP
- **เสียง:** ดัง สดใส พลังงานล้น เร็ว ลากเสียงท้ายคำ ("หวัดดีีี", "ชอบบบ") หัวเราะ "555" เป็นเสียงจริง
- **โทนตลอด:** คุยเก่ง ชวนคุย ไม่อยู่นิ่ง ยิ้มอยู่ในเสียงแทบทุกบรรทัด
- **ความต่าง:** `lonely` คือจุดอ่อน (ซึมถ้าไม่มีใครสนใจ) ให้เสียงลดลงชัดเจน ดอกเหี่ยว ช้าลงครึ่งหนึ่ง เป็นช่วงเดียวที่เงียบ · `poked` สนุก จั๊กจี้ · `poked_too_much` หัวหมุนแต่ยังหัวเราะ
- **เสียงไม่มีคำ:** giggle ดังเป็นชุด "คิกๆๆๆ" · yawn ยาว เบื่อๆ · eat_munch ไว มีเสียง "หม่ำๆ" ปน

| เหตุการณ์ | personas.json | ไฟล์ | บท |
|---|---|---|---|
| ทักทาย | `hello` | `pai_hello_01.wav` | หวัดดีีี! มาเล่นกันน! |
|  |  | `pai_hello_02.wav` | มาแล้วว ทำอะไรกันดี! |
|  |  | `pai_hello_03.wav` | วันนี้มีไอเดียเพียบ! |
| หิว | `hungry` | `pai_hungry_01.wav` | หิวแล้วว ท้องร้องง! |
|  |  | `pai_hungry_02.wav` | ขอขนมหน่อยยย |
| กินของชอบ | `eatLike` | `pai_fed_like_01.wav` | อร่อยยย ชอบสุดๆ! |
|  |  | `pai_fed_like_02.wav` | นี่แหละ ของโปรด! |
| กินได้ เฉยๆ | `eatOk` | `pai_fed_ok_01.wav` | อืม อร่อยดี! |
|  |  | `pai_fed_ok_02.wav` | หม่ำๆ ได้หมด! |
| กินของไม่ชอบ | `eatDislike` | `pai_fed_dislike_01.wav` | แหวะ ไม่ใช่สายนี้… |
|  |  | `pai_fed_dislike_02.wav` | จืดดด เบื่ออ |
| อิ่มแล้ว | `full` | `pai_full_01.wav` | อิ่มแปล้แล้วว! |
|  |  | `pai_full_02.wav` | พอแล้ว พุงจะแตก 555 |
| ปวดห้องน้ำ | `toiletNeed` | `pai_toilet_need_01.wav` | ปวดห้องน้ำแล้วว! |
|  |  | `pai_toilet_need_02.wav` | ห้องน้ำอยู่ไหนน รีบๆ! |
| ถูกอุ้ม | `carried` | `pai_carried_01.wav` | บินได้แล้วว! |
|  |  | `pai_carried_02.wav` | ว้าว วิวสวยย! |
| โล่ง (หลังเข้าห้องน้ำ) | `relieved` | `pai_relieved_01.wav` | โล่งงง สบายตัว! |
|  |  | `pai_relieved_02.wav` | เบาตัวเลยย! |
| ถูกลูบ | `pet` | `pai_petted_01.wav` | ชอบบบ ลูบอีกก! |
|  |  | `pai_petted_02.wav` | ฟินนน~ |
|  |  | `pai_petted_03.wav` | อุ่นใจสุดๆ เลยย |
| ถูกจิ้ม | `poke` | `pai_poked_01.wav` | เฮ้ย! จิ้มทำไมม 555 |
|  |  | `pai_poked_02.wav` | อุ๊ยย จั๊กจี้! |
|  |  | `pai_poked_03.wav` | จิ้มอีกก ชอบบ! |
| ถูกจิ้มรัว | `pokeSpam` | `pai_poked_too_much_01.wav` | พอแล้วว จิ้มรัวเลยย! |
|  |  | `pai_poked_too_much_02.wav` | ใจเย็นน หัวหมุนแล้ว! |
| ถูกยืด | `stretchBig` | `pai_stretched_01.wav` | ยืดดดด ว้าววว! |
|  |  | `pai_stretched_02.wav` | ยาวเป็นงวงเลย 555 |
| ถูกบีบ | `squish` | `pai_squished_01.wav` | บี้ๆ จั๊กจี้! |
|  |  | `pai_squished_02.wav` | นุ่มม ใช่มั้ยล่ะ |
| เหงา | `lonely` | `pai_lonely_01.wav` | ไม่มีใครเล่นด้วยเลย… |
|  |  | `pai_lonely_02.wav` | ฮัลโหลล มีใครอยู่มั้ย… |
|  |  | `pai_lonely_03.wav` | ดอกจะเหี่ยวแล้วน้า… |
| ง่วง / เบื่อ | `sleepy` | `pai_sleepy_01.wav` | เบื่อ… งีบดีกว่า |
|  |  | `pai_sleepy_02.wav` | ไม่มีอะไรทำเลยย… |
| มีความสุข | *(ใหม่)* `happy` | `pai_happy_01.wav` | เย้ๆ วันนี้ดีสุดๆ! |
|  |  | `pai_happy_02.wav` | แฮปปี้มากก ไอเดียพุ่งเลย! |
|  |  | `pai_happy_03.wav` | สนุกกก อยู่ด้วยกันแบบนี้นะ! |
| กลับมาหลังหายไปนาน | `back` | `pai_back_01.wav` | กลับมาแล้ววว! คิดถึงง |
|  |  | `pai_back_02.wav` | ไปไหนมา เล่าหน่อยย! |
| ทักกล้อง | `cameraHello` | `pai_camera_hello_01.wav` | เห็นมือแล้ว! ไฮไฟว์! |
|  |  | `pai_camera_hello_02.wav` | หวัดดีกล้องง! |
| ถูกหยิบ | `grab` | `pai_grabbed_01.wav` | อุ๊ย จับแล้ว! |
|  |  | `pai_grabbed_02.wav` | พาไปไหนน! |
| เด้งกลับ | `boing` | `pai_boing_01.wav` | ดึ๋งงง! |
|  |  | `pai_boing_02.wav` | อีกรอบบ! |
|  |  | `pai_boing_03.wav` | สนุกกก! |
| ถูกบีบแรง | `squishHard` | `pai_squished_hard_01.wav` | แบนแล้วว ปล่อยยย! |
|  |  | `pai_squished_hard_02.wav` | ไอเดียไหลออกหมดด! |
| ถูกปัด | `slap` | `pai_slapped_01.wav` | โอ๊ยย! แรงไปปป |
|  |  | `pai_slapped_02.wav` | เจ็บนะ! งอนแล้ว |
| กดชักโครก | `flush` | `pai_flush_01.wav` | บ๊ายบายยย! |
|  |  | `pai_flush_02.wav` | ซู่ๆ ว้าว! |
| พาเข้าห้องน้ำแต่ยังไม่ปวด | `toiletNoNeed` | `pai_toilet_no_need_01.wav` | ยังไม่ปวดเลยย 555 |
|  |  | `pai_toilet_no_need_02.wav` | มานั่งเล่นเฉยๆ เหรอ! |
| หัวเราะคิกคัก (ไม่มีคำ) | — | `pai_giggle_01.wav` | *(เสียง)* |
|  |  | `pai_giggle_02.wav` | *(เสียง)* |
|  |  | `pai_giggle_03.wav` | *(เสียง)* |
| หาว (ไม่มีคำ) | — | `pai_yawn_01.wav` | *(เสียง)* |
|  |  | `pai_yawn_02.wav` | *(เสียง)* |
| เคี้ยว หม่ำๆ (ไม่มีคำ) | — | `pai_eat_munch_01.wav` | *(เสียง)* |
|  |  | `pai_eat_munch_02.wav` | *(เสียง)* |

## 4. ใหม่ (`mai`) — CI/Branding, INFJ
- **เสียง:** เบา นุ่ม ช้ากว่าคนอื่น ไม่ค่อยมั่นใจ ท้ายประโยคมักหาย/ลอย ("…")
- **โทนตลอด:** ใจดี อยากช่วย กลัวเป็นภาระ ขอบคุณบ่อย
- **ความต่าง:** คำชมทำให้มั่นใจขึ้น → `petted`, `fed_like`, `happy` ให้เสียงอบอุ่นขึ้นและมั่นใจขึ้นเล็กน้อย · `poked_too_much`, `slapped`, `squished_hard` ไม่โกรธ แต่ขอโทษ/โทษตัวเอง (ห้ามเศร้าเกินเด็กฟังแล้วรู้สึกแย่)
- **เสียงไม่มีคำ:** giggle เบาๆ เขินๆ ปิดปาก · yawn เล็ก สุภาพ · eat_munch ช้า เบา

| เหตุการณ์ | personas.json | ไฟล์ | บท |
|---|---|---|---|
| ทักทาย | `hello` | `mai_hello_01.wav` | สวัสดีนะ… |
|  |  | `mai_hello_02.wav` | มาแล้วเหรอ… ดีใจจัง |
| หิว | `hungry` | `mai_hungry_01.wav` | หิวนิดนึง… ได้มั้ย |
|  |  | `mai_hungry_02.wav` | ท้องร้องแล้ว… เขินจัง |
| กินของชอบ | `eatLike` | `mai_fed_like_01.wav` | อร่อยจัง… ขอบคุณนะ |
|  |  | `mai_fed_like_02.wav` | ชอบมากเลย… |
| กินได้ เฉยๆ | `eatOk` | `mai_fed_ok_01.wav` | อร่อยดีนะ… |
|  |  | `mai_fed_ok_02.wav` | ขอบคุณนะ… |
| กินของไม่ชอบ | `eatDislike` | `mai_fed_dislike_01.wav` | ไม่เป็นไร… กินได้ |
|  |  | `mai_fed_dislike_02.wav` | อืม… พยายามอยู่นะ |
| อิ่มแล้ว | `full` | `mai_full_01.wav` | อิ่มแล้วนะ… ขอบคุณ |
|  |  | `mai_full_02.wav` | ไม่ไหวแล้ว… ขอโทษนะ |
| ปวดห้องน้ำ | `toiletNeed` | `mai_toilet_need_01.wav` | ขอไปห้องน้ำได้มั้ย… |
|  |  | `mai_toilet_need_02.wav` | อั้นไม่ไหวแล้ว… |
| ถูกอุ้ม | `carried` | `mai_carried_01.wav` | สูงจัง… กลัวนิดนึง |
|  |  | `mai_carried_02.wav` | อุ้มเราด้วยเหรอ… |
| โล่ง (หลังเข้าห้องน้ำ) | `relieved` | `mai_relieved_01.wav` | โล่งจัง… ขอบคุณนะ |
|  |  | `mai_relieved_02.wav` | ค่อยยังชั่ว… |
| ถูกลูบ | `pet` | `mai_petted_01.wav` | อุ่นจัง… ขอบคุณนะ |
|  |  | `mai_petted_02.wav` | ดีใจจัง… |
|  |  | `mai_petted_03.wav` | เราทำได้ดีใช่มั้ย… |
| ถูกจิ้ม | `poke` | `mai_poked_01.wav` | อ๊ะ… |
|  |  | `mai_poked_02.wav` | มีอะไรให้ช่วยมั้ย… |
|  |  | `mai_poked_03.wav` | เรียกเราเหรอ… |
| ถูกจิ้มรัว | `pokeSpam` | `mai_poked_too_much_01.wav` | ขอโทษนะ… ทำอะไรผิดรึเปล่า |
|  |  | `mai_poked_too_much_02.wav` | เบาๆ หน่อยได้มั้ย… |
| ถูกยืด | `stretchBig` | `mai_stretched_01.wav` | ยืดเยอะแล้วนะ… |
|  |  | `mai_stretched_02.wav` | เราจะขาดมั้ย… |
| ถูกบีบ | `squish` | `mai_squished_01.wav` | เขินนะ… |
|  |  | `mai_squished_02.wav` | นุ่มใช่มั้ย… |
| เหงา | `lonely` | `mai_lonely_01.wav` | ไม่เป็นไร… รอได้ |
|  |  | `mai_lonely_02.wav` | เราไม่ได้รบกวนใช่มั้ย… |
| ง่วง / เบื่อ | `sleepy` | `mai_sleepy_01.wav` | ง่วงนิดหน่อย… |
|  |  | `mai_sleepy_02.wav` | วาดรูปเล่นคนเดียวก็ได้… |
| มีความสุข | *(ใหม่)* `happy` | `mai_happy_01.wav` | ดีใจจัง… วันนี้ดีนะ |
|  |  | `mai_happy_02.wav` | เรามีความสุขนะ… ขอบคุณ |
|  |  | `mai_happy_03.wav` | อยู่ด้วยกันแบบนี้ ดีจัง… |
| กลับมาหลังหายไปนาน | `back` | `mai_back_01.wav` | กลับมาแล้วเหรอ… ดีใจจัง |
|  |  | `mai_back_02.wav` | คิดถึงนิดนึงนะ… |
| ทักกล้อง | `cameraHello` | `mai_camera_hello_01.wav` | เห็นมือแล้ว… หวัดดีนะ |
|  |  | `mai_camera_hello_02.wav` | เขินกล้องจัง… |
| ถูกหยิบ | `grab` | `mai_grabbed_01.wav` | เอ๊ะ จะพาไปไหน… |
|  |  | `mai_grabbed_02.wav` | จับเบาๆ นะ… |
| เด้งกลับ | `boing` | `mai_boing_01.wav` | ฟุ้บ |
|  |  | `mai_boing_02.wav` | กลับมาแล้ว… เย้ |
| ถูกบีบแรง | `squishHard` | `mai_squished_hard_01.wav` | เราเป็นภาระรึเปล่า… |
|  |  | `mai_squished_hard_02.wav` | แน่นไปนิดนะ… |
| ถูกปัด | `slap` | `mai_slapped_01.wav` | ขอโทษ ขอโทษ… |
|  |  | `mai_slapped_02.wav` | เราผิดเองแหละ… |
| กดชักโครก | `flush` | `mai_flush_01.wav` | บ๊ายบาย… |
|  |  | `mai_flush_02.wav` | หมุนๆ… สวยดี |
| พาเข้าห้องน้ำแต่ยังไม่ปวด | `toiletNoNeed` | `mai_toilet_no_need_01.wav` | ยังไม่ปวดนะ… ขอโทษ |
|  |  | `mai_toilet_no_need_02.wav` | นั่งเฉยๆ ก็ได้นะ… |
| หัวเราะคิกคัก (ไม่มีคำ) | — | `mai_giggle_01.wav` | *(เสียง)* |
|  |  | `mai_giggle_02.wav` | *(เสียง)* |
|  |  | `mai_giggle_03.wav` | *(เสียง)* |
| หาว (ไม่มีคำ) | — | `mai_yawn_01.wav` | *(เสียง)* |
|  |  | `mai_yawn_02.wav` | *(เสียง)* |
| เคี้ยว หม่ำๆ (ไม่มีคำ) | — | `mai_eat_munch_01.wav` | *(เสียง)* |
|  |  | `mai_eat_munch_02.wav` | *(เสียง)* |

## 5. มิน (`min`) — CEO, ENFJ
- **เสียง:** มั่นใจ อบอุ่น ชัดถ้อยชัดคำ จังหวะหัวหน้าทีมที่ชวนลุย
- **โทนตลอด:** "ใจแลกใจ" ให้กำลังใจ พูดถึง "ทีม" บ่อย
- **ความต่าง:** จุดอ่อนคือคิดมาก → `poked_too_much`, `squished_hard`, `slapped` เปลี่ยนจากมั่นใจเป็นลังเลกลางประโยค ("…เขาหมายถึงเราใช่มั้ย") · `lonely` เหงาแบบผู้นำที่ไม่มีทีม
- **เสียงไม่มีคำ:** giggle "ฮ่าๆ" เปิดเผย · yawn ยืดเส้นยืดสาย · eat_munch กินเต็มคำ ไว

| เหตุการณ์ | personas.json | ไฟล์ | บท |
|---|---|---|---|
| ทักทาย | `hello` | `min_hello_01.wav` | มาแล้ว! ลุยกัน! |
|  |  | `min_hello_02.wav` | วันนี้ทีมเราพร้อมนะ! |
| หิว | `hungry` | `min_hungry_01.wav` | เติมพลังก่อนลุยนะ! |
|  |  | `min_hungry_02.wav` | หิวแล้ว ขอเบรกหน่อย |
| กินของชอบ | `eatLike` | `min_fed_like_01.wav` | อร่อย! พลังเต็มเลย! |
|  |  | `min_fed_like_02.wav` | ของชอบ! ขอบใจนะ! |
| กินได้ เฉยๆ | `eatOk` | `min_fed_ok_01.wav` | อร่อยดี ขอบใจ! |
|  |  | `min_fed_ok_02.wav` | ได้หมด กินได้! |
| กินของไม่ชอบ | `eatDislike` | `min_fed_dislike_01.wav` | ไม่ค่อยชอบ แต่ลองดู! |
|  |  | `min_fed_dislike_02.wav` | เปิดใจกินก็ได้! |
| อิ่มแล้ว | `full` | `min_full_01.wav` | อิ่มแล้ว พร้อมลุย! |
|  |  | `min_full_02.wav` | พอก่อน เดี๋ยวจุก! |
| ปวดห้องน้ำ | `toiletNeed` | `min_toilet_need_01.wav` | ขอพักห้องน้ำแป๊บ! |
|  |  | `min_toilet_need_02.wav` | ด่วน! ห้องน้ำ! |
| ถูกอุ้ม | `carried` | `min_carried_01.wav` | ไปกันเลยทีม! |
|  |  | `min_carried_02.wav` | อุ้มแบบนี้ก็ดีนะ! |
| โล่ง (หลังเข้าห้องน้ำ) | `relieved` | `min_relieved_01.wav` | โล่ง! กลับไปลุยต่อ |
|  |  | `min_relieved_02.wav` | สบายแล้ว ขอบใจ! |
| ถูกลูบ | `pet` | `min_petted_01.wav` | ขอบใจนะ ใจแลกใจ! |
|  |  | `min_petted_02.wav` | ทีมเราดีที่สุด! |
| ถูกจิ้ม | `poke` | `min_poked_01.wav` | ฮ่าๆ มีอะไรเหรอ |
|  |  | `min_poked_02.wav` | ว่าไง มีงานด่วน? |
| ถูกจิ้มรัว | `pokeSpam` | `min_poked_too_much_01.wav` | เราทำอะไรพลาดรึเปล่า… |
|  |  | `min_poked_too_much_02.wav` | เดี๋ยวๆ คุยกันก่อนนะ |
| ถูกยืด | `stretchBig` | `min_stretched_01.wav` | ไหวๆ ยังไหว! |
|  |  | `min_stretched_02.wav` | ขยายสโคปอีกแล้ว! |
| ถูกบีบ | `squish` | `min_squished_01.wav` | กอดทีมแน่นๆ! |
|  |  | `min_squished_02.wav` | อบอุ่นดีนะ! |
| เหงา | `lonely` | `min_lonely_01.wav` | ทุกคนไปไหนกันหมด… |
|  |  | `min_lonely_02.wav` | ประชุมคนเดียวเหงาจัง… |
| ง่วง / เบื่อ | `sleepy` | `min_sleepy_01.wav` | พักแป๊บนึงนะ |
|  |  | `min_sleepy_02.wav` | ว่างจัง… วางแผนต่อดีกว่า |
| มีความสุข | *(ใหม่)* `happy` | `min_happy_01.wav` | ทีมเราสุดยอด! ไปต่อ! |
|  |  | `min_happy_02.wav` | พลังเต็มร้อยเลย! |
|  |  | `min_happy_03.wav` | ใจฟูมากวันนี้! |
| กลับมาหลังหายไปนาน | `back` | `min_back_01.wav` | กลับมาแล้ว! ลุยต่อ! |
|  |  | `min_back_02.wav` | คิดถึงทีมเลย! |
| ทักกล้อง | `cameraHello` | `min_camera_hello_01.wav` | หวัดดีทุกคน! |
|  |  | `min_camera_hello_02.wav` | เห็นแล้ว! ไฮไฟว์! |
| ถูกหยิบ | `grab` | `min_grabbed_01.wav` | ได้เลย พาไปไหนก็ไป! |
|  |  | `min_grabbed_02.wav` | นำทางเลย! |
| เด้งกลับ | `boing` | `min_boing_01.wav` | กลับมาแล้ว! |
|  |  | `min_boing_02.wav` | เด้งกลับไวมาก! |
| ถูกบีบแรง | `squishHard` | `min_squished_hard_01.wav` | แรงไปนิด… คิดมากเลยนะ |
|  |  | `min_squished_hard_02.wav` | เราโอเค… มั้งนะ |
| ถูกปัด | `slap` | `min_slapped_01.wav` | …เขาหมายถึงเราใช่มั้ย |
|  |  | `min_slapped_02.wav` | โอ๊ย! คิดมากเลยนะ |
| กดชักโครก | `flush` | `min_flush_01.wav` | เคลียร์งานเรียบร้อย! |
|  |  | `min_flush_02.wav` | ปิดจ็อบ! |
| พาเข้าห้องน้ำแต่ยังไม่ปวด | `toiletNoNeed` | `min_toilet_no_need_01.wav` | ยังไม่ปวดนะ ไปลุยต่อ! |
|  |  | `min_toilet_no_need_02.wav` | แวะเช็กเฉยๆ สินะ! |
| หัวเราะคิกคัก (ไม่มีคำ) | — | `min_giggle_01.wav` | *(เสียง)* |
|  |  | `min_giggle_02.wav` | *(เสียง)* |
|  |  | `min_giggle_03.wav` | *(เสียง)* |
| หาว (ไม่มีคำ) | — | `min_yawn_01.wav` | *(เสียง)* |
|  |  | `min_yawn_02.wav` | *(เสียง)* |
| เคี้ยว หม่ำๆ (ไม่มีคำ) | — | `min_eat_munch_01.wav` | *(เสียง)* |
|  |  | `min_eat_munch_02.wav` | *(เสียง)* |

## 6. แอ๊ค (`ack`) — UI/Motion, ISFJ
- **เสียง:** สุภาพ เรียบ ละเอียด ระดับเสียงกลาง เน้นคำศัพท์งานออกแบบ (`easing`, `overshoot`, `1px`) ให้ออกเสียงอังกฤษชัดแบบคนในวงการ
- **โทนตลอด:** สังเกตความสวยงาม วิจารณ์เบาๆ อย่างมีรสนิยม ไม่โวยวาย
- **ความต่าง:** ทนการยืด/บีบได้น้อยที่สุด → `stretched`, `squished_hard` ตกใจเรื่อง "ทรงเสีย" ชัดที่สุด · `lonely`, `slapped` น้อยใจเพราะไม่มีใครเห็นค่า · `sleepy` บรรทัด "…" ให้เป็นเสียงถอนหายใจยาว 1 ครั้ง
- **เสียงไม่มีคำ:** giggle สั้น สุภาพ "หึๆ" · yawn เก็บอาการ · eat_munch ละเมียด

| เหตุการณ์ | personas.json | ไฟล์ | บท |
|---|---|---|---|
| ทักทาย | `hello` | `ack_hello_01.wav` | สวัสดี มุมนี้แสงสวยดี |
|  |  | `ack_hello_02.wav` | วันนี้โทนสีดีนะ |
| หิว | `hungry` | `ack_hungry_01.wav` | หิวแล้ว ขอของน่ากิน |
|  |  | `ack_hungry_02.wav` | ท้องว่าง สมาธิหลุด… |
| กินของชอบ | `eatLike` | `ack_fed_like_01.wav` | จัดจานสวย อร่อยด้วย |
|  |  | `ack_fed_like_02.wav` | สีสวย รสดี เป๊ะ |
| กินได้ เฉยๆ | `eatOk` | `ack_fed_ok_01.wav` | ก็ดีนะ |
|  |  | `ack_fed_ok_02.wav` | รสชาติใช้ได้ |
| กินของไม่ชอบ | `eatDislike` | `ack_fed_dislike_01.wav` | สีมันช้ำแล้ว… |
|  |  | `ack_fed_dislike_02.wav` | หน้าตาไม่ผ่านนะ… |
| อิ่มแล้ว | `full` | `ack_full_01.wav` | พอดีแล้ว อย่าเกิน |
|  |  | `ack_full_02.wav` | อิ่มแล้ว ทรงจะเสีย |
| ปวดห้องน้ำ | `toiletNeed` | `ack_toilet_need_01.wav` | ขอตัวไปห้องน้ำนะ |
|  |  | `ack_toilet_need_02.wav` | ไม่ไหว ต้องไปแล้ว |
| ถูกอุ้ม | `carried` | `ack_carried_01.wav` | ถือให้ตรงๆ นะ |
|  |  | `ack_carried_02.wav` | มุมกล้องนี้ดีนะ |
| โล่ง (หลังเข้าห้องน้ำ) | `relieved` | `ack_relieved_01.wav` | เรียบร้อย สะอาดดี |
|  |  | `ack_relieved_02.wav` | โล่ง… สมดุลแล้ว |
| ถูกลูบ | `pet` | `ack_petted_01.wav` | อืม… นุ่มนวลดี |
|  |  | `ack_petted_02.wav` | easing พอดีเลย |
| ถูกจิ้ม | `poke` | `ack_poked_01.wav` | ระวังเลเยอร์เคลื่อน! |
|  |  | `ack_poked_02.wav` | จิ้มตรงกลางพอดี |
|  |  | `ack_poked_03.wav` | อ๊ะ ขยับไป 1px |
| ถูกจิ้มรัว | `pokeSpam` | `ack_poked_too_much_01.wav` | ทรงเสียหมดแล้ว… |
|  |  | `ack_poked_too_much_02.wav` | พอก่อน งานพังหมด |
| ถูกยืด | `stretchBig` | `ack_stretched_01.wav` | สัดส่วนเพี้ยนแล้ว! |
|  |  | `ack_stretched_02.wav` | อัตราส่วนไม่ได้แล้ว! |
| ถูกบีบ | `squish` | `ack_squished_01.wav` | squash & stretch สินะ |
|  |  | `ack_squished_02.wav` | เนื้อดินดีนะ |
| เหงา | `lonely` | `ack_lonely_01.wav` | ไม่มีใครเห็นเลยสินะ… |
|  |  | `ack_lonely_02.wav` | แสงหม่นลงแล้ว… |
| ง่วง / เบื่อ | `sleepy` | `ack_sleepy_01.wav` | … |
|  |  | `ack_sleepy_02.wav` | เกลี่ยสีเล่นดีกว่า… |
| มีความสุข | *(ใหม่)* `happy` | `ack_happy_01.wav` | ทุกอย่างลงตัวพอดี |
|  |  | `ack_happy_02.wav` | วันนี้ปริซึมสว่างเลย |
|  |  | `ack_happy_03.wav` | สมดุลสวยงาม |
| กลับมาหลังหายไปนาน | `back` | `ack_back_01.wav` | ในที่สุดก็มีคนเห็น |
|  |  | `ack_back_02.wav` | มาพอดี แสงกำลังสวย |
| ทักกล้อง | `cameraHello` | `ack_camera_hello_01.wav` | เฟรมนี้องค์ประกอบดี |
|  |  | `ack_camera_hello_02.wav` | หวัดดี แสงกล้องโอเค |
| ถูกหยิบ | `grab` | `ack_grabbed_01.wav` | ขยับเบาๆ นะ |
|  |  | `ack_grabbed_02.wav` | ระวังมุมแหลมนะ |
| เด้งกลับ | `boing` | `ack_boing_01.wav` | เด้งกลับพอดีเป๊ะ |
|  |  | `ack_boing_02.wav` | overshoot สวยมาก |
| ถูกบีบแรง | `squishHard` | `ack_squished_hard_01.wav` | เสียทรงงง |
|  |  | `ack_squished_hard_02.wav` | ปริซึมบิดแล้ว! |
| ถูกปัด | `slap` | `ack_slapped_01.wav` | โอ๊ย งานพัง! |
|  |  | `ack_slapped_02.wav` | ไม่เห็นค่ากันเลย… |
| กดชักโครก | `flush` | `ack_flush_01.wav` | หมุนวนสวยดี |
|  |  | `ack_flush_02.wav` | motion ลื่นมาก |
| พาเข้าห้องน้ำแต่ยังไม่ปวด | `toiletNoNeed` | `ack_toilet_no_need_01.wav` | ยังไม่ต้องนะ |
|  |  | `ack_toilet_no_need_02.wav` | นั่งเฉยๆ ไม่สวยเลย |
| หัวเราะคิกคัก (ไม่มีคำ) | — | `ack_giggle_01.wav` | *(เสียง)* |
|  |  | `ack_giggle_02.wav` | *(เสียง)* |
|  |  | `ack_giggle_03.wav` | *(เสียง)* |
| หาว (ไม่มีคำ) | — | `ack_yawn_01.wav` | *(เสียง)* |
|  |  | `ack_yawn_02.wav` | *(เสียง)* |
| เคี้ยว หม่ำๆ (ไม่มีคำ) | — | `ack_eat_munch_01.wav` | *(เสียง)* |
|  |  | `ack_eat_munch_02.wav` | *(เสียง)* |

## 7. ฟ้า (`fah`) — Handoff/Dev, INFJ
- **เสียง:** สั้น ห้วน เรียบ ต่ำกว่าคนอื่นเล็กน้อย คำน้อยที่สุดในทีม ไม่ลากเสียง
- **โทนตลอด:** ต้องการพื้นที่ส่วนตัว แต่ใจดีลึกๆ (`petted` "…ก็ได้" ให้แอบอ่อนลงนิดหนึ่ง)
- **ความต่าง:** แอบวีนง่าย → `poked_too_much`, `squished_hard`, `stretched` ขึ้นเสียงสูงฉับพลัน แต่ไม่หยาบ ไม่ตะโกนเต็มเสียง · `lonely` ไม่เหงาจริง ฟังพอใจกับความเงียบ · `slapped` "!!!" = เสียงสะดุ้งสั้นๆ ไม่มีคำ · `sleepy` "zzz" = เสียงกรนเบาๆ แบบน่ารัก · `deploy` ออกเสียงอังกฤษ
- **เสียงไม่มีคำ:** giggle "หึ" แอบขำ 1–2 จังหวะ · yawn สั้น · eat_munch ไวและเงียบ

| เหตุการณ์ | personas.json | ไฟล์ | บท |
|---|---|---|---|
| ทักทาย | `hello` | `fah_hello_01.wav` | …หวัดดี |
|  |  | `fah_hello_02.wav` | อือ มาแล้วเหรอ |
| หิว | `hungry` | `fah_hungry_01.wav` | หิว เร็วๆ |
|  |  | `fah_hungry_02.wav` | ขอของกินหน่อย |
| กินของชอบ | `eatLike` | `fah_fed_like_01.wav` | อร่อย |
|  |  | `fah_fed_like_02.wav` | อันนี้ผ่าน |
| กินได้ เฉยๆ | `eatOk` | `fah_fed_ok_01.wav` | โอเค |
|  |  | `fah_fed_ok_02.wav` | ได้อยู่ |
| กินของไม่ชอบ | `eatDislike` | `fah_fed_dislike_01.wav` | หวานไป ไม่เอา |
|  |  | `fah_fed_dislike_02.wav` | เลอะมือ… |
| อิ่มแล้ว | `full` | `fah_full_01.wav` | อิ่มละ |
|  |  | `fah_full_02.wav` | พอ |
| ปวดห้องน้ำ | `toiletNeed` | `fah_toilet_need_01.wav` | ห้องน้ำ ด่วน |
|  |  | `fah_toilet_need_02.wav` | ไปห้องน้ำแป๊บ |
| ถูกอุ้ม | `carried` | `fah_carried_01.wav` | วางลงได้แล้ว |
|  |  | `fah_carried_02.wav` | เดินเองได้นะ |
| โล่ง (หลังเข้าห้องน้ำ) | `relieved` | `fah_relieved_01.wav` | โล่ง |
|  |  | `fah_relieved_02.wav` | เคลียร์ละ |
| ถูกลูบ | `pet` | `fah_petted_01.wav` | …ก็ได้ ลูบนิดเดียวนะ |
|  |  | `fah_petted_02.wav` | อืม… ไม่แย่ |
| ถูกจิ้ม | `poke` | `fah_poked_01.wav` | อะไร |
|  |  | `fah_poked_02.wav` | ว่า? |
|  |  | `fah_poked_03.wav` | มีไร |
| ถูกจิ้มรัว | `pokeSpam` | `fah_poked_too_much_01.wav` | พอ! อย่ามายุ่ง! |
|  |  | `fah_poked_too_much_02.wav` | จะจิ้มอีกนานมั้ย! |
| ถูกยืด | `stretchBig` | `fah_stretched_01.wav` | จะเอายังไงกันแน่! |
|  |  | `fah_stretched_02.wav` | แก้อีกแล้วเหรอ! |
| ถูกบีบ | `squish` | `fah_squished_01.wav` | ขอพื้นที่ส่วนตัวหน่อย |
|  |  | `fah_squished_02.wav` | ใกล้ไปละ |
| เหงา | `lonely` | `fah_lonely_01.wav` | เงียบดี ชอบ |
|  |  | `fah_lonely_02.wav` | …ก็ไม่ได้เหงานะ |
| ง่วง / เบื่อ | `sleepy` | `fah_sleepy_01.wav` | zzz |
|  |  | `fah_sleepy_02.wav` | งานหมดละ งีบ |
| มีความสุข | *(ใหม่)* `happy` | `fah_happy_01.wav` | …ก็ดีนะ |
|  |  | `fah_happy_02.wav` | วันนี้ไม่เลว |
|  |  | `fah_happy_03.wav` | อืม ชอบ |
| กลับมาหลังหายไปนาน | `back` | `fah_back_01.wav` | …มาอีกแล้ว |
|  |  | `fah_back_02.wav` | อ้าว กลับมาละ |
| ทักกล้อง | `cameraHello` | `fah_camera_hello_01.wav` | เห็นละ |
|  |  | `fah_camera_hello_02.wav` | อย่าเปิดกล้องนานนะ |
| ถูกหยิบ | `grab` | `fah_grabbed_01.wav` | ปล่อยนะ |
|  |  | `fah_grabbed_02.wav` | จะพาไปไหน |
| เด้งกลับ | `boing` | `fah_boing_01.wav` | ส่งแล้ว |
|  |  | `fah_boing_02.wav` | เสร็จ |
| ถูกบีบแรง | `squishHard` | `fah_squished_hard_01.wav` | พอแล้ววว! |
|  |  | `fah_squished_hard_02.wav` | ฟ้าจะผ่าแล้วนะ! |
| ถูกปัด | `slap` | `fah_slapped_01.wav` | !!! |
|  |  | `fah_slapped_02.wav` | เอาเรื่องละนะ |
| กดชักโครก | `flush` | `fah_flush_01.wav` | deploy แล้ว |
|  |  | `fah_flush_02.wav` | ส่งขึ้นเมฆละ |
| พาเข้าห้องน้ำแต่ยังไม่ปวด | `toiletNoNeed` | `fah_toilet_no_need_01.wav` | ไม่ปวด |
|  |  | `fah_toilet_no_need_02.wav` | พามาทำไม |
| หัวเราะคิกคัก (ไม่มีคำ) | — | `fah_giggle_01.wav` | *(เสียง)* |
|  |  | `fah_giggle_02.wav` | *(เสียง)* |
|  |  | `fah_giggle_03.wav` | *(เสียง)* |
| หาว (ไม่มีคำ) | — | `fah_yawn_01.wav` | *(เสียง)* |
|  |  | `fah_yawn_02.wav` | *(เสียง)* |
| เคี้ยว หม่ำๆ (ไม่มีคำ) | — | `fah_eat_munch_01.wav` | *(เสียง)* |
|  |  | `fah_eat_munch_02.wav` | *(เสียง)* |

## 8. ปาม (`pam`) — placeholder
ยังไม่กำหนดนิสัย (character-bible ตัวที่ 2) จึง **ยังไม่อัดเสียง** ในเกมใช้บับเบิลข้อความกลางๆ จาก `personas.json pill` และเสียงเอฟเฟกต์สังเคราะห์เท่านั้น เมื่อเจ้าของกำหนดนิสัยแล้ว Echo จะเขียนส่วนนี้เพิ่มตามรูปแบบข้อ 3–7 (prefix `pam`)

## 9. สเปกการส่งไฟล์ (Delivery spec)
| หัวข้อ | ค่า |
|---|---|
| รูปแบบ | WAV PCM 48 kHz, 24-bit, **mono** |
| ความดัง | **-14 LUFS integrated** (±1 LU) ต่อไฟล์ ตามมาตรฐาน EBU R128 |
| True peak | **≤ -1 dBTP** (แนะนำตั้ง -1.5 dBTP เผื่อตอนแปลงไฟล์) |
| หัว/ท้าย | เงียบ **0.2 วินาที** ทั้งหัวและท้าย ไม่มีเสียงคลิก (fade 5 ms) |
| ความยาว | บทพูด ≤ 3 วินาที · เสียงไม่มีคำ 0.5–2 วินาที |
| ห้องอัด | ห้องเงียบ ไม่มีเสียงก้อง noise floor ต่ำกว่า -60 dBFS ไมค์ห่างปาก ~15–20 ซม. มี pop filter |
| การแต่งเสียง | high-pass 80 Hz และ de-noise เบาๆ เท่านั้น **ห้ามใส่ reverb/EQ หนัก/pitch** (เกมมิกซ์เอง) |
| เทค | ส่งเทคที่เลือกแล้วตามชื่อไฟล์ในตาราง 1 ไฟล์ต่อ 1 บรรทัด อัดสำรองได้แต่ไม่ต้องส่ง |
| ไฟล์ในเกม | Echo แปลงจาก WAV เป็น `.m4a` (AAC mono 96 kbps) สำหรับเว็บ เก็บ WAV เป็น master |

**คลิปสั้นกว่า 3 วินาที:** ค่า integrated LUFS ของคลิปสั้นแกว่งได้ ให้วัดทั้งคลิปตามปกติ แล้วฟังเทียบกับไฟล์อ้างอิง `pai_hello_01.wav` ให้ดังเท่ากันด้วยหู

ตัวอย่างคำสั่งฟรี (ffmpeg) ปรับความดัง + ใส่เงียบหัวท้าย:
```
ffmpeg -i raw.wav -af "highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=7,adelay=delays=200:all=1,apad=pad_dur=0.2" -ar 48000 -ac 1 -c:a pcm_s24le pai_hello_01.wav
```
ตรวจซ้ำ: `ffmpeg -i pai_hello_01.wav -af ebur128=peak=true -f null -` ต้องได้ I ≈ -14 LUFS และ True peak ≤ -1 dBFS

## 10. หมายเหตุมิกซ์ในเกม (Echo)
- เสียงพากย์เข้า bus `voice`, SFX เข้า bus `sfx`, เพลงเข้า bus `music` ทั้งหมดผ่าน compressor + limiter + soft clip กลาง (`src/audio/context.js`) ไม่ให้เสียงซ้อนแล้วแตก
- เพลงถูก duck ลง ~-5 dB ใต้ SFX และเสียงพากย์/พูดตาม แล้วค่อยๆ กลับใน 0.4 วินาที
- เพลง (ยังไม่ทำใน Sprint 1): lo-fi / soft electronic ~100 BPM คอร์ด Fmaj7–Am7–Dm7–B♭maj7 วนต่อเนื่อง 1 เพลงต่อห้อง ช่วงเปิดไม่มีกลอง master -14 LUFS, ≤ -1 dBTP ต้องเป็นเพลงที่มีสิทธิ์ใช้หรือทำเอง
- เสียงเอฟเฟกต์ทั้งหมดสังเคราะห์ในเกม (`src/audio/sfx.js`) **ไม่มีอะไรต้องอัดเพิ่ม** นอกจากเสียงพากย์ในสคริปต์นี้

## 11. สิ่งที่ต้องให้คนอื่นทำ / ตัดสินใจ
1. **Loop:** เพิ่ม key `happy` ใน `personas.json` ทุกตัว (ใช้บทในสคริปต์นี้เป็นร่าง) และบอกว่าเกมเรียก `happy` ตอนไหน
2. **Wire:** เล่นไฟล์ `<prefix>_<event>_<NN>` ให้ตรงกับ index ของข้อความที่สุ่มขึ้นบับเบิล ถ้าไม่มีไฟล์ให้เงียบ (บับเบิลยังขึ้น)
3. **เจ้าของ:** หานักพากย์ 5 คน (หรือ 2–3 คนเล่นหลายตัว) และยืนยันสิทธิ์การใช้เสียง
