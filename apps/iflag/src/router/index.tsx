import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { usePlayerStore } from '../stores/playerStore'
import ModeSelectorPage from '../pages/ModeSelectorPage'
import LoginPage from '../pages/LoginPage'
import GamesListPage from '../pages/GamesListPage'
import AttendancePage from '../pages/AttendancePage'
import GamePage from '../pages/GamePage'
import PublicGamesListPage from '../pages/PublicGamesListPage'
import PublicGamePage from '../pages/PublicGamePage'
import PlayerLoginPage from '../pages/player/PlayerLoginPage'
import PlayerSignupPage from '../pages/player/PlayerSignupPage'
import PlayerTournamentsPage from '../pages/player/PlayerTournamentsPage'
import PlayerTournamentPage from '../pages/player/PlayerTournamentPage'
import PlayerProfilePage from '../pages/player/PlayerProfilePage'
import SpectatorPage from '../pages/spectator/SpectatorPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequirePlayerAuth({ children }: { children: React.ReactNode }) {
  const token = usePlayerStore((s) => s.accessToken)
  if (!token) return <Navigate to="/player/login" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Entry mode selector */}
      <Route path="/" element={<ModeSelectorPage />} />

      {/* Public routes */}
      <Route path="/live" element={<PublicGamesListPage />} />
      <Route path="/live/:gameId" element={<PublicGamePage />} />

      {/* Spectator (no auth) */}
      <Route path="/spectator" element={<SpectatorPage />} />
      <Route path="/spectator/:eventId" element={<SpectatorPage />} />

      {/* Referee auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Referee protected */}
      <Route path="/games" element={<RequireAuth><GamesListPage /></RequireAuth>} />
      <Route path="/games/:gameId/attendance" element={<RequireAuth><AttendancePage /></RequireAuth>} />
      <Route path="/games/:gameId" element={<RequireAuth><GamePage /></RequireAuth>} />

      {/* Player auth */}
      <Route path="/player/login" element={<PlayerLoginPage />} />
      <Route path="/player/signup" element={<PlayerSignupPage />} />

      {/* Player protected */}
      <Route path="/player/tournaments" element={<RequirePlayerAuth><PlayerTournamentsPage /></RequirePlayerAuth>} />
      <Route path="/player/tournaments/:eventId" element={<RequirePlayerAuth><PlayerTournamentPage /></RequirePlayerAuth>} />
      <Route path="/player/profile" element={<RequirePlayerAuth><PlayerProfilePage /></RequirePlayerAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
