import { supabase } from './supabase'

// 여행 계획 (테이블·함수 정의: supabase/14_trips.sql)
// 나: 여행 목록·만들기·지우기는 테이블/owner_* 함수. 여행 안의 내용은 나도 친구도 trip_* 함수로.
// (나는 로그인 상태라 코드 없이 통과한다)

export type Kind = 'do' | 'eat' | 'stay' | 'pack'

export const KINDS: { kind: Kind; label: string; icon: string; color: string }[] = [
  { kind: 'do', label: '하고 싶은 것', icon: '🎯', color: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { kind: 'eat', label: '먹고 싶은 것', icon: '🍜', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { kind: 'stay', label: '숙소', icon: '🛏', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
]
export const kindInfo = (k: Kind) => KINDS.find((x) => x.kind === k) ?? { kind: k, label: '챙길 것', icon: '🎒', color: 'bg-slate-50 text-slate-600 ring-slate-200' }

export interface TripInfo {
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
}

export interface TripItem {
  id: string
  kind: Kind
  title: string
  memo: string | null
  link: string | null
  added_by: string | null
  likes: string[]
  day: string | null
  time: string | null
  sort: number
  done: boolean
  created_at: string
}

export interface TripView {
  trip: TripInfo
  members: string[]
  items: TripItem[]
}

export interface TripRow extends TripInfo {
  id: string
  slug: string
  created_at: string
}

export const tripUrl = (slug: string) => `${window.location.origin}/t/${slug}`

export function inviteText(t: Pick<TripRow, 'title' | 'slug'>, code: string) {
  return `✈️ ${t.title} 같이 계획 짜자! 하고 싶은 거·먹고 싶은 거 넣어줘\n링크: ${tripUrl(t.slug)}\n초대 코드: ${code}`
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------- 날짜

export function daysBetween(start: string | null, end: string | null): string[] {
  if (!start || !end || end < start) return []
  const out: string[] = []
  const d = new Date(`${start}T00:00:00Z`)
  while (out.length <= 30) {
    const s = d.toISOString().slice(0, 10)
    if (s > end) break
    out.push(s)
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export function dayLabel(day: string) {
  const d = new Date(`${day}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEK[d.getUTCDay()]})`
}

export const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

export function dDay(start: string | null, end: string | null) {
  if (!start) return null
  const today = todayKst()
  const diff = Math.round((Date.parse(start) - Date.parse(today)) / 86400_000)
  if (diff > 0) return `D-${diff}`
  if (diff === 0) return 'D-DAY'
  if (end && today <= end) return '여행 중'
  return '다녀옴'
}

// ---------------------------------------------------------------- 지도 (API 키 없이 쓰는 링크)

export const safeLink = (link: string | null) => (link && /^https?:\/\//i.test(link) ? link : null)

const q = (item: Pick<TripItem, 'title'>, dest: string | null) => (dest ? `${item.title} ${dest}` : item.title)

export const googleSearch = (item: Pick<TripItem, 'title'>, dest: string | null) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q(item, dest))}`

export const naverSearch = (item: Pick<TripItem, 'title'>, dest: string | null) =>
  `https://map.naver.com/p/search/${encodeURIComponent(q(item, dest))}`

// 키 없이 되는 구글 지도 미리보기 (한 장소)
export const googleEmbed = (item: Pick<TripItem, 'title'>, dest: string | null) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(q(item, dest))}&output=embed`

// 그날 일정 순서대로 구글 지도 길찾기 (경유지 최대 9곳)
export function googleRoute(items: Pick<TripItem, 'title'>[], dest: string | null) {
  if (items.length < 2) return items[0] ? googleSearch(items[0], dest) : null
  const names = items.slice(0, 11).map((i) => q(i, dest))
  const params = new URLSearchParams({ api: '1', origin: names[0], destination: names[names.length - 1], travelmode: 'transit' })
  if (names.length > 2) params.set('waypoints', names.slice(1, -1).join('|'))
  return `https://www.google.com/maps/dir/?${params}`
}

// ---------------------------------------------------------------- 나 (대시보드)

export async function fetchTrips(): Promise<TripRow[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id, slug, title, destination, start_date, end_date, created_at')
    .order('start_date', { nullsFirst: false })
  if (error) throw error
  return data as TripRow[]
}

export async function fetchTripCounts(): Promise<Record<string, { wish: number; planned: number }>> {
  const { data, error } = await supabase.from('trip_items').select('trip_id, kind, day')
  if (error) throw error
  const out: Record<string, { wish: number; planned: number }> = {}
  for (const r of data as { trip_id: string; kind: Kind; day: string | null }[]) {
    if (r.kind === 'pack') continue
    const c = (out[r.trip_id] ??= { wish: 0, planned: 0 })
    if (r.day) c.planned++
    else c.wish++
  }
  return out
}

export async function createTrip(t: TripInfo, password: string): Promise<TripRow> {
  const { data, error } = await supabase.rpc('owner_create_trip', {
    p_title: t.title,
    p_destination: t.destination ?? '',
    p_start: t.start_date,
    p_end: t.end_date,
    p_password: password,
  })
  if (error) throw error
  const r = data as TripRow
  return { id: r.id, slug: r.slug, title: r.title, destination: r.destination, start_date: r.start_date, end_date: r.end_date, created_at: r.created_at }
}

export async function setTripPassword(id: string, password: string) {
  const { error } = await supabase.rpc('owner_set_trip_password', { p_trip_id: id, p_password: password })
  if (error) throw error
}

export async function deleteTrip(id: string) {
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------- 여행 안 (모두)

export class TripAuthError extends Error {
  reason: 'wrong' | 'locked'
  constructor(reason: 'wrong' | 'locked') {
    super(reason === 'locked' ? '여러 번 틀려서 10분 동안 잠겼어요. 잠시 뒤에 다시 해 주세요.' : '초대 코드가 맞지 않아요.')
    this.reason = reason
  }
}

export async function tripView(slug: string, pw: string): Promise<TripView> {
  const { data, error } = await supabase.rpc('trip_view', { p_slug: slug, p_password: pw })
  if (error) throw error
  if (data?.error) throw new TripAuthError(data.error)
  return data as TripView
}

async function call(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  if (data === false || data === null) throw new Error('저장하지 못했어요. 새로고침 후 다시 해 주세요.')
  return data
}

// 한 여행 안에서 쓰는 함수 묶음
export function tripApi(slug: string, pw: string) {
  const base = { p_slug: slug, p_password: pw }
  return {
    view: () => tripView(slug, pw),
    join: (name: string) => call('trip_join', { ...base, p_name: name }),
    update: (t: TripInfo) =>
      call('trip_update', { ...base, p_title: t.title, p_destination: t.destination ?? '', p_start: t.start_date, p_end: t.end_date }),
    addItem: (kind: Kind, title: string, memo: string, link: string, by: string) =>
      call('trip_add_item', { ...base, p_kind: kind, p_title: title, p_memo: memo, p_link: link, p_by: by }) as Promise<string>,
    updateItem: (id: string, patch: Partial<Pick<TripItem, 'title' | 'memo' | 'link' | 'kind' | 'day' | 'time' | 'sort' | 'done'>>) =>
      call('trip_update_item', { ...base, p_item_id: id, p_patch: patch }),
    deleteItem: (id: string) => call('trip_delete_item', { ...base, p_item_id: id }),
    toggleLike: (id: string, name: string) => call('trip_toggle_like', { ...base, p_item_id: id, p_name: name }),
  }
}
export type TripApi = ReturnType<typeof tripApi>

// 일정 텍스트 (카톡에 붙여넣기용)
export function scheduleText(v: TripView) {
  const days = daysBetween(v.trip.start_date, v.trip.end_date)
  const lines = [`✈️ ${v.trip.title}${v.trip.destination ? ` · ${v.trip.destination}` : ''}`]
  days.forEach((d, i) => {
    const list = dayItems(v.items, d)
    lines.push('', `Day ${i + 1} ${dayLabel(d)}`)
    if (!list.length) lines.push('  (비어 있음)')
    for (const it of list) lines.push(`  ${it.time ? `${it.time} ` : ''}${kindInfo(it.kind).icon} ${it.title}`)
  })
  return lines.join('\n')
}

// 그날 일정: 놓은 순서대로 (시간은 표시만)
export function dayItems(items: TripItem[], day: string) {
  return items.filter((i) => i.day === day && i.kind !== 'pack').sort((a, b) => a.sort - b.sort)
}
