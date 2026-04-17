import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { getDashboardAccounting, getDashboardOperations } from '../controllers/orders.controller'

const router = Router()
router.use(authenticate)

router.get('/accounting', requirePrivilege(PRIVILEGES.DASHBOARD_ACCOUNTING), getDashboardAccounting)
router.get('/operations', requirePrivilege(PRIVILEGES.DASHBOARD_OPERATIONS), getDashboardOperations)

export default router
