import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import * as priceListsController from '../controllers/supplierPriceLists.controller'

const router = Router()

router.use(authenticate)

// Supplier Price Lists
router.get('/', priceListsController.listSupplierPriceLists)
router.get('/:id', priceListsController.getSupplierPriceList)
router.post('/', requirePrivilege('CATALOG_SUPPLIER_PRICES_MANAGE'), priceListsController.createSupplierPriceList)
router.patch('/:id', requirePrivilege('CATALOG_SUPPLIER_PRICES_MANAGE'), priceListsController.updateSupplierPriceList)

// Price List Items
router.post('/:id/items', requirePrivilege('CATALOG_SUPPLIER_PRICES_MANAGE'), priceListsController.addPriceListItem)
router.patch('/:id/items/:itemId', requirePrivilege('CATALOG_SUPPLIER_PRICES_MANAGE'), priceListsController.updatePriceListItem)
router.delete('/:id/items/:itemId', requirePrivilege('CATALOG_SUPPLIER_PRICES_MANAGE'), priceListsController.removePriceListItem)

export default router
