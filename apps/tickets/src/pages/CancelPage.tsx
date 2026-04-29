import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Result } from 'antd'

export default function CancelPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const slug = params.get('slug')

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
          status="error"
          title="Pago cancelado"
          subTitle="Tu orden fue cancelada. Los boletos reservados han sido liberados."
          extra={[
            slug ? (
              <Button
                type="primary"
                key="event"
                style={{ borderRadius: 8 }}
                onClick={() => navigate(`/evento/${slug}`)}
              >
                Volver al evento
              </Button>
            ) : (
              <Button
                type="primary"
                key="home"
                style={{ borderRadius: 8 }}
                onClick={() => navigate('/')}
              >
                Volver al inicio
              </Button>
            ),
          ]}
        />
      </div>
    </div>
  )
}
