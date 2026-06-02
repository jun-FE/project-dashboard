import type { RecurringGoal } from '../types'

function periodLabel(period: RecurringGoal['period']): string {
  return period === 'weekly' ? '주간' : '월간'
}

export default function GoalTracker({ goals }: { goals: RecurringGoal[] }) {
  if (goals.length === 0) {
    return <p className="text-sm text-slate-400">설정된 정기 목표가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      {goals.map((g) => {
        const pct = g.target_count > 0 ? Math.min(100, Math.round((g.current_count / g.target_count) * 100)) : 0
        const done = g.current_count >= g.target_count && g.target_count > 0
        return (
          <div key={g.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-700">
                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {periodLabel(g.period)}
                </span>
                {g.label}
              </span>
              <span className="tabular-nums font-semibold text-slate-800">
                {g.current_count}/{g.target_count}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-slate-800'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">집계 시작 {g.period_start}</p>
          </div>
        )
      })}
    </div>
  )
}
