import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Spin, Alert, Checkbox, Space, Typography, Tag, Drawer, Form, Input,
  Select, InputNumber, Button, Popconfirm, App, Modal, Tooltip, Table, Badge,
} from 'antd'
import { EditOutlined, StopOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons'
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
  orders?: Array<{ id: string; orderNumber: string; status: string; total: number | string; createdAt: string }>
}

export interface StandSaveData {
  id?: string
  code: string
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED'
  widthM?: number | null
  depthM?: number | null
  heightM?: number | null
  locationNotes?: string | null
  clientId?: string | null
  polygon: [number, number][]
  dxfEntityIdx: number | null
  floorPlanId: string
}

export interface ClientOption {
  id: string
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
}

interface FloorPlan { id: string; name: string; fileName: string; fileUrl: string }

interface Props {
  eventId: string
  floorPlan: FloorPlan
  fetchContent: (fpId: string) => Promise<{ data: { content: string } }>
  stands?: StandGeo[]
  clients?: ClientOption[]
  readonly?: boolean
  onStandSave?: (data: StandSaveData) => Promise<void>
  onStandDelete?: (standId: string) => Promise<void>
  onCreateOrder?: (standId: string, clientId?: string | null) => void
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
  AVAILABLE: '#22c55e', RESERVED: '#eab308', SOLD: '#ef4444', BLOCKED: '#64748b',
}
const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', RESERVED: 'Reservado', SOLD: 'Vendido', BLOCKED: 'Bloqueado',
}
const ORDER_STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada',
  INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}
const ORDER_STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', EXECUTED: 'geekblue', INVOICED: 'cyan', CANCELLED: 'red',
}

function aciToHex(color?: number): string {
  if (!color) return '#94a3b8'
  return ACI_COLORS[color] ?? '#94a3b8'
}

function clientLabel(c: ClientOption): string {
  return c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.id
}

function truncate(str: string, max = 18): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
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
  const first = entity.vertices[0], last = entity.vertices[entity.vertices.length - 1]
  return Math.abs(first.x - last.x) < 0.001 && Math.abs(first.y - last.y) < 0.001
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DxfViewer({
  eventId, floorPlan, fetchContent, stands = [],
  clients = [], readonly = false,
  onStandSave, onStandDelete, onCreateOrder, height = 560,
}: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dxf, setDxf] = useState<ParsedDxf | null>(null)
  const [allLayers, setAllLayers] = useState<string[]>([])
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())

  const stageRef = useRef<Konva.Stage | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(800)
  const PADDING = 40
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const baseTransform = useRef({ scale: 1, x: 0, y: 0 })

  const [selectedEntityIdx, setSelectedEntityIdx] = useState<number | null>(null)
  const [editingStand, setEditingStand] = useState<Partial<StandSaveData> | null>(null)
  const [editingStandFull, setEditingStandFull] = useState<StandGeo | null>(null)
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
    const obs = new ResizeObserver((entries) => setStageWidth(entries[0].contentRect.width || 800))
    obs.observe(el)
    setStageWidth(el.clientWidth || 800)
    return () => obs.disconnect()
  }, [])

  // ── Load DXF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true); setError(null); setSelectedEntityIdx(null); setDrawerOpen(false)
    fetchContent(floorPlan.id)
      .then(({ data }) => {
        const parser = new DxfParser()
        const parsed = parser.parseSync(data.content) as ParsedDxf
        setDxf(parsed)
        const layers = Array.from(new Set((parsed.entities ?? []).map((e) => e.layer ?? '0'))).sort()
        setAllLayers(layers)
        setVisibleLayers(new Set(layers))
        const bbox = computeBBox(parsed.entities ?? [])
        const dxfW = bbox.maxX - bbox.minX || 1, dxfH = bbox.maxY - bbox.minY || 1
        const cw = containerRef.current?.clientWidth ?? 800
        const fitScale = Math.min((cw - PADDING * 2) / dxfW, (height - PADDING * 2) / dxfH) * 0.9
        const tx = PADDING - bbox.minX * fitScale + ((cw - PADDING * 2) - dxfW * fitScale) / 2
        const ty = PADDING + bbox.maxY * fitScale + ((height - PADDING * 2) - dxfH * fitScale) / 2
        baseTransform.current = { scale: fitScale, x: tx, y: ty }
        setScale(fitScale); setPos({ x: tx, y: ty })
      })
      .catch((e) => setError(e?.message ?? 'Error al cargar el plano'))
      .finally(() => setLoading(false))
  }, [floorPlan.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom ─────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current; if (!stage) return
    const scaleBy = 1.12, old = stage.scaleX()
    const ptr = stage.getPointerPosition()!
    const mp = { x: (ptr.x - stage.x()) / old, y: (ptr.y - stage.y()) / old }
    const next = e.evt.deltaY < 0 ? old * scaleBy : old / scaleBy
    setScale(next); setPos({ x: ptr.x - mp.x * next, y: ptr.y - mp.y * next })
  }, [])

  // ── Draw mode ─────────────────────────────────────────────────────────────
  function screenToDxf(sx: number, sy: number): [number, number] {
    return [(sx - pos.x) / scale, -((sy - pos.y) / scale)]
  }
  function isNearFirstPoint(dx: number, dy: number): boolean {
    if (drawPoints.length < 3) return false
    const [fx, fy] = drawPoints[0]
    return Math.sqrt(((dx - fx) * scale) ** 2 + ((dy - fy) * scale) ** 2) < 14
  }
  function finishPolygon(pts: [number, number][]) {
    if (pts.length < 3) return
    setDrawMode(false); setDrawPoints([]); setCursorDxf(null)
    const draft: Partial<StandSaveData> = { code: '', status: 'AVAILABLE', polygon: pts, dxfEntityIdx: null, floorPlanId: floorPlan.id }
    setEditingStand(draft); setEditingStandFull(null)
    form.setFieldsValue({ code: '', status: 'AVAILABLE', widthM: null, depthM: null, heightM: null, locationNotes: null, clientId: null })
    setDrawerOpen(true)
  }
  function cancelDraw() { setDrawMode(false); setDrawPoints([]); setCursorDxf(null) }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawMode) return
    const stage = stageRef.current; if (!stage) return
    const ptr = stage.getPointerPosition()!
    const [dx, dy] = screenToDxf(ptr.x, ptr.y)
    if (isNearFirstPoint(dx, dy)) { finishPolygon(drawPoints); return }
    setDrawPoints((prev) => [...prev, [dx, dy]])
  }
  function handleStageDblClick() { if (drawMode && drawPoints.length >= 3) finishPolygon(drawPoints) }
  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawMode) return
    const stage = stageRef.current; if (!stage) return
    setCursorDxf(screenToDxf(stage.getPointerPosition()!.x, stage.getPointerPosition()!.y))
  }
  useEffect(() => {
    if (!drawMode) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelDraw() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [drawMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Entity click ─────────────────────────────────────────────────────────
  function openDrawerForEntity(entityIdx: number, entity: DxfEntity) {
    if (readonly || !entity.vertices?.length) return
    setSelectedEntityIdx(entityIdx)
    const polygon = entity.vertices.map((v) => [v.x, v.y] as [number, number])
    const existing = stands.find((s) => s.dxfEntityIdx === entityIdx && s.floorPlanId === floorPlan.id)
    if (existing) {
      openDrawerForStand(existing)
    } else {
      const draft: Partial<StandSaveData> = { code: '', status: 'AVAILABLE', polygon, dxfEntityIdx: entityIdx, floorPlanId: floorPlan.id }
      setEditingStand(draft); setEditingStandFull(null)
      form.setFieldsValue({ code: '', status: 'AVAILABLE', widthM: null, depthM: null, heightM: null, locationNotes: null, clientId: null })
      setDrawerOpen(true)
    }
  }

  function openDrawerForStand(stand: StandGeo) {
    const draft: Partial<StandSaveData> = {
      id: stand.id, code: stand.code, status: stand.status,
      widthM: stand.widthM, depthM: stand.depthM, heightM: stand.heightM,
      locationNotes: stand.locationNotes, clientId: stand.clientId,
      polygon: stand.polygon ?? [], dxfEntityIdx: stand.dxfEntityIdx, floorPlanId: stand.floorPlanId ?? floorPlan.id,
    }
    setEditingStand(draft); setEditingStandFull(stand)
    setSelectedEntityIdx(stand.dxfEntityIdx)
    form.setFieldsValue({ code: stand.code, status: stand.status, widthM: stand.widthM, depthM: stand.depthM, heightM: stand.heightM, locationNotes: stand.locationNotes, clientId: stand.clientId ?? null })
    setDrawerOpen(true)
  }

  function handleStandOverlayClick(stand: StandGeo) {
    if (readonly) setPortalStand(stand)
    else openDrawerForStand(stand)
  }

  // ── Save / delete ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!editingStand || !onStandSave) return
    try {
      const values = await form.validateFields()
      setSaving(true)
      await onStandSave({
        id: editingStand.id, code: values.code, status: values.status,
        widthM: values.widthM ?? null, depthM: values.depthM ?? null, heightM: values.heightM ?? null,
        locationNotes: values.locationNotes ?? null, clientId: values.clientId ?? null,
        polygon: editingStand.polygon ?? [], dxfEntityIdx: editingStand.dxfEntityIdx ?? null,
        floorPlanId: floorPlan.id,
      })
      setDrawerOpen(false); setSelectedEntityIdx(null)
    } catch { /* validation errors */ } finally { setSaving(false) }
  }

  async function handleDelete(standId: string) {
    if (!onStandDelete) return
    setDeletingId(standId)
    try { await onStandDelete(standId); setDrawerOpen(false); setSelectedEntityIdx(null) }
    catch { message.error('Error al eliminar el stand') }
    finally { setDeletingId(null) }
  }

  // ── Render entities ───────────────────────────────────────────────────────
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
      const sw = (isSelected ? 3 : 1) / scale
      const stroke = isSelected ? '#f59e0b' : color

      if (entity.type === 'LINE' && entity.start && entity.end) {
        shapes.push(<Line key={idx} points={[entity.start.x, -entity.start.y, entity.end.x, -entity.end.y]} stroke={stroke} strokeWidth={sw} listening={false} />)
      } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices?.length) {
        const pts = entity.vertices.flatMap((v) => [v.x, -v.y])
        shapes.push(
          <Line key={idx} points={pts}
            stroke={isAlreadyStand ? '#475569' : stroke} strokeWidth={sw}
            closed={!!entity.shape || isClosedPolyline(entity)}
            listening={isIdentifiable && !isAlreadyStand}
            onClick={() => openDrawerForEntity(idx, entity)}
            onMouseEnter={isIdentifiable && !isAlreadyStand ? (e) => { e.target.stroke('#f59e0b'); stageRef.current?.container().style.setProperty('cursor', 'pointer') } : undefined}
            onMouseLeave={isIdentifiable && !isAlreadyStand ? (e) => { e.target.stroke(color); stageRef.current?.container().style.setProperty('cursor', 'grab') } : undefined}
          />
        )
      } else if (entity.type === 'CIRCLE' && entity.center) {
        shapes.push(<Circle key={idx} x={entity.center.x} y={-entity.center.y} radius={entity.radius ?? 1} stroke={stroke} strokeWidth={sw} listening={false} />)
      } else if ((entity.type === 'TEXT' || entity.type === 'MTEXT') && (entity.position || entity.insertionPoint)) {
        const pt = entity.position ?? entity.insertionPoint!
        const fs = Math.max((entity.height ?? 2.5) * 0.8, 1)
        shapes.push(<Text key={idx} x={pt.x} y={-pt.y - fs} text={entity.text ?? ''} fontSize={fs} fill={color} listening={false} />)
      }
    })
    return shapes
  }

  // ── Render stand overlays + labels ────────────────────────────────────────
  function renderStandOverlays() {
    const elements: React.ReactNode[] = []
    stands
      .filter((s) => s.polygon && s.polygon.length >= 3 && s.floorPlanId === floorPlan.id)
      .forEach((stand) => {
        const poly = stand.polygon!
        const pts = poly.flatMap(([x, y]) => [x, -y])
        const color = STATUS_COLORS[stand.status] ?? '#94a3b8'
        const isEditingThis = editingStand?.id === stand.id
        const cx = poly.reduce((s, [x]) => s + x, 0) / poly.length
        const cy = poly.reduce((s, [, y]) => s + y, 0) / poly.length
        const codeFontSize = 13 / scale
        const clientFontSize = 11 / scale
        const lineH = codeFontSize * 1.3

        elements.push(
          <Line key={stand.id} points={pts} closed
            fill={color + '55'} stroke={isEditingThis ? '#f59e0b' : color}
            strokeWidth={(isEditingThis ? 3 : 2) / scale} listening
            onClick={() => handleStandOverlayClick(stand)}
            onMouseEnter={(e) => { e.target.opacity(0.8); stageRef.current?.container().style.setProperty('cursor', 'pointer') }}
            onMouseLeave={(e) => { e.target.opacity(1); stageRef.current?.container().style.setProperty('cursor', 'grab') }}
          />,
          // Stand code
          <Text key={`${stand.id}-code`}
            x={cx - (stand.code.length * codeFontSize * 0.33)}
            y={-cy - (stand.clientName ? lineH / 2 + codeFontSize / 2 : codeFontSize / 2)}
            text={stand.code} fontSize={codeFontSize} fontStyle="bold" fill="#ffffff" listening={false}
          />,
        )
        // Client name (second line)
        if (stand.clientName) {
          const name = truncate(stand.clientName)
          elements.push(
            <Text key={`${stand.id}-client`}
              x={cx - (name.length * clientFontSize * 0.3)}
              y={-cy + lineH / 2}
              text={name} fontSize={clientFontSize} fill="#e2e8f0" listening={false}
            />
          )
        }
      })
    return elements
  }

  // ── Draw preview ──────────────────────────────────────────────────────────
  function renderDrawPreview() {
    if (!drawMode || drawPoints.length === 0) return null
    const nearFirst = cursorDxf ? isNearFirstPoint(cursorDxf[0], cursorDxf[1]) : false
    const sw = 2 / scale
    return (
      <>
        {drawPoints.length > 1 && <Line points={drawPoints.flatMap(([x, y]) => [x, -y])} stroke="#f59e0b" strokeWidth={sw} listening={false} />}
        {cursorDxf && (
          <Line points={[drawPoints[drawPoints.length - 1][0], -drawPoints[drawPoints.length - 1][1], cursorDxf[0], -cursorDxf[1]]}
            stroke={nearFirst ? '#22c55e' : '#f59e0b'} strokeWidth={sw} dash={[6 / scale, 3 / scale]} listening={false} />
        )}
        {nearFirst && <Circle x={drawPoints[0][0]} y={-drawPoints[0][1]} radius={10 / scale} stroke="#22c55e" strokeWidth={sw} listening={false} />}
        {drawPoints.map(([x, y], i) => <Circle key={i} x={x} y={-y} radius={4 / scale} fill={i === 0 ? '#22c55e' : '#f59e0b'} listening={false} />)}
      </>
    )
  }

  const clientOptions = clients.map((c) => ({ value: c.id, label: clientLabel(c) }))

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Layer panel */}
      {allLayers.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <AntText type="secondary" style={{ fontSize: 12, marginRight: 4 }}>Capas:</AntText>
          {allLayers.map((layer) => (
            <Checkbox key={layer} checked={visibleLayers.has(layer)}
              onChange={(e) => setVisibleLayers((prev) => { const n = new Set(prev); e.target.checked ? n.add(layer) : n.delete(layer); return n })}
              style={{ fontSize: 12 }}>{layer}</Checkbox>
          ))}
          <Tag style={{ cursor: 'pointer', marginLeft: 8 }}
            onClick={() => { setScale(baseTransform.current.scale); setPos({ x: baseTransform.current.x, y: baseTransform.current.y }) }}>
            Restablecer vista
          </Tag>
        </div>
      )}

      {/* Admin toolbar */}
      {!readonly && (
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Tooltip title="Dibuja un polígono personalizado. Clic = vértice · Clic en primer punto o doble-clic = cerrar · Escape = cancelar">
            <Button icon={drawMode ? <StopOutlined /> : <EditOutlined />} type={drawMode ? 'primary' : 'default'} danger={drawMode}
              onClick={() => drawMode ? cancelDraw() : setDrawMode(true)}>
              {drawMode ? `Cancelar (${drawPoints.length} pts)` : 'Dibujar stand'}
            </Button>
          </Tooltip>
          {!drawMode && <span style={{ fontSize: 12, color: '#94a3b8' }}>O haz clic en un <strong style={{ color: '#f59e0b' }}>polígono cerrado</strong> del DXF para identificarlo</span>}
          {drawMode && (
            <span style={{ fontSize: 12, color: '#f59e0b' }}>
              {drawPoints.length === 0 ? 'Haz clic para agregar el primer vértice'
                : drawPoints.length < 3 ? `${drawPoints.length} vértice(s) — agrega al menos 3`
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
      <div ref={containerRef} style={{ background: '#0f172a', borderRadius: 8, overflow: 'hidden', height, position: 'relative', cursor: 'grab' }}>
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
            draggable={!drawMode} style={{ cursor: drawMode ? 'crosshair' : undefined }}
            onWheel={handleWheel}
            onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
            onClick={drawMode ? handleStageClick : undefined}
            onDblClick={drawMode ? handleStageDblClick : undefined}
            onMouseMove={drawMode ? handleStageMouseMove : undefined}
          >
            <Layer><Group>{renderEntities()}</Group></Layer>
            <Layer>{renderStandOverlays()}</Layer>
            <Layer>{renderDrawPreview()}</Layer>
          </Stage>
        )}
      </div>

      <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
        <span>Rueda: zoom · Arrastrar: mover</span>
        <span>{dxf?.entities?.length ?? 0} entidades · {allLayers.length} capa(s)</span>
        <span>{stands.filter(s => s.floorPlanId === floorPlan.id).length} stand(s)</span>
      </div>

      {/* Admin: stand edit drawer */}
      {!readonly && (
        <Drawer
          title={editingStand?.id ? `Stand ${editingStandFull?.code ?? ''}` : 'Nuevo stand'}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedEntityIdx(null) }}
          width={400}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {editingStand?.id && onStandDelete ? (
                <Popconfirm title="¿Eliminar este stand?" onConfirm={() => handleDelete(editingStand.id!)}>
                  <Button danger loading={!!deletingId}>Eliminar</Button>
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
            <Form.Item name="code" label="Código / Número" rules={[{ required: true, message: 'Requerido' }]}>
              <Input placeholder="Ej: A-01" />
            </Form.Item>
            <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
              <Select options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
            <Form.Item name="clientId" label="Cliente / Expositor">
              <Select
                allowClear showSearch placeholder="Buscar cliente…"
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={clientOptions}
                notFoundContent={clients.length === 0 ? 'Sin clientes disponibles' : 'Sin resultados'}
              />
            </Form.Item>
            <Form.Item label="Dimensiones (m)">
              <Space>
                <Form.Item name="widthM" noStyle><InputNumber placeholder="Ancho" min={0} style={{ width: 90 }} /></Form.Item>
                <Form.Item name="depthM" noStyle><InputNumber placeholder="Largo" min={0} style={{ width: 90 }} /></Form.Item>
                <Form.Item name="heightM" noStyle><InputNumber placeholder="Alto" min={0} style={{ width: 90 }} /></Form.Item>
              </Space>
            </Form.Item>
            <Form.Item name="locationNotes" label="Notas de ubicación">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>

          {/* Órdenes vinculadas */}
          {editingStandFull?.id && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <AntText strong>Órdenes de servicio</AntText>
                {onCreateOrder && (
                  <Button size="small" type="primary" icon={<PlusOutlined />}
                    onClick={() => {
                      setDrawerOpen(false)
                      onCreateOrder(editingStandFull.id, editingStandFull.clientId)
                    }}>
                    Nueva orden
                  </Button>
                )}
              </div>
              {(!editingStandFull.orders || editingStandFull.orders.length === 0) ? (
                <AntText type="secondary" style={{ fontSize: 13 }}>Sin órdenes de servicio</AntText>
              ) : (
                <Table
                  size="small"
                  pagination={false}
                  dataSource={editingStandFull.orders}
                  rowKey="id"
                  columns={[
                    { title: 'Orden', dataIndex: 'orderNumber', render: (v: string, r: any) => (
                      <a href={`/ordenes/${r.id}`} target="_blank" rel="noreferrer">
                        <LinkOutlined style={{ marginRight: 4 }} />{v}
                      </a>
                    )},
                    { title: 'Estado', dataIndex: 'status', render: (v: string) => (
                      <Tag color={ORDER_STATUS_COLORS[v] ?? 'default'}>{ORDER_STATUS_LABELS[v] ?? v}</Tag>
                    )},
                    { title: 'Total', dataIndex: 'total', align: 'right' as const, render: (v: number) =>
                      `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                    },
                  ]}
                />
              )}
            </div>
          )}
        </Drawer>
      )}

      {/* Portal: stand detail modal */}
      {readonly && (
        <Modal open={!!portalStand} onCancel={() => setPortalStand(null)}
          footer={<Button onClick={() => setPortalStand(null)}>Cerrar</Button>}
          title={`Stand ${portalStand?.code ?? ''}`}>
          {portalStand && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <Tag color={portalStand.status === 'AVAILABLE' ? 'green' : portalStand.status === 'RESERVED' ? 'gold' : 'red'}>
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
