import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

// 메모는 개인 정보라 로그인한 본인만 본다. 계정은 Supabase 대시보드에서 하나만 만들고 회원가입은 막아둔다.
export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? '이메일이나 비밀번호가 맞지 않아요.' : error.message)
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-12 max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold">로그인</h2>
      <p className="mt-1 text-sm text-slate-500">메모는 로그인한 본인만 볼 수 있어요.</p>
      <label className="mt-5 block text-sm text-slate-600">
        이메일
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </label>
      <label className="mt-3 block text-sm text-slate-600">
        비밀번호
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </label>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? '로그인 중…' : '로그인'}
      </button>
    </form>
  )
}
