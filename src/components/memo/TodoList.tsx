import { useState } from 'react'
import type { Memo } from '../../types'
import { dueText, isOverdue } from '../../lib/memos'

interface Props {
  todos: Memo[]
  onToggle: (memo: Memo) => void
}

function Row({ memo, onToggle }: { memo: Memo; onToggle: () => void }) {
  const done = memo.todo_status === 'done'
  const text = memo.content.replace(/https?:\/\/\S+/g, '').trim() || memo.link_title || '(내용 없음)'
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50">
      <input type="checkbox" checked={done} onChange={onToggle} className="mt-0.5 h-4 w-4 shrink-0 accent-slate-900" />
      <span className="min-w-0 flex-1">
        <span className={`block break-words text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{text}</span>
        {memo.due_at && (
          <span className={`text-xs ${!done && isOverdue(memo.due_at) ? 'font-medium text-rose-600' : 'text-slate-400'}`}>
            ⏰ {dueText(memo.due_at)}
            {!done && isOverdue(memo.due_at) && ' · 지남'}
          </span>
        )}
      </span>
    </label>
  )
}

// 텔레그램 ✅ 버튼과 같은 todo_status 칸을 바꾸므로 어느 쪽에서 체크해도 맞춰진다.
export default function TodoList({ todos, onToggle }: Props) {
  const [showDone, setShowDone] = useState(false)
  const byDue = (a: Memo, b: Memo) =>
    (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999') || a.created_at.localeCompare(b.created_at)
  const open = todos.filter((t) => t.todo_status === 'open').sort(byDue)
  const done = todos.filter((t) => t.todo_status === 'done')

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {open.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-slate-400">남은 할 일이 없어요.</p>
      ) : (
        open.map((t) => <Row key={t.id} memo={t} onToggle={() => onToggle(t)} />)
      )}
      {done.length > 0 && (
        <div className="mt-1 border-t border-slate-100 pt-1">
          <button onClick={() => setShowDone(!showDone)} className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600">
            {showDone ? '▾' : '▸'} 완료한 일 {done.length}개
          </button>
          {showDone && done.map((t) => <Row key={t.id} memo={t} onToggle={() => onToggle(t)} />)}
        </div>
      )}
    </div>
  )
}
