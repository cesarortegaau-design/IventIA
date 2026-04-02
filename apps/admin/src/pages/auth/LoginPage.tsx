import { Form, Input, Button, Card, Typography, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

const { Title, Text } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { message } = App.useApp()

  const loginMutation = useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      apiClient.post('/auth/login', values).then(r => r.data),
    onSuccess: (data) => {
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/eventos')
    },
    onError: () => {
      message.error('Credenciales incorrectas')
    },
  })

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a0533 0%, #6B46C1 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0, color: '#6B46C1' }}>IventIA</Title>
          <Text type="secondary">Módulo Administrativo Core</Text>
        </div>

        <Form
          layout="vertical"
          onFinish={loginMutation.mutate}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, type: 'email', message: 'Ingresa tu email' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Correo electrónico"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loginMutation.isPending}
            >
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
