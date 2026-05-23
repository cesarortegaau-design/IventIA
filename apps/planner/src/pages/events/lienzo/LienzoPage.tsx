// v2
import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useOutletContext, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Tooltip, Typography, Tag, Avatar, Checkbox, Divider,
  Input, Switch, InputNumber, Modal, Spin, Alert, App, Upload,
  Form, Select, DatePicker,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  SelectOutlined, DragOutlined, AppstoreAddOutlined, FileTextOutlined,
  FontSizeOutlined, PictureOutlined, PlusOutlined, MinusOutlined,
  CloseOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  UploadOutlined, SearchOutlined, DeleteOutlined, FilePdfOutlined,
  EyeOutlined, BarChartOutlined, CalendarOutlined, DollarOutlined,
  PrinterOutlined, LinkOutlined, YoutubeOutlined, EditOutlined,
  AuditOutlined, ClockCircleOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../../api/events'
import { usePlannerStore } from '../../../hooks/usePlannerStore'
import { resourcesApi } from '../../../api/resources'
import { ordersApi } from '../../../api/orders'
import { suppliersApi } from '../../../api/suppliers'
import { DEFAULT_BRANDING } from '../EstudioPage'
import type { EventBranding } from '../EstudioPage'

const { Text, Title } = Typography

// ── Font map (mirrors EstudioPage) ────────────────────────────────────────────
const fontHeadingMap: Record<string, string> = {
  modern:  "'Plus Jakarta Sans', sans-serif",
  classic: 'Georgia, serif',
  elegant: "'Didact Gothic', sans-serif",
  bold:    "'Montserrat', sans-serif",
  playful: 'cursive',
}

// ── Types ──────────────────────────────────────────────────────────────────────
type WidgetType = 'portada' | 'tareas' | 'proveedores' | 'nota' | 'texto' | 'imagen' | 'pdf' | 'resumen' | 'timeline' | 'links' | 'presupuesto' | 'contrato'

interface Widget {
  id: string
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  config: Record<string, any>
}

type Tool = 'select' | 'pan' | 'widget' | 'nota' | 'texto' | 'imagen' | 'draw' | 'arrow'

interface StrokePoint { x: number; y: number }
interface Stroke { id: string; points: StrokePoint[]; color: string; width: number; isArrow?: boolean }

// ── Initial widgets ────────────────────────────────────────────────────────────
const makeDefaultWidgets = (): Widget[] => [
  { id: 'w1', type: 'portada',     x: 24,  y: 20,  w: 420, h: 200, config: { showHeader: true, shadow: true, padding: 14, color: '#7C3AED' } },
  { id: 'w2', type: 'tareas',      x: 24,  y: 244, w: 380, h: 280, config: { title: 'Tareas urgentes' } },
  { id: 'w3', type: 'proveedores', x: 424, y: 244, w: 300, h: 280, config: { title: 'Proveedores activos' } },
]

// ── Widget renderers ───────────────────────────────────────────────────────────
function PortadaWidget({ event, eventId }: { event: any; eventId: string }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editOpen, setEditOpen] = useState(false)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { store: branding } = usePlannerStore<EventBranding>(
    eventId, 'branding', { ...DEFAULT_BRANDING }, `iventia-branding-${eventId}`,
  )

  const hasBanner = branding.coverStyle === 'image' && !!branding.bannerUrl
  const font = fontHeadingMap[branding.fontStyle] || fontHeadingMap.modern

  const bg = hasBanner
    ? undefined
    : branding.coverStyle === 'gradient'
      ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
      : branding.coverStyle === 'split'
        ? `linear-gradient(90deg, ${branding.primaryColor} 50%, ${branding.secondaryColor} 50%)`
        : branding.coverStyle === 'dark'
          ? '#0D0D1A'
          : branding.primaryColor

  const textColor = (hasBanner || branding.coverStyle === 'dark') ? '#ffffff' : (branding.textOnBg || '#ffffff')
  const muted = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)'

  const daysUntil = event?.eventStart
    ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day'))
    : null

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden',
      background: bg,
      padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      color: textColor, userSelect: 'none', position: 'relative',
      ...(hasBanner ? {
        backgroundImage: `url(${branding.bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}),
    }}>
      {/* Dark overlay for banner */}
      {hasBanner && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.7) 100%)' }} />
      )}
      {/* Accent top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: branding.accentColor }} />
      {/* Edit button */}
      <Button
        size="small"
        icon={<EditOutlined />}
        style={{ position: 'absolute', top: 10, right: 10, opacity: 0.7 }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          form.setFieldsValue({
            name: event?.name,
            eventType: event?.eventType,
            venueLocation: event?.venueLocation,
            eventStart: event?.eventStart ? dayjs(event.eventStart) : null,
            eventEnd: event?.eventEnd ? dayjs(event.eventEnd) : null,
            expectedAttendance: event?.expectedAttendance,
            description: event?.description,
          })
          setEditOpen(true)
        }}
      />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: '0.06em', marginBottom: 6 }}>
          {event?.eventType || 'EVENTO'} · {event?.code || '—'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4, fontFamily: font }}>
          {event?.name || 'Sin nombre'}
        </div>
        {branding.tagline && (
          <div style={{ fontSize: 12, color: muted, fontStyle: 'italic', marginBottom: 4 }}>"{branding.tagline}"</div>
        )}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: muted }}>
          {event?.venueLocation && <span>📍 {event.venueLocation}</span>}
          {event?.eventStart && <span>📅 {dayjs(event.eventStart).format('D MMM YYYY')}</span>}
        </div>
      </div>
      {daysUntil !== null && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>FALTAN</div>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, fontFamily: font }}>{daysUntil}</div>
            <div style={{ fontSize: 13, color: muted }}>días para el evento</div>
          </div>
          <div style={{ textAlign: 'right', color: muted }}>
            <div style={{ fontSize: 11 }}>Asistentes</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {event?.expectedAttendance ? `0/${event.expectedAttendance}` : '—'}
            </div>
          </div>
        </div>
      )}
      {/* Edit modal */}
      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        title="Editar evento"
        footer={null}
        width={560}
      >
        <div onMouseDown={(e) => e.stopPropagation()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (vals) => {
            setSaving(true)
            try {
              const data = {
                ...vals,
                eventStart: vals.eventStart ? vals.eventStart.toISOString() : undefined,
                eventEnd: vals.eventEnd ? vals.eventEnd.toISOString() : undefined,
              }
              await eventsApi.update(eventId, data)
              qc.invalidateQueries({ queryKey: ['planner-event', eventId] })
              qc.invalidateQueries({ queryKey: ['planner-event-header', eventId] })
              message.success('Evento actualizado')
              setEditOpen(false)
            } catch {
              message.error('Error al guardar')
            } finally {
              setSaving(false)
            }
          }}
        >
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input onMouseDown={(e) => e.stopPropagation()} />
          </Form.Item>
          <Form.Item name="eventType" label="Tipo de evento">
            <Select
              onMouseDown={(e) => e.stopPropagation()}
              options={[
                { value: 'WEDDING', label: 'Boda' },
                { value: 'CORPORATE', label: 'Corporativo' },
                { value: 'BIRTHDAY', label: 'Cumpleaños' },
                { value: 'GALA', label: 'Gala' },
                { value: 'CONFERENCE', label: 'Congreso' },
                { value: 'CONCERT', label: 'Concierto' },
                { value: 'EXHIBITION', label: 'Exposición' },
                { value: 'OTHER', label: 'Otro' },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item name="venueLocation" label="Venue / Ubicación">
            <Input onMouseDown={(e) => e.stopPropagation()} />
          </Form.Item>
          <Form.Item name="eventStart" label="Inicio del evento">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} onMouseDown={(e) => e.stopPropagation()} />
          </Form.Item>
          <Form.Item name="eventEnd" label="Fin del evento">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} onMouseDown={(e) => e.stopPropagation()} />
          </Form.Item>
          <Form.Item name="expectedAttendance" label="Asistentes esperados">
            <InputNumber min={1} style={{ width: '100%' }} onMouseDown={(e) => e.stopPropagation()} />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={2} onMouseDown={(e) => e.stopPropagation()} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving} style={{ background: 'var(--pl-primary)', border: 'none' }}>
              Guardar
            </Button>
          </div>
        </Form>
        </div>
      </Modal>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  POR_HACER: 'Por hacer',
  EN_CURSO: 'En curso',
  ESPERANDO_OK: 'Esperando OK',
  LISTA: 'Lista',
}
const STATUS_COLORS: Record<string, string> = {
  POR_HACER: '#6B7280',
  EN_CURSO: '#2563EB',
  ESPERANDO_OK: '#F97316',
  LISTA: '#059669',
}

function TareasWidget({ eventId }: { eventId: string }) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null)

  const { store: tareasStore } = usePlannerStore<{ tasks: any[] }>(
    eventId, 'tareas', { tasks: [] }, `iventia-tareas-${eventId}`,
  )
  const allTasks = tareasStore.tasks ?? []
  const urgentTasks = allTasks
    .filter((t: any) => t.status !== 'LISTA')
    .sort((a: any, b: any) => {
      if (a.dueDate && b.dueDate) return dayjs(a.dueDate).diff(dayjs(b.dueDate))
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
    .slice(0, 6)

  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
          <Text strong style={{ fontSize: 13 }}>TAREAS URGENTES</Text>
        </div>
        <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: 'var(--pl-primary)' }} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {urgentTasks.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>
            Sin tareas pendientes
          </div>
        ) : urgentTasks.map((task: any) => {
          const daysUntil = task.dueDate ? dayjs(task.dueDate).diff(dayjs(), 'day') : null
          return (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{task.title}</div>
                {task.assignedTo && (
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{task.assignedTo}</div>
                )}
              </div>
              {daysUntil !== null && (
                <Tag style={{
                  background: daysUntil <= 2 ? '#FEF2F2' : daysUntil <= 4 ? '#FFF7ED' : '#F0F9FF',
                  color: daysUntil <= 2 ? '#DC2626' : daysUntil <= 4 ? '#D97706' : '#2563EB',
                  border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600,
                }}>{daysUntil}d</Tag>
              )}
            </div>
          )
        })}
      </div>
      <Modal
        open={!!selectedTask}
        onCancel={() => setSelectedTask(null)}
        footer={null}
        title="Detalle de tarea"
      >
        {selectedTask && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
              {selectedTask.title}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Tag style={{
                background: (STATUS_COLORS[selectedTask.status] || '#6B7280') + '18',
                color: STATUS_COLORS[selectedTask.status] || '#6B7280',
                border: 'none', borderRadius: 20,
              }}>
                {STATUS_LABELS[selectedTask.status] || selectedTask.status}
              </Tag>
              {selectedTask.priority && (
                <Tag color={selectedTask.priority === 'ALTA' ? 'red' : selectedTask.priority === 'MEDIA' ? 'orange' : 'blue'}>
                  {selectedTask.priority === 'ALTA' ? 'Alta' : selectedTask.priority === 'MEDIA' ? 'Media' : 'Baja'}
                </Tag>
              )}
            </div>
            {selectedTask.dueDate && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Fecha límite: </span>
                <span style={{ fontSize: 13 }}>{dayjs(selectedTask.dueDate).format('D MMM YYYY')}</span>
              </div>
            )}
            {selectedTask.assignedTo && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Asignado a: </span>
                <span style={{ fontSize: 13 }}>{selectedTask.assignedTo}</span>
              </div>
            )}
            {selectedTask.description && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                {selectedTask.description}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

const SUPPLIER_CATEGORY_OPTIONS: Record<string, string> = {
  CATERING: 'Catering',
  DECORATION: 'Decoración',
  PHOTOGRAPHY: 'Fotografía',
  MUSIC: 'Música / DJ',
  TRANSPORT: 'Transporte',
  VENUE: 'Espacio / Salón',
  AUDIO_VIDEO: 'Audio y Video',
  FLOWERS: 'Flores',
  OTHER: 'Otro',
}

function ProveedoresWidget({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const { store: suppStore, update: updateSuppStore } = usePlannerStore<{ suppliers: any[] }>(
    eventId, 'suppliers', { suppliers: [] }, `iventia-event-suppliers-${eventId}`,
  )
  const eventSuppliers = Array.isArray(suppStore) ? (suppStore as unknown as any[]) : (suppStore.suppliers ?? [])
  const [addOpen, setAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  function saveSuppliers(list: any[]) {
    updateSuppStore({ suppliers: list })
  }

  function removeSupplier(supplierId: string) {
    saveSuppliers(eventSuppliers.filter((s) => s.id !== supplierId))
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const result = await suppliersApi.list({ search: searchQuery, pageSize: 20 })
      setSearchResults(result.data || result || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function addSupplier(s: any) {
    if (eventSuppliers.find((es) => es.id === s.id)) return
    saveSuppliers([...eventSuppliers, {
      id: s.id,
      name: s.companyName || s.name,
      category: s.category,
      contactName: s.contactName,
    }])
  }

  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 13, color: '#1a1a1a' }}>PROVEEDORES ACTIVOS</Text>
        <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: 'var(--pl-primary)' }}
          onClick={() => setAddOpen(true)} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {eventSuppliers.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>
            Sin proveedores asignados
          </div>
        ) : eventSuppliers.map((s) => {
          const initials = (s.name || '?').slice(0, 2).toUpperCase()
          const catLabel = SUPPLIER_CATEGORY_OPTIONS[s.category] || s.category || ''
          return (
            <div
              key={s.id}
              onClick={() => navigate('/proveedores/' + s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF',
                cursor: 'pointer',
              }}
            >
              <Avatar size={32} style={{ background: '#7C3AED', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {initials}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{catLabel}</div>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                style={{ color: '#9CA3AF', flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); removeSupplier(s.id) }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0EBFF',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: '#888' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block', marginRight: 4 }} />
          {eventSuppliers.length} proveedor{eventSuppliers.length !== 1 ? 'es' : ''}
        </Text>
      </div>

      {/* Add supplier modal */}
      <Modal
        open={addOpen}
        onCancel={() => { setAddOpen(false); setSearchQuery(''); setSearchResults([]) }}
        title="Agregar proveedor al evento"
        footer={null}
        width={520}
      >
        <div onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="Buscar proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleSearch}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ flex: 1 }}
          />
          <Button type="primary" onClick={handleSearch} loading={searching}
            style={{ background: 'var(--pl-primary)', border: 'none' }}>
            Buscar
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {searchResults.map((s: any) => {
            const already = eventSuppliers.some((es) => es.id === s.id)
            const catLabel = SUPPLIER_CATEGORY_OPTIONS[s.category] || s.category || ''
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, background: '#FAFAFA', border: '1px solid #E5E7EB',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.companyName || s.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{catLabel}</div>
                </div>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={already}
                  onClick={() => addSupplier(s)}
                  style={{ background: already ? undefined : 'var(--pl-primary)', border: 'none' }}
                >
                  {already ? 'Agregado' : 'Agregar'}
                </Button>
              </div>
            )
          })}
          {searchResults.length === 0 && searchQuery && !searching && (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '16px 0', fontSize: 13 }}>
              Sin resultados para "{searchQuery}"
            </div>
          )}
        </div>
        </div>
      </Modal>
    </div>
  )
}

function NotaWidget({ config, onConfigChange }: { config: any; onConfigChange: (patch: Record<string, any>) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(config.text || '')

  const handleSave = () => {
    onConfigChange({ text })
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{
        width: '100%', height: '100%', padding: 16, borderRadius: 12,
        background: config.color || '#FFF9C4', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>📝 Nota</div>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Escape') handleSave() }}
          onMouseDown={e => e.stopPropagation()}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            resize: 'none', outline: '1px dashed #bbb', outlineOffset: 4,
            fontSize: 13, color: '#333', lineHeight: 1.6,
            fontFamily: 'inherit', padding: 4, borderRadius: 4,
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%', height: '100%', padding: 16, borderRadius: 12,
        background: config.color || '#FFF9C4', userSelect: 'none', cursor: 'text',
      }}
      onDoubleClick={() => { setText(config.text || ''); setEditing(true) }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>📝 Nota</div>
      <div style={{ fontSize: 13, color: config.text ? '#333' : '#aaa', lineHeight: 1.6, fontStyle: config.text ? 'normal' : 'italic' }}>
        {config.text || 'Doble clic para editar...'}
      </div>
    </div>
  )
}

function TextoWidget({ config, onConfigChange }: { config: any; onConfigChange: (patch: Record<string, any>) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(config.text || '')

  const handleSave = () => {
    onConfigChange({ text })
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', alignItems: 'center' }}>
        <input
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') handleSave() }}
          onMouseDown={e => e.stopPropagation()}
          style={{
            width: '100%', border: 'none', background: 'transparent',
            outline: '1px dashed #bbb', outlineOffset: 4,
            fontSize: config.fontSize || 16,
            fontWeight: config.bold ? 700 : 400,
            color: config.color || '#1a1a1a',
            fontFamily: 'inherit', padding: '2px 6px', borderRadius: 4,
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{ width: '100%', height: '100%', padding: 12, display: 'flex', alignItems: 'center', userSelect: 'none', cursor: 'text' }}
      onDoubleClick={() => { setText(config.text || ''); setEditing(true) }}
    >
      <div style={{
        fontSize: config.fontSize || 16, fontWeight: config.bold ? 700 : 400,
        color: config.text ? (config.color || '#1a1a1a') : '#ccc',
        fontStyle: config.text ? 'normal' : 'italic',
      }}>
        {config.text || 'Doble clic para editar...'}
      </div>
    </div>
  )
}

// ── Image Search Modal (ported from Admin) ─────────────────────────────────────
function ImageSearchModal({
  open, onClose, onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
}) {
  const { message } = App.useApp()
  const [tab, setTab] = useState<'search' | 'url'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [unsplashKey, setUnsplashKey] = useState<string | null | undefined>(undefined)
  const [selected, setSelected] = useState<string | null>(null)
  const [pastedUrl, setPastedUrl] = useState('')

  if (open && unsplashKey === undefined) {
    resourcesApi.getSearchConfig()
      .then((cfg) => setUnsplashKey(cfg.unsplashKey))
      .catch(() => setUnsplashKey(null))
  }

  async function handleSearch() {
    if (!query.trim() || !unsplashKey) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ query: query.trim(), per_page: '12', orientation: 'landscape' }).toString()
      const resp = await fetch(`https://api.unsplash.com/search/photos?${qs}`, {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
      })
      const json = await resp.json()
      setResults(json.results ?? [])
    } catch {
      message.error('Error al buscar imágenes')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelected(null); setPastedUrl(''); setResults([]); setQuery(''); setUnsplashKey(undefined)
    onClose()
  }

  return (
    <Modal title="Buscar imagen" open={open} onCancel={handleClose} footer={null} width={680}
      styles={{ header: { borderBottom: '1px solid var(--pl-border)', paddingBottom: 12 } }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button type={tab === 'search' ? 'primary' : 'default'} icon={<SearchOutlined />}
          onClick={() => setTab('search')}
          style={tab === 'search' ? { background: 'var(--pl-primary)', borderColor: 'var(--pl-primary)' } : {}}>
          Buscar en Unsplash
        </Button>
        <Button type={tab === 'url' ? 'primary' : 'default'} onClick={() => setTab('url')}
          style={tab === 'url' ? { background: 'var(--pl-primary)', borderColor: 'var(--pl-primary)' } : {}}>
          Pegar URL
        </Button>
      </div>

      {tab === 'url' && (
        <div>
          <Input placeholder="https://ejemplo.com/imagen.jpg" value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)} style={{ marginBottom: 12, borderRadius: 10 }} />
          {pastedUrl && (
            <div style={{ marginBottom: 12 }}>
              <img src={pastedUrl} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} alt="" />
            </div>
          )}
          <Button type="primary" block disabled={!pastedUrl.trim()}
            onClick={() => { onSelect(pastedUrl.trim()); handleClose() }}
            style={{ background: 'var(--pl-primary)', borderColor: 'var(--pl-primary)', borderRadius: 10 }}>
            Usar esta imagen
          </Button>
        </div>
      )}

      {tab === 'search' && (
        <>
          <Input.Search
            placeholder="Ej: wedding venue, concert stage, corporate event..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSearch={handleSearch}
            enterButton={<Button type="primary"
              style={{ background: 'var(--pl-primary)', borderColor: 'var(--pl-primary)' }}
              loading={loading} disabled={!unsplashKey}>Buscar</Button>}
            style={{ marginBottom: 16 }}
          />

          {unsplashKey === null && (
            <Alert type="warning" showIcon style={{ marginBottom: 12, borderRadius: 10 }}
              message="UNSPLASH_ACCESS_KEY no configurada. Usa la pestaña 'Pegar URL'." />
          )}

          {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}

          {!loading && results.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                {results.map((img: any) => (
                  <div key={img.id} onClick={() => setSelected(img.urls.small)}
                    style={{
                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      border: selected === img.urls.small ? '2px solid var(--pl-primary)' : '2px solid transparent',
                      position: 'relative',
                    }}>
                    <img src={img.urls.thumb} alt={img.alt_description || ''}
                      style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                    {selected === img.urls.small && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4, background: 'var(--pl-primary)',
                        borderRadius: '50%', width: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckCircleOutlined style={{ color: '#fff', fontSize: 11 }} />
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', padding: '2px 4px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {img.user?.name}
                    </div>
                  </div>
                ))}
              </div>
              {selected && (
                <Button type="primary" block onClick={() => { onSelect(selected!); handleClose() }}
                  style={{ background: 'var(--pl-primary)', borderColor: 'var(--pl-primary)', borderRadius: 10 }}>
                  Usar esta imagen
                </Button>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  )
}

// ── Imagen Widget ──────────────────────────────────────────────────────────────
function ImagenWidget({
  config,
  onConfigChange,
}: {
  config: any
  onConfigChange: (patch: Record<string, any>) => void
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const imageUrl: string | null = config.imageUrl || null

  const handleUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    onConfigChange({ imageUrl: url })
    return false // prevent default upload
  }

  if (imageUrl) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
        <img src={imageUrl} alt="widget" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {/* Overlay controls on hover */}
        <div className="imagen-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: 0, transition: 'opacity 0.2s',
        }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = '0'}
        >
          <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*">
            <Button size="small" icon={<UploadOutlined />}
              style={{ borderRadius: 8, background: '#fff', color: '#333', fontWeight: 600 }}>
              Subir
            </Button>
          </Upload>
          <Button size="small" icon={<SearchOutlined />} onClick={(e) => { e.stopPropagation(); setSearchOpen(true) }}
            style={{ borderRadius: 8, background: '#fff', color: '#333', fontWeight: 600 }}>
            Buscar
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={(e) => { e.stopPropagation(); onConfigChange({ imageUrl: null }) }}
            style={{ borderRadius: 8, fontWeight: 600 }}>
            Eliminar
          </Button>
        </div>
        <ImageSearchModal open={searchOpen} onClose={() => setSearchOpen(false)}
          onSelect={(url) => onConfigChange({ imageUrl: url })} />
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 12, border: '2px dashed #DDD6FE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12, color: '#A78BFA', background: '#F5F3FF',
      userSelect: 'none',
    }}>
      <PictureOutlined style={{ fontSize: 32 }} />
      <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: 500 }}>Imagen del evento</Text>
      <div style={{ display: 'flex', gap: 8 }}>
        <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*">
          <Button size="small" icon={<UploadOutlined />}
            style={{ borderRadius: 8, borderColor: 'var(--pl-primary)', color: 'var(--pl-primary)', fontWeight: 600 }}>
            Subir
          </Button>
        </Upload>
        <Button size="small" icon={<SearchOutlined />}
          onClick={(e) => { e.stopPropagation(); setSearchOpen(true) }}
          style={{ borderRadius: 8, background: 'var(--pl-primary)', borderColor: 'var(--pl-primary)', color: '#fff', fontWeight: 600 }}>
          Buscar
        </Button>
      </div>
      <ImageSearchModal open={searchOpen} onClose={() => setSearchOpen(false)}
        onSelect={(url) => onConfigChange({ imageUrl: url })} />
    </div>
  )
}

// ── Resumen Widget ─────────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  SETUP: '#F97316', EVENT: '#7C3AED', TEARDOWN: '#0D9488', GENERAL: '#6B7280',
}
const PHASE_LABELS: Record<string, string> = {
  SETUP: 'Montaje', EVENT: 'Evento', TEARDOWN: 'Desmontaje', GENERAL: 'General',
}

function formatMoney(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function ResumenWidget({ eventId }: { eventId: string }) {
  const { data: activitiesData, isLoading: loadingAct } = useQuery({
    queryKey: ['planner-activities', eventId],
    queryFn: () => eventsApi.getActivities(eventId),
    enabled: !!eventId,
  })
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ['planner-orders', eventId],
    queryFn: () => ordersApi.list({ eventId }),
    enabled: !!eventId,
  })

  const activities: any[] = activitiesData?.data ?? activitiesData ?? []
  const orders: any[] = ordersData?.data ?? ordersData ?? []

  const totalRevenue = orders.reduce((s: number, o: any) => s + (o.totalAmount ?? o.total ?? 0), 0)
  const totalPaid = orders.reduce((s: number, o: any) => s + (o.amountPaid ?? 0), 0)
  const totalBalance = totalRevenue - totalPaid
  const lineItems = orders.reduce((s: number, o: any) => s + (o.lineItems?.length ?? 0), 0)

  const phaseGroups = activities.reduce((acc: Record<string, any[]>, a: any) => {
    const p = a.phase || 'GENERAL'
    acc[p] = acc[p] || []
    acc[p].push(a)
    return acc
  }, {})

  if (loadingAct || loadingOrders) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="small" />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #F0EBFF', flexShrink: 0,
        background: 'linear-gradient(135deg, #7C3AED08, #EC489908)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <BarChartOutlined style={{ color: '#7C3AED', fontSize: 16 }} />
        <Text strong style={{ fontSize: 13, color: '#1a1a1a' }}>Resumen del evento</Text>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Ingresos', value: formatMoney(totalRevenue), color: '#7C3AED', icon: <DollarOutlined /> },
            { label: 'Cobrado', value: formatMoney(totalPaid), color: '#059669', icon: <CheckCircleOutlined /> },
            { label: 'Por cobrar', value: formatMoney(totalBalance), color: totalBalance > 0 ? '#F97316' : '#059669', icon: <DollarOutlined /> },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: '#FAFAFA', border: '1px solid #F0EBFF', borderRadius: 8, padding: '8px 10px',
            }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Actividades', value: activities.length, icon: <CalendarOutlined style={{ color: '#7C3AED' }} /> },
            { label: 'Renglones', value: lineItems, icon: <FileTextOutlined style={{ color: '#EC4899' }} /> },
          ].map((s) => (
            <div key={s.label} style={{
              background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8,
              padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Activities by phase */}
        {activities.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '0.08em', marginBottom: 8 }}>
              ACTIVIDADES POR FASE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['SETUP', 'EVENT', 'TEARDOWN', 'GENERAL'].map((phase) => {
                const count = phaseGroups[phase]?.length ?? 0
                if (!count) return null
                const pct = Math.round((count / activities.length) * 100)
                return (
                  <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 56, fontSize: 10, fontWeight: 600, color: PHASE_COLORS[phase] }}>
                      {PHASE_LABELS[phase]}
                    </div>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F0EBFF', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: PHASE_COLORS[phase], borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#888', minWidth: 20, textAlign: 'right' }}>{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Financial summary */}
        {orders.length > 0 && (
          <div style={{
            background: '#F0FFF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 10px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#065F46', letterSpacing: '0.06em', marginBottom: 6 }}>
              RESUMEN FINANCIERO
            </div>
            {[
              { label: 'Total facturado', value: formatMoney(totalRevenue), bold: true },
              { label: 'Cobrado', value: formatMoney(totalPaid), color: '#059669' },
              { label: 'Saldo pendiente', value: formatMoney(totalBalance), color: totalBalance > 0 ? '#DC2626' : '#059669' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 11, color: '#444', fontWeight: row.bold ? 600 : 400 }}>{row.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: 700, color: row.color || '#1a1a1a' }}>{row.value}</Text>
              </div>
            ))}
          </div>
        )}

        {activities.length === 0 && orders.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '20px 0' }}>
            Sin datos disponibles para este evento
          </div>
        )}
      </div>
    </div>
  )
}

// ── Timeline Widget ────────────────────────────────────────────────────────────
type EventTheme = { primary: string; secondary: string; light: string; bg: string; label: string }

function getEventTheme(eventType?: string): EventTheme {
  const themes: Record<string, EventTheme> = {
    'Boda':        { primary: '#B5546A', secondary: '#C9728A', light: '#F7D6E0', bg: '#FEF8F9', label: 'Wedding Day Schedule' },
    'Social':      { primary: '#B5546A', secondary: '#C9728A', light: '#F7D6E0', bg: '#FEF8F9', label: 'Programa Social' },
    'Corporativo': { primary: '#3730A3', secondary: '#4F46E5', light: '#C7D2FE', bg: '#F0F4FF', label: 'Agenda del Evento' },
    'Concierto':   { primary: '#C2410C', secondary: '#EA580C', light: '#FED7AA', bg: '#FFF8F5', label: 'Show Schedule' },
    'Deportivo':   { primary: '#1E40AF', secondary: '#2563EB', light: '#BFDBFE', bg: '#EFF6FF', label: 'Programa Deportivo' },
    'Festival':    { primary: '#6D28D9', secondary: '#7C3AED', light: '#DDD6FE', bg: '#F5F3FF', label: 'Festival Schedule' },
  }
  return themes[eventType || ''] ?? { primary: '#7C3AED', secondary: '#9333EA', light: '#DDD6FE', bg: '#F5F3FF', label: 'Timeline del Evento' }
}

const ACT_ICONS: Record<string, string> = {
  MILESTONE: '★', TASK: '◆', LOGISTICS: '◉', TECHNICAL: '◈',
  MEETING: '●', CATERING: '◑', CEREMONY: '✦', ROUND: '▲', default: '◆',
}

function generateTimelinePdf(event: any, localData: { phases: any[]; activities: any[] }, branding?: EventBranding) {
  const theme = getEventTheme(event?.eventType)
  // Override theme colors with branding if provided
  if (branding?.primaryColor) theme.primary = branding.primaryColor
  if (branding?.secondaryColor) theme.secondary = branding.secondaryColor

  const phases = [...(localData.phases || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const activities = localData.activities || []

  // Group activities by phaseId preserving phase order
  const phaseMap: Record<string, any> = {}
  phases.forEach((p) => { phaseMap[p.id] = p })

  const byPhase: Record<string, any[]> = {}
  for (const act of activities) {
    const pid = act.phaseId || '__none__'
    byPhase[pid] = byPhase[pid] || []
    byPhase[pid].push(act)
  }

  const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const STATUS_ICON: Record<string, string> = {
    COMPLETED: '✓', IN_PROGRESS: '◉', PENDING: '◆',
  }

  const rows: string[] = []
  for (const phase of phases) {
    const acts = (byPhase[phase.id] || [])
    if (!acts.length) continue

    const phaseDate = phase.date
      ? new Date(phase.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
      : ''

    rows.push(`
      <tr class="phase-sep">
        <td colspan="4">
          <div class="phase-label" style="color:${phase.color || theme.primary};border-top-color:${phase.color ? phase.color + '44' : theme.light}">
            ${phase.name}${phaseDate ? `  <span style="font-weight:400;opacity:.6">${phaseDate}</span>` : ''}
          </div>
        </td>
      </tr>`)

    for (const act of acts) {
      const icon = STATUS_ICON[act.status] || '◆'
      const time = act.startTime || ''
      rows.push(`
        <tr class="act-row">
          <td class="icon-cell" style="color:${phase.color || theme.primary}">${icon}</td>
          <td class="dash-cell"><div class="dash" style="background:${phase.color || theme.primary}"></div></td>
          <td class="time-cell" style="color:${phase.color || theme.primary}">${time}</td>
          <td class="desc-cell">
            <span class="act-name">${act.name || ''}</span>
            ${act.responsible ? `<span class="act-resp"> — ${act.responsible}</span>` : ''}
          </td>
        </tr>`)
    }
  }

  const eventDate = fmtDate(event?.eventStart)
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${event?.name || 'Timeline'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400;1,600&family=Jost:wght@300;400;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4 portrait;margin:0}
  html,body{width:210mm;min-height:297mm;background:#fff;font-family:'Jost',Arial,sans-serif}

  /* ── Header ── */
  .header{
    background:${branding?.coverStyle === 'image' && branding?.bannerUrl
      ? `url(${branding.bannerUrl}) center/cover`
      : `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`};
    padding:48px 64px 40px;
    text-align:center;
    color:#fff;
    position:relative;
    overflow:hidden;
  }
  .header::before{
    content:'';position:absolute;inset:0;
    background:${branding?.coverStyle === 'image' && branding?.bannerUrl
      ? 'rgba(0,0,0,0.5)'
      : 'radial-gradient(ellipse at 30% 0%,rgba(255,255,255,0.12) 0%,transparent 60%), radial-gradient(ellipse at 70% 100%,rgba(0,0,0,0.12) 0%,transparent 60%)'};
  }
  .header-eyebrow{
    font-size:11px;letter-spacing:.35em;text-transform:uppercase;
    opacity:.8;margin-bottom:14px;position:relative;
  }
  .header-name{
    font-family:'Cormorant Garamond',Georgia,serif;
    font-size:52px;font-style:italic;line-height:1.05;
    margin-bottom:8px;position:relative;
  }
  .header-subtitle{
    font-size:12px;letter-spacing:.25em;text-transform:uppercase;
    opacity:.75;margin-bottom:0;position:relative;
  }
  .header-meta{
    margin-top:18px;font-size:12px;opacity:.7;letter-spacing:.05em;
    position:relative;
  }
  .header-divider{
    width:60px;height:1px;background:rgba(255,255,255,.4);
    margin:14px auto;position:relative;
  }

  /* ── Body ── */
  .body{
    padding:0 64px 48px;
    background:${theme.bg};
  }

  table{width:100%;border-collapse:collapse}

  .phase-sep td{
    padding:14px 0 6px;
  }
  .phase-label{
    font-size:9px;letter-spacing:.25em;text-transform:uppercase;
    color:${theme.primary};font-weight:600;
    border-top:1px solid ${theme.light};
    padding-top:14px;
    opacity:.85;
  }

  .act-row td{
    padding:11px 6px;
    border-bottom:1px solid ${theme.light};
    vertical-align:middle;
  }
  .act-row:last-child td{border-bottom:none}

  .icon-cell{
    width:32px;text-align:center;
    font-size:14px;color:${theme.primary};
    opacity:.8;
  }
  .dash-cell{width:44px;padding:0 8px}
  .dash{
    width:28px;height:1.5px;
    background:${theme.primary};opacity:.3;
  }
  .time-cell{
    width:88px;
    font-size:13px;font-weight:600;
    color:${theme.primary};white-space:nowrap;
  }
  .desc-cell{
    font-size:12.5px;color:#2d2d2d;line-height:1.4;
  }
  .act-name{font-weight:500}
  .act-resp{font-size:11px;color:#888;font-style:italic}

  /* ── Footer ── */
  .footer{
    text-align:center;padding:18px;
    font-size:10px;letter-spacing:.08em;
    color:${theme.primary};opacity:.5;
    border-top:1px solid ${theme.light};
    background:${theme.bg};
  }

  /* ── Print button (hidden when printing) ── */
  .print-btn{
    position:fixed;bottom:24px;right:24px;
    background:${theme.primary};color:#fff;
    border:none;padding:10px 22px;border-radius:30px;
    font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);
    font-family:'Jost',Arial,sans-serif;letter-spacing:.04em;
  }
  @media print{.print-btn{display:none}}
</style>
</head>
<body>
<div class="header">
  <div class="header-eyebrow">${event?.eventType || 'Evento'} &nbsp;·&nbsp; ${event?.code || ''}</div>
  <div class="header-name">${event?.name || 'Evento'}</div>
  <div class="header-divider"></div>
  <div class="header-subtitle">${theme.label}</div>
  ${eventDate ? `<div class="header-meta">${eventDate}</div>` : ''}
  ${event?.venueLocation ? `<div class="header-meta" style="margin-top:4px">${event.venueLocation}</div>` : ''}
</div>

<div class="body">
  <table>
    <tbody>
      ${rows.join('')}
    </tbody>
  </table>
</div>

<div class="footer">IventIA Planner &nbsp;·&nbsp; ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

<button class="print-btn" onclick="window.print()">⎙ Imprimir / Guardar PDF</button>
<script>setTimeout(()=>window.print(),800)</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const STATUS_DOT: Record<string, string> = {
  COMPLETED: '#059669', IN_PROGRESS: '#F97316', PENDING: '#9CA3AF',
}

function TimelineWidget({ eventId, event }: { eventId: string; event: any }) {
  const { store: localData } = usePlannerStore<{ phases: any[]; activities: any[] }>(
    eventId, 'timeline', { phases: [], activities: [] }, `iventia-timeline-${eventId}`,
  )
  const { store: branding } = usePlannerStore<EventBranding>(
    eventId, 'branding', { ...DEFAULT_BRANDING }, `iventia-branding-${eventId}`,
  )

  const theme = getEventTheme(event?.eventType)

  const phases = [...(localData.phases || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const activities = localData.activities || []

  // Build phase→activities map for preview
  const byPhase: Record<string, any[]> = {}
  for (const act of activities) {
    const pid = act.phaseId || '__none__'
    byPhase[pid] = byPhase[pid] || []
    byPhase[pid].push(act)
  }

  // Preview: first 3 phases, up to 4 activities each
  const previewPhases = phases.slice(0, 3)
  const totalActivities = activities.length

  const handlePdf = (e: React.MouseEvent) => {
    e.stopPropagation()
    generateTimelinePdf(event, localData, branding)
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
        padding: '12px 16px', flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.12), transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 3 }}>
              {event?.eventType || 'Evento'} · {event?.code || ''}
            </div>
            <div style={{
              color: '#fff', fontSize: 15, fontStyle: 'italic',
              fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1.15,
              maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {event?.name || '—'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 4 }}>
              {theme.label}
            </div>
          </div>
          <Tooltip title="Generar PDF del Timeline">
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={handlePdf}
              style={{
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
                color: '#fff', borderRadius: 8, height: 28, fontSize: 11, flexShrink: 0,
                backdropFilter: 'blur(4px)',
              }}
            >
              PDF
            </Button>
          </Tooltip>
        </div>
        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.35)', margin: '8px 0 0' }} />
      </div>

      {/* Timeline rows */}
      <div style={{ flex: 1, overflow: 'auto', background: theme.bg }}>
        {totalActivities === 0 ? (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '24px 0' }}>
            Sin actividades en el timeline
          </div>
        ) : previewPhases.map((phase) => {
          const phaseActs = (byPhase[phase.id] || []).slice(0, 4)
          if (!phaseActs.length) return null
          const phaseColor = phase.color || theme.primary
          return (
            <div key={phase.id}>
              {/* Phase header */}
              <div style={{
                padding: '6px 14px 2px',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: phaseColor, borderTop: `1px solid ${phaseColor}22`,
              }}>
                {phase.name}
              </div>
              {phaseActs.map((act: any, i: number) => (
                <div key={act.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  borderBottom: `1px solid ${theme.light}`,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: STATUS_DOT[act.status] || '#9CA3AF',
                    flexShrink: 0,
                  }} />
                  <div style={{ width: 16, height: 1.5, background: phaseColor, opacity: 0.3, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: phaseColor, minWidth: 44, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {act.startTime || ''}
                  </span>
                  <span style={{ fontSize: 11, color: '#2d2d2d', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {act.name}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
        {phases.length > 3 && (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 11, padding: '8px 0', fontStyle: 'italic' }}>
            +{phases.length - 3} fases más en el PDF
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{
        padding: '7px 14px', background: theme.light, flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Text style={{ fontSize: 10, color: theme.primary, opacity: 0.8 }}>
          {totalActivities} actividades · {phases.length} fases
        </Text>
        <Button
          size="small"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePdf}
          style={{
            background: theme.primary, borderColor: theme.primary,
            height: 24, fontSize: 10, borderRadius: 6, color: '#fff',
          }}
        >
          Generar PDF
        </Button>
      </div>
    </div>
  )
}

// ── URL helpers ────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
    /youtube\.com\/shorts\/([^?\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function extractTikTokId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  return m ? m[1] : null
}

// ── Links Widget ───────────────────────────────────────────────────────────────
function LinksWidget({
  config,
  onConfigChange,
}: {
  config: any
  onConfigChange: (patch: Record<string, any>) => void
}) {
  const url: string = config.url || ''
  const [inputUrl, setInputUrl] = useState('')
  const [editing, setEditing] = useState(false)

  const ytId  = url ? extractYouTubeId(url)  : null
  const ttId  = url ? extractTikTokId(url)   : null

  const handleSet = () => {
    const trimmed = inputUrl.trim()
    if (!trimmed) return
    onConfigChange({ url: trimmed })
    setInputUrl('')
    setEditing(false)
  }

  // Render the video embed or generic link
  const renderContent = () => {
    if (ytId) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
            style={{ flex: 1, border: 'none', display: 'block' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="YouTube video"
          />
          <div style={{
            padding: '5px 10px', background: '#fff', borderTop: '1px solid #EDE9FE',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888' }}>
              <YoutubeOutlined style={{ color: '#FF0000', fontSize: 14 }} /> YouTube
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button type="text" size="small" icon={<EditOutlined />}
                onClick={e => { e.stopPropagation(); setEditing(true); setInputUrl(url) }}
                style={{ height: 22, width: 22, padding: 0, color: '#aaa' }} />
              <Button type="text" size="small" icon={<DeleteOutlined />}
                onClick={e => { e.stopPropagation(); onConfigChange({ url: '' }) }}
                style={{ height: 22, width: 22, padding: 0, color: '#DC2626' }} />
            </div>
          </div>
        </div>
      )
    }

    if (ttId) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <iframe
            src={`https://www.tiktok.com/embed/v2/${ttId}`}
            style={{ flex: 1, border: 'none', display: 'block' }}
            allowFullScreen
            title="TikTok video"
          />
          <div style={{
            padding: '5px 10px', background: '#fff', borderTop: '1px solid #EDE9FE',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888' }}>
              🎵 TikTok
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button type="text" size="small" icon={<EditOutlined />}
                onClick={e => { e.stopPropagation(); setEditing(true); setInputUrl(url) }}
                style={{ height: 22, width: 22, padding: 0, color: '#aaa' }} />
              <Button type="text" size="small" icon={<DeleteOutlined />}
                onClick={e => { e.stopPropagation(); onConfigChange({ url: '' }) }}
                style={{ height: 22, width: 22, padding: 0, color: '#DC2626' }} />
            </div>
          </div>
        </div>
      )
    }

    // Generic link card
    let displayUrl = url
    try { displayUrl = new URL(url).hostname } catch { /* keep raw */ }

    return (
      <div style={{
        width: '100%', height: '100%', padding: 16, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', gap: 10, background: '#F5F3FF', borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#7C3AED',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LinkOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 2 }}>Enlace</div>
            <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayUrl}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="small" type="primary"
            icon={<EyeOutlined />}
            href={url} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, fontSize: 11 }}
          >
            Abrir
          </Button>
          <Button size="small" icon={<EditOutlined />}
            onClick={e => { e.stopPropagation(); setEditing(true); setInputUrl(url) }}
            style={{ borderRadius: 8, fontSize: 11 }}>
            Cambiar URL
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={e => { e.stopPropagation(); onConfigChange({ url: '' }) }}
            style={{ borderRadius: 8, fontSize: 11 }} />
        </div>
      </div>
    )
  }

  // URL input form (empty or editing)
  if (!url || editing) {
    return (
      <div style={{
        width: '100%', height: '100%', padding: 20, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
        background: '#F5F3FF', borderRadius: 12, userSelect: 'none',
      }}>
        <div style={{ textAlign: 'center' }}>
          <LinkOutlined style={{ fontSize: 32, color: '#7C3AED', display: 'block', marginBottom: 8 }} />
          <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: 600 }}>Widget de enlace</Text>
          <br />
          <Text style={{ fontSize: 11, color: '#aaa' }}>YouTube, TikTok o cualquier URL</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 340 }}>
          <Input
            autoFocus={editing}
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
            placeholder="https://youtube.com/watch?v=..."
            style={{ flex: 1, borderRadius: 8 }}
            onPressEnter={handleSet}
          />
          <Button
            type="primary"
            onClick={e => { e.stopPropagation(); handleSet() }}
            style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}
          >
            OK
          </Button>
        </div>
        {editing && (
          <Button type="text" size="small" onClick={() => setEditing(false)} style={{ color: '#aaa' }}>
            Cancelar
          </Button>
        )}
      </div>
    )
  }

  return renderContent()
}

// ── Budget helpers ─────────────────────────────────────────────────────────────
interface LienzoBudgetItem {
  id: string; chapterId: string; concept: string; code: string
  provider: string; quantity: number; unit: string
  unitPrice: number; unitCost?: number
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED'; notes?: string
}
interface LienzoBudgetChapter { id: string; name: string; color: string; sortOrder: number }
interface LienzoBudgetStore { chapters: LienzoBudgetChapter[]; items: LienzoBudgetItem[] }

function loadBudgetStore(eventId: string): LienzoBudgetStore {
  try {
    const raw = localStorage.getItem(`iventia-presupuesto-${eventId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { chapters: [], items: [] }
}

const fmtBudget = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function openHtmlBlob(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// PDF Organizador — precios + costos + utilidad
function generatePresupuestoOrgPdf(event: any, store: LienzoBudgetStore, branding?: EventBranding) {
  const pdfPrimary = branding?.primaryColor ?? '#7C3AED'
  const pdfSecondary = branding?.secondaryColor ?? '#4F46E5'
  const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const active    = store.items.filter(i => i.status !== 'CANCELLED')
  const ingTotal  = active.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const costTotal = active.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
  const utilTotal = ingTotal - costTotal
  const margenPct = ingTotal > 0 ? Math.round(utilTotal / ingTotal * 100) : 0

  const chapters = [...store.chapters].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const chapterRows = chapters.map(ch => {
    const items = store.items.filter(i => i.chapterId === ch.id)
    const active = items.filter(i => i.status !== 'CANCELLED')
    const ing  = active.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const cost = active.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
    const util = ing - cost
    const pct  = ing > 0 ? Math.round(util / ing * 100) : 0

    const itemRows = items.map(item => {
      const ing2  = item.quantity * item.unitPrice
      const cost2 = item.quantity * (item.unitCost ?? 0)
      const util2 = ing2 - cost2
      const p2    = ing2 > 0 ? Math.round(util2 / ing2 * 100) : 0
      const sColor = item.status === 'CONFIRMED' ? '#059669' : item.status === 'PENDING' ? '#D97706' : '#9CA3AF'
      const sLabel = item.status === 'CONFIRMED' ? 'Conf.' : item.status === 'PENDING' ? 'Pend.' : 'Cancel.'
      return `
      <tr class="item-row ${item.status === 'CANCELLED' ? 'cancelled' : ''}">
        <td class="td-concept">${item.concept}<br><span class="code">${item.code}</span></td>
        <td class="td-prov">${item.provider || '—'}</td>
        <td class="td-num">${item.quantity.toLocaleString('es-MX')} ${item.unit}</td>
        <td class="td-num">${fmtBudget(item.unitPrice)}</td>
        <td class="td-num">${(item.unitCost ?? 0) > 0 ? fmtBudget(item.unitCost!) : '—'}</td>
        <td class="td-num bold">${fmtBudget(ing2)}</td>
        <td class="td-num bold" style="color:${util2 >= 0 ? '#059669' : '#DC2626'}">${fmtBudget(util2)} <span class="pct">${p2}%</span></td>
        <td class="td-status" style="color:${sColor}">${sLabel}</td>
      </tr>`
    }).join('')

    return `
    <tr class="ch-header" style="border-left:4px solid ${ch.color}">
      <td colspan="5" style="padding:10px 14px;font-weight:700;font-size:13px;color:${ch.color}">${ch.name}</td>
      <td class="td-num bold" style="color:#7C3AED">${fmtBudget(ing)}</td>
      <td class="td-num bold" style="color:${util >= 0 ? '#059669' : '#DC2626'}">${fmtBudget(util)} <span class="pct">${pct}%</span></td>
      <td></td>
    </tr>
    ${itemRows}
    <tr class="ch-spacer"><td colspan="8"></td></tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="es">
<head><meta charset="utf-8"><title>Presupuesto — ${event?.name || 'Evento'}</title>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 landscape;margin:14mm 16mm}
html,body{font-family:'Jost',Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
.header{background:${branding?.coverStyle === 'image' && branding?.bannerUrl ? `url(${branding.bannerUrl}) center/cover` : `linear-gradient(135deg,${pdfPrimary},${pdfSecondary})`};color:#fff;padding:28px 32px;margin-bottom:18px;border-radius:8px;display:flex;justify-content:space-between;align-items:flex-end;position:relative;overflow:hidden}
.header h1{font-size:22px;font-weight:800;margin-bottom:4px}
.header .sub{font-size:11px;opacity:.75;letter-spacing:.06em}
.kpi-row{display:flex;gap:12px;margin-bottom:18px}
.kpi{flex:1;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;padding:10px 14px}
.kpi-label{font-size:9px;font-weight:700;color:#888;letter-spacing:.12em;margin-bottom:4px}
.kpi-value{font-size:18px;font-weight:800}
table{width:100%;border-collapse:collapse}
th{background:#F5F3FF;font-size:9px;font-weight:700;letter-spacing:.1em;color:#888;padding:7px 8px;text-align:left}
th.r{text-align:right}
.ch-header{background:#FAFAFA}
.item-row td{padding:7px 8px;border-bottom:1px solid #F5F3FF;font-size:11px;vertical-align:middle}
.item-row.cancelled td{opacity:.45;text-decoration:line-through}
.ch-spacer td{height:10px}
.td-concept{max-width:200px}
.td-prov{color:#666;max-width:120px}
.td-num{text-align:right;padding-right:12px;white-space:nowrap}
.td-status{text-align:center;font-weight:600;font-size:10px}
.bold{font-weight:700}
.code{font-size:9px;color:#aaa}
.pct{font-size:9px;font-weight:400;opacity:.8}
.footer{margin-top:20px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #EDE9FE;padding-top:10px}
.print-btn{position:fixed;bottom:20px;right:20px;background:#7C3AED;color:#fff;border:none;padding:9px 20px;border-radius:24px;font-size:12px;cursor:pointer;box-shadow:0 4px 14px rgba(124,58,237,.35);font-family:'Jost',Arial,sans-serif}
.badge-internal{display:inline-block;background:#FEF9C3;color:#854D0E;border:1px solid #FDE68A;font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;letter-spacing:.06em;margin-bottom:4px}
@media print{.print-btn{display:none}}
</style></head>
<body>
<div class="header">
  <div>
    <div class="sub">${event?.eventType || 'Evento'} · ${event?.code || ''} · ${fmtDate(event?.eventStart)}</div>
    <h1>${event?.name || 'Evento'}</h1>
    <span class="badge-internal">USO INTERNO — CONFIDENCIAL</span>
  </div>
  <div style="text-align:right;font-size:11px;opacity:.8">
    <div>Generado: ${fmtDate(new Date().toISOString())}</div>
    <div style="font-size:9px;margin-top:2px">IventIA Planner</div>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi"><div class="kpi-label">INGRESO TOTAL</div><div class="kpi-value" style="color:#7C3AED">${fmtBudget(ingTotal)}</div></div>
  <div class="kpi"><div class="kpi-label">COSTO TOTAL</div><div class="kpi-value" style="color:#DC2626">${fmtBudget(costTotal)}</div></div>
  <div class="kpi"><div class="kpi-label">UTILIDAD</div><div class="kpi-value" style="color:${margenPct>=20?'#059669':margenPct>=10?'#D97706':'#DC2626'}">${fmtBudget(utilTotal)}</div></div>
  <div class="kpi"><div class="kpi-label">MARGEN</div><div class="kpi-value" style="color:${margenPct>=20?'#059669':margenPct>=10?'#D97706':'#DC2626'}">${margenPct}%</div></div>
  <div class="kpi"><div class="kpi-label">CAPÍTULOS</div><div class="kpi-value" style="color:#0D9488">${chapters.length}</div></div>
  <div class="kpi"><div class="kpi-label">ITEMS</div><div class="kpi-value" style="color:#6B7280">${store.items.length}</div></div>
</div>

<table>
<thead><tr>
  <th>CONCEPTO</th><th>PROVEEDOR</th><th class="r">CANT./U.</th>
  <th class="r">P.UNIT.</th><th class="r">COSTO U.</th>
  <th class="r">TOTAL INGRESO</th><th class="r">UTILIDAD</th><th style="text-align:center">ESTADO</th>
</tr></thead>
<tbody>${chapterRows}</tbody>
<tfoot>
  <tr style="background:#F5F3FF;border-top:2px solid #7C3AED">
    <td colspan="5" style="padding:10px 14px;font-weight:800;font-size:13px;color:#7C3AED">TOTAL EVENTO</td>
    <td class="td-num bold" style="color:#7C3AED;font-size:14px">${fmtBudget(ingTotal)}</td>
    <td class="td-num bold" style="color:${utilTotal>=0?'#059669':'#DC2626'};font-size:14px">${fmtBudget(utilTotal)} <span class="pct">${margenPct}%</span></td>
    <td></td>
  </tr>
</tfoot>
</table>

<div class="footer">IventIA Planner &nbsp;·&nbsp; Documento confidencial — uso exclusivo del organizador</div>
<button class="print-btn" onclick="window.print()">⎙ Guardar PDF</button>
<script>setTimeout(()=>window.print(),800)</script>
</body></html>`

  openHtmlBlob(html)
}

// PDF Cliente — solo precios al cliente, sin costos ni márgenes
function generatePresupuestoClientePdf(event: any, store: LienzoBudgetStore, branding?: EventBranding) {
  const pdfPrimary = branding?.primaryColor ?? '#7C3AED'
  const pdfSecondary = branding?.secondaryColor ?? '#4F46E5'
  const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const active   = store.items.filter(i => i.status !== 'CANCELLED')
  const ingTotal = active.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const confirmed = active.filter(i => i.status === 'CONFIRMED').reduce((s, i) => s + i.quantity * i.unitPrice, 0)

  const chapters = [...store.chapters].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const chapterRows = chapters.map(ch => {
    const items  = store.items.filter(i => i.chapterId === ch.id && i.status !== 'CANCELLED')
    if (!items.length) return ''
    const chTotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

    const itemRows = items.map(item => {
      const total = item.quantity * item.unitPrice
      const sColor = item.status === 'CONFIRMED' ? '#059669' : '#D97706'
      const sLabel = item.status === 'CONFIRMED' ? 'Confirmado' : 'Por confirmar'
      return `
      <tr class="item-row">
        <td class="td-concept">${item.concept}${item.notes ? `<br><span class="note">${item.notes}</span>` : ''}</td>
        <td class="td-prov">${item.provider || '—'}</td>
        <td class="td-num">${item.quantity.toLocaleString('es-MX')} ${item.unit}</td>
        <td class="td-num">${fmtBudget(item.unitPrice)}</td>
        <td class="td-num bold">${fmtBudget(total)}</td>
        <td class="td-status" style="color:${sColor}">${sLabel}</td>
      </tr>`
    }).join('')

    return `
    <tr class="ch-header" style="border-left:4px solid ${ch.color}">
      <td colspan="4" style="padding:10px 14px;font-weight:700;font-size:13px;color:${ch.color}">${ch.name}</td>
      <td class="td-num bold" style="color:#1a1a1a">${fmtBudget(chTotal)}</td>
      <td></td>
    </tr>
    ${itemRows}
    <tr class="ch-spacer"><td colspan="6"></td></tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="es">
<head><meta charset="utf-8"><title>Cotización — ${event?.name || 'Evento'}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400;1,600&family=Jost:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 portrait;margin:16mm 18mm}
html,body{font-family:'Jost',Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid ${pdfPrimary}}
.header-left h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-style:italic;font-weight:600;color:#1a1a1a;margin-bottom:4px}
.header-left .sub{font-size:11px;color:#888;letter-spacing:.04em}
.header-right{text-align:right}
.header-right .label{font-size:9px;font-weight:700;color:#888;letter-spacing:.12em;margin-bottom:4px}
.header-right .val{font-size:13px;font-weight:600;color:#1a1a1a}
.kpi-row{display:flex;gap:10px;margin-bottom:22px}
.kpi{flex:1;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:6px;padding:10px 14px}
.kpi-label{font-size:9px;font-weight:700;color:#888;letter-spacing:.12em;margin-bottom:4px}
.kpi-value{font-size:18px;font-weight:800;color:${pdfPrimary}}
table{width:100%;border-collapse:collapse}
th{background:#F5F3FF;font-size:9px;font-weight:700;letter-spacing:.1em;color:#888;padding:8px 10px;text-align:left}
th.r{text-align:right}
.ch-header{background:#FAFAFA}
.item-row td{padding:8px 10px;border-bottom:1px solid #FAF8FF;font-size:11px;vertical-align:top}
.ch-spacer td{height:12px}
.td-concept{max-width:240px;font-weight:500}
.td-prov{color:#666;max-width:130px;font-size:10px}
.td-num{text-align:right;padding-right:12px;white-space:nowrap}
.td-status{text-align:center;font-weight:600;font-size:10px;white-space:nowrap}
.bold{font-weight:700}
.note{font-size:10px;color:#aaa;font-style:italic}
.total-section{margin-top:24px;border-top:2px solid ${pdfPrimary};padding-top:16px;display:flex;justify-content:flex-end}
.total-box{min-width:280px}
.total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
.total-row.main{border-top:1px solid #DDD6FE;padding-top:10px;margin-top:6px}
.total-row.main .l{font-weight:700;font-size:14px;color:${pdfPrimary}}
.total-row.main .r2{font-weight:800;font-size:20px;color:${pdfPrimary}}
.footer{margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end;font-size:9px;color:#aaa;border-top:1px solid #EDE9FE;padding-top:10px}
.sig-box{border-top:1px solid #ccc;min-width:200px;padding-top:6px;text-align:center;font-size:10px;color:#888}
.print-btn{position:fixed;bottom:20px;right:20px;background:${pdfPrimary};color:#fff;border:none;padding:9px 20px;border-radius:24px;font-size:12px;cursor:pointer;box-shadow:0 4px 14px rgba(124,58,237,.35);font-family:'Jost',Arial,sans-serif}
@media print{.print-btn{display:none}}
</style></head>
<body>

<div class="header">
  <div class="header-left">
    <h1>${event?.name || 'Propuesta de servicios'}</h1>
    <div class="sub">
      ${event?.eventType ? event.eventType + ' · ' : ''}
      ${event?.venueLocation || ''}
      ${event?.eventStart ? ' · ' + fmtDate(event.eventStart) : ''}
    </div>
  </div>
  <div class="header-right">
    <div class="label">COTIZACIÓN</div>
    <div class="val">${event?.code || 'PPTO-001'}</div>
    <div class="label" style="margin-top:8px">FECHA</div>
    <div class="val">${fmtDate(new Date().toISOString())}</div>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi"><div class="kpi-label">TOTAL COTIZADO</div><div class="kpi-value">${fmtBudget(ingTotal)}</div></div>
  <div class="kpi"><div class="kpi-label">CONFIRMADO</div><div class="kpi-value" style="color:#059669">${fmtBudget(confirmed)}</div></div>
  <div class="kpi"><div class="kpi-label">POR CONFIRMAR</div><div class="kpi-value" style="color:#D97706">${fmtBudget(ingTotal - confirmed)}</div></div>
  <div class="kpi"><div class="kpi-label">CAPÍTULOS</div><div class="kpi-value" style="color:#6B7280">${chapters.length}</div></div>
</div>

<table>
<thead><tr>
  <th>CONCEPTO</th><th>PROVEEDOR</th><th class="r">CANTIDAD</th>
  <th class="r">P. UNIT.</th><th class="r">TOTAL</th><th style="text-align:center">ESTADO</th>
</tr></thead>
<tbody>${chapterRows}</tbody>
</table>

<div class="total-section">
  <div class="total-box">
    <div class="total-row"><span class="l">Subtotal confirmado</span><span class="r">${fmtBudget(confirmed)}</span></div>
    <div class="total-row"><span class="l">Pendiente de confirmar</span><span class="r">${fmtBudget(ingTotal - confirmed)}</span></div>
    <div class="total-row main"><span class="l">TOTAL</span><span class="r2">${fmtBudget(ingTotal)}</span></div>
  </div>
</div>

<div class="footer">
  <div>IventIA Planner &nbsp;·&nbsp; Los precios están expresados en MXN e incluyen los servicios descritos.</div>
  <div class="sig-box">Aprobado por el cliente</div>
</div>
<button class="print-btn" onclick="window.print()">⎙ Guardar PDF</button>
<script>setTimeout(()=>window.print(),800)</script>
</body></html>`

  openHtmlBlob(html)
}

// ── Presupuesto Widget ─────────────────────────────────────────────────────────
function PresupuestoWidget({ eventId, event }: { eventId: string; event: any }) {
  const { store } = usePlannerStore<LienzoBudgetStore>(
    eventId, 'presupuesto', { chapters: [], items: [] }, `iventia-presupuesto-${eventId}`,
  )
  const { store: branding } = usePlannerStore<EventBranding>(
    eventId, 'branding', { ...DEFAULT_BRANDING }, `iventia-branding-${eventId}`,
  )
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)

  const active    = store.items.filter(i => i.status !== 'CANCELLED')
  const ingTotal  = active.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const costTotal = active.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
  const utilidad  = ingTotal - costTotal
  const margenPct = ingTotal > 0 ? Math.round(utilidad / ingTotal * 100) : 0
  const confirmed = active.filter(i => i.status === 'CONFIRMED').reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const margenColor = margenPct >= 25 ? '#059669' : margenPct >= 10 ? '#D97706' : '#DC2626'

  const chapters = [...store.chapters].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const isEmpty = store.items.length === 0

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
        padding: '12px 16px', flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.12), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: '.25em', textTransform: 'uppercase', marginBottom: 3 }}>
              {event?.eventType || 'Evento'} · {event?.code || ''}
            </div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, lineHeight: 1.15 }}>
              Presupuesto P&L
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 3 }}>
              {chapters.length} capítulos · {store.items.length} items
            </div>
          </div>
          <Tooltip title="Generar PDF">
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={e => { e.stopPropagation(); setPdfMenuOpen(true) }}
              style={{
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
                color: '#fff', borderRadius: 8, height: 28, fontSize: 11, flexShrink: 0,
              }}
            >
              PDF
            </Button>
          </Tooltip>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
        {isEmpty ? (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '24px 0' }}>
            Sin items en el presupuesto.<br />
            <span style={{ fontSize: 11 }}>Ve a Presupuesto para agregar capítulos e items.</span>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'INGRESO', value: fmtBudget(ingTotal), color: '#7C3AED' },
                { label: 'COSTO', value: fmtBudget(costTotal), color: '#DC2626' },
                { label: 'UTILIDAD', value: fmtBudget(utilidad), color: margenColor },
                { label: 'MARGEN', value: `${margenPct}%`, color: margenColor },
              ].map(k => (
                <div key={k.label} style={{
                  background: '#FAFAFA', border: '1px solid #F0EBFF', borderRadius: 8, padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 9, color: '#888', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 3 }}>{k.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Margin bar */}
            {ingTotal > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${Math.min(100, costTotal / ingTotal * 100)}%`, background: '#FCA5A5' }} />
                  <div style={{ width: `${Math.max(0, Math.min(100 - costTotal / ingTotal * 100, utilidad / ingTotal * 100))}%`, background: '#6EE7B7' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 600 }}>Costo {Math.round(costTotal / ingTotal * 100)}%</span>
                  <span style={{ fontSize: 9, color: margenColor, fontWeight: 600 }}>Utilidad {margenPct}%</span>
                </div>
              </div>
            )}

            {/* Confirmed */}
            <div style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 8, padding: '7px 10px', marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#065F46', letterSpacing: '.08em', marginBottom: 3 }}>CONFIRMADO</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>{fmtBudget(confirmed)}</span>
                <span style={{ fontSize: 10, color: '#888' }}>{ingTotal > 0 ? Math.round(confirmed / ingTotal * 100) : 0}% del ingreso</span>
              </div>
            </div>

            {/* Chapter list — top 5 */}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#888', letterSpacing: '.1em', marginBottom: 8 }}>CAPÍTULOS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {chapters.slice(0, 5).map(ch => {
                const items = store.items.filter(i => i.chapterId === ch.id && i.status !== 'CANCELLED')
                const chIng = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
                const chCost = items.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
                const chUtil = chIng - chCost
                const chPct = ingTotal > 0 ? Math.round(chIng / ingTotal * 100) : 0
                return (
                  <div key={ch.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6,
                    background: '#FAFAFA', borderLeft: `3px solid ${ch.color}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.name}
                      </div>
                      {chCost > 0 && (
                        <div style={{ fontSize: 9, color: chUtil >= 0 ? '#059669' : '#DC2626' }}>
                          Util. {fmtBudget(chUtil)}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ch.color }}>{fmtBudget(chIng)}</div>
                      <div style={{ fontSize: 9, color: '#aaa' }}>{chPct}%</div>
                    </div>
                  </div>
                )
              })}
              {chapters.length > 5 && (
                <div style={{ textAlign: 'center', fontSize: 10, color: '#aaa', padding: '4px 0' }}>
                  +{chapters.length - 5} capítulos más
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* PDF chooser modal */}
      <Modal
        open={pdfMenuOpen}
        onCancel={() => setPdfMenuOpen(false)}
        title="Generar PDF del presupuesto"
        footer={null}
        width={420}
      >
        <div onMouseDown={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          <div
            onClick={() => { generatePresupuestoOrgPdf(event, store, branding); setPdfMenuOpen(false) }}
            style={{
              background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10,
              padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#7C3AED'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#DDD6FE'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>PDF Organizador</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  Incluye precios, costos y utilidad por item. Uso interno y confidencial.
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => { generatePresupuestoClientePdf(event, store, branding); setPdfMenuOpen(false) }}
            style={{
              background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 10,
              padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#059669'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#BBF7D0'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileTextOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>PDF Cliente</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  Cotización formal con precios al cliente. Sin costos ni márgenes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function WidgetRenderer({
  widget, event, eventId, onConfigChange,
}: {
  widget: Widget
  event: any
  eventId: string
  onConfigChange: (id: string, patch: Record<string, any>) => void
}) {
  switch (widget.type) {
    case 'portada':     return <PortadaWidget event={event} eventId={eventId} />
    case 'tareas':      return <TareasWidget eventId={eventId} />
    case 'proveedores': return <ProveedoresWidget eventId={eventId} />
    case 'nota':        return (
      <NotaWidget
        config={widget.config}
        onConfigChange={(patch) => onConfigChange(widget.id, { config: { ...widget.config, ...patch } })}
      />
    )
    case 'texto':       return (
      <TextoWidget
        config={widget.config}
        onConfigChange={(patch) => onConfigChange(widget.id, { config: { ...widget.config, ...patch } })}
      />
    )
    case 'links':       return (
      <LinksWidget
        config={widget.config}
        onConfigChange={(patch) => onConfigChange(widget.id, { config: { ...widget.config, ...patch } })}
      />
    )
    case 'imagen':      return (
      <ImagenWidget
        config={widget.config}
        onConfigChange={(patch) => onConfigChange(widget.id, { config: { ...widget.config, ...patch } })}
      />
    )
    case 'pdf':         return (
      <PdfWidget
        config={widget.config}
        onConfigChange={(patch) => onConfigChange(widget.id, { config: { ...widget.config, ...patch } })}
      />
    )
    case 'resumen':      return <ResumenWidget eventId={eventId || event?.id || ''} />
    case 'timeline':    return <TimelineWidget eventId={eventId || event?.id || ''} event={event} />
    case 'presupuesto': return <PresupuestoWidget eventId={eventId || event?.id || ''} event={event} />
    case 'contrato':    return <ContratoWidget eventId={eventId || event?.id || ''} event={event} />
    default:            return null
  }
}

// ── Properties panel ────────────────────────────────────────────────────────────
function PropertiesPanel({
  widget,
  onChange,
  onClose,
}: {
  widget: Widget
  onChange: (id: string, patch: Partial<Widget>) => void
  onClose: () => void
}) {
  const WIDGET_LABELS: Record<WidgetType, string> = {
    portada: 'Portada', tareas: 'Tareas', proveedores: 'Proveedores',
    nota: 'Nota', texto: 'Texto', imagen: 'Imagen', pdf: 'PDF', resumen: 'Resumen del evento', timeline: 'Timeline del evento', links: 'Enlace / Video', presupuesto: 'Presupuesto P&L',
    contrato: 'Contrato y pagos',
  }

  return (
    <div style={{
      width: 260, flexShrink: 0, background: '#fff', borderLeft: '1px solid var(--pl-border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--pl-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: 'var(--pl-primary-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AppstoreAddOutlined style={{ color: 'var(--pl-primary)', fontSize: 14 }} />
          </div>
          <Text strong style={{ fontSize: 14 }}>{WIDGET_LABELS[widget.type]}</Text>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#F5F3FF', borderRadius: 8, padding: 3 }}>
          {['Diseño', 'Datos', 'Estilo'].map((tab) => (
            <div key={tab} style={{
              flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: tab === 'Diseño' ? '#fff' : 'transparent',
              color: tab === 'Diseño' ? 'var(--pl-primary)' : '#888',
              cursor: 'pointer', boxShadow: tab === 'Diseño' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>{tab}</div>
          ))}
        </div>

        {/* Identidad */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '0.08em', marginBottom: 8 }}>IDENTIDAD</div>
          <Input size="small" value={WIDGET_LABELS[widget.type]} style={{ borderRadius: 8 }} readOnly />
        </div>

        {/* Posición y tamaño */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '0.08em', marginBottom: 8 }}>POSICIÓN Y TAMAÑO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'X', field: 'x' as keyof Widget },
              { label: 'Y', field: 'y' as keyof Widget },
              { label: 'W', field: 'w' as keyof Widget },
              { label: 'H', field: 'h' as keyof Widget },
            ].map(({ label, field }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{label}</div>
                <InputNumber
                  size="small" value={widget[field] as number} min={50}
                  style={{ width: '100%', borderRadius: 8 }}
                  onChange={(v) => onChange(widget.id, { [field]: v ?? 50 })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Apariencia */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '0.08em', marginBottom: 8 }}>APARIENCIA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12 }}>Color</Text>
              <div style={{ display: 'flex', gap: 4 }}>
                {['#7C3AED', '#EC4899', '#0D9488', '#F97316', '#DC2626', '#2563EB'].map((c) => (
                  <div key={c} onClick={() => onChange(widget.id, { config: { ...widget.config, color: c } })}
                    style={{
                      width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer',
                      border: widget.config.color === c ? '2px solid #333' : '2px solid transparent',
                    }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12 }}>Mostrar header</Text>
              <Switch
                size="small" checked={widget.config.showHeader !== false}
                onChange={(v) => onChange(widget.id, { config: { ...widget.config, showHeader: v } })}
                style={{ background: widget.config.showHeader !== false ? 'var(--pl-primary)' : undefined }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12 }}>Sombra</Text>
              <Switch
                size="small" checked={widget.config.shadow !== false}
                onChange={(v) => onChange(widget.id, { config: { ...widget.config, shadow: v } })}
                style={{ background: widget.config.shadow !== false ? 'var(--pl-primary)' : undefined }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12 }}>Padding</Text>
              <Text style={{ fontSize: 12, color: '#888' }}>{widget.config.padding || 14}px</Text>
            </div>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Fuente de datos */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '0.08em', marginBottom: 8 }}>FUENTE DE DATOS</div>
          <div style={{
            background: '#F0FFF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '6px 10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 11, color: '#065F46' }}>events/EVT.{widget.type}</Text>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#059669', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              En vivo
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PDF Widget ─────────────────────────────────────────────────────────────────
function PdfWidget({
  config,
  onConfigChange,
}: {
  config: any
  onConfigChange: (patch: Record<string, any>) => void
}) {
  const pdfUrl: string | null = config.pdfUrl || null
  const pdfName: string = config.pdfName || 'documento.pdf'

  const handleUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onConfigChange({ pdfUrl: dataUrl, pdfName: file.name })
    }
    reader.readAsDataURL(file)
    return false
  }

  if (pdfUrl) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: 12, overflow: 'hidden', background: '#fff',
      }}>
        {/* Header bar */}
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid var(--pl-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <FilePdfOutlined style={{ color: '#DC2626', fontSize: 18, flexShrink: 0 }} />
            <Text style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}
              ellipsis={{ tooltip: pdfName }}>
              {pdfName}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Tooltip title="Ver PDF">
              <Button type="text" size="small" icon={<EyeOutlined />}
                onClick={(e) => { e.stopPropagation(); window.open(pdfUrl, '_blank') }}
                style={{ color: 'var(--pl-primary)' }} />
            </Tooltip>
            <Upload showUploadList={false} beforeUpload={handleUpload} accept="application/pdf">
              <Tooltip title="Reemplazar PDF">
                <Button type="text" size="small" icon={<UploadOutlined />}
                  style={{ color: '#888' }} />
              </Tooltip>
            </Upload>
            <Tooltip title="Eliminar">
              <Button type="text" size="small" icon={<DeleteOutlined />}
                onClick={(e) => { e.stopPropagation(); onConfigChange({ pdfUrl: null, pdfName: null }) }}
                style={{ color: '#DC2626' }} />
            </Tooltip>
          </div>
        </div>

        {/* PDF preview via iframe */}
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          style={{ flex: 1, border: 'none', display: 'block' }}
          title={pdfName}
        />
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 12, border: '2px dashed #FECACA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12, background: '#FFF5F5', userSelect: 'none',
    }}>
      <FilePdfOutlined style={{ fontSize: 36, color: '#DC2626' }} />
      <Text style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Documento PDF</Text>
      <Upload showUploadList={false} beforeUpload={handleUpload} accept="application/pdf">
        <Button icon={<UploadOutlined />} size="small"
          style={{ borderRadius: 8, borderColor: '#DC2626', color: '#DC2626', fontWeight: 600 }}>
          Subir PDF
        </Button>
      </Upload>
    </div>
  )
}

// ── Contrato Widget ────────────────────────────────────────────────────────────
type ContratoStatus = 'BORRADOR' | 'COTIZACION' | 'CONTRATO' | 'FIRMADO' | 'CANCELADO'
const CONTRATO_STATUS_CFG: Record<ContratoStatus, { label: string; color: string; bg: string }> = {
  BORRADOR:   { label: 'Borrador',   color: '#6B7280', bg: '#F3F4F6' },
  COTIZACION: { label: 'Cotización', color: '#D97706', bg: '#FFFBEB' },
  CONTRATO:   { label: 'Contrato',   color: '#7C3AED', bg: '#F5F3FF' },
  FIRMADO:    { label: 'Firmado',    color: '#059669', bg: '#ECFDF5' },
  CANCELADO:  { label: 'Cancelado',  color: '#DC2626', bg: '#FEF2F2' },
}
const fmtContrato = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function generateContratoPdfFromWidget(store: any, branding: any, event: any, type: 'cotizacion' | 'contrato') {
  const c = store
  const b = branding
  const ev = event
  const isCotizacion = type === 'cotizacion'
  const title = isCotizacion ? 'COTIZACIÓN' : 'CONTRATO DE SERVICIOS'
  const STATUS_CFG_LOCAL: Record<string, { label: string; color: string; bg: string }> = {
    BORRADOR:   { label: 'Borrador',   color: '#6B7280', bg: '#F3F4F6' },
    COTIZACION: { label: 'Cotización', color: '#D97706', bg: '#FFFBEB' },
    CONTRATO:   { label: 'Contrato',   color: '#7C3AED', bg: '#F5F3FF' },
    FIRMADO:    { label: 'Firmado',    color: '#059669', bg: '#ECFDF5' },
    CANCELADO:  { label: 'Cancelado',  color: '#DC2626', bg: '#FEF2F2' },
  }
  const statusCfg = STATUS_CFG_LOCAL[c.status] || STATUS_CFG_LOCAL['BORRADOR']
  const grouped: Record<string, any[]> = {}
  for (const item of (c.items || [])) {
    const key = item.chapterName || 'General'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }
  const paidTotal = (c.payments || [])
    .filter((p: any) => p.status === 'PAGADO')
    .reduce((s: number, p: any) => s + (p.paidAmount || p.amount), 0)
  const pendingTotal = (c.totalAmount || 0) - paidTotal
  const primaryColor = b?.primaryColor || '#7C3AED'
  const secondaryColor = b?.secondaryColor || '#EC4899'
  const bannerUrl = b?.bannerUrl || ''
  const tagline = b?.tagline || ''
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${title} — ${ev?.name || 'Evento'}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1F2937; font-size: 11px; line-height: 1.5; }
@page { size: letter; margin: 0; }
.header { position: relative; height: 140px;
  background: ${bannerUrl ? `url(${bannerUrl}) center/cover` : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`};
  display: flex; align-items: center; justify-content: center; overflow: hidden; }
.header-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
.header-content { position: relative; z-index: 1; text-align: center; color: #fff; }
.header-content h1 { font-size: 26px; font-weight: 800; letter-spacing: 2px; margin-bottom: 4px; }
.header-content p { font-size: 13px; opacity: 0.9; }
.body { padding: 28px 40px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.meta-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
.meta-box h3 { font-size: 9px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.meta-box p { font-size: 11px; line-height: 1.6; color: #374151; }
.section-title { font-size: 12px; font-weight: 700; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; padding-bottom: 4px; margin: 20px 0 10px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
th { background: ${primaryColor}; color: #fff; padding: 7px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
td { padding: 6px 10px; border-bottom: 1px solid #E5E7EB; font-size: 10.5px; }
tr:nth-child(even) td { background: #F9FAFB; }
.chapter-header td { background: ${primaryColor}10; font-weight: 700; color: ${primaryColor}; font-size: 10px; border-bottom: 2px solid ${primaryColor}30; }
.totals-box { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); color: #fff; border-radius: 10px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin: 14px 0; }
.totals-box .label { font-size: 11px; font-weight: 500; opacity: 0.9; }
.totals-box .value { font-size: 20px; font-weight: 800; }
.payment-status { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
.status-PAGADO { background: #ECFDF5; color: #059669; }
.status-PENDIENTE { background: #FFFBEB; color: #D97706; }
.status-VENCIDO { background: #FEF2F2; color: #DC2626; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; margin-left: 8px; }
.signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 16px; }
.sig-line { border-top: 1px solid #1F2937; padding-top: 8px; text-align: center; }
.sig-line .name { font-size: 11px; font-weight: 600; }
.sig-line .role { font-size: 9px; color: #6B7280; }
.footer { text-align: center; padding: 14px; font-size: 9px; color: #9CA3AF; border-top: 1px solid #E5E7EB; margin-top: 24px; }
</style>
</head>
<body>
<div class="header">
  <div class="header-overlay"></div>
  <div class="header-content">
    <h1>${title}</h1>
    <p>${ev?.name || 'Evento'}${tagline ? ` · ${tagline}` : ''}</p>
  </div>
</div>
<div class="body">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
    <div>
      <span style="font-size:13px;font-weight:700;color:${primaryColor};">${c.contractNumber || 'Sin número'}</span>
      <span class="badge" style="background:${statusCfg.bg};color:${statusCfg.color};">${statusCfg.label}</span>
    </div>
    <div style="text-align:right;font-size:10px;color:#6B7280;">
      Fecha: ${new Date().toLocaleDateString('es-MX')}<br>
      ${ev?.eventStart ? `Evento: ${new Date(ev.eventStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
    </div>
  </div>
  <div class="meta-grid">
    <div class="meta-box"><h3>Organizador</h3><p style="font-weight:600;">IventIA Planner</p><p>${ev?.venueLocation || ''}</p></div>
    <div class="meta-box"><h3>Cliente</h3>
      <p style="font-weight:600;">${c.client?.personType === 'MORAL' ? (c.client?.companyName || '') : `${c.client?.firstName || ''} ${c.client?.lastName || ''}`}</p>
      ${c.client?.rfc ? `<p>RFC: ${c.client.rfc}</p>` : ''}
      ${c.client?.email ? `<p>${c.client.email}${c.client?.phone ? ` · ${c.client.phone}` : ''}</p>` : ''}
    </div>
  </div>
  ${(c.items || []).length > 0 ? `
  <div class="section-title">Conceptos y servicios</div>
  <table><thead><tr>
    <th style="width:42%">Concepto</th><th style="width:12%;text-align:center">Cantidad</th>
    <th style="width:10%;text-align:center">Unidad</th><th style="width:18%;text-align:right">Precio unit.</th><th style="width:18%;text-align:right">Subtotal</th>
  </tr></thead><tbody>
  ${Object.entries(grouped).map(([chapter, items]) => `
    <tr class="chapter-header"><td colspan="5">${chapter}</td></tr>
    ${(items as any[]).map(i => `<tr>
      <td>${i.concept}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:center">${i.unit}</td>
      <td style="text-align:right">$${(i.unitPrice || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right">$${((i.quantity || 0) * (i.unitPrice || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('')}
  `).join('')}
  </tbody></table>` : ''}
  <div class="totals-box">
    <div><div class="label">TOTAL ${c.currency || 'MXN'}</div><div class="value">${fmtContrato(c.totalAmount || 0)}</div></div>
    ${!isCotizacion ? `<div style="text-align:right;"><div class="label">Pagado: ${fmtContrato(paidTotal)}</div><div class="label">Pendiente: ${fmtContrato(pendingTotal)}</div></div>` : ''}
  </div>
  ${!isCotizacion && (c.payments || []).length ? `
  <div class="section-title">Calendario de pagos</div>
  <table><thead><tr>
    <th>Concepto</th><th style="text-align:center">%</th><th style="text-align:center">Fecha límite</th><th style="text-align:right">Monto</th><th style="text-align:center">Estado</th>
  </tr></thead><tbody>
  ${(c.payments || []).map((p: any) => `<tr>
    <td>${p.label}</td><td style="text-align:center">${p.percentage}%</td>
    <td style="text-align:center">${new Date(p.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
    <td style="text-align:right">${fmtContrato(p.amount)}</td>
    <td style="text-align:center"><span class="payment-status status-${p.status}">${p.status}</span></td>
  </tr>`).join('')}
  </tbody></table>` : ''}
  ${c.terms ? `<div class="section-title">Términos y condiciones</div><div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px;font-size:10px;line-height:1.7;color:#4B5563;">${c.terms.replace(/\n/g, '<br>')}</div>` : ''}
  ${!isCotizacion ? `
  <div class="signatures">
    <div class="sig-line"><div class="name">${c.client?.personType === 'MORAL' ? (c.client?.companyName || '') : `${c.client?.firstName || ''} ${c.client?.lastName || ''}`}</div><div class="role">Cliente</div></div>
    <div class="sig-line"><div class="name">${c.authorizedBy || 'Organizador'}</div><div class="role">Organizador · IventIA Planner</div></div>
  </div>` : ''}
  <div class="footer">Documento generado por IventIA Planner · ${new Date().toLocaleDateString('es-MX')}${c.contractNumber ? ` · ${c.contractNumber}` : ''}</div>
</div>
<script>setTimeout(()=>window.print(),600)</script>
</body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) w.onload = () => URL.revokeObjectURL(url)
}

function ContratoWidget({ eventId, event }: { eventId: string; event: any }) {
  const navigate = useNavigate()
  const { store } = usePlannerStore<any>(eventId, 'contrato', {
    contractNumber: '', status: 'BORRADOR', client: {}, items: [], payments: [], totalAmount: 0, currency: 'MXN',
  }, `iventia-contrato-${eventId}`)
  const { store: branding } = usePlannerStore<any>(eventId, 'branding', { primaryColor: '#7C3AED', secondaryColor: '#EC4899' }, `iventia-branding-${eventId}`)

  const hasContract = !!store.contractNumber
  const statusCfg = CONTRATO_STATUS_CFG[(store.status as ContratoStatus)] || CONTRATO_STATUS_CFG['BORRADOR']

  const paymentsWithOverdue = (store.payments || []).map((p: any) => {
    if (p.status === 'PENDIENTE' && new Date(p.dueDate) < new Date()) {
      return { ...p, status: 'VENCIDO' }
    }
    return p
  })

  const paidTotal = (store.payments || [])
    .filter((p: any) => p.status === 'PAGADO')
    .reduce((s: number, p: any) => s + (p.paidAmount || p.amount), 0)

  const clientName = store.client?.personType === 'MORAL'
    ? store.client?.companyName
    : `${store.client?.firstName || ''} ${store.client?.lastName || ''}`.trim()

  if (!hasContract) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: 'linear-gradient(135deg, #F5F3FF, #FDF4FF)', userSelect: 'none', borderRadius: 12,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22,
        }}>
          <AuditOutlined />
        </div>
        <Text style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>Sin contrato</Text>
        <Text style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', maxWidth: 220 }}>
          Crea un contrato con el calendario de pagos desde la sección Contratos
        </Text>
        <Button size="small" type="primary" icon={<AuditOutlined />}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); navigate('contratos') }}
          style={{ borderRadius: 8, background: '#7C3AED', borderColor: '#7C3AED' }}>
          Ir a Contratos
        </Button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
        padding: '10px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 2 }}>
            CONTRATO
          </div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{store.contractNumber}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{
            background: statusCfg.bg, color: statusCfg.color,
            borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700,
          }}>
            {statusCfg.label}
          </div>
          <Button size="small" icon={<FilePdfOutlined />}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); generateContratoPdfFromWidget(store, branding, event, store.status === 'BORRADOR' ? 'cotizacion' : 'contrato') }}
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: 8, height: 26, fontSize: 11 }}>
            PDF
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        {/* Client + totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#F9FAFB', border: '1px solid #EDE9FE', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 4 }}>CLIENTE</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clientName || 'Sin cliente'}
            </div>
            {store.client?.email && (
              <div style={{ fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {store.client.email}
              </div>
            )}
          </div>
          <div style={{ background: '#F9FAFB', border: '1px solid #EDE9FE', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 4 }}>TOTAL</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#7C3AED' }}>{fmtContrato(store.totalAmount || 0)}</div>
            {paidTotal > 0 && (
              <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                Pagado: {fmtContrato(paidTotal)}
              </div>
            )}
          </div>
        </div>

        {/* Payment schedule */}
        {paymentsWithOverdue.length > 0 ? (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 6 }}>CALENDARIO DE PAGOS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {paymentsWithOverdue.map((p: any) => {
                const isPaid = p.status === 'PAGADO'
                const isOverdue = p.status === 'VENCIDO'
                const color = isPaid ? '#059669' : isOverdue ? '#DC2626' : '#D97706'
                const bg = isPaid ? '#F0FDF4' : isOverdue ? '#FEF2F2' : '#FFFBEB'
                const border = isPaid ? '#BBF7D0' : isOverdue ? '#FECDD3' : '#FDE68A'
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 8, background: bg, border: `1px solid ${border}`,
                  }}>
                    <div style={{ color, fontSize: 14, flexShrink: 0 }}>
                      {isPaid ? <CheckCircleOutlined /> : isOverdue ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1F2937' }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>
                        {new Date(p.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {p.percentage}%
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{fmtContrato(p.amount)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 11, padding: '16px 0' }}>
            Sin calendario de pagos
          </div>
        )}
      </div>

      {/* Footer action */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid #F0EBFF', flexShrink: 0 }}>
        <Button size="small" block icon={<AuditOutlined />}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); navigate('contratos') }}
          style={{ borderRadius: 8, fontSize: 11 }}>
          Abrir contrato completo
        </Button>
      </div>
    </div>
  )
}

// ── Widget add menu ──────────────────────────────────────────────────────────────
const WIDGET_MENU: { type: WidgetType; label: string; icon: React.ReactNode; defaultSize: [number, number] }[] = [
  { type: 'portada', label: 'Portada del evento', icon: <AppstoreAddOutlined />, defaultSize: [420, 200] },
  { type: 'tareas', label: 'Tareas urgentes', icon: <CheckCircleOutlined />, defaultSize: [380, 280] },
  { type: 'proveedores', label: 'Proveedores activos', icon: <ExclamationCircleOutlined />, defaultSize: [300, 280] },
  { type: 'nota', label: 'Nota', icon: <FileTextOutlined />, defaultSize: [240, 180] },
  { type: 'texto', label: 'Texto', icon: <FontSizeOutlined />, defaultSize: [280, 80] },
  { type: 'imagen', label: 'Imagen', icon: <PictureOutlined />, defaultSize: [300, 200] },
  { type: 'pdf', label: 'PDF', icon: <FilePdfOutlined />, defaultSize: [340, 420] },
  { type: 'resumen',   label: 'Resumen del evento',  icon: <BarChartOutlined />,  defaultSize: [480, 520] },
  { type: 'timeline',  label: 'Timeline del evento',  icon: <CalendarOutlined />,  defaultSize: [380, 560] },
  { type: 'links',     label: 'Enlace / Video',        icon: <LinkOutlined />,       defaultSize: [400, 260] },
  { type: 'presupuesto', label: 'Presupuesto P&L',    icon: <DollarOutlined />,     defaultSize: [380, 560] },
  { type: 'contrato',   label: 'Contrato y pagos',   icon: <AuditOutlined />,      defaultSize: [380, 400] },
]

// ── Drawing helpers ────────────────────────────────────────────────────────────
// Compute per-point pressure widths: velocity-based + taper at start/end
function calcPressure(pts: StrokePoint[], baseWidth: number): number[] {
  const n = pts.length
  const minW = Math.max(0.4, baseWidth * 0.06)
  const maxW = baseWidth
  if (n === 0) return []
  if (n === 1) return [minW]

  // Raw velocities (distance between consecutive points)
  const vel: number[] = [0]
  for (let i = 1; i < n; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    vel.push(Math.sqrt(dx * dx + dy * dy))
  }

  // Smooth velocities with a small window
  const smoothV = vel.map((_, i) => {
    const w = 4
    const slice = vel.slice(Math.max(0, i - w), Math.min(n, i + w + 1))
    return slice.reduce((s, v) => s + v, 0) / slice.length
  })
  const maxV = Math.max(...smoothV, 1)

  const widths: number[] = []
  for (let i = 0; i < n; i++) {
    // Velocity: fast=thin, slow=thick (capped so very slow doesn't exceed maxW)
    const vNorm = Math.min(smoothV[i] / maxV, 1)
    const velW = minW + (maxW - minW) * Math.pow(1 - vNorm * 0.75, 1.4)

    // Taper at start (first 18%) and end (last 12%)
    const t = i / Math.max(1, n - 1)
    const startT = t < 0.18 ? Math.pow(t / 0.18, 0.6) : 1
    const endT   = t > 0.88 ? Math.pow((1 - t) / 0.12, 0.5) : 1

    widths.push(velW * startT * endT)
  }
  return widths
}

// Build a filled ribbon SVG path — the "magic pencil" shape
function buildMagicRibbon(pts: StrokePoint[], baseWidth: number): string {
  if (pts.length < 2) return ''

  const widths = calcPressure(pts, baseWidth)
  const left: StrokePoint[] = []
  const right: StrokePoint[] = []

  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)]
    const next = pts[Math.min(pts.length - 1, i + 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / len
    const ny =  dx / len
    const hw = widths[i] / 2
    left.push({ x: pts[i].x + nx * hw, y: pts[i].y + ny * hw })
    right.push({ x: pts[i].x - nx * hw, y: pts[i].y - ny * hw })
  }

  // Catmull-Rom helper for smooth outline
  const cr = (ps: StrokePoint[]) => {
    let d = `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}`
    for (let i = 0; i < ps.length - 1; i++) {
      const p0 = ps[Math.max(0, i - 1)]
      const p1 = ps[i]
      const p2 = ps[i + 1]
      const p3 = ps[Math.min(ps.length - 1, i + 2)]
      const cx1 = p1.x + (p2.x - p0.x) / 6
      const cy1 = p1.y + (p2.y - p0.y) / 6
      const cx2 = p2.x - (p3.x - p1.x) / 6
      const cy2 = p2.y - (p3.y - p1.y) / 6
      d += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }

  const last = pts[pts.length - 1]
  const first = pts[0]

  // Left side forward → taper tip at end → right side backward → taper tip at start → close
  let d = cr(left)
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  d += ' ' + cr([...right].reverse()).replace(/^M/, 'L')
  d += ` L ${first.x.toFixed(1)} ${first.y.toFixed(1)} Z`
  return d
}

// ── Arrow helpers ─────────────────────────────────────────────────────────────

// Ramer-Douglas-Peucker: simplify raw points, keeping only those that deviate
// more than `eps` from the straight segment between endpoints.
function ptLineDist(p: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x; const dy = b.y - a.y
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

function rdpSimplify(pts: StrokePoint[], eps: number): StrokePoint[] {
  if (pts.length <= 2) return pts
  let maxD = 0; let maxI = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = ptLineDist(pts[i], pts[0], pts[pts.length - 1])
    if (d > maxD) { maxD = d; maxI = i }
  }
  if (maxD > eps) {
    const l = rdpSimplify(pts.slice(0, maxI + 1), eps)
    const r = rdpSimplify(pts.slice(maxI), eps)
    return [...l.slice(0, -1), ...r]
  }
  return [pts[0], pts[pts.length - 1]]
}

// Build a smooth arrow SVG: Catmull-Rom line + filled arrowhead at endpoint
function buildArrowSvg(pts: StrokePoint[], strokeW: number): { line: string; head: string } {
  if (pts.length < 2) return { line: '', head: '' }

  // Aggressive simplification — the fewer points the cleaner the curve
  const eps = Math.max(2, strokeW * 1.2)
  const s = rdpSimplify(pts, eps)
  if (s.length < 2) return { line: '', head: '' }

  // Catmull-Rom smooth path
  let line = `M ${s[0].x.toFixed(1)} ${s[0].y.toFixed(1)}`
  for (let i = 0; i < s.length - 1; i++) {
    const p0 = s[Math.max(0, i - 1)]
    const p1 = s[i]; const p2 = s[i + 1]
    const p3 = s[Math.min(s.length - 1, i + 2)]
    const cx1 = p1.x + (p2.x - p0.x) / 6; const cy1 = p1.y + (p2.y - p0.y) / 6
    const cx2 = p2.x - (p3.x - p1.x) / 6; const cy2 = p2.y - (p3.y - p1.y) / 6
    line += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }

  // Arrowhead: triangular, size proportional to stroke width
  const last = s[s.length - 1]; const prev = s[s.length - 2]
  const dx = last.x - prev.x; const dy = last.y - prev.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len; const uy = dy / len            // forward unit vector
  const S = Math.max(12, strokeW * 6)                  // arrowhead length
  const W = S * 0.4                                    // arrowhead half-width

  // Base center of the arrowhead (pulled back from tip)
  const bx = last.x - S * ux; const by = last.y - S * uy
  // Left/right wings (perpendicular to forward direction)
  const lx = bx - W * uy; const ly = by + W * ux
  const rx = bx + W * uy; const ry = by - W * ux

  const head = `M ${last.x.toFixed(1)} ${last.y.toFixed(1)} L ${lx.toFixed(1)} ${ly.toFixed(1)} L ${rx.toFixed(1)} ${ry.toFixed(1)} Z`

  return { line, head }
}

// ── Persistence helpers ────────────────────────────────────────────────────────
function lienzoKey(eventId: string) { return `iventia-lienzo-${eventId}` }

function loadWidgets(eventId: string, remoteData?: Widget[]): Widget[] {
  if (Array.isArray(remoteData) && remoteData.length > 0) return remoteData
  try {
    const raw = localStorage.getItem(lienzoKey(eventId))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return makeDefaultWidgets()
}

function serializeWidgets(widgets: Widget[]) {
  // Skip blob URLs — they don't survive a page reload
  return widgets.map((w) => ({
    ...w,
    config: {
      ...w.config,
      imageUrl: w.config.imageUrl?.startsWith('blob:') ? null : w.config.imageUrl,
      pdfUrl:   w.config.pdfUrl?.startsWith('blob:')   ? null : w.config.pdfUrl,
      pdfName:  w.config.pdfUrl?.startsWith('blob:')   ? null : w.config.pdfName,
    },
  }))
}

// ── Main canvas (shared by all 3 tabs) ─────────────────────────────────────────
function LienzoCanvas({ eventId: id, event, storeKey }: { eventId: string; event: any; storeKey?: string }) {
  const isStoreMode = !!storeKey
  const queryClient = useQueryClient()

  // Store-mode canvas: uses usePlannerStore (disabled when in lienzo mode)
  const plannerStore = usePlannerStore<{ widgets: any[]; strokes: any[] }>(
    isStoreMode ? (id ?? '') : '',
    storeKey ?? 'lienzo-cliente',
    { widgets: [], strokes: [] },
  )

  const [widgets, setWidgets] = useState<Widget[]>(makeDefaultWidgets)
  const [lienzoReady, setLienzoReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSync, setLastSync] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Draw tool state
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [activeStroke, setActiveStroke] = useState<StrokePoint[] | null>(null)
  const [drawColor, setDrawColor] = useState('#1a1a1a')
  const [drawWidth, setDrawWidth] = useState(14)
  const [arrowWidth, setArrowWidth] = useState(2.5)
  const drawingRef = useRef(false)
  const activeStrokeRef = useRef<StrokePoint[]>([])

  // Fetch lienzo from backend
  const { data: lienzoRemote, isLoading: lienzoLoading } = useQuery({
    queryKey: ['planner-lienzo', id],
    queryFn: () => eventsApi.getLienzo(id!),
    enabled: !isStoreMode && !!id,
    staleTime: Infinity,
  })

  // Initialize widgets + strokes (once) from either usePlannerStore or lienzo API
  useEffect(() => {
    if (lienzoReady) return
    if (isStoreMode) {
      if (!plannerStore.ready || !id) return
      const data = plannerStore.store
      setWidgets(data.widgets?.length ? loadWidgets(id, data.widgets) : [])
      setStrokes(data.strokes ?? [])
      setLienzoReady(true)
    } else {
      if (lienzoLoading || !id) return
      const remoteData = lienzoRemote?.data
      if (remoteData) {
        if (Array.isArray(remoteData) && remoteData.length > 0) {
          setWidgets(loadWidgets(id, remoteData))
          setStrokes([])
        } else if (remoteData?.widgets && Array.isArray(remoteData.widgets)) {
          setWidgets(loadWidgets(id, remoteData.widgets))
          setStrokes(remoteData.strokes ?? [])
        } else {
          const local = loadWidgets(id)
          setWidgets(local)
          if (local.length > 0) eventsApi.saveLienzo(id, serializeWidgets(local), []).catch(() => {})
        }
      } else {
        const local = loadWidgets(id)
        setWidgets(local)
        if (local.length > 0) eventsApi.saveLienzo(id, serializeWidgets(local), []).catch(() => {})
      }
      setLienzoReady(true)
    }
  }, [isStoreMode, lienzoReady, lienzoLoading, id, lienzoRemote, plannerStore.ready, plannerStore.store])

  // Debounced save on widgets/strokes change (after initial load)
  useEffect(() => {
    if (!id || !lienzoReady) return
    if (isStoreMode) {
      plannerStore.update({ widgets: serializeWidgets(widgets) as any, strokes })
    } else {
      setSyncStatus('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const serializable = serializeWidgets(widgets)
        eventsApi.saveLienzo(id, serializable, strokes)
          .then(() => {
            setSyncStatus('saved')
            setLastSync(dayjs().format('HH:mm'))
            queryClient.setQueryData(['planner-lienzo', id], { data: { widgets: serializable, strokes } })
          })
          .catch(() => setSyncStatus('idle'))
      }, 1200)
    }
  }, [id, lienzoReady, widgets, strokes])

  // Drag state
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedWidget = widgets.find((w) => w.id === selectedId) || null

  const updateWidget = useCallback((id: string, patch: Partial<Widget>) => {
    setWidgets((ws) => ws.map((w) => w.id === id ? { ...w, ...patch } : w))
  }, [])

  const addWidget = (type: WidgetType) => {
    const def = WIDGET_MENU.find((m) => m.type === type)!
    const id = `w${Date.now()}`
    setWidgets((ws) => [...ws, {
      id, type,
      x: 40 + Math.random() * 100,
      y: 40 + Math.random() * 100,
      w: def.defaultSize[0],
      h: def.defaultSize[1],
      config: { showHeader: true, shadow: true, padding: 14 },
    }])
    setSelectedId(id)
    setShowAddMenu(false)
    setTool('select')
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setWidgets((ws) => ws.filter((w) => w.id !== selectedId))
    setSelectedId(null)
  }

  // Mouse handlers for dragging widgets
  const onWidgetMouseDown = (e: React.MouseEvent, widgetId: string) => {
    if (tool !== 'select') return
    e.stopPropagation()
    setSelectedId(widgetId)
    const w = widgets.find((x) => x.id === widgetId)!
    dragging.current = { id: widgetId, startX: e.clientX, startY: e.clientY, origX: w.x, origY: w.y }
  }

  const getCanvasPoint = (e: React.MouseEvent): StrokePoint => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scale = zoom / 100
    return {
      x: (e.clientX - rect.left - pan.x) / scale,
      y: (e.clientY - rect.top - pan.y) / scale,
    }
  }

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (tool === 'draw' || tool === 'arrow') {
      drawingRef.current = true
      const pt = getCanvasPoint(e)
      activeStrokeRef.current = [pt]
      setActiveStroke([pt])
      return
    }
    if (tool === 'pan') {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    } else {
      setSelectedId(null)
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if ((tool === 'draw' || tool === 'arrow') && drawingRef.current) {
      const pt = getCanvasPoint(e)
      activeStrokeRef.current = [...activeStrokeRef.current, pt]
      if (activeStrokeRef.current.length % 3 === 0) {
        setActiveStroke([...activeStrokeRef.current])
      }
      return
    }
    if (dragging.current && tool === 'select') {
      const scale = zoom / 100
      const dx = (e.clientX - dragging.current.startX) / scale
      const dy = (e.clientY - dragging.current.startY) / scale
      updateWidget(dragging.current.id, {
        x: Math.max(0, dragging.current.origX + dx),
        y: Math.max(0, dragging.current.origY + dy),
      })
    }
    if (isPanning.current && tool === 'pan') {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy })
    }
  }

  const onMouseUp = () => {
    if ((tool === 'draw' || tool === 'arrow') && drawingRef.current) {
      drawingRef.current = false
      const pts = activeStrokeRef.current
      if (pts.length >= 2) {
        const isArrow = tool === 'arrow'
        const newStroke: Stroke = {
          id: `stroke-${Date.now()}`,
          points: pts,
          color: drawColor,
          width: isArrow ? arrowWidth : drawWidth,
          isArrow,
        }
        setStrokes(prev => [...prev, newStroke])
      }
      activeStrokeRef.current = []
      setActiveStroke(null)
      return
    }
    dragging.current = null
    isPanning.current = false
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(25, Math.min(200, z - e.deltaY * 0.1)))
  }

  const TOOLS: { key: Tool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { key: 'select', label: 'Seleccionar', icon: <SelectOutlined />, shortcut: 'V' },
    { key: 'pan', label: 'Mover lienzo', icon: <DragOutlined />, shortcut: 'H' },
    { key: 'draw', label: 'Pincel', icon: <EditOutlined />, shortcut: 'B' },
    { key: 'arrow', label: 'Flecha', icon: <ArrowRightOutlined />, shortcut: 'A' },
    { key: 'widget', label: 'Widget', icon: <AppstoreAddOutlined />, shortcut: 'R' },
    { key: 'nota', label: 'Nota', icon: <FileTextOutlined />, shortcut: 'N' },
    { key: 'texto', label: 'Texto', icon: <FontSizeOutlined />, shortcut: 'T' },
    { key: 'imagen', label: 'Imagen', icon: <PictureOutlined />, shortcut: 'I' },
  ]

  const canvasIsLoading = isStoreMode ? !plannerStore.ready : lienzoLoading
  if (canvasIsLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin size="large" tip="Cargando lienzo..." />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8F7FF', overflow: 'hidden' }}>
      {/* Top toolbar */}
      <div style={{
        height: 48, background: '#fff', borderBottom: '1px solid var(--pl-border)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 4, flexShrink: 0,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
      }}>
        {TOOLS.map((t) => (
          <Tooltip key={t.key} title={`${t.label} ${t.shortcut}`}>
            <Button
              type={tool === t.key ? 'primary' : 'text'}
              size="small"
              icon={t.icon}
              onClick={() => {
                if (t.key === 'widget') { setShowAddMenu((v) => !v); return }
                if (t.key === 'nota') { addWidget('nota'); return }
                if (t.key === 'texto') { addWidget('texto'); return }
                if (t.key === 'imagen') { addWidget('imagen'); return }
                setTool(t.key as Tool)
                setShowAddMenu(false)
              }}
              style={{
                borderRadius: 8, height: 32, padding: '0 10px', fontSize: 12, fontWeight: 500,
                ...(tool === t.key ? {
                  background: 'var(--pl-primary)', borderColor: 'var(--pl-primary)',
                } : {}),
              }}
            >
              {t.label} <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 4 }}>{t.shortcut}</span>
            </Button>
          </Tooltip>
        ))}

        {/* Draw / Arrow tool options */}
        {(tool === 'draw' || tool === 'arrow') && (
          <>
            <div style={{ width: 1, height: 24, background: '#EDE9FE', margin: '0 4px' }} />
            {/* Shared color swatches */}
            {[
              { color: '#1a1a1a', label: 'Tinta' },
              { color: '#7C3AED', label: 'Violeta' },
              { color: '#B5546A', label: 'Rosa' },
              { color: '#B7791F', label: 'Dorado' },
              { color: '#0D9488', label: 'Teal' },
              { color: '#ffffff', label: 'Blanco' },
            ].map(({ color, label }) => (
              <Tooltip key={color} title={label}>
                <div onClick={() => setDrawColor(color)} style={{
                  width: 20, height: 20, borderRadius: '50%', background: color, cursor: 'pointer', flexShrink: 0,
                  border: drawColor === color ? '2.5px solid #7C3AED' : '2px solid #E5E7EB',
                  boxShadow: drawColor === color ? '0 0 0 2px #EDE9FE' : undefined,
                  transition: 'all 0.12s',
                }} />
              </Tooltip>
            ))}
            <div style={{ width: 1, height: 24, background: '#EDE9FE', margin: '0 4px' }} />
            {/* Width options — different presets per tool */}
            {tool === 'draw'
              ? [{ w: 6, label: 'Fino' }, { w: 14, label: 'Medio' }, { w: 28, label: 'Grueso' }].map(({ w, label }) => (
                <Tooltip key={w} title={label}>
                  <div onClick={() => setDrawWidth(w)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                    background: drawWidth === w ? '#F5F3FF' : 'transparent',
                    border: drawWidth === w ? '1.5px solid #7C3AED' : '1.5px solid transparent',
                  }}>
                    <div style={{ height: Math.max(2, w / 5), width: 16, background: '#7C3AED', borderRadius: 2 }} />
                  </div>
                </Tooltip>
              ))
              : [{ w: 1.5, label: 'Fina' }, { w: 2.5, label: 'Media' }, { w: 4, label: 'Gruesa' }].map(({ w, label }) => (
                <Tooltip key={w} title={label}>
                  <div onClick={() => setArrowWidth(w)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                    background: arrowWidth === w ? '#F5F3FF' : 'transparent',
                    border: arrowWidth === w ? '1.5px solid #7C3AED' : '1.5px solid transparent',
                  }}>
                    <svg width="22" height="14" viewBox="0 0 22 14">
                      <line x1="2" y1="7" x2="15" y2="7" stroke="#7C3AED" strokeWidth={w} strokeLinecap="round" />
                      <polygon points="22,7 14,3 14,11" fill="#7C3AED" />
                    </svg>
                  </div>
                </Tooltip>
              ))
            }
            <div style={{ width: 1, height: 24, background: '#EDE9FE', margin: '0 4px' }} />
            <Tooltip title="Deshacer último trazo (Z)">
              <Button type="text" size="small"
                onClick={() => setStrokes(prev => prev.slice(0, -1))}
                disabled={strokes.length === 0}
                style={{ borderRadius: 8, height: 32, padding: '0 8px', fontSize: 11, color: '#888' }}
              >↩ Deshacer</Button>
            </Tooltip>
            {strokes.length > 0 && (
              <Tooltip title="Borrar todos los trazos">
                <Button type="text" size="small" onClick={() => setStrokes([])}
                  style={{ borderRadius: 8, height: 32, padding: '0 8px', fontSize: 11, color: '#EF4444' }}
                >🗑 Limpiar</Button>
              </Tooltip>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        {selectedId && (
          <Button danger size="small" onClick={deleteSelected} style={{ borderRadius: 8, height: 32 }}>
            Eliminar widget
          </Button>
        )}
      </div>

      {/* Widget add menu */}
      {showAddMenu && (
        <div style={{
          position: 'fixed', top: 56, left: 240, zIndex: 1000,
          background: '#fff', borderRadius: 12, padding: 8,
          boxShadow: '0 8px 32px rgba(124,58,237,0.18)',
          border: '1px solid var(--pl-border)', minWidth: 220,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', padding: '4px 8px 8px', letterSpacing: '0.06em' }}>
            AGREGAR WIDGET
          </div>
          {WIDGET_MENU.map((m) => (
            <div key={m.type}
              onClick={() => addWidget(m.type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, cursor: 'pointer', fontSize: 13,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#F5F3FF'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ color: 'var(--pl-primary)', fontSize: 16 }}>{m.icon}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Canvas + properties */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1, overflow: 'hidden', position: 'relative',
            cursor: tool === 'pan' ? 'grab' : (tool === 'draw' || tool === 'arrow') ? 'crosshair' : tool === 'select' ? 'default' : 'crosshair',
          }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          {/* Canvas background dots */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, #C4B5FD 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.4,
            pointerEvents: 'none',
          }} />

          {/* Widgets layer */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
            transformOrigin: '0 0',
          }}>
            {widgets.map((w) => {
              const isSelected = w.id === selectedId
              return (
                <div
                  key={w.id}
                  style={{
                    position: 'absolute',
                    left: w.x, top: w.y, width: w.w, height: w.h,
                    borderRadius: 12,
                    boxShadow: isSelected
                      ? '0 0 0 2px #7C3AED, 0 8px 24px rgba(124,58,237,0.2)'
                      : w.config.shadow !== false
                        ? '0 2px 12px rgba(0,0,0,0.08)'
                        : 'none',
                    background: '#fff',
                    cursor: tool === 'select' ? 'move' : 'default',
                    transition: 'box-shadow 0.15s',
                    overflow: 'hidden',
                  }}
                  onMouseDown={(e) => onWidgetMouseDown(e, w.id)}
                >
                  <WidgetRenderer widget={w} event={event} eventId={id || ''} onConfigChange={updateWidget} />

                  {/* Resize handle */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 14, height: 14, cursor: 'se-resize',
                        background: '#7C3AED', borderRadius: '8px 0 8px 0',
                        opacity: 0.8,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        const startX = e.clientX, startY = e.clientY
                        const origW = w.w, origH = w.h
                        const scale = zoom / 100
                        const onMove = (me: MouseEvent) => {
                          updateWidget(w.id, {
                            w: Math.max(120, origW + (me.clientX - startX) / scale),
                            h: Math.max(80, origH + (me.clientY - startY) / scale),
                          })
                        }
                        const onUp = () => {
                          window.removeEventListener('mousemove', onMove)
                          window.removeEventListener('mouseup', onUp)
                        }
                        window.addEventListener('mousemove', onMove)
                        window.addEventListener('mouseup', onUp)
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* SVG draw overlay — same coordinate space as widgets */}
          <svg
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              overflow: 'visible',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              transformOrigin: '0 0',
              pointerEvents: 'none',
            }}
          >
            <defs>
              <filter id="ink-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {strokes.map(s => {
              if (s.isArrow) {
                const { line, head } = buildArrowSvg(s.points, s.width)
                return (
                  <g key={s.id} opacity={0.92}>
                    <path d={line} fill="none" stroke={s.color} strokeWidth={s.width}
                      strokeLinecap="round" strokeLinejoin="round" filter="url(#ink-glow)" />
                    <path d={head} fill={s.color} stroke="none" />
                  </g>
                )
              }
              return (
                <path
                  key={s.id}
                  d={buildMagicRibbon(s.points, s.width)}
                  fill={s.color}
                  stroke="none"
                  filter="url(#ink-glow)"
                  opacity={0.92}
                />
              )
            })}
            {activeStroke && activeStroke.length >= 2 && (
              tool === 'arrow' ? (() => {
                const { line, head } = buildArrowSvg(activeStroke, arrowWidth)
                return (
                  <g opacity={0.78}>
                    <path d={line} fill="none" stroke={drawColor} strokeWidth={arrowWidth}
                      strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
                    <path d={head} fill={drawColor} stroke="none" />
                  </g>
                )
              })() : (
                <path
                  d={buildMagicRibbon(activeStroke, drawWidth)}
                  fill={drawColor}
                  stroke="none"
                  opacity={0.88}
                />
              )
            )}
          </svg>
        </div>

        {/* Properties panel */}
        {selectedWidget && (
          <PropertiesPanel
            widget={selectedWidget}
            onChange={updateWidget}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        height: 36, background: '#fff', borderTop: '1px solid var(--pl-border)',
        display: 'flex', alignItems: 'center', padding: '0 16px',
        justifyContent: 'space-between', flexShrink: 0, fontSize: 12,
      }}>
        <Text style={{ fontSize: 12, color: '#888' }}>
          {widgets.length} widgets
        </Text>
        {(() => {
          const effectiveSync = isStoreMode ? plannerStore.syncStatus : syncStatus
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {effectiveSync === 'saving' ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                  <Text style={{ fontSize: 12, color: '#888' }}>Guardando...</Text>
                </>
              ) : effectiveSync === 'saved' ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                  <Text style={{ fontSize: 12, color: '#888' }}>Sincronizado{!isStoreMode && lastSync ? ` · ${lastSync}` : ''}</Text>
                </>
              ) : (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB', display: 'inline-block' }} />
                  <Text style={{ fontSize: 12, color: '#aaa' }}>Sin cambios</Text>
                </>
              )}
            </div>
          )
        })()}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="text" size="small" icon={<MinusOutlined />}
            onClick={() => setZoom((z) => Math.max(25, z - 10))}
            style={{ width: 24, height: 24, padding: 0 }} />
          <Text style={{ fontSize: 12, minWidth: 40, textAlign: 'center', color: '#555' }}>{zoom}%</Text>
          <Button type="text" size="small" icon={<PlusOutlined />}
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            style={{ width: 24, height: 24, padding: 0 }} />
        </div>
      </div>
    </div>
  )
}

// ── Portal access panel (shown in Lienzo del cliente tab) ─────────────────────
function PortalAccessPanel({ eventId }: { eventId: string }) {
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accessCreated, setAccessCreated] = useState(false)
  const [portalEmail, setPortalEmail] = useState('')
  const [form] = Form.useForm()

  const portalUrl = `${window.location.origin}/portal-cliente/${eventId}`

  async function handleCreate(values: any) {
    setSaving(true)
    try {
      await eventsApi.createPortalDirectAccess(eventId, values)
      setPortalEmail(values.email)
      setAccessCreated(true)
      message.success('Acceso al portal creado correctamente')
      setModalOpen(false)
      form.resetFields()
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Error al crear acceso')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{
        background: 'linear-gradient(90deg, #f3f0ff 0%, #ede9fe 100%)',
        borderBottom: '1px solid #ddd6fe',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <LinkOutlined style={{ color: '#7C3AED', fontSize: 15 }} />
          <Text style={{ fontSize: 12, color: '#5b21b6', fontWeight: 600 }}>
            Portal del cliente
          </Text>
          {accessCreated && (
            <Tag color="green" style={{ fontSize: 11, margin: 0 }}>Acceso activo</Tag>
          )}
          {accessCreated && (
            <Text style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>
              {portalEmail}
            </Text>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {accessCreated && (
            <>
              <Text
                copyable={{ text: portalUrl }}
                style={{ fontSize: 11, color: '#7C3AED', maxWidth: 260,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {portalUrl}
              </Text>
              <Button
                size="small"
                icon={<LinkOutlined />}
                onClick={() => window.open(portalUrl, '_blank')}
                style={{ fontSize: 11 }}
              >
                Abrir portal
              </Button>
            </>
          )}
          <Button
            size="small"
            type={accessCreated ? 'default' : 'primary'}
            icon={<EditOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ fontSize: 11,
              ...(accessCreated ? {} : { background: '#7C3AED', borderColor: '#7C3AED' }) }}
          >
            {accessCreated ? 'Actualizar acceso' : 'Crear acceso al portal'}
          </Button>
        </div>
      </div>

      <Modal
        title={<span><LinkOutlined style={{ color: '#7C3AED', marginRight: 8 }} />Acceso al portal del cliente</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Crear acceso"
        confirmLoading={saving}
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        width={420}
      >
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: '#666' }}>
            El cliente podrá acceder al lienzo desde:<br />
            <a href={portalUrl} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', wordBreak: 'break-all' }}>
              {portalUrl}
            </a>
          </Text>
        </div>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Form.Item name="firstName" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
              <Input placeholder="Juan" />
            </Form.Item>
            <Form.Item name="lastName" label="Apellido" rules={[{ required: true, message: 'Requerido' }]}>
              <Input placeholder="García" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email válido requerido' }]}>
            <Input placeholder="cliente@email.com" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}>
            <Input.Password placeholder="Contraseña de acceso" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Outer page with tabs ────────────────────────────────────────────────────────
export default function LienzoPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const [activeTab, setActiveTab] = useState<string>('evento')

  const tabs = [
    { key: 'evento',   label: 'Lienzo del evento' },
    { key: 'cliente',  label: 'Lienzo del cliente' },
    { key: 'invitado', label: 'Lienzo del invitado' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid var(--pl-border)',
        padding: '0 16px', flexShrink: 0,
        boxShadow: '0 1px 4px rgba(124,58,237,0.04)',
      }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? 'var(--pl-primary)' : '#666',
                borderBottom: activeTab === tab.key ? '2px solid var(--pl-primary)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Portal access panel — only in cliente tab */}
      {activeTab === 'cliente' && <PortalAccessPanel eventId={id} />}

      {/* Canvas — remount on tab change via key prop */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {activeTab === 'evento' && (
          <LienzoCanvas key="evento" eventId={id} event={event} />
        )}
        {activeTab === 'cliente' && (
          <LienzoCanvas key="cliente" eventId={id} event={event} storeKey="lienzo-cliente" />
        )}
        {activeTab === 'invitado' && (
          <LienzoCanvas key="invitado" eventId={id} event={event} storeKey="lienzo-invitado" />
        )}
      </div>
    </div>
  )
}
