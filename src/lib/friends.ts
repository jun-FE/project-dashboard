import { supabase } from './supabase'

// 친구와 같이 할 일·맛집 (테이블·함수 정의: supabase/09_friends.sql)
// 나: 테이블을 직접 읽고 쓴다 (RLS 본인만). 친구: friend_* 함수로만 (링크 + 비밀번호).

export interface Friend {
  id: string
  name: string
  slug: string
  created_at: string
}

export type Who = 'me' | 'friend'

export interface FriendTodo {
  id: string
  friend_id: string
  title: string
  done: boolean
  done_at: string | null
  done_by: Who | null
  created_by: Who
  created_at: string
}

export interface FriendPlace {
  id: string
  friend_id: string
  name: string
  area: string | null
  link: string | null
  memo: string | null
  visited: boolean
  visited_at: string | null
  visited_on: string | null // 다녀온 날 (YYYY-MM-DD)
  review: string | null // 한줄 후기
  created_by: Who
  created_at: string
}

export interface PlaceInput {
  name: string
  area?: string
  link?: string
  memo?: string
}

export const friendUrl = (slug: string) => `${window.location.origin}/f/${slug}`

// 링크로 받은 http(s) 주소만 링크로 연다
export const safeLink = (link: string | null) => (link && /^https?:\/\//i.test(link) ? link : null)

// ---------------------------------------------------------------- 나 (대시보드)

export interface FriendsData {
  friends: Friend[]
  todos: FriendTodo[]
  places: FriendPlace[]
}

export async function fetchFriendsData(): Promise<FriendsData> {
  const [f, t, p] = await Promise.all([
    supabase.from('friends').select('id, name, slug, created_at').order('created_at'),
    supabase.from('friend_todos').select('*').order('created_at'),
    supabase.from('friend_places').select('*').order('created_at'),
  ])
  for (const r of [f, t, p]) if (r.error) throw r.error
  return { friends: f.data as Friend[], todos: t.data as FriendTodo[], places: p.data as FriendPlace[] }
}

export async function createFriend(name: string, password: string): Promise<Friend> {
  const { data, error } = await supabase.rpc('owner_create_friend', { p_name: name, p_password: password })
  if (error) throw error
  const { id, slug, created_at } = data as Friend
  return { id, name: (data as Friend).name, slug, created_at }
}

export async function setFriendPassword(friendId: string, password: string): Promise<void> {
  const { error } = await supabase.rpc('owner_set_friend_password', { p_friend_id: friendId, p_password: password })
  if (error) throw error
}

export async function deleteFriend(id: string): Promise<void> {
  const { error } = await supabase.from('friends').delete().eq('id', id)
  if (error) throw error
}

export async function addTodo(friendId: string, title: string): Promise<FriendTodo> {
  const { data, error } = await supabase.from('friend_todos').insert({ friend_id: friendId, title }).select().single()
  if (error) throw error
  return data as FriendTodo
}

export async function setTodoDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('friend_todos')
    .update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? 'me' : null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('friend_todos').delete().eq('id', id)
  if (error) throw error
}

export async function addPlace(friendId: string, p: PlaceInput): Promise<FriendPlace> {
  const { data, error } = await supabase
    .from('friend_places')
    .insert({ friend_id: friendId, name: p.name, area: p.area || null, link: p.link || null, memo: p.memo || null })
    .select()
    .single()
  if (error) throw error
  return data as FriendPlace
}

export interface Visit {
  on: string // YYYY-MM-DD
  review: string
}

// 오늘 날짜 (한국 시간)
export const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

// visit 이 null 이면 다녀옴 취소
export async function setPlaceVisited(id: string, visit: Visit | null): Promise<void> {
  const { error } = await supabase
    .from('friend_places')
    .update({
      visited: !!visit,
      visited_at: visit ? new Date().toISOString() : null,
      visited_on: visit?.on ?? null,
      review: visit?.review.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase.from('friend_places').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------- 친구 (/f/:slug)

export interface FriendView {
  name: string
  todos: Omit<FriendTodo, 'friend_id'>[]
  places: Omit<FriendPlace, 'friend_id'>[]
}

export class FriendAuthError extends Error {
  reason: 'wrong' | 'locked'
  constructor(reason: 'wrong' | 'locked') {
    super(reason === 'locked' ? '여러 번 틀려서 10분 동안 잠겼어요. 잠시 뒤에 다시 해 주세요.' : '비밀번호가 맞지 않아요.')
    this.reason = reason
  }
}

export async function friendView(slug: string, password: string): Promise<FriendView> {
  const { data, error } = await supabase.rpc('friend_view', { p_slug: slug, p_password: password })
  if (error) throw error
  if (data?.error) throw new FriendAuthError(data.error)
  return data as FriendView
}

async function friendCall(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  if (data !== true) throw new Error('저장하지 못했어요. 다시 들어와 주세요.')
}

export const friendSetTodo = (slug: string, pw: string, id: string, done: boolean) =>
  friendCall('friend_set_todo', { p_slug: slug, p_password: pw, p_todo_id: id, p_done: done })

export const friendAddTodo = (slug: string, pw: string, title: string) =>
  friendCall('friend_add_todo', { p_slug: slug, p_password: pw, p_title: title })

export const friendSetPlace = (slug: string, pw: string, id: string, visit: Visit | null) =>
  friendCall('friend_set_place', {
    p_slug: slug,
    p_password: pw,
    p_place_id: id,
    p_visited: !!visit,
    p_visited_on: visit?.on ?? null,
    p_review: visit?.review ?? null,
  })

export const friendAddPlace = (slug: string, pw: string, p: PlaceInput) =>
  friendCall('friend_add_place', {
    p_slug: slug,
    p_password: pw,
    p_name: p.name,
    p_area: p.area ?? '',
    p_link: p.link ?? '',
    p_memo: p.memo ?? '',
  })
