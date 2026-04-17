import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { generateSupplierPortalCodes, listSupplierPortalCodes, revokeSupplierPortalCode } from '../controllers/supplier-portal-codes.controller'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/',           requirePrivilege(PRIVILEGES.SUPPLIER_VIEW), listSupplierPortalCodes)
router.post('/',          requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), generateSupplierPortalCodes)
router.delete('/:codeId', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), revokeSupplierPortalCode)

export default router
