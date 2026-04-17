import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'

const router = Router()
router.use(authenticate)

const schema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
})

router.get('/', requirePrivilege(PRIVILEGES.DEPARTMENT_VIEW), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depts = await prisma.department.findMany({
      where: { tenantId: req.user!.tenantId },
      include: {
        _count: { select: { userDepartments: true, resources: true } },
        departmentOrgs: { include: { organization: { select: { id: true, clave: true, descripcion: true } } } },
      },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: depts })
  } catch (err) { next(err) }
})

router.post('/', requirePrivilege(PRIVILEGES.DEPARTMENT_CREATE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body)
    const dept = await prisma.department.create({
      data: {
        name: data.name,
        type: data.type,
        tenant: { connect: { id: req.user!.tenantId } },
      },
    })
    res.status(201).json({ success: true, data: dept })
  } catch (err) { next(err) }
})

router.put('/:id', requirePrivilege(PRIVILEGES.DEPARTMENT_EDIT), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = schema.partial().parse(req.body)
    const dept = await prisma.department.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found')
    const updated = await prisma.department.update({ where: { id: req.params.id }, data })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

router.patch('/:id/toggle', requirePrivilege(PRIVILEGES.DEPARTMENT_EDIT), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found')
    const updated = await prisma.department.update({ where: { id: req.params.id }, data: { isActive: !dept.isActive } })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

// Replace all organization links for a department
router.put('/:id/organizations', requirePrivilege(PRIVILEGES.DEPARTMENT_EDIT), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationIds } = z.object({ organizationIds: z.array(z.string().uuid()).min(1, 'Se requiere al menos una organización') }).parse(req.body)
    const dept = await prisma.department.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found')

    // Verify all orgs belong to same tenant
    const orgs = await prisma.organization.findMany({ where: { id: { in: organizationIds }, tenantId: req.user!.tenantId } })
    if (orgs.length !== organizationIds.length) throw new AppError(400, 'INVALID_ORGS', 'Una o más organizaciones no son válidas')

    await prisma.$transaction([
      prisma.departmentOrganization.deleteMany({ where: { departmentId: req.params.id } }),
      prisma.departmentOrganization.createMany({ data: organizationIds.map(organizationId => ({ departmentId: req.params.id, organizationId })) }),
    ])

    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
