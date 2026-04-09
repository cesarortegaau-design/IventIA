import { Card, Row, Col, Statistic, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { galleryApi } from '../api/gallery'

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => galleryApi.orders.list(),
  })

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => galleryApi.cart.get(),
  })

  const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0)

  return (
    <div style={{ padding: '24px' }}>
      <h2>Bienvenido a Arte Capital</h2>

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Mis Órdenes" value={orders.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Gastado" value={totalSpent.toFixed(2)} prefix="$" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Carrito" value={cart?.items?.length || 0} suffix="Items" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <h4>🎨 Explorar Galerías</h4>
            <p>Descubre nuevas obras de arte en nuestro catálogo</p>
            <Button type="primary" block onClick={() => navigate('/gallery')}>
              Ver Galerías
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <h4>📅 Eventos & Talleres</h4>
            <p>Participa en eventos exclusivos con artistas</p>
            <Button block onClick={() => navigate('/classes')}>
              Ver Eventos
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <h4>🛒 Mi Carrito</h4>
            <p>{cart?.items?.length || 0} items en tu carrito</p>
            <Button block onClick={() => navigate('/cart')}>
              Ver Carrito
            </Button>
          </Card>
        </Col>
      </Row>

      {orders.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3>Mis Últimas Órdenes</h3>
          <Row gutter={[24, 24]}>
            {orders.slice(0, 3).map((order) => (
              <Col xs={24} sm={12} md={8} key={order.id}>
                <Card>
                  <Statistic title="Orden" value={order.orderNumber} />
                  <Statistic title="Estado" value={order.status} />
                  <Statistic title="Total" value={order.total} prefix="$" />
                  <Button block style={{ marginTop: 12 }} onClick={() => navigate(`/orders`)}>
                    Ver Detalles
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  )
}
