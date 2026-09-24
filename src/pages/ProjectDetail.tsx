import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addLog,
  bumpGoal,
  deleteLog,
  fetchProjectDetail,
  setItemPublished,
  updateProject,
  PROJECT_STATUSES,
  type ProjectDetail as Detail,
} from '../lib/api'
import type { LogType, ProgressLog, ProjectItem, ProjectStatus, RecurringGoal } from '../types'
import { categoryClass, STATUS_META } from '../lib/labels'
import { relativeTime } from '../lib/format'
import CustomFields from '../components/CustomFields'
import GoalTracker from '../components/GoalTracker'
import LogTimeline from '../components/LogTimeline'
import LogForm from '../components/LogForm'
import ItemBoard from '../components/ItemBoard'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

const byLogDateDesc = (a: ProgressLog, b: ProgressLog) => b.log_date.localeCompare(a.log_date)

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<{ id: string; message: string } | null>(null)
  // 슬라이더를 움직이는 동안의 값. 손을 멈추고 잠시 뒤 저장한다.
  const [progressDraft, setProgressDraft] = useState<number | null>(null)
  const progressTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchProjectDetail(id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError({ id, message: e.message ?? '데이터를 불러오지 못했습니다.' }))
    return () => {
      cancelled = true
    }
  }, [id])

  // 다른 프로젝트로 이동하면 이전 데이터·에러는 무시하고 로딩으로 본다
  const detail = data && data.project.id === id ? data : null
  const errorMessage = error && error.id === id ? error.message : null
  const loading = !detail && !errorMessage

  const patch = (fn: (d: Detail) => Detail) => setData((d) => d && fn(d))
  const touch = (d: Detail): Detail => ({ ...d, project: { ...d.project, updated_at: new Date().toISOString() } })

  // ---- 수정: 화면부터 바꾸고, 저장에 실패하면 되돌린다 ----

  async function changeStatus(status: ProjectStatus) {
    if (!detail) return
    const prev = detail.project
    patch((d) => ({ ...d, project: { ...d.project, status } }))
    try {
      const project = await updateProject(prev.id, { status })
      patch((d) => ({ ...d, project }))
    } catch (e) {
      patch((d) => ({ ...d, project: prev }))
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  function changeProgress(value: number) {
    if (!detail) return
    const projectId = detail.project.id
    setProgressDraft(value)
    window.clearTimeout(progressTimer.current)
    progressTimer.current = window.setTimeout(async () => {
      try {
        const project = await updateProject(projectId, { progress: value })
        patch((d) => ({ ...d, project }))
      } catch (e) {
        alert(`저장하지 못했어요: ${(e as Error).message}`)
      }
      setProgressDraft(null)
    }, 600)
  }

  async function changeGoal(goal: RecurringGoal, delta: number) {
    const setCount = (count: number) =>
      patch((d) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? { ...g, current_count: count } : g)) }))
    setCount(Math.max(0, goal.current_count + delta))
    try {
      // 실제 값으로 맞춘다 (Hermes 가 그 사이 올렸을 수도 있다)
      setCount(await bumpGoal(goal.id, delta))
      patch(touch)
    } catch (e) {
      setCount(goal.current_count)
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  async function createLog(type: LogType, content: string) {
    if (!detail) return
    const log = await addLog(detail.project.id, type, content)
    patch((d) => touch({ ...d, logs: [log, ...d.logs].sort(byLogDateDesc) }))
  }

  async function removeLog(log: ProgressLog) {
    if (!confirm(`이 로그를 삭제할까요?\n\n${log.content}`)) return
    patch((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== log.id) }))
    try {
      await deleteLog(log.id)
    } catch (e) {
      patch((d) => ({ ...d, logs: [...d.logs, log].sort(byLogDateDesc) }))
      alert(`삭제하지 못했어요: ${(e as Error).message}`)
    }
  }

  // 완료 처리는 목표까지 바뀌므로 저장 후 전체를 다시 불러온다
  async function publishItem(item: ProjectItem, published: boolean) {
    const setItem = (next: Partial<ProjectItem>) =>
      patch((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, ...next } : i)) }))
    setItem(
      published
        ? { stage: 'published', published_at: new Date().toISOString() }
        : { stage: item.body ? 'drafted' : 'queued', published_at: null },
    )
    try {
      await setItemPublished(item.id, published)
      const fresh = await fetchProjectDetail(item.project_id)
      patch(() => fresh)
    } catch (e) {
      setItem({ stage: item.stage, published_at: item.published_at })
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  const progress = progressDraft ?? detail?.project.progress ?? 0

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

        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {detail && (
          <div className="space-y-5">
            {/* 공통 영역: 헤더 */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">{detail.project.name}</h1>
                <select
                  value={detail.project.status}
                  onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
                  aria-label="상태"
                  className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STATUS_META[detail.project.status].cls}`}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
                {detail.project.category && (
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${categoryClass(detail.project.category)}`}>
                    {detail.project.category}
                  </span>
                )}
              </div>
              {detail.project.description && <p className="mt-2 text-slate-600">{detail.project.description}</p>}
              <p className="mt-1 text-xs text-slate-400">{relativeTime(detail.project.updated_at)} 업데이트</p>
            </div>

            {/* 작업물 (쿠팡 리뷰 등) — 있는 프로젝트만 */}
            {detail.items.length > 0 && (
              <Section title="작업물">
                <ItemBoard items={detail.items} onPublish={publishItem} />
              </Section>
            )}

            {/* 진행률 */}
            <Section title="진행률">
              <div className="mb-2 flex justify-between text-sm text-slate-500">
                <span>전체 진행률 {progressDraft !== null && <span className="text-xs text-slate-400">· 저장 중…</span>}</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => changeProgress(Number(e.target.value))}
                aria-label="전체 진행률"
                className="w-full accent-slate-800"
              />
            </Section>

            {/* 정기 목표 추적 */}
            <Section title="정기 목표">
              <GoalTracker goals={detail.goals} onBump={changeGoal} />
            </Section>

            {/* 프로젝트별 자유 영역 */}
            <Section title="프로젝트 정보">
              <CustomFields fields={detail.project.custom_fields} />
            </Section>

            {/* 진행 로그 타임라인 */}
            <Section title="진행 로그">
              <LogForm onAdd={createLog} />
              <LogTimeline logs={detail.logs} onDelete={removeLog} />
            </Section>
          </div>
        )}
      </main>
    </div>
  )
}
