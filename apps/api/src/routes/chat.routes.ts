import { Router } from 'express'
import path from 'path'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { authenticate } from '../middleware/authenticate'
import { authenticatePortal } from '../middleware/portalAuth.middleware'
import {
  listConversations, getConversation, sendAdminMessage, adminUnreadCount, adminStartConversation,
  portalListConversations, portalGetConversation, portalStartConversation,
  portalSendMessage, portalUnreadCount, uploadChatFile,
} from '../controllers/chat.controller'

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'chat'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/', 'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument', 'text/']
    if (allowed.some(t => file.mimetype.startsWith(t))) cb(null, true)
    else cb(new Error('Tipo de archivo no permitido'))
  },
})

const router = Router()

// Admin routes
router.get('/admin/conversations',               authenticate, listConversations)
router.post('/admin/conversations',              authenticate, adminStartConversation)
router.get('/admin/conversations/unread',        authenticate, adminUnreadCount)
router.get('/admin/conversations/:id',           authenticate, getConversation)
router.post('/admin/conversations/:id/messages', authenticate, sendAdminMessage)
router.post('/admin/upload',                     authenticate, upload.single('file'), uploadChatFile)

// Portal routes
router.get('/portal/conversations',               authenticatePortal, portalListConversations)
router.get('/portal/conversations/unread',        authenticatePortal, portalUnreadCount)
router.get('/portal/conversations/:id',           authenticatePortal, portalGetConversation)
router.post('/portal/conversations',              authenticatePortal, portalStartConversation)
router.post('/portal/conversations/:id/messages', authenticatePortal, portalSendMessage)
router.post('/portal/upload',                     authenticatePortal, upload.single('file'), uploadChatFile)

export default router
