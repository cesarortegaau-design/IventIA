import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, Result, message } from 'antd'
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons'
import { authApi } from '../api/auth'

const { Text } = Typography

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onFinish = async (values: { email: string }) => {
    setLoading(true)
    try {
      await authApi.forgotPassword(values.email)
      setSent(true)
    } catch {
      message.error('Ocurrió un error. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f4eeff 0%, #f8f8f8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6B46C1' }}>IventIA Boletos</div>
        </div>

        <Card style={{ borderRadius: 16, boxShadow: '0 8px 32px rgba(107,70,193,0.10)', border: 'none' }}>
          {sent ? (
            <Result
              icon={<MailOutlined style={{ color: '#6B46C1' }} />}
              title="Revisa tu correo"
              subTitle="Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
              extra={
                <Button type="primary" onClick={() => navigate('/login')}
                  style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8 }}>
                  Volver al login
                </Button>
              }
            />
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¿Olvidaste tu contraseña?</div>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Ingresa tu correo y te enviaremos un enlace para restablecerla.
                </Text>
              </div>

              <Form layout="vertical" onFinish={onFinish} size="large">
                <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}>
                  <Input placeholder="juan@ejemplo.com" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}
                  style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8, height: 44, fontWeight: 600 }}>
                  Enviar enlace
                </Button>
              </Form>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link to="/login" style={{ color: '#6B46C1' }}>Volver al login</Link>
              </div>
            </>
          )}
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
