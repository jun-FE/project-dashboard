import type { ChecklistStep } from '../../lib/rocketgrowth'

interface Props {
  steps: ChecklistStep[]
  onToggle: (step: ChecklistStep) => void
}

// 준비 단계를 순서대로. 체크하면 프로젝트 진행률이 같이 올라간다.
export default function ChecklistTab({ steps, onToggle }: Props) {
  const done = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)
  // 단계(phase)별로 묶는다. 순서는 step_order 를 따른다.
  const groups: [string, ChecklistStep[]][] = []
  for (const s of steps) {
    const last = groups[groups.length - 1]
    if (last && last[0] === (s.phase ?? '')) last[1].push(s)
    else groups.push([s.phase ?? '', [s]])
  }
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
      {groups.map(([phase, items]) => {
        const groupDone = items.filter((s) => s.done).length
        return (
          <div key={phase}>
            {phase && (
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-700">{phase}</h3>
                <span className={`text-xs tabular-nums ${groupDone === items.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {groupDone} / {items.length}
                </span>
              </div>
            )}
            <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {items.map((s) => (
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
          </div>
        )
      })}
      <p className="text-xs text-slate-400">샘플은 개인으로, 대량주문은 사업자등록·Wing 가입·요율 확인을 마친 뒤 사업자 명의로. 세부 조건과 서류는 쿠팡 Wing 안내를 기준으로 확인하세요.</p>
    </div>
  )
}
