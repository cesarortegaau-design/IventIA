import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { listOrdersReport, getOrder, updateOrder, updateOrderStatus, updateActualValues, addPayment, approvePayment } from '../controllers/orders.controller'
import { uploadOrderDocument, deleteOrderDocument } from '../controllers/documents.controller'

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

const router = Router()

router.use(authenticate)

router.get('/',       requirePrivilege(PRIVILEGES.ORDER_VIEW), listOrdersReport)
router.get('/:id',    requirePrivilege(PRIVILEGES.ORDER_VIEW), getOrder)
router.patch('/:id',          requirePrivilege(PRIVILEGES.ORDER_EDIT_QUOTED), updateOrder)
router.patch('/:id/status',   requirePrivilege(PRIVILEGES.ORDER_CONFIRM), updateOrderStatus)
router.patch('/:id/actual-values', requirePrivilege(PRIVILEGES.ORDER_EDIT_CONFIRMED), updateActualValues)
router.post('/:id/payments',  requirePrivilege(PRIVILEGES.ORDER_RECORD_PAYMENT), addPayment)
router.patch('/:id/approve-payment', requirePrivilege(PRIVILEGES.PAYMENT_APPROVE), approvePayment)
router.post('/:id/documents', requirePrivilege(PRIVILEGES.ORDER_EDIT_QUOTED), docUpload.single('file'), uploadOrderDocument)
router.delete('/:id/documents/:docId', requirePrivilege(PRIVILEGES.ORDER_EDIT_QUOTED), deleteOrderDocument)

export default router
