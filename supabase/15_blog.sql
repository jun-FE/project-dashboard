-- ============================================================
-- 워드프레스 블로그(latteinseoul.com) 운영 화면 (2026-11-26)
-- - blog_status: 맥미니 블로그 봇이 1시간마다 워드프레스 상태(발행 수·발행 대기 초안)를 올린다.
--   봇은 secret 키로 쓰고(RLS 우회), 대시보드는 로그인한 본인만 읽는다.
-- - 숨겨져 있던 예시 프로젝트 '워드프레스 블로그'를 실제 운영 프로젝트로 바꾸고 체크리스트를 넣는다.
-- 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists public.blog_status (
  site        text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.blog_status enable row level security;
drop policy if exists "owner full access" on public.blog_status;
create policy "owner full access" on public.blog_status
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');
revoke all on public.blog_status from anon;

-- 예시 숫자(가짜)를 지우고 실제 프로젝트로
update public.projects
   set name = 'latteinseoul.com 블로그',
       description = '쿠팡 리뷰·맛집을 영어·일본어 글로. 블로그 봇이 매일 05:00 초안을 쓰고, 발행은 내가 직접. 목표: 애드센스 승인',
       category = '콘텐츠', status = 'active', hidden = false,
       custom_fields = jsonb_build_object(
         'module', 'blog',
         'note', '애드센스는 11/8 2차 거절(가치 없는 콘텐츠). 꾸준히 발행한 기록을 2~3주 더 쌓고 12/1~5에 재신청. 12/1 10시에 메모봇 알림 걸려 있음.')
 where name in ('워드프레스 블로그', 'latteinseoul.com 블로그');

insert into public.project_tasks (project_id, section, sort, title, detail, who, counts, done)
select p.id, t.section, t.sort, t.title, t.detail, t.who, t.counts, t.done
  from public.projects p,
  (values
    ('애드센스 재신청', 10, '장보기 가이드 발행 (EN 574 / JA 576)', '얇은 식재료 글 6개 상품(12편)을 가이드 하나로 합침', 'me', true, true),
    ('애드센스 재신청', 11, '가이드로 합친 글 8편 임시저장으로 내리기', '316·317·323·324·341·342·348·349. 가이드 발행 뒤 내리기로 한 것', 'claude', true, false),
    ('애드센스 재신청', 12, '일본어 메뉴 위치 지정', '관리자 → 외모 → 메뉴. Polylang 언어별 위치는 API로 안 됨. 영어(110)는 지정돼 있고 일본어(111) 확인', 'me', true, false),
    ('애드센스 재신청', 13, '발행 대기 초안 꾸준히 발행', '하루 1~2편씩. 매일 발행한 기록이 재신청에 중요', 'me', true, false),
    ('애드센스 재신청', 14, '애드센스 재신청 (12/1~5)', '', 'me', true, false),

    ('사이트 정리',     20, '사이트 제목·소개·About(영·일)', '', 'claude', true, true),
    ('사이트 정리',     21, '대표 이미지 넣기', '', 'claude', true, true),
    ('사이트 정리',     22, '댓글 닫기 + 스팸 821개 정리', '', 'claude', true, true),
    ('사이트 정리',     23, '예전 글 제목 25개·짧은 글 10개 보강', '', 'claude', true, true),
    ('사이트 정리',     24, '주 메뉴 만들기 (EN 110, JA 111)', '', 'claude', true, true),
    ('사이트 정리',     25, '빈 카테고리 ''韓国グルメ''(61) 정리', '', 'claude', true, true),
    ('사이트 정리',     26, '워드프레스·플러그인 업데이트', '관리자 → 업데이트', 'me', true, false),

    ('나중에',          90, '네이버 블로그 살리기 (blog.naver.com/dudwnsab)', '맛집 한국어 초안을 PC 에디터에 붙여넣기. 체험단 목표', 'me', false, false)
  ) as t(section, sort, title, detail, who, counts, done)
 where p.name = 'latteinseoul.com 블로그'
   and not exists (select 1 from public.project_tasks x where x.project_id = p.id);

update public.projects p
   set progress = coalesce((select round(100.0 * count(*) filter (where done) / nullif(count(*), 0))
                              from public.project_tasks t where t.project_id = p.id and t.counts), 0)
 where p.name = 'latteinseoul.com 블로그';

update public.project_tasks set done_at = now() where done and done_at is null;
