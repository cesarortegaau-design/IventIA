import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Button, Input, Select, Empty, Spin, Image } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { productsApi } from '../api/products'
import { useState } from 'react'

const apiUrl = import.meta.env.VITE_API_URL || ''
const imgSrc = (path: string | null | undefined) =>
  path ? (path.startsWith('/uploads') ? `${apiUrl}${path}` : path) : undefined

export default function CatalogPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20 })
  const [searchText, setSearchText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['arte-capital-products', filters, searchText],
    queryFn: () => productsApi.list(filters),
  })

  const products = data?.products?.filter((p: any) => p.title.toLowerCase().includes(searchText.toLowerCase())) || []

  return (
    <div>
      <h2>Catálogo de Obras</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Input.Search
            placeholder="Buscar obras..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Select style={{ width: '100%' }} options={[{ value: '', label: 'Todas las categorías' }]} />
        </Col>
      </Row>

      <Spin spinning={isLoading}>
        {products.length === 0 ? (
          <Empty description="No hay obras disponibles" />
        ) : (
          <Row gutter={[24, 24]}>
            {products.map((product: any) => (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  cover={
                    product.images?.[0]?.imageUrl && (
                      <Image src={imgSrc(product.images[0].imageUrl)} alt={product.title} style={{ height: 200, objectFit: 'cover' }} />
                    )
                  }
                  hoverable
                >
                  <h4 style={{ marginBottom: 8 }}>{product.title}</h4>
                  <p style={{ color: '#a8a39d', marginBottom: 8 }}>
                    {product.artist?.user?.firstName} {product.artist?.user?.lastName}
                  </p>
                  <h3 style={{ color: '#1a1a1a', marginBottom: 16 }}>${Number(product.price).toFixed(2)}</h3>
                  <Button type="primary" block icon={<ShoppingCartOutlined />}>
                    Agregar al Carrito
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </div>
  )
}
