import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Button, Drawer, Tag, Typography, Space, InputNumber, Divider,
  Empty, Spin, Badge, App, Input, Image, Row, Col, DatePicker,
} from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import {
  ArrowLeftOutlined, ShoppingCartOutlined, PlusOutlined, MinusOutlined,
  DeleteOutlined, CheckCircleOutlined, CloseOutlined,
} from '@ant-design/icons'
import { eventsApi } from '../../api/events'
import { ordersApi } from '../../api/orders'

const { Title, Text } = Typography

const apiUrl = import.meta.env.VITE_API_URL || ''
const imgSrc = (path: string | null | undefined) =>
  path ? (path.startsWith('/uploads') ? `${apiUrl}${path}` : path) : undefined

// Luxury minimalist color palette (24s.com aesthetic)
const COLORS = {
  primary: '#1a1a1a',      // Charcoal — headings, buttons, key text
  secondary: '#a8a39d',    // Taupe — badges, secondary elements
  white: '#ffffff',        // Pure white — cards, main surface
  offWhite: '#f9f7f5',     // Off-white — image placeholders, light sections
  border: '#e8e6e3',       // Light gray — dividers
  textPrimary: '#1a1a1a',  // Charcoal
  textSecondary: '#6b6b6b', // Medium gray
  textTertiary: '#999999',  // Light gray
}

const TYPE_LABELS: Record<string, string> = {
  SPACE: 'Espacio', EQUIPMENT: 'Equipo', FURNITURE: 'Mobiliario',
  SERVICE: 'Servicio', CONSUMABLE: 'Consumible',
}
const TYPE_COLORS: Record<string, string> = {
  SPACE: 'purple', EQUIPMENT: 'blue', FURNITURE: 'cyan',
  SERVICE: 'green', CONSUMABLE: 'orange',
}
const TIER_LABELS: Record<string, string> = { EARLY: 'Anticipado', NORMAL: 'Normal', LATE: 'Tardío' }
const TIER_COLORS: Record<string, string> = { EARLY: '#16a34a', NORMAL: '#2563eb', LATE: '#ea580c' }

interface CartItem {
  priceListItemId: string
  resourceId: string
  name: string
  type: string
  unit: string | null
  unitPrice: number
  tier: string
  quantity: number
  observations?: string
  image: string | null
}

const TYPE_EMOJIS: Record<string, string> = {
  SPACE: '🏛️', EQUIPMENT: '🔧', FURNITURE: '🪑', SERVICE: '⚙️', CONSUMABLE: '📦',
}

// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ item, cartQty, onAdd, onRemove, onClick }: {
  item: any
  cartQty: number
  onAdd: () => void
  onRemove: () => void
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const img = imgSrc(item.resource.imageMain)
  const showImg = img && !imgFailed
  const price = Number(item.unitPrice)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.white,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'all 0.2s ease',
        border: cartQty > 0 ? `2px solid ${COLORS.primary}` : `2px solid transparent`,
      }}
    >
      {/* Image area — fixed height, strictly clipped */}
      <div style={{
        position: 'relative',
        height: 160,
        flexShrink: 0,
        background: COLORS.offWhite,
        overflow: 'hidden',
      }}>
        {showImg && (
          <img
            src={img}
            alt={item.resource.name}
            onError={() => setImgFailed(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }}
          />
        )}
        {/* Emoji placeholder — always present, visible when no image */}
        {!showImg && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 42,
          }}>
            {TYPE_EMOJIS[item.resource.type] ?? '📦'}
          </div>
        )}

        {/* Type badge */}
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
          <span style={{
            background: COLORS.secondary, color: '#fff', borderRadius: 20,
            padding: '2px 10px', fontSize: 11, fontWeight: 600,
          }}>
            {TYPE_LABELS[item.resource.type] ?? item.resource.type}
          </span>
        </div>

        {/* Cart qty badge */}
        {cartQty > 0 && (
          <div style={{
            position: 'absolute', top: 8, right: 8, zIndex: 1,
            background: COLORS.secondary, color: COLORS.primary, borderRadius: '50%',
            width: 28, height: 28, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 500, fontSize: 13,
          }}>
            {cartQty}
          </div>
        )}
      </div>

      {/* Info area — fills remaining height, flex column */}
      <div style={{
        padding: '12px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}>
        {/* Name */}
        <div style={{
          fontWeight: 600, fontSize: 14, color: COLORS.textPrimary,
          lineHeight: 1.3, marginBottom: 4,
        }}>
          {item.resource.name}
        </div>

        {/* Description — clamped, grows to fill space */}
        <div style={{ flex: 1, minHeight: 32 }}>
          {item.resource.portalDesc && (
            <div style={{
              fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.resource.portalDesc}
            </div>
          )}
        </div>

        {/* Price + controls — always at bottom */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div>
            <div style={{ fontWeight: 300, fontSize: 17, color: COLORS.primary, letterSpacing: '-0.3px' }}>
              ${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 400, marginTop: 1 }}>
              {TIER_LABELS[item.tier]}
            </div>
          </div>

          <div onClick={e => e.stopPropagation()}>
            {cartQty === 0 ? (
              <button
                onClick={onAdd}
                style={{
                  background: COLORS.primary, color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 14px', fontWeight: 400,
                  fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  letterSpacing: '0.2px', fontFamily: 'Inter, sans-serif',
                }}
              >
                <PlusOutlined style={{ fontSize: 11 }} /> Agregar
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={onRemove} style={{
                  background: COLORS.offWhite, color: COLORS.primary, border: 'none', borderRadius: 6,
                  width: 28, height: 28, cursor: 'pointer', fontWeight: 300, fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}>−</button>
                <span style={{ fontWeight: 400, minWidth: 18, textAlign: 'center', color: COLORS.primary }}>{cartQty}</span>
                <button onClick={onAdd} style={{
                  background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 6,
                  width: 28, height: 28, cursor: 'pointer', fontWeight: 300, fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}>+</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Product Detail Drawer ──────────────────────────────────────────────────────
function ProductDetailDrawer({ item, cartQty, onAdd, onRemove, onClose, open }: {
  item: any | null
  cartQty: number
  onAdd: () => void
  onRemove: () => void
  onClose: () => void
  open: boolean
}) {
  if (!item) return null
  const images = [item.resource.imageMain, item.resource.imageDesc, item.resource.imageExtra]
    .filter(Boolean).map(imgSrc).filter(Boolean) as string[]
  const price = Number(item.unitPrice)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={Math.min(560, window.innerWidth)}
      styles={{ body: { padding: 0 }, header: { background: COLORS.offWhite, borderBottom: `1px solid ${COLORS.border}` } }}
      title={
        <Space>
          <Tag color={TYPE_COLORS[item.resource.type] ?? 'default'}>
            {TYPE_LABELS[item.resource.type] ?? item.resource.type}
          </Tag>
          <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{item.resource.name}</span>
        </Space>
      }
    >
      {/* Image gallery */}
      {images.length > 0 ? (
        <div style={{ background: COLORS.offWhite }}>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 6, padding: 12, overflowX: 'auto' }}>
              {images.map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  width={i === 0 ? '100%' : 100}
                  height={i === 0 ? 260 : 100}
                  style={{ objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  preview={{ src }}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </div>
      ) : (
        <div style={{
          height: 200, background: COLORS.offWhite, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 64,
        }}>
          {item.resource.type === 'SPACE' ? '🏛️' : item.resource.type === 'EQUIPMENT' ? '🔧'
            : item.resource.type === 'FURNITURE' ? '🪑' : item.resource.type === 'SERVICE' ? '⚙️' : '📦'}
        </div>
      )}

      <div style={{ padding: 24 }}>
        <Title level={4} style={{ margin: '0 0 8px', color: COLORS.textPrimary }}>{item.resource.name}</Title>

        {/* Price & tier */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 30, fontWeight: 300, color: COLORS.primary, letterSpacing: '-0.5px', fontFamily: 'Inter, sans-serif' }}>
            ${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          {item.resource.unit && (
            <Text type="secondary" style={{ fontSize: 13, color: COLORS.textSecondary }}>por {item.resource.unit}</Text>
          )}
          <Tag color={item.tier === 'EARLY' ? 'green' : item.tier === 'LATE' ? 'orange' : 'blue'}>
            Precio {TIER_LABELS[item.tier]}
          </Tag>
        </div>

        {/* Description */}
        {(item.resource.portalDesc || item.resource.description) && (
          <div style={{ marginBottom: 20 }}>
            <Text style={{ lineHeight: 1.7, color: COLORS.textSecondary }}>
              {item.resource.portalDesc || item.resource.description}
            </Text>
          </div>
        )}

        {/* Specs */}
        {(item.resource.brand || item.resource.model || item.resource.code) && (
          <div style={{
            background: COLORS.offWhite, borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          }}>
            {item.resource.brand && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12, color: COLORS.textSecondary }}>Marca</Text>
                <Text strong style={{ fontSize: 12, color: COLORS.textPrimary }}>{item.resource.brand}</Text>
              </div>
            )}
            {item.resource.model && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12, color: COLORS.textSecondary }}>Modelo</Text>
                <Text strong style={{ fontSize: 12, color: COLORS.textPrimary }}>{item.resource.model}</Text>
              </div>
            )}
            {item.resource.code && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12, color: COLORS.textSecondary }}>Código</Text>
                <Text strong style={{ fontSize: 12, color: COLORS.textPrimary }}>{item.resource.code}</Text>
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Add to cart controls */}
        {cartQty === 0 ? (
          <button
            onClick={onAdd}
            style={{
              width: '100%', background: COLORS.primary, color: '#fff',
              border: 'none', borderRadius: 10, padding: '14px 0',
              fontWeight: 400, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              letterSpacing: '0.3px', fontFamily: 'Inter, sans-serif',
            }}
          >
            <ShoppingCartOutlined /> Agregar al carrito
          </button>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
              <button onClick={onRemove} style={{
                background: COLORS.offWhite, color: COLORS.primary, border: 'none', borderRadius: 8,
                width: 40, height: 40, cursor: 'pointer', fontWeight: 300, fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif',
              }}>−</button>
              <span style={{ fontWeight: 300, fontSize: 26, color: COLORS.primary, minWidth: 36, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                {cartQty}
              </span>
              <button onClick={onAdd} style={{
                background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8,
                width: 40, height: 40, cursor: 'pointer', fontWeight: 300, fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif',
              }}>+</button>
            </div>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: COLORS.textSecondary }}>
              Subtotal: <strong style={{ color: COLORS.primary }}>
                ${(price * cartQty).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </Text>
          </div>
        )}
      </div>
    </Drawer>
  )
}

// ── Cart Drawer ────────────────────────────────────────────────────────────────
function CartDrawer({ open, cart, onClose, onQtyChange, onRemove, onSubmit, submitting, eventId }: {
  open: boolean
  cart: CartItem[]
  onClose: () => void
  onQtyChange: (id: string, qty: number) => void
  onRemove: (id: string) => void
  onSubmit: (notes: string, startDate?: string, endDate?: string) => void
  submitting: boolean
  eventId: string
}) {
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const tax = subtotal * 0.16

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={Math.min(420, window.innerWidth)}
      title={
        <Space>
          <ShoppingCartOutlined style={{ color: COLORS.primary }} />
          <span style={{ color: COLORS.textPrimary }}>Carrito ({cart.reduce((s, i) => s + i.quantity, 0)} ítems)</span>
        </Space>
      }
      styles={{ body: { display: 'flex', flexDirection: 'column', padding: 0 }, header: { borderBottom: `1px solid ${COLORS.border}` } }}
      footer={
        <div style={{ padding: '0 0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary" style={{ color: COLORS.textSecondary }}>Subtotal</Text>
            <Text style={{ color: COLORS.textPrimary }}>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text type="secondary" style={{ color: COLORS.textSecondary }}>IVA (16%)</Text>
            <Text style={{ color: COLORS.textPrimary }}>${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: 400, color: COLORS.textPrimary, fontFamily: 'Inter, sans-serif' }}>Total estimado</Text>
            <Text style={{ fontSize: 20, fontWeight: 300, color: COLORS.primary, letterSpacing: '-0.3px', fontFamily: 'Inter, sans-serif' }}>
              ${(subtotal + tax).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>
          </div>
          {(!startDate || !endDate) && cart.length > 0 && (
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>
              Ingresa la fecha y hora de inicio y fin para continuar.
            </div>
          )}
          <button
            disabled={cart.length === 0 || !startDate || !endDate || submitting}
            onClick={() => onSubmit(notes, startDate!.toISOString(), endDate!.toISOString())}
            style={{
              width: '100%', background: (cart.length === 0 || !startDate || !endDate) ? COLORS.offWhite : COLORS.primary,
              color: (cart.length === 0 || !startDate || !endDate) ? COLORS.textTertiary : '#fff',
              border: 'none', borderRadius: 10, padding: '14px 0',
              fontWeight: 400, fontSize: 14, cursor: (cart.length === 0 || !startDate || !endDate) ? 'default' : 'pointer',
              letterSpacing: '0.3px', fontFamily: 'Inter, sans-serif',
            }}
          >
            {submitting ? 'Enviando...' : 'Confirmar solicitud'}
          </button>
        </div>
      }
    >
      {cart.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', color: COLORS.textTertiary, padding: 40 }}>
          <ShoppingCartOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
          <Text type="secondary" style={{ color: COLORS.textTertiary }}>Tu carrito está vacío</Text>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
          {cart.map(item => (
            <div key={item.priceListItemId} style={{
              display: 'flex', gap: 12, padding: '14px 0',
              borderBottom: `1px solid ${COLORS.border}`, alignItems: 'flex-start',
            }}>
              {/* Image */}
              <div style={{
                width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                background: COLORS.offWhite, overflow: 'hidden',
              }}>
                {item.image ? (
                  <img src={item.image} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 22 }}>
                    {item.type === 'SPACE' ? '🏛️' : item.type === 'EQUIPMENT' ? '🔧'
                      : item.type === 'FURNITURE' ? '🪑' : '📦'}
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.textPrimary, marginBottom: 2 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 14, color: COLORS.primary, fontWeight: 300, letterSpacing: '-0.2px', fontFamily: 'Inter, sans-serif' }}>
                  ${item.unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <button onClick={() => onQtyChange(item.priceListItemId, item.quantity - 1)} style={{
                    background: COLORS.offWhite, color: COLORS.primary, border: 'none', borderRadius: 5,
                    width: 24, height: 24, cursor: 'pointer', fontWeight: 500, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>−</button>
                  <span style={{ fontWeight: 500, minWidth: 16, textAlign: 'center', fontSize: 14, color: COLORS.primary }}>
                    {item.quantity}
                  </span>
                  <button onClick={() => onQtyChange(item.priceListItemId, item.quantity + 1)} style={{
                    background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 5,
                    width: 24, height: 24, cursor: 'pointer', fontWeight: 500, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>+</button>
                </div>
              </div>
              {/* Line total + remove */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: COLORS.textPrimary, marginBottom: 6 }}>
                  ${(item.unitPrice * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
                <button onClick={() => onRemove(item.priceListItemId)} style={{
                  background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                  padding: 2, fontSize: 14,
                }}>
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          ))}

          {/* Dates */}
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: COLORS.textPrimary }}>
                Fecha y hora de inicio <span style={{ color: '#ef4444' }}>*</span>
              </Text>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                value={startDate}
                onChange={v => setStartDate(v)}
                placeholder="Seleccionar fecha y hora"
                style={{ width: '100%', borderRadius: 8, borderColor: startDate ? COLORS.border : '#ef4444' }}
                disabledDate={d => endDate ? d.isAfter(endDate, 'day') : false}
              />
            </div>
            <div>
              <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: COLORS.textPrimary }}>
                Fecha y hora de fin <span style={{ color: '#ef4444' }}>*</span>
              </Text>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                value={endDate}
                onChange={v => setEndDate(v)}
                placeholder="Seleccionar fecha y hora"
                style={{ width: '100%', borderRadius: 8, borderColor: endDate ? COLORS.border : '#ef4444' }}
                disabledDate={d => startDate ? d.isBefore(startDate, 'day') : false}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ paddingTop: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: COLORS.textPrimary }}>
              Notas adicionales
            </Text>
            <Input.TextArea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, observaciones, etc."
              style={{ borderRadius: 8, borderColor: COLORS.border }}
            />
          </div>
        </div>
      )}
    </Drawer>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [cart, setCart] = useState<CartItem[]>([])
  const [activeType, setActiveType] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [detailItem, setDetailItem] = useState<any>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderDone, setOrderDone] = useState<any>(null)

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['portal-catalog', eventId],
    queryFn: () => eventsApi.getCatalog(eventId!),
  })

  const { data: eventData } = useQuery({
    queryKey: ['portal-event', eventId],
    queryFn: () => eventsApi.get(eventId!),
  })

  const catalog: any[] = catalogData?.data?.data ?? []
  const eventName = eventData?.data?.data?.name ?? ''

  // Group types for filter tabs
  const types = useMemo(() => {
    const seen = new Set<string>()
    catalog.forEach(i => seen.add(i.resource.type))
    return Array.from(seen)
  }, [catalog])

  const filtered = useMemo(() => {
    let list = catalog
    if (activeType !== 'ALL') list = list.filter(i => i.resource.type === activeType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.resource.name?.toLowerCase().includes(q) ||
        i.resource.portalDesc?.toLowerCase().includes(q) ||
        i.resource.description?.toLowerCase().includes(q)
      )
    }
    return list
  }, [catalog, activeType, search])

  const cartTotal = cart.reduce((s, i) => s + i.quantity, 0)

  function getQty(id: string) {
    return cart.find(c => c.priceListItemId === id)?.quantity ?? 0
  }

  function addItem(item: any) {
    setCart(prev => {
      const existing = prev.find(c => c.priceListItemId === item.id)
      if (existing) return prev.map(c => c.priceListItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, {
        priceListItemId: item.id,
        resourceId: item.resource.id,
        name: item.resource.name,
        type: item.resource.type,
        unit: item.unit ?? item.resource.unit,
        unitPrice: Number(item.unitPrice),
        tier: item.tier,
        quantity: 1,
        image: imgSrc(item.resource.imageMain) ?? null,
      }]
    })
  }

  function removeItem(item: any) {
    setCart(prev => {
      const existing = prev.find(c => c.priceListItemId === item.id)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter(c => c.priceListItemId !== item.id)
      return prev.map(c => c.priceListItemId === item.id ? { ...c, quantity: c.quantity - 1 } : c)
    })
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.priceListItemId !== id))
    } else {
      setCart(prev => prev.map(c => c.priceListItemId === id ? { ...c, quantity: qty } : c))
    }
  }

  const createMutation = useMutation({
    mutationFn: ({ notes, startDate, endDate }: { notes: string; startDate?: string; endDate?: string }) =>
      ordersApi.create(eventId!, {
        items: cart.map(i => ({ priceListItemId: i.priceListItemId, quantity: i.quantity })),
        notes,
        startDate,
        endDate,
      }),
    onSuccess: res => {
      setOrderDone(res.data.data)
      setCart([])
      setCartOpen(false)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message ?? 'Error al crear la solicitud')
    },
  })

  // ── Success screen ───────────────────────────────────────────────────────────
  if (orderDone) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <Title level={3} style={{ color: COLORS.primary, margin: '0 0 8px' }}>¡Solicitud enviada!</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 15, color: COLORS.textSecondary }}>
          Solicitud <strong>{orderDone.orderNumber}</strong> recibida correctamente.
        </Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 28, textAlign: 'center', color: COLORS.textSecondary }}>
          El equipo del evento revisará tu solicitud y te notificará.
        </Text>
        <Space>
          <Button onClick={() => navigate('/orders')} style={{ fontWeight: 500 }}>Ver mis solicitudes</Button>
          <Button type="primary" style={{ background: COLORS.primary, borderColor: COLORS.primary, fontWeight: 500 }}
            onClick={() => { setOrderDone(null) }}>
            Seguir comprando
          </Button>
        </Space>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.white }}>
      {/* Header */}
      <div style={{
        background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`,
        padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/events/${eventId}`)} size="small" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.textPrimary, lineHeight: 1.2 }}>Catálogo</div>
              {eventName && <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{eventName}</div>}
            </div>
          </Space>
          <Badge count={cartTotal} size="small" color={COLORS.primary}>
            <Button
              icon={<ShoppingCartOutlined />}
              onClick={() => setCartOpen(true)}
              style={{ borderColor: cartTotal > 0 ? COLORS.primary : undefined, color: cartTotal > 0 ? COLORS.primary : undefined }}
            >
              {cartTotal > 0 ? `Carrito (${cartTotal})` : 'Carrito'}
            </Button>
          </Badge>
        </div>

        {/* Search */}
        <div style={{ marginTop: 10 }}>
          <Input
            placeholder="Buscar productos y servicios..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ borderRadius: 8, borderColor: COLORS.border }}
          />
        </div>

        {/* Type filter tabs */}
        {types.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
            {['ALL', ...types].map(t => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                style={{
                  flexShrink: 0, padding: '4px 14px', borderRadius: 20,
                  border: '1.5px solid',
                  borderColor: activeType === t ? COLORS.primary : COLORS.border,
                  background: activeType === t ? COLORS.primary : COLORS.white,
                  color: activeType === t ? '#fff' : COLORS.textSecondary,
                  fontWeight: activeType === t ? 700 : 400,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                {t === 'ALL' ? 'Todo' : (TYPE_LABELS[t] ?? t)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ padding: '16px 12px 120px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <Empty description="No hay productos en este catálogo" style={{ marginTop: 60 }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 200px))',
            gap: 14,
            justifyContent: 'center',
          }}>
            {filtered.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                cartQty={getQty(item.id)}
                onAdd={() => addItem(item)}
                onRemove={() => removeItem(item)}
                onClick={() => setDetailItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating cart FAB — bottom-right, clear of content */}
      {cartTotal > 0 && (
        <div style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 100,
        }}>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              background: COLORS.primary, color: '#fff', border: 'none',
              borderRadius: 50, width: 56, height: 56,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(26,26,26,0.25)',
              position: 'relative',
            }}
          >
            <ShoppingCartOutlined style={{ fontSize: 22 }} />
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: '#fff',
              borderRadius: 10, minWidth: 18, height: 18,
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
            }}>
              {cartTotal}
            </span>
          </button>
        </div>
      )}

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        item={detailItem}
        open={!!detailItem}
        cartQty={detailItem ? getQty(detailItem.id) : 0}
        onAdd={() => detailItem && addItem(detailItem)}
        onRemove={() => detailItem && removeItem(detailItem)}
        onClose={() => setDetailItem(null)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onQtyChange={setQty}
        onRemove={id => setCart(prev => prev.filter(c => c.priceListItemId !== id))}
        onSubmit={(notes, startDate, endDate) => createMutation.mutate({ notes, startDate, endDate })}
        submitting={createMutation.isPending}
        eventId={eventId!}
      />
    </div>
  )
}
