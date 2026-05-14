import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { App } from 'antd'
import { playerApi } from '../../api/player'
import { usePlayerStore } from '../../stores/playerStore'

type Step = 'code' | 'register'

export default function PlayerSignupPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = usePlayerStore((s) => s.setAuth)

  const [step, setStep] = useState<Step>('code')
  const [codeInput, setCodeInput] = useState('')
  const [codeInfo, setCodeInfo] = useState<any>(null)
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' })
  const [loading, setLoading] = useState(false)

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!codeInput.trim()) return
    setLoading(true)
    try {
      const res = await playerApi.verifyCode(codeInput.trim())
      setCodeInfo(res.data)
      setStep('register')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      message.error('Completa todos los campos requeridos')
      return
    }
    setLoading(true)
    try {
      const res = await playerApi.signup({
        code: codeInput.trim(),
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      })
      const { accessToken, refreshToken, user } = res.data
      setAuth(user, accessToken, refreshToken)
      message.success(`¡Bienvenido, ${user.firstName}!`)
      navigate('/player/tournaments')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const catColors: Record<string, string> = { FEMENIL: '#e91e63', VARONIL: '#2196f3', MIXTO: '#7b1fa2' }
  const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }

  return (
    <div className="login-wrap">
      <div className="login-logo">I-FLAG</div>
      <div className="login-subtitle">Registro Jugador</div>

      <div className="login-card">
        {step === 'code' ? (
          <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Código de equipo</label>
              <input
                type="text"
                className="ant-input"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Ej: ABCD1234"
                maxLength={8}
                style={{ ...inputStyle, textAlign: 'center', fontSize: 20, letterSpacing: '0.2em', fontWeight: 700 }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                Tu capitán o coordinador te proporcionará este código.
              </div>
            </div>
            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Verificando...' : 'Verificar Código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Code info summary */}
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                {codeInfo.event?.name}
              </div>
              {codeInfo.team && (
                <div style={{ color: 'var(--text-muted)' }}>
                  Equipo: <span style={{ color: 'var(--text)' }}>{codeInfo.team.name}</span>
                </div>
              )}
              {codeInfo.category && (
                <div style={{ color: 'var(--text-muted)' }}>
                  Categoría:{' '}
                  <span style={{ color: catColors[codeInfo.category] ?? 'var(--text)', fontWeight: 600 }}>
                    {catLabels[codeInfo.category] ?? codeInfo.category}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  type="text"
                  className="ant-input"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Juan"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Apellido *</label>
                <input
                  type="text"
                  className="ant-input"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="García"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Correo electrónico *</label>
              <input
                type="email"
                className="ant-input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jugador@ejemplo.com"
                autoComplete="email"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Contraseña (mín. 6 caracteres) *</label>
              <input
                type="password"
                className="ant-input"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Teléfono (opcional)</label>
              <input
                type="tel"
                className="ant-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+52 55 0000 0000"
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </button>

            <button
              type="button"
              onClick={() => setStep('code')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}
            >
              ← Cambiar código
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/player/login" style={{ color: 'var(--blue)' }}>
            Iniciar sesión
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
  fontSize: 11,
  color: 'var(--text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'block',
  marginBottom: 5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  fontSize: 14,
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
}

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    background: loading ? 'var(--surface2)' : 'var(--blue)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    transition: 'background 0.2s',
    width: '100%',
  }
}
