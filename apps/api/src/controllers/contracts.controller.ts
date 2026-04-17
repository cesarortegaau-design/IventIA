import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as contractService from '../services/contract.service'

const createSchema = z.object({
  description: z.string().min(1),
  clientId: z.string().min(1),
  signingDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  signingDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const statusSchema = z.object({
  status: z.enum(['EN_FIRMA', 'FIRMADO', 'CANCELADO']),
})

const scheduledPaymentSchema = z.object({
  label: z.string().min(1),
  dueDate: z.string().datetime(),
  expectedAmount: z.number().positive(),
})

const updateScheduledPaymentSchema = z.object({
  label: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  expectedAmount: z.number().positive().optional(),
})

const paymentSchema = z.object({
  method: z.enum(['CASH', 'TRANSFER', 'CREDIT_CARD', 'CHECK', 'SWIFT']),
  amount: z.number().positive(),
  paymentDate: z.string().datetime(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function listContracts(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { status, clientId } = req.query as Record<string, string>
    const { getUserOrgIds } = await import('../middleware/departmentScope')
    const orgIds = await getUserOrgIds(req)
    const contracts = await contractService.list(tenantId, { status, clientId, organizationIds: orgIds })
    res.json(contracts)
  } catch (err) { next(err) }
}

export async function getContract(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('[getContract] Fetching contract:', req.params.id)
    const contract = await contractService.getById(req.params.id, req.user!.tenantId)
    console.log('[getContract] Success')
    res.json(contract)
  } catch (err) {
    console.error('[getContract] Error:', err)
    next(err)
  }
}

export async function createContract(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body)
    const contract = await contractService.create(req.user!.tenantId, req.user!.userId, {
      description: data.description,
      clientId: data.clientId,
      signingDate: data.signingDate ? new Date(data.signingDate) : undefined,
      notes: data.notes,
    })
    res.status(201).json(contract)
  } catch (err) { next(err) }
}

export async function updateContract(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body)
    const contract = await contractService.update(req.params.id, req.user!.tenantId, {
      ...data,
      signingDate: data.signingDate === null ? null : data.signingDate ? new Date(data.signingDate) : undefined,
    } as any)
    res.json(contract)
  } catch (err) { next(err) }
}

export async function updateContractStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = statusSchema.parse(req.body)
    const contract = await contractService.updateStatus(req.params.id, req.user!.tenantId, status)
    res.json(contract)
  } catch (err) { next(err) }
}

// ─── Orders ────────────────────────────────────────────────────────────────────

export async function addOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.addOrder(req.params.id, req.user!.tenantId, req.params.orderId)
    res.json(contract)
  } catch (err) { next(err) }
}

export async function removeOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.removeOrder(req.params.id, req.user!.tenantId, req.params.orderId)
    res.json(contract)
  } catch (err) { next(err) }
}

export async function getAvailableOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.getById(req.params.id, req.user!.tenantId)
    const orders = await contractService.getAvailableOrders(req.user!.tenantId, contract.clientId, contract.id)
    res.json(orders)
  } catch (err) { next(err) }
}

// ─── Scheduled Payments ────────────────────────────────────────────────────────

export async function addScheduledPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = scheduledPaymentSchema.parse(req.body)
    const contract = await contractService.addScheduledPayment(req.params.id, req.user!.tenantId, {
      label: data.label,
      dueDate: new Date(data.dueDate),
      expectedAmount: data.expectedAmount,
    })
    res.json(contract)
  } catch (err) { next(err) }
}

export async function updateScheduledPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateScheduledPaymentSchema.parse(req.body)
    const contract = await contractService.updateScheduledPayment(
      req.params.id, req.user!.tenantId, req.params.spId,
      {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      }
    )
    res.json(contract)
  } catch (err) { next(err) }
}

export async function deleteScheduledPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.deleteScheduledPayment(
      req.params.id, req.user!.tenantId, req.params.spId
    )
    res.json(contract)
  } catch (err) { next(err) }
}

// ─── Payments ──────────────────────────────────────────────────────────────────

export async function addPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = paymentSchema.parse(req.body)
    const contract = await contractService.addPayment(
      req.params.id, req.user!.tenantId, req.params.spId, req.user!.userId,
      {
        method: data.method,
        amount: data.amount,
        paymentDate: new Date(data.paymentDate),
        reference: data.reference,
        notes: data.notes,
      }
    )
    res.json(contract)
  } catch (err) { next(err) }
}
