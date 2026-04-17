import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import SupplierPortalLayout from '../layouts/SupplierPortalLayout'
import PublicLayout from '../layouts/PublicLayout'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import PurchaseOrdersPage from '../pages/purchaseOrders/PurchaseOrdersPage'
import PurchaseOrderDetailPage from '../pages/purchaseOrders/PurchaseOrderDetailPage'
import DocumentsPage from '../pages/documents/DocumentsPage'
import ProfilePage from '../pages/profile/ProfilePage'

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
      <Route element={<RequireAuth><SupplierPortalLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<PurchaseOrdersPage />} />
        <Route path="/orders/:orderId" element={<PurchaseOrderDetailPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
