import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/auth/LoginPage'
import EventsCalendarPage from '../pages/events/EventsCalendarPage'
import EventDetailPage from '../pages/events/EventDetailPage'
import EventFormPage from '../pages/events/EventFormPage'
import OrderDetailPage from '../pages/orders/OrderDetailPage'
import OrderFormWizard from '../pages/orders/OrderFormWizard'
import OrdersListPage from '../pages/orders/OrdersListPage'
import ResourcesPage from '../pages/catalogs/resources/ResourcesPage'
import ClientsPage from '../pages/catalogs/clients/ClientsPage'
import PriceListsPage from '../pages/catalogs/priceLists/PriceListsPage'
import DepartmentsPage from '../pages/catalogs/departments/DepartmentsPage'
import UsersPage from '../pages/catalogs/users/UsersPage'
import AccountingDashboard from '../pages/dashboard/AccountingDashboard'
import OperationsDashboard from '../pages/dashboard/OperationsDashboard'
import ClientDetailPage from '../pages/crm/ClientDetailPage'
import CrmDashboard from '../pages/crm/CrmDashboard'
import HomePage from '../pages/home/HomePage'
import ChatPage from '../pages/chat/ChatPage'
import OrdersReportPage from '../pages/reports/OrdersReportPage'
import BookingCalendarPage from '../pages/bookings/BookingCalendarPage'
import SuppliersPage from '../pages/catalogs/suppliers/SuppliersPage'
import PurchaseOrdersPage from '../pages/catalogs/purchaseOrders/PurchaseOrdersPage'
import PurchaseOrderWizard from '../pages/catalogs/purchaseOrders/PurchaseOrderWizard'
import PurchaseOrderDetailPage from '../pages/catalogs/purchaseOrders/PurchaseOrderDetailPage'
import SupplierPriceListsPage from '../pages/catalogs/supplierPriceLists/SupplierPriceListsPage'
import WarehousesPage from '../pages/warehouse/WarehousesPage'
import InventoryPage from '../pages/warehouse/InventoryPage'
import ReceiptPage from '../pages/warehouse/ReceiptPage'
import ContractsPage from '../pages/contracts/ContractsPage'
import ContractDetailPage from '../pages/contracts/ContractDetailPage'
import TemplatesPage from '../pages/templates/TemplatesPage'
import ProductionPage from '../pages/production/ProductionPage'
import PortalUsersPage from '../pages/catalogs/portalUsers/PortalUsersPage'
import ProfilesPage from '../pages/catalogs/profiles/ProfilesPage'
import OrganizationsPage from '../pages/catalogs/organizations/OrganizationsPage'
import UsersAndProfilesPage from '../pages/catalogs/users/UsersAndProfilesPage'
import AnalysisDashboard from '../pages/analysis/AnalysisDashboard'
import EventResumenReport from '../pages/events/EventResumenReport'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AppRouter() {
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
        <Route index element={<HomePage />} />
        <Route path="eventos" element={<EventsCalendarPage />} />
        <Route path="eventos/nuevo" element={<EventFormPage />} />
        <Route path="eventos/:id" element={<EventDetailPage />} />
        <Route path="eventos/:id/reporte" element={<EventResumenReport />} />
        <Route path="eventos/:id/editar" element={<EventFormPage />} />
        <Route path="eventos/:eventId/ordenes/nueva" element={<OrderFormWizard />} />
        <Route path="ordenes" element={<OrdersListPage />} />
        <Route path="ordenes/:id" element={<OrderDetailPage />} />
        <Route path="catalogos/recursos" element={<ResourcesPage />} />
        <Route path="catalogos/clientes" element={<ClientsPage />} />
        <Route path="catalogos/clientes/:clientId" element={<ClientDetailPage />} />
        <Route path="crm" element={<CrmDashboard />} />
        <Route path="catalogos/listas-precio" element={<PriceListsPage />} />
        <Route path="catalogos/departamentos" element={<Navigate to="/catalogos/organizaciones" replace />} />
        <Route path="catalogos/usuarios" element={<Navigate to="/catalogos/usuarios-perfiles?tab=internos" replace />} />
        <Route path="dashboard/contabilidad" element={<AccountingDashboard />} />
        <Route path="dashboard/operaciones" element={<OperationsDashboard />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="reportes/ordenes" element={<OrdersReportPage />} />
        <Route path="booking-calendar" element={<BookingCalendarPage />} />
        <Route path="catalogos/proveedores" element={<SuppliersPage />} />
        <Route path="catalogos/ordenes-compra" element={<PurchaseOrdersPage />} />
        <Route path="catalogos/ordenes-compra/nueva" element={<PurchaseOrderWizard />} />
        <Route path="catalogos/ordenes-compra/:id" element={<PurchaseOrderDetailPage />} />
        <Route path="catalogos/listas-precios-proveedores" element={<SupplierPriceListsPage />} />
        <Route path="contratos" element={<ContractsPage />} />
        <Route path="contratos/:id" element={<ContractDetailPage />} />
        <Route path="plantillas" element={<TemplatesPage />} />
        <Route path="almacen/almacenes" element={<WarehousesPage />} />
        <Route path="almacen/inventario" element={<InventoryPage />} />
        <Route path="almacen/recepcion" element={<ReceiptPage />} />
        <Route path="produccion" element={<ProductionPage />} />
        <Route path="catalogos/perfiles" element={<Navigate to="/catalogos/usuarios-perfiles?tab=perfiles" replace />} />
        <Route path="catalogos/usuarios-portal" element={<Navigate to="/catalogos/usuarios-perfiles?tab=portal" replace />} />
        <Route path="catalogos/usuarios-perfiles" element={<UsersAndProfilesPage />} />
        <Route path="catalogos/organizaciones" element={<OrganizationsPage />} />
        <Route path="analisis" element={<AnalysisDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
