import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/authorize'
import { hashPassword } from '../services/auth.service'

const router = Router()
router.use(authenticate)

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().nullish(),
  role: z.enum(['ADMIN', 'NORMAL', 'READ_ONLY']).default('NORMAL'),
  profileId: z.string().uuid().nullish(),
  departmentIds: z.array(z.string()).default([]),
  isActive: z.boolean().optional(),
  notifyTaskEmail: z.boolean().optional(),
  notifyTaskWhatsapp: z.boolean().optional(),
})

// Lightweight list of active users for assignment dropdowns — any authenticated user
router.get('/assignable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    res.json({ success: true, data: users })
  } catch (err) { next(err) }
})

router.get('/', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId },
      include: {
        userDepartments: { include: { department: { select: { id: true, name: true } } } },
        profile: { select: { id: true, name: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    res.json({ success: true, data: users.map(u => ({ ...u, passwordHash: undefined })) })
  } catch (err) { next(err) }
})

router.post('/', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentIds, password, ...data } = userSchema.parse(req.body)
    if (!password) throw new AppError(400, 'PASSWORD_REQUIRED', 'Password is required')

    const passwordHash = await hashPassword(password)
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { ...data, passwordHash, tenantId: req.user!.tenantId },
      })
      if (departmentIds.length) {
        await tx.userDepartment.createMany({
          data: departmentIds.map(dId => ({ userId: u.id, departmentId: dId })),
        })
      }
      return u
    })
    res.status(201).json({ success: true, data: { ...user, passwordHash: undefined } })
  } catch (err) { next(err) }
})

router.put('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = userSchema.partial().parse(req.body)
    const { departmentIds = [], password, ...data } = parsed
    const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')

    const updateData: any = { ...data }
    if (password) updateData.passwordHash = await hashPassword(password)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.params.id }, data: updateData })
      if (departmentIds) {
        await tx.userDepartment.deleteMany({ where: { userId: req.params.id } })
        if (departmentIds.length) {
          await tx.userDepartment.createMany({
            data: departmentIds.map(dId => ({ userId: req.params.id, departmentId: dId })),
          })
        }
      }
    })
    res.json({ success: true, data: { message: 'User updated' } })
  } catch (err) { next(err) }
})

export default router
