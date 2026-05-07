import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, App, Result } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { authApi } from '../api/auth'

const { Text } = Typography

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f4eeff 0%, #f8f8f8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ borderRadius: 16, maxWidth: 420, width: '100%', textAlign: 'center', border: 'none', boxShadow: '0 8px 32px rgba(107,70,193,0.10)' }}>
          <Text type="danger">Enlace inválido o expirado.</Text>
          <br /><br />
          <Link to="/forgot-password" style={{ color: '#6B46C1' }}>Solicitar nuevo enlace</Link>
        </Card>
      </div>
    )
  }

  const onFinish = async (values: { password: string }) => {
    setLoading(true)
    try {
      await authApi.resetPassword(token, values.password)
      setDone(true)
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Token inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f4eeff 0%, #f8f8f8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6B46C1' }}>IventIA Boletos</div>
        </div>

        <Card style={{ borderRadius: 16, boxShadow: '0 8px 32px rgba(107,70,193,0.10)', border: 'none' }}>
          {done ? (
            <Result
              icon={<CheckCircleOutlined style={{ color: '#6B46C1' }} />}
              title="¡Contraseña actualizada!"
              extra={
                <Button type="primary" onClick={() => navigate('/login')}
                  style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8 }}>
                  Iniciar sesión
                </Button>
              }
            />
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Nueva Contraseña</div>
              </div>
              <Form layout="vertical" onFinish={onFinish} size="large">
                <Form.Item name="password" label="Nueva contraseña" rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}>
                  <Input.Password placeholder="Mínimo 8 caracteres" style={{ borderRadius: 8 }} />
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
                  <Input.Password placeholder="••••••••" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}
                  style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8, height: 44, fontWeight: 600 }}>
                  Guardar contraseña
                </Button>
              </Form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
