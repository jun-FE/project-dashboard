-- ============================================================
-- 대시보드에서 숨길 프로젝트. 데이터는 그대로 두고 메인 화면·요약에서만 뺀다.
-- 상세 페이지에서 다시 보이게 할 수 있다.
-- ============================================================

alter table public.projects add column if not exists hidden boolean not null default false;

-- 아직 실제로 진행하지 않는 시드 프로젝트 (2026-09-25)
update public.projects set hidden = true where name in ('쇼츠 채널 운영', '워드프레스 블로그');
