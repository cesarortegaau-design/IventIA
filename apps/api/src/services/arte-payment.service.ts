import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { PaymentMethod } from '@prisma/client'
import Decimal from 'decimal.js'

export interface AddPaymentInput {
  orderId: string
  userId: string
  method: PaymentMethod
  amount: number
  reference?: string
  notes?: string
}

export async function addArteCapitalPayment(input: AddPaymentInput) {
  const order = await prisma.artCapitalOrder.findUnique({
    where: { id: input.orderId },
  })

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  }

  const amount = new Decimal(input.amount)
  const currentPaid = new Decimal(order.paidAmount)
  const newPaidAmount = currentPaid.add(amount)

  if (newPaidAmount.greaterThan(order.total)) {
    throw new AppError(400, 'PAYMENT_EXCEEDS_TOTAL', 'Payment amount exceeds order total')
  }

  const payment = await prisma.artCapitalPayment.create({
    data: {
      orderId: input.orderId,
      userId: input.userId,
      method: input.method,
      amount,
      paymentDate: new Date(),
      reference: input.reference,
      notes: input.notes,
    },
  })

  // Update order paid amount
  const newStatus =
    newPaidAmount.gte(order.total) ? 'PAID' : newPaidAmount.greaterThan(0) ? 'IN_PAYMENT' : 'QUOTED'

  await prisma.artCapitalOrder.update({
    where: { id: input.orderId },
    data: {
      paidAmount: newPaidAmount,
      status: newStatus as any,
    },
  })

  return payment
}

export async function getOrderPayments(orderId: string) {
  const payments = await prisma.artCapitalPayment.findMany({
    where: { orderId },
    include: { user: true },
    orderBy: { paymentDate: 'desc' },
  })

  return payments
}

export interface CreateCommissionTransactionInput {
  tenantId: string
  artistId: string
  orderId: string
  userId: string
  lineItemAmount: number
}

export async function createCommissionTransaction(input: CreateCommissionTransactionInput) {
  const artist = await prisma.artCapitalArtist.findUnique({
    where: { id: input.artistId },
  })

  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found')
  }

  const itemAmount = new Decimal(input.lineItemAmount)
  const rate = new Decimal(artist.commissionRate)
  const commission = itemAmount.mul(rate).div(100)

  const transaction = await prisma.artCapitalTransaction.create({
    data: {
      tenantId: input.tenantId,
      artistId: input.artistId,
      orderId: input.orderId,
      userId: input.userId,
      amount: itemAmount,
      commissionRate: rate,
      commissionAmount: commission,
      status: 'PENDING',
    },
  })

  return transaction
}

export async function getArtistEarnings(artistId: string, filters?: { startDate?: Date; endDate?: Date }) {
  const where: any = { artistId, status: { in: ['PENDING', 'COMPLETED'] } }

  if (filters?.startDate) {
    where.createdAt = { gte: filters.startDate }
  }
  if (filters?.endDate) {
    where.createdAt = where.createdAt ?? {}
    where.createdAt.lte = filters.endDate
  }

  const transactions = await prisma.artCapitalTransaction.findMany({
    where,
    include: { order: true },
    orderBy: { createdAt: 'desc' },
  })

  const totalEarnings = transactions.reduce((sum, t) => sum.add(t.commissionAmount), new Decimal(0))
  const totalCommissions = transactions.reduce((sum, t) => sum.add(t.commissionAmount), new Decimal(0))
  const pendingAmount = transactions
    .filter((t) => t.status === 'PENDING')
    .reduce((sum, t) => sum.add(t.commissionAmount), new Decimal(0))

  return {
    transactions,
    totalEarnings,
    totalCommissions,
    pendingAmount,
    count: transactions.length,
  }
}

export async function payoutArtistCommissions(artistId: string, transactionIds: string[]) {
  const transactions = await prisma.artCapitalTransaction.findMany({
    where: { id: { in: transactionIds }, artistId, status: 'PENDING' },
  })

  if (transactions.length === 0) {
    throw new AppError(400, 'NO_TRANSACTIONS', 'No pending transactions found')
  }

  const totalPayout = transactions.reduce((sum, t) => sum.add(t.commissionAmount), new Decimal(0))

  // Update all transactions to COMPLETED
  await prisma.artCapitalTransaction.updateMany({
    where: { id: { in: transactionIds } },
    data: { status: 'COMPLETED', paidAt: new Date() },
  })

  return {
    artistId,
    transactionCount: transactions.length,
    totalPayout,
    paidAt: new Date(),
  }
}

export async function getPendingCommissions(tenantId: string, filters?: { artistId?: string }) {
  const where: any = { tenantId, status: 'PENDING' }
  if (filters?.artistId) where.artistId = filters.artistId

  const transactions = await prisma.artCapitalTransaction.findMany({
    where,
    include: { artist: { include: { user: true } }, order: true },
    orderBy: { createdAt: 'asc' },
  })

  const byArtist = new Map<string, any>()
  transactions.forEach((t) => {
    if (!byArtist.has(t.artistId)) {
      byArtist.set(t.artistId, {
        artist: t.artist,
        transactions: [],
        totalAmount: new Decimal(0),
      })
    }
    const entry = byArtist.get(t.artistId)
    entry.transactions.push(t)
    entry.totalAmount = entry.totalAmount.add(t.commissionAmount)
  })

  return Array.from(byArtist.values())
}
