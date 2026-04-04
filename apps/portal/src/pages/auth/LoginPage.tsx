import { useState } from 'react'
import { Form, Input, Button, Card, Typography, App, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

const { Text } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const { data } = await authApi.login(values.email, values.password)
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/dashboard')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>Iniciar Sesión</Typography.Title>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
          <Input prefix={<UserOutlined />} size="large" placeholder="correo@ejemplo.com" />
        </Form.Item>
        <Form.Item name="password" label="Contraseña" rules={[{ required: true }]}>
          <Input.Password prefix={<LockOutlined />} size="large" placeholder="Contraseña" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Iniciar Sesión
        </Button>
      </Form>
      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">¿Primera vez? </Text>
        <Link to="/register">Regístrate con tu código de acceso</Link>
      </div>
    </Card>
  )
}
