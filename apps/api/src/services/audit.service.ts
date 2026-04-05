import { prisma } from '../config/database'

export const auditService = {
  async log(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValues?: object | null,
    newValues?: object | null,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType,
          entityId,
          action,
          oldValues: oldValues ?? undefined,
          newValues: newValues ?? undefined,
          ipAddress: ipAddress ?? undefined,
        },
      })
    } catch (error) {
      // Swallow audit errors - don't block main operations
      console.error(`Audit log failed for ${entityType}/${entityId}:`, error)
    }
  },
}
