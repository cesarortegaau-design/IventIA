/**
 * RsvpPage — public guest-facing page
 * Route: /rsvp/:eventId/:guestId
 *
 * Shows the invitation design and lets the guest confirm or decline attendance.
 * No authentication required.
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

type RsvpStatus = 'idle' | 'loading' | 'confirmed' | 'declined' | 'already' | 'error'

interface InvitationData {
  event: {
    id: string
    name: string
    eventStart: string | null
    venueLocation: string | null
  }
  diseno: {
    titulo: string
    subtitulo: string
    fechaTexto: string
    horaTexto: string
    lugarTexto: string
    lugarDireccion: string
    dresscode: string
    notasAdicionales: string
    imagenUrl: string
    incluirMapa: boolean
    modo: 'rsvp' | 'boleto'
  }
  guest: {
    id: string
    nombre: string
    numPersonas: number
    mesa?: string
    rsvp: 'pendiente' | 'confirmado' | 'declinado'
  } | null
}

export default function RsvpPage() {
  const { eventId, guestId } = useParams<{ eventId: string; guestId: string }>()

  const [data, setData] = useState<InvitationData | null>(null)
  const [fetchStatus, setFetchStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('idle')

  useEffect(() => {
    if (!eventId || !guestId) return
    axios
      .get(`${API_BASE}/public/invitacion/${eventId}?guestId=${guestId}`)
      .then(r => {
        setData(r.data)
        // If already answered, show the result directly
        const existing = r.data.guest?.rsvp
        if (existing === 'confirmado') setRsvpStatus('already')
        setFetchStatus('ready')
      })
      .catch(() => setFetchStatus('error'))
  }, [eventId, guestId])

  const respond = async (respuesta: 'confirmado' | 'declinado') => {
    if (!eventId || !guestId) return
    setRsvpStatus('loading')
    try {
      await axios.post(`${API_BASE}/public/invitacion/${eventId}/rsvp/${guestId}`, { respuesta })
      setRsvpStatus(respuesta === 'confirmado' ? 'confirmed' : 'declined')
    } catch {
      setRsvpStatus('error')
    }
  }

  // ── Colors ──────────────────────────────────────────────────────────────────
  const primary   = '#7C3AED'
  const secondary = '#EC4899'
  const gradBg    = `linear-gradient(160deg, ${primary} 0%, ${secondary} 100%)`

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (fetchStatus === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: gradBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <p style={{ fontSize: 16, opacity: 0.85 }}>Cargando tu invitación…</p>
        </div>
      </div>
    )
  }

  if (fetchStatus === 'error' || !data) {
    return (
      <div style={{ minHeight: '100vh', background: gradBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Invitación no encontrada</h2>
          <p style={{ color: '#888', fontSize: 14 }}>Este enlace no es válido o ya expiró.</p>
        </div>
      </div>
    )
  }

  const { event, diseno, guest } = data
  const isBoleto = diseno.modo === 'boleto'
  const eventName = diseno.titulo || event.name

  // ── Post-response screens ────────────────────────────────────────────────────
  if (rsvpStatus === 'confirmed' || rsvpStatus === 'already') {
    return (
      <div style={{ minHeight: '100vh', background: gradBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '48px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: primary, marginBottom: 12 }}>
            {isBoleto ? '¡Boleto confirmado!' : '¡Asistencia confirmada!'}
          </h2>
          <p style={{ color: '#555', fontSize: 15, marginBottom: 8 }}>
            {guest ? `Hola ${guest.nombre},` : ''}
          </p>
          <p style={{ color: '#555', fontSize: 15, marginBottom: 24 }}>
            {isBoleto
              ? 'Tu boleto ha sido registrado. Te veremos en el evento.'
              : 'Tu asistencia ha sido registrada. ¡Te esperamos!'}
          </p>
          {guest && guest.numPersonas > 1 && (
            <div style={{
              background: '#F5F3FF', borderRadius: 12, padding: '12px 20px',
              marginBottom: 24, display: 'inline-block',
            }}>
              <span style={{ color: primary, fontWeight: 700, fontSize: 15 }}>
                👥 {guest.numPersonas} lugares reservados
              </span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #F0EBFF', paddingTop: 20, textAlign: 'left' }}>
            {diseno.fechaTexto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: '#555', fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>📅</span> {diseno.fechaTexto} {diseno.horaTexto && `· ${diseno.horaTexto}`}
              </div>
            )}
            {diseno.lugarTexto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#555', fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>📍</span> {diseno.lugarTexto}
              </div>
            )}
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: '#bbb' }}>IventIA · Gestión de eventos</p>
        </div>
      </div>
    )
  }

  if (rsvpStatus === 'declined') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, #374151, #6B7280)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '48px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>💌</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#374151', marginBottom: 12 }}>Gracias por avisarnos</h2>
          <p style={{ color: '#666', fontSize: 15 }}>
            {guest ? `${guest.nombre}, l` : 'L'}amentamos que no puedas asistir. ¡Esperamos verte en otro momento!
          </p>
          <p style={{ marginTop: 32, fontSize: 12, color: '#bbb' }}>IventIA · Gestión de eventos</p>
        </div>
      </div>
    )
  }

  if (rsvpStatus === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: gradBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Error al procesar</h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>No pudimos registrar tu respuesta. Intenta de nuevo.</p>
          <button
            onClick={() => setRsvpStatus('idle')}
            style={{ background: primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ── Main invitation view ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F5F3FF', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Hero / Cover */}
      <div style={{
        background: diseno.imagenUrl ? `url(${diseno.imagenUrl}) center/cover no-repeat` : gradBg,
        minHeight: diseno.imagenUrl ? 280 : 200,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 24px 32px',
        position: 'relative',
      }}>
        {/* Overlay for image readability */}
        {diseno.imagenUrl && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)' }} />
        )}
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: '#fff',
            margin: 0, textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            {eventName}
          </h1>
          {diseno.subtitulo && (
            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 15, margin: '8px 0 0', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
              {diseno.subtitulo}
            </p>
          )}
        </div>
      </div>

      {/* Main card */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 48px' }}>

        {/* Guest greeting */}
        {guest && (
          <div style={{
            background: '#fff', borderRadius: 20, padding: '20px 24px',
            margin: '-20px 0 16px', boxShadow: '0 4px 20px rgba(124,58,237,0.1)',
            border: '1px solid #EDE9FE',
          }}>
            <p style={{ margin: 0, color: '#555', fontSize: 15 }}>
              Hola <strong style={{ color: primary }}>{guest.nombre}</strong>,
            </p>
            <p style={{ margin: '6px 0 0', color: '#333', fontSize: 15 }}>
              {isBoleto
                ? 'Tienes reservado tu lugar en este evento especial.'
                : 'Has sido invitado/a a un evento especial. Por favor confirma tu asistencia.'}
            </p>
            {guest.numPersonas > 1 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                background: '#F5F3FF', borderRadius: 20, padding: '4px 14px',
                color: primary, fontWeight: 700, fontSize: 13,
              }}>
                👥 {guest.numPersonas} lugares
              </div>
            )}
          </div>
        )}

        {/* Event details card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '24px',
          marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid #EDE9FE',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Detalles del evento
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(diseno.fechaTexto || diseno.horaTexto) && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>📅</span>
                <div>
                  {diseno.fechaTexto && <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{diseno.fechaTexto}</div>}
                  {diseno.horaTexto && <div style={{ fontSize: 14, color: '#666', marginTop: 2 }}>{diseno.horaTexto}</div>}
                </div>
              </div>
            )}
            {diseno.lugarTexto && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>📍</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{diseno.lugarTexto}</div>
                  {diseno.lugarDireccion && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{diseno.lugarDireccion}</div>}
                </div>
              </div>
            )}
            {diseno.dresscode && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>👗</span>
                <div>
                  <div style={{ fontSize: 12, color: '#aaa', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Dress code</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginTop: 2 }}>{diseno.dresscode}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notas adicionales */}
        {diseno.notasAdicionales && (
          <div style={{
            background: '#FFFBEB', borderRadius: 16, padding: '16px 20px',
            marginBottom: 16, border: '1px solid #FDE68A',
          }}>
            <p style={{ margin: 0, color: '#92400E', fontSize: 14, lineHeight: 1.6 }}>
              📝 {diseno.notasAdicionales}
            </p>
          </div>
        )}

        {/* ── RSVP / Ticket CTA ── */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '28px 24px',
          boxShadow: '0 4px 20px rgba(124,58,237,0.12)',
          border: '1px solid #EDE9FE', textAlign: 'center',
        }}>
          {isBoleto ? (
            <>
              <p style={{ color: '#555', fontSize: 15, marginBottom: 24 }}>
                Confirma tu asistencia para registrar tu boleto de entrada.
              </p>
              <button
                onClick={() => respond('confirmado')}
                disabled={rsvpStatus === 'loading'}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14,
                  background: rsvpStatus === 'loading' ? '#C4B5FD' : `linear-gradient(135deg, ${primary}, ${secondary})`,
                  color: '#fff', border: 'none', fontSize: 17, fontWeight: 800,
                  cursor: rsvpStatus === 'loading' ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                  transition: 'opacity 0.2s',
                  letterSpacing: '-0.01em',
                }}
              >
                {rsvpStatus === 'loading' ? 'Procesando…' : '🎟️ Confirmar y recibir boleto'}
              </button>
            </>
          ) : (
            <>
              <p style={{ color: '#555', fontSize: 15, marginBottom: 24 }}>
                ¿Podrás acompañarnos?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => respond('confirmado')}
                  disabled={rsvpStatus === 'loading'}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 14,
                    background: rsvpStatus === 'loading' ? '#C4B5FD' : `linear-gradient(135deg, ${primary}, ${secondary})`,
                    color: '#fff', border: 'none', fontSize: 17, fontWeight: 800,
                    cursor: rsvpStatus === 'loading' ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                    transition: 'opacity 0.2s',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {rsvpStatus === 'loading' ? 'Procesando…' : '✅ Confirmar asistencia →'}
                </button>
                <button
                  onClick={() => respond('declinado')}
                  disabled={rsvpStatus === 'loading'}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 14,
                    background: 'transparent', color: '#9CA3AF',
                    border: '1px solid #E5E7EB', fontSize: 15, fontWeight: 600,
                    cursor: rsvpStatus === 'loading' ? 'not-allowed' : 'pointer',
                  }}
                >
                  No podré asistir
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: '#C4B5FD' }}>
          IventIA · Gestión de eventos
        </p>
      </div>
    </div>
  )
}
