import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { listClients, getClient, createClient, updateClient, toggleClientActive, listPortalUsers, linkPortalUser } from '../controllers/clients.controller'
import { uploadClientDocument, deleteClientDocument } from '../controllers/documents.controller'

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

const router = Router()

router.use(authenticate)

router.get('/', listClients)
router.post('/', createClient)
router.get('/portal-users', listPortalUsers)
router.get('/:id', getClient)
router.put('/:id', updateClient)
router.patch('/:id/toggle', toggleClientActive)
router.patch('/:id/link-portal-user', linkPortalUser)

// Documents
router.post('/:id/documents', docUpload.single('file'), uploadClientDocument)
router.delete('/:id/documents/:docId', deleteClientDocument)

export default router
