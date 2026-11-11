import type { ChecklistStep } from '../../lib/rocketgrowth'

interface Props {
  steps: ChecklistStep[]
  onToggle: (step: ChecklistStep) => void
}

// 준비 단계를 순서대로. 체크하면 프로젝트 진행률이 같이 올라간다.
export default function ChecklistTab({ steps, onToggle }: Props) {
  const done = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-slate-600">
          {done === steps.length ? '준비를 모두 마쳤어요.' : <>다음 할 일: <strong className="text-slate-900">{next?.title}</strong></>}
        </p>
        <span className="text-sm tabular-nums text-slate-500">
          {done} / {steps.length}
        </span>
      </div>
      <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {steps.map((s) => (
          <li key={s.id}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => onToggle(s)}
                className="mt-1 h-4 w-4 shrink-0 accent-slate-900"
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${s.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  <span className="mr-2 tabular-nums text-slate-400">{s.step_order}.</span>
                  {s.title}
                </span>
                {s.detail && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{s.detail}</span>}
              </span>
            </label>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-400">일반적인 순서예요. 세부 조건과 서류는 쿠팡 Wing 안내를 기준으로 확인하세요.</p>
    </div>
  )
}
