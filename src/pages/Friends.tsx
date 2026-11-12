import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  addPlace,
  addTodo,
  createFriend,
  deleteFriend,
  deletePlace,
  deleteTodo,
  fetchFriendsData,
  friendUrl,
  setFriendPassword,
  setPlaceVisited,
  setTodoDone,
  type Friend,
  type FriendsData,
  type Visit,
} from '../lib/friends'
import { AddPlaceForm, AddTodoForm, Panel, PlaceItems, TodoItems, VisitHistory } from '../components/friends/Lists'

const ALL = 'all'

const openFirst = <T extends { created_at: string }>(done: (x: T) => boolean) => (a: T, b: T) =>
  Number(done(a)) - Number(done(b)) || a.created_at.localeCompare(b.created_at)

function inviteText(f: Friend, password: string) {
  return `${f.name}, 우리 같이 할 일이랑 가볼 맛집 정리해 둔 페이지야.\n링크: ${friendUrl(f.slug)}\n비밀번호: ${password}`
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// 비밀번호는 해시로만 저장돼서 다시 볼 수 없다. 만들거나 바꾼 직전에만 초대 문구를 보여준다.
function InviteBox({ friend, password, onClose }: { friend: Friend; password: string; onClose: () => void }) {
  const text = inviteText(friend, password)
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <p className="font-medium text-emerald-800">{friend.name}에게 보낼 문구예요. 비밀번호는 지금만 보여요.</p>
      <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-white p-3 font-sans text-slate-700">{text}</pre>
      <div className="mt-2 flex gap-3">
        <button onClick={async () => setCopied(await copy(text))} className="rounded-md bg-emerald-700 px-3 py-1.5 text-white">
          {copied ? '복사했어요' : '문구 복사'}
        </button>
        <button onClick={onClose} className="text-emerald-800 hover:underline">
          닫기
        </button>
      </div>
    </div>
  )
}

function AddFriendForm({ onCreated }: { onCreated: (f: Friend, password: string) => void }) {
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          onCreated(await createFriend(name.trim(), pw), pw)
          setName('')
          setPw('')
        } catch (err) {
          alert(`만들지 못했어요: ${(err as Error).message}`)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="친구 이름" className="min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400" />
      <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="친구에게 줄 비밀번호 (4자 이상)" className="min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400" />
      <button disabled={busy || !name.trim() || pw.length < 4} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">
        친구 추가
      </button>
    </form>
  )
}

function FriendSettings({ friend, onDeleted, onPassword }: { friend: Friend; onDeleted: () => void; onPassword: (pw: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [newPw, setNewPw] = useState<string | null>(null)
  const [armDelete, setArmDelete] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <span className="min-w-0 truncate text-slate-500">{friendUrl(friend.slug)}</span>
      <button onClick={async () => setCopied(await copy(friendUrl(friend.slug)))} className="text-slate-700 hover:underline">
        {copied ? '링크 복사함' : '링크 복사'}
      </button>
      {newPw === null ? (
        <button onClick={() => setNewPw('')} className="text-slate-700 hover:underline">
          비밀번호 바꾸기
        </button>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await setFriendPassword(friend.id, newPw)
              onPassword(newPw)
              setNewPw(null)
            } catch (err) {
              alert(`바꾸지 못했어요: ${(err as Error).message}`)
            }
          }}
        >
          <input autoFocus value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="새 비밀번호" className="w-32 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-slate-400" />
          <button disabled={newPw.length < 4} className="text-slate-900 disabled:opacity-40">
            저장
          </button>
          <button type="button" onClick={() => setNewPw(null)} className="text-slate-400">
            취소
          </button>
        </form>
      )}
      <span className="ml-auto">
        {armDelete ? (
          <button onClick={onDeleted} onBlur={() => setArmDelete(false)} className="font-medium text-rose-600">
            할 일·맛집까지 모두 지우기
          </button>
        ) : (
          <button onClick={() => setArmDelete(true)} className="text-slate-400 hover:text-rose-600">
            친구 지우기
          </button>
        )}
      </span>
    </div>
  )
}

export default function Friends() {
  const [data, setData] = useState<FriendsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const [invite, setInvite] = useState<{ friend: Friend; password: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const selected = params.get('f') ?? ALL
  const select = (id: string) => setParams(id === ALL ? {} : { f: id }, { replace: true })

  useEffect(() => {
    fetchFriendsData()
      .then(setData)
      .catch((e) => setError(e.message ?? '불러오지 못했어요.'))
  }, [])

  const nameOf = useMemo(() => new Map(data?.friends.map((f) => [f.id, f.name])), [data])

  if (error) {
    return (
      <Shell>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          불러오지 못했어요: {error}
          <span className="mt-1 block text-rose-500">supabase/09_friends.sql 이 적용됐는지 확인하세요.</span>
        </div>
      </Shell>
    )
  }
  if (!data) return <Shell><p className="text-slate-400">불러오는 중…</p></Shell>

  const friend = data.friends.find((f) => f.id === selected)
  const inScope = <T extends { friend_id: string }>(xs: T[]) => (friend ? xs.filter((x) => x.friend_id === friend.id) : xs)
  const todos = inScope(data.todos).sort(openFirst((t) => t.done))
  const places = inScope(data.places)
  const toVisit = places.filter((p) => !p.visited).sort(openFirst(() => false))
  const visited = places.filter((p) => p.visited)
  const openTodos = (id?: string) => data.todos.filter((t) => !t.done && (!id || t.friend_id === id)).length
  const toVisitCount = (id?: string) => data.places.filter((p) => !p.visited && (!id || p.friend_id === id)).length
  const tag = friend ? undefined : (x: { friend_id?: string }) => nameOf.get(x.friend_id ?? '')

  // 화면부터 바꾸고, 저장에 실패하면 되돌린다
  async function optimistic(next: FriendsData, save: () => Promise<void>) {
    const prev = data
    setData(next)
    try {
      await save()
    } catch (e) {
      setData(prev)
      alert(`저장하지 못했어요: ${(e as Error).message}`)
    }
  }
  const d = data
  const setVisit = (p: { id: string }, v: Visit | null) =>
    optimistic(
      {
        ...d,
        places: d.places.map((x) =>
          x.id === p.id ? { ...x, visited: !!v, visited_on: v?.on ?? null, review: v?.review.trim() || null, visited_at: v ? new Date().toISOString() : null } : x,
        ),
      },
      () => setPlaceVisited(p.id, v),
    )

  return (
    <Shell>
      <div className="flex flex-wrap gap-2">
        {[{ id: ALL, name: '전체' }, ...d.friends.map((f) => ({ id: f.id, name: f.name }))].map((c) => (
          <button
            key={c.id}
            onClick={() => select(c.id)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              selected === c.id || (c.id === ALL && !friend) ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {c.name}{' '}
            <span className="text-xs tabular-nums opacity-60">
              할 일 {openTodos(c.id === ALL ? undefined : c.id)} · 맛집 {toVisitCount(c.id === ALL ? undefined : c.id)}
            </span>
          </button>
        ))}
        <button onClick={() => setAdding((a) => !a)} className="rounded-full px-3 py-1.5 text-sm text-slate-500 ring-1 ring-dashed ring-slate-300 hover:text-slate-800">
          + 친구 추가
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {adding && (
          <AddFriendForm
            onCreated={(f, password) => {
              setData({ ...d, friends: [...d.friends, f] })
              setInvite({ friend: f, password })
              setAdding(false)
              select(f.id)
            }}
          />
        )}
        {invite && <InviteBox {...invite} onClose={() => setInvite(null)} />}

        {d.friends.length === 0 && !adding && (
          <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
            아직 친구가 없어요. <strong className="text-slate-700">+ 친구 추가</strong>에서 이름과 비밀번호를 정하면, 친구에게 보낼 링크와 문구가 만들어져요.
          </div>
        )}

        {friend && (
          <FriendSettings
            key={friend.id}
            friend={friend}
            onPassword={(password) => setInvite({ friend, password })}
            onDeleted={async () => {
              try {
                await deleteFriend(friend.id)
                setData({
                  friends: d.friends.filter((f) => f.id !== friend.id),
                  todos: d.todos.filter((t) => t.friend_id !== friend.id),
                  places: d.places.filter((p) => p.friend_id !== friend.id),
                })
                select(ALL)
              } catch (e) {
                alert(`지우지 못했어요: ${(e as Error).message}`)
              }
            }}
          />
        )}

        {d.friends.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel title={friend ? `같이 할 일 · ${friend.name}` : '친구와 할 일 전체'} sub={`남은 ${todos.filter((t) => !t.done).length}개`}>
              <TodoItems
                todos={todos}
                viewer={{ is: 'me', friendName: friend?.name ?? '친구' }}
                tag={tag}
                onToggle={(t) =>
                  optimistic(
                    { ...d, todos: d.todos.map((x) => (x.id === t.id ? { ...x, done: !t.done, done_by: t.done ? null : 'me' } : x)) },
                    () => setTodoDone(t.id, !t.done),
                  )
                }
                onDelete={(t) => optimistic({ ...d, todos: d.todos.filter((x) => x.id !== t.id) }, () => deleteTodo(t.id))}
              />
              {friend ? (
                <AddTodoForm onAdd={async (title) => {
                  const row = await addTodo(friend.id, title)
                  setData((cur) => cur && { ...cur, todos: [...cur.todos, row] })
                }} />
              ) : (
                <p className="mt-2 px-1 text-xs text-slate-400">추가는 위에서 친구를 고른 뒤에 할 수 있어요.</p>
              )}
            </Panel>

            <Panel title={friend ? `가볼 맛집 · ${friend.name}` : '가볼 맛집 전체'} sub={`${toVisit.length}곳`}>
              <PlaceItems
                places={toVisit}
                viewer={{ is: 'me', friendName: friend?.name ?? '친구' }}
                tag={tag}
                onVisit={(p, v) => setVisit(p, v)}
                onDelete={(p) => optimistic({ ...d, places: d.places.filter((x) => x.id !== p.id) }, () => deletePlace(p.id))}
              />
              {friend && (
                <AddPlaceForm onAdd={async (input) => {
                  const row = await addPlace(friend.id, input)
                  setData((cur) => cur && { ...cur, places: [...cur.places, row] })
                }} />
              )}
            </Panel>

            <div className="md:col-span-2">
              <Panel title={friend ? `같이 다녀온 곳 · ${friend.name}` : '같이 다녀온 곳 전체'} sub={`${visited.length}곳`}>
                <VisitHistory places={visited} tag={tag} onUndo={(p) => setVisit(p, null)} />
              </Panel>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <Link to="/" className="text-sm text-slate-400 hover:text-slate-700">
            ← 대시보드
          </Link>
          <h1 className="mt-1 text-xl font-semibold">친구와 같이</h1>
          <p className="text-sm text-slate-500">친구마다 같이 할 일과 갈 맛집. 친구는 링크와 비밀번호로 자기 것만 봐요.</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
