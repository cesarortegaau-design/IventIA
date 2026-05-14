import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { playerApi } from '../../api/player'
import { usePlayerStore } from '../../stores/playerStore'

const catColors: Record<string, string> = {
  FEMENIL: '#e91e63',
  VARONIL: '#2196f3',
  MIXTO: '#7b1fa2',
}
const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }

const PAY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pago pendiente',
  PAID: 'Pagado',
}

export default function PlayerTournamentsPage() {
  const navigate = useNavigate()
  const { user, clearAuth } = usePlayerStore()

  const { data: meData, isLoading } = useQuery({
    queryKey: ['player-me'],
    queryFn: playerApi.getMe,
  })

  const me = meData?.data

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.04em' }}>
            MIS TORNEOS
          </div>
          {user && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {user.firstName} {user.lastName}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            to="/player/profile"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              color: 'var(--text)',
              textDecoration: 'none',
            }}
          >
            Mi perfil
          </Link>
          <button
            onClick={() => { clearAuth(); navigate('/') }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        {isLoading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 60, fontSize: 14 }}>
            Cargando...
          </div>
        ) : !me?.events?.length ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏈</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No estás inscrito en ningún torneo.</div>
            <div style={{ marginTop: 16 }}>
              <Link to="/player/signup" style={{ color: 'var(--blue)', fontSize: 13 }}>
                Registrarte con un código →
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {me.events.map((ev: any) => {
              const category = ev.playerCategory ?? ev.accessCode?.category
              const payStatus = ev.paymentStatus ?? 'PENDING'
              return (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/player/tournaments/${ev.eventId}`)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
                        {ev.event?.name}
                      </div>
                      {category && (
                        <span
                          style={{
                            background: `${catColors[category]}22`,
                            color: catColors[category],
                            border: `1px solid ${catColors[category]}44`,
                            borderRadius: 20,
                            padding: '2px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {catLabels[category] ?? category}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 12 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: payStatus === 'PAID' ? 'var(--green)' : 'var(--orange)',
                        }}
                      >
                        {PAY_STATUS_LABELS[payStatus] ?? payStatus}
                      </div>
                      <div style={{ fontSize: 20, marginTop: 4, color: 'var(--text-muted)' }}>›</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
