import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Steps, Form, Select, Button, Table, InputNumber, Input, Space,
  Typography, Row, Col, Statistic, App, Tag, Modal, DatePicker,
  Collapse, Descriptions, Divider, Badge,
} from 'antd'
import dayjs from 'dayjs'
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SearchOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons'
import { eventsApi } from '../../api/events'
import { clientsApi } from '../../api/clients'
import { priceListsApi } from '../../api/priceLists'
import { resourcesApi } from '../../api/resources'
import { organizationsApi } from '../../api/organizations'
import { useAuthStore } from '../../stores/authStore'
import { formatMoney } from '../../utils/format'

const { Text } = Typography

function calcTimeUnitValue(timeUnit: string | null | undefined, startDate: string | null | undefined, endDate: string | null | undefined): number {
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

interface Chapter {
  id: string
  name: string
}

interface LineItem {
  instanceId: string
  resourceId: string
  priceListItemId: string
  description: string
  earlyPrice: number
  normalPrice: number
  latePrice: number
  quantity: number
  discountPct: number
  timeUnit: string | null
  detail: string
  factor: number
  unit: string
  observations: string
  isPackage: boolean
  packageComponents: any[]
  substitutionSelections?: Record<string, string>
  chapterId: string
}

export default function OrderFormWizard() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [step, setStep] = useState(0)
  const [form] = Form.useForm()
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 'default', name: 'General' },
  ])
  const [activeChapterId, setActiveChapterId] = useState('default')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>('')
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false)
  const [pendingItem, setPendingItem] = useState<any>(null)
  const [substitutionSelections, setSubstitutionSelections] = useState<Record<string, string>>({})
  const [substitutionPackageDetails, setSubstitutionPackageDetails] = useState<Record<string, any>>({})
  const [loadingSubstitutions, setLoadingSubstitutions] = useState(false)
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
  const userDepartments = useAuthStore(s => s.user?.departments ?? [])
  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  })
  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => import('../../api/client').then(m => m.apiClient.get('/departments').then(r => r.data)),
  })

  const userDeptIds = new Set(userDepartments.map((d: any) => d.id))
  const userOrgIds = new Set<string>()
  for (const dept of deptsData?.data ?? []) {
    if (userDeptIds.has(dept.id)) {
      for (const do_ of dept.departmentOrgs ?? []) userOrgIds.add(do_.organization.id)
    }
  }
  const allOrgs: any[] = orgsData?.data ?? []
  const orgOptions = allOrgs
    .filter((o: any) => o.isActive && (userOrgIds.size === 0 || userOrgIds.has(o.id)))
    .map((o: any) => ({ value: o.id, label: `${o.clave} — ${o.descripcion}` }))

  const event = eventData?.data
  const priceListItems = priceListData?.data?.items ?? []

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase()
    return priceListItems.filter((i: any) => {
      if (!q) return true
      const name = String(i.resource?.name ?? '').toLowerCase()
      const code = String(i.resource?.code ?? '').toLowerCase()
      const detail = String(i.detail ?? '').toLowerCase()
      return name.includes(q) || code.includes(q) || detail.includes(q)
    })
  }, [priceListItems, catalogSearch])

  useEffect(() => {
    if (event?.priceListId) {
      form.setFieldValue('priceListId', event.priceListId)
      setSelectedPriceListId(event.priceListId)
    }
    const now = dayjs()
    form.setFieldValue('startDate', now)
    form.setFieldValue('endDate', now)
    const state = location.state as { standId?: string; clientId?: string } | null
    if (state?.clientId) form.setFieldValue('clientId', state.clientId)
    if (state?.standId) form.setFieldValue('standId', state.standId)
  }, [event?.priceListId])

  const createMutation = useMutation({
    mutationFn: ({ formValues, items }: { formValues: any; items: LineItem[] }) =>
      eventsApi.createOrder(eventId!, {
        ...formValues,
        lineItems: items.map(li => {
          let observations = li.observations || ''
          if (li.substitutionSelections && Object.keys(li.substitutionSelections).length > 0) {
            const substitutionInfo = Object.entries(li.substitutionSelections)
              .map(([pkgId, selectedCompId]) => {
                const subPkg = li.packageComponents.find((c: any) => c.componentResourceId === pkgId)
                if (!subPkg) return null
                const componentOptions = substitutionPackageDetails[pkgId] || []
                const selectedComp = componentOptions.find((c: any) => c.componentResourceId === selectedCompId)
                if (selectedComp?.componentResource?.name) {
                  return `[SUSTITUCIÓN] ${subPkg.componentResource.name}: ${selectedComp.componentResource.name}`
                }
                return null
              })
              .filter(Boolean)
              .join(' | ')
            observations = substitutionInfo + (observations ? ' | ' + observations : '')
          }
          return {
            resourceId: li.resourceId,
            priceListItemId: li.priceListItemId,
            quantity: li.quantity,
            discountPct: li.discountPct ?? 0,
            observations,
          }
        }),
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

  function getNestedSubstitutionPackages(components: any[]) {
    return components.filter((comp: any) =>
      comp.componentResource?.isPackage === true && comp.componentResource?.isSubstitute === true
    )
  }

  async function addLineItem(itemId: string) {
    const item = priceListItems.find((i: any) => i.id === itemId)
    if (!item) return
    const alreadyAdded = lineItems.find(li => li.resourceId === item.resourceId)
    if (alreadyAdded && item.resource.checkDuplicate !== false) {
      message.warning('Este recurso no permite repetición en la Orden de Servicio')
      return
    }
    const newItem: Omit<LineItem, 'substitutionSelections'> = {
      instanceId: `${item.resourceId}-${Date.now()}-${Math.random()}`,
      resourceId: item.resourceId,
      priceListItemId: item.id,
      description: item.resource.name,
      earlyPrice: Number(item.earlyPrice),
      normalPrice: Number(item.normalPrice),
      latePrice: Number(item.latePrice),
      quantity: 1,
      discountPct: 0,
      timeUnit: (item as any).timeUnit ?? null,
      detail: (item as any).detail ?? '',
      factor: Number((item.resource as any).factor ?? 1),
      unit: item.resource?.unit ?? '',
      observations: '',
      isPackage: item.resource.isPackage ?? false,
      packageComponents: item.resource.packageComponents ?? [],
      chapterId: activeChapterId,
    }
    const substitutionPackages = getNestedSubstitutionPackages(newItem.packageComponents)
    if (substitutionPackages.length > 0) {
      setLoadingSubstitutions(true)
      try {
        const details: Record<string, any> = {}
        for (const subPkg of substitutionPackages) {
          try {
            const response = await resourcesApi.getPackageComponents(subPkg.componentResourceId)
            details[subPkg.componentResourceId] = response.data?.components || []
          } catch {
            details[subPkg.componentResourceId] = []
          }
        }
        setSubstitutionPackageDetails(details)
      } catch {
        message.error('Error cargando opciones de sustitución')
      } finally {
        setLoadingSubstitutions(false)
      }
      setPendingItem(newItem)
      setSubstitutionSelections({})
      setSubstitutionModalOpen(true)
    } else {
      setLineItems(prev => [...prev, newItem as LineItem])
    }
  }

  function confirmSubstitutionSelections() {
    if (!pendingItem) return
    const substitutionPackages = getNestedSubstitutionPackages(pendingItem.packageComponents)
    const missingSelections = substitutionPackages.filter(
      (pkg: any) => !substitutionSelections[pkg.componentResourceId]
    )
    if (missingSelections.length > 0) {
      message.error(`Debes seleccionar un componente para: ${missingSelections.map((p: any) => p.componentResource.name).join(', ')}`)
      return
    }
    setLineItems(prev => [...prev, { ...pendingItem, instanceId: `${pendingItem.resourceId}-${Date.now()}-${Math.random()}`, substitutionSelections } as LineItem])
    setSubstitutionModalOpen(false)
    setPendingItem(null)
    message.success('Artículo agregado con selecciones de sustitución')
  }

  function updateLineItem(instanceId: string, field: string, value: any) {
    setLineItems(prev => prev.map(li => li.instanceId === instanceId ? { ...li, [field]: value } : li))
  }

  function removeLineItem(instanceId: string) {
    setLineItems(prev => prev.filter(li => li.instanceId !== instanceId))
  }

  function addChapter() {
    const id = `chapter-${Date.now()}`
    const name = `Sección ${chapters.length + 1}`
    setChapters(prev => [...prev, { id, name }])
    setActiveChapterId(id)
  }

  function renameChapter(id: string, name: string) {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }

  function moveItem(instanceId: string, direction: 'up' | 'down') {
    setLineItems(prev => {
      const idx = prev.findIndex(li => li.instanceId === instanceId)
      if (idx < 0) return prev
      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  // Totals calculation
  const { subtotal, tax, total } = useMemo(() => {
    const sub = lineItems.reduce((sum, li) => {
      const tuv = calcTimeUnitValue(li.timeUnit, form.getFieldValue('startDate')?.toISOString(), form.getFieldValue('endDate')?.toISOString())
      const efFactor = li.timeUnit?.endsWith('sin factor') ? 1 : (li.factor ?? 1)
      return sum + (li.quantity * (li.normalPrice || 0) * tuv * efFactor * (1 - (li.discountPct || 0) / 100))
    }, 0)
    const t = sub * 0.16
    return { subtotal: sub, tax: t, total: sub + t }
  }, [lineItems])

  async function handleNext() {
    if (step === 0) {
      try {
        const values = await form.validateFields()
        const priceListId = values.priceListId || event?.priceListId
        savedHeaderValues.current = { ...values, priceListId }
        setSelectedPriceListId(priceListId)
        setStep(1)
      } catch {}
    } else if (step === 1) {
      if (lineItems.length === 0) {
        message.error('Agrega al menos un producto o servicio')
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else {
      // Step 3: create
      const h = savedHeaderValues.current
      const formValues = {
        clientId: h.clientId,
        billingClientId: h.billingClientId || undefined,
        standId: h.standId || undefined,
        priceListId: h.priceListId,
        organizacionId: h.organizacionId || undefined,
        startDate: h.startDate?.toISOString?.() || h.startDate,
        endDate: h.endDate?.toISOString?.() || h.endDate,
        notes: h.notes || undefined,
      }
      createMutation.mutate({ formValues, items: lineItems })
    }
  }

  const stepItems = [
    { title: 'Datos generales' },
    { title: 'Items y secciones' },
    { title: 'Condiciones' },
    { title: 'Revisar y crear' },
  ]

  // ── STEP 0: Datos generales ──
  const step0Content = (
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
        <Col xs={12}>
          <Form.Item name="startDate" label="Fecha Hora Inicio" rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={12}>
          <Form.Item name="endDate" label="Fecha Hora Fin" rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="organizacionId" label="Organización" rules={[{ required: true, message: 'La organización es requerida' }]}>
            <Select options={orgOptions} placeholder="Seleccionar organización..." showSearch filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )

  // ── STEP 1: Items y secciones (split layout) ──
  const step1Content = (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, minHeight: 500 }}>
      {/* Left: Catalog */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Card
          size="small"
          title="Catálogo"
          styles={{ body: { padding: '8px 12px' } }}
          style={{ position: 'sticky', top: 0 }}
        >
          <Input
            prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.35)' }} />}
            placeholder="Buscar recurso…"
            value={catalogSearch}
            onChange={e => setCatalogSearch(e.target.value)}
            allowClear
            size="small"
            style={{ marginBottom: 8 }}
          />
          <div style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredCatalog.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12, padding: '8px 0' }}>
                {selectedPriceListId ? 'Sin resultados' : 'Selecciona una lista de precios primero'}
              </Text>
            ) : (
              filteredCatalog.map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.resource?.isPackage ? '📦 ' : ''}{item.resource?.name}
                    </div>
                    {item.detail && (
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#6B46C1', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(Number(item.normalPrice), 'MXN')}
                    </div>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addLineItem(item.id)}
                    style={{ flexShrink: 0 }}
                  />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Right: Items grouped by chapter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Chapter tabs / add button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {chapters.map(ch => (
            <Tag
              key={ch.id}
              color={ch.id === activeChapterId ? 'purple' : 'default'}
              style={{ cursor: 'pointer', userSelect: 'none', fontSize: 12 }}
              onClick={() => setActiveChapterId(ch.id)}
            >
              {ch.name}{' '}
              <Badge
                count={lineItems.filter(li => li.chapterId === ch.id).length}
                style={{ backgroundColor: ch.id === activeChapterId ? '#6B46C1' : '#d9d9d9', fontSize: 10, marginLeft: 2 }}
              />
            </Tag>
          ))}
          <Button
            size="small"
            icon={<AppstoreAddOutlined />}
            onClick={addChapter}
            type="dashed"
          >
            Nueva sección
          </Button>
        </div>

        {/* Collapsed chapters */}
        <Collapse
          defaultActiveKey={chapters.map(c => c.id)}
          size="small"
          items={chapters.map(ch => {
            const chItems = lineItems.filter(li => li.chapterId === ch.id)
            return {
              key: ch.id,
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Input
                    value={ch.name}
                    size="small"
                    style={{ width: 180, fontWeight: 500 }}
                    onClick={e => e.stopPropagation()}
                    onChange={e => renameChapter(ch.id, e.target.value)}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {chItems.length} partida{chItems.length !== 1 ? 's' : ''}
                  </Text>
                  {chItems.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                      {formatMoney(
                        chItems.reduce((sum, li) => {
                          const tuv = calcTimeUnitValue(li.timeUnit, form.getFieldValue('startDate')?.toISOString(), form.getFieldValue('endDate')?.toISOString())
                          const efF = li.timeUnit?.endsWith('sin factor') ? 1 : (li.factor ?? 1)
                          return sum + li.quantity * (li.normalPrice || 0) * tuv * efF * (1 - (li.discountPct || 0) / 100)
                        }, 0),
                        'MXN'
                      )}
                    </Text>
                  )}
                </div>
              ),
              children: (
                <Table
                  dataSource={chItems}
                  rowKey="instanceId"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: <Text type="secondary" style={{ fontSize: 12 }}>Sin partidas — agrega desde el catálogo</Text> }}
                  columns={[
                    {
                      title: 'Recurso',
                      dataIndex: 'description',
                      render: (text: string, r: any) => (
                        <span style={{ fontSize: 12 }}>
                          {r.isPackage && '📦 '}
                          {text}
                          {r.substitutionSelections && Object.keys(r.substitutionSelections).length > 0 && (
                            <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>Sub.</Tag>
                          )}
                        </span>
                      ),
                    },
                    {
                      title: 'Cant.',
                      dataIndex: 'quantity',
                      width: 90,
                      align: 'center' as const,
                      render: (v: number, r: any) => (
                        <InputNumber
                          min={0.001}
                          value={v}
                          onChange={val => updateLineItem(r.instanceId, 'quantity', val)}
                          style={{ width: 80 }}
                          size="small"
                        />
                      ),
                    },
                    {
                      title: 'Precio',
                      dataIndex: 'normalPrice',
                      width: 110,
                      align: 'right' as const,
                      render: (v: number, r: any) => (
                        <InputNumber
                          min={0}
                          value={v}
                          onChange={val => updateLineItem(r.instanceId, 'normalPrice', val)}
                          style={{ width: 100 }}
                          size="small"
                          formatter={val => `$${Number(val || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
                          parser={val => Number(String(val).replace(/[^\d.-]/g, ''))}
                        />
                      ),
                    },
                    {
                      title: 'Total',
                      key: 'total',
                      width: 110,
                      align: 'right' as const,
                      render: (_: any, r: any) => {
                        const tuv = calcTimeUnitValue(r.timeUnit, form.getFieldValue('startDate')?.toISOString(), form.getFieldValue('endDate')?.toISOString())
                        const efF = r.timeUnit?.endsWith('sin factor') ? 1 : (r.factor ?? 1)
                        const t = r.quantity * (r.normalPrice || 0) * tuv * efF * (1 - (r.discountPct || 0) / 100)
                        return <Text strong style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(t, 'MXN')}</Text>
                      },
                    },
                    {
                      title: '',
                      key: 'actions',
                      width: 80,
                      render: (_: any, r: any) => {
                        const idx = lineItems.findIndex(li => li.instanceId === r.instanceId)
                        return (
                          <Space size={2}>
                            <Button size="small" type="text" onClick={() => moveItem(r.instanceId, 'up')} disabled={idx === 0}>▲</Button>
                            <Button size="small" type="text" onClick={() => moveItem(r.instanceId, 'down')} disabled={idx === lineItems.length - 1}>▼</Button>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeLineItem(r.instanceId)} />
                          </Space>
                        )
                      },
                    },
                  ]}
                />
              ),
            }
          })}
        />

        {/* Totals footer */}
        {lineItems.length > 0 && (
          <Card size="small" style={{ background: '#fafafa' }}>
            <Row justify="end" gutter={24}>
              <Col>
                <Statistic title="Subtotal" value={formatMoney(subtotal, 'MXN')} valueStyle={{ fontSize: 14 }} />
              </Col>
              <Col>
                <Statistic title="IVA 16%" value={formatMoney(tax, 'MXN')} valueStyle={{ fontSize: 14 }} />
              </Col>
              <Col>
                <Statistic title="Total Est." value={formatMoney(total, 'MXN')} valueStyle={{ fontSize: 16, color: '#6B46C1', fontWeight: 700 }} />
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </div>
  )

  // ── STEP 2: Condiciones comerciales ──
  const step2Content = (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item name="notes" label="Notas adicionales / condiciones">
            <Input.TextArea rows={4} placeholder="Condiciones de entrega, términos especiales, etc." />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )

  // ── STEP 3: Revisar y crear ──
  const h = savedHeaderValues.current
  const clientLabel = clientOptions.find(c => c.value === h.clientId)?.label ?? '—'
  const priceListLabel = (allPriceLists?.data ?? []).find((p: any) => p.id === h.priceListId)?.name ?? '—'

  const step3Content = (
    <div>
      <Card title="Resumen del pedido" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Cliente">{clientLabel}</Descriptions.Item>
          <Descriptions.Item label="Lista de Precios">{priceListLabel}</Descriptions.Item>
          <Descriptions.Item label="Inicio">{h.startDate ? dayjs(h.startDate).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
          <Descriptions.Item label="Fin">{h.endDate ? dayjs(h.endDate).format('DD/MM/YYYY HH:mm') : '—'}</Descriptions.Item>
          {h.notes && <Descriptions.Item label="Notas" span={2}>{h.notes}</Descriptions.Item>}
        </Descriptions>
      </Card>

      {chapters.map(ch => {
        const chItems = lineItems.filter(li => li.chapterId === ch.id)
        if (chItems.length === 0) return null
        return (
          <Card key={ch.id} title={ch.name} size="small" style={{ marginBottom: 12 }}>
            <Table
              dataSource={chItems}
              rowKey="instanceId"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Recurso', dataIndex: 'description',
                  render: (text: string, r: any) => <span>{r.isPackage && '📦 '}{text}</span>,
                },
                { title: 'Cant.', dataIndex: 'quantity', width: 80, align: 'center' as const },
                {
                  title: 'Precio', dataIndex: 'normalPrice', width: 110, align: 'right' as const,
                  render: (v: number) => formatMoney(v, 'MXN'),
                },
                {
                  title: 'Total', key: 'total', width: 120, align: 'right' as const,
                  render: (_: any, r: any) => {
                    const tuv = calcTimeUnitValue(r.timeUnit, h.startDate?.toISOString?.(), h.endDate?.toISOString?.())
                    const efF = r.timeUnit?.endsWith('sin factor') ? 1 : (r.factor ?? 1)
                    return formatMoney(r.quantity * (r.normalPrice || 0) * tuv * efF * (1 - (r.discountPct || 0) / 100), 'MXN')
                  },
                },
              ]}
            />
          </Card>
        )
      })}

      <Card size="small" style={{ background: '#f4eeff', borderColor: '#d3adf7' }}>
        <Row justify="end" gutter={24}>
          <Col><Statistic title="Subtotal" value={formatMoney(subtotal, 'MXN')} valueStyle={{ fontSize: 14 }} /></Col>
          <Col><Statistic title="IVA 16%" value={formatMoney(tax, 'MXN')} valueStyle={{ fontSize: 14 }} /></Col>
          <Col><Statistic title="Total" value={formatMoney(total, 'MXN')} valueStyle={{ fontSize: 18, color: '#6B46C1', fontWeight: 700 }} /></Col>
        </Row>
      </Card>
    </div>
  )

  const stepContents = [step0Content, step1Content, step2Content, step3Content]

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/eventos/${eventId}`)} type="text">
          {event?.name}
        </Button>
        <Divider type="vertical" />
        <span style={{ fontWeight: 600, fontSize: 16 }}>Nueva Orden de Servicio</span>
      </div>

      {/* Steps */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}>
        <Steps current={step} size="small" items={stepItems} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: step === 1 ? undefined : 1100, margin: '0 auto', padding: 24 }}>
        <Card styles={{ body: { padding: step === 1 ? 16 : 24 } }}>
          {stepContents[step]}

          <Divider />

          <Space>
            {step > 0 && (
              <Button onClick={() => setStep(s => s - 1)}>
                Atrás
              </Button>
            )}
            <Button
              type="primary"
              onClick={handleNext}
              loading={createMutation.isPending}
            >
              {step === stepItems.length - 1 ? 'Crear Orden de Servicio' : 'Siguiente →'}
            </Button>
            <Button type="text" onClick={() => navigate(`/eventos/${eventId}`)}>
              Cancelar
            </Button>
          </Space>
        </Card>
      </div>

      {/* Substitution modal */}
      {pendingItem && (
        <Modal
          title={`Seleccionar componentes de sustitución — ${pendingItem.description}`}
          open={substitutionModalOpen}
          onCancel={() => { setSubstitutionModalOpen(false); setPendingItem(null); setSubstitutionPackageDetails({}) }}
          onOk={confirmSubstitutionSelections}
          okText="Agregar artículo"
          cancelText="Cancelar"
          width={700}
          confirmLoading={loadingSubstitutions}
        >
          {loadingSubstitutions ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>Cargando opciones…</div>
          ) : (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
                Este paquete contiene componentes de sustitución. Selecciona cuál recurso usar para cada uno.
              </Text>
              {getNestedSubstitutionPackages(pendingItem.packageComponents).map((subPkg: any) => {
                const hasSelection = !!substitutionSelections[subPkg.componentResourceId]
                const components = substitutionPackageDetails[subPkg.componentResourceId] || []
                return (
                  <div
                    key={subPkg.componentResourceId}
                    style={{
                      marginBottom: 16, padding: 12,
                      background: hasSelection ? '#e6f7ff' : '#f5f5f5',
                      borderRadius: 4,
                      borderLeft: `4px solid ${hasSelection ? '#1890ff' : '#d9d9d9'}`,
                    }}
                  >
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      📦 {subPkg.componentResource.name}{' '}
                      {hasSelection && <Tag color="blue">✓ Seleccionado</Tag>}
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      placeholder={components.length === 0 ? 'Sin opciones disponibles' : 'Seleccionar componente…'}
                      value={substitutionSelections[subPkg.componentResourceId] || undefined}
                      onChange={val => setSubstitutionSelections(prev => ({ ...prev, [subPkg.componentResourceId]: val }))}
                      disabled={components.length === 0}
                      options={components.map((comp: any) => ({
                        value: comp.componentResourceId,
                        label: `${comp.componentResource?.code || '?'} - ${comp.componentResource?.name || '?'} (${Number(comp.quantity).toFixed(3)} ${comp.componentResource?.unit || 'unidad'})`,
                      }))}
                    />
                  </div>
                )
              })}
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
