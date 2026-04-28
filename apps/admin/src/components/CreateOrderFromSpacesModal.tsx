import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Modal, Form, Select, Row, Col, Tag, Space, Button, Spin, Empty, Typography, App,
} from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventSpacesApi } from '../api/eventSpaces'
import { clientsApi } from '../api/clients'
import { ordersApi } from '../api/orders'
import { priceListsApi } from '../api/priceLists'

const { Text } = Typography

const NAVY = '#1a3a5c'

const PHASE_STYLE: Record<string, { background: string; borderStyle: string; color: string; label: string }> = {
  SETUP:    { background: '#fffbe6', borderStyle: 'dashed', color: '#d48806', label: 'Montaje' },
  EVENT:    { background: '#e6f4ff', borderStyle: 'solid',  color: '#1677ff', label: 'Evento'  },
  TEARDOWN: { background: '#fff7e6', borderStyle: 'dashed', color: '#fa8c16', label: 'Desmontaje' },
}

function fmt(n: number) {
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

function calcTimeUnitValue(
  timeUnit: string | null | undefined,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): number {
  if (!timeUnit || timeUnit === 'no aplica') return 1
  if (timeUnit === 'días' || timeUnit === 'días sin factor') {
    if (!startDate || !endDate) return 1
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
    return diffMs <= 0 ? 1 : Math.max(1, Math.ceil(diffMs / 86400000))
  }
  if (timeUnit === 'horas' || timeUnit === 'horas sin factor') {
    if (!startDate || !endDate) return 1
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
    return diffMs <= 0 ? 1 : Math.max(1, Math.ceil(diffMs / 3600000))
  }
  return 1
}

export default function CreateOrderFromSpacesModal({
  open, onClose, onSuccess, eventId, eventName,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  eventId: string
  eventName?: string
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [selectedPriceListId, setSelectedPriceListId] = useState('')
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const { data: spacesRaw, isLoading: spacesLoading } = useQuery({
    queryKey: ['event-spaces-order', eventId],
    queryFn: () => eventSpacesApi.list(eventId),
    enabled: open && !!eventId,
  })
  const spaces: any[] = spacesRaw?.data ?? []

  const { data: clientsData } = useQuery({
    queryKey: ['clients-order-modal'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
    enabled: open,
  })
  const clients: any[] = clientsData?.data ?? []

  const { data: priceListsRaw } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => priceListsApi.list(),
    enabled: open,
  })
  const priceLists: any[] = priceListsRaw?.data ?? []

  const { data: plDetail } = useQuery({
    queryKey: ['price-list-detail', selectedPriceListId],
    queryFn: () => priceListsApi.get(selectedPriceListId),
    enabled: !!selectedPriceListId,
  })
  const plItems: any[] = plDetail?.data?.items ?? plDetail?.items ?? []
  const earlyCutoff  = plDetail?.data?.earlyCutoff  ?? plDetail?.earlyCutoff
  const normalCutoff = plDetail?.data?.normalCutoff ?? plDetail?.normalCutoff

  const today = dayjs()
  const tier: 'early' | 'normal' | 'late' =
    earlyCutoff  && today.isBefore(dayjs(earlyCutoff))  ? 'early' :
    normalCutoff && today.isBefore(dayjs(normalCutoff)) ? 'normal' :
    'late'
  const tierLabel = { early: 'Temprana', normal: 'Normal', late: 'Tardía' }[tier]
  const tierColor = { early: '#52c41a', normal: '#1677ff', late: '#ff4d4f' }[tier]

  useEffect(() => {
    if (spaces.length > 0) setSelectedSpaceIds(new Set(spaces.map((s: any) => s.id)))
  }, [spaces.length])

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setSelectedPriceListId('')
      setSelectedSpaceIds(new Set())
    }
  }, [open])

  function getItemForResource(resourceId: string) {
    return plItems.find((item: any) => item.resourceId === resourceId)
  }

  function getPrice(item: any): number {
    if (!item) return 0
    return tier === 'early' ? item.earlyPrice : tier === 'normal' ? item.normalPrice : item.latePrice
  }

  const selectedSpaces = spaces.filter((s: any) => selectedSpaceIds.has(s.id))

  const total = selectedSpaces.reduce((sum: number, space: any) => {
    const item = getItemForResource(space.resourceId)
    if (!item) return sum
    const qty = calcTimeUnitValue(item.timeUnit, space.startTime, space.endTime)
    return sum + qty * getPrice(item)
  }, 0)

  async function handleOk() {
    try {
      const values = await form.validateFields()
      if (selectedSpaces.length === 0) {
        message.warning('Selecciona al menos una reserva')
        return
      }
      const missingPrice = selectedSpaces.find((s: any) => !getItemForResource(s.resourceId))
      if (missingPrice) {
        message.error(`"${missingPrice.resource?.name}" no tiene precio en esta lista. Deselecciónalo o elige otra lista.`)
        return
      }
      setSubmitting(true)
      const lineItems = selectedSpaces.map((space: any) => {
        const item = getItemForResource(space.resourceId)
        const qty  = calcTimeUnitValue(item.timeUnit, space.startTime, space.endTime)
        return {
          resourceId:   space.resourceId,
          quantity:     qty,
          discountPct:  0,
          deliveryDate: space.startTime,
          observations: `${PHASE_STYLE[space.phase]?.label ?? space.phase}: ${dayjs(space.startTime).format('DD MMM YYYY HH:mm')} – ${dayjs(space.endTime).format('DD MMM YYYY HH:mm')}`,
        }
      })
      await ordersApi.create(eventId, {
        clientId:    values.clientId,
        priceListId: selectedPriceListId,
        lineItems,
      })
      message.success('Orden de servicio creada correctamente')
      onSuccess()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.response?.data?.error?.message ?? 'Error al crear la orden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="Crear Orden"
      okButtonProps={{ disabled: selectedSpaces.length === 0 || !selectedPriceListId }}
      title={
        <Space>
          <ShoppingCartOutlined style={{ color: NAVY }} />
          <span>Crear Orden de Servicio desde Reservas</span>
          {eventName && <Tag color="blue">{eventName}</Tag>}
        </Space>
      }
      width={800}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="clientId" label="Cliente" rules={[{ required: true, message: 'Selecciona un cliente' }]}>
              <Select
                showSearch allowClear placeholder="Buscar cliente..."
                filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={clients.map((c: any) => ({
                  value: c.id,
                  label: c.companyName || `${c.firstName} ${c.lastName}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priceListId" label="Lista de precios" rules={[{ required: true, message: 'Selecciona una lista de precios' }]}>
              <Select
                showSearch allowClear placeholder="Seleccionar lista..."
                onChange={(v: string) => setSelectedPriceListId(v ?? '')}
                filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={priceLists.map((pl: any) => ({ value: pl.id, label: pl.name }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {selectedPriceListId && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: '#64748b' }}>Tarifa activa:</Text>
          <Tag color={tierColor}>{tierLabel}</Tag>
          {!earlyCutoff && !normalCutoff && (
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>Lista sin fecha de corte — usando tarifa tardía</Text>
          )}
        </div>
      )}

      {spacesLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : spaces.length === 0 ? (
        <Empty description="Este evento no tiene reservas de espacio" style={{ padding: 24 }} />
      ) : (
        <>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text strong style={{ fontSize: 13 }}>Reservas del evento ({spaces.length})</Text>
            <Space size={4}>
              <Button size="small" onClick={() => setSelectedSpaceIds(new Set(spaces.map((s: any) => s.id)))}>Todas</Button>
              <Button size="small" onClick={() => setSelectedSpaceIds(new Set())}>Ninguna</Button>
            </Space>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 170px 90px 70px 90px',
              background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              padding: '7px 12px', gap: 8,
              fontSize: 11, color: '#64748b', fontWeight: 600,
            }}>
              <span />
              <span>Recurso / Fase</span>
              <span>Período</span>
              <span style={{ textAlign: 'right' }}>Precio / unidad</span>
              <span style={{ textAlign: 'right' }}>Cantidad</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {spaces.map((space: any) => {
              const checked   = selectedSpaceIds.has(space.id)
              const item      = getItemForResource(space.resourceId)
              const qty       = item ? calcTimeUnitValue(item.timeUnit, space.startTime, space.endTime) : null
              const price     = item ? getPrice(item) : null
              const lineTotal = qty != null && price != null ? qty * price : null
              const phaseSt   = PHASE_STYLE[space.phase]

              return (
                <div key={space.id} style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr 170px 90px 70px 90px',
                  padding: '10px 12px', alignItems: 'center', gap: 8,
                  borderBottom: '1px solid #f0f4f8',
                  background: checked ? '#f0f9ff' : '#fff',
                  opacity: checked ? 1 : 0.45,
                  transition: 'background 0.15s, opacity 0.15s',
                }}>
                  <input
                    type="checkbox" checked={checked} style={{ cursor: 'pointer', width: 15, height: 15 }}
                    onChange={e => {
                      const s = new Set(selectedSpaceIds)
                      if (e.target.checked) s.add(space.id); else s.delete(space.id)
                      setSelectedSpaceIds(s)
                    }}
                  />

                  <div>
                    <Text strong style={{ fontSize: 13 }}>{space.resource?.name ?? space.resourceId}</Text>
                    {space.resource?.code && (
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{space.resource.code}</Text>
                    )}
                    <div style={{ marginTop: 2 }}>
                      <span style={{
                        fontSize: 11, borderRadius: 3, padding: '1px 6px',
                        background: phaseSt?.background,
                        border: `1px solid ${phaseSt?.color}`,
                        color: phaseSt?.color,
                      }}>
                        {phaseSt?.label ?? space.phase}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: '#374151' }}>
                    <div>{dayjs(space.startTime).format('DD MMM YYYY HH:mm')}</div>
                    <div style={{ color: '#94a3b8' }}>→ {dayjs(space.endTime).format('DD MMM YYYY HH:mm')}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {selectedPriceListId ? (
                      item ? (
                        <>
                          <Text style={{ fontSize: 13, fontWeight: 600, color: tierColor }}>{fmt(price!)}</Text>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.timeUnit ?? 'unidad'}</div>
                        </>
                      ) : (
                        <Text style={{ fontSize: 11, color: '#ff4d4f' }}>Sin precio</Text>
                      )
                    ) : (
                      <Text style={{ fontSize: 11, color: '#cbd5e1' }}>—</Text>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', fontSize: 13, color: '#374151' }}>
                    {qty != null ? `${qty}` : '—'}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {lineTotal != null ? (
                      <Text strong style={{ color: NAVY }}>{fmt(lineTotal)}</Text>
                    ) : (
                      <Text style={{ color: '#cbd5e1' }}>—</Text>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#64748b' }}>
              {selectedSpaces.length} de {spaces.length} reserva{spaces.length !== 1 ? 's' : ''} seleccionada{selectedSpaces.length !== 1 ? 's' : ''}
            </Text>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Total estimado</div>
              <Text strong style={{ fontSize: 24, color: NAVY }}>{fmt(total)}</Text>
              {selectedPriceListId && (
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Tarifa {tierLabel}</div>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
