import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dDay, dayLabel, fetchTrips, todayKst, type TripRow } from '../../lib/trips'

// 대시보드 안 "여행 계획" 요약: 다가오는(또는 날짜 미정) 여행. 짜는 건 /trips 에서.
export default function TripSummary() {
  const [rows, setRows] = useState<TripRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrips().then(setRows, (e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        여행 계획: 불러오지 못했어요 ({error}). supabase/14_trips.sql 이 적용됐는지 확인하세요.
      </div>
    )
  }
  if (!rows) return <p className="text-sm text-slate-400">여행 불러오는 중…</p>

  const today = todayKst()
  const upcoming = rows.filter((t) => !t.end_date || t.end_date >= today)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-slate-700">여행 계획</h3>
        <Link to="/trips" className="text-xs text-slate-400 hover:text-slate-600">
          {rows.length ? '전체 보기 →' : '여행 만들기 →'}
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="px-1 py-3 text-sm text-slate-400">다가오는 여행이 없어요. 여행을 만들고 링크를 보내면 같이 갈 사람들과 일정을 짤 수 있어요.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {upcoming.slice(0, 4).map((t) => (
            <li key={t.id}>
              <Link to={`/trips/${t.slug}`} className="flex items-baseline gap-3 rounded-md px-1 py-2 hover:bg-slate-50">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">✈️ {t.title}</span>
                <span className="shrink-0 truncate text-sm text-slate-500">
                  {t.destination ?? ''} {t.start_date ? dayLabel(t.start_date) : '날짜 미정'}
                </span>
                {dDay(t.start_date, t.end_date) && <span className="shrink-0 text-xs font-semibold text-emerald-700">{dDay(t.start_date, t.end_date)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
