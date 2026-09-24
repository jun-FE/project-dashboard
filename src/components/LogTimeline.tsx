import type { ProgressLog } from '../types'
import { dateTime } from '../lib/format'
import { logTypeClass } from '../lib/labels'

// onDelete 가 있으면 호버 시 삭제 버튼을 보여준다.
export default function LogTimeline({
  logs,
  onDelete,
}: {
  logs: ProgressLog[]
  onDelete?: (log: ProgressLog) => void
}) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-400">아직 진행 로그가 없습니다.</p>
  }

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {logs.map((log) => (
        <li key={log.id} className="group relative">
          {/* 타임라인 점 */}
          <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${logTypeClass(log.log_type)}`}>
              {log.log_type}
            </span>
            <span className="text-xs text-slate-400">{dateTime(log.log_date)}</span>
            {onDelete && (
              <button
                onClick={() => onDelete(log)}
                className="ml-auto text-xs text-slate-300 transition hover:text-rose-600 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                삭제
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-700">{log.content}</p>
        </li>
      ))}
    </ol>
  )
}
