import { Router } from 'express'
import { authenticateTicketBuyer } from '../middleware/ticketBuyerAuth.middleware'
import {
  ticketBuyerRegister,
  ticketBuyerLogin,
  ticketBuyerRefresh,
  ticketBuyerMe,
  ticketBuyerForgotPassword,
  ticketBuyerResetPassword,
} from '../controllers/ticket-buyer.auth.controller'
import {
  ticketBuyerListOrders,
  ticketBuyerGetOrder,
  ticketBuyerDownloadPdf,
} from '../controllers/ticket-buyer.orders.controller'

const router = Router()

// Public auth routes
router.post('/auth/register', ticketBuyerRegister)
router.post('/auth/login', ticketBuyerLogin)
router.post('/auth/refresh', ticketBuyerRefresh)
router.post('/auth/forgot-password', ticketBuyerForgotPassword)
router.post('/auth/reset-password', ticketBuyerResetPassword)

// Protected routes
router.use('/me', authenticateTicketBuyer)
router.get('/me', ticketBuyerMe)

router.use('/my', authenticateTicketBuyer)
router.get('/my/orders', ticketBuyerListOrders)
router.get('/my/orders/:token', ticketBuyerGetOrder)
router.get('/my/orders/:token/pdf', ticketBuyerDownloadPdf)

export default router
