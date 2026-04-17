import { useState } from 'react'
import { Form, Input, Button, Card, Typography, App, Result } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/auth'

export default function ForgotPasswordPage() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onFinish = async (values: { email: string }) => {
    setLoading(true)
    try {
      await authApi.forgotPassword(values.email)
      setSent(true)
    } catch {
      message.error('Error al enviar la solicitud. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <Result
          status="success"
          title="Revisa tu correo"
          subTitle="Si la cuenta existe, recibirás un enlace para restablecer tu contraseña."
          extra={<Link to="/login"><Button type="primary">Volver al inicio de sesión</Button></Link>}
        />
      </Card>
    )
  }

  return (
    <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 8 }}>
        Restablecer contraseña
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
      </Typography.Paragraph>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
          <Input prefix={<MailOutlined />} size="large" placeholder="correo@ejemplo.com" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Enviar enlace
        </Button>
      </Form>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link to="/login">Volver al inicio de sesión</Link>
      </div>
    </Card>
  )
}
