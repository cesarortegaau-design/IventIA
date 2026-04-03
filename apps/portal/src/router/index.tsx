import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import PublicLayout from '../layouts/PublicLayout'
import PortalLayout from '../layouts/PortalLayout'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ProfilePage from '../pages/profile/ProfilePage'
import EventPortalPage from '../pages/event/EventPortalPage'
import NewOrderPage from '../pages/orders/NewOrderPage'
import OrdersPage from '../pages/orders/OrdersPage'
import OrderDetailPage from '../pages/orders/OrderDetailPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth><PortalLayout /></RequireAuth>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/events/:eventId" element={<EventPortalPage />} />
        <Route path="/events/:eventId/new-order" element={<NewOrderPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
