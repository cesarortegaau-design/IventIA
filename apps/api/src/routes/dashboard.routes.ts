import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getDashboardAccounting, getDashboardOperations } from '../controllers/orders.controller'

const router = Router()
router.use(authenticate)

router.get('/accounting', getDashboardAccounting)
router.get('/operations', getDashboardOperations)

export default router
