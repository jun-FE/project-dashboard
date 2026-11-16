import { useEffect, useState } from 'react'
import { addTask, deleteTask, fetchTasks, setTaskDone, taskStats, type ProjectTask, type Who } from '../../lib/projectTasks'

// 출시 체크리스트 (custom_fields.module = 'launch'): 전체 진행도 + 나/Claude 몫 + 섹션별 진행도 + 체크박스
interface Props {
  projectId: string
  note?: string
  onProgress: (percent: number) => void // 프로젝트 진행률(대시보드 카드)에 반영
}

type Filter = 'all' | Who

const WHO: Record<Who, { icon: string; label: string; cls: string }> = {
  me: { icon: '🙋', label: '나', cls: 'bg-amber-50 text-amber-700' },
  claude: { icon: '🤖', label: 'Claude', cls: 'bg-indigo-50 text-indigo-700' },
}

function Ring({ percent }: { percent: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 shrink-0 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-slate-100" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
        className="stroke-slate-900 transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  )
}

function Bar({ done, total, cls = 'bg-slate-900' }: { done: number; total: number; cls?: string }) {
  const pct = total ? (done / total) * 100 : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-[width] duration-500 ${pct === 100 ? 'bg-emerald-500' : cls}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function TaskRow({ t, onToggle, onDelete }: { t: ProjectTask; onToggle: () => void; onDelete: () => void }) {
  const [armed, setArmed] = useState(false)
  return (
    <li className="group flex items-start gap-3 px-4 py-2.5">
      <input type="checkbox" checked={t.done} onChange={onToggle} aria-label={t.title} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-slate-900" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-sm ${t.done ? 'text-slate-400 line-through' : 'font-medium text-slate-900'}`}>{t.title}</span>
          {t.who && !t.done && (
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${WHO[t.who].cls}`}>
              {WHO[t.who].icon} {WHO[t.who].label}
            </span>
          )}
        </span>
        {t.detail && !t.done && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{t.detail}</span>}
      </span>
      {armed ? (
        <button onClick={onDelete} onBlur={() => setArmed(false)} autoFocus className="shrink-0 text-xs font-medium text-rose-600">
          정말 지우기
        </button>
      ) : (
        <button onClick={() => setArmed(true)} className="shrink-0 text-xs text-slate-300 opacity-0 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100">
          지우기
        </button>
      )}
    </li>
  )
}

function AddRow({ onAdd }: { onAdd: (title: string, who: Who) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [who, setWho] = useState<Who>('me')
  const [busy, setBusy] = useState(false)
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:text-slate-700">
        + 항목 추가
      </button>
    )
  return (
    <form
      className="flex flex-wrap gap-2 px-4 py-2.5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        setBusy(true)
        try {
          await onAdd(title.trim(), who)
          setTitle('')
          setOpen(false)
        } catch (err) {
          alert(`추가하지 못했어요: ${(err as Error).message}`)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="할 일"
        className="min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
      />
      <select value={who} onChange={(e) => setWho(e.target.value as Who)} aria-label="누가" className="rounded-md border border-slate-200 px-2 text-sm">
        <option value="me">🙋 나</option>
        <option value="claude">🤖 Claude</option>
      </select>
      <button disabled={busy || !title.trim()} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">
        추가
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-slate-700">
        취소
      </button>
    </form>
  )
}

export default function LaunchChecklist({ projectId, note, onProgress }: Props) {
  const [tasks, setTasks] = useState<ProjectTask[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [hideDone, setHideDone] = useState(false)
  const [openDone, setOpenDone] = useState<Record<string, boolean>>({}) // 다 끝난 섹션 펼치기

  useEffect(() => {
    fetchTasks(projectId).then(setTasks, (e: Error) => setError(e.message))
  }, [projectId])

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        체크리스트를 불러오지 못했어요 ({error}). supabase/13_project_tasks.sql 이 적용됐는지 확인하세요.
      </div>
    )
  }
  if (!tasks) return <p className="text-slate-400">체크리스트 불러오는 중…</p>

  const stats = taskStats(tasks)
  const nextMe = tasks.find((t) => t.counts && !t.done && t.who === 'me')
  const nextClaude = tasks.find((t) => t.counts && !t.done && t.who === 'claude')

  // 섹션: 처음 나온 순서 (sort 순)
  const sections: [string, ProjectTask[]][] = []
  for (const t of tasks) {
    const s = sections.find(([name]) => name === t.section)
    if (s) s[1].push(t)
    else sections.push([t.section, [t]])
  }

  async function toggle(t: ProjectTask) {
    const next = tasks!.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x))
    setTasks(next)
    try {
      await setTaskDone(t.id, !t.done)
      onProgress(taskStats(next).percent)
    } catch (e) {
      setTasks(tasks)
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  async function add(section: string, items: ProjectTask[], title: string, who: Who) {
    const row = await addTask({
      project_id: projectId,
      section,
      sort: Math.max(...items.map((i) => i.sort)),
      title,
      who,
      counts: items.some((i) => i.counts),
    })
    const next = [...tasks!, row].sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
    setTasks(next)
    onProgress(taskStats(next).percent)
  }

  async function remove(t: ProjectTask) {
    const next = tasks!.filter((x) => x.id !== t.id)
    setTasks(next)
    try {
      await deleteTask(t.id)
      onProgress(taskStats(next).percent)
    } catch (e) {
      setTasks(tasks)
      alert(`지우지 못했어요: ${(e as Error).message}`)
    }
  }

  return (
    <div className="space-y-5">
      {/* 한눈에: 전체 진행도 + 누구 몫이 얼마나 남았나 + 다음 할 일 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative">
            <Ring percent={stats.percent} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">{stats.percent}%</span>
            </div>
          </div>
          <div className="min-w-[14rem] flex-1 space-y-3">
            <p className="text-sm text-slate-600">
              출시 준비 <strong className="tabular-nums text-slate-900">{stats.done}</strong> / {stats.total} 완료 · 남은 일{' '}
              <strong className="tabular-nums text-slate-900">{stats.total - stats.done}</strong>개
            </p>
            {(['me', 'claude'] as Who[]).map((w) => (
              <div key={w}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>
                    {WHO[w].icon} {WHO[w].label} 몫
                  </span>
                  <span className="tabular-nums">
                    {stats[w].done} / {stats[w].total} · 남은 {stats[w].total - stats[w].done}
                  </span>
                </div>
                <Bar done={stats[w].done} total={stats[w].total} cls={w === 'me' ? 'bg-amber-500' : 'bg-indigo-500'} />
              </div>
            ))}
          </div>
        </div>

        {(nextMe || nextClaude) && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {[nextMe, nextClaude].map(
              (t) =>
                t && (
                  <div key={t.id} className={`rounded-lg px-3 py-2.5 ${t.who === 'me' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                    <p className="text-xs text-slate-500">
                      {WHO[t.who!].icon} {WHO[t.who!].label} 다음 할 일
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{t.title}</p>
                  </div>
                ),
            )}
          </div>
        )}

        {note && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">⏳ {note}</p>}
      </section>

      {/* 섹션 진행도 한 줄 요약 */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sections.map(([name, items]) => {
          const done = items.filter((i) => i.done).length
          const later = !items.some((i) => i.counts)
          return (
            <a
              key={name}
              href={`#sec-${name}`}
              className={`rounded-lg border bg-white px-3 py-2.5 hover:border-slate-300 ${later ? 'border-dashed border-slate-200' : 'border-slate-200'}`}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className={`truncate text-xs font-medium ${later ? 'text-slate-400' : 'text-slate-700'}`}>{name}</span>
                <span className={`shrink-0 text-xs tabular-nums ${done === items.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {done === items.length ? '✓' : `${done}/${items.length}`}
                </span>
              </div>
              <Bar done={done} total={items.length} cls={later ? 'bg-slate-300' : 'bg-slate-900'} />
            </a>
          )
        })}
      </section>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['all', '전체'],
            ['me', '🙋 내 할 일'],
            ['claude', '🤖 Claude 할 일'],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-4 w-4 accent-slate-900" />
          끝난 것 숨기기
        </label>
      </div>

      {/* 섹션별 체크리스트 */}
      {sections.map(([name, items]) => {
        const done = items.filter((i) => i.done).length
        const complete = done === items.length
        const later = !items.some((i) => i.counts)
        const shown = items.filter((t) => (filter === 'all' || t.who === filter) && !(hideDone && t.done))
        const collapsed = complete && !openDone[name]
        if (filter !== 'all' && shown.length === 0) return null
        if (hideDone && complete) return null
        return (
          <section key={name} id={`sec-${name}`} className={`scroll-mt-4 rounded-xl border bg-white ${later ? 'border-dashed border-slate-300' : 'border-slate-200'}`}>
            <button
              onClick={() => complete && setOpenDone((o) => ({ ...o, [name]: !o[name] }))}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left ${complete ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <h3 className={`text-sm font-semibold ${later ? 'text-slate-500' : 'text-slate-800'}`}>
                {complete && <span className="mr-1 text-emerald-600">✓</span>}
                {name}
              </h3>
              {later && <span className="text-xs text-slate-400">진행도에 안 들어가요</span>}
              <span className="ml-auto flex w-32 shrink-0 items-center gap-2">
                <Bar done={done} total={items.length} cls={later ? 'bg-slate-300' : 'bg-slate-900'} />
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {done}/{items.length}
                </span>
              </span>
              {complete && <span className="text-xs text-slate-400">{collapsed ? '▸' : '▾'}</span>}
            </button>
            {!collapsed && (
              <>
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {shown.map((t) => (
                    <TaskRow key={t.id} t={t} onToggle={() => toggle(t)} onDelete={() => remove(t)} />
                  ))}
                </ul>
                <div className="border-t border-slate-100">
                  <AddRow onAdd={(title, who) => add(name, items, title, who)} />
                </div>
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
