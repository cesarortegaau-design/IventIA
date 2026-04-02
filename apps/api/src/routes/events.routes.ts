import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { listEvents, getEvent, createEvent, updateEvent, updateEventStatus } from '../controllers/events.controller'
import { listOrdersForEvent, createOrder } from '../controllers/orders.controller'

const router = Router()

router.use(authenticate)

router.get('/', listEvents)
router.post('/', createEvent)
router.get('/:id', getEvent)
router.put('/:id', updateEvent)
router.patch('/:id/status', updateEventStatus)

// Nested orders
router.get('/:eventId/orders', listOrdersForEvent)
router.post('/:eventId/orders', createOrder)

export default router
