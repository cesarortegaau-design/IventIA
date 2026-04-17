import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import * as suppliersController from '../controllers/suppliers.controller'

const router = Router()

router.use(authenticate)

// Suppliers
router.get('/', requirePrivilege(PRIVILEGES.SUPPLIER_VIEW), suppliersController.listSuppliers)
router.get('/:id', requirePrivilege(PRIVILEGES.SUPPLIER_VIEW), suppliersController.getSupplier)
router.post('/', requirePrivilege(PRIVILEGES.SUPPLIER_CREATE), suppliersController.createSupplier)
router.patch('/:id', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), suppliersController.updateSupplier)
router.patch('/:id/status', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), suppliersController.toggleSupplierStatus)

// Supplier Contacts
router.post('/:id/contacts', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), suppliersController.addSupplierContact)
router.patch('/:id/contacts/:contactId', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), suppliersController.updateSupplierContact)
router.delete('/:id/contacts/:contactId', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), suppliersController.removeSupplierContact)

export default router
