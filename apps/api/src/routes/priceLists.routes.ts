import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import { listPriceLists, getPriceList, createPriceList, updatePriceList, upsertPriceListItem, removePriceListItem, importPriceListItems } from '../controllers/priceLists.controller'

const router = Router()

router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.PRICE_LIST_VIEW), listPriceLists)
router.post('/', requirePrivilege(PRIVILEGES.PRICE_LIST_CREATE), createPriceList)
router.get('/:id', requirePrivilege(PRIVILEGES.PRICE_LIST_VIEW), getPriceList)
router.put('/:id', requirePrivilege(PRIVILEGES.PRICE_LIST_EDIT), updatePriceList)
router.post('/:id/items', requirePrivilege(PRIVILEGES.PRICE_LIST_EDIT), upsertPriceListItem)
router.post('/:id/items/import', requirePrivilege(PRIVILEGES.PRICE_LIST_EDIT), importPriceListItems)
router.delete('/:id/items/:resourceId', requirePrivilege(PRIVILEGES.PRICE_LIST_EDIT), removePriceListItem)

export default router
