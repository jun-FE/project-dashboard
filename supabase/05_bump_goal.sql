-- ============================================================
-- 정기 목표 카운트를 원자적으로 더하고 빼기 (화면의 −/+ 버튼, Hermes 공용)
-- 읽고-더하고-쓰는 대신 DB 에서 한 번에 더해서 동시에 눌러도 값이 꼬이지 않는다.
-- security invoker 라 RLS(본인 전용)가 그대로 적용된다.
-- 소속 프로젝트의 updated_at 도 함께 갱신한다.
-- ============================================================

create or replace function public.bump_goal(goal_id uuid, delta int)
returns int
language sql
security invoker
set search_path = ''
as $$
  with bumped as (
    update public.recurring_goals
       set current_count = greatest(0, current_count + delta)
     where id = goal_id
     returning project_id, current_count
  ), touched as (
    update public.projects p
       set updated_at = now()
      from bumped b
     where p.id = b.project_id
  )
  select current_count from bumped;
$$;

revoke execute on function public.bump_goal(uuid, int) from public, anon;
grant execute on function public.bump_goal(uuid, int) to authenticated;
