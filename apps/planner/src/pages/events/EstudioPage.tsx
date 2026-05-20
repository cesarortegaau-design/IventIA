/**
 * EstudioPage.tsx
 * Estudio del evento: Moodboard · Arte · Banner · IA Diseñadora (con visión)
 * Branding persiste en localStorage: iventia-branding-{eventId}
 */
import { useState, useRef } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { usePlannerStore } from '../../hooks/usePlannerStore'
import {
  Button, Input, Select, App, Typography, Tag, Modal, Spin, Upload, Tooltip,
} from 'antd'
import {
  RobotOutlined, BulbOutlined, SendOutlined, CheckOutlined,
  ClearOutlined, ThunderboltOutlined, PictureOutlined, UploadOutlined,
  SearchOutlined, LinkOutlined, EyeOutlined, AppstoreOutlined,
} from '@ant-design/icons'
import { aiApi } from '../../api/ai'
import { resourcesApi } from '../../api/resources'
import dayjs from 'dayjs'

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
export interface EventBranding {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  bgColor: string
  textOnBg: string
  fontStyle: string
  coverStyle: string
  tagline: string
  mood: string[]
  bannerUrl: string       // URL de imagen de banner/portada
  updatedAt: string
}

export const DEFAULT_BRANDING: EventBranding = {
  primaryColor: '#7C3AED',
  secondaryColor: '#EC4899',
  accentColor: '#F97316',
  bgColor: '#F5F3FF',
  textOnBg: '#ffffff',
  fontStyle: 'modern',
  coverStyle: 'gradient',
  tagline: '',
  mood: [],
  bannerUrl: '',
  updatedAt: '',
}

// ── Persistence ────────────────────────────────────────────────────────────────
export const brandingKey = (eventId: string) => `iventia-branding-${eventId}`

export function loadBranding(eventId: string): EventBranding {
  try {
    const raw = localStorage.getItem(brandingKey(eventId))
    if (raw) return { ...DEFAULT_BRANDING, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_BRANDING }
}

function saveBranding(eventId: string, b: EventBranding) {
  localStorage.setItem(brandingKey(eventId), JSON.stringify({ ...b, updatedAt: new Date().toISOString() }))
}

// ── Palette presets ───────────────────────────────────────────────────────────
const PALETTES = [
  { name: 'Romance clásico',     primary: '#C2185B', secondary: '#F48FB1', accent: '#FFD700', bg: '#FFF5F7', text: '#ffffff', tags: ['romántico', 'bodas'] },
  { name: 'Bosque encantado',    primary: '#2E7D32', secondary: '#81C784', accent: '#FFF176', bg: '#F1F8E9', text: '#ffffff', tags: ['natural', 'jardín'] },
  { name: 'Noche estelar',       primary: '#3949AB', secondary: '#7986CB', accent: '#FFD54F', bg: '#1A237E', text: '#ffffff', tags: ['gala', 'elegante'] },
  { name: 'Coral vibrante',      primary: '#F4511E', secondary: '#FFAB91', accent: '#29B6F6', bg: '#FFF8F6', text: '#ffffff', tags: ['festivo', 'tropical'] },
  { name: 'Corporativo azul',    primary: '#0077B6', secondary: '#90E0EF', accent: '#48CAE4', bg: '#EFF6FF', text: '#ffffff', tags: ['corporativo', 'conferencia'] },
  { name: 'Morado creativo',     primary: '#7C3AED', secondary: '#EC4899', accent: '#F97316', bg: '#F5F3FF', text: '#ffffff', tags: ['creativo', 'moderno'] },
  { name: 'Dorado lujoso',       primary: '#B7791F', secondary: '#F6E05E', accent: '#1a1a1a', bg: '#FFFFF0', text: '#1a1a1a', tags: ['lujo', 'premium', 'gala'] },
  { name: 'Mint fresco',         primary: '#0D9488', secondary: '#5EEAD4', accent: '#F59E0B', bg: '#F0FDFA', text: '#ffffff', tags: ['fresco', 'primavera'] },
  { name: 'Rosa millennial',     primary: '#EC4899', secondary: '#F9A8D4', accent: '#8B5CF6', bg: '#FFF0F6', text: '#ffffff', tags: ['festivo', 'joven'] },
  { name: 'Negro elegante',      primary: '#111827', secondary: '#374151', accent: '#D97706', bg: '#111827', text: '#ffffff', tags: ['minimalista', 'premium'] },
  { name: 'Terracota cálida',    primary: '#9A3412', secondary: '#FDBA74', accent: '#78350F', bg: '#FFF7ED', text: '#ffffff', tags: ['cálido', 'otoño'] },
  { name: 'Lila romántico',      primary: '#9333EA', secondary: '#E879F9', accent: '#F472B6', bg: '#FAF5FF', text: '#ffffff', tags: ['romántico', 'artístico'] },
]

// ── Event-type templates ─────────────────────────────────────────────────────
const EVENT_TEMPLATES = [
  {
    type: 'WEDDING', label: 'Boda', emoji: '💍',
    primary: '#C2185B', secondary: '#F48FB1', accent: '#FFD700', bg: '#FFF5F7', text: '#ffffff',
    fontStyle: 'elegant', coverStyle: 'gradient', tagline: 'El inicio de una historia de amor',
    mood: ['Romántico', 'Elegante', 'Lujoso'],
  },
  {
    type: 'CORPORATE', label: 'Corporativo', emoji: '🏢',
    primary: '#0077B6', secondary: '#90E0EF', accent: '#48CAE4', bg: '#EFF6FF', text: '#ffffff',
    fontStyle: 'modern', coverStyle: 'solid', tagline: 'Innovación y excelencia empresarial',
    mood: ['Corporativo', 'Minimalista', 'Urbano'],
  },
  {
    type: 'CONCERT', label: 'Concierto', emoji: '🎵',
    primary: '#111827', secondary: '#374151', accent: '#D97706', bg: '#111827', text: '#ffffff',
    fontStyle: 'bold', coverStyle: 'dark', tagline: 'Una noche que no olvidarás',
    mood: ['Festivo', 'Urbano', 'Artístico'],
  },
  {
    type: 'BIRTHDAY', label: 'Cumpleaños', emoji: '🎂',
    primary: '#EC4899', secondary: '#F9A8D4', accent: '#8B5CF6', bg: '#FFF0F6', text: '#ffffff',
    fontStyle: 'playful', coverStyle: 'gradient', tagline: 'Celebrando un año más de vida',
    mood: ['Festivo', 'Joven', 'Artístico'],
  },
  {
    type: 'GALA', label: 'Gala / Awards', emoji: '🏆',
    primary: '#B7791F', secondary: '#F6E05E', accent: '#1a1a1a', bg: '#FFFFF0', text: '#1a1a1a',
    fontStyle: 'elegant', coverStyle: 'split', tagline: 'La noche donde se celebra la excelencia',
    mood: ['Elegante', 'Lujoso', 'Festivo'],
  },
  {
    type: 'OUTDOOR', label: 'Outdoor / Festival', emoji: '🌿',
    primary: '#2E7D32', secondary: '#81C784', accent: '#FFF176', bg: '#F1F8E9', text: '#ffffff',
    fontStyle: 'playful', coverStyle: 'gradient', tagline: 'Bajo el sol y las estrellas',
    mood: ['Natural', 'Festivo', 'Tropical'],
  },
  {
    type: 'CONFERENCE', label: 'Conferencia', emoji: '🎤',
    primary: '#3949AB', secondary: '#7986CB', accent: '#FFD54F', bg: '#EFF6FF', text: '#ffffff',
    fontStyle: 'bold', coverStyle: 'solid', tagline: 'Ideas que transforman el futuro',
    mood: ['Corporativo', 'Urbano', 'Minimalista'],
  },
  {
    type: 'QUINCEAÑERA', label: 'Quinceañera', emoji: '👑',
    primary: '#9333EA', secondary: '#E879F9', accent: '#F472B6', bg: '#FAF5FF', text: '#ffffff',
    fontStyle: 'elegant', coverStyle: 'gradient', tagline: 'El día que marca el inicio de tu historia',
    mood: ['Romántico', 'Lujoso', 'Artístico'],
  },
]

// ── Font styles ───────────────────────────────────────────────────────────────
const FONT_STYLES = [
  { key: 'modern',   name: 'Moderno',     heading: "'Plus Jakarta Sans', sans-serif", sample: 'Aa', desc: 'Sans-serif limpio' },
  { key: 'classic',  name: 'Clásico',     heading: 'Georgia, serif',                 sample: 'Aa', desc: 'Serif tradicional' },
  { key: 'elegant',  name: 'Elegante',    heading: "'Didact Gothic', serif",          sample: 'Aa', desc: 'Refinado y sofisticado' },
  { key: 'bold',     name: 'Impactante',  heading: "'Montserrat', sans-serif",        sample: 'Aa', desc: 'Fuerte y directo' },
  { key: 'playful',  name: 'Festivo',     heading: "'Pacifico', cursive",             sample: 'Aa', desc: 'Divertido y libre' },
]

const fontHeadingMap: Record<string, string> = {
  modern:  "'Plus Jakarta Sans', sans-serif",
  classic: 'Georgia, serif',
  elegant: "'Didact Gothic', sans-serif",
  bold:    "'Montserrat', sans-serif",
  playful: "cursive",
}

// ── Cover styles ──────────────────────────────────────────────────────────────
const COVER_STYLES = [
  { key: 'gradient', name: 'Degradado',   desc: 'Transición suave' },
  { key: 'split',    name: 'Dividido',    desc: 'Dos colores mitad y mitad' },
  { key: 'solid',    name: 'Sólido',      desc: 'Color primario puro' },
  { key: 'dark',     name: 'Oscuro',      desc: 'Fondo elegante con acento' },
  { key: 'image',    name: 'Imagen',      desc: 'Banner fotográfico' },
]

const MOOD_TAGS = [
  'Romántico', 'Festivo', 'Elegante', 'Corporativo', 'Natural',
  'Minimalista', 'Lujoso', 'Artístico', 'Tropical', 'Urbano',
]

// ── Cover background builder ──────────────────────────────────────────────────
function coverBg(b: EventBranding) {
  switch (b.coverStyle) {
    case 'gradient': return `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.secondaryColor} 100%)`
    case 'split':    return `linear-gradient(90deg, ${b.primaryColor} 50%, ${b.secondaryColor} 50%)`
    case 'solid':    return b.primaryColor
    case 'dark':     return '#0D0D1A'
    case 'image':    return b.bannerUrl ? undefined : `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})`
    default:         return `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})`
  }
}

// ── Image Search Modal (Unsplash + URL + Upload) ───────────────────────────────
function ImagePickerModal({
  open, onClose, onSelect, title = 'Seleccionar imagen',
}: {
  open: boolean
  onClose: () => void
  onSelect: (url: string, base64?: string, mimeType?: string) => void
  title?: string
}) {
  const { message } = App.useApp()
  const [tab, setTab] = useState<'search' | 'url' | 'upload'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [unsplashKey, setUnsplashKey] = useState<string | null | undefined>(undefined)
  const [selected, setSelected] = useState<string | null>(null)
  const [pastedUrl, setPastedUrl] = useState('')
  const [uploadPreview, setUploadPreview] = useState<{ url: string; base64: string; mimeType: string } | null>(null)

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
    setSelected(null); setPastedUrl(''); setResults([]); setQuery('')
    setUnsplashKey(undefined); setUploadPreview(null)
    onClose()
  }

  return (
    <Modal title={title} open={open} onCancel={handleClose} footer={null} width={700}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'search', label: 'Buscar Unsplash', icon: <SearchOutlined /> },
          { key: 'upload', label: 'Subir imagen', icon: <UploadOutlined /> },
          { key: 'url', label: 'Pegar URL', icon: <LinkOutlined /> },
        ].map((t) => (
          <Button key={t.key} type={tab === t.key ? 'primary' : 'default'} icon={t.icon}
            onClick={() => setTab(t.key as any)}
            style={tab === t.key ? { background: '#7C3AED', borderColor: '#7C3AED' } : {}}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === 'upload' && (
        <div>
          <Upload.Dragger
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              const reader = new FileReader()
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string
                const base64 = dataUrl.split(',')[1]
                setUploadPreview({ url: dataUrl, base64, mimeType: file.type })
              }
              reader.readAsDataURL(file)
              return false
            }}
            style={{ marginBottom: 12, borderRadius: 10 }}
          >
            <div style={{ padding: '20px 0' }}>
              <UploadOutlined style={{ fontSize: 32, color: '#7C3AED', display: 'block', marginBottom: 8 }} />
              <div style={{ fontWeight: 600, color: '#374151' }}>Arrastra o haz clic para subir</div>
              <div style={{ fontSize: 12, color: '#888' }}>JPG, PNG, WebP · máx 5MB</div>
            </div>
          </Upload.Dragger>
          {uploadPreview && (
            <>
              <img src={uploadPreview.url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />
              <Button type="primary" block
                onClick={() => { onSelect(uploadPreview.url, uploadPreview.base64, uploadPreview.mimeType); handleClose() }}
                style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 10 }}>
                Usar esta imagen
              </Button>
            </>
          )}
        </div>
      )}

      {/* URL tab */}
      {tab === 'url' && (
        <div>
          <Input placeholder="https://ejemplo.com/imagen.jpg" value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)} style={{ marginBottom: 12, borderRadius: 10 }} />
          {pastedUrl && (
            <img src={pastedUrl} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          <Button type="primary" block disabled={!pastedUrl.trim()}
            onClick={() => { onSelect(pastedUrl.trim()); handleClose() }}
            style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 10 }}>
            Usar esta imagen
          </Button>
        </div>
      )}

      {/* Unsplash tab */}
      {tab === 'search' && (
        <>
          <Input.Search
            placeholder="Ej: wedding venue, corporate event, outdoor festival..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSearch={handleSearch}
            enterButton={
              <Button type="primary" style={{ background: '#7C3AED', borderColor: '#7C3AED' }}
                loading={loading} disabled={!unsplashKey}>
                Buscar
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
          {unsplashKey === null && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: '#92400E' }}>
              Unsplash no configurado. Usa la pestaña "Subir imagen" o "Pegar URL".
            </div>
          )}
          {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}
          {!loading && results.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                {results.map((img: any) => (
                  <div key={img.id} onClick={() => setSelected(img.urls.regular)}
                    style={{
                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      border: selected === img.urls.regular ? '2px solid #7C3AED' : '2px solid transparent',
                      position: 'relative',
                    }}>
                    <img src={img.urls.thumb} alt={img.alt_description || ''}
                      style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                    {selected === img.urls.regular && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#7C3AED', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckOutlined style={{ color: '#fff', fontSize: 10 }} />
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.45)', padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.user?.name}
                    </div>
                  </div>
                ))}
              </div>
              {selected && (
                <Button type="primary" block onClick={() => { onSelect(selected!); handleClose() }}
                  style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 10 }}>
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

// ── Live Preview ──────────────────────────────────────────────────────────────
function CoverPreview({ branding, event }: { branding: EventBranding; event: any }) {
  const bg = coverBg(branding)
  const hasBanner = branding.coverStyle === 'image' && branding.bannerUrl
  const isDark = branding.coverStyle === 'dark' || hasBanner || branding.textOnBg === '#ffffff'
  const textColor = isDark ? '#ffffff' : '#1a1a1a'
  const mutedColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'
  const font = fontHeadingMap[branding.fontStyle] || fontHeadingMap.modern
  const daysUntil = event?.eventStart ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day')) : null
  const accentBar = branding.accentColor

  const containerStyle: React.CSSProperties = {
    borderRadius: 20,
    padding: '32px 36px',
    marginBottom: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    minHeight: 260,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...(hasBanner
      ? { backgroundImage: `url(${branding.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: bg }),
  }

  return (
    <div>
      <div style={containerStyle}>
        {/* Dark overlay for banner images */}
        {hasBanner && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.7) 100%)', borderRadius: 20 }} />
        )}
        {/* Accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: accentBar, borderRadius: '20px 20px 0 0', zIndex: 2 }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {branding.mood.slice(0, 2).map(m => (
              <span key={m} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 20, backdropFilter: 'blur(8px)' }}>{m}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: mutedColor, letterSpacing: '0.1em', marginBottom: 8 }}>
            {event?.eventType || 'EVENTO'} · {event?.code || '—'}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: textColor, fontFamily: font, lineHeight: 1.15, marginBottom: 6 }}>
            {event?.name || 'Nombre del evento'}
          </div>
          {branding.tagline && (
            <div style={{ fontSize: 14, color: mutedColor, fontStyle: 'italic', fontFamily: font }}>
              "{branding.tagline}"
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24, position: 'relative', zIndex: 2 }}>
          <div>
            {event?.eventStart && (
              <div style={{ color: mutedColor, fontSize: 12, marginBottom: 2 }}>📅 {dayjs(event.eventStart).format('D MMM YYYY')}</div>
            )}
            {event?.venueLocation && (
              <div style={{ color: mutedColor, fontSize: 12 }}>📍 {event.venueLocation}</div>
            )}
          </div>
          {daysUntil !== null && daysUntil >= 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: mutedColor, fontSize: 10, marginBottom: 2 }}>FALTAN</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: textColor, lineHeight: 1, fontFamily: font }}>{daysUntil}</div>
              <div style={{ color: mutedColor, fontSize: 11 }}>días</div>
            </div>
          )}
        </div>
      </div>

      {/* PDF header mini preview */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: 8, ...(hasBanner ? { backgroundImage: `url(${branding.bannerUrl})`, backgroundSize: 'cover' } : { background: bg }) }} />
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0, fontFamily: font, overflow: 'hidden', ...(hasBanner ? { backgroundImage: `url(${branding.bannerUrl})`, backgroundSize: 'cover' } : {}) }}>
            {!hasBanner && (event?.name || 'E')[0]}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: font, color: '#1a1a1a' }}>{event?.name || 'Nombre del evento'}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{branding.tagline || 'Tagline del evento'}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {[branding.primaryColor, branding.secondaryColor, branding.accentColor].map((c, i) => (
              <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
            ))}
          </div>
        </div>
        <div style={{ padding: '4px 16px 10px', fontSize: 10, color: '#aaa' }}>Vista previa: cabecera PDF · portal del cliente</div>
      </div>

      {/* Color swatches */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 10 }}>PALETA DEL EVENTO</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Principal', color: branding.primaryColor },
            { label: 'Secundario', color: branding.secondaryColor },
            { label: 'Acento', color: branding.accentColor },
          ].map(({ label, color }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 44, borderRadius: 10, background: color, marginBottom: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
              <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 9, color: '#aaa', fontFamily: 'monospace' }}>{color}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Parse AI image analysis response ─────────────────────────────────────────
function parseImageAnalysis(text: string) {
  const get = (key: string) => {
    const m = text.match(new RegExp(`${key}:\\s*(.+)`, 'i'))
    return m?.[1]?.trim() ?? null
  }
  return {
    primary:     get('PRIMARY'),
    secondary:   get('SECONDARY'),
    accent:      get('ACCENT'),
    bg:          get('FONDO'),
    textOnBg:    get('TEXTO')?.toLowerCase().includes('oscuro') ? '#1a1a1a' : '#ffffff',
    coverStyle:  (() => {
      const s = get('ESTILO_PORTADA') ?? ''
      if (s.includes('solid') || s.includes('sólido')) return 'solid'
      if (s.includes('divid')) return 'split'
      if (s.includes('oscur') || s.includes('dark')) return 'dark'
      return 'gradient'
    })(),
    fontStyle:   (() => {
      const s = get('TIPOGRAFIA') ?? ''
      if (s.includes('clás')) return 'classic'
      if (s.includes('eleg')) return 'elegant'
      if (s.includes('impact') || s.includes('bold')) return 'bold'
      if (s.includes('festiv') || s.includes('play')) return 'playful'
      return 'modern'
    })(),
    mood:        get('MOOD')?.split(',').map(m => m.trim()).filter(Boolean) ?? [],
    tagline:     get('TAGLINE') ?? '',
    description: get('DESCRIPCION') ?? '',
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EstudioPage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  const { store: branding, update: updateBranding, syncStatus } = usePlannerStore<EventBranding>(
    eventId, 'branding', { ...DEFAULT_BRANDING }, `iventia-branding-${eventId}`,
  )
  const [activeTab, setActiveTab] = useState<'moodboard' | 'plantillas' | 'arte' | 'banner' | 'ia'>('moodboard')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiNotes, setAiNotes] = useState('')
  const [saved, setSaved] = useState(false)

  // Image picker modals
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false)
  const [refImagePickerOpen, setRefImagePickerOpen] = useState(false)

  // Reference image for AI analysis
  const [refImage, setRefImage] = useState<{ url: string; base64?: string; mimeType?: string } | null>(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null)

  const update = (patch: Partial<EventBranding>) => {
    updateBranding(patch)
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    message.success('Estilo del evento guardado')
    setTimeout(() => setSaved(false), 2500)
  }

  const toggleMood = (m: string) => {
    const moods = branding.mood.includes(m)
      ? branding.mood.filter(x => x !== m)
      : [...branding.mood, m]
    update({ mood: moods })
  }

  // ── AI Design (text-based) ─────────────────────────────────────────────────
  const handleAiDesign = async () => {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await aiApi.generateEventConcept({
        eventName: event?.name || 'Evento',
        eventType: event?.eventType || 'OTHER',
        guestCount: event?.guestCount || 100,
        notes: `Soy diseñador de eventos. Necesito sugerencias de DISEÑO VISUAL.
Por favor proporciona en formato estructurado:
1. PALETA DE COLORES: 3 colores hex (#xxxxxx) con roles (principal, secundario, acento)
2. TIPOGRAFÍA: estilo recomendado (moderno/clásico/elegante/impactante/festivo) y por qué
3. ESTILO DE PORTADA: (degradado/sólido/dividido/oscuro) y por qué encaja
4. TAGLINE creativo para el evento (máximo 12 palabras)
5. MOOD/AMBIENTE en 3 palabras
${aiNotes ? `\nContexto adicional: ${aiNotes}` : ''}`,
      })
      const content = res.data?.result || res.result || res.content || ''
      setAiResult(content)

      const hexMatches = content.match(/#[0-9A-Fa-f]{6}/g)
      if (hexMatches && hexMatches.length >= 2) {
        const [p, s, a] = hexMatches
        update({ primaryColor: p, secondaryColor: s, accentColor: a || branding.accentColor })
        message.success('Paleta de colores aplicada desde IA')
      }

      const taglineMatch = content.match(/TAGLINE[:\s]+["»]?(.+?)["«]?\n/i)
      if (taglineMatch?.[1]) {
        update({ tagline: taglineMatch[1].trim().replace(/["'"]/g, '') })
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Error al generar sugerencia')
    } finally {
      setAiLoading(false)
    }
  }

  // ── AI Image Analysis (Claude Vision) ─────────────────────────────────────
  const handleAnalyzeImage = async () => {
    if (!refImage) return
    setAnalyzeLoading(true)
    setAnalyzeResult(null)
    try {
      const commonParams = {
        eventType: event?.eventType || '',
        eventName: event?.name || '',
      }

      let res: any
      if (refImage.url && !refImage.base64) {
        // Unsplash or remote URL — let backend fetch it (avoids CORS + large buffer issues)
        res = await aiApi.analyzeImage({ imageUrl: refImage.url, mimeType: 'image/jpeg', ...commonParams })
      } else if (refImage.base64) {
        // Local upload — send base64
        res = await aiApi.analyzeImage({ imageBase64: refImage.base64, mimeType: refImage.mimeType || 'image/jpeg', ...commonParams })
      } else {
        throw new Error('No se pudo obtener la imagen')
      }

      const text = res.data?.result || res.result || ''
      setAnalyzeResult(text)

      // Auto-apply extracted values
      const parsed = parseImageAnalysis(text)
      const patch: Partial<EventBranding> = {}
      if (parsed.primary?.match(/^#[0-9A-Fa-f]{6}$/)) patch.primaryColor = parsed.primary
      if (parsed.secondary?.match(/^#[0-9A-Fa-f]{6}$/)) patch.secondaryColor = parsed.secondary
      if (parsed.accent?.match(/^#[0-9A-Fa-f]{6}$/)) patch.accentColor = parsed.accent
      if (parsed.coverStyle) patch.coverStyle = parsed.coverStyle
      if (parsed.fontStyle) patch.fontStyle = parsed.fontStyle
      if (parsed.mood.length > 0) patch.mood = parsed.mood
      if (parsed.tagline) patch.tagline = parsed.tagline
      if (Object.keys(patch).length > 0) {
        update(patch)
        message.success('Diseño extraído de la imagen y aplicado')
      }
    } catch (err: any) {
      const detail = err?.response?.data?.error?.message || err?.response?.data?.error || err?.message || 'Error desconocido'
      message.error('Error al analizar imagen: ' + detail)
    } finally {
      setAnalyzeLoading(false)
    }
  }

  // ── Sidebar tab button ─────────────────────────────────────────────────────
  const tabBtn = (key: typeof activeTab, label: string, icon: string) => (
    <div onClick={() => setActiveTab(key)} style={{
      flex: 1, textAlign: 'center', padding: '8px 2px', cursor: 'pointer',
      fontWeight: activeTab === key ? 700 : 400, fontSize: 11,
      color: activeTab === key ? '#7C3AED' : '#6B7280',
      borderBottom: activeTab === key ? '2px solid #7C3AED' : '2px solid transparent',
      transition: 'all 0.15s', userSelect: 'none', whiteSpace: 'nowrap',
    }}>
      <div style={{ fontSize: 15, marginBottom: 2 }}>{icon}</div>
      {label}
    </div>
  )

  const colorInput = (label: string, key: keyof EventBranding) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="color" value={branding[key] as string}
          onChange={e => update({ [key]: e.target.value })}
          style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'none' }} />
        <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', fontWeight: 600 }}>{branding[key] as string}</div>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7FF' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EDE9FE', padding: '14px 24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(124,58,237,0.06)' }}>
        <div>
          <Text style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>Estudio del evento</Text>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
            Diseña la identidad visual · Se aplica al Lienzo, PDFs y Portal del cliente
          </div>
        </div>
        <Button type="primary" icon={saved ? <CheckOutlined /> : undefined}
          onClick={handleSave}
          style={{ background: saved ? '#059669' : '#7C3AED', borderColor: saved ? '#059669' : '#7C3AED', borderRadius: 8, fontWeight: 600, minWidth: 130 }}>
          {saved ? 'Guardado ✓' : 'Guardar estilo'}
        </Button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{ width: 370, flexShrink: 0, background: '#fff', borderRight: '1px solid #EDE9FE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid #EDE9FE', flexShrink: 0, overflowX: 'auto' }}>
            {tabBtn('moodboard',   'Paleta',      '🎨')}
            {tabBtn('plantillas',  'Plantillas',  '✨')}
            {tabBtn('arte',        'Arte',        '✏️')}
            {tabBtn('banner',      'Banner',      '🖼️')}
            {tabBtn('ia',          'IA',          '🤖')}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* ── MOODBOARD TAB ── */}
            {activeTab === 'moodboard' && (
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>
                  Elige una paleta base para el evento. Define los colores del Lienzo, PDFs y Portal.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {PALETTES.map(p => {
                    const isActive = branding.primaryColor === p.primary && branding.secondaryColor === p.secondary
                    return (
                      <div key={p.name} onClick={() => update({ primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent, bgColor: p.bg, textOnBg: p.text })}
                        style={{ borderRadius: 12, border: isActive ? '2px solid #7C3AED' : '1px solid #EDE9FE', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', boxShadow: isActive ? '0 0 0 3px #EDE9FE' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ height: 44, background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`, position: 'relative' }}>
                          <div style={{ position: 'absolute', right: 8, top: 8, width: 14, height: 14, borderRadius: '50%', background: p.accent, border: '2px solid rgba(255,255,255,0.6)' }} />
                        </div>
                        <div style={{ padding: '8px 10px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', marginBottom: 3 }}>{p.name}</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {p.tags.map(t => <span key={t} style={{ fontSize: 9, color: '#888', background: '#F3F4F6', padding: '1px 6px', borderRadius: 20 }}>{t}</span>)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ background: '#F8F7FF', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', marginBottom: 12 }}>PERSONALIZAR COLORES</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    {colorInput('PRINCIPAL', 'primaryColor')}
                    {colorInput('SECUNDARIO', 'secondaryColor')}
                    {colorInput('ACENTO', 'accentColor')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, letterSpacing: '0.08em', flexShrink: 0 }}>TEXTO SOBRE FONDO</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[{ v: '#ffffff', label: 'Claro' }, { v: '#1a1a1a', label: 'Oscuro' }].map(({ v, label }) => (
                        <div key={v} onClick={() => update({ textOnBg: v })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: branding.textOnBg === v ? '2px solid #7C3AED' : '1px solid #E5E7EB', cursor: 'pointer', fontSize: 11, fontWeight: branding.textOnBg === v ? 700 : 400, color: branding.textOnBg === v ? '#7C3AED' : '#555' }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: v, border: '1px solid #E5E7EB' }} /> {label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 8 }}>MOOD DEL EVENTO</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {MOOD_TAGS.map(m => {
                      const active = branding.mood.includes(m)
                      return (
                        <Tag key={m} onClick={() => toggleMood(m)} style={{ cursor: 'pointer', borderRadius: 20, border: active ? '1px solid #7C3AED' : '1px solid #E5E7EB', background: active ? '#EDE9FE' : '#fff', color: active ? '#7C3AED' : '#555', fontWeight: active ? 700 : 400, fontSize: 11, padding: '2px 10px' }}>
                          {m}
                        </Tag>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── PLANTILLAS TAB ── */}
            {activeTab === 'plantillas' && (
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>
                  Selecciona una plantilla por tipo de evento. Se aplica branding completo: colores, tipografía, estilo y tagline.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {EVENT_TEMPLATES.map(t => {
                    const isActive = branding.primaryColor === t.primary && branding.fontStyle === t.fontStyle
                    return (
                      <div key={t.type} onClick={() => update({
                        primaryColor: t.primary, secondaryColor: t.secondary,
                        accentColor: t.accent, bgColor: t.bg, textOnBg: t.text,
                        fontStyle: t.fontStyle, coverStyle: t.coverStyle,
                        tagline: t.tagline, mood: t.mood,
                      })} style={{
                        borderRadius: 12, overflow: 'hidden',
                        border: isActive ? '2px solid #7C3AED' : '1px solid #EDE9FE',
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: isActive ? '0 0 0 3px #EDE9FE' : 'none',
                      }}>
                        {/* Color bar */}
                        <div style={{ height: 48, background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
                          <span style={{ fontSize: 22 }}>{t.emoji}</span>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: fontHeadingMap[t.fontStyle] }}>{t.label}</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{t.coverStyle} · {t.fontStyle}</div>
                          </div>
                          <div style={{ marginLeft: 'auto', width: 14, height: 14, borderRadius: '50%', background: t.accent, border: '2px solid rgba(255,255,255,0.6)' }} />
                          {isActive && <CheckOutlined style={{ color: '#fff', fontSize: 14 }} />}
                        </div>
                        <div style={{ padding: '8px 12px', background: '#fff' }}>
                          <div style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' }}>"{t.tagline}"</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                            {t.mood.map(m => <span key={m} style={{ fontSize: 9, background: '#F3F4F6', color: '#888', padding: '1px 6px', borderRadius: 20 }}>{m}</span>)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── ARTE TAB ── */}
            {activeTab === 'arte' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 8 }}>TAGLINE DEL EVENTO</div>
                  <Input.TextArea rows={2} value={branding.tagline} onChange={e => update({ tagline: e.target.value })}
                    placeholder="Frase creativa que define el espíritu del evento..." maxLength={80} showCount
                    style={{ borderRadius: 8, resize: 'none' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 10 }}>ESTILO DE PORTADA</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {COVER_STYLES.map(cs => {
                      const isActive = branding.coverStyle === cs.key
                      const previewBg = cs.key === 'gradient' ? `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`
                        : cs.key === 'split' ? `linear-gradient(90deg, ${branding.primaryColor} 50%, ${branding.secondaryColor} 50%)`
                        : cs.key === 'solid' ? branding.primaryColor
                        : cs.key === 'image' ? (branding.bannerUrl ? undefined : '#6B7280')
                        : '#0D0D1A'
                      return (
                        <div key={cs.key} onClick={() => update({ coverStyle: cs.key })} style={{ borderRadius: 10, border: isActive ? '2px solid #7C3AED' : '1px solid #EDE9FE', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.12s' }}>
                          <div style={{
                            height: 48,
                            ...(cs.key === 'image' && branding.bannerUrl
                              ? { backgroundImage: `url(${branding.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                              : { background: previewBg }),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {cs.key === 'image' && !branding.bannerUrl && (
                              <PictureOutlined style={{ color: '#fff', fontSize: 20 }} />
                            )}
                          </div>
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#7C3AED' : '#1a1a1a' }}>{cs.name}</div>
                            <div style={{ fontSize: 10, color: '#888' }}>{cs.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {branding.coverStyle === 'image' && !branding.bannerUrl && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#F97316', background: '#FFF7ED', borderRadius: 6, padding: '6px 10px' }}>
                      ⚠️ Selecciona un banner en la pestaña "Banner" para usar este estilo.
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 10 }}>TIPOGRAFÍA</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {FONT_STYLES.map(fs => {
                      const isActive = branding.fontStyle === fs.key
                      return (
                        <div key={fs.key} onClick={() => update({ fontStyle: fs.key })} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: isActive ? '2px solid #7C3AED' : '1px solid #EDE9FE', cursor: 'pointer', background: isActive ? '#F5F3FF' : '#fff', transition: 'all 0.12s' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 8, background: isActive ? '#EDE9FE' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, fontFamily: fontHeadingMap[fs.key], color: isActive ? '#7C3AED' : '#374151', flexShrink: 0 }}>
                            {fs.sample}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#7C3AED' : '#1a1a1a', fontFamily: fontHeadingMap[fs.key] }}>{fs.name}</div>
                            <div style={{ fontSize: 10, color: '#888' }}>{fs.desc}</div>
                          </div>
                          {isActive && <CheckOutlined style={{ marginLeft: 'auto', color: '#7C3AED', fontSize: 14 }} />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── BANNER TAB ── */}
            {activeTab === 'banner' && (
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
                  El banner es la imagen principal del evento. Se usa como fondo de la portada (activa el estilo "Imagen"), en la cabecera de PDFs y en el portal del cliente.
                </div>

                {/* Current banner */}
                {branding.bannerUrl ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 8 }}>BANNER ACTUAL</div>
                    <div style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 8 }}>
                      <img src={branding.bannerUrl} alt="Banner" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5))' }} />
                      <Button
                        size="small" danger
                        style={{ position: 'absolute', top: 8, right: 8 }}
                        onClick={() => update({ bannerUrl: '', coverStyle: 'gradient' })}
                      >
                        Quitar
                      </Button>
                    </div>
                    <Button block icon={<PictureOutlined />} onClick={() => setBannerPickerOpen(true)}>
                      Cambiar banner
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => setBannerPickerOpen(true)}
                    style={{
                      borderRadius: 14, border: '2px dashed #DDD6FE', padding: '32px 20px',
                      textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                      background: '#F5F3FF', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7C3AED')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#DDD6FE')}
                  >
                    <PictureOutlined style={{ fontSize: 36, color: '#C4B5FD', display: 'block', marginBottom: 10 }} />
                    <div style={{ fontWeight: 600, color: '#7C3AED', marginBottom: 4 }}>Seleccionar banner</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Busca en Unsplash, sube una foto o pega una URL</div>
                  </div>
                )}

                {/* Activate image cover style */}
                {branding.bannerUrl && branding.coverStyle !== 'image' && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#166534', marginBottom: 8 }}>
                      ✅ Banner listo. ¿Activar estilo "Imagen" en la portada?
                    </div>
                    <Button size="small" type="primary"
                      onClick={() => update({ coverStyle: 'image' })}
                      style={{ background: '#059669', borderColor: '#059669' }}>
                      Activar imagen como fondo
                    </Button>
                  </div>
                )}

                {/* Tips */}
                <div style={{ background: '#F8F7FF', borderRadius: 10, border: '1px solid #EDE9FE', padding: 12, fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, color: '#7C3AED', marginBottom: 6 }}>💡 Consejos para un buen banner:</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>Usa imágenes en formato horizontal (16:9 o similar)</li>
                    <li>Evita imágenes con texto superpuesto</li>
                    <li>Las fotos de venue, decoración o momentos del evento funcionan muy bien</li>
                    <li>Busca en Unsplash con el tipo o tema del evento</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── IA TAB ── */}
            {activeTab === 'ia' && (
              <div>
                {/* Header card */}
                <div style={{ background: 'linear-gradient(135deg, #1E1040, #2D1B69)', borderRadius: 14, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <RobotOutlined style={{ color: '#A78BFA', fontSize: 26, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>IA Diseñadora de eventos</div>
                    <div style={{ color: '#C4B5FD', fontSize: 11, lineHeight: 1.4 }}>
                      Genera diseño desde texto · Reconoce colores desde una imagen de referencia
                    </div>
                  </div>
                </div>

                {/* ─ Section 1: Text-based design ─ */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ThunderboltOutlined style={{ color: '#7C3AED' }} /> Propuesta por tipo de evento
                  </div>
                  <Input.TextArea rows={3} value={aiNotes} onChange={e => setAiNotes(e.target.value)}
                    placeholder="Ej: los novios quieren colores tierra, la boda es en una hacienda colonial..."
                    style={{ borderRadius: 8, resize: 'none', marginBottom: 10 }} />
                  <Button type="primary" icon={aiLoading ? undefined : <ThunderboltOutlined />}
                    loading={aiLoading} onClick={handleAiDesign} block
                    style={{ height: 40, background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', border: 'none', borderRadius: 10, fontWeight: 700 }}>
                    {aiLoading ? 'Generando...' : 'Generar propuesta de diseño'}
                  </Button>

                  {aiResult && (
                    <div style={{ background: '#F8F7FF', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 16px', marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <BulbOutlined style={{ color: '#7C3AED', fontSize: 14 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>PROPUESTA DE IA</span>
                        <Button type="text" size="small" icon={<ClearOutlined />} onClick={() => setAiResult(null)} style={{ color: '#aaa', marginLeft: 'auto' }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiResult}</div>
                      <div style={{ marginTop: 10, fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                        Los colores hex detectados se aplicaron automáticamente a la paleta.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ height: 1, background: '#EDE9FE', margin: '0 0 20px' }} />

                {/* ─ Section 2: Image recognition ─ */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <EyeOutlined style={{ color: '#EC4899' }} /> Reconocer diseño desde imagen
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.5 }}>
                    Sube o busca una imagen de referencia (moodboard, inspiración, foto del venue...) y la IA extraerá los colores, estilo y mood automáticamente.
                  </div>

                  {/* Reference image picker */}
                  {refImage ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', marginBottom: 8 }}>
                        <img src={refImage.url} alt="Referencia" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        <Button size="small" style={{ position: 'absolute', top: 6, right: 6 }}
                          onClick={() => { setRefImage(null); setAnalyzeResult(null) }}>
                          ✕
                        </Button>
                      </div>
                      <Button type="primary" icon={analyzeLoading ? undefined : <EyeOutlined />}
                        loading={analyzeLoading} onClick={handleAnalyzeImage} block
                        style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)', border: 'none', borderRadius: 10, fontWeight: 700, height: 40 }}>
                        {analyzeLoading ? 'Analizando imagen...' : 'Analizar y aplicar diseño'}
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setRefImagePickerOpen(true)}
                      style={{
                        borderRadius: 12, border: '2px dashed #F9A8D4', padding: '20px',
                        textAlign: 'center', cursor: 'pointer', marginBottom: 12,
                        background: '#FFF0F6', transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#EC4899')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#F9A8D4')}
                    >
                      <PictureOutlined style={{ fontSize: 28, color: '#EC4899', display: 'block', marginBottom: 8 }} />
                      <div style={{ fontWeight: 600, color: '#EC4899', fontSize: 12 }}>Seleccionar imagen de referencia</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Unsplash · subir archivo · URL</div>
                    </div>
                  )}

                  {analyzeResult && (
                    <div style={{ background: '#FFF0F6', borderRadius: 12, border: '1px solid #F9A8D4', padding: '12px 14px', marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <EyeOutlined style={{ color: '#EC4899' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#EC4899' }}>DISEÑO EXTRAÍDO</span>
                        <Button type="text" size="small" icon={<ClearOutlined />} onClick={() => setAnalyzeResult(null)} style={{ color: '#aaa', marginLeft: 'auto' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analyzeResult}</div>
                      <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 8 }}>
                        Diseño aplicado automáticamente. Ajusta en las otras pestañas.
                      </div>
                    </div>
                  )}

                  {/* Note about image generation */}
                  <div style={{ background: '#F8F7FF', borderRadius: 10, border: '1px solid #EDE9FE', padding: '10px 12px', marginTop: 16, fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: '#7C3AED' }}>¿Generar imágenes con IA? </span>
                    Claude puede analizar y extraer diseño de imágenes, pero no genera imágenes nuevas. Para generación con IA (DALL-E, Stability AI) es posible integrarla como módulo adicional — solicítalo cuando estés listo.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — live preview */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 40px', background: '#F0EFF6' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: '#DDD6FE' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.12em' }}>VISTA PREVIA EN TIEMPO REAL</span>
              <div style={{ flex: 1, height: 1, background: '#DDD6FE' }} />
            </div>

            <CoverPreview branding={branding} event={event} />

            <div style={{ marginTop: 20, padding: '12px 16px', background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                Al guardar, este diseño se usará en el <strong>widget de portada del Lienzo</strong>, los <strong>PDFs del evento</strong> y la cabecera del <strong>Portal del cliente</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image pickers */}
      <ImagePickerModal
        open={bannerPickerOpen}
        onClose={() => setBannerPickerOpen(false)}
        title="Seleccionar banner del evento"
        onSelect={(url, base64, mimeType) => {
          update({ bannerUrl: url, coverStyle: 'image' })
          setBannerPickerOpen(false)
        }}
      />
      <ImagePickerModal
        open={refImagePickerOpen}
        onClose={() => setRefImagePickerOpen(false)}
        title="Imagen de referencia para IA"
        onSelect={(url, base64, mimeType) => {
          setRefImage({ url, base64, mimeType })
          setRefImagePickerOpen(false)
        }}
      />
    </div>
  )
}
