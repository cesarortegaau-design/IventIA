import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Row, Col, Card, Button, Spin, Empty, Badge, message } from 'antd'
import { CalendarOutlined, UserOutlined, MapPinOutlined, DollarOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import { galleryApi } from '../api/gallery'

export function ClassesPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: classes, isLoading } = useQuery({
    queryKey: ['gallery-classes'],
    queryFn: () => galleryApi.classes.list(),
  })

  const addToCartMutation = useMutation({
    mutationFn: (classId: string) =>
      galleryApi.cart.addEventItem(classId, 1),
    onSuccess: () => {
      message.success('Evento agregado al carrito')
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: () => {
      message.error('Error al agregar evento al carrito')
    },
  })

  const handleAddToCart = (classId: string) => {
    if (!accessToken) {
      message.info('Por favor inicia sesión para agregar eventos al carrito')
      navigate('/login')
      return
    }
    addToCartMutation.mutate(classId)
  }

  if (isLoading) return <Spin style={{ padding: '40px', textAlign: 'center' }} />

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1>Eventos & Talleres</h1>
        <p style={{ fontSize: 16, color: '#666' }}>
          Participa en talleres y eventos exclusivos con artistas destacados
        </p>
      </div>

      {/* Classes Grid */}
      {classes?.length ? (
        <Row gutter={[24, 24]}>
          {classes.map((galleryClass: any) => (
            <Col key={galleryClass.id} xs={24} sm={12} md={8}>
              <Card
                hoverable
                cover={
                  <div style={{
                    height: 200,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 48,
                  }}>
                    🎨
                  </div>
                }
              >
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>
                    {galleryClass.name}
                  </h3>
                  <p style={{ margin: '8px 0', color: '#666', fontSize: 14 }}>
                    <UserOutlined /> {galleryClass.instructor?.name || 'Instructor'}
                  </p>
                </div>

                <div style={{ marginBottom: 16, fontSize: 14, color: '#999' }}>
                  {galleryClass.schedule?.day_of_week && (
                    <div style={{ marginBottom: 8 }}>
                      <CalendarOutlined /> {galleryClass.schedule.day_of_week} - {galleryClass.schedule.time}
                    </div>
                  )}
                  {galleryClass.location?.name && (
                    <div style={{ marginBottom: 8 }}>
                      <MapPinOutlined /> {galleryClass.location.name}
                    </div>
                  )}
                  {galleryClass.capacity && (
                    <div>
                      Capacidad: {galleryClass.capacity} personas
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {galleryClass.price ? (
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>
                      <DollarOutlined /> {parseFloat(galleryClass.price).toFixed(2)}
                    </span>
                  ) : (
                    <Badge status="success" text="Gratis" />
                  )}
                  <Badge
                    status={galleryClass.status === 'ACTIVE' ? 'success' : 'default'}
                    text={galleryClass.status === 'ACTIVE' ? 'Disponible' : 'Cerrado'}
                  />
                </div>

                <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#666' }}>
                  {galleryClass.description}
                </p>

                {galleryClass.status === 'ACTIVE' && (
                  <Button
                    type="primary"
                    block
                    onClick={() => handleAddToCart(galleryClass.id)}
                    loading={addToCartMutation.isPending}
                  >
                    {galleryClass.price ? 'Comprar Acceso' : 'Inscribirse'}
                  </Button>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No hay eventos disponibles" />
      )}
    </div>
  )
}
