import { useState } from 'react'
import { Form, Input, Button, Card, Typography, App, Steps, Alert, Divider } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { ShopOutlined } from '@ant-design/icons'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

const PRIMARY = '#0369a1'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [step, setStep]           = useState(0)
  const [loading, setLoading]     = useState(false)
  const [supplierInfo, setSupplierInfo] = useState<{ supplier: any } | null>(null)
  const [codeValue, setCodeValue] = useState('')

  const verifyCode = async () => {
    if (!codeValue.trim()) return
    setLoading(true)
    try {
      const { data } = await authApi.verifyCode(codeValue.trim())
      setSupplierInfo(data.data)
      setStep(1)
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Código inválido o ya utilizado')
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values: any) => {
    setLoading(true)
    try {
      const { data } = await authApi.register({ ...values, code: codeValue.trim() })
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      message.success('Registro exitoso. ¡Bienvenido al Portal de Proveedores!')
      navigate('/dashboard')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? 'Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ width: 460, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 8, color: PRIMARY }}>
        Registro de Proveedor
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        Crea tu cuenta con el código de acceso que te proporcionó IventIA
      </Typography.Text>

      <Steps current={step} size="small" style={{ marginBottom: 28 }} items={[
        { title: 'Código de acceso' },
        { title: 'Tus datos' },
      ]} />

      {step === 0 && (
        <>
          <Typography.Paragraph type="secondary">
            Ingresa el código de acceso que te proporcionó el equipo de IventIA para vincular tu empresa como proveedor.
          </Typography.Paragraph>
          <Input
            size="large"
            placeholder="Ej. PROV-ABC123"
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
            onPressEnter={verifyCode}
            style={{ marginBottom: 16 }}
            prefix={<ShopOutlined style={{ color: PRIMARY }} />}
          />
          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={verifyCode}
            style={{ background: PRIMARY, borderColor: PRIMARY }}
          >
            Verificar Código
          </Button>
        </>
      )}

      {step === 1 && supplierInfo && (
        <>
          <Alert
            type="success"
            showIcon
            message={
              <span>
                Código válido para: <strong>{supplierInfo.supplier?.name ?? 'Proveedor'}</strong>
              </span>
            }
            style={{ marginBottom: 20 }}
          />
          <Form layout="vertical" onFinish={onRegister}>
            <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
              <Input size="large" placeholder="correo@empresa.com" />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}>
              <Input.Password size="large" placeholder="Mínimo 8 caracteres" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirmar contraseña"
              dependencies={['password']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve()
                    return Promise.reject('Las contraseñas no coinciden')
                  },
                }),
              ]}
            >
              <Input.Password size="large" placeholder="Repite tu contraseña" />
            </Form.Item>
            <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}>
              <Input size="large" placeholder="Tu nombre" />
            </Form.Item>
            <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}>
              <Input size="large" placeholder="Tu apellido" />
            </Form.Item>
            <Form.Item name="phone" label="Teléfono (opcional)">
              <Input size="large" placeholder="+52 55 1234 5678" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
            >
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
        <Link to="/login" style={{ color: PRIMARY }}>Iniciar sesión</Link>
      </div>
    </Card>
  )
}
