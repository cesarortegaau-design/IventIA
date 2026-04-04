import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getBookingCalendar } from '../controllers/bookings.controller'

const router = Router()

router.use(authenticate)

router.get('/calendar', getBookingCalendar)

export default router
