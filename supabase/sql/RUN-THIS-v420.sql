-- ============================================================
-- THESMALLBOOK · Build 420 · founder analytics
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- What this does, in plain words:
--   · makes sure public.events exists (it is created by the
--     Build 419 file too; this repeats it so the Analytics view
--     works even if only this file is run)
--   · tsb_analytics(days) - ONE function the Settings page calls.
--     It counts visitors, visits and page views from public.events,
--     says where visits began, lists the most opened pages, and
--     lists signed-in readers BY NAME AND EMAIL with their last
--     visit. It answers only when the caller's own login email is
--     a founder email - anyone else gets "founder only".
--
-- About emails: an email appears here only for a reader who
-- signed in (the email is their account's). Anonymous visitors
-- have no email anywhere, and this function cannot invent one;
-- they are counted by the random visitor number their browser
-- keeps, nothing more.
-- ============================================================


-- the events table (same shape as RUN-THIS-v419.sql) ------------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "events append" on public.events;
create policy "events append" on public.events
  for insert to anon, authenticated with check (true);
-- no select policy for clients: readers may add events, never
-- read them. The ONLY reader of this table is tsb_analytics().

create index if not exists events_at_idx on public.events (at desc);
create index if not exists events_name_idx on public.events (name, at desc);


-- the founder's numbers -------------------------------------------
create or replace function public.tsb_analytics(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  span int := greatest(1, least(coalesce(p_days, 30), 365));
  since timestamptz := now() - make_interval(days => span);
  day0 timestamptz := (now() at time zone 'Asia/Kolkata')::date at time zone 'Asia/Kolkata';
  result jsonb;
begin
  if me_email not in ('acimotreyothy@gmail.com', 'jashgandhicreator07@gmail.com') then
    raise exception 'founder only';
  end if;

  select jsonb_build_object(
    'days', span,
    'visitors', (select count(distinct props ->> 'v') from public.events
                  where at >= since and props ? 'v'),
    'visitors_total', (select count(distinct props ->> 'v') from public.events
                        where props ? 'v'),
    'visits', (select count(*) from public.events
                where at >= since and name = 'visit'),
    'page_views', (select count(*) from public.events
                    where at >= since and name = 'page_view'),
    'signed_in', (select count(distinct user_id) from public.events
                   where at >= since and user_id is not null),
    'today', jsonb_build_object(
      'visitors', (select count(distinct props ->> 'v') from public.events
                    where at >= day0 and props ? 'v'),
      'visits', (select count(*) from public.events
                  where at >= day0 and name = 'visit'),
      'page_views', (select count(*) from public.events
                      where at >= day0 and name = 'page_view')
    ),
    'by_day', coalesce((select jsonb_agg(x order by x ->> 'd') from (
        select jsonb_build_object(
          'd', to_char((at at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD'),
          'visitors', count(distinct props ->> 'v'),
          'visits', count(*) filter (where name = 'visit'),
          'views', count(*) filter (where name = 'page_view')
        ) as x
        from public.events where at >= since
        group by (at at time zone 'Asia/Kolkata')::date
      ) s), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(x order by (x ->> 'visits')::int desc) from (
        select jsonb_build_object('src', g.src, 'visits', g.n) as x from (
          select coalesce(nullif(props ->> 'src', ''), 'Direct / link') as src,
                 count(*) as n
          from public.events
          where at >= since and name = 'visit'
          group by 1 order by 2 desc limit 12
        ) g
      ) s), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(x order by (x ->> 'views')::int desc) from (
        select jsonb_build_object('path', g.path, 'views', g.n) as x from (
          select coalesce(nullif(props ->> 'path', ''), '/') as path,
                 count(*) as n
          from public.events
          where at >= since and name = 'page_view'
          group by 1 order by 2 desc limit 15
        ) g
      ) s), '[]'::jsonb),
    'readers', coalesce((select jsonb_agg(x order by x ->> 'last_seen' desc) from (
        select jsonb_build_object(
          'email', u.email,
          'name', p.name,
          'visits', count(distinct e.props ->> 's'),
          'views', count(*) filter (where e.name = 'page_view'),
          'last_seen', max(e.at)
        ) as x
        from public.events e
        join auth.users u on u.id = e.user_id
        left join public.profiles p on p.id = e.user_id
        where e.at >= since
        group by u.email, p.name
        order by max(e.at) desc
        limit 100
      ) s), '[]'::jsonb)
  ) into result;

  return result;
end $$;

-- signed-in callers may ask; the function itself decides who is
-- a founder before it answers anything
grant execute on function public.tsb_analytics(int) to authenticated;

-- ============================================================
-- After running this, open Settings while signed in as the
-- founder: the Analytics section appears at the end of the
-- notifications area, and nowhere else.
-- ============================================================
