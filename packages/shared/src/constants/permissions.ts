export const PRIVILEGES = {
  // Events
  EVENT_CREATE_QUOTED: 'event.create.quoted',
  EVENT_CREATE_CONFIRMED: 'event.create.confirmed',
  EVENT_EDIT_QUOTED: 'event.edit.quoted',
  EVENT_EDIT_CONFIRMED: 'event.edit.confirmed',
  EVENT_CANCEL: 'event.cancel',

  // Orders
  ORDER_CREATE: 'order.create',
  ORDER_CONFIRM: 'order.status.confirm',
  ORDER_CANCEL: 'order.status.cancel',
  ORDER_RECORD_PAYMENT: 'order.payment.record',
  ORDER_ATTACH_INVOICE: 'order.invoice.attach',
  ORDER_DISCOUNT_ASSIGN: 'order.discount.assign',
  ORDER_CREATE_CREDIT_NOTE: 'order.credit_note.create',

  // Catalogs
  CATALOG_RESOURCES_MANAGE: 'catalog.resources.manage',
  CATALOG_PRICE_LISTS_MANAGE: 'catalog.price_lists.manage',
  CATALOG_CLIENTS_MANAGE: 'catalog.clients.manage',
  CATALOG_DEPARTMENTS_MANAGE: 'catalog.departments.manage',

  // Users
  USERS_MANAGE: 'users.manage',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Dashboard
  DASHBOARD_ACCOUNTING: 'dashboard.accounting',
  DASHBOARD_OPERATIONS: 'dashboard.operations',
} as const

export type PrivilegeKey = typeof PRIVILEGES[keyof typeof PRIVILEGES]
