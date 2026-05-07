import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, Divider, App } from 'antd'
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = useAuthStore(s => s.setAuth)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const { data } = await authApi.login(values.email, values.password)
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/mis-boletos')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f4eeff 0%, #f8f8f8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6B46C1' }}>IventIA Boletos</div>
          <Text type="secondary">Inicia sesión para ver tus boletos</Text>
        </div>

        <Card style={{ borderRadius: 16, boxShadow: '0 8px 32px rgba(107,70,193,0.10)', border: 'none' }}>
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Ingresa un correo válido' }]}>
              <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder="juan@ejemplo.com" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} placeholder="••••••••" style={{ borderRadius: 8 }} />
            </Form.Item>
            <div style={{ textAlign: 'right', marginTop: -12, marginBottom: 16 }}>
              <Link to="/forgot-password" style={{ color: '#6B46C1', fontSize: 13 }}>¿Olvidaste tu contraseña?</Link>
            </div>
            <Button type="primary" htmlType="submit" block loading={loading}
              style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8, height: 44, fontWeight: 600 }}>
              Iniciar Sesión
            </Button>
          </Form>

          <Divider />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">¿No tienes cuenta? </Text>
            <Link to="/registro" style={{ color: '#6B46C1', fontWeight: 600 }}>Regístrate</Link>
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
