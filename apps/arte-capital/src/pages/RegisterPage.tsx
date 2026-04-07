import { Form, Input, Button, Card, Space, Typography, Select, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

const { Title, Link } = Typography

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { mutate: register, isPending } = useMutation({
    mutationFn: (values: any) => authApi.register(values),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      message.success('¡Cuenta creada exitosamente!')
      navigate('/dashboard')
    },
    onError: (err: any) => {
      message.error(err.response?.data?.error?.message || 'Error al crear cuenta')
    },
  })

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center' }}>
          🎨 Crear Cuenta
        </Title>

        <Form form={form} layout="vertical" onFinish={(v) => register(v)}>
          <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}>
            <Input size="large" />
          </Form.Item>

          <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}>
            <Input size="large" />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input type="email" size="large" />
          </Form.Item>

          <Form.Item name="userRole" label="Tipo de Cuenta" rules={[{ required: true }]}>
            <Select size="large" options={[
              { value: 'ARTIST', label: 'Artista' },
              { value: 'COLLECTOR', label: 'Coleccionista' },
            ]} />
          </Form.Item>

          <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 8 }]}>
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={isPending}>
              Registrarse
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Link onClick={() => navigate('/login')}>¿Ya tienes cuenta?</Link>
        </div>
      </Card>
    </div>
  )
}
