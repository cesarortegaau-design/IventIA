import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import LoginPage from '../pages/LoginPage'
import GamesListPage from '../pages/GamesListPage'
import AttendancePage from '../pages/AttendancePage'
import GamePage from '../pages/GamePage'
import PublicGamesListPage from '../pages/PublicGamesListPage'
import PublicGamePage from '../pages/PublicGamePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes (no auth) */}
      <Route path="/live" element={<PublicGamesListPage />} />
      <Route path="/live/:gameId" element={<PublicGamePage />} />

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/live" replace />} />
      <Route path="/games" element={<RequireAuth><GamesListPage /></RequireAuth>} />
      <Route path="/games/:gameId/attendance" element={<RequireAuth><AttendancePage /></RequireAuth>} />
      <Route path="/games/:gameId" element={<RequireAuth><GamePage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/live" replace />} />
    </Routes>
  )
}
