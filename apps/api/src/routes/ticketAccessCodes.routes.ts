import { Router } from 'express'
import { generateTicketCodes, listTicketCodes, revokeTicketCode } from '../controllers/ticketAccessCodes.controller'

const router = Router({ mergeParams: true })

router.post('/generate', generateTicketCodes)
router.get('/', listTicketCodes)
router.patch('/:codeId/revoke', revokeTicketCode)

export default router
