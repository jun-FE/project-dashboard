import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adsenseDday, daysSince, fetchBlogStatus, type BlogStatus } from '../../lib/blog'
import { supabase } from '../../lib/supabase'
import { todayKst } from '../../lib/trips'

// 대시보드 안 "블로그" 한 줄 요약: 발행 대기 초안·마지막 발행·애드센스 D-day. 자세한 건 프로젝트 상세에서.
export default function BlogSummary() {
  const [s, setS] = useState<BlogStatus | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    fetchBlogStatus().then((r) => setS(r?.data ?? null), () => {})
    supabase
      .from('projects')
      .select('id')
      .contains('custom_fields', { module: 'blog' })
      .maybeSingle()
      .then(({ data }) => setProjectId(data?.id ?? null))
  }, [])

  if (!s) return null
  const waiting = s.drafts.filter((d) => !d.merged).length
  const since = daysSince(s.last_published)
  const dd = adsenseDday(todayKst())
  const body = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-slate-300">
      <span className="font-semibold text-slate-700">📝 latteinseoul.com</span>
      <span className={waiting ? 'font-medium text-amber-700' : 'text-slate-500'}>발행 대기 초안 {waiting}편</span>
      <span className={since !== null && since >= 2 ? 'font-medium text-rose-600' : 'text-slate-500'}>
        {since === null ? '' : since === 0 ? '오늘 발행함' : `마지막 발행 ${since}일 전`}
      </span>
      <span className="text-slate-500">발행 {s.published.total}편</span>
      {dd && <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">애드센스 {dd}</span>}
    </div>
  )
  return projectId ? <Link to={`/project/${projectId}`}>{body}</Link> : body
}
