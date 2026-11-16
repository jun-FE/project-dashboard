import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteGamePrompt, fetchGamePrompts, promptTitle, setGamePromptDone, type GamePrompt } from '../lib/gamePrompts'
import { dateTime } from '../lib/format'

const ALL = '전체'

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function PromptCard({ p, onToggle, onDelete }: { p: GamePrompt; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!p.done)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const [armed, setArmed] = useState(false)
  return (
    <article className={`rounded-xl border bg-white p-4 ${p.done ? 'border-slate-200 opacity-70' : 'border-slate-300'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={p.done} onChange={onToggle} className="h-4 w-4 accent-slate-900" />
          작업함
        </label>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{p.game}</span>
        <span className="text-xs text-slate-400">
          {dateTime(p.created_at)} · 메모 {p.memo_count}개
        </span>
        <span className="ml-auto flex items-center gap-3">
          <button
            onClick={async () => {
              setCopied((await copy(p.content)) ? 'ok' : 'fail')
              setTimeout(() => setCopied(null), 2000)
            }}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            {copied === 'ok' ? '복사됨 ✓' : copied === 'fail' ? '복사 안 됨: 직접 선택해 주세요' : '복사'}
          </button>
          {armed ? (
            <button onClick={onDelete} onBlur={() => setArmed(false)} autoFocus className="text-xs font-medium text-rose-600">
              정말 지우기
            </button>
          ) : (
            <button onClick={() => setArmed(true)} className="text-xs text-slate-300 hover:text-rose-600">
              지우기
            </button>
          )}
        </span>
      </div>
      <button onClick={() => setOpen(!open)} className="mt-2 block text-left text-sm font-medium text-slate-900 hover:underline">
        {open ? '▾' : '▸'} {promptTitle(p)}
      </button>
      {open && (
        <pre className="mt-2 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
          {p.content}
        </pre>
      )}
      {open && p.file_path && <p className="mt-2 break-all text-xs text-slate-400">맥미니 원본: {p.file_path}</p>}
    </article>
  )
}

export default function GamePrompts() {
  const [rows, setRows] = useState<GamePrompt[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [game, setGame] = useState(ALL)

  useEffect(() => {
    fetchGamePrompts().then(setRows, (e: Error) => setError(e.message))
  }, [])

  async function toggle(p: GamePrompt) {
    setRows((rs) => rs!.map((r) => (r.id === p.id ? { ...r, done: !p.done } : r)))
    try {
      await setGamePromptDone(p.id, !p.done)
    } catch (e) {
      setRows((rs) => rs!.map((r) => (r.id === p.id ? p : r)))
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }

  async function remove(p: GamePrompt) {
    setRows((rs) => rs!.filter((r) => r.id !== p.id))
    try {
      await deleteGamePrompt(p.id)
    } catch (e) {
      setRows((rs) => [...rs!, p].sort((a, b) => b.created_at.localeCompare(a.created_at)))
      alert(`지우지 못했어요: ${(e as Error).message}`)
    }
  }

  const games = [...new Set((rows ?? []).map((r) => r.game))]
  const shown = (rows ?? []).filter((r) => game === ALL || r.game === game)
  const todo = shown.filter((r) => !r.done)
  const done = shown.filter((r) => r.done)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600">
            ← 대시보드
          </Link>
          <h1 className="text-xl font-semibold">게임 작업 프롬프트</h1>
          <p className="text-sm text-slate-500">게임 메모봇에 던진 테스트 메모를 정리한 것. 복사해서 Claude에게 붙여넣으면 바로 작업 시작</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            불러오지 못했어요: {error}. supabase/12_game_prompts.sql 이 적용됐는지 확인하세요.
          </div>
        ) : !rows ? (
          <p className="text-slate-400">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">아직 프롬프트가 없어요. 게임 메모봇에 메모를 던지고 /프롬프트 를 보내면 여기 쌓여요.</p>
        ) : (
          <>
            {games.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {[ALL, ...games].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGame(g)}
                    className={`rounded-full px-3 py-1.5 text-sm ${game === g ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            {todo.length === 0 && <p className="text-sm text-slate-400">남은 프롬프트가 없어요. 다 작업했어요.</p>}
            {todo.map((p) => (
              <PromptCard key={p.id} p={p} onToggle={() => toggle(p)} onDelete={() => remove(p)} />
            ))}
            {done.length > 0 && <h2 className="pt-4 text-sm font-semibold text-slate-500">작업한 것 {done.length}개</h2>}
            {done.map((p) => (
              <PromptCard key={p.id} p={p} onToggle={() => toggle(p)} onDelete={() => remove(p)} />
            ))}
          </>
        )}
      </main>
    </div>
  )
}
