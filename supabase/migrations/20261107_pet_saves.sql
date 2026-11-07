-- Moldable Pet cloud saves: one row per signed-in player (Google sign-in via Supabase Auth).
create table if not exists public.pet_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  save jsonb not null,
  saved_at bigint not null default 0,          -- the game's save.savedAt (ms), used for newest-wins
  updated_at timestamptz not null default now()
);
alter table public.pet_saves enable row level security;
create policy "own save: read"   on public.pet_saves for select using ((select auth.uid()) = user_id);
create policy "own save: insert" on public.pet_saves for insert with check ((select auth.uid()) = user_id);
create policy "own save: update" on public.pet_saves for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own save: delete" on public.pet_saves for delete using ((select auth.uid()) = user_id);
