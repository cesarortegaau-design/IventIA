import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { listOrdersReport, getOrder, updateOrderStatus, addPayment } from '../controllers/orders.controller'
import { uploadOrderDocument, deleteOrderDocument } from '../controllers/documents.controller'

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

const router = Router()

router.use(authenticate)

router.get('/',       listOrdersReport)
router.get('/:id',    getOrder)
router.patch('/:id/status',   updateOrderStatus)
router.post('/:id/payments',  addPayment)
router.post('/:id/documents', docUpload.single('file'), uploadOrderDocument)
router.delete('/:id/documents/:docId', deleteOrderDocument)

export default router
