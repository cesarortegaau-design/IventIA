import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Steps, Form, Select, Button, Table, InputNumber, Input, Space,
  Typography, Row, Col, Statistic, App, Divider, Tag
} from 'antd'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { eventsApi } from '../../api/events'
import { clientsApi } from '../../api/clients'
import { priceListsApi } from '../../api/priceLists'

const { Title, Text } = Typography

export default function OrderFormWizard() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [step, setStep] = useState(0)
  const [form] = Form.useForm()
  const [lineItems, setLineItems] = useState<any[]>([])
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>('')
  const savedHeaderValues = useRef<any>({})

  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId!),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients', { pageSize: 200 }],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  })

  const { data: allPriceLists } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => priceListsApi.list(),
  })

  const { data: priceListData } = useQuery({
    queryKey: ['price-list-detail', selectedPriceListId],
    queryFn: () => priceListsApi.get(selectedPriceListId),
    enabled: !!selectedPriceListId,
  })

  const event = eventData?.data
  const priceListItems = priceListData?.data?.items ?? []

  useEffect(() => {
    if (event?.priceListId) {
      form.setFieldValue('priceListId', event.priceListId)
      setSelectedPriceListId(event.priceListId)
    }
  }, [event?.priceListId])

  const createMutation = useMutation({
    mutationFn: ({ formValues, items }: { formValues: any; items: any[] }) =>
      eventsApi.createOrder(eventId!, {
        ...formValues,
        lineItems: items.map(li => ({
          resourceId: li.resourceId,
          quantity: li.quantity,
          discountPct: li.discountPct ?? 0,
          observations: li.observations,
        })),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      message.success('Orden de servicio creada')
      navigate(`/ordenes/${data.data.id}`)
    },
    onError: (err: any) => {
      const details = err?.response?.data?.error?.details?.fieldErrors
      const fieldMsg = details ? Object.entries(details).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' | ') : null
      message.error(fieldMsg ?? err?.response?.data?.error?.message ?? 'Error al crear la orden')
    },
  })

  const clientOptions = (clients?.data ?? []).map((c: any) => ({
    value: c.id,
    label: c.companyName || `${c.firstName} ${c.lastName}`,
  }))

  const standOptions = (event?.stands ?? []).map((s: any) => ({
    value: s.id,
    label: s.code,
  }))

  function addLineItem(resourceId: string) {
    const item = priceListItems.find((i: any) => i.resourceId === resourceId)
    if (!item) return
    if (lineItems.find(li => li.resourceId === resourceId)) {
      message.warning('Este recurso ya fue agregado')
      return
    }
    setLineItems(prev => [...prev, {
      resourceId,
      description: item.resource.name,
      earlyPrice: Number(item.earlyPrice),
      normalPrice: Number(item.normalPrice),
      latePrice: Number(item.latePrice),
      quantity: 1,
      discountPct: 0,
      observations: '',
    }])
  }

  function updateLineItem(resourceId: string, field: string, value: any) {
    setLineItems(prev => prev.map(li => li.resourceId === resourceId ? { ...li, [field]: value } : li))
  }

  function removeLineItem(resourceId: string) {
    setLineItems(prev => prev.filter(li => li.resourceId !== resourceId))
  }

  const lineColumns = [
    { title: 'Descripción', dataIndex: 'description', key: 'desc', width: 160 },
    { title: 'P. Normal', dataIndex: 'normalPrice', width: 110, render: (v: number) => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    {
      title: 'Cantidad', dataIndex: 'quantity', key: 'qty', width: 90,
      render: (v: number, r: any) => (
        <InputNumber min={0.001} value={v} onChange={val => updateLineItem(r.resourceId, 'quantity', val)} style={{ width: 80 }} />
      ),
    },
    {
      title: 'Desc. %', dataIndex: 'discountPct', key: 'disc', width: 80,
      render: (v: number, r: any) => (
        <InputNumber min={0} max={100} value={v} onChange={val => updateLineItem(r.resourceId, 'discountPct', val)} style={{ width: 70 }} />
      ),
    },
    {
      title: 'Observaciones', dataIndex: 'observations', key: 'obs', width: 160,
      render: (v: string, r: any) => (
        <Input value={v} onChange={e => updateLineItem(r.resourceId, 'observations', e.target.value)} />
      ),
    },
    {
      title: '', key: 'del', width: 48,
      render: (_: any, r: any) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeLineItem(r.resourceId)} />
      ),
    },
  ]

  const steps = [
    {
      title: 'Encabezado',
      content: (
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={12}>
              <Form.Item name="clientId" label="Cliente" rules={[{ required: true }]}>
                <Select options={clientOptions} showSearch filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="billingClientId" label="Cliente para Facturar">
                <Select options={clientOptions} showSearch allowClear filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="priceListId" label="Lista de Precios" rules={[{ required: true }]}>
                <Select
                  options={(allPriceLists?.data ?? []).map((p: any) => ({ value: p.id, label: p.name }))}
                  onChange={(v) => setSelectedPriceListId(v)}
                  placeholder="Seleccionar lista de precios..."
                />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="standId" label="Stand">
                <Select options={standOptions} allowClear />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notas">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      ),
    },
    {
      title: 'Productos',
      content: (
        <div>
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text strong>Agregar recurso de la lista de precios:</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Seleccionar recurso..."
                showSearch
                options={priceListItems.map((i: any) => ({
                  value: i.resourceId,
                  label: `${i.resource.name} — $${Number(i.normalPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                }))}
                onChange={addLineItem}
                value={null}
                filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </div>
          </Card>
          <Table
            dataSource={lineItems}
            columns={lineColumns}
            rowKey="resourceId"
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            footer={() => {
              const subtotal = lineItems.reduce((sum, li) => sum + (li.quantity * (li.normalPrice || 0) * (1 - (li.discountPct || 0) / 100)), 0)
              const tax = subtotal * 0.16
              return (
                <Row justify="end" gutter={16} style={{ flexWrap: 'wrap' }}>
                  <Col><Statistic title="Subtotal" value={`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                  <Col><Statistic title="IVA 16%" value={`$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                  <Col><Statistic title="Total Est." valueStyle={{ color: '#6B46C1', fontWeight: 'bold' }} value={`$${(subtotal + tax).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                </Row>
              )
            }}
          />
        </div>
      ),
    },
  ]

  async function handleNext() {
    if (step === 0) {
      try {
        const values = await form.validateFields()
        const priceListId = values.priceListId || event?.priceListId
        savedHeaderValues.current = { ...values, priceListId }
        setSelectedPriceListId(priceListId)
        setStep(1)
      } catch {}
    } else {
      if (lineItems.length === 0) {
        message.error('Agrega al menos un producto o servicio')
        return
      }
      const h = savedHeaderValues.current
      const formValues = {
        clientId: h.clientId,
        billingClientId: h.billingClientId || undefined,
        standId: h.standId || undefined,
        priceListId: h.priceListId,
        notes: h.notes || undefined,
      }
      createMutation.mutate({ formValues, items: lineItems })
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/eventos/${eventId}`)}>
          {event?.name}
        </Button>
      </Space>

      <Card title={<Title level={4} style={{ margin: 0 }}>Nueva Orden de Servicio</Title>}>
        <Steps
          current={step}
          size="small"
          items={steps.map(s => ({ title: s.title }))}
          style={{ marginBottom: 24 }}
        />

        {steps[step].content}

        <Divider />
        <Space wrap>
          {step > 0 && <Button onClick={() => setStep(0)}>Anterior</Button>}
          <Button
            type="primary"
            onClick={handleNext}
            loading={createMutation.isPending}
          >
            {step === steps.length - 1 ? 'Crear Orden' : 'Siguiente'}
          </Button>
          <Button onClick={() => navigate(`/eventos/${eventId}`)}>Cancelar</Button>
        </Space>
      </Card>
    </div>
  )
}
