import { useEffect, useState } from 'react'
import { LANG, adsenseDday, daysSince, fetchBlogStatus, langFlag, type BlogStatus } from '../../lib/blog'
import { relativeTime } from '../../lib/format'
import { todayKst } from '../../lib/trips'

// 블로그 프로젝트 상세 위쪽: 발행 현황 + 내가 발행할 초안 목록 (워드프레스 편집 화면으로 바로)
export default function BlogPanel() {
  const [row, setRow] = useState<{ data: BlogStatus; updated_at: string } | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showMerged, setShowMerged] = useState(false)

  useEffect(() => {
    fetchBlogStatus().then(setRow, (e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        블로그 상태를 불러오지 못했어요: {error}. supabase/15_blog.sql 이 적용됐는지 확인하세요.
      </div>
    )
  }
  if (row === undefined) return <p className="text-sm text-slate-400">블로그 상태 불러오는 중…</p>
  if (row === null) {
    return <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">아직 블로그 봇이 상태를 올리지 않았어요. 맥미니에서 1시간마다 올라와요.</p>
  }

  const d = row.data
  const waiting = d.drafts.filter((x) => !x.merged)
  const merged = d.drafts.filter((x) => x.merged)
  const since = daysSince(d.last_published)
  const dd = adsenseDday(todayKst())

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="발행한 글" value={`${d.published.total}편`} sub={Object.entries(d.published.by_lang).map(([l, n]) => `${LANG[l] ?? l} ${n}`).join(' · ')} />
        <Stat label="최근 7일 발행" value={`${d.published_7d}편`} sub={since === null ? '' : since === 0 ? '오늘 발행함' : `마지막 발행 ${since}일 전`} warn={since !== null && since >= 2} />
        <Stat label="발행 대기 초안" value={`${waiting.length}편`} sub="봇이 쓴 초안, 발행은 직접" accent={waiting.length > 0} />
        <Stat label="애드센스" value={dd ?? '재신청'} sub="12/1~5 재신청 권장" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700">📝 발행 대기 초안</h3>
          <a href={`${d.site}/wp-admin/edit.php?post_status=draft&post_type=post`} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-slate-700">
            워드프레스에서 전체 보기 →
          </a>
        </div>
        {waiting.length === 0 ? (
          <p className="py-3 text-sm text-slate-400">발행할 초안이 없어요.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {waiting.map((p) => (
              <li key={p.id}>
                <a href={p.edit} target="_blank" rel="noreferrer" className="flex items-baseline gap-2 rounded-md px-1 py-2 hover:bg-slate-50">
                  <span className="shrink-0">{langFlag(p.lang)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{p.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{p.modified ? relativeTime(`${p.modified}+09:00`) : ''}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {merged.length > 0 && (
          <button onClick={() => setShowMerged(!showMerged)} className="mt-2 px-1 text-xs text-slate-400 hover:text-slate-700">
            {showMerged ? '▾' : '▸'} 가이드로 합쳐서 내린 글 {merged.length}편 (발행 안 함)
          </button>
        )}
        {showMerged && (
          <ul className="mt-1 space-y-1 px-1 text-xs text-slate-400">
            {merged.map((p) => (
              <li key={p.id} className="truncate">
                {langFlag(p.lang)} {p.title}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 px-1 text-[11px] text-slate-300">봇이 1시간마다 갱신 · 마지막 {relativeTime(row.updated_at)}</p>
      </div>

      <SearchCard s={d.search} />

      {d.recent.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">최근 발행</h3>
          <ul className="divide-y divide-slate-100">
            {d.recent.map((p) => (
              <li key={p.id}>
                <a href={p.link} target="_blank" rel="noreferrer" className="flex items-baseline gap-2 rounded-md px-1 py-2 hover:bg-slate-50">
                  <span className="shrink-0">{langFlag(p.lang)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{p.date?.slice(5, 10).replace('-', '/')}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function SearchCard({ s }: { s: BlogStatus['search'] }) {
  if (!s) return null
  const weeks = s.weeks ?? []
  const max = Math.max(1, ...weeks.map((w) => w.impressions))
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">🔎 구글 검색·방문 (최근 {weeks.length || 4}주)</h3>
        <span className="text-xs text-slate-400">Rank Math Analytics</span>
      </div>
      {!s.has_data ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {s.error ? `불러오지 못했어요: ${s.error}` : '아직 데이터가 0이에요. Rank Math가 서치 콘솔 데이터를 못 가져오고 있고, 방문자(GA4)는 연결돼 있지 않아요.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                ['검색 노출', s.totals?.impressions],
                ['검색 클릭', s.totals?.clicks],
                ['방문(페이지뷰)', s.totals?.pageviews],
              ] as const
            ).map(([label, v]) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{(v ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-16 items-end gap-1">
            {weeks.map((w) => (
              <div key={w.date} className="flex-1 rounded-t bg-sky-200" style={{ height: `${Math.max(4, (w.impressions / max) * 100)}%` }} title={`${w.date} 노출 ${w.impressions} · 클릭 ${w.clicks}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, sub, warn, accent }: { label: string; value: string; sub?: string; warn?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-3 ${accent ? 'border-amber-300' : 'border-slate-200'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${accent ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className={`mt-0.5 truncate text-[11px] ${warn ? 'font-medium text-rose-600' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  )
}
