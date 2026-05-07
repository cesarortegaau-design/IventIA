import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
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

interface FormState {
  firstName: string; lastName: string; email: string
  phone: string; password: string; confirmPassword: string
}

export default function RegisterBuyerPage() {
  const navigate = useNavigate()
  const setAuth = useTicketBuyerAuthStore(s => s.setAuth)
  const captchaRef = useRef<HCaptcha>(null)

  const [form, setForm] = useState<FormState>({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  })
  const [hCaptchaToken, setHCaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<FormState & { captcha: string; general: string }>>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!form.firstName.trim()) e.firstName = 'Requerido'
    if (!form.lastName.trim()) e.lastName = 'Requerido'
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Correo inválido'
    if (!form.password || form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY
    if (siteKey && !hCaptchaToken) e.captcha = 'Completa la verificación de seguridad'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const { data } = await ticketBuyerAuthApi.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        hCaptchaToken: hCaptchaToken ?? undefined,
      })
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/mis-boletos')
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.error?.message ?? 'Error al registrarse' })
      captchaRef.current?.resetCaptcha()
      setHCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  const field = (
    key: keyof FormState,
    label: string,
    type = 'text',
    placeholder = '',
  ) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        style={{ ...inputStyle, borderColor: errors[key] ? '#ef4444' : C.line }}
        type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
      />
      {errors[key] && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors[key]}</div>}
    </div>
  )

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY

  return (
    <div style={{ background: C.bg1, borderRadius: 12, padding: 32, width: 420, border: `1px solid ${C.line}` }}>
      <h2 style={{ color: C.text, margin: '0 0 24px', fontSize: 20 }}>Crear Cuenta</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('firstName', 'Nombre *', 'text', 'Juan')}
          {field('lastName', 'Apellido *', 'text', 'Pérez')}
        </div>
        {field('email', 'Correo electrónico *', 'email', 'juan@ejemplo.com')}
        {field('phone', 'Teléfono (opcional)', 'tel', '+52 55 1234 5678')}
        {field('password', 'Contraseña *', 'password', 'Mínimo 8 caracteres')}
        {field('confirmPassword', 'Confirmar contraseña *', 'password', '••••••••')}

        {siteKey && (
          <div style={{ marginBottom: 16 }}>
            <HCaptcha
              ref={captchaRef}
              sitekey={siteKey}
              theme="dark"
              onVerify={(token) => { setHCaptchaToken(token); setErrors(e => ({ ...e, captcha: undefined })) }}
              onExpire={() => setHCaptchaToken(null)}
            />
            {errors.captcha && (
              <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.captcha}</div>
            )}
          </div>
        )}

        {errors.general && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
            {errors.general}
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
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: C.textMute }}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/boletos/login" style={{ color: C.accent, textDecoration: 'none' }}>
          Iniciar sesión
        </Link>
      </div>
    </div>
  )
}
