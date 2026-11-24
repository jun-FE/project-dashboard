import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { copy, createTrip, dDay, dayLabel, fetchTripCounts, fetchTrips, inviteText, type TripRow } from '../lib/trips'
import { TripInfoForm } from '../components/trips/TripPlanner'

// 여행 목록 + 새 여행 만들기. 여행을 누르면 /trips/:slug 에서 같이 짜는 화면이 열린다.

// 코드는 해시로만 저장돼서 다시 볼 수 없다. 만들거나 바꾼 직후에만 보여준다.
export function InviteBox({ trip, code, onClose }: { trip: Pick<TripRow, 'title' | 'slug'>; code: string; onClose: () => void }) {
  const text = inviteText(trip, code)
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <p className="font-medium text-emerald-800">같이 갈 사람들에게 보낼 문구예요. 초대 코드는 지금만 보여요.</p>
      <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-white p-3 font-sans text-slate-700">{text}</pre>
      <p className="mt-1 text-xs text-emerald-700">여러 명이 같은 링크·코드로 들어와요. 들어올 때 각자 이름을 골라요.</p>
      <div className="mt-2 flex gap-3">
        <button onClick={async () => setCopied(await copy(text))} className="rounded-md bg-emerald-700 px-3 py-1.5 text-white">
          {copied ? '복사했어요' : '문구 복사'}
        </button>
        <button onClick={onClose} className="text-emerald-800 hover:underline">
          닫기
        </button>
      </div>
    </div>
  )
}

export default function Trips() {
  const [trips, setTrips] = useState<TripRow[] | null>(null)
  const [counts, setCounts] = useState<Record<string, { wish: number; planned: number }>>({})
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchTrips().then(setTrips, (e: Error) => setError(e.message))
    fetchTripCounts().then(setCounts, () => {})
  }, [])

  return (
    <Shell>
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          불러오지 못했어요: {error}
          <span className="mt-1 block text-rose-500">supabase/14_trips.sql 이 적용됐는지 확인하세요.</span>
        </div>
      ) : !trips ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : (
        <div className="space-y-4">
          {adding ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">새 여행</h2>
              <TripInfoForm
                submitLabel="만들기"
                onCancel={() => setAdding(false)}
                onSubmit={async (info) => {
                  const t = await createTrip(info, code)
                  sessionStorage.setItem(`trip-new-code:${t.slug}`, code)
                  navigate(`/trips/${t.slug}`)
                }}
              >
                <label className="block text-xs text-slate-500">
                  초대 코드 (같이 갈 사람들이 들어올 때 넣는 비밀번호, 4자 이상)
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="예: osaka1225" className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400 sm:w-64" />
                </label>
                {code.length > 0 && code.length < 4 && <p className="text-xs text-rose-500">초대 코드는 4자 이상이에요.</p>}
              </TripInfoForm>
            </section>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              + 새 여행 만들기
            </button>
          )}

          {trips.length === 0 && !adding && (
            <p className="py-6 text-center text-sm text-slate-400">
              여행을 만들면 링크와 초대 코드가 생겨요. 같이 갈 사람들이 같은 링크로 들어와 하고 싶은 것·먹고 싶은 것을 넣고, 날짜별로 일정을 짜요.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {trips.map((t) => {
              const dd = dDay(t.start_date, t.end_date)
              const c = counts[t.id]
              return (
                <Link key={t.id} to={`/trips/${t.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate font-semibold text-slate-900">{t.title}</h3>
                    {dd && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{dd}</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {t.destination ?? '여행지 미정'} · {t.start_date && t.end_date ? `${dayLabel(t.start_date)} ~ ${dayLabel(t.end_date)}` : '날짜 미정'}
                  </p>
                  {c && (
                    <p className="mt-2 text-xs text-slate-400">
                      위시리스트 {c.wish} · 일정에 넣음 {c.planned}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </Shell>
  )
}

export function Shell({ children, back = '/', backLabel = '← 대시보드' }: { children: React.ReactNode; back?: string; backLabel?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <Link to={back} className="text-sm text-slate-400 hover:text-slate-700">
            {backLabel}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">여행 계획 짜기</h1>
          <p className="text-sm text-slate-500">같이 갈 사람들과 같은 링크로 하고 싶은 것·먹고 싶은 것을 모아 날짜별 일정으로</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
