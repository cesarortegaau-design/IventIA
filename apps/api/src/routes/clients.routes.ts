import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { listClients, getClient, createClient, updateClient, toggleClientActive } from '../controllers/clients.controller'

const router = Router()

router.use(authenticate)

router.get('/', listClients)
router.post('/', createClient)
router.get('/:id', getClient)
router.put('/:id', updateClient)
router.patch('/:id/toggle', toggleClientActive)

export default router
