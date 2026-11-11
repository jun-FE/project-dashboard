import { useEffect, useState } from 'react'
import {
  calcMargin,
  deleteCandidate,
  fetchCandidates,
  fetchChecklist,
  saveCandidate,
  setStepDone,
  type Candidate,
  type ChecklistStep,
  type MarginInputs,
} from '../../lib/rocketgrowth'
import ChecklistTab from './ChecklistTab'
import MarginTab from './MarginTab'
import CandidatesTab from './CandidatesTab'

// 쿠팡 로켓그로스 프로젝트 상세 영역. 지금은 준비 단계 탭 3개, 재고·광고 탭은 판매를 시작하면 더한다.
type Tab = 'checklist' | 'margin' | 'candidates'

interface Props {
  onProgress: (percent: number) => void // 체크리스트 진행률을 프로젝트 진행률(대시보드 카드)에 반영
}

export default function RocketGrowth({ onProgress }: Props) {
  const [tab, setTab] = useState<Tab>('checklist')
  const [steps, setSteps] = useState<ChecklistStep[] | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [recalc, setRecalc] = useState<{ candidate: Candidate } | null>(null)

  useEffect(() => {
    Promise.all([fetchChecklist(), fetchCandidates()])
      .then(([s, c]) => {
        setSteps(s)
        setCandidates(c)
      })
      .catch((e) => setError(e.message ?? '불러오지 못했어요.'))
  }, [])

  const percent = (list: ChecklistStep[]) => (list.length ? Math.round((list.filter((s) => s.done).length / list.length) * 100) : 0)

  async function toggleStep(step: ChecklistStep) {
    const next = (steps ?? []).map((s) => (s.id === step.id ? { ...s, done: !s.done } : s))
    setSteps(next)
    try {
      await setStepDone(step.id, !step.done)
      onProgress(percent(next))
    } catch (e) {
      setSteps(steps)
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  async function saveFromCalculator(name: string, inputs: MarginInputs, existing?: Candidate) {
    const r = calcMargin(inputs)
    const row = await saveCandidate({
      ...(existing ? { id: existing.id } : {}),
      name,
      inputs,
      sale_price: Math.round(inputs.salePrice),
      profit: Math.round(r.profit),
      margin_rate: Math.round(r.marginRate * 100) / 100,
    })
    setCandidates((cs) => (existing ? cs.map((c) => (c.id === row.id ? row : c)) : [row, ...cs]))
    setRecalc(null)
  }

  async function updateCandidate(c: Candidate, patch: Partial<Candidate>) {
    setCandidates((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))
    try {
      await saveCandidate({ id: c.id, ...patch })
    } catch (e) {
      setCandidates((cs) => cs.map((x) => (x.id === c.id ? c : x)))
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  async function removeCandidate(c: Candidate) {
    setCandidates((cs) => cs.filter((x) => x.id !== c.id))
    try {
      await deleteCandidate(c.id)
    } catch (e) {
      setCandidates((cs) => [c, ...cs])
      alert(`지우지 못했어요: ${(e as Error).message}`)
    }
  }

  const tabs: { key: Tab; label: string; badge?: string }[] = [
    { key: 'checklist', label: '준비', badge: steps ? `${steps.filter((s) => s.done).length}/${steps.length}` : undefined },
    { key: 'margin', label: '마진 계산' },
    { key: 'candidates', label: '상품 후보', badge: candidates.length ? String(candidates.length) : undefined },
  ]

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        로켓그로스 데이터를 불러오지 못했어요: {error}
        <span className="mt-1 block text-rose-500">supabase/08_rocketgrowth.sql 이 적용됐는지 확인하세요.</span>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm transition ${
              tab === t.key ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
            {t.badge && <span className="ml-1.5 tabular-nums text-xs text-slate-400">{t.badge}</span>}
          </button>
        ))}
        <span className="ml-auto self-center whitespace-nowrap px-2 pb-2 text-xs text-slate-400">재고·광고 탭은 판매 시작 후</span>
      </div>
      <div className="p-5">
        {!steps ? (
          <p className="text-sm text-slate-400">불러오는 중…</p>
        ) : tab === 'checklist' ? (
          <ChecklistTab steps={steps} onToggle={toggleStep} />
        ) : tab === 'margin' ? (
          <MarginTab key={recalc?.candidate.id ?? 'new'} initial={recalc} onSave={saveFromCalculator} />
        ) : (
          <CandidatesTab
            candidates={candidates}
            onUpdate={updateCandidate}
            onDelete={removeCandidate}
            onRecalc={(c) => {
              setRecalc({ candidate: c })
              setTab('margin')
            }}
          />
        )}
      </div>
    </section>
  )
}
