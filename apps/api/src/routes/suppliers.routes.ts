import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import * as suppliersController from '../controllers/suppliers.controller'

const router = Router()

router.use(authenticate)

// Suppliers
router.get('/', suppliersController.listSuppliers)
router.get('/:id', suppliersController.getSupplier)
router.post('/', requirePrivilege('CATALOG_SUPPLIERS_MANAGE'), suppliersController.createSupplier)
router.patch('/:id', requirePrivilege('CATALOG_SUPPLIERS_MANAGE'), suppliersController.updateSupplier)
router.patch('/:id/status', requirePrivilege('CATALOG_SUPPLIERS_MANAGE'), suppliersController.toggleSupplierStatus)

// Supplier Contacts
router.post('/:id/contacts', requirePrivilege('CATALOG_SUPPLIERS_MANAGE'), suppliersController.addSupplierContact)
router.patch('/:id/contacts/:contactId', requirePrivilege('CATALOG_SUPPLIERS_MANAGE'), suppliersController.updateSupplierContact)
router.delete('/:id/contacts/:contactId', requirePrivilege('CATALOG_SUPPLIERS_MANAGE'), suppliersController.removeSupplierContact)

export default router
