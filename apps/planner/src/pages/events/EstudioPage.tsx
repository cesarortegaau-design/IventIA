/**
 * EstudioPage.tsx
 * Estudio del evento: Moodboard · Arte del evento · IA Diseñadora
 * Branding persiste en localStorage: iventia-branding-{eventId}
 * Exportable para LienzoPage, MapaPage y Portal del cliente
 */
import { useState } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import {
  Button, Input, Select, App, Typography, Tag,
} from 'antd'
import {
  RobotOutlined, BulbOutlined, SendOutlined, CheckOutlined,
  ClearOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { aiApi } from '../../api/ai'
import dayjs from 'dayjs'

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
export interface EventBranding {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  bgColor: string
  textOnBg: string        // '#ffffff' | '#1a1a1a'
  fontStyle: string       // 'modern' | 'classic' | 'elegant' | 'bold' | 'playful'
  coverStyle: string      // 'gradient' | 'split' | 'solid' | 'dark'
  tagline: string
  mood: string[]
  updatedAt: string
}

const DEFAULT_BRANDING: EventBranding = {
  primaryColor: '#7C3AED',
  secondaryColor: '#EC4899',
  accentColor: '#F97316',
  bgColor: '#F5F3FF',
  textOnBg: '#ffffff',
  fontStyle: 'modern',
  coverStyle: 'gradient',
  tagline: '',
  mood: [],
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
    default:         return `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})`
  }
}

// ── Live Preview ──────────────────────────────────────────────────────────────
function CoverPreview({ branding, event }: { branding: EventBranding; event: any }) {
  const bg = coverBg(branding)
  const isDark = branding.coverStyle === 'dark' || branding.textOnBg === '#ffffff'
  const textColor = isDark ? '#ffffff' : '#1a1a1a'
  const mutedColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'
  const font = fontHeadingMap[branding.fontStyle] || fontHeadingMap.modern
  const daysUntil = event?.eventStart ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day')) : null
  const accentBar = branding.accentColor

  return (
    <div>
      {/* Main portada */}
      <div style={{ background: bg, borderRadius: 20, padding: '32px 36px', marginBottom: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        {/* Accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: accentBar, borderRadius: '20px 20px 0 0' }} />

        <div>
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

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24 }}>
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
        <div style={{ background: bg, height: 8 }} />
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0, fontFamily: font }}>
            {(event?.name || 'E')[0]}
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function EstudioPage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  const [branding, setBranding] = useState<EventBranding>(() => loadBranding(eventId))
  const [activeTab, setActiveTab] = useState<'moodboard' | 'arte' | 'ia'>('moodboard')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiNotes, setAiNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<EventBranding>) => {
    const next = { ...branding, ...patch }
    setBranding(next)
    saveBranding(eventId, next)
    setSaved(false)
  }

  const handleSave = () => {
    saveBranding(eventId, branding)
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

  // ── AI Design Suggestion ───────────────────────────────────────────────────
  const handleAiDesign = async () => {
    const eventName = event?.name || 'Evento'
    const eventType = event?.eventType || 'OTHER'
    const guestCount = event?.guestCount || 100
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await aiApi.generateEventConcept({
        eventName,
        eventType,
        guestCount,
        notes: `Soy diseñador de eventos. Necesito sugerencias de DISEÑO VISUAL para este evento.
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

      // Try to auto-extract hex colors from response
      const hexMatches = content.match(/#[0-9A-Fa-f]{6}/g)
      if (hexMatches && hexMatches.length >= 2) {
        const [p, s, a] = hexMatches
        update({
          primaryColor: p,
          secondaryColor: s,
          accentColor: a || branding.accentColor,
        })
        message.success('Paleta de colores aplicada desde IA')
      }

      // Try to auto-extract tagline
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

  // ── Sidebar panels ─────────────────────────────────────────────────────────
  const tabBtn = (key: typeof activeTab, label: string, icon: string) => (
    <div onClick={() => setActiveTab(key)} style={{
      flex: 1, textAlign: 'center', padding: '8px 4px', cursor: 'pointer',
      fontWeight: activeTab === key ? 700 : 400, fontSize: 12,
      color: activeTab === key ? '#7C3AED' : '#6B7280',
      borderBottom: activeTab === key ? '2px solid #7C3AED' : '2px solid transparent',
      transition: 'all 0.15s', userSelect: 'none',
    }}>
      <div style={{ fontSize: 16, marginBottom: 2 }}>{icon}</div>
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
          style={{ background: saved ? '#059669' : '#7C3AED', borderColor: saved ? '#059669' : '#7C3AED', borderRadius: 8, fontWeight: 600, minWidth: 120 }}>
          {saved ? 'Guardado ✓' : 'Guardar estilo'}
        </Button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{ width: 360, flexShrink: 0, background: '#fff', borderRight: '1px solid #EDE9FE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid #EDE9FE', flexShrink: 0 }}>
            {tabBtn('moodboard', 'Moodboard', '🎨')}
            {tabBtn('arte', 'Arte', '✏️')}
            {tabBtn('ia', 'IA Diseñadora', '🤖')}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* ── MOODBOARD TAB ── */}
            {activeTab === 'moodboard' && (
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>
                  Elige una paleta base para el evento. Define los colores que se usarán en el Lienzo, PDFs y Portal.
                </div>

                {/* Palette grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {PALETTES.map(p => {
                    const isActive = branding.primaryColor === p.primary && branding.secondaryColor === p.secondary
                    return (
                      <div key={p.name} onClick={() => update({ primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent, bgColor: p.bg, textOnBg: p.text })}
                        style={{ borderRadius: 12, border: isActive ? '2px solid #7C3AED' : '1px solid #EDE9FE', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', boxShadow: isActive ? '0 0 0 3px #EDE9FE' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                        {/* Color bar */}
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

                {/* Custom colors */}
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
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: v, border: '1px solid #E5E7EB' }} />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mood tags */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 8 }}>MOOD DEL EVENTO</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {MOOD_TAGS.map(m => {
                      const active = branding.mood.includes(m)
                      return (
                        <Tag key={m} onClick={() => toggleMood(m)} style={{ cursor: 'pointer', borderRadius: 20, border: active ? '1px solid #7C3AED' : '1px solid #E5E7EB', background: active ? '#EDE9FE' : '#fff', color: active ? '#7C3AED' : '#555', fontWeight: active ? 700 : 400, fontSize: 11, padding: '2px 10px', transition: 'all 0.15s' }}>
                          {m}
                        </Tag>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── ARTE TAB ── */}
            {activeTab === 'arte' && (
              <div>
                {/* Tagline */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 8 }}>TAGLINE DEL EVENTO</div>
                  <Input.TextArea rows={2} value={branding.tagline} onChange={e => update({ tagline: e.target.value })}
                    placeholder="Frase creativa que define el espíritu del evento..." maxLength={80} showCount
                    style={{ borderRadius: 8, resize: 'none' }} />
                </div>

                {/* Cover style */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 10 }}>ESTILO DE PORTADA</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {COVER_STYLES.map(cs => {
                      const isActive = branding.coverStyle === cs.key
                      const previewBg = cs.key === 'gradient' ? `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`
                        : cs.key === 'split' ? `linear-gradient(90deg, ${branding.primaryColor} 50%, ${branding.secondaryColor} 50%)`
                        : cs.key === 'solid' ? branding.primaryColor
                        : '#0D0D1A'
                      return (
                        <div key={cs.key} onClick={() => update({ coverStyle: cs.key })} style={{ borderRadius: 10, border: isActive ? '2px solid #7C3AED' : '1px solid #EDE9FE', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.12s' }}>
                          <div style={{ height: 48, background: previewBg }} />
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#7C3AED' : '#1a1a1a' }}>{cs.name}</div>
                            <div style={{ fontSize: 10, color: '#888' }}>{cs.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Typography */}
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

            {/* ── IA TAB ── */}
            {activeTab === 'ia' && (
              <div>
                <div style={{ background: 'linear-gradient(135deg, #1E1040, #2D1B69)', borderRadius: 14, padding: '16px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <RobotOutlined style={{ color: '#A78BFA', fontSize: 28, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>IA Diseñadora de eventos</div>
                    <div style={{ color: '#C4B5FD', fontSize: 11, lineHeight: 1.4 }}>
                      Analiza el tipo de evento y genera una propuesta de paleta, tipografía y tagline. Los colores se aplican automáticamente.
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>CONTEXTO ADICIONAL (opcional)</div>
                  <Input.TextArea rows={3} value={aiNotes} onChange={e => setAiNotes(e.target.value)}
                    placeholder="Ej: los novios quieren colores tierra, la boda es en una hacienda colonial con jardín..."
                    style={{ borderRadius: 8, resize: 'none' }} />
                </div>

                <Button type="primary" icon={aiLoading ? undefined : <ThunderboltOutlined />}
                  loading={aiLoading} onClick={handleAiDesign}
                  style={{ width: '100%', height: 44, background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                  {aiLoading ? 'Generando diseño...' : 'Generar propuesta de diseño'}
                </Button>

                {aiResult && (
                  <div style={{ background: '#F8F7FF', borderRadius: 12, border: '1px solid #EDE9FE', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <BulbOutlined style={{ color: '#7C3AED', fontSize: 14 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>PROPUESTA DE IA</span>
                      <Button type="text" size="small" icon={<ClearOutlined />} onClick={() => setAiResult(null)}
                        style={{ color: '#aaa', marginLeft: 'auto' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {aiResult}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                      Los colores hex detectados se aplicaron automáticamente a la paleta.
                    </div>
                  </div>
                )}

                {!aiResult && !aiLoading && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#ccc' }}>
                    <SendOutlined style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
                    <div style={{ fontSize: 12 }}>Presiona el botón para que la IA sugiera<br />el diseño ideal para este evento</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — live preview */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 40px', background: '#F0EFF6' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Preview label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: '#DDD6FE' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.12em' }}>VISTA PREVIA EN TIEMPO REAL</span>
              <div style={{ flex: 1, height: 1, background: '#DDD6FE' }} />
            </div>

            <CoverPreview branding={branding} event={event} />

            {/* Apply to Lienzo hint */}
            <div style={{ marginTop: 20, padding: '12px 16px', background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                Al guardar, este diseño se usará en el <strong>widget de portada del Lienzo</strong>, los <strong>PDFs del evento</strong> y la cabecera del <strong>Portal del cliente</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
