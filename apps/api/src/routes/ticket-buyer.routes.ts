import { Router } from 'express'
import { authenticateTicketBuyer } from '../middleware/ticketBuyerAuth.middleware'
import {
  ticketBuyerRegister,
  ticketBuyerLogin,
  ticketBuyerRefresh,
  ticketBuyerMe,
  ticketBuyerUpdateProfile,
  ticketBuyerChangePassword,
  ticketBuyerForgotPassword,
  ticketBuyerResetPassword,
} from '../controllers/ticket-buyer.auth.controller'
import {
  ticketBuyerListOrders,
  ticketBuyerGetOrder,
  ticketBuyerDownloadPdf,
  ticketBuyerDownloadAttendeePdf,
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
router.patch('/me', ticketBuyerUpdateProfile)
router.post('/me/change-password', ticketBuyerChangePassword)

router.use('/my', authenticateTicketBuyer)
router.get('/my/orders', ticketBuyerListOrders)
router.get('/my/orders/:token', ticketBuyerGetOrder)
router.get('/my/orders/:token/pdf', ticketBuyerDownloadPdf)
router.get('/my/orders/:token/attendees/:attendeeId/pdf', ticketBuyerDownloadAttendeePdf)

export default router
