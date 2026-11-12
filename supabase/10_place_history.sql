-- ============================================================
-- 같이 갈 맛집 → 다녀온 기록 (2026-11-12)
-- 다녀왔다고 체크할 때 날짜와 한줄 후기를 남겨서 "다녀온 곳" 히스토리로 본다.
-- 09_friends.sql 다음에 실행. 여러 번 실행해도 안전하다.
-- ============================================================

alter table public.friend_places
  add column if not exists visited_on date,
  add column if not exists review text;

alter table public.friend_places drop constraint if exists friend_places_review_len;
alter table public.friend_places add constraint friend_places_review_len check (length(review) <= 300);

-- 이미 다녀옴으로 표시한 곳은 그날 날짜로 채운다
update public.friend_places
   set visited_on = (visited_at at time zone 'Asia/Seoul')::date
 where visited and visited_on is null and visited_at is not null;

-- 친구 쪽: 다녀옴 표시 + 날짜 + 후기 (취소하면 셋 다 비운다)
drop function if exists public.friend_set_place(text, text, uuid, boolean);
create or replace function public.friend_set_place(
  p_slug text, p_password text, p_place_id uuid, p_visited boolean,
  p_visited_on date default null, p_review text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
  fid := public.friend_check(p_slug, p_password);
  if fid is null then return false; end if;
  update public.friend_places
     set visited    = p_visited,
         visited_at = case when p_visited then now() end,
         visited_on = case when p_visited then coalesce(p_visited_on, (now() at time zone 'Asia/Seoul')::date) end,
         review     = case when p_visited then nullif(trim(left(p_review, 300)), '') end
   where id = p_place_id and friend_id = fid;
  return found;
end $$;

revoke all on function public.friend_set_place(text, text, uuid, boolean, date, text) from public;
grant execute on function public.friend_set_place(text, text, uuid, boolean, date, text) to anon, authenticated;
