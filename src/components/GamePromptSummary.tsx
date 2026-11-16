import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchGamePrompts, promptTitle, type GamePrompt } from '../lib/gamePrompts'
import { dateTime } from '../lib/format'

// 대시보드 안 "게임 작업 프롬프트" 요약: 아직 작업 안 한 프롬프트. 복사·체크는 /game-prompts 에서.
export default function GamePromptSummary() {
  const [rows, setRows] = useState<GamePrompt[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGamePrompts(50).then(setRows, (e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        게임 프롬프트: 불러오지 못했어요 ({error}). supabase/12_game_prompts.sql 이 적용됐는지 확인하세요.
      </div>
    )
  }
  if (!rows) return <p className="text-sm text-slate-400">게임 프롬프트 불러오는 중…</p>

  const open = rows.filter((r) => !r.done)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-slate-700">게임 작업 프롬프트</h3>
        <Link to="/game-prompts" className="text-xs text-slate-400 hover:text-slate-600">
          {open.length ? `작업 전 ${open.length}개 · 전체 보기 →` : '전체 보기 →'}
        </Link>
      </div>
      {open.length === 0 ? (
        <p className="px-1 py-3 text-sm text-slate-400">작업할 프롬프트가 없어요. 게임 메모봇에서 /프롬프트 를 보내면 여기 떠요.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {open.slice(0, 5).map((p) => (
            <li key={p.id}>
              <Link to="/game-prompts" className="flex items-baseline gap-3 rounded-md px-1 py-2 hover:bg-slate-50">
                <span className="w-20 shrink-0 truncate text-sm font-medium text-slate-900">{p.game}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-500">{promptTitle(p)}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {dateTime(p.created_at)} · 메모 {p.memo_count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
