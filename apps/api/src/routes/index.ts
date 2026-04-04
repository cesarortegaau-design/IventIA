import { Router } from 'express'
import authRoutes from './auth.routes'
import eventRoutes from './events.routes'
import orderRoutes from './orders.routes'
import resourceRoutes from './resources.routes'
import clientRoutes from './clients.routes'
import priceListRoutes from './priceLists.routes'
import departmentRoutes from './departments.routes'
import userRoutes from './users.routes'
import dashboardRoutes from './dashboard.routes'
import crmRoutes from './crm.routes'
import portalRoutes from './portal.routes'
import portalCodesRoutes from './portal-codes.routes'
import chatRoutes from './chat.routes'
import bookingsRoutes from './bookings.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/events', eventRoutes)
router.use('/orders', orderRoutes)
router.use('/resources', resourceRoutes)
router.use('/clients', clientRoutes)
router.use('/price-lists', priceListRoutes)
router.use('/departments', departmentRoutes)
router.use('/users', userRoutes)
router.use('/dashboards', dashboardRoutes)
router.use('/crm', crmRoutes)
router.use('/portal', portalRoutes)
router.use('/events/:id/portal-codes', portalCodesRoutes)
router.use('/chat', chatRoutes)
router.use('/bookings', bookingsRoutes)

export default router
