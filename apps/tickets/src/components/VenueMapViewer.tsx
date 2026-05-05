import { useRef, useEffect, useCallback, useState } from 'react'
import { Button, Badge, InputNumber, message, Empty } from 'antd'
import { ShoppingCartOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'
import { useCart } from '../store/cart'

interface Seat {
  id: string
  row: string
  number: number
  status: string
}

interface Section {
  id: string
  name: string
  colorHex?: string
  color?: string
  tier?: string
  price: number
  capacity: number
  sold: number
  shapeType?: string
  shapeData?: any
  labelX?: number
  labelY?: number
  seats?: Seat[]
}

interface MapData {
  width?: number
  height?: number
  perimeter?: string
  field?: { cx: number; cy: number; rx: number; ry: number }
  accesses?: Array<{ id: string; x: number; y: number; label: string; primary?: boolean }>
  pois?: Array<{ id: string; type: string; x: number; y: number; label: string }>
}

const POI_COLORS: Record<string, string> = {
  wc: '#3B82F6', fb: '#F59E0B', merch: '#EC4899', med: '#EF4444', info: '#10B981',
}
const POI_LABELS: Record<string, string> = { wc: 'WC', fb: 'F&B', merch: 'Merch', med: 'Médico', info: 'Info' }

interface Props {
  sections: Section[]
  mapData?: MapData
  mode: 'SECTION' | 'SEAT'
  slug: string
  containerHeight?: string
}

export default function VenueMapViewer({ sections, mapData, mode, slug, containerHeight = 'calc(100vh - 130px)' }: Props) {
  const { addItem, removeItem, items, setSlug, total } = useCart()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const svgWidth = mapData?.width ?? 1200
  const svgHeight = mapData?.height ?? 600
  const selected = sections.find(s => s.id === selectedId) ?? null
  const hasShapes = sections.some(s => s.shapeType && s.shapeData)

  const cartItems = items
  const cartTotal = total()
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const cartSeatIds = new Set(cartItems.filter(i => i.seatId).map(i => i.seatId!))
  const sectionCartQty = (sectionId: string) =>
    cartItems.find(i => i.sectionId === sectionId && !i.seatId)?.quantity ?? 0

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

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const tag = (e.target as SVGElement).tagName
    if (['svg', 'path', 'ellipse'].includes(tag)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }
  const handleMouseUp = () => setIsPanning(false)

  const ensureSlug = () => {
    const { slug: cartSlug } = useCart.getState()
    if (cartSlug && cartSlug !== slug) {
      message.warning('Tu carrito pertenece a otro evento. Limpia el carrito primero.')
      return false
    }
    setSlug(slug)
    return true
  }

  const addSectionToCart = (section: Section, qty: number) => {
    if (!ensureSlug()) return
    addItem({ sectionId: section.id, sectionName: section.name, quantity: qty, unitPrice: section.price })
    message.success(`${qty} boleto(s) de "${section.name}" agregados`)
  }

  const toggleSeat = (section: Section, seat: Seat) => {
    if (seat.status !== 'AVAILABLE') return
    if (!ensureSlug()) return
    if (cartSeatIds.has(seat.id)) {
      removeItem(section.id, seat.id)
    } else {
      addItem({
        sectionId: section.id,
        sectionName: section.name,
        seatId: seat.id,
        seatLabel: `${seat.row}${seat.number}`,
        quantity: 1,
        unitPrice: section.price,
      })
    }
  }

  // ── Panel ──────────────────────────────────────────────────────────────────
  const renderPanel = () => {
    if (!selected) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#aaa' }}>
          <div style={{ fontSize: 40 }}>🗺️</div>
          <div style={{ fontSize: 13, textAlign: 'center' }}>Haz clic en una zona del mapa para ver detalles</div>
        </div>
      )
    }

    const avail = (selected.capacity ?? 0) - (selected.sold ?? 0)
    const isSoldOut = avail <= 0 && (selected.capacity ?? 0) > 0
    const color = selected.colorHex ?? selected.color ?? '#6B46C1'

    if (mode === 'SEAT') {
      const seats = selected.seats ?? []
      const byRow: Record<string, Seat[]> = {}
      for (const seat of seats) {
        if (!byRow[seat.row]) byRow[seat.row] = []
        byRow[seat.row].push(seat)
      }
      const rows = Object.keys(byRow).sort()
      const selectedSeatCount = seats.filter(s => cartSeatIds.has(s.id)).length

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>{selected.name}</span>
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              {avail > 0 ? `${avail} lugares disponibles` : 'Agotado'}
              {' · '}
              <strong style={{ color: '#6B46C1' }}>
                ${Number(selected.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
              {' / butaca'}
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 16, flexShrink: 0 }}>
            {[
              { color: '#e2e8f0', label: 'Disponible', border: '#cbd5e1' },
              { color: '#6B46C1', label: 'Seleccionado', border: '#6B46C1' },
              { color: '#d9d9d9', label: 'Vendido', border: '#d9d9d9' },
            ].map(({ color: c, label, border }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: c, border: `1px solid ${border}`, flexShrink: 0 }} />
                <span style={{ color: '#666' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Seat grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {rows.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', paddingTop: 24 }}>Sin butacas configuradas</div>
            ) : rows.map(row => (
              <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: '#999', width: 18, textAlign: 'right', flexShrink: 0 }}>{row}</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {byRow[row].sort((a, b) => a.number - b.number).map(seat => {
                    const isInCart = cartSeatIds.has(seat.id)
                    const isAvail = seat.status === 'AVAILABLE'
                    let bg = '#d9d9d9'
                    if (isAvail) bg = isInCart ? '#6B46C1' : '#e2e8f0'
                    return (
                      <button
                        key={seat.id}
                        title={`${seat.row}${seat.number}`}
                        onClick={() => toggleSeat(selected, seat)}
                        disabled={!isAvail}
                        style={{
                          width: 22, height: 22, borderRadius: 4,
                          border: isInCart ? '1px solid #6B46C1' : '1px solid #cbd5e1',
                          background: bg,
                          cursor: isAvail ? 'pointer' : 'not-allowed',
                          fontSize: 0, flexShrink: 0, padding: 0,
                          transition: 'background 0.1s',
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {selectedSeatCount > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                {selectedSeatCount} butaca(s) seleccionada(s) ·{' '}
                <strong style={{ color: '#6B46C1' }}>
                  ${(selectedSeatCount * selected.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          )}
        </div>
      )
    }

    // SECTION mode panel
    const qty = sectionCartQty(selected.id)
    const [localQty, setLocalQty] = useState(qty > 0 ? qty : 1)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>{selected.name}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#6B46C1', marginBottom: 4 }}>
            ${Number(selected.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}> / entrada</span>
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            {avail > 0 ? `${avail} de ${selected.capacity} disponibles` : 'Agotado'}
          </div>
          {selected.capacity && (
            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.round(((selected.sold ?? 0) / selected.capacity) * 100))}%`,
                background: avail === 0 ? '#ff4d4f' : '#6B46C1',
                borderRadius: 3,
              }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: '16px' }}>
          {isSoldOut ? (
            <Button disabled block size="large">Agotado</Button>
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Cantidad</label>
                <InputNumber
                  min={1}
                  max={avail}
                  value={localQty}
                  onChange={v => setLocalQty(v ?? 1)}
                  style={{ width: '100%' }}
                  size="large"
                />
              </div>
              <Button
                type="primary"
                block
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={() => addSectionToCart(selected, localQty)}
                style={{ background: '#6B46C1', borderColor: '#6B46C1' }}
              >
                Agregar · ${(localQty * selected.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Cart summary bar at bottom ─────────────────────────────────────────────
  const cartBar = cartCount > 0 && (
    <div style={{
      padding: '12px 16px', background: '#6B46C1', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <Badge count={cartCount} style={{ background: '#fff', color: '#6B46C1' }}>
        <ShoppingCartOutlined style={{ fontSize: 20, color: '#fff' }} />
      </Badge>
      <span style={{ fontWeight: 700, fontSize: 16 }}>
        ${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </span>
      <Button
        size="small"
        style={{ background: '#fff', color: '#6B46C1', border: 'none', fontWeight: 600 }}
        onClick={() => window.location.href = '/carrito'}
      >
        Ver carrito →
      </Button>
    </div>
  )

  // ── Fallback: no shapes ────────────────────────────────────────────────────
  if (!mapData || !hasShapes) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: containerHeight }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Section list */}
            <div style={{ flex: 1 }}>
              {sections.length === 0 ? (
                <Empty description="Sin secciones configuradas" />
              ) : sections.map(sec => {
                const avail = (sec.capacity ?? 0) - (sec.sold ?? 0)
                const isSelected = sec.id === selectedId
                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedId(sec.id)}
                    style={{
                      padding: '16px 20px', borderRadius: 10, marginBottom: 12, cursor: 'pointer',
                      border: `2px solid ${isSelected ? '#6B46C1' : '#e8e8e8'}`,
                      background: isSelected ? '#f5f3ff' : '#fff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: sec.colorHex ?? sec.color ?? '#6B46C1', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{sec.name}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{avail > 0 ? `${avail} disponibles` : 'Agotado'}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#6B46C1' }}>
                        ${Number(sec.price).toLocaleString('es-MX')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Panel */}
            <div style={{ width: 320, flexShrink: 0, border: '1px solid #f0f0f0', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {renderPanel()}
            </div>
          </div>
        </div>
        {cartBar}
      </div>
    )
  }

  // ── Map view ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: containerHeight }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* SVG canvas */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#1a1a2e' }}
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
            {mapData?.perimeter && (
              <path d={mapData.perimeter} fill="#0f1e35" stroke="#1e3a5f" strokeWidth="2" />
            )}
            {mapData?.field && (
              <ellipse
                cx={mapData.field.cx} cy={mapData.field.cy}
                rx={mapData.field.rx} ry={mapData.field.ry}
                fill="#14532d" stroke="#22c55e" strokeWidth="2"
              />
            )}
            {sections.map(sec => {
              const isSelected = sec.id === selectedId
              const color = sec.colorHex ?? sec.color ?? '#6B46C1'
              const avail = (sec.capacity ?? 0) - (sec.sold ?? 0)
              const isSoldOut = avail <= 0 && (sec.capacity ?? 0) > 0
              const fillOpacity = isSelected ? 0.85 : 0.55
              const sectionSeatsInCart = mode === 'SEAT'
                ? (sec.seats ?? []).filter(s => cartSeatIds.has(s.id)).length
                : sectionCartQty(sec.id)

              return (
                <g
                  key={sec.id}
                  onClick={() => { if (!isSoldOut) setSelectedId(sec.id) }}
                  style={{ cursor: isSoldOut ? 'not-allowed' : 'pointer' }}
                >
                  {sec.shapeType === 'rect' && sec.shapeData && (
                    <rect
                      x={sec.shapeData.x} y={sec.shapeData.y}
                      width={sec.shapeData.w} height={sec.shapeData.h}
                      fill={color} fillOpacity={fillOpacity}
                      stroke={isSelected ? '#fff' : color} strokeWidth={isSelected ? 2.5 : 1}
                    />
                  )}
                  {sec.shapeType === 'circle' && sec.shapeData && (
                    <circle
                      cx={sec.shapeData.cx} cy={sec.shapeData.cy} r={sec.shapeData.r}
                      fill={color} fillOpacity={fillOpacity}
                      stroke={isSelected ? '#fff' : color} strokeWidth={isSelected ? 2.5 : 1}
                    />
                  )}
                  {sec.labelX != null && sec.labelY != null && (
                    <text
                      x={sec.labelX} y={sec.labelY} fontSize="13" fontWeight="600"
                      fill="white" pointerEvents="none" textAnchor="middle" dominantBaseline="middle"
                    >
                      {sec.name}
                    </text>
                  )}
                  {isSoldOut && sec.labelX != null && sec.labelY != null && (
                    <text x={sec.labelX} y={(sec.labelY ?? 0) + 16} fontSize="10" fill="#ef4444"
                      textAnchor="middle" pointerEvents="none">AGOTADO</text>
                  )}
                  {sectionSeatsInCart > 0 && sec.labelX != null && sec.labelY != null && (
                    <>
                      <circle cx={(sec.labelX ?? 0) + 18} cy={(sec.labelY ?? 0) - 14} r="10"
                        fill="#52c41a" pointerEvents="none" />
                      <text x={(sec.labelX ?? 0) + 18} y={(sec.labelY ?? 0) - 13}
                        fontSize="9" fontWeight="700" fill="#fff"
                        textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
                        {sectionSeatsInCart}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
            {(mapData?.accesses ?? []).map(acc => (
              <g key={acc.id} pointerEvents="none">
                <circle cx={acc.x} cy={acc.y} r="14" fill={acc.primary ? '#22c55e' : '#475569'} stroke="white" strokeWidth="1.5" />
                <text x={acc.x} y={acc.y + 1} fontSize="11" fill="white" textAnchor="middle" dominantBaseline="middle">→</text>
                <text x={acc.x} y={acc.y + 22} fontSize="9" fill="#94a3b8" textAnchor="middle">{acc.label}</text>
              </g>
            ))}
            {(mapData?.pois ?? []).map(poi => {
              const c = POI_COLORS[poi.type] ?? '#64748b'
              return (
                <g key={poi.id} pointerEvents="none">
                  <rect x={poi.x - 18} y={poi.y - 10} width="36" height="20" rx="10" fill="#1e293b" stroke={c} strokeWidth="1.5" />
                  <text x={poi.x} y={poi.y + 1} fontSize="9" fill={c} textAnchor="middle" dominantBaseline="middle">
                    {POI_LABELS[poi.type] ?? poi.type}
                  </text>
                  <text x={poi.x} y={poi.y + 18} fontSize="8" fill="#475569" textAnchor="middle">{poi.label}</text>
                </g>
              )
            })}
          </svg>

          {/* Zoom controls */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { icon: <ZoomInOutlined />, action: () => setZoom(z => Math.min(5, z * 1.2)) },
              { icon: <span style={{ fontSize: 11 }}>⟳</span>, action: () => { setZoom(1); setPan({ x: 0, y: 0 }) } },
              { icon: <ZoomOutOutlined />, action: () => setZoom(z => Math.max(0.25, z / 1.2)) },
            ].map(({ icon, action }, i) => (
              <Button key={i} size="small" icon={icon} onClick={action}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
              />
            ))}
          </div>

          {/* Instruction hint */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16,
            background: 'rgba(0,0,0,0.5)', color: '#94a3b8',
            fontSize: 11, padding: '4px 10px', borderRadius: 20,
          }}>
            Scroll para zoom · Arrastra para mover
          </div>
        </div>

        {/* Side panel */}
        <div style={{
          width: 320, flexShrink: 0, background: '#fff',
          borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderPanel()}
        </div>
      </div>

      {/* Cart bar */}
      {cartBar}
    </div>
  )
}
