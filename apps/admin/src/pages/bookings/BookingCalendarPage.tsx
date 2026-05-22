import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Select, Button, Input, Typography, Spin, Empty, Tag, Tooltip,
  Badge, Space, Divider, Modal, Row, Col, DatePicker,
  Form, Radio, App, Alert,
} from 'antd'
import {
  LeftOutlined, RightOutlined, CalendarOutlined,
  WarningOutlined, SearchOutlined, ClearOutlined,
  DownloadOutlined, TeamOutlined, AlertOutlined, UnorderedListOutlined,
  HighlightOutlined, CloseOutlined, PlusOutlined, CheckOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { bookingsApi } from '../../api/bookings'
import { eventsApi } from '../../api/events'
import { resourcesApi } from '../../api/resources'
import { eventSpacesApi } from '../../api/eventSpaces'
import { clientsApi } from '../../api/clients'
import { exportToCsv } from '../../utils/exportCsv'
import CreateOrderFromSpacesModal from '../../components/CreateOrderFromSpacesModal'
import { useAuthStore } from '../../stores/authStore'
import { PRIVILEGES } from '@iventia/shared'

dayjs.extend(isoWeek)

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// ── Constants ─────────────────────────────────────────────────────────────────
const NAVY      = '#1a3a5c'
const SEL_COLOR = '#6B46C1'
const DAY_W     = 40
const LANE_H    = 44
const NAME_W    = 200
const HDR_H1    = 28
const HDR_H2    = 22
const HDR_H3    = 22
const HDR_TOTAL = HDR_H1 + HDR_H2 + HDR_H3

const DAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const VIEW_DAYS: Record<string, number> = { day: 1, week: 7, month: 30, '2months': 60 }

const PHASE_STYLE: Record<string, { background: string; borderStyle: string; color: string; label: string }> = {
  SETUP:    { background: '#fffbe6', borderStyle: 'dashed', color: '#d48806', label: 'Montaje' },
  EVENT:    { background: '#e6f4ff', borderStyle: 'solid',  color: '#1677ff', label: 'Evento'  },
  TEARDOWN: { background: '#fff7e6', borderStyle: 'dashed', color: '#fa8c16', label: 'Desmontaje' },
}

const EVENT_STATUS_COLOR: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_EXECUTION: 'orange', CLOSED: 'purple', CANCELLED: 'red',
}
const EVENT_STATUS_LABEL: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}
const ORDER_STATUS_COLOR: Record<string, string> = {
  QUOTED: '#1677ff', CONFIRMED: '#52c41a', EXECUTED: '#2f54eb',
  INVOICED: '#13c2c2', CANCELLED: '#ff4d4f', CREDIT_NOTE: '#d4b106',
}
const ORDER_STATUS_LABEL: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada',
  INVOICED: 'Facturada', CANCELLED: 'Cancelada', CREDIT_NOTE: 'Nota de Crédito',
}
const RESOURCE_TYPE_LABEL: Record<string, string> = {
  CONSUMABLE: 'Consumible', EQUIPMENT: 'Equipo', SPACE: 'Espacio',
  FURNITURE: 'Mobiliario', SERVICE: 'Servicio', DISCOUNT: 'Descuento', TAX: 'Impuesto',
}

function fmt(n: number) {
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}


// ── Date helpers ──────────────────────────────────────────────────────────────
function buildDays(anchorDate: dayjs.Dayjs, totalDays: number) {
  return Array.from({ length: totalDays }, (_, i) => anchorDate.add(i, 'day'))
}

function buildWeekGroups(days: dayjs.Dayjs[]) {
  const groups: { label: string; start: number; count: number }[] = []
  let i = 0
  while (i < days.length) {
    const weekStart = days[i].startOf('isoWeek')
    const label = weekStart.format('DD MMM, YYYY')
    let count = 0
    while (i + count < days.length && days[i + count].isoWeek() === days[i].isoWeek()) count++
    groups.push({ label, start: i, count })
    i += count
  }
  return groups
}

// ── Booking Detail Modal ──────────────────────────────────────────────────────
function BookingDetailModal({
  booking, resourceName, open, onClose, onNavigate,
}: {
  booking: any; resourceName: string; open: boolean; onClose: () => void; onNavigate: (path: string) => void
}) {
  if (!booking) return null
  const isSpace = booking.type === 'EVENT_SPACE'
  const phase   = booking.phase ? PHASE_STYLE[booking.phase] : null

  return (
    <Modal open={open} onCancel={onClose} footer={null}
      title={
        <Space>
          <CalendarOutlined style={{ color: NAVY }} />
          <span style={{ color: NAVY }}>{isSpace ? booking.event?.name : booking.order?.orderNumber}</span>
        </Space>
      }
      width={520}
    >
      {isSpace ? (
        <div>
          {booking.cancelled && (
            <div style={{ background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 8, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#cf1322', fontWeight: 700, fontSize: 13 }}>⊘ Reserva cancelada</span>
              <span style={{ color: '#cf1322', fontSize: 12 }}>— no genera conflictos</span>
            </div>
          )}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Recurso</Text>
                <div><Text strong>{resourceName}</Text></div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Fase</Text>
                <div>
                  <span style={{
                    background: phase?.background, border: `1.5px ${phase?.borderStyle ?? 'solid'} ${phase?.color}`,
                    color: phase?.color, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                  }}>
                    {phase?.label ?? booking.phase}
                  </span>
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Inicio</Text>
                <div><Text strong>{dayjs(booking.startTime).format('DD MMM YYYY HH:mm')}</Text></div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Fin</Text>
                <div><Text strong>{dayjs(booking.endTime).format('DD MMM YYYY HH:mm')}</Text></div>
              </div>
            </Col>
            {booking.event?.primaryClient && (
              <Col span={24}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Cliente</Text>
                  <div><Text strong>
                    {booking.event.primaryClient.companyName ??
                      `${booking.event.primaryClient.firstName ?? ''} ${booking.event.primaryClient.lastName ?? ''}`.trim()}
                  </Text></div>
                </div>
              </Col>
            )}
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Estatus del evento</Text>
                <div><Tag color={EVENT_STATUS_COLOR[booking.event?.status]}>{EVENT_STATUS_LABEL[booking.event?.status] ?? booking.event?.status}</Tag></div>
              </div>
            </Col>
            {(booking.ordersCount ?? 0) > 0 && (
              <Col span={12}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Órdenes vinculadas</Text>
                  <div><Text strong>{booking.ordersCount} — {fmt(booking.ordersTotal ?? 0)}</Text></div>
                </div>
              </Col>
            )}
            {booking.overlapCount > 1 && (
              <Col span={12}>
                <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Posición en lista de espera</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <Text strong style={{ fontSize: 20, color: '#d46b08' }}>{booking.overlapRank}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>de {booking.overlapCount} reservas solapadas</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Ordenado por fecha de creación</Text>
                </div>
              </Col>
            )}
            {booking.notes && (
              <Col span={24}>
                <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Notas</Text>
                  <div><Text>{booking.notes}</Text></div>
                </div>
              </Col>
            )}
          </Row>
          <Button type="primary" style={{ background: NAVY, borderColor: NAVY }}
            onClick={() => { onNavigate(`/eventos/${booking.event?.id}`); onClose() }}>
            Ver Evento →
          </Button>
        </div>
      ) : (
        <div>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Recurso</Text>
                <div><Text strong>{resourceName}</Text></div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Estatus</Text>
                <div><Tag color={booking.order?.status === 'CANCELLED' ? 'red' : 'blue'}>
                  {ORDER_STATUS_LABEL[booking.order?.status] ?? booking.order?.status}
                </Tag></div>
              </div>
            </Col>
            <Col span={24}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Cliente</Text>
                <div><Text strong>
                  {booking.order?.client?.companyName ??
                    `${booking.order?.client?.firstName ?? ''} ${booking.order?.client?.lastName ?? ''}`.trim()}
                </Text></div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Inicio</Text>
                <div><Text strong>{dayjs(booking.startTime).format('DD MMM YYYY')}</Text></div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Fin</Text>
                <div><Text strong>{dayjs(booking.endTime).format('DD MMM YYYY')}</Text></div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Total</Text>
                <div><Text strong style={{ color: '#6B46C1', fontSize: 16 }}>{fmt(booking.order?.total ?? 0)}</Text></div>
              </div>
            </Col>
            {(booking.order?.lineItems ?? []).length > 0 && (
              <Col span={24}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Servicios contratados</Text>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {booking.order.lineItems.map((li: string, i: number) => (
                      <li key={i} style={{ fontSize: 13 }}>{li}</li>
                    ))}
                  </ul>
                </div>
              </Col>
            )}
            {booking.overlapCount > 1 && (
              <Col span={12}>
                <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Posición en lista de espera</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <Text strong style={{ fontSize: 20, color: '#d46b08' }}>{booking.overlapRank}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>de {booking.overlapCount} reservas solapadas</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Ordenado por fecha de creación</Text>
                </div>
              </Col>
            )}
          </Row>
          <Button type="primary" style={{ background: NAVY, borderColor: NAVY }}
            onClick={() => { onNavigate(`/ordenes/${booking.order?.id}`); onClose() }}>
            Ver Orden →
          </Button>
        </div>
      )}
    </Modal>
  )
}

// ── Booking Tooltip ───────────────────────────────────────────────────────────
function BookingTooltip({ b, resourceName }: { b: any; resourceName: string }) {
  const isSpace = b.type === 'EVENT_SPACE'
  const phase   = b.phase ? PHASE_STYLE[b.phase] : null

  return (
    <div style={{ minWidth: 220, maxWidth: 300, fontSize: 12 }}>
      {isSpace ? (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: b.cancelled ? '#ff7875' : '#fff' }}>
            {b.cancelled ? '⊘' : '📅'} {b.event?.name}{b.cancelled ? ' (Cancelada)' : ''}
          </div>
          <Divider style={{ margin: '4px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '3px 6px', color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ opacity: 0.65 }}>Recurso</span>   <span>{resourceName}</span>
            <span style={{ opacity: 0.65 }}>Fase</span>      <span>{phase?.label ?? b.phase}</span>
            <span style={{ opacity: 0.65 }}>Fechas</span>    <span>{dayjs(b.startTime).format('DD MMM')} → {dayjs(b.endTime).format('DD MMM YYYY')}</span>
            {b.event?.primaryClient && (
              <>
                <span style={{ opacity: 0.65 }}>Cliente</span>
                <span>{b.event.primaryClient.companyName ?? `${b.event.primaryClient.firstName ?? ''} ${b.event.primaryClient.lastName ?? ''}`.trim()}</span>
              </>
            )}
            <span style={{ opacity: 0.65 }}>Estatus</span>   <span>{EVENT_STATUS_LABEL[b.event?.status] ?? b.event?.status}</span>
          </div>
          {b.overlapCount > 1 && (
            <div style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '2px 7px', fontSize: 11 }}>
              <span style={{ opacity: 0.7 }}>Lista de espera:</span>
              <span style={{ fontWeight: 700, color: '#ffd666' }}>#{b.overlapRank} de {b.overlapCount}</span>
            </div>
          )}
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Clic para ver detalle</div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#fff' }}>🧾 {b.order?.orderNumber}</div>
          <Divider style={{ margin: '4px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '3px 6px', color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ opacity: 0.65 }}>Cliente</span>  <span>{b.order?.client?.companyName ?? `${b.order?.client?.firstName ?? ''} ${b.order?.client?.lastName ?? ''}`.trim()}</span>
            <span style={{ opacity: 0.65 }}>Fechas</span>   <span>{dayjs(b.startTime).format('DD MMM')} → {dayjs(b.endTime).format('DD MMM YYYY')}</span>
            <span style={{ opacity: 0.65 }}>Total</span>    <span style={{ fontWeight: 600 }}>{fmt(b.order?.total ?? 0)}</span>
          </div>
          {b.overlapCount > 1 && (
            <div style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '2px 7px', fontSize: 11 }}>
              <span style={{ opacity: 0.7 }}>Lista de espera:</span>
              <span style={{ fontWeight: 700, color: '#ffd666' }}>#{b.overlapRank} de {b.overlapCount}</span>
            </div>
          )}
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Clic para ver detalle</div>
        </>
      )}
    </div>
  )
}

// ── Create From Selection Modal ───────────────────────────────────────────────
function CreateFromSelectionModal({
  open, onClose, onSuccess, selectedResources, startDate, endDate, events,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  selectedResources: any[]; startDate: dayjs.Dayjs | null; endDate: dayjs.Dayjs | null; events: any[];
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [eventMode, setEventMode] = useState<'existing' | 'new'>('existing')
  const [submitting, setSubmitting] = useState(false)

  const { data: clientsData } = useQuery({
    queryKey: ['clients-booking-modal'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
    enabled: open,
  })
  const clients = clientsData?.data ?? []

  const clientOptions = clients.map((c: any) => ({
    value: c.id,
    label: c.companyName || `${c.firstName} ${c.lastName}`,
  }))

  const start = startDate ?? dayjs()
  const end   = endDate ?? dayjs()
  const days  = end.diff(start, 'day') + 1
  const resCount = selectedResources.length

  async function handleOk() {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      let targetEventId: string

      if (eventMode === 'new') {
        const res = await eventsApi.create({
          name:            values.newEventName,
          primaryClientId: values.newEventClientId || undefined,
          status:          'QUOTED',
          setupStart:      start.startOf('day').toISOString(),
          setupEnd:        end.endOf('day').toISOString(),
          eventStart:      start.startOf('day').toISOString(),
          eventEnd:        end.endOf('day').toISOString(),
        })
        targetEventId = res.data.id
      } else {
        targetEventId = values.eventId
      }

      await Promise.all(selectedResources.map((r: any) =>
        eventSpacesApi.create(targetEventId, {
          resourceId: r.id,
          phase:      values.phase,
          startTime:  start.startOf('day').toISOString(),
          endTime:    end.endOf('day').toISOString(),
          notes:      values.notes || null,
        })
      ))

      message.success(`${resCount} reserva(s) creada(s) correctamente`)
      form.resetFields()
      setEventMode('existing')
      onSuccess()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.response?.data?.error?.message ?? 'Error al crear las reservas')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); setEventMode('existing'); onClose() }}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="Crear reservas"
      title={
        <Space>
          <PlusOutlined style={{ color: SEL_COLOR }} />
          <span>Crear reservas desde selección</span>
        </Space>
      }
      width={540}
    >
      {/* Selection summary */}
      <div style={{
        background: '#f5f3ff', border: '1px solid #d9d0f5', borderRadius: 10,
        padding: '12px 16px', marginBottom: 20,
        display: 'flex', gap: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: SEL_COLOR, lineHeight: 1 }}>{resCount}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>recurso{resCount !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ width: 1, background: '#d9d0f5' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: SEL_COLOR, lineHeight: 1 }}>{days}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>día{days !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ width: 1, background: '#d9d0f5' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
            {start.format('DD MMM YYYY')} → {end.format('DD MMM YYYY')}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {selectedResources.map((r: any) => r.name).join(', ').slice(0, 60)}
            {selectedResources.map((r: any) => r.name).join(', ').length > 60 ? '…' : ''}
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical">
        {/* Phase */}
        <Form.Item name="phase" label="Fase de reserva" rules={[{ required: true }]}>
          <Select options={[
            { value: 'SETUP',    label: 'Montaje' },
            { value: 'EVENT',    label: 'Evento principal' },
            { value: 'TEARDOWN', label: 'Desmontaje' },
          ]} placeholder="Seleccionar fase..." />
        </Form.Item>

        {/* Event mode */}
        <Form.Item label="Asociar a">
          <Radio.Group value={eventMode} onChange={e => setEventMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="existing">Evento existente</Radio.Button>
            <Radio.Button value="new">Nuevo evento</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {eventMode === 'existing' ? (
          <Form.Item name="eventId" label="Evento" rules={[{ required: true, message: 'Selecciona un evento' }]}>
            <Select
              showSearch
              placeholder="Seleccionar evento..."
              filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={events.map((e: any) => ({
                value: e.id,
                label: `${e.name}${e.code ? ` (${e.code})` : ''}`,
              }))}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item name="newEventName" label="Nombre del evento" rules={[{ required: true }]}>
              <Input placeholder="Ej. Expo Industrial 2026" />
            </Form.Item>
            <Form.Item name="newEventClientId" label="Cliente (opcional)">
              <Select
                showSearch allowClear
                placeholder="Buscar cliente..."
                filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={clientOptions}
              />
            </Form.Item>
          </>
        )}

        <Form.Item name="notes" label="Notas (opcional)">
          <Input.TextArea rows={2} placeholder="Observaciones sobre esta reserva…" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookingCalendarPage() {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const today       = dayjs()
  const { message } = App.useApp()
  const hasPrivilege = useAuthStore(s => s.hasPrivilege)

  // ── View / navigation state ────────────────────────────────────────────────
  const [view, setView]             = useState<'day' | 'week' | 'month' | '2months' | 'custom'>('month')
  const [anchor, setAnchor]         = useState(today.startOf('month'))
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // ── Filter state ───────────────────────────────────────────────────────────
  const [resourceType,   setResourceType]   = useState<string | undefined>('SPACE')
  const [eventId,        setEventId]        = useState<string | undefined>()
  const [eventStatus,    setEventStatus]    = useState<string | undefined>()
  const [resourceSearch, setResourceSearch] = useState('')
  const [searchInput,    setSearchInput]    = useState('')

  // ── Detail modal state ─────────────────────────────────────────────────────
  const [selectedBooking,  setSelectedBooking]  = useState<any>(null)
  const [selectedResource, setSelectedResource] = useState<string>('')
  const [detailModalOpen,  setDetailModalOpen]  = useState(false)

  // ── Order from reservations modal state ────────────────────────────────────
  const [orderModalOpen, setOrderModalOpen] = useState(false)

  // ── Selection mode state ───────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [isDragging,    setIsDragging]    = useState(false)
  const [dragAnchor,    setDragAnchor]    = useState<{ resIdx: number; dayIdx: number } | null>(null)
  const [dragEnd,       setDragEnd]       = useState<{ resIdx: number; dayIdx: number } | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // ── Bar drag state (move / resize booking) ─────────────────────────────────
  // Refs hold live drag info so global handlers don't need re-registration
  const barDragRef      = useRef<{ booking: any; type: 'move' | 'resize-start' | 'resize-end'; startClientX: number } | null>(null)
  const barDragDeltaRef = useRef(0)
  const [barDragState, setBarDragState] = useState<{ bookingId: string; type: string; delta: number } | null>(null)
  const [dragConfirm, setDragConfirm]   = useState<{ booking: any; newStartTime: string; newEndTime: string } | null>(null)

  // Global mouseup/mousemove — handles BOTH selection drag and bar drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!barDragRef.current) return
      const delta = Math.round((e.clientX - barDragRef.current.startClientX) / DAY_W)
      barDragDeltaRef.current = delta
      setBarDragState(s => s ? { ...s, delta } : null)
    }
    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      const drag = barDragRef.current
      if (!drag) return
      const delta = barDragDeltaRef.current
      barDragRef.current      = null
      barDragDeltaRef.current = 0
      setBarDragState(null)
      if (delta === 0) return   // no actual movement — treat as click

      const b      = drag.booking
      const origSt = dayjs(b.startTime)
      const origEt = dayjs(b.endTime)
      let newSt = origSt
      let newEt = origEt

      if (drag.type === 'move') {
        newSt = origSt.add(delta, 'day')
        newEt = origEt.add(delta, 'day')
      } else if (drag.type === 'resize-end') {
        newEt = origEt.add(delta, 'day')
        if (newEt.isBefore(origSt.add(1, 'day'))) newEt = origSt.add(1, 'day')
      } else if (drag.type === 'resize-start') {
        newSt = origSt.add(delta, 'day')
        if (newSt.isAfter(origEt.subtract(1, 'day'))) newSt = origEt.subtract(1, 'day')
      }
      setDragConfirm({ booking: b, newStartTime: newSt.toISOString(), newEndTime: newEt.toISOString() })
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Apply grabbing cursor on body while dragging a bar
  useEffect(() => {
    if (barDragState) {
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => { document.body.style.cursor = ''; document.body.style.userSelect = '' }
  }, [!!barDragState])

  // Computed selection rectangle (resource index range × day index range)
  const selection = useMemo(() => {
    if (!dragAnchor || !dragEnd) return null
    return {
      resMin: Math.min(dragAnchor.resIdx, dragEnd.resIdx),
      resMax: Math.max(dragAnchor.resIdx, dragEnd.resIdx),
      dayMin: Math.min(dragAnchor.dayIdx, dragEnd.dayIdx),
      dayMax: Math.max(dragAnchor.dayIdx, dragEnd.dayIdx),
    }
  }, [dragAnchor, dragEnd])

  const isCellSelected = useCallback((resIdx: number, dayIdx: number) => {
    if (!selection) return false
    return resIdx >= selection.resMin && resIdx <= selection.resMax &&
           dayIdx >= selection.dayMin && dayIdx <= selection.dayMax
  }, [selection])

  function clearSelection() {
    setDragAnchor(null)
    setDragEnd(null)
  }

  function toggleSelectionMode() {
    if (selectionMode) clearSelection()
    setSelectionMode(s => !s)
  }

  // ── Date range ─────────────────────────────────────────────────────────────
  const totalDays = view === 'custom' && customRange
    ? customRange[1].diff(customRange[0], 'day') + 1
    : VIEW_DAYS[view] ?? 30

  const anchorResolved = view === 'custom' && customRange ? customRange[0] : anchor

  const days       = useMemo(() => buildDays(anchorResolved, totalDays), [anchorResolved, totalDays])
  const weekGroups = useMemo(() => buildWeekGroups(days), [days])

  const dateFrom = days[0].format('YYYY-MM-DD')
  const dateTo   = days[days.length - 1].format('YYYY-MM-DD')

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateSpaceMutation = useMutation({
    mutationFn: ({ eventId, spaceId, data, keepCreatedAt }: { eventId: string; spaceId: string; data: any; keepCreatedAt: boolean }) =>
      eventSpacesApi.update(eventId, spaceId, data, keepCreatedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-calendar'] })
      setDragConfirm(null)
      message.success('Reserva actualizada')
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error ?? 'Error al actualizar la reserva')
      setDragConfirm(null)
    },
  })

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn:  () => eventsApi.list({ pageSize: 200 }),
  })
  const events = eventsData?.data ?? []

  // All active resources (for showing rows even without bookings)
  const { data: allResourcesRaw } = useQuery({
    queryKey: ['all-resources-calendar'],
    queryFn:  () => resourcesApi.list({ pageSize: 500, isActive: true }),
    staleTime: 60_000,
  })

  // Booking calendar data (bookings + enriched resources with laneCount)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['booking-calendar', dateFrom, dateTo, resourceType, eventId, eventStatus, resourceSearch],
    queryFn:  () => bookingsApi.calendar({ dateFrom, dateTo, resourceType, eventId, eventStatus, resourceSearch: resourceSearch || undefined }),
    placeholderData: keepPreviousData,
  })

  const bookingResources = data?.data?.resources ?? []
  const bookings         = data?.data?.bookings  ?? []
  const meta             = data?.data?.meta      ?? {}

  // ── Merge: all resources + enriched booking data ───────────────────────────
  const allDisplayResources = useMemo(() => {
    const bookingMap = new Map<string, any>()
    for (const r of bookingResources) bookingMap.set(r.id, r)

    let list: any[] = allResourcesRaw?.data ?? []

    // Apply client-side filters (same logic as server-side in booking API)
    if (resourceType) list = list.filter((r: any) => r.type === resourceType)
    if (resourceSearch) {
      const q = resourceSearch.toLowerCase()
      list = list.filter((r: any) =>
        r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q)
      )
    }

    // Overlay booking-enriched data (laneCount, hasConflict)
    return list.map((r: any) => ({
      ...r,
      laneCount:   bookingMap.get(r.id)?.laneCount   ?? 1,
      hasConflict: bookingMap.get(r.id)?.hasConflict ?? false,
    }))
  }, [allResourcesRaw, bookingResources, resourceType, resourceSearch])

  // ── Bookings grouped by resourceId ────────────────────────────────────────
  const bookingsByResource = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const b of bookings) {
      if (!map.has(b.resourceId)) map.set(b.resourceId, [])
      map.get(b.resourceId)!.push(b)
    }
    return map
  }, [bookings])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalResources = allDisplayResources.length
  const occupiedCount  = allDisplayResources.filter((r: any) => bookingsByResource.has(r.id)).length
  const occupancyPct   = totalResources ? Math.round((occupiedCount / totalResources) * 100) : 0

  // ── Selection helpers ──────────────────────────────────────────────────────
  const selectedResources = useMemo(() => {
    if (!selection) return []
    return allDisplayResources.filter((_: any, i: number) =>
      i >= selection.resMin && i <= selection.resMax
    )
  }, [selection, allDisplayResources])

  const selectionStartDate = selection ? days[selection.dayMin] : null
  const selectionEndDate   = selection ? days[selection.dayMax] : null

  // ── Navigation ─────────────────────────────────────────────────────────────
  const step = view === 'day' ? 1 : view === 'week' ? 7 : view === 'month' ? 1 : 2
  const unit = view === 'day' ? 'day' : view === 'week' ? 'week' : 'month'
  const prev    = () => setAnchor(a => view === 'week' || view === 'day' ? a.subtract(step, 'day') : a.subtract(step, unit as any))
  const next    = () => setAnchor(a => view === 'week' || view === 'day' ? a.add(step, 'day')      : a.add(step, unit as any))
  const goToday = () => {
    setView(v => v === 'custom' ? 'month' : v)
    setAnchor(view === 'week' ? today.startOf('isoWeek') : view === 'day' ? today : today.startOf('month'))
  }

  const clearFilters = () => {
    setResourceType('SPACE'); setEventId(undefined); setEventStatus(undefined)
    setResourceSearch(''); setSearchInput('')
  }
  const hasFilters = !!(resourceType !== 'SPACE' || eventId || eventStatus || resourceSearch)

  const todayIdx = days.findIndex(d => d.isSame(today, 'day'))
  const gridWidth = totalDays * DAY_W

  // ── Bar geometry ───────────────────────────────────────────────────────────
  function getBarGeometry(startTime: string, endTime: string) {
    const start = dayjs(startTime)
    const end   = dayjs(endTime)
    const first = days[0]
    const last  = days[days.length - 1]

    const visStart = start.isBefore(first) ? first : start
    const visEnd   = end.isAfter(last)     ? last  : end

    const startIdx = days.findIndex(d => d.isSame(visStart, 'day'))
    const endIdx   = days.findIndex(d => d.isSame(visEnd,   'day'))

    const left  = Math.max(0, startIdx) * DAY_W + 2
    const width = Math.max(DAY_W - 4, (endIdx - Math.max(0, startIdx) + 1) * DAY_W - 4)
    return { left, width }
  }

  function getBarStyle(b: any, dragDelta = 0, dragType: string | null = null) {
    // Compute effective times considering drag
    let effectiveStart = b.startTime as string
    let effectiveEnd   = b.endTime   as string
    if (dragDelta !== 0 && dragType) {
      const st = dayjs(b.startTime)
      const et = dayjs(b.endTime)
      if (dragType === 'move') {
        effectiveStart = st.add(dragDelta, 'day').toISOString()
        effectiveEnd   = et.add(dragDelta, 'day').toISOString()
      } else if (dragType === 'resize-end') {
        let net = et.add(dragDelta, 'day')
        if (net.isBefore(st.add(1, 'day'))) net = st.add(1, 'day')
        effectiveEnd = net.toISOString()
      } else if (dragType === 'resize-start') {
        let nst = st.add(dragDelta, 'day')
        if (nst.isAfter(et.subtract(1, 'day'))) nst = et.subtract(1, 'day')
        effectiveStart = nst.toISOString()
      }
    }

    const { left, width } = getBarGeometry(effectiveStart, effectiveEnd)

    const isSpace   = b.type === 'EVENT_SPACE'
    const phase     = b.phase ? PHASE_STYLE[b.phase] : null
    const isCancelled = isSpace && b.cancelled
    const isConfirmed = isSpace && !isCancelled && b.event?.status === 'CONFIRMED'
    const background  = isCancelled ? '#fff1f0' : (isConfirmed ? '#f6ffed' : (isSpace ? (phase?.background ?? '#e6f4ff') : `${ORDER_STATUS_COLOR[b.order?.status] ?? '#1677ff'}22`))
    const borderColor = isCancelled ? '#ff4d4f' : (isConfirmed ? '#52c41a' : (isSpace ? (phase?.color ?? '#1677ff')      : (ORDER_STATUS_COLOR[b.order?.status] ?? '#1677ff')))
    const borderStyle = isCancelled ? 'dashed'  : (phase?.borderStyle ?? 'solid')
    const textColor   = isCancelled ? '#cf1322' : (isConfirmed ? '#389e0d' : (isSpace ? (phase?.color ?? '#1677ff')      : (ORDER_STATUS_COLOR[b.order?.status] ?? '#1677ff')))
    const label       = isSpace
      ? (b.event?.name ?? '—')
      : `${b.order?.client?.companyName ?? `${b.order?.client?.firstName ?? ''} ${b.order?.client?.lastName ?? ''}`.trim()} · ${b.order?.orderNumber}`

    return { left, width, background, borderColor, borderStyle, textColor, label }
  }

  const openDetailModal = (b: any, rName: string) => {
    if (selectionMode) return
    setSelectedBooking(b)
    setSelectedResource(rName)
    setDetailModalOpen(true)
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = bookings.map((b: any) => ({
      tipo:    b.type === 'EVENT_SPACE' ? 'Espacio de Evento' : 'Orden',
      recurso: allDisplayResources.find((r: any) => r.id === b.resourceId)?.name ?? '',
      fase:    b.phase ? (PHASE_STYLE[b.phase]?.label ?? b.phase) : '',
      inicio:  dayjs(b.startTime).format('DD/MM/YYYY HH:mm'),
      fin:     dayjs(b.endTime).format('DD/MM/YYYY HH:mm'),
      evento:  b.event?.name ?? '',
      orden:   b.order?.orderNumber ?? '',
      cliente: b.type === 'EVENT_SPACE'
        ? (b.event?.primaryClient?.companyName ?? '')
        : (b.order?.client?.companyName ?? `${b.order?.client?.firstName ?? ''} ${b.order?.client?.lastName ?? ''}`.trim()),
      estatus: b.type === 'EVENT_SPACE'
        ? (EVENT_STATUS_LABEL[b.event?.status] ?? '')
        : (ORDER_STATUS_LABEL[b.order?.status] ?? ''),
      total: b.order?.total ? Number(b.order.total).toFixed(2) : '',
    }))
    exportToCsv(`calendario-espacios-${dateFrom}-${dateTo}`, rows, [
      { header: 'Tipo',    key: 'tipo' },
      { header: 'Recurso', key: 'recurso' },
      { header: 'Fase',    key: 'fase' },
      { header: 'Inicio',  key: 'inicio' },
      { header: 'Fin',     key: 'fin' },
      { header: 'Evento',  key: 'evento' },
      { header: 'Orden',   key: 'orden' },
      { header: 'Cliente', key: 'cliente' },
      { header: 'Estatus', key: 'estatus' },
      { header: 'Total',   key: 'total' },
    ])
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const conflicts = meta.conflictsCount ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #25507a 100%)`,
        borderRadius: 12, padding: '14px 20px', marginBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
        boxShadow: '0 4px 20px rgba(26,58,92,0.18)',
      }}>
        {/* Title + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 10px', display: 'flex' }}>
            <CalendarOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Calendario de Espacios</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>
              {days[0].format('DD MMM YYYY')} — {days[days.length - 1].format('DD MMM YYYY')}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Navigation */}
          {view !== 'custom' ? (
            <Space.Compact size="small">
              <Button size="small" icon={<LeftOutlined />} onClick={prev}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
              <Button size="small" onClick={goToday}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }}>
                Hoy
              </Button>
              <Button size="small" icon={<RightOutlined />} onClick={next}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
            </Space.Compact>
          ) : (
            <RangePicker size="small" format="DD/MM/YYYY" value={customRange}
              onChange={v => v && setCustomRange([v[0]!, v[1]!])} />
          )}

          {/* View toggle */}
          <Space.Compact size="small">
            {(['day', 'week', 'month', '2months', 'custom'] as const).map(v => (
              <Button key={v} size="small" onClick={() => setView(v)} style={{
                background: view === v ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: view === v ? '#fff' : 'rgba(255,255,255,0.6)',
                fontWeight: view === v ? 700 : 400,
              }}>
                {v === 'day' ? 'Día' : v === 'week' ? 'Sem' : v === 'month' ? 'Mes' : v === '2months' ? '2M' : 'Custom'}
              </Button>
            ))}
          </Space.Compact>

          {/* Action buttons */}
          <Button size="small" icon={<HighlightOutlined />} onClick={toggleSelectionMode} style={{
            background: selectionMode ? SEL_COLOR : 'rgba(255,255,255,0.12)',
            border: selectionMode ? `1px solid ${SEL_COLOR}` : '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontWeight: selectionMode ? 700 : 400,
          }}>
            {selectionMode ? 'Salir selección' : 'Selección'}
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleExport} disabled={bookings.length === 0}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            CSV
          </Button>
        </div>
      </div>

      {/* ── Filters + Stats ───────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 10,
        border: '1px solid #e2e8f0', marginBottom: 8,
        boxShadow: '0 1px 6px rgba(26,58,92,0.06)',
      }}>
        {/* Filters row */}
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
          <Select size="small" style={{ width: 140 }} value={resourceType} onChange={v => setResourceType(v)} allowClear placeholder="Tipo de recurso"
            options={Object.entries(RESOURCE_TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          <Select size="small" style={{ width: 210 }} allowClear placeholder="Todos los eventos" value={eventId}
            onChange={v => setEventId(v)} showSearch
            filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={events.map((e: any) => ({ value: e.id, label: e.name }))} />
          <Select size="small" style={{ width: 140 }} allowClear placeholder="Estado evento" value={eventStatus}
            onChange={v => setEventStatus(v)}
            options={Object.entries(EVENT_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          <Input.Search size="small" style={{ width: 170 }} placeholder="Nombre o código…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onSearch={v => setResourceSearch(v)} allowClear onClear={() => setResourceSearch('')}
            enterButton={<SearchOutlined />} />
          {hasFilters && (
            <Button size="small" icon={<ClearOutlined />} onClick={clearFilters} style={{ color: '#64748b' }}>
              Limpiar
            </Button>
          )}
          {eventId && (
            <Button size="small" type="primary" icon={<ShoppingCartOutlined />}
              style={{ background: NAVY, borderColor: NAVY, marginLeft: 'auto' }}
              onClick={() => setOrderModalOpen(true)}>
              Crear Orden
            </Button>
          )}
        </div>

        {/* Stats + Legend row */}
        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
          {/* Stats chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <TeamOutlined style={{ color: NAVY, fontSize: 12 }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: NAVY, lineHeight: 1 }}>{totalResources}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>recursos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <UnorderedListOutlined style={{ color: SEL_COLOR, fontSize: 12 }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: SEL_COLOR, lineHeight: 1 }}>{meta.totalBookings ?? 0}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>reservas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: occupancyPct > 80 ? '#dc2626' : occupancyPct > 50 ? '#d97706' : '#16a34a' }}>
                {occupancyPct}%
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>ocupación</span>
            </div>
            {conflicts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff2f0', borderRadius: 6, padding: '3px 10px', border: '1px solid #ffccc7' }}>
                <AlertOutlined style={{ color: '#dc2626', fontSize: 12 }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{conflicts}</span>
                <span style={{ fontSize: 11, color: '#dc2626' }}>conflicto{conflicts !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: '#e2e8f0', margin: '0 16px', flexShrink: 0 }} />

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(PHASE_STYLE).map(([phase, s]) => (
              <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 9, borderRadius: 3, background: s.background, border: `1.5px ${s.borderStyle} ${s.color}` }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{s.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 22, height: 9, borderRadius: 3, background: '#f6ffed', border: '1.5px solid #52c41a' }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>Confirmado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 22, height: 9, borderRadius: 3, background: '#fff1f0', border: '1.5px dashed #ff4d4f' }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>Cancelado</span>
            </div>
            {selectionMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 9, borderRadius: 3, background: 'rgba(107,70,193,0.18)', border: `1.5px solid ${SEL_COLOR}` }} />
                <span style={{ fontSize: 11, color: SEL_COLOR }}>Selección</span>
              </div>
            )}
            {conflicts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <WarningOutlined style={{ color: '#dc2626', fontSize: 11 }} />
                <span style={{ fontSize: 11, color: '#dc2626' }}>Solapamiento</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Selection hint ────────────────────────────────────────────────── */}
      {selectionMode && (
        <div style={{
          background: '#f5f3ff', border: '1px solid #d9d0f5', borderRadius: 8,
          padding: '8px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: SEL_COLOR,
        }}>
          <HighlightOutlined />
          <span><strong>Modo selección:</strong> Clic y arrastra sobre las celdas para seleccionar el rango. Puedes seleccionar varios recursos arrastrando verticalmente.</span>
        </div>
      )}

      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Spin size="large" />
        </div>
      ) : allDisplayResources.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Empty description="No hay recursos para mostrar" />
        </div>
      ) : (
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(26,58,92,0.10)',
          opacity: isFetching ? 0.75 : 1,
          transition: 'opacity 0.2s',
          cursor: selectionMode ? 'crosshair' : 'default',
          userSelect: 'none',
          flex: 1,
        }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 310px)' }}>
            <div style={{ minWidth: NAME_W + gridWidth, position: 'relative' }}>

              {/* ── Sticky header ── */}
              <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f8fafc' }}>
                {/* Row 1: week groups */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{
                    width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                    position: 'sticky', left: 0, zIndex: 30,
                    background: NAVY, borderRight: '2px solid #0f2540',
                    height: HDR_H1, display: 'flex', alignItems: 'center', padding: '0 14px',
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>RECURSO / ESPACIO</Text>
                  </div>
                  {weekGroups.map((g, gi) => (
                    <div key={gi} style={{
                      width: g.count * DAY_W, minWidth: g.count * DAY_W, flexShrink: 0,
                      height: HDR_H1, background: '#f1f5f9', borderRight: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', paddingLeft: 8,
                    }}>
                      <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{g.label}</Text>
                    </div>
                  ))}
                </div>

                {/* Row 2: day names */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{
                    width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                    position: 'sticky', left: 0, zIndex: 30,
                    background: NAVY, borderRight: '2px solid #0f2540', height: HDR_H2,
                  }} />
                  {days.map((d, i) => {
                    const isWeekend = d.day() === 0 || d.day() === 6
                    const isToday   = i === todayIdx
                    return (
                      <div key={i} style={{
                        width: DAY_W, minWidth: DAY_W, flexShrink: 0, height: HDR_H2,
                        borderRight: '1px solid #e2e8f0',
                        background: isToday ? '#dbeafe' : isWeekend ? '#f8f0ff' : '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 10, color: isWeekend ? '#7c3aed' : '#94a3b8', fontWeight: 600 }}>
                          {DAY_NAMES[d.day()]}
                        </Text>
                      </div>
                    )
                  })}
                </div>

                {/* Row 3: day numbers */}
                <div style={{ display: 'flex', borderBottom: '2px solid #cbd5e1' }}>
                  <div style={{
                    width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                    position: 'sticky', left: 0, zIndex: 30,
                    background: NAVY, borderRight: '2px solid #0f2540', height: HDR_H3,
                  }} />
                  {days.map((d, i) => {
                    const isWeekend = d.day() === 0 || d.day() === 6
                    const isToday   = i === todayIdx
                    return (
                      <div key={i} style={{
                        width: DAY_W, minWidth: DAY_W, flexShrink: 0, height: HDR_H3,
                        borderRight: '1px solid #e2e8f0',
                        background: isToday ? '#dbeafe' : isWeekend ? '#f8f0ff' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: isToday ? 800 : 500,
                          color: isToday ? '#1677ff' : isWeekend ? '#7c3aed' : '#374151',
                        }}>
                          {d.date()}
                        </Text>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Resource rows ── */}
              {allDisplayResources.map((resource: any, rowIdx: number) => {
                const rowBookings = bookingsByResource.get(resource.id) ?? []
                const laneCount   = resource.laneCount || 1
                const rowH        = laneCount * LANE_H
                const hasBookings = rowBookings.length > 0
                const rowBg       = rowIdx % 2 === 0 ? '#fff' : '#f8fafc'
                const conflictRow = resource.hasConflict

                return (
                  <div key={resource.id} style={{
                    display: 'flex',
                    borderBottom: '1px solid #e2e8f0',
                    height: rowH,
                    background: conflictRow ? '#fff8f8' : rowBg,
                    position: 'relative',
                  }}>
                    {/* Sticky resource name */}
                    <div style={{
                      width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                      position: 'sticky', left: 0, zIndex: 10,
                      background: conflictRow ? '#fff8f8' : rowBg,
                      borderRight: conflictRow ? '3px solid #ff4d4f' : '2px solid #cbd5e1',
                      borderLeft: conflictRow ? '3px solid #ff4d4f' : 'none',
                      padding: '0 10px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {conflictRow ? (
                          <Tooltip title="Tiene reservas solapadas">
                            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 12, flexShrink: 0 }} />
                          </Tooltip>
                        ) : hasBookings ? (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0, display: 'inline-block' }} />
                        ) : (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', flexShrink: 0, display: 'inline-block' }} />
                        )}
                        <Text style={{
                          fontSize: 12, fontWeight: hasBookings ? 600 : 400,
                          color: conflictRow ? '#c0392b' : hasBookings ? NAVY : '#94a3b8',
                        }} ellipsis title={resource.name}>
                          {resource.name}
                        </Text>
                      </div>
                      <div style={{ paddingLeft: 11 }}>
                        <Text style={{ fontSize: 10, color: '#b0b8c8' }}>{resource.code}</Text>
                      </div>
                    </div>

                    {/* Day cells + booking bars */}
                    <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                      {days.map((d, i) => {
                        const isWeekend  = d.day() === 0 || d.day() === 6
                        const isToday    = i === todayIdx
                        const isSelected = isCellSelected(rowIdx, i)

                        return (
                          <div
                            key={i}
                            style={{
                              width: DAY_W, minWidth: DAY_W, height: '100%', flexShrink: 0,
                              borderRight: '1px solid #f0f4f8',
                              background: isSelected
                                ? 'rgba(107,70,193,0.15)'
                                : isToday   ? 'rgba(22,119,255,0.05)'
                                : isWeekend ? 'rgba(124,58,237,0.03)'
                                : 'transparent',
                              outline: isSelected ? `1px solid rgba(107,70,193,0.35)` : 'none',
                              outlineOffset: '-1px',
                              transition: selectionMode ? 'background 0.05s' : 'none',
                            }}
                            onMouseDown={e => {
                              if (!selectionMode) return
                              e.preventDefault()
                              setIsDragging(true)
                              setDragAnchor({ resIdx: rowIdx, dayIdx: i })
                              setDragEnd({ resIdx: rowIdx, dayIdx: i })
                            }}
                            onMouseEnter={() => {
                              if (!selectionMode || !isDragging) return
                              setDragEnd({ resIdx: rowIdx, dayIdx: i })
                            }}
                          />
                        )
                      })}

                      {/* Today vertical marker */}
                      {todayIdx >= 0 && (
                        <div style={{
                          position: 'absolute',
                          left: todayIdx * DAY_W + DAY_W / 2,
                          top: 0, bottom: 0, width: 2,
                          background: '#1677ff', opacity: 0.4,
                          zIndex: 3, pointerEvents: 'none',
                        }} />
                      )}

                      {/* Booking bars */}
                      {rowBookings.map((b: any) => {
                        const isDraggedBar  = barDragState?.bookingId === b.id
                        const dragDelta     = isDraggedBar ? barDragState!.delta : 0
                        const dragType      = isDraggedBar ? barDragState!.type  : null
                        const { left, width, background, borderColor, borderStyle, textColor, label } = getBarStyle(b, dragDelta, dragType)
                        const top    = b.lane * LANE_H + 5
                        const height = LANE_H - 10

                        // Only EVENT_SPACE non-cancelled bars can be dragged if user has edit privilege
                        const canDragBar = !selectionMode && b.type === 'EVENT_SPACE' && !b.cancelled
                          && hasPrivilege(PRIVILEGES.EVENT_SPACE_EDIT)

                        const startBarDrag = (e: React.MouseEvent, type: 'move' | 'resize-start' | 'resize-end') => {
                          e.preventDefault()
                          e.stopPropagation()
                          barDragRef.current      = { booking: b, type, startClientX: e.clientX }
                          barDragDeltaRef.current = 0
                          setBarDragState({ bookingId: b.id, type, delta: 0 })
                        }

                        const barDiv = (
                          <div
                            style={{
                              position: 'absolute',
                              left, top, width, height,
                              borderRadius: 6,
                              background,
                              border: `2px ${borderStyle} ${borderColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              paddingLeft: canDragBar ? 12 : 8, paddingRight: canDragBar ? 12 : 6,
                              cursor: isDraggedBar ? 'grabbing' : (canDragBar ? 'grab' : (selectionMode ? 'crosshair' : 'pointer')),
                              overflow: 'hidden',
                              zIndex: isDraggedBar ? 100 : 4,
                              transition: isDraggedBar ? 'none' : 'filter 0.15s',
                              pointerEvents: selectionMode ? 'none' : 'auto',
                              opacity: isDraggedBar ? 0.82 : (selectionMode ? 0.5 : 1),
                              boxShadow: isDraggedBar ? '0 4px 20px rgba(0,0,0,0.18)' : 'none',
                              userSelect: 'none',
                            }}
                            onMouseEnter={e => { if (!selectionMode && !isDraggedBar) (e.currentTarget.style.filter = 'brightness(0.93)') }}
                            onMouseLeave={e => { if (!selectionMode) (e.currentTarget.style.filter = '') }}
                            onMouseDown={canDragBar ? e => { if (e.button !== 0) return; startBarDrag(e, 'move') } : undefined}
                            onClick={e => { if (barDragDeltaRef.current !== 0) return; openDetailModal(b, resource.name) }}
                          >
                            {/* Left resize handle */}
                            {canDragBar && (
                              <div
                                style={{ position: 'absolute', left: 0, top: 0, width: 10, height: '100%', cursor: 'ew-resize', zIndex: 5, borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, background: 'rgba(0,0,0,0.08)' }}
                                onMouseDown={e => { e.stopPropagation(); startBarDrag(e, 'resize-start') }}
                              >
                                <div style={{ width: 1.5, height: 12, borderRadius: 1, background: 'rgba(0,0,0,0.3)' }} />
                                <div style={{ width: 1.5, height: 12, borderRadius: 1, background: 'rgba(0,0,0,0.3)' }} />
                              </div>
                            )}
                            <Text style={{
                              fontSize: 11, fontWeight: 600, color: textColor,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                              background: 'transparent',
                              paddingLeft: 4, paddingRight: 4, borderRadius: 3,
                            }}>
                              {label}
                            </Text>
                            {b.overlapCount > 1 && (
                              <span style={{
                                flexShrink: 0, marginLeft: 4,
                                background: b.overlapRank === 1 ? '#000000' : borderColor,
                                color: '#fff',
                                borderRadius: 10,
                                fontSize: b.overlapRank === 1 ? 15 : 13,
                                fontWeight: 300,
                                padding: b.overlapRank === 1 ? '2px 8px' : '1px 7px',
                                lineHeight: '18px',
                                opacity: 1,
                                fontFamily: 'Inter, system-ui, sans-serif',
                                letterSpacing: '0.2px',
                              }}>
                                {b.overlapRank === 1 ? '#1' : `#${b.overlapRank}`}/{b.overlapCount}
                              </span>
                            )}
                            {/* Right resize handle */}
                            {canDragBar && (
                              <div
                                style={{ position: 'absolute', right: 0, top: 0, width: 10, height: '100%', cursor: 'ew-resize', zIndex: 5, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, background: 'rgba(0,0,0,0.08)' }}
                                onMouseDown={e => { e.stopPropagation(); startBarDrag(e, 'resize-end') }}
                              >
                                <div style={{ width: 1.5, height: 12, borderRadius: 1, background: 'rgba(0,0,0,0.3)' }} />
                                <div style={{ width: 1.5, height: 12, borderRadius: 1, background: 'rgba(0,0,0,0.3)' }} />
                              </div>
                            )}
                          </div>
                        )

                        return selectionMode ? (
                          <div key={b.id} style={{ position: 'absolute', left, top, width, height, zIndex: 4, pointerEvents: 'none', opacity: 0.5,
                            borderRadius: 6, background, border: `2px ${borderStyle} ${borderColor}` }}>
                            <Text style={{ fontSize: 11, fontWeight: 600, color: textColor,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: 8,
                              background: 'transparent',
                              paddingRight: 4, borderRadius: 3,
                            }}>
                              {label}
                            </Text>
                          </div>
                        ) : (
                          <Tooltip key={b.id}
                            title={isDraggedBar ? null : <BookingTooltip b={{ ...b, laneCount: resource.laneCount }} resourceName={resource.name} />}
                            color={NAVY}
                            overlayInnerStyle={{ padding: '10px 12px' }}
                            overlayStyle={{ maxWidth: 320 }}
                            mouseEnterDelay={0.2}
                          >
                            {barDiv}
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating selection action bar ────────────────────────────────── */}
      {selectionMode && selection && selectedResources.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: '#1a0533',
          borderRadius: 14,
          padding: '12px 20px',
          zIndex: 500,
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
          border: '1px solid rgba(107,70,193,0.4)',
          flexWrap: 'wrap',
          maxWidth: 'calc(100vw - 64px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HighlightOutlined style={{ color: '#a78bfa', fontSize: 16 }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>
                {selectedResources.length} recurso{selectedResources.length !== 1 ? 's' : ''}
                {' · '}
                {selectionEndDate!.diff(selectionStartDate!, 'day') + 1} día{selectionEndDate!.diff(selectionStartDate!, 'day') + 1 !== 1 ? 's' : ''}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                {selectionStartDate!.format('DD MMM')} → {selectionEndDate!.format('DD MMM YYYY')}
              </div>
            </div>
          </div>

          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ background: SEL_COLOR, borderColor: SEL_COLOR }}
              onClick={() => setCreateModalOpen(true)}
            >
              Crear reservas
            </Button>
            <Button
              icon={<CloseOutlined />}
              style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}
              onClick={clearSelection}
            >
              Limpiar
            </Button>
          </Space>
        </div>
      )}

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      <BookingDetailModal
        booking={selectedBooking}
        resourceName={selectedResource}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onNavigate={navigate}
      />

      {/* ── Create from selection modal ───────────────────────────────────── */}
      <CreateFromSelectionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          clearSelection()
          qc.invalidateQueries({ queryKey: ['booking-calendar'] })
          qc.invalidateQueries({ queryKey: ['all-resources-calendar'] })
        }}
        selectedResources={selectedResources}
        startDate={selectionStartDate}
        endDate={selectionEndDate}
        events={events}
      />

      {/* ── Create order from reservations modal ──────────────────────────── */}
      {eventId && (
        <CreateOrderFromSpacesModal
          open={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          onSuccess={() => {
            setOrderModalOpen(false)
            qc.invalidateQueries({ queryKey: ['booking-calendar'] })
          }}
          eventId={eventId}
          eventName={events.find((e: any) => e.id === eventId)?.name}
        />
      )}

      {/* ── Drag createdAt confirmation modal ────────────────────────────── */}
      <Modal
        open={!!dragConfirm}
        onCancel={() => setDragConfirm(null)}
        title="Cambio de fechas en reserva"
        footer={null}
        width={480}
        destroyOnClose
      >
        {dragConfirm && (
          <div style={{ paddingTop: 8 }}>
            <Alert
              type="warning"
              showIcon
              message="La fecha de cálculo para conflictos cambiará"
              description={
                <div style={{ fontSize: 13 }}>
                  <p style={{ margin: '6px 0' }}>
                    Al cambiar las fechas, la <strong>fecha de creación</strong> (usada para la lista de espera) se actualizará a <strong>ahora</strong>, sustituyendo a la original:
                  </p>
                  <div style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                    Original: {dayjs(dragConfirm.booking.createdAt).format('DD MMM YYYY HH:mm')}
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#64748b' }}>
                    Nuevas fechas: {dayjs(dragConfirm.newStartTime).format('DD MMM YYYY HH:mm')} → {dayjs(dragConfirm.newEndTime).format('DD MMM YYYY HH:mm')}
                  </div>
                </div>
              }
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                type="primary"
                block
                loading={updateSpaceMutation.isPending}
                onClick={() => {
                  const b = dragConfirm.booking
                  updateSpaceMutation.mutate({
                    eventId: b.event.id, spaceId: b.id,
                    data: { resourceId: b.resourceId, phase: b.phase, startTime: dragConfirm.newStartTime, endTime: dragConfirm.newEndTime, notes: b.notes },
                    keepCreatedAt: false,
                  })
                }}
              >
                Confirmar — usar fecha actual para conflictos
              </Button>
              <Tooltip title={!hasPrivilege(PRIVILEGES.EVENT_SPACE_KEEP_CREATED_AT) ? 'No tienes el privilegio "Mantener fecha de creación original"' : ''}>
                <Button
                  block
                  disabled={!hasPrivilege(PRIVILEGES.EVENT_SPACE_KEEP_CREATED_AT)}
                  loading={updateSpaceMutation.isPending}
                  onClick={() => {
                    const b = dragConfirm.booking
                    updateSpaceMutation.mutate({
                      eventId: b.event.id, spaceId: b.id,
                      data: { resourceId: b.resourceId, phase: b.phase, startTime: dragConfirm.newStartTime, endTime: dragConfirm.newEndTime, notes: b.notes },
                      keepCreatedAt: true,
                    })
                  }}
                >
                  🔒 Mantener la fecha de creación original
                </Button>
              </Tooltip>
              <Button block onClick={() => setDragConfirm(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
