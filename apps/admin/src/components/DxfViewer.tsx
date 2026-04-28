import { useEffect, useRef, useState, useCallback } from 'react'
import { Spin, Alert, Checkbox, Space, Typography, Tag } from 'antd'
import Konva from 'konva'
import { Stage, Layer, Line, Circle, Text, Group } from 'react-konva'
// @ts-ignore — no official types for dxf-parser
import DxfParser from 'dxf-parser'

const { Text: AntText } = Typography

interface FloorPlan {
  id: string
  name: string
  fileUrl: string
  fileName: string
}

interface Props {
  eventId: string
  floorPlan: FloorPlan
  fetchContent: (fpId: string) => Promise<{ data: { content: string } }>
  height?: number
}

interface DxfEntity {
  type: string
  layer?: string
  color?: number
  vertices?: Array<{ x: number; y: number; z?: number }>
  shape?: boolean  // closed polyline flag
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  center?: { x: number; y: number }
  radius?: number
  startAngle?: number
  endAngle?: number
  text?: string
  position?: { x: number; y: number }
  insertionPoint?: { x: number; y: number }
  height?: number
}

interface ParsedDxf {
  entities: DxfEntity[]
  tables?: {
    layer?: {
      layers?: Record<string, { name: string; color?: number }>
    }
  }
}

// DXF color index → hex (first 9 standard ACI colors)
const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', 2: '#FFFF00', 3: '#00FF00',
  4: '#00FFFF', 5: '#0000FF', 6: '#FF00FF',
  7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0',
}

function aciToHex(color?: number): string {
  if (!color) return '#334155'
  return ACI_COLORS[color] ?? '#334155'
}

function computeBBox(entities: DxfEntity[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  function expand(x: number, y: number) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  for (const e of entities) {
    if (e.vertices) {
      for (const v of e.vertices) expand(v.x, v.y)
    }
    if (e.start) expand(e.start.x, e.start.y)
    if (e.end) expand(e.end.x, e.end.y)
    if (e.center && e.radius) {
      expand(e.center.x - e.radius, e.center.y - e.radius)
      expand(e.center.x + e.radius, e.center.y + e.radius)
    }
    if (e.position) expand(e.position.x, e.position.y)
    if (e.insertionPoint) expand(e.insertionPoint.x, e.insertionPoint.y)
  }

  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  return { minX, minY, maxX, maxY }
}

export default function DxfViewer({ eventId: _eventId, floorPlan, fetchContent, height = 560 }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dxf, setDxf] = useState<ParsedDxf | null>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())
  const [allLayers, setAllLayers] = useState<string[]>([])
  const stageRef = useRef<Konva.Stage | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(800)
  const PADDING = 40

  // Viewport transform
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  // Store base transform so we can reset
  const baseTransform = useRef({ scale: 1, x: 0, y: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      setStageWidth(entries[0].contentRect.width || 800)
    })
    observer.observe(container)
    setStageWidth(container.clientWidth || 800)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchContent(floorPlan.id)
      .then(({ data }) => {
        const parser = new DxfParser()
        const parsed = parser.parseSync(data.content) as ParsedDxf
        setDxf(parsed)

        const layers = Array.from(
          new Set((parsed.entities ?? []).map((e) => e.layer ?? '0'))
        ).sort()
        setAllLayers(layers)
        setVisibleLayers(new Set(layers))

        // Compute initial transform to fit all entities
        const bbox = computeBBox(parsed.entities ?? [])
        const dxfW = bbox.maxX - bbox.minX || 1
        const dxfH = bbox.maxY - bbox.minY || 1
        const containerW = containerRef.current?.clientWidth ?? 800
        const fitScale = Math.min(
          (containerW - PADDING * 2) / dxfW,
          (height - PADDING * 2) / dxfH,
        ) * 0.9
        const tx = PADDING - bbox.minX * fitScale + ((containerW - PADDING * 2) - dxfW * fitScale) / 2
        const ty = PADDING + bbox.maxY * fitScale + ((height - PADDING * 2) - dxfH * fitScale) / 2
        baseTransform.current = { scale: fitScale, x: tx, y: ty }
        setScale(fitScale)
        setPos({ x: tx, y: ty })
      })
      .catch((e) => setError(e?.message ?? 'Error al cargar el plano'))
      .finally(() => setLoading(false))
  }, [floorPlan.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const scaleBy = 1.12
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()!
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    setScale(newScale)
    setPos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [])

  function handleReset() {
    const { scale: s, x, y } = baseTransform.current
    setScale(s)
    setPos({ x, y })
  }

  function toggleLayer(layer: string, checked: boolean) {
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      if (checked) next.add(layer)
      else next.delete(layer)
      return next
    })
  }

  // Render DXF entities as Konva shapes
  function renderEntities() {
    if (!dxf) return null
    const shapes: React.ReactNode[] = []

    for (const entity of dxf.entities) {
      const layer = entity.layer ?? '0'
      if (!visibleLayers.has(layer)) continue
      const color = aciToHex(entity.color)
      const key = `${entity.type}-${shapes.length}`

      if (entity.type === 'LINE' && entity.start && entity.end) {
        shapes.push(
          <Line
            key={key}
            points={[entity.start.x, -entity.start.y, entity.end.x, -entity.end.y]}
            stroke={color}
            strokeWidth={1 / scale}
            listening={false}
          />
        )
      } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices?.length) {
        const pts = entity.vertices.flatMap((v) => [v.x, -v.y])
        shapes.push(
          <Line
            key={key}
            points={pts}
            stroke={color}
            strokeWidth={1 / scale}
            closed={!!entity.shape}
            listening={false}
          />
        )
      } else if (entity.type === 'CIRCLE' && entity.center) {
        shapes.push(
          <Circle
            key={key}
            x={entity.center.x}
            y={-entity.center.y}
            radius={entity.radius ?? 1}
            stroke={color}
            strokeWidth={1 / scale}
            listening={false}
          />
        )
      } else if ((entity.type === 'TEXT' || entity.type === 'MTEXT') && (entity.position || entity.insertionPoint)) {
        const pt = entity.position ?? entity.insertionPoint!
        const fontSize = Math.max((entity.height ?? 2.5) * 0.8, 1)
        shapes.push(
          <Text
            key={key}
            x={pt.x}
            y={-pt.y - fontSize}
            text={entity.text ?? ''}
            fontSize={fontSize}
            fill={color}
            listening={false}
          />
        )
      }
    }

    return shapes
  }

  return (
    <div>
      {/* Layer panel */}
      {allLayers.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <AntText type="secondary" style={{ fontSize: 12, marginRight: 4 }}>Capas:</AntText>
          {allLayers.map((layer) => (
            <Checkbox
              key={layer}
              checked={visibleLayers.has(layer)}
              onChange={(e) => toggleLayer(layer, e.target.checked)}
              style={{ fontSize: 12 }}
            >
              {layer}
            </Checkbox>
          ))}
          <Tag
            style={{ cursor: 'pointer', marginLeft: 8 }}
            onClick={handleReset}
          >
            Restablecer vista
          </Tag>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          background: '#0f172a',
          borderRadius: 8,
          overflow: 'hidden',
          height,
          position: 'relative',
          cursor: 'grab',
        }}
      >
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space direction="vertical" align="center">
              <Spin size="large" />
              <AntText style={{ color: '#94a3b8' }}>Cargando plano…</AntText>
            </Space>
          </div>
        )}
        {error && (
          <div style={{ padding: 24 }}>
            <Alert type="error" message={error} />
          </div>
        )}
        {!loading && !error && dxf && (
          <Stage
            ref={stageRef}
            width={stageWidth}
            height={height}
            scaleX={scale}
            scaleY={scale}
            x={pos.x}
            y={pos.y}
            draggable
            onWheel={handleWheel}
            onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
          >
            <Layer>
              <Group>{renderEntities()}</Group>
            </Layer>
          </Stage>
        )}
      </div>

      <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
        <span>Rueda del ratón: zoom</span>
        <span>Arrastrar: mover vista</span>
        <span>{dxf?.entities?.length ?? 0} entidades</span>
        <span>{allLayers.length} capa(s)</span>
      </div>
    </div>
  )
}
