import { PricingTier } from '@iventia/shared'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import Decimal from 'decimal.js'

export async function determinePricingTier(priceListId: string): Promise<PricingTier> {
  const priceList = await prisma.priceList.findUnique({ where: { id: priceListId } })
  if (!priceList) throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')

  const now = new Date()

  if (priceList.earlyCutoff && now <= priceList.earlyCutoff) return 'EARLY'
  if (priceList.normalCutoff && now <= priceList.normalCutoff) return 'NORMAL'
  return 'LATE'
}

export function getPriceForTier(
  item: { earlyPrice: Decimal; normalPrice: Decimal; latePrice: Decimal },
  tier: PricingTier
): Decimal {
  switch (tier) {
    case 'EARLY': return item.earlyPrice
    case 'NORMAL': return item.normalPrice
    case 'LATE': return item.latePrice
  }
}

export function calculateTimeUnitValue(
  timeUnit: string | null | undefined,
  factor: Decimal | number,
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): Decimal {
  const factorDec = new Decimal(factor.toString())
  if (!timeUnit || timeUnit === 'no aplica') return new Decimal(1)
  if (timeUnit === 'días') {
    if (!startDate || !endDate) return factorDec
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
    const days = diffMs <= 0 ? 1 : Math.max(1, Math.ceil(diffMs / 86400000))
    return new Decimal(days).mul(factorDec)
  }
  if (timeUnit === 'horas') {
    if (!startDate || !endDate) return factorDec
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
    const hours = diffMs <= 0 ? 1 : Math.max(1, Math.ceil(diffMs / 3600000))
    return new Decimal(hours).mul(factorDec)
  }
  return new Decimal(1)
}

export function calculateLineTotal(
  unitPrice: Decimal,
  quantity: Decimal,
  discountPct: Decimal,
  timeUnitValue: Decimal = new Decimal(1)
): Decimal {
  const gross = unitPrice.mul(quantity).mul(timeUnitValue)
  const discount = gross.mul(discountPct.div(100))
  return gross.sub(discount)
}

export function calculateOrderTotals(
  lineItems: Array<{ lineTotal: Decimal }>,
  orderDiscountPct: Decimal,
  taxPct: Decimal
) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum.add(item.lineTotal),
    new Decimal(0)
  )
  const discountAmount = subtotal.mul(orderDiscountPct.div(100))
  const subtotalAfterDiscount = subtotal.sub(discountAmount)
  const taxAmount = subtotalAfterDiscount.mul(taxPct.div(100))
  const total = subtotalAfterDiscount.add(taxAmount)

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
  }
}
