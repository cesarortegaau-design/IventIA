import { prisma } from '../config/database'

export interface ArteAuditLogInput {
  tenantId: string
  userId: string
  entityType: string
  entityId: string
  action: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
}

export async function logArteCapitalAudit(input: ArteAuditLogInput) {
  const auditLog = await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: `ARTE_CAPITAL_${input.entityType}`,
      entityId: input.entityId,
      action: input.action,
      oldValues: input.oldValues,
      newValues: input.newValues,
      ipAddress: input.ipAddress,
    },
  })

  return auditLog
}

export async function getArteCapitalAuditLogs(
  tenantId: string,
  filters?: {
    entityType?: string
    entityId?: string
    userId?: string
    action?: string
    startDate?: Date
    endDate?: Date
    page?: number
    pageSize?: number
  }
) {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 50
  const skip = (page - 1) * pageSize

  const where: any = {
    tenantId,
    entityType: { startsWith: 'ARTE_CAPITAL_' },
  }

  if (filters?.entityType) {
    where.entityType = `ARTE_CAPITAL_${filters.entityType}`
  }
  if (filters?.entityId) where.entityId = filters.entityId
  if (filters?.userId) where.userId = filters.userId
  if (filters?.action) where.action = filters.action
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = filters.startDate
    if (filters.endDate) where.createdAt.lte = filters.endDate
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { logs, total, page, pageSize }
}

export async function getEntityAuditTrail(entityId: string, entityType: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityId,
      entityType: `ARTE_CAPITAL_${entityType}`,
    },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })

  return logs
}

export async function getProductApprovalHistory(productId: string) {
  const logs = await getEntityAuditTrail(productId, 'PRODUCT')
  return logs.filter((l) => ['CREATED', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(l.action))
}

export async function getOrderAuditTrail(orderId: string) {
  return getEntityAuditTrail(orderId, 'ORDER')
}

// Summary reports
export async function getArteCapitalActivitySummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      entityType: { startsWith: 'ARTE_CAPITAL_' },
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  const summary: Record<string, Record<string, number>> = {}

  logs.forEach((log) => {
    const type = log.entityType
    const action = log.action
    if (!summary[type]) summary[type] = {}
    summary[type][action] = (summary[type][action] ?? 0) + 1
  })

  return {
    totalEvents: logs.length,
    byEntityType: summary,
    dateRange: { startDate, endDate },
  }
}
