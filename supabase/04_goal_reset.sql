-- ============================================================
-- 정기 목표 주기 리셋 (한국 시간 기준, 주간 = 월요일 시작)
-- 주/월이 바뀐 목표는 지난 주기 결과를 progress_logs 에 한 줄 남기고
-- current_count = 0, period_start = 새 주기 시작일로 돌린다.
-- 매일 00:00 KST 에 pg_cron 으로 실행. 바뀐 게 없으면 아무 일도 안 한다.
-- Hermes 는 지금처럼 current_count 를 +1 만 하면 된다.
-- ============================================================

create or replace function public.reset_recurring_goals()
returns void
language plpgsql
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  with due as (
    select g.*,
      case g.period
        when 'weekly' then date_trunc('week', today::timestamp)::date
        else date_trunc('month', today::timestamp)::date
      end as new_start
    from public.recurring_goals g
  ),
  stale as (
    select * from due where period_start < new_start
  ),
  logged as (
    -- 지난 주기의 마지막 순간으로 남겨서 새 날의 "오늘 한 일"에 섞이지 않게 한다
    insert into public.progress_logs (project_id, log_date, log_type, content)
    select project_id,
           (new_start::timestamp at time zone 'Asia/Seoul') - interval '1 second',
           '작업',
           format('%s 결과 %s/%s (%s~)', label, current_count, target_count, to_char(period_start, 'FMMM/FMDD'))
    from stale
  )
  update public.recurring_goals g
     set current_count = 0, period_start = s.new_start
    from stale s
   where g.id = s.id;
end;
$$;

-- public 함수는 기본으로 anon RPC 에 노출되므로 막는다
revoke execute on function public.reset_recurring_goals() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

-- 00:00 KST = 15:00 UTC
select cron.schedule('reset-recurring-goals', '0 15 * * *', 'select public.reset_recurring_goals()');
