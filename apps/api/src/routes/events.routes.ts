import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { listEvents, getEvent, createEvent, updateEvent, updateEventStatus, getEventOrders } from '../controllers/events.controller'
import { createOrder } from '../controllers/orders.controller'
import { listEventSpaces, createEventSpace, updateEventSpace, deleteEventSpace, getEventSpaceAudit } from '../controllers/eventSpaces.controller'
import { uploadEventDocument, deleteEventDocument } from '../controllers/documents.controller'
import { importStands, listStands, createStand, updateStand, deleteStand } from '../controllers/stands.controller'
import { listFloorPlans, getFloorPlanUploadSignature, createFloorPlanRecord, deleteFloorPlan, getFloorPlanContent } from '../controllers/floorPlans.controller'

const DXF_SIZE_LIMIT = 100 * 1024 * 1024  // 100 MB — complex multi-drawing DXF files can be large

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DXF_SIZE_LIMIT },
})

// Catch multer LIMIT_FILE_SIZE and return a readable 413 instead of a 500
function multerErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: `El archivo excede el límite de ${DXF_SIZE_LIMIT / 1024 / 1024} MB.` },
    })
    return
  }
  next(err)
}

const router = Router()

router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.EVENT_VIEW), listEvents)
router.post('/', requirePrivilege(PRIVILEGES.EVENT_CREATE), createEvent)
router.get('/:id', requirePrivilege(PRIVILEGES.EVENT_VIEW), getEvent)
router.put('/:id', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateEvent)
router.patch('/:id/status', requirePrivilege(PRIVILEGES.EVENT_CONFIRM), updateEventStatus)

// Nested orders
router.get('/:id/orders', requirePrivilege(PRIVILEGES.EVENT_VIEW), getEventOrders)
router.post('/:eventId/orders', requirePrivilege(PRIVILEGES.ORDER_CREATE), createOrder)

// Nested event spaces (bookings)
router.get('/:eventId/spaces', requirePrivilege(PRIVILEGES.EVENT_VIEW), listEventSpaces)
router.post('/:eventId/spaces', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), createEventSpace)
router.put('/:eventId/spaces/:spaceId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateEventSpace)
router.delete('/:eventId/spaces/:spaceId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteEventSpace)
router.get('/:eventId/spaces/:spaceId/audit', requirePrivilege(PRIVILEGES.EVENT_VIEW), getEventSpaceAudit)

// Floor plans — browser uploads directly to Cloudinary, server only signs + records
router.get('/:eventId/floor-plans', requirePrivilege(PRIVILEGES.EVENT_VIEW), listFloorPlans)
router.get('/:eventId/floor-plans/sign', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), getFloorPlanUploadSignature)
router.post('/:eventId/floor-plans', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), createFloorPlanRecord)
router.get('/:eventId/floor-plans/:fpId/content', requirePrivilege(PRIVILEGES.EVENT_VIEW), getFloorPlanContent)
router.delete('/:eventId/floor-plans/:fpId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteFloorPlan)

// Stands
router.get('/:eventId/stands', requirePrivilege(PRIVILEGES.EVENT_VIEW), listStands)
router.post('/:eventId/stands', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), createStand)
router.put('/:eventId/stands/:standId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateStand)
router.delete('/:eventId/stands/:standId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteStand)
router.post('/:eventId/stands/import', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), importStands)

// Documents
router.post('/:id/documents', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), docUpload.single('file'), uploadEventDocument)
router.delete('/:id/documents/:docId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteEventDocument)

export default router
