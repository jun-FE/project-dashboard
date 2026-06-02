import type { Project, LogType } from '../types'

// 카테고리/상태/로그타입 뱃지 스타일 — 대시보드와 상세 페이지가 공유.
export const CATEGORY_STYLE: Record<string, string> = {
  개발: 'bg-indigo-50 text-indigo-700',
  리서치: 'bg-amber-50 text-amber-700',
  콘텐츠: 'bg-emerald-50 text-emerald-700',
  커머스: 'bg-sky-50 text-sky-700',
}

export function categoryClass(category: string | null): string {
  if (!category) return 'bg-slate-100 text-slate-600'
  return CATEGORY_STYLE[category] ?? 'bg-slate-100 text-slate-600'
}

export const STATUS_META: Record<Project['status'], { label: string; cls: string }> = {
  active: { label: '진행 중', cls: 'bg-green-100 text-green-700' },
  paused: { label: '일시정지', cls: 'bg-slate-200 text-slate-600' },
  done: { label: '완료', cls: 'bg-blue-100 text-blue-700' },
}

export const LOG_TYPE_STYLE: Record<LogType, string> = {
  작업: 'bg-blue-50 text-blue-600',
  결정: 'bg-violet-50 text-violet-600',
  이슈: 'bg-rose-50 text-rose-600',
}

export function logTypeClass(type: string): string {
  return LOG_TYPE_STYLE[type as LogType] ?? 'bg-slate-100 text-slate-500'
}
