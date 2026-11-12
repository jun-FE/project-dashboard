-- ============================================================
-- 친구와 같이 할 일 / 같이 갈 맛집 (2026-11-12)
-- - 나는 대시보드(/friends)에서 모든 친구 것을 모아 본다. (테이블 RLS: 본인만)
-- - 친구는 링크(/f/<slug>) + 비밀번호로 자기 것만 본다. 친구는 테이블에 직접 접근하지 못하고
--   아래 friend_* 함수(비밀번호 확인 후 그 친구 데이터만 다룸)로만 읽고 쓴다.
-- - 비밀번호는 bcrypt 해시로만 저장한다. 5번 틀리면 10분 잠긴다.
-- 여러 번 실행해도 안전하다.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.friends (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,     -- 링크 주소. 추측하기 어려운 무작위 문자열
  pw_hash          text not null,
  failed_attempts  int  not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists public.friend_todos (
  id          uuid primary key default gen_random_uuid(),
  friend_id   uuid not null references public.friends(id) on delete cascade,
  title       text not null check (length(title) between 1 and 200),
  done        boolean not null default false,
  done_at     timestamptz,
  done_by     text check (done_by in ('me', 'friend')),
  created_by  text not null default 'me' check (created_by in ('me', 'friend')),
  created_at  timestamptz not null default now()
);
create index if not exists friend_todos_friend_idx on public.friend_todos(friend_id);

create table if not exists public.friend_places (
  id          uuid primary key default gen_random_uuid(),
  friend_id   uuid not null references public.friends(id) on delete cascade,
  name        text not null check (length(name) between 1 and 100),
  area        text check (length(area) <= 50),
  link        text check (length(link) <= 500),
  memo        text check (length(memo) <= 300),
  visited     boolean not null default false,
  visited_at  timestamptz,
  created_by  text not null default 'me' check (created_by in ('me', 'friend')),
  created_at  timestamptz not null default now()
);
create index if not exists friend_places_friend_idx on public.friend_places(friend_id);

-- RLS: 테이블은 나만. (anon 정책 없음 → 친구는 함수로만)
alter table public.friends       enable row level security;
alter table public.friend_todos  enable row level security;
alter table public.friend_places enable row level security;

drop policy if exists "owner full access" on public.friends;
create policy "owner full access" on public.friends
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

drop policy if exists "owner full access" on public.friend_todos;
create policy "owner full access" on public.friend_todos
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

drop policy if exists "owner full access" on public.friend_places;
create policy "owner full access" on public.friend_places
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

-- ------------------------------------------------------------
-- 내 쪽 함수: 친구 만들기 / 비밀번호 바꾸기 (해시를 DB 안에서 만든다)
-- ------------------------------------------------------------
create or replace function public.owner_create_friend(p_name text, p_password text)
returns public.friends
language plpgsql security definer set search_path = '' as $$
declare r public.friends;
begin
  if (auth.jwt() ->> 'email') is distinct from 'craftttime@gmail.com' then
    raise exception 'not allowed';
  end if;
  if length(coalesce(p_password, '')) < 4 then
    raise exception '비밀번호는 4자 이상';
  end if;
  insert into public.friends (name, slug, pw_hash)
  values (trim(p_name),
          encode(extensions.gen_random_bytes(8), 'hex'),
          extensions.crypt(p_password, extensions.gen_salt('bf')))
  returning * into r;
  return r;
end $$;

create or replace function public.owner_set_friend_password(p_friend_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'craftttime@gmail.com' then
    raise exception 'not allowed';
  end if;
  if length(coalesce(p_password, '')) < 4 then
    raise exception '비밀번호는 4자 이상';
  end if;
  update public.friends
     set pw_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
         failed_attempts = 0, locked_until = null
   where id = p_friend_id;
end $$;

-- ------------------------------------------------------------
-- 친구 쪽 함수: 모두 (slug, 비밀번호)를 먼저 확인한다
-- 틀려도 예외 대신 null 을 돌려줘야 실패 횟수 기록이 롤백되지 않는다.
-- ------------------------------------------------------------
create or replace function public.friend_check(p_slug text, p_password text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare f public.friends;
begin
  select * into f from public.friends where slug = p_slug;
  if not found then return null; end if;
  if f.locked_until is not null and f.locked_until > now() then return null; end if;
  if f.pw_hash = extensions.crypt(coalesce(p_password, ''), f.pw_hash) then
    if f.failed_attempts > 0 then
      update public.friends set failed_attempts = 0, locked_until = null where id = f.id;
    end if;
    return f.id;
  end if;
  -- 잠금이 풀린 뒤엔 다시 0부터 센다
  if f.locked_until is not null then f.failed_attempts := 0; end if;
  update public.friends
     set failed_attempts = f.failed_attempts + 1,
         locked_until = case when f.failed_attempts + 1 >= 5 then now() + interval '10 minutes' end
   where id = f.id;
  return null;
end $$;

-- 화면 데이터 전체. 실패면 {"error": "wrong" | "locked"}
create or replace function public.friend_view(p_slug text, p_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare fid uuid; f public.friends;
begin
  fid := public.friend_check(p_slug, p_password);
  if fid is null then
    select * into f from public.friends where slug = p_slug;
    if found and f.locked_until is not null and f.locked_until > now() then
      return jsonb_build_object('error', 'locked');
    end if;
    return jsonb_build_object('error', 'wrong');
  end if;
  return jsonb_build_object(
    'name', (select name from public.friends where id = fid),
    'todos', coalesce((select jsonb_agg(to_jsonb(t) - 'friend_id' order by t.done, t.created_at)
                         from public.friend_todos t where t.friend_id = fid), '[]'::jsonb),
    'places', coalesce((select jsonb_agg(to_jsonb(p) - 'friend_id' order by p.visited, p.created_at)
                          from public.friend_places p where p.friend_id = fid), '[]'::jsonb)
  );
end $$;

create or replace function public.friend_set_todo(p_slug text, p_password text, p_todo_id uuid, p_done boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  fid := public.friend_check(p_slug, p_password);
  if fid is null then return false; end if;
  update public.friend_todos
     set done = p_done, done_at = case when p_done then now() end, done_by = case when p_done then 'friend' end
   where id = p_todo_id and friend_id = fid;
  return found;
end $$;

create or replace function public.friend_add_todo(p_slug text, p_password text, p_title text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  fid := public.friend_check(p_slug, p_password);
  if fid is null then return false; end if;
  if (select count(*) from public.friend_todos where friend_id = fid) >= 300 then return false; end if;
  insert into public.friend_todos (friend_id, title, created_by) values (fid, trim(p_title), 'friend');
  return true;
end $$;

create or replace function public.friend_set_place(p_slug text, p_password text, p_place_id uuid, p_visited boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  fid := public.friend_check(p_slug, p_password);
  if fid is null then return false; end if;
  update public.friend_places
     set visited = p_visited, visited_at = case when p_visited then now() end
   where id = p_place_id and friend_id = fid;
  return found;
end $$;

create or replace function public.friend_add_place(p_slug text, p_password text, p_name text, p_area text, p_link text, p_memo text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  fid := public.friend_check(p_slug, p_password);
  if fid is null then return false; end if;
  if (select count(*) from public.friend_places where friend_id = fid) >= 300 then return false; end if;
  insert into public.friend_places (friend_id, name, area, link, memo, created_by)
  values (fid, trim(p_name), nullif(trim(p_area), ''), nullif(trim(p_link), ''), nullif(trim(p_memo), ''), 'friend');
  return true;
end $$;

-- 실행 권한: friend_check 는 내부용, 친구 함수는 anon 에게, 내 함수는 로그인 사용자에게만
revoke all on function public.friend_check(text, text) from public, anon, authenticated;
revoke all on function public.owner_create_friend(text, text) from public, anon;
revoke all on function public.owner_set_friend_password(uuid, text) from public, anon;
grant execute on function public.owner_create_friend(text, text) to authenticated;
grant execute on function public.owner_set_friend_password(uuid, text) to authenticated;
grant execute on function public.friend_view(text, text) to anon, authenticated;
grant execute on function public.friend_set_todo(text, text, uuid, boolean) to anon, authenticated;
grant execute on function public.friend_add_todo(text, text, text) to anon, authenticated;
grant execute on function public.friend_set_place(text, text, uuid, boolean) to anon, authenticated;
grant execute on function public.friend_add_place(text, text, text, text, text, text) to anon, authenticated;
