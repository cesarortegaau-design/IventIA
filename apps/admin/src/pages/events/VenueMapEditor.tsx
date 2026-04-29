import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Form, InputNumber, Space, Spin } from 'antd'
import { DeleteOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons'
import { ticketEventsApi } from '../../api/ticketEvents'

interface Shape {
  id: string
  name: string
  colorHex: string
  shapeType?: string
  shapeData?: any
  labelX?: number
  labelY?: number
}

interface VenueMapEditorProps {
  eventId: string
}

export default function VenueMapEditor({ eventId }: VenueMapEditorProps) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState<'select' | 'rect' | 'circle' | 'polygon'>('select')
  const [svgWidth] = useState(1200)
  const [svgHeight] = useState(600)
  const [form] = Form.useForm()

  // Load map data
  const { data: mapData, isLoading } = useQuery({
    queryKey: ['venue-map', eventId],
    queryFn: () => ticketEventsApi.getMap(eventId),
  })

  const sections: Shape[] = mapData?.data?.sections ?? []
  const selected = sections.find(s => s.id === selectedId)

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => ticketEventsApi.saveMap(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-map', eventId] })
      message.success('Mapa guardado')
    },
    onError: () => message.error('Error al guardar mapa'),
  })

  const handleSave = () => {
    saveMutation.mutate({
      mapData: mapData?.data?.mapData ?? {},
      sections: sections.map(s => ({
        id: s.id,
        shapeType: s.shapeType,
        shapeData: s.shapeData,
        labelX: s.labelX,
        labelY: s.labelY,
      })),
    })
  }

  const handleSelectShape = (id: string) => {
    setSelectedId(id)
    const shape = sections.find(s => s.id === id)
    if (shape) {
      form.setFieldsValue({
        labelX: shape.labelX ?? 0,
        labelY: shape.labelY ?? 0,
      })
    }
  }

  if (isLoading) return <Spin />

  return (
    <div style={{ display: 'flex', gap: 16, height: 600 }}>
      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Button size="small" onClick={() => setDrawMode('select')} type={drawMode === 'select' ? 'primary' : 'default'}>
              Seleccionar
            </Button>
            <Button size="small" onClick={() => setDrawMode('rect')} type={drawMode === 'rect' ? 'primary' : 'default'}>
              Rectángulo
            </Button>
            <Button size="small" onClick={() => setDrawMode('circle')} type={drawMode === 'circle' ? 'primary' : 'default'}>
              Círculo
            </Button>
            <Button size="small" onClick={() => setDrawMode('polygon')} type={drawMode === 'polygon' ? 'primary' : 'default'}>
              Polígono
            </Button>
          </Space>
        </div>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            cursor: drawMode === 'select' ? 'pointer' : 'crosshair',
            backgroundColor: '#fafafa',
          }}
        >
          {/* Render sections */}
          {sections.map(sec => {
            const isSelected = sec.id === selectedId
            return (
              <g key={sec.id} onClick={() => handleSelectShape(sec.id)}>
                {sec.shapeType === 'rect' && sec.shapeData && (
                  <rect
                    x={sec.shapeData.x ?? 0}
                    y={sec.shapeData.y ?? 0}
                    width={sec.shapeData.w ?? 100}
                    height={sec.shapeData.h ?? 100}
                    fill={sec.colorHex}
                    fillOpacity={isSelected ? 0.7 : 0.5}
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
                    fillOpacity={isSelected ? 0.7 : 0.5}
                    stroke={isSelected ? '#000' : sec.colorHex}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                )}
                {/* Label */}
                <text
                  x={sec.labelX ?? 0}
                  y={sec.labelY ?? 0}
                  fontSize="12"
                  fill="#000"
                  pointerEvents="none"
                  textAnchor="middle"
                >
                  {sec.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Inspector Panel */}
      <div style={{ width: 280, borderLeft: '1px solid #d9d9d9', paddingLeft: 16 }}>
        {selected ? (
          <>
            <h4>{selected.name}</h4>
            <Form form={form} layout="vertical" size="small">
              <Form.Item label="Etiqueta X" name="labelX">
                <InputNumber />
              </Form.Item>
              <Form.Item label="Etiqueta Y" name="labelY">
                <InputNumber />
              </Form.Item>
            </Form>
            <Button danger block icon={<DeleteOutlined />} size="small">
              Eliminar
            </Button>
          </>
        ) : (
          <p style={{ color: '#999', fontSize: 12 }}>Selecciona una zona para editar</p>
        )}
        <div style={{ marginTop: 24 }}>
          <Button
            type="primary"
            block
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saveMutation.isPending}
          >
            Guardar Mapa
          </Button>
        </div>
      </div>
    </div>
  )
}
