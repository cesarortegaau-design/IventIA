import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { listEvents, getEvent, createEvent, updateEvent, updateEventStatus } from '../controllers/events.controller'
import { listOrdersForEvent, createOrder } from '../controllers/orders.controller'
import { listEventSpaces, createEventSpace, updateEventSpace, deleteEventSpace } from '../controllers/eventSpaces.controller'
import { uploadEventDocument, deleteEventDocument } from '../controllers/documents.controller'

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

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

// Documents
router.post('/:id/documents', docUpload.single('file'), uploadEventDocument)
router.delete('/:id/documents/:docId', deleteEventDocument)

export default router
