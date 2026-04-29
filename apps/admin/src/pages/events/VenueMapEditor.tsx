import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Form, Input, InputNumber, Modal, Space, Spin, Card, Row, Col, Slider } from 'antd'
import { DeleteOutlined, SaveOutlined, UndoOutlined, RedoOutlined, ClearOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'
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

const TEMPLATES: Record<string, { name: string; width: number; height: number; shapes: Omit<Shape, 'id'>[] }> = {
  stadium: {
    name: 'Estadio',
    width: 1200,
    height: 600,
    shapes: [
      { name: 'Platea Baja', colorHex: '#6B46C1', shapeType: 'rect', shapeData: { x: 100, y: 100, w: 350, h: 150 }, labelX: 275, labelY: 175 },
      { name: 'Platea Alta', colorHex: '#7C3AED', shapeType: 'rect', shapeData: { x: 100, y: 300, w: 350, h: 150 }, labelX: 275, labelY: 375 },
      { name: 'Tribuna Derecha', colorHex: '#EC4899', shapeType: 'rect', shapeData: { x: 500, y: 100, w: 150, h: 350 }, labelX: 575, labelY: 275 },
      { name: 'Tribuna Izquierda', colorHex: '#F59E0B', shapeType: 'rect', shapeData: { x: 750, y: 100, w: 150, h: 350 }, labelX: 825, labelY: 275 },
      { name: 'VIP', colorHex: '#10B981', shapeType: 'circle', shapeData: { cx: 950, cy: 300, r: 80 }, labelX: 950, labelY: 300 },
    ],
  },
  theater: {
    name: 'Auditorio',
    width: 800,
    height: 500,
    shapes: [
      { name: 'Orquesta', colorHex: '#6B46C1', shapeType: 'rect', shapeData: { x: 50, y: 100, w: 300, h: 200 }, labelX: 200, labelY: 200 },
      { name: 'Balcón', colorHex: '#7C3AED', shapeType: 'rect', shapeData: { x: 400, y: 100, w: 300, h: 200 }, labelX: 550, labelY: 200 },
      { name: 'Escenario', colorHex: '#F59E0B', shapeType: 'rect', shapeData: { x: 150, y: 330, w: 500, h: 100 }, labelX: 400, labelY: 380 },
    ],
  },
  festival: {
    name: 'Festival',
    width: 1200,
    height: 800,
    shapes: [
      { name: 'Escenario Principal', colorHex: '#FF6B6B', shapeType: 'rect', shapeData: { x: 50, y: 50, w: 1100, h: 150 }, labelX: 600, labelY: 125 },
      { name: 'Pit Frente', colorHex: '#6B46C1', shapeType: 'rect', shapeData: { x: 50, y: 250, w: 1100, h: 300 }, labelX: 600, labelY: 400 },
      { name: 'VIP Front Row', colorHex: '#10B981', shapeType: 'rect', shapeData: { x: 50, y: 600, w: 350, h: 150 }, labelX: 225, labelY: 675 },
      { name: 'VIP Side', colorHex: '#EC4899', shapeType: 'rect', shapeData: { x: 450, y: 600, w: 300, h: 150 }, labelX: 600, labelY: 675 },
      { name: 'General', colorHex: '#F59E0B', shapeType: 'rect', shapeData: { x: 800, y: 600, w: 350, h: 150 }, labelX: 975, labelY: 675 },
    ],
  },
}

export default function VenueMapEditor({ eventId }: VenueMapEditorProps) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const svgRef = useRef<SVGSVGElement>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState<'select' | 'rect' | 'circle' | 'polygon'>('select')
  const [svgWidth, setSvgWidth] = useState(1200)
  const [svgHeight, setSvgHeight] = useState(600)
  const [form] = Form.useForm()
  const [showTemplates, setShowTemplates] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Undo/Redo
  const [sections, setSections] = useState<Shape[]>([])
  const [history, setHistory] = useState<Shape[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Load map data
  const { data: mapData, isLoading } = useQuery({
    queryKey: ['venue-map', eventId],
    queryFn: () => ticketEventsApi.getMap(eventId),
  })

  useEffect(() => {
    if (mapData?.data?.sections) {
      setSections(mapData.data.sections)
      setHistory([mapData.data.sections])
      setHistoryIndex(0)
    }
  }, [mapData])

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

  const updateHistory = (newSections: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newSections)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setSections(newSections)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setSections(history[newIndex])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setSections(history[newIndex])
    }
  }

  const getSVGCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawMode === 'select') return

    const coords = getSVGCoords(e)
    setStartPos(coords)
    setIsDrawing(true)
  }

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || drawMode === 'select') return

    const coords = getSVGCoords(e)
    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Zona ${sections.length + 1}`,
      colorHex: '#6B46C1',
      shapeType: drawMode,
      labelX: (startPos.x + coords.x) / 2,
      labelY: (startPos.y + coords.y) / 2,
    }

    if (drawMode === 'rect') {
      newShape.shapeData = {
        x: Math.min(startPos.x, coords.x),
        y: Math.min(startPos.y, coords.y),
        w: Math.abs(coords.x - startPos.x),
        h: Math.abs(coords.y - startPos.y),
      }
    } else if (drawMode === 'circle') {
      const dx = coords.x - startPos.x
      const dy = coords.y - startPos.y
      const r = Math.sqrt(dx * dx + dy * dy)
      newShape.shapeData = { cx: startPos.x, cy: startPos.y, r }
    }

    updateHistory([...sections, newShape])
    setIsDrawing(false)
    setSelectedId(newShape.id)
  }

  const handleShapeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (drawMode !== 'select') return

    const coords = getSVGCoords(e as any)
    setDraggingId(id)

    const shape = sections.find(s => s.id === id)
    if (shape?.shapeData) {
      const refX = shape.shapeType === 'rect' ? shape.shapeData.x : shape.shapeData.cx
      const refY = shape.shapeType === 'rect' ? shape.shapeData.y : shape.shapeData.cy
      setDragOffset({ x: coords.x - refX, y: coords.y - refY })
    }
    setSelectedId(id)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSVGCoords(e)

    if (resizingId && resizeHandle) {
      const updated = sections.map(s => {
        if (s.id !== resizingId) return s
        if (s.shapeType !== 'rect' || !s.shapeData) return s

        const { x, y, w, h } = s.shapeData
        let newX = x, newY = y, newW = w, newH = h

        if (resizeHandle.includes('n')) newY = Math.min(coords.y, y + h - 20)
        if (resizeHandle.includes('s')) newH = Math.max(20, coords.y - y)
        if (resizeHandle.includes('w')) newX = Math.min(coords.x, x + w - 20)
        if (resizeHandle.includes('e')) newW = Math.max(20, coords.x - x)

        return {
          ...s,
          shapeData: { x: newX, y: newY, w: newW, h: newH },
          labelX: newX + newW / 2,
          labelY: newY + newH / 2,
        }
      })
      setSections(updated)
      return
    }

    if (!draggingId) return

    const updated = sections.map(s => {
      if (s.id !== draggingId) return s

      const newX = coords.x - dragOffset.x
      const newY = coords.y - dragOffset.y

      return {
        ...s,
        shapeData: s.shapeType === 'rect'
          ? { ...s.shapeData, x: newX, y: newY }
          : { ...s.shapeData, cx: newX, cy: newY },
        labelX: newX + (s.shapeData?.w || s.shapeData?.r || 50) / 2,
        labelY: newY + (s.shapeData?.h || s.shapeData?.r || 50) / 2,
      }
    })
    setSections(updated)
  }

  const handleMouseUpGlobal = () => {
    if (draggingId || resizingId) {
      updateHistory(sections)
      setDraggingId(null)
      setResizingId(null)
      setResizeHandle(null)
    }
  }

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUpGlobal)
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal)
  }, [draggingId, resizingId, sections])

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

  const handleDeleteShape = () => {
    if (!selectedId) return
    Modal.confirm({
      title: 'Eliminar zona',
      content: '¿Eliminar esta zona del mapa?',
      okText: 'Sí',
      cancelText: 'No',
      onOk: () => {
        const updated = sections.filter(s => s.id !== selectedId)
        updateHistory(updated)
        setSelectedId(null)
      },
    })
  }

  const handleClear = () => {
    Modal.confirm({
      title: 'Limpiar mapa',
      content: '¿Eliminar todas las zonas? Esta acción no se puede deshacer.',
      okText: 'Sí',
      cancelText: 'No',
      onOk: () => {
        updateHistory([])
        setSelectedId(null)
      },
    })
  }

  const handleLoadTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey]
    setSvgWidth(template.width)
    setSvgHeight(template.height)
    const newShapes = template.shapes.map((s, idx) => ({
      ...s,
      id: Math.random().toString(36).substr(2, 9),
    }))
    updateHistory(newShapes)
    setShowTemplates(false)
    message.success(`Plantilla "${template.name}" cargada`)
  }

  if (isLoading) return <Spin />

  return (
    <div style={{ display: 'flex', gap: 16, height: 650 }}>
      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
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
            </Space>
            <Button.Group>
              <Button size="small" icon={<UndoOutlined />} onClick={handleUndo} disabled={historyIndex === 0} />
              <Button size="small" icon={<RedoOutlined />} onClick={handleRedo} disabled={historyIndex === history.length - 1} />
            </Button.Group>
            <Button.Group>
              <Button size="small" icon={<ZoomInOutlined />} onClick={() => setZoom(Math.min(2, zoom + 0.1))} />
              <span style={{ padding: '4px 8px', fontSize: 12 }}>{Math.round(zoom * 100)}%</span>
              <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} />
            </Button.Group>
            <Button size="small" onClick={() => setShowTemplates(true)}>
              Plantillas
            </Button>
            <Button size="small" danger icon={<ClearOutlined />} onClick={handleClear}>
              Limpiar
            </Button>
          </Space>
        </div>
        <svg
          ref={svgRef}
          width={svgWidth * zoom}
          height={svgHeight * zoom}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            cursor: drawMode === 'select' ? 'pointer' : 'crosshair',
            backgroundColor: '#fafafa',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {/* Render sections */}
          {sections.map(sec => {
            const isSelected = sec.id === selectedId
            return (
              <g key={sec.id} onMouseDown={(e) => handleShapeMouseDown(sec.id, e)}>
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
                    style={{ cursor: 'move' }}
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
                    style={{ cursor: 'move' }}
                  />
                )}
                {/* Label */}
                <text
                  x={sec.labelX ?? 0}
                  y={sec.labelY ?? 0}
                  fontSize="14"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  fill={isSelected ? '#000' : '#666'}
                  pointerEvents="none"
                  textAnchor="middle"
                >
                  {sec.name}
                </text>

                {/* Resize handles for rectangles */}
                {isSelected && sec.shapeType === 'rect' && sec.shapeData && (
                  <>
                    {['nw', 'ne', 'sw', 'se'].map(handle => {
                      const { x, y, w, h } = sec.shapeData
                      let cx = x, cy = y
                      if (handle.includes('e')) cx = x + w
                      if (handle.includes('s')) cy = y + h
                      const cursor = `${handle}-resize`
                      return (
                        <circle
                          key={handle}
                          cx={cx}
                          cy={cy}
                          r="6"
                          fill="#fff"
                          stroke="#000"
                          strokeWidth="2"
                          onMouseDown={() => {
                            setResizingId(sec.id)
                            setResizeHandle(handle as any)
                          }}
                          style={{ cursor }}
                        />
                      )
                    })}
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Inspector Panel */}
      <div style={{ width: 300, borderLeft: '1px solid #d9d9d9', paddingLeft: 16, overflowY: 'auto', maxHeight: '100%' }}>
        {selected ? (
          <>
            <Form layout="vertical" size="small">
              <Form.Item label="Nombre de la zona">
                <Input
                  value={selected.name}
                  onChange={(e) => {
                    const updated = sections.map(s =>
                      s.id === selected.id ? { ...s, name: e.target.value } : s
                    )
                    setSections(updated)
                  }}
                />
              </Form.Item>

              <Form.Item label="Color de zona">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 4,
                      backgroundColor: selected.colorHex,
                      border: '1px solid #d9d9d9',
                    }}
                  />
                  <input
                    type="color"
                    value={selected.colorHex}
                    onChange={(e) => {
                      const updated = sections.map(s =>
                        s.id === selected.id ? { ...s, colorHex: e.target.value } : s
                      )
                      setSections(updated)
                    }}
                    style={{ width: 50, height: 40, cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: 4 }}
                  />
                </div>
              </Form.Item>

              <Form.Item label="Etiqueta X">
                <InputNumber
                  value={selected.labelX ?? 0}
                  onChange={(val) => {
                    const updated = sections.map(s =>
                      s.id === selected.id ? { ...s, labelX: val ?? 0 } : s
                    )
                    setSections(updated)
                  }}
                />
              </Form.Item>

              <Form.Item label="Etiqueta Y">
                <InputNumber
                  value={selected.labelY ?? 0}
                  onChange={(val) => {
                    const updated = sections.map(s =>
                      s.id === selected.id ? { ...s, labelY: val ?? 0 } : s
                    )
                    setSections(updated)
                  }}
                />
              </Form.Item>
            </Form>
            <Button danger block icon={<DeleteOutlined />} size="small" onClick={handleDeleteShape}>
              Eliminar zona
            </Button>
          </>
        ) : (
          <p style={{ color: '#999', fontSize: 12 }}>Dibuja una forma o selecciona una zona para editar</p>
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

      {/* Templates Modal */}
      <Modal
        title="Plantillas de Venue"
        open={showTemplates}
        onCancel={() => setShowTemplates(false)}
        footer={null}
        width={600}
      >
        <Row gutter={[16, 16]}>
          {Object.entries(TEMPLATES).map(([key, template]) => (
            <Col xs={24} sm={12} key={key}>
              <Card
                hoverable
                onClick={() => handleLoadTemplate(key)}
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontSize: 48, marginBottom: 8 }}>
                  {key === 'stadium' && '🏟️'}
                  {key === 'theater' && '🎭'}
                  {key === 'festival' && '🎪'}
                </div>
                <div style={{ fontWeight: 500 }}>{template.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{template.shapes.length} zonas</div>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>
    </div>
  )
}
