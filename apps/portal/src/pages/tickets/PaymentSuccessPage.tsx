import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ticketsPublicApi } from '../../api/tickets'
import { useTicketBuyerAuthStore } from '../../stores/ticketBuyerAuthStore'

const C = {
  bg: '#0a1220', bg1: '#111827', line: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9', textMute: '#94a3b8', accent: '#34d399',
}

const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/public/tickets`
  : '/api/v1/public/tickets'

export default function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { accessToken } = useTicketBuyerAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['order-success', token],
    queryFn: () => ticketsPublicApi.getOrder(token),
    enabled: !!token,
    retry: 3,
    retryDelay: 2000,
  })

  const order = data?.data?.data
  const eventName = order?.ticketEvent?.event?.name ?? 'Evento'
  const pdfUrl = token ? `${apiBase}/orders/${token}/pdf` : ''

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: C.bg1, borderRadius: 16, padding: '48px 40px', maxWidth: 480,
        width: '100%', border: `1px solid ${C.line}`, textAlign: 'center' }}>

        {isLoading ? (
          <div style={{ color: C.textMute }}>Confirmando pago...</div>
        ) : (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h1 style={{ color: C.accent, fontSize: 24, margin: '0 0 8px' }}>¡Pago exitoso!</h1>
            <p style={{ color: C.textMute, fontSize: 14, margin: '0 0 8px' }}>
              Tu boleto para <strong style={{ color: C.text }}>{eventName}</strong> fue confirmado.
            </p>
            <p style={{ color: C.textMute, fontSize: 13, margin: '0 0 32px' }}>
              Recibirás una copia en tu correo electrónico.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {token && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  style={{ background: C.accent, color: '#0a1220', borderRadius: 8, padding: '12px 24px',
                    fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'block' }}>
                  Descargar boleto PDF
                </a>
              )}

              {accessToken ? (
                <Link to="/mis-boletos"
                  style={{ background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 8,
                    padding: '12px 24px', fontSize: 14, color: C.text, textDecoration: 'none', display: 'block' }}>
                  Ver mis boletos
                </Link>
              ) : (
                <Link to="/boletos/register"
                  style={{ background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 8,
                    padding: '12px 24px', fontSize: 14, color: C.text, textDecoration: 'none', display: 'block' }}>
                  Crear cuenta para guardar tu historial
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
