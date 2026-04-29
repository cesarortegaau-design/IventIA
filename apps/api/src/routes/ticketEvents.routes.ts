import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  getTicketEvent, upsertTicketEvent,
  createSection, updateSection, deleteSection,
  generateSeats, listTicketOrders,
} from '../controllers/ticketEvents.controller'

const router = Router()
router.use(authenticate)

router.get('/:eventId/tickets', requirePrivilege(PRIVILEGES.EVENT_VIEW), getTicketEvent)
router.put('/:eventId/tickets', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), upsertTicketEvent)
router.post('/:eventId/tickets/sections', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), createSection)
router.put('/:eventId/tickets/sections/:sectionId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateSection)
router.delete('/:eventId/tickets/sections/:sectionId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteSection)
router.post('/:eventId/tickets/sections/:sectionId/seats', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), generateSeats)
router.get('/:eventId/tickets/orders', requirePrivilege(PRIVILEGES.EVENT_VIEW), listTicketOrders)

export default router
