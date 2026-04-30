import { useState } from 'react'
import { Button, Card, Empty, InputNumber, Space, message } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { useCart } from '../store/cart'

interface Section {
  id: string
  name: string
  colorHex: string
  price: number
  capacity: number
  sold: number
  shapeType?: string
  shapeData?: any
  labelX?: number
  labelY?: number
}

interface VenueMapViewerProps {
  sections: Section[]
  mapData?: any
  onSectionSelect?: (section: Section) => void
}

export default function VenueMapViewer({ sections, mapData, onSectionSelect }: VenueMapViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const { addItem, setSlug, slug: cartSlug } = useCart()

  const selected = sections.find(s => s.id === selectedId)
  const availableCapacity = (selected?.capacity ?? 0) - (selected?.sold ?? 0)

  const handleAddToCart = () => {
    if (selected && quantity > 0 && quantity <= availableCapacity) {
      addItem({
        sectionId: selected.id,
        sectionName: selected.name,
        quantity,
        unitPrice: selected.price,
      })
      message.success(`${quantity} boleto(s) de "${selected.name}" agregados`)
      setQuantity(1)
    }
  }

  const handleSelectSection = (id: string) => {
    setSelectedId(id)
    const section = sections.find(s => s.id === id)
    if (section && onSectionSelect) {
      onSectionSelect(section)
    }
  }

  // Check if any section has shapes configured
  const hasShapes = sections.some(s => s.shapeType && s.shapeData)

  // If no map data or no shapes configured, render fallback list
  if (!mapData || !hasShapes) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {sections.map(sec => {
          const avail = sec.capacity - (sec.sold ?? 0)
          const isSelected = sec.id === selectedId
          return (
            <Card
              key={sec.id}
              hoverable
              onClick={() => handleSelectSection(sec.id)}
              style={{
                borderColor: isSelected ? '#6B46C1' : undefined,
                borderWidth: isSelected ? 2 : 1,
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: sec.colorHex,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16 }}>{sec.name}</h4>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      {avail > 0 ? `${avail} de ${sec.capacity} disponibles` : 'Agotado'}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: 18, color: '#6B46C1' }}>
                  ${Number(sec.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {isSelected && avail > 0 && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <InputNumber
                    min={1}
                    max={avail}
                    value={quantity}
                    onChange={(val) => setQuantity(val ?? 1)}
                    style={{ width: 80 }}
                  />
                  <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToCart()
                    }}
                  >
                    Agregar al carrito
                  </Button>
                </div>
              )}

              {isSelected && avail <= 0 && (
                <div style={{ marginTop: 16 }}>
                  <Button disabled block>Agotado</Button>
                </div>
              )}
            </Card>
          )
        })}
      </Space>
    )
  }

  // Render map viewer with SVG
  const svgWidth = mapData?.width ?? 1200
  const svgHeight = mapData?.height ?? 600

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* Map Canvas */}
      <div style={{ flex: 1 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: '100%',
            maxHeight: 500,
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            backgroundColor: '#fafafa',
            cursor: 'pointer',
          }}
        >
          {sections.map(sec => {
            const isSelected = sec.id === selectedId
            return (
              <g key={sec.id} onClick={() => handleSelectSection(sec.id)}>
                {sec.shapeType === 'rect' && sec.shapeData && (
                  <rect
                    x={sec.shapeData.x ?? 0}
                    y={sec.shapeData.y ?? 0}
                    width={sec.shapeData.w ?? 100}
                    height={sec.shapeData.h ?? 100}
                    fill={sec.colorHex}
                    fillOpacity={isSelected ? 0.8 : 0.5}
                    stroke={isSelected ? '#000' : sec.colorHex}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                )}
                {sec.shapeType === 'circle' && sec.shapeData && (
                  <circle
                    cx={sec.shapeData.cx ?? 0}
                    cy={sec.shapeData.cy ?? 0}
                    r={sec.shapeData.r ?? 50}
                    fill={sec.colorHex}
                    fillOpacity={isSelected ? 0.8 : 0.5}
                    stroke={isSelected ? '#000' : sec.colorHex}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                )}
                {/* Label */}
                {sec.labelX !== undefined && sec.labelY !== undefined && (
                  <text
                    x={sec.labelX}
                    y={sec.labelY}
                    fontSize="14"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    fill={isSelected ? '#000' : '#666'}
                    pointerEvents="none"
                    textAnchor="middle"
                  >
                    {sec.name}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
          Haz clic en una zona para seleccionar
        </div>
      </div>

      {/* Info Panel */}
      <div style={{ width: 320 }}>
        {selected ? (
          <Card>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  backgroundColor: selected.colorHex,
                  marginBottom: 12,
                }}
              />
              <h3 style={{ margin: '0 0 8px' }}>{selected.name}</h3>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#6B46C1', marginBottom: 8 }}>
                ${Number(selected.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {availableCapacity > 0 ? `${availableCapacity} lugares disponibles` : 'Agotado'}
              </div>
            </div>

            {availableCapacity > 0 && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>Cantidad</label>
                  <InputNumber
                    min={1}
                    max={availableCapacity}
                    value={quantity}
                    onChange={(val) => setQuantity(val ?? 1)}
                    style={{ width: '100%' }}
                  />
                </div>
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  onClick={handleAddToCart}
                >
                  Agregar al Carrito
                </Button>
              </>
            )}

            {availableCapacity <= 0 && (
              <Button disabled block size="large">
                Agotado
              </Button>
            )}
          </Card>
        ) : (
          <Empty description="Selecciona una zona" />
        )}
      </div>
    </div>
  )
}
