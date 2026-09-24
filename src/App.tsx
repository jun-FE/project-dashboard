import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'
import Memos from './pages/Memos'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/project/:id" element={<ProjectDetail />} />
      <Route path="/memos" element={<Memos />} />
    </Routes>
  )
}

export default App
