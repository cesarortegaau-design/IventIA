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

export function calculateLineTotal(
  unitPrice: Decimal,
  quantity: Decimal,
  discountPct: Decimal
): Decimal {
  const gross = unitPrice.mul(quantity)
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
