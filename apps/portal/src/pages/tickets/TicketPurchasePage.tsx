import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ticketsPublicApi } from '../../api/tickets'
import { useTicketBuyerAuthStore } from '../../stores/ticketBuyerAuthStore'

// ── Color Tokens ───────────────────────────────────────────────────────────────
const C = {
  bg: '#0a1220',
  bg1: '#111827',
  bg2: '#1f2937',
  bg3: '#374151',
  text: '#f1f5f9',
  textMute: '#94a3b8',
  line: 'rgba(255,255,255,0.08)',
  accent: '#34d399',
}

// ── Tier chip colors ───────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  general: '#3B82F6',
  vip: '#A855F7',
  platinum: '#EAB308',
  palco: '#EC4899',
  field: '#22C55E',
}

const TIER_LABELS: Record<string, string> = {
  general: 'General',
  vip: 'VIP',
  platinum: 'Platinum',
  palco: 'Palcos',
  field: 'Pista',
}

const POI_COLORS: Record<string, string> = {
  wc: '#3B82F6',
  fb: '#F59E0B',
  merch: '#EC4899',
  med: '#EF4444',
  info: '#10B981',
  stage: '#FBBF24',
}

const POI_LABELS: Record<string, string> = { wc: 'WC', fb: 'F&B', merch: 'Merch', med: 'Médico', info: 'Info', stage: 'Escenario' }

// ── Spinner ────────────────────────────────────────────────────────────────────
const spinnerKeyframes = `
@keyframes spin { to { transform: rotate(360deg); } }
`

function Spinner() {
  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `3px solid ${C.bg3}`,
        borderTopColor: C.accent,
        animation: 'spin 0.8s linear infinite',
      }} />
    </>
  )
}

// ── Cart types ─────────────────────────────────────────────────────────────────
interface SectionCartItem { id?: string; sectionId: string; qty: number; name: string; price: number; colorHex: string; tier?: string }
interface SeatCartItem { sectionId: string; seatId: string; row: string; number: number; price: number; sectionName: string }

type SectionCart = Record<string, SectionCartItem>
type SeatCart = Record<string, SeatCartItem>

// ── Map layer rendering ────────────────────────────────────────────────────────
interface Section {
  id: string; name: string; colorHex: string; tier?: string
  capacity?: number; sold?: number; price?: number
  shapeType?: string; shapeData?: any; labelX?: number; labelY?: number
  seats?: Array<{ id: string; row: string; number: number; status: string }>
}

interface MapData {
  width?: number; height?: number; perimeter?: string
  field?: { cx: number; cy: number; rx: number; ry: number }
  accesses?: Array<{ id: string; x: number; y: number; label: string; primary?: boolean }>
  pois?: Array<{ id: string; type: string; x: number; y: number; label: string }>
}

// ── useIsMobile ────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function VenueMapSVG({
  sections,
  mapData,
  selectedId,
  filterTier,
  sectionCart,
  seatCart,
  mode,
  onSelectSection,
}: {
  sections: Section[]
  mapData: MapData
  selectedId: string | null
  filterTier: string | null
  sectionCart: SectionCart
  seatCart: SeatCart
  mode: 'SECTION' | 'SEAT' | 'REGISTRO'
  onSelectSection: (id: string) => void
}) {
  const svgWidth = mapData.width ?? 1200
  const svgHeight = mapData.height ?? 600
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; section: Section } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 0.87
    setZoom(z => Math.min(5, Math.max(0.25, z * factor)))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).tagName === 'path') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }

  const handleMouseUp = () => setIsPanning(false)

  const getCartBadge = (sec: Section) => {
    if (mode === 'SECTION') {
      const item = sectionCart[sec.id]
      return item ? item.qty : 0
    } else if (mode === 'REGISTRO') {
      return Object.values(sectionCart).filter(s => s.sectionId === sec.id).length
    } else {
      return Object.values(seatCart).filter(s => s.sectionId === sec.id).length
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0d1b2e', borderRadius: 12 }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${svgWidth / zoom} ${svgHeight / zoom}`}
        style={{ cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Perimeter */}
        {mapData.perimeter && (
          <path d={mapData.perimeter} fill="#0f1e35" stroke="#1e3a5f" strokeWidth="2" />
        )}

        {/* Field */}
        {mapData.field && (
          <ellipse
            cx={mapData.field.cx} cy={mapData.field.cy}
            rx={mapData.field.rx} ry={mapData.field.ry}
            fill="#14532d" stroke="#22c55e" strokeWidth="2"
          />
        )}

        {/* Sections */}
        {sections.map(sec => {
          const isSelected = sec.id === selectedId
          const isHovered = sec.id === hovered
          const dimmed = filterTier !== null && sec.tier !== filterTier
          const badge = getCartBadge(sec)
          const avail = (sec.capacity ?? 0) - (sec.sold ?? 0)
          const isSoldOut = avail === 0 && (sec.capacity ?? 0) > 0

          let fillOpacity = 0.5
          if (dimmed) fillOpacity = 0.12
          else if (isSelected || isHovered) fillOpacity = 0.8

          const sharedEvents = {
            onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (!isSoldOut) onSelectSection(sec.id) },
            onMouseEnter: (e: React.MouseEvent) => {
              setHovered(sec.id)
              const containerRect = containerRef.current?.getBoundingClientRect()
              if (containerRect) {
                setTooltip({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top, section: sec })
              }
            },
            onMouseLeave: () => { setHovered(null); setTooltip(null) },
            style: { cursor: isSoldOut ? 'not-allowed' : 'pointer', transition: 'fill-opacity 0.15s' },
          }

          return (
            <g key={sec.id}>
              {sec.shapeType === 'rect' && sec.shapeData && (
                <rect
                  x={sec.shapeData.x} y={sec.shapeData.y}
                  width={sec.shapeData.w} height={sec.shapeData.h}
                  fill={sec.colorHex} fillOpacity={fillOpacity}
                  stroke={isSelected ? 'white' : sec.colorHex}
                  strokeWidth={isSelected ? 2.5 : 1}
                  {...sharedEvents}
                />
              )}
              {sec.shapeType === 'circle' && sec.shapeData && (
                <circle
                  cx={sec.shapeData.cx} cy={sec.shapeData.cy} r={sec.shapeData.r}
                  fill={sec.colorHex} fillOpacity={fillOpacity}
                  stroke={isSelected ? 'white' : sec.colorHex}
                  strokeWidth={isSelected ? 2.5 : 1}
                  {...sharedEvents}
                />
              )}
              {sec.labelX != null && sec.labelY != null && (
                <text
                  x={sec.labelX} y={sec.labelY}
                  fontSize="13" fontWeight="600" fill={dimmed ? '#444' : 'white'}
                  pointerEvents="none" textAnchor="middle" dominantBaseline="middle"
                >
                  {sec.name}
                </text>
              )}
              {badge > 0 && sec.labelX != null && sec.labelY != null && (
                <>
                  <circle cx={(sec.labelX ?? 0) + 18} cy={(sec.labelY ?? 0) - 14} r="10"
                    fill={C.accent} pointerEvents="none" />
                  <text x={(sec.labelX ?? 0) + 18} y={(sec.labelY ?? 0) - 13}
                    fontSize="9" fontWeight="700" fill="#0a1220"
                    textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
                    {badge}
                  </text>
                </>
              )}
              {isSoldOut && sec.labelX != null && sec.labelY != null && (
                <text x={sec.labelX} y={(sec.labelY ?? 0) + 16} fontSize="10" fill="#ef4444"
                  textAnchor="middle" pointerEvents="none">
                  AGOTADO
                </text>
              )}
            </g>
          )
        })}

        {/* Accesses */}
        {(mapData.accesses ?? []).map(acc => (
          <g key={acc.id} pointerEvents="none">
            <circle cx={acc.x} cy={acc.y} r="14" fill={acc.primary ? '#22c55e' : '#475569'} stroke="white" strokeWidth="1.5" />
            <text x={acc.x} y={acc.y + 1} fontSize="11" fill="white" textAnchor="middle" dominantBaseline="middle">→</text>
            <text x={acc.x} y={acc.y + 22} fontSize="9" fill="#64748b" textAnchor="middle">{acc.label}</text>
          </g>
        ))}

        {/* POIs */}
        {(mapData.pois ?? []).map(poi => {
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
            <g key={poi.id} pointerEvents="none">
              <rect x={poi.x - offsetX} y={poi.y - offsetY} width={width} height={height} rx="10" fill="#1e293b" stroke={color} strokeWidth="1.5" />
              <text x={poi.x} y={poi.y + 1} fontSize={fontSize1} fill={color} textAnchor="middle" dominantBaseline="middle">
                {POI_LABELS[poi.type] ?? poi.type}
              </text>
              <text x={poi.x} y={poi.y + labelOffsetY} fontSize={fontSize2} fill="#475569" textAnchor="middle">{poi.label}</text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 14, top: tooltip.y - 8,
          background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 8,
          padding: '8px 12px', fontSize: 12, color: C.text, pointerEvents: 'none', zIndex: 10,
          minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.section.name}</div>
          {tooltip.section.tier && (
            <div style={{ color: TIER_COLORS[tooltip.section.tier] ?? C.textMute, fontSize: 11, marginBottom: 4 }}>
              {TIER_LABELS[tooltip.section.tier] ?? tooltip.section.tier}
            </div>
          )}
          {tooltip.section.capacity != null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: C.textMute }}>Capacidad: {tooltip.section.capacity}</span>
              <span style={{ color: C.textMute }}>Vendidos: {tooltip.section.sold ?? 0}</span>
              <span style={{ color: C.accent }}>
                Disponibles: {(tooltip.section.capacity) - (tooltip.section.sold ?? 0)}
              </span>
            </div>
          )}
          {tooltip.section.price != null && (
            <div style={{ color: '#EAB308', marginTop: 4, fontWeight: 700 }}>
              ${Number(tooltip.section.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
      )}

      {/* Compass */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, width: 46, height: 46,
        background: 'rgba(10,18,32,0.9)', borderRadius: '50%',
        border: `1px solid ${C.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="34" height="34" viewBox="-17 -17 34 34">
          <polygon points="0,-12 3.5,-4 0,-6 -3.5,-4" fill="#ef4444" />
          <polygon points="0,12 3.5,4 0,6 -3.5,4" fill="#475569" />
          <text x="0" y="-14" fontSize="6" fill="#ef4444" textAnchor="middle">N</text>
          <text x="0" y="20" fontSize="6" fill="#475569" textAnchor="middle">S</text>
          <text x="14" y="2" fontSize="6" fill="#475569" textAnchor="middle">E</text>
          <text x="-14" y="2" fontSize="6" fill="#475569" textAnchor="middle">O</text>
        </svg>
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {[
          { label: '+', action: () => setZoom(z => Math.min(5, z * 1.2)) },
          { label: '⟳', action: () => { setZoom(1); setPan({ x: 0, y: 0 }) } },
          { label: '−', action: () => setZoom(z => Math.max(0.25, z / 1.2)) },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.line}`,
              background: C.bg2, color: C.text, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Event Banner ───────────────────────────────────────────────────────────────
function EventBanner({ eventData, formatDate }: { eventData: any; formatDate: (s: string) => string }) {
  const hasImage = !!eventData.imageUrl
  return (
    <div style={{
      position: 'relative',
      borderBottom: `1px solid ${C.line}`,
      overflow: 'hidden',
      minHeight: hasImage ? 220 : undefined,
    }}>
      {/* Background image */}
      {hasImage && (
        <>
          <img
            src={eventData.imageUrl}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center top',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(10,18,32,0.55) 0%, rgba(10,18,32,0.88) 60%, rgba(10,18,32,0.98) 100%)',
          }} />
        </>
      )}
      {/* Fallback background when no image */}
      {!hasImage && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #0f1e35 0%, #0a1220 100%)',
        }} />
      )}
      {/* Content */}
      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '32px 24px 28px' }}>
        <h1 style={{
          fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, color: C.text,
          margin: '0 0 10px', lineHeight: 1.2,
        }}>
          {eventData.event?.name}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: eventData.description ? 12 : 0 }}>
          {eventData.event?.eventStart && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: C.textMute }}>
              <span style={{ fontSize: 16 }}>📅</span>
              {formatDate(eventData.event.eventStart)}
            </span>
          )}
          {eventData.event?.venueLocation && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: C.textMute }}>
              <span style={{ fontSize: 16 }}>📍</span>
              {eventData.event.venueLocation}
            </span>
          )}
        </div>
        {eventData.description && (
          <p style={{ fontSize: 14, color: C.textMute, margin: '8px 0 0', maxWidth: 640, lineHeight: 1.6 }}>
            {eventData.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Smart Suggestion Banner ────────────────────────────────────────────────────
function SuggestionBanner({ zone, onClick }: { zone: Section; onClick: () => void }) {
  const avail = (zone.capacity ?? 0) - (zone.sold ?? 0)
  return (
    <div style={{
      background: 'rgba(52,211,153,0.06)',
      borderBottom: `1px solid rgba(52,211,153,0.15)`,
      padding: '10px 24px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: C.accent }}>★</span>
        <span style={{ fontSize: 13, color: C.textMute }}>Mejor relación calidad/precio:</span>
        <button
          onClick={onClick}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: C.accent, textDecoration: 'underline',
          }}
        >
          {zone.name}
        </button>
        <span style={{ fontSize: 12, color: C.textMute }}>
          — {avail} disponibles
          {zone.price != null && ` · $${Number(zone.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
        </span>
      </div>
    </div>
  )
}

// ── Section List ───────────────────────────────────────────────────────────────
function SectionList({
  sections,
  filterTier,
  setFilterTier,
  selectedId,
  onSelect,
}: {
  sections: Section[]
  filterTier: string | null
  setFilterTier: (t: string | null) => void
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const tierSet = Array.from(new Set(sections.map(s => s.tier).filter(Boolean))) as string[]
  const visible = filterTier ? sections.filter(s => s.tier === filterTier) : sections

  const chipStyle = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${active ? (color ?? C.accent) : C.line}`,
    background: active ? (color ?? C.accent) + '22' : 'transparent',
    color: active ? (color ?? C.accent) : C.textMute,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  })

  return (
    <div>
      {/* Tier filter chips */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 12px',
        scrollbarWidth: 'none',
      }}>
        <button style={chipStyle(filterTier === null)} onClick={() => setFilterTier(null)}>Todas</button>
        {tierSet.map(tier => (
          <button
            key={tier}
            style={chipStyle(filterTier === tier, TIER_COLORS[tier])}
            onClick={() => setFilterTier(filterTier === tier ? null : tier)}
          >
            {TIER_LABELS[tier] ?? tier}
          </button>
        ))}
      </div>

      {/* Section cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(sec => {
          const avail = (sec.capacity ?? 0) - (sec.sold ?? 0)
          const pct = sec.capacity ? Math.round(((sec.sold ?? 0) / sec.capacity) * 100) : 0
          const isSoldOut = avail === 0 && (sec.capacity ?? 0) > 0
          const isSelected = sec.id === selectedId

          return (
            <button
              key={sec.id}
              onClick={() => !isSoldOut && onSelect(sec.id)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0,
                cursor: isSoldOut ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: isSelected ? 'rgba(52,211,153,0.08)' : C.bg2,
                border: `1px solid ${isSelected ? C.accent : C.line}`,
                transition: 'all 0.15s',
                opacity: isSoldOut ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: sec.colorHex, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{sec.name}</span>
                  {sec.tier && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: TIER_COLORS[sec.tier] + '22',
                      color: TIER_COLORS[sec.tier],
                    }}>
                      {TIER_LABELS[sec.tier] ?? sec.tier}
                    </span>
                  )}
                  {sec.price != null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSoldOut ? C.textMute : C.accent }}>
                      ${Number(sec.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                {sec.capacity != null && (
                  <>
                    <div style={{ height: 4, background: C.bg3, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: pct > 80 ? '#ef4444' : C.accent,
                        borderRadius: 2, transition: 'width 0.3s',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: isSoldOut ? '#ef4444' : C.textMute }}>
                      {isSoldOut ? 'Agotado' : `${avail} disponibles`}
                    </div>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Section Detail ─────────────────────────────────────────────────────────────
function SectionDetail({
  section,
  sectionCart,
  setSectionCart,
  isRegistro = false,
}: {
  section: Section
  sectionCart: SectionCart
  setSectionCart: React.Dispatch<React.SetStateAction<SectionCart>>
  isRegistro?: boolean
}) {
  const avail = (section.capacity ?? 0) - (section.sold ?? 0)
  const isSoldOut = avail === 0 && (section.capacity ?? 0) > 0

  const qty = isRegistro
    ? Object.values(sectionCart).filter(item => item.sectionId === section.id).length
    : sectionCart[section.id]?.qty ?? 0

  const addToCart = () => {
    setSectionCart(prev => {
      if (isRegistro) {
        const uniqueKey = `${section.id}-${Date.now()}-${Math.random()}`
        return {
          ...prev,
          [uniqueKey]: {
            sectionId: section.id,
            qty: 1,
            name: section.name,
            price: section.price ?? 0,
            colorHex: section.colorHex,
            tier: section.tier,
          },
        }
      }
      return {
        ...prev,
        [section.id]: {
          sectionId: section.id,
          qty: (prev[section.id]?.qty ?? 0) + 1,
          name: section.name,
          price: section.price ?? 0,
          colorHex: section.colorHex,
          tier: section.tier,
        },
      }
    })
  }

  const removeFromCart = () => {
    setSectionCart(prev => {
      const cur = prev[section.id]
      if (!cur || cur.qty <= 1) {
        const next = { ...prev }
        delete next[section.id]
        return next
      }
      return { ...prev, [section.id]: { ...cur, qty: cur.qty - 1 } }
    })
  }

  const pct = section.capacity ? Math.round(((section.sold ?? 0) / section.capacity) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: section.colorHex, flexShrink: 0 }} />
        <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{section.name}</span>
        {section.tier && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 10,
            background: TIER_COLORS[section.tier] + '22',
            color: TIER_COLORS[section.tier],
          }}>
            {TIER_LABELS[section.tier]}
          </span>
        )}
      </div>

      {section.capacity != null && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMute, marginBottom: 6 }}>
            <span>Capacidad: {section.capacity}</span>
            <span>Disponibles: {avail}</span>
          </div>
          <div style={{ height: 6, background: C.bg3, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : C.accent, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMute, marginTop: 4 }}>{pct}% vendido</div>
        </div>
      )}

      {section.price != null && (
        <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginBottom: 20 }}>
          ${Number(section.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          <span style={{ fontSize: 13, fontWeight: 400, color: C.textMute }}> / entrada</span>
        </div>
      )}

      {isSoldOut ? (
        <div style={{
          padding: '12px', textAlign: 'center', borderRadius: 8,
          background: '#ef444422', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 600,
        }}>
          Agotado
        </div>
      ) : isRegistro || qty === 0 ? (
        <button
          onClick={addToCart}
          disabled={qty >= avail}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: qty >= avail ? C.bg3 : C.accent, color: '#0a1220', fontSize: 14, fontWeight: 700,
            cursor: qty >= avail ? 'not-allowed' : 'pointer',
          }}
        >
          {qty > 0 ? '+' : 'Agregar al carrito'} · ${Number(section.price ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
          <button
            onClick={removeFromCart}
            style={{
              width: 40, height: 40, borderRadius: 8, border: `1px solid ${C.line}`,
              background: C.bg2, color: C.text, fontSize: 22, cursor: 'pointer',
            }}
          >
            −
          </button>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.text, minWidth: 32, textAlign: 'center' }}>{qty}</span>
          <button
            onClick={addToCart}
            disabled={qty >= avail}
            style={{
              width: 40, height: 40, borderRadius: 8, border: 'none',
              background: qty >= avail ? C.bg3 : C.accent, color: '#0a1220', fontSize: 22, cursor: qty >= avail ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}

// ── Seat Detail ────────────────────────────────────────────────────────────────
function SeatDetail({
  section,
  seatCart,
  setSeatCart,
}: {
  section: Section
  seatCart: SeatCart
  setSeatCart: React.Dispatch<React.SetStateAction<SeatCart>>
}) {
  const seats = section.seats ?? []
  const byRow: Record<string, typeof seats> = {}
  for (const seat of seats) {
    if (!byRow[seat.row]) byRow[seat.row] = []
    byRow[seat.row].push(seat)
  }
  const rows = Object.keys(byRow).sort()

  const toggleSeat = (seat: typeof seats[0]) => {
    if (seat.status !== 'AVAILABLE') return
    setSeatCart(prev => {
      if (prev[seat.id]) {
        const next = { ...prev }
        delete next[seat.id]
        return next
      }
      return {
        ...prev,
        [seat.id]: {
          sectionId: section.id,
          seatId: seat.id,
          row: seat.row,
          number: seat.number,
          price: section.price ?? 0,
          sectionName: section.name,
        },
      }
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 12, height: 12, borderRadius: 3, background: section.colorHex, flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{section.name}</span>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 11, marginBottom: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#e2e8f0', border: `1px solid ${C.bg3}` }} />
          <span style={{ color: C.textMute }}>Disponible</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: C.accent }} />
          <span style={{ color: C.textMute }}>Seleccionado</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: C.bg3 }} />
          <span style={{ color: C.textMute }}>Vendido</span>
        </span>
      </div>

      <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 600, color: C.text }}>Frente</div>
      <div style={{ overflowX: 'auto' }}>
        {rows.map(row => (
          <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.textMute, width: 20, textAlign: 'right', flexShrink: 0 }}>{row}</span>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap' }}>
              {byRow[row].sort((a, b) => a.number - b.number).map(seat => {
                const isInCart = !!seatCart[seat.id]
                const isSold = seat.status !== 'AVAILABLE'
                return (
                  <button
                    key={seat.id}
                    title={`${row}${seat.number}`}
                    onClick={() => toggleSeat(seat)}
                    disabled={isSold}
                    style={{
                      width: 22, height: 22, borderRadius: 4, border: 'none',
                      background: isSold ? C.bg3 : isInCart ? C.accent : '#e2e8f0',
                      cursor: isSold ? 'not-allowed' : 'pointer',
                      fontSize: 0, flexShrink: 0,
                      transition: 'background 0.1s',
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {section.price != null && (
        <div style={{ marginTop: 12, fontSize: 13, color: C.textMute }}>
          Precio: <strong style={{ color: C.accent }}>
            ${Number(section.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </strong> por butaca
        </div>
      )}
    </div>
  )
}

// ── Cart Panel ─────────────────────────────────────────────────────────────────
function CartPanel({
  mode, sectionCart, seatCart, subtotal,
  setSectionCart, setSeatCart, onCheckout,
}: {
  mode: 'SECTION' | 'SEAT' | 'REGISTRO'
  sectionCart: SectionCart
  seatCart: SeatCart
  subtotal: number
  setSectionCart: React.Dispatch<React.SetStateAction<SectionCart>>
  setSeatCart: React.Dispatch<React.SetStateAction<SeatCart>>
  onCheckout: () => void
}) {
  const isRegistro = mode === 'REGISTRO'
  const serviceFee = subtotal * 0.1
  const total = subtotal + serviceFee
  const isEmpty = mode === 'SECTION' || isRegistro
    ? Object.keys(sectionCart).length === 0
    : Object.keys(seatCart).length === 0

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', fontSize: 13,
    padding: '6px 0', borderBottom: `1px solid ${C.line}`,
  }

  if (isEmpty) return null

  return (
    <div style={{
      marginTop: 16, padding: 16, borderRadius: 10,
      background: C.bg2, border: `1px solid ${C.line}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Tu selección</div>

      <div style={{ marginBottom: 12 }}>
        {mode === 'SECTION' || isRegistro
          ? Object.entries(sectionCart).map(([cartKey, item]) => (
            <div key={cartKey} style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: item.colorHex }} />
                <span style={{ color: C.text }}>{item.name}</span>
                {item.qty > 1 && <span style={{ color: C.textMute }}>×{item.qty}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.accent }}>
                  ${(item.qty * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => setSectionCart(prev => { const n = { ...prev }; delete n[cartKey]; return n })}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 0 }}
                >
                  ×
                </button>
              </div>
            </div>
          ))
          : Object.entries(seatCart).map(([cartKey, item]) => (
            <div key={cartKey} style={rowStyle}>
              <span style={{ color: C.text }}>{item.sectionName} – {item.row}{item.number}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.accent }}>
                  ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => setSeatCart(prev => { const n = { ...prev }; delete n[cartKey]; return n })}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 0 }}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        }
      </div>

      <div style={{ fontSize: 13, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textMute, marginBottom: 4 }}>
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textMute, marginBottom: 8 }}>
          <span>Cargo por servicio (10%)</span>
          <span>${serviceFee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: C.text }}>
          <span>Total</span>
          <span style={{ color: C.accent }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        style={{
          width: '100%', padding: '13px', borderRadius: 8, border: 'none',
          background: C.accent, color: '#0a1220', fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Continuar al pago →
      </button>
    </div>
  )
}

// ── Right Panel ────────────────────────────────────────────────────────────────
function RightPanel({
  selectedSection, mode, sectionCart, seatCart, subtotal,
  setSectionCart, setSeatCart, onCheckout,
}: {
  selectedSection: Section | null
  mode: 'SECTION' | 'SEAT' | 'REGISTRO'
  sectionCart: SectionCart
  seatCart: SeatCart
  subtotal: number
  setSectionCart: React.Dispatch<React.SetStateAction<SectionCart>>
  setSeatCart: React.Dispatch<React.SetStateAction<SeatCart>>
  onCheckout: () => void
}) {
  const isRegistro = mode === 'REGISTRO'
  return (
    <div style={{ padding: 20, background: C.bg1, borderRadius: 12, border: `1px solid ${C.line}` }}>
      {!selectedSection ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: C.textMute, fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          Selecciona una zona en el mapa
        </div>
      ) : mode === 'SECTION' || isRegistro ? (
        <SectionDetail
          section={selectedSection}
          sectionCart={sectionCart}
          setSectionCart={setSectionCart}
          isRegistro={isRegistro}
        />
      ) : (
        <SeatDetail
          section={selectedSection}
          seatCart={seatCart}
          setSeatCart={setSeatCart}
        />
      )}
      <CartPanel
        mode={mode}
        sectionCart={sectionCart}
        seatCart={seatCart}
        subtotal={subtotal}
        setSectionCart={setSectionCart}
        setSeatCart={setSeatCart}
        onCheckout={onCheckout}
      />
    </div>
  )
}

// ── Mobile Sticky Footer ───────────────────────────────────────────────────────
function MobileStickyFooter({
  total, cartItemCount, onCheckout,
}: {
  total: number; cartItemCount: number; onCheckout: () => void
}) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: C.bg1, borderTop: `1px solid ${C.line}`,
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 12, color: C.textMute }}>{cartItemCount} {cartItemCount === 1 ? 'boleto' : 'boletos'}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>
          ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <button
        onClick={onCheckout}
        style={{
          padding: '12px 28px', borderRadius: 8, border: 'none',
          background: C.accent, color: '#0a1220', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        Continuar →
      </button>
    </div>
  )
}

// ── Checkout Modal (2-step: datos → pago) ─────────────────────────────────────
function CheckoutModal({
  open, slug, mode, sectionCart, seatCart,
  onClose, onSuccess,
}: {
  open: boolean; slug: string; mode: 'SECTION' | 'SEAT' | 'REGISTRO'
  sectionCart: SectionCart; seatCart: SeatCart
  onClose: () => void; onSuccess: (url: string) => void
}) {
  const { user: buyerUser } = useTicketBuyerAuthStore()
  const [step, setStep] = useState<'datos' | 'pago'>('datos')
  const [buyerForm, setBuyerForm] = useState({ name: '', email: '', phone: '' })
  const [attendees, setAttendees] = useState<Record<string, any>>({})
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'CODE'>('STRIPE')
  const [accessCode, setAccessCode] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isRegistro = mode === 'REGISTRO'
  const cartEntries = Object.entries(sectionCart)

  useEffect(() => {
    if (open) {
      setStep('datos')
      setAttendees({})
      setErrors({})
      setAccessCode('')
      setPaymentMethod('STRIPE')
    }
  }, [open])

  const totalAmount = isRegistro || mode === 'SECTION'
    ? Object.values(sectionCart).reduce((s, i) => s + i.qty * i.price, 0)
    : Object.values(seatCart).reduce((s, i) => s + i.price, 0)

  const cartItems = isRegistro
    ? cartEntries.map(([cartKey, i]) => ({
      sectionId: i.sectionId,
      quantity: 1,
      attendee: attendees[cartKey],
    }))
    : mode === 'SECTION'
      ? Object.values(sectionCart).map(i => ({ sectionId: i.sectionId, quantity: i.qty }))
      : Object.values(seatCart).map(i => ({ sectionId: i.sectionId, seatId: i.seatId, quantity: 1 }))

  const createOrderMutation = useMutation({
    mutationFn: ticketsPublicApi.createOrder,
    onSuccess: (data: any) => {
      if (data?.token && !data?.checkoutUrl) { onSuccess('/mis-boletos'); return }
      if (data?.checkoutUrl) onSuccess(data.checkoutUrl)
    },
  })

  const validateDatos = () => {
    const e: Record<string, string> = {}
    if (!buyerForm.name.trim()) e.name = 'Requerido'
    if (!buyerForm.email.trim() || !/\S+@\S+\.\S+/.test(buyerForm.email)) e.email = 'Email inválido'
    if (isRegistro) {
      cartEntries.forEach(([cartKey], idx) => {
        const att = attendees[cartKey]
        if (!att?.firstName?.trim()) e[`att-${idx}-firstName`] = 'Requerido'
        if (!att?.paternalLastName?.trim()) e[`att-${idx}-paternalLastName`] = 'Requerido'
        if (!att?.email?.trim() || !/\S+@\S+\.\S+/.test(att.email)) e[`att-${idx}-email`] = 'Email inválido'
      })
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleDatosNext = () => {
    if (!validateDatos()) return
    setStep('pago')
  }

  const handleSubmit = () => {
    if (paymentMethod === 'CODE' && !accessCode.trim()) {
      setErrors({ accessCode: 'Código requerido' })
      return
    }
    const payload: any = {
      slug,
      buyerName: buyerForm.name,
      buyerEmail: buyerForm.email,
      buyerPhone: buyerForm.phone || undefined,
      items: cartItems,
    }
    if (paymentMethod === 'CODE') {
      payload.paymentMethod = 'CODE'
      payload.accessCode = accessCode
    } else if (totalAmount === 0) {
      payload.paymentMethod = 'FREE'
    }
    createOrderMutation.mutate(payload)
  }

  if (!open) return null

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${C.line}`, background: C.bg2, color: C.text,
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const err = (key: string) => errors[key]
    ? <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors[key]}</div>
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: C.bg1, borderRadius: 12, padding: 28,
        width: 500, maxWidth: 'calc(100vw - 32px)', maxHeight: '92vh', overflowY: 'auto',
        border: `1px solid ${C.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          {(['datos', 'pago'] as const).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                background: step === s ? C.accent : C.bg3,
                color: step === s ? '#0a1220' : C.textMute,
              }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: step === s ? C.accent : C.textMute }}>
                {s === 'datos' ? 'Datos' : 'Pago'}
              </span>
              {i < 1 && <div style={{ width: 20, height: 1, background: C.bg3 }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Datos ────────────────────────────────────── */}
        {step === 'datos' && (
          <>
            <h3 style={{ color: C.text, margin: '0 0 14px', fontSize: 16 }}>Datos del comprador</h3>
            {!buyerUser && (
              <div style={{
                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 8, padding: '8px 14px', marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: C.textMute }}>¿Ya tienes cuenta?</span>
                <Link to="/boletos/login" style={{ fontSize: 12, color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
                  Iniciar sesión →
                </Link>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 5 }}>Nombre completo *</label>
                <input style={{ ...inp, borderColor: errors.name ? '#ef4444' : C.line }}
                  value={buyerForm.name}
                  onChange={e => setBuyerForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Juan Pérez" />
                {err('name')}
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 5 }}>Teléfono</label>
                <input style={inp} type="tel"
                  value={buyerForm.phone}
                  onChange={e => setBuyerForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+52 55 1234 5678" />
              </div>
            </div>
            <div style={{ marginBottom: isRegistro ? 20 : 24 }}>
              <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 5 }}>Email *</label>
              <input style={{ ...inp, borderColor: errors.email ? '#ef4444' : C.line }}
                type="email"
                value={buyerForm.email}
                onChange={e => setBuyerForm(f => ({ ...f, email: e.target.value }))}
                placeholder="juan@ejemplo.com" />
              {err('email')}
            </div>

            {isRegistro && cartEntries.length > 0 && (
              <>
                <div style={{ borderTop: `1px solid ${C.line}`, marginBottom: 16 }} />
                <h3 style={{ color: C.text, margin: '0 0 14px', fontSize: 16 }}>
                  Datos de asistentes ({cartEntries.length} {cartEntries.length === 1 ? 'boleto' : 'boletos'})
                </h3>
                {cartEntries.map(([cartKey, cartItem], idx) => (
                  <div key={cartKey} style={{
                    marginBottom: 20, padding: 14, borderRadius: 8,
                    border: `1px solid ${C.line}`, background: C.bg2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>Boleto {idx + 1}</span>
                      <span style={{ fontSize: 11, color: C.textMute }}>— {cartItem.name}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: C.textMute, display: 'block', marginBottom: 4 }}>Nombre *</label>
                        <input style={{ ...inp, fontSize: 13, borderColor: errors[`att-${idx}-firstName`] ? '#ef4444' : C.line }}
                          value={attendees[cartKey]?.firstName || ''}
                          onChange={e => setAttendees(a => ({ ...a, [cartKey]: { ...a[cartKey], firstName: e.target.value } }))}
                          placeholder="Juan" />
                        {err(`att-${idx}-firstName`)}
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: C.textMute, display: 'block', marginBottom: 4 }}>Apellido paterno *</label>
                        <input style={{ ...inp, fontSize: 13, borderColor: errors[`att-${idx}-paternalLastName`] ? '#ef4444' : C.line }}
                          value={attendees[cartKey]?.paternalLastName || ''}
                          onChange={e => setAttendees(a => ({ ...a, [cartKey]: { ...a[cartKey], paternalLastName: e.target.value } }))}
                          placeholder="Pérez" />
                        {err(`att-${idx}-paternalLastName`)}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: C.textMute, display: 'block', marginBottom: 4 }}>Apellido materno</label>
                        <input style={{ ...inp, fontSize: 13 }}
                          value={attendees[cartKey]?.maternalLastName || ''}
                          onChange={e => setAttendees(a => ({ ...a, [cartKey]: { ...a[cartKey], maternalLastName: e.target.value } }))}
                          placeholder="García" />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: C.textMute, display: 'block', marginBottom: 4 }}>Teléfono</label>
                        <input style={{ ...inp, fontSize: 13 }} type="tel"
                          value={attendees[cartKey]?.phone || ''}
                          onChange={e => setAttendees(a => ({ ...a, [cartKey]: { ...a[cartKey], phone: e.target.value } }))}
                          placeholder="+52 55 1234 5678" />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: C.textMute, display: 'block', marginBottom: 4 }}>Email *</label>
                      <input style={{ ...inp, fontSize: 13, borderColor: errors[`att-${idx}-email`] ? '#ef4444' : C.line }}
                        type="email"
                        value={attendees[cartKey]?.email || ''}
                        onChange={e => setAttendees(a => ({ ...a, [cartKey]: { ...a[cartKey], email: e.target.value } }))}
                        placeholder="juan@ejemplo.com" />
                      {err(`att-${idx}-email`)}
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: '11px', borderRadius: 8,
                border: `1px solid ${C.line}`, background: 'transparent',
                color: C.text, cursor: 'pointer', fontSize: 14,
              }}>Cancelar</button>
              <button onClick={handleDatosNext} style={{
                flex: 2, padding: '11px', borderRadius: 8, border: 'none',
                background: C.accent, color: '#0a1220', fontWeight: 700,
                cursor: 'pointer', fontSize: 14,
              }}>Siguiente →</button>
            </div>
          </>
        )}

        {/* ── STEP 2: Pago ─────────────────────────────────────── */}
        {step === 'pago' && (
          <>
            <h3 style={{ color: C.text, margin: '0 0 16px', fontSize: 18 }}>Método de pago</h3>
            {totalAmount === 0 ? (
              <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>¡Gratis!</div>
                <div style={{ fontSize: 12, color: C.textMute, marginTop: 4 }}>Este registro no tiene costo</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, border: `2px solid ${paymentMethod === 'STRIPE' ? C.accent : C.line}`, background: paymentMethod === 'STRIPE' ? C.accent + '11' : 'transparent', cursor: 'pointer', marginBottom: 12 }}>
                    <input type="radio" name="pay" checked={paymentMethod === 'STRIPE'} onChange={() => setPaymentMethod('STRIPE')} style={{ accentColor: C.accent }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Tarjeta de crédito/débito</div>
                      <div style={{ fontSize: 11, color: C.textMute }}>Visa, Mastercard, American Express</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, border: `2px solid ${paymentMethod === 'CODE' ? C.accent : C.line}`, background: paymentMethod === 'CODE' ? C.accent + '11' : 'transparent', cursor: 'pointer' }}>
                    <input type="radio" name="pay" checked={paymentMethod === 'CODE'} onChange={() => setPaymentMethod('CODE')} style={{ accentColor: C.accent }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Código de acceso</div>
                      <div style={{ fontSize: 11, color: C.textMute }}>Ingresa un código válido</div>
                    </div>
                  </label>
                </div>
                {paymentMethod === 'CODE' && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>Código *</label>
                    <input
                      style={{ ...inp, borderColor: errors.accessCode ? '#ef4444' : C.line, fontFamily: 'monospace' }}
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="ABC12345" />
                    {err('accessCode')}
                  </div>
                )}
              </>
            )}

            {createOrderMutation.isError && (
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
                {(createOrderMutation.error as any)?.response?.data?.error?.message
                  || (createOrderMutation.error as any)?.response?.data?.message
                  || 'Error al procesar. Intenta de nuevo.'}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('datos')} style={{
                flex: 1, padding: '11px', borderRadius: 8,
                border: `1px solid ${C.line}`, background: 'transparent',
                color: C.text, cursor: 'pointer', fontSize: 14,
              }}>← Atrás</button>
              <button
                onClick={handleSubmit}
                disabled={createOrderMutation.isPending}
                style={{
                  flex: 2, padding: '11px', borderRadius: 8, border: 'none',
                  background: createOrderMutation.isPending ? C.bg3 : C.accent,
                  color: '#0a1220', fontWeight: 700,
                  cursor: createOrderMutation.isPending ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {createOrderMutation.isPending ? 'Procesando…' : totalAmount === 0 ? 'Finalizar registro' : paymentMethod === 'CODE' ? 'Canjear código' : 'Ir al pago →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TicketPurchasePage() {
  const { slug } = useParams<{ slug: string }>()
  const isMobile = useIsMobile()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterTier, setFilterTier] = useState<string | null>(null)
  const [sectionCart, setSectionCart] = useState<SectionCart>({})
  const [seatCart, setSeatCart] = useState<SeatCart>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ticket-event', slug],
    queryFn: () => ticketsPublicApi.getEvent(slug!),
    enabled: !!slug,
  })

  const eventData = data?.data

  const sections: Section[] = eventData?.sections ?? []
  const mapData: MapData = eventData?.mapData ?? {}
  const mode: 'SECTION' | 'SEAT' | 'REGISTRO' = eventData?.mode ?? 'SECTION'
  const selectedSection = sections.find(s => s.id === selectedId) ?? null

  const subtotal = mode === 'SECTION' || mode === 'REGISTRO'
    ? Object.values(sectionCart).reduce((s, i) => s + i.qty * i.price, 0)
    : Object.values(seatCart).reduce((s, i) => s + i.price, 0)

  const cartItemCount = mode === 'SECTION' || mode === 'REGISTRO'
    ? Object.keys(sectionCart).length
    : Object.keys(seatCart).length

  const total = subtotal * 1.1

  const suggestedZone = useMemo(() => {
    const available = sections.filter(s => {
      const avail = (s.capacity ?? 0) - (s.sold ?? 0)
      return avail > 5 && s.price != null && s.price > 0
    })
    if (available.length === 0) return null
    return available.reduce((best, sec) => {
      const secAvail = (sec.capacity ?? 0) - (sec.sold ?? 0)
      const bestAvail = (best.capacity ?? 0) - (best.sold ?? 0)
      const secScore = secAvail / (sec.price! + 1)
      const bestScore = bestAvail / (best.price! + 1)
      return secScore > bestScore ? sec : best
    })
  }, [sections])

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return iso }
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner />
      </div>
    )
  }

  if (isError || !eventData) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 48 }}>🎟️</div>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 600 }}>Evento no encontrado</div>
        <div style={{ color: C.textMute, fontSize: 14 }}>
          El enlace puede ser incorrecto o el evento ya no está disponible.
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Topbar — sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.bg1, borderBottom: `1px solid ${C.line}`,
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #34d399, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, color: '#0a1220',
        }}>
          iA
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {eventData.event?.name}
        </span>
        {cartItemCount > 0 && (
          <div style={{
            fontSize: 12, color: C.accent, fontWeight: 700,
            background: 'rgba(52,211,153,0.12)', padding: '4px 10px', borderRadius: 20,
            flexShrink: 0,
          }}>
            🛒 {cartItemCount}
          </div>
        )}
      </div>

      {/* Event Banner */}
      <EventBanner eventData={eventData} formatDate={formatDate} />

      {/* Smart Suggestion */}
      {suggestedZone && suggestedZone.id !== selectedId && (
        <SuggestionBanner zone={suggestedZone} onClick={() => setSelectedId(suggestedZone.id)} />
      )}

      {/* Main content grid */}
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: isMobile ? '16px 16px 96px' : '24px 24px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
        gap: isMobile ? 20 : 24,
        alignItems: 'start',
      }}>

        {/* Left column: map + section list */}
        <div>
          {/* Map */}
          <div style={{ height: isMobile ? 280 : 500, marginBottom: 20 }}>
            <VenueMapSVG
              sections={sections}
              mapData={mapData}
              selectedId={selectedId}
              filterTier={filterTier}
              sectionCart={sectionCart}
              seatCart={seatCart}
              mode={mode}
              onSelectSection={setSelectedId}
            />
          </div>

          {/* Section list */}
          <SectionList
            sections={sections}
            filterTier={filterTier}
            setFilterTier={setFilterTier}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right column: zone detail + cart (sticky on desktop) */}
        <div style={isMobile ? {} : { position: 'sticky', top: 70 }}>
          <RightPanel
            selectedSection={selectedSection}
            mode={mode}
            sectionCart={sectionCart}
            seatCart={seatCart}
            subtotal={subtotal}
            setSectionCart={setSectionCart}
            setSeatCart={setSeatCart}
            onCheckout={() => setCheckoutOpen(true)}
          />
        </div>
      </div>

      {/* Mobile sticky footer */}
      {isMobile && cartItemCount > 0 && (
        <MobileStickyFooter
          total={total}
          cartItemCount={cartItemCount}
          onCheckout={() => setCheckoutOpen(true)}
        />
      )}

      {/* Checkout modal */}
      <CheckoutModal
        open={checkoutOpen}
        slug={slug!}
        mode={mode as any}
        sectionCart={sectionCart}
        seatCart={seatCart}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={(url) => { window.location.href = url }}
      />
    </div>
  )
}
