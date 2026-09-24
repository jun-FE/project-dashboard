-- ============================================================
-- project_items : 프로젝트의 개별 작업물(쿠팡 리뷰 한 건, 블로그 글 한 편 …)을
-- 대기(queued) → 초안(drafted) → 완료(published) 단계로 추적한다.
-- 첫 사용처: 쿠팡 체험단 리뷰 (~/쿠팡리뷰/_봇/dashboard.py 가 폴더를 동기화)
-- ============================================================

create table if not exists public.project_items (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  external_key  text not null,                 -- 바깥 세계의 식별자 (쿠팡: 폴더 이름)
  title         text not null,
  stage         text not null default 'queued'
                  check (stage in ('queued', 'drafted', 'published')),
  body          text,                          -- 초안 본문 (쿠팡: 리뷰.txt)
  notes         text,                          -- 올리기 전 확인할 점 (쿠팡: 확인할점.txt)
  meta          jsonb not null default '{}'::jsonb,  -- 부가 정보 (쿠팡: 한줄평, 사진 수)
  created_at    timestamptz not null default now(),
  drafted_at    timestamptz,
  published_at  timestamptz,
  updated_at    timestamptz not null default now(),
  unique (project_id, external_key)
);

create index if not exists project_items_project_stage_idx
  on public.project_items (project_id, stage);

drop trigger if exists project_items_set_updated_at on public.project_items;
create trigger project_items_set_updated_at
  before update on public.project_items
  for each row execute function public.set_updated_at();

alter table public.project_items enable row level security;

drop policy if exists "owner full access" on public.project_items;
create policy "owner full access" on public.project_items
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

-- ------------------------------------------------------------
-- 완료 처리 / 되돌리기 (대시보드 버튼, 텔레그램 [올렸어요] 버튼 공용)
-- 완료: stage=published, 프로젝트의 정기 목표 +1, 프로젝트 updated_at 갱신
-- (진행 로그는 남기지 않는다. 언제 올렸는지는 작업물 목록의 published_at 이 기록이다.)
-- 되돌리기: 초안(본문이 없으면 대기)으로, 이번 주기에 올린 것이었으면 목표 -1
-- 이미 그 상태면 아무것도 하지 않는다 (버튼을 두 번 눌러도 한 번만 반영).
-- 목표는 프로젝트의 정기 목표 전부를 센다. (쿠팡은 "주간 리뷰 작성" 하나)
-- ------------------------------------------------------------
create or replace function public.set_item_published(item_id uuid, published boolean)
returns public.project_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item public.project_items;
  prev_published_at timestamptz;
begin
  select published_at into prev_published_at from public.project_items where id = item_id;

  if published then
    update public.project_items
       set stage = 'published', published_at = now()
     where id = item_id and stage <> 'published'
     returning * into item;
    if not found then
      select * into item from public.project_items where id = item_id;
      return item;
    end if;

    update public.recurring_goals set current_count = current_count + 1
     where project_id = item.project_id;
  else
    update public.project_items
       set stage = case when body is null then 'queued' else 'drafted' end, published_at = null
     where id = item_id and stage = 'published'
     returning * into item;
    if not found then
      select * into item from public.project_items where id = item_id;
      return item;
    end if;

    -- 이미 주기가 넘어가 리셋된 목표는 건드리지 않는다
    update public.recurring_goals
       set current_count = greatest(0, current_count - 1)
     where project_id = item.project_id
       and prev_published_at >= (period_start::timestamp at time zone 'Asia/Seoul');
  end if;

  update public.projects set updated_at = now() where id = item.project_id;
  return item;
end;
$$;

revoke execute on function public.set_item_published(uuid, boolean) from public, anon;
grant execute on function public.set_item_published(uuid, boolean) to authenticated, service_role;
