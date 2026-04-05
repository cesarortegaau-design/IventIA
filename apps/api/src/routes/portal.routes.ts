import { Router } from 'express'
import multer from 'multer'
import { authenticatePortal } from '../middleware/portalAuth.middleware'
import {
  portalVerifyCode, portalRegister, portalLogin, portalRefresh, portalMe, portalUpdateMe,
} from '../controllers/portal.auth.controller'
import { portalListEvents, portalGetEvent, portalGetCatalog } from '../controllers/portal.events.controller'
import { portalListOrders, portalGetOrder, portalCreateOrder, portalCalendar } from '../controllers/portal.orders.controller'
import {
  portalListConversations, portalGetConversation, portalStartConversation,
  portalSendMessage, portalUnreadCount, uploadChatFile,
} from '../controllers/chat.controller'

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/', 'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument', 'text/']
    if (allowed.some(t => file.mimetype.startsWith(t))) cb(null, true)
    else cb(new Error('Tipo de archivo no permitido'))
  },
})

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
router.get('/calendar', portalCalendar)

// Chat routes (accessible via /api/v1/portal/chat/... to match portal apiClient base URL)
router.get('/chat/conversations',               portalListConversations)
router.get('/chat/conversations/unread',        portalUnreadCount)
router.get('/chat/conversations/:id',           portalGetConversation)
router.post('/chat/conversations',              portalStartConversation)
router.post('/chat/conversations/:id/messages', portalSendMessage)
router.post('/chat/upload',                     chatUpload.single('file'), uploadChatFile)

export default router
