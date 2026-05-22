import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { stripe } from '../lib/stripe'
import { env } from '../config/env'

// ── Helper: verify portal user has access to this event ──────────────────────
async function verifyEventAccess(portalUserId: string, eventId: string) {
  const access = await prisma.portalUserEvent.findUnique({
    where: { portalUserId_eventId: { portalUserId, eventId } },
  })
  if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')
  return access
}

// ── Helper: read PlannerStore by key ─────────────────────────────────────────
async function readStore(eventId: string, storeKey: string) {
  const store = await prisma.plannerStore.findUnique({
    where: { eventId_storeKey: { eventId, storeKey } },
  })
  return (store?.data as any) ?? null
}

// ── Helper: upsert PlannerStore ───────────────────────────────────────────────
async function writeStore(eventId: string, storeKey: string, data: any) {
  await prisma.plannerStore.upsert({
    where: { eventId_storeKey: { eventId, storeKey } },
    update: { data },
    create: { eventId, storeKey, data },
  })
}

// ── PATCH /portal/planner-tareas/:eventId ────────────────────────────────────
// Client creates or edits a task in the tareas PlannerStore
export async function addClientTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId } = req.portalUser!
    const { eventId } = req.params

    await verifyEventAccess(portalUserId, eventId)

    const body = z.object({
      id: z.string().optional(),
      title: z.string().min(1),
      notes: z.string().optional(),
      dueDate: z.string().optional(),
    }).parse(req.body)

    const tareas = await readStore(eventId, 'tareas')
    const tasks: any[] = tareas?.tasks ?? []

    if (body.id) {
      // Edit — only tasks the client created
      const idx = tasks.findIndex((t: any) => t.id === body.id)
      if (idx < 0) throw new AppError(404, 'NOT_FOUND', 'Tarea no encontrada')
      if (!tasks[idx].clientCreated) throw new AppError(403, 'FORBIDDEN', 'No puedes editar esta tarea')
      tasks[idx] = {
        ...tasks[idx],
        title: body.title,
        notes: body.notes ?? tasks[idx].notes,
        dueDate: body.dueDate ?? tasks[idx].dueDate,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // Create new task
      tasks.push({
        id: `client-${Date.now()}`,
        title: body.title,
        notes: body.notes ?? '',
        dueDate: body.dueDate ?? null,
        status: 'POR_HACER',
        clientVisible: true,
        clientCreated: true,
        createdAt: new Date().toISOString(),
      })
    }

    await writeStore(eventId, 'tareas', { ...(tareas ?? {}), tasks })
    res.json({ success: true, data: tasks })
  } catch (err) {
    next(err)
  }
}

// ── POST /portal/planner-payments/:eventId/checkout ──────────────────────────
export async function createPlannerPaymentCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Pago en línea no disponible')

    const { portalUserId } = req.portalUser!
    const { eventId } = req.params

    await verifyEventAccess(portalUserId, eventId)

    const { paymentId } = z.object({ paymentId: z.string().min(1) }).parse(req.body)

    const contrato = await readStore(eventId, 'contrato')
    if (!contrato) throw new AppError(404, 'NOT_FOUND', 'Contrato no encontrado')

    const payment = (contrato.scheduledPayments ?? []).find((p: any) => p.id === paymentId)
    if (!payment) throw new AppError(404, 'NOT_FOUND', 'Pago programado no encontrado')
    if (payment.status === 'PAGADO') throw new AppError(400, 'ALREADY_PAID', 'Este pago ya fue realizado')

    const amount = payment.amount
      ?? Math.round((payment.percentage ?? 0) * (contrato.total ?? 0) / 100)
    if (!amount || amount <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'El monto del pago es inválido')

    const base = env.STRIPE_PLANNER_URL
    const successUrl = `${base}/portal-cliente/${eventId}?payment_success=1&session_id={CHECKOUT_SESSION_ID}&payment_id=${paymentId}`
    const cancelUrl  = `${base}/portal-cliente/${eventId}?payment_cancelled=1`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'mxn',
      line_items: [{
        price_data: {
          currency: 'mxn',
          unit_amount: Math.round(amount * 100),
          product_data: { name: payment.label || `Pago ${paymentId}` },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata: { eventId, paymentId, portalUserId },
    })

    res.json({ success: true, data: { url: session.url } })
  } catch (err) {
    next(err)
  }
}

// ── POST /portal/planner-contract/:eventId/authorize ─────────────────────────
// Client authorizes a quote (COTIZACION) → becomes CONTRATO
export async function authorizeQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId } = req.portalUser!
    const { eventId } = req.params
    await verifyEventAccess(portalUserId, eventId)

    const contrato = await readStore(eventId, 'contrato')
    if (!contrato) throw new AppError(404, 'NOT_FOUND', 'Contrato no encontrado')
    if (contrato.contractStatus !== 'COTIZACION') {
      throw new AppError(400, 'INVALID_STATUS', 'Solo se puede autorizar una cotización')
    }

    const updated = {
      ...contrato,
      contractStatus: 'CONTRATO',
      clientAuthorizedAt: new Date().toISOString(),
      clientAuthorizedBy: portalUserId,
    }
    await writeStore(eventId, 'contrato', updated)
    res.json({ success: true, data: { contrato: updated } })
  } catch (err) { next(err) }
}

// ── POST /portal/planner-contract/:eventId/sign ───────────────────────────────
// Client signs the contract (CONTRATO) → becomes FIRMADO
// Body: { signatureData: string (base64 PNG) }
export async function signContract(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId } = req.portalUser!
    const { eventId } = req.params
    await verifyEventAccess(portalUserId, eventId)

    const { signatureData } = z.object({
      signatureData: z.string().min(1),
    }).parse(req.body)

    const contrato = await readStore(eventId, 'contrato')
    if (!contrato) throw new AppError(404, 'NOT_FOUND', 'Contrato no encontrado')
    if (contrato.contractStatus !== 'CONTRATO') {
      throw new AppError(400, 'INVALID_STATUS', 'Solo se puede firmar un contrato autorizado')
    }

    const updated = {
      ...contrato,
      contractStatus: 'FIRMADO',
      clientSignedAt: new Date().toISOString(),
      clientSignedBy: portalUserId,
      clientSignature: signatureData,
    }
    await writeStore(eventId, 'contrato', updated)
    res.json({ success: true, data: { contrato: updated } })
  } catch (err) { next(err) }
}

// ── POST /portal/planner-payments/:eventId/verify ────────────────────────────
export async function verifyPlannerPayment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Pago en línea no disponible')

    const { portalUserId } = req.portalUser!
    const { eventId } = req.params

    await verifyEventAccess(portalUserId, eventId)

    const { sessionId, paymentId } = z.object({
      sessionId: z.string().min(1),
      paymentId: z.string().min(1),
    }).parse(req.body)

    const contrato = await readStore(eventId, 'contrato')
    if (!contrato) throw new AppError(404, 'NOT_FOUND', 'Contrato no encontrado')

    const payments: any[] = contrato.scheduledPayments ?? []
    const idx = payments.findIndex((p: any) => p.id === paymentId)
    if (idx < 0) throw new AppError(404, 'NOT_FOUND', 'Pago programado no encontrado')

    // Idempotent — already marked paid
    if (payments[idx].status === 'PAGADO') {
      return res.json({ success: true, data: { status: 'PAGADO', contrato } })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return res.json({ success: true, data: { status: payments[idx].status, contrato } })
    }

    // Verify the session belongs to this payment
    if (session.metadata?.paymentId !== paymentId || session.metadata?.eventId !== eventId) {
      throw new AppError(400, 'SESSION_MISMATCH', 'La sesión de pago no corresponde a este pago')
    }

    payments[idx] = {
      ...payments[idx],
      status: 'PAGADO',
      paidAt: new Date().toISOString(),
      stripeSessionId: sessionId,
    }
    const updated = { ...contrato, scheduledPayments: payments }
    await writeStore(eventId, 'contrato', updated)

    res.json({ success: true, data: { status: 'PAGADO', contrato: updated } })
  } catch (err) {
    next(err)
  }
}
