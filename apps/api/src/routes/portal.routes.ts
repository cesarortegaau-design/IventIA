import { Router } from 'express'
import { authenticatePortal } from '../middleware/portalAuth.middleware'
import {
  portalVerifyCode, portalRegister, portalLogin, portalRefresh, portalMe, portalUpdateMe,
} from '../controllers/portal.auth.controller'
import { portalListEvents, portalGetEvent, portalGetCatalog } from '../controllers/portal.events.controller'
import { portalListOrders, portalGetOrder, portalCreateOrder } from '../controllers/portal.orders.controller'
import {
  portalListConversations, portalGetConversation, portalStartConversation,
  portalSendMessage, portalUnreadCount,
} from '../controllers/chat.controller'

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

// Chat routes (accessible via /api/v1/portal/chat/... to match portal apiClient base URL)
router.get('/chat/conversations',              portalListConversations)
router.get('/chat/conversations/unread',       portalUnreadCount)
router.get('/chat/conversations/:id',          portalGetConversation)
router.post('/chat/conversations',             portalStartConversation)
router.post('/chat/conversations/:id/messages', portalSendMessage)

export default router
