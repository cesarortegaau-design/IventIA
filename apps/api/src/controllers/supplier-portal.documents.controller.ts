import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary } from '../lib/storage'

// List all documents for the supplier (both admin-uploaded and supplier-uploaded)
export async function supplierPortalListDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId, tenantId } = req.supplierPortalUser!

    const userSuppliers = await prisma.supplierPortalUserSupplier.findMany({
      where: { portalUserId: supplierPortalUserId },
      select: { supplierId: true },
    })
    const supplierIds = userSuppliers.map(s => s.supplierId)
    if (supplierIds.length === 0) return res.json({ success: true, data: [] })

    const documents = await prisma.supplierDocument.findMany({
      where: { tenantId, supplierId: { in: supplierIds } },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: documents })
  } catch (err) { next(err) }
}

// Supplier uploads their own document
export async function supplierPortalUploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId, tenantId } = req.supplierPortalUser!

    const userSupplier = await prisma.supplierPortalUserSupplier.findFirst({
      where: { portalUserId: supplierPortalUserId },
    })
    if (!userSupplier) throw new AppError(403, 'FORBIDDEN', 'Sin proveedor vinculado')

    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió archivo')

    const { url: fileUrl } = await uploadToCloudinary(req.file.buffer, 'iventia/supplier-docs', 'auto')

    const doc = await prisma.supplierDocument.create({
      data: {
        tenantId,
        supplierId: userSupplier.supplierId,
        uploaderType: 'SUPPLIER',
        uploadedById: supplierPortalUserId,
        name: req.body.name || req.file.originalname,
        fileUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
    })

    res.status(201).json({ success: true, data: doc })
  } catch (err) { next(err) }
}

// Delete a document uploaded by the supplier (only own documents)
export async function supplierPortalDeleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId } = req.supplierPortalUser!
    const { docId } = req.params

    const doc = await prisma.supplierDocument.findFirst({
      where: { id: docId, uploaderType: 'SUPPLIER', uploadedById: supplierPortalUserId },
    })
    if (!doc) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado')

    await prisma.supplierDocument.delete({ where: { id: docId } })
    res.json({ success: true })
  } catch (err) { next(err) }
}
