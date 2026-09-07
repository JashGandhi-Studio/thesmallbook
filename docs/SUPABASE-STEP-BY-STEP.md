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


---

## SQL #3 — FIX UPLOADS + SEED THE OFFICIAL CHANNEL (run once)
1) Permissive storage policies working on BOTH old and new Supabase schemas
   (casts owner_id/owner to text — works on every schema version). Additive — deletes nothing.
2) Seeds five archive stories under the verified **TheSmallBook ✔** official
   channel (id 11111111-1111-1111-1111-111111111111).

```sql
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'auth write storage v2') then
    begin
      execute 'create policy "auth write storage v2" on storage.objects for insert with check (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and (owner_id::text = auth.uid()::text or owner::text = auth.uid()::text))';
    exception when undefined_column then
      execute 'create policy "auth write storage v2" on storage.objects for insert with check (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and owner::text = auth.uid()::text)';
    end;
  end if;
  if not exists (select 1 from pg_policies where policyname = 'auth update storage v2') then
    begin
      execute 'create policy "auth update storage v2" on storage.objects for update using (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and (owner_id::text = auth.uid()::text or owner::text = auth.uid()::text))';
    exception when undefined_column then
      execute 'create policy "auth update storage v2" on storage.objects for update using (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and owner::text = auth.uid()::text)';
    end;
  end if;
  if not exists (select 1 from pg_policies where policyname = 'auth delete storage v2') then
    begin
      execute 'create policy "auth delete storage v2" on storage.objects for delete using (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and (owner_id::text = auth.uid()::text or owner::text = auth.uid()::text))';
    exception when undefined_column then
      execute 'create policy "auth delete storage v2" on storage.objects for delete using (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and owner::text = auth.uid()::text)';
    end;
  end if;
end $$;

-- SQL #3.5 — bring the posts table up to date (safe & idempotent)
alter table public.posts add column if not exists author_name text not null default 'Reader';
alter table public.posts add column if not exists author_avatar text;
alter table public.posts add column if not exists subtitle text;
alter table public.posts add column if not exists cover_url text;
alter table public.posts add column if not exists audio_url text;
alter table public.posts add column if not exists kind text not null default 'text';
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists created_at timestamptz not null default now();

-- official channel seed (archive stories, verified ✔ in-app)
insert into public.posts (id, author_id, author_name, author_avatar, title, subtitle, body, tags, kind)
values ('90000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'TheSmallBook', '', 'Four Hours That Saved My CA Final', 'From the library archives — now on the official channel.', '<p>Three months before my CA Final attempt, I did the math and wanted to cry: 14 subjects'' worth of revision, a coaching batch, and a phone that ate four hours of my day without asking.</p><p>I wasn''t lazy. I studied 10 hours daily — or so I told everyone. Then I actually tracked it. Of those 10 hours, maybe 3 were real. The rest was study-flavored scrolling: reels between chapters, ''important'' group chats, checking rank predictions of people I''d never met.</p><p>Deep Work gave me a sentence that hurt: ''The ability to concentrate is becoming rarer at exactly the moment it''s becoming more valuable.'' Everyone in my batch had the same books, same classes, same syllabus. Focus was the only exam nobody else was preparing for.</p><p>So I built my own rules. Phone in the hostel locker from 6 AM to 10 AM — physically, in a locker, because willpower is a myth at 6 AM. Four hours, one subject, no music, no breaks longer than five minutes. That''s it. Everything else — coaching, revision, even scrolling — was allowed after.</p><p>The first week was withdrawal. My hand kept reaching for a phone that wasn''t there. By week three, something shifted: costing problems that used to take 40 minutes started falling in 15. I wasn''t smarter. I was just... present.</p><p>Four focused hours turned out to be worth more than ten distracted ones. I cleared both groups in one attempt. My rank? Doesn''t matter. The real prize is that I now know the difference between being busy and being there.</p><p>The locker is still in use. Some habits you don''t retire.</p>', ARRAY['deep-work']::text[], 'text')
on conflict (id) do nothing;
insert into public.posts (id, author_id, author_name, author_avatar, title, subtitle, body, tags, kind)
values ('90000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'TheSmallBook', '', 'The Month My Startup Almost Died', 'From the library archives — now on the official channel.', '<p>In March, we had 11 employees, 6 weeks of runway, and a lead investor who stopped picking up the phone.</p><p>I didn''t sleep more than four hours that whole month. I''d lie down and my brain would play the same film: telling my team, telling my wife, telling my parents who had proudly told the whole building their son is a ''CEO.''</p><p>A friend sent me The Hard Thing About Hard Things with one line: ''This will not fix anything. It will make you feel less alone.'' He was right on both counts.</p><p>Ben Horowitz''s whole point is that there is no formula for the hard things. The struggle — his word for it — is not a sign you''re failing. It IS the job. Every founder you admire has lain awake doing the same 3 AM math.</p><p>Two lines changed my month. First: ''Spend zero time on what you could have done, and all of your time on what you might do.'' I stopped replaying the funding round we botched in January. Second: tell the truth to your people — they can handle bad news better than they can handle being lied to.</p><p>So I did the thing I was most afraid of. I called an all-hands and showed them the actual runway. No spin. I told them who should probably interview elsewhere for family reasons, and what my plan was for everyone who stayed.</p><p>Nobody quit that week. Two people found cost cuts I''d never have seen. One quietly intro''d me to her ex-boss — who became our bridge investor.</p><p>We survived. Barely, ugly, with scars. Eleven months later we''re 19 people and profitable. Not a success story yet. Just alive — which, I''ve learned, is the only prerequisite for one.</p>', ARRAY['hard-things']::text[], 'text')
on conflict (id) do nothing;
insert into public.posts (id, author_id, author_name, author_avatar, title, subtitle, body, tags, kind)
values ('90000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'TheSmallBook', '', 'I Finally Talked to My Father', 'From the library archives — now on the official channel.', '<p>My father and I hadn''t really spoken in four years. We exchanged information — ''beta, insurance renew kara lena'' — but not words. Every real conversation ended the same way: him saying I''d wasted my potential, me saying he never listened, doors closing.</p><p>I found Nonviolent Communication looking for office advice, honestly. I wanted to handle a difficult colleague. I did not expect a book to hand me back my family.</p><p>Rosenberg''s idea sounds too simple to work: behind every criticism is an unmet need trying to speak. When my father said ''you''ve wasted your potential,'' I always heard an attack. NVC taught me to hear it again: an old man, scared for his son, whose only vocabulary for fear is criticism. ''You''ve wasted your potential'' was his broken way of saying ''I need to know you''ll be okay.''</p><p>Diwali came. Same living room, same silence. He said something about my job, the usual opening move of our usual war. And instead of defending, I tried the formula — feeling, then need: ''Papa, when you say that, I feel like I''ve disappointed you. And I really need you to trust that I''ve thought about my life. Are you... are you worried about me?''</p><p>My father looked at me like I''d spoken French. Then he said, quietly, ''Of course I''m worried. You never tell me anything.''</p><p>That was it. That was the whole wall — four years of it — and it came down with one honest sentence from each side.</p><p>We talk every Sunday now. He still doesn''t fully understand what I do. But last month he told my uncle, ''He''s doing well. He explained the whole business to me.'' I heard the pride from the next room.</p><p>Some books improve your career. One or two give you back people.</p>', ARRAY['nonviolent-communication']::text[], 'text')
on conflict (id) do nothing;
insert into public.posts (id, author_id, author_name, author_avatar, title, subtitle, body, tags, kind)
values ('90000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'TheSmallBook', '', '₹500 a Month Felt Like a Joke. It Wasn''t.', 'From the library archives — now on the official channel.', '<p>I started my first SIP at 23 with ₹500 a month, mostly to stop a persistent bank relationship manager from calling me. It felt like a joke. What is ₹500? One pizza night.</p><p>Then I read The Psychology of Money and one idea rewired me: nobody''s crazy — everyone''s money decisions make sense to them based on what they''ve seen. My parents kept everything in FDs because they''d watched their neighbors lose money in the ''92 scam. I was about to repeat their fear with extra steps.</p><p>Housel''s real lesson isn''t about returns. It''s that wealth is what you DON''T see — the cars not bought, the upgrades not taken. And that time, not timing, does the heavy lifting. His line about Warren Buffett stuck with me: the majority of Buffett''s fortune came after his 65th birthday. The skill isn''t picking stocks. It''s not interrupting compounding.</p><p>So I made one promise: the SIP increases every appraisal, and I never pause it. Not for the wedding season, not for the iPhone, not for the market ''looking high'' (it always looks high or scary — I''ve now seen both, several times).</p><p>₹500 became ₹2,000, then ₹8,000, then more. Six years in, the folio crossed a number I used to think required either inheritance or crime. My colleagues with double my salary ask me how. They expect a stock tip. The answer is so boring they refuse to believe it: I just never stopped.</p><p>The best investment advice I ever got fit in one line I''d have scrolled past at 23: be reasonably greedy, be permanently patient, and let boring do its magic.</p>', ARRAY['psychology-of-money']::text[], 'text')
on conflict (id) do nothing;
insert into public.posts (id, author_id, author_name, author_avatar, title, subtitle, body, tags, kind)
values ('90000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'TheSmallBook', '', 'The 5 AM I Actually Kept', 'From the library archives — now on the official channel.', '<p>I have joined the 5 AM club six times in my life. The memberships lasted: 4 days, 2 days, 9 days, 1 day, 6 days, and — this current one — two years and counting.</p><p>The difference wasn''t discipline. It was that the first five times, I woke up at 5 AM to do MORE work. Same laptop, same emails, just darker outside. My brain correctly identified this as a scam and cancelled the subscription within a week.</p><p>The book''s actual formula — which I''d skimmed past in my hurry — is the 20/20/20: move for 20 minutes, reflect for 20, learn for 20. Not one minute of it is ''work.'' That hour belongs to you, not your inbox.</p><p>So attempt number six looked different. 5:00-5:20: skipping rope on the terrace, badly. 5:20-5:40: journaling — mostly complaints at first, then gradually, actual thoughts. 5:40-6:00: reading (this site, most mornings — one lesson with chai is exactly 20 minutes).</p><p>Here''s what nobody tells you: the hour itself is nice, but the real product is who you are at 9 AM. I arrive at work having already won three small battles. Meetings that used to rattle me just... don''t. My boss once asked if I''d started meditating. Sort of, I said. I''d started owning one hour.</p><p>Two years now. I''ve missed mornings — travel, weddings, one memorable food poisoning. The difference is I stopped treating a missed morning as a cancelled membership. It''s just a missed morning. The club takes you back.</p><p>Victory hour is a grand name for skipping rope and chai. But I understand now why Sharma calls it that. The war for your day is won before anyone else is awake to fight you for it.</p>', ARRAY['5am-club']::text[], 'text')
on conflict (id) do nothing;
```
After running: the Stories feed shows five ✔ TheSmallBook posts and
cover/voice/avatar uploads stop failing.


---

## SQL #4 — MESSAGES (DMs) + PROGRESS (run once)
Adds: direct messages between readers, a public reading-progress column,
and the matching policies. Additive and idempotent — no drops.

```sql
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  receiver_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

alter table public.profiles add column if not exists progress int not null default 0;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'read own dms') then
    execute 'create policy "read own dms" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id)';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'send dms') then
    execute 'create policy "send dms" on public.messages for insert with check (auth.uid() = sender_id)';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'delete own dms') then
    execute 'create policy "delete own dms" on public.messages for delete using (auth.uid() = sender_id)';
  end if;
end $$;
```


---

## SQL #5 — PUBLIC ACCOUNTS (run once)
Adds the `is_public` flag used by the 👥 People tab and the
"Public account" switch in the You section. Additive, idempotent.

```sql
alter table public.profiles add column if not exists is_public boolean not null default true;
```


---

## SQL #6 — DM SUPERPOWERS (run once)
Adds: delete-for-me (hide), clear chat, edited marker, and book
recommendations in messages. Additive, idempotent, no drops.

```sql
alter table public.messages add column if not exists hidden_for uuid[] not null default '{}';
alter table public.messages add column if not exists book_id text;
alter table public.messages add column if not exists edited_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'manage own dms') then
    execute 'create policy "manage own dms" on public.messages for update using (auth.uid() = sender_id or auth.uid() = receiver_id) with check (auth.uid() = sender_id or auth.uid() = receiver_id)';
  end if;
end $$;
```

---

## SQL #7 — v205: push-nudge library + daily scheduler (run once, re-runnable)

What it does: creates a small `push_nudges` table (the "Stuck on something? Read this
chapter…" messages), seeds it with 12 nudges, and schedules a **daily 6:30 pm IST**
job that calls your `push-notify` Edge Function, which broadcasts one nudge to every
subscribed phone — **even with the app closed**.

⚠️ About the dashboard's red "destructive operations" warning: it fires on ANY script
that touches table/extension definitions. This script is **additive only** — it creates
two extensions and one new table, seeds rows only if the table is empty, and (re)creates
one cron job. **Nothing is deleted, no existing table is altered, no data is touched.**
If a run fails halfway, just fix and re-run — no cleanup needed.

Before running: replace `https://YOUR-PROJECT.supabase.co` with your project URL (same
one that's in js/config.js), and `tsb-cron-2026` with the same CRON_SECRET you set in
the Edge Function's secrets (or leave both as-is if you kept the default).

```sql
-- ===== SQL #7 (v205) — additive only, re-runnable =====
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.push_nudges (
  id         bigint primary key generated always as identity,
  heading    text not null,
  body       text not null,
  url        text not null default 'stories.html',
  created_at timestamptz not null default now()
);
alter table public.push_nudges enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'read nudges' and tablename = 'push_nudges') then
    create policy "read nudges" on public.push_nudges for select using (true);
  end if;
end $$;

insert into public.push_nudges (heading, body, url)
select h, b, u from (values
  ('Stuck on something? 📚', 'Atomic Habits · The 2-Minute Rule — shrink the habit till starting is easy.', 'book.html?id=atomic-habits'),
  ('Procrastinating? ⏳', 'Eat That Frog · Do the worst task first, 2 minutes in.', 'book.html?id=eat-that-frog'),
  ('Money feeling tight? 💸', 'Psychology of Money · Room for error is the quiet superpower.', 'book.html?id=psychology-of-money'),
  ('Can''t focus? 🎯', 'Deep Work · Rule 1: work like a pro, schedule every hour.', 'book.html?id=deep-work'),
  ('Feeling behind in life? 🌱', 'The Subtle Art · Choose better problems, not fewer.', 'book.html?id=subtle-art'),
  ('Overthinking a decision? 🤔', 'Sapiens · We study history not to predict the future, but to widen our choices.', 'book.html?id=sapiens'),
  ('Tired of saying yes? 🙅', 'Essentialism · If it isn''t a clear yes, it''s a no.', 'book.html?id=essentialism'),
  ('Argument brewing? 🗣', 'How to Win Friends · Begin friendly, let them say yes yes yes.', 'book.html?id=how-to-win-friends'),
  ('Sleep messed up? 😴', 'Why We Sleep · Keep the same wake time seven days a week.', 'book.html?id=why-we-sleep'),
  ('Need a reset? 🧘', 'The Power of Now · Watch one breath, fully.', 'book.html?id=power-of-now'),
  ('Big goal, no plan? 🗺', '12 Rules · Rule 1: stand up straight — then set one tiny rule for today.', 'book.html?id=12-rules'),
  ('Sunday scaries? ☕', 'Four Thousand Weeks · Pick three things for today. Only three.', 'book.html?id=four-thousand-weeks')
) as v(h, b, u)
where not exists (select 1 from public.push_nudges);

do $$ begin
  perform cron.unschedule('tsb-daily-nudge');
exception when others then null;
end $$;
select cron.schedule(
  'tsb-daily-nudge',
  '30 13 * * *',  -- 13:30 UTC = 6:30 pm IST, daily
  $cron$
    select net.http_post(
      url: 'https://YOUR-PROJECT.supabase.co/functions/v1/push-notify',
      body: '{"type":"nudge"}',
      headers: jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'tsb-cron-2026')
    );
  $cron$
);
```

---

## SQL #8 — v207: interest-aware pushes (run once, re-runnable)

Adds an `interests` list to profiles (the app fills it from what each reader actually
reads — book categories, story tags, onboarding shelves) and tags each push nudge with
keywords, so the daily push picks a chapter **matching that reader's taste** instead of
a random one.

⚠️ Same note as before: the red "destructive operations" banner appears for ANY script
with ALTER statements. This one is **additive only** — two new columns with safe
defaults, plus UPDATEs that only fill the new tag column. No data is deleted or
rewritten. Failed run? Just re-run.

```sql
-- ===== SQL #8 (v207) — additive only, re-runnable =====
alter table public.profiles
  add column if not exists interests text[] not null default '{}';

alter table public.push_nudges
  add column if not exists tag text not null default '';

update public.push_nudges set tag = v.tag
from (values
  (1, 'habits,self-improvement,discipline'),
  (2, 'productivity,self-improvement,focus'),
  (3, 'money,finance,business'),
  (4, 'focus,work,self-improvement'),
  (5, 'mindset,philosophy,self-improvement'),
  (6, 'history,curiosity,science'),
  (7, 'minimalism,focus,self-improvement'),
  (8, 'people,communication,business'),
  (9, 'sleep,health,science'),
  (10, 'mindfulness,philosophy,presence'),
  (11, 'discipline,mindset,self-improvement'),
  (12, 'time,philosophy,productivity')
) as v(idx, tag)
where push_nudges.id = v.idx and push_nudges.tag = '';
```

How matching works: the app silently keeps each reader's top interests (never uploaded
raw — only the top-4 category words, and only while signed in). At push time the Edge
Function compares them with nudge tags and sends each person the chapter that fits
their reading. Readers with no signals yet get a random nudge, same as before.

---

## SQL #9 — profile links (website chips on profiles)  *(additive, re-runnable)*

Adds a `links` column to `profiles` so readers can show websites under their bio.
Runs with a destructive-warning banner (any ALTER TABLE triggers it) — this statement is
**additive-only**: it adds one column and never touches existing rows. Safe to re-run.

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS links text[] DEFAULT '{}';
```
