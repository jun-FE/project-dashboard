import { useState } from 'react'
import { safeLink, todayKst, type FriendPlace, type FriendTodo, type PlaceInput, type Visit } from '../../lib/friends'

// 친구 화면에는 friend_id 가 없다
type Todo = Omit<FriendTodo, 'friend_id'> & { friend_id?: string }
type Place = Omit<FriendPlace, 'friend_id'> & { friend_id?: string }

// viewer: 누가 보는 화면인지. "누가 체크했는지/추가했는지"를 그 사람 기준으로 적는다.
export interface Viewer {
  is: 'me' | 'friend'
  friendName: string
}

function whoLabel(who: 'me' | 'friend' | null, v: Viewer) {
  if (!who || who === v.is) return null
  return who === 'friend' ? v.friendName : '친구' // 친구 화면에서 나는 "친구"
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false)
  return armed ? (
    <button onClick={onDelete} onBlur={() => setArmed(false)} className="shrink-0 text-xs font-medium text-rose-600">
      정말 지우기
    </button>
  ) : (
    <button onClick={() => setArmed(true)} className="shrink-0 text-xs text-slate-300 hover:text-rose-600" aria-label="지우기">
      지우기
    </button>
  )
}

export function TodoItems({
  todos,
  viewer,
  tag,
  onToggle,
  onDelete,
}: {
  todos: Todo[]
  viewer: Viewer
  tag?: (t: Todo) => string | undefined // 모아보기에서 친구 이름 표시
  onToggle: (t: Todo) => void
  onDelete?: (t: Todo) => void
}) {
  if (todos.length === 0) return <p className="px-1 py-3 text-sm text-slate-400">할 일이 없어요.</p>
  return (
    <ul className="divide-y divide-slate-100">
      {todos.map((t) => {
        const doneBy = t.done ? whoLabel(t.done_by, viewer) : null
        const addedBy = whoLabel(t.created_by, viewer)
        return (
          <li key={t.id} className="flex items-start gap-3 px-1 py-2.5">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => onToggle(t)}
              aria-label={t.title}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-slate-900"
            />
            <span className="min-w-0 flex-1 text-sm">
              {tag?.(t) && <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{tag(t)}</span>}
              <span className={t.done ? 'text-slate-400 line-through' : 'text-slate-900'}>{t.title}</span>
              {(doneBy || addedBy) && (
                <span className="ml-1.5 text-xs text-slate-400">
                  {[addedBy && `${addedBy} 추가`, doneBy && `${doneBy} 체크`].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            {onDelete && <DeleteButton onDelete={() => onDelete(t)} />}
          </li>
        )
      })}
    </ul>
  )
}

function PlaceName({ p }: { p: Place }) {
  const link = safeLink(p.link)
  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 underline-offset-2 hover:underline">
      {p.name} ↗
    </a>
  ) : (
    <span className="font-medium text-slate-900">{p.name}</span>
  )
}

function Tag({ text }: { text?: string }) {
  return text ? <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{text}</span> : null
}

// "다녀왔어요"를 누르면 날짜(기본 오늘)와 한줄 후기를 적고 기록으로 넘긴다
function VisitForm({ onSave, onCancel }: { onSave: (v: Visit) => Promise<void>; onCancel: () => void }) {
  const [on, setOn] = useState(todayKst())
  const [review, setReview] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mt-2 flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        await onSave({ on, review })
        setBusy(false)
      }}
    >
      <input type="date" value={on} max={todayKst()} onChange={(e) => setOn(e.target.value)} aria-label="다녀온 날" className={`${inputCls} w-36`} />
      <input autoFocus value={review} onChange={(e) => setReview(e.target.value)} maxLength={300} placeholder="한줄 후기 (선택)" className={`${inputCls} flex-1`} />
      <button disabled={busy || !on} className={buttonCls}>
        기록
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-700">
        취소
      </button>
    </form>
  )
}

export function PlaceItems({
  places,
  viewer,
  tag,
  onVisit,
  onDelete,
}: {
  places: Place[] // 아직 안 가본 곳
  viewer: Viewer
  tag?: (p: Place) => string | undefined
  onVisit: (p: Place, v: Visit) => Promise<void>
  onDelete?: (p: Place) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (places.length === 0) return <p className="px-1 py-3 text-sm text-slate-400">가볼 곳이 없어요. 아래에서 추가해 보세요.</p>
  return (
    <ul className="divide-y divide-slate-100">
      {places.map((p) => {
        const addedBy = whoLabel(p.created_by, viewer)
        return (
          <li key={p.id} className="px-1 py-2.5">
            <div className="flex items-start gap-3">
              <span className="min-w-0 flex-1 text-sm">
                <Tag text={tag?.(p)} />
                <PlaceName p={p} />
                {p.area && <span className="ml-1.5 text-xs text-slate-500">{p.area}</span>}
                {addedBy && <span className="ml-1.5 text-xs text-slate-400">{addedBy} 추가</span>}
                {p.memo && <span className="mt-0.5 block text-xs text-slate-500">{p.memo}</span>}
              </span>
              {openId !== p.id && (
                <button
                  onClick={() => setOpenId(p.id)}
                  className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                >
                  ✓ 다녀왔어요
                </button>
              )}
              {onDelete && <DeleteButton onDelete={() => onDelete(p)} />}
            </div>
            {openId === p.id && (
              <VisitForm
                onCancel={() => setOpenId(null)}
                onSave={async (v) => {
                  await onVisit(p, v)
                  setOpenId(null)
                }}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

const dateLabel = (d: string | null) => {
  if (!d) return '날짜 없음'
  const [y, m, day] = d.split('-').map(Number)
  return `${y === Number(todayKst().slice(0, 4)) ? '' : `${y}년 `}${m}월 ${day}일`
}

// 다녀온 곳 히스토리: 최근 다녀온 순
export function VisitHistory({
  places,
  tag,
  onUndo,
}: {
  places: Place[] // 다녀온 곳
  tag?: (p: Place) => string | undefined
  onUndo: (p: Place) => void
}) {
  if (places.length === 0) return <p className="px-1 py-3 text-sm text-slate-400">아직 같이 다녀온 곳이 없어요. 가볼 곳에서 "다녀왔어요"를 누르면 여기 쌓여요.</p>
  const rows = [...places].sort((a, b) => (b.visited_on ?? '').localeCompare(a.visited_on ?? '') || (b.visited_at ?? '').localeCompare(a.visited_at ?? ''))
  return (
    <ol className="divide-y divide-slate-100">
      {rows.map((p) => (
        <li key={p.id} className="group flex items-start gap-3 px-1 py-2.5 text-sm">
          <span className="w-20 shrink-0 pt-px text-xs tabular-nums text-slate-500">{dateLabel(p.visited_on)}</span>
          <span className="min-w-0 flex-1">
            <Tag text={tag?.(p)} />
            <PlaceName p={p} />
            {p.area && <span className="ml-1.5 text-xs text-slate-500">{p.area}</span>}
            {p.review && <span className="mt-0.5 block text-slate-600">“{p.review}”</span>}
          </span>
          <button onClick={() => onUndo(p)} className="shrink-0 text-xs text-slate-300 hover:text-slate-600">
            기록 취소
          </button>
        </li>
      ))}
    </ol>
  )
}

const inputCls =
  'min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400'
const buttonCls = 'shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40'

export function AddTodoForm({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        setBusy(true)
        try {
          await onAdd(title.trim())
          setTitle('')
        } catch (err) {
          alert(`추가하지 못했어요: ${(err as Error).message}`)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="같이 할 일 추가" className={`${inputCls} flex-1`} />
      <button disabled={busy || !title.trim()} className={buttonCls}>
        추가
      </button>
    </form>
  )
}

export function AddPlaceForm({ onAdd }: { onAdd: (p: PlaceInput) => Promise<void> }) {
  const empty = { name: '', area: '', link: '', memo: '' }
  const [p, setP] = useState(empty)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value })
  return (
    <form
      className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_1.4fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!p.name.trim()) return
        setBusy(true)
        try {
          await onAdd({ name: p.name.trim(), area: p.area.trim(), link: p.link.trim(), memo: p.memo.trim() })
          setP(empty)
        } catch (err) {
          alert(`추가하지 못했어요: ${(err as Error).message}`)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input value={p.name} onChange={set('name')} maxLength={100} placeholder="가게 이름" className={inputCls} />
      <input value={p.area} onChange={set('area')} maxLength={50} placeholder="동네 (선택)" className={inputCls} />
      <input value={p.link} onChange={set('link')} maxLength={500} placeholder="지도·인스타 링크 (선택)" className={`${inputCls} col-span-2 sm:col-span-1`} />
      <button disabled={busy || !p.name.trim()} className={`${buttonCls} col-span-2 sm:col-span-1`}>
        추가
      </button>
      <input value={p.memo} onChange={set('memo')} maxLength={300} placeholder="메모 (선택: 먹어볼 메뉴, 웨이팅 등)" className={`${inputCls} col-span-2 sm:col-span-4`} />
    </form>
  )
}

export function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
      {children}
    </section>
  )
}
