import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProjectDetail, type ProjectDetail as Detail } from '../lib/api'
import { categoryClass, STATUS_META } from '../lib/labels'
import { relativeTime } from '../lib/format'
import CustomFields from '../components/CustomFields'
import GoalTracker from '../components/GoalTracker'
import LogTimeline from '../components/LogTimeline'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchProjectDetail(id)
      .then(setData)
      .catch((e) => setError(e.message ?? '데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← 대시보드
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading && <p className="text-slate-400">불러오는 중…</p>}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* 공통 영역: 헤더 */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">{data.project.name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[data.project.status].cls}`}>
                  {STATUS_META[data.project.status].label}
                </span>
                {data.project.category && (
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryClass(data.project.category)}`}>
                    {data.project.category}
                  </span>
                )}
              </div>
              {data.project.description && (
                <p className="mt-2 text-slate-600">{data.project.description}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {relativeTime(data.project.updated_at)} 업데이트
              </p>
            </div>

            {/* 진행률 */}
            <Section title="진행률">
              <div className="mb-1 flex justify-between text-sm text-slate-500">
                <span>전체 진행률</span>
                <span className="tabular-nums">{data.project.progress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-800 transition-all"
                  style={{ width: `${data.project.progress}%` }}
                />
              </div>
            </Section>

            {/* 정기 목표 추적 */}
            <Section title="정기 목표">
              <GoalTracker goals={data.goals} />
            </Section>

            {/* 프로젝트별 자유 영역 */}
            <Section title="프로젝트 정보">
              <CustomFields fields={data.project.custom_fields} />
            </Section>

            {/* 진행 로그 타임라인 */}
            <Section title="진행 로그">
              <LogTimeline logs={data.logs} />
            </Section>
          </div>
        )}
      </main>
    </div>
  )
}
