import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Memo } from '../../types'
import { fetchMemoSummary, setTodoStatus, type MemoSummary as Summary } from '../../lib/memos'
import { relativeTime } from '../../lib/format'
import { TodoRow } from './TodoList'

const KIND_ICON: Record<string, string> = { todo: '📋', event: '📅', question: '❓', link: '🔗', note: '📝' }

function memoLine(m: Memo): string {
  return m.link_title || m.content.replace(/https?:\/\/\S+/g, '').trim() || '(내용 없음)'
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

// 대시보드 안 메모 요약: 남은 할 일 + 최근 메모. 전체는 /memos 에서.
export default function MemoSummary() {
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMemoSummary()
      .then(setData)
      .catch((e) => setError(e.message ?? '메모를 불러오지 못했어요.'))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        메모를 불러오지 못했어요: {error}
      </div>
    )
  }
  if (!data) return <p className="text-sm text-slate-400">메모 불러오는 중…</p>

  // 체크한 항목은 바로 빼지 않고 줄만 긋는다 (실수로 눌렀을 때 되돌리기 쉽게)
  async function toggle(memo: Memo) {
    const next = memo.todo_status === 'done' ? 'open' : 'done'
    const patch = (status: Memo['todo_status']) =>
      setData((d) => d && { ...d, openTodos: d.openTodos.map((m) => (m.id === memo.id ? { ...m, todo_status: status } : m)) })
    patch(next)
    try {
      await setTodoStatus(memo.id, next)
    } catch (e) {
      patch(memo.todo_status)
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  const more = data.openTodoCount - data.openTodos.length

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Panel title="할 일" sub={`남은 ${data.openTodoCount}개`}>
        {data.openTodos.length === 0 ? (
          <p className="px-1 py-4 text-sm text-slate-400">남은 할 일이 없어요.</p>
        ) : (
          <div className="-mx-2">
            {data.openTodos.map((t) => (
              <TodoRow key={t.id} memo={t} onToggle={() => toggle(t)} />
            ))}
          </div>
        )}
        {more > 0 && (
          <Link to="/memos" className="mt-1 block px-1 text-xs text-slate-400 hover:text-slate-600">
            외 {more}개 더 보기 →
          </Link>
        )}
      </Panel>

      <Panel title="최근 메모" sub={data.unsortedCount > 0 ? `정리 전 ${data.unsortedCount}개` : undefined}>
        {data.recent.length === 0 ? (
          <p className="px-1 py-4 text-sm text-slate-400">메모가 없어요.</p>
        ) : (
          <ul className="space-y-1">
            {data.recent.map((m) => (
              <li key={m.id}>
                <Link to="/memos" className="flex items-start gap-2 rounded-lg px-1 py-1.5 transition hover:bg-slate-50">
                  <span className="shrink-0 text-sm">{m.kind ? KIND_ICON[m.kind] : '⏳'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-800">{memoLine(m)}</span>
                    <span className="text-xs text-slate-400">
                      {m.category ?? '정리 전'} · {relativeTime(m.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/memos" className="mt-1 block px-1 text-xs text-slate-400 hover:text-slate-600">
          메모 전체 보기 →
        </Link>
      </Panel>
    </div>
  )
}
