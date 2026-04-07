import { useAuthStore } from '../stores/authStore'
import { Card, Form, Input, Button } from 'antd'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [form] = Form.useForm()

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Mi Perfil</h2>

      <Card>
        <Form form={form} layout="vertical" initialValues={user || {}}>
          <Form.Item label="Nombre" name="firstName">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Apellido" name="lastName">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Tipo de Cuenta" name="userRole">
            <Input disabled />
          </Form.Item>

          <Form.Item>
            <Button type="primary">Editar Perfil</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
