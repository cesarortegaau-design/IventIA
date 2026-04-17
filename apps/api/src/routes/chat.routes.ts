import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { authenticatePortal } from '../middleware/portalAuth.middleware'
import {
  listConversations, getConversation, sendAdminMessage, adminUnreadCount, adminStartConversation,
  portalListConversations, portalGetConversation, portalStartConversation,
  portalSendMessage, portalUnreadCount, uploadChatFile,
} from '../controllers/chat.controller'

const upload = multer({
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

// Admin routes - specific routes BEFORE parameterized routes
router.get('/admin/conversations',               authenticate, listConversations)
router.post('/admin/conversations',              authenticate, adminStartConversation)
router.get('/admin/conversations/unread',        authenticate, adminUnreadCount)
router.post('/admin/upload',                     authenticate, upload.single('file'), uploadChatFile)
router.get('/admin/conversations/:id',           authenticate, getConversation)
router.post('/admin/conversations/:id/messages', authenticate, sendAdminMessage)

// Portal routes - specific routes BEFORE parameterized routes
router.get('/portal/conversations',               authenticatePortal, portalListConversations)
router.post('/portal/conversations',              authenticatePortal, portalStartConversation)
router.get('/portal/conversations/unread',        authenticatePortal, portalUnreadCount)
router.post('/portal/upload',                     authenticatePortal, upload.single('file'), uploadChatFile)
router.get('/portal/conversations/:id',           authenticatePortal, portalGetConversation)
router.post('/portal/conversations/:id/messages', authenticatePortal, portalSendMessage)
router.post('/portal/upload',                     authenticatePortal, upload.single('file'), uploadChatFile)

export default router
