# Cloud save with Google sign-in (Supabase)

Status 2026-11-07: **code ready, switched off** until `assets/data/cloud.json` has `url` and `anonKey`.
While empty, the game shows no sign-in button and works exactly as before (local save only).

## How it works
- Sign-in: "เข้าสู่ระบบด้วย Google" in the character select sheet (tap the character chip). Supabase Auth, Google provider, PKCE redirect back to the game.
- Data: one row per player in `public.pet_saves` (`user_id`, `save` jsonb, `saved_at`). Row-level security: a player can only read and write their own row (`supabase/migrations/20261107_pet_saves.sql`).
- Sync (owner 2026-11-16: a signed-in player plays the account's save). `syncDecision` in `src/game/cloud-rules.js`:
  - account has no save yet → this device's save is uploaded;
  - this device has no progress (no pet picked) → the account save is used;
  - this device save is already linked to this account (`localStorage['mp-cloud-link']`) → **the account save wins unless nobody else saved since this device last synced** (owner 2026-11-17, several devices). Each device keeps `localStorage['mp-cloud-base']` = the cloud `saved_at` it last downloaded or uploaded; the device clock is never compared, because the game writes its local save on boot before the cloud answers;
  - otherwise (two different histories) → the player picks "ใช้ข้อมูลจากบัญชี Google" or "ใช้ข้อมูลในเครื่องนี้"; the other one is replaced.
  A pulled save replaces the local one and the page reloads once; while it loads, the game does not write its old in-memory save (`cloud.locked`). Nothing is uploaded until the device save is linked, so an unresolved account save is never overwritten.
- Uploads: only saves the player caused (feeding, buying, dressing, room change …) upload, 4 s later and when the page is hidden; the 5 s timer save stays on the device, so two open devices do not overwrite each other. Before each upload the device reads the cloud stamp; if another device saved since, it loads that save instead. The same check runs when the game comes back on screen.
- Test: `tests/visual/s7_cloud_devices.py` (two browser contexts, fake Supabase, real game code).
- Code: `src/game/cloud.js` (network), `src/game/cloud-rules.js` (pure rules, `tests/unit/cloud.test.mjs`). supabase-js loads from jsDelivr only when enabled.

## Owner setup (free plan)
1. **Supabase project** — create a new free project (e.g. `moldable-pet`, region Singapore) or restore a paused one. Free projects pause after ~7 days without traffic; restoring keeps the data.
2. **Table** — run `supabase/migrations/20261107_pet_saves.sql` (SQL editor, or ask Kiln to apply it).
3. **Google OAuth client** — Google Cloud Console › APIs & Services › Credentials › Create OAuth client ID › *Web application*.
   - Authorized JavaScript origin: `https://panupongpromklum.github.io`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - OAuth consent screen: app name "Moldable Pet", support email, publish (External).
4. **Supabase › Authentication › Providers › Google** — enable, paste Client ID + Client Secret.
5. **Supabase › Authentication › URL Configuration** — Site URL `https://panupongpromklum.github.io/moldable-pet/`; add the same URL to Redirect URLs.
6. **Game config** — put the project URL and the publishable (anon) key in `assets/data/cloud.json`, push. (The publishable key is meant to be public; RLS protects the data.)
