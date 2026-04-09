import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Row, Col, Empty, Spin, Space, message, InputNumber } from 'antd'
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons'
import { galleryApi } from '../api/gallery'

export default function CartPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => galleryApi.cart.get(),
  })

  const { data: summary } = useQuery({
    queryKey: ['cart-summary'],
    queryFn: () => galleryApi.cart.summary(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      galleryApi.cart.updateItem(cartItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (cartItemId: string) => galleryApi.cart.removeItem(cartItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] })
      message.success('Item removed from cart')
    },
  })

  if (isLoading) return <Spin style={{ padding: '40px', textAlign: 'center' }} />

  if (!cart?.items?.length) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Your cart is empty"
        >
          <Button type="primary" icon={<ShoppingOutlined />} onClick={() => navigate('/gallery')}>
            Continue Shopping
          </Button>
        </Empty>
      </div>
    )
  }

  const columns = [
    {
      title: 'Artwork',
      dataIndex: ['artwork', 'title'],
      key: 'title',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(`/artwork/${record.artwork.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Artist',
      dataIndex: ['artwork', 'artist', 'name'],
      key: 'artist',
    },
    {
      title: 'Price',
      dataIndex: ['artwork', 'price'],
      key: 'price',
      render: (price: any) => `$${parseFloat(price).toFixed(2)}`,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: any) => (
        <InputNumber
          min={1}
          max={record.artwork.quantity}
          value={quantity}
          onChange={(val) => updateMutation.mutate({ cartItemId: record.id, quantity: val || 1 })}
        />
      ),
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      render: (_: any, record: any) => {
        const subtotal = parseFloat(record.artwork.price) * record.quantity
        return `$${subtotal.toFixed(2)}`
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeMutation.mutate(record.id)}
          loading={removeMutation.isPending}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <h1>Carrito de Compras</h1>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Table
            columns={columns}
            dataSource={cart.items}
            rowKey="id"
            pagination={false}
          />
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Resumen del Pedido" style={{ position: 'sticky', top: 20 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>${summary?.subtotal?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Impuestos ({(summary?.taxRate * 100).toFixed(0)}%):</span>
                <span>${summary?.taxAmount?.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 16,
                  fontWeight: 'bold',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: 12,
                  marginTop: 12,
                }}
              >
                <span>Total:</span>
                <span>${summary?.total?.toFixed(2)}</span>
              </div>

              <Button
                type="primary"
                block
                size="large"
                onClick={() => navigate('/checkout')}
                style={{ marginTop: 16 }}
              >
                Ir a Pagar
              </Button>

              <Button block onClick={() => navigate('/gallery')}>
                Continuar Comprando
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
