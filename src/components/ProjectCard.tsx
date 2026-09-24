import { Link } from 'react-router-dom'
import type { Project, RecurringGoal, ProgressLog } from '../types'
import { relativeTime } from '../lib/format'
import { categoryClass, STATUS_META } from '../lib/labels'
import TodayWork from './TodayWork'

interface Props {
  project: Project
  goals: RecurringGoal[]
  todayLogs: ProgressLog[]
  pendingItems?: { queued: number; drafted: number }
}

export default function ProjectCard({ project, goals, todayLogs, pendingItems }: Props) {
  const status = STATUS_META[project.status]

  return (
    <Link
      to={`/project/${project.id}`}
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      {/* 헤더: 이름 + 상태 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {/* 카테고리 */}
      {project.category && (
        <div className="mt-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryClass(project.category)}`}>
            {project.category}
          </span>
        </div>
      )}

      {/* 설명 한 줄 */}
      {project.description && (
        <p className="mt-2 line-clamp-1 text-sm text-slate-500">{project.description}</p>
      )}

      {/* 진행률 */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>진행률</span>
          <span className="tabular-nums">{project.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-800 transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* 정기 목표 */}
      {goals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {goals.map((g) => (
            <span key={g.id} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
              {g.label}{' '}
              <span className="font-semibold tabular-nums text-slate-800">
                {g.current_count}/{g.target_count}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* 남은 작업물 */}
      {pendingItems && (pendingItems.drafted > 0 || pendingItems.queued > 0) && (
        <p className="mt-3 text-xs text-slate-500">
          {pendingItems.drafted > 0 && (
            <span className="mr-2 font-medium text-amber-700">📤 올릴 차례 {pendingItems.drafted}</span>
          )}
          {pendingItems.queued > 0 && <span>⏳ 초안 대기 {pendingItems.queued}</span>}
        </p>
      )}

      {/* 오늘 한 일 */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <TodayWork logs={todayLogs} />
      </div>

      <p className="mt-3 text-xs text-slate-400">{relativeTime(project.updated_at)} 업데이트</p>
    </Link>
  )
}
