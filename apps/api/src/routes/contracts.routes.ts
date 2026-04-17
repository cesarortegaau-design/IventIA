import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listContracts,
  getContract,
  createContract,
  updateContract,
  updateContractStatus,
  addOrder,
  removeOrder,
  getAvailableOrders,
  addScheduledPayment,
  updateScheduledPayment,
  deleteScheduledPayment,
  addPayment,
} from '../controllers/contracts.controller'

const router = Router()

router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.CONTRACT_VIEW), listContracts)
router.post('/', requirePrivilege(PRIVILEGES.CONTRACT_CREATE), createContract)
router.get('/:id', requirePrivilege(PRIVILEGES.CONTRACT_VIEW), getContract)
router.patch('/:id', requirePrivilege(PRIVILEGES.CONTRACT_EDIT_EN_FIRMA), updateContract)
router.patch('/:id/status', requirePrivilege(PRIVILEGES.CONTRACT_SIGN), updateContractStatus)

// Orders
router.get('/:id/available-orders', requirePrivilege(PRIVILEGES.CONTRACT_VIEW), getAvailableOrders)
router.post('/:id/orders/:orderId', requirePrivilege(PRIVILEGES.CONTRACT_EDIT_EN_FIRMA), addOrder)
router.delete('/:id/orders/:orderId', requirePrivilege(PRIVILEGES.CONTRACT_EDIT_EN_FIRMA), removeOrder)

// Scheduled Payments
router.post('/:id/scheduled-payments', requirePrivilege(PRIVILEGES.CONTRACT_EDIT_EN_FIRMA), addScheduledPayment)
router.patch('/:id/scheduled-payments/:spId', requirePrivilege(PRIVILEGES.CONTRACT_EDIT_EN_FIRMA), updateScheduledPayment)
router.delete('/:id/scheduled-payments/:spId', requirePrivilege(PRIVILEGES.CONTRACT_EDIT_EN_FIRMA), deleteScheduledPayment)

// Record payment against scheduled payment
router.post('/:id/scheduled-payments/:spId/payments', requirePrivilege(PRIVILEGES.PAYMENT_RECORD), addPayment)

export default router
