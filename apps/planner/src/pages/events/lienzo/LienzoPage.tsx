import { useState, useRef, useCallback } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import {
  Button, Tooltip, Typography, Tag, Avatar, Checkbox, Divider,
  Input, Switch, InputNumber, Modal, Spin, Alert, App, Upload,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  SelectOutlined, DragOutlined, AppstoreAddOutlined, FileTextOutlined,
  FontSizeOutlined, PictureOutlined, PlusOutlined, MinusOutlined,
  CloseOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  UploadOutlined, SearchOutlined, DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../../api/events'
import { resourcesApi } from '../../../api/resources'

const { Text, Title } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
type WidgetType = 'portada' | 'tareas' | 'proveedores' | 'nota' | 'texto' | 'imagen'

interface Widget {
  id: string
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  config: Record<string, any>
}

type Tool = 'select' | 'pan' | 'widget' | 'nota' | 'texto' | 'imagen'

// ── Initial widgets ────────────────────────────────────────────────────────────
const makeDefaultWidgets = (): Widget[] => [
  { id: 'w1', type: 'portada',     x: 24,  y: 20,  w: 420, h: 200, config: { showHeader: true, shadow: true, padding: 14, color: '#7C3AED' } },
  { id: 'w2', type: 'tareas',      x: 24,  y: 244, w: 380, h: 280, config: { title: 'Tareas urgentes' } },
  { id: 'w3', type: 'proveedores', x: 424, y: 244, w: 300, h: 280, config: { title: 'Proveedores activos' } },
]

// ── Widget renderers ───────────────────────────────────────────────────────────
function PortadaWidget({ event }: { event: any }) {
  const daysUntil = event?.eventStart
    ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day'))
    : null

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden',
      background: 'linear-gradient(135deg, #F97316 0%, #EC4899 50%, #7C3AED 100%)',
      padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      color: '#fff', userSelect: 'none',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, letterSpacing: '0.06em', marginBottom: 6 }}>
          {event?.eventType || 'EVENTO'} · {event?.code || '—'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
          {event?.name || 'Sin nombre'}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, opacity: 0.85 }}>
          {event?.venueLocation && <span>📍 {event.venueLocation}</span>}
          {event?.eventStart && <span>📅 {dayjs(event.eventStart).format('D MMM YYYY')}</span>}
        </div>
      </div>
      {daysUntil !== null && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>FALTAN</div>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{daysUntil}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>días para el evento</div>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.85 }}>
            <div style={{ fontSize: 11 }}>Asistentes</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {event?.expectedAttendance ? `0/${event.expectedAttendance}` : '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MOCK_TASKS = [
  { id: '1', title: 'Diseño de invitación digital v3', dept: 'Diseño · PL', days: 3, urgent: true },
  { id: '2', title: 'Recorrido técnico en venue con DJ y AV', dept: 'Producción · JC', days: 7, urgent: false },
  { id: '3', title: 'Pago anticipo Flores del Valle', dept: 'Pagos · MR', days: 2, urgent: true },
  { id: '4', title: 'Revisar propuesta de seating chart (v2)', dept: 'Cliente · AF', days: 5, urgent: false },
]

function TareasWidget() {
  const [checked, setChecked] = useState<string[]>([])
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
        {MOCK_TASKS.map((task) => (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
            borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF',
          }}>
            <Checkbox
              checked={checked.includes(task.id)}
              onChange={(e) => setChecked(e.target.checked
                ? [...checked, task.id]
                : checked.filter((x) => x !== task.id))}
              style={{ marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: checked.includes(task.id) ? '#aaa' : '#1a1a1a',
                textDecoration: checked.includes(task.id) ? 'line-through' : 'none',
              }}>{task.title}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{task.dept}</div>
            </div>
            <Tag style={{
              background: task.days <= 2 ? '#FEF2F2' : task.days <= 4 ? '#FFF7ED' : '#F0F9FF',
              color: task.days <= 2 ? '#DC2626' : task.days <= 4 ? '#D97706' : '#2563EB',
              border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600,
            }}>{task.days}d</Tag>
          </div>
        ))}
      </div>
    </div>
  )
}

const MOCK_SUPPLIERS = [
  { id: '1', name: 'Flores del Valle', cat: 'Florería', initials: 'FV', color: '#0D9488' },
  { id: '2', name: 'Catering Aurora', cat: 'Catering', initials: 'CA', color: '#7C3AED' },
  { id: '3', name: 'DJ Estelar', cat: 'Audio · DJ', initials: 'DJ', color: '#F97316' },
  { id: '4', name: 'Carpas y Más', cat: 'Mobiliario', initials: 'CM', color: '#EC4899' },
  { id: '5', name: 'Fotografía Luz', cat: 'Foto · Video', initials: 'FL', color: '#2563EB' },
]

function ProveedoresWidget() {
  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 13, color: '#1a1a1a' }}>PROVEEDORES ACTIVOS</Text>
        <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: 'var(--pl-primary)' }} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MOCK_SUPPLIERS.map((s) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF',
          }}>
            <Avatar size={32} style={{ background: s.color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {s.initials}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{s.cat}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0EBFF',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: '#888' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block', marginRight: 4 }} />
          Sincronizado · {dayjs().format('HH:mm')}
        </Text>
      </div>
    </div>
  )
}

function NotaWidget({ config }: { config: any }) {
  return (
    <div style={{
      width: '100%', height: '100%', padding: 16, borderRadius: 12,
      background: config.color || '#FFF9C4', userSelect: 'none',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>📝 Nota</div>
      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>
        {config.text || 'Doble click para editar...'}
      </div>
    </div>
  )
}

function TextoWidget({ config }: { config: any }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', alignItems: 'center', userSelect: 'none' }}>
      <div style={{ fontSize: config.fontSize || 16, fontWeight: config.bold ? 700 : 400, color: config.color || '#1a1a1a' }}>
        {config.text || 'Texto libre...'}
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

function WidgetRenderer({
  widget, event, onConfigChange,
}: {
  widget: Widget
  event: any
  onConfigChange: (id: string, patch: Record<string, any>) => void
}) {
  switch (widget.type) {
    case 'portada':     return <PortadaWidget event={event} />
    case 'tareas':      return <TareasWidget />
    case 'proveedores': return <ProveedoresWidget />
    case 'nota':        return <NotaWidget config={widget.config} />
    case 'texto':       return <TextoWidget config={widget.config} />
    case 'imagen':      return (
      <ImagenWidget
        config={widget.config}
        onConfigChange={(patch) => onConfigChange(widget.id, { config: { ...widget.config, ...patch } })}
      />
    )
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
    nota: 'Nota', texto: 'Texto', imagen: 'Imagen',
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

// ── Widget add menu ──────────────────────────────────────────────────────────────
const WIDGET_MENU: { type: WidgetType; label: string; icon: React.ReactNode; defaultSize: [number, number] }[] = [
  { type: 'portada', label: 'Portada del evento', icon: <AppstoreAddOutlined />, defaultSize: [420, 200] },
  { type: 'tareas', label: 'Tareas urgentes', icon: <CheckCircleOutlined />, defaultSize: [380, 280] },
  { type: 'proveedores', label: 'Proveedores activos', icon: <ExclamationCircleOutlined />, defaultSize: [300, 280] },
  { type: 'nota', label: 'Nota', icon: <FileTextOutlined />, defaultSize: [240, 180] },
  { type: 'texto', label: 'Texto', icon: <FontSizeOutlined />, defaultSize: [280, 80] },
  { type: 'imagen', label: 'Imagen', icon: <PictureOutlined />, defaultSize: [300, 200] },
]

// ── Main page ───────────────────────────────────────────────────────────────────
export default function LienzoPage() {
  const { id } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()

  const [widgets, setWidgets] = useState<Widget[]>(makeDefaultWidgets)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [lastSync] = useState(dayjs().format('HH:mm'))

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

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan') {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    } else {
      setSelectedId(null)
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
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
    { key: 'widget', label: 'Widget', icon: <AppstoreAddOutlined />, shortcut: 'R' },
    { key: 'nota', label: 'Nota', icon: <FileTextOutlined />, shortcut: 'N' },
    { key: 'texto', label: 'Texto', icon: <FontSizeOutlined />, shortcut: 'T' },
    { key: 'imagen', label: 'Imagen', icon: <PictureOutlined />, shortcut: 'I' },
  ]

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
            cursor: tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair',
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
                  <WidgetRenderer widget={w} event={event} onConfigChange={updateWidget} />

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
          <Text style={{ fontSize: 12, color: '#888' }}>Sincronizado · {lastSync}</Text>
        </div>
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
