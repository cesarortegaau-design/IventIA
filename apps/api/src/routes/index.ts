import { Router } from 'express'
import authRoutes from './auth.routes'
import eventRoutes from './events.routes'
import orderRoutes from './orders.routes'
import resourceRoutes from './resources.routes'
import clientRoutes from './clients.routes'
import priceListRoutes from './priceLists.routes'
import departmentRoutes from './departments.routes'
import organizationRoutes from './organizations.routes'
import userRoutes from './users.routes'
import profileRoutes from './profiles.routes'
import dashboardRoutes from './dashboard.routes'
import crmRoutes from './crm.routes'
import portalRoutes from './portal.routes'
import portalCodesRoutes from './portal-codes.routes'
import chatRoutes from './chat.routes'
import bookingsRoutes from './bookings.routes'
import auditRoutes from './audit.routes'
import arteCapitalRoutes from './arte-capital.routes'
import galleryRoutes from './gallery.routes'
import suppliersRoutes from './suppliers.routes'
import supplierPriceListsRoutes from './supplierPriceLists.routes'
import purchaseOrdersRoutes from './purchaseOrders.routes'
import warehouseRoutes from './warehouse.routes'
import contractsRoutes from './contracts.routes'
import templatesRoutes from './templates.routes'
import productionRoutes from './production.routes'
import supplierPortalRoutes from './supplier-portal.routes'
import supplierPortalCodesRoutes from './supplier-portal-codes.routes'
import iflagRoutes from './iflag.routes'
import aiRoutes from './ai.routes'
import ticketEventsRoutes from './ticketEvents.routes'
import ticketsPublicRoutes from './tickets.public.routes'
import ticketBuyerRoutes from './ticket-buyer.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/events', eventRoutes)
router.use('/orders', orderRoutes)
router.use('/resources', resourceRoutes)
router.use('/clients', clientRoutes)
router.use('/price-lists', priceListRoutes)
router.use('/departments', departmentRoutes)
router.use('/organizations', organizationRoutes)
router.use('/users', userRoutes)
router.use('/profiles', profileRoutes)
router.use('/dashboards', dashboardRoutes)
router.use('/crm', crmRoutes)
router.use('/portal', portalRoutes)
router.use('/events/:id/portal-codes', portalCodesRoutes)
router.use('/chat', chatRoutes)
router.use('/bookings', bookingsRoutes)
router.use('/audit', auditRoutes)
router.use('/arte-capital', arteCapitalRoutes)
router.use('/gallery', galleryRoutes)
router.use('/suppliers', suppliersRoutes)
router.use('/supplier-price-lists', supplierPriceListsRoutes)
router.use('/purchase-orders', purchaseOrdersRoutes)
router.use('/warehouse', warehouseRoutes)
router.use('/contracts', contractsRoutes)
router.use('/templates', templatesRoutes)
router.use('/production', productionRoutes)
router.use('/supplier-portal', supplierPortalRoutes)
router.use('/suppliers/:supplierId/portal-codes', supplierPortalCodesRoutes)
router.use('/iflag', iflagRoutes)
router.use('/ai', aiRoutes)
router.use('/events', ticketEventsRoutes)
router.use('/public/tickets', ticketsPublicRoutes)
router.use('/public/tickets', ticketBuyerRoutes)

export default router
