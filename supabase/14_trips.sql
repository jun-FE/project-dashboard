-- ============================================================
-- 여행 계획 짜기 (2026-11-25)
-- - 여행 하나 = 링크(/t/<slug>) + 초대 코드. 여러 명이 같은 주소로 들어와 같이 짠다.
-- - 들어온 사람은 이름만 고른다 (누가 넣었는지·누가 좋아했는지 표시용).
-- - 테이블은 나만(RLS). 다른 사람은 trip_* 함수(코드 확인 후 그 여행만)로만 읽고 쓴다.
-- - 나(대시보드 로그인)는 코드 없이 같은 함수를 쓸 수 있다.
-- - 코드는 bcrypt 해시로만 저장. 5번 틀리면 10분 잠김. (09_friends.sql 과 같은 방식)
-- 여러 번 실행해도 안전하다.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.trips (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (length(title) between 1 and 60),
  destination      text check (length(destination) <= 60),
  start_date       date,
  end_date         date,
  slug             text not null unique,
  pw_hash          text not null,
  failed_attempts  int  not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now(),
  constraint trips_dates check (end_date is null or start_date is null or (end_date >= start_date and end_date - start_date <= 30))
);

create table if not exists public.trip_members (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  name        text not null check (length(name) between 1 and 20),
  created_at  timestamptz not null default now(),
  unique (trip_id, name)
);

-- kind: do 하고 싶은 것 / eat 먹고 싶은 것 / stay 숙소 / pack 챙길 것(일정에 안 넣음)
create table if not exists public.trip_items (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  kind        text not null check (kind in ('do', 'eat', 'stay', 'pack')),
  title       text not null check (length(title) between 1 and 100),
  memo        text check (length(memo) <= 300),
  link        text check (length(link) <= 500),
  added_by    text check (length(added_by) <= 20),
  likes       text[] not null default '{}',
  day         date,                 -- 일정에 넣은 날 (null = 아직 위시리스트)
  "time"      text check ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  sort        double precision not null default 0,
  done        boolean not null default false,   -- pack 체크용
  created_at  timestamptz not null default now()
);
create index if not exists trip_items_trip_idx on public.trip_items(trip_id);
create index if not exists trip_members_trip_idx on public.trip_members(trip_id);

alter table public.trips        enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_items   enable row level security;

drop policy if exists "owner full access" on public.trips;
create policy "owner full access" on public.trips
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

drop policy if exists "owner full access" on public.trip_members;
create policy "owner full access" on public.trip_members
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

drop policy if exists "owner full access" on public.trip_items;
create policy "owner full access" on public.trip_items
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

revoke all on public.trips, public.trip_members, public.trip_items from anon;

-- ------------------------------------------------------------
-- 내 쪽: 여행 만들기 / 코드 바꾸기
-- ------------------------------------------------------------
create or replace function public.owner_create_trip(p_title text, p_destination text, p_start date, p_end date, p_password text)
returns public.trips
language plpgsql security definer set search_path = '' as $$
declare r public.trips;
begin
  if (auth.jwt() ->> 'email') is distinct from 'craftttime@gmail.com' then
    raise exception 'not allowed';
  end if;
  if length(coalesce(p_password, '')) < 4 then
    raise exception '초대 코드는 4자 이상';
  end if;
  insert into public.trips (title, destination, start_date, end_date, slug, pw_hash)
  values (trim(p_title), nullif(trim(p_destination), ''), p_start, p_end,
          encode(extensions.gen_random_bytes(8), 'hex'),
          extensions.crypt(p_password, extensions.gen_salt('bf')))
  returning * into r;
  return r;
end $$;

create or replace function public.owner_set_trip_password(p_trip_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'craftttime@gmail.com' then
    raise exception 'not allowed';
  end if;
  if length(coalesce(p_password, '')) < 4 then
    raise exception '초대 코드는 4자 이상';
  end if;
  update public.trips
     set pw_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
         failed_attempts = 0, locked_until = null
   where id = p_trip_id;
end $$;

-- ------------------------------------------------------------
-- 공통 확인: 나(로그인)면 코드 없이 통과, 아니면 코드 확인.
-- 틀려도 예외 대신 null (실패 횟수 기록이 롤백되지 않게)
-- ------------------------------------------------------------
create or replace function public.trip_check(p_slug text, p_password text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare t public.trips;
begin
  select * into t from public.trips where slug = p_slug;
  if not found then return null; end if;
  if (auth.jwt() ->> 'email') = 'craftttime@gmail.com' then return t.id; end if;
  if t.locked_until is not null and t.locked_until > now() then return null; end if;
  if t.pw_hash = extensions.crypt(coalesce(p_password, ''), t.pw_hash) then
    if t.failed_attempts > 0 then
      update public.trips set failed_attempts = 0, locked_until = null where id = t.id;
    end if;
    return t.id;
  end if;
  if t.locked_until is not null then t.failed_attempts := 0; end if;
  update public.trips
     set failed_attempts = t.failed_attempts + 1,
         locked_until = case when t.failed_attempts + 1 >= 5 then now() + interval '10 minutes' end
   where id = t.id;
  return null;
end $$;

-- 화면 데이터 전체. 실패면 {"error": "wrong" | "locked"}
create or replace function public.trip_view(p_slug text, p_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tid uuid; t public.trips;
begin
  tid := public.trip_check(p_slug, p_password);
  if tid is null then
    select * into t from public.trips where slug = p_slug;
    if found and t.locked_until is not null and t.locked_until > now() then
      return jsonb_build_object('error', 'locked');
    end if;
    return jsonb_build_object('error', 'wrong');
  end if;
  select * into t from public.trips where id = tid;
  return jsonb_build_object(
    'trip', jsonb_build_object('title', t.title, 'destination', t.destination,
                               'start_date', t.start_date, 'end_date', t.end_date),
    'members', coalesce((select jsonb_agg(m.name order by m.created_at)
                           from public.trip_members m where m.trip_id = tid), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(i) - 'trip_id' order by i.sort, i.created_at)
                         from public.trip_items i where i.trip_id = tid), '[]'::jsonb)
  );
end $$;

-- 이름 등록 (이미 있으면 그대로)
create or replace function public.trip_join(p_slug text, p_password text, p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare tid uuid;
begin
  tid := public.trip_check(p_slug, p_password);
  if tid is null or length(trim(coalesce(p_name, ''))) = 0 then return false; end if;
  if (select count(*) from public.trip_members where trip_id = tid) >= 30 then return false; end if;
  insert into public.trip_members (trip_id, name) values (tid, left(trim(p_name), 20))
  on conflict (trip_id, name) do nothing;
  return true;
end $$;

-- 여행 제목·여행지·날짜 바꾸기. 날짜 범위 밖으로 밀려난 일정은 위시리스트로 돌린다.
create or replace function public.trip_update(p_slug text, p_password text, p_title text, p_destination text, p_start date, p_end date)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare tid uuid;
begin
  tid := public.trip_check(p_slug, p_password);
  if tid is null then return false; end if;
  update public.trips
     set title = left(trim(p_title), 60), destination = nullif(left(trim(p_destination), 60), ''),
         start_date = p_start, end_date = p_end
   where id = tid;
  update public.trip_items
     set day = null, "time" = null
   where trip_id = tid and day is not null
     and (p_start is null or p_end is null or day < p_start or day > p_end);
  return true;
end $$;

create or replace function public.trip_add_item(p_slug text, p_password text, p_kind text, p_title text, p_memo text, p_link text, p_by text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid; nid uuid;
begin
  tid := public.trip_check(p_slug, p_password);
  if tid is null then return null; end if;
  if (select count(*) from public.trip_items where trip_id = tid) >= 500 then return null; end if;
  insert into public.trip_items (trip_id, kind, title, memo, link, added_by, sort)
  values (tid, p_kind, left(trim(p_title), 100), nullif(left(trim(p_memo), 300), ''),
          nullif(left(trim(p_link), 500), ''), nullif(left(trim(p_by), 20), ''),
          extract(epoch from now()))
  returning id into nid;
  return nid;
end $$;

-- 고칠 칸만 담아 보낸다: title, memo, link, kind, day, time, sort, done
-- day/time 을 null 로 보내면 비운다 (일정에서 빼기)
create or replace function public.trip_update_item(p_slug text, p_password text, p_item_id uuid, p_patch jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare tid uuid;
begin
  tid := public.trip_check(p_slug, p_password);
  if tid is null then return false; end if;
  update public.trip_items set
    title = case when p_patch ? 'title' then left(trim(p_patch ->> 'title'), 100) else title end,
    memo  = case when p_patch ? 'memo'  then nullif(left(trim(p_patch ->> 'memo'), 300), '') else memo end,
    link  = case when p_patch ? 'link'  then nullif(left(trim(p_patch ->> 'link'), 500), '') else link end,
    kind  = case when p_patch ? 'kind'  then p_patch ->> 'kind' else kind end,
    day   = case when p_patch ? 'day'   then (p_patch ->> 'day')::date else day end,
    "time" = case when p_patch ? 'time' then nullif(p_patch ->> 'time', '') else "time" end,
    sort  = case when p_patch ? 'sort'  then (p_patch ->> 'sort')::double precision else sort end,
    done  = case when p_patch ? 'done'  then (p_patch ->> 'done')::boolean else done end
  where id = p_item_id and trip_id = tid;
  return found;
end $$;

create or replace function public.trip_delete_item(p_slug text, p_password text, p_item_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare tid uuid;
begin
  tid := public.trip_check(p_slug, p_password);
  if tid is null then return false; end if;
  delete from public.trip_items where id = p_item_id and trip_id = tid;
  return found;
end $$;

-- 좋아요 켜고 끄기 (이름 기준)
create or replace function public.trip_toggle_like(p_slug text, p_password text, p_item_id uuid, p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare tid uuid; n text := left(trim(coalesce(p_name, '')), 20);
begin
  tid := public.trip_check(p_slug, p_password);
  if tid is null or n = '' then return false; end if;
  update public.trip_items
     set likes = case when n = any(likes) then array_remove(likes, n) else array_append(likes, n) end
   where id = p_item_id and trip_id = tid;
  return found;
end $$;

-- 실행 권한
revoke all on function public.trip_check(text, text) from public, anon, authenticated;
revoke all on function public.owner_create_trip(text, text, date, date, text) from public, anon;
revoke all on function public.owner_set_trip_password(uuid, text) from public, anon;
grant execute on function public.owner_create_trip(text, text, date, date, text) to authenticated;
grant execute on function public.owner_set_trip_password(uuid, text) to authenticated;
grant execute on function public.trip_view(text, text) to anon, authenticated;
grant execute on function public.trip_join(text, text, text) to anon, authenticated;
grant execute on function public.trip_update(text, text, text, text, date, date) to anon, authenticated;
grant execute on function public.trip_add_item(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.trip_update_item(text, text, uuid, jsonb) to anon, authenticated;
grant execute on function public.trip_delete_item(text, text, uuid) to anon, authenticated;
grant execute on function public.trip_toggle_like(text, text, uuid, text) to anon, authenticated;
