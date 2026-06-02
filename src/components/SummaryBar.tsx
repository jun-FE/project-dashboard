import type { Project, RecurringGoal } from '../types'

interface Props {
  projects: Project[]
  goalsByProject: Record<string, RecurringGoal[]>
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default function SummaryBar({ projects, goalsByProject }: Props) {
  const activeCount = projects.filter((p) => p.status === 'active').length

  // 이번 주 전체 목표 달성률 = 모든 weekly 목표의 (현재 합 / 목표 합)
  const weeklyGoals = Object.values(goalsByProject)
    .flat()
    .filter((g) => g.period === 'weekly')
  const targetSum = weeklyGoals.reduce((s, g) => s + g.target_count, 0)
  const currentSum = weeklyGoals.reduce((s, g) => s + g.current_count, 0)
  const weeklyRate = targetSum > 0 ? Math.round((currentSum / targetSum) * 100) : 0

  // 최근 업데이트된 프로젝트 (projects는 updated_at desc 정렬로 들어옴)
  const recent = projects[0]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Stat label="진행 중 프로젝트" value={`${activeCount}개`} sub={`전체 ${projects.length}개`} />
      <Stat
        label="이번 주 목표 달성률"
        value={`${weeklyRate}%`}
        sub={targetSum > 0 ? `${currentSum}/${targetSum} 완료` : '주간 목표 없음'}
      />
      <Stat
        label="최근 업데이트"
        value={recent ? recent.name : '—'}
      />
    </div>
  )
}
