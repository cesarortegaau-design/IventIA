import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import {
  listInteractions, createInteraction, updateInteraction, deleteInteraction,
  listTasks, createTask, updateTask, completeTask, deleteTask,
  getClientSummary,
} from '../controllers/crm.controller'
import { listMyTasks } from '../controllers/crm.controller'

const router = Router()
router.use(authenticate)

// My tasks (cross-client)
router.get('/my-tasks', listMyTasks)

// Per-client CRM
router.get('/clients/:clientId/summary', getClientSummary)

router.get('/clients/:clientId/interactions', listInteractions)
router.post('/clients/:clientId/interactions', createInteraction)
router.put('/clients/:clientId/interactions/:id', updateInteraction)
router.delete('/clients/:clientId/interactions/:id', deleteInteraction)

router.get('/clients/:clientId/tasks', listTasks)
router.post('/clients/:clientId/tasks', createTask)
router.put('/clients/:clientId/tasks/:id', updateTask)
router.patch('/clients/:clientId/tasks/:id/complete', completeTask)
router.delete('/clients/:clientId/tasks/:id', deleteTask)

export default router
