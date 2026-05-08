import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  importGuests, listGuests, exportGuests,
  sendGuestInvitation, sendAllGuestInvitations,
  deleteGuest,
} from '../controllers/ticketGuests.controller'

const router = Router({ mergeParams: true })
router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.EVENT_VIEW), listGuests)
router.post('/import', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), importGuests)
router.get('/export', requirePrivilege(PRIVILEGES.EVENT_VIEW), exportGuests)
router.post('/send-all', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), sendAllGuestInvitations)
router.post('/:guestId/send', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), sendGuestInvitation)
router.delete('/:guestId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteGuest)

export default router
