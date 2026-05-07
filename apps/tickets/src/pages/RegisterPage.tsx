import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, Divider, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const captchaRef = useRef<HCaptcha>(null)
  const [hCaptchaToken, setHCaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaError, setCaptchaError] = useState(false)

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY

  const onFinish = async (values: any) => {
    if (siteKey && !hCaptchaToken) { setCaptchaError(true); return }
    setCaptchaError(false)
    setLoading(true)
    try {
      const { data } = await authApi.register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        hCaptchaToken: hCaptchaToken ?? undefined,
      })
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/mis-boletos')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Error al registrarse')
      captchaRef.current?.resetCaptcha()
      setHCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f4eeff 0%, #f8f8f8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6B46C1' }}>IventIA Boletos</div>
          <Text type="secondary">Crea tu cuenta para guardar tus boletos</Text>
        </div>

        <Card style={{ borderRadius: 16, boxShadow: '0 8px 32px rgba(107,70,193,0.10)', border: 'none' }}>
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="firstName" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
                  <Input placeholder="Juan" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lastName" label="Apellido" rules={[{ required: true, message: 'Requerido' }]}>
                  <Input placeholder="Pérez" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}>
              <Input placeholder="juan@ejemplo.com" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item name="phone" label="Teléfono (opcional)">
              <Input placeholder="+52 55 1234 5678" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}>
              <Input.Password placeholder="Mínimo 8 caracteres" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirmar contraseña"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Confirma tu contraseña' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve()
                    return Promise.reject(new Error('Las contraseñas no coinciden'))
                  },
                }),
              ]}
            >
              <Input.Password placeholder="••••••••" style={{ borderRadius: 8 }} />
            </Form.Item>

            {siteKey && (
              <Form.Item>
                <HCaptcha
                  ref={captchaRef}
                  sitekey={siteKey}
                  onVerify={(token) => { setHCaptchaToken(token); setCaptchaError(false) }}
                  onExpire={() => setHCaptchaToken(null)}
                />
                {captchaError && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>Completa la verificación de seguridad</div>}
              </Form.Item>
            )}

            <Button type="primary" htmlType="submit" block loading={loading}
              style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8, height: 44, fontWeight: 600 }}>
              Crear Cuenta
            </Button>
          </Form>

          <Divider />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">¿Ya tienes cuenta? </Text>
            <Link to="/login" style={{ color: '#6B46C1', fontWeight: 600 }}>Iniciar sesión</Link>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ color: '#6B46C1' }}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}
