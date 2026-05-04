import { Tag } from 'antd'

const statusMap: Record<string, { color: string; label?: string }> = {
  // OS
  draft: { color: 'default', label: 'Borrador' },
  in_review: { color: 'processing', label: 'En revisión' },
  approved: { color: 'success', label: 'Aprobada' },
  rejected: { color: 'error', label: 'Rechazada' },
  closed: { color: 'purple', label: 'Cerrada' },
  // OC
  sent: { color: 'processing', label: 'Enviada' },
  confirmed: { color: 'success', label: 'Confirmada' },
  partially_received: { color: 'warning', label: 'Recibida parcial' },
  fully_received: { color: 'success', label: 'Recibida total' },
  cancelled: { color: 'error', label: 'Anulada' },
  // Genérico
  active: { color: 'success', label: 'Activo' },
  inactive: { color: 'default', label: 'Inactivo' },
  suspended: { color: 'error', label: 'Suspendido' },
  prospect: { color: 'warning', label: 'Prospecto' },
  pending_activation: { color: 'warning', label: 'Pendiente activación' },
  archived: { color: 'default', label: 'Archivada' },
}

export function StatusTag({ status }: { status: string }) {
  const cfg = statusMap[status] ?? { color: 'default', label: status }
  return <Tag color={cfg.color}>{cfg.label}</Tag>
}
