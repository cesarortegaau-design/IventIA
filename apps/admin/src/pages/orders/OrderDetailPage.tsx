import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Descriptions, Table, Tag, Button, Space, Timeline, Form, Tabs,
  Input, InputNumber, Select, DatePicker, Modal, App, Typography, Row, Col, Statistic, Upload, List, Avatar, Popconfirm
} from 'antd'
import { ArrowLeftOutlined, DollarOutlined, FilePdfOutlined, DownloadOutlined, FileOutlined, UploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'
import { clientsApi } from '../../api/clients'
import { priceListsApi } from '../../api/priceLists'
import { resourcesApi } from '../../api/resources'
import { auditApi } from '../../api/audit'
import { exportToCsv } from '../../utils/exportCsv'
import { OrderPdf } from '../../components/OrderPdf'
import AuditTimeline from '../../components/AuditTimeline'
import AuditDrawer from '../../components/AuditDrawer'
import CreatePurchaseOrderModal from '../../components/CreatePurchaseOrderModal'
import GenerateDocumentModal from '../../components/GenerateDocumentModal'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_EXECUTION: 'geekblue', IN_PAYMENT: 'orange',
  PAID: 'purple', INVOICED: 'cyan', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', IN_EXECUTION: 'Ejecutada', IN_PAYMENT: 'En Pago',
  PAID: 'Pagada', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}
const TIER_LABELS: Record<string, string> = {
  EARLY: 'Anticipado', NORMAL: 'Normal', LATE: 'Tardío',
}
const NEXT_STATUSES: Record<string, string[]> = {
  QUOTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_EXECUTION', 'CANCELLED'],
  IN_EXECUTION: [],
  IN_PAYMENT: [],
  PAID: [],
  INVOICED: [],
  CANCELLED: [],
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = App.useApp()
  const [paymentForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editLineItems, setEditLineItems] = useState<any[]>([])
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false)
  const [pendingItem, setPendingItem] = useState<any>(null)
  const [substitutionSelections, setSubstitutionSelections] = useState<Record<string, string>>({})
  const [substitutionPackageDetails, setSubstitutionPackageDetails] = useState<Record<string, any>>({})
  const [loadingSubstitutions, setLoadingSubstitutions] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [docUploading, setDocUploading] = useState(false)
  const [createPOModalOpen, setCreatePOModalOpen] = useState(false)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => ordersApi.deleteDocument(id!, docId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['order', id] }); message.success('Documento eliminado') },
    onError: () => message.error('Error al eliminar documento'),
  })

  async function handleDocUpload(file: File) {
    setDocUploading(true)
    try {
      await ordersApi.uploadDocument(id!, file, 'GENERAL')
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      message.success('Documento subido')
    } catch {
      message.error('Error al subir documento')
    } finally {
      setDocUploading(false)
    }
    return false
  }

  const downloadPdf = async () => {
    if (!order) return
    setPdfLoading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const blob = await pdf(<OrderPdf order={order} />).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${order.orderNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      message.error('Error al generar el PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['order-audit', id],
    queryFn: () => auditApi.getLog('Order', id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      message.success('Estado actualizado')
    },
  })

  const paymentMutation = useMutation({
    mutationFn: (values: any) => ordersApi.addPayment(id!, {
      ...values,
      paymentDate: values.paymentDate.toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      setPaymentModalOpen(false)
      paymentForm.resetFields()
      message.success('Pago registrado')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: any) => ordersApi.update(id!, {
      clientId: values.clientId,
      billingClientId: values.billingClientId || null,
      standId: values.standId || null,
      startDate: values.startDate?.toISOString() || null,
      endDate: values.endDate?.toISOString() || null,
      notes: values.notes || null,
      lineItems: editLineItems.map((li, idx) => {
        let observations = li.observations || ''
        if (li.substitutionSelections && Object.keys(li.substitutionSelections).length > 0) {
          const substitutionInfo = Object.entries(li.substitutionSelections)
            .map(([pkgId, selectedCompId]) => {
              const subPkg = li.packageComponents?.find((c: any) => c.componentResourceId === pkgId)
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
          quantity: li.quantity,
          discountPct: li.discountPct ?? 0,
          observations,
          sortOrder: idx,
        }
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      setEditModalOpen(false)
      message.success('Orden actualizada')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar')
    },
  })

  const actualValuesMutation = useMutation({
    mutationFn: () => ordersApi.updateActualValues(id!, {
      lineItems: editLineItems.map(li => ({
        id: li.id,
        actualQuantity: li.actualQuantity,
        actualDiscountPct: li.actualDiscountPct ?? 0,
        actualObservations: li.actualObservations || null,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      setEditModalOpen(false)
      message.success('Valores reales actualizados')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar valores reales')
    },
  })

  const order = data?.data

  const { data: clientsData } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.list({ limit: 1000 }),
    enabled: editModalOpen,
  })

  const { data: priceListData } = useQuery({
    queryKey: ['priceList-for-edit', order?.priceListId],
    queryFn: () => order?.priceListId ? priceListsApi.get(order.priceListId) : Promise.resolve(null),
    enabled: editModalOpen && !!order?.priceListId,
  })

  if (isLoading) return <Card loading />
  if (!order) return null

  const canEdit = order.status === 'QUOTED' && Number(order.paidAmount) === 0
  const canEditActual = order.status === 'CONFIRMED'
  const isConfirmedOrLater = ['CONFIRMED', 'IN_EXECUTION'].includes(order.status)

  const editPriceListItems = priceListData?.data?.items ?? priceListData?.items ?? []

  function openEditModal() {
    editForm.setFieldsValue({
      clientId: order.clientId,
      billingClientId: order.billingClientId || undefined,
      standId: order.standId || undefined,
      startDate: order.startDate ? dayjs(order.startDate) : null,
      endDate: order.endDate ? dayjs(order.endDate) : null,
      notes: order.notes || '',
    })
    setEditLineItems(
      (order.lineItems ?? []).map((li: any) => ({
        id: li.id,
        resourceId: li.resourceId,
        description: li.resource?.name || li.description,
        resourceCode: li.resource?.code || '',
        unitPrice: Number(li.unitPrice),
        earlyPrice: Number(li.unitPrice),
        normalPrice: Number(li.unitPrice),
        latePrice: Number(li.unitPrice),
        quantity: Number(li.quantity),
        discountPct: Number(li.discountPct),
        lineTotal: Number(li.lineTotal),
        observations: li.observations || '',
        actualQuantity: li.actualQuantity != null ? Number(li.actualQuantity) : Number(li.quantity),
        actualDiscountPct: li.actualDiscountPct != null ? Number(li.actualDiscountPct) : Number(li.discountPct),
        actualLineTotal: li.actualLineTotal != null ? Number(li.actualLineTotal) : Number(li.lineTotal),
        actualObservations: li.actualObservations ?? '',
        isPackage: li.resource?.isPackage ?? false,
        packageComponents: li.resource?.packageComponents ?? [],
      }))
    )
    setEditModalOpen(true)
  }

  // Parse substitution selections from observations
  function getSubstitutionSelections(observations: string) {
    const selections: Record<string, string> = {}
    if (!observations) return selections

    const regex = /\[SUSTITUCIÓN\]\s+([^:]+):\s+([^|]+)/g
    let match
    while ((match = regex.exec(observations)) !== null) {
      selections[match[1].trim()] = match[2].trim()
    }
    return selections
  }

  function getNestedSubstitutionPackages(components: any[]) {
    return components.filter((comp: any) =>
      comp.componentResource?.isPackage === true && comp.componentResource?.isSubstitute === true
    )
  }

  async function addEditLineItem(resourceId: string) {
    const item = editPriceListItems.find((i: any) => i.resourceId === resourceId)
    if (!item) return
    if (editLineItems.find(li => li.resourceId === resourceId)) {
      message.warning('Este recurso ya fue agregado')
      return
    }

    const newItem = {
      resourceId,
      description: item.resource.name,
      resourceCode: item.resource.code || '',
      earlyPrice: Number(item.earlyPrice),
      normalPrice: Number(item.normalPrice),
      latePrice: Number(item.latePrice),
      quantity: 1,
      discountPct: 0,
      observations: '',
      isPackage: item.resource.isPackage ?? false,
      packageComponents: item.resource.packageComponents ?? [],
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
      setEditLineItems(prev => [...prev, newItem])
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
    setEditLineItems(prev => [...prev, { ...pendingItem, substitutionSelections }])
    setSubstitutionModalOpen(false)
    setPendingItem(null)
    message.success('Artículo agregado con selecciones de sustitución')
  }

  function updateEditLineItem(resourceId: string, field: string, value: any) {
    setEditLineItems(prev => prev.map(li => {
      if (li.resourceId !== resourceId) return li
      const updated = { ...li, [field]: value }
      // Recalculate actual line total when actual quantity or discount changes
      if (field === 'actualQuantity' || field === 'actualDiscountPct') {
        const qty = field === 'actualQuantity' ? (value ?? li.actualQuantity) : li.actualQuantity
        const disc = field === 'actualDiscountPct' ? (value ?? li.actualDiscountPct) : li.actualDiscountPct
        updated.actualLineTotal = qty * (li.unitPrice || li.normalPrice || 0) * (1 - (disc || 0) / 100)
      }
      return updated
    }))
  }

  function removeEditLineItem(resourceId: string) {
    setEditLineItems(prev => prev.filter(li => li.resourceId !== resourceId))
  }

  const lineColumns = [
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      render: (text: string, record: any) => (
        <>
          {record.resource?.isPackage && '📦 '}
          {text}
        </>
      ),
    },
    {
      title: 'Departamento',
      key: 'department',
      render: (_: any, record: any) => record.resource?.department?.name ?? '—',
    },
    { title: 'Precio Unit.', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Cantidad', dataIndex: 'quantity', key: 'quantity', render: (v: number) => Number(v) },
    { title: 'Descuento', dataIndex: 'discountPct', key: 'discountPct', render: (v: number) => `${v}%` },
    { title: 'Total', dataIndex: 'lineTotal', key: 'lineTotal', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Observaciones', dataIndex: 'observations', key: 'observations' },
    ...(isConfirmedOrLater ? [
      { title: '✓ Cant. Real', dataIndex: 'actualQuantity', key: 'actualQuantity', render: (v: any) => <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, color: '#0050b3' }}>{v != null ? Number(v) : '—'}</span>, onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }) },
      { title: '✓ Desc. Real', dataIndex: 'actualDiscountPct', key: 'actualDiscountPct', render: (v: any) => <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, color: '#0050b3' }}>{v != null ? `${v}%` : '—'}</span>, onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }) },
      { title: '✓ Total Real', dataIndex: 'actualLineTotal', key: 'actualLineTotal', render: (v: any) => <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, color: '#0050b3' }}>{v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}</span>, onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }) },
      { title: '✓ Obs. Real', dataIndex: 'actualObservations', key: 'actualObservations', render: (v: any) => <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: '3px', fontWeight: 500, color: '#0050b3' }}>{v ?? '—'}</span>, onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }) },
    ] : []),
  ]

  const paymentColumns = [
    { title: 'Fecha', dataIndex: 'paymentDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Método', dataIndex: 'method' },
    { title: 'Monto', dataIndex: 'amount', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Referencia', dataIndex: 'reference' },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          {order.event?.name}
        </Button>
      </Space>

      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>{order.orderNumber}</Title>
            <Tag color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Tag>
            <Tag>{TIER_LABELS[order.pricingTier]}</Tag>
            {order.isCreditNote && <Tag color="red">Nota de Crédito</Tag>}
          </Space>
        }
        extra={
          <Space wrap>
            <Button
              icon={<FilePdfOutlined />}
              loading={pdfLoading}
              onClick={downloadPdf}
              style={{ borderColor: '#1a3a5c', color: '#1a3a5c' }}
            >
              Descargar PDF
            </Button>
            <Button
              icon={<FileOutlined />}
              onClick={() => setGenerateDocOpen(true)}
            >
              Generar Word
            </Button>
            <AuditDrawer
              entityType="Order"
              entityId={id!}
              entityName={order.orderNumber}
              data={auditData?.data ?? []}
              loading={auditLoading}
            />
            {(canEdit || canEditActual) && (
              <Button icon={<EditOutlined />} onClick={openEditModal}>
                Editar
              </Button>
            )}
            {NEXT_STATUSES[order.status]?.map((s: string) => (
              <Button
                key={s}
                type={s === 'CANCELLED' ? 'default' : 'primary'}
                danger={s === 'CANCELLED'}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate(s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
            {order.status === 'CONFIRMED' && (
              <Button icon={<DollarOutlined />} onClick={() => setPaymentModalOpen(true)}>
                Registrar Pago
              </Button>
            )}
            {(order.status === 'QUOTED' || order.status === 'CONFIRMED') && (
              <Button type="primary" onClick={() => setCreatePOModalOpen(true)}>
                Crear Orden de Compra
              </Button>
            )}
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}><Statistic title="Subtotal" prefix="$" value={Number(order.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
          <Col xs={12} sm={6}><Statistic title="Descuento" prefix="$" value={Number(order.discountAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
          <Col xs={12} sm={6}><Statistic title="IVA" prefix="$" value={Number(order.taxAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
          <Col xs={12} sm={6}><Statistic title="Total" prefix="$" valueStyle={{ color: '#6B46C1', fontWeight: 'bold' }} value={Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
        </Row>

        <Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Cliente">
            {order.client?.companyName || `${order.client?.firstName} ${order.client?.lastName}`}
          </Descriptions.Item>
          <Descriptions.Item label="Cliente Facturación">
            {order.billingClient?.companyName || order.billingClient?.rfc || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Stand">{order.stand?.code || '—'}</Descriptions.Item>
          <Descriptions.Item label="Lista de Precios">{order.priceList?.name}</Descriptions.Item>
          <Descriptions.Item label="Fecha Hora Inicio">
            {order.startDate ? new Date(order.startDate).toLocaleString('es-MX') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha Hora Fin">
            {order.endDate ? new Date(order.endDate).toLocaleString('es-MX') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Pagado">
            ${Number(order.paidAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
          <Descriptions.Item label="Saldo">
            ${(Number(order.total) - Number(order.paidAmount)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Title level={5} style={{ margin: 0 }}>Productos y Servicios</Title>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => exportToCsv(`orden-${order.orderNumber}-partidas`, (order.lineItems ?? []).map((li: any) => ({
              descripcion: li.description,
              precioUnit: Number(li.unitPrice).toFixed(2),
              cantidad: Number(li.quantity),
              descuento: `${li.discountPct}%`,
              total: Number(li.lineTotal).toFixed(2),
            })), [
              { header: 'Descripción', key: 'descripcion' },
              { header: 'Precio Unit.', key: 'precioUnit' },
              { header: 'Cantidad', key: 'cantidad' },
              { header: 'Descuento', key: 'descuento' },
              { header: 'Total', key: 'total' },
            ])}
          >
            Exportar CSV
          </Button>
        </div>
        <Table
          dataSource={order.lineItems}
          columns={lineColumns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          style={{ marginBottom: 24 }}
          expandable={{
            expandedRowRender: (r: any) => {
              if (!r.resource?.isPackage || !r.resource?.packageComponents?.length) return null

              const substitutionSelections = getSubstitutionSelections(r.observations)

              return (
                <div style={{ padding: '12px 0' }}>
                  <strong style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>📦 Componentes requeridos × {Number(r.quantity).toFixed(3)}</strong>
                  <Table
                    dataSource={r.resource.packageComponents}
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
                        render: (_: any, comp: any) => (
                          <span>
                            {comp.componentResource.name}
                            {comp.componentResource.isSubstitute && (
                              <span style={{ marginLeft: '8px', color: '#1890ff', fontSize: '12px', fontWeight: 'bold' }}>
                                (Sustitución)
                              </span>
                            )}
                          </span>
                        ),
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

                          // Look up by the substitution package's name (the key in selections dict)
                          const selectedValue = substitutionSelections[comp.componentResource.name]
                          if (selectedValue) {
                            return <Tag color="green">✓ {selectedValue}</Tag>
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
        />

        <Title level={5}>Pagos ({order.payments?.length ?? 0})</Title>
        <Table
          dataSource={order.payments}
          columns={paymentColumns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          style={{ marginBottom: 24 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Title level={5} style={{ margin: 0 }}>Documentos ({order.documents?.length ?? 0})</Title>
          <Upload beforeUpload={handleDocUpload} showUploadList={false}>
            <Button size="small" icon={<UploadOutlined />} loading={docUploading}>Subir</Button>
          </Upload>
        </div>
        {(order.documents ?? []).length > 0 && (
          <List
            size="small"
            dataSource={order.documents}
            style={{ marginBottom: 24 }}
            renderItem={(doc: any) => (
              <List.Item
                actions={[
                  doc.blobKey && (
                    <Button key="dl" size="small" icon={<DownloadOutlined />} href={doc.blobKey.startsWith('http') ? doc.blobKey : `${import.meta.env.VITE_API_URL || ''}/api/v1/templates/download/${doc.blobKey}`} target="_blank" rel="noopener noreferrer" />
                  ),
                  <Popconfirm key="del" title="¿Eliminar documento?" onConfirm={() => deleteDocMutation.mutate(doc.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} loading={deleteDocMutation.isPending} />
                  </Popconfirm>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<Avatar size="small" icon={<FileOutlined />} />}
                  title={doc.fileName}
                  description={<Text type="secondary" style={{ fontSize: 12 }}>{doc.documentType}</Text>}
                />
              </List.Item>
            )}
          />
        )}
        {(order.documents ?? []).length === 0 && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Sin documentos adjuntos</Text>
        )}

        <Title level={5}>Historial de Estatus</Title>
        <Timeline
          items={order.statusHistory?.map((h: any) => ({
            color: STATUS_COLORS[h.toStatus] || 'blue',
            children: (
              <div>
                <Text strong>{STATUS_LABELS[h.toStatus]}</Text>
                {h.fromStatus && <Text type="secondary"> (desde {STATUS_LABELS[h.fromStatus]})</Text>}
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {h.changedBy?.firstName} {h.changedBy?.lastName} — {dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}
                </Text>
                {h.notes && <div><Text type="secondary" style={{ fontSize: 12 }}>{h.notes}</Text></div>}
              </div>
            ),
          }))}
        />
      </Card>

      <Card title="Auditoría" style={{ marginBottom: 24 }}>
        <AuditTimeline data={auditData?.data ?? []} loading={auditLoading} />
      </Card>

      <Modal
        title="Registrar Pago"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={paymentMutation.isPending}
      >
        <Form form={paymentForm} layout="vertical" onFinish={paymentMutation.mutate}>
          <Form.Item name="method" label="Método de Pago" rules={[{ required: true }]}>
            <Select options={[
              { value: 'CASH', label: 'Efectivo' },
              { value: 'TRANSFER', label: 'Transferencia' },
              { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
              { value: 'CHECK', label: 'Cheque' },
              { value: 'SWIFT', label: 'Swift' },
            ]} />
          </Form.Item>
          <Form.Item name="amount" label="Monto" rules={[{ required: true }]}>
            <InputNumber
              prefix="$"
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              min={0}
            />
          </Form.Item>
          <Form.Item name="paymentDate" label="Fecha" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="reference" label="Referencia">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <CreatePurchaseOrderModal
        order={order}
        open={createPOModalOpen}
        onClose={() => setCreatePOModalOpen(false)}
      />

      <Modal
        title="Editar Orden de Servicio"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => canEditActual ? actualValuesMutation.mutate() : editForm.submit()}
        confirmLoading={updateMutation.isPending || actualValuesMutation.isPending}
        width={1000}
        okText={canEditActual ? 'Guardar Valores Reales' : 'Guardar'}
      >
        <Form form={editForm} layout="vertical" onFinish={updateMutation.mutate} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}>
          {canEdit && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="clientId" label="Cliente" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
                    options={(clientsData?.data ?? []).map((c: any) => ({
                      value: c.id,
                      label: c.companyName || `${c.firstName} ${c.lastName}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="billingClientId" label="Cliente Facturación">
                  <Select
                    allowClear
                    showSearch
                    filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
                    options={(clientsData?.data ?? []).map((c: any) => ({
                      value: c.id,
                      label: c.companyName || `${c.firstName} ${c.lastName}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="startDate" label="Fecha Hora Inicio">
                  <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="endDate" label="Fecha Hora Fin">
                  <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="notes" label="Notas">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {canEdit && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text strong>Agregar recurso de la lista de precios:</Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Seleccionar recurso..."
                  showSearch
                  options={editPriceListItems.filter((i: any) => i.isActive !== false).map((i: any) => ({
                    value: i.resourceId,
                    label: `${i.resource?.isPackage ? '📦 ' : ''}${i.resource?.name ?? ''} — $${Number(i.normalPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                  }))}
                  onChange={addEditLineItem}
                  value={null}
                  filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </div>
            </Card>
          )}

          {canEditActual ? (
            <Tabs defaultActiveKey="requested" items={[
              {
                key: 'requested',
                label: 'Valores Solicitados',
                children: (
                  <Table
                    dataSource={editLineItems}
                    rowKey="resourceId"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      {
                        title: 'Descripción', dataIndex: 'description', key: 'desc', width: 180,
                        render: (text: string, record: any) => (
                          <span>{record.isPackage && '📦 '}{text}</span>
                        ),
                      },
                      {
                        title: 'P. Unitario', dataIndex: 'normalPrice', width: 110,
                        render: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—',
                      },
                      { title: 'Cantidad', dataIndex: 'quantity', width: 90, render: (v: number) => Number(v) },
                      { title: 'Desc. %', dataIndex: 'discountPct', width: 80, render: (v: number) => `${v}%` },
                      {
                        title: 'Total', dataIndex: 'lineTotal', width: 120,
                        render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                      },
                      { title: 'Observaciones', dataIndex: 'observations', width: 160 },
                    ]}
                    footer={() => {
                      const subtotal = editLineItems.reduce((sum, li) => sum + Number(li.lineTotal), 0)
                      const tax = subtotal * 0.16
                      return (
                        <Row justify="end" gutter={16}>
                          <Col><Statistic title="Subtotal" value={`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                          <Col><Statistic title="IVA 16%" value={`$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                          <Col><Statistic title="Total" valueStyle={{ color: '#6B46C1', fontWeight: 'bold' }} value={`$${(subtotal + tax).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                        </Row>
                      )
                    }}
                  />
                ),
              },
              {
                key: 'actual',
                label: '✓ Valores Reales',
                children: (
                  <div style={{ backgroundColor: '#f0f5ff', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                    <Table
                      dataSource={editLineItems}
                      rowKey="resourceId"
                      size="small"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        {
                          title: 'Descripción', dataIndex: 'description', key: 'desc', width: 180,
                          render: (text: string, record: any) => (
                            <span>{record.isPackage && '📦 '}{text}</span>
                          ),
                        },
                        {
                          title: 'P. Unitario', dataIndex: 'normalPrice', width: 110,
                          render: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—',
                        },
                        {
                          title: '✓ Cantidad Real', dataIndex: 'actualQuantity', key: 'aqty', width: 110,
                          render: (v: number, r: any) => (
                            <InputNumber min={0.001} value={v} onChange={val => updateEditLineItem(r.resourceId, 'actualQuantity', val)} style={{ width: 90, fontWeight: 500 }} size="small" />
                          ),
                          onCell: () => ({ style: { backgroundColor: '#e6f4ff', fontWeight: 500 } })
                        },
                        {
                          title: '✓ Desc. Real %', dataIndex: 'actualDiscountPct', key: 'adisc', width: 110,
                          render: (v: number, r: any) => (
                            <InputNumber min={0} max={100} value={v} onChange={val => updateEditLineItem(r.resourceId, 'actualDiscountPct', val)} style={{ width: 90, fontWeight: 500 }} size="small" />
                          ),
                          onCell: () => ({ style: { backgroundColor: '#e6f4ff', fontWeight: 500 } })
                        },
                        {
                          title: '✓ Total Real', dataIndex: 'actualLineTotal', key: 'atotal', width: 120,
                          render: (v: number) => <span style={{ fontWeight: 500, color: '#0050b3' }}>${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>,
                          onCell: () => ({ style: { backgroundColor: '#e6f4ff', fontWeight: 500 } })
                        },
                        {
                          title: '✓ Obs. Real', dataIndex: 'actualObservations', key: 'aobs', width: 160,
                          render: (v: string, r: any) => (
                            <Input value={v} onChange={e => updateEditLineItem(r.resourceId, 'actualObservations', e.target.value)} size="small" style={{ fontWeight: 500 }} />
                          ),
                          onCell: () => ({ style: { backgroundColor: '#e6f4ff', fontWeight: 500 } })
                        },
                      ]}
                      footer={() => {
                        const subtotal = editLineItems.reduce((sum, li) => sum + Number(li.actualLineTotal || 0), 0)
                        const tax = subtotal * 0.16
                        return (
                          <Row justify="end" gutter={16}>
                            <Col><Statistic title="Subtotal Real" value={`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                            <Col><Statistic title="IVA 16%" value={`$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                            <Col><Statistic title="Total Real" valueStyle={{ color: '#0050b3', fontWeight: 'bold' }} value={`$${(subtotal + tax).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                          </Row>
                        )
                      }}
                    />
                  </div>
                ),
              },
            ]} />
          ) : (
            <Table
              dataSource={editLineItems}
              rowKey="resourceId"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Descripción', dataIndex: 'description', key: 'desc', width: 180,
                  render: (text: string, record: any) => (
                    <span>
                      {record.isPackage && '📦 '}
                      {text}
                      {record.substitutionSelections && Object.keys(record.substitutionSelections).length > 0 && (
                        <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>Sustituciones</Tag>
                      )}
                    </span>
                  ),
                },
                {
                  title: 'P. Normal', dataIndex: 'normalPrice', width: 110,
                  render: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—',
                },
                {
                  title: 'Cantidad', dataIndex: 'quantity', key: 'qty', width: 90,
                  render: (v: number, r: any) => (
                    <InputNumber min={0.001} value={v} onChange={val => updateEditLineItem(r.resourceId, 'quantity', val)} style={{ width: 80 }} size="small" />
                  ),
                },
                {
                  title: 'Desc. %', dataIndex: 'discountPct', key: 'disc', width: 80,
                  render: (v: number, r: any) => (
                    <InputNumber min={0} max={100} value={v} onChange={val => updateEditLineItem(r.resourceId, 'discountPct', val)} style={{ width: 70 }} size="small" />
                  ),
                },
                {
                  title: 'Total', key: 'total', width: 120,
                  render: (_: any, r: any) => {
                    const total = (r.quantity || 0) * (r.normalPrice || 0) * (1 - (r.discountPct || 0) / 100)
                    return `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                  },
                },
                {
                  title: 'Observaciones', dataIndex: 'observations', key: 'obs', width: 160,
                  render: (v: string, r: any) => (
                    <Input value={v} onChange={e => updateEditLineItem(r.resourceId, 'observations', e.target.value)} size="small" />
                  ),
                },
                {
                  title: '', key: 'del', width: 48,
                  render: (_: any, r: any) => (
                    <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeEditLineItem(r.resourceId)} />
                  ),
                },
              ]}
              expandable={{
                expandedRowRender: (r: any) => {
                  if (!r.isPackage || !r.packageComponents?.length) return null
                  return (
                    <div style={{ padding: '12px 0' }}>
                      <strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>📦 Componentes requeridos × {Number(r.quantity).toFixed(3)}</strong>
                      <Table
                        dataSource={r.packageComponents}
                        rowKey="componentResourceId"
                        size="small"
                        pagination={false}
                        columns={[
                          { title: 'Código', key: 'code', width: 70, render: (_: any, comp: any) => comp.componentResource?.code },
                          { title: 'Nombre', key: 'name', render: (_: any, comp: any) => comp.componentResource?.name },
                          { title: 'Qty × Artículo', key: 'qtyPer', width: 110, align: 'right' as const, render: (_: any, comp: any) => Number(comp.quantity).toFixed(3) },
                          { title: 'Total Requerido', key: 'qtyTotal', width: 120, align: 'right' as const, render: (_: any, comp: any) => (Number(comp.quantity) * r.quantity).toFixed(3) },
                          { title: 'Unidad', key: 'unit', width: 80, render: (_: any, comp: any) => comp.componentResource?.unit || '—' },
                          {
                            title: 'Seleccionado', key: 'selected', width: 150,
                            render: (_: any, comp: any) => {
                              if (!comp.componentResource?.isSubstitute) return null
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
                    </div>
                  )
                },
              }}
              footer={() => {
                const subtotal = editLineItems.reduce((sum, li) => sum + (li.quantity * (li.normalPrice || 0) * (1 - (li.discountPct || 0) / 100)), 0)
                const tax = subtotal * 0.16
                return (
                  <Row justify="end" gutter={16}>
                    <Col><Statistic title="Subtotal" value={`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                    <Col><Statistic title="IVA 16%" value={`$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                    <Col><Statistic title="Total Est." valueStyle={{ color: '#6B46C1', fontWeight: 'bold' }} value={`$${(subtotal + tax).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} /></Col>
                  </Row>
                )
              }}
            />
          )}
        </Form>
      </Modal>

      <Modal
        title="Seleccionar componentes de sustitución"
        open={substitutionModalOpen}
        onCancel={() => { setSubstitutionModalOpen(false); setPendingItem(null) }}
        onOk={confirmSubstitutionSelections}
        confirmLoading={loadingSubstitutions}
        width={600}
      >
        {pendingItem && getNestedSubstitutionPackages(pendingItem.packageComponents).map((subPkg: any) => (
          <div key={subPkg.componentResourceId} style={{ marginBottom: 16 }}>
            <Text strong>{subPkg.componentResource?.name}:</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Seleccionar opción..."
              value={substitutionSelections[subPkg.componentResourceId] || undefined}
              onChange={val => setSubstitutionSelections(prev => ({ ...prev, [subPkg.componentResourceId]: val }))}
              options={(substitutionPackageDetails[subPkg.componentResourceId] || []).map((comp: any) => ({
                value: comp.componentResourceId,
                label: `${comp.componentResource?.code ?? ''} - ${comp.componentResource?.name ?? ''}`,
              }))}
            />
          </div>
        ))}
      </Modal>

      <GenerateDocumentModal
        open={generateDocOpen}
        onClose={() => setGenerateDocOpen(false)}
        context="ORDER"
        entityId={id!}
      />
    </div>
  )
}

