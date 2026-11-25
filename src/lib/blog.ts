import { supabase } from './supabase'

// 워드프레스 블로그 상태 (테이블: supabase/15_blog.sql). 맥미니 블로그 봇이 1시간마다 올린다
// (~/latte-factory/blog-bot/bot/대시보드_보내기.py).

export interface BlogPost {
  id: number
  title: string
  lang: string | null
  date?: string
  modified?: string
  link?: string
  edit?: string
  merged?: boolean
}

export interface BlogStatus {
  site: string
  published: { total: number; by_lang: Record<string, number> }
  published_7d: number
  last_published: string | null
  recent: BlogPost[]
  drafts: BlogPost[]
}

export async function fetchBlogStatus(): Promise<{ data: BlogStatus; updated_at: string } | null> {
  const { data, error } = await supabase.from('blog_status').select('data, updated_at').eq('site', 'latteinseoul').maybeSingle()
  if (error) throw error
  return data as { data: BlogStatus; updated_at: string } | null
}

export const LANG: Record<string, string> = { en: '🇺🇸 영어', ja: '🇯🇵 일본어', ko: '🇰🇷 한국어' }
export const langFlag = (l: string | null) => (l === 'en' ? '🇺🇸' : l === 'ja' ? '🇯🇵' : l === 'ko' ? '🇰🇷' : '')

// 애드센스 재신청 권장 기간 (12/1~5)
export const ADSENSE_FROM = '2026-12-01'
export function adsenseDday(today: string) {
  const diff = Math.round((Date.parse(ADSENSE_FROM) - Date.parse(today)) / 86400_000)
  return diff > 0 ? `재신청 D-${diff}` : diff >= -4 ? '재신청 기간' : null
}

// 마지막 발행이 며칠 전인지
export function daysSince(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - Date.parse(`${iso}+09:00`)) / 86400_000)
}
