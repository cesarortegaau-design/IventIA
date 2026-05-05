import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ticketsPublicApi } from '../../api/tickets'

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
interface SectionCartItem { sectionId: string; qty: number; name: string; price: number; colorHex: string; tier?: string }
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
  mode: 'SECTION' | 'SEAT'
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
    } else {
      return Object.values(seatCart).filter(s => s.sectionId === sec.id).length
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0d1b2e', borderRadius: 8 }}
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

// ── Side Panel ─────────────────────────────────────────────────────────────────
function SidePanel({
  sections,
  selectedSection,
  filterTier,
  setFilterTier,
  sectionCart,
  seatCart,
  setSectionCart,
  setSeatCart,
  mode,
  onCheckout,
}: {
  sections: Section[]
  selectedSection: Section | null
  filterTier: string | null
  setFilterTier: (t: string | null) => void
  sectionCart: SectionCart
  seatCart: SeatCart
  setSectionCart: React.Dispatch<React.SetStateAction<SectionCart>>
  setSeatCart: React.Dispatch<React.SetStateAction<SeatCart>>
  mode: 'SECTION' | 'SEAT'
  onCheckout: () => void
}) {
  const [activeTab, setActiveTab] = useState<'leyenda' | 'detalle' | 'carrito'>('leyenda')

  useEffect(() => {
    if (selectedSection) setActiveTab('detalle')
  }, [selectedSection?.id])

  const cartItemCount = mode === 'SECTION'
    ? Object.values(sectionCart).reduce((s, i) => s + i.qty, 0)
    : Object.keys(seatCart).length

  const subtotal = mode === 'SECTION'
    ? Object.values(sectionCart).reduce((s, i) => s + i.qty * i.price, 0)
    : Object.values(seatCart).reduce((s, i) => s + i.price, 0)

  const tierSet = Array.from(new Set(sections.map(s => s.tier).filter(Boolean))) as string[]

  const tabStyle = (key: string): React.CSSProperties => ({
    flex: 1, padding: '10px 4px', background: 'none', border: 'none',
    borderBottom: activeTab === key ? `2px solid ${C.accent}` : `2px solid transparent`,
    color: activeTab === key ? C.accent : C.textMute,
    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
    transition: 'color 0.15s',
  })

  return (
    <div style={{
      width: 320, background: C.bg1, borderLeft: `1px solid ${C.line}`,
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}` }}>
        <button style={tabStyle('leyenda')} onClick={() => setActiveTab('leyenda')}>Leyenda</button>
        <button style={tabStyle('detalle')} onClick={() => setActiveTab('detalle')}>Detalle</button>
        <button style={tabStyle('carrito')} onClick={() => setActiveTab('carrito')}>
          Carrito{cartItemCount > 0 ? ` (${cartItemCount})` : ''}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ── Leyenda ── */}
        {activeTab === 'leyenda' && (
          <div>
            <div style={{ fontSize: 12, color: C.textMute, marginBottom: 12 }}>Filtrar por tier:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => setFilterTier(null)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${filterTier === null ? C.accent : C.line}`,
                  background: filterTier === null ? C.accent + '22' : 'transparent',
                  color: filterTier === null ? C.accent : C.textMute,
                }}
              >
                Todos
              </button>
              {tierSet.map(tier => (
                <button
                  key={tier}
                  onClick={() => setFilterTier(filterTier === tier ? null : tier)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${filterTier === tier ? TIER_COLORS[tier] : C.line}`,
                    background: filterTier === tier ? TIER_COLORS[tier] + '22' : 'transparent',
                    color: filterTier === tier ? TIER_COLORS[tier] : C.textMute,
                  }}
                >
                  {TIER_LABELS[tier] ?? tier}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sections
                .filter(s => filterTier === null || s.tier === filterTier)
                .map(sec => {
                  const avail = (sec.capacity ?? 0) - (sec.sold ?? 0)
                  return (
                    <div key={sec.id} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: C.bg2, border: `1px solid ${C.line}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: sec.colorHex, flexShrink: 0 }} />
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{sec.name}</span>
                        {sec.tier && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 10,
                            background: TIER_COLORS[sec.tier] + '22',
                            color: TIER_COLORS[sec.tier],
                          }}>
                            {TIER_LABELS[sec.tier]}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMute }}>
                        <span>{avail > 0 ? `${avail} disponibles` : 'Agotado'}</span>
                        {sec.price != null && (
                          <span style={{ color: C.accent, fontWeight: 600 }}>
                            ${Number(sec.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── Detalle ── */}
        {activeTab === 'detalle' && (
          <div>
            {!selectedSection ? (
              <div style={{ color: C.textMute, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                Selecciona una zona en el mapa
              </div>
            ) : mode === 'SECTION' ? (
              <SectionDetail
                section={selectedSection}
                sectionCart={sectionCart}
                setSectionCart={setSectionCart}
              />
            ) : (
              <SeatDetail
                section={selectedSection}
                seatCart={seatCart}
                setSeatCart={setSeatCart}
              />
            )}
          </div>
        )}

        {/* ── Carrito ── */}
        {activeTab === 'carrito' && (
          <CartPanel
            mode={mode}
            sectionCart={sectionCart}
            seatCart={seatCart}
            subtotal={subtotal}
            setSectionCart={setSectionCart}
            setSeatCart={setSeatCart}
            onCheckout={onCheckout}
          />
        )}
      </div>
    </div>
  )
}

// ── Section Detail ─────────────────────────────────────────────────────────────
function SectionDetail({
  section,
  sectionCart,
  setSectionCart,
}: {
  section: Section
  sectionCart: SectionCart
  setSectionCart: React.Dispatch<React.SetStateAction<SectionCart>>
}) {
  const avail = (section.capacity ?? 0) - (section.sold ?? 0)
  const isSoldOut = avail === 0 && (section.capacity ?? 0) > 0
  const cartItem = sectionCart[section.id]
  const qty = cartItem?.qty ?? 0

  const addToCart = () => {
    setSectionCart(prev => ({
      ...prev,
      [section.id]: {
        sectionId: section.id,
        qty: (prev[section.id]?.qty ?? 0) + 1,
        name: section.name,
        price: section.price ?? 0,
        colorHex: section.colorHex,
        tier: section.tier,
      },
    }))
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
      ) : qty > 0 ? (
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
      ) : (
        <button
          onClick={addToCart}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: C.accent, color: '#0a1220', fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Agregar al carrito · ${Number(section.price ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </button>
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
  mode: 'SECTION' | 'SEAT'
  sectionCart: SectionCart
  seatCart: SeatCart
  subtotal: number
  setSectionCart: React.Dispatch<React.SetStateAction<SectionCart>>
  setSeatCart: React.Dispatch<React.SetStateAction<SeatCart>>
  onCheckout: () => void
}) {
  const serviceFee = subtotal * 0.1
  const total = subtotal + serviceFee
  const isEmpty = mode === 'SECTION'
    ? Object.keys(sectionCart).length === 0
    : Object.keys(seatCart).length === 0

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', fontSize: 13,
    padding: '6px 0', borderBottom: `1px solid ${C.line}`,
  }

  return (
    <div>
      {isEmpty ? (
        <div style={{ color: C.textMute, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
          Tu carrito está vacío
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            {mode === 'SECTION'
              ? Object.values(sectionCart).map(item => (
                <div key={item.sectionId} style={rowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: item.colorHex }} />
                    <span style={{ color: C.text }}>{item.name}</span>
                    <span style={{ color: C.textMute }}>×{item.qty}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: C.accent }}>
                      ${(item.qty * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => setSectionCart(prev => { const n = { ...prev }; delete n[item.sectionId]; return n })}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 0 }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
              : Object.values(seatCart).map(item => (
                <div key={item.seatId} style={rowStyle}>
                  <span style={{ color: C.text }}>{item.sectionName} – {item.row}{item.number}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: C.accent }}>
                      ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => setSeatCart(prev => { const n = { ...prev }; delete n[item.seatId]; return n })}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 0 }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            }
          </div>

          <div style={{ fontSize: 13, marginBottom: 16 }}>
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
              width: '100%', padding: '14px', borderRadius: 8, border: 'none',
              background: C.accent, color: '#0a1220', fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continuar al pago
          </button>
        </>
      )}
    </div>
  )
}

// ── Checkout Modal ─────────────────────────────────────────────────────────────
function CheckoutModal({
  open, slug, mode, sectionCart, seatCart,
  onClose, onSuccess,
}: {
  open: boolean; slug: string; mode: 'SECTION' | 'SEAT'
  sectionCart: SectionCart; seatCart: SeatCart
  onClose: () => void; onSuccess: (url: string) => void
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createOrderMutation = useMutation({
    mutationFn: ticketsPublicApi.createOrder,
    onSuccess: (data: any) => {
      if (data?.checkoutUrl) onSuccess(data.checkoutUrl)
    },
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Requerido'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const items = mode === 'SECTION'
      ? Object.values(sectionCart).map(i => ({ sectionId: i.sectionId, quantity: i.qty }))
      : Object.values(seatCart).map(i => ({ sectionId: i.sectionId, seatId: i.seatId, quantity: 1 }))

    createOrderMutation.mutate({
      slug,
      buyerName: form.name,
      buyerEmail: form.email,
      buyerPhone: form.phone || undefined,
      items,
    })
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${C.line}`, background: C.bg2, color: C.text,
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: C.bg1, borderRadius: 12, padding: 28,
        width: 400, border: `1px solid ${C.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ color: C.text, margin: '0 0 20px', fontSize: 18 }}>Datos del comprador</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
            Nombre completo *
          </label>
          <input
            style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : C.line }}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Juan Pérez"
          />
          {errors.name && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.name}</div>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
            Correo electrónico *
          </label>
          <input
            style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : C.line }}
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="juan@ejemplo.com"
          />
          {errors.email && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.email}</div>}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: C.textMute, display: 'block', marginBottom: 6 }}>
            Teléfono (opcional)
          </label>
          <input
            style={inputStyle}
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+52 55 1234 5678"
          />
        </div>

        {createOrderMutation.isError && (
          <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            Error al procesar la orden. Intenta de nuevo.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', borderRadius: 8,
              border: `1px solid ${C.line}`, background: 'transparent',
              color: C.text, cursor: 'pointer', fontSize: 14,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending}
            style={{
              flex: 2, padding: '11px', borderRadius: 8, border: 'none',
              background: createOrderMutation.isPending ? C.bg3 : C.accent,
              color: '#0a1220', fontWeight: 700, cursor: createOrderMutation.isPending ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {createOrderMutation.isPending ? 'Procesando…' : 'Ir al pago →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TicketPurchasePage() {
  const { slug } = useParams<{ slug: string }>()
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
  const mode: 'SECTION' | 'SEAT' = eventData?.mode ?? 'SECTION'
  const selectedSection = sections.find(s => s.id === selectedId) ?? null

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
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Topbar */}
      <div style={{
        background: C.bg1, borderBottom: `1px solid ${C.line}`,
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #34d399, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, color: '#0a1220',
        }}>
          iA
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {eventData.event?.name}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textMute, flexWrap: 'wrap', marginTop: 2 }}>
            {eventData.event?.eventStart && <span>📅 {formatDate(eventData.event.eventStart)}</span>}
            {eventData.event?.venueLocation && <span>📍 {eventData.event.venueLocation}</span>}
          </div>
        </div>
        {eventData.description && (
          <div style={{ fontSize: 12, color: C.textMute, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {eventData.description}
          </div>
        )}
      </div>

      {/* Stage */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 65px)' }}>
        {/* Map canvas */}
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

        {/* Side panel */}
        <SidePanel
          sections={sections}
          selectedSection={selectedSection}
          filterTier={filterTier}
          setFilterTier={setFilterTier}
          sectionCart={sectionCart}
          seatCart={seatCart}
          setSectionCart={setSectionCart}
          setSeatCart={setSeatCart}
          mode={mode}
          onCheckout={() => setCheckoutOpen(true)}
        />
      </div>

      {/* Checkout modal */}
      <CheckoutModal
        open={checkoutOpen}
        slug={slug!}
        mode={mode}
        sectionCart={sectionCart}
        seatCart={seatCart}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={(url) => { window.location.href = url }}
      />
    </div>
  )
}
