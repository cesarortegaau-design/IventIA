export const ORDER_STATUS = {
  QUOTED: 'QUOTED',
  CONFIRMED: 'CONFIRMED',
  EXECUTED: 'EXECUTED',
  INVOICED: 'INVOICED',
  CANCELLED: 'CANCELLED',
  CREDIT_NOTE: 'CREDIT_NOTE',
} as const

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

// Valid transitions: from -> allowed next statuses
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  QUOTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['EXECUTED', 'CANCELLED'],
  EXECUTED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
  CREDIT_NOTE: ['CONFIRMED', 'CANCELLED'],
}

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  IN_PAYMENT: 'IN_PAYMENT',
  PAID: 'PAID',
  IN_REVIEW: 'IN_REVIEW',
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  IN_PAYMENT: 'En Pago',
  PAID: 'Pagada',
  IN_REVIEW: 'En Revisión',
}

export const EVENT_STATUS = {
  QUOTED: 'QUOTED',
  CONFIRMED: 'CONFIRMED',
  IN_EXECUTION: 'IN_EXECUTION',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const

export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS]

export const PRICING_TIER = {
  EARLY: 'EARLY',
  NORMAL: 'NORMAL',
  LATE: 'LATE',
} as const

export type PricingTier = typeof PRICING_TIER[keyof typeof PRICING_TIER]
