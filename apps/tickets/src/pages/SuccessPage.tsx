import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Result, Space, Typography } from 'antd'

const { Text } = Typography

export default function SuccessPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f8f8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        <Result
          status="success"
          title="¡Pago exitoso! 🎉"
          subTitle={
            <Space direction="vertical" size={8}>
              <Text>
                Tus boletos han sido confirmados. Recibirás un email con la confirmación.
              </Text>
              {token && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Referencia de orden:{' '}
                  <Text code style={{ fontSize: 12 }}>{token}</Text>
                </Text>
              )}
            </Space>
          }
          extra={[
            token && (
              <Button
                type="primary"
                key="order"
                style={{ borderRadius: 8 }}
                onClick={() => navigate(`/mi-orden/${token}`)}
              >
                Ver mi orden
              </Button>
            ),
            <Button key="home" style={{ borderRadius: 8 }} onClick={() => navigate('/')}>
              Volver al inicio
            </Button>,
          ].filter(Boolean)}
        />
      </div>
    </div>
  )
}
