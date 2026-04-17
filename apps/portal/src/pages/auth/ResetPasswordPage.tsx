import { useState } from 'react'
import { Form, Input, Button, Card, Typography, App, Result } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/auth'

export default function ResetPasswordPage() {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <Result
          status="error"
          title="Enlace inválido"
          subTitle="El enlace para restablecer la contraseña no es válido."
          extra={<Link to="/forgot-password"><Button type="primary">Solicitar nuevo enlace</Button></Link>}
        />
      </Card>
    )
  }

  if (success) {
    return (
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <Result
          status="success"
          title="Contraseña actualizada"
          subTitle="Tu contraseña ha sido restablecida correctamente."
          extra={<Link to="/login"><Button type="primary">Iniciar sesión</Button></Link>}
        />
      </Card>
    )
  }

  const onFinish = async (values: { password: string }) => {
    setLoading(true)
    try {
      await authApi.resetPassword(token, values.password)
      setSuccess(true)
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
        Nueva contraseña
      </Typography.Title>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="password" label="Nueva contraseña" rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}>
          <Input.Password prefix={<LockOutlined />} size="large" placeholder="Mínimo 6 caracteres" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirmar contraseña"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Confirma tu contraseña' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve()
                return Promise.reject(new Error('Las contraseñas no coinciden'))
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" placeholder="Repite la contraseña" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Restablecer contraseña
        </Button>
      </Form>
    </Card>
  )
}
