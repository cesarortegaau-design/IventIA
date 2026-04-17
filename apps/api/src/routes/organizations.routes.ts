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
  clave: z.string().min(1).max(50),
  descripcion: z.string().min(1).max(300),
  datosFiscales: z.record(z.any()).optional(),
  datosDemograficos: z.record(z.any()).optional(),
})

router.get('/', requirePrivilege(PRIVILEGES.ORGANIZATION_VIEW), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { _count: { select: { departmentOrgs: true, orders: true } } },
      orderBy: { clave: 'asc' },
    })
    res.json({ success: true, data: orgs })
  } catch (err) { next(err) }
})

router.post('/', requirePrivilege(PRIVILEGES.ORGANIZATION_CREATE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body)
    const org = await prisma.organization.create({
      data: {
        tenantId: req.user!.tenantId,
        clave: data.clave,
        descripcion: data.descripcion,
        datosFiscales: data.datosFiscales ?? {},
        datosDemograficos: data.datosDemograficos ?? {},
      },
    })
    res.status(201).json({ success: true, data: org })
  } catch (err) { next(err) }
})

router.put('/:id', requirePrivilege(PRIVILEGES.ORGANIZATION_EDIT), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = schema.partial().parse(req.body)
    const org = await prisma.organization.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!org) throw new AppError(404, 'NOT_FOUND', 'Organización no encontrada')
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: {
        ...(data.clave && { clave: data.clave }),
        ...(data.descripcion && { descripcion: data.descripcion }),
        ...(data.datosFiscales !== undefined && { datosFiscales: data.datosFiscales }),
        ...(data.datosDemograficos !== undefined && { datosDemograficos: data.datosDemograficos }),
      },
    })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

router.patch('/:id/toggle', requirePrivilege(PRIVILEGES.ORGANIZATION_EDIT), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organization.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!org) throw new AppError(404, 'NOT_FOUND', 'Organización no encontrada')
    const updated = await prisma.organization.update({ where: { id: req.params.id }, data: { isActive: !org.isActive } })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

export default router
