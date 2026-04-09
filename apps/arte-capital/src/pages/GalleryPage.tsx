import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Input, Select, Button, Badge, Empty, Spin, Image } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { galleryApi } from '../api/gallery'

const STYLES = ['IMPRESSIONISM', 'SURREALISM', 'POP_ART', 'CUBISM', 'ABSTRACT', 'REALISM', 'EXPRESSIONISM', 'CONTEMPORARY', 'TRADITIONAL', 'MODERNISM']
const MEDIUMS = ['OIL', 'ACRYLIC', 'WATERCOLOR', 'SCULPTURE', 'PHOTOGRAPHY', 'PRINT', 'DIGITAL', 'MIXED_MEDIA']

export function GalleryPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 12 })

  const { data: artworksData, isLoading } = useQuery({
    queryKey: ['gallery-artworks', filters],
    queryFn: () => galleryApi.artworks.list(filters),
  })

  const handleViewArtwork = (id: string) => {
    navigate(`/artwork/${id}`)
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1>Galería de Arte</h1>
        <p style={{ fontSize: 16, color: '#666' }}>
          Descubre una colección curada de obras de arte de artistas mexicanos
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder="Buscar obras..."
              onSearch={(value) => setFilters({ ...filters, search: value, page: 1 })}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filtrar por estilo"
              allowClear
              options={STYLES.map((s) => ({ value: s, label: s }))}
              onChange={(value) => setFilters({ ...filters, styles: value ? [value] : undefined, page: 1 })}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filtrar por medio"
              allowClear
              options={MEDIUMS.map((m) => ({ value: m, label: m }))}
              onChange={(value) => setFilters({ ...filters, mediums: value ? [value] : undefined, page: 1 })}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Rango de precio"
              allowClear
              options={[
                { value: 'low', label: 'Menos de $5,000' },
                { value: 'mid', label: '$5,000 - $20,000' },
                { value: 'high', label: 'Más de $20,000' },
              ]}
              onChange={(value) => {
                if (value === 'low') setFilters({ ...filters, maxPrice: 5000, page: 1 })
                else if (value === 'mid') setFilters({ ...filters, minPrice: 5000, maxPrice: 20000, page: 1 })
                else if (value === 'high') setFilters({ ...filters, minPrice: 20000, page: 1 })
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Artworks Grid */}
      <Spin spinning={isLoading}>
        {artworksData?.data?.length ? (
          <>
            <Row gutter={[16, 24]} style={{ marginBottom: 24 }}>
              {artworksData.data.map((artwork: any) => (
                <Col key={artwork.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    cover={
                      <div style={{ height: 300, backgroundColor: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {artwork.mainImage ? (
                          <img
                            src={artwork.mainImage}
                            alt={artwork.title}
                            style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.src = `https://dummyimage.com/300x300/cccccc/969696?text=${encodeURIComponent(artwork.title)}`
                            }}
                          />
                        ) : (
                          <span style={{ color: '#999' }}>Sin imagen</span>
                        )}
                      </div>
                    }
                    onClick={() => handleViewArtwork(artwork.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: 14 }}>{artwork.title}</h4>
                      <p style={{ margin: 0, color: '#666', fontSize: 12 }}>
                        {artwork.artist.name}
                      </p>
                    </div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                        ${parseFloat(artwork.price).toFixed(2)}
                      </span>
                      {artwork.quantity > 0 ? (
                        <Badge status="success" text="Disponible" />
                      ) : (
                        <Badge status="error" text="Vendido" />
                      )}
                    </div>
                    {artwork.quantity > 0 && (
                      <Button
                        type="primary"
                        block
                        icon={<ShoppingCartOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/artwork/${artwork.id}`)
                        }}
                      >
                        Ver detalles
                      </Button>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Pagination */}
            {artworksData.meta && artworksData.meta.pages > 1 && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                {Array.from({ length: artworksData.meta.pages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    type={filters.page === page ? 'primary' : 'default'}
                    onClick={() => setFilters({ ...filters, page })}
                    style={{ margin: '0 4px' }}
                  >
                    {page}
                  </Button>
                ))}
              </div>
            )}
          </>
        ) : (
          <Empty description="No se encontraron obras de arte" />
        )}
      </Spin>
    </div>
  )
}
