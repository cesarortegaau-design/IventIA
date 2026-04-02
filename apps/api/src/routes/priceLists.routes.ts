import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { listPriceLists, getPriceList, createPriceList, updatePriceList, upsertPriceListItem, removePriceListItem } from '../controllers/priceLists.controller'

const router = Router()

router.use(authenticate)

router.get('/', listPriceLists)
router.post('/', createPriceList)
router.get('/:id', getPriceList)
router.put('/:id', updatePriceList)
router.post('/:id/items', upsertPriceListItem)
router.delete('/:id/items/:resourceId', removePriceListItem)

export default router
