import { useEffect, useState } from 'react'
import { fetchDashboardData, type DashboardData } from '../lib/api'
import { supabase } from '../lib/supabase'
import SummaryBar from '../components/SummaryBar'
import ProjectCard from '../components/ProjectCard'
import MemoSummary from '../components/memo/MemoSummary'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((e) => setError(e.message ?? '데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">대시보드</h1>
            <p className="text-sm text-slate-500">프로젝트 진행상황과 할 일·메모 한눈에 보기</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="shrink-0 text-sm text-slate-400 hover:text-slate-700">
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* 메모는 프로젝트 데이터와 따로 불러와서, 한쪽이 실패해도 다른 쪽은 보이게 한다 */}
        <section className="mb-8">
          <MemoSummary />
        </section>

        {loading && <p className="text-slate-400">불러오는 중…</p>}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            데이터를 불러오지 못했습니다: {error}
            <span className="mt-1 block text-rose-500">.env.local 의 Supabase URL/키와 테이블을 확인하세요.</span>
          </div>
        )}

        {data && (
          <>
            <SummaryBar projects={data.projects} goalsByProject={data.goalsByProject} />

            {data.projects.length === 0 ? (
              <p className="mt-8 text-slate-400">아직 프로젝트가 없습니다.</p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    goals={data.goalsByProject[p.id] ?? []}
                    todayLogs={data.todayLogsByProject[p.id] ?? []}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
