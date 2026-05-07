import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ticketBuyerAuthApi } from '../../api/ticketBuyerAuth'

const C = {
  bg1: '#111827', line: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9', textMute: '#94a3b8', accent: '#34d399',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: `1px solid ${C.line}`,
  borderRadius: 8, color: C.text, padding: '10px 14px', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}

export default function ResetPasswordBuyerPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div style={{ background: C.bg1, borderRadius: 12, padding: 32, width: 400,
        border: `1px solid ${C.line}`, textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Enlace inválido o expirado.</p>
        <Link to="/boletos/forgot-password" style={{ color: C.accent, fontSize: 13 }}>
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.password || form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres'); return
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden'); return
    }
    setLoading(true)
    setError('')
    try {
      await ticketBuyerAuthApi.resetPassword(token, form.password)
      navigate('/boletos/login')
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Token inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: C.bg1, borderRadius: 12, padding: 32, width: 400, border: `1px solid ${C.line}` }}>
      <h2 style={{ color: C.text, margin: '0 0 24px', fontSize: 20 }}>Nueva Contraseña</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
            Nueva contraseña
          </label>
          <input
            style={inputStyle} type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
            Confirmar contraseña
          </label>
          <input
            style={inputStyle} type="password" value={form.confirmPassword}
            onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
            placeholder="••••••••"
          />
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
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
