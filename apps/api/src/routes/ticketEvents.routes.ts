import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  getTicketEvent, upsertTicketEvent, uploadTicketEventImage,
  createSection, updateSection, deleteSection,
  generateSeats, listTicketOrders,
  getVenueMap, saveVenueMap,
} from '../controllers/ticketEvents.controller'
import ticketAccessCodesRouter from './ticketAccessCodes.routes'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()
router.use(authenticate)

router.get('/:eventId/tickets', requirePrivilege(PRIVILEGES.EVENT_VIEW), getTicketEvent)
router.put('/:eventId/tickets', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), upsertTicketEvent)
router.post('/:eventId/tickets/upload/:field', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), upload.single('image'), uploadTicketEventImage)
router.get('/:eventId/tickets/map', requirePrivilege(PRIVILEGES.EVENT_VIEW), getVenueMap)
router.put('/:eventId/tickets/map', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), saveVenueMap)
router.post('/:eventId/tickets/sections', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), createSection)
router.put('/:eventId/tickets/sections/:sectionId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateSection)
router.delete('/:eventId/tickets/sections/:sectionId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteSection)
router.post('/:eventId/tickets/sections/:sectionId/seats', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), generateSeats)
router.get('/:eventId/tickets/orders', requirePrivilege(PRIVILEGES.EVENT_VIEW), listTicketOrders)
router.use('/:eventId/tickets/codes', ticketAccessCodesRouter)

export default router
