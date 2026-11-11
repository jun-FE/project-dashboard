-- ============================================================
-- 쿠팡 로켓그로스 준비 (2026-11-12)
-- 프로젝트 상세 페이지 안의 탭: 준비 체크리스트 / 마진 계산 / 상품 후보
-- 재고·광고 탭은 판매를 시작할 때 테이블을 더한다.
-- ============================================================

-- 1) 준비 체크리스트 (단계 순서대로)
create table if not exists public.rg_checklist (
  id          uuid primary key default gen_random_uuid(),
  step_order  int  not null,
  title       text not null,
  detail      text,
  done        boolean not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- 2) 상품 후보: 마진 계산 입력값(inputs)과 결과(profit, margin_rate)를 같이 저장해 나란히 비교한다
create table if not exists public.rg_candidates (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text,
  status              text not null default '후보' check (status in ('후보', '판매 결정', '보류')),
  inputs              jsonb not null default '{}'::jsonb,   -- 마진 계산기 입력값 그대로
  sale_price          int,                                  -- 비교용으로 자주 보는 값은 칸으로도 둔다
  profit              int,                                  -- 개당 순이익 (원)
  margin_rate         numeric(5,2),                         -- 마진율 (%)
  competitor_price    int,
  competitor_reviews  int,
  competitor_url      text,
  memo                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists rg_candidates_set_updated_at on public.rg_candidates;
create trigger rg_candidates_set_updated_at
  before update on public.rg_candidates
  for each row execute function public.set_updated_at();

-- RLS: 다른 대시보드 테이블과 같이 로그인한 본인만
alter table public.rg_checklist  enable row level security;
alter table public.rg_candidates enable row level security;

drop policy if exists "owner full access" on public.rg_checklist;
create policy "owner full access" on public.rg_checklist
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

drop policy if exists "owner full access" on public.rg_candidates;
create policy "owner full access" on public.rg_candidates
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'craftttime@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'craftttime@gmail.com');

-- 3) 체크리스트 기본 단계 (일반적인 순서. 세부 조건은 쿠팡 Wing 안내로 확인)
insert into public.rg_checklist (step_order, title, detail)
select * from (values
  (1,  '사업자등록',              '홈택스에서 신청. 업태는 도소매, 종목은 전자상거래 소매업이 일반적. 일반과세/간이과세 선택은 예상 매출로 결정'),
  (2,  '사업자 통장·카드 준비',     '정산 받을 사업자 명의 계좌, 경비용 카드를 따로 두면 세금 정리가 쉬워진다'),
  (3,  '쿠팡 Wing 판매자 가입',     'wing.coupang.com 에서 사업자 정보로 가입'),
  (4,  '구매안전서비스 이용확인증 발급', 'Wing에서 발급. 통신판매업 신고 때 필요'),
  (5,  '통신판매업 신고',           '정부24 또는 구청에서 신고. 면허세 납부 후 신고증을 Wing에 등록'),
  (6,  '로켓그로스 이용 신청',       'Wing의 로켓그로스 메뉴에서 신청·계약. 입고 기준과 요율표를 이때 확인'),
  (7,  '카테고리 수수료·물류비 확인',  '판매 수수료율, 입출고비, 보관비를 요율표에서 찾아 마진 계산 탭의 기본값을 고친다'),
  (8,  '상품 후보 3개 이상 비교',     '마진 계산 탭에서 계산하고 상품 후보 탭에 저장해 나란히 비교'),
  (9,  '인증·규제 확인',            'KC 인증, 식품·화장품·전기용품 표시 기준, 수입 요건 등 해당 여부 확인'),
  (10, '샘플 주문·품질 확인',        '직접 써보고 사진과 상세페이지에 쓸 장단점을 메모'),
  (11, '상품 사진 촬영',             '대표 이미지, 구성품, 사용 장면, 크기 비교 컷'),
  (12, '상품명·검색어·상세페이지 준비', '과장 표현(최고, 1위, 효능 주장)은 빼고 사실 위주로'),
  (13, '바코드·포장 기준 맞추기',      '로켓그로스 입고 기준(바코드 부착, 포장 상태)을 확인하고 준비'),
  (14, '첫 입고 수량 정하기',         '처음엔 소량으로 판매 속도를 확인. 보관비가 붙기 전에 팔릴 양'),
  (15, '입고 예약·발송',             'Wing에서 입고 예약 후 지정 센터로 발송'),
  (16, '광고 예산 정하기',           '하루 예산과 손익분기 광고 효율(마진 계산 탭)을 기준으로 시작')
) as v(step_order, title, detail)
where not exists (select 1 from public.rg_checklist);

-- 4) 대시보드 프로젝트 (상세 페이지가 custom_fields.module 로 로켓그로스 탭을 띄운다)
insert into public.projects (name, description, category, status, progress, custom_fields)
select '쿠팡 로켓그로스', '쿠팡 로켓그로스 판매 준비와 운영', '커머스', 'active', 0, '{"module": "rocketgrowth"}'::jsonb
where not exists (select 1 from public.projects where custom_fields ->> 'module' = 'rocketgrowth');
