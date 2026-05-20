/**
 * MapaPage.tsx
 * Editor de mapa de evento — canvas zenital con react-konva
 * Zonas arrastrables, redimensionables, capas, plantillas y panel de propiedades
 */
import {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import {
  Button, Modal, Form, Input, InputNumber, Select, Switch, App, Typography, Space,
} from 'antd'
import {
  CheckOutlined, ShareAltOutlined, UploadOutlined,
} from '@ant-design/icons'
import {
  Stage, Layer, Rect, Text, Circle, Group, Line, Transformer,
} from 'react-konva'
import type Konva from 'konva'

const { Text: AntText } = Typography

// ── Zone configs ───────────────────────────────────────────────────────────────
type ZoneType = 'CEREMONIA' | 'BANQUETE' | 'PISTA' | 'BAR' | 'SERVICIO' | 'ACCESO' | 'ACTIVACIÓN' | 'COCINA' | 'OTRO'
type MapStatus = 'BORRADOR' | 'APROBADO'
type Tool = 'select' | 'move' | 'zona' | 'poi' | 'texto'

const ZONE_CONFIGS: Record<ZoneType, { color: string; icon: string; label: string }> = {
  CEREMONIA:  { color: '#10B981', icon: '🌿', label: 'CEREMONIA' },
  BANQUETE:   { color: '#F59E0B', icon: '🍽', label: 'BANQUETE' },
  PISTA:      { color: '#8B5CF6', icon: '🎵', label: 'PISTA' },
  BAR:        { color: '#EF4444', icon: '🍹', label: 'BAR' },
  SERVICIO:   { color: '#3B82F6', icon: '🚿', label: 'SERVICIO' },
  ACCESO:     { color: '#6B7280', icon: '🚗', label: 'ACCESO' },
  ACTIVACIÓN: { color: '#06B6D4', icon: '⭐', label: 'ACTIVACIÓN' },
  COCINA:     { color: '#F97316', icon: '🔥', label: 'COCINA' },
  OTRO:       { color: '#9CA3AF', icon: '📍', label: 'OTRO' },
}

const COLOR_SWATCHES = [
  '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#3B82F6', '#06B6D4',
]

const POI_TYPES: ZoneType[] = ['BAR', 'SERVICIO', 'ACCESO']

// ── Data model ─────────────────────────────────────────────────────────────────
interface Zone {
  id: string
  type: ZoneType
  name: string
  x: number
  y: number
  width: number
  height: number
  capacity: number
  tables: number
  lighting: string
  sound: string
  supplier: string
  colorOverride?: string
}

interface MapStore {
  zones: Zone[]
  status: MapStatus
  venueName: string
  updatedAt: string
}

interface Layers {
  zonas: boolean
  mesas: boolean
  poi: boolean
  recorrido: boolean
  cotas: boolean
}

// ── Persistence ────────────────────────────────────────────────────────────────
function storeKey(id: string) { return `iventia-mapa-${id}` }

function loadStore(id: string): MapStore {
  try {
    const raw = localStorage.getItem(storeKey(id))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { zones: [], status: 'BORRADOR', venueName: 'Venue', updatedAt: '' }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function saveStore(id: string, store: MapStore) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(storeKey(id), JSON.stringify({
        ...store,
        updatedAt: new Date().toISOString(),
      }))
    } catch { /* ignore */ }
  }, 300)
}

// ── Plantillas ─────────────────────────────────────────────────────────────────
const TEMPLATES: Record<string, Zone[]> = {
  'Boda al aire libre': [
    { id: 'z1', type: 'CEREMONIA',  name: 'Jardín principal',    x: 20,  y: 60,  width: 280, height: 200, capacity: 200, tables: 0,  lighting: 'Natural',  sound: 'Sonido ambiente',  supplier: '' },
    { id: 'z2', type: 'BANQUETE',   name: 'Banquete · 22 mesas', x: 20,  y: 280, width: 380, height: 210, capacity: 220, tables: 22, lighting: 'Cálida',   sound: 'DJ + monitor',     supplier: 'Catering Aurora' },
    { id: 'z3', type: 'PISTA',      name: 'Pista de baile',      x: 320, y: 60,  width: 200, height: 180, capacity: 150, tables: 0,  lighting: 'LED RGB',  sound: 'Sistema principal', supplier: '' },
    { id: 'z4', type: 'BAR',        name: 'Barra principal',     x: 540, y: 200, width: 160, height: 120, capacity: 50,  tables: 0,  lighting: 'Cálida',   sound: '',                 supplier: 'Bar Elite' },
    { id: 'z5', type: 'SERVICIO',   name: 'Baños',               x: 540, y: 60,  width: 110, height: 120, capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                 supplier: '' },
    { id: 'z6', type: 'ACCESO',     name: 'Parking',             x: 540, y: 340, width: 120, height: 100, capacity: 100, tables: 0,  lighting: 'Exterior', sound: '',                 supplier: '' },
    { id: 'z7', type: 'ACTIVACIÓN', name: 'Photobooth',          x: 660, y: 60,  width: 120, height: 120, capacity: 10,  tables: 0,  lighting: 'Flash',    sound: '',                 supplier: '' },
    { id: 'z8', type: 'COCINA',     name: 'Cocina caliente',     x: 400, y: 340, width: 130, height: 100, capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                 supplier: 'Catering Aurora' },
  ],
  'Banquete corporativo': [
    { id: 'z1', type: 'BANQUETE',   name: 'Salón principal',     x: 40,  y: 60,  width: 400, height: 280, capacity: 300, tables: 30, lighting: 'Neutra',   sound: 'Sistema PA',       supplier: 'Catering Corp' },
    { id: 'z2', type: 'PISTA',      name: 'Escenario',           x: 460, y: 60,  width: 180, height: 120, capacity: 50,  tables: 0,  lighting: 'Teatral',  sound: 'Sistema principal', supplier: '' },
    { id: 'z3', type: 'BAR',        name: 'Bar de bienvenida',   x: 460, y: 200, width: 180, height: 100, capacity: 40,  tables: 0,  lighting: 'Cálida',   sound: '',                 supplier: 'Bar Corp' },
    { id: 'z4', type: 'COCINA',     name: 'Cocina de servicio',  x: 460, y: 320, width: 180, height: 80,  capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                 supplier: 'Catering Corp' },
    { id: 'z5', type: 'SERVICIO',   name: 'Baños',               x: 40,  y: 360, width: 120, height: 80,  capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                 supplier: '' },
    { id: 'z6', type: 'ACCESO',     name: 'Registro / entrada',  x: 180, y: 360, width: 160, height: 80,  capacity: 0,   tables: 0,  lighting: 'Exterior', sound: '',                 supplier: '' },
  ],
  'Festival pequeño': [
    { id: 'z1', type: 'PISTA',      name: 'Escenario principal', x: 100, y: 40,  width: 300, height: 160, capacity: 500, tables: 0,  lighting: 'LED RGB',  sound: 'Sistema line array', supplier: '' },
    { id: 'z2', type: 'BANQUETE',   name: 'Food court',          x: 50,  y: 230, width: 250, height: 200, capacity: 200, tables: 20, lighting: 'Cálida',   sound: 'Ambient',           supplier: '' },
    { id: 'z3', type: 'BAR',        name: 'Bar principal',       x: 440, y: 100, width: 150, height: 120, capacity: 80,  tables: 0,  lighting: 'Neon',     sound: '',                 supplier: 'Bar Festival' },
    { id: 'z4', type: 'BAR',        name: 'Bar secundario',      x: 440, y: 240, width: 120, height: 100, capacity: 50,  tables: 0,  lighting: 'Neon',     sound: '',                 supplier: 'Bar Festival' },
    { id: 'z5', type: 'ACCESO',     name: 'Entrada general',     x: 200, y: 380, width: 200, height: 80,  capacity: 0,   tables: 0,  lighting: 'Exterior', sound: '',                 supplier: '' },
    { id: 'z6', type: 'SERVICIO',   name: 'Sanitarios portátiles', x: 600, y: 100, width: 100, height: 120, capacity: 0, tables: 0,  lighting: 'Blanca',   sound: '',                 supplier: '' },
    { id: 'z7', type: 'ACTIVACIÓN', name: 'Zona de activaciones', x: 600, y: 240, width: 120, height: 140, capacity: 30, tables: 0, lighting: 'Flash',    sound: '',                 supplier: '' },
  ],
}

// ── Table grid layout ──────────────────────────────────────────────────────────
function tablePositions(zone: Zone): { tx: number; ty: number }[] {
  const PAD = 24
  const DIAMETER = 32
  const GAP = 10
  const availW = zone.width - PAD * 2
  const availH = zone.height - PAD * 2 - 40 // leave header space
  const cols = Math.max(1, Math.floor((availW + GAP) / (DIAMETER + GAP)))
  const rows = Math.ceil(zone.tables / cols)
  const positions: { tx: number; ty: number }[] = []
  for (let i = 0; i < zone.tables; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const startX = PAD + (availW - (Math.min(cols, zone.tables - row * cols) * (DIAMETER + GAP) - GAP)) / 2
    positions.push({
      tx: startX + col * (DIAMETER + GAP) + DIAMETER / 2,
      ty: PAD + 44 + row * (DIAMETER + GAP) + DIAMETER / 2,
    })
  }
  return positions
}

// ── Draw preview rect ──────────────────────────────────────────────────────────
interface DrawState {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MapaPage() {
  const { id: eventId = 'default' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  const [store, setStore] = useState<MapStore>(() => loadStore(eventId))
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('cenital')
  const [layers, setLayers] = useState<Layers>({
    zonas: true, mesas: true, poi: true, recorrido: false, cotas: false,
  })

  // Canvas sizing
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Drawing state
  const [drawing, setDrawing] = useState(false)
  const [drawState, setDrawState] = useState<DrawState | null>(null)
  const [newZoneModal, setNewZoneModal] = useState(false)
  const [pendingZone, setPendingZone] = useState<Partial<Zone> | null>(null)
  const [form] = Form.useForm()

  // Stage offset for pan
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, stageX: 0, stageY: 0 })

  // Transformer ref for selected zone
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef<Record<string, Konva.Group>>({})

  // Persist
  const update = useCallback((next: Partial<MapStore>) => {
    setStore(prev => {
      const merged = { ...prev, ...next }
      saveStore(eventId, merged)
      return merged
    })
  }, [eventId])

  // Measure canvas container
  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Transformer attach
  useEffect(() => {
    if (!transformerRef.current) return
    if (selectedId && shapeRefs.current[selectedId]) {
      transformerRef.current.nodes([shapeRefs.current[selectedId]])
      transformerRef.current.getLayer()?.batchDraw()
    } else {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId])

  // Keyboard delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        update({ zones: store.zones.filter(z => z.id !== selectedId) })
        setSelectedId(null)
        message.success('Zona eliminada')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId, store.zones, update, message])

  const selectedZone = store.zones.find(z => z.id === selectedId) ?? null

  const updateZone = (id: string, patch: Partial<Zone>) => {
    update({
      zones: store.zones.map(z => z.id === id ? { ...z, ...patch } : z),
    })
  }

  // ── Stage events ─────────────────────────────────────────────────────────────
  const getStagePoint = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()!
    const pointer = stage.getPointerPosition()!
    return {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    }
  }

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const nativeEvt = e.evt
    // Middle mouse or Ctrl+drag → pan
    if (nativeEvt.button === 1 || (nativeEvt.button === 0 && nativeEvt.ctrlKey)) {
      isPanning.current = true
      panStart.current = {
        x: nativeEvt.clientX, y: nativeEvt.clientY,
        stageX: stagePos.x, stageY: stagePos.y,
      }
      return
    }

    if (activeTool === 'zona' && e.target === e.target.getStage()) {
      const pt = getStagePoint(e)
      setDrawing(true)
      setDrawState({ startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y })
    }

    if (activeTool === 'select' && e.target === e.target.getStage()) {
      setSelectedId(null)
    }
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const nativeEvt = e.evt
    if (isPanning.current) {
      const dx = nativeEvt.clientX - panStart.current.x
      const dy = nativeEvt.clientY - panStart.current.y
      setStagePos({ x: panStart.current.stageX + dx, y: panStart.current.stageY + dy })
      return
    }
    if (drawing && drawState) {
      const pt = getStagePoint(e)
      setDrawState(d => d ? { ...d, currentX: pt.x, currentY: pt.y } : d)
    }
  }

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) {
      isPanning.current = false
      return
    }
    if (drawing && drawState) {
      setDrawing(false)
      const x = Math.min(drawState.startX, drawState.currentX)
      const y = Math.min(drawState.startY, drawState.currentY)
      const w = Math.abs(drawState.currentX - drawState.startX)
      const h = Math.abs(drawState.currentY - drawState.startY)
      setDrawState(null)
      if (w > 20 && h > 20) {
        setPendingZone({ x, y, width: w, height: h })
        form.resetFields()
        form.setFieldsValue({ type: 'OTRO', capacity: 50, tables: 0 })
        setNewZoneModal(true)
      }
    }
  }

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const scaleBy = 1.08
    const stage = e.target.getStage()!
    const pointer = stage.getPointerPosition()!
    const oldScale = stageScale
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clamped = Math.max(0.2, Math.min(4, newScale))
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }
    setStageScale(clamped)
    setStagePos({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    })
  }

  // ── Create zone from modal ────────────────────────────────────────────────────
  const handleCreateZone = (vals: any) => {
    if (!pendingZone) return
    const newZone: Zone = {
      id: `z-${Date.now()}`,
      type: vals.type,
      name: vals.name || ZONE_CONFIGS[vals.type as ZoneType].label,
      x: pendingZone.x!,
      y: pendingZone.y!,
      width: pendingZone.width!,
      height: pendingZone.height!,
      capacity: vals.capacity ?? 50,
      tables: vals.tables ?? 0,
      lighting: '',
      sound: '',
      supplier: '',
    }
    update({ zones: [...store.zones, newZone] })
    setNewZoneModal(false)
    setPendingZone(null)
    setActiveTool('select')
    setSelectedId(newZone.id)
    message.success('Zona creada')
  }

  // ── Load template ─────────────────────────────────────────────────────────────
  const loadTemplate = (name: string) => {
    const zones = TEMPLATES[name]
    if (!zones) return
    update({ zones })
    setSelectedId(null)
    message.success(`Plantilla "${name}" cargada`)
  }

  // ── Status toggle ─────────────────────────────────────────────────────────────
  const toggleStatus = () => {
    const next: MapStatus = store.status === 'BORRADOR' ? 'APROBADO' : 'BORRADOR'
    update({ status: next })
    message.success(next === 'APROBADO' ? 'Mapa aprobado' : 'Mapa regresado a borrador')
  }

  // ── Computed stats ────────────────────────────────────────────────────────────
  const totalTables = store.zones.reduce((s, z) => s + z.tables, 0)
  const totalPax = store.zones.reduce((s, z) => s + z.capacity, 0)
  const venueName = store.venueName || event?.name || 'Venue'

  // ── Grid dots ────────────────────────────────────────────────────────────────
  const GRID_SPACING = 20
  const gridDots = () => {
    const dots: JSX.Element[] = []
    const startX = Math.floor(-stagePos.x / stageScale / GRID_SPACING) * GRID_SPACING - GRID_SPACING
    const startY = Math.floor(-stagePos.y / stageScale / GRID_SPACING) * GRID_SPACING - GRID_SPACING
    const endX = startX + canvasSize.width / stageScale + GRID_SPACING * 2
    const endY = startY + canvasSize.height / stageScale + GRID_SPACING * 2
    let i = 0
    for (let x = startX; x <= endX; x += GRID_SPACING) {
      for (let y = startY; y <= endY; y += GRID_SPACING) {
        dots.push(<Circle key={`d-${i++}`} x={x} y={y} radius={1.2} fill="#D1D5DB" listening={false} />)
      }
    }
    return dots
  }

  // ── Zone rendering ────────────────────────────────────────────────────────────
  const renderZone = (zone: Zone) => {
    const cfg = ZONE_CONFIGS[zone.type]
    const color = zone.colorOverride || cfg.color
    const isSelected = selectedId === zone.id

    // Mesa circles
    const tables: JSX.Element[] = []
    if (layers.mesas && zone.tables > 0) {
      const positions = tablePositions(zone)
      positions.forEach((pos, idx) => {
        tables.push(
          <Group key={`t-${idx}`} x={pos.tx} y={pos.ty} listening={false}>
            <Circle radius={14} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1.5} />
            <Text
              text={`M${idx + 1}`}
              fontSize={8}
              fill="#92400E"
              fontStyle="bold"
              align="center"
              verticalAlign="middle"
              width={28}
              height={28}
              x={-14}
              y={-14}
              listening={false}
            />
          </Group>,
        )
      })
    }

    // POI marker
    const showPoi = layers.poi && POI_TYPES.includes(zone.type)

    return (
      <Group
        key={zone.id}
        x={zone.x}
        y={zone.y}
        draggable={activeTool === 'select'}
        ref={node => { if (node) shapeRefs.current[zone.id] = node }}
        onClick={() => { if (activeTool === 'select') setSelectedId(zone.id) }}
        onTap={() => { if (activeTool === 'select') setSelectedId(zone.id) }}
        onDragEnd={e => {
          updateZone(zone.id, { x: e.target.x(), y: e.target.y() })
        }}
        onTransformEnd={e => {
          const node = e.target
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          node.scaleX(1)
          node.scaleY(1)
          updateZone(zone.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(60, zone.width * scaleX),
            height: Math.max(40, zone.height * scaleY),
          })
        }}
      >
        {/* Zone fill rect */}
        <Rect
          width={zone.width}
          height={zone.height}
          fill={color}
          opacity={0.15}
          stroke={isSelected ? '#2563EB' : color}
          strokeWidth={isSelected ? 2 : 1.5}
          dash={isSelected ? [6, 3] : undefined}
          cornerRadius={6}
          listening={false}
        />

        {/* Type label small */}
        <Text
          text={cfg.label}
          x={10}
          y={10}
          fontSize={9}
          fill={color}
          fontStyle="bold"
          letterSpacing={1}
          listening={false}
        />

        {/* Zone name bold */}
        <Text
          text={zone.name}
          x={10}
          y={24}
          fontSize={12}
          fill="#1a1a1a"
          fontStyle="bold"
          width={zone.width - 20}
          listening={false}
        />

        {/* Emoji icon top-right */}
        <Text
          text={cfg.icon}
          x={zone.width - 30}
          y={8}
          fontSize={16}
          listening={false}
        />

        {/* Tables */}
        {tables}

        {/* POI marker */}
        {showPoi && (
          <Group x={zone.width / 2} y={zone.height / 2} listening={false}>
            <Circle radius={12} fill={color} opacity={0.8} />
            <Text
              text="📍"
              fontSize={12}
              x={-8}
              y={-8}
              listening={false}
            />
          </Group>
        )}
      </Group>
    )
  }

  // ── Draw preview rect ─────────────────────────────────────────────────────────
  const drawPreview = drawState && drawing ? (
    <Rect
      x={Math.min(drawState.startX, drawState.currentX)}
      y={Math.min(drawState.startY, drawState.currentY)}
      width={Math.abs(drawState.currentX - drawState.startX)}
      height={Math.abs(drawState.currentY - drawState.startY)}
      fill="#7C3AED"
      opacity={0.12}
      stroke="#7C3AED"
      strokeWidth={1.5}
      dash={[5, 3]}
      listening={false}
    />
  ) : null

  // ── Sidebar styles ────────────────────────────────────────────────────────────
  const sidebarCard = {
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #EDE9FE',
    overflow: 'hidden' as const,
    marginBottom: 10,
  }
  const sidebarTitle = {
    fontSize: 9,
    fontWeight: 700,
    color: '#9CA3AF',
    letterSpacing: '0.12em',
    padding: '8px 12px 4px',
    borderBottom: '1px solid #F3F4F6',
  }

  const toolButton = (tool: Tool, icon: string, label: string) => (
    <div
      key={tool}
      onClick={() => setActiveTool(tool)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px',
        cursor: 'pointer',
        background: activeTool === tool ? '#EDE9FE' : 'transparent',
        borderLeft: activeTool === tool ? '3px solid #7C3AED' : '3px solid transparent',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12, color: activeTool === tool ? '#7C3AED' : '#374151', fontWeight: activeTool === tool ? 600 : 400 }}>
        {label}
      </span>
    </div>
  )

  // ── Right panel field ─────────────────────────────────────────────────────────
  const propSection = (title: string) => (
    <div style={{
      fontSize: 9, fontWeight: 700, color: '#9CA3AF',
      letterSpacing: '0.12em',
      padding: '10px 14px 4px',
      borderBottom: '1px solid #F3F4F6',
    }}>{title}</div>
  )

  const propRow = (label: string, content: React.ReactNode) => (
    <div style={{ padding: '6px 14px' }}>
      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{label}</div>
      {content}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7FF' }}>

      {/* ── Header ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #EDE9FE',
        padding: '14px 24px 0',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AntText style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>Mapa del evento</AntText>
              <span style={{
                background: store.status === 'APROBADO' ? '#ECFDF5' : '#F3F4F6',
                color: store.status === 'APROBADO' ? '#059669' : '#6B7280',
                fontSize: 10, fontWeight: 700,
                padding: '2px 10px', borderRadius: 20, letterSpacing: '0.05em',
              }}>
                {store.status}
              </span>
            </div>
            <AntText style={{ fontSize: 12, color: '#aaa' }}>
              {venueName} · {store.zones.length} zonas · {totalTables} mesas · {totalPax} pax · Vista cenital v3
            </AntText>
          </div>

          <Space>
            <Button icon={<UploadOutlined />} onClick={() => message.info('Próximamente')}>
              Importar plano
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={() => message.info('Próximamente')}>
              Compartir
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={toggleStatus}
              style={{
                background: store.status === 'APROBADO' ? '#059669' : '#7C3AED',
                borderColor: store.status === 'APROBADO' ? '#059669' : '#7C3AED',
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              {store.status === 'APROBADO' ? 'Aprobado ✓' : 'Aprobar mapa'}
            </Button>
          </Space>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { key: 'cenital', label: 'Cenital' },
            { key: 'seating', label: 'Seating chart' },
            { key: 'recorrido', label: 'Recorrido invitado' },
            { key: 'logistica', label: 'Personal y logística' },
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 700 : 400,
                color: activeTab === tab.key ? '#7C3AED' : '#6B7280',
                borderBottom: activeTab === tab.key ? '2px solid #7C3AED' : '2px solid transparent',
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Body: sidebar + canvas + right panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 170, flexShrink: 0,
          background: '#FAFAFA',
          borderRight: '1px solid #EDE9FE',
          overflowY: 'auto',
          padding: '10px 8px',
        }}>

          {/* Herramientas */}
          <div style={sidebarCard}>
            <div style={sidebarTitle}>EDICIÓN</div>
            {toolButton('select', '↖', 'Seleccionar')}
            {toolButton('move', '✋', 'Mover')}
            {toolButton('zona', '▭', 'Zona')}
            {toolButton('poi', '📍', 'POI')}
            {toolButton('texto', 'T', 'Texto')}
          </div>

          {/* Plantillas */}
          <div style={sidebarCard}>
            <div style={sidebarTitle}>PLANTILLAS</div>
            {Object.keys(TEMPLATES).map(name => (
              <div
                key={name}
                onClick={() => loadTemplate(name)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#374151',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F3F4F6',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#EDE9FE'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Capas */}
          <div style={sidebarCard}>
            <div style={sidebarTitle}>CAPAS</div>
            {([
              { key: 'zonas',    label: 'Zonas',          color: '#7C3AED' },
              { key: 'mesas',    label: 'Mesas',          color: '#F59E0B' },
              { key: 'poi',      label: 'POI - servicios', color: '#3B82F6' },
              { key: 'recorrido', label: 'Recorrido',     color: '#9CA3AF' },
              { key: 'cotas',    label: 'Cotas y medidas', color: '#9CA3AF' },
            ] as { key: keyof Layers; label: string; color: string }[]).map(layer => (
              <div key={layer.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 12px',
                borderBottom: '1px solid #F3F4F6',
              }}>
                <span style={{ fontSize: 12, color: '#374151' }}>{layer.label}</span>
                <Switch
                  size="small"
                  checked={layers[layer.key]}
                  onChange={val => setLayers(l => ({ ...l, [layer.key]: val }))}
                  style={{ background: layers[layer.key] ? layer.color : undefined }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Canvas area ── */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            background: '#F0EFF6',
            position: 'relative',
            overflow: 'hidden',
            cursor: activeTool === 'zona' ? 'crosshair' : activeTool === 'move' ? 'grab' : 'default',
          }}
        >
          <Stage
            width={canvasSize.width}
            height={canvasSize.height}
            x={stagePos.x}
            y={stagePos.y}
            scaleX={stageScale}
            scaleY={stageScale}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onWheel={handleWheel}
          >
            {/* Grid layer */}
            <Layer listening={false}>
              <Rect
                x={-stagePos.x / stageScale - 20}
                y={-stagePos.y / stageScale - 20}
                width={canvasSize.width / stageScale + 40}
                height={canvasSize.height / stageScale + 40}
                fill="#ffffff"
                listening={false}
              />
              {gridDots()}
            </Layer>

            {/* Zones layer */}
            <Layer>
              {layers.zonas && store.zones.map(zone => renderZone(zone))}
              {drawPreview}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 60 || newBox.height < 40) return oldBox
                  return newBox
                }}
                rotateEnabled={false}
                borderStroke="#2563EB"
                borderDash={[4, 2]}
                anchorSize={8}
                anchorStroke="#2563EB"
                anchorFill="#fff"
              />
            </Layer>

            {/* Canvas label bar */}
            <Layer listening={false}>
              <Rect
                x={-stagePos.x / stageScale}
                y={-stagePos.y / stageScale}
                width={canvasSize.width / stageScale}
                height={30}
                fill="#1a1a2e"
                opacity={0.85}
              />
              <Text
                x={-stagePos.x / stageScale + 12}
                y={-stagePos.y / stageScale + 8}
                text={`CENITAL · 1:120 · ${store.zones.length} zonas`}
                fontSize={11}
                fill="#E5E7EB"
                fontStyle="bold"
                letterSpacing={1}
              />
            </Layer>
          </Stage>

          {/* Empty state overlay */}
          {store.zones.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>
                Sin zonas en el mapa
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                Selecciona una plantilla o usa la herramienta Zona para comenzar
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel (only when zone selected) ── */}
        {selectedZone && (
          <div style={{
            width: 220, flexShrink: 0,
            background: '#fff',
            borderLeft: '1px solid #EDE9FE',
            overflowY: 'auto',
            fontSize: 12,
          }}>

            {propSection('IDENTIDAD')}

            {propRow('Nombre', (
              <Input
                size="small"
                value={selectedZone.name}
                onChange={e => updateZone(selectedZone.id, { name: e.target.value })}
              />
            ))}

            {propRow('Tipo', (
              <Select
                size="small"
                value={selectedZone.type}
                style={{ width: '100%' }}
                onChange={val => updateZone(selectedZone.id, { type: val })}
              >
                {Object.entries(ZONE_CONFIGS).map(([k, v]) => (
                  <Select.Option key={k} value={k}>
                    {v.icon} {v.label}
                  </Select.Option>
                ))}
              </Select>
            ))}

            {propRow('Color', (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                {COLOR_SWATCHES.map(c => (
                  <div
                    key={c}
                    onClick={() => updateZone(selectedZone.id, { colorOverride: c })}
                    style={{
                      width: 22, height: 22, borderRadius: 4,
                      background: c,
                      cursor: 'pointer',
                      border: (selectedZone.colorOverride ?? ZONE_CONFIGS[selectedZone.type].color) === c
                        ? '2px solid #1a1a1a' : '2px solid transparent',
                      transition: 'border 0.1s',
                    }}
                  />
                ))}
                {selectedZone.colorOverride && (
                  <div
                    onClick={() => updateZone(selectedZone.id, { colorOverride: undefined })}
                    style={{
                      width: 22, height: 22, borderRadius: 4,
                      background: '#F3F4F6',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#6B7280',
                      border: '1px solid #E5E7EB',
                    }}
                    title="Restaurar color original"
                  >✕</div>
                )}
              </div>
            ))}

            {propSection('DIMENSIONES')}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ padding: '6px 8px 6px 14px' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>X</div>
                <InputNumber
                  size="small"
                  value={Math.round(selectedZone.x)}
                  style={{ width: '100%' }}
                  onChange={val => val != null && updateZone(selectedZone.id, { x: val })}
                />
              </div>
              <div style={{ padding: '6px 14px 6px 8px' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Y</div>
                <InputNumber
                  size="small"
                  value={Math.round(selectedZone.y)}
                  style={{ width: '100%' }}
                  onChange={val => val != null && updateZone(selectedZone.id, { y: val })}
                />
              </div>
              <div style={{ padding: '6px 8px 6px 14px' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Ancho</div>
                <InputNumber
                  size="small"
                  value={Math.round(selectedZone.width)}
                  style={{ width: '100%' }}
                  suffix="cm"
                  onChange={val => val != null && updateZone(selectedZone.id, { width: Math.max(60, val) })}
                />
              </div>
              <div style={{ padding: '6px 14px 6px 8px' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Alto</div>
                <InputNumber
                  size="small"
                  value={Math.round(selectedZone.height)}
                  style={{ width: '100%' }}
                  suffix="cm"
                  onChange={val => val != null && updateZone(selectedZone.id, { height: Math.max(40, val) })}
                />
              </div>
            </div>

            {propSection('CAPACIDAD Y USO')}

            {propRow('Pax estimado', (
              <InputNumber
                size="small"
                value={selectedZone.capacity}
                min={0}
                style={{ width: '100%' }}
                onChange={val => val != null && updateZone(selectedZone.id, { capacity: val })}
              />
            ))}

            {propRow('Mesas', (
              <InputNumber
                size="small"
                value={selectedZone.tables}
                min={0}
                style={{ width: '100%' }}
                onChange={val => val != null && updateZone(selectedZone.id, { tables: val })}
              />
            ))}

            {propRow('Iluminación', (
              <Input
                size="small"
                value={selectedZone.lighting}
                placeholder="Ej: LED RGB"
                onChange={e => updateZone(selectedZone.id, { lighting: e.target.value })}
              />
            ))}

            {propRow('Sonido', (
              <Input
                size="small"
                value={selectedZone.sound}
                placeholder="Ej: Sistema PA"
                onChange={e => updateZone(selectedZone.id, { sound: e.target.value })}
              />
            ))}

            {propSection('PROVEEDOR RESPONSABLE')}

            <div style={{ padding: '8px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#7C3AED',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {selectedZone.supplier ? selectedZone.supplier.slice(0, 2).toUpperCase() : '??'}
                </div>
                <Input
                  size="small"
                  value={selectedZone.supplier}
                  placeholder="Nombre del proveedor"
                  onChange={e => updateZone(selectedZone.id, { supplier: e.target.value })}
                />
              </div>
            </div>

            {/* Delete zone button */}
            <div style={{ padding: '6px 14px 14px' }}>
              <Button
                danger
                size="small"
                style={{ width: '100%' }}
                onClick={() => {
                  update({ zones: store.zones.filter(z => z.id !== selectedZone.id) })
                  setSelectedId(null)
                  message.success('Zona eliminada')
                }}
              >
                Eliminar zona
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── New zone modal ── */}
      <Modal
        title="Nueva zona"
        open={newZoneModal}
        onCancel={() => { setNewZoneModal(false); setPendingZone(null) }}
        onOk={() => form.submit()}
        okText="Crear zona"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        destroyOnClose
        width={420}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateZone}>
          <Form.Item
            name="name"
            label="Nombre de la zona"
          >
            <Input placeholder="Ej: Jardín principal, Barra principal..." autoFocus />
          </Form.Item>

          <Form.Item
            name="type"
            label="Tipo"
            rules={[{ required: true, message: 'Selecciona el tipo' }]}
          >
            <Select>
              {Object.entries(ZONE_CONFIGS).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.icon} {v.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="capacity" label="Capacidad (pax)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="tables" label="Mesas">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
