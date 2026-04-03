import { Router } from 'express'
import { generatePortalCodes, listPortalCodes, revokePortalCode } from '../controllers/portal.codes.controller'

const router = Router({ mergeParams: true })

router.post('/generate', generatePortalCodes)
router.get('/', listPortalCodes)
router.patch('/:codeId/revoke', revokePortalCode)

export default router
