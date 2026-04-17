import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Button, InputNumber, App,
  Empty, Spin, Image, Grid, Row, Col, Input, DatePicker,
} from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import {
  ArrowLeftOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  DeleteOutlined, ArrowRightOutlined, FileTextOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { eventsApi } from '../../api/events'
import { ordersApi } from '../../api/orders'

const { useBreakpoint } = Grid

const apiUrl = import.meta.env.VITE_API_URL || ''
const imgSrc = (path: string | null | undefined) =>
  path ? (path.startsWith('/uploads') ? `${apiUrl}${path}` : path) : undefined

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  CONSUMABLE: 'Consumible', EQUIPMENT: 'Equipo', FURNITURE: 'Mobiliario',
  SERVICE: 'Servicio', SPACE: 'Espacio',
}
const TIER_LABELS: Record<string, string> = { EARLY: 'Anticipado', NORMAL: 'Normal', LATE: 'Tardío' }
const TIER_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  EARLY:  { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  NORMAL: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  LATE:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
}

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
}

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

/* ─── Step indicator ───────────────────────────────────────────────────────── */
function StepBubble({ n, label, active, done }: { n: string; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: done ? '#6B46C1' : active ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${done ? '#6B46C1' : active ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        transition: 'all 0.3s',
      }}>
        {done
          ? <CheckCircleOutlined style={{ color: '#fff', fontSize: 16 }} />
          : <span style={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 700 }}>{n}</span>
        }
      </div>
      <span style={{
        color: active ? '#fff' : done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)',
        fontWeight: active ? 600 : 400, fontSize: 14, transition: 'all 0.3s',
      }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Product card ─────────────────────────────────────────────────────────── */
function ProductCard({ item, quantity, onQtyChange }: {
  item: any; quantity: number; onQtyChange: (qty: number) => void
}) {
  const screens = useBreakpoint()
  const isMobile = !screens.sm
  const tierCfg = TIER_COLORS[item.tier] ?? TIER_COLORS.NORMAL
  const inCart = quantity > 0

  return (
    <div style={{
      background: '#fff',
      border: inCart ? '2px solid #6B46C1' : '1px solid #f0f4f8',
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: inCart ? '0 8px 32px rgba(107,70,193,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all 0.2s ease',
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      {/* Image */}
      <div style={{
        height: isMobile ? 120 : 148,
        background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {imgSrc(item.resource.imageMain) ? (
          <Image
            src={imgSrc(item.resource.imageMain)}
            preview={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ fontSize: 40, opacity: 0.18 }}>📦</div>
        )}
        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
          borderRadius: 8, padding: '3px 10px',
          fontSize: 11, fontWeight: 600, color: '#475569',
        }}>
          {RESOURCE_TYPE_LABELS[item.resource.type] ?? item.resource.type}
        </div>
        {/* In-cart indicator */}
        {inCart && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: '#6B46C1', borderRadius: '50%',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleOutlined style={{ color: '#fff', fontSize: 13 }} />
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
          {item.resource.name}
        </div>
        {item.resource.portalDesc && (
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            {item.resource.portalDesc}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              {fmt(Number(item.unitPrice))}
            </div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              background: tierCfg.bg, color: tierCfg.color,
              border: `1px solid ${tierCfg.border}`,
              borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600,
            }}>
              {TIER_LABELS[item.tier] ?? item.tier}
            </div>
          </div>
          <InputNumber
            min={0}
            value={quantity}
            onChange={(val) => onQtyChange(val ?? 0)}
            style={{
              width: 80,
              borderRadius: 10,
              borderColor: inCart ? '#6B46C1' : undefined,
            }}
            size="middle"
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Cart row ─────────────────────────────────────────────────────────────── */
function CartRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const tierCfg = TIER_COLORS[item.tier] ?? TIER_COLORS.NORMAL
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 0', borderBottom: '1px solid #f1f5f9',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>📦</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>×{item.quantity}</span>
          <div style={{
            background: tierCfg.bg, color: tierCfg.color,
            border: `1px solid ${tierCfg.border}`,
            borderRadius: 5, padding: '0 6px', fontSize: 10, fontWeight: 600,
          }}>
            {TIER_LABELS[item.tier] ?? item.tier}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>
          {fmt(item.unitPrice * item.quantity)}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(item.unitPrice)} c/u</div>
      </div>
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#94a3b8', padding: 6, borderRadius: 6,
          display: 'flex', alignItems: 'center',
        }}
      >
        <DeleteOutlined />
      </button>
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────────────────────── */
export default function NewOrderPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [step, setStep] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const [orderCreated, setOrderCreated] = useState<any>(null)

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['portal-catalog', eventId],
    queryFn: () => eventsApi.getCatalog(eventId!),
  })

  const catalog = catalogData?.data?.data ?? []

  const createOrderMutation = useMutation({
    mutationFn: () => ordersApi.create(eventId!, {
      items: cart.map((item) => ({
        priceListItemId: item.priceListItemId,
        quantity: item.quantity,
        observations: item.observations,
      })),
      notes,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    }),
    onSuccess: (res) => {
      setOrderCreated(res.data.data)
      setStep(2)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message ?? 'Error al crear la solicitud')
    },
  })

  const updateQty = (itemId: string, qty: number, item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.priceListItemId === itemId)
      if (qty <= 0) return prev.filter((c) => c.priceListItemId !== itemId)
      if (existing) return prev.map((c) => c.priceListItemId === itemId ? { ...c, quantity: qty } : c)
      return [...prev, {
        priceListItemId: itemId,
        resourceId: item.resource.id,
        name: item.resource.name,
        type: item.resource.type,
        unit: item.unit ?? item.resource.unit,
        unitPrice: Number(item.unitPrice),
        tier: item.tier,
        quantity: qty,
      }]
    })
  }

  const removeFromCart = (itemId: string) => setCart((prev) => prev.filter((c) => c.priceListItemId !== itemId))

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const tax = subtotal * 0.16
  const total = subtotal + tax

  const STEPS = [
    { n: '01', label: 'Seleccionar productos' },
    { n: '02', label: 'Confirmar pedido' },
    { n: '03', label: 'Listo' },
  ]

  /* ── Success screen ─────────────────────────────────────────────────────── */
  if (step === 2 && orderCreated) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 24,
          border: '1px solid #f0f4f8',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          padding: isMobile ? '40px 24px' : '56px 64px',
          textAlign: 'center', maxWidth: 520, width: '100%',
        }}>
          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: 22,
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            border: '1px solid #a7f3d0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
          }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: '#059669' }} />
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(109,70,193,0.1)', border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: 40, padding: '5px 18px', marginBottom: 20,
          }}>
            <span style={{ color: '#6B46C1', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Solicitud enviada
            </span>
          </div>

          <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: '#0f172a', marginBottom: 12, lineHeight: 1.2 }}>
            ¡Tu solicitud fue recibida!
          </div>
          <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: 8 }}>
            Número de solicitud:
          </div>
          <div style={{
            display: 'inline-block', background: '#f5f3ff', color: '#6B46C1',
            borderRadius: 10, padding: '8px 24px', fontSize: 20, fontWeight: 800,
            letterSpacing: 1, marginBottom: 20,
          }}>
            {orderCreated.orderNumber}
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 36 }}>
            El equipo del evento revisará tu solicitud y te notificará sobre el estado de cada ítem.
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              size="large"
              onClick={() => navigate('/orders')}
              style={{
                borderColor: '#e2e8f0', color: '#475569',
                height: 48, padding: '0 28px', borderRadius: 10, fontWeight: 500,
              }}
            >
              Ver mis solicitudes
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate(`/events/${eventId}`)}
              style={{
                background: '#6B46C1', borderColor: '#6B46C1',
                height: 48, padding: '0 28px', borderRadius: 10, fontWeight: 600,
              }}
            >
              Volver al evento
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: 20, marginBottom: 28, overflow: 'hidden', position: 'relative',
        padding: isMobile ? '28px 20px 24px' : '36px 40px 32px',
      }}>
        {/* Dot pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(109,40,217,0.3) 0%, transparent 65%)',
          top: -100, right: -60, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Back button */}
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 9, padding: '6px 14px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)', fontSize: 13, display: 'inline-flex',
              alignItems: 'center', gap: 6, marginBottom: 20,
            }}
          >
            <ArrowLeftOutlined style={{ fontSize: 12 }} />
            Volver al evento
          </button>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(109,70,193,0.25)', border: '1px solid rgba(167,139,250,0.35)',
            borderRadius: 40, padding: '5px 16px', marginBottom: 14,
          }}>
            <ShoppingCartOutlined style={{ color: '#a78bfa', fontSize: 12 }} />
            <span style={{ color: '#c4b5fd', fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Nueva solicitud
            </span>
          </div>

          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#fff', marginBottom: 20, lineHeight: 1.2 }}>
            Solicitud de Productos y Servicios
          </div>

          {/* Step indicators */}
          <div style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 12 : 32,
          }}>
            {STEPS.map((s, i) => (
              <StepBubble key={i} n={s.n} label={s.label} active={step === i} done={step > i} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Step 0: Catalog ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 64 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#64748b', fontSize: 14 }}>Cargando catálogo...</div>
            </div>
          ) : catalog.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 18, border: '1px solid #f0f4f8',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 48, textAlign: 'center',
            }}>
              <Empty description={
                <span style={{ color: '#64748b' }}>No hay productos disponibles en el catálogo</span>
              } />
            </div>
          ) : (
            <>
              <Row gutter={[16, 16]}>
                {catalog.map((item: any) => {
                  const cartItem = cart.find((c) => c.priceListItemId === item.id)
                  return (
                    <Col xs={12} sm={8} md={6} key={item.id}>
                      <ProductCard
                        item={item}
                        quantity={cartItem?.quantity ?? 0}
                        onQtyChange={(qty) => updateQty(item.id, qty, item)}
                      />
                    </Col>
                  )
                })}
              </Row>

              {/* Sticky bottom bar */}
              <div style={{
                position: 'sticky', bottom: isMobile ? 64 : 16, zIndex: 10,
                marginTop: 24,
              }}>
                <div style={{
                  background: cart.length > 0 ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: cart.length > 0 ? '1px solid rgba(167,139,250,0.3)' : '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '16px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  flexWrap: 'wrap', gap: 12,
                  transition: 'all 0.3s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: cart.length > 0 ? 'rgba(167,139,250,0.2)' : '#f5f3ff',
                      border: `1px solid ${cart.length > 0 ? 'rgba(167,139,250,0.3)' : '#e9d5ff'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ShoppingCartOutlined style={{ color: cart.length > 0 ? '#a78bfa' : '#6B46C1', fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: cart.length > 0 ? '#fff' : '#0f172a' }}>
                        {cart.length === 0 ? 'Sin ítems seleccionados' : `${cart.length} ítem${cart.length > 1 ? 's' : ''} en el carrito`}
                      </div>
                      {cart.length > 0 && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                          Subtotal: {fmt(subtotal)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="large"
                    icon={<ArrowRightOutlined />}
                    disabled={cart.length === 0}
                    onClick={() => setStep(1)}
                    style={{
                      background: cart.length > 0 ? '#fff' : '#f1f5f9',
                      color: cart.length > 0 ? '#1e1b4b' : '#94a3b8',
                      borderColor: 'transparent',
                      fontWeight: 700, height: 44, padding: '0 24px', borderRadius: 10,
                    }}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 1: Confirm ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <Row gutter={[24, 24]}>
          {/* Cart items */}
          <Col xs={24} lg={15}>
            <div style={{
              background: '#fff', borderRadius: 18,
              border: '1px solid #f0f4f8',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              padding: isMobile ? 16 : 28,
            }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Productos seleccionados
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Revisa tu selección antes de confirmar
                </div>
              </div>

              {cart.map((item) => (
                <CartRow
                  key={item.priceListItemId}
                  item={item}
                  onRemove={() => removeFromCart(item.priceListItemId)}
                />
              ))}

              {/* Notes */}
              {/* Dates */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <CalendarOutlined style={{ color: '#6B46C1' }} />
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>Fecha y hora de inicio <span style={{ color: '#ef4444' }}>*</span></span>
                    </div>
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="DD/MM/YYYY HH:mm"
                      value={startDate}
                      onChange={v => setStartDate(v)}
                      placeholder="Seleccionar fecha y hora"
                      style={{ width: '100%', borderRadius: 10, borderColor: startDate ? undefined : '#ef4444' }}
                      disabledDate={d => endDate ? d.isAfter(endDate, 'day') : false}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <CalendarOutlined style={{ color: '#6B46C1' }} />
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>Fecha y hora de fin <span style={{ color: '#ef4444' }}>*</span></span>
                    </div>
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="DD/MM/YYYY HH:mm"
                      value={endDate}
                      onChange={v => setEndDate(v)}
                      placeholder="Seleccionar fecha y hora"
                      style={{ width: '100%', borderRadius: 10, borderColor: endDate ? undefined : '#ef4444' }}
                      disabledDate={d => startDate ? d.isBefore(startDate, 'day') : false}
                    />
                  </Col>
                </Row>
              </div>

              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <FileTextOutlined style={{ color: '#6B46C1' }} />
                  <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>Notas adicionales</span>
                </div>
                <Input.TextArea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones especiales, fechas de entrega, observaciones..."
                  style={{ borderRadius: 10, resize: 'none', fontSize: 14 }}
                />
              </div>
            </div>
          </Col>

          {/* Summary */}
          <Col xs={24} lg={9}>
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderRadius: 18, padding: isMobile ? 20 : 28,
              border: '1px solid rgba(167,139,250,0.2)',
              position: 'sticky', top: 16,
            }}>
              {/* Dot pattern */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 18, opacity: 0.07,
                backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
                backgroundSize: '22px 22px', pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 24 }}>
                  Resumen del pedido
                </div>

                {/* Line items summary */}
                <div style={{ marginBottom: 20 }}>
                  {cart.map((item) => (
                    <div key={item.priceListItemId} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      marginBottom: 10,
                    }}>
                      <div style={{ flex: 1, paddingRight: 12 }}>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          {fmt(item.unitPrice)} × {item.quantity}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', flexShrink: 0 }}>
                        {fmt(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Subtotal</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{fmt(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>IVA (16%)</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{fmt(tax)}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px',
                  }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>Total</span>
                    <span style={{ fontWeight: 800, color: '#a78bfa', fontSize: 20 }}>{fmt(total)}</span>
                  </div>
                </div>

                {(!startDate || !endDate) && (
                  <div style={{ fontSize: 12, color: '#fca5a5', textAlign: 'center', marginBottom: 8 }}>
                    Ingresa la fecha y hora de inicio y fin para continuar.
                  </div>
                )}
                <Button
                  type="primary"
                  size="large"
                  block
                  disabled={!startDate || !endDate}
                  loading={createOrderMutation.isPending}
                  onClick={() => createOrderMutation.mutate()}
                  style={{
                    background: (!startDate || !endDate) ? 'rgba(255,255,255,0.3)' : '#fff',
                    borderColor: 'transparent', color: '#1e1b4b',
                    fontWeight: 700, height: 48, borderRadius: 10, fontSize: 15,
                    marginBottom: 10,
                  }}
                >
                  Confirmar solicitud
                </Button>

                <Button
                  block
                  onClick={() => setStep(0)}
                  style={{
                    background: 'transparent', borderColor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.6)', height: 40, borderRadius: 10, fontSize: 13,
                  }}
                >
                  Modificar selección
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      )}
    </div>
  )
}
