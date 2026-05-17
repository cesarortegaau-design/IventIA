// ─── Privilege catalog ────────────────────────────────────────────────────────
// Naming: <object>.<action>[.<status>]
// Actions: view, create, edit, cancel, delete
// Status-specific actions use the status as suffix

export const PRIVILEGES = {
  // ── Events ──────────────────────────────────────────────────────────────────
  EVENT_VIEW: 'event.view',
  EVENT_CREATE: 'event.create',
  EVENT_EDIT_QUOTED: 'event.edit.quoted',
  EVENT_EDIT_CONFIRMED: 'event.edit.confirmed',
  EVENT_EDIT_IN_EXECUTION: 'event.edit.in_execution',
  EVENT_CANCEL: 'event.cancel',
  EVENT_DELETE: 'event.delete',
  EVENT_CONFIRM: 'event.status.confirm',
  EVENT_EXECUTE: 'event.status.execute',
  EVENT_CLOSE: 'event.status.close',
  EVENT_TIMELINE_VIEW: 'event.timeline.view',
  EVENT_TIMELINE_EDIT: 'event.timeline.edit',

  // ── Clients ─────────────────────────────────────────────────────────────────
  CLIENT_VIEW: 'client.view',
  CLIENT_CREATE: 'client.create',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',

  // ── Orders ──────────────────────────────────────────────────────────────────
  ORDER_VIEW: 'order.view',
  ORDER_CREATE: 'order.create',
  ORDER_EDIT_QUOTED: 'order.edit.quoted',
  ORDER_EDIT_CONFIRMED: 'order.edit.confirmed',
  ORDER_CONFIRM: 'order.status.confirm',
  ORDER_EXECUTE: 'order.status.execute',
  ORDER_INVOICE: 'order.status.invoice',
  ORDER_CANCEL: 'order.status.cancel',
  ORDER_DELETE: 'order.delete',
  ORDER_RECORD_PAYMENT: 'order.payment.record',
  ORDER_ATTACH_INVOICE: 'order.invoice.attach',
  ORDER_DISCOUNT_ASSIGN: 'order.discount.assign',
  ORDER_CREATE_CREDIT_NOTE: 'order.credit_note.create',

  // ── Resources ───────────────────────────────────────────────────────────────
  RESOURCE_VIEW: 'resource.view',
  RESOURCE_CREATE: 'resource.create',
  RESOURCE_EDIT: 'resource.edit',
  RESOURCE_DELETE: 'resource.delete',

  // ── Price Lists ─────────────────────────────────────────────────────────────
  PRICE_LIST_VIEW: 'price_list.view',
  PRICE_LIST_CREATE: 'price_list.create',
  PRICE_LIST_EDIT: 'price_list.edit',
  PRICE_LIST_DELETE: 'price_list.delete',

  // ── Suppliers ───────────────────────────────────────────────────────────────
  SUPPLIER_VIEW: 'supplier.view',
  SUPPLIER_CREATE: 'supplier.create',
  SUPPLIER_EDIT: 'supplier.edit',
  SUPPLIER_DELETE: 'supplier.delete',
  SUPPLIER_BLOCK: 'supplier.status.block',
  SUPPLIER_ACTIVATE: 'supplier.status.activate',

  // ── Supplier Price Lists ────────────────────────────────────────────────────
  SUPPLIER_PRICE_LIST_VIEW: 'supplier_price_list.view',
  SUPPLIER_PRICE_LIST_CREATE: 'supplier_price_list.create',
  SUPPLIER_PRICE_LIST_EDIT: 'supplier_price_list.edit',
  SUPPLIER_PRICE_LIST_DELETE: 'supplier_price_list.delete',

  // ── Purchase Orders ─────────────────────────────────────────────────────────
  PURCHASE_ORDER_VIEW: 'purchase_order.view',
  PURCHASE_ORDER_CREATE: 'purchase_order.create',
  PURCHASE_ORDER_EDIT_DRAFT: 'purchase_order.edit.draft',
  PURCHASE_ORDER_CONFIRM: 'purchase_order.status.confirm',
  PURCHASE_ORDER_RECEIVE: 'purchase_order.status.receive',
  PURCHASE_ORDER_INVOICE: 'purchase_order.status.invoice',
  PURCHASE_ORDER_CANCEL: 'purchase_order.status.cancel',
  PURCHASE_ORDER_DELETE: 'purchase_order.delete',

  // ── Warehouses ──────────────────────────────────────────────────────────────
  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_CREATE: 'warehouse.create',
  WAREHOUSE_EDIT: 'warehouse.edit',
  WAREHOUSE_DELETE: 'warehouse.delete',
  WAREHOUSE_RECEIVE: 'warehouse.receive',
  WAREHOUSE_ADJUST: 'warehouse.adjust',

  // ── Organizations ────────────────────────────────────────────────────────────
  ORGANIZATION_VIEW: 'organization.view',
  ORGANIZATION_CREATE: 'organization.create',
  ORGANIZATION_EDIT: 'organization.edit',

  // ── Departments ─────────────────────────────────────────────────────────────
  DEPARTMENT_VIEW: 'department.view',
  DEPARTMENT_CREATE: 'department.create',
  DEPARTMENT_EDIT: 'department.edit',
  DEPARTMENT_DELETE: 'department.delete',

  // ── Contracts ───────────────────────────────────────────────────────────────
  CONTRACT_VIEW: 'contract.view',
  CONTRACT_CREATE: 'contract.create',
  CONTRACT_EDIT_EN_FIRMA: 'contract.edit.en_firma',
  CONTRACT_SIGN: 'contract.status.sign',
  CONTRACT_CANCEL: 'contract.status.cancel',
  CONTRACT_DELETE: 'contract.delete',

  // ── Payments ────────────────────────────────────────────────────────────────
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_RECORD: 'payment.record',
  PAYMENT_APPROVE: 'payment.approve',
  PAYMENT_CANCEL: 'payment.cancel',

  // ── Credit Notes ────────────────────────────────────────────────────────────
  CREDIT_NOTE_VIEW: 'credit_note.view',
  CREDIT_NOTE_CREATE: 'credit_note.create',
  CREDIT_NOTE_CANCEL: 'credit_note.cancel',

  // ── Templates ───────────────────────────────────────────────────────────────
  TEMPLATE_VIEW: 'template.view',
  TEMPLATE_CREATE: 'template.create',
  TEMPLATE_EDIT: 'template.edit',
  TEMPLATE_DELETE: 'template.delete',

  // ── Users ───────────────────────────────────────────────────────────────────
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',

  // ── Profiles ────────────────────────────────────────────────────────────────
  PROFILE_VIEW: 'profile.view',
  PROFILE_CREATE: 'profile.create',
  PROFILE_EDIT: 'profile.edit',
  PROFILE_DELETE: 'profile.delete',

  // ── Portal Users ────────────────────────────────────────────────────────────
  PORTAL_USER_VIEW: 'portal_user.view',
  PORTAL_USER_EDIT: 'portal_user.edit',

  // ── Reports ─────────────────────────────────────────────────────────────────
  REPORT_ORDERS: 'report.orders',
  REPORT_EXPORT: 'report.export',

  // ── Dashboards ──────────────────────────────────────────────────────────────
  DASHBOARD_ACCOUNTING: 'dashboard.accounting',
  DASHBOARD_OPERATIONS: 'dashboard.operations',

  // ── Booking Calendar ────────────────────────────────────────────────────────
  BOOKING_CALENDAR_VIEW: 'booking_calendar.view',

  // ── CRM ─────────────────────────────────────────────────────────────────────
  CRM_VIEW: 'crm.view',

  // ── Chat ────────────────────────────────────────────────────────────────────
  CHAT_VIEW: 'chat.view',

  // ── Collab Tasks ────────────────────────────────────────────────────────────
  COLLAB_TASK_VIEW: 'collab_task.view',
  COLLAB_TASK_CREATE: 'collab_task.create',
  COLLAB_TASK_EDIT: 'collab_task.edit',
  COLLAB_TASK_DELETE: 'collab_task.delete',

  // ── Production ──────────────────────────────────────────────────────────────
  PRODUCTION_VIEW: 'production.view',

  // ── Approval Flows ───────────────────────────────────────────────────────────
  APPROVAL_FLOW_VIEW: 'approval_flow.view',
  APPROVAL_FLOW_CREATE: 'approval_flow.create',
  APPROVAL_FLOW_EDIT: 'approval_flow.edit',
  APPROVAL_FLOW_DELETE: 'approval_flow.delete',
  APPROVAL_REQUEST_VIEW: 'approval_request.view',
  APPROVAL_REQUEST_TRIGGER: 'approval_request.trigger',
  APPROVAL_REQUEST_REVIEW: 'approval_request.review',
} as const

export type PrivilegeKey = typeof PRIVILEGES[keyof typeof PRIVILEGES]

// ── Human-readable labels (Spanish) ──────────────────────────────────────────
export const PRIVILEGE_GROUPS: { label: string; privileges: { key: PrivilegeKey; label: string }[] }[] = [
  {
    label: 'Eventos',
    privileges: [
      { key: PRIVILEGES.EVENT_VIEW, label: 'Consultar eventos' },
      { key: PRIVILEGES.EVENT_CREATE, label: 'Crear eventos' },
      { key: PRIVILEGES.EVENT_EDIT_QUOTED, label: 'Editar evento (Cotizado)' },
      { key: PRIVILEGES.EVENT_EDIT_CONFIRMED, label: 'Editar evento (Confirmado)' },
      { key: PRIVILEGES.EVENT_EDIT_IN_EXECUTION, label: 'Editar evento (En Ejecución)' },
      { key: PRIVILEGES.EVENT_CONFIRM, label: 'Confirmar evento' },
      { key: PRIVILEGES.EVENT_EXECUTE, label: 'Pasar a ejecución' },
      { key: PRIVILEGES.EVENT_CLOSE, label: 'Cerrar evento' },
      { key: PRIVILEGES.EVENT_CANCEL, label: 'Cancelar evento' },
      { key: PRIVILEGES.EVENT_DELETE, label: 'Eliminar evento' },
      { key: PRIVILEGES.EVENT_TIMELINE_VIEW, label: 'Ver timeline de evento' },
      { key: PRIVILEGES.EVENT_TIMELINE_EDIT, label: 'Gestionar timeline de evento' },
    ],
  },
  {
    label: 'Clientes',
    privileges: [
      { key: PRIVILEGES.CLIENT_VIEW, label: 'Consultar clientes' },
      { key: PRIVILEGES.CLIENT_CREATE, label: 'Crear clientes' },
      { key: PRIVILEGES.CLIENT_EDIT, label: 'Modificar clientes' },
      { key: PRIVILEGES.CLIENT_DELETE, label: 'Eliminar clientes' },
    ],
  },
  {
    label: 'Órdenes de Servicio',
    privileges: [
      { key: PRIVILEGES.ORDER_VIEW, label: 'Consultar órdenes' },
      { key: PRIVILEGES.ORDER_CREATE, label: 'Crear órdenes' },
      { key: PRIVILEGES.ORDER_EDIT_QUOTED, label: 'Editar orden (Cotizada)' },
      { key: PRIVILEGES.ORDER_EDIT_CONFIRMED, label: 'Editar orden (Confirmada)' },
      { key: PRIVILEGES.ORDER_CONFIRM, label: 'Confirmar orden' },
      { key: PRIVILEGES.ORDER_EXECUTE, label: 'Ejecutar orden' },
      { key: PRIVILEGES.ORDER_INVOICE, label: 'Facturar orden' },
      { key: PRIVILEGES.ORDER_CANCEL, label: 'Cancelar orden' },
      { key: PRIVILEGES.ORDER_DELETE, label: 'Eliminar orden' },
      { key: PRIVILEGES.ORDER_RECORD_PAYMENT, label: 'Registrar pagos' },
      { key: PRIVILEGES.ORDER_ATTACH_INVOICE, label: 'Adjuntar facturas' },
      { key: PRIVILEGES.ORDER_DISCOUNT_ASSIGN, label: 'Asignar descuentos' },
      { key: PRIVILEGES.ORDER_CREATE_CREDIT_NOTE, label: 'Crear notas de crédito' },
    ],
  },
  {
    label: 'Recursos',
    privileges: [
      { key: PRIVILEGES.RESOURCE_VIEW, label: 'Consultar recursos' },
      { key: PRIVILEGES.RESOURCE_CREATE, label: 'Crear recursos' },
      { key: PRIVILEGES.RESOURCE_EDIT, label: 'Modificar recursos' },
      { key: PRIVILEGES.RESOURCE_DELETE, label: 'Eliminar recursos' },
    ],
  },
  {
    label: 'Listas de Precio',
    privileges: [
      { key: PRIVILEGES.PRICE_LIST_VIEW, label: 'Consultar listas de precio' },
      { key: PRIVILEGES.PRICE_LIST_CREATE, label: 'Crear listas de precio' },
      { key: PRIVILEGES.PRICE_LIST_EDIT, label: 'Modificar listas de precio' },
      { key: PRIVILEGES.PRICE_LIST_DELETE, label: 'Eliminar listas de precio' },
    ],
  },
  {
    label: 'Proveedores',
    privileges: [
      { key: PRIVILEGES.SUPPLIER_VIEW, label: 'Consultar proveedores' },
      { key: PRIVILEGES.SUPPLIER_CREATE, label: 'Crear proveedores' },
      { key: PRIVILEGES.SUPPLIER_EDIT, label: 'Modificar proveedores' },
      { key: PRIVILEGES.SUPPLIER_DELETE, label: 'Eliminar proveedores' },
      { key: PRIVILEGES.SUPPLIER_BLOCK, label: 'Bloquear proveedor' },
      { key: PRIVILEGES.SUPPLIER_ACTIVATE, label: 'Activar proveedor' },
    ],
  },
  {
    label: 'Listas de Precios Proveedores',
    privileges: [
      { key: PRIVILEGES.SUPPLIER_PRICE_LIST_VIEW, label: 'Consultar listas proveedor' },
      { key: PRIVILEGES.SUPPLIER_PRICE_LIST_CREATE, label: 'Crear listas proveedor' },
      { key: PRIVILEGES.SUPPLIER_PRICE_LIST_EDIT, label: 'Modificar listas proveedor' },
      { key: PRIVILEGES.SUPPLIER_PRICE_LIST_DELETE, label: 'Eliminar listas proveedor' },
    ],
  },
  {
    label: 'Órdenes de Compra',
    privileges: [
      { key: PRIVILEGES.PURCHASE_ORDER_VIEW, label: 'Consultar órdenes de compra' },
      { key: PRIVILEGES.PURCHASE_ORDER_CREATE, label: 'Crear órdenes de compra' },
      { key: PRIVILEGES.PURCHASE_ORDER_EDIT_DRAFT, label: 'Editar OC (Borrador)' },
      { key: PRIVILEGES.PURCHASE_ORDER_CONFIRM, label: 'Confirmar orden de compra' },
      { key: PRIVILEGES.PURCHASE_ORDER_RECEIVE, label: 'Recibir orden de compra' },
      { key: PRIVILEGES.PURCHASE_ORDER_INVOICE, label: 'Facturar orden de compra' },
      { key: PRIVILEGES.PURCHASE_ORDER_CANCEL, label: 'Cancelar orden de compra' },
      { key: PRIVILEGES.PURCHASE_ORDER_DELETE, label: 'Eliminar orden de compra' },
    ],
  },
  {
    label: 'Almacén',
    privileges: [
      { key: PRIVILEGES.WAREHOUSE_VIEW, label: 'Consultar almacenes' },
      { key: PRIVILEGES.WAREHOUSE_CREATE, label: 'Crear almacenes' },
      { key: PRIVILEGES.WAREHOUSE_EDIT, label: 'Modificar almacenes' },
      { key: PRIVILEGES.WAREHOUSE_DELETE, label: 'Eliminar almacenes' },
      { key: PRIVILEGES.WAREHOUSE_RECEIVE, label: 'Recepción de mercancía' },
      { key: PRIVILEGES.WAREHOUSE_ADJUST, label: 'Ajustar inventario' },
    ],
  },
  {
    label: 'Organizaciones',
    privileges: [
      { key: PRIVILEGES.ORGANIZATION_VIEW, label: 'Consultar organizaciones' },
      { key: PRIVILEGES.ORGANIZATION_CREATE, label: 'Crear organizaciones' },
      { key: PRIVILEGES.ORGANIZATION_EDIT, label: 'Modificar organizaciones' },
    ],
  },
  {
    label: 'Departamentos',
    privileges: [
      { key: PRIVILEGES.DEPARTMENT_VIEW, label: 'Consultar departamentos' },
      { key: PRIVILEGES.DEPARTMENT_CREATE, label: 'Crear departamentos' },
      { key: PRIVILEGES.DEPARTMENT_EDIT, label: 'Modificar departamentos' },
      { key: PRIVILEGES.DEPARTMENT_DELETE, label: 'Eliminar departamentos' },
    ],
  },
  {
    label: 'Contratos',
    privileges: [
      { key: PRIVILEGES.CONTRACT_VIEW, label: 'Consultar contratos' },
      { key: PRIVILEGES.CONTRACT_CREATE, label: 'Crear contratos' },
      { key: PRIVILEGES.CONTRACT_EDIT_EN_FIRMA, label: 'Editar contrato (En Firma)' },
      { key: PRIVILEGES.CONTRACT_SIGN, label: 'Firmar contrato' },
      { key: PRIVILEGES.CONTRACT_CANCEL, label: 'Cancelar contrato' },
      { key: PRIVILEGES.CONTRACT_DELETE, label: 'Eliminar contrato' },
    ],
  },
  {
    label: 'Pagos',
    privileges: [
      { key: PRIVILEGES.PAYMENT_VIEW, label: 'Consultar pagos' },
      { key: PRIVILEGES.PAYMENT_RECORD, label: 'Registrar pagos' },
      { key: PRIVILEGES.PAYMENT_APPROVE, label: 'Aprobar pagos' },
      { key: PRIVILEGES.PAYMENT_CANCEL, label: 'Cancelar pagos' },
    ],
  },
  {
    label: 'Notas de Crédito',
    privileges: [
      { key: PRIVILEGES.CREDIT_NOTE_VIEW, label: 'Consultar notas de crédito' },
      { key: PRIVILEGES.CREDIT_NOTE_CREATE, label: 'Crear notas de crédito' },
      { key: PRIVILEGES.CREDIT_NOTE_CANCEL, label: 'Cancelar notas de crédito' },
    ],
  },
  {
    label: 'Plantillas',
    privileges: [
      { key: PRIVILEGES.TEMPLATE_VIEW, label: 'Consultar plantillas' },
      { key: PRIVILEGES.TEMPLATE_CREATE, label: 'Crear plantillas' },
      { key: PRIVILEGES.TEMPLATE_EDIT, label: 'Modificar plantillas' },
      { key: PRIVILEGES.TEMPLATE_DELETE, label: 'Eliminar plantillas' },
    ],
  },
  {
    label: 'Usuarios',
    privileges: [
      { key: PRIVILEGES.USER_VIEW, label: 'Consultar usuarios' },
      { key: PRIVILEGES.USER_CREATE, label: 'Crear usuarios' },
      { key: PRIVILEGES.USER_EDIT, label: 'Modificar usuarios' },
      { key: PRIVILEGES.USER_DELETE, label: 'Eliminar usuarios' },
    ],
  },
  {
    label: 'Perfiles',
    privileges: [
      { key: PRIVILEGES.PROFILE_VIEW, label: 'Consultar perfiles' },
      { key: PRIVILEGES.PROFILE_CREATE, label: 'Crear perfiles' },
      { key: PRIVILEGES.PROFILE_EDIT, label: 'Modificar perfiles' },
      { key: PRIVILEGES.PROFILE_DELETE, label: 'Eliminar perfiles' },
    ],
  },
  {
    label: 'Usuarios Portal',
    privileges: [
      { key: PRIVILEGES.PORTAL_USER_VIEW, label: 'Consultar usuarios portal' },
      { key: PRIVILEGES.PORTAL_USER_EDIT, label: 'Modificar usuarios portal' },
    ],
  },
  {
    label: 'Reportes',
    privileges: [
      { key: PRIVILEGES.REPORT_ORDERS, label: 'Reporte de órdenes' },
      { key: PRIVILEGES.REPORT_EXPORT, label: 'Exportar reportes' },
    ],
  },
  {
    label: 'Dashboards',
    privileges: [
      { key: PRIVILEGES.DASHBOARD_ACCOUNTING, label: 'Dashboard Contabilidad' },
      { key: PRIVILEGES.DASHBOARD_OPERATIONS, label: 'Dashboard Operaciones' },
    ],
  },
  {
    label: 'Tareas de Colaboración',
    privileges: [
      { key: PRIVILEGES.COLLAB_TASK_VIEW, label: 'Consultar tareas de colaboración' },
      { key: PRIVILEGES.COLLAB_TASK_CREATE, label: 'Crear tareas de colaboración' },
      { key: PRIVILEGES.COLLAB_TASK_EDIT, label: 'Modificar tareas de colaboración' },
      { key: PRIVILEGES.COLLAB_TASK_DELETE, label: 'Eliminar tareas de colaboración' },
    ],
  },
  {
    label: 'Otros',
    privileges: [
      { key: PRIVILEGES.BOOKING_CALENDAR_VIEW, label: 'Calendario de reservas' },
      { key: PRIVILEGES.CRM_VIEW, label: 'CRM' },
      { key: PRIVILEGES.CHAT_VIEW, label: 'Chat / Colabora' },
      { key: PRIVILEGES.PRODUCTION_VIEW, label: 'Producción y costos' },
    ],
  },
  {
    label: 'Flujos de Aprobación',
    privileges: [
      { key: PRIVILEGES.APPROVAL_FLOW_VIEW, label: 'Consultar flujos de aprobación' },
      { key: PRIVILEGES.APPROVAL_FLOW_CREATE, label: 'Crear flujos de aprobación' },
      { key: PRIVILEGES.APPROVAL_FLOW_EDIT, label: 'Modificar flujos de aprobación' },
      { key: PRIVILEGES.APPROVAL_FLOW_DELETE, label: 'Eliminar flujos de aprobación' },
      { key: PRIVILEGES.APPROVAL_REQUEST_VIEW, label: 'Ver solicitudes de aprobación' },
      { key: PRIVILEGES.APPROVAL_REQUEST_TRIGGER, label: 'Iniciar procesos de aprobación' },
      { key: PRIVILEGES.APPROVAL_REQUEST_REVIEW, label: 'Aprobar / Rechazar pasos' },
    ],
  },
]
