import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { App } from 'antd'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = useAuthStore(s => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const { accessToken, user } = res.data
      if (user.role !== 'ADMIN') {
        message.error('Se requiere perfil de Administrador para acceder a I-Flag')
        return
      }
      setAuth(user, accessToken)
      navigate('/games')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">I-FLAG</div>
      <div className="login-subtitle">Sistema de control de partido</div>

      <div className="login-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Correo electrónico
            </label>
            <input
              type="email"
              className="ant-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              autoComplete="email"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 15 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              className="ant-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 15 }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#1a472a' : 'var(--green)',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              padding: '14px',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          ¿Eres jugador?{' '}
          <Link to="/player/signup" style={{ color: 'var(--green)', fontWeight: 600 }}>
            Regístrate
          </Link>
          {' '}o{' '}
          <Link to="/player/login" style={{ color: 'var(--green)' }}>
            Inicia sesión
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        <Link to="/" style={{ color: 'var(--text-muted)' }}>← Volver</Link>
      </div>
    </div>
  )
}
