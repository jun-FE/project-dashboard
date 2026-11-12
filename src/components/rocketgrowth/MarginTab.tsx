import { useMemo, useState } from 'react'
import { calcMargin, DEFAULT_INPUTS, won, type Candidate, type MarginInputs } from '../../lib/rocketgrowth'

interface Props {
  // 상품 후보에서 "다시 계산"으로 넘어오면 그 값으로 시작한다
  initial?: { candidate: Candidate } | null
  onSave: (name: string, inputs: MarginInputs, existing?: Candidate) => Promise<void>
}

type NumKey = Exclude<keyof MarginInputs, 'generalTax'>

const FIELDS: { key: NumKey; label: string; unit: string; hint?: string }[] = [
  { key: 'salePrice', label: '판매가', unit: '원', hint: '부가세 포함' },
  { key: 'cost', label: '매입 원가', unit: '원', hint: '개당, 부가세 포함' },
  { key: 'inboundShip', label: '입고 배송비', unit: '원', hint: '센터까지 보내는 비용 ÷ 수량' },
  { key: 'feeRate', label: '판매 수수료율', unit: '%', hint: '카테고리별 요율표' },
  { key: 'fulfillmentFee', label: '입출고비', unit: '원', hint: '개당, 크기·가격별 요율표' },
  { key: 'storageFee', label: '보관비', unit: '원/월', hint: '개당 한 달' },
  { key: 'storageMonths', label: '예상 보관 기간', unit: '개월', hint: '팔릴 때까지' },
  { key: 'returnRate', label: '반품률', unit: '%' },
  { key: 'returnCost', label: '반품 1건 손실', unit: '원', hint: '회수비·재판매 불가 등' },
  { key: 'adRate', label: '광고비 비중', unit: '%', hint: '매출 대비' },
]

function Row({ label, value, strong, negative }: { label: string; value: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${negative ? 'text-rose-600' : ''}`}>{value}</span>
    </div>
  )
}

export default function MarginTab({ initial, onSave }: Props) {
  const [inputs, setInputs] = useState<MarginInputs>({ ...DEFAULT_INPUTS, ...(initial?.candidate.inputs ?? {}) })
  const [name, setName] = useState(initial?.candidate.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const r = useMemo(() => calcMargin(inputs), [inputs])

  const set = (key: NumKey, v: string) => setInputs((i) => ({ ...i, [key]: v === '' ? 0 : Number(v) }))

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), inputs, initial?.candidate)
      setSaved(name.trim())
    } catch (e) {
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
    setSaving(false)
  }

  const verdict =
    r.profit <= 0 ? { text: '팔수록 손해예요', cls: 'bg-rose-50 text-rose-700' }
      : r.marginRate < 15 ? { text: '마진이 얇아요', cls: 'bg-amber-50 text-amber-700' }
        : { text: '해볼 만해요', cls: 'bg-emerald-50 text-emerald-700' }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="grid grid-cols-[1fr_8.5rem] items-center gap-3 text-sm">
            <span className="text-slate-700">
              {f.label}
              {f.hint && <span className="block text-xs text-slate-400">{f.hint}</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <input
                id={`rg-${f.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={f.unit === '%' || f.unit === '개월' ? 0.1 : 100}
                value={inputs[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-right tabular-nums outline-none focus:border-slate-500"
              />
              <span className="w-10 shrink-0 text-xs text-slate-400">{f.unit}</span>
            </span>
          </label>
        ))}
        <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={inputs.generalTax}
            onChange={(e) => setInputs((i) => ({ ...i, generalTax: e.target.checked }))}
            className="h-4 w-4 accent-slate-900"
          />
          일반과세자 (부가세를 대략 빼서 계산)
        </label>
        <p className="text-xs leading-relaxed text-slate-400">
          수수료·입출고비·보관비 기본값은 예시예요. 로켓그로스 요율표(체크리스트 10번)를 보고 실제 값으로 바꿔 주세요.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">개당 순이익</p>
              <p className={`text-2xl font-semibold tabular-nums ${r.profit <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>{won(r.profit)}</p>
              <p className="text-sm tabular-nums text-slate-500">마진율 {r.marginRate.toFixed(1)}%</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${verdict.cls}`}>{verdict.text}</span>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-2">
            <Row label="판매가" value={won(inputs.salePrice)} />
            <Row label="− 매입 원가" value={won(inputs.cost)} />
            <Row label="− 입고 배송비" value={won(inputs.inboundShip)} />
            <Row label={`− 판매 수수료 (${inputs.feeRate}%)`} value={won(r.fee)} />
            <Row label="− 입출고비" value={won(inputs.fulfillmentFee)} />
            <Row label={`− 보관비 (${inputs.storageMonths}개월)`} value={won(r.storage)} />
            <Row label={`− 반품 손실 (${inputs.returnRate}%)`} value={won(r.returnLoss)} />
            <Row label={`− 광고비 (${inputs.adRate}%)`} value={won(r.ad)} />
            {inputs.generalTax && <Row label="− 부가세 (대략)" value={won(r.vat)} />}
            <div className="mt-1 border-t border-slate-100 pt-1">
              <Row label="= 개당 순이익" value={won(r.profit)} strong negative={r.profit <= 0} />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          {r.breakEvenRoas === null ? (
            <p>광고 없이도 남는 게 없어요. 판매가나 원가부터 다시 봐야 해요.</p>
          ) : (
            <p>
              손익분기 광고 효율(ROAS) <strong className="tabular-nums text-slate-900">{Math.ceil(r.breakEvenRoas)}%</strong>
              <span className="mt-1 block text-xs text-slate-500">
                광고비 1만 원으로 매출이 {won((r.breakEvenRoas / 100) * 10000)} 넘게 나와야 광고가 손해가 아니에요.
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            id="rg-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(null)
            }}
            placeholder="상품 이름"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-40"
          >
            {initial ? '후보 고치기' : '후보로 저장'}
          </button>
        </div>
        {saved && <p className="text-xs text-emerald-700">'{saved}'을(를) 상품 후보에 저장했어요.</p>}
      </div>
    </div>
  )
}
