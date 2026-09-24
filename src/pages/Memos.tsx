import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Memo } from '../types'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/auth'
import { fetchMemos, setTodoStatus } from '../lib/memos'
import LoginForm from '../components/memo/LoginForm'
import MemoCard from '../components/memo/MemoCard'
import TodoList from '../components/memo/TodoList'

const TODO_TAB = '할 일'
const ALL_TAB = '전체'

function matches(m: Memo, q: string): boolean {
  const hay = [m.content, m.link_title, m.ai_note, m.category, ...m.tags].join(' ').toLowerCase()
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))
}

function MemoBoard() {
  const [memos, setMemos] = useState<Memo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(ALL_TAB)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchMemos()
      .then(setMemos)
      .catch((e) => setError(e.message ?? '메모를 불러오지 못했어요.'))
  }, [])

  // 카테고리 탭: 메모가 많은 순
  const categories = useMemo(() => {
    const count = new Map<string, number>()
    for (const m of memos ?? []) if (m.category) count.set(m.category, (count.get(m.category) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1])
  }, [memos])

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        메모를 불러오지 못했어요: {error}
      </div>
    )
  }
  if (!memos) return <p className="text-slate-400">불러오는 중…</p>

  const todos = memos.filter((m) => m.kind === 'todo' && m.todo_status !== 'archived')
  const openCount = todos.filter((t) => t.todo_status === 'open').length
  const searched = query ? memos.filter((m) => matches(m, query)) : memos
  const shown = tab === ALL_TAB ? searched : searched.filter((m) => m.category === tab)

  // 체크하면 화면부터 바꾸고, 저장에 실패하면 되돌린다
  async function toggle(memo: Memo) {
    const next = memo.todo_status === 'done' ? 'open' : 'done'
    setMemos((ms) => ms!.map((m) => (m.id === memo.id ? { ...m, todo_status: next } : m)))
    try {
      await setTodoStatus(memo.id, next)
    } catch (e) {
      setMemos((ms) => ms!.map((m) => (m.id === memo.id ? { ...m, todo_status: memo.todo_status } : m)))
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  const tabs: [string, number][] = [[TODO_TAB, openCount], [ALL_TAB, memos.length], ...categories]

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([name, n]) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              tab === name ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {name} <span className="tabular-nums opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {tab === TODO_TAB ? (
        <div className="mt-6">
          <TodoList todos={todos} onToggle={toggle} />
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색 (본문, 링크 제목, 태그)"
            className="mt-5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          {shown.length === 0 ? (
            <p className="mt-8 text-slate-400">{query ? '검색 결과가 없어요.' : '메모가 없어요.'}</p>
          ) : (
            <div className="mt-5 gap-4 md:columns-2">
              {shown.map((m) => (
                <MemoCard key={m.id} memo={m} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

export default function Memos() {
  const session = useSession()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <Link to="/" className="text-xs text-slate-400 hover:text-slate-600">
              ← 대시보드
            </Link>
            <h1 className="text-xl font-semibold">메모</h1>
            <p className="text-sm text-slate-500">텔레그램 메모봇에 쌓인 메모</p>
          </div>
          {session && (
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-400 hover:text-slate-700">
              로그아웃
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {session === undefined && <p className="text-slate-400">확인 중…</p>}
        {session === null && <LoginForm />}
        {session && <MemoBoard />}
      </main>
    </div>
  )
}
