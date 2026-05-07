import { useState } from 'react'
import { Link } from 'react-router-dom'
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

export default function ForgotPasswordBuyerPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Ingresa tu correo'); return }
    setLoading(true)
    setError('')
    try {
      await ticketBuyerAuthApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Ocurrió un error. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: C.bg1, borderRadius: 12, padding: 32, width: 400, border: `1px solid ${C.line}` }}>
      <h2 style={{ color: C.text, margin: '0 0 8px', fontSize: 20 }}>¿Olvidaste tu contraseña?</h2>
      <p style={{ color: C.textMute, fontSize: 13, margin: '0 0 24px' }}>
        Ingresa tu correo y te enviaremos un enlace para restablecerla.
      </p>

      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <p style={{ color: C.text, fontSize: 14 }}>
            Si el correo está registrado, recibirás un enlace en breve.
          </p>
          <Link to="/boletos/login" style={{ color: C.accent, fontSize: 13 }}>
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
              Correo electrónico
            </label>
            <input
              style={inputStyle} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="juan@ejemplo.com"
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
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: C.textMute }}>
            <Link to="/boletos/login" style={{ color: C.accent, textDecoration: 'none' }}>
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
