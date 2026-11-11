import { useState } from 'react'
import { won, type Candidate, type CandidateStatus } from '../../lib/rocketgrowth'

interface Props {
  candidates: Candidate[]
  onUpdate: (c: Candidate, patch: Partial<Candidate>) => void
  onRecalc: (c: Candidate) => void
  onDelete: (c: Candidate) => void
}

const STATUS_CLS: Record<CandidateStatus, string> = {
  후보: 'bg-slate-100 text-slate-700',
  '판매 결정': 'bg-emerald-50 text-emerald-700',
  보류: 'bg-amber-50 text-amber-700',
}

// 경쟁 상품 정보는 쿠팡 화면을 보고 직접 적는다 (쿠팡 자동 수집은 봇 탐지 위험이 있어 하지 않는다)
function NumberCell({ value, onSave, suffix }: { value: number | null; onSave: (v: number | null) => void; suffix?: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      type="number"
      inputMode="numeric"
      value={draft ?? (value ?? '')}
      placeholder="—"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return
        onSave(draft === '' ? null : Number(draft))
        setDraft(null)
      }}
      aria-label={suffix}
      className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-right tabular-nums outline-none hover:border-slate-200 focus:border-slate-400"
    />
  )
}

export default function CandidatesTab({ candidates, onUpdate, onRecalc, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
        아직 저장한 후보가 없어요. <strong className="text-slate-700">마진 계산</strong> 탭에서 계산한 뒤 상품 이름을 적고 "후보로 저장"을 누르면 여기 모여요.
      </div>
    )
  }

  // 마진율 높은 순, 보류는 아래로
  const rows = [...candidates].sort(
    (a, b) => Number(a.status === '보류') - Number(b.status === '보류') || (b.margin_rate ?? -999) - (a.margin_rate ?? -999),
  )

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">상품</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 text-right font-medium">판매가</th>
              <th className="px-3 py-2 text-right font-medium">개당 순이익</th>
              <th className="px-3 py-2 text-right font-medium">마진율</th>
              <th className="px-3 py-2 text-right font-medium">경쟁 최저가</th>
              <th className="px-3 py-2 text-right font-medium">경쟁 리뷰 수</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} className={c.status === '보류' ? 'text-slate-400' : ''}>
                <td className="px-3 py-2">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <input
                    defaultValue={c.memo ?? ''}
                    placeholder="메모"
                    onBlur={(e) => e.target.value !== (c.memo ?? '') && onUpdate(c, { memo: e.target.value || null })}
                    className="mt-0.5 block w-full rounded border border-transparent bg-transparent px-1 text-xs text-slate-500 outline-none hover:border-slate-200 focus:border-slate-400"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={c.status}
                    onChange={(e) => onUpdate(c, { status: e.target.value as CandidateStatus })}
                    aria-label={`${c.name} 상태`}
                    className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STATUS_CLS[c.status]}`}
                  >
                    {(['후보', '판매 결정', '보류'] as CandidateStatus[]).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{won(c.sale_price)}</td>
                <td className={`px-3 py-2 text-right font-medium tabular-nums ${(c.profit ?? 0) <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {won(c.profit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{c.margin_rate === null ? '—' : `${Number(c.margin_rate).toFixed(1)}%`}</td>
                <td className="px-3 py-2 text-right">
                  <NumberCell value={c.competitor_price} suffix="경쟁 최저가" onSave={(v) => onUpdate(c, { competitor_price: v })} />
                </td>
                <td className="px-3 py-2 text-right">
                  <NumberCell value={c.competitor_reviews} suffix="경쟁 리뷰 수" onSave={(v) => onUpdate(c, { competitor_reviews: v })} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                  <button onClick={() => onRecalc(c)} className="text-slate-500 hover:text-slate-900">
                    다시 계산
                  </button>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {confirmId === c.id ? (
                    <button onClick={() => onDelete(c)} className="font-medium text-rose-600">
                      정말 지우기
                    </button>
                  ) : (
                    <button onClick={() => setConfirmId(c.id)} className="text-slate-400 hover:text-rose-600">
                      지우기
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        경쟁 최저가와 리뷰 수는 쿠팡에서 같은 상품을 검색해 보고 직접 적어 주세요. 리뷰가 수천 개인 상품이 상위를 차지하고 있으면 새로 들어가기 어려워요.
      </p>
    </div>
  )
}
