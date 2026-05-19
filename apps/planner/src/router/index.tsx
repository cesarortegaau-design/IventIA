import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/auth/LoginPage'
import EventsListPage from '../pages/events/EventsListPage'
import EventDetailPage from '../pages/events/EventDetailPage'
import EventFormPage from '../pages/events/EventFormPage'
import ClientsPage from '../pages/clients/ClientsPage'
import ClientDetailPage from '../pages/clients/ClientDetailPage'
import SuppliersPage from '../pages/suppliers/SuppliersPage'
import SupplierDetailPage from '../pages/suppliers/SupplierDetailPage'
import StudioPage from '../pages/studio/StudioPage'
import DashboardPage from '../pages/dashboard/DashboardPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="eventos" element={<EventsListPage />} />
        <Route path="eventos/nuevo" element={<EventFormPage />} />
        <Route path="eventos/:id" element={<EventDetailPage />} />
        <Route path="eventos/:id/editar" element={<EventFormPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/:id" element={<ClientDetailPage />} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="proveedores/:id" element={<SupplierDetailPage />} />
        <Route path="estudio" element={<StudioPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
