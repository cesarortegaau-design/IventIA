import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getAuditLog, getAuditLogByType } from '../controllers/audit.controller'

const router = Router()

router.use(authenticate)

// GET /audit/:entityType?action=CREATE&limit=50&offset=0
router.get('/:entityType', getAuditLogByType)
// GET /audit/:entityType/:entityId?action=CREATE&limit=50&offset=0
router.get('/:entityType/:entityId', getAuditLog)

export default router
