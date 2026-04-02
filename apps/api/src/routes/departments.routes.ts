import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.use(authenticate)

const schema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
})

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depts = await prisma.department.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { _count: { select: { userDepartments: true, resources: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: depts })
  } catch (err) { next(err) }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = schema.parse(req.body)
    const dept = await prisma.department.create({ data: { ...data, tenantId: req.user!.tenantId } })
    res.status(201).json({ success: true, data: dept })
  } catch (err) { next(err) }
})

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = schema.partial().parse(req.body)
    const dept = await prisma.department.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found')
    const updated = await prisma.department.update({ where: { id: req.params.id }, data })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

router.patch('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found')
    const updated = await prisma.department.update({ where: { id: req.params.id }, data: { isActive: !dept.isActive } })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

export default router
