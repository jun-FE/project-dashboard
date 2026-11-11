import { supabase } from './supabase'

// 쿠팡 로켓그로스 준비 탭 (테이블 정의: supabase/08_rocketgrowth.sql)

export interface ChecklistStep {
  id: string
  step_order: number
  title: string
  detail: string | null
  done: boolean
  done_at: string | null
}

export type CandidateStatus = '후보' | '판매 결정' | '보류'

export interface MarginInputs {
  salePrice: number // 판매가 (부가세 포함)
  cost: number // 개당 매입 원가 (부가세 포함)
  inboundShip: number // 개당 입고 배송비
  feeRate: number // 판매 수수료율 %
  fulfillmentFee: number // 개당 입출고비
  storageFee: number // 개당 한 달 보관비
  storageMonths: number // 팔릴 때까지 예상 보관 개월
  returnRate: number // 반품률 %
  returnCost: number // 반품 1건당 손실
  adRate: number // 매출 대비 광고비 %
  generalTax: boolean // 일반과세자면 부가세를 대략 빼서 본다
}

export interface Candidate {
  id: string
  name: string
  category: string | null
  status: CandidateStatus
  inputs: Partial<MarginInputs>
  sale_price: number | null
  profit: number | null
  margin_rate: number | null
  competitor_price: number | null
  competitor_reviews: number | null
  competitor_url: string | null
  memo: string | null
  created_at: string
}

// 수수료·물류비는 카테고리·크기마다 다르고 자주 바뀐다. 아래는 화면을 채우기 위한 예시값이라
// 체크리스트 7번(요율표 확인) 때 실제 값으로 바꿔 쓴다.
export const DEFAULT_INPUTS: MarginInputs = {
  salePrice: 19900,
  cost: 6000,
  inboundShip: 300,
  feeRate: 10.8,
  fulfillmentFee: 2500,
  storageFee: 200,
  storageMonths: 1,
  returnRate: 3,
  returnCost: 5000,
  adRate: 10,
  generalTax: true,
}

export interface MarginResult {
  fee: number
  storage: number
  returnLoss: number
  ad: number
  vat: number
  totalCost: number
  profit: number
  marginRate: number
  breakEvenRoas: number | null // 광고비 대비 매출(%)이 이 값 이상이어야 손해가 아니다
}

// 개당 계산. 부가세는 "모든 비용에 세금계산서가 있다"고 보고 (판매가 − 비용) / 11 로 대략 잡는다.
export function calcMargin(i: MarginInputs): MarginResult {
  const fee = (i.salePrice * i.feeRate) / 100
  const storage = i.storageFee * i.storageMonths
  const returnLoss = (i.returnCost * i.returnRate) / 100
  const ad = (i.salePrice * i.adRate) / 100
  const beforeAd = i.cost + i.inboundShip + fee + i.fulfillmentFee + storage + returnLoss
  const vatOf = (costs: number) => (i.generalTax ? Math.max(0, i.salePrice - costs) / 11 : 0)
  const vat = vatOf(beforeAd + ad)
  const profit = i.salePrice - beforeAd - ad - vat
  const profitNoAd = i.salePrice - beforeAd - vatOf(beforeAd)
  return {
    fee,
    storage,
    returnLoss,
    ad,
    vat,
    totalCost: beforeAd + ad + vat,
    profit,
    marginRate: i.salePrice > 0 ? (profit / i.salePrice) * 100 : 0,
    breakEvenRoas: profitNoAd > 0 ? (i.salePrice / profitNoAd) * 100 : null,
  }
}

export const won = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : `${Math.round(n).toLocaleString('ko-KR')}원`

// ---------------------------------------------------------------- 데이터

export async function fetchChecklist(): Promise<ChecklistStep[]> {
  const { data, error } = await supabase.from('rg_checklist').select('*').order('step_order')
  if (error) throw error
  return (data ?? []) as ChecklistStep[]
}

export async function setStepDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('rg_checklist')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function fetchCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase.from('rg_candidates').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Candidate[]
}

export async function saveCandidate(row: Partial<Candidate>): Promise<Candidate> {
  const query = row.id
    ? supabase.from('rg_candidates').update(row).eq('id', row.id).select().single()
    : supabase.from('rg_candidates').insert(row).select().single()
  const { data, error } = await query
  if (error) throw error
  return data as Candidate
}

export async function deleteCandidate(id: string): Promise<void> {
  const { error } = await supabase.from('rg_candidates').delete().eq('id', id)
  if (error) throw error
}
