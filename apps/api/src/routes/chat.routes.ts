import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authenticatePortal } from '../middleware/portalAuth.middleware'
import {
  listConversations, getConversation, sendAdminMessage, adminUnreadCount, adminStartConversation,
  portalListConversations, portalGetConversation, portalStartConversation,
  portalSendMessage, portalUnreadCount,
} from '../controllers/chat.controller'

const router = Router()

// Admin routes
router.get('/admin/conversations',              authenticate, listConversations)
router.post('/admin/conversations',             authenticate, adminStartConversation)
router.get('/admin/conversations/unread',       authenticate, adminUnreadCount)
router.get('/admin/conversations/:id',          authenticate, getConversation)
router.post('/admin/conversations/:id/messages', authenticate, sendAdminMessage)

// Portal routes
router.get('/portal/conversations',              authenticatePortal, portalListConversations)
router.get('/portal/conversations/unread',       authenticatePortal, portalUnreadCount)
router.get('/portal/conversations/:id',          authenticatePortal, portalGetConversation)
router.post('/portal/conversations',             authenticatePortal, portalStartConversation)
router.post('/portal/conversations/:id/messages', authenticatePortal, portalSendMessage)

export default router
