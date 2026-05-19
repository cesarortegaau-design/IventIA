import { Form, Input, Button, Typography, Alert, Card } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

const { Title, Text } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.login(values.email, values.password)
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken)
      navigate('/dashboard')
    } catch (e: any) {
      setError(
        e.response?.data?.error?.message || 'Credenciales incorrectas'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #1E1040 0%, #2D1B69 40%, #7C3AED 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background:
                'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              marginBottom: 12,
              boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            }}
          >
            P
          </div>
          <Title
            level={3}
            style={{
              color: '#fff',
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            IventIA Planner
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
            Diseña eventos extraordinarios
          </Text>
        </div>

        <Card
          style={{
            borderRadius: 20,
            border: 'none',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 20, borderRadius: 10 }}
            />
          )}

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              label="Correo electrónico"
              rules={[{ required: true, type: 'email' }]}
            >
              <Input
                prefix={
                  <UserOutlined style={{ color: 'var(--pl-primary)' }} />
                }
                placeholder="usuario@ejemplo.com"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Contraseña"
              rules={[{ required: true }]}
            >
              <Input.Password
                prefix={
                  <LockOutlined style={{ color: 'var(--pl-primary)' }} />
                }
                placeholder="••••••••"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 46,
                  background:
                    'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                Iniciar sesión
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  )
}
