import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listFlows,
  createFlow,
  getFlow,
  updateFlow,
  deleteFlow,
  listRequests,
  getActiveRequest,
  triggerRequest,
  reviewStep,
  cancelRequest,
} from '../controllers/approvalFlows.controller'

const router = Router()
router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.APPROVAL_FLOW_VIEW), listFlows)
router.post('/', requirePrivilege(PRIVILEGES.APPROVAL_FLOW_CREATE), createFlow)
router.get('/requests', requirePrivilege(PRIVILEGES.APPROVAL_REQUEST_VIEW), listRequests)
router.get('/requests/active', requirePrivilege(PRIVILEGES.APPROVAL_REQUEST_VIEW), getActiveRequest)
router.post('/requests', requirePrivilege(PRIVILEGES.APPROVAL_REQUEST_TRIGGER), triggerRequest)
router.post('/requests/:requestId/steps/:stepId/review', requirePrivilege(PRIVILEGES.APPROVAL_REQUEST_REVIEW), reviewStep)
router.post('/requests/:requestId/cancel', requirePrivilege(PRIVILEGES.APPROVAL_REQUEST_REVIEW), cancelRequest)
router.get('/:id', requirePrivilege(PRIVILEGES.APPROVAL_FLOW_VIEW), getFlow)
router.put('/:id', requirePrivilege(PRIVILEGES.APPROVAL_FLOW_EDIT), updateFlow)
router.delete('/:id', requirePrivilege(PRIVILEGES.APPROVAL_FLOW_DELETE), deleteFlow)

export default router
