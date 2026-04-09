import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Row, Col, Button, InputNumber, Card, Descriptions, Space, message, Spin, Image, Empty } from 'antd'
import { ShoppingCartOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { galleryApi } from '../api/gallery'

export function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState(1)

  const { data: artwork, isLoading } = useQuery({
    queryKey: ['artwork', id],
    queryFn: () => galleryApi.artworks.get(id!),
  })

  const { data: related } = useQuery({
    queryKey: ['related-artworks', id],
    queryFn: () => galleryApi.artworks.getRelated(id!),
  })

  const addToCartMutation = useMutation({
    mutationFn: () => galleryApi.cart.addItem(id!, quantity),
    onSuccess: () => {
      message.success('Added to cart')
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const handleAddToCart = async () => {
    if (!artwork) return
    if (artwork.quantity < quantity) {
      message.error('Not enough inventory')
      return
    }
    await addToCartMutation.mutateAsync()
  }

  if (isLoading) return <Spin style={{ padding: '40px', textAlign: 'center' }} />

  if (!artwork) return <Empty description="Artwork not found" style={{ padding: '40px' }} />

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Back button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/gallery')}
        style={{ marginBottom: 20 }}
      >
        Back to Gallery
      </Button>

      {/* Main content */}
      <Row gutter={32}>
        {/* Image */}
        <Col xs={24} md={12}>
          {artwork.mainImage ? (
            <Image src={artwork.mainImage} alt={artwork.title} />
          ) : (
            <div style={{ height: 400, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>No image available</span>
            </div>
          )}
        </Col>

        {/* Details */}
        <Col xs={24} md={12}>
          <div>
            <h1 style={{ margin: '0 0 8px 0' }}>{artwork.title}</h1>
            <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 14 }}>
              by {artwork.artist.name}
            </p>

            {/* Price */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 28 }}>
                ${parseFloat(artwork.price).toFixed(2)}
              </h3>
            </div>

            {/* Description */}
            <Card style={{ marginBottom: 24 }}>
              <h4>Descripción</h4>
              <p>{artwork.description || 'No description available'}</p>
            </Card>

            {/* Details Table */}
            <Descriptions column={1} style={{ marginBottom: 24 }}>
              {artwork.mediums?.length > 0 && (
                <Descriptions.Item label="Mediums">
                  {artwork.mediums.join(', ')}
                </Descriptions.Item>
              )}
              {artwork.styles?.length > 0 && (
                <Descriptions.Item label="Styles">
                  {artwork.styles.join(', ')}
                </Descriptions.Item>
              )}
              {artwork.widthCm && (
                <Descriptions.Item label="Dimensions">
                  {artwork.widthCm} × {artwork.heightCm} cm
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Availability">
                {artwork.quantity > 0 ? `${artwork.quantity} available` : 'Sold Out'}
              </Descriptions.Item>
            </Descriptions>

            {/* Add to cart */}
            {artwork.quantity > 0 && (
              <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <span style={{ marginRight: 12 }}>Quantity:</span>
                    <InputNumber
                      min={1}
                      max={artwork.quantity}
                      value={quantity}
                      onChange={(val) => setQuantity(val || 1)}
                    />
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ShoppingCartOutlined />}
                    onClick={handleAddToCart}
                    loading={addToCartMutation.isPending}
                    block
                  >
                    Add to Cart
                  </Button>
                </Space>
              </Card>
            )}
          </div>
        </Col>
      </Row>

      {/* Related Artworks */}
      {related?.length > 0 && (
        <div style={{ marginTop: 60 }}>
          <h2>Related Artworks</h2>
          <Row gutter={16}>
            {related.map((art: any) => (
              <Col key={art.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  cover={
                    art.mainImage ? (
                      <Image
                        src={art.mainImage}
                        alt={art.title}
                        style={{ height: 200, objectFit: 'cover' }}
                        preview={false}
                      />
                    ) : (
                      <div style={{ height: 200, backgroundColor: '#f0f0f0' }} />
                    )
                  }
                  onClick={() => navigate(`/artwork/${art.id}`)}
                >
                  <h4>{art.title}</h4>
                  <p style={{ color: '#666' }}>${parseFloat(art.price).toFixed(2)}</p>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  )
}
