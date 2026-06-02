-- ============================================================
-- 테스트용 더미 데이터 (Phase 1)
-- 01_schema.sql 실행 후에 SQL Editor 에서 실행하세요.
-- 예시 프로젝트 3개: 쿠팡 체험단 리뷰 / 쇼츠 채널 / 워드프레스 블로그
-- (여러 번 실행해도 중복되지 않도록 같은 이름이 있으면 건너뜀)
-- ============================================================

with
-- 1) projects 삽입 (이미 같은 이름이 있으면 건너뜀)
new_projects as (
  insert into public.projects (name, description, category, status, progress, custom_fields)
  select * from (values
    (
      '쿠팡 체험단 리뷰',
      '쿠팡 체험단 상품을 받아 리뷰를 작성하는 프로젝트.',
      '커머스',
      'active', 65,
      '{"받은 상품": ["무선 이어폰", "텀블러", "주방 저울"], "이번 주 받은 상품 수": 3, "평균 평점": 4.6}'::jsonb
    ),
    (
      '쇼츠 채널 운영',
      '유튜브 쇼츠 채널. 주기적으로 영상을 업로드하며 구독자 확보.',
      '콘텐츠',
      'active', 40,
      '{"구독자 수": 1240, "이번 주 업로드 영상 수": 3, "다음 업로드 예정": "2026-06-05", "총 조회수": 85200}'::jsonb
    ),
    (
      '워드프레스 블로그',
      '애드센스 수익형 워드프레스 블로그 운영.',
      '콘텐츠',
      'paused', 25,
      '{"이번 달 발행 글 수": 8, "애드센스 수익(USD)": 32.5, "월 트래픽(PV)": 14300}'::jsonb
    )
  ) as v(name, description, category, status, progress, custom_fields)
  where not exists (
    select 1 from public.projects p where p.name = v.name
  )
  returning id, name
),
-- 이름 → id 매핑 (새로 삽입된 것 + 기존 것 모두)
ids as (
  select id, name from new_projects
  union
  select id, name from public.projects
  where name in ('쿠팡 체험단 리뷰', '쇼츠 채널 운영', '워드프레스 블로그')
),
-- 2) recurring_goals 삽입
ins_goals as (
  insert into public.recurring_goals (project_id, label, period, target_count, current_count, period_start)
  select i.id, g.label, g.period, g.target_count, g.current_count, g.period_start
  from ids i
  join (values
    ('쿠팡 체험단 리뷰', '주간 리뷰 작성', 'weekly',  10, 7, date_trunc('week', current_date)::date),
    ('쇼츠 채널 운영',   '주간 영상 업로드', 'weekly',  5,  3, date_trunc('week', current_date)::date),
    ('워드프레스 블로그', '월간 글 발행',   'monthly', 20, 8, date_trunc('month', current_date)::date)
  ) as g(pname, label, period, target_count, current_count, period_start)
    on g.pname = i.name
  where not exists (
    select 1 from public.recurring_goals rg
    where rg.project_id = i.id and rg.label = g.label
  )
  returning 1
)
-- 3) progress_logs 삽입
insert into public.progress_logs (project_id, log_date, log_type, content)
select i.id, l.log_date, l.log_type, l.content
from ids i
join (values
  -- 오늘 로그는 분 단위 오프셋으로 둬서 시드 실행 시각과 무관하게 '오늘'에 들어오게 함
  ('쿠팡 체험단 리뷰', now() - interval '10 minutes', '작업', '주방 저울 개봉 및 사용 사진 촬영.'),
  ('쿠팡 체험단 리뷰', now() - interval '40 minutes', '작업', '무선 이어폰 리뷰 작성 완료 (이번 주 7번째).'),
  ('쿠팡 체험단 리뷰', now() - interval '1 day',   '작업', '텀블러 상품 수령, 사진 촬영 완료.'),
  ('쇼츠 채널 운영',   now() - interval '25 minutes', '작업', '신규 쇼츠 1편 업로드, 초기 반응 양호.'),
  ('쇼츠 채널 운영',   now() - interval '2 days',  '결정', '다음 주부터 주 5편 → 주 4편으로 페이스 조정.'),
  ('워드프레스 블로그', now() - interval '3 days',  '이슈', '애드센스 수익 정체. 키워드 리서치 다시 필요.')
) as l(pname, log_date, log_type, content)
  on l.pname = i.name
where not exists (
  select 1 from public.progress_logs pl
  where pl.project_id = i.id and pl.content = l.content
);
