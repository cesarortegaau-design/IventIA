import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { listResources, getResource, createResource, updateResource, toggleResourceActive, uploadResourceImage, deleteResourceImage } from '../controllers/resources.controller'

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

router.get('/', listResources)
router.post('/', createResource)
router.get('/:id', getResource)
router.put('/:id', updateResource)
router.patch('/:id/toggle', toggleResourceActive)
router.post('/:id/images/:slot', upload.single('image'), uploadResourceImage)
router.delete('/:id/images/:slot', deleteResourceImage)

export default router
