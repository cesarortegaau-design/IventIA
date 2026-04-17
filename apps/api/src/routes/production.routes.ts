import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { getResourcePlanning, getProfitability } from '../controllers/production.controller'

const router = Router()

router.use(authenticate)

router.get('/resource-planning', requirePrivilege(PRIVILEGES.PRODUCTION_VIEW), getResourcePlanning)
router.get('/profitability', requirePrivilege(PRIVILEGES.PRODUCTION_VIEW), getProfitability)

export default router
