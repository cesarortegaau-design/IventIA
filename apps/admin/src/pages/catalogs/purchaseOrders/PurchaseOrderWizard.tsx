import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Space, Row, Col, Form, Input, Select, InputNumber,
  Table, App, Typography, Divider, DatePicker, Steps, Statistic, Tag,
} from 'antd'
import { PlusOutlined, DeleteOutlined, SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Decimal } from 'decimal.js'
import { purchaseOrdersApi } from '../../../api/purchaseOrders'
import { suppliersApi } from '../../../api/suppliers'
import { supplierPriceListsApi } from '../../../api/supplierPriceLists'
import { organizationsApi } from '../../../api/organizations'
import { useAuthStore } from '../../../stores/authStore'
import { formatMoney } from '../../../utils/format'

const { Text } = Typography

interface LineItem {
  resourceId: string
  quantity: number
  unitPrice: number
  description?: string
  deliveryTimeDays?: number
  notes?: string
  resourceCode?: string
  resourceName?: string
  resourceUnit?: string
}

export default function PurchaseOrderWizard() {
  const [headerForm] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [step, setStep] = useState(0)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>()
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>()
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [taxRate] = useState(0.16)
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>()

  const userDepartments = useAuthStore(s => s.user?.departments ?? [])
  const departmentIds = userDepartments.map((d: any) => d.id).join(',')

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  })
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }).then(r => r.data),
  })
  const { data: priceListsData } = useQuery({
    queryKey: ['supplierPriceLists', selectedSupplierId],
    queryFn: () =>
      selectedSupplierId
        ? supplierPriceListsApi.list({ supplierId: selectedSupplierId, pageSize: 1000 }).then(r => r.data)
        : Promise.resolve({ data: [] }),
    enabled: !!selectedSupplierId,
  })
  const { data: priceListDetail } = useQuery({
    queryKey: ['supplierPriceList', selectedPriceListId, departmentIds],
    queryFn: () =>
      selectedPriceListId
        ? supplierPriceListsApi.get(selectedPriceListId, departmentIds ? { departmentIds } : undefined).then(r => r.data)
        : Promise.resolve(null),
    enabled: !!selectedPriceListId,
  })

  const userOrgIds = new Set(
    userDepartments.flatMap((d: any) => (d.departmentOrgs ?? []).map((do_: any) => do_.organizationId ?? do_.organization?.id))
  )
  const allOrgs: any[] = orgsData?.data ?? []
  const orgOptions = allOrgs
    .filter((o: any) => o.isActive && (userOrgIds.size === 0 || userOrgIds.has(o.id)))
    .map((o: any) => ({ value: o.id, label: `${o.clave} — ${o.descripcion}` }))

  const catalogItems: any[] = priceListDetail?.data?.items ?? priceListDetail?.items ?? []
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase()
    return catalogItems.filter((i: any) => {
      if (!q) return true
      const name = String(i.resource?.name ?? '').toLowerCase()
      const code = String(i.resource?.code ?? '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [catalogItems, catalogSearch])

  const subtotal = lineItems.reduce((sum, item) => sum + new Decimal(item.quantity).times(item.unitPrice).toNumber(), 0)
  const taxAmt = new Decimal(subtotal).times(taxRate).toNumber()
  const total = subtotal + taxAmt

  const createMutation = useMutation({
    mutationFn: () => {
      const values = headerForm.getFieldsValue()
      const supplier = (suppliersData?.data ?? []).find((s: any) => s.id === selectedSupplierId)
      if (!values.requiredDeliveryDate) {
        message.error('Selecciona una fecha de entrega')
        return Promise.reject()
      }
      if (lineItems.length === 0) {
        message.error('Agrega al menos un item')
        return Promise.reject()
      }
      return purchaseOrdersApi.create({
        supplierId: selectedSupplierId!,
        priceListId: selectedPriceListId,
        requiredDeliveryDate: values.requiredDeliveryDate.toISOString(),
        deliveryLocation: values.deliveryLocation || undefined,
        notes: values.notes || undefined,
        organizacionId: selectedOrgId,
        taxRate: taxRate * 100,
        currency: supplier?.currencyCode || 'MXN',
        lineItems: lineItems.map(item => ({
          resourceId: item.resourceId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          description: item.description,
          deliveryTimeDays: item.deliveryTimeDays,
          notes: item.notes,
        })),
      } as any).then(r => r.data)
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      message.success('Orden de Compra creada')
      navigate(`/catalogos/ordenes-compra/${data.data?.id ?? data.id}`)
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al crear OC')
    },
  })

  function addCatalogItem(item: any) {
    const already = lineItems.find(li => li.resourceId === item.resourceId)
    if (already) {
      setLineItems(prev => prev.map(li =>
        li.resourceId === item.resourceId ? { ...li, quantity: li.quantity + 1 } : li
      ))
      return
    }
    setLineItems(prev => [...prev, {
      resourceId: item.resourceId,
      quantity: 1,
      unitPrice: parseFloat(item.unitPrice || 0),
      resourceCode: item.resource?.code,
      resourceName: item.resource?.name,
      resourceUnit: item.resource?.unit,
    }])
  }

  function updateItem(resourceId: string, field: keyof LineItem, value: any) {
    setLineItems(prev => prev.map(li => li.resourceId === resourceId ? { ...li, [field]: value } : li))
  }

  function removeItem(resourceId: string) {
    setLineItems(prev => prev.filter(li => li.resourceId !== resourceId))
  }

  async function handleNext() {
    if (step === 0) {
      try {
        await headerForm.validateFields(['supplierId', 'priceListId', 'requiredDeliveryDate', 'organizacionId'])
        setStep(1)
      } catch {}
    } else {
      createMutation.mutate()
    }
  }

  const lineColumns = [
    {
      title: 'Recurso',
      render: (_: any, r: LineItem) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{r.resourceName ?? '—'}</div>
          {r.resourceCode && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontFamily: 'monospace' }}>{r.resourceCode}</div>}
        </div>
      ),
    },
    {
      title: 'Cant.',
      dataIndex: 'quantity',
      width: 90,
      align: 'center' as const,
      render: (v: number, r: LineItem) => (
        <InputNumber
          min={0.001}
          value={v}
          onChange={val => updateItem(r.resourceId, 'quantity', val ?? 1)}
          style={{ width: 80 }}
          size="small"
        />
      ),
    },
    {
      title: 'Precio Unit.',
      dataIndex: 'unitPrice',
      width: 120,
      align: 'right' as const,
      render: (v: number, r: LineItem) => (
        <InputNumber
          min={0}
          value={v}
          onChange={val => updateItem(r.resourceId, 'unitPrice', val ?? 0)}
          style={{ width: 110 }}
          size="small"
          formatter={val => `$${Number(val || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`}
          parser={val => Number(String(val).replace(/[^\d.-]/g, ''))}
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 110,
      align: 'right' as const,
      render: (_: any, r: LineItem) => (
        <Text strong style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(r.quantity * r.unitPrice, 'MXN')}
        </Text>
      ),
    },
    {
      title: '',
      key: 'del',
      width: 40,
      render: (_: any, r: LineItem) => (
        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(r.resourceId)} />
      ),
    },
  ]

  const stepItems = [
    { title: 'Datos generales' },
    { title: 'Items y totales' },
  ]

  // ── STEP 0: header form ──
  const step0 = (
    <Form form={headerForm} layout="vertical">
      <Row gutter={16}>
        <Col xs={12}>
          <Form.Item name="supplierId" label="Proveedor" rules={[{ required: true }]}>
            <Select
              placeholder="Seleccionar proveedor…"
              showSearch
              filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
              options={(suppliersData?.data ?? []).map((s: any) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
              onChange={(v) => { setSelectedSupplierId(v); setSelectedPriceListId(undefined); headerForm.setFieldValue('priceListId', undefined) }}
            />
          </Form.Item>
        </Col>
        <Col xs={12}>
          <Form.Item name="priceListId" label="Lista de Precios" rules={[{ required: true }]}>
            <Select
              placeholder={selectedSupplierId ? 'Seleccionar lista…' : 'Primero selecciona proveedor'}
              disabled={!selectedSupplierId}
              options={(priceListsData?.data ?? []).map((pl: any) => ({ value: pl.id, label: `${pl.code} — ${pl.name}` }))}
              onChange={(v) => setSelectedPriceListId(v)}
            />
          </Form.Item>
        </Col>
        <Col xs={12}>
          <Form.Item name="organizacionId" label="Organización" rules={[{ required: true }]}>
            <Select
              placeholder="Seleccionar organización…"
              options={orgOptions}
              onChange={setSelectedOrgId}
              showSearch
              filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
            />
          </Form.Item>
        </Col>
        <Col xs={12}>
          <Form.Item name="requiredDeliveryDate" label="Fecha de Entrega" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col xs={12}>
          <Form.Item name="deliveryLocation" label="Ubicación de Entrega">
            <Input placeholder="Ej: Bodega principal" />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )

  // ── STEP 1: items (split layout) ──
  const step1 = (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, minHeight: 460 }}>
      {/* Left: catalog */}
      <div>
        <Card size="small" title="Catálogo del proveedor" styles={{ body: { padding: '8px 12px' } }}>
          <Input
            prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.35)' }} />}
            placeholder="Buscar recurso…"
            value={catalogSearch}
            onChange={e => setCatalogSearch(e.target.value)}
            allowClear
            size="small"
            style={{ marginBottom: 8 }}
          />
          <div style={{ maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {!selectedPriceListId ? (
              <Text type="secondary" style={{ fontSize: 12, padding: '8px 0' }}>
                Selecciona una lista de precios en el paso anterior
              </Text>
            ) : filteredCatalog.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12, padding: '8px 0' }}>Sin resultados</Text>
            ) : (
              filteredCatalog.map((item: any) => (
                <div
                  key={item.resourceId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                    background: '#fff',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.resource?.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontFamily: 'monospace' }}>{item.resource?.code}</div>
                    <div style={{ fontSize: 11, color: '#6B46C1', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(parseFloat(item.unitPrice || 0), 'MXN')}
                    </div>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addCatalogItem(item)}
                    style={{ flexShrink: 0 }}
                  />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Right: items table + totals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card styles={{ body: { padding: 0 } }} title={`Items (${lineItems.length})`}>
          <Table
            dataSource={lineItems}
            columns={lineColumns}
            rowKey="resourceId"
            pagination={false}
            size="small"
            locale={{ emptyText: <Text type="secondary" style={{ fontSize: 12 }}>Agrega items desde el catálogo</Text> }}
          />
        </Card>

        {lineItems.length > 0 && (
          <Card size="small" style={{ background: '#fafafa' }}>
            <Row justify="end" gutter={24}>
              <Col>
                <Statistic title="Subtotal" value={formatMoney(subtotal, 'MXN')} valueStyle={{ fontSize: 14 }} />
              </Col>
              <Col>
                <Statistic title={`IVA ${(taxRate * 100).toFixed(0)}%`} value={formatMoney(taxAmt, 'MXN')} valueStyle={{ fontSize: 14 }} />
              </Col>
              <Col>
                <Statistic title="Total" value={formatMoney(total, 'MXN')} valueStyle={{ fontSize: 16, color: '#6B46C1', fontWeight: 700 }} />
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/catalogos/ordenes-compra')}>
          Órdenes de Compra
        </Button>
        <Divider type="vertical" />
        <span style={{ fontWeight: 600, fontSize: 16 }}>Nueva Orden de Compra</span>
      </div>

      {/* Steps */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}>
        <Steps current={step} size="small" items={stepItems} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: step === 1 ? undefined : 1100, margin: '0 auto', padding: 24 }}>
        <Card styles={{ body: { padding: step === 1 ? 16 : 24 } }}>
          {step === 0 ? step0 : step1}

          <Divider />

          <Space>
            {step > 0 && <Button onClick={() => setStep(0)}>Atrás</Button>}
            <Button
              type="primary"
              onClick={handleNext}
              loading={createMutation.isPending}
              disabled={step === 1 && lineItems.length === 0}
            >
              {step === stepItems.length - 1 ? 'Crear Orden de Compra' : 'Siguiente →'}
            </Button>
            <Button type="text" onClick={() => navigate('/catalogos/ordenes-compra')}>
              Cancelar
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  )
}
