import { supabase } from './supabase'
import type { Memo, TodoStatus } from '../types'

const MEMO_COLUMNS =
  'id,content,link_title,link_summary,attachments,created_at,category,tags,kind,todo_status,due_at,calendar_event_id,ai_note,processed_at'

// 개인 메모라 최근 1000개면 충분하다. 검색·탭 필터는 받아온 뒤 화면에서 한다.
export async function fetchMemos(): Promise<Memo[]> {
  const { data, error } = await supabase
    .from('memos')
    .select(MEMO_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return (data ?? []) as Memo[]
}

export interface MemoSummary {
  openTodos: Memo[] // 마감 빠른 순 상위 몇 개
  openTodoCount: number
  recent: Memo[]
  unsortedCount: number // 아직 AI 정리(카테고리)가 안 된 메모
}

// 대시보드용 요약. 전체 메모를 받지 않고 필요한 만큼만 조회한다.
export async function fetchMemoSummary(todoLimit = 5, recentLimit = 4): Promise<MemoSummary> {
  const [todosRes, recentRes, unsortedRes] = await Promise.all([
    supabase
      .from('memos')
      .select(MEMO_COLUMNS, { count: 'exact' })
      .is('deleted_at', null)
      .eq('kind', 'todo')
      .eq('todo_status', 'open')
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(todoLimit),
    supabase
      .from('memos')
      .select(MEMO_COLUMNS)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(recentLimit),
    supabase
      .from('memos')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('category', null),
  ])
  if (todosRes.error) throw todosRes.error
  if (recentRes.error) throw recentRes.error
  if (unsortedRes.error) throw unsortedRes.error

  return {
    openTodos: (todosRes.data ?? []) as Memo[],
    openTodoCount: todosRes.count ?? 0,
    recent: (recentRes.data ?? []) as Memo[],
    unsortedCount: unsortedRes.count ?? 0,
  }
}

export async function setTodoStatus(id: string, status: TodoStatus): Promise<void> {
  const { error } = await supabase.from('memos').update({ todo_status: status }).eq('id', id)
  if (error) throw error
}

const WEEKDAY = '일월화수목금토'

// "9/26(토) 15:00", 날짜만 정한 할 일(자정)은 시각 생략
export function dueText(iso: string): string {
  const d = new Date(iso)
  const base = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY[d.getDay()]})`
  if (d.getHours() === 0 && d.getMinutes() === 0) return base
  return `${base} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function isOverdue(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  // 날짜만 정한 할 일은 그날이 끝나야 지난 것으로 본다
  if (d.getHours() === 0 && d.getMinutes() === 0) d.setDate(d.getDate() + 1)
  return d < now
}
