import { Routes, Route } from 'react-router-dom'
import { useSession } from './lib/auth'
import LoginForm from './components/LoginForm'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'
import Memos from './pages/Memos'

function App() {
  // 사이트 전체가 로그인 뒤에 있다. 데이터도 RLS 로 본인만 읽을 수 있다. (supabase/03_owner_only.sql)
  const session = useSession()

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
        {session === undefined ? <p className="text-center text-slate-400">확인 중…</p> : <LoginForm />}
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/project/:id" element={<ProjectDetail />} />
      <Route path="/memos" element={<Memos />} />
    </Routes>
  )
}

export default App
