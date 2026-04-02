import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { listResources, getResource, createResource, updateResource, toggleResourceActive } from '../controllers/resources.controller'

const router = Router()

router.use(authenticate)

router.get('/', listResources)
router.post('/', createResource)
router.get('/:id', getResource)
router.put('/:id', updateResource)
router.patch('/:id/toggle', toggleResourceActive)

export default router
