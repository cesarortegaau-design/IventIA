import { Form, Input, Button, Card, Space, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

const { Title, Link } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { mutate: login, isPending } = useMutation({
    mutationFn: (values: any) => authApi.login(values.email, values.password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      message.success('¡Bienvenido!')
      navigate('/dashboard')
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error?.message || 'Error al iniciar sesión')
    },
  })

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center' }}>
          🎨 Iniciar Sesión
        </Title>

        <Form form={form} layout="vertical" onFinish={(v) => login(v)}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input type="email" size="large" />
          </Form.Item>

          <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 8 }]}>
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={isPending}>
              Entrar
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Space split="|">
            <Link onClick={() => navigate('/register')}>Crear cuenta</Link>
          </Space>
        </div>
      </Card>
    </div>
  )
}
