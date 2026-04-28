import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { listEvents, getEvent, createEvent, updateEvent, updateEventStatus } from '../controllers/events.controller'
import { listOrdersForEvent, createOrder } from '../controllers/orders.controller'
import { listEventSpaces, createEventSpace, updateEventSpace, deleteEventSpace, getEventSpaceAudit } from '../controllers/eventSpaces.controller'
import { uploadEventDocument, deleteEventDocument } from '../controllers/documents.controller'
import { importStands } from '../controllers/stands.controller'
import { listFloorPlans, uploadFloorPlan, deleteFloorPlan, getFloorPlanContent } from '../controllers/floorPlans.controller'

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

const router = Router()

router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.EVENT_VIEW), listEvents)
router.post('/', requirePrivilege(PRIVILEGES.EVENT_CREATE), createEvent)
router.get('/:id', requirePrivilege(PRIVILEGES.EVENT_VIEW), getEvent)
router.put('/:id', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateEvent)
router.patch('/:id/status', requirePrivilege(PRIVILEGES.EVENT_CONFIRM), updateEventStatus)

// Nested orders
router.get('/:eventId/orders', requirePrivilege(PRIVILEGES.ORDER_VIEW), listOrdersForEvent)
router.post('/:eventId/orders', requirePrivilege(PRIVILEGES.ORDER_CREATE), createOrder)

// Nested event spaces (bookings)
router.get('/:eventId/spaces', requirePrivilege(PRIVILEGES.EVENT_VIEW), listEventSpaces)
router.post('/:eventId/spaces', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), createEventSpace)
router.put('/:eventId/spaces/:spaceId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateEventSpace)
router.delete('/:eventId/spaces/:spaceId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteEventSpace)
router.get('/:eventId/spaces/:spaceId/audit', requirePrivilege(PRIVILEGES.EVENT_VIEW), getEventSpaceAudit)

// Floor plans
router.get('/:eventId/floor-plans', requirePrivilege(PRIVILEGES.EVENT_VIEW), listFloorPlans)
router.post('/:eventId/floor-plans', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), docUpload.single('file'), uploadFloorPlan)
router.get('/:eventId/floor-plans/:fpId/content', requirePrivilege(PRIVILEGES.EVENT_VIEW), getFloorPlanContent)
router.delete('/:eventId/floor-plans/:fpId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteFloorPlan)

// Stands import
router.post('/:eventId/stands/import', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), importStands)

// Documents
router.post('/:id/documents', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), docUpload.single('file'), uploadEventDocument)
router.delete('/:id/documents/:docId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteEventDocument)

export default router
