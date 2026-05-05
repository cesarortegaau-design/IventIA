import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Space, Typography } from 'antd'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircleFilled, WhatsAppOutlined, ArrowRightOutlined } from '@ant-design/icons'

const { Text } = Typography

const TICKETS_URL = import.meta.env.VITE_TICKETS_URL ?? window.location.origin

export default function SuccessPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  const orderUrl = token ? `${TICKETS_URL}/mi-orden/${token}` : null

  const whatsappText = orderUrl
    ? `¡Mis boletos están listos! 🎉 Puedo verlos aquí: ${orderUrl}`
    : ''

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f4eeff 0%, #f8f8f8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(107,70,193,0.12)',
        padding: '40px 36px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Success icon */}
        <div style={{ marginBottom: 16 }}>
          <CheckCircleFilled style={{ fontSize: 64, color: '#6B46C1' }} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
          ¡Pago exitoso!
        </h1>
        <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>
          Tus boletos han sido confirmados. Recibirás un correo con tu confirmación.
        </p>

        {/* QR Code */}
        {orderUrl && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: 'inline-block',
              background: '#fff',
              border: '3px solid #6B46C1',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 4px 12px rgba(107,70,193,0.15)',
            }}>
              <QRCodeSVG
                value={orderUrl}
                size={180}
                level="H"
                fgColor="#1a1a2e"
                bgColor="#ffffff"
                imageSettings={{
                  src: '/logo.png',
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
              Escanea para ver tus boletos
            </div>
          </div>
        )}

        {/* Token ref */}
        {token && (
          <div style={{
            background: '#f4eeff', borderRadius: 10, padding: '10px 16px',
            marginBottom: 24, fontSize: 13, color: '#555',
          }}>
            Referencia de orden:&nbsp;
            <span style={{
              fontFamily: 'monospace', fontWeight: 700, color: '#6B46C1', fontSize: 13,
            }}>{token}</span>
          </div>
        )}

        {/* Action buttons */}
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {token && (
            <Button
              type="primary"
              block
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate(`/mi-orden/${token}`)}
              style={{
                background: '#6B46C1', borderColor: '#6B46C1',
                borderRadius: 12, height: 48, fontWeight: 600, fontSize: 15,
              }}
            >
              Ver mis boletos
            </Button>
          )}

          {orderUrl && (
            <Button
              block
              size="large"
              icon={<WhatsAppOutlined />}
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank')}
              style={{
                background: '#25D366', borderColor: '#25D366', color: '#fff',
                borderRadius: 12, height: 48, fontWeight: 600, fontSize: 15,
              }}
            >
              Compartir por WhatsApp
            </Button>
          )}

          <Button
            block
            size="large"
            onClick={() => navigate('/')}
            style={{ borderRadius: 12, height: 44, color: '#6B46C1', borderColor: '#d3adf7' }}
          >
            Volver al inicio
          </Button>
        </Space>

        {/* Footer note */}
        <Text type="secondary" style={{ fontSize: 12, marginTop: 20, display: 'block' }}>
          Si tienes dudas escríbenos — guardamos tu orden por correo electrónico.
        </Text>
      </div>
    </div>
  )
}
