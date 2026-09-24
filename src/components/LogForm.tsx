import { useState, type FormEvent } from 'react'
import type { LogType } from '../types'
import { LOG_TYPES } from '../lib/api'

// 진행 로그 한 줄 추가. 저장에 성공하면 입력칸을 비운다.
export default function LogForm({ onAdd }: { onAdd: (type: LogType, content: string) => Promise<void> }) {
  const [type, setType] = useState<LogType>('작업')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = content.trim()
    if (!text) return
    setBusy(true)
    try {
      await onAdd(type, text)
      setContent('')
    } catch (err) {
      alert(`저장하지 못했어요: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-5 flex gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as LogType)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
      >
        {LOG_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="오늘 한 일, 결정, 이슈…"
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
      <button
        type="submit"
        disabled={busy || !content.trim()}
        className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-40"
      >
        추가
      </button>
    </form>
  )
}
