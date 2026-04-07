import { Button, Row, Col, Typography, Card, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ArrowRightOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', paddingBottom: 80 }}>
        <Title level={1} style={{ fontSize: 56, marginBottom: 16 }}>
          🎨 Arte Capital
        </Title>
        <Title level={3} type="secondary">
          Marketplace de Arte Digital
        </Title>
        <Paragraph style={{ fontSize: 18, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
          Descubre obras de arte original de artistas talentosos. Acceso exclusivo con membresías premium.
        </Paragraph>
        <Space size="large">
          <Button size="large" type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate('/register')}>
            Registrarse como Artista
          </Button>
          <Button size="large" onClick={() => navigate('/login')}>
            Ya tengo cuenta
          </Button>
        </Space>
      </div>

      {/* Features */}
      <Row gutter={[24, 24]} style={{ marginBottom: 80 }}>
        {[
          { icon: '🎭', title: 'Galería Online', desc: 'Exhibe y vende tus obras a nivel mundial' },
          { icon: '💰', title: 'Comisiones Justas', desc: 'Retén la mayoría de tus ganancias' },
          { icon: '🔐', title: 'Seguro', desc: 'Protección de comprador y vendedor' },
          { icon: '👥', title: 'Comunidad', desc: 'Conecta con otros artistas y coleccionistas' },
        ].map((f, i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{f.icon}</div>
              <Title level={4}>{f.title}</Title>
              <Text type="secondary">{f.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* CTA */}
      <Card style={{ background: '#1a1a1a', color: '#fff', textAlign: 'center', padding: 48, marginBottom: 80 }}>
        <Title level={2} style={{ color: '#fff' }}>
          ¿Listo para compartir tu arte?
        </Title>
        <Button size="large" type="primary" style={{ marginTop: 24 }} onClick={() => navigate('/register')}>
          Comienza Ahora
        </Button>
      </Card>
    </div>
  )
}
