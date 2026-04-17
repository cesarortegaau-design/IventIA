import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { CONTEXT_MAPPINGS, CONTEXT_TABLE_MAPPINGS } from '../lib/templateMappings'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import path from 'path'
import fs from 'fs'

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/templates')
const GENERATED_DIR = path.resolve(__dirname, '../../uploads/generated')

// Ensure upload directories exist
for (const dir of [UPLOADS_DIR, GENERATED_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// ─── Extract placeholders from docx ────────────────────────────────────────────

function extractPlaceholders(buffer: Buffer): string[] {
  try {
    const zip = new PizZip(buffer)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    const text = doc.getFullText()
    const regex = /\*\[([^\]]+)\]/g
    const placeholders: string[] = []
    let match
    while ((match = regex.exec(text)) !== null) {
      const label = match[1]
      // Skip loop control tags like #Detalle, /Detalle
      if (label.startsWith('#') || label.startsWith('/')) continue
      if (!placeholders.includes(label)) {
        placeholders.push(label)
      }
    }
    return placeholders
  } catch (err) {
    console.error('Error extracting placeholders:', err)
    return []
  }
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function list(tenantId: string, params: { context?: string }) {
  const where: any = { tenantId }
  if (params.context) where.context = params.context

  return prisma.documentTemplate.findMany({
    where,
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getById(id: string, tenantId: string) {
  const template = await prisma.documentTemplate.findFirst({ where: { id, tenantId } })
  if (!template) throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Plantilla no encontrada')
  return template
}

export async function upload(
  tenantId: string,
  userId: string,
  input: { name: string; description?: string; context: string },
  file: Buffer,
  fileName: string,
) {
  // Extract placeholders from the docx
  const placeholders = extractPlaceholders(file)

  const uniqueName = `${Date.now()}_${fileName}`

  // Also save to disk as fallback (ignored in production if ephemeral)
  try {
    const filePath = path.join(UPLOADS_DIR, uniqueName)
    fs.writeFileSync(filePath, file)
  } catch (_) { /* ignore disk write errors */ }

  return prisma.documentTemplate.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      context: input.context as any,
      fileName,
      blobKey: uniqueName,
      placeholders: placeholders,
      createdById: userId,
      fileContent: file,
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  })
}

export async function deleteTemplate(id: string, tenantId: string) {
  const template = await prisma.documentTemplate.findFirst({ where: { id, tenantId } })
  if (!template) throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Plantilla no encontrada')

  // Delete file from disk
  const filePath = path.join(UPLOADS_DIR, template.blobKey)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  await prisma.documentTemplate.delete({ where: { id } })
}

// ─── Generate document ─────────────────────────────────────────────────────────

async function loadEntity(context: string, entityId: string, tenantId: string) {
  switch (context) {
    case 'EVENT': {
      const event = await prisma.event.findFirst({
        where: { id: entityId, tenantId },
        include: {
          primaryClient: true,
          spaces: { include: { resource: true } },
          orders: {
            include: {
              client: true,
              billingClient: true,
              stand: true,
              priceList: true,
              lineItems: { include: { resource: true }, orderBy: { sortOrder: 'asc' } },
              contract: {
                include: {
                  scheduledPayments: { orderBy: { dueDate: 'asc' }, include: { payments: true } },
                },
              },
            },
          },
        },
      })
      if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento no encontrado')
      // Flatten unique contracts from orders for payment schedule access
      const contractMap = new Map<string, any>()
      for (const o of (event as any).orders || []) {
        if (o.contract && !contractMap.has(o.contract.id)) {
          contractMap.set(o.contract.id, o.contract)
        }
      }
      ;(event as any).contracts = Array.from(contractMap.values())
      return event
    }
    case 'ORDER': {
      const order = await prisma.order.findFirst({
        where: { id: entityId, tenantId },
        include: {
          client: true,
          billingClient: true,
          event: true,
          stand: true,
          priceList: true,
          lineItems: { include: { resource: true }, orderBy: { sortOrder: 'asc' } },
        },
      })
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Orden no encontrada')
      return order
    }
    case 'CONTRACT': {
      const contract = await prisma.contract.findFirst({
        where: { id: entityId, tenantId },
        include: {
          client: true,
          orders: {
            include: {
              client: true,
              billingClient: true,
              event: { select: { id: true, name: true, code: true } },
              stand: true,
              priceList: true,
              lineItems: { include: { resource: true }, orderBy: { sortOrder: 'asc' } },
            },
          },
          scheduledPayments: { orderBy: { dueDate: 'asc' }, include: { payments: true } },
        },
      })
      if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')
      return contract
    }
    default:
      throw new AppError(400, 'INVALID_CONTEXT', 'Contexto inválido')
  }
}

export async function generate(
  templateId: string,
  tenantId: string,
  entityId: string,
  userId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const template = await prisma.documentTemplate.findFirst({ where: { id: templateId, tenantId } })
  if (!template) throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Plantilla no encontrada')

  // Read the original docx — prefer DB content, fall back to disk
  let originalBuffer: Buffer
  if (template.fileContent) {
    originalBuffer = Buffer.from(template.fileContent)
  } else {
    const filePath = path.join(UPLOADS_DIR, template.blobKey)
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'TEMPLATE_FILE_MISSING', 'Archivo de plantilla no encontrado en disco')
    }
    originalBuffer = fs.readFileSync(filePath)
  }

  // Load entity data
  const entity = await loadEntity(template.context, entityId, tenantId)

  // Get mappings for this context
  const mappings = CONTEXT_MAPPINGS[template.context]
  if (!mappings) throw new AppError(400, 'INVALID_CONTEXT', 'Sin mapeo para este contexto')

  // Use docxtemplater with custom delimiters *[ and ] for proper XML handling
  const zip = new PizZip(originalBuffer)
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '*[', end: ']' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })

  // Build data object with scalar values
  const data: Record<string, any> = {}
  for (const [label, resolver] of Object.entries(mappings)) {
    data[label] = resolver(entity)
  }

  // Add table/loop data (arrays of objects for *[#Section]...*[/Section])
  const tableMappings = CONTEXT_TABLE_MAPPINGS[template.context]
  if (tableMappings) {
    for (const [sectionName, tableMapping] of Object.entries(tableMappings)) {
      data[sectionName] = tableMapping.resolver(entity)
    }
  }

  doc.render(data)

  const outputBuffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  const baseName = template.fileName.replace(/\.docx$/i, '')
  const outputName = `${baseName}_generado.docx`

  // Save generated file to disk
  const generatedKey = `${Date.now()}_${outputName}`
  const generatedPath = path.join(GENERATED_DIR, generatedKey)
  fs.writeFileSync(generatedPath, outputBuffer)

  // Create a document record linked to the entity
  await saveDocumentRecord(template.context, entityId, userId, outputName, generatedKey)

  return { buffer: outputBuffer, fileName: outputName }
}

async function saveDocumentRecord(
  context: string, entityId: string, userId: string, fileName: string, blobKey: string
) {
  const docType = 'PLANTILLA_GENERADA'
  switch (context) {
    case 'EVENT':
      await prisma.eventDocument.create({
        data: { eventId: entityId, documentType: docType, fileName, blobKey, uploadedById: userId },
      })
      break
    case 'ORDER':
      await prisma.orderDocument.create({
        data: { orderId: entityId, documentType: docType, fileName, blobKey, uploadedById: userId },
      })
      break
    case 'CONTRACT':
      await prisma.contractDocument.create({
        data: { contractId: entityId, documentType: docType, fileName, blobKey, uploadedById: userId },
      })
      break
  }
}

// ─── Get available labels for a context ────────────────────────────────────────

export function getAvailableLabels(context: string): {
  scalar: string[]
  tables: { name: string; description: string; fields: string[] }[]
} {
  const mappings = CONTEXT_MAPPINGS[context]
  const scalar = mappings ? Object.keys(mappings) : []

  const tableMappings = CONTEXT_TABLE_MAPPINGS[context]
  const tables = tableMappings
    ? Object.entries(tableMappings).map(([name, tm]) => ({
        name,
        description: tm.description,
        fields: tm.fields,
      }))
    : []

  return { scalar, tables }
}
