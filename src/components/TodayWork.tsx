import type { ProgressLog } from '../types'
import { timeOfDay } from '../lib/format'
import { logTypeClass } from '../lib/labels'

// 카드 안 "오늘 한 일": 건수 + 최근 한 줄, 호버 시 오늘 로그 전체 팝업.
export default function TodayWork({ logs }: { logs: ProgressLog[] }) {
  if (logs.length === 0) {
    return <p className="text-xs text-slate-400">오늘 기록 없음</p>
  }

  const latest = logs[0]

  return (
    <div className="group relative">
      <p className="cursor-default text-xs text-slate-600">
        <span className="font-medium text-slate-700">오늘 {logs.length}건</span>
        <span className="text-slate-400"> · </span>
        <span className="text-slate-500">{latest.content}</span>
      </p>

      {/* 호버 팝업 */}
      <div className="invisible absolute bottom-full left-0 z-10 mb-2 w-72 origin-bottom-left rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
        <p className="mb-2 text-xs font-semibold text-slate-500">오늘 한 일 ({logs.length})</p>
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="flex gap-2 text-xs">
              <span className="shrink-0 tabular-nums text-slate-400">{timeOfDay(log.log_date)}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${logTypeClass(log.log_type)}`}
              >
                {log.log_type}
              </span>
              <span className="text-slate-700">{log.content}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
