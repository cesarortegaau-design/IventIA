import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ticketBuyerAuthApi } from '../../api/ticketBuyerAuth'
import { useTicketBuyerAuthStore } from '../../stores/ticketBuyerAuthStore'

const C = {
  bg1: '#111827', bg2: '#1f2937', line: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9', textMute: '#94a3b8', accent: '#34d399',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: `1px solid ${C.line}`,
  borderRadius: 8, color: C.text, padding: '10px 14px', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}

export default function LoginBuyerPage() {
  const navigate = useNavigate()
  const setAuth = useTicketBuyerAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError('Completa todos los campos'); return }
    setLoading(true)
    try {
      const { data } = await ticketBuyerAuthApi.login(form.email, form.password)
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/mis-boletos')
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: C.bg1, borderRadius: 12, padding: 32, width: 400, border: `1px solid ${C.line}` }}>
      <h2 style={{ color: C.text, margin: '0 0 24px', fontSize: 20 }}>Iniciar Sesión</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
            Correo electrónico
          </label>
          <input
            style={inputStyle} type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="juan@ejemplo.com"
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
            Contraseña
          </label>
          <input
            style={inputStyle} type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
          />
        </div>

        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <Link to="/boletos/forgot-password"
            style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="submit" disabled={loading}
          style={{
            width: '100%', background: C.accent, color: '#0a1220', border: 'none',
            borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: C.textMute }}>
        ¿No tienes cuenta?{' '}
        <Link to="/boletos/register" style={{ color: C.accent, textDecoration: 'none' }}>
          Regístrate
        </Link>
      </div>
    </div>
  )
}
