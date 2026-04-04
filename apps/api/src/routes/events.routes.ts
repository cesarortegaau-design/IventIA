import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { listEvents, getEvent, createEvent, updateEvent, updateEventStatus } from '../controllers/events.controller'
import { listOrdersForEvent, createOrder } from '../controllers/orders.controller'
import { listEventSpaces, createEventSpace, updateEventSpace, deleteEventSpace } from '../controllers/eventSpaces.controller'

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

// Nested event spaces (bookings)
router.get('/:eventId/spaces', listEventSpaces)
router.post('/:eventId/spaces', createEventSpace)
router.put('/:eventId/spaces/:spaceId', updateEventSpace)
router.delete('/:eventId/spaces/:spaceId', deleteEventSpace)

export default router
