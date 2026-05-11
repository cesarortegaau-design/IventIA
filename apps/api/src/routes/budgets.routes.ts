import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listEventBudgets,
  getBudget,
  createBudget,
  updateBudgetLine,
  deleteBudget,
  assignDirectOrder,
  removeDirectOrder,
  assignIndirectOrder,
  removeIndirectOrder,
  assignCollabTask,
  removeCollabTask,
} from '../controllers/budgets.controller'

const router = Router()
router.use(authenticate)

router.get('/events/:eventId/budgets', requirePrivilege(PRIVILEGES.ORDER_VIEW), listEventBudgets)
router.post('/events/:eventId/budgets', requirePrivilege(PRIVILEGES.ORDER_CREATE), createBudget)
router.get('/budgets/:budgetId', requirePrivilege(PRIVILEGES.ORDER_VIEW), getBudget)
router.delete('/budgets/:budgetId', requirePrivilege(PRIVILEGES.ORDER_EDIT), deleteBudget)
router.patch('/budgets/:budgetId/lines/:lineId', requirePrivilege(PRIVILEGES.ORDER_EDIT), updateBudgetLine)
router.post('/budgets/:budgetId/lines/:lineId/direct-orders', requirePrivilege(PRIVILEGES.ORDER_EDIT), assignDirectOrder)
router.delete('/budgets/:budgetId/lines/:lineId/direct-orders/:orderId', requirePrivilege(PRIVILEGES.ORDER_EDIT), removeDirectOrder)
router.post('/budgets/:budgetId/lines/:lineId/indirect-orders', requirePrivilege(PRIVILEGES.ORDER_EDIT), assignIndirectOrder)
router.delete('/budgets/:budgetId/lines/:lineId/indirect-orders/:orderId', requirePrivilege(PRIVILEGES.ORDER_EDIT), removeIndirectOrder)
router.post('/budgets/:budgetId/lines/:lineId/tasks', requirePrivilege(PRIVILEGES.ORDER_EDIT), assignCollabTask)
router.delete('/budgets/:budgetId/lines/:lineId/tasks/:taskId', requirePrivilege(PRIVILEGES.ORDER_EDIT), removeCollabTask)

export default router
