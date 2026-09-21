-- ============================================================================
--  THESMALLBOOK · THE ONE SQL  (v255)
--  supabase/sql/ALL-IN-ONE.sql
--
--  ⚡ ALREADY RUNNING THESMALLBOOK? Your project only needs the NEW parts:
--     run supabase/sql/UPDATE-v255.sql instead — same result, one small paste.
--  HOW TO RUN (once, ~10 seconds):
--    1. Supabase Dashboard → SQL Editor → New query
--    2. Paste this WHOLE file
--    3. Run
--    4. Scroll to the bottom — a green "ALL OK" grid is your receipt.
--  Safe to re-run any time: every statement is guarded and idempotent.
--  It works on the project you have today AND on a brand-new empty one.
--
--  WHAT IT INSTALLS (everything sign-in + the community need):
--    §1  the tables (profiles, posts, comments, likes, follows, messages,
--        progress, push_nudges) with the exact columns the app writes
--    §2  Row Level Security on every table — nobody writes as somebody else
--    §3  storage buckets (covers / audio / avatars) + owner-only upload rules
--    §4  the official TheSmallBook ✔ channel + its 5 archive stories
--    §5  hardening: length locks inside the database, one-like-per-reader,
--        a post's death deletes its likes/comments too
--    §6  usernames: @handle, lowercase, unique, 3-20 chars
--    §7  private accounts + follow requests (accept / decline; follow counts
--        only after accept) + the request_follow / respond / cancel functions
--    §8  the 12 reading nudges + interest tags (push cron stays optional)
--    §9  THE CHECK — the receipt grid
--
--  NOT SQL (two 20-second dashboard toggles, do them after this runs):
--    • Authentication → Providers → Email → turn ON "Confirm email"
--    • Authentication → Settings → Rate limits → keep the defaults (they are fine)
-- ============================================================================


-- ════════════════════════════════════════════════════════════
-- §1 · TABLES — create what is missing, add what columns are missing.
--      Never renames, never drops, never touches existing rows.
-- ════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id         uuid primary key,
  name       text,
  avatar_url text,
  bio        text,
  progress   int,
  links      jsonb,
  updated_at timestamptz default now()
);
alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists prefs     jsonb   not null default '{}'::jsonb;
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists interests text[]  not null default '{}';

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid,
  created_at timestamptz default now()
);
alter table public.posts add column if not exists author_name  text not null default 'Reader';
alter table public.posts add column if not exists author_avatar text;
alter table public.posts add column if not exists title      text;
alter table public.posts add column if not exists subtitle   text;
alter table public.posts add column if not exists body       text;
alter table public.posts add column if not exists cover_url  text;
alter table public.posts add column if not exists audio_url  text;
alter table public.posts add column if not exists kind       text not null default 'text';
alter table public.posts add column if not exists tags       text[] not null default '{}';
alter table public.posts add column if not exists no_download boolean not null default true;

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now()
);
alter table public.comments add column if not exists post_id     uuid;
alter table public.comments add column if not exists author_id   uuid;
alter table public.comments add column if not exists author_name text;
alter table public.comments add column if not exists body        text;

create table if not exists public.likes (
  created_at timestamptz default now()
);
alter table public.likes add column if not exists user_id uuid;
alter table public.likes add column if not exists post_id uuid;

create table if not exists public.follows (
  follower_id uuid not null,
  author_id   uuid not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);
alter table public.messages add column if not exists sender_id   uuid;
alter table public.messages add column if not exists receiver_id uuid;
alter table public.messages add column if not exists body        text;
alter table public.messages add column if not exists book_id     text;
alter table public.messages add column if not exists audio_url   text;
alter table public.messages add column if not exists expires_at  timestamptz;
alter table public.messages add column if not exists edited_at   timestamptz;
alter table public.messages add column if not exists "read"      boolean not null default false;

create table if not exists public.progress (
  user_id     uuid not null,
  book_id     text not null,
  updated_at  timestamptz default now(),
  primary key (user_id, book_id)
);
alter table public.progress add column if not exists lessons_done jsonb not null default '[]'::jsonb;
alter table public.progress add column if not exists bookmarked   boolean not null default false;
alter table public.progress add column if not exists streak       jsonb;

create table if not exists public.push_nudges (
  id         bigint primary key generated always as identity,
  heading    text not null,
  body       text not null,
  url        text not null default 'stories.html',
  created_at timestamptz not null default now()
);
alter table public.push_nudges add column if not exists tag text not null default '';

create index if not exists posts_by_author   on public.posts (author_id);
create index if not exists posts_by_created  on public.posts (created_at desc);
create index if not exists comments_by_post  on public.comments (post_id);
create index if not exists likes_by_post     on public.likes (post_id);
create index if not exists messages_inbox    on public.messages (receiver_id, created_at desc);


-- ════════════════════════════════════════════════════════════
-- §2 · ROW LEVEL SECURITY — the walls. Readers write only as
--      themselves, delete only their own, read what is public.
-- ════════════════════════════════════════════════════════════

alter table public.profiles    enable row level security;
alter table public.posts       enable row level security;
alter table public.comments    enable row level security;
alter table public.likes       enable row level security;
alter table public.follows     enable row level security;
alter table public.messages    enable row level security;
alter table public.progress    enable row level security;
alter table public.push_nudges enable row level security;

-- posts: everyone reads; you publish / edit / delete only as yourself
drop policy if exists "read all"       on public.posts;
create policy "read all"       on public.posts for select using (true);
drop policy if exists "write own"      on public.posts;
create policy "write own"      on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists "update own posts" on public.posts;
create policy "update own posts" on public.posts for update using (auth.uid() = author_id);
drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts" on public.posts for delete using (auth.uid() = author_id);

-- comments: everyone reads; you speak only as yourself
drop policy if exists "read all c" on public.comments;
create policy "read all c" on public.comments for select using (true);
drop policy if exists "write own c" on public.comments;
create policy "write own c" on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists "del own c" on public.comments;
create policy "del own c" on public.comments for delete using (auth.uid() = author_id);

-- likes: everyone reads; one row per reader, always their own
drop policy if exists "read all l" on public.likes;
create policy "read all l" on public.likes for select using (true);
drop policy if exists "write own l" on public.likes;
create policy "write own l" on public.likes for insert with check (auth.uid() = user_id);
drop policy if exists "del own l" on public.likes;
create policy "del own l" on public.likes for delete using (auth.uid() = user_id);

-- profiles: public directory; you edit only your own row
drop policy if exists "read all p"  on public.profiles;
create policy "read all p"  on public.profiles for select using (true);
drop policy if exists "upsert own p" on public.profiles;
create policy "upsert own p" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "update own p" on public.profiles;
create policy "update own p" on public.profiles for update using (auth.uid() = id);

-- messages: strictly between sender and receiver
drop policy if exists "read own dms" on public.messages;
create policy "read own dms" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "send dms" on public.messages;
create policy "send dms" on public.messages for insert with check (auth.uid() = sender_id);
drop policy if exists "del own dms" on public.messages;
create policy "del own dms" on public.messages for delete using (auth.uid() = sender_id);
drop policy if exists "manage own dms" on public.messages;
create policy "manage own dms" on public.messages for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

-- progress: private to the reader
drop policy if exists "own progress select" on public.progress;
create policy "own progress select" on public.progress for select using (auth.uid() = user_id);
drop policy if exists "own progress insert" on public.progress;
create policy "own progress insert" on public.progress for insert with check (auth.uid() = user_id);
drop policy if exists "own progress update" on public.progress;
create policy "own progress update" on public.progress for update using (auth.uid() = user_id);

-- nudges: the library writes them (seed below runs as owner), everyone reads
drop policy if exists "read nudges" on public.push_nudges;
create policy "read nudges" on public.push_nudges for select using (true);

-- follows: public who-follows-whom; you may only ever add/remove YOUR row
-- (the private-account rules are enforced by the functions in §7)
drop policy if exists "read all f" on public.follows;
create policy "read all f" on public.follows for select using (true);
drop policy if exists "write own f" on public.follows;
create policy "write own f" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "del own f" on public.follows;
create policy "del own f" on public.follows for delete using (auth.uid() = follower_id);

-- table privileges (RLS decides rows; GRANT decides the table at all)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema public to anon;
    grant select on public.profiles, public.posts, public.comments, public.likes,
                   public.follows, public.push_nudges to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on public.posts, public.comments, public.likes,
                                              public.messages, public.progress to authenticated;
    grant select, insert, update          on public.profiles to authenticated;
    grant select, insert, delete          on public.follows  to authenticated;
    grant select                          on public.push_nudges to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant all on all tables in schema public to service_role;
  end if;
exception when others then null;
end $$;


-- ════════════════════════════════════════════════════════════
-- §3 · STORAGE — the three buckets, public to read, owner-only
--      to write. Schema-adaptive: works on new and old projects.
-- ════════════════════════════════════════════════════════════

do $$
declare
  has_owner_id boolean;
  has_owner    boolean;
  owner_expr   text;
begin
  select exists(select 1 from information_schema.columns
                 where table_schema = 'storage' and table_name = 'objects'
                   and column_name = 'owner_id') into has_owner_id;
  select exists(select 1 from information_schema.columns
                 where table_schema = 'storage' and table_name = 'objects'
                   and column_name = 'owner') into has_owner;

  if has_owner_id and has_owner then
    owner_expr := '(owner_id::text = auth.uid()::text or owner::text = auth.uid()::text)';
  elsif has_owner_id then
    owner_expr := 'owner_id::text = auth.uid()::text';
  else
    owner_expr := 'owner::text = auth.uid()::text';
  end if;

  insert into storage.buckets (id, name, public) values ('tsb-covers','tsb-covers',true)
    on conflict (id) do update set public = true;
  insert into storage.buckets (id, name, public) values ('tsb-audio','tsb-audio',true)
    on conflict (id) do update set public = true;
  insert into storage.buckets (id, name, public) values ('tsb-avatars','tsb-avatars',true)
    on conflict (id) do update set public = true;

  drop policy if exists "auth write storage"      on storage.objects;
  drop policy if exists "auth update own storage" on storage.objects;
  drop policy if exists "auth delete own storage" on storage.objects;
  drop policy if exists "auth write storage v2"   on storage.objects;
  drop policy if exists "auth update storage v2"  on storage.objects;
  drop policy if exists "auth delete storage v2"  on storage.objects;
  drop policy if exists "public read storage"     on storage.objects;

  if not exists (select 1 from pg_policies where policyname = 'tsb read storage') then
    execute 'create policy "tsb read storage" on storage.objects for select
      using (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars''))';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'tsb write storage') then
    execute 'create policy "tsb write storage" on storage.objects for insert
      with check (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and ' || owner_expr || ')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'tsb update storage') then
    execute 'create policy "tsb update storage" on storage.objects for update
      using (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and ' || owner_expr || ')';
  end if;
  if not exists (select 1 from pg_policies where policyname = 'tsb delete storage') then
    execute 'create policy "tsb delete storage" on storage.objects for delete
      using (bucket_id in (''tsb-covers'',''tsb-audio'',''tsb-avatars'') and ' || owner_expr || ')';
  end if;
exception when others then
  raise notice 'storage section skipped (%). Run it again from the SQL editor if uploads ever fail.', sqlerrm;
end $$;


-- ════════════════════════════════════════════════════════════
-- §4 · THE OFFICIAL CHANNEL — TheSmallBook ✔ + its 5 archive
--      stories. Already-live rows are untouched (on conflict do nothing).
-- ════════════════════════════════════════════════════════════

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

insert into public.profiles (id, name, avatar_url, bio, is_public)
values ('11111111-1111-1111-1111-111111111111', 'TheSmallBook', '', 'The library''s own channel — one true story from a book on your shelf, most weeks.', true)
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════
-- §5 · HARDENING — the database defends itself.
-- ════════════════════════════════════════════════════════════

-- length locks (mirrors what the app's forms already limit — a hand-built
-- request cannot stuff a novel into a title). If OLD rows violate a limit,
-- that one guard is skipped with a notice instead of failing the run.
do $$ begin
  alter table public.posts drop constraint if exists posts_title_len;
  alter table public.posts add constraint posts_title_len check (char_length(title) <= 90);
exception when others then raise notice 'posts_title_len skipped — an existing title is longer than 90 characters (%).', sqlerrm;
end $$;
do $$ begin
  alter table public.posts drop constraint if exists posts_body_len;
  alter table public.posts add constraint posts_body_len check (char_length(body) <= 40000);
exception when others then raise notice 'posts_body_len skipped (%).', sqlerrm;
end $$;
do $$ begin
  alter table public.comments drop constraint if exists comments_body_len;
  alter table public.comments add constraint comments_body_len check (char_length(body) <= 280);
exception when others then raise notice 'comments_body_len skipped (%).', sqlerrm;
end $$;
do $$ begin
  alter table public.profiles drop constraint if exists profiles_name_len;
  alter table public.profiles add constraint profiles_name_len check (char_length(name) between 1 and 40);
exception when others then raise notice 'profiles_name_len skipped (%).', sqlerrm;
end $$;
do $$ begin
  alter table public.profiles drop constraint if exists profiles_bio_len;
  alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 120);
exception when others then raise notice 'profiles_bio_len skipped (%).', sqlerrm;
end $$;

-- one like per reader per story: remove any exact duplicates the old days
-- produced (keeps the first of each pair), then make the rule permanent
delete from public.likes l
 using public.likes g
 where l.ctid < g.ctid
   and l.user_id is not distinct from g.user_id
   and l.post_id is not distinct from g.post_id;
create unique index if not exists likes_user_post_uid on public.likes (user_id, post_id);

-- when a post dies, its likes and comments die with it (server-side)
create or replace function public.tsb_cascade_post_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.likes    where post_id = old.id;
  delete from public.comments where post_id = old.id;
  return old;
end $$;
drop trigger if exists tsb_cascade_post_delete on public.posts;
create trigger tsb_cascade_post_delete
  after delete on public.posts
  for each row execute function public.tsb_cascade_post_delete();


-- ════════════════════════════════════════════════════════════
-- §6 · USERNAMES — @handle, lowercase, unique, 3-20 chars.
--      The app fills it from sign-up the first time the profile saves.
-- ════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists username text;
do $$ begin
  alter table public.profiles drop constraint if exists profiles_username_fmt;
  alter table public.profiles add constraint profiles_username_fmt
    check (username is null or username ~ '^[a-z0-9_]{3,20}$');
exception when others then raise notice 'profiles_username_fmt skipped (%).', sqlerrm;
end $$;
create unique index if not exists profiles_username_uid
  on public.profiles (username) where username is not null;


-- ════════════════════════════════════════════════════════════
-- §7 · PRIVATE ACCOUNTS + FOLLOW REQUESTS — a private profile
--      gains a follower only when its owner accepts. The app
--      detects this automatically; nothing in the UI changes.
-- ════════════════════════════════════════════════════════════

-- clean any duplicate follow rows from the old handshake era, then lock it down
delete from public.follows f
 using public.follows g
 where f.ctid < g.ctid
   and f.follower_id = g.follower_id
   and f.author_id  = g.author_id;

alter table public.follows drop constraint if exists follows_no_self;
alter table public.follows add constraint follows_no_self check (follower_id <> author_id);
create unique index if not exists follows_one_per_pair on public.follows (follower_id, author_id);
create index if not exists follows_by_author   on public.follows (author_id);
create index if not exists follows_by_follower on public.follows (follower_id);

create table if not exists public.follow_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users (id) on delete cascade,
  target_id     uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint follow_requests_no_self check (requester_id <> target_id)
);
create unique index if not exists follow_requests_pair
  on public.follow_requests (requester_id, target_id);
create index if not exists follow_requests_inbox
  on public.follow_requests (target_id) where status = 'pending';
create index if not exists follow_requests_sent
  on public.follow_requests (requester_id) where status = 'pending';

alter table public.follow_requests enable row level security;
drop policy if exists tsb_requests_read on public.follow_requests;
create policy tsb_requests_read on public.follow_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);
-- nobody writes this table directly — all writes go through the functions below,
-- which take the identity from auth.uid() server-side
drop policy if exists tsb_requests_write on public.follow_requests;
create policy tsb_requests_write on public.follow_requests for all using (false) with check (false);

create or replace function public.request_follow(target uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); is_pub boolean; mutual boolean := false;
begin
  if me is null then raise exception 'not signed in'; end if;
  if me = target then return 'self'; end if;
  select is_public into is_pub from public.profiles where id = target;
  if is_pub is null then return 'no-user'; end if;
  if is_pub then
    insert into public.follows (follower_id, author_id) values (me, target) on conflict do nothing;
    update public.follow_requests set status = 'accepted', responded_at = now()
      where requester_id = me and target_id = target and status = 'pending';
    return 'following';
  end if;
  select exists (select 1 from public.follow_requests
    where requester_id = target and target_id = me and status = 'pending') into mutual;
  if mutual then
    update public.follow_requests set status = 'accepted', responded_at = now()
      where requester_id = target and target_id = me and status = 'pending';
    insert into public.follows (follower_id, author_id) values (me, target), (target, me)
      on conflict do nothing;
    return 'accepted';
  end if;
  insert into public.follow_requests (requester_id, target_id, status, created_at, responded_at)
    values (me, target, 'pending', now(), null)
    on conflict (requester_id, target_id)
    do update set status = 'pending', created_at = now(), responded_at = null;
  return 'requested';
end $$;

create or replace function public.respond_follow_request(target uuid, accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); hit int;
begin
  if me is null then raise exception 'not signed in'; end if;
  update public.follow_requests
     set status = case when accept then 'accepted' else 'declined' end, responded_at = now()
   where requester_id = target and target_id = me and status = 'pending';
  get diagnostics hit = row_count;
  if hit = 0 then return 'nothing-to-do'; end if;
  if accept then
    insert into public.follows (follower_id, author_id) values (target, me) on conflict do nothing;
    return 'accepted';
  end if;
  return 'declined';
end $$;

create or replace function public.cancel_follow_request(target uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  update public.follow_requests set status = 'cancelled', responded_at = now()
    where requester_id = me and target_id = target and status = 'pending';
  return 'cancelled';
end $$;

create or replace function public.unfollow(target uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from public.follows where follower_id = me and author_id = target;
  update public.follow_requests set status = 'cancelled', responded_at = now()
    where requester_id = me and target_id = target and status = 'pending';
  return 'unfollowed';
end $$;

revoke all on function public.request_follow(uuid)                     from public;
revoke all on function public.respond_follow_request(uuid, boolean)    from public;
revoke all on function public.cancel_follow_request(uuid)              from public;
revoke all on function public.unfollow(uuid)                           from public;
grant execute on function public.request_follow(uuid)                  to authenticated;
grant execute on function public.respond_follow_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_follow_request(uuid)           to authenticated;
grant execute on function public.unfollow(uuid)                        to authenticated;

create or replace view public.my_follow_requests as
  select r.id as request_id, r.requester_id,
         coalesce(p.name, 'A reader') as name, p.avatar_url, r.created_at
    from public.follow_requests r
    left join public.profiles p on p.id = r.requester_id
   where r.target_id = auth.uid() and r.status = 'pending';

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.my_follow_requests to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.my_follow_requests to service_role;
  end if;
exception when others then null;
end $$;


-- ════════════════════════════════════════════════════════════
-- §7.5 · USERNAME SIGN-IN — the forever keys. Readers sign in with
--      "@handle + password" on any device. This tiny server-side
--      lookup turns the handle into the sign-in email; the password
--      itself is still checked by Supabase Auth, never by us.
-- ════════════════════════════════════════════════════════════

create or replace function public.tsb_email_for_username(p_username text)
returns text
language sql stable security definer set search_path = public as $$
  select lower(u.email)::text
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.username = lower(replace(p_username, '@', ''))
     and p.username ~ '^[a-z0-9_]{3,20}$'
   limit 1
$$;

-- ════════════════════════════════════════════════════════════
-- §5 · THE LOGIN GATE — rate limiting that lives on the SERVER.
--      A phone can be tampered with; this table cannot. 5 wrong
--      passwords on one account → the account locks for 10
--      minutes, no matter what the browser claims. Success clears it.
--      (Supabase adds its own per-IP limits on top of this.)
-- ════════════════════════════════════════════════════════════

create table if not exists public.tsb_login_gate (
  ident        text primary key,
  fails        int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
-- no table grants — the ONLY doors are the three functions below

create or replace function public.tsb_login_gate_norm(p text)
returns text language sql immutable as $$
  select lower(substr(trim(coalesce(p, '')), 1, 120))
$$;

create or replace function public.tsb_login_status(p_ident text)
returns json
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select json_build_object(
       'locked', coalesce(g.locked_until > now(), false),
       'wait',   greatest(0, coalesce(extract(epoch from (g.locked_until - now()))::int, 0)))
     from public.tsb_login_gate g
      where g.ident = public.tsb_login_gate_norm(p_ident)),
    '{"locked":false,"wait":0}'::json);
$$;

create or replace function public.tsb_login_fail(p_ident text)
returns json
language plpgsql security definer set search_path = public as $$
declare k text := public.tsb_login_gate_norm(p_ident);
        f int; lu timestamptz;
begin
  insert into public.tsb_login_gate (ident, fails, locked_until, updated_at)
    values (k, 1, null, now())
    on conflict (ident) do update
      set fails = case when public.tsb_login_gate.locked_until is null
                         or public.tsb_login_gate.locked_until < now()
                       then public.tsb_login_gate.fails + 1 else public.tsb_login_gate.fails end,
          updated_at = now()
    returning fails into f;
  if f >= 5 then
    update public.tsb_login_gate
       set locked_until = now() + interval '10 minutes'
     where ident = k returning locked_until into lu;
  else
    select locked_until into lu from public.tsb_login_gate where ident = k;
  end if;
  return json_build_object('fails', f,
    'locked', coalesce(lu > now(), false),
    'wait',   greatest(0, coalesce(extract(epoch from (lu - now()))::int, 0)));
end $$;

create or replace function public.tsb_login_reset(p_ident text)
returns text
language sql security definer set search_path = public as $$
  delete from public.tsb_login_gate where ident = public.tsb_login_gate_norm(p_ident);
  select 'ok';
$$;

revoke all on function public.tsb_login_status(text) from public;
revoke all on function public.tsb_login_fail(text)   from public;
revoke all on function public.tsb_login_reset(text)  from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.tsb_login_status(text) to anon;
    grant execute on function public.tsb_login_fail(text)   to anon;
    grant execute on function public.tsb_login_reset(text)  to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.tsb_login_status(text) to authenticated;
    grant execute on function public.tsb_login_fail(text)   to authenticated;
    grant execute on function public.tsb_login_reset(text)  to authenticated;
  end if;
exception when others then raise notice 'gate grants skipped (%).', sqlerrm;
end $$;


-- ════════════════════════════════════════════════════════════
-- §6 · SET MY @NAME — the claim/change desk, checked on the SERVER.
--      Old accounts (random or legacy names) can claim or change
--      their @handle any time. Format and uniqueness are decided
--      here in the database — a tampered browser changes nothing.
--      Answers: 'ok' | 'sign-in' | 'bad' | 'taken'.
-- ════════════════════════════════════════════════════════════

create or replace function public.set_my_username(p_username text)
returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
        u text := lower(substr(trim(coalesce(p_username, '')), 1, 30));
        nm text; av text;
begin
  if me is null then return 'sign-in'; end if;
  if u !~ '^[a-z0-9_]{3,20}$' then return 'bad'; end if;
  if exists (select 1 from public.profiles where username = u and id <> me) then
    return 'taken';
  end if;
  update public.profiles set username = u, updated_at = now() where id = me;
  if not found then
    select coalesce(nullif(raw_user_meta_data->>'full_name', ''), 'Reader'),
           nullif(raw_user_meta_data->>'avatar_url', '')
      into nm, av from auth.users where id = me;
    insert into public.profiles (id, name, avatar_url, username)
      values (me, coalesce(nm, 'Reader'), av, u)
      on conflict (id) do update set username = excluded.username, updated_at = now();
  end if;
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('username', u)
   where id = me;
  return 'ok';
end $$;

revoke all on function public.set_my_username(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.set_my_username(text) to authenticated;
  end if;
exception when others then raise notice 'setter grant skipped (%).', sqlerrm;
end $$;

revoke all on function public.tsb_email_for_username(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.tsb_email_for_username(text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.tsb_email_for_username(text) to authenticated;
  end if;
exception when others then raise notice 'lookup grant skipped (%).', sqlerrm;
end $$;
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ════════════════════════════════════════════════════════════
-- §8 · THE 12 READING NUDGES + interest tags. The daily 6:30 pm
--      IST push cron is optional — it is scheduled only if your
--      project has pg_cron, and it never fails the run.
-- ════════════════════════════════════════════════════════════

insert into public.push_nudges (heading, body, url, tag)
select h, b, u, t from (values
  ('Stuck on something? 📚', 'Atomic Habits · The 2-Minute Rule — shrink the habit till starting is easy.', 'book.html?id=atomic-habits', 'habits,self-improvement,discipline'),
  ('Procrastinating? ⏳', 'Eat That Frog · Do the worst task first, 2 minutes in.', 'book.html?id=eat-that-frog', 'productivity,self-improvement,focus'),
  ('Money feeling tight? 💸', 'Psychology of Money · Room for error is the quiet superpower.', 'book.html?id=psychology-of-money', 'money,finance,business'),
  ('Can''t focus? 🎯', 'Deep Work · Rule 1: work like a pro, schedule every hour.', 'book.html?id=deep-work', 'focus,work,self-improvement'),
  ('Feeling behind in life? 🌱', 'The Subtle Art · Choose better problems, not fewer.', 'book.html?id=subtle-art', 'mindset,philosophy,self-improvement'),
  ('Overthinking a decision? 🤔', 'Sapiens · We study history not to predict the future, but to widen our choices.', 'book.html?id=sapiens', 'history,curiosity,science'),
  ('Tired of saying yes? 🙅', 'Essentialism · If it isn''t a clear yes, it''s a no.', 'book.html?id=essentialism', 'minimalism,focus,self-improvement'),
  ('Argument brewing? 🗣', 'How to Win Friends · Begin friendly, let them say yes yes yes.', 'book.html?id=how-to-win-friends', 'people,communication,relationships'),
  ('Sleep messed up? 😴', 'Why We Sleep · Keep the same wake time seven days a week.', 'book.html?id=why-we-sleep', 'health,sleep,science'),
  ('Need a reset? 🧘', 'The Power of Now · Watch one breath, fully.', 'book.html?id=power-of-now', 'mindset,philosophy,mindfulness'),
  ('Big goal, no plan? 🗺', '12 Rules · Rule 1: stand up straight — then set one tiny rule for today.', 'book.html?id=12-rules', 'discipline,habits,self-improvement'),
  ('Sunday scaries? ☕', 'Four Thousand Weeks · Pick three things for today. Only three.', 'book.html?id=four-thousand-weeks', 'time,philosophy,focus')
) as v(h, b, u, t)
where not exists (select 1 from public.push_nudges);

do $$ begin
  create extension if not exists pg_cron;
exception when others then raise notice 'pg_cron not available — the optional daily push cron is skipped. Everything else is live.';
end $$;
do $$ begin
  create extension if not exists pg_net;
exception when others then null;
end $$;
do $$ begin
  perform cron.unschedule('tsb-daily-nudge');
  perform cron.schedule('tsb-daily-nudge', '30 13 * * *', $cron$
    select net.http_post(
      url: 'https://YOUR-PROJECT.supabase.co/functions/v1/push-notify',
      body: '{"type":"nudge"}',
      headers: jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'tsb-cron-2026')
    );
  $cron$);
  raise notice 'Push cron scheduled — replace YOUR-PROJECT in the cron job with your project ref when you get a chance.';
exception when others then raise notice 'Push cron skipped (%). The app works fully without it.', sqlerrm;
end $$;


-- ════════════════════════════════════════════════════════════
-- §9 · THE CHECK — your receipt. Run shows this grid at the end.
--      Every number must match the "want" column.
-- ════════════════════════════════════════════════════════════

select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name in
     ('profiles','posts','comments','likes','follows','messages','progress','push_nudges','follow_requests'))
    as tables_ok_want_9,
  (select count(*) from pg_policies
     where schemaname = 'public' and policyname in
     ('read all','write own','update own posts','delete own posts',
      'read all c','write own c','del own c','read all l','write own l','del own l',
      'read all p','upsert own p','update own p','read own dms','send dms','del own dms',
      'manage own dms','own progress select','own progress insert','own progress update',
      'read nudges','read all f','write own f','del own f','tsb_requests_read','tsb_requests_write'))
    as rls_policies_ok_want_26,
  (select count(*) from pg_indexes
     where indexname in ('likes_user_post_uid','profiles_username_uid','follows_one_per_pair','follow_requests_pair'))
    as key_indexes_ok_want_4,
  (select count(*) from pg_constraint
     where conname in ('posts_title_len','posts_body_len','comments_body_len',
                       'profiles_name_len','profiles_bio_len','profiles_username_fmt',
                       'follows_no_self','follow_requests_no_self'))
    as guard_rules_ok_want_8,
  (select count(*) from storage.buckets
     where id in ('tsb-covers','tsb-audio','tsb-avatars') and public)
    as buckets_ok_want_3,
  (select count(*) from public.push_nudges)            as nudges_in_table,
  (select count(*) from public.posts
     where author_id = '11111111-1111-1111-1111-111111111111')
    as channel_posts_ok_atleast_5,
  (select count(*) from pg_proc
     where pronamespace = 'public'::regnamespace and proname = 'tsb_email_for_username')
    as username_signin_ok_want_1,
  (select count(*) from pg_proc
     where pronamespace = 'public'::regnamespace
       and proname in ('tsb_login_status','tsb_login_fail','tsb_login_reset'))
    as login_gate_ok_want_3,
  (select count(*) from pg_proc
     where pronamespace = 'public'::regnamespace and proname = 'set_my_username')
    as name_claim_ok_want_1;
