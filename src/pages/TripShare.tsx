import { useCallback, useMemo, useState } from 'react'
import { TripAuthError, tripApi, tripView } from '../lib/trips'
import TripPlanner from '../components/trips/TripPlanner'

// 초대받은 사람들이 들어오는 페이지 (/t/:slug). 로그인 없이 초대 코드로만 열린다.
// 여러 명이 같은 주소·코드를 쓴다. 코드는 이 기기에만 기억한다.
const key = (slug: string) => `trip-code:${slug}`
const remembered = (slug: string) => {
  try {
    return localStorage.getItem(key(slug))
  } catch {
    return null
  }
}
const remember = (slug: string, code: string | null) => {
  try {
    if (code === null) localStorage.removeItem(key(slug))
    else localStorage.setItem(key(slug), code)
  } catch {
    /* 저장 못 해도 이번 방문은 그대로 */
  }
}

export default function TripShare({ slug }: { slug: string }) {
  const [code, setCode] = useState<string | null>(() => remembered(slug))
  const [gateError, setGateError] = useState<string | null>(null)
  const api = useMemo(() => (code ? tripApi(slug, code) : null), [slug, code])

  const onAuthError = useCallback(
    (e: Error) => {
      if (e instanceof TripAuthError) {
        remember(slug, null)
        setCode(null)
        setGateError(e.message)
      }
    },
    [slug],
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {!api ? (
          <CodeGate
            error={gateError}
            onSubmit={async (c) => {
              try {
                await tripView(slug, c)
                remember(slug, c)
                setGateError(null)
                setCode(c)
              } catch (e) {
                setGateError((e as Error).message)
              }
            }}
          />
        ) : (
          <>
            <TripPlanner key={code} slug={slug} api={api} onAuthError={onAuthError} />
            <button
              onClick={() => {
                remember(slug, null)
                setCode(null)
              }}
              className="mt-6 text-xs text-slate-400 hover:text-slate-600"
            >
              이 기기에서 초대 코드 잊기
            </button>
          </>
        )}
      </main>
    </div>
  )
}

function CodeGate({ error, onSubmit }: { error: string | null; onSubmit: (code: string) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mx-auto mt-10 max-w-xs space-y-3 rounded-xl border border-slate-200 bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        await onSubmit(value)
        setBusy(false)
      }}
    >
      <h1 className="text-base font-semibold">✈️ 같이 여행 계획 짜기</h1>
      <p className="text-sm text-slate-500">받은 초대 코드를 넣어 주세요.</p>
      <input
        type="password"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="초대 코드"
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button disabled={busy || !value} className="w-full rounded-md bg-slate-900 py-2 text-sm text-white disabled:opacity-40">
        들어가기
      </button>
    </form>
  )
}
