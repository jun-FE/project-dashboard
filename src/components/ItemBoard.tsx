import { useState } from 'react'
import type { ItemStage, ProjectItem } from '../types'
import { dateTime } from '../lib/format'

// 작업물(쿠팡 리뷰 한 건 등). 진행 중인 것은 ItemBoard, 올린 것은 PublishedList 로 보여준다.
// 올릴 차례: 본문 복사 → 직접 올린 뒤 [올렸어요].
const TABS: { stage: ItemStage; label: string; empty: string }[] = [
  { stage: 'drafted', label: '올릴 차례', empty: '올릴 초안이 없어요.' },
  { stage: 'queued', label: '초안 대기', empty: '초안을 기다리는 항목이 없어요.' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('복사하지 못했어요. 본문을 길게 눌러 직접 복사해주세요.')
    }
  }
  return (
    <button
      onClick={copy}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-400"
    >
      {copied ? '✓ 복사됨' : '📋 본문 복사'}
    </button>
  )
}

function ItemCard({ item, onPublish }: { item: ProjectItem; onPublish: (item: ProjectItem, published: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const { comment, photos } = item.meta

  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-medium text-slate-900">{item.title}</h3>
        <span className="text-xs text-slate-400">
          {dateTime(item.created_at)} 받음{photos ? ` · 사진 ${photos}장` : ''}
        </span>
      </div>

      {comment && <p className="mt-1 text-sm text-slate-500">💬 {comment}</p>}

      {item.notes && (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="mb-1 text-xs font-semibold">⚠️ 올리기 전 확인할 점</p>
          <p className="whitespace-pre-wrap break-words">{item.notes}</p>
        </div>
      )}

      {item.body && (
        <div className="mt-3">
          <p
            className={`whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ${open ? '' : 'line-clamp-4'}`}
          >
            {item.body}
          </p>
          <button onClick={() => setOpen(!open)} className="mt-1 text-xs text-slate-400 hover:text-slate-600">
            {open ? '접기' : `본문 펼치기 (${item.body.length.toLocaleString('ko-KR')}자)`}
          </button>
        </div>
      )}

      {item.stage === 'queued' && <p className="mt-2 text-xs text-slate-400">새벽 5시 예약 작업이 초안을 씁니다.</p>}

      {item.stage === 'drafted' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.body && <CopyButton text={item.body} />}
          <button
            onClick={() => onPublish(item, true)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            📤 올렸어요
          </button>
        </div>
      )}
    </article>
  )
}

// 업로드한 항목 한 줄. 누르면 한줄평·본문을 펼쳐 본다.
function PublishedRow({ item, onPublish }: { item: ProjectItem; onPublish: (item: ProjectItem, published: boolean) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="py-1">
      <div className="group flex items-baseline gap-3">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-baseline gap-2 py-1.5 text-left"
        >
          <span className="shrink-0 text-xs text-slate-400">{open ? '▾' : '▸'}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{item.title}</span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {item.published_at ? dateTime(item.published_at) : ''}
          </span>
        </button>
        <button
          onClick={() => {
            if (confirm(`"${item.title}" 업로드 기록을 취소할까요?\n이번 주기에 올린 것이면 목표도 1 줄어요.`)) onPublish(item, false)
          }}
          className="shrink-0 text-xs text-slate-300 transition hover:text-rose-600 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          취소
        </button>
      </div>

      {open && (
        <div className="mb-3 ml-5 mt-1 space-y-2">
          {item.meta.comment && <p className="text-sm text-slate-500">💬 {item.meta.comment}</p>}
          {item.body ? (
            <>
              <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {item.body}
              </p>
              <CopyButton text={item.body} />
            </>
          ) : (
            <p className="text-sm text-slate-400">저장된 본문이 없어요.</p>
          )}
        </div>
      )}
    </li>
  )
}

// 업로드한 항목 목록 (최근 올린 순). 실수로 올렸어요를 눌렀으면 여기서 취소한다.
export function PublishedList({
  items,
  onPublish,
}: {
  items: ProjectItem[]
  onPublish: (item: ProjectItem, published: boolean) => void
}) {
  if (items.length === 0) return <p className="text-sm text-slate-400">아직 업로드한 항목이 없어요.</p>
  const sorted = [...items].sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))

  return (
    <ul className="divide-y divide-slate-100">
      {sorted.map((item) => (
        <PublishedRow key={item.id} item={item} onPublish={onPublish} />
      ))}
    </ul>
  )
}

export default function ItemBoard({
  items,
  onPublish,
}: {
  items: ProjectItem[]
  onPublish: (item: ProjectItem, published: boolean) => void
}) {
  const [tab, setTab] = useState<ItemStage>(() => (items.some((i) => i.stage === 'drafted') ? 'drafted' : 'queued'))
  const shown = items.filter((i) => i.stage === tab)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.stage}
            onClick={() => setTab(t.stage)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              tab === t.stage ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {t.label} <span className="tabular-nums opacity-60">{items.filter((i) => i.stage === t.stage).length}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-slate-400">{TABS.find((t) => t.stage === tab)!.empty}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((i) => (
            <ItemCard key={i.id} item={i} onPublish={onPublish} />
          ))}
        </div>
      )}
    </div>
  )
}
