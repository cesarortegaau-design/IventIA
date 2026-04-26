import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  listClients, getClient, createClient, updateClient, toggleClientActive,
  listPortalUsers, linkPortalUser,
  addClientRelation, updateClientRelation, deleteClientRelation,
  getPortalUser, updatePortalUser, resetPortalUserPassword,
  addPortalUserClient, removePortalUserClient,
  listSupplierPortalUsers, getSupplierPortalUser, updateSupplierPortalUser, resetSupplierPortalUserPassword,
  importClients,
} from '../controllers/clients.controller'
import { uploadClientDocument, deleteClientDocument, uploadClientLogo } from '../controllers/documents.controller'

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

const router = Router()

router.use(authenticate)

router.get('/', requirePrivilege(PRIVILEGES.CLIENT_VIEW), listClients)
router.post('/', requirePrivilege(PRIVILEGES.CLIENT_CREATE), createClient)
router.get('/portal-users', requirePrivilege(PRIVILEGES.PORTAL_USER_VIEW), listPortalUsers)
router.get('/:id', requirePrivilege(PRIVILEGES.CLIENT_VIEW), getClient)
router.put('/:id', requirePrivilege(PRIVILEGES.CLIENT_EDIT), updateClient)
router.patch('/:id/toggle', requirePrivilege(PRIVILEGES.CLIENT_EDIT), toggleClientActive)
router.patch('/:id/link-portal-user', requirePrivilege(PRIVILEGES.CLIENT_EDIT), linkPortalUser)

// Client Relations
router.post('/:id/relations', requirePrivilege(PRIVILEGES.CLIENT_EDIT), addClientRelation)
router.patch('/:id/relations/:relationId', requirePrivilege(PRIVILEGES.CLIENT_EDIT), updateClientRelation)
router.delete('/:id/relations/:relationId', requirePrivilege(PRIVILEGES.CLIENT_EDIT), deleteClientRelation)

// Portal Users Management
router.get('/portal-users/:portalUserId', requirePrivilege(PRIVILEGES.PORTAL_USER_VIEW), getPortalUser)
router.patch('/portal-users/:portalUserId', requirePrivilege(PRIVILEGES.PORTAL_USER_EDIT), updatePortalUser)
router.post('/portal-users/:portalUserId/reset-password', requirePrivilege(PRIVILEGES.PORTAL_USER_EDIT), resetPortalUserPassword)
router.post('/portal-users/:portalUserId/clients', requirePrivilege(PRIVILEGES.PORTAL_USER_EDIT), addPortalUserClient)
router.delete('/portal-users/:portalUserId/clients/:clientId', requirePrivilege(PRIVILEGES.PORTAL_USER_EDIT), removePortalUserClient)

// Supplier Portal Users Management (Admin)
router.get('/supplier-portal-users', requirePrivilege(PRIVILEGES.SUPPLIER_VIEW), listSupplierPortalUsers)
router.get('/supplier-portal-users/:supplierPortalUserId', requirePrivilege(PRIVILEGES.SUPPLIER_VIEW), getSupplierPortalUser)
router.patch('/supplier-portal-users/:supplierPortalUserId', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), updateSupplierPortalUser)
router.post('/supplier-portal-users/:supplierPortalUserId/reset-password', requirePrivilege(PRIVILEGES.SUPPLIER_EDIT), resetSupplierPortalUserPassword)

// Import
router.post('/import', requirePrivilege(PRIVILEGES.CLIENT_CREATE), importClients)

// Logo
router.post('/:id/logo', requirePrivilege(PRIVILEGES.CLIENT_EDIT), docUpload.single('file'), uploadClientLogo)

// Documents
router.post('/:id/documents', requirePrivilege(PRIVILEGES.CLIENT_EDIT), docUpload.single('file'), uploadClientDocument)
router.delete('/:id/documents/:docId', requirePrivilege(PRIVILEGES.CLIENT_EDIT), deleteClientDocument)

export default router
