import { Router } from 'express'
import { authenticatePortal } from '../middleware/portalAuth.middleware'
import {
  portalVerifyCode, portalRegister, portalLogin, portalRefresh, portalMe, portalUpdateMe,
} from '../controllers/portal.auth.controller'
import { portalListEvents, portalGetEvent, portalGetCatalog } from '../controllers/portal.events.controller'
import { portalListOrders, portalGetOrder, portalCreateOrder } from '../controllers/portal.orders.controller'

const router = Router()

// Public portal auth
router.post('/auth/verify-code', portalVerifyCode)
router.post('/auth/register', portalRegister)
router.post('/auth/login', portalLogin)
router.post('/auth/refresh', portalRefresh)

// Protected portal routes
router.use(authenticatePortal)

router.get('/me', portalMe)
router.patch('/me', portalUpdateMe)

router.get('/events', portalListEvents)
router.get('/events/:eventId', portalGetEvent)
router.get('/events/:eventId/catalog', portalGetCatalog)
router.post('/events/:eventId/orders', portalCreateOrder)

router.get('/orders', portalListOrders)
router.get('/orders/:orderId', portalGetOrder)

export default router
