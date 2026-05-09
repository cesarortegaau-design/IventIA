import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listActivityDocuments,
  uploadActivityDocument,
  deleteActivityDocument,
} from '../controllers/activityDocuments.controller'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const router = Router({ mergeParams: true })
router.use(authenticate)

router.get('/',          requirePrivilege(PRIVILEGES.EVENT_TIMELINE_VIEW), listActivityDocuments)
router.post('/',         requirePrivilege(PRIVILEGES.EVENT_TIMELINE_EDIT), upload.single('file'), uploadActivityDocument)
router.delete('/:docId', requirePrivilege(PRIVILEGES.EVENT_TIMELINE_EDIT), deleteActivityDocument)

export default router
