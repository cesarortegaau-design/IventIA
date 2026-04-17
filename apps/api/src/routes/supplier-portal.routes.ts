import { Router } from 'express'
import multer from 'multer'
import { authenticateSupplierPortal } from '../middleware/supplierPortalAuth.middleware'
import {
  supplierPortalVerifyCode, supplierPortalRegister, supplierPortalLogin, supplierPortalRefresh,
  supplierPortalMe, supplierPortalUpdateMe, supplierPortalForgotPassword, supplierPortalResetPassword,
} from '../controllers/supplier-portal.auth.controller'
import { supplierPortalListOrders, supplierPortalGetOrder } from '../controllers/supplier-portal.orders.controller'
import {
  supplierPortalListDocuments, supplierPortalUploadDocument, supplierPortalDeleteDocument,
} from '../controllers/supplier-portal.documents.controller'
import {
  supplierPortalListConversations, supplierPortalGetConversation, supplierPortalStartConversation,
  supplierPortalSendMessage, supplierPortalUnreadCount, supplierPortalUploadChatFile,
} from '../controllers/supplier-portal.chat.controller'

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

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

// Public supplier portal auth
router.post('/auth/verify-code',     supplierPortalVerifyCode)
router.post('/auth/register',        supplierPortalRegister)
router.post('/auth/login',           supplierPortalLogin)
router.post('/auth/forgot-password', supplierPortalForgotPassword)
router.post('/auth/reset-password',  supplierPortalResetPassword)
router.post('/auth/refresh',         supplierPortalRefresh)

// Protected
router.use(authenticateSupplierPortal)

router.get('/me',   supplierPortalMe)
router.patch('/me', supplierPortalUpdateMe)

router.get('/orders',          supplierPortalListOrders)
router.get('/orders/:orderId', supplierPortalGetOrder)

router.get('/documents',                            supplierPortalListDocuments)
router.post('/documents', docUpload.single('file'), supplierPortalUploadDocument)
router.delete('/documents/:docId',                  supplierPortalDeleteDocument)

router.get('/chat/conversations',                supplierPortalListConversations)
router.get('/chat/conversations/unread',         supplierPortalUnreadCount)
router.get('/chat/conversations/:id',            supplierPortalGetConversation)
router.post('/chat/conversations',               supplierPortalStartConversation)
router.post('/chat/conversations/:id/messages',  supplierPortalSendMessage)
router.post('/chat/upload',                      chatUpload.single('file'), supplierPortalUploadChatFile)

export default router
