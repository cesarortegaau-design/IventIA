import { Router } from 'express'
import path from 'path'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { authenticate } from '../middleware/authenticate'
import { listResources, getResource, createResource, updateResource, toggleResourceActive, uploadResourceImage, deleteResourceImage } from '../controllers/resources.controller'

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'resources'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
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
