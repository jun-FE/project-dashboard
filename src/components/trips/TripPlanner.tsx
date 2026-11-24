import { useCallback, useEffect, useRef, useState } from 'react'
import {
  KINDS,
  copy,
  dDay,
  dayItems,
  dayLabel,
  daysBetween,
  googleEmbed,
  googleRoute,
  googleSearch,
  kindInfo,
  naverSearch,
  safeLink,
  scheduleText,
  type Kind,
  type TripApi,
  type TripInfo,
  type TripItem,
  type TripView,
} from '../../lib/trips'

// 여행 계획 화면. 나(/trips/:slug)와 초대받은 사람(/t/:slug)이 같이 쓴다.
// 여러 명이 동시에 고치므로 8초마다, 그리고 화면으로 돌아올 때 다시 불러온다.

const nameKey = (slug: string) => `trip-name:${slug}`
const storedName = (slug: string) => {
  try {
    return localStorage.getItem(nameKey(slug))
  } catch {
    return null
  }
}
const storeName = (slug: string, name: string | null) => {
  try {
    if (name) localStorage.setItem(nameKey(slug), name)
    else localStorage.removeItem(nameKey(slug))
  } catch {
    /* 저장 못 해도 이번 방문은 그대로 */
  }
}

const input = 'min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-slate-400'

export default function TripPlanner({
  slug,
  api,
  onAuthError,
  extraHeader,
}: {
  slug: string
  api: TripApi
  onAuthError?: (e: Error) => void
  extraHeader?: React.ReactNode
}) {
  const [view, setView] = useState<TripView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<string | null>(() => storedName(slug))
  const [tab, setTab] = useState<'wish' | 'plan' | 'pack'>('wish')
  const busy = useRef(false) // 드래그 중엔 다시 불러오지 않는다

  const fail = useCallback(
    (e: Error) => {
      setError(e.message)
      onAuthError?.(e)
    },
    [onAuthError],
  )
  const show = useCallback((v: TripView) => {
    setView(v)
    setError(null)
  }, [])
  const reload = useCallback(() => api.view().then(show, fail), [api, show, fail])

  useEffect(() => {
    api.view().then(show, fail)
    const tick = () => document.visibilityState === 'visible' && !busy.current && api.view().then(show, () => {})
    const id = window.setInterval(tick, 8000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [api, show, fail])

  if (!view) {
    return error ? (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">불러오지 못했어요: {error}</div>
    ) : (
      <p className="text-slate-400">불러오는 중…</p>
    )
  }

  if (!me) {
    return (
      <NamePicker
        title={view.trip.title}
        members={view.members}
        onPick={async (name) => {
          try {
            await api.join(name)
            storeName(slug, name)
            setMe(name)
            reload()
          } catch (e) {
            alert((e as Error).message)
          }
        }}
      />
    )
  }

  const v = view
  const days = daysBetween(v.trip.start_date, v.trip.end_date)

  // 화면부터 바꾸고 저장, 그다음 다시 불러와 다른 사람 변경과 맞춘다
  async function act(next: TripView, save: () => Promise<unknown>) {
    setView(next)
    try {
      await save()
    } catch (e) {
      alert((e as Error).message)
    }
    reload()
  }
  const patchItem = (id: string, patch: Partial<TripItem>) =>
    act({ ...v, items: v.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }, () => api.updateItem(id, patch))

  // 그날 끝에, 또는 beforeId 앞에 넣는다
  function place(id: string, day: string, beforeId?: string) {
    const list = dayItems(v.items, day).filter((i) => i.id !== id)
    let sort: number
    const at = beforeId ? list.findIndex((i) => i.id === beforeId) : -1
    if (at < 0) sort = list.length ? list[list.length - 1].sort + 1 : 1
    else if (at === 0) sort = list[0].sort - 1
    else sort = (list[at - 1].sort + list[at].sort) / 2
    patchItem(id, { day, sort })
  }
  function nudge(item: TripItem, dir: -1 | 1) {
    const list = dayItems(v.items, item.day!)
    const i = list.findIndex((x) => x.id === item.id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const far = list[j + dir]
    const sort = far ? (list[j].sort + far.sort) / 2 : list[j].sort + dir
    patchItem(item.id, { sort })
  }

  const ctx: Ctx = {
    v,
    me,
    days,
    api,
    act,
    patchItem,
    place,
    nudge,
    setDragging: (on) => (busy.current = on),
  }

  const wishCount = v.items.filter((i) => i.kind !== 'pack' && !i.day).length
  const planCount = v.items.filter((i) => i.kind !== 'pack' && i.day).length
  const packLeft = v.items.filter((i) => i.kind === 'pack' && !i.done).length

  return (
    <div className="space-y-4">
      <TripHeader
        ctx={ctx}
        extra={extraHeader}
        onRename={() => {
          storeName(slug, null)
          setMe(null)
        }}
      />

      {/* 휴대폰: 탭으로 나눠 보기 */}
      <div className="sticky top-0 z-10 -mx-4 flex gap-1 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur lg:hidden">
        {(
          [
            ['wish', `위시리스트 ${wishCount}`],
            ['plan', `일정 ${planCount}`],
            ['pack', `챙길 것 ${packLeft}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm ${tab === k ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className={`space-y-4 ${tab === 'plan' ? 'hidden lg:block' : ''}`}>
          <div className={tab === 'pack' ? 'hidden lg:block' : ''}>
            <Wishlist ctx={ctx} />
          </div>
          <div className={tab === 'wish' ? 'hidden lg:block' : ''}>
            <PackList ctx={ctx} />
          </div>
        </div>
        <div className={tab === 'plan' ? '' : 'hidden lg:block'}>
          <Schedule ctx={ctx} />
        </div>
      </div>
    </div>
  )
}

interface Ctx {
  v: TripView
  me: string
  days: string[]
  api: TripApi
  act: (next: TripView, save: () => Promise<unknown>) => Promise<void>
  patchItem: (id: string, patch: Partial<TripItem>) => Promise<void>
  place: (id: string, day: string, beforeId?: string) => void
  nudge: (item: TripItem, dir: -1 | 1) => void
  setDragging: (on: boolean) => void
}

// ---------------------------------------------------------------- 이름 고르기

function NamePicker({ title, members, onPick }: { title: string; members: string[]; onPick: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="mx-auto mt-6 max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-slate-500">누구세요? 내가 넣은 것과 좋아요에 이 이름이 붙어요.</p>
      </div>
      {members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button key={m} onClick={() => onPick(m)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200">
              {m}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onPick(name.trim())
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder={members.length ? '처음이면 이름 입력' : '이름'} className={`${input} flex-1`} />
        <button disabled={!name.trim()} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">
          들어가기
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------- 머리: 여행 정보

function TripHeader({ ctx, extra, onRename }: { ctx: Ctx; extra?: React.ReactNode; onRename: () => void }) {
  const { v, me } = ctx
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const t = v.trip
  const dd = dDay(t.start_date, t.end_date)
  const planned = v.items.filter((i) => i.kind !== 'pack' && i.day).length
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      {editing ? (
        <TripInfoForm
          initial={t}
          submitLabel="저장"
          onCancel={() => setEditing(false)}
          onSubmit={async (next) => {
            const outside = v.items.filter((i) => i.day && !daysBetween(next.start_date, next.end_date).includes(i.day)).length
            if (outside && !confirm(`바뀐 날짜 밖에 있는 일정 ${outside}개는 위시리스트로 돌아가요. 바꿀까요?`)) return
            await ctx.act({ ...v, trip: next }, () => ctx.api.update(next))
            setEditing(false)
          }}
        />
      ) : (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-semibold">{t.title}</h2>
              {dd && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{dd}</span>}
            </div>
            <p className="text-sm text-slate-500">
              {t.destination ? `📍 ${t.destination}` : '여행지 미정'} ·{' '}
              {t.start_date && t.end_date
                ? `${dayLabel(t.start_date)} ~ ${dayLabel(t.end_date)} (${ctx.days.length - 1}박 ${ctx.days.length}일)`
                : '날짜 미정'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {v.members.map((m) => (
                <span key={m} className={`rounded-full px-2 py-0.5 ${m === me ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {m}
                </span>
              ))}
              <button onClick={onRename} className="ml-1 text-slate-400 hover:text-slate-700">
                내가 아니에요
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button onClick={() => setEditing(true)} className="text-slate-600 hover:underline">
              여행 정보 고치기
            </button>
            {planned > 0 && (
              <button onClick={async () => setCopied(await copy(scheduleText(v)))} className="text-slate-600 hover:underline">
                {copied ? '일정 복사함 ✓' : '일정 텍스트 복사'}
              </button>
            )}
          </div>
          {!t.start_date && (
            <p className="w-full rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              날짜를 정하면 날짜별 일정 칸이 생겨요. <button onClick={() => setEditing(true)} className="font-medium underline">날짜 정하기</button>
            </p>
          )}
        </div>
      )}
      {extra}
    </section>
  )
}

export function TripInfoForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  children,
}: {
  initial?: TripInfo
  submitLabel: string
  onSubmit: (t: TripInfo) => Promise<void>
  onCancel?: () => void
  children?: React.ReactNode
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [dest, setDest] = useState(initial?.destination ?? '')
  const [start, setStart] = useState(initial?.start_date ?? '')
  const [end, setEnd] = useState(initial?.end_date ?? '')
  const [busy, setBusy] = useState(false)
  const n = daysBetween(start || null, end || null).length
  const badRange = !!start && !!end && (end < start || n > 31)
  const half = !!start !== !!end
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await onSubmit({ title: title.trim(), destination: dest.trim() || null, start_date: start || null, end_date: end || null })
        } catch (err) {
          alert((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-500">
          여행 이름
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="예: 12월 오사카" className={`${input} mt-1 w-full`} />
        </label>
        <label className="text-xs text-slate-500">
          여행지
          <input value={dest} onChange={(e) => setDest(e.target.value)} maxLength={60} placeholder="예: 오사카, 일본" className={`${input} mt-1 w-full`} />
        </label>
        <label className="text-xs text-slate-500">
          가는 날
          <input type="date" value={start} onChange={(e) => (setStart(e.target.value), !end && setEnd(e.target.value))} className={`${input} mt-1 w-full`} />
        </label>
        <label className="text-xs text-slate-500">
          오는 날
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={`${input} mt-1 w-full`} />
        </label>
      </div>
      {children}
      <div className="flex items-center gap-3">
        <button disabled={busy || !title.trim() || badRange || half} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-slate-400">
            취소
          </button>
        )}
        <span className="text-xs text-slate-400">
          {badRange ? '날짜를 확인해 주세요 (최대 31일)' : half ? '가는 날·오는 날 둘 다 정해 주세요' : n ? `${n - 1}박 ${n}일` : '날짜는 나중에 정해도 돼요'}
        </span>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------- 위시리스트

function Wishlist({ ctx }: { ctx: Ctx }) {
  const { v } = ctx
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [showPlanned, setShowPlanned] = useState(false)
  const items = v.items
    .filter((i) => i.kind !== 'pack' && (kind === 'all' || i.kind === kind) && (showPlanned || !i.day))
    .sort((a, b) => b.likes.length - a.likes.length || a.sort - b.sort)
  const planned = v.items.filter((i) => i.kind !== 'pack' && i.day && (kind === 'all' || i.kind === kind)).length
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">위시리스트</h3>
        <span className="text-xs text-slate-400">각자 넣고, 끌어서 날짜에 놓거나 📅로 넣어요</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[{ kind: 'all' as const, label: '전체', icon: '' }, ...KINDS].map((k) => (
          <button
            key={k.kind}
            onClick={() => setKind(k.kind)}
            className={`rounded-full px-2.5 py-1 text-xs ${kind === k.kind ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {k.icon} {k.label}
          </button>
        ))}
      </div>
      <AddItemForm ctx={ctx} defaultKind={kind === 'all' ? 'do' : kind} />
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          {planned ? '남은 게 없어요. 다 일정에 넣었어요.' : '아직 없어요. 하고 싶은 것·먹고 싶은 것을 넣어 보세요.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((i) => (
            <WishCard key={i.id} ctx={ctx} item={i} />
          ))}
        </ul>
      )}
      {planned > 0 && (
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={showPlanned} onChange={(e) => setShowPlanned(e.target.checked)} />
          일정에 넣은 것도 보기 ({planned})
        </label>
      )}
    </section>
  )
}

function AddItemForm({ ctx, defaultKind }: { ctx: Ctx; defaultKind: Kind }) {
  const [kind, setKind] = useState<Kind>(defaultKind)
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [link, setLink] = useState('')
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastDefault, setLastDefault] = useState(defaultKind)
  if (lastDefault !== defaultKind) {
    setLastDefault(defaultKind)
    setKind(defaultKind)
  }
  return (
    <form
      className="space-y-2 rounded-lg bg-slate-50 p-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        setBusy(true)
        try {
          await ctx.api.addItem(kind, title.trim(), memo, link, ctx.me)
          setTitle('')
          setMemo('')
          setLink('')
          setMore(false)
          await ctx.act(ctx.v, async () => {})
        } catch (err) {
          alert((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="flex gap-1.5">
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={`${input} w-auto`} aria-label="종류">
          {KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.icon} {k.label}
            </option>
          ))}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="예: 도톤보리 산책, 이치란 라멘" className={`${input} flex-1`} />
        <button disabled={busy || !title.trim()} className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">
          넣기
        </button>
      </div>
      {more ? (
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={300} placeholder="메모 (가격, 예약 필요 등)" className={`${input} flex-1`} />
          <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="링크 (지도·인스타·블로그)" className={`${input} flex-1`} />
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="px-1 text-xs text-slate-400 hover:text-slate-700">
          + 메모·링크
        </button>
      )}
    </form>
  )
}

function MapLinks({ item, dest }: { item: TripItem; dest: string | null }) {
  const own = safeLink(item.link)
  return (
    <span className="flex items-center gap-2 text-xs">
      {own && (
        <a href={own} target="_blank" rel="noreferrer" className="text-slate-500 hover:underline">
          🔗 링크
        </a>
      )}
      <a href={googleSearch(item, dest)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700">
        구글지도
      </a>
      <a href={naverSearch(item, dest)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-700">
        네이버지도
      </a>
    </span>
  )
}

function LikeButton({ ctx, item }: { ctx: Ctx; item: TripItem }) {
  const liked = item.likes.includes(ctx.me)
  return (
    <button
      title={item.likes.length ? `좋아요: ${item.likes.join(', ')}` : '좋아요'}
      onClick={() =>
        ctx.act(
          { ...ctx.v, items: ctx.v.items.map((i) => (i.id === item.id ? { ...i, likes: liked ? i.likes.filter((n) => n !== ctx.me) : [...i.likes, ctx.me] } : i)) },
          () => ctx.api.toggleLike(item.id, ctx.me),
        )
      }
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${liked ? 'bg-rose-50 text-rose-600' : 'text-slate-300 hover:text-rose-500'}`}
    >
      {liked ? '♥' : '♡'} {item.likes.length || ''}
    </button>
  )
}

function DeleteButton({ onDelete, label = '지우기' }: { onDelete: () => void; label?: string }) {
  const [armed, setArmed] = useState(false)
  return armed ? (
    <button onClick={onDelete} onBlur={() => setArmed(false)} autoFocus className="shrink-0 text-xs font-medium text-rose-600">
      정말 {label}
    </button>
  ) : (
    <button onClick={() => setArmed(true)} className="shrink-0 text-xs text-slate-300 hover:text-rose-600">
      {label}
    </button>
  )
}

function EditItem({ ctx, item, onDone }: { ctx: Ctx; item: TripItem; onDone: () => void }) {
  const [title, setTitle] = useState(item.title)
  const [memo, setMemo] = useState(item.memo ?? '')
  const [link, setLink] = useState(item.link ?? '')
  const [kind, setKind] = useState(item.kind)
  return (
    <form
      className="mt-2 space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        ctx.patchItem(item.id, { title: title.trim(), memo: memo.trim() || null, link: link.trim() || null, kind })
        onDone()
      }}
    >
      <div className="flex gap-1.5">
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={`${input} w-auto`}>
          {KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.icon}
            </option>
          ))}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={`${input} flex-1`} />
      </div>
      <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={300} placeholder="메모" className={`${input} w-full`} />
      <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="링크" className={`${input} w-full`} />
      <div className="flex gap-3 text-xs">
        <button className="rounded-md bg-slate-900 px-2.5 py-1 text-white">저장</button>
        <button type="button" onClick={onDone} className="text-slate-400">
          취소
        </button>
      </div>
    </form>
  )
}

function WishCard({ ctx, item }: { ctx: Ctx; item: TripItem }) {
  const [editing, setEditing] = useState(false)
  const k = kindInfo(item.kind)
  return (
    <li
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id)
        e.dataTransfer.effectAllowed = 'move'
        ctx.setDragging(true)
      }}
      onDragEnd={() => ctx.setDragging(false)}
      className={`rounded-lg border bg-white p-2.5 ${item.day ? 'border-dashed border-slate-200 opacity-60' : 'cursor-grab border-slate-200 hover:border-slate-300 active:cursor-grabbing'}`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs ring-1 ${k.color}`} title={k.label}>
          {k.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{item.title}</p>
          {item.memo && <p className="mt-0.5 text-xs text-slate-500">{item.memo}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <MapLinks item={item} dest={ctx.v.trip.destination} />
            {item.added_by && <span className="text-xs text-slate-400">by {item.added_by}</span>}
            {item.day && <span className="text-xs text-slate-500">📅 {dayLabel(item.day)}</span>}
          </div>
        </div>
        <LikeButton ctx={ctx} item={item} />
      </div>
      {editing ? (
        <EditItem ctx={ctx} item={item} onDone={() => setEditing(false)} />
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2">
          {ctx.days.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && ctx.place(item.id, e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600"
              aria-label="날짜에 넣기"
            >
              <option value="">📅 {item.day ? '다른 날로' : '날짜에 넣기'}</option>
              {ctx.days.map((d, n) => (
                <option key={d} value={d}>
                  Day {n + 1} · {dayLabel(d)}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-slate-700">
            고치기
          </button>
          <span className="ml-auto">
            <DeleteButton
              onDelete={() => ctx.act({ ...ctx.v, items: ctx.v.items.filter((i) => i.id !== item.id) }, () => ctx.api.deleteItem(item.id))}
            />
          </span>
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------- 날짜별 일정

function Schedule({ ctx }: { ctx: Ctx }) {
  if (ctx.days.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        여행 날짜를 정하면 여기에 날짜별 일정 칸이 생겨요.
      </section>
    )
  }
  return (
    <div className="space-y-3">
      {ctx.days.map((d, n) => (
        <DayCard key={d} ctx={ctx} day={d} n={n} />
      ))}
    </div>
  )
}

function DayCard({ ctx, day, n }: { ctx: Ctx; day: string; n: number }) {
  const [over, setOver] = useState(false)
  const items = dayItems(ctx.v.items, day)
  const route = googleRoute(items, ctx.v.trip.destination)
  const drop = (e: React.DragEvent, beforeId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(false)
    ctx.setDragging(false)
    const id = e.dataTransfer.getData('text/plain')
    if (id && id !== beforeId) ctx.place(id, day, beforeId)
  }
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={(e) => drop(e)}
      className={`rounded-xl border bg-white p-4 transition ${over ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'}`}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Day {n + 1} <span className="font-normal text-slate-500">· {dayLabel(day)}</span>
        </h3>
        {route && (
          <a href={route} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-slate-800">
            🗺 {items.length > 1 ? '구글 지도로 동선 보기' : '지도'}
          </a>
        )}
      </div>
      {items.length === 0 ? (
        <p className={`rounded-lg border border-dashed px-3 py-4 text-center text-xs ${over ? 'border-sky-300 text-sky-600' : 'border-slate-200 text-slate-400'}`}>
          위시리스트에서 끌어다 놓거나 📅 날짜에 넣기
        </p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((it, i) => (
            <PlanRow key={it.id} ctx={ctx} item={it} first={i === 0} last={i === items.length - 1} onDrop={(e) => drop(e, it.id)} />
          ))}
        </ol>
      )}
    </section>
  )
}

function PlanRow({ ctx, item, first, last, onDrop }: { ctx: Ctx; item: TripItem; first: boolean; last: boolean; onDrop: (e: React.DragEvent) => void }) {
  const [map, setMap] = useState(false)
  const [time, setTime] = useState(item.time ?? '')
  const [lastTime, setLastTime] = useState(item.time)
  if (lastTime !== item.time) {
    setLastTime(item.time)
    setTime(item.time ?? '')
  }
  const k = kindInfo(item.kind)
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id)
        ctx.setDragging(true)
      }}
      onDragEnd={() => ctx.setDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="cursor-grab rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onBlur={() => time !== (item.time ?? '') && ctx.patchItem(item.id, { time: time || null })}
          className="w-[5.5rem] shrink-0 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-600"
          aria-label="시간"
        />
        <span className="shrink-0" title={k.label}>
          {k.icon}
        </span>
        <button onClick={() => setMap(!map)} className="min-w-0 flex-1 truncate text-left text-sm text-slate-900 hover:underline" title="지도 미리보기">
          {item.title}
        </button>
        <LikeButton ctx={ctx} item={item} />
        <span className="flex shrink-0 items-center text-slate-400">
          <button disabled={first} onClick={() => ctx.nudge(item, -1)} className="px-1 hover:text-slate-800 disabled:opacity-20" aria-label="위로">
            ↑
          </button>
          <button disabled={last} onClick={() => ctx.nudge(item, 1)} className="px-1 hover:text-slate-800 disabled:opacity-20" aria-label="아래로">
            ↓
          </button>
        </span>
        <button onClick={() => ctx.patchItem(item.id, { day: null, time: null })} className="shrink-0 text-xs text-slate-400 hover:text-rose-600" title="위시리스트로 돌려놓기">
          빼기
        </button>
      </div>
      {item.memo && <p className="mt-1 pl-[6.25rem] text-xs text-slate-500">{item.memo}</p>}
      {map && (
        <div className="mt-2 space-y-1.5">
          <iframe title={`${item.title} 지도`} src={googleEmbed(item, ctx.v.trip.destination)} className="h-56 w-full rounded-md border border-slate-200" loading="lazy" />
          <MapLinks item={item} dest={ctx.v.trip.destination} />
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------- 챙길 것

function PackList({ ctx }: { ctx: Ctx }) {
  const [title, setTitle] = useState('')
  const items = ctx.v.items.filter((i) => i.kind === 'pack').sort((a, b) => Number(a.done) - Number(b.done) || a.sort - b.sort)
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">🎒 챙길 것 · 할 일</h3>
        <span className="text-xs text-slate-400">
          {items.filter((i) => i.done).length}/{items.length}
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-center gap-2 text-sm">
            <input type="checkbox" checked={i.done} onChange={() => ctx.patchItem(i.id, { done: !i.done })} className="h-4 w-4 accent-slate-900" />
            <span className={`min-w-0 flex-1 ${i.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{i.title}</span>
            {i.added_by && <span className="text-xs text-slate-300">{i.added_by}</span>}
            <span className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <DeleteButton onDelete={() => ctx.act({ ...ctx.v, items: ctx.v.items.filter((x) => x.id !== i.id) }, () => ctx.api.deleteItem(i.id))} />
            </span>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!title.trim()) return
          const t = title.trim()
          setTitle('')
          await ctx.act(ctx.v, () => ctx.api.addItem('pack', t, '', '', ctx.me))
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="예: 여권, 항공권 예약, 환전, 유심" className={`${input} flex-1`} />
        <button disabled={!title.trim()} className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">
          추가
        </button>
      </form>
    </section>
  )
}
