import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

const clientSchema = z.object({
  personType: z.enum(['PHYSICAL', 'MORAL']),
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  rfc: z.string().optional(),
  taxRegime: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  addressCountry: z.string().default('MX'),
})

export async function listClients(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, active, page = '1', pageSize = '20' } = req.query as Record<string, string>
    const tenantId = req.user!.tenantId
    const where: any = { tenantId }
    if (active !== undefined) where.isActive = active === 'true'
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { rfc: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    const p = parseInt(page), ps = parseInt(pageSize)
    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: [{ companyName: 'asc' }, { lastName: 'asc' }],
        include: { contacts: { where: { isActive: true, isPrimary: true } } },
      }),
    ])
    res.json({ success: true, data: clients, meta: { total, page: p, pageSize: ps } })
  } catch (err) {
    next(err)
  }
}

export async function getClient(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { contacts: true, documents: true },
    })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')
    res.json({ success: true, data: client })
  } catch (err) {
    next(err)
  }
}

export async function createClient(req: Request, res: Response, next: NextFunction) {
  try {
    const data = clientSchema.parse(req.body)
    const tenantId = req.user!.tenantId
    const client = await prisma.client.create({
      data: { ...data, tenantId },
    })

    await auditService.log(tenantId, req.user!.userId, 'Client', client.id, 'CREATE', null, {
      personType: client.personType,
      companyName: client.companyName,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      rfc: client.rfc,
    }, req?.ip)

    res.status(201).json({ success: true, data: client })
  } catch (err) {
    next(err)
  }
}

export async function updateClient(req: Request, res: Response, next: NextFunction) {
  try {
    const data = clientSchema.partial().parse(req.body)
    const tenantId = req.user!.tenantId
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId },
    })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')
    const updated = await prisma.client.update({ where: { id: req.params.id }, data })

    const oldValues: any = {
      personType: client.personType,
      companyName: client.companyName,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      rfc: client.rfc,
    }
    const newValues: any = {
      personType: updated.personType,
      companyName: updated.companyName,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      rfc: updated.rfc,
    }

    await auditService.log(tenantId, req.user!.userId, 'Client', req.params.id, 'UPDATE', oldValues, newValues, req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function listPortalUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const portalUsers = await prisma.portalUser.findMany({
      where: { tenantId },
      select: {
        id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true,
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: portalUsers })
  } catch (err) {
    next(err)
  }
}

export async function linkPortalUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId } = req.body as { portalUserId: string | null }
    const tenantId = req.user!.tenantId

    const client = await prisma.client.findFirst({ where: { id: req.params.id, tenantId } })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')

    if (portalUserId) {
      const portalUser = await prisma.portalUser.findFirst({
        where: { id: portalUserId, tenantId },
        include: { client: { select: { id: true } } },
      })
      if (!portalUser) throw new AppError(404, 'PORTAL_USER_NOT_FOUND', 'Usuario de portal no encontrado')
      if (portalUser.client && portalUser.client.id !== client.id) {
        throw new AppError(400, 'ALREADY_LINKED', 'Este usuario ya está vinculado a otro cliente')
      }
    }

    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: { portalUserId: portalUserId ?? null },
      include: { portalUser: { select: { id: true, email: true, firstName: true, lastName: true } } },
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function toggleClientActive(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')
    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: { isActive: !client.isActive },
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
