import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

// Layouts
import PublicLayout from '../layouts/PublicLayout'
import MainLayout from '../layouts/MainLayout'

// Pages
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import GalleryPage from '../pages/GalleryPage'
import ArtworkDetailPage from '../pages/ArtworkDetailPage'
import CatalogPage from '../pages/CatalogPage'
import CartPage from '../pages/CartPage'
import CheckoutPage from '../pages/CheckoutPage'
import MembershipsPage from '../pages/MembershipsPage'
import DashboardPage from '../pages/DashboardPage'
import ArtistDashboardPage from '../pages/ArtistDashboardPage'
import OrdersPage from '../pages/OrdersPage'
import ProfilePage from '../pages/ProfilePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Public gallery routes */}
      <Route element={<PublicLayout />}>
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/artwork/:id" element={<ArtworkDetailPage />} />
      </Route>

      {/* Public auth routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/memberships" element={<MembershipsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/artist-dashboard" element={<ArtistDashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
