import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { App } from 'antd'
import { playerApi } from '../../api/player'
import { usePlayerStore } from '../../stores/playerStore'

export default function PlayerLoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = usePlayerStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const res = await playerApi.login(email, password)
      const { accessToken, refreshToken, user } = res.data
      setAuth(user, accessToken, refreshToken)
      navigate('/player/tournaments')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">I-FLAG</div>
      <div className="login-subtitle">Portal Jugador</div>

      <div className="login-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input
              type="email"
              className="ant-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@ejemplo.com"
              autoComplete="email"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              className="ant-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={loading} style={btnStyle(loading, 'var(--blue)')}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/player/signup" style={{ color: 'var(--blue)' }}>
            Regístrate con tu código
          </Link>
        </div>
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12 }}>
          <Link to="/spectator" style={{ color: 'var(--text-muted)' }}>
            Ver torneos como espectador
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        <Link to="/" style={{ color: 'var(--text-muted)' }}>← Volver</Link>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'block',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 15,
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
}

function btnStyle(loading: boolean, color: string): React.CSSProperties {
  return {
    background: loading ? 'var(--surface2)' : color,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    transition: 'background 0.2s',
    width: '100%',
  }
}
