import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/authorize'

const router = Router()
router.use(authenticate)

// List all profiles for this tenant
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { privileges: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: profiles })
  } catch (err) { next(err) }
})

// Get single profile
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.profile.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { privileges: true },
    })
    if (!profile) throw new AppError(404, 'NOT_FOUND', 'Perfil no encontrado')
    res.json({ success: true, data: profile })
  } catch (err) { next(err) }
})

const profileSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  privileges: z.array(z.string()).default([]),
})

// Create profile
router.post('/', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, privileges } = profileSchema.parse(req.body)
    const profile = await prisma.$transaction(async (tx) => {
      const p = await tx.profile.create({
        data: { tenantId: req.user!.tenantId, name, description },
      })
      if (privileges.length) {
        await tx.profilePrivilege.createMany({
          data: privileges.map(key => ({ profileId: p.id, privilegeKey: key })),
        })
      }
      return tx.profile.findUnique({ where: { id: p.id }, include: { privileges: true } })
    })
    res.status(201).json({ success: true, data: profile })
  } catch (err) { next(err) }
})

// Update profile
router.put('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, privileges } = profileSchema.parse(req.body)
    const existing = await prisma.profile.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Perfil no encontrado')

    const profile = await prisma.$transaction(async (tx) => {
      await tx.profile.update({ where: { id: req.params.id }, data: { name, description } })
      await tx.profilePrivilege.deleteMany({ where: { profileId: req.params.id } })
      if (privileges.length) {
        await tx.profilePrivilege.createMany({
          data: privileges.map(key => ({ profileId: req.params.id, privilegeKey: key })),
        })
      }
      return tx.profile.findUnique({ where: { id: req.params.id }, include: { privileges: true, _count: { select: { users: true } } } })
    })
    res.json({ success: true, data: profile })
  } catch (err) { next(err) }
})

// Delete profile (only if no users assigned)
router.delete('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.profile.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { _count: { select: { users: true } } },
    })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Perfil no encontrado')
    if (existing._count.users > 0) {
      throw new AppError(400, 'PROFILE_IN_USE', `Este perfil está asignado a ${existing._count.users} usuario(s). Reasígnalos antes de eliminarlo.`)
    }
    await prisma.profile.delete({ where: { id: req.params.id } })
    res.json({ success: true, data: { message: 'Perfil eliminado' } })
  } catch (err) { next(err) }
})

export default router
