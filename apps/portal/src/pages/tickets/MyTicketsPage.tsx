import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { myTicketsApi } from '../../api/myTickets'
import { useTicketBuyerAuthStore } from '../../stores/ticketBuyerAuthStore'

const C = {
  bg: '#0a1220', bg1: '#111827', bg2: '#1f2937', bg3: '#374151',
  text: '#f1f5f9', textMute: '#94a3b8', line: 'rgba(255,255,255,0.08)',
  accent: '#34d399',
}

const STATUS_COLOR: Record<string, string> = {
  PAID: '#16a34a', PENDING: '#d97706', CANCELLED: '#ef4444', REFUNDED: '#6b7280',
}
const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado', PENDING: 'Pendiente', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado',
}

export default function MyTicketsPage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useTicketBuyerAuthStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-ticket-orders'],
    queryFn: () => myTicketsApi.listOrders(),
  })

  const orders: any[] = data?.data?.data ?? []

  if (isLoading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.textMute }}>Cargando tus boletos...</div>
      </div>
    )
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Header */}
      <div style={{ background: C.bg1, borderBottom: `1px solid ${C.line}`, padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>Mis Boletos</div>
          <div style={{ fontSize: 13, color: C.textMute }}>
            {user?.firstName} {user?.lastName}
          </div>
        </div>
        <button
          onClick={() => { clearAuth(); navigate('/boletos/login') }}
          style={{ background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 8,
            color: C.textMute, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
        >
          Cerrar sesión
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        {error ? (
          <div style={{ textAlign: 'center', color: '#ef4444' }}>
            Error al cargar boletos. <button onClick={() => window.location.reload()}
              style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
              Reintentar
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎟️</div>
            <div style={{ fontSize: 18, color: C.text, marginBottom: 8 }}>Aún no tienes boletos</div>
            <div style={{ color: C.textMute, marginBottom: 24, fontSize: 13 }}>
              Tus compras aparecerán aquí una vez que sean confirmadas.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map((order: any) => {
              const event = order.ticketEvent?.event
              const statusColor = STATUS_COLOR[order.status] ?? '#6b7280'
              const statusLabel = STATUS_LABEL[order.status] ?? order.status

              return (
                <div key={order.id} style={{
                  background: C.bg1, borderRadius: 12, border: `1px solid ${C.line}`,
                  overflow: 'hidden',
                }}>
                  {/* Event image strip */}
                  {order.ticketEvent?.imageUrl && (
                    <div style={{ height: 120, overflow: 'hidden' }}>
                      <img src={order.ticketEvent.imageUrl} alt={event?.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                          {event?.name ?? 'Evento'}
                        </div>
                        {event?.eventStart && (
                          <div style={{ fontSize: 13, color: C.textMute, marginBottom: 4 }}>
                            {new Date(event.eventStart).toLocaleDateString('es-MX', {
                              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                          </div>
                        )}
                        {event?.venueLocation && (
                          <div style={{ fontSize: 12, color: C.textMute }}>{event.venueLocation}</div>
                        )}
                      </div>
                      <div style={{
                        background: `${statusColor}22`, border: `1px solid ${statusColor}`,
                        borderRadius: 20, padding: '4px 12px', fontSize: 12, color: statusColor,
                        whiteSpace: 'nowrap',
                      }}>
                        {statusLabel}
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ marginTop: 16, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                          fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: C.textMute }}>
                            {item.section?.name}
                            {item.seat ? ` — Asiento ${item.seat.row}${item.seat.number}` : ''}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                          </span>
                          <span>${(Number(item.lineTotal)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700,
                        fontSize: 14, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                        <span>Total</span>
                        <span style={{ color: C.accent }}>
                          ${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {order.status === 'PAID' && (
                      <div style={{ marginTop: 16 }}>
                        <a
                          href={myTicketsApi.pdfUrl(order.token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block', background: C.accent, color: '#0a1220',
                            borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Descargar boleto PDF
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
