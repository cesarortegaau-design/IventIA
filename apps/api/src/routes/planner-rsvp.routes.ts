import { Router } from 'express'
import { getPublicInvitation, confirmRsvp } from '../controllers/planner-rsvp.controller'

const router = Router()

router.get('/:eventId', getPublicInvitation)
router.post('/:eventId/rsvp/:guestId', confirmRsvp)

export default router
