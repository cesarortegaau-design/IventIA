import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { listOrdersReport, getOrder, updateOrderStatus, addPayment } from '../controllers/orders.controller'

const router = Router()

router.use(authenticate)

router.get('/',       listOrdersReport)
router.get('/:id',    getOrder)
router.patch('/:id/status',   updateOrderStatus)
router.post('/:id/payments',  addPayment)

export default router
