import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import CartPage from './pages/CartPage'
import SuccessPage from './pages/SuccessPage'
import CancelPage from './pages/CancelPage'
import OrderPage from './pages/OrderPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MyTicketsPage from './pages/MyTicketsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  const location = useLocation()
  if (!accessToken) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/evento/:slug" element={<EventPage />} />
      <Route path="/boletos/:slug" element={<EventPage />} />
      <Route path="/pago/exito" element={<SuccessPage />} />
      <Route path="/pago/cancelado" element={<CancelPage />} />
      <Route path="/mi-orden/:token" element={<OrderPage />} />

      {/* Ticket buyer auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route path="/carrito" element={<RequireAuth><CartPage /></RequireAuth>} />
      <Route path="/mis-boletos" element={<RequireAuth><MyTicketsPage /></RequireAuth>} />
    </Routes>
  )
}
