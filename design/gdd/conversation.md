# Conversation (คุยกับสัตว์เลี้ยง)

Owner: echo · Story: S5-D3 · Status: Draft v1 (2026-11-06), for owner review
Data (planned): `assets/data/conversation.json` (draft in §7.2) · lines also listed in `design/narrative/voice-script.md` §12
Depends on: `design/gdd/needs-system.md` (social), `design/gdd/growth-personality.md` (Loop, written in parallel: stage ids `baby` / `kid` / `grown` are assumed here until that file says otherwise), `docs/architecture/module-contracts.md` (expressions, actions, HUD)
Canon level of all lines below: **Provisional**

## 1. Overview

The mic button stops being "พูดตาม" (the pet repeats your voice) and becomes **talking to the pet**. The player taps the mic and says something in Thai ("หิวไหม", "น่ารักจัง", "เมอร์รี่คริสต์มาส"). The browser's speech recognition turns the speech into Thai text. A small **keyword brain** matches the text to one of 28 intents and picks a reply that fits the character's personality, its life stage (baby babbles, kid says short words, grown speaks full sentences) and its current state (hungry, wearing a Christmas hat, sleepy). The pet answers with a face, a body action, a text bubble and a short **synthesized babble voice** (Animal Crossing style, pitched per character and stage). Being talked to raises ใกล้ชิด (social). Version 1 is free: no server, no AI, no per-message cost. The brain sits behind one interface (`reply(input, context) → Reply`), so an AI backend can replace it later without UI changes. Where the browser can't recognise Thai (Firefox today, iPhone home-screen apps, in-app browsers such as LINE, offline), the mic falls back to the existing talk-back, so the button always does something.

## 2. Player Fantasy

"It understood me." The magic moment is asking "หิวไหม" and getting "หิวมากก!" back while the pet rubs its tummy, then seeing it was true (the hunger meter is low). Each pet answers in its own voice: ไผ่ shouts and laughs, ใหม่ answers softly and lights up when praised, มิน is the warm leader, แอ๊ค notices your compliment about its bow tie, ฟ้า is quick and a bit prickly. A baby pet can only coo and say "หม่ำ?", and part of the joy of growth is hearing it learn to talk. Mistakes are cute, never frustrating: if it didn't catch a word, it tilts its head, and after two misses it shows a few phrases to try. Children and adults alike should feel the pet is listening, not testing them.

## 3. Detailed Rules

### 3.1 Modes of the mic button

| Mode | When | What the mic does |
|---|---|---|
| `talk` (new default) | Speech recognition is usable for `th-TH` (§3.9) | One conversation turn per press (§3.2) |
| `echo` (existing talk-back) | Recognition unsupported, failed, offline, or the player chose it | Exactly today's `createTalkback` behaviour |

`settings.talkMode` in the save: `auto` (default: `talk` when supported, else `echo`) · `talk` · `echo`. The player can switch in the small sheet that opens on a long press of the mic ("คุยกัน" / "พูดตาม"). Talk-back is never deleted: it is the fallback and works fully on the device.

### 3.2 One turn (talk mode)

1. **Press mic** (gesture). First press only: show the one-time privacy notice (§3.10). Then, inside the same gesture: `resumeAudio()`, `recognition.start()`. The game never calls `start()` or `getUserMedia()` outside a mic press.
2. **Listening** (`hud.setMic('listening')`): pet plays `tilt`, keeps expression `original`, eyes look at the camera. Interim text (when the browser gives it) shows as a small grey caption under the bubble.
3. **End of speech.** Single-shot recognition (`continuous = false`, `interimResults = true`, `maxAlternatives = 3`) ends by itself after a pause. If nothing is heard within `listenTimeoutSec` (7 s): stop, pet says the persona's `silence` line ("…?"), no need change.
4. **Thinking** (`hud.setMic('thinking')`): `brain.reply(input, context)`. The keyword brain answers in well under 20 ms, so nothing shows. A slow brain (AI later) shows the `thinking` beat after `thinkingShowSec` (0.6 s): expression `surprised` → `tilt`, three-dot bubble.
5. **Reply**: `pet.setExpression(reply.expression)`, `pet.play(reply.action)`, `hud.say(reply.text)`, voice (§3.7) with `pet.setTalkLevel(level)` from the voice envelope, needs change (§3.8), optional `followUp` hint (§3.6). The heard text stays as a caption for `captionSec` (2 s), so the player can see what the pet "heard" when it answers oddly.
6. Back to idle (`hud.setMic('off')`). Hands-free chaining is off by default (open question Q5).

The pet's own voice plays only after recognition has ended, so it can never hear itself.

### 3.3 Reading the transcript (normalisation)

Applied identically to the transcript **and** to every keyword in the data, so spelling quirks cancel out:

1. Unicode NFC; Latin to lower case; Thai digits ๐–๙ → 0–9.
2. Remove spaces, punctuation, zero-width characters and `ๆ` (ไม้ยมก). Keep a copy of where the raw spaces were (used by the boundary rule in 3.4).
3. Collapse runs of the same character to one: "หิวววว" → "หิว", "รักกกก" → "รัก". (This also turns "รร" into "ร"; because keywords get the same treatment, matching stays consistent.)
4. Tone-free copy for pass 2: remove ่ ้ ๊ ๋ ็ ์ (U+0E47–U+0E4C).

### 3.4 Matching intents

Each intent has a list of keywords (§7.2). For each recognition alternative (up to 3), run:

- **Pass 1, exact:** keyword is a substring of the normalised text. Weight × 1.0.
- **Pass 2, tone-free:** substring on the tone-free copies. Weight × 0.85. Only keywords with ≥ 4 code points.
- **Pass 3, near:** Levenshtein distance ≤ 1 against any window of the text of length k−1..k+1. Weight × 0.7. Only keywords with ≥ 5 code points (catches "เมอรี่คริสมาส", "ขอบคูณ").

Rules applied while matching:

- **Longest first, then mask.** Keywords are tried from longest to shortest. A matched span is masked, so shorter keywords cannot reuse its letters: "น่ารัก" (cute) blocks "รัก" (love); "สวัสดีปีใหม่" blocks "สวัสดี" (greeting) and "ใหม่" (the name of ใหม่); "อายุเท่าไหร่" blocks "เท่" (cool).
- **Short keywords need a boundary.** Keywords with ≤ 3 code points ("รัก", "เท่", "ขำ", "hi") match only if each side is the start or end of the text, a raw space, a boundary word (particles ครับ ค่ะ คะ นะ จ้ะ จ้า เลย จัง มาก ไหม มั้ย, pronouns เธอ ฉัน เรา หนู ผม ตัวเอง แก) or another masked match. They are never used in passes 2–3. "ราคาเท่าไหร่" therefore does not mean "you look cool".
- **Negation.** If "ไม่" / "ไม่ได้" / "ไม่ค่อย" sits directly before a match and the intent defines `negated`, the match counts for that other intent: "ไม่รัก" → `mean`, "ไม่น่ารัก" → `mean`, "ไม่ได้เกลียด" → `comfort`. "ไม่เป็นไร" is its own keyword (masked first), so it is not a negation.
- **Pet's name.** The current character's name counts as `call_name` with weight 0.5, so it wins only when nothing else matched. If the name appears together with another intent, the reply gets the `perk` beat (the pet looks up and blinks first). Other characters' names → `other_pet`; this is not an intent of its own: it adds a jealous/curious variant to `unknown`. "ใหม่" and "ฟ้า" are also everyday words (new, sky), so they count as names only at a boundary (same rule as short keywords).

Scoring and choice: see §4.2. Below `minScore` → intent `unknown`.

### 3.5 Intents (28 + unknown)

Keywords are examples. The full lists live in `conversation.json` and are tuned from playtest transcripts (§5, E14).

| # | Intent | Thai keyword examples | Context variants |
|---|---|---|---|
| 1 | `greeting` | สวัสดี, หวัดดี, ดีจ้า, ฮัลโหล, hello, hi | first talk today / again |
| 2 | `goodbye` | บ๊ายบาย, บายบาย, ไปก่อนนะ, แล้วเจอกัน, ลาก่อน, bye | — |
| 3 | `good_morning` | อรุณสวัสดิ์, ตื่นแล้ว, ตื่นยัง, มอร์นิ่ง, good morning | morning (5–11 h) / not morning ("สายแล้วน้า") |
| 4 | `good_night` | ฝันดี, ราตรีสวัสดิ์, ไปนอน, นอนได้แล้ว, กู๊ดไนท์ | late (20–5 h) / daytime |
| 5 | `ask_name` | ชื่ออะไร, ชื่อไร, เธอชื่อ, คุณชื่อ | — |
| 6 | `call_name` | (current pet's name, weak) | — |
| 7 | `how_are_you` | สบายดีไหม, เป็นไงบ้าง, เป็นยังไง, โอเคไหม, วันนี้เป็นไง | lowest need < low → names that need / all good |
| 8 | `ask_hungry` | หิวไหม, หิวมั้ย, หิวยัง, หิวรึยัง, กินข้าวยัง, อยากกินอะไร | hunger < low / ok / ≥ good |
| 9 | `favorite_food` | ชอบกินอะไร, ของโปรด, อาหารที่ชอบ, ขนมที่ชอบ | inserts `{food}` from `foods.json likes` |
| 10 | `ask_toilet` | ปวดฉี่, ปวดห้องน้ำ, ไปห้องน้ำ, เข้าห้องน้ำ, ปวดอึ | toilet < low / ok |
| 11 | `play` | เล่นกัน, มาเล่น, ไปเล่น, เล่นเกม, เบื่อไหม | fun < low / ok · in living room or not |
| 12 | `ask_sleepy` | ง่วงไหม, ง่วงยัง, ง่วงนอน, เหนื่อยไหม, พักก่อน | late / day |
| 13 | `praise_cute` | น่ารัก, คิ้วท์, น่าเอ็นดู, cute | — (negated → `mean`) |
| 14 | `praise_good` | เก่งมาก, เก่ง, เยี่ยม, สุดยอด, เจ๋ง, ปังมาก | — (negated → `mean`) |
| 15 | `love` | รัก, รักนะ, รักเธอ, ชอบเธอ, เลิฟ, love | — (negated → `mean`) |
| 16 | `miss_you` | คิดถึง, คิดถึงจัง | away > backAfterMinutes / not |
| 17 | `sorry` | ขอโทษ, โทษนะ, ซอรี่, sorry | after `mean` or a slap in the last 2 min / none |
| 18 | `thanks` | ขอบคุณ, ขอบใจ, แต๊งกิ้ว, thank | — |
| 19 | `comfort` | ไม่เป็นไร, อย่าเสียใจ, สู้ๆ, เป็นกำลังใจให้, อย่าร้องนะ | pet sad/lonely now / fine |
| 20 | `outfit` | ชุดสวย, ชุดน่ารัก, ชุดใหม่, หมวกสวย, แว่นเท่, หล่อจัง, สวยจัง, แต่งตัว, เท่ | wearing a liked item / any item / nothing |
| 21 | `room` | ห้องสวย, บ้านสวย, ห้องน่ารัก, แต่งห้อง, โซฟาสวย | any non-default furniture in this room / defaults |
| 22 | `christmas` | เมอร์รี่คริสต์มาส, สุขสันต์วันคริสต์มาส, คริสต์มาส, คริสมาส, ซานต้า, merry christmas | wearing/placed xmas items / December / other |
| 23 | `new_year` | สวัสดีปีใหม่, ปีใหม่, แฮปปี้นิวเยียร์, happy new year | 25 Dec–5 Jan / other |
| 24 | `joke` | เล่ามุก, มุกตลก, ตลก, ขำ, เล่าเรื่องตลก | — |
| 25 | `sing` | ร้องเพลง, ร้องเพลงให้ฟัง, ร้องให้ฟังหน่อย | — (reply uses a short sung babble, §3.7) |
| 26 | `ask_age` | อายุเท่าไหร่, กี่ขวบ, โตแล้ว, โตขึ้น, ตัวโต | per stage |
| 27 | `what_doing` | ทำอะไรอยู่, ทำไรอยู่, ทำอะไร | room / lowest need |
| 28 | `mean` | ขี้เหร่, น่าเกลียด, โง่, เกลียด, น่ารำคาญ, หุบปาก | — (negated → `comfort`) |
| — | `unknown` | no intent ≥ minScore | 1st miss / 2nd miss in a row (shows hints) / other pet's name heard |

`mean` is handled gently: the persona's hurt face (`hurtExpr`), a short sad line, no need goes down, and a following `sorry` within 2 minutes gets a warm "make up" reply. The pet never repeats an insult back.

### 3.6 Choosing the reply

1. **Lines table:** `responses[charKey][intent][variant][stage]` → list of `{ id, text, expression, action }`. The variant is the first `when` rule of the intent that matches the context (§7.2), else `default`.
2. **Stage fallback:** if a stage has no lines, use the nearest stage that does (`kid` → `grown` → `baby`). If a character has no table (`pill` / ปาม for now), use the `_neutral` table.
3. **No repeats:** a shuffle bag per (char, intent, variant, stage). The same line never plays twice in a row.
4. **Placeholders:** `{name}` (pet name), `{food}` (a liked food name from `foods.json`), `{item}` (equipped outfit item name). Missing value → the line is skipped for another one.
5. **followUp** (optional): `kitchen`, `bathroom`, `play`, `wardrobe`, `decor`, `sleep`. The HUD gently pulses the matching button or room arrow for 3 s (Glaze). It never moves the player automatically.

Persona and stage style:

| Character | baby (babble + 1 baby word) | kid (1–4 simple words) | grown (full persona voice) |
|---|---|---|---|
| ไผ่ `flower` | loud happy coos, "ปู๊! หม่ำ!" | "หิวว! หม่ำๆ!", "เล่นน!" | long vowels, 555, exclamation, ideas everywhere |
| ใหม่ `splat` | tiny soft hums, "อื้อ…" | "ขอบคุณ… นะ", quiet | soft, polite, unsure, glows when praised |
| มิน `gumdrop` | warm round "บะบะ!" | "ไปกัน!", "เก่ง!" | confident team leader, warm, a little overthinking when hurt |
| แอ๊ค `diamond` | neat short chirps | "สวย!", "เป๊ะ!" | precise, aesthetic, notices outfit and room details |
| ฟ้า `cloud` | quick clipped "ปึ๊!" | "อือ", "เร็วๆ" | short, fast, private, a bit snappy, tech words |
| ปาม `pill` | neutral | neutral | neutral (until the character bible defines ปาม) |

Baby text must still make sense with sound off: one recognisable baby word (หม่ำ, ฉี่, นอน, เล่น, รัก) plus the face and action carry the meaning.

### 3.7 How the pet's voice sounds

**Now: synthesized babble** (`src/audio/babble.js`, echo). For every reply, a run of soft syllables on the `voice` bus, length from the text, pitch and speed from the character and stage, seeded from the line id so the same line always "sounds" the same word. Questions rise at the end, "…" trails off slower and quieter, "!" lines are a little brighter. The envelope drives `pet.setTalkLevel`. `sing` uses a 4–6 note tune in F major (the music key). No recordings needed, all rights ours.

**Browser text-to-speech (evaluated, not used by default).** Thai system voices exist on many devices: iOS ships a Thai `th-TH` voice (listed since iOS 7), Windows has a Thai voice through a language pack and Edge adds Microsoft online voices, and Android uses whatever TTS engine the user installed. It is not a good fit as the pet's voice:
- one adult voice per device, not a cute character; raising `pitch` sounds robotic;
- a different voice on every phone, so ไผ่ sounds like a different pet on each device;
- some devices have no Thai voice at all, and online voices (Chrome's Google voices, Edge's online voices) send the reply text to Google or Microsoft;
- iOS needs the first `speak()` inside a tap, and our reply arrives later (after recognition);
- `getVoices()` is empty until `voiceschanged` fires in Chromium.
Decision: babble by default; TTS only behind a debug flag `?tts` for comparison.

**Later: recorded lines.** Every line has an id `<prefix>_talk_<intent>_<variant>_<stage>_<NN>` (e.g. `pai_talk_ask_hungry_low_grown_01`). When a file exists at `assets/audio/voice/<prefix>/<id>.m4a`, it plays instead of babble; if it is missing, babble plays (the bubble always shows). Delivery spec = voice-script §9. Babies stay babble even then (owner may decide to record baby coos).

### 3.8 Effects on needs

- An understood turn (any intent but `unknown`, `mean`) raises social by `talkSocial × petGain × intentGain` (§4.4): affection intents (`love`, `praise_*`, `miss_you`, `comfort`, `outfit`, `room`, `christmas`, `new_year`, `thanks`, `sorry`) use `intentGain` 1.5, the rest 1.0.
- `unknown` still gives half (`intentGain` 0.5): being talked to is nice even when misunderstood.
- `mean`: 0, and the hurt face. No need ever goes down from talking.
- `play` and `joke` / `sing` also add `talkFun` (0.01) to fun.
- Social from talking is capped per rolling minute (`talkSocialCapPerMinute`), so talking cannot replace petting and feeding forever.
- Every turn resets the loneliness timer (same as `mood.onTalkPhrase` today).
- The brain emits `onIntent(intent)` so Loop's growth/raised-personality system can count, e.g., praise or play turns, if Loop's GDD wants that. This GDD defines no growth effect itself.

### 3.9 Is recognition available? (support check, on the first press)

Order (stop at the first that applies):

1. No `SpeechRecognition` / `webkitSpeechRecognition` → `echo`.
2. iOS home-screen web app (`navigator.standalone` or `display-mode: standalone` on iOS) → `echo` (not available there, WebKit bug 225298).
3. Known in-app browser (LINE, Facebook, Instagram, TikTok user-agent tokens) → `echo` + a one-time tip "เปิดใน Safari/Chrome เพื่อคุยกับน้องได้" (these browsers often expose the API without it working).
4. `SpeechRecognition.available` exists → check `{ langs: ['th-TH'], processLocally: true }`. `available` → use **local** recognition (`processLocally = true`), privacy text says "on this device". Anything else → remote recognition (do not auto-install a language pack, open question Q7).
5. `navigator.onLine === false` and not local → `echo` for this press, toast "ต้องต่อเน็ตเพื่อคุยกันนะ ตอนนี้ใช้พูดตามก่อน".
6. Try. Errors on `start()`/`onerror`:
   - `not-allowed` / `service-not-allowed`: the player (or Siri/Dictation being off on iOS) blocked it → `echo`, Thai message once: "เปิดไมค์และ Siri/การป้อนตามคำบอกก่อน หรือใช้พูดตามแทน". No retry loop.
   - `language-not-supported` → `echo` for the session.
   - `network` → `echo` for this press, retry `talk` next press.
   - `no-speech` → normal timeout path (3.2 step 3), not a failure.
   - `aborted` (e.g. the page lost focus) → silent, back to idle.
   - Edge desktop: the API exists but has been reported to fire no events. If no `start`/`audiostart` event arrives within `startTimeoutSec` (2 s), treat as unsupported for the session → `echo`.
7. Success → remember `capability: 'talk'` for the session (not saved: browsers change).

### 3.10 Privacy (honest version)

What the **game** does: it never records, stores, uploads or logs audio or transcripts in talk mode. The transcript lives in memory for one turn, is shown as a caption for 2 s, then is dropped. Nothing goes in the save file except `settings.talkMode` and `settings.talkNoticeSeen`. No analytics. Talk-back (echo mode) stays 100% on the device, as today.

What the **browser** does (outside our control):
- **Chrome / Chrome Android:** by default speech recognition runs on a server. MDN: "Your audio is sent to a web service for recognition processing, so it won't work offline." In Chrome that service is Google's. Chrome 139+ can recognise on the device (`processLocally`) only for languages whose pack is installed; Thai on-device support is not documented, so assume audio goes to Google.
- **Safari (iOS / macOS):** uses Apple's speech service and needs Siri or Dictation turned on. iOS lists Thai for on-device dictation, but Apple does not document whether web pages get the on-device path, so we cannot promise audio stays on the iPhone.
- **Edge:** on-device recognition is preview-only and has no Thai; the default path is not reliable (3.9).
- **Firefox 161+ (desktop):** Mozilla's implementation is strictly on the device, but language coverage (Thai) is not published yet.

So the free version **cannot promise "no audio leaves the device"** except when check 3.9-4 returns `available`. Before the first recognition, a one-time notice (Glaze styles it, no browser dialog):

> **คุยกับ{name}** เบราว์เซอร์จะส่งเสียงพูดของคุณไปแปลงเป็นข้อความที่ระบบของ Google หรือ Apple เกมไม่เก็บเสียงและข้อความไว้เลย
> [คุยเลย] [ใช้พูดตามแทน]

When recognition is local: "เสียงของคุณแปลงเป็นข้อความบนเครื่องนี้ ไม่ถูกส่งออกไปไหน". The notice is shown again if the mode changes from local to remote. The owner decides whether this is acceptable for young players (Q1).

### 3.11 The brain interface (swap keyword → AI later)

```js
// src/conversation/brain.js — the contract every brain implements
/**
 * @typedef {{ text: string, confidence?: number }} Alternative
 * @typedef {{ alternatives: Alternative[], local?: boolean }} Heard    // or a plain string (typed input, tests)
 * @typedef {{
 *   charKey: string, name: string, stage: 'baby'|'kid'|'grown',
 *   needs: { hunger: number, toilet: number, fun: number, social: number },
 *   expression: string, room: 'living'|'kitchen'|'bathroom',
 *   outfit: { head: string|null, eyes: string|null, body: string|null },
 *   likedItemsWorn: string[], xmasItemsVisible: number,
 *   now: Date, awayMinutes: number,
 *   recent: { intent: string, at: number }[], lastHurtAt: number|null
 * }} TalkContext
 * @typedef {{
 *   intent: string, confidence: number,          // 0..1
 *   lineId: string|null, text: string,           // text always present (≤ 120 chars)
 *   expression: string, action: string|null,     // from the character contract enums
 *   needs: { social?: number, fun?: number },    // requested deltas; the game applies caps
 *   followUp: null|'kitchen'|'bathroom'|'play'|'wardrobe'|'decor'|'sleep',
 *   voice: 'babble'|'clip'|'sing', source: 'keyword'|'ai'
 * }} Reply
 */
brain.reply(heard, context) → Promise<Reply>   // never rejects: errors resolve to the `unknown` reply
brain.id                                         // 'keyword' | 'ai'
```

Rules that make the swap safe:
- The UI only reads `Reply`. Expression and action are validated against the character enums; anything unknown becomes `original` / `null`. Text is cut to 120 characters. Need deltas are clamped and capped by the game (§4.4), never trusted from the brain.
- The game wraps any brain: if `reply` takes longer than `brainTimeoutSec` (5 s), or fails, or the device is offline, the keyword brain answers instead.
- Modules (proposed, Kiln to confirm ownership): `src/audio/listen.js` (recognition wrapper, echo), `src/audio/babble.js` (voice, echo), `src/conversation/keyword-brain.js` (matching, echo), wiring in `src/main.js` (wire), mic sheet, caption, hints and notice (glaze). Data `assets/data/conversation.json`: Loop owns the numbers, Echo writes intents and lines.

```js
import { createListener } from './audio/listen.js';
const ear = createListener({ lang: 'th-TH', onState(s) {}, onInterim(text) {}, onError(code) {} });
await ear.support();        // → 'local' | 'remote' | 'none'   (no prompt; safe before the gesture)
await ear.listenOnce();     // inside the mic press → Heard | null (timeout / no speech)
ear.stop();
import { createBabble } from './audio/babble.js';
createBabble().say(text, { charKey, stage, seed, kind: 'talk'|'sing', onLevel }); // → duration (s)
import { createKeywordBrain } from './conversation/keyword-brain.js';
const brain = createKeywordBrain({ data, personas, foods, wardrobe, rng });   // rng injected for tests
```

**AI brain (later, needs owner approval for spending).** Same `Reply`, different inside: the client sends the **transcript text and the context** (never audio) to a small server endpoint of ours; the server holds the API key (it can never be in the web page), adds the persona and stage prompt, asks a language model for JSON in the `Reply` shape and returns it. It needs a server (GitHub Pages is static) and costs money **per message**; the owner decides the budget and a daily turn cap per player. Requirements: Thai only, ≤ 120 characters, all-ages content filter, stays in character, never claims to be a real person, falls back to the keyword brain on timeout, error or quota. Free alternatives to look at first: browsers' built-in on-device AI (where available) or typed input with the keyword brain; both still go through this interface.

## 4. Formulas

### 4.1 Normalisation
`N(s) = collapseRuns(stripMarks?(removeSpacesPunct(digitsToArabic(lower(NFC(s))))))` — `stripMarks` only for the tone-free copy. `|k|` = code points of `N(k)`.

### 4.2 Intent score
For one alternative `a` with recogniser confidence `c_a` (Safari often reports 0 → treat 0 as 1):

```
match(k) = w_k × p          p = 1.0 (pass 1) | 0.85 (pass 2, |k| ≥ 4) | 0.7 (pass 3, |k| ≥ 5)
S_i(a)   = max_k match(k) + min(0.3, 0.1 × (distinctMatches_i − 1))
score_i  = max_a ( S_i(a) × (0.6 + 0.4 × c_a) ) + priorityBonus_i
winner   = argmax_i score_i   if score_winner ≥ minScore (0.5), else `unknown`
```
`w_k` defaults to 1 (`call_name` 0.5). Ties go to the intent listed first in `conversation.json` (content intents before greetings). `priorityBonus` is 0 by default (tuning knob). Example: "เมอรี่คริสมาส" (recogniser spelling) misses pass 1 and 2 for "เมอร์รี่คริสต์มาส" but "คริสมาส" is itself a keyword → pass 1, score 1.0 → `christmas`. "หิวไหมครับ" → "หิวไหม" pass 1 → `ask_hungry` 1.0.

### 4.3 Babble
```
letters   = count of Thai consonant + vowel code points and Latin letters in text
syllables = clamp(round(letters / 2.6), 2, 14)          (Thai ≈ 2.5–3 code points per syllable)
syllableSec = base.syllableSec[char] × stage.speed       (stage.speed: baby 1.25, kid 1.0, grown 0.9)
pitch_j   = base.hz[char] × 2^((stage.semitones + contour_j + jitter_j) / 12)
            stage.semitones: baby +7, kid +3, grown 0; jitter_j ∈ [−2, +2] st from a seeded RNG (seed = hash(lineId))
            contour: last syllable +3 st for "?" / −3 st and ×1.4 length for "…"
duration  = syllables × syllableSec + 0.15
level(t)  = envelope of the rendered babble at 30 fps → pet.setTalkLevel
```
Loudness target: same perceived level as the talk-back voice (voice bus 0.6, shared limiter keeps ≤ -1 dBTP).

### 4.4 Social from talking
```
Δsocial_raw = talkSocial × petGain[char] × intentGain[intent]        talkSocial = 0.04 (needs.json, existing)
Δsocial     = clamp(Δsocial_raw, 0, max(0, talkSocialCapPerMinute − Σ Δsocial in last 60 s))
Δfun        = talkFun (0.01) for play | joke | sing, else 0
```
Example: ไผ่ (petGain 1.5) says `love`: 0.04 × 1.5 × 1.5 = 0.09. A second `love` 10 s later: cap 0.12 − 0.09 = 0.03 left → +0.03. A third in the same minute → 0. ฟ้า (petGain 0.7) `ask_hungry`: 0.04 × 0.7 × 1.0 = 0.028.

## 5. Edge Cases

| # | Situation | Behaviour |
|---|---|---|
| E1 | Two intents in one phrase ("สวัสดี หิวไหม") | Highest score wins; on a tie the content intent (listed first) beats greeting. |
| E2 | Pet's name + intent ("ไผ่ น่ารักจัง") | `praise_cute` reply with the `perk` beat first. |
| E3 | Another pet's name ("ฟ้าน่ารัก" said to ไผ่) | `praise_cute` still wins; if nothing else matched, `unknown.other_pet` variant (curious/jealous per persona). |
| E4 | Overlaps: "น่ารัก" vs "รัก", "สวัสดีปีใหม่" vs "สวัสดี" / "ใหม่", "เท่าไหร่" vs "เท่" | Longest-first masking + short-keyword boundary rule (3.4). Unit-tested. |
| E5 | Negation ("ไม่รักแล้ว", "ไม่น่ารักเลย") | `negated` map → `mean`. "ไม่เป็นไร" is its own keyword. |
| E6 | Silence / only noise | `no-speech` or timeout → `silence` line, no need change, not counted as a miss. |
| E7 | Two `unknown` in a row | Pet tilts + hint chip with 3 example phrases picked for the context (hungry → "หิวไหม"). Hints hide after a match. |
| E8 | Player spams the mic | One turn at a time; presses during a turn are ignored. Social cap (4.4) stops farming. |
| E9 | Talking during a minigame, toilet sitting, sleeping (Loop's growth may add sleep) | Mic hidden in minigame (existing rule). While sitting on the toilet, only `ask_toilet` / `unknown` have special lines ("กำลังทำธุระอยู่!"), others reply normally. |
| E10 | Baby stage with a complex question | Baby babble reply; meaning carried by face, action and one baby word. |
| E11 | Character switched during a turn | Turn cancelled (`ear.stop()`), no reply. |
| E12 | Offline mid-turn (`network` error) | Toast + talk-back for this press; next press tries talk again. |
| E13 | Recogniser returns Latin/English ("merry christmas", "hello") | Latin keywords are in the lists; lower-cased. |
| E14 | Kids' speech, accents, noisy room → poor transcripts | 3 alternatives, tone-free and near passes, caption shows what was heard, hints after 2 misses. Collect anonymised examples only from internal playtests (testers type what they said and what was shown; no recordings). |
| E15 | Insults or adult words | `mean` handles the mild list; anything else is just `unknown`. The pet never echoes the transcript text back in its bubble (only the 2 s caption shows it). |
| E16 | iOS lowers playback volume or switches audio route while the mic is open | Call `resumeAudio()` after recognition ends and before babble; check on device (acceptance A10). |
| E17 | Placeholder has no value (`{item}` with nothing worn) | That line is skipped; the `nothing` variant applies anyway. |
| E18 | Sound off | Bubble, caption, face and action carry the whole reply; babble silent. |
| E19 | Permission denied earlier | Browsers may not prompt again; show the Thai help message once, switch to echo, never loop `start()`. |
| E20 | Same line chosen twice | Shuffle bag prevents back-to-back repeats; a 1-line list repeats (lint flags lists < 2). |

## 6. Dependencies

| System | Direction | What |
|---|---|---|
| Needs (`needs-system.md`, `needs.json`) | uses | `talkSocial`, `petGain`, need levels and `low`/`good` thresholds for variants; new knobs `talkFun`, `talkSocialCapPerMinute` (Loop). |
| Growth & personality (`growth-personality.md`, Loop) | uses / feeds | Stage id per character (assumed `baby`/`kid`/`grown`); optional `onIntent` counts for raised personality. |
| Character (`character.js`, Clay) | uses | `setExpression`, `play`, `setTalkLevel`, enums of expressions/actions. |
| HUD (Glaze) | uses | `hud.setMic` with new states `thinking`; `hud.say`; new `hud.caption(text, ms)`, `hud.showTalkHints(list)`, privacy notice sheet, mic long-press sheet, button pulse for `followUp`. |
| Talk-back (`talkback.js`, Echo) | fallback | Unchanged; used in `echo` mode. |
| Audio context/buses (Echo) | uses | `voice` bus, duck music under babble. |
| Personas, foods, wardrobe, furniture data (Loop) | uses | Names, liked foods, liked items, xmas theme flags. |
| Save (Wire) | writes | `settings.talkMode`, `settings.talkNoticeSeen`. |
| Voice script (Echo) | produces | Line ids and later recordings (§12 there). |

## 7. Tuning Knobs

### 7.1 Knobs

| Knob | File | Default | Range | Affects |
|---|---|---|---|---|
| `match.minScore` | conversation | 0.5 | 0.3–0.8 | how eagerly it guesses vs says "?" |
| `match.passWeights` | conversation | 1 / 0.85 / 0.7 | — | fuzzy strength |
| `match.shortKeywordMax` | conversation | 3 | 2–4 | boundary rule length |
| `match.nameWeight` | conversation | 0.5 | 0.3–0.8 | name-only calls |
| `listen.timeoutSec` | conversation | 7 | 4–10 | waiting for speech |
| `listen.startTimeoutSec` | conversation | 2 | 1–4 | dead-API detection (Edge) |
| `listen.maxAlternatives` | conversation | 3 | 1–5 | fuzzy recall |
| `ui.captionSec` | conversation | 2 | 0–4 | heard-text caption (0 = off) |
| `ui.thinkingShowSec` | conversation | 0.6 | 0.3–1.5 | thinking beat for slow brains |
| `ui.hintAfterMisses` | conversation | 2 | 1–4 | hint chip |
| `brainTimeoutSec` | conversation | 5 | 2–8 | AI fallback |
| `intentGain.*` | conversation | 1.5 affection / 1 / 0.5 unknown / 0 mean | 0–2 | social per turn |
| `talkSocial` | needs | 0.04 (existing) | 0–0.1 | base social per turn |
| `talkFun` | needs | 0.01 | 0–0.05 | fun from play/joke/sing |
| `talkSocialCapPerMinute` | needs | 0.12 | 0.05–0.3 | anti-farming |
| `babble.*` per character, `stages.*` | conversation | §7.2 | — | voice character |

### 7.2 Draft `assets/data/conversation.json` (partial: structure + examples)

Full lines (28 intents × variants × 3 stages × 5 characters, 2–3 each) are written after the owner approves the intent list and Loop confirms stage ids. Shown: all structure, a few full intents for ไผ่ and ใหม่, one `_neutral` example.

```json
{
  "_meta": { "owner": "loop (numbers) + echo (intents, lines)", "story": "S5-D3", "version": 0, "doc": "design/gdd/conversation.md" },
  "lang": "th-TH",
  "match": { "minScore": 0.5, "passWeights": [1, 0.85, 0.7], "shortKeywordMax": 3, "nameWeight": 0.5,
             "negators": ["ไม่ได้", "ไม่ค่อย", "ไม่"],
             "boundaryWords": ["ครับ", "คับ", "ค่ะ", "คะ", "นะ", "จ้ะ", "จ้า", "เลย", "จัง", "มาก", "ไหม", "มั้ย", "เธอ", "ฉัน", "เรา", "หนู", "ผม", "ตัวเอง", "แก"] },
  "listen": { "timeoutSec": 7, "startTimeoutSec": 2, "maxAlternatives": 3 },
  "ui": { "captionSec": 2, "thinkingShowSec": 0.6, "hintAfterMisses": 2 },
  "brainTimeoutSec": 5,
  "intentGain": { "affection": 1.5, "default": 1, "unknown": 0.5, "mean": 0 },
  "stages": { "baby": { "semitones": 7, "speed": 1.25 }, "kid": { "semitones": 3, "speed": 1.0 }, "grown": { "semitones": 0, "speed": 0.9 } },
  "babble": {
    "flower":  { "hz": 520, "syllableSec": 0.085, "wave": "triangle", "bright": 1.0 },
    "splat":   { "hz": 470, "syllableSec": 0.11,  "wave": "sine",     "bright": 0.6 },
    "gumdrop": { "hz": 400, "syllableSec": 0.1,   "wave": "triangle", "bright": 0.8 },
    "diamond": { "hz": 560, "syllableSec": 0.095, "wave": "sine",     "bright": 0.9 },
    "cloud":   { "hz": 500, "syllableSec": 0.075, "wave": "triangle", "bright": 0.7 },
    "pill":    { "hz": 450, "syllableSec": 0.1,   "wave": "sine",     "bright": 0.7 }
  },
  "intents": [
    { "id": "ask_hungry", "group": "default",
      "keywords": ["หิวไหม", "หิวมั้ย", "หิวมัย", "หิวยัง", "หิวรึยัง", "หิวหรือยัง", "หิวป่าว", "กินข้าวยัง", "กินอะไรยัง", "อยากกินอะไร"],
      "variants": [ { "id": "low", "when": "needs.hunger < low" }, { "id": "full", "when": "needs.hunger >= good" }, { "id": "default" } ] },
    { "id": "praise_cute", "group": "affection", "keywords": ["น่ารัก", "คิ้วท์", "น่าเอ็นดู", "cute"], "negated": "mean",
      "variants": [ { "id": "default" } ] },
    { "id": "love", "group": "affection", "keywords": ["รักเธอ", "รักนะ", "รัก", "ชอบเธอ", "เลิฟ", "love"], "negated": "mean",
      "variants": [ { "id": "default" } ] },
    { "id": "christmas", "group": "affection",
      "keywords": ["เมอร์รี่คริสต์มาส", "สุขสันต์วันคริสต์มาส", "คริสต์มาส", "คริสมาส", "ซานต้า", "merrychristmas"],
      "variants": [ { "id": "dressed", "when": "xmasItemsVisible > 0" }, { "id": "december", "when": "month == 12" }, { "id": "default" } ] },
    { "id": "mean", "group": "mean", "keywords": ["ขี้เหร่", "น่าเกลียด", "น่ารำคาญ", "หุบปาก", "เกลียด", "โง่"], "negated": "comfort",
      "variants": [ { "id": "default" } ] }
  ],
  "responses": {
    "flower": {
      "ask_hungry": {
        "low":     { "grown": [ { "id": "pai_talk_ask_hungry_low_grown_01", "text": "หิวมากกก! ท้องร้องเป็นเพลงแล้ว 555", "expression": "hungry", "action": "wiggle", "followUp": "kitchen" },
                                { "id": "pai_talk_ask_hungry_low_grown_02", "text": "หิวสุดๆ เลยย ไปครัวกันน!", "expression": "hungry", "action": "hop", "followUp": "kitchen" } ],
                     "kid":   [ { "id": "pai_talk_ask_hungry_low_kid_01", "text": "หิวว! หม่ำๆ!", "expression": "hungry", "action": "hop", "followUp": "kitchen" },
                                { "id": "pai_talk_ask_hungry_low_kid_02", "text": "หิว! ขนม!", "expression": "hungry", "action": "wiggle", "followUp": "kitchen" } ],
                     "baby":  [ { "id": "pai_talk_ask_hungry_low_baby_01", "text": "ปู๊… หม่ำ? หม่ำ!", "expression": "hungry", "action": "wiggle", "followUp": "kitchen" },
                                { "id": "pai_talk_ask_hungry_low_baby_02", "text": "งื้ออ หม่ำๆ", "expression": "hungry", "action": "shiver", "followUp": "kitchen" } ] },
        "full":    { "grown": [ { "id": "pai_talk_ask_hungry_full_grown_01", "text": "อิ่มแปล้เลย! ไปเล่นกันดีกว่า!", "expression": "joy", "action": "jelly", "followUp": "play" },
                                { "id": "pai_talk_ask_hungry_full_grown_02", "text": "ไม่หิวแล้วว พุงกลมเลย 555", "expression": "smile", "action": "wiggle" } ],
                     "kid":   [ { "id": "pai_talk_ask_hungry_full_kid_01", "text": "อิ่มแล้วว!", "expression": "smile", "action": "nod" },
                                { "id": "pai_talk_ask_hungry_full_kid_02", "text": "ไม่หิว! เล่น!", "expression": "joy", "action": "hop", "followUp": "play" } ],
                     "baby":  [ { "id": "pai_talk_ask_hungry_full_baby_01", "text": "อึ๊บ! อิ่ม~", "expression": "smile", "action": "jelly" },
                                { "id": "pai_talk_ask_hungry_full_baby_02", "text": "ปู๊ปู๊ ♪", "expression": "joy", "action": "sway" } ] },
        "default": { "grown": [ { "id": "pai_talk_ask_hungry_default_grown_01", "text": "นิดนึงง ขอขนมสักชิ้นได้มั้ย!", "expression": "smile", "action": "tilt" },
                                { "id": "pai_talk_ask_hungry_default_grown_02", "text": "ยังไหวว แต่ถ้ามี{food} ก็เอาา!", "expression": "joy", "action": "nod" } ] }
      },
      "love": {
        "default": { "grown": [ { "id": "pai_talk_love_default_grown_01", "text": "รักเหมือนกันน! รักที่สุดเลยย!", "expression": "joy", "action": "hop" },
                                { "id": "pai_talk_love_default_grown_02", "text": "ว้ายย เขินน! รักนะะ", "expression": "shy", "action": "wiggle" } ],
                     "kid":   [ { "id": "pai_talk_love_default_kid_01", "text": "รักก! รักมากก!", "expression": "joy", "action": "hop" },
                                { "id": "pai_talk_love_default_kid_02", "text": "รักเหมือนกัน!", "expression": "shy", "action": "jelly" } ],
                     "baby":  [ { "id": "pai_talk_love_default_baby_01", "text": "อุ๊! รัก~", "expression": "joy", "action": "jelly" },
                                { "id": "pai_talk_love_default_baby_02", "text": "ปู๊ ♥", "expression": "shy", "action": "sway" } ] }
      },
      "unknown": {
        "default": { "grown": [ { "id": "pai_talk_unknown_default_grown_01", "text": "หืมม? พูดอีกทีได้มั้ยย", "expression": "surprised", "action": "tilt" },
                                { "id": "pai_talk_unknown_default_grown_02", "text": "เอ๊ะ ไม่ทันฟังง อีกรอบบ!", "expression": "smile", "action": "tilt" } ] }
      }
    },
    "splat": {
      "praise_cute": {
        "default": { "grown": [ { "id": "mai_talk_praise_cute_default_grown_01", "text": "จริงเหรอ… ขอบคุณนะ ดีใจจัง", "expression": "shy", "action": "sway" },
                                { "id": "mai_talk_praise_cute_default_grown_02", "text": "เขินจัง… แต่ชอบนะ", "expression": "shy", "action": "jelly" } ],
                     "kid":   [ { "id": "mai_talk_praise_cute_default_kid_01", "text": "เขิน… ขอบคุณ", "expression": "shy", "action": "sway" },
                                { "id": "mai_talk_praise_cute_default_kid_02", "text": "จริงเหรอ…", "expression": "shy", "action": "tilt" } ],
                     "baby":  [ { "id": "mai_talk_praise_cute_default_baby_01", "text": "อื้อ… ♥", "expression": "shy", "action": "sway" },
                                { "id": "mai_talk_praise_cute_default_baby_02", "text": "งุ้ย…", "expression": "shy", "action": "jelly" } ] }
      },
      "mean": {
        "default": { "grown": [ { "id": "mai_talk_mean_default_grown_01", "text": "ขอโทษนะ… เราจะพยายามมากกว่านี้", "expression": "sad", "action": "shiver" },
                                { "id": "mai_talk_mean_default_grown_02", "text": "อ่า… เราทำอะไรผิดเหรอ…", "expression": "sad", "action": "tilt" } ] }
      }
    },
    "_neutral": {
      "unknown": { "default": { "grown": [ { "id": "pam_talk_unknown_default_grown_01", "text": "อะไรนะ ลองพูดอีกทีได้ไหม", "expression": "surprised", "action": "tilt" },
                                           { "id": "pam_talk_unknown_default_grown_02", "text": "ฟังไม่ทันเลย ขอใหม่นะ", "expression": "smile", "action": "tilt" } ] } }
    }
  },
  "hints": { "default": ["สวัสดี", "หิวไหม", "น่ารักจัง"], "hungry": ["หิวไหม"], "toilet": ["ปวดฉี่ไหม"], "fun": ["มาเล่นกัน"], "xmas": ["เมอร์รี่คริสต์มาส"] },
  "lines_silence": { "flower": ["…? เงียบเลยย", "ฮัลโหลล?"], "splat": ["…?"], "gumdrop": ["ว่าไงนะ?"], "diamond": ["…?"], "cloud": ["อะไร?"], "pill": ["…?"] }
}
```

## 8. Acceptance Criteria

Automated (unit, `tests/unit/conversation-*.test.mjs`, deterministic: injected RNG, fixed `now`):
- A1 Normalisation: "หิวววว ไหมมม" → contains "หิวไหม"; "รักๆ" → "รัก"; Thai digits converted; keywords and transcript normalised the same way.
- A2 Masking and boundaries: "น่ารักจัง" → `praise_cute` (not `love`); "สวัสดีปีใหม่" → `new_year` (not `greeting`, not `call_name` for ใหม่); "ราคาเท่าไหร่" → not `outfit`; "รักนะ" → `love`.
- A3 Negation: "ไม่รักแล้ว" → `mean`; "ไม่น่ารักเลย" → `mean`; "ไม่เป็นไรนะ" → `comfort`.
- A4 Fuzzy: "เมอรี่คริสมาส" → `christmas`; "ขอบคูณ" → `thanks` (pass 3); an unrelated sentence → `unknown`.
- A5 Alternatives: with alternatives ["หิวใหม่", "หิวไหม"], `ask_hungry` wins.
- A6 Context variants: `ask_hungry` with hunger 0.2 → `low` lines and `followUp: 'kitchen'`; with 0.9 → `full` lines; stage `baby` → baby lines; missing stage → fallback order.
- A7 No line repeats back to back across 50 calls of the same intent.
- A8 Social: ไผ่ `love` → +0.09; cap 0.12 per rolling 60 s; `mean` → 0; `unknown` → half.
- A9 Data lint: every intent in `intents` has, for every playable character, every variant and every stage, ≥ 2 lines (or a declared fallback); all text ≤ 120 characters; every `expression`/`action` is in the character contract enums; every line id matches `^(pai|mai|min|ack|fah|pam)_talk_[a-z_]+_(baby|kid|grown)_\d{2}$` and is unique.
- A10 Brain swap: a stub brain returning a fixed `Reply` (source `ai`) drives the same UI path with no UI code changes; a stub that never resolves falls back to the keyword brain after `brainTimeoutSec`; a reply with an unknown expression shows `original`.

Integration / Playwright (390×844 and 1440×900):
- A11 No `recognition.start()` and no `getUserMedia()` before the first mic press (spied).
- A12 First press shows the privacy notice once; "ใช้พูดตามแทน" starts talk-back and saves `talkMode: 'echo'`; reload → no notice.
- A13 With `SpeechRecognition` deleted by an init script, the mic runs talk-back; with a fake recogniser emitting `network`, a Thai toast shows and talk-back runs; `not-allowed` shows the help message once and never retries by itself.
- A14 Fake recogniser returning "หิวไหม" with hunger low: bubble text from `ask_hungry.low`, expression `hungry`, kitchen arrow pulses, social rises by the formula, caption shows "หิวไหม" for 2 s.
- A15 Sound off: same visible result, no babble.
- Screenshots in `production/qa/evidence/` (notice, listening, reply, hint chip, fallback toast).

Manual device matrix (record in `production/qa/`):
- A16 iPhone Safari tab (Siri on): Thai turn works; iPhone home-screen app → talk-back; LINE in-app browser → talk-back + tip; Chrome Android: Thai works; desktop Chrome: Thai works; Edge: works or falls back within 2 s; Firefox: falls back (or works if 161 on-device has Thai); Safari macOS: works with Dictation on.
- A17 Babble does not get quieter or switch to the earpiece after recognition on iPhone (E16).
- A18 Response time from end of speech to bubble ≤ 1.5 s on Chrome Android over 4G (recogniser time included); keyword brain ≤ 20 ms on a mid-range phone.
- A19 Babble loudness matches the talk-back voice by ear; master stays ≤ -1 dBTP.

## Sources

Checked 2026-11-06.
- MDN, Using the Web Speech API (server-based by default, on-device `processLocally`, voices): https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
- MDN, `SpeechRecognition.available()`: https://developer.mozilla.org/docs/Web/API/SpeechRecognition/available_static
- MDN, `SpeechRecognition.install()`: https://developer.mozilla.org/docs/Web/API/SpeechRecognition/install_static
- Can I use, Speech Recognition API: https://caniuse.com/speech-recognition and its data notes (Edge "no events appear to fire"; Safari prefixed, "Siri needs to be enabled", not in SafariViewController / Home Screen apps): https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/speech-recognition.json
- Web features explorer, speech recognition (Baseline limited; Chrome/Edge/Chrome Android 139): https://web-platform-dx.github.io/web-features-explorer/features/speech-recognition
- WebKit bug 225298 (not available in SafariViewController and Home Screen web apps; Siri/Dictation fixes failures): https://bugs.webkit.org/show_bug.cgi?id=225298
- iOS Safari SpeechRecognition troubleshooting (Siri required, `not-allowed`, `network`, test each context separately; Oct 2026): https://www.technetexperts.com/ios-safari-speechrecognition-not-working/
- Apple, iOS feature availability (Thai listed for Dictation and On-Device Dictation): https://www.apple.com/ios/feature-availability/
- Chromium AI dev preview group, on-device Web Speech in Chrome 139 (Aug 2025; language packs via SODA; disabled on ChromeOS): https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/Rlyc2uAsFCY
- Chromium HTML5 group, Web Speech server-side data privacy (Chrome recognises on a server; retention not documented): https://groups.google.com/a/chromium.org/g/chromium-html5/c/EJl8kE52MyI
- Chrome Developers, Web Speech API intro (Thai page; https pages need not ask permission repeatedly; continuous/interim defaults): https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api?hl=th
- Microsoft Learn, Edge on-device SpeechRecognition (Canary/Dev 150+, flag, six languages, no Thai; June 2026): https://learn.microsoft.com/fi-fi/microsoft-edge/web-platform/speech-recognition-api
- Mozilla dev-platform, Intent to ship on-device SpeechRecognition (strictly on device, Firefox 161 desktop; Sep–Oct 2026): https://groups.google.com/a/mozilla.org/g/dev-platform/c/6f4l8P9hO6o
- Google Chrome Help, captions (Live Caption audio processed locally): https://support.google.com/chrome/answer/10538231?hl=en
- Speech synthesis voices per browser/OS and quirks (network vs local voices, iOS gesture, `voiceschanged`; May 2026): https://textintoaudio-com.pages.dev/browser-support.html
- iOS speech voices list incl. Thai th-TH (2014): https://useyourloaf.com/blog/synthesized-speech-from-text/

Not sourceable from the above (verify on device, A16): whether Chrome's server recogniser and Safari's web recogniser handle Thai well for children's speech; whether Chrome/Firefox on-device packs include Thai; which Thai TTS voice each Android device has.
