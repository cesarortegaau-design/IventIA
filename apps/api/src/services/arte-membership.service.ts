import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import Decimal from 'decimal.js'
import dayjs from 'dayjs'

export interface CreateMembershipInput {
  userId: string
  tierId: string
  billingCycle: 'MONTHLY' | 'YEARLY'
  autoRenew?: boolean
}

export async function createMembership(input: CreateMembershipInput) {
  // Check if membership already exists
  const existing = await prisma.artCapitalMembership.findUnique({
    where: {
      userId_tierId: { userId: input.userId, tierId: input.tierId },
    },
  })

  if (existing && existing.status === 'ACTIVE') {
    throw new AppError(400, 'MEMBERSHIP_EXISTS', 'User already has an active membership')
  }

  const tier = await prisma.artCapitalMembershipTier.findUnique({
    where: { id: input.tierId },
  })

  if (!tier) {
    throw new AppError(404, 'TIER_NOT_FOUND', 'Membership tier not found')
  }

  const now = new Date()
  let endDate: Date
  let renewalDate: Date

  if (input.billingCycle === 'YEARLY') {
    endDate = dayjs(now).add(1, 'year').toDate()
    renewalDate = dayjs(endDate).subtract(7, 'days').toDate()
  } else {
    endDate = dayjs(now).add(1, 'month').toDate()
    renewalDate = dayjs(endDate).subtract(3, 'days').toDate()
  }

  const membership = await prisma.artCapitalMembership.create({
    data: {
      userId: input.userId,
      tierId: input.tierId,
      tenantId: (await prisma.artCapitalUser.findUnique({
        where: { id: input.userId },
        select: { tenantId: true },
      }))!.tenantId,
      startDate: now,
      endDate,
      renewalDate,
      billingCycle: input.billingCycle,
      autoRenew: input.autoRenew ?? true,
      status: 'ACTIVE',
    },
    include: { user: true, tier: true },
  })

  return membership
}

export async function renewMembership(membershipId: string) {
  const membership = await prisma.artCapitalMembership.findUnique({
    where: { id: membershipId },
  })

  if (!membership) {
    throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', 'Membership not found')
  }

  const now = new Date()
  let newEndDate: Date
  let newRenewalDate: Date

  if (membership.billingCycle === 'YEARLY') {
    newEndDate = dayjs(now).add(1, 'year').toDate()
    newRenewalDate = dayjs(newEndDate).subtract(7, 'days').toDate()
  } else {
    newEndDate = dayjs(now).add(1, 'month').toDate()
    newRenewalDate = dayjs(newEndDate).subtract(3, 'days').toDate()
  }

  const renewed = await prisma.artCapitalMembership.update({
    where: { id: membershipId },
    data: {
      startDate: now,
      endDate: newEndDate,
      renewalDate: newRenewalDate,
      status: 'ACTIVE',
    },
  })

  return renewed
}

export async function cancelMembership(membershipId: string) {
  const membership = await prisma.artCapitalMembership.update({
    where: { id: membershipId },
    data: { status: 'CANCELLED' },
  })

  return membership
}

export async function getUserActiveMembership(userId: string) {
  const membership = await prisma.artCapitalMembership.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { tier: true },
    orderBy: { endDate: 'desc' },
  })

  return membership
}

export async function getMembershipsNearingRenewal(tenantId: string, daysFromNow: number = 7) {
  const now = new Date()
  const futureDate = dayjs(now).add(daysFromNow, 'days').toDate()

  const memberships = await prisma.artCapitalMembership.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      autoRenew: true,
      renewalDate: {
        gte: now,
        lte: futureDate,
      },
    },
    include: { user: true, tier: true },
  })

  return memberships
}

export async function getExpiredMemberships(tenantId: string) {
  const now = new Date()

  const memberships = await prisma.artCapitalMembership.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      endDate: {
        lt: now,
      },
    },
    include: { user: true, tier: true },
  })

  return memberships
}

export async function deactivateExpiredMemberships(tenantId: string) {
  const now = new Date()

  const result = await prisma.artCapitalMembership.updateMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      endDate: {
        lt: now,
      },
    },
    data: {
      status: 'EXPIRED',
    },
  })

  return result
}

export async function listUserMemberships(
  userId: string,
  filters?: { status?: string; page?: number; pageSize?: number }
) {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 10
  const skip = (page - 1) * pageSize

  const where: any = { userId }
  if (filters?.status) where.status = filters.status

  const [total, memberships] = await Promise.all([
    prisma.artCapitalMembership.count({ where }),
    prisma.artCapitalMembership.findMany({
      where,
      include: { tier: true },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { memberships, total, page, pageSize }
}

export async function hasMembershipAccess(userId: string, tierId?: string): Promise<boolean> {
  const membership = await prisma.artCapitalMembership.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      endDate: { gt: new Date() },
    },
  })

  if (!membership) return false

  if (tierId && membership.tierId !== tierId) return false

  return true
}
