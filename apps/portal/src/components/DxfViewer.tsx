import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Spin, Alert, Checkbox, Space, Typography, Tag, Drawer, Form, Input,
  Select, InputNumber, Button, Popconfirm, App, Modal, Tooltip,
} from 'antd'
import { EditOutlined, StopOutlined } from '@ant-design/icons'
import Konva from 'konva'
import { Stage, Layer, Line, Circle, Text, Group } from 'react-konva'
// @ts-ignore — no official types for dxf-parser
import DxfParser from 'dxf-parser'

const { Text: AntText } = Typography

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StandGeo {
  id: string
  code: string
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED'
  polygon: [number, number][] | null
  dxfEntityIdx: number | null
  floorPlanId: string | null
  clientId?: string | null
  clientName?: string | null
  widthM?: number | null
  depthM?: number | null
  heightM?: number | null
  locationNotes?: string | null
}

export interface StandSaveData {
  id?: string
  code: string
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED'
  widthM?: number | null
  depthM?: number | null
  heightM?: number | null
  locationNotes?: string | null
  polygon: [number, number][]
  dxfEntityIdx: number | null
  floorPlanId: string
}

interface FloorPlan { id: string; name: string; fileName: string; fileUrl: string }

interface Props {
  eventId: string
  floorPlan: FloorPlan
  fetchContent: (fpId: string) => Promise<{ data: { content: string } }>
  stands?: StandGeo[]
  readonly?: boolean
  onStandSave?: (data: StandSaveData) => Promise<void>
  onStandDelete?: (standId: string) => Promise<void>
  height?: number
}

interface DxfEntity {
  type: string
  layer?: string
  color?: number
  vertices?: Array<{ x: number; y: number }>
  shape?: boolean
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  center?: { x: number; y: number }
  radius?: number
  text?: string
  position?: { x: number; y: number }
  insertionPoint?: { x: number; y: number }
  height?: number
}

interface ParsedDxf { entities: DxfEntity[] }

// ─── Constants ───────────────────────────────────────────────────────────────

const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', 2: '#FFFF00', 3: '#00FF00',
  4: '#00FFFF', 5: '#0000FF', 6: '#FF00FF',
  7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0',
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e',
  RESERVED:  '#eab308',
  SOLD:      '#ef4444',
  BLOCKED:   '#64748b',
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED:  'Reservado',
  SOLD:      'Vendido',
  BLOCKED:   'Bloqueado',
}

function aciToHex(color?: number): string {
  if (!color) return '#94a3b8'
  return ACI_COLORS[color] ?? '#94a3b8'
}

function computeBBox(entities: DxfEntity[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const expand = (x: number, y: number) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  for (const e of entities) {
    if (e.vertices) for (const v of e.vertices) expand(v.x, v.y)
    if (e.start) expand(e.start.x, e.start.y)
    if (e.end) expand(e.end.x, e.end.y)
    if (e.center && e.radius) {
      expand(e.center.x - e.radius, e.center.y - e.radius)
      expand(e.center.x + e.radius, e.center.y + e.radius)
    }
    if (e.position) expand(e.position.x, e.position.y)
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  return { minX, minY, maxX, maxY }
}

function isClosedPolyline(entity: DxfEntity): boolean {
  if (!entity.vertices || entity.vertices.length < 3) return false
  if (entity.shape) return true
  const first = entity.vertices[0]
  const last = entity.vertices[entity.vertices.length - 1]
  return Math.abs(first.x - last.x) < 0.001 && Math.abs(first.y - last.y) < 0.001
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DxfViewer({
  eventId: _eventId, floorPlan, fetchContent, stands = [],
  readonly = false, onStandSave, onStandDelete, height = 560,
}: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  // Parse state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dxf, setDxf] = useState<ParsedDxf | null>(null)
  const [allLayers, setAllLayers] = useState<string[]>([])
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())

  // Viewport
  const stageRef = useRef<Konva.Stage | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(800)
  const PADDING = 40
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const baseTransform = useRef({ scale: 1, x: 0, y: 0 })

  // Selection / editing
  const [selectedEntityIdx, setSelectedEntityIdx] = useState<number | null>(null)
  const [editingStand, setEditingStand] = useState<Partial<StandSaveData> | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Draw mode
  const [drawMode, setDrawMode] = useState(false)
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([])
  const [cursorDxf, setCursorDxf] = useState<[number, number] | null>(null)

  // Portal modal
  const [portalStand, setPortalStand] = useState<StandGeo | null>(null)

  // ── Container resize ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      setStageWidth(entries[0].contentRect.width || 800)
    })
    obs.observe(el)
    setStageWidth(el.clientWidth || 800)
    return () => obs.disconnect()
  }, [])

  // ── Load DXF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelectedEntityIdx(null)
    setDrawerOpen(false)
    fetchContent(floorPlan.id)
      .then(({ data }) => {
        const parser = new DxfParser()
        const parsed = parser.parseSync(data.content) as ParsedDxf
        setDxf(parsed)
        const layers = Array.from(new Set((parsed.entities ?? []).map((e) => e.layer ?? '0'))).sort()
        setAllLayers(layers)
        setVisibleLayers(new Set(layers))

        const bbox = computeBBox(parsed.entities ?? [])
        const dxfW = bbox.maxX - bbox.minX || 1
        const dxfH = bbox.maxY - bbox.minY || 1
        const cw = containerRef.current?.clientWidth ?? 800
        const fitScale = Math.min((cw - PADDING * 2) / dxfW, (height - PADDING * 2) / dxfH) * 0.9
        const tx = PADDING - bbox.minX * fitScale + ((cw - PADDING * 2) - dxfW * fitScale) / 2
        const ty = PADDING + bbox.maxY * fitScale + ((height - PADDING * 2) - dxfH * fitScale) / 2
        baseTransform.current = { scale: fitScale, x: tx, y: ty }
        setScale(fitScale)
        setPos({ x: tx, y: ty })
      })
      .catch((e) => setError(e?.message ?? 'Error al cargar el plano'))
      .finally(() => setLoading(false))
  }, [floorPlan.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom ─────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const scaleBy = 1.12
    const old = stage.scaleX()
    const ptr = stage.getPointerPosition()!
    const mousePt = { x: (ptr.x - stage.x()) / old, y: (ptr.y - stage.y()) / old }
    const next = e.evt.deltaY < 0 ? old * scaleBy : old / scaleBy
    setScale(next)
    setPos({ x: ptr.x - mousePt.x * next, y: ptr.y - mousePt.y * next })
  }, [])

  // ── Draw mode helpers ────────────────────────────────────────────────────
  function screenToDxf(screenX: number, screenY: number): [number, number] {
    return [(screenX - pos.x) / scale, -((screenY - pos.y) / scale)]
  }

  function isNearFirstPoint(dx: number, dy: number): boolean {
    if (drawPoints.length < 3) return false
    const [fx, fy] = drawPoints[0]
    const screenDist = Math.sqrt(((dx - fx) * scale) ** 2 + ((dy - fy) * scale) ** 2)
    return screenDist < 14
  }

  function finishPolygon(pts: [number, number][]) {
    if (pts.length < 3) return
    setDrawMode(false)
    setDrawPoints([])
    setCursorDxf(null)
    const draft: Partial<StandSaveData> = {
      code: '', status: 'AVAILABLE',
      polygon: pts, dxfEntityIdx: null, floorPlanId: floorPlan.id,
    }
    setEditingStand(draft)
    form.setFieldsValue({ code: '', status: 'AVAILABLE', widthM: null, depthM: null, heightM: null, locationNotes: null })
    setDrawerOpen(true)
  }

  function cancelDraw() {
    setDrawMode(false)
    setDrawPoints([])
    setCursorDxf(null)
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawMode) return
    // ignore clicks on stand overlays (they have their own handler)
    if (e.target !== e.currentTarget && e.target.getParent()?.getParent() !== stageRef.current?.findOne('Layer')) {
      // let it through — we only care about stage-level clicks
    }
    const stage = stageRef.current
    if (!stage) return
    const ptr = stage.getPointerPosition()!
    const [dx, dy] = screenToDxf(ptr.x, ptr.y)

    if (isNearFirstPoint(dx, dy)) {
      finishPolygon(drawPoints)
      return
    }
    setDrawPoints((prev) => [...prev, [dx, dy]])
  }

  function handleStageDblClick() {
    if (!drawMode || drawPoints.length < 3) return
    finishPolygon(drawPoints)
  }

  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawMode) return
    const stage = stageRef.current
    if (!stage) return
    const ptr = stage.getPointerPosition()!
    setCursorDxf(screenToDxf(ptr.x, ptr.y))
  }

  // Escape cancels draw
  useEffect(() => {
    if (!drawMode) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelDraw() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drawMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render draw preview ───────────────────────────────────────────────────
  function renderDrawPreview() {
    if (!drawMode || drawPoints.length === 0) return null
    const nearFirst = cursorDxf ? isNearFirstPoint(cursorDxf[0], cursorDxf[1]) : false
    const sw = 2 / scale

    return (
      <>
        {/* Solid drawn segments */}
        {drawPoints.length > 1 && (
          <Line
            points={drawPoints.flatMap(([x, y]) => [x, -y])}
            stroke="#f59e0b" strokeWidth={sw} listening={false}
          />
        )}
        {/* Dashed preview to cursor */}
        {cursorDxf && (
          <Line
            points={[
              drawPoints[drawPoints.length - 1][0], -drawPoints[drawPoints.length - 1][1],
              cursorDxf[0], -cursorDxf[1],
            ]}
            stroke={nearFirst ? '#22c55e' : '#f59e0b'}
            strokeWidth={sw}
            dash={[6 / scale, 3 / scale]}
            listening={false}
          />
        )}
        {/* Snap ring on first point when close */}
        {nearFirst && (
          <Circle
            x={drawPoints[0][0]} y={-drawPoints[0][1]}
            radius={10 / scale}
            stroke="#22c55e" strokeWidth={sw} listening={false}
          />
        )}
        {/* Vertex dots */}
        {drawPoints.map(([x, y], i) => (
          <Circle
            key={i} x={x} y={-y}
            radius={4 / scale}
            fill={i === 0 ? '#22c55e' : '#f59e0b'}
            listening={false}
          />
        ))}
      </>
    )
  }

  // ── Entity click (admin identify mode) ───────────────────────────────────
  function handleEntityClick(entityIdx: number, entity: DxfEntity) {
    if (readonly || !entity.vertices?.length) return
    setSelectedEntityIdx(entityIdx)
    const polygon = entity.vertices.map((v) => [v.x, v.y] as [number, number])
    const existing = stands.find((s) => s.dxfEntityIdx === entityIdx && s.floorPlanId === floorPlan.id)
    const draft: Partial<StandSaveData> = existing
      ? { id: existing.id, code: existing.code, status: existing.status,
          widthM: existing.widthM, depthM: existing.depthM, heightM: existing.heightM,
          locationNotes: existing.locationNotes, polygon, dxfEntityIdx: entityIdx, floorPlanId: floorPlan.id }
      : { code: '', status: 'AVAILABLE', polygon, dxfEntityIdx: entityIdx, floorPlanId: floorPlan.id }
    setEditingStand(draft)
    form.setFieldsValue(draft)
    setDrawerOpen(true)
  }

  // ── Stand overlay click ───────────────────────────────────────────────────
  function handleStandOverlayClick(stand: StandGeo) {
    if (readonly) {
      setPortalStand(stand)
    } else {
      const existing: Partial<StandSaveData> = {
        id: stand.id, code: stand.code, status: stand.status,
        widthM: stand.widthM, depthM: stand.depthM, heightM: stand.heightM,
        locationNotes: stand.locationNotes,
        polygon: stand.polygon ?? [],
        dxfEntityIdx: stand.dxfEntityIdx,
        floorPlanId: stand.floorPlanId ?? floorPlan.id,
      }
      setEditingStand(existing)
      setSelectedEntityIdx(stand.dxfEntityIdx)
      form.setFieldsValue(existing)
      setDrawerOpen(true)
    }
  }

  // ── Save stand ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!editingStand || !onStandSave) return
    try {
      const values = await form.validateFields()
      setSaving(true)
      await onStandSave({
        id: editingStand.id,
        code: values.code,
        status: values.status,
        widthM: values.widthM ?? null,
        depthM: values.depthM ?? null,
        heightM: values.heightM ?? null,
        locationNotes: values.locationNotes ?? null,
        polygon: editingStand.polygon ?? [],
        dxfEntityIdx: editingStand.dxfEntityIdx ?? null,
        floorPlanId: floorPlan.id,
      })
      setDrawerOpen(false)
      setSelectedEntityIdx(null)
    } catch {
      // validation errors handled by Ant Design
    } finally {
      setSaving(false)
    }
  }

  // ── Delete stand ─────────────────────────────────────────────────────────
  async function handleDelete(standId: string) {
    if (!onStandDelete) return
    setDeletingId(standId)
    try {
      await onStandDelete(standId)
      setDrawerOpen(false)
      setSelectedEntityIdx(null)
    } catch {
      message.error('Error al eliminar el stand')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render DXF entities ──────────────────────────────────────────────────
  function renderEntities() {
    if (!dxf) return null
    const shapes: React.ReactNode[] = []

    dxf.entities.forEach((entity, idx) => {
      const layer = entity.layer ?? '0'
      if (!visibleLayers.has(layer)) return
      const color = aciToHex(entity.color)
      const isSelected = idx === selectedEntityIdx
      const isIdentifiable = !readonly && (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && isClosedPolyline(entity)
      const isAlreadyStand = stands.some((s) => s.dxfEntityIdx === idx && s.floorPlanId === floorPlan.id)
      const strokeW = isSelected ? 3 / scale : 1 / scale
      const stroke = isSelected ? '#f59e0b' : color

      if (entity.type === 'LINE' && entity.start && entity.end) {
        shapes.push(
          <Line key={idx}
            points={[entity.start.x, -entity.start.y, entity.end.x, -entity.end.y]}
            stroke={stroke} strokeWidth={strokeW} listening={false}
          />
        )
      } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices?.length) {
        const pts = entity.vertices.flatMap((v) => [v.x, -v.y])
        shapes.push(
          <Line key={idx}
            points={pts}
            stroke={isAlreadyStand ? '#475569' : stroke}
            strokeWidth={strokeW}
            closed={!!entity.shape || isClosedPolyline(entity)}
            listening={isIdentifiable && !isAlreadyStand}
            onClick={() => handleEntityClick(idx, entity)}
            onMouseEnter={isIdentifiable && !isAlreadyStand ? (e) => {
              e.target.stroke('#f59e0b')
              stageRef.current?.container().style.setProperty('cursor', 'pointer')
            } : undefined}
            onMouseLeave={isIdentifiable && !isAlreadyStand ? (e) => {
              e.target.stroke(color)
              stageRef.current?.container().style.setProperty('cursor', 'grab')
            } : undefined}
          />
        )
      } else if (entity.type === 'CIRCLE' && entity.center) {
        shapes.push(
          <Circle key={idx}
            x={entity.center.x} y={-entity.center.y}
            radius={entity.radius ?? 1}
            stroke={stroke} strokeWidth={strokeW} listening={false}
          />
        )
      } else if ((entity.type === 'TEXT' || entity.type === 'MTEXT') && (entity.position || entity.insertionPoint)) {
        const pt = entity.position ?? entity.insertionPoint!
        const fontSize = Math.max((entity.height ?? 2.5) * 0.8, 1)
        shapes.push(
          <Text key={idx}
            x={pt.x} y={-pt.y - fontSize}
            text={entity.text ?? ''} fontSize={fontSize}
            fill={color} listening={false}
          />
        )
      }
    })

    return shapes
  }

  // ── Render stand overlays ────────────────────────────────────────────────
  function renderStandOverlays() {
    const elements: React.ReactNode[] = []

    stands
      .filter((s) => s.polygon && s.polygon.length >= 3 && s.floorPlanId === floorPlan.id)
      .forEach((stand) => {
        const poly = stand.polygon!
        const pts = poly.flatMap(([x, y]) => [x, -y])
        const color = STATUS_COLORS[stand.status] ?? '#94a3b8'
        const isEditingThis = editingStand?.id === stand.id

        // Centroid for label positioning
        const cx = poly.reduce((s, [x]) => s + x, 0) / poly.length
        const cy = poly.reduce((s, [, y]) => s + y, 0) / poly.length

        // Font size fixed in screen pixels regardless of zoom
        const fontSize = 13 / scale
        const labelWidth = stand.code.length * fontSize * 0.65

        elements.push(
          <Line
            key={stand.id}
            points={pts}
            closed
            fill={color + '55'}
            stroke={isEditingThis ? '#f59e0b' : color}
            strokeWidth={(isEditingThis ? 3 : 2) / scale}
            listening
            onClick={() => handleStandOverlayClick(stand)}
            onMouseEnter={(e) => {
              e.target.opacity(0.8)
              stageRef.current?.container().style.setProperty('cursor', 'pointer')
            }}
            onMouseLeave={(e) => {
              e.target.opacity(1)
              stageRef.current?.container().style.setProperty('cursor', 'grab')
            }}
          />,
          <Text
            key={`${stand.id}-label`}
            x={cx - labelWidth / 2}
            y={-cy - fontSize / 2}
            text={stand.code}
            fontSize={fontSize}
            fontStyle="bold"
            fill="#ffffff"
            listening={false}
          />,
        )
      })

    return elements
  }

  return (
    <div>
      {/* Layer panel */}
      {allLayers.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <AntText type="secondary" style={{ fontSize: 12, marginRight: 4 }}>Capas:</AntText>
          {allLayers.map((layer) => (
            <Checkbox key={layer} checked={visibleLayers.has(layer)}
              onChange={(e) => setVisibleLayers((prev) => {
                const next = new Set(prev)
                if (e.target.checked) next.add(layer); else next.delete(layer)
                return next
              })}
              style={{ fontSize: 12 }}
            >
              {layer}
            </Checkbox>
          ))}
          <Tag style={{ cursor: 'pointer', marginLeft: 8 }}
            onClick={() => { setScale(baseTransform.current.scale); setPos({ x: baseTransform.current.x, y: baseTransform.current.y }) }}>
            Restablecer vista
          </Tag>
        </div>
      )}

      {/* Toolbar (admin mode) */}
      {!readonly && (
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Tooltip title="Dibuja un polígono personalizado para crear un stand. Clic = agregar vértice · Clic en primer punto o doble-clic = cerrar · Escape = cancelar">
            <Button
              icon={drawMode ? <StopOutlined /> : <EditOutlined />}
              type={drawMode ? 'primary' : 'default'}
              danger={drawMode}
              onClick={() => drawMode ? cancelDraw() : setDrawMode(true)}
            >
              {drawMode ? `Cancelar (${drawPoints.length} pts)` : 'Dibujar stand'}
            </Button>
          </Tooltip>
          {!drawMode && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              O haz clic en un <strong style={{ color: '#f59e0b' }}>polígono cerrado</strong> del DXF para identificarlo
            </span>
          )}
          {drawMode && (
            <span style={{ fontSize: 12, color: '#f59e0b' }}>
              {drawPoints.length === 0
                ? 'Haz clic para agregar el primer vértice'
                : drawPoints.length < 3
                ? `${drawPoints.length} vértice(s) — agrega al menos 3`
                : 'Cierra el polígono haciendo clic en el primer punto (verde) o doble-clic'}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            {Object.entries(STATUS_COLORS).map(([k, c]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#94a3b8' }}>
                <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: 'inline-block' }} />
                {STATUS_LABELS[k]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef}
        style={{ background: '#0f172a', borderRadius: 8, overflow: 'hidden', height, position: 'relative', cursor: 'grab' }}
      >
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space direction="vertical" align="center">
              <Spin size="large" />
              <AntText style={{ color: '#94a3b8' }}>Cargando plano…</AntText>
            </Space>
          </div>
        )}
        {error && <div style={{ padding: 24 }}><Alert type="error" message={error} /></div>}
        {!loading && !error && dxf && (
          <Stage ref={stageRef} width={stageWidth} height={height}
            scaleX={scale} scaleY={scale} x={pos.x} y={pos.y}
            draggable={!drawMode}
            style={{ cursor: drawMode ? 'crosshair' : undefined }}
            onWheel={handleWheel}
            onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
            onClick={drawMode ? handleStageClick : undefined}
            onDblClick={drawMode ? handleStageDblClick : undefined}
            onMouseMove={drawMode ? handleStageMouseMove : undefined}
          >
            <Layer>
              <Group>{renderEntities()}</Group>
            </Layer>
            <Layer>
              {renderStandOverlays()}
            </Layer>
            <Layer>
              {renderDrawPreview()}
            </Layer>
          </Stage>
        )}
      </div>

      <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
        <span>Rueda: zoom · Arrastrar: mover</span>
        <span>{dxf?.entities?.length ?? 0} entidades · {allLayers.length} capa(s)</span>
        <span>{stands.filter(s => s.floorPlanId === floorPlan.id).length} stand(s) identificado(s)</span>
      </div>

      {/* Admin: stand edit drawer */}
      {!readonly && (
        <Drawer
          title={editingStand?.id ? `Editar stand — ${editingStand.code}` : 'Identificar stand'}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedEntityIdx(null) }}
          width={360}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {editingStand?.id && onStandDelete ? (
                <Popconfirm title="¿Eliminar este stand?" onConfirm={() => handleDelete(editingStand.id!)}>
                  <Button danger loading={!!deletingId}>Eliminar stand</Button>
                </Popconfirm>
              ) : <span />}
              <Space>
                <Button onClick={() => { setDrawerOpen(false); setSelectedEntityIdx(null) }}>Cancelar</Button>
                <Button type="primary" onClick={handleSave} loading={saving}>Guardar</Button>
              </Space>
            </div>
          }
        >
          <Form form={form} layout="vertical">
            <Form.Item name="code" label="Código / Número de stand" rules={[{ required: true, message: 'Requerido' }]}>
              <Input placeholder="Ej: A-01" />
            </Form.Item>
            <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
              <Select options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
            <Form.Item label="Dimensiones (m)">
              <Space>
                <Form.Item name="widthM" noStyle>
                  <InputNumber placeholder="Ancho" min={0} style={{ width: 90 }} />
                </Form.Item>
                <Form.Item name="depthM" noStyle>
                  <InputNumber placeholder="Largo" min={0} style={{ width: 90 }} />
                </Form.Item>
                <Form.Item name="heightM" noStyle>
                  <InputNumber placeholder="Alto" min={0} style={{ width: 90 }} />
                </Form.Item>
              </Space>
            </Form.Item>
            <Form.Item name="locationNotes" label="Notas de ubicación">
              <Input.TextArea rows={2} placeholder="Ej: Pasillo norte, esquina" />
            </Form.Item>
            {editingStand?.polygon && (
              <AntText type="secondary" style={{ fontSize: 11 }}>
                Polígono: {editingStand.polygon.length} vértices del DXF
              </AntText>
            )}
          </Form>
        </Drawer>
      )}

      {/* Portal: stand detail modal */}
      {readonly && (
        <Modal
          open={!!portalStand}
          onCancel={() => setPortalStand(null)}
          footer={<Button onClick={() => setPortalStand(null)}>Cerrar</Button>}
          title={`Stand ${portalStand?.code ?? ''}`}
        >
          {portalStand && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <Tag color={
                  portalStand.status === 'AVAILABLE' ? 'green' :
                  portalStand.status === 'RESERVED' ? 'gold' : 'red'
                }>
                  {STATUS_LABELS[portalStand.status]}
                </Tag>
              </div>
              {portalStand.clientName && <div><strong>Empresa:</strong> {portalStand.clientName}</div>}
              {portalStand.widthM && (
                <div><strong>Dimensiones:</strong> {String(portalStand.widthM)}m × {String(portalStand.depthM)}m
                  {portalStand.heightM ? ` × ${String(portalStand.heightM)}m h.` : ''}
                </div>
              )}
              {portalStand.locationNotes && <div><strong>Ubicación:</strong> {portalStand.locationNotes}</div>}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
