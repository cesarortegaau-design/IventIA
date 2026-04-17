import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

export async function supplierPortalListOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId, tenantId } = req.supplierPortalUser!

    const userSuppliers = await prisma.supplierPortalUserSupplier.findMany({
      where: { portalUserId: supplierPortalUserId },
      select: { supplierId: true },
    })
    const supplierIds = userSuppliers.map(s => s.supplierId)
    if (supplierIds.length === 0) return res.json({ success: true, data: [] })

    const orders = await prisma.purchaseOrder.findMany({
      where: { tenantId, supplierId: { in: supplierIds }, status: { not: 'CANCELLED' } },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        lineItems: {
          include: { resource: { select: { id: true, name: true, code: true, unit: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        documents: {
          where: { isVisibleToSupplier: true },
          select: { id: true, documentType: true, fileName: true, blobKey: true, createdAt: true },
        },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
        contact: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: orders })
  } catch (err) { next(err) }
}

export async function supplierPortalGetOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId, tenantId } = req.supplierPortalUser!
    const { orderId } = req.params

    const userSuppliers = await prisma.supplierPortalUserSupplier.findMany({
      where: { portalUserId: supplierPortalUserId },
      select: { supplierId: true },
    })
    const supplierIds = userSuppliers.map(s => s.supplierId)

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, tenantId, supplierId: { in: supplierIds } },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        lineItems: {
          include: { resource: { select: { id: true, name: true, code: true, unit: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        documents: {
          where: { isVisibleToSupplier: true },
          select: { id: true, documentType: true, fileName: true, blobKey: true, createdAt: true },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        contact: { select: { id: true, name: true, email: true, phone: true } },
      },
    })
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Orden no encontrada')

    res.json({ success: true, data: order })
  } catch (err) { next(err) }
}
