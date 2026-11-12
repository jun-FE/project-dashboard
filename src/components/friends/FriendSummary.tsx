import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFriendsData, type FriendsData } from '../../lib/friends'

// 대시보드 안 "친구와 같이" 요약: 친구별 남은 할 일·안 가본 맛집 수. 체크·추가는 /friends 에서.
export default function FriendSummary() {
  const [data, setData] = useState<FriendsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFriendsData()
      .then(setData)
      .catch((e) => setError(e.message ?? '불러오지 못했어요.'))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        친구와 같이: 불러오지 못했어요 ({error}). supabase/09_friends.sql 이 적용됐는지 확인하세요.
      </div>
    )
  }
  if (!data) return <p className="text-sm text-slate-400">친구 목록 불러오는 중…</p>

  const rows = data.friends.map((f) => ({
    ...f,
    todos: data.todos.filter((t) => t.friend_id === f.id && !t.done),
    places: data.places.filter((p) => p.friend_id === f.id && !p.visited).length,
  }))
  const totalTodos = rows.reduce((n, r) => n + r.todos.length, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-slate-700">친구와 같이</h3>
        <Link to="/friends" className="text-xs text-slate-400 hover:text-slate-600">
          {rows.length ? `남은 할 일 ${totalTodos}개 · 전체 보기 →` : '친구 추가하기 →'}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-1 py-3 text-sm text-slate-400">친구를 추가하면 같이 할 일과 갈 맛집을 함께 체크할 수 있어요.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/friends?f=${r.id}`} className="flex items-baseline gap-3 rounded-md px-1 py-2 hover:bg-slate-50">
                <span className="w-20 shrink-0 truncate text-sm font-medium text-slate-900">{r.name}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-500">
                  {r.todos.length ? r.todos.map((t) => t.title).join(' · ') : '남은 할 일 없음'}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  할 일 {r.todos.length} · 맛집 {r.places}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
