import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App, Button, Form, Input, InputNumber, Modal, Space, Spin, Card, Row, Col,
  List, Divider, Select, Tabs,
} from 'antd'
import {
  DeleteOutlined, SaveOutlined, UndoOutlined, RedoOutlined, ClearOutlined,
  ZoomInOutlined, ZoomOutOutlined, DownloadOutlined, UploadOutlined, PlusOutlined,
} from '@ant-design/icons'
import { ticketEventsApi } from '../../api/ticketEvents'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Shape {
  id: string
  name: string
  colorHex: string
  tier?: string
  shapeType?: string
  shapeData?: any
  labelX?: number
  labelY?: number
  capacity?: number
  sold?: number
  price?: number
}

interface Access {
  id: string
  x: number
  y: number
  label: string
  primary?: boolean
}

interface POI {
  id: string
  type: 'wc' | 'fb' | 'merch' | 'med' | 'info' | 'stage'
  x: number
  y: number
  label: string
}

interface MapData {
  width: number
  height: number
  perimeter?: string
  field?: { cx: number; cy: number; rx: number; ry: number }
  accesses: Access[]
  pois: POI[]
}

interface VenueMapV2Props {
  eventId: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TIER_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'vip', label: 'VIP' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'palco', label: 'Palcos' },
  { value: 'field', label: 'Pista' },
]

const TIER_COLORS: Record<string, string> = {
  general: '#3B82F6',
  vip: '#A855F7',
  platinum: '#EAB308',
  palco: '#EC4899',
  field: '#22C55E',
}

const POI_TYPES = [
  { value: 'wc', label: 'WC' },
  { value: 'fb', label: 'F&B' },
  { value: 'merch', label: 'Merch' },
  { value: 'med', label: 'Médico' },
  { value: 'info', label: 'Info' },
  { value: 'stage', label: 'Escenario' },
]

const POI_COLORS: Record<string, string> = {
  wc: '#3B82F6',
  fb: '#F59E0B',
  merch: '#EC4899',
  med: '#EF4444',
  info: '#10B981',
  stage: '#FBBF24',
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

function genRowLabels(count: number): string[] {
  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    let label = ''
    let n = i
    do {
      label = String.fromCharCode(65 + (n % 26)) + label
      n = Math.floor(n / 26) - 1
    } while (n >= 0)
    labels.push(label)
  }
  return labels
}

// ── Viewer Component ───────────────────────────────────────────────────────────

function VenueViewer({ sections, mapData, svgWidth, svgHeight }: {
  sections: Shape[]
  mapData: MapData
  svgWidth: number
  svgHeight: number
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; section: Shape } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(z => Math.min(4, Math.max(0.3, z * factor)))
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName === 'svg') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }

  const handleMouseUp = () => setIsPanning(false)

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#1a1a2e', borderRadius: 8 }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${svgWidth / zoom} ${svgHeight / zoom}`}
        style={{ cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Perimeter */}
        {mapData.perimeter && (
          <path d={mapData.perimeter} fill="#0f172a" stroke="#334155" strokeWidth="2" />
        )}

        {/* Field */}
        {mapData.field && (
          <ellipse
            cx={mapData.field.cx} cy={mapData.field.cy}
            rx={mapData.field.rx} ry={mapData.field.ry}
            fill="#166534" stroke="#22c55e" strokeWidth="2"
          />
        )}

        {/* Sections */}
        {sections.map(sec => {
          const isHovered = sec.id === hoveredId
          const opacity = isHovered ? 0.8 : 0.5
          const avail = (sec.capacity ?? 0) - (sec.sold ?? 0)

          const sharedProps = {
            fill: sec.colorHex,
            fillOpacity: opacity,
            stroke: sec.colorHex,
            strokeWidth: isHovered ? 2 : 1,
            style: { cursor: 'pointer', transition: 'fill-opacity 0.15s' },
            onMouseEnter: (e: React.MouseEvent) => {
              setHoveredId(sec.id)
              if (svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect()
                setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, section: sec })
              }
            },
            onMouseLeave: () => { setHoveredId(null); setTooltip(null) },
          }

          return (
            <g key={sec.id}>
              {sec.shapeType === 'rect' && sec.shapeData && (
                <rect x={sec.shapeData.x} y={sec.shapeData.y} width={sec.shapeData.w} height={sec.shapeData.h} {...sharedProps} />
              )}
              {sec.shapeType === 'circle' && sec.shapeData && (
                <circle cx={sec.shapeData.cx} cy={sec.shapeData.cy} r={sec.shapeData.r} {...sharedProps} />
              )}
              {sec.labelX != null && sec.labelY != null && (
                <text
                  x={sec.labelX} y={sec.labelY}
                  fontSize="13" fontWeight="600" fill="white"
                  pointerEvents="none" textAnchor="middle" dominantBaseline="middle"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {sec.name}
                </text>
              )}
              {avail === 0 && sec.labelX != null && sec.labelY != null && (
                <text x={sec.labelX} y={(sec.labelY ?? 0) + 16} fontSize="10" fill="#ef4444" pointerEvents="none" textAnchor="middle">
                  AGOTADO
                </text>
              )}
            </g>
          )
        })}

        {/* Accesses */}
        {mapData.accesses.map(acc => (
          <g key={acc.id}>
            <circle cx={acc.x} cy={acc.y} r="14" fill={acc.primary ? '#22c55e' : '#64748b'} stroke="white" strokeWidth="1.5" />
            <text x={acc.x} y={acc.y + 1} fontSize="11" fill="white" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">→</text>
            <text x={acc.x} y={acc.y + 22} fontSize="9" fill="#94a3b8" textAnchor="middle" pointerEvents="none">{acc.label}</text>
          </g>
        ))}

        {/* POIs */}
        {mapData.pois.map(poi => {
          const color = POI_COLORS[poi.type] ?? '#64748b'
          const isStage = poi.type === 'stage'
          const width = isStage ? 60 : 36
          const height = isStage ? 40 : 20
          const offsetX = isStage ? 30 : 18
          const offsetY = isStage ? 20 : 10
          const fontSize1 = isStage ? 12 : 9
          const fontSize2 = isStage ? 10 : 8
          const labelOffsetY = isStage ? 24 : 18
          return (
            <g key={poi.id}>
              <rect x={poi.x - offsetX} y={poi.y - offsetY} width={width} height={height} rx="10" fill="#1e293b" stroke={color} strokeWidth="1.5" />
              <text x={poi.x} y={poi.y + 1} fontSize={fontSize1} fill={color} textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
                {POI_TYPES.find(t => t.value === poi.type)?.label ?? poi.type.toUpperCase()}
              </text>
              <text x={poi.x} y={poi.y + labelOffsetY} fontSize={fontSize2} fill="#64748b" textAnchor="middle" pointerEvents="none">{poi.label}</text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 10,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
          padding: '8px 12px', fontSize: 12, color: '#f1f5f9', pointerEvents: 'none', zIndex: 10,
          minWidth: 160,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.section.name}</div>
          {tooltip.section.tier && (
            <div style={{ color: TIER_COLORS[tooltip.section.tier] ?? '#94a3b8', marginBottom: 4 }}>
              {TIER_OPTIONS.find(t => t.value === tooltip.section.tier)?.label ?? tooltip.section.tier}
            </div>
          )}
          {tooltip.section.capacity != null && (
            <>
              <div style={{ color: '#94a3b8' }}>Capacidad: {tooltip.section.capacity}</div>
              <div style={{ color: '#94a3b8' }}>Vendidos: {tooltip.section.sold ?? 0}</div>
              <div style={{ color: '#22c55e' }}>Disponibles: {(tooltip.section.capacity) - (tooltip.section.sold ?? 0)}</div>
            </>
          )}
          {tooltip.section.price != null && (
            <div style={{ color: '#EAB308', marginTop: 4 }}>
              ${Number(tooltip.section.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
      )}

      {/* Compass */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, width: 48, height: 48,
        background: 'rgba(15,23,42,0.85)', borderRadius: '50%',
        border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="36" height="36" viewBox="-18 -18 36 36">
          <polygon points="0,-14 4,-4 0,-7 -4,-4" fill="#ef4444" />
          <polygon points="0,14 4,4 0,7 -4,4" fill="#94a3b8" />
          <text x="0" y="-16" fontSize="7" fill="#ef4444" textAnchor="middle">N</text>
          <text x="0" y="22" fontSize="7" fill="#94a3b8" textAnchor="middle">S</text>
          <text x="16" y="3" fontSize="7" fill="#94a3b8" textAnchor="middle">E</text>
          <text x="-16" y="3" fontSize="7" fill="#94a3b8" textAnchor="middle">O</text>
        </svg>
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <Button size="small" icon={<ZoomInOutlined />} onClick={() => setZoom(z => Math.min(4, z * 1.2))} />
        <Button size="small" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} style={{ fontSize: 10 }}>
          {Math.round(zoom * 100)}%
        </Button>
        <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function VenueMapV2({ eventId }: VenueMapV2Props) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const svgRef = useRef<SVGSVGElement>(null)

  const [viewMode, setViewMode] = useState<'visor' | 'editor'>('editor')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState<'select' | 'rect' | 'circle'>('select')
  const [svgWidth, setSvgWidth] = useState(1200)
  const [svgHeight, setSvgHeight] = useState(600)
  const [showTemplates, setShowTemplates] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null)

  // Map extras
  const [accesses, setAccesses] = useState<Access[]>([])
  const [pois, setPois] = useState<POI[]>([])
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showPoiModal, setShowPoiModal] = useState(false)
  const [showSeatModal, setShowSeatModal] = useState(false)
  const [accessForm] = Form.useForm()
  const [poiForm] = Form.useForm()
  const [seatForm] = Form.useForm()
  const [draggingAccessId, setDraggingAccessId] = useState<string | null>(null)
  const [draggingPoiId, setDraggingPoiId] = useState<string | null>(null)
  const [dragOffsetOverlay, setDragOffsetOverlay] = useState({ x: 0, y: 0 })
  const [seatPreviewRows, setSeatPreviewRows] = useState(10)
  const [seatPreviewSeats, setSeatPreviewSeats] = useState(20)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Undo/Redo
  const [sections, setSections] = useState<Shape[]>([])
  const [history, setHistory] = useState<Shape[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Track whether sections have been loaded at least once to avoid resetting
  // unsaved edits on background refetches (e.g. window-focus).
  const initialLoadDone = useRef(false)

  // Load map data
  const { data: mapDataRes, isLoading } = useQuery({
    queryKey: ['venue-map', eventId],
    queryFn: () => ticketEventsApi.getMap(eventId),
    staleTime: Infinity,        // never auto-stale; we invalidate explicitly on save
    refetchOnWindowFocus: false, // don't wipe unsaved edits when user alt-tabs
  })

  useEffect(() => {
    if (!mapDataRes?.data) return
    // Only reset editor state on the very first load.
    // After that we only reload when the save mutation explicitly invalidates
    // the query (tracked via saveMutation.isSuccess + a dedicated effect below).
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    const md = mapDataRes.data.mapData
    if (md?.width) setSvgWidth(md.width)
    if (md?.height) setSvgHeight(md.height)
    if (md?.accesses) setAccesses(md.accesses)
    if (md?.pois) setPois(md.pois)
    const loaded: Shape[] = (mapDataRes.data.sections || []).map((s: Shape, idx: number) => {
      if (s.shapeType && s.shapeData) return s
      const col = idx % 3
      const row = Math.floor(idx / 3)
      const x = 50 + col * 350
      const y = 50 + row * 200
      return {
        ...s,
        shapeType: 'rect',
        shapeData: { x, y, w: 300, h: 150 },
        labelX: x + 150,
        labelY: y + 75,
      }
    })
    setSections(loaded)
    setHistory([loaded])
    setHistoryIndex(0)
  }, [mapDataRes])

  const currentMapData: MapData = {
    width: svgWidth,
    height: svgHeight,
    perimeter: mapDataRes?.data?.mapData?.perimeter,
    field: mapDataRes?.data?.mapData?.field,
    accesses,
    pois,
  }

  const selected = sections.find(s => s.id === selectedId)

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => ticketEventsApi.saveMap(eventId, data),
    onSuccess: () => {
      // Allow the next mapDataRes update (from invalidation) to reload sections
      initialLoadDone.current = false
      queryClient.invalidateQueries({ queryKey: ['venue-map', eventId] })
      message.success('Mapa guardado')
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error?.message ?? err?.message ?? 'Error al guardar mapa'
      message.error(errMsg)
    },
  })

  const generateSeatsMutation = useMutation({
    mutationFn: ({ sectionId, rows, seatsPerRow }: { sectionId: string; rows: string[]; seatsPerRow: number }) =>
      ticketEventsApi.generateSeats(eventId, sectionId, { rows, seatsPerRow }),
    onSuccess: () => {
      message.success('Butacas generadas')
      setShowSeatModal(false)
      seatForm.resetFields()
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message ?? 'Error al generar butacas')
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      mapData: { width: svgWidth, height: svgHeight, perimeter: currentMapData.perimeter, field: currentMapData.field, accesses, pois },
      sections: sections.map(s => ({
        id: s.id,
        shapeType: s.shapeType || null,
        shapeData: s.shapeData || null,
        labelX: typeof s.labelX === 'number' ? s.labelX : null,
        labelY: typeof s.labelY === 'number' ? s.labelY : null,
        tier: s.tier || null,
        colorHex: s.colorHex,
        name: s.name,
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
      const idx = historyIndex - 1
      setHistoryIndex(idx)
      setSections(history[idx])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1
      setHistoryIndex(idx)
      setSections(history[idx])
    }
  }

  const getSVGCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
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
    let targetId = selectedId
    if (!targetId) {
      const unpositioned = sections.find(s => !s.shapeData)
      if (unpositioned) targetId = unpositioned.id
    }
    if (!targetId) {
      message.info('Selecciona una sección para redibujar su forma')
      setIsDrawing(false)
      return
    }

    let shapeData: any
    const labelX = (startPos.x + coords.x) / 2
    const labelY = (startPos.y + coords.y) / 2

    if (drawMode === 'rect') {
      shapeData = {
        x: Math.min(startPos.x, coords.x),
        y: Math.min(startPos.y, coords.y),
        w: Math.abs(coords.x - startPos.x),
        h: Math.abs(coords.y - startPos.y),
      }
    } else if (drawMode === 'circle') {
      const dx = coords.x - startPos.x
      const dy = coords.y - startPos.y
      const r = Math.sqrt(dx * dx + dy * dy)
      shapeData = { cx: startPos.x, cy: startPos.y, r }
    }

    const updated = sections.map(s =>
      s.id === targetId ? { ...s, shapeType: drawMode, shapeData, labelX, labelY } : s
    )
    updateHistory(updated)
    setIsDrawing(false)
    setSelectedId(targetId)
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
        if (s.id !== resizingId || s.shapeType !== 'rect' || !s.shapeData) return s
        const { x, y, w, h } = s.shapeData
        let newX = x, newY = y, newW = w, newH = h
        if (resizeHandle.includes('n')) newY = Math.min(coords.y, y + h - 20)
        if (resizeHandle.includes('s')) newH = Math.max(20, coords.y - y)
        if (resizeHandle.includes('w')) newX = Math.min(coords.x, x + w - 20)
        if (resizeHandle.includes('e')) newW = Math.max(20, coords.x - x)
        return { ...s, shapeData: { x: newX, y: newY, w: newW, h: newH }, labelX: newX + newW / 2, labelY: newY + newH / 2 }
      })
      setSections(updated)
      return
    }

    if (draggingId) {
      const updated = sections.map(s => {
        if (s.id !== draggingId) return s
        const newX = coords.x - dragOffset.x
        const newY = coords.y - dragOffset.y
        return {
          ...s,
          shapeData: s.shapeType === 'rect'
            ? { ...s.shapeData, x: newX, y: newY }
            : { ...s.shapeData, cx: newX, cy: newY },
          labelX: newX + (s.shapeData?.w ?? s.shapeData?.r ?? 50) / 2,
          labelY: newY + (s.shapeData?.h ?? s.shapeData?.r ?? 50) / 2,
        }
      })
      setSections(updated)
      return
    }

    if (draggingAccessId) {
      const svgRect = svgRef.current?.getBoundingClientRect()
      if (svgRect) {
        const x = (e.clientX - svgRect.left) / zoom
        const y = (e.clientY - svgRect.top) / zoom
        setAccesses(prev => prev.map(a => a.id === draggingAccessId ? { ...a, x: x - dragOffsetOverlay.x, y: y - dragOffsetOverlay.y } : a))
      }
      return
    }

    if (draggingPoiId) {
      const svgRect = svgRef.current?.getBoundingClientRect()
      if (svgRect) {
        const x = (e.clientX - svgRect.left) / zoom
        const y = (e.clientY - svgRect.top) / zoom
        setPois(prev => prev.map(p => p.id === draggingPoiId ? { ...p, x: x - dragOffsetOverlay.x, y: y - dragOffsetOverlay.y } : p))
      }
    }
  }

  const handleMouseUpGlobal = () => {
    if (draggingId || resizingId) {
      updateHistory(sections)
      setDraggingId(null)
      setResizingId(null)
      setResizeHandle(null)
    }
    setDraggingAccessId(null)
    setDraggingPoiId(null)
  }

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUpGlobal)
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal)
  }, [draggingId, resizingId, sections, draggingAccessId, draggingPoiId])

  const handleDeleteShape = () => {
    if (!selectedId) return
    Modal.confirm({
      title: 'Quitar forma',
      content: '¿Quitar la forma de esta sección del mapa?',
      okText: 'Sí',
      cancelText: 'No',
      onOk: () => {
        const updated = sections.map(s =>
          s.id === selectedId ? { ...s, shapeType: undefined, shapeData: undefined, labelX: undefined, labelY: undefined } : s
        )
        updateHistory(updated)
        setSelectedId(null)
      },
    })
  }

  const handleClear = () => {
    Modal.confirm({
      title: 'Limpiar mapa',
      content: '¿Quitar todas las formas del mapa?',
      okText: 'Sí',
      cancelText: 'No',
      onOk: () => {
        const cleared = sections.map(s => ({ ...s, shapeType: undefined, shapeData: undefined, labelX: undefined, labelY: undefined }))
        updateHistory(cleared)
        setSelectedId(null)
      },
    })
  }

  const handleLoadTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey]
    setSvgWidth(template.width)
    setSvgHeight(template.height)
    const dbSections = mapDataRes?.data?.sections || []
    const newShapes: Shape[] = dbSections.map((sec: Shape, idx: number) => {
      const tpl = template.shapes[idx]
      if (tpl) return { ...sec, shapeType: tpl.shapeType, shapeData: tpl.shapeData, labelX: tpl.labelX, labelY: tpl.labelY }
      const col = idx % 3
      const row = Math.floor(idx / 3)
      const x = 50 + col * 350
      const y = 50 + row * 200
      return { ...sec, shapeType: 'rect', shapeData: { x, y, w: 300, h: 150 }, labelX: x + 150, labelY: y + 75 }
    })
    updateHistory(newShapes)
    setShowTemplates(false)
    message.success(`Plantilla "${template.name}" aplicada`)
  }

  const handleExportMap = () => {
    const data = { width: svgWidth, height: svgHeight, accesses, pois, sections: sections.map(s => ({ ...s })) }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mapa-venue-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('Mapa exportado')
  }

  const handleImportMap = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev: any) => {
        try {
          const data = JSON.parse(ev.target.result)
          setSvgWidth(data.width ?? 1200)
          setSvgHeight(data.height ?? 600)
          if (data.accesses) setAccesses(data.accesses)
          if (data.pois) setPois(data.pois)
          const importedShapes = (data.sections ?? []).map((s: any) => ({
            ...s,
            id: s.id || Math.random().toString(36).substr(2, 9),
          }))
          updateHistory(importedShapes)
          message.success('Mapa importado')
        } catch {
          message.error('Error al importar JSON')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleAddAccess = (vals: any) => {
    const newAccess: Access = {
      id: Math.random().toString(36).substr(2, 9),
      x: svgWidth / 2,
      y: svgHeight / 2,
      label: vals.label,
      primary: vals.primary ?? false,
    }
    setAccesses(prev => [...prev, newAccess])
    setShowAccessModal(false)
    accessForm.resetFields()
  }

  const handleAddPoi = (vals: any) => {
    const newPoi: POI = {
      id: Math.random().toString(36).substr(2, 9),
      type: vals.type,
      x: svgWidth / 2,
      y: svgHeight / 2,
      label: vals.label,
    }
    setPois(prev => [...prev, newPoi])
    setShowPoiModal(false)
    poiForm.resetFields()
  }

  const handleGenerateSeats = (vals: any) => {
    if (!selectedId) return
    const rows = genRowLabels(vals.rows)
    generateSeatsMutation.mutate({ sectionId: selectedId, rows, seatsPerRow: vals.seatsPerRow })
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin /></div>

  const editorContent = (
    <div style={{ display: 'flex', gap: 16, height: 650 }}>
      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            <Space>
              <Button size="small" onClick={() => setDrawMode('select')} type={drawMode === 'select' ? 'primary' : 'default'}>Seleccionar</Button>
              <Button size="small" onClick={() => setDrawMode('rect')} type={drawMode === 'rect' ? 'primary' : 'default'}>Rectángulo</Button>
              <Button size="small" onClick={() => setDrawMode('circle')} type={drawMode === 'circle' ? 'primary' : 'default'}>Círculo</Button>
            </Space>
            <Space.Compact size="small">
              <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={historyIndex === 0} />
              <Button icon={<RedoOutlined />} onClick={handleRedo} disabled={historyIndex === history.length - 1} />
            </Space.Compact>
            <Space.Compact size="small">
              <Button icon={<ZoomInOutlined />} onClick={() => setZoom(Math.min(2, zoom + 0.1))} />
              <span style={{ padding: '4px 8px', fontSize: 12 }}>{Math.round(zoom * 100)}%</span>
              <Button icon={<ZoomOutOutlined />} onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} />
            </Space.Compact>
            <Button size="small" onClick={() => setShowTemplates(true)}>Plantillas</Button>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setShowAccessModal(true)}>＋ Acceso</Button>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setShowPoiModal(true)}>＋ POI</Button>
            <Button size="small" danger icon={<ClearOutlined />} onClick={handleClear}>Limpiar</Button>
          </Space>
        </div>
        <div style={{ overflow: 'auto', maxHeight: 600 }}>
          <svg
            ref={svgRef}
            width={svgWidth * zoom}
            height={svgHeight * zoom}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{
              border: '1px solid #d9d9d9', borderRadius: 4,
              cursor: drawMode === 'select' ? 'pointer' : 'crosshair',
              backgroundColor: '#fafafa', userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {/* Perimeter */}
            {currentMapData.perimeter && (
              <path d={currentMapData.perimeter} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            )}

            {/* Field */}
            {currentMapData.field && (
              <ellipse
                cx={currentMapData.field.cx} cy={currentMapData.field.cy}
                rx={currentMapData.field.rx} ry={currentMapData.field.ry}
                fill="#bbf7d0" stroke="#22c55e" strokeWidth="2"
              />
            )}

            {/* Sections */}
            {sections.map(sec => {
              const isSelected = sec.id === selectedId
              return (
                <g key={sec.id} onMouseDown={(e) => handleShapeMouseDown(sec.id, e)}>
                  {sec.shapeType === 'rect' && sec.shapeData && (
                    <rect
                      x={sec.shapeData.x ?? 0} y={sec.shapeData.y ?? 0}
                      width={sec.shapeData.w ?? 100} height={sec.shapeData.h ?? 100}
                      fill={sec.colorHex} fillOpacity={isSelected ? 0.7 : 0.5}
                      stroke={isSelected ? '#000' : sec.colorHex}
                      strokeWidth={isSelected ? 3 : 1} style={{ cursor: 'move' }}
                    />
                  )}
                  {sec.shapeType === 'circle' && sec.shapeData && (
                    <circle
                      cx={sec.shapeData.cx ?? 0} cy={sec.shapeData.cy ?? 0}
                      r={sec.shapeData.r ?? 50}
                      fill={sec.colorHex} fillOpacity={isSelected ? 0.7 : 0.5}
                      stroke={isSelected ? '#000' : sec.colorHex}
                      strokeWidth={isSelected ? 3 : 1} style={{ cursor: 'move' }}
                    />
                  )}
                  <text
                    x={sec.labelX ?? 0} y={sec.labelY ?? 0}
                    fontSize="13" fontWeight={isSelected ? 'bold' : 'normal'}
                    fill={isSelected ? '#000' : '#555'}
                    pointerEvents="none" textAnchor="middle" dominantBaseline="middle"
                  >
                    {sec.name}
                  </text>
                  {isSelected && sec.shapeType === 'rect' && sec.shapeData && (
                    <>
                      {(['nw', 'ne', 'sw', 'se'] as const).map(handle => {
                        const { x, y, w, h } = sec.shapeData
                        let cx = x, cy = y
                        if (handle.includes('e')) cx = x + w
                        if (handle.includes('s')) cy = y + h
                        return (
                          <circle
                            key={handle} cx={cx} cy={cy} r="6"
                            fill="#fff" stroke="#000" strokeWidth="2"
                            onMouseDown={(e) => { e.stopPropagation(); setResizingId(sec.id); setResizeHandle(handle) }}
                            style={{ cursor: `${handle}-resize` }}
                          />
                        )
                      })}
                    </>
                  )}
                </g>
              )
            })}

            {/* Accesses */}
            {accesses.map(acc => (
              <g
                key={acc.id}
                style={{ cursor: 'move' }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  const svgRect = svgRef.current?.getBoundingClientRect()
                  if (svgRect) {
                    const x = (e.clientX - svgRect.left) / zoom
                    const y = (e.clientY - svgRect.top) / zoom
                    setDraggingAccessId(acc.id)
                    setDragOffsetOverlay({ x: x - acc.x, y: y - acc.y })
                  }
                }}
              >
                <circle cx={acc.x} cy={acc.y} r="14" fill={acc.primary ? '#22c55e' : '#64748b'} stroke="white" strokeWidth="1.5" />
                <text x={acc.x} y={acc.y + 1} fontSize="11" fill="white" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">→</text>
                <text x={acc.x} y={acc.y + 22} fontSize="9" fill="#555" textAnchor="middle" pointerEvents="none">{acc.label}</text>
              </g>
            ))}

            {/* POIs */}
            {pois.map(poi => {
              const color = POI_COLORS[poi.type] ?? '#64748b'
              const isStage = poi.type === 'stage'
              const width = isStage ? 60 : 36
              const height = isStage ? 40 : 20
              const offsetX = isStage ? 30 : 18
              const offsetY = isStage ? 20 : 10
              const fontSize1 = isStage ? 12 : 9
              const fontSize2 = isStage ? 10 : 8
              const labelOffsetY = isStage ? 24 : 18
              return (
                <g
                  key={poi.id}
                  style={{ cursor: 'move' }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    const svgRect = svgRef.current?.getBoundingClientRect()
                    if (svgRect) {
                      const x = (e.clientX - svgRect.left) / zoom
                      const y = (e.clientY - svgRect.top) / zoom
                      setDraggingPoiId(poi.id)
                      setDragOffsetOverlay({ x: x - poi.x, y: y - poi.y })
                    }
                  }}
                >
                  <rect x={poi.x - offsetX} y={poi.y - offsetY} width={width} height={height} rx="10" fill="white" stroke={color} strokeWidth="1.5" />
                  <text x={poi.x} y={poi.y + 1} fontSize={fontSize1} fill={color} textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
                    {POI_TYPES.find(t => t.value === poi.type)?.label ?? poi.type}
                  </text>
                  <text x={poi.x} y={poi.y + labelOffsetY} fontSize={fontSize2} fill="#777" textAnchor="middle" pointerEvents="none">{poi.label}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Inspector Panel */}
      <div style={{ width: 300, borderLeft: '1px solid #d9d9d9', paddingLeft: 16, overflowY: 'auto', maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <>
            <Form layout="vertical" size="small">
              <Form.Item label="Nombre de la zona">
                <Input
                  value={selected.name}
                  onChange={(e) => {
                    const updated = sections.map(s => s.id === selected.id ? { ...s, name: e.target.value } : s)
                    setSections(updated)
                  }}
                />
              </Form.Item>

              <Form.Item label="Tier">
                <Select
                  value={selected.tier}
                  allowClear
                  placeholder="Sin tier"
                  options={TIER_OPTIONS}
                  onChange={(val) => {
                    const color = val ? TIER_COLORS[val] : selected.colorHex
                    const updated = sections.map(s =>
                      s.id === selected.id ? { ...s, tier: val ?? undefined, colorHex: color } : s
                    )
                    setSections(updated)
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Color de zona">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: selected.colorHex, border: '1px solid #d9d9d9' }} />
                  <input
                    type="color"
                    value={selected.colorHex}
                    onChange={(e) => {
                      const updated = sections.map(s => s.id === selected.id ? { ...s, colorHex: e.target.value } : s)
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
                    const updated = sections.map(s => s.id === selected.id ? { ...s, labelX: val ?? 0 } : s)
                    setSections(updated)
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Etiqueta Y">
                <InputNumber
                  value={selected.labelY ?? 0}
                  onChange={(val) => {
                    const updated = sections.map(s => s.id === selected.id ? { ...s, labelY: val ?? 0 } : s)
                    setSections(updated)
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>

            <Button
              block size="small"
              onClick={() => {
                seatForm.resetFields()
                setSeatPreviewRows(10)
                setSeatPreviewSeats(20)
                setShowSeatModal(true)
              }}
              style={{ marginBottom: 8 }}
            >
              Configurar Butacas
            </Button>

            <Button danger block icon={<DeleteOutlined />} size="small" onClick={handleDeleteShape}>
              Quitar forma
            </Button>
            <Divider style={{ margin: '12px 0' }} />
          </>
        ) : (
          <>
            <p style={{ color: '#999', fontSize: 12, marginBottom: 12 }}>Selecciona una zona para editar</p>
            <Divider style={{ margin: '12px 0' }} />
          </>
        )}

        {sections.length > 0 && (
          <>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Zonas ({sections.length})</h4>
            <List
              size="small"
              dataSource={sections}
              style={{ flex: 1, overflow: 'auto', marginBottom: 8 }}
              renderItem={(zone) => (
                <List.Item
                  key={zone.id}
                  onClick={() => setSelectedId(zone.id)}
                  style={{
                    cursor: 'pointer', padding: 8, marginBottom: 4, borderRadius: 4,
                    backgroundColor: selectedId === zone.id ? '#f0f0f0' : '#fafafa',
                    border: selectedId === zone.id ? '1px solid #6B46C1' : '1px solid #e8e8e8',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: zone.colorHex, border: '1px solid #d9d9d9', flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zone.name}</div>
                    {zone.tier && (
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: TIER_COLORS[zone.tier] + '22', color: TIER_COLORS[zone.tier] }}>
                        {TIER_OPTIONS.find(t => t.value === zone.tier)?.label}
                      </span>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </>
        )}

        {(accesses.length > 0 || pois.length > 0) && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
              {accesses.length} acceso(s) · {pois.length} POI(s)
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleExportMap} style={{ flex: 1 }}>Exportar</Button>
          <Button size="small" icon={<UploadOutlined />} onClick={handleImportMap} style={{ flex: 1 }}>Importar</Button>
        </div>

        <Button
          type="primary" block icon={<SaveOutlined />} onClick={handleSave}
          loading={saveMutation.isPending} style={{ marginTop: 12 }}
        >
          Guardar Mapa
        </Button>
      </div>

      {/* Templates Modal */}
      <Modal title="Plantillas de Venue" open={showTemplates} onCancel={() => setShowTemplates(false)} footer={null} width={600}>
        <Row gutter={[16, 16]}>
          {Object.entries(TEMPLATES).map(([key, template]) => (
            <Col xs={24} sm={12} key={key}>
              <Card hoverable onClick={() => handleLoadTemplate(key)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>
                  {key === 'stadium' ? '🏟️' : key === 'theater' ? '🎭' : '🎪'}
                </div>
                <div style={{ fontWeight: 500 }}>{template.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{template.shapes.length} zonas</div>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* Add Access Modal */}
      <Modal
        title="Agregar Acceso"
        open={showAccessModal}
        onCancel={() => { setShowAccessModal(false); accessForm.resetFields() }}
        onOk={() => accessForm.validateFields().then(handleAddAccess)}
        okText="Agregar"
      >
        <Form form={accessForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="label" label="Etiqueta" rules={[{ required: true, message: 'Ingresa una etiqueta' }]}>
            <Input placeholder="Ej. Entrada Principal" />
          </Form.Item>
          <Form.Item name="primary" label="Tipo">
            <Select
              options={[
                { value: false, label: 'Acceso secundario' },
                { value: true, label: 'Acceso principal' },
              ]}
              defaultValue={false}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add POI Modal */}
      <Modal
        title="Agregar Punto de Interés (POI)"
        open={showPoiModal}
        onCancel={() => { setShowPoiModal(false); poiForm.resetFields() }}
        onOk={() => poiForm.validateFields().then(handleAddPoi)}
        okText="Agregar"
      >
        <Form form={poiForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select options={POI_TYPES} placeholder="Seleccionar tipo" />
          </Form.Item>
          <Form.Item name="label" label="Etiqueta" rules={[{ required: true, message: 'Ingresa una etiqueta' }]}>
            <Input placeholder="Ej. Baños Norte" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Seat Configuration Modal */}
      <Modal
        title={`Configurar Butacas – ${selected?.name ?? ''}`}
        open={showSeatModal}
        onCancel={() => { setShowSeatModal(false); seatForm.resetFields() }}
        onOk={() => seatForm.validateFields().then(handleGenerateSeats)}
        confirmLoading={generateSeatsMutation.isPending}
        okText="Generar Butacas"
        width={520}
      >
        <Form
          form={seatForm}
          layout="vertical"
          initialValues={{ rows: 10, seatsPerRow: 20 }}
          style={{ marginTop: 16 }}
          onValuesChange={(_, all) => {
            setSeatPreviewRows(all.rows ?? 10)
            setSeatPreviewSeats(all.seatsPerRow ?? 20)
          }}
        >
          <Form.Item name="rows" label="Número de filas" rules={[{ required: true }]}>
            <InputNumber min={1} max={52} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="seatsPerRow" label="Butacas por fila" rules={[{ required: true }]}>
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>
        </Form>

        {/* Preview grid */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              Vista previa — {seatPreviewRows} filas × {seatPreviewSeats} butacas = <strong>{seatPreviewRows * seatPreviewSeats} total</strong>
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { bg: '#ccfbf1', border: '#5eead4', label: 'Disponible' },
                { bg: '#d9d9d9', border: '#d9d9d9', label: 'Vendida' },
              ].map(({ bg, border, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1.5px solid ${border}` }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', background: '#1a1a2e', borderRadius: 8, padding: '12px 10px' }}>
            {genRowLabels(Math.min(seatPreviewRows, 12)).map(rowLabel => (
              <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#64748b', width: 22, textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>{rowLabel}</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {Array.from({ length: Math.min(seatPreviewSeats, 25) }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 16, height: 16, borderRadius: 4,
                        background: '#ccfbf1',
                        border: '1.5px solid #5eead4',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                  {seatPreviewSeats > 25 && (
                    <span style={{ fontSize: 10, color: '#64748b', alignSelf: 'center' }}>+{seatPreviewSeats - 25}</span>
                  )}
                </div>
              </div>
            ))}
            {seatPreviewRows > 12 && (
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', paddingTop: 6 }}>
                · · · y {seatPreviewRows - 12} filas más
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )

  const viewerContent = (
    <div style={{ height: 650, display: 'flex' }}>
      <VenueViewer
        sections={sections}
        mapData={currentMapData}
        svgWidth={svgWidth}
        svgHeight={svgHeight}
      />
    </div>
  )

  return (
    <Tabs
      activeKey={viewMode}
      onChange={(key) => setViewMode(key as 'visor' | 'editor')}
      items={[
        { key: 'visor', label: 'Visor', children: viewerContent },
        { key: 'editor', label: 'Editor', children: editorContent },
      ]}
    />
  )
}
