import { Card, Row, Col, Statistic, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div>
      <h2>Bienvenido a Arte Capital</h2>

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Órdenes" value={0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Gastado" value={0} prefix="$" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Membresía Activa" value="No" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <h4>Explorar Obras</h4>
            <p>Descubre nuevas obras de arte en nuestro catálogo</p>
            <Button type="primary" block onClick={() => navigate('/catalog')}>
              Ver Catálogo
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <h4>Membresías Premium</h4>
            <p>Acceso exclusivo a obras limitadas</p>
            <Button block onClick={() => navigate('/memberships')}>
              Ver Planes
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
