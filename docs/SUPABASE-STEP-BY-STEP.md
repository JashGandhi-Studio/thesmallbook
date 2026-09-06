# 🧭 Supabase — ONE-SCRIPT SETUP (current dashboard, 2026)
Project: `wdmxcewmyofihgrheuas.supabase.co` (keys already in js/config.js ✅).

**Delete every old query tab → SQL Editor → New query → paste the MASTER
SCRIPT below → Run.** Expect `Success` + one row:
`tables_ok 5 · policies_ok 17 · buckets_ok 3`.
Re-running is always safe (creates only what's missing; no DROPs → no
destructive-operation warnings).

Then verify: **Table Editor** → posts, comments, likes, follows, profiles
(RLS on) · **Storage** → tsb-covers, tsb-audio, tsb-avatars (public badge).
Deploy v188 (ZIP contents, not the zip) → `thesmallbook.in/sw.js` = tsb-v188
→ sign in → Stories → publish.

## MASTER SCRIPT (v188)

```sql
-- 1) TABLES
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  author_name text not null,
  author_avatar text,
  title text not null,
  subtitle text,
  cover_url text,
  body text not null,
  tags text[] default '{}',
  audio_url text,
  kind text default 'text',
  created_at timestamptz default now()
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  author_id uuid not null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);
create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create table if not exists public.follows (
  follower_id uuid not null,
  author_id uuid not null,
  created_at timestamptz default now(),
  primary key (follower_id, author_id)
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Reader',
  avatar_url text,
  bio text default '',
  updated_at timestamptz default now()
);

-- 2) RLS ON
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.profiles enable row level security;

-- 3) BUCKETS (new Supabase needs the name column)
insert into storage.buckets (id, name, public) values ('tsb-covers', 'tsb-covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tsb-audio', 'tsb-audio', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tsb-avatars', 'tsb-avatars', true) on conflict (id) do nothing;

-- 4) POLICIES (created only if missing — no warnings, no duplicates)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'read all') then
    create policy "read all" on public.posts for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'write own') then
    create policy "write own" on public.posts for insert with check (auth.uid() = author_id); end if;
  if not exists (select 1 from pg_policies where policyname = 'read all c') then
    create policy "read all c" on public.comments for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'write own c') then
    create policy "write own c" on public.comments for insert with check (auth.uid() = author_id); end if;
  if not exists (select 1 from pg_policies where policyname = 'read all l') then
    create policy "read all l" on public.likes for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'write own l') then
    create policy "write own l" on public.likes for insert with check (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where policyname = 'del own l') then
    create policy "del own l" on public.likes for delete using (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where policyname = 'read all f') then
    create policy "read all f" on public.follows for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'write own f') then
    create policy "write own f" on public.follows for insert with check (auth.uid() = follower_id); end if;
  if not exists (select 1 from pg_policies where policyname = 'del own f') then
    create policy "del own f" on public.follows for delete using (auth.uid() = follower_id); end if;
  if not exists (select 1 from pg_policies where policyname = 'read all p') then
    create policy "read all p" on public.profiles for select using (true); end if;
  if not exists (select 1 from pg_policies where policyname = 'upsert own p') then
    create policy "upsert own p" on public.profiles for insert with check (auth.uid() = id); end if;
  if not exists (select 1 from pg_policies where policyname = 'update own p') then
    create policy "update own p" on public.profiles for update using (auth.uid() = id); end if;
  if not exists (select 1 from pg_policies where policyname = 'public read storage') then
    create policy "public read storage" on storage.objects for select
      using (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars')); end if;
  if not exists (select 1 from pg_policies where policyname = 'auth write storage') then
    create policy "auth write storage" on storage.objects for insert
      with check (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars') and auth.role() = 'authenticated'); end if;
  if not exists (select 1 from pg_policies where policyname = 'auth update own storage') then
    create policy "auth update own storage" on storage.objects for update
      using (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars') and owner = auth.uid()); end if;
  if not exists (select 1 from pg_policies where policyname = 'auth delete own storage') then
    create policy "auth delete own storage" on storage.objects for delete
      using (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars') and owner = auth.uid()); end if;
end $$;

-- 5) SELF-CHECK
select
  (select count(*) from pg_tables where schemaname = 'public'
     and tablename in ('posts','comments','likes','follows','profiles')) as tables_ok,
  (select count(*) from pg_policies where policyname in
     ('read all','write own','read all c','write own c','read all l','write own l','del own l',
      'read all f','write own f','del own f','read all p','upsert own p','update own p',
      'public read storage','auth write storage','auth update own storage','auth delete own storage')) as policies_ok,
  (select count(*) from storage.buckets where id in ('tsb-covers','tsb-audio','tsb-avatars')) as buckets_ok;
```

## Troubleshooting
| Symptom | Fix |
|---|---|
| numbers below 5/17/3 | re-run the same script once more |
| "policy already exists" | impossible with this script — you ran an old one; use this |
| destructive-ops warning | impossible here (no DROPs) |
| feed can't reach cloud | script not run on THIS project (check top-left project name) |
| upload fails | bucket missing/public off → re-run script |
