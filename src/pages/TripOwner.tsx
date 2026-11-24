import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteTrip, fetchTrips, setTripPassword, copy, tripApi, tripUrl, type TripRow } from '../lib/trips'
import TripPlanner from '../components/trips/TripPlanner'
import { InviteBox, Shell } from './Trips'

// 내 쪽 여행 화면 (/trips/:slug). 로그인 상태라 코드 없이 열리고, 초대·코드 바꾸기·지우기가 더 있다.
export default function TripOwner() {
  const { slug = '' } = useParams()
  const api = useMemo(() => tripApi(slug, ''), [slug])
  return (
    <Shell back="/trips" backLabel="← 여행 목록">
      <TripPlanner key={slug} slug={slug} api={api} extraHeader={<OwnerTools slug={slug} />} />
    </Shell>
  )
}

function OwnerTools({ slug }: { slug: string }) {
  const [code, setCode] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(`trip-new-code:${slug}`)
    } catch {
      return null
    }
  })
  const [row, setRow] = useState<TripRow | null>(null)
  const [copied, setCopied] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [armDelete, setArmDelete] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTrips().then((ts) => setRow(ts.find((x) => x.slug === slug) ?? null), () => {})
  }, [slug])

  function tripId() {
    if (!row) throw new Error('여행을 찾지 못했어요')
    return row.id
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm">
        <span className="text-xs font-medium text-slate-400">초대</span>
        <button onClick={async () => setCopied(await copy(tripUrl(slug)))} className="text-slate-600 hover:underline">
          {copied ? '링크 복사함 ✓' : '링크 복사'}
        </button>
        {newCode === null ? (
          <button onClick={() => setNewCode('')} className="text-slate-600 hover:underline">
            초대 코드 바꾸기
          </button>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await setTripPassword(tripId(), newCode)
                setCode(newCode)
                setNewCode(null)
              } catch (err) {
                alert(`바꾸지 못했어요: ${(err as Error).message}`)
              }
            }}
          >
            <input autoFocus value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="새 코드 (4자 이상)" className="w-36 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-slate-400" />
            <button disabled={newCode.length < 4} className="text-slate-900 disabled:opacity-40">
              저장
            </button>
            <button type="button" onClick={() => setNewCode(null)} className="text-slate-400">
              취소
            </button>
          </form>
        )}
        <span className="ml-auto">
          {armDelete ? (
            <button
              onBlur={() => setArmDelete(false)}
              onClick={async () => {
                try {
                  await deleteTrip(tripId())
                  navigate('/trips')
                } catch (err) {
                  alert(`지우지 못했어요: ${(err as Error).message}`)
                }
              }}
              className="text-xs font-medium text-rose-600"
            >
              일정까지 모두 지우기
            </button>
          ) : (
            <button onClick={() => setArmDelete(true)} className="text-xs text-slate-400 hover:text-rose-600">
              여행 지우기
            </button>
          )}
        </span>
      </div>
      {code && <InviteBox trip={{ slug, title: row?.title ?? '여행' }} code={code} onClose={() => {
        try {
          sessionStorage.removeItem(`trip-new-code:${slug}`)
        } catch {
          /* 무시 */
        }
        setCode(null)
      }} />}
    </>
  )
}
