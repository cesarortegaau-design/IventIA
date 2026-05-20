/**
 * MapaPage.tsx
 * Editor de mapa — Cenital | Seating chart | Recorrido invitado | Personal y logística
 */
import {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { usePlannerStore } from '../../hooks/usePlannerStore'
import {
  Button, Modal, Form, Input, InputNumber, Select, Switch, App, Typography, Space,
  Checkbox, Popconfirm, Tag,
} from 'antd'
import {
  CheckOutlined, ShareAltOutlined, UploadOutlined,
  PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
  DownloadOutlined, TeamOutlined, UserOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import {
  Stage, Layer, Rect, Text, Circle, Group, Transformer,
} from 'react-konva'
import type Konva from 'konva'

const { Text: AntText } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
type ZoneType = 'CEREMONIA' | 'BANQUETE' | 'PISTA' | 'BAR' | 'SERVICIO' | 'ACCESO' | 'ACTIVACIÓN' | 'COCINA' | 'OTRO'
type MapStatus = 'BORRADOR' | 'APROBADO'
type Tool = 'select' | 'move' | 'zona' | 'poi' | 'texto'

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
  taskIds?: string[]
  shape?: 'rect' | 'circle' | 'text'
}

interface Waypoint {
  id: string
  order: number
  label: string
  description?: string
  time?: string
  zoneId?: string
  icon: string
  color: string
}

interface StaffMember {
  id: string
  name: string
  role: string
  zoneId?: string
  timeStart?: string
  timeEnd?: string
  notes?: string
}

interface MapStore {
  zones: Zone[]
  status: MapStatus
  venueName: string
  updatedAt: string
  seating: Record<string, string[]>
  waypoints: Waypoint[]
  staff: StaffMember[]
}

interface Layers {
  zonas: boolean
  mesas: boolean
  poi: boolean
  recorrido: boolean
  cotas: boolean
}

interface DrawState {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

// ── Constants ──────────────────────────────────────────────────────────────────
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

const COLOR_SWATCHES = ['#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#3B82F6', '#06B6D4']
const POI_TYPES: ZoneType[] = ['BAR', 'SERVICIO', 'ACCESO']

const STAFF_ROLES = [
  'Coordinador general', 'Coordinador de zona', 'Técnico A/V',
  'Técnico iluminación', 'Personal de seguridad', 'Personal de servicio',
  'Fotógrafo', 'DJ', 'Médico', 'Otro',
]

const WAYPOINT_ICONS: Record<string, string> = {
  llegada: '🚗', recepcion: '👋', ceremonia: '💍', coctel: '🥂',
  banquete: '🍽', salida: '🚪', activacion: '⭐', fotografia: '📷', otro: '📍',
}

const WAYPOINT_COLORS = ['#7C3AED', '#EC4899', '#F97316', '#0D9488', '#2563EB', '#059669', '#D97706']

const TEMPLATES: Record<string, Zone[]> = {
  'Boda al aire libre': [
    { id: 'z1', type: 'CEREMONIA',  name: 'Jardín principal',    x: 20,  y: 60,  width: 280, height: 200, capacity: 200, tables: 0,  lighting: 'Natural',  sound: 'Sonido ambiente',   supplier: '' },
    { id: 'z2', type: 'BANQUETE',   name: 'Banquete · 22 mesas', x: 20,  y: 280, width: 380, height: 210, capacity: 220, tables: 22, lighting: 'Cálida',   sound: 'DJ + monitor',      supplier: 'Catering Aurora' },
    { id: 'z3', type: 'PISTA',      name: 'Pista de baile',      x: 320, y: 60,  width: 200, height: 180, capacity: 150, tables: 0,  lighting: 'LED RGB',  sound: 'Sistema principal', supplier: '' },
    { id: 'z4', type: 'BAR',        name: 'Barra principal',     x: 540, y: 200, width: 160, height: 120, capacity: 50,  tables: 0,  lighting: 'Cálida',   sound: '',                  supplier: 'Bar Elite' },
    { id: 'z5', type: 'SERVICIO',   name: 'Baños',               x: 540, y: 60,  width: 110, height: 120, capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                  supplier: '' },
    { id: 'z6', type: 'ACCESO',     name: 'Parking',             x: 540, y: 340, width: 120, height: 100, capacity: 100, tables: 0,  lighting: 'Exterior', sound: '',                  supplier: '' },
    { id: 'z7', type: 'ACTIVACIÓN', name: 'Photobooth',          x: 660, y: 60,  width: 120, height: 120, capacity: 10,  tables: 0,  lighting: 'Flash',    sound: '',                  supplier: '' },
    { id: 'z8', type: 'COCINA',     name: 'Cocina caliente',     x: 400, y: 340, width: 130, height: 100, capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                  supplier: 'Catering Aurora' },
  ],
  'Banquete corporativo': [
    { id: 'z1', type: 'BANQUETE',   name: 'Salón principal',     x: 40,  y: 60,  width: 400, height: 280, capacity: 300, tables: 30, lighting: 'Neutra',   sound: 'Sistema PA',        supplier: 'Catering Corp' },
    { id: 'z2', type: 'PISTA',      name: 'Escenario',           x: 460, y: 60,  width: 180, height: 120, capacity: 50,  tables: 0,  lighting: 'Teatral',  sound: 'Sistema principal', supplier: '' },
    { id: 'z3', type: 'BAR',        name: 'Bar de bienvenida',   x: 460, y: 200, width: 180, height: 100, capacity: 40,  tables: 0,  lighting: 'Cálida',   sound: '',                  supplier: 'Bar Corp' },
    { id: 'z4', type: 'COCINA',     name: 'Cocina de servicio',  x: 460, y: 320, width: 180, height: 80,  capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                  supplier: 'Catering Corp' },
    { id: 'z5', type: 'SERVICIO',   name: 'Baños',               x: 40,  y: 360, width: 120, height: 80,  capacity: 0,   tables: 0,  lighting: 'Blanca',   sound: '',                  supplier: '' },
    { id: 'z6', type: 'ACCESO',     name: 'Registro / entrada',  x: 180, y: 360, width: 160, height: 80,  capacity: 0,   tables: 0,  lighting: 'Exterior', sound: '',                  supplier: '' },
  ],
  'Festival pequeño': [
    { id: 'z1', type: 'PISTA',      name: 'Escenario principal',   x: 100, y: 40,  width: 300, height: 160, capacity: 500, tables: 0,  lighting: 'LED RGB', sound: 'Line array',   supplier: '' },
    { id: 'z2', type: 'BANQUETE',   name: 'Food court',            x: 50,  y: 230, width: 250, height: 200, capacity: 200, tables: 20, lighting: 'Cálida',  sound: 'Ambient',      supplier: '' },
    { id: 'z3', type: 'BAR',        name: 'Bar principal',         x: 440, y: 100, width: 150, height: 120, capacity: 80,  tables: 0,  lighting: 'Neon',    sound: '',             supplier: 'Bar Festival' },
    { id: 'z4', type: 'BAR',        name: 'Bar secundario',        x: 440, y: 240, width: 120, height: 100, capacity: 50,  tables: 0,  lighting: 'Neon',    sound: '',             supplier: 'Bar Festival' },
    { id: 'z5', type: 'ACCESO',     name: 'Entrada general',       x: 200, y: 380, width: 200, height: 80,  capacity: 0,   tables: 0,  lighting: 'Exterior',sound: '',             supplier: '' },
    { id: 'z6', type: 'SERVICIO',   name: 'Sanitarios portátiles', x: 600, y: 100, width: 100, height: 120, capacity: 0,   tables: 0,  lighting: 'Blanca',  sound: '',             supplier: '' },
    { id: 'z7', type: 'ACTIVACIÓN', name: 'Zona de activaciones',  x: 600, y: 240, width: 120, height: 140, capacity: 30,  tables: 0,  lighting: 'Flash',   sound: '',             supplier: '' },
  ],
}

// ── Persistence ────────────────────────────────────────────────────────────────
function storeKey(id: string) { return `iventia-mapa-${id}` }

function loadStore(id: string): MapStore {
  try {
    const raw = localStorage.getItem(storeKey(id))
    if (raw) {
      const p = JSON.parse(raw)
      return {
        ...p,
        seating: p.seating || {},
        waypoints: p.waypoints || [],
        staff: p.staff || [],
      }
    }
  } catch { /* ignore */ }
  return { zones: [], status: 'BORRADOR', venueName: 'Venue', updatedAt: '', seating: {}, waypoints: [], staff: [] }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function saveStore(id: string, store: MapStore) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(storeKey(id), JSON.stringify({ ...store, updatedAt: new Date().toISOString() }))
    } catch { /* ignore */ }
  }, 300)
}

// ── Table layout helper ────────────────────────────────────────────────────────
function tablePositions(zone: Zone): { tx: number; ty: number }[] {
  const PAD = 24, DIAMETER = 32, GAP = 10
  const availW = zone.width - PAD * 2
  const cols = Math.max(1, Math.floor((availW + GAP) / (DIAMETER + GAP)))
  const positions: { tx: number; ty: number }[] = []
  for (let i = 0; i < zone.tables; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const startX = PAD + (availW - (Math.min(cols, zone.tables - row * cols) * (DIAMETER + GAP) - GAP)) / 2
    positions.push({ tx: startX + col * (DIAMETER + GAP) + DIAMETER / 2, ty: PAD + 44 + row * (DIAMETER + GAP) + DIAMETER / 2 })
  }
  return positions
}

// ── Excel export helper ────────────────────────────────────────────────────────
async function exportSeatingToExcel(store: MapStore) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Seating Chart')
  ws.columns = [
    { header: 'Zona', key: 'zone', width: 22 },
    { header: 'Mesa', key: 'table', width: 10 },
    { header: 'Invitado', key: 'guest', width: 32 },
  ]
  store.zones.filter(z => (z.tables || 0) > 0).forEach(zone => {
    for (let i = 0; i < zone.tables; i++) {
      const guests = store.seating[`${zone.id}-${i}`] || []
      if (guests.length === 0) ws.addRow({ zone: zone.name, table: `M${i + 1}`, guest: '—' })
      else guests.forEach(g => ws.addRow({ zone: zone.name, table: `M${i + 1}`, guest: g }))
    }
  })
  ws.getRow(1).font = { bold: true }
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf]))
  const a = document.createElement('a')
  a.href = url; a.download = 'seating-chart.xlsx'; a.click()
  URL.revokeObjectURL(url)
}

// ── Seating Chart Tab ─────────────────────────────────────────────────────────
function SeatingChartTab({ store, update }: { store: MapStore; update: (p: Partial<MapStore>) => void }) {
  const { message } = App.useApp()
  const zonesWithTables = store.zones.filter(z => (z.tables || 0) > 0)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')

  const getGuests = (zoneId: string, i: number) => store.seating[`${zoneId}-${i}`] || []
  const setGuests = (key: string, guests: string[]) =>
    update({ seating: { ...store.seating, [key]: guests } })

  const addGuest = (key: string) => {
    if (!inputVal.trim()) return
    const current = store.seating[key] || []
    setGuests(key, [...current, inputVal.trim()])
    setInputVal('')
  }

  const removeGuest = (key: string, idx: number) => {
    const current = store.seating[key] || []
    setGuests(key, current.filter((_, i) => i !== idx))
  }

  const totalSeated = Object.values(store.seating).flat().length
  const totalTables = zonesWithTables.reduce((s, z) => s + z.tables, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 28px', background: '#fff', borderBottom: '1px solid #EDE9FE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <AntText style={{ fontWeight: 700, fontSize: 15 }}>Distribución de invitados</AntText>
          <div style={{ fontSize: 12, color: '#aaa' }}>{totalSeated} asignados · {totalTables} mesas</div>
        </div>
        <Button icon={<DownloadOutlined />} onClick={() => exportSeatingToExcel(store).catch(() => message.error('Error al exportar'))}>
          Exportar Excel
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {zonesWithTables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <TeamOutlined style={{ fontSize: 48, color: '#DDD6FE', display: 'block', marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: '#555', marginBottom: 6 }}>Sin mesas en el mapa</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Agrega zonas con mesas en la vista Cenital</div>
          </div>
        ) : zonesWithTables.map(zone => {
          const cfg = ZONE_CONFIGS[zone.type]
          const color = zone.colorOverride || cfg.color
          const zoneGuests = Array.from({ length: zone.tables }, (_, i) => getGuests(zone.id, i).length).reduce((s, c) => s + c, 0)

          return (
            <div key={zone.id} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>{zone.name}</span>
                <Tag style={{ borderRadius: 20, border: 'none', background: `${color}22`, color }}>{zone.tables} mesas</Tag>
                <span style={{ fontSize: 11, color: '#aaa' }}>{zoneGuests} invitados asignados</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {Array.from({ length: zone.tables }, (_, i) => {
                  const key = `${zone.id}-${i}`
                  const guests = getGuests(zone.id, i)
                  const isEditing = editKey === key
                  const capacity = 8
                  const pct = Math.min(1, guests.length / capacity)

                  return (
                    <div key={key}
                      onClick={() => { if (!isEditing) { setEditKey(key); setInputVal('') } }}
                      style={{
                        background: '#fff', borderRadius: 12,
                        border: isEditing ? `2px solid ${color}` : '1px solid #EDE9FE',
                        padding: '12px 14px', cursor: 'pointer',
                        boxShadow: isEditing ? `0 0 0 3px ${color}20` : '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color }}>
                            {i + 1}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>Mesa {i + 1}</span>
                        </div>
                        <span style={{ fontSize: 10, color: guests.length >= capacity ? '#059669' : '#aaa' }}>{guests.length}/{capacity}</span>
                      </div>

                      <div style={{ height: 3, background: '#F3F4F6', borderRadius: 4, marginBottom: 8 }}>
                        <div style={{ height: '100%', width: `${pct * 100}%`, background: pct >= 1 ? '#059669' : color, borderRadius: 4, transition: 'width 0.2s' }} />
                      </div>

                      <div style={{ minHeight: 32 }}>
                        {guests.map((g, gi) => (
                          <div key={gi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
                            <span>👤 {g}</span>
                            {isEditing && (
                              <span onClick={e => { e.stopPropagation(); removeGuest(key, gi) }}
                                style={{ cursor: 'pointer', color: '#DC2626', fontWeight: 700, padding: '0 4px' }}>×</span>
                            )}
                          </div>
                        ))}
                        {guests.length === 0 && !isEditing && (
                          <div style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>Sin invitados asignados</div>
                        )}
                      </div>

                      {isEditing && (
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                          <Input size="small" placeholder="Nombre del invitado" value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            onPressEnter={() => addGuest(key)} autoFocus />
                          <Button size="small" type="primary" onClick={() => addGuest(key)}
                            style={{ background: color, borderColor: color, flexShrink: 0 }}>+</Button>
                          <Button size="small" onClick={() => setEditKey(null)} style={{ flexShrink: 0 }}>✓</Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Recorrido Tab ──────────────────────────────────────────────────────────────
function RecorridoTab({ store, update }: { store: MapStore; update: (p: Partial<MapStore>) => void }) {
  const { message } = App.useApp()
  const [addModal, setAddModal] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [form] = Form.useForm()

  const openAdd = () => { form.resetFields(); form.setFieldsValue({ icon: 'otro', color: '#7C3AED' }); setEditIdx(null); setAddModal(true) }
  const openEdit = (idx: number) => {
    const wp = store.waypoints[idx]
    form.setFieldsValue({ label: wp.label, description: wp.description, time: wp.time, zoneId: wp.zoneId, icon: Object.entries(WAYPOINT_ICONS).find(([, v]) => v === wp.icon)?.[0] || 'otro', color: wp.color })
    setEditIdx(idx); setAddModal(true)
  }

  const save = (vals: any) => {
    const wp: Waypoint = {
      id: editIdx !== null ? store.waypoints[editIdx].id : `wp-${Date.now()}`,
      order: editIdx !== null ? store.waypoints[editIdx].order : store.waypoints.length + 1,
      label: vals.label,
      description: vals.description || '',
      time: vals.time || '',
      zoneId: vals.zoneId || '',
      icon: WAYPOINT_ICONS[vals.icon] || '📍',
      color: vals.color || '#7C3AED',
    }
    if (editIdx !== null) {
      const wps = [...store.waypoints]; wps[editIdx] = wp; update({ waypoints: wps })
    } else {
      update({ waypoints: [...store.waypoints, wp] })
    }
    setAddModal(false); form.resetFields()
    message.success(editIdx !== null ? 'Punto actualizado' : 'Punto de recorrido agregado')
  }

  const remove = (idx: number) => {
    update({ waypoints: store.waypoints.filter((_, i) => i !== idx).map((w, i) => ({ ...w, order: i + 1 })) })
  }

  const move = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= store.waypoints.length) return
    const wps = [...store.waypoints];
    [wps[idx], wps[newIdx]] = [wps[newIdx], wps[idx]]
    update({ waypoints: wps.map((w, i) => ({ ...w, order: i + 1 })) })
  }

  const zoneName = (zoneId?: string) => store.zones.find(z => z.id === zoneId)?.name || ''

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 28px', background: '#fff', borderBottom: '1px solid #EDE9FE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <AntText style={{ fontWeight: 700, fontSize: 15 }}>Recorrido del invitado</AntText>
          <div style={{ fontSize: 12, color: '#aaa' }}>{store.waypoints.length} puntos en la ruta</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
          style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}>
          Agregar punto
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 80px' }}>
        {store.waypoints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <div style={{ fontWeight: 600, color: '#555', marginBottom: 6 }}>Sin puntos de recorrido</div>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>Define el camino que seguirán los invitados durante el evento</div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
              style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}>
              Agregar primer punto
            </Button>
          </div>
        ) : (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {store.waypoints.map((wp, idx) => (
              <div key={wp.id} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                {/* Timeline spine */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52, flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: wp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: `0 0 0 4px ${wp.color}22` }}>
                    {wp.icon}
                  </div>
                  {idx < store.waypoints.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 32, background: `linear-gradient(${wp.color}, ${store.waypoints[idx + 1]?.color || '#E5E7EB'})`, margin: '4px 0', opacity: 0.4, borderRadius: 2 }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: idx < store.waypoints.length - 1 ? 20 : 0, paddingLeft: 16 }}>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#aaa', background: '#F3F4F6', padding: '1px 8px', borderRadius: 20 }}>PASO {wp.order}</span>
                          {wp.time && <span style={{ fontSize: 11, color: wp.color, fontWeight: 600 }}>⏰ {wp.time}</span>}
                          {wp.zoneId && zoneName(wp.zoneId) && (
                            <Tag style={{ borderRadius: 20, border: 'none', background: `${wp.color}15`, color: wp.color, fontSize: 10 }}>{zoneName(wp.zoneId)}</Tag>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{wp.label}</div>
                        {wp.description && <div style={{ fontSize: 12, color: '#6B7280' }}>{wp.description}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={idx === 0}
                          onClick={() => move(idx, -1)} style={{ color: '#9CA3AF' }} />
                        <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={idx === store.waypoints.length - 1}
                          onClick={() => move(idx, 1)} style={{ color: '#9CA3AF' }} />
                        <Button type="text" size="small" onClick={() => openEdit(idx)} style={{ color: '#7C3AED', fontSize: 11 }}>Editar</Button>
                        <Popconfirm title="¿Eliminar este punto?" onConfirm={() => remove(idx)} okButtonProps={{ danger: true }} okText="Sí">
                          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#DC2626' }} />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal title={editIdx !== null ? 'Editar punto' : 'Nuevo punto de recorrido'} open={addModal}
        onCancel={() => { setAddModal(false); form.resetFields() }}
        onOk={() => form.submit()} okText="Guardar"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        destroyOnClose width={440}>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="label" label="Punto del recorrido" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Llegada al venue, Coctel de bienvenida..." autoFocus />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="icon" label="Ícono">
              <Select>
                {Object.entries(WAYPOINT_ICONS).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v} {k}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="time" label="Horario">
              <Input placeholder="Ej: 18:00" />
            </Form.Item>
          </div>
          <Form.Item name="zoneId" label="Zona del mapa">
            <Select allowClear placeholder="Seleccionar zona (opcional)">
              {store.zones.map(z => <Select.Option key={z.id} value={z.id}>{ZONE_CONFIGS[z.type].icon} {z.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={2} placeholder="Detalles, instrucciones para el invitado..." />
          </Form.Item>
          <Form.Item name="color" label="Color">
            <Select>
              {WAYPOINT_COLORS.map(c => (
                <Select.Option key={c} value={c}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: c }} />
                    {c}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Logística Tab ──────────────────────────────────────────────────────────────
function LogisticaTab({ store, update }: { store: MapStore; update: (p: Partial<MapStore>) => void }) {
  const { message } = App.useApp()
  const [addModal, setAddModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const openAdd = () => { form.resetFields(); setEditId(null); setAddModal(true) }
  const openEdit = (s: StaffMember) => {
    form.setFieldsValue({ name: s.name, role: s.role, zoneId: s.zoneId, timeStart: s.timeStart, timeEnd: s.timeEnd, notes: s.notes })
    setEditId(s.id); setAddModal(true)
  }

  const save = (vals: any) => {
    const member: StaffMember = {
      id: editId || `staff-${Date.now()}`,
      name: vals.name,
      role: vals.role,
      zoneId: vals.zoneId || '',
      timeStart: vals.timeStart || '',
      timeEnd: vals.timeEnd || '',
      notes: vals.notes || '',
    }
    if (editId) {
      update({ staff: store.staff.map(s => s.id === editId ? member : s) })
    } else {
      update({ staff: [...store.staff, member] })
    }
    setAddModal(false); form.resetFields()
    message.success(editId ? 'Personal actualizado' : 'Personal agregado')
  }

  const remove = (id: string) => {
    update({ staff: store.staff.filter(s => s.id !== id) })
    message.success('Registro eliminado')
  }

  // KPIs
  const byZone = store.staff.reduce((acc, s) => {
    const key = s.zoneId || '__general'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const zoneName = (zoneId?: string) => {
    if (!zoneId || zoneId === '__general') return 'Sin zona asignada'
    return store.zones.find(z => z.id === zoneId)?.name || zoneId
  }

  const roleColor: Record<string, string> = {
    'Coordinador general': '#7C3AED',
    'Coordinador de zona': '#8B5CF6',
    'Técnico A/V': '#0D9488',
    'Técnico iluminación': '#06B6D4',
    'Personal de seguridad': '#DC2626',
    'Personal de servicio': '#F59E0B',
    'Fotógrafo': '#EC4899',
    'DJ': '#2563EB',
    'Médico': '#059669',
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 28px', background: '#fff', borderBottom: '1px solid #EDE9FE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <AntText style={{ fontWeight: 700, fontSize: 15 }}>Personal y logística</AntText>
          <div style={{ fontSize: 12, color: '#aaa' }}>{store.staff.length} personas asignadas · {Object.keys(byZone).length} zonas cubiertas</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
          style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}>
          Agregar personal
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {/* KPI bar */}
        {store.staff.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'TOTAL', value: store.staff.length, color: '#7C3AED' },
              { label: 'ROLES', value: new Set(store.staff.map(s => s.role)).size, color: '#EC4899' },
              { label: 'ZONAS', value: new Set(store.staff.filter(s => s.zoneId).map(s => s.zoneId)).size, color: '#0D9488' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #EDE9FE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: '0.12em', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {store.staff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <UserOutlined style={{ fontSize: 48, color: '#DDD6FE', display: 'block', marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: '#555', marginBottom: 6 }}>Sin personal asignado</div>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>Asigna coordinadores, técnicos y personal a cada zona del evento</div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}>
              Agregar primer miembro
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {store.staff.map(s => {
              const color = roleColor[s.role] || '#9CA3AF'
              const zone = s.zoneId ? store.zones.find(z => z.id === s.zoneId) : null
              const zoneCfg = zone ? ZONE_CONFIGS[zone.type] : null

              return (
                <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {s.role === 'Fotógrafo' ? '📷' : s.role === 'DJ' ? '🎵' : s.role === 'Médico' ? '⚕️' : s.role.includes('seguridad') ? '🛡️' : '👤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                      <Tag style={{ borderRadius: 20, border: 'none', background: `${color}18`, color, fontSize: 10 }}>{s.role}</Tag>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 12 }}>
                      {zone && <span>{zoneCfg?.icon} {zone.name}</span>}
                      {(s.timeStart || s.timeEnd) && <span>⏰ {s.timeStart}{s.timeStart && s.timeEnd ? ' – ' : ''}{s.timeEnd}</span>}
                      {s.notes && <span style={{ fontStyle: 'italic' }}>{s.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <Button type="text" size="small" onClick={() => openEdit(s)} style={{ color: '#7C3AED', fontSize: 11 }}>Editar</Button>
                    <Popconfirm title="¿Eliminar este registro?" onConfirm={() => remove(s.id)} okButtonProps={{ danger: true }} okText="Sí">
                      <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#DC2626' }} />
                    </Popconfirm>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal title={editId ? 'Editar personal' : 'Agregar personal'} open={addModal}
        onCancel={() => { setAddModal(false); form.resetFields() }}
        onOk={() => form.submit()} okText="Guardar"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        destroyOnClose width={480}>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Nombre completo" autoFocus />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true, message: 'Requerido' }]}>
            <Select placeholder="Seleccionar rol">
              {STAFF_ROLES.map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="zoneId" label="Zona asignada">
            <Select allowClear placeholder="Sin zona específica">
              {store.zones.map(z => <Select.Option key={z.id} value={z.id}>{ZONE_CONFIGS[z.type].icon} {z.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="timeStart" label="Entrada">
              <Input placeholder="Ej: 14:00" />
            </Form.Item>
            <Form.Item name="timeEnd" label="Salida">
              <Input placeholder="Ej: 23:00" />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Responsabilidades, contacto, indicaciones..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MapaPage() {
  const { id: eventId = 'default' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  const { store, update, syncStatus, ready } = usePlannerStore<MapStore>(
    eventId, 'mapa',
    { zones: [], status: 'DRAFT' as MapStatus, venueName: '', updatedAt: '', seating: {}, waypoints: [], staff: [] },
    `iventia-mapa-${eventId}`,
  )
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('cenital')
  const [layers, setLayers] = useState<Layers>({ zonas: true, mesas: true, poi: true, recorrido: false, cotas: false })

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const importRef = useRef<HTMLInputElement>(null)

  const [drawing, setDrawing] = useState(false)
  const [drawState, setDrawState] = useState<DrawState | null>(null)
  const [newZoneModal, setNewZoneModal] = useState(false)
  const [pendingZone, setPendingZone] = useState<Partial<Zone> | null>(null)
  const [form] = Form.useForm()

  const [poiModal, setPoiModal] = useState(false)
  const [textoModal, setTextoModal] = useState(false)
  const [clickPoint, setClickPoint] = useState<{ x: number; y: number } | null>(null)
  const [poiForm] = Form.useForm()
  const [textoForm] = Form.useForm()

  const { store: tareasStore } = usePlannerStore<{ tasks: any[] }>(
    eventId, 'tareas', { tasks: [] }, `iventia-tareas-${eventId}`,
  )
  const allTasks = tareasStore.tasks ?? []

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, stageX: 0, stageY: 0 })

  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef<Record<string, Konva.Group>>({})

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
    update({ zones: store.zones.map(z => z.id === id ? { ...z, ...patch } : z) })
  }

  const getStagePoint = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()!
    const pointer = stage.getPointerPosition()!
    return { x: (pointer.x - stagePos.x) / stageScale, y: (pointer.y - stagePos.y) / stageScale }
  }

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const nativeEvt = e.evt
    const isOnStage = e.target === e.target.getStage()
    if (nativeEvt.button === 1 || (nativeEvt.button === 0 && nativeEvt.ctrlKey)) {
      isPanning.current = true
      panStart.current = { x: nativeEvt.clientX, y: nativeEvt.clientY, stageX: stagePos.x, stageY: stagePos.y }
      return
    }
    if (activeTool === 'move' && isOnStage) {
      isPanning.current = true
      panStart.current = { x: nativeEvt.clientX, y: nativeEvt.clientY, stageX: stagePos.x, stageY: stagePos.y }
      return
    }
    if (activeTool === 'zona' && isOnStage) {
      const pt = getStagePoint(e)
      setDrawing(true); setDrawState({ startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y }); return
    }
    if (activeTool === 'poi' && isOnStage) {
      const pt = getStagePoint(e); setClickPoint(pt); poiForm.resetFields(); poiForm.setFieldsValue({ type: 'BAR' }); setPoiModal(true); return
    }
    if (activeTool === 'texto' && isOnStage) {
      const pt = getStagePoint(e); setClickPoint(pt); textoForm.resetFields(); setTextoModal(true); return
    }
    if (activeTool === 'select' && isOnStage) setSelectedId(null)
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const nativeEvt = e.evt
    if (isPanning.current) {
      setStagePos({ x: panStart.current.stageX + nativeEvt.clientX - panStart.current.x, y: panStart.current.stageY + nativeEvt.clientY - panStart.current.y })
      return
    }
    if (drawing && drawState) {
      const pt = getStagePoint(e)
      setDrawState(d => d ? { ...d, currentX: pt.x, currentY: pt.y } : d)
    }
  }

  const handleStageMouseUp = () => {
    if (isPanning.current) { isPanning.current = false; return }
    if (drawing && drawState) {
      setDrawing(false)
      const x = Math.min(drawState.startX, drawState.currentX)
      const y = Math.min(drawState.startY, drawState.currentY)
      const w = Math.abs(drawState.currentX - drawState.startX)
      const h = Math.abs(drawState.currentY - drawState.startY)
      setDrawState(null)
      if (w > 20 && h > 20) {
        setPendingZone({ x, y, width: w, height: h }); form.resetFields()
        form.setFieldsValue({ type: 'OTRO', capacity: 50, tables: 0 }); setNewZoneModal(true)
      }
    }
  }

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const scaleBy = 1.08
    const stage = e.target.getStage()!
    const pointer = stage.getPointerPosition()!
    const oldScale = stageScale
    const newScale = Math.max(0.2, Math.min(4, e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy))
    const mousePointTo = { x: (pointer.x - stagePos.x) / oldScale, y: (pointer.y - stagePos.y) / oldScale }
    setStageScale(newScale)
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale })
  }

  const handleCreateZone = (vals: any) => {
    if (!pendingZone) return
    const newZone: Zone = {
      id: `z-${Date.now()}`, type: vals.type,
      name: vals.name || ZONE_CONFIGS[vals.type as ZoneType].label,
      x: pendingZone.x!, y: pendingZone.y!, width: pendingZone.width!, height: pendingZone.height!,
      capacity: vals.capacity ?? 50, tables: vals.tables ?? 0,
      lighting: '', sound: '', supplier: '',
    }
    update({ zones: [...store.zones, newZone] }); setNewZoneModal(false); setPendingZone(null)
    setActiveTool('select'); setSelectedId(newZone.id); message.success('Zona creada')
  }

  const handleCreatePoi = (vals: any) => {
    if (!clickPoint) return
    const newZone: Zone = {
      id: `poi-${Date.now()}`, type: vals.type as ZoneType,
      name: vals.name || ZONE_CONFIGS[vals.type as ZoneType].label,
      x: clickPoint.x - 40, y: clickPoint.y - 40, width: 80, height: 80,
      capacity: 0, tables: 0, lighting: '', sound: '', supplier: '', shape: 'circle',
    }
    update({ zones: [...store.zones, newZone] }); setPoiModal(false); setClickPoint(null)
    setActiveTool('select'); setSelectedId(newZone.id); message.success('POI creado')
  }

  const handleCreateTexto = (vals: any) => {
    if (!clickPoint) return
    const newZone: Zone = {
      id: `txt-${Date.now()}`, type: 'OTRO', name: vals.texto || 'Texto',
      x: clickPoint.x, y: clickPoint.y, width: 160, height: 36,
      capacity: 0, tables: 0, lighting: '', sound: '', supplier: '', shape: 'text',
    }
    update({ zones: [...store.zones, newZone] }); setTextoModal(false); setClickPoint(null)
    setActiveTool('select'); setSelectedId(newZone.id); message.success('Etiqueta creada')
  }

  const loadTemplate = (name: string) => {
    const zones = TEMPLATES[name]
    if (!zones) return
    update({ zones }); setSelectedId(null); message.success(`Plantilla "${name}" cargada`)
  }

  const toggleStatus = () => {
    const next: MapStatus = store.status === 'BORRADOR' ? 'APROBADO' : 'BORRADOR'
    update({ status: next })
    message.success(next === 'APROBADO' ? 'Mapa aprobado ✓' : 'Mapa regresado a borrador')
  }

  // ── Export PDF (cenital canvas → print) ──────────────────────────────────────
  const handleExportPDF = () => {
    if (activeTab !== 'cenital') { message.info('Cambia a la vista Cenital para exportar el mapa'); return }
    if (!stageRef.current) return
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 })
    const venueName = store.venueName || event?.name || 'Venue'
    const win = window.open('', '_blank')
    if (!win) { message.warning('Permite ventanas emergentes para exportar'); return }
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Mapa · ${venueName}</title>
      <style>
        body{margin:0;font-family:sans-serif;background:#fff}
        .header{padding:20px 24px 12px;border-bottom:2px solid #EDE9FE}
        h1{margin:0 0 4px;font-size:20px;color:#1a1a1a}
        p{margin:0;font-size:12px;color:#888}
        img{display:block;max-width:100%;height:auto;margin:24px auto}
        @media print{.noprint{display:none}body{margin:0}img{width:100%;max-width:none}}
      </style></head><body>
      <div class="header">
        <h1>Mapa del evento · ${venueName}</h1>
        <p>${store.zones.length} zonas · ${store.zones.reduce((s,z)=>s+z.tables,0)} mesas · ${store.zones.reduce((s,z)=>s+z.capacity,0)} pax · ${new Date().toLocaleDateString('es-MX')}</p>
      </div>
      <img src="${dataUrl}" />
      <div class="noprint" style="text-align:center;padding:16px">
        <button onclick="window.print()" style="background:#7C3AED;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer">Imprimir / Guardar PDF</button>
      </div>
    </body></html>`)
    win.document.close()
  }

  // ── Import JSON ───────────────────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.zones && Array.isArray(data.zones)) {
          update({
            zones: data.zones,
            seating: data.seating || {},
            waypoints: data.waypoints || [],
            staff: data.staff || [],
            venueName: data.venueName || store.venueName,
            status: data.status || 'BORRADOR',
          })
          message.success(`Mapa importado: ${data.zones.length} zonas`)
        } else {
          message.error('Formato no válido — el archivo debe ser un mapa exportado de IventIA')
        }
      } catch {
        message.error('No se pudo leer el archivo JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Share (copy JSON) ─────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(store, null, 2))
      message.success('Datos del mapa copiados al portapapeles')
    } catch {
      message.error('No se pudo copiar — usa un navegador moderno')
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalTables = store.zones.reduce((s, z) => s + z.tables, 0)
  const totalPax = store.zones.reduce((s, z) => s + z.capacity, 0)
  const venueName = store.venueName || event?.name || 'Venue'

  // ── Grid dots ─────────────────────────────────────────────────────────────────
  const GRID_SPACING = 20
  const gridDots = () => {
    const dots: JSX.Element[] = []
    const startX = Math.floor(-stagePos.x / stageScale / GRID_SPACING) * GRID_SPACING - GRID_SPACING
    const startY = Math.floor(-stagePos.y / stageScale / GRID_SPACING) * GRID_SPACING - GRID_SPACING
    const endX = startX + canvasSize.width / stageScale + GRID_SPACING * 2
    const endY = startY + canvasSize.height / stageScale + GRID_SPACING * 2
    let i = 0
    for (let x = startX; x <= endX; x += GRID_SPACING)
      for (let y = startY; y <= endY; y += GRID_SPACING)
        dots.push(<Circle key={`d-${i++}`} x={x} y={y} radius={1.2} fill="#D1D5DB" listening={false} />)
    return dots
  }

  // ── Zone rendering ────────────────────────────────────────────────────────────
  const renderZone = (zone: Zone) => {
    const cfg = ZONE_CONFIGS[zone.type]
    const color = zone.colorOverride || cfg.color
    const isSelected = selectedId === zone.id

    const commonGroupProps = {
      key: zone.id, x: zone.x, y: zone.y,
      draggable: activeTool === 'select',
      ref: (node: Konva.Group | null) => { if (node) shapeRefs.current[zone.id] = node },
      onClick: () => { if (activeTool === 'select') setSelectedId(zone.id) },
      onTap: () => { if (activeTool === 'select') setSelectedId(zone.id) },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => updateZone(zone.id, { x: e.target.x(), y: e.target.y() }),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target
        const scaleX = node.scaleX(), scaleY = node.scaleY()
        node.scaleX(1); node.scaleY(1)
        updateZone(zone.id, { x: node.x(), y: node.y(), width: Math.max(40, zone.width * scaleX), height: Math.max(30, zone.height * scaleY) })
      },
    }

    if (zone.shape === 'circle') {
      const r = Math.min(zone.width, zone.height) / 2
      return (
        <Group {...commonGroupProps}>
          <Circle radius={r} fill={color} opacity={0.85} stroke={isSelected ? '#2563EB' : color} strokeWidth={isSelected ? 2.5 : 0} />
          <Text text={cfg.icon} fontSize={18} x={-10} y={-20} listening={false} />
          <Text text={zone.name} fontSize={10} fill="#fff" fontStyle="bold" align="center" width={r * 2} x={-r} y={4} listening={false} />
        </Group>
      )
    }

    if (zone.shape === 'text') {
      return (
        <Group {...commonGroupProps}>
          <Rect width={zone.width} height={zone.height} fill={isSelected ? '#EDE9FE' : 'transparent'} stroke={isSelected ? '#7C3AED' : 'transparent'} strokeWidth={1} dash={[4, 3]} cornerRadius={4} />
          <Text text={zone.name} fontSize={14} fontStyle="bold" fill="#1a1a1a" width={zone.width} height={zone.height} align="center" verticalAlign="middle" listening={false} />
        </Group>
      )
    }

    const tables: JSX.Element[] = []
    if (layers.mesas && zone.tables > 0) {
      tablePositions(zone).forEach((pos, idx) => {
        tables.push(
          <Group key={`t-${idx}`} x={pos.tx} y={pos.ty} listening={false}>
            <Circle radius={14} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1.5} />
            <Text text={`M${idx + 1}`} fontSize={8} fill="#92400E" fontStyle="bold" align="center" verticalAlign="middle" width={28} height={28} x={-14} y={-14} listening={false} />
          </Group>
        )
      })
    }

    return (
      <Group {...commonGroupProps}>
        <Rect width={zone.width} height={zone.height} fill={color} opacity={0.15} stroke={isSelected ? '#2563EB' : color} strokeWidth={isSelected ? 2 : 1.5} dash={isSelected ? [6, 3] : undefined} cornerRadius={6} />
        <Text text={cfg.label} x={10} y={10} fontSize={9} fill={color} fontStyle="bold" letterSpacing={1} listening={false} />
        <Text text={zone.name} x={10} y={24} fontSize={12} fill="#1a1a1a" fontStyle="bold" width={zone.width - 20} listening={false} />
        <Text text={cfg.icon} x={zone.width - 30} y={8} fontSize={16} listening={false} />
        {tables}
        {layers.poi && POI_TYPES.includes(zone.type) && (
          <Group x={zone.width / 2} y={zone.height / 2} listening={false}>
            <Circle radius={12} fill={color} opacity={0.8} />
            <Text text="📍" fontSize={12} x={-8} y={-8} listening={false} />
          </Group>
        )}
      </Group>
    )
  }

  const drawPreview = drawState && drawing ? (
    <Rect x={Math.min(drawState.startX, drawState.currentX)} y={Math.min(drawState.startY, drawState.currentY)}
      width={Math.abs(drawState.currentX - drawState.startX)} height={Math.abs(drawState.currentY - drawState.startY)}
      fill="#7C3AED" opacity={0.12} stroke="#7C3AED" strokeWidth={1.5} dash={[5, 3]} listening={false} />
  ) : null

  // ── Sidebar styles ────────────────────────────────────────────────────────────
  const sidebarCard = { background: '#fff', borderRadius: 10, border: '1px solid #EDE9FE', overflow: 'hidden' as const, marginBottom: 10 }
  const sidebarTitle = { fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.12em', padding: '8px 12px 4px', borderBottom: '1px solid #F3F4F6' }
  const toolButton = (tool: Tool, icon: string, label: string) => (
    <div key={tool} onClick={() => setActiveTool(tool)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer',
      background: activeTool === tool ? '#EDE9FE' : 'transparent',
      borderLeft: activeTool === tool ? '3px solid #7C3AED' : '3px solid transparent',
      transition: 'all 0.15s', userSelect: 'none' as const,
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12, color: activeTool === tool ? '#7C3AED' : '#374151', fontWeight: activeTool === tool ? 600 : 400 }}>{label}</span>
    </div>
  )
  const propSection = (title: string) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.12em', padding: '10px 14px 4px', borderBottom: '1px solid #F3F4F6' }}>{title}</div>
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
      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />

      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EDE9FE', padding: '14px 24px 0', flexShrink: 0, boxShadow: '0 1px 4px rgba(124,58,237,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AntText style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>Mapa del evento</AntText>
              <span style={{
                background: store.status === 'APROBADO' ? '#ECFDF5' : '#F3F4F6',
                color: store.status === 'APROBADO' ? '#059669' : '#6B7280',
                fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              }}>{store.status}</span>
            </div>
            <AntText style={{ fontSize: 12, color: '#aaa' }}>
              {venueName} · {store.zones.length} zonas · {totalTables} mesas · {totalPax} pax
            </AntText>
          </div>

          <Space>
            <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>
              Exportar PDF
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => importRef.current?.click()}>
              Importar plano
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              Compartir
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={toggleStatus}
              style={{
                background: store.status === 'APROBADO' ? '#059669' : '#7C3AED',
                borderColor: store.status === 'APROBADO' ? '#059669' : '#7C3AED',
                borderRadius: 8, fontWeight: 600,
              }}>
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
            <div key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 16px', cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? '#7C3AED' : '#6B7280',
              borderBottom: activeTab === tab.key ? '2px solid #7C3AED' : '2px solid transparent',
              transition: 'all 0.15s', userSelect: 'none',
            }}>{tab.label}</div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── CENITAL TAB ── */}
        {activeTab === 'cenital' && (
          <>
            {/* Left sidebar */}
            <div style={{ width: 170, flexShrink: 0, background: '#FAFAFA', borderRight: '1px solid #EDE9FE', overflowY: 'auto', padding: '10px 8px' }}>
              <div style={sidebarCard}>
                <div style={sidebarTitle}>EDICIÓN</div>
                {toolButton('select', '↖', 'Seleccionar')}
                {toolButton('move', '✋', 'Mover')}
                {toolButton('zona', '▭', 'Zona')}
                {toolButton('poi', '📍', 'POI')}
                {toolButton('texto', 'T', 'Texto')}
              </div>
              <div style={sidebarCard}>
                <div style={sidebarTitle}>PLANTILLAS</div>
                {Object.keys(TEMPLATES).map(name => (
                  <div key={name} onClick={() => loadTemplate(name)} style={{ padding: '8px 12px', fontSize: 12, color: '#374151', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#EDE9FE'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    {name}
                  </div>
                ))}
              </div>
              <div style={sidebarCard}>
                <div style={sidebarTitle}>CAPAS</div>
                {([
                  { key: 'zonas', label: 'Zonas', color: '#7C3AED' },
                  { key: 'mesas', label: 'Mesas', color: '#F59E0B' },
                  { key: 'poi', label: 'POI - servicios', color: '#3B82F6' },
                  { key: 'recorrido', label: 'Recorrido', color: '#9CA3AF' },
                  { key: 'cotas', label: 'Cotas y medidas', color: '#9CA3AF' },
                ] as { key: keyof Layers; label: string; color: string }[]).map(layer => (
                  <div key={layer.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>{layer.label}</span>
                    <Switch size="small" checked={layers[layer.key]}
                      onChange={val => setLayers(l => ({ ...l, [layer.key]: val }))}
                      style={{ background: layers[layer.key] ? layer.color : undefined }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div ref={containerRef} style={{ flex: 1, background: '#F0EFF6', position: 'relative', overflow: 'hidden', cursor: activeTool === 'zona' ? 'crosshair' : activeTool === 'move' ? 'grab' : 'default' }}>
              <Stage ref={stageRef} width={canvasSize.width} height={canvasSize.height}
                x={stagePos.x} y={stagePos.y} scaleX={stageScale} scaleY={stageScale}
                onMouseDown={handleStageMouseDown} onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp} onWheel={handleWheel}>
                <Layer listening={false}>
                  <Rect x={-stagePos.x / stageScale - 20} y={-stagePos.y / stageScale - 20}
                    width={canvasSize.width / stageScale + 40} height={canvasSize.height / stageScale + 40}
                    fill="#ffffff" listening={false} />
                  {gridDots()}
                </Layer>
                <Layer>
                  {layers.zonas && store.zones.map(zone => renderZone(zone))}
                  {drawPreview}
                  <Transformer ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => (newBox.width < 60 || newBox.height < 40) ? oldBox : newBox}
                    rotateEnabled={false} borderStroke="#2563EB" borderDash={[4, 2]}
                    anchorSize={8} anchorStroke="#2563EB" anchorFill="#fff" />
                </Layer>
                <Layer listening={false}>
                  <Rect x={-stagePos.x / stageScale} y={-stagePos.y / stageScale}
                    width={canvasSize.width / stageScale} height={30} fill="#1a1a2e" opacity={0.85} />
                  <Text x={-stagePos.x / stageScale + 12} y={-stagePos.y / stageScale + 8}
                    text={`CENITAL · 1:120 · ${store.zones.length} zonas`}
                    fontSize={11} fill="#E5E7EB" fontStyle="bold" letterSpacing={1} />
                </Layer>
              </Stage>
              {store.zones.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Sin zonas en el mapa</div>
                  <div style={{ fontSize: 13, color: '#9CA3AF' }}>Selecciona una plantilla o usa la herramienta Zona para comenzar</div>
                </div>
              )}
            </div>

            {/* Right panel */}
            {selectedZone && (
              <div style={{ width: 220, flexShrink: 0, background: '#fff', borderLeft: '1px solid #EDE9FE', overflowY: 'auto', fontSize: 12 }}>
                {propSection('IDENTIDAD')}
                {propRow('Nombre', <Input size="small" value={selectedZone.name} onChange={e => updateZone(selectedZone.id, { name: e.target.value })} />)}
                {propRow('Tipo', (
                  <Select size="small" value={selectedZone.type} style={{ width: '100%' }} onChange={val => updateZone(selectedZone.id, { type: val })}>
                    {Object.entries(ZONE_CONFIGS).map(([k, v]) => <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>)}
                  </Select>
                ))}
                {propRow('Color', (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    {COLOR_SWATCHES.map(c => (
                      <div key={c} onClick={() => updateZone(selectedZone.id, { colorOverride: c })}
                        style={{ width: 22, height: 22, borderRadius: 4, background: c, cursor: 'pointer', border: (selectedZone.colorOverride ?? ZONE_CONFIGS[selectedZone.type].color) === c ? '2px solid #1a1a1a' : '2px solid transparent', transition: 'border 0.1s' }} />
                    ))}
                    {selectedZone.colorOverride && (
                      <div onClick={() => updateZone(selectedZone.id, { colorOverride: undefined })}
                        style={{ width: 22, height: 22, borderRadius: 4, background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6B7280', border: '1px solid #E5E7EB' }}
                        title="Restaurar color">✕</div>
                    )}
                  </div>
                ))}
                {propSection('DIMENSIONES')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {[['X', 'x'], ['Y', 'y'], ['Ancho', 'width'], ['Alto', 'height']].map(([label, key]) => (
                    <div key={key} style={{ padding: '6px 8px 6px 14px' }}>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{label}</div>
                      <InputNumber size="small" value={Math.round((selectedZone as any)[key])} style={{ width: '100%' }}
                        suffix={key === 'width' || key === 'height' ? 'cm' : undefined}
                        onChange={val => val != null && updateZone(selectedZone.id, { [key]: Math.max(key === 'width' ? 60 : key === 'height' ? 40 : -9999, val) })} />
                    </div>
                  ))}
                </div>
                {propSection('CAPACIDAD Y USO')}
                {propRow('Pax estimado', <InputNumber size="small" value={selectedZone.capacity} min={0} style={{ width: '100%' }} onChange={val => val != null && updateZone(selectedZone.id, { capacity: val })} />)}
                {propRow('Mesas', <InputNumber size="small" value={selectedZone.tables} min={0} style={{ width: '100%' }} onChange={val => val != null && updateZone(selectedZone.id, { tables: val })} />)}
                {propRow('Iluminación', <Input size="small" value={selectedZone.lighting} placeholder="Ej: LED RGB" onChange={e => updateZone(selectedZone.id, { lighting: e.target.value })} />)}
                {propRow('Sonido', <Input size="small" value={selectedZone.sound} placeholder="Ej: Sistema PA" onChange={e => updateZone(selectedZone.id, { sound: e.target.value })} />)}
                {propSection('PROVEEDOR RESPONSABLE')}
                <div style={{ padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {selectedZone.supplier ? selectedZone.supplier.slice(0, 2).toUpperCase() : '??'}
                    </div>
                    <Input size="small" value={selectedZone.supplier} placeholder="Nombre del proveedor" onChange={e => updateZone(selectedZone.id, { supplier: e.target.value })} />
                  </div>
                </div>
                {propSection(`TAREAS ASIGNADAS${selectedZone.taskIds?.length ? ` · ${selectedZone.taskIds.length}` : ''}`)}
                <div style={{ padding: '6px 14px 10px', maxHeight: 200, overflowY: 'auto' }}>
                  {allTasks.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>Sin tareas en este evento</div>
                  ) : allTasks.map((task: any) => {
                    const assigned = (selectedZone.taskIds ?? []).includes(task.id)
                    const dotColor = task.status === 'LISTA' ? '#059669' : task.status === 'EN_CURSO' ? '#F97316' : task.status === 'ESPERANDO_OK' ? '#D97706' : '#9CA3AF'
                    return (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0', borderBottom: '1px solid #F9F8FF', cursor: 'pointer' }}
                        onClick={() => {
                          const current = selectedZone.taskIds ?? []
                          updateZone(selectedZone.id, { taskIds: assigned ? current.filter((id: string) => id !== task.id) : [...current, task.id] })
                        }}>
                        <Checkbox checked={assigned} style={{ marginTop: 1, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>{task.code}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#1a1a1a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding: '6px 14px 14px' }}>
                  <Popconfirm title="¿Eliminar esta zona?" onConfirm={() => { update({ zones: store.zones.filter(z => z.id !== selectedZone.id) }); setSelectedId(null); message.success('Zona eliminada') }} okButtonProps={{ danger: true }} okText="Eliminar">
                    <Button danger size="small" style={{ width: '100%' }}>Eliminar zona</Button>
                  </Popconfirm>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'seating' && <SeatingChartTab store={store} update={update} />}
        {activeTab === 'recorrido' && <RecorridoTab store={store} update={update} />}
        {activeTab === 'logistica' && <LogisticaTab store={store} update={update} />}
      </div>

      {/* ── POI modal ── */}
      <Modal title="Nuevo marcador POI" open={poiModal} onCancel={() => { setPoiModal(false); setClickPoint(null) }} onOk={() => poiForm.submit()} okText="Crear POI" okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }} destroyOnClose width={360}>
        <Form form={poiForm} layout="vertical" onFinish={handleCreatePoi}>
          <Form.Item name="name" label="Nombre"><Input placeholder="Ej: Barra principal, Baños..." autoFocus /></Form.Item>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select>{POI_TYPES.map(t => <Select.Option key={t} value={t}>{ZONE_CONFIGS[t].icon} {ZONE_CONFIGS[t].label}</Select.Option>)}</Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Texto modal ── */}
      <Modal title="Nueva etiqueta de texto" open={textoModal} onCancel={() => { setTextoModal(false); setClickPoint(null) }} onOk={() => textoForm.submit()} okText="Crear etiqueta" okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }} destroyOnClose width={360}>
        <Form form={textoForm} layout="vertical" onFinish={handleCreateTexto}>
          <Form.Item name="texto" label="Texto" rules={[{ required: true, message: 'Escribe el texto' }]}>
            <Input placeholder="Ej: Norte, Acceso principal..." autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── New zone modal ── */}
      <Modal title="Nueva zona" open={newZoneModal} onCancel={() => { setNewZoneModal(false); setPendingZone(null) }} onOk={() => form.submit()} okText="Crear zona" okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }} destroyOnClose width={420}>
        <Form form={form} layout="vertical" onFinish={handleCreateZone}>
          <Form.Item name="name" label="Nombre de la zona"><Input placeholder="Ej: Jardín principal..." autoFocus /></Form.Item>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select>{Object.entries(ZONE_CONFIGS).map(([k, v]) => <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>)}</Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="capacity" label="Capacidad (pax)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="tables" label="Mesas"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
