import { Router } from 'express'
import { generatePortalCodes, listPortalCodes, revokePortalCode, createPortalDirectAccess } from '../controllers/portal.codes.controller'

const router = Router({ mergeParams: true })

router.post('/generate', generatePortalCodes)
router.post('/direct-access', createPortalDirectAccess)
router.get('/', listPortalCodes)
router.patch('/:codeId/revoke', revokePortalCode)

export default router
