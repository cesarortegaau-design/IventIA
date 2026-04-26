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
  logoUrl: z.string().url().optional().nullable(),
  isTeam: z.boolean().optional(),
}).strip()

export async function listClients(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, active, isTeam, page = '1', pageSize = '20' } = req.query as Record<string, string>
    const tenantId = req.user!.tenantId
    const where: any = { tenantId }
    if (active !== undefined) where.isActive = active === 'true'
    if (isTeam !== undefined) where.isTeam = isTeam === 'true'
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
      include: {
        contacts: true,
        documents: true,
        relationsFrom: {
          include: { relatedClient: { select: { id: true, companyName: true, firstName: true, lastName: true, personType: true } } },
        },
        relationsTo: {
          include: { client: { select: { id: true, companyName: true, firstName: true, lastName: true, personType: true } } },
        },
      },
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

// ── Client Relations ──────────────────────────────────────────────────────────

const relationSchema = z.object({
  relatedClientId: z.string().uuid(),
  relationType: z.enum(['BILLING', 'SUBSIDIARY', 'PARTNER', 'PARENT', 'JUGADOR', 'OTHER']),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
}).strip()

export async function addClientRelation(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const clientId = req.params.id
    const data = relationSchema.parse(req.body)

    const [client, relatedClient] = await Promise.all([
      prisma.client.findFirst({ where: { id: clientId, tenantId } }),
      prisma.client.findFirst({ where: { id: data.relatedClientId, tenantId } }),
    ])
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Cliente no encontrado')
    if (!relatedClient) throw new AppError(404, 'RELATED_CLIENT_NOT_FOUND', 'Cliente relacionado no encontrado')
    if (clientId === data.relatedClientId) throw new AppError(400, 'SELF_RELATION', 'No se puede relacionar un cliente consigo mismo')

    const relation = await prisma.clientRelation.create({
      data: { tenantId, clientId, ...data },
      include: { relatedClient: { select: { id: true, companyName: true, firstName: true, lastName: true, personType: true } } },
    })
    res.status(201).json({ success: true, data: relation })
  } catch (err) {
    next(err)
  }
}

export async function updateClientRelation(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { relationId } = req.params
    const data = z.object({ relationType: z.string().optional(), notes: z.string().optional(), isActive: z.boolean().optional() }).parse(req.body)

    const relation = await prisma.clientRelation.findFirst({ where: { id: relationId, tenantId } })
    if (!relation) throw new AppError(404, 'RELATION_NOT_FOUND', 'Relación no encontrada')

    const updated = await prisma.clientRelation.update({
      where: { id: relationId },
      data,
      include: { relatedClient: { select: { id: true, companyName: true, firstName: true, lastName: true, personType: true } } },
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteClientRelation(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { relationId } = req.params

    const relation = await prisma.clientRelation.findFirst({ where: { id: relationId, tenantId } })
    if (!relation) throw new AppError(404, 'RELATION_NOT_FOUND', 'Relación no encontrada')

    await prisma.clientRelation.delete({ where: { id: relationId } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ── Portal Users Management ──────────────────────────────────────────────────

export async function getPortalUser(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const portalUser = await prisma.portalUser.findFirst({
      where: { id: req.params.portalUserId, tenantId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        isActive: true, createdAt: true, updatedAt: true,
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        clients: {
          include: { client: { select: { id: true, companyName: true, firstName: true, lastName: true, personType: true } } },
        },
        events: {
          include: { event: { select: { id: true, code: true, name: true, status: true } } },
        },
      },
    })
    if (!portalUser) throw new AppError(404, 'PORTAL_USER_NOT_FOUND', 'Usuario de portal no encontrado')
    res.json({ success: true, data: portalUser })
  } catch (err) {
    next(err)
  }
}

export async function updatePortalUser(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const data = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)

    const portalUser = await prisma.portalUser.findFirst({ where: { id: req.params.portalUserId, tenantId } })
    if (!portalUser) throw new AppError(404, 'PORTAL_USER_NOT_FOUND', 'Usuario de portal no encontrado')

    const updated = await prisma.portalUser.update({ where: { id: req.params.portalUserId }, data })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function resetPortalUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { password } = z.object({ password: z.string().min(6) }).parse(req.body)
    const bcrypt = await import('bcryptjs')

    const portalUser = await prisma.portalUser.findFirst({ where: { id: req.params.portalUserId, tenantId } })
    if (!portalUser) throw new AppError(404, 'PORTAL_USER_NOT_FOUND', 'Usuario de portal no encontrado')

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.portalUser.update({ where: { id: req.params.portalUserId }, data: { passwordHash } })
    res.json({ success: true, message: 'Contraseña actualizada' })
  } catch (err) {
    next(err)
  }
}

export async function addPortalUserClient(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(req.body)

    const [portalUser, client] = await Promise.all([
      prisma.portalUser.findFirst({ where: { id: req.params.portalUserId, tenantId } }),
      prisma.client.findFirst({ where: { id: clientId, tenantId } }),
    ])
    if (!portalUser) throw new AppError(404, 'PORTAL_USER_NOT_FOUND', 'Usuario de portal no encontrado')
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Cliente no encontrado')

    const link = await prisma.portalUserClient.create({
      data: { portalUserId: req.params.portalUserId, clientId },
      include: { client: { select: { id: true, companyName: true, firstName: true, lastName: true, personType: true } } },
    })
    res.status(201).json({ success: true, data: link })
  } catch (err) {
    next(err)
  }
}

export async function removePortalUserClient(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { portalUserId, clientId } = req.params

    const portalUser = await prisma.portalUser.findFirst({ where: { id: portalUserId, tenantId } })
    if (!portalUser) throw new AppError(404, 'PORTAL_USER_NOT_FOUND', 'Usuario de portal no encontrado')

    await prisma.portalUserClient.deleteMany({ where: { portalUserId, clientId } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ── Supplier Portal Users Management (Admin) ─────────────────────────────────

export async function listSupplierPortalUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const users = await prisma.supplierPortalUser.findMany({
      where: { tenantId },
      select: {
        id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true,
        suppliers: {
          select: { supplier: { select: { id: true, name: true, code: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: users })
  } catch (err) {
    next(err)
  }
}

export async function getSupplierPortalUser(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const user = await prisma.supplierPortalUser.findFirst({
      where: { id: req.params.supplierPortalUserId, tenantId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        isActive: true, createdAt: true, updatedAt: true,
        suppliers: {
          include: { supplier: { select: { id: true, name: true, code: true, type: true } } },
        },
      },
    })
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

export async function updateSupplierPortalUser(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const data = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)

    const user = await prisma.supplierPortalUser.findFirst({ where: { id: req.params.supplierPortalUserId, tenantId } })
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')

    const updated = await prisma.supplierPortalUser.update({ where: { id: req.params.supplierPortalUserId }, data })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function resetSupplierPortalUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { password } = z.object({ password: z.string().min(6) }).parse(req.body)
    const bcrypt = await import('bcryptjs')

    const user = await prisma.supplierPortalUser.findFirst({ where: { id: req.params.supplierPortalUserId, tenantId } })
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.supplierPortalUser.update({ where: { id: req.params.supplierPortalUserId }, data: { passwordHash } })
    res.json({ success: true, message: 'Contraseña actualizada' })
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

// ── Client Import ──────────────────────────────────────────────────────────────

const importRowSchema = z.object({
  tipo: z.string().min(1).transform(v => {
    const n = v.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return (n === 'moral' || n === 'empresa') ? 'MORAL' : 'PHYSICAL'
  }),
  nombre: z.string().min(1).max(300),
  rfc: z.string().optional().transform(v => (v && v.trim()) || undefined),
  email: z.string().optional().transform(v => (v && v.trim()) || undefined),
  telefono: z.string().optional().transform(v => (v && v.trim()) || undefined),
  equipo: z.string().optional().transform(v => v === '1' || v?.toLowerCase() === 'sí' || v?.toLowerCase() === 'si' || v?.toLowerCase() === 'true'),
}).passthrough()

export async function importClients(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const rows = z.array(importRowSchema).parse(req.body)

    let created = 0
    let updated = 0

    for (const row of rows) {
      const isTeam = row.equipo ?? false
      const personType = row.tipo
      const companyName = personType === 'MORAL' ? row.nombre : undefined
      const firstName = personType === 'PHYSICAL' ? row.nombre.split(' ')[0] : undefined
      const lastName = personType === 'PHYSICAL' ? row.nombre.split(' ').slice(1).join(' ') || undefined : undefined

      const existing = row.rfc
        ? await prisma.client.findFirst({ where: { tenantId, rfc: row.rfc } })
        : null

      if (existing) {
        await prisma.client.update({
          where: { id: existing.id },
          data: { companyName, firstName, lastName, email: row.email, phone: row.telefono, isTeam },
        })
        updated++
      } else {
        await prisma.client.create({
          data: {
            tenantId, personType, companyName, firstName, lastName,
            rfc: row.rfc || undefined,
            email: row.email,
            phone: row.telefono,
            isTeam,
          },
        })
        created++
      }
    }

    res.json({ success: true, data: { created, updated, total: rows.length } })
  } catch (err) {
    next(err)
  }
}
