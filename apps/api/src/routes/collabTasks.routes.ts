import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listCollabTasks,
  createCollabTask,
  getCollabTask,
  updateCollabTask,
  deleteCollabTask,
  listCollabTaskComments,
  addCollabTaskComment,
  deleteCollabTaskComment,
} from '../controllers/collabTasks.controller'
import {
  listCollabTaskDocuments,
  uploadCollabTaskDocument,
  deleteCollabTaskDocument,
} from '../controllers/collabTaskDocuments.controller'

const router = Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
})

// All routes require authentication
router.use(authenticate)

// ─────────────────────────────────────────────────────────────────────────────
// Task CRUD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', requirePrivilege(PRIVILEGES.COLLAB_TASK_VIEW), listCollabTasks)
router.post('/', requirePrivilege(PRIVILEGES.COLLAB_TASK_CREATE), createCollabTask)
router.get('/:taskId', requirePrivilege(PRIVILEGES.COLLAB_TASK_VIEW), getCollabTask)
router.put('/:taskId', requirePrivilege(PRIVILEGES.COLLAB_TASK_EDIT), updateCollabTask)
router.delete('/:taskId', requirePrivilege(PRIVILEGES.COLLAB_TASK_DELETE), deleteCollabTask)

// ─────────────────────────────────────────────────────────────────────────────
// Documents (nested under task)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:taskId/documents', requirePrivilege(PRIVILEGES.COLLAB_TASK_VIEW), listCollabTaskDocuments)
router.post(
  '/:taskId/documents',
  requirePrivilege(PRIVILEGES.COLLAB_TASK_EDIT),
  upload.single('file'),
  uploadCollabTaskDocument
)
router.delete(
  '/:taskId/documents/:docId',
  requirePrivilege(PRIVILEGES.COLLAB_TASK_EDIT),
  deleteCollabTaskDocument
)

// ─────────────────────────────────────────────────────────────────────────────
// Comments (nested under task)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:taskId/comments', requirePrivilege(PRIVILEGES.COLLAB_TASK_VIEW), listCollabTaskComments)
router.post('/:taskId/comments', requirePrivilege(PRIVILEGES.COLLAB_TASK_VIEW), addCollabTaskComment)
router.delete(
  '/:taskId/comments/:commentId',
  requirePrivilege(PRIVILEGES.COLLAB_TASK_EDIT),
  deleteCollabTaskComment
)

export default router
