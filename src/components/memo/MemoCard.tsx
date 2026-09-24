import { useState } from 'react'
import type { Memo } from '../../types'
import { dueText, isOverdue } from '../../lib/memos'
import { dateTime } from '../../lib/format'

const URL_RE = /(https?:\/\/[^\s]+)/g
const KIND_ICON: Record<string, string> = { todo: '📋', event: '📅', question: '❓', link: '🔗', note: '📝' }

// 본문 속 링크를 누를 수 있게
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-sky-700 underline-offset-2 hover:underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export default function MemoCard({ memo }: { memo: Memo }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const firstUrl = memo.content.match(URL_RE)?.[0]
  const body = memo.content.replace(URL_RE, '').trim()
  const photos = memo.attachments.filter((a) => a.type === 'photo').length
  const files = memo.attachments.length - photos

  return (
    <article className="mb-4 break-inside-avoid rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{memo.kind ? KIND_ICON[memo.kind] : '⏳'}</span>
        <span>{dateTime(memo.created_at)}</span>
        {memo.category ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{memo.category}</span>
        ) : (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">정리 전</span>
        )}
      </div>

      {memo.link_title && firstUrl && (
        <a
          href={firstUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          🔗 {memo.link_title}
        </a>
      )}

      {/* 링크 제목이 있으면 주소는 한 번만 보이게: 본문에 다른 글이 있을 때만 전체를 보여준다 */}
      {(body || !memo.link_title) && memo.content && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
          <Linkified text={memo.content} />
        </p>
      )}

      {(photos > 0 || files > 0) && (
        <p className="mt-2 text-xs text-slate-400">
          📎 {[photos && `사진 ${photos}장`, files && `파일 ${files}개`].filter(Boolean).join(', ')} · 텔레그램에서 볼 수 있어요
        </p>
      )}

      {memo.due_at && (
        <p className={`mt-2 text-xs font-medium ${isOverdue(memo.due_at) && memo.todo_status !== 'done' ? 'text-rose-600' : 'text-slate-500'}`}>
          ⏰ {dueText(memo.due_at)}
          {memo.calendar_event_id && ' · 캘린더에 있음'}
        </p>
      )}

      {memo.ai_note && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p className={`whitespace-pre-wrap break-words ${noteOpen ? '' : 'line-clamp-3'}`}>
            💬 <Linkified text={memo.ai_note} />
          </p>
          {memo.ai_note.length > 120 && (
            <button onClick={() => setNoteOpen(!noteOpen)} className="mt-1 text-xs text-slate-400 hover:text-slate-600">
              {noteOpen ? '접기' : '더 보기'}
            </button>
          )}
        </div>
      )}

      {memo.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {memo.tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
