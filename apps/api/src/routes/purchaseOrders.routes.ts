import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import * as poController from '../controllers/purchaseOrders.controller'

const router = Router()

router.use(authenticate)

// Purchase Orders
router.get('/', requirePrivilege(PRIVILEGES.PURCHASE_ORDER_VIEW), poController.listPurchaseOrders)
router.get('/:id', requirePrivilege(PRIVILEGES.PURCHASE_ORDER_VIEW), poController.getPurchaseOrder)
router.post('/', requirePrivilege(PRIVILEGES.PURCHASE_ORDER_CREATE), poController.createPurchaseOrder)
router.patch('/:id', requirePrivilege(PRIVILEGES.PURCHASE_ORDER_EDIT_DRAFT), poController.updatePurchaseOrder)
router.patch('/:id/confirm', requirePrivilege(PRIVILEGES.PURCHASE_ORDER_CONFIRM), poController.confirmPurchaseOrder)
router.patch('/:id/cancel', requirePrivilege(PRIVILEGES.PURCHASE_ORDER_CANCEL), poController.cancelPurchaseOrder)

export default router
