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
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'NORMAL', 'READ_ONLY']).default('NORMAL'),
  departmentIds: z.array(z.string().uuid()).default([]),
  privileges: z.array(z.object({
    privilegeKey: z.string(),
    granted: z.boolean(),
  })).default([]),
})

router.get('/', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId },
      include: {
        userDepartments: { include: { department: { select: { id: true, name: true } } } },
        privileges: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    res.json({ success: true, data: users.map(u => ({ ...u, passwordHash: undefined })) })
  } catch (err) { next(err) }
})

router.post('/', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentIds, privileges, password, ...data } = userSchema.parse(req.body)
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
      if (privileges.length) {
        await tx.userPrivilege.createMany({
          data: privileges.map(p => ({ userId: u.id, ...p })),
        })
      }
      return u
    })
    res.status(201).json({ success: true, data: { ...user, passwordHash: undefined } })
  } catch (err) { next(err) }
})

router.put('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentIds, privileges, password, ...data } = userSchema.partial().parse(req.body)
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
      if (privileges) {
        await tx.userPrivilege.deleteMany({ where: { userId: req.params.id } })
        if (privileges.length) {
          await tx.userPrivilege.createMany({
            data: privileges.map(p => ({ userId: req.params.id, ...p })),
          })
        }
      }
    })
    res.json({ success: true, data: { message: 'User updated' } })
  } catch (err) { next(err) }
})

export default router
