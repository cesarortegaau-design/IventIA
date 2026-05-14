import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { usePlayerStore } from '../stores/playerStore'

export default function ModeSelectorPage() {
  const navigate = useNavigate()
  const refereeToken = useAuthStore((s) => s.accessToken)
  const playerToken = usePlayerStore((s) => s.accessToken)

  useEffect(() => {
    if (refereeToken) navigate('/games', { replace: true })
    else if (playerToken) navigate('/player/tournaments', { replace: true })
  }, [refereeToken, playerToken, navigate])

  return (
    <div className="login-wrap">
      <div className="login-logo">I-FLAG</div>
      <div className="login-subtitle">Fútbol bandera – Selecciona tu modo de acceso</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340 }}>
        <ModeCard
          icon="🎯"
          title="Árbitro"
          subtitle="Control del partido en tiempo real"
          color="var(--green)"
          onClick={() => navigate('/login')}
        />
        <ModeCard
          icon="🏃"
          title="Jugador"
          subtitle="Mi perfil, estadísticas y torneos"
          color="var(--blue)"
          onClick={() => navigate('/player/login')}
        />
        <ModeCard
          icon="👁"
          title="Espectador"
          subtitle="Ver torneos, clasificaciones y marcadores"
          color="var(--orange)"
          onClick={() => navigate('/spectator')}
        />
      </div>
    </div>
  )
}

function ModeCard({
  icon,
  title,
  subtitle,
  color,
  onClick,
}: {
  icon: string
  title: string
  subtitle: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: `2px solid ${color}22`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'all 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = color
        ;(e.currentTarget as HTMLButtonElement).style.background = `${color}11`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${color}22`
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'
      }}
    >
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
      </div>
      <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 18 }}>›</div>
    </button>
  )
}
