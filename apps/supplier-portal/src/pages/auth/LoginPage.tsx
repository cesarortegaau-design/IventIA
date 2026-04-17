import { useState } from 'react'
import { Form, Input, Button, Card, Typography, App, Tabs, Divider } from 'antd'
import { UserOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

const { Text } = Typography

const PRIMARY = '#0369a1'

export default function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)

  const onLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const { data } = await authApi.login(values.email, values.password)
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/dashboard')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    {
      key: 'login',
      label: 'Ya tengo cuenta',
      children: (
        <Form layout="vertical" onFinish={onLogin} style={{ marginTop: 8 }}>
          <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined />} size="large" placeholder="correo@empresa.com" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} size="large" placeholder="Contraseña" />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: -16, marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ color: PRIMARY }}>¿Olvidaste tu contraseña?</Link>
          </div>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            style={{ background: PRIMARY, borderColor: PRIMARY }}
          >
            Iniciar Sesión
          </Button>
        </Form>
      ),
    },
    {
      key: 'code',
      label: 'Primera vez',
      children: (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Si es tu primera vez, registra tu cuenta con el código de acceso que te proporcionó IventIA.
          </Text>
          <Link to="/register">
            <Button
              type="primary"
              block
              size="large"
              icon={<KeyOutlined />}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
            >
              Registrarme con código de acceso
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <Card style={{ width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 8, color: PRIMARY }}>
        Iniciar Sesión
      </Typography.Title>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 20 }}>
        Portal de Proveedores
      </Text>

      <Tabs defaultActiveKey="login" centered items={tabs} />

      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          © {new Date().getFullYear()} IventIA
        </Text>
      </div>
    </Card>
  )
}
