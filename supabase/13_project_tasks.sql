-- ============================================================
-- 프로젝트 체크리스트 (범용) + DigDown 출시 프로젝트 (2026-11-16)
-- custom_fields.module = 'launch' 인 프로젝트는 상세 페이지에 이 체크리스트가 나온다.
-- 진행률 = counts=true 항목 중 완료 비율 (출시 후 항목은 counts=false 로 진행률에서 뺀다)
-- 원본: ~/m-game/DigDown/NEXT_STEPS.md (2026-11-16 기준으로 옮김). 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists public.project_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  section     text not null,
  sort        int  not null default 0,
  title       text not null,
  detail      text,
  who         text check (who in ('me', 'claude')),   -- 🙋 내가 / 🤖 Claude
  counts      boolean not null default true,          -- 진행률에 넣을지
  done        boolean not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists project_tasks_project_idx on public.project_tasks (project_id, sort);

alter table public.project_tasks enable row level security;

drop policy if exists "owner full access" on public.project_tasks;
create policy "owner full access" on public.project_tasks
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

revoke all on public.project_tasks from anon;

-- DigDown 프로젝트
insert into public.projects (name, description, category, status, custom_fields)
select 'DigDown 게임 출시',
       '땅을 파서 유물을 모으고 박물관을 키우는 모바일 게임 (Unity, Android 먼저). 원본 체크리스트: ~/m-game/DigDown/NEXT_STEPS.md',
       '게임', 'active',
       jsonb_build_object(
         'module', 'launch',
         'note', '출시 날짜를 정하는 건 Google Play 대기 시간이에요. 개인 개발자 계정은 정식 출시 전에 테스터 12명 이상 × 14일 비공개 테스트가 필요해요 (정책은 계정 만들 때 Play Console에서 다시 확인). 계정부터 만들면 빨라도 약 3주.'
       )
where not exists (select 1 from public.projects where name = 'DigDown 게임 출시');

-- 항목 (처음 한 번만 넣는다)
insert into public.project_tasks (project_id, section, sort, title, detail, who, counts, done)
select p.id, t.section, t.sort, t.title, t.detail, t.who, t.counts, t.done
  from public.projects p,
  (values
    ('Google Play',     10, 'Play Console 개발자 계정 만들기', '1회 $25, 본인 인증에 며칠 걸릴 수 있음. 승인 대기가 길어서 가장 먼저', 'me', true, false),
    ('Google Play',     11, '앱 만들고 대상 연령 13세 이상으로', 'LevelPlay 설정(일반 연령, COPPA Not directed)과 똑같이', 'me', true, false),
    ('Google Play',     12, '인앱 상품 9개 등록 (ID 똑같이)', 'remove_ads ₩6,600(비소모) · bomb_pack_10 ₩1,200 · boost_dig_1h ₩1,200 · boost_museum_1h ₩1,200 · boost_all_3h ₩3,300 · gold_sack ₩2,500 · gems_10 ₩2,500 · gems_30 ₩6,600 · gems_70 ₩13,000', 'me', true, false),
    ('Google Play',     13, '데이터 보안 양식 작성', '답변 초안은 Claude가 씀', 'me', true, false),
    ('Google Play',     14, '개인정보처리방침 인터넷에 올리기', '광고 SDK를 쓰면 필수. 초안은 Claude가 씀', 'me', true, false),
    ('Google Play',     15, '비공개 테스트 시작 (테스터 12명 × 14일)', '테스터 모으기. 이 기간이 출시 일정을 정한다', 'me', true, false),
    ('Google Play',     16, '테스트 계정으로 실제 광고·결제 확인', '', 'me', true, false),
    ('Google Play',     17, '정식 출시 신청', '', 'me', true, false),

    ('광고 (LevelPlay)', 20, '광고·결제 SDK 설치하고 코드 연결', 'LevelPlay 9.6, Unity IAP 5.5', 'claude', true, true),
    ('광고 (LevelPlay)', 21, 'LevelPlay에 앱 등록, 광고 단위 2개', '보상형·전면 키 코드에 입력 완료', 'me', true, true),
    ('광고 (LevelPlay)', 22, '대상 연령 결정', '일반 연령 (어린이 대상 아님)', 'me', true, true),
    ('광고 (LevelPlay)', 23, '패키지 이름 확정', 'com.crafttime.digdown', 'me', true, true),
    ('광고 (LevelPlay)', 24, '테스트 기기 등록 (플립7)', '', 'me', true, true),
    ('광고 (LevelPlay)', 25, '"Your account is restricted" 풀기', '회사·정산 정보 채우고 며칠 대기. 계속되면 지원팀 문의 (광고 연결 자체는 문제없음)', 'me', true, false),

    ('빌드',             30, '테스트 APK 만들기', 'Builds/DigDown-test.apk', 'claude', true, true),
    ('빌드',             31, '앱 아이콘·스플래시·타이틀 흐름', '', 'claude', true, true),
    ('빌드',             32, '펀치홀 여백', '', 'claude', true, true),
    ('빌드',             33, '서명 키(keystore) + 출시용 .aab 빌드', '', 'claude', true, false),

    ('폰 테스트·의견 반영', 40, '플립7 첫 설치 확인 (11/10)', '광고 잘 나옴', 'me', true, true),
    ('폰 테스트·의견 반영', 41, '의견 10가지 반영 → v1.0.1', '', 'claude', true, true),
    ('폰 테스트·의견 반영', 42, '의견 8가지 반영 → v1.0.2 (11/12)', '전시관 순차 개관, 관별 발굴 방식 3종 등', 'claude', true, true),
    ('폰 테스트·의견 반영', 43, '의견 5가지 반영 → v1.0.3 (11/13)', '엘리베이터, 재질 순서, 전면 광고 늘림 등', 'claude', true, true),
    ('폰 테스트·의견 반영', 44, '코스튬 추가 → v1.0.4 (11/13)', '다이아, 옷가게, 옷 7종, 무기 모양 2종', 'claude', true, true),
    ('폰 테스트·의견 반영', 45, '11/16 의견 반영', '콤보·러시·피버 타임, 조각 맞추기 천 등', 'claude', true, true),
    ('폰 테스트·의견 반영', 46, '11/16 반영분으로 새 APK 만들기', '', 'claude', true, false),
    ('폰 테스트·의견 반영', 47, '최신 APK로 밀린 확인 한 번에', '펀치홀 띠·아이콘·박물관 버튼 / 조각 맞추기·망치 타이밍·흔들리는 지반 / 전면 광고 빈도·엘리베이터·골드 2배 / 옷가게·공룡옷·우주복·색 바꾸기', 'me', true, false),
    ('폰 테스트·의견 반영', 48, '기본 동작 확인', '진동, 30/60fps, 화면 비율, 껐다 켜도 세이브, 오프라인 수익, 광고 보상, 광고 중 소리 멈춤', 'me', true, false),
    ('폰 테스트·의견 반영', 49, '밸런스 플레이 소감 → 수치 조정', '무기 진화 속도, 드릴 손맛, Lv50 이후 강화 가격', 'me', true, false),

    ('소리',             50, '배경음악 2곡 (박물관, 발굴) + 발굴 비트 120 BPM', '', 'claude', true, false),
    ('소리',             51, '효과음 15종 교체', '지금은 코드로 합성한 임시 소리', 'claude', true, false),

    ('스토어 자료',       60, '앱 아이콘, 피처 그래픽, 스플래시', '', 'claude', true, true),
    ('스토어 자료',       61, '스토어 스크린샷 6장', 'Screenshots/store/', 'claude', true, true),
    ('스토어 자료',       62, '스토어 설명문 (짧은 설명 80자 + 긴 설명)', '', 'claude', true, false),
    ('스토어 자료',       63, '개인정보처리방침 초안', '', 'claude', true, false),
    ('스토어 자료',       64, '데이터 보안 양식 답변 초안', '', 'claude', true, false),

    ('다국어',           70, '지원 언어 정하기 → 영어 먼저', '', 'me', true, true),
    ('다국어',           71, '번역 구조 + 영어 번역표 + 언어 선택', 'Loc.cs, LocEn.cs (306문장)', 'claude', true, true),
    ('다국어',           72, '8개 언어 추가 (총 10개)', '일·중(간체·번체)·스·포·프·독·러', 'claude', true, true),
    ('다국어',           73, '언어별 스토어 설명·스크린샷 문구', '', 'claude', true, false),
    ('다국어',           74, '번역 감수', '최소한 영어 프롤로그·엔딩 대사. 원어민 확인 권장', 'me', true, false),

    ('출시 후',          90, '클라우드 저장', '지금은 폰 안에만 저장 → 폰을 바꾸면 기록이 사라짐', 'claude', false, false),
    ('출시 후',          91, '무기 진화 안내 말풍선', '', 'claude', false, false),
    ('출시 후',          92, '세이브 정리 (옛 무기 필드)', '', 'claude', false, false),
    ('출시 후',          93, 'iOS: LevelPlay 등록 → 키 교체', '', 'me', false, false),
    ('출시 후',          94, '기간 한정 특별전, 방명록, 박물관 등급', '', 'claude', false, false)
  ) as t(section, sort, title, detail, who, counts, done)
 where p.name = 'DigDown 게임 출시'
   and not exists (select 1 from public.project_tasks x where x.project_id = p.id);

-- 진행률 맞추기
update public.projects p
   set progress = coalesce((select round(100.0 * count(*) filter (where done) / nullif(count(*), 0))
                              from public.project_tasks t where t.project_id = p.id and t.counts), 0)
 where p.name = 'DigDown 게임 출시';

update public.project_tasks set done_at = now() where done and done_at is null;
