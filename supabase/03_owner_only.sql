-- ============================================================
-- 대시보드 테이블을 로그인한 본인만 읽고 쓰게 좁힌다. (memos 와 같은 기준)
-- v1 의 "anon 전체 허용" 정책을 대체한다.
-- Hermes 는 Supabase MCP(DB 직접 연결)로 접근하므로 RLS 영향을 받지 않는다.
-- ============================================================

drop policy if exists "v1 open access" on public.projects;
drop policy if exists "v1 open access" on public.recurring_goals;
drop policy if exists "v1 open access" on public.progress_logs;

drop policy if exists "owner full access" on public.projects;
create policy "owner full access" on public.projects
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

drop policy if exists "owner full access" on public.recurring_goals;
create policy "owner full access" on public.recurring_goals
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

drop policy if exists "owner full access" on public.progress_logs;
create policy "owner full access" on public.progress_logs
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

-- 보안 어드바이저 경고(function_search_path_mutable) 해소
alter function public.set_updated_at() set search_path = '';
