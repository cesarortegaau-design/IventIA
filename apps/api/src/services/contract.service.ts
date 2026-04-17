import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import Decimal from 'decimal.js'

// Generate sequential contract number: CTR-YYYY-NNNN
async function generateContractNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `CTR-${year}-`
  const last = await prisma.contract.findFirst({
    where: { tenantId, contractNumber: { startsWith: prefix } },
    orderBy: { contractNumber: 'desc' },
  })
  const lastNum = last ? parseInt(last.contractNumber.replace(prefix, ''), 10) : 0
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
}

const contractInclude = {
  client: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  orders: {
    include: {
      event: { select: { id: true, name: true, code: true } },
      client: true,
    },
  },
  scheduledPayments: {
    orderBy: { dueDate: 'asc' as const },
    include: {
      payments: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
  },
}

export async function list(tenantId: string, params: { status?: string; clientId?: string; organizationIds?: string[] | null }) {
  const where: any = { tenantId }
  if (params.status) where.status = params.status
  if (params.clientId) where.clientId = params.clientId
  // Scope: show only contracts that have at least one order belonging to the user's organizations
  if (params.organizationIds !== null && params.organizationIds !== undefined) {
    where.orders = { some: { organizacionId: { in: params.organizationIds } } }
  }

  return prisma.contract.findMany({
    where,
    include: {
      client: true,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      orders: { select: { id: true, orderNumber: true, total: true } },
      scheduledPayments: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getById(id: string, tenantId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id, tenantId },
    include: contractInclude,
  })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')
  return contract
}

export async function create(
  tenantId: string,
  userId: string,
  input: { description: string; clientId: string; signingDate?: Date; notes?: string }
) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, tenantId } })
  if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Cliente no encontrado')

  const contractNumber = await generateContractNumber(tenantId)

  return prisma.contract.create({
    data: {
      tenantId,
      contractNumber,
      description: input.description,
      clientId: input.clientId,
      signingDate: input.signingDate,
      notes: input.notes,
      createdById: userId,
    },
    include: contractInclude,
  })
}

export async function update(
  id: string,
  tenantId: string,
  input: { description?: string; signingDate?: Date; notes?: string }
) {
  const contract = await prisma.contract.findFirst({ where: { id, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')
  if (contract.status === 'CANCELADO') {
    throw new AppError(400, 'CONTRACT_CANCELLED', 'No se puede modificar un contrato cancelado')
  }

  return prisma.contract.update({
    where: { id },
    data: input,
    include: contractInclude,
  })
}

export async function updateStatus(id: string, tenantId: string, status: string) {
  const contract = await prisma.contract.findFirst({ where: { id, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')

  const validTransitions: Record<string, string[]> = {
    EN_FIRMA: ['FIRMADO', 'CANCELADO'],
    FIRMADO: ['CANCELADO'],
  }

  const allowed = validTransitions[contract.status] || []
  if (!allowed.includes(status)) {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', `No se puede cambiar de ${contract.status} a ${status}`)
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.contract.update({
      where: { id },
      data: { status: status as any },
      include: contractInclude,
    })

    // If cancelled, release all orders
    if (status === 'CANCELADO') {
      await tx.order.updateMany({
        where: { contractId: id },
        data: { contractId: null },
      })
    }

    return updated
  })
}

// ─── Order association ─────────────────────────────────────────────────────────

export async function addOrder(contractId: string, tenantId: string, orderId: string) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')
  if (contract.status === 'CANCELADO') {
    throw new AppError(400, 'CONTRACT_CANCELLED', 'No se puede modificar un contrato cancelado')
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } })
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Orden no encontrada')

  // Only orders without payments can be linked to contracts
  if (new Decimal(Number(order.paidAmount)).gt(0)) {
    throw new AppError(400, 'ORDER_HAS_PAYMENTS', 'No se pueden agregar órdenes con pagos a un contrato')
  }

  // Check order is not in another active contract
  if (order.contractId) {
    const existing = await prisma.contract.findFirst({
      where: { id: order.contractId, status: { in: ['EN_FIRMA', 'FIRMADO'] } },
    })
    if (existing) {
      throw new AppError(400, 'ORDER_IN_CONTRACT', `La orden ya pertenece al contrato ${existing.contractNumber}`)
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { contractId },
    })

    // Recalculate total
    const orders = await tx.order.findMany({ where: { contractId } })
    const totalAmount = orders.reduce((sum, o) => sum.plus(o.total), new Decimal(0))

    return tx.contract.update({
      where: { id: contractId },
      data: { totalAmount },
      include: contractInclude,
    })
  })
}

export async function removeOrder(contractId: string, tenantId: string, orderId: string) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')
  if (contract.status === 'CANCELADO') {
    throw new AppError(400, 'CONTRACT_CANCELLED', 'No se puede modificar un contrato cancelado')
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, contractId } })
  if (!order) throw new AppError(404, 'ORDER_NOT_IN_CONTRACT', 'La orden no pertenece a este contrato')

  return prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { contractId: null },
    })

    const orders = await tx.order.findMany({ where: { contractId } })
    const totalAmount = orders.reduce((sum, o) => sum.plus(o.total), new Decimal(0))

    return tx.contract.update({
      where: { id: contractId },
      data: { totalAmount },
      include: contractInclude,
    })
  })
}

// ─── Available orders for a contract (same client, not in another active contract) ──

export async function getAvailableOrders(tenantId: string, clientId: string, contractId: string) {
  return prisma.order.findMany({
    where: {
      tenantId,
      clientId,
      status: { notIn: ['CANCELLED', 'CREDIT_NOTE'] },
      paidAmount: { equals: 0 },
      OR: [
        { contractId: null },
        { contractId },
      ],
    },
    include: {
      event: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Scheduled payments ────────────────────────────────────────────────────────

export async function addScheduledPayment(
  contractId: string,
  tenantId: string,
  input: { label: string; dueDate: Date; expectedAmount: number }
) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')
  if (contract.status === 'CANCELADO') {
    throw new AppError(400, 'CONTRACT_CANCELLED', 'No se puede modificar un contrato cancelado')
  }

  await prisma.contractScheduledPayment.create({
    data: {
      contractId,
      label: input.label,
      dueDate: input.dueDate,
      expectedAmount: new Decimal(input.expectedAmount),
    },
  })

  return getById(contractId, tenantId)
}

export async function updateScheduledPayment(
  contractId: string,
  tenantId: string,
  spId: string,
  input: { label?: string; dueDate?: Date; expectedAmount?: number }
) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')

  const sp = await prisma.contractScheduledPayment.findFirst({ where: { id: spId, contractId } })
  if (!sp) throw new AppError(404, 'SCHEDULED_PAYMENT_NOT_FOUND', 'Pago programado no encontrado')

  const data: any = {}
  if (input.label !== undefined) data.label = input.label
  if (input.dueDate !== undefined) data.dueDate = input.dueDate
  if (input.expectedAmount !== undefined) data.expectedAmount = new Decimal(input.expectedAmount)

  await prisma.contractScheduledPayment.update({ where: { id: spId }, data })

  return getById(contractId, tenantId)
}

export async function deleteScheduledPayment(contractId: string, tenantId: string, spId: string) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')

  const sp = await prisma.contractScheduledPayment.findFirst({
    where: { id: spId, contractId },
    include: { payments: true },
  })
  if (!sp) throw new AppError(404, 'SCHEDULED_PAYMENT_NOT_FOUND', 'Pago programado no encontrado')

  if (sp.payments.length > 0) {
    throw new AppError(400, 'HAS_PAYMENTS', 'No se puede eliminar un pago programado que ya tiene pagos registrados')
  }

  await prisma.contractScheduledPayment.delete({ where: { id: spId } })

  return getById(contractId, tenantId)
}

// ─── Record actual payment against a scheduled payment ─────────────────────────

export async function addPayment(
  contractId: string,
  tenantId: string,
  spId: string,
  userId: string,
  input: {
    method: string
    amount: number
    paymentDate: Date
    reference?: string
    notes?: string
  }
) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId } })
  if (!contract) throw new AppError(404, 'CONTRACT_NOT_FOUND', 'Contrato no encontrado')

  const sp = await prisma.contractScheduledPayment.findFirst({ where: { id: spId, contractId } })
  if (!sp) throw new AppError(404, 'SCHEDULED_PAYMENT_NOT_FOUND', 'Pago programado no encontrado')

  return prisma.$transaction(async (tx) => {
    // Create the payment
    await tx.contractPayment.create({
      data: {
        scheduledPaymentId: spId,
        method: input.method as any,
        amount: new Decimal(input.amount),
        paymentDate: input.paymentDate,
        reference: input.reference,
        notes: input.notes,
        recordedById: userId,
      },
    })

    // Recalculate scheduled payment paid amount
    const spPayments = await tx.contractPayment.aggregate({
      where: { scheduledPaymentId: spId },
      _sum: { amount: true },
    })
    const spPaid = spPayments._sum.amount ?? new Decimal(0)
    const spStatus = spPaid.gte(sp.expectedAmount) ? 'PAID' : spPaid.gt(0) ? 'PARTIAL' : 'PENDING'

    await tx.contractScheduledPayment.update({
      where: { id: spId },
      data: { paidAmount: spPaid, status: spStatus },
    })

    // Recalculate contract paid amount
    const allSp = await tx.contractScheduledPayment.findMany({
      where: { contractId },
    })
    const contractPaid = allSp.reduce((sum, s) => sum.plus(s.paidAmount), new Decimal(0))

    await tx.contract.update({
      where: { id: contractId },
      data: { paidAmount: contractPaid },
    })

    return getById(contractId, tenantId)
  })
}
