import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listTemplates,
  uploadTemplate,
  deleteTemplate,
  generateDocument,
  getAvailableLabels,
} from '../controllers/templates.controller'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

const GENERATED_DIR = path.resolve(__dirname, '../../uploads/generated')

const router = Router()

router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.TEMPLATE_VIEW), listTemplates)
router.post('/', requirePrivilege(PRIVILEGES.TEMPLATE_CREATE), upload.single('file'), uploadTemplate)
router.get('/labels/:context', requirePrivilege(PRIVILEGES.TEMPLATE_VIEW), getAvailableLabels)
router.get('/download/:key', requirePrivilege(PRIVILEGES.TEMPLATE_VIEW), (req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = path.join(GENERATED_DIR, req.params.key)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' })
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(req.params.key)}"`)
    res.send(fs.readFileSync(filePath))
  } catch (err) { next(err) }
})
router.delete('/:id', requirePrivilege(PRIVILEGES.TEMPLATE_DELETE), deleteTemplate)
router.post('/:id/generate', requirePrivilege(PRIVILEGES.TEMPLATE_VIEW), generateDocument)

export default router
