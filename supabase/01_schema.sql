-- ============================================================
-- 프로젝트 관리 대시보드 — 스키마 (Phase 1)
-- Supabase SQL Editor 에 붙여넣고 실행하세요.
-- 테이블 3개: projects / recurring_goals / progress_logs
-- ============================================================

-- gen_random_uuid() 사용을 위한 확장 (Supabase에는 보통 이미 설치돼 있음)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) projects : 공통 컬럼 고정 + custom_fields(JSONB)로 확장
-- ------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  category      text,                                  -- 자유 텍스트 (개발/리서치/콘텐츠/커머스 등)
  status        text not null default 'active'
                  check (status in ('active', 'paused', 'done')),
  progress      int  not null default 0
                  check (progress between 0 and 100),
  custom_fields jsonb not null default '{}'::jsonb,     -- 프로젝트별 자유 데이터
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) recurring_goals : 주간/월간 반복 목표 추적
-- ------------------------------------------------------------
create table if not exists public.recurring_goals (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  label         text not null,                          -- 예: "주간 리뷰 작성"
  period        text not null check (period in ('weekly', 'monthly')),
  target_count  int  not null default 0,
  current_count int  not null default 0,
  period_start  date not null default current_date      -- 현재 집계 주기 시작일
);

create index if not exists recurring_goals_project_id_idx
  on public.recurring_goals (project_id);

-- ------------------------------------------------------------
-- 3) progress_logs : 진행 로그 타임라인
-- ------------------------------------------------------------
create table if not exists public.progress_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  log_date    timestamptz not null default now(),
  log_type    text not null default '작업'
                check (log_type in ('작업', '결정', '이슈')),
  content     text not null
);

create index if not exists progress_logs_project_id_idx
  on public.progress_logs (project_id);
create index if not exists progress_logs_log_date_idx
  on public.progress_logs (log_date desc);

-- ------------------------------------------------------------
-- updated_at 자동 갱신 트리거
-- (AI/사람이 projects 행을 UPDATE 할 때마다 updated_at 갱신)
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS : v1은 개인용/인증 없음 → anon 키로 전체 접근 허용. (03_owner_only.sql 이 대체함)
--       (Phase 5에서 인증 도입 시 정책을 좁힌다.)
-- ------------------------------------------------------------
alter table public.projects        enable row level security;
alter table public.recurring_goals enable row level security;
alter table public.progress_logs   enable row level security;

drop policy if exists "v1 open access" on public.projects;
create policy "v1 open access" on public.projects
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "v1 open access" on public.recurring_goals;
create policy "v1 open access" on public.recurring_goals
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "v1 open access" on public.progress_logs;
create policy "v1 open access" on public.progress_logs
  for all to anon, authenticated using (true) with check (true);
