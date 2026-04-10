import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import * as warehouseController from '../controllers/warehouse.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Warehouse CRUD
router.post('/', requirePrivilege('WAREHOUSE_VIEW'), warehouseController.createWarehouse)
router.get('/', requirePrivilege('WAREHOUSE_VIEW'), warehouseController.listWarehouses)
router.get('/:id', requirePrivilege('WAREHOUSE_VIEW'), warehouseController.getWarehouse)

// Warehouse inventory
router.get('/:id/inventory', requirePrivilege('WAREHOUSE_VIEW'), warehouseController.getWarehouseInventory)

// Resource inventory
router.post('/inventory', requirePrivilege('WAREHOUSE_VIEW'), warehouseController.initializeResourceInventory)
router.get('/inventory/:inventoryId', requirePrivilege('WAREHOUSE_VIEW'), warehouseController.getResourceInventory)
router.patch('/inventory/:inventoryId/adjust', requirePrivilege('WAREHOUSE_ADJUST'), warehouseController.adjustInventory)

// Reception & movements
router.post('/reception', requirePrivilege('WAREHOUSE_RECEIVE'), warehouseController.registerReception)
router.get('/movements', requirePrivilege('WAREHOUSE_VIEW'), warehouseController.getInventoryMovements)

export default router
