import { Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useTicketBuyerAuthStore } from '../stores/ticketBuyerAuthStore'
import { ordersApi } from '../api/orders'
import PublicLayout from '../layouts/PublicLayout'
import PortalLayout from '../layouts/PortalLayout'
import TicketBuyerLayout from '../layouts/TicketBuyerLayout'
import LandingPage from '../pages/landing/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ProfilePage from '../pages/profile/ProfilePage'
import EventPortalPage from '../pages/event/EventPortalPage'
import NewOrderPage from '../pages/orders/NewOrderPage'
import OrdersPage from '../pages/orders/OrdersPage'
import OrderDetailPage from '../pages/orders/OrderDetailPage'
import CalendarPage from '../pages/calendar/CalendarPage'
import CatalogPage from '../pages/catalog/CatalogPage'
import FloorPlanPortalPage from '../pages/event/FloorPlanPortalPage'
import ClientSetupPage from '../pages/onboarding/ClientSetupPage'
import TicketPurchasePage from '../pages/tickets/TicketPurchasePage'
import LoginBuyerPage from '../pages/tickets/LoginBuyerPage'
import RegisterBuyerPage from '../pages/tickets/RegisterBuyerPage'
import ForgotPasswordBuyerPage from '../pages/tickets/ForgotPasswordBuyerPage'
import ResetPasswordBuyerPage from '../pages/tickets/ResetPasswordBuyerPage'
import MyTicketsPage from '../pages/tickets/MyTicketsPage'
import PaymentSuccessPage from '../pages/tickets/PaymentSuccessPage'
import PaymentCancelledPage from '../pages/tickets/PaymentCancelledPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireTicketBuyerAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useTicketBuyerAuthStore()
  if (!accessToken) return <Navigate to="/boletos/login" replace />
  return <>{children}</>
}

function RequireClient({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => ordersApi.me(),
    enabled: !!accessToken,
  })
  if (isLoading) return null
  const me = data?.data?.data
  const hasClient = me?.client || (me?.clients?.length ?? 0) > 0
  if (!hasClient) return <Navigate to="/setup-client" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public landing page — self-contained, no layout wrapper */}
      <Route path="/" element={<LandingPage />} />

      {/* Standalone full-page ticket purchase — no layout wrapper */}
      <Route path="/boletos/:slug" element={<TicketPurchasePage />} />

      {/* Payment result pages — no layout wrapper */}
      <Route path="/pago/exito" element={<PaymentSuccessPage />} />
      <Route path="/pago/cancelado" element={<PaymentCancelledPage />} />

      {/* Ticket buyer auth pages */}
      <Route element={<TicketBuyerLayout />}>
        <Route path="/boletos/login" element={<LoginBuyerPage />} />
        <Route path="/boletos/register" element={<RegisterBuyerPage />} />
        <Route path="/boletos/forgot-password" element={<ForgotPasswordBuyerPage />} />
        <Route path="/boletos/reset-password" element={<ResetPasswordBuyerPage />} />
      </Route>

      {/* Ticket buyer protected page */}
      <Route path="/mis-boletos" element={
        <RequireTicketBuyerAuth>
          <MyTicketsPage />
        </RequireTicketBuyerAuth>
      } />

      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Client setup — authenticated but no client required */}
      <Route element={<RequireAuth><PortalLayout /></RequireAuth>}>
        <Route path="/setup-client" element={<ClientSetupPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Main portal — requires auth + client */}
      <Route element={<RequireAuth><RequireClient><PortalLayout /></RequireClient></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/events/:eventId" element={<EventPortalPage />} />
        <Route path="/events/:eventId/new-order" element={<NewOrderPage />} />
        <Route path="/events/:eventId/catalog" element={<CatalogPage />} />
        <Route path="/events/:eventId/floor-plan" element={<FloorPlanPortalPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
