import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import MainLayout from '../layouts/MainLayout'
import EventLayout from '../layouts/EventLayout'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import EventsListPage from '../pages/events/EventsListPage'
import EventFormPage from '../pages/events/EventFormPage'
import EventDetailPage from '../pages/events/EventDetailPage'
import LienzoPage from '../pages/events/lienzo/LienzoPage'
import PresupuestoPage from '../pages/events/PresupuestoPage'
import TimelinePage from '../pages/events/TimelinePage'
import TareasPage from '../pages/events/TareasPage'
import MapaPage from '../pages/events/MapaPage'
import ClientsPage from '../pages/clients/ClientsPage'
import ClientDetailPage from '../pages/clients/ClientDetailPage'
import SuppliersPage from '../pages/suppliers/SuppliersPage'
import SupplierDetailPage from '../pages/suppliers/SupplierDetailPage'
import StudioPage from '../pages/studio/StudioPage'
import SeedPage from '../pages/seed/SeedPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Global layout (dashboard, lists) */}
      <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="eventos" element={<EventsListPage />} />
        <Route path="eventos/nuevo" element={<EventFormPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/:id" element={<ClientDetailPage />} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="proveedores/:id" element={<SupplierDetailPage />} />
        <Route path="estudio" element={<StudioPage />} />
      </Route>

      {/* Event workspace layout (event-specific sidebar) */}
      <Route path="/eventos/:id" element={<RequireAuth><EventLayout /></RequireAuth>}>
        <Route index element={<Navigate to="lienzo" replace />} />
        <Route path="lienzo" element={<LienzoPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="tareas" element={<TareasPage />} />
        <Route path="presupuesto" element={<PresupuestoPage />} />
        <Route path="crm" element={<EventDetailPage defaultTab="crm" />} />
        <Route path="mapa" element={<MapaPage />} />
        <Route path="portal" element={<EventDetailPage defaultTab="portal" />} />
        <Route path="moodboard" element={<EventDetailPage defaultTab="moodboard" />} />
        <Route path="mensajes" element={<EventDetailPage defaultTab="mensajes" />} />
        <Route path="editar" element={<EventFormPage />} />
      </Route>

      <Route path="/seed" element={<SeedPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
