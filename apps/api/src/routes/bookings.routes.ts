import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { getBookingCalendar } from '../controllers/bookings.controller'

const router = Router()

router.use(authenticate)

router.get('/calendar', requirePrivilege(PRIVILEGES.BOOKING_CALENDAR_VIEW), getBookingCalendar)

export default router
