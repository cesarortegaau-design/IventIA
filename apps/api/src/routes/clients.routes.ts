import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { listClients, getClient, createClient, updateClient, toggleClientActive, listPortalUsers, linkPortalUser } from '../controllers/clients.controller'

const router = Router()

router.use(authenticate)

router.get('/', listClients)
router.post('/', createClient)
router.get('/portal-users', listPortalUsers)
router.get('/:id', getClient)
router.put('/:id', updateClient)
router.patch('/:id/toggle', toggleClientActive)
router.patch('/:id/link-portal-user', linkPortalUser)

export default router
