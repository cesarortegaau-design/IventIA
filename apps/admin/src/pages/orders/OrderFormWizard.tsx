import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Steps, Form, Select, Button, Table, InputNumber, Input, Space,
  Typography, Row, Col, Statistic, App, Divider, Tag, Modal, DatePicker
} from 'antd'
import dayjs from 'dayjs'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { eventsApi } from '../../api/events'
import { clientsApi } from '../../api/clients'
import { priceListsApi } from '../../api/priceLists'
import { resourcesApi } from '../../api/resources'
import { organizationsApi } from '../../api/organizations'
import { useAuthStore } from '../../stores/authStore'

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

  useEffect(() => {
    if (event?.priceListId) {
      form.setFieldValue('priceListId', event.priceListId)
      setSelectedPriceListId(event.priceListId)
    }
    const now = dayjs()
    form.setFieldValue('startDate', now)
    form.setFieldValue('endDate', now)
  }, [event?.priceListId])

  const createMutation = useMutation({
    mutationFn: ({ formValues, items }: { formValues: any; items: any[] }) =>
      eventsApi.createOrder(eventId!, {
        ...formValues,
        lineItems: items.map(li => {
          let observations = li.observations || ''
          // Incluir selecciones de sustitución en las observaciones
          if (li.substitutionSelections && Object.keys(li.substitutionSelections).length > 0) {
            const substitutionInfo = Object.entries(li.substitutionSelections)
              .map(([pkgId, selectedCompId]) => {
                const subPkg = li.packageComponents.find((c: any) => c.componentResourceId === pkgId)
                if (!subPkg) return null

                // Buscar el componente seleccionado en los detalles cargados
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
            quantity: li.quantity,
            discountPct: li.discountPct ?? 0,
            observations,
            deliveryDate: li.deliveryDate || undefined,
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

  // Detectar componentes con sustitución anidados
  // Busca recursos que sean paquetes de sustitución (isPackage=true Y isSubstitute=true)
  function getNestedSubstitutionPackages(components: any[]) {
    return components.filter((comp: any) => {
      const isSubstitutionPackage = comp.componentResource?.isPackage === true && comp.componentResource?.isSubstitute === true
      return isSubstitutionPackage
    })
  }

  async function addLineItem(resourceId: string) {
    const item = priceListItems.find((i: any) => i.resourceId === resourceId)
    if (!item) return

    // Validate duplicate based on resource's checkDuplicate setting
    const alreadyAdded = lineItems.find(li => li.resourceId === resourceId)
    if (alreadyAdded) {
      if (item.resource.checkDuplicate !== false) {
        message.warning('Este recurso no permite repetición en la Orden de Servicio')
        return
      }
    }

    const newItem = {
      resourceId,
      description: item.resource.name,
      earlyPrice: Number(item.earlyPrice),
      normalPrice: Number(item.normalPrice),
      latePrice: Number(item.latePrice),
      quantity: 1,
      discountPct: 0,
      observations: '',
      isPackage: item.resource.isPackage ?? false,
      packageComponents: item.resource.packageComponents ?? [],
    }

    console.log('Adding item:', newItem)

    // Detectar si hay paquetes de sustitución anidados
    const substitutionPackages = getNestedSubstitutionPackages(newItem.packageComponents)
    console.log('Found substitution packages:', substitutionPackages)

    if (substitutionPackages.length > 0) {
      // Cargar detalles de los paquetes de sustitución
      setLoadingSubstitutions(true)
      try {
        const details: Record<string, any> = {}
        for (const subPkg of substitutionPackages) {
          try {
            console.log(`Fetching components for substitution package: ${subPkg.componentResourceId}`)
            const response = await resourcesApi.getPackageComponents(subPkg.componentResourceId)
            console.log(`Received components:`, response)
            details[subPkg.componentResourceId] = response.data?.components || []
          } catch (err) {
            console.error(`Error loading substitution package ${subPkg.componentResourceId}:`, err)
            details[subPkg.componentResourceId] = []
          }
        }
        setSubstitutionPackageDetails(details)
        console.log('Substitution package details:', details)
      } catch (err) {
        message.error('Error cargando opciones de sustitución')
        console.error(err)
      } finally {
        setLoadingSubstitutions(false)
      }

      // Mostrar modal para seleccionar componentes de sustitución
      setPendingItem(newItem)
      setSubstitutionSelections({})
      setSubstitutionModalOpen(true)
    } else {
      // Agregar directamente si no hay sustituciones
      console.log('No substitution packages found, adding directly')
      setLineItems(prev => [...prev, newItem])
    }
  }

  function confirmSubstitutionSelections() {
    if (!pendingItem) return

    // Validar que se haya seleccionado un componente para cada paquete de sustitución
    const substitutionPackages = getNestedSubstitutionPackages(pendingItem.packageComponents)
    const missingSelections = substitutionPackages.filter(
      (pkg: any) => !substitutionSelections[pkg.componentResourceId]
    )

    if (missingSelections.length > 0) {
      message.error(`Debes seleccionar un componente para: ${missingSelections.map((p: any) => p.componentResource.name).join(', ')}`)
      return
    }

    const updatedItem = {
      ...pendingItem,
      substitutionSelections,
    }
    setLineItems(prev => [...prev, updatedItem])
    setSubstitutionModalOpen(false)
    setPendingItem(null)
    message.success('Artículo agregado con selecciones de sustitución')
  }

  function updateLineItem(resourceId: string, field: string, value: any) {
    setLineItems(prev => prev.map(li => li.resourceId === resourceId ? { ...li, [field]: value } : li))
  }

  function removeLineItem(resourceId: string) {
    setLineItems(prev => prev.filter(li => li.resourceId !== resourceId))
  }

  const lineColumns = [
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'desc',
      width: 160,
      render: (text: string, record: any) => (
        <span>
          {record.isPackage && '📦 '}
          {text}
          {record.substitutionSelections && Object.keys(record.substitutionSelections).length > 0 && (
            <Tag color="blue" style={{ marginLeft: '8px', fontSize: '11px' }}>Sustituciones</Tag>
          )}
        </span>
      ),
    },
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
      title: 'F. Entrega', dataIndex: 'deliveryDate', key: 'delivery', width: 170,
      render: (v: any, r: any) => (
        <DatePicker
          showTime
          format="DD/MM/YYYY HH:mm"
          value={v ? dayjs(v) : null}
          onChange={val => updateLineItem(r.resourceId, 'deliveryDate', val?.toISOString() ?? null)}
          style={{ width: 160 }}
          placeholder="Fecha entrega"
        />
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
                  label: `${i.resource.isPackage ? '📦 ' : ''}${i.resource.name} — $${Number(i.normalPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
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
            expandable={{
              expandedRowRender: (r: any) => {
                if (!r.isPackage || !r.packageComponents?.length) return null
                return (
                  <div style={{ padding: '12px 0' }}>
                    <strong style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>📦 Componentes requeridos × {Number(r.quantity).toFixed(3)}</strong>
                    <Table
                      dataSource={r.packageComponents}
                      rowKey="componentResourceId"
                      size="small"
                      pagination={false}
                      columns={[
                        {
                          title: 'Código',
                          key: 'code',
                          width: 70,
                          render: (_: any, comp: any) => comp.componentResource.code,
                        },
                        {
                          title: 'Nombre',
                          key: 'name',
                          render: (_: any, comp: any) => comp.componentResource.name,
                        },
                        {
                          title: 'Qty × Artículo',
                          key: 'qtyPer',
                          width: 110,
                          align: 'right' as const,
                          render: (_: any, comp: any) => Number(comp.quantity).toFixed(3),
                        },
                        {
                          title: 'Total Requerido',
                          key: 'qtyTotal',
                          width: 120,
                          align: 'right' as const,
                          render: (_: any, comp: any) => (Number(comp.quantity) * r.quantity).toFixed(3),
                        },
                        {
                          title: 'Unidad',
                          key: 'unit',
                          width: 80,
                          render: (_: any, comp: any) => comp.componentResource.unit || '—',
                        },
                        {
                          title: 'Seleccionado',
                          key: 'selected',
                          width: 150,
                          render: (_: any, comp: any) => {
                            // Only show selection for components that are substitution packages
                            if (!comp.componentResource.isSubstitute) {
                              return null
                            }

                            // Look up by the substitution package's componentResourceId
                            const selectedValue = r.substitutionSelections?.[comp.componentResourceId]
                            if (selectedValue) {
                              const componentOptions = substitutionPackageDetails[comp.componentResourceId] || []
                              const selectedComp = componentOptions.find((c: any) => c.componentResourceId === selectedValue)
                              if (selectedComp?.componentResource?.name) {
                                return <Tag color="green">✓ {selectedComp.componentResource.name}</Tag>
                              }
                            }
                            return <span style={{ color: '#999' }}>—</span>
                          },
                        },
                      ]}
                    />
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                      * "Qty × Artículo": cantidad de cada componente por artículo<br/>
                      * "Total Requerido": cantidad total para {Number(r.quantity).toFixed(3)} unidades<br/>
                      * "Seleccionado": muestra el recurso específico elegido para paquetes de sustitución
                    </div>
                  </div>
                )
              },
            }}
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
        organizacionId: h.organizacionId || undefined,
        startDate: h.startDate?.toISOString?.() || h.startDate,
        endDate: h.endDate?.toISOString?.() || h.endDate,
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

        {/* Modal para seleccionar componentes de sustitución */}
        {pendingItem && (
          <Modal
            title={`⚠️ Seleccionar Componentes de Sustitución - ${pendingItem.description}`}
            open={substitutionModalOpen}
            onCancel={() => {
              setSubstitutionModalOpen(false)
              setPendingItem(null)
              setSubstitutionPackageDetails({})
            }}
            onOk={confirmSubstitutionSelections}
            okText="Agregar Artículo"
            cancelText="Cancelar"
            width={700}
            confirmLoading={loadingSubstitutions}
          >
            {loadingSubstitutions && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                Cargando opciones de sustitución...
              </div>
            )}
            {!loadingSubstitutions && (
              <>
                <div style={{ color: '#666', marginBottom: '16px', fontSize: '12px' }}>
                  Este paquete contiene componentes de sustitución. Selecciona cuál recurso usar para cada paquete de sustitución.
                </div>
                {getNestedSubstitutionPackages(pendingItem.packageComponents).map((subPkg: any) => {
                  const hasSelection = !!substitutionSelections[subPkg.componentResourceId]
                  const components = substitutionPackageDetails[subPkg.componentResourceId] || []

                  return (
                    <div key={subPkg.componentResourceId} style={{ marginBottom: '16px', padding: '12px', background: hasSelection ? '#e6f7ff' : '#f5f5f5', borderRadius: '4px', borderLeft: '4px solid ' + (hasSelection ? '#1890ff' : '#d9d9d9') }}>
                      <strong style={{ display: 'block', marginBottom: '8px' }}>
                        📦 {subPkg.componentResource.name} {hasSelection && <Tag color="blue">✓ Seleccionado</Tag>}
                      </strong>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        Selecciona uno de estos componentes ({components.length} opciones disponibles):
                      </div>
                      <Form layout="vertical">
                        <Form.Item label="">
                          <Select
                            placeholder={components.length === 0 ? 'No hay opciones disponibles' : 'Seleccionar componente...'}
                            value={substitutionSelections[subPkg.componentResourceId] || undefined}
                            onChange={(val) =>
                              setSubstitutionSelections(prev => ({
                                ...prev,
                                [subPkg.componentResourceId]: val,
                              }))
                            }
                            disabled={components.length === 0}
                            options={components.map((comp: any) => ({
                              value: comp.componentResourceId,
                              label: `${comp.componentResource?.code || '?'} - ${comp.componentResource?.name || '?'} (${Number(comp.quantity).toFixed(3)} ${comp.componentResource?.unit || 'unidad'})`,
                            }))}
                          />
                        </Form.Item>
                      </Form>
                    </div>
                  )
                })}
              </>
            )}
          </Modal>
        )}
      </Card>
    </div>
  )
}
