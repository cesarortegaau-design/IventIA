import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import * as priceListsController from '../controllers/supplierPriceLists.controller'

const router = Router()

router.use(authenticate)

// Supplier Price Lists
router.get('/', requirePrivilege(PRIVILEGES.SUPPLIER_PRICE_LIST_VIEW), priceListsController.listSupplierPriceLists)
router.get('/:id', requirePrivilege(PRIVILEGES.SUPPLIER_PRICE_LIST_VIEW), priceListsController.getSupplierPriceList)
router.post('/', requirePrivilege(PRIVILEGES.SUPPLIER_PRICE_LIST_CREATE), priceListsController.createSupplierPriceList)
router.patch('/:id', requirePrivilege(PRIVILEGES.SUPPLIER_PRICE_LIST_EDIT), priceListsController.updateSupplierPriceList)

// Price List Items
router.post('/:id/items', requirePrivilege(PRIVILEGES.SUPPLIER_PRICE_LIST_EDIT), priceListsController.addPriceListItem)
router.patch('/:id/items/:itemId', requirePrivilege(PRIVILEGES.SUPPLIER_PRICE_LIST_EDIT), priceListsController.updatePriceListItem)
router.delete('/:id/items/:itemId', requirePrivilege(PRIVILEGES.SUPPLIER_PRICE_LIST_EDIT), priceListsController.removePriceListItem)

export default router
