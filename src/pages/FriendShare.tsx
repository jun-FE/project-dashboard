import { useCallback, useEffect, useState } from 'react'
import {
  FriendAuthError,
  friendAddPlace,
  friendAddTodo,
  friendSetPlace,
  friendSetTodo,
  friendView,
  type FriendView,
} from '../lib/friends'
import { AddPlaceForm, AddTodoForm, Panel, PlaceItems, TodoItems } from '../components/friends/Lists'

// 친구가 링크(/f/<slug>)로 들어오는 페이지. 로그인 없이 비밀번호로만 열리고, 그 친구 것만 보인다.
// 비밀번호는 이 기기에만 기억한다 (브라우저 저장소, 막혀 있으면 매번 입력).
const storeKey = (slug: string) => `friend-pw:${slug}`
const remembered = (slug: string) => {
  try {
    return localStorage.getItem(storeKey(slug))
  } catch {
    return null
  }
}
const remember = (slug: string, pw: string | null) => {
  try {
    if (pw === null) localStorage.removeItem(storeKey(slug))
    else localStorage.setItem(storeKey(slug), pw)
  } catch {
    /* 저장 못 해도 이번 방문은 그대로 쓴다 */
  }
}

export default function FriendShare({ slug }: { slug: string }) {
  const [pw, setPw] = useState<string | null>(() => remembered(slug))
  const [view, setView] = useState<FriendView | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fail = useCallback(
    (e: Error) => {
      if (e instanceof FriendAuthError) {
        remember(slug, null)
        setPw(null)
        setView(null)
      }
      setError(e.message)
    },
    [slug],
  )
  const show = useCallback((v: FriendView) => {
    setView(v)
    setError(null)
  }, [])
  const load = useCallback(
    (password: string) =>
      friendView(slug, password).then(
        (v) => (show(v), true),
        (e: Error) => (fail(e), false),
      ),
    [slug, show, fail],
  )

  useEffect(() => {
    if (!pw) return
    friendView(slug, pw).then(show, fail)
    // 다른 사람이 바꾼 걸 보려고, 화면으로 돌아올 때 다시 불러온다
    const onFocus = () => document.visibilityState === 'visible' && friendView(slug, pw).then(show, fail)
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [pw, slug, show, fail])

  if (!pw || (!view && error)) {
    return <PasswordGate error={error} onSubmit={async (p) => (await load(p)) && (remember(slug, p), setPw(p))} />
  }
  if (!view) return <Page><p className="text-slate-400">불러오는 중…</p></Page>

  const v = view
  const viewer = { is: 'friend' as const, friendName: v.name }
  // 체크는 화면부터 바꾸고, 저장 뒤 다시 불러와 맞춘다
  async function act(next: FriendView, save: () => Promise<void>) {
    setView(next)
    try {
      await save()
    } catch (e) {
      alert((e as Error).message)
    }
    await load(pw!)
  }
  const sortTodos = [...v.todos].sort((a, b) => Number(a.done) - Number(b.done) || a.created_at.localeCompare(b.created_at))
  const sortPlaces = [...v.places].sort((a, b) => Number(a.visited) - Number(b.visited) || a.created_at.localeCompare(b.created_at))

  return (
    <Page title={`${v.name}, 같이 할 것들`}>
      <div className="space-y-4">
        <Panel title="같이 할 일" sub={`남은 ${v.todos.filter((t) => !t.done).length}개`}>
          <TodoItems
            todos={sortTodos}
            viewer={viewer}
            onToggle={(t) =>
              act({ ...v, todos: v.todos.map((x) => (x.id === t.id ? { ...x, done: !t.done, done_by: t.done ? null : 'friend' } : x)) }, () =>
                friendSetTodo(slug, pw, t.id, !t.done),
              )
            }
          />
          <AddTodoForm onAdd={async (title) => { await friendAddTodo(slug, pw, title); await load(pw) }} />
        </Panel>
        <Panel title="같이 갈 맛집" sub={`안 가본 곳 ${v.places.filter((p) => !p.visited).length}곳`}>
          <PlaceItems
            places={sortPlaces}
            viewer={viewer}
            onToggle={(p) =>
              act({ ...v, places: v.places.map((x) => (x.id === p.id ? { ...x, visited: !p.visited } : x)) }, () =>
                friendSetPlace(slug, pw, p.id, !p.visited),
              )
            }
          />
          <AddPlaceForm onAdd={async (input) => { await friendAddPlace(slug, pw, input); await load(pw) }} />
        </Panel>
        <button
          onClick={() => {
            remember(slug, null)
            setPw(null)
            setView(null)
            setError(null)
          }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          이 기기에서 비밀번호 잊기
        </button>
      </div>
    </Page>
  )
}

function PasswordGate({ error, onSubmit }: { error: string | null; onSubmit: (pw: string) => Promise<unknown> }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Page>
      <form
        className="mx-auto mt-10 max-w-xs space-y-3 rounded-xl border border-slate-200 bg-white p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          await onSubmit(value)
          setBusy(false)
        }}
      >
        <h1 className="text-base font-semibold">같이 할 것들</h1>
        <p className="text-sm text-slate-500">받은 비밀번호를 넣어 주세요.</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="비밀번호"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy || !value} className="w-full rounded-md bg-slate-900 py-2 text-sm text-white disabled:opacity-40">
          열기
        </button>
      </form>
    </Page>
  )
}

function Page({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {title && (
        <header className="border-b border-slate-200 bg-white">
          <h1 className="mx-auto max-w-3xl px-4 py-5 text-xl font-semibold sm:px-6">{title}</h1>
        </header>
      )}
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
