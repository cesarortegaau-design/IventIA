import { Timeline, Spin, Empty } from 'antd'
import dayjs from 'dayjs'

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripción',
  status: 'Estado',
  paymentStatus: 'Estado de Pago',
  clientId: 'Cliente',
  billingClientId: 'Cliente Facturación',
  standId: 'Stand',
  organizacionId: 'Organización',
  priceListId: 'Lista de Precios',
  startDate: 'Fecha Inicio',
  endDate: 'Fecha Fin',
  notes: 'Notas',
  quantity: 'Cantidad',
  unitPrice: 'Precio Unitario',
  lineTotal: 'Total Línea',
  discountPct: 'Descuento %',
  observations: 'Observaciones',
  actualQuantity: 'Cantidad Real',
  actualDiscountPct: 'Descuento Real %',
  actualLineTotal: 'Total Real',
  isActive: 'Activo',
  code: 'Código',
  type: 'Tipo',
  warehouseId: 'Almacén',
  resourceId: 'Recurso',
  supplierId: 'Proveedor',
  totalAmount: 'Monto Total',
  paidAmount: 'Monto Pagado',
  dueDate: 'Fecha Vencimiento',
  eventId: 'Evento',
  taxAmount: 'IVA',
  subtotal: 'Subtotal',
  total: 'Total',
  departmentId: 'Departamento',
  email: 'Email',
  phone: 'Teléfono',
  address: 'Dirección',
  city: 'Ciudad',
  country: 'País',
  rfc: 'RFC',
  companyName: 'Empresa',
  firstName: 'Nombre',
  lastName: 'Apellido',
  role: 'Rol',
  isCreditNote: 'Nota de Crédito',
  originalOrderId: 'Orden Original',
  contractId: 'Contrato',
  requiredDeliveryDate: 'Fecha Entrega Requerida',
  deliveryLocation: 'Lugar de Entrega',
  taxRate: 'Tasa de Impuesto',
  currency: 'Moneda',
  pricingTier: 'Nivel de Precio',
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

export default function AuditTimeline({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
  }

  if (!data || data.length === 0) {
    return <Empty description="Sin registros de auditoría" style={{ marginTop: 32 }} />
  }

  return (
    <Timeline
      style={{ marginTop: 16 }}
      items={data.map((log: any) => ({
        color: log.action === 'CREATE' ? 'green' : log.action === 'DELETE' ? 'red' : log.action === 'TRANSFER' ? 'purple' : 'blue',
        children: (
          <div>
            <div style={{ fontWeight: 600 }}>
              {log.action === 'CREATE' ? 'Creado' : log.action === 'DELETE' ? 'Eliminado' : log.action === 'TRANSFER' ? 'Transferencia' : 'Modificado'}
              {' · '}
              <span style={{ fontWeight: 400, color: '#64748b', fontSize: 12 }}>
                {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                {' · '}
                {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema'}
              </span>
            </div>
            {(log.action === 'UPDATE' || log.action === 'TRANSFER') && log.oldValues && log.newValues && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {Object.keys(log.newValues as Record<string, any>)
                  .filter(k => (log.oldValues as any)[k] !== (log.newValues as any)[k])
                  .map(k => (
                    <div key={k}>
                      <span style={{ fontWeight: 500 }}>{fieldLabel(k)}:</span>{' '}
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{String((log.oldValues as any)[k]) || '(vacío)'}</span>
                      {' → '}
                      <span style={{ fontWeight: 500 }}>{String((log.newValues as any)[k]) || '(vacío)'}</span>
                    </div>
                  ))}
              </div>
            )}
            {log.action === 'CREATE' && log.newValues && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {Object.entries(log.newValues as Record<string, any>)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k}><span style={{ fontWeight: 500 }}>{fieldLabel(k)}:</span> {String(v)}</div>
                  ))}
              </div>
            )}
            {log.action === 'DELETE' && log.oldValues && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {Object.entries(log.oldValues as Record<string, any>)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k}><span style={{ fontWeight: 500 }}>{fieldLabel(k)}:</span> {String(v)}</div>
                  ))}
              </div>
            )}
          </div>
        ),
      }))}
    />
  )
}
