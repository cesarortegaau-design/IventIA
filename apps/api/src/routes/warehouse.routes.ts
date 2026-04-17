import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import * as warehouseController from '../controllers/warehouse.controller'

const router = Router()

router.use(authenticate)

// Warehouse CRUD
router.post('/', requirePrivilege(PRIVILEGES.WAREHOUSE_CREATE), warehouseController.createWarehouse)
router.get('/', requirePrivilege(PRIVILEGES.WAREHOUSE_VIEW), warehouseController.listWarehouses)

// Specific routes BEFORE parameterized routes
router.get('/movements', requirePrivilege(PRIVILEGES.WAREHOUSE_VIEW), warehouseController.getInventoryMovements)
router.post('/inventory', requirePrivilege(PRIVILEGES.WAREHOUSE_EDIT), warehouseController.initializeResourceInventory)
router.post('/reception', requirePrivilege(PRIVILEGES.WAREHOUSE_RECEIVE), warehouseController.registerReception)
router.post('/transfer', requirePrivilege(PRIVILEGES.WAREHOUSE_ADJUST), warehouseController.transferInventory)
router.get('/inventory/:inventoryId', requirePrivilege(PRIVILEGES.WAREHOUSE_VIEW), warehouseController.getResourceInventory)
router.patch('/inventory/:inventoryId/adjust', requirePrivilege(PRIVILEGES.WAREHOUSE_ADJUST), warehouseController.adjustInventory)

// Parameterized routes LAST
router.get('/:id', requirePrivilege(PRIVILEGES.WAREHOUSE_VIEW), warehouseController.getWarehouse)
router.get('/:id/inventory', requirePrivilege(PRIVILEGES.WAREHOUSE_VIEW), warehouseController.getWarehouseInventory)

export default router
