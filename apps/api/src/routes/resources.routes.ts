import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listResources,
  getResource,
  createResource,
  updateResource,
  toggleResourceActive,
  uploadResourceImage,
  deleteResourceImage,
  generateResourceDescription,
  searchResourceImages,
  importResourceImageFromUrl,
  getPackageComponents,
  addPackageComponent,
  removePackageComponent,
  updatePackageComponent,
  exportResourcesCsv,
  importResourcesCsv,
  exportPackageComponentsCsv,
  importPackageComponentsCsv,
} from '../controllers/resources.controller'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Solo se permiten imágenes'))
  },
})

const router = Router()

router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.RESOURCE_VIEW), listResources)
router.post('/', requirePrivilege(PRIVILEGES.RESOURCE_CREATE), createResource)
router.get('/export-csv', requirePrivilege(PRIVILEGES.RESOURCE_VIEW), exportResourcesCsv)
router.post('/import-csv', requirePrivilege(PRIVILEGES.RESOURCE_CREATE), importResourcesCsv)
router.get('/search-images', requirePrivilege(PRIVILEGES.RESOURCE_VIEW), searchResourceImages)
router.get('/:id', requirePrivilege(PRIVILEGES.RESOURCE_VIEW), getResource)
router.put('/:id', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), updateResource)
router.patch('/:id/toggle', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), toggleResourceActive)
router.post('/:id/images/:slot', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), upload.single('image'), uploadResourceImage)
router.delete('/:id/images/:slot', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), deleteResourceImage)
router.post('/:id/images/:slot/import-url', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), importResourceImageFromUrl)
router.post('/:id/generate-description', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), generateResourceDescription)

// Package Components
router.get('/:id/package-components', requirePrivilege(PRIVILEGES.RESOURCE_VIEW), getPackageComponents)
router.post('/:id/package-components', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), addPackageComponent)
router.put('/:id/package-components/:componentId', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), updatePackageComponent)
router.delete('/:id/package-components/:componentId', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), removePackageComponent)
router.get('/:id/package-components/export-csv', requirePrivilege(PRIVILEGES.RESOURCE_VIEW), exportPackageComponentsCsv)
router.post('/:id/package-components/import-csv', requirePrivilege(PRIVILEGES.RESOURCE_EDIT), importPackageComponentsCsv)

export default router
