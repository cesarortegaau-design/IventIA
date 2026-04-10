import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import * as poController from '../controllers/purchaseOrders.controller'

const router = Router()

router.use(authenticate)

// Purchase Orders
router.get('/', requirePrivilege('PURCHASE_ORDER_VIEW'), poController.listPurchaseOrders)
router.get('/:id', requirePrivilege('PURCHASE_ORDER_VIEW'), poController.getPurchaseOrder)
router.post('/', requirePrivilege('PURCHASE_ORDER_CREATE'), poController.createPurchaseOrder)
router.patch('/:id', requirePrivilege('PURCHASE_ORDER_EDIT'), poController.updatePurchaseOrder)
router.patch('/:id/confirm', requirePrivilege('PURCHASE_ORDER_CONFIRM'), poController.confirmPurchaseOrder)
router.patch('/:id/cancel', requirePrivilege('PURCHASE_ORDER_CONFIRM'), poController.cancelPurchaseOrder)

export default router
