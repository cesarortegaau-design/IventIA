import { useState } from 'react'
import { Form, Input, Button, Card, Typography, App, Steps, Alert, Divider } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [codeInfo, setCodeInfo] = useState<{ event: any; codeId: string } | null>(null)
  const [codeValue, setCodeValue] = useState('')

  const verifyCode = async () => {
    if (!codeValue.trim()) return
    setLoading(true)
    try {
      const { data } = await authApi.verifyCode(codeValue.trim())
      setCodeInfo(data.data)
      setStep(1)
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values: any) => {
    setLoading(true)
    try {
      const { data } = await authApi.register({ ...values, code: codeValue.trim() })
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      message.success('Registro exitoso. ¡Bienvenido!')
      navigate('/')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ width: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>Registro con Código de Acceso</Typography.Title>

      <Steps current={step} size="small" style={{ marginBottom: 24 }} items={[
        { title: 'Código' },
        { title: 'Datos' },
      ]} />

      {step === 0 && (
        <>
          <Typography.Paragraph type="secondary">
            Ingresa el código de acceso que te proporcionó el equipo del evento.
          </Typography.Paragraph>
          <Input
            size="large"
            placeholder="Ej. ABC12345"
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
            onPressEnter={verifyCode}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" block size="large" loading={loading} onClick={verifyCode}>
            Verificar Código
          </Button>
        </>
      )}

      {step === 1 && codeInfo && (
        <>
          <Alert
            type="success"
            message={`Código válido para: ${codeInfo.event.name}`}
            style={{ marginBottom: 16 }}
            showIcon
          />
          <Form layout="vertical" onFinish={onRegister}>
            <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
              <Input size="large" placeholder="correo@ejemplo.com" />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }]}>
              <Input.Password size="large" placeholder="Mínimo 6 caracteres" />
            </Form.Item>
            <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="phone" label="Teléfono (opcional)">
              <Input size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Crear cuenta
            </Button>
            <Button type="link" block onClick={() => setStep(0)} style={{ marginTop: 8 }}>
              Cambiar código
            </Button>
          </Form>
        </>
      )}

      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Typography.Text type="secondary">¿Ya tienes cuenta? </Typography.Text>
        <Link to="/login">Iniciar sesión</Link>
      </div>
    </Card>
  )
}
