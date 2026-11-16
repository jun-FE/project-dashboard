-- ============================================================
-- 게임 메모봇이 만든 작업 프롬프트 (2026-11-16)
-- 봇(~/latte-factory/game-memo-bot)이 /프롬프트 때 secret 키로 넣고, 대시보드는 본인만 읽고 체크한다.
-- 원본 파일은 게임 폴더 Feedback/prompts/ 에 그대로 있다 (스크린샷 경로도 거기 기준).
-- ============================================================

create table if not exists public.game_prompts (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  content text not null,
  memo_count int not null default 0,
  file_path text,               -- 맥미니의 원본 프롬프트 파일
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists game_prompts_created_idx on public.game_prompts (created_at desc);

alter table public.game_prompts enable row level security;

drop policy if exists "owner full access" on public.game_prompts;
create policy "owner full access" on public.game_prompts
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

revoke all on public.game_prompts from anon;
