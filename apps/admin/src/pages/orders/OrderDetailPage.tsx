import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Descriptions, Table, Tag, Button, Space, Timeline, Form, Tabs,
  Input, InputNumber, Select, DatePicker, Modal, App, Typography, Row, Col,
  Statistic, Upload, List, Avatar, Popconfirm, Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined, DollarOutlined, FilePdfOutlined, DownloadOutlined,
  FileOutlined, UploadOutlined, DeleteOutlined, EditOutlined,
  ShoppingCartOutlined, WarningFilled, CheckCircleFilled,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'
import { clientsApi } from '../../api/clients'
import { priceListsApi } from '../../api/priceLists'
import { resourcesApi } from '../../api/resources'
import { auditApi } from '../../api/audit'
import { organizationsApi } from '../../api/organizations'
import { exportToCsv } from '../../utils/exportCsv'
import { OrderPdf } from '../../components/OrderPdf'
import AuditTimeline from '../../components/AuditTimeline'
import AuditDrawer from '../../components/AuditDrawer'
import CreatePurchaseOrderModal from '../../components/CreatePurchaseOrderModal'
import GenerateDocumentModal from '../../components/GenerateDocumentModal'
import { templatesApi } from '../../api/templates'
import { PageHeader, StatusTag } from '../../components/ui'
import { formatMoney } from '../../utils/format'

const { Title, Text } = Typography

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

function effectiveFactor(timeUnit: string | null | undefined, factor: number): number {
  return timeUnit?.endsWith('sin factor') ? 1 : factor
}

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', EXECUTED: 'geekblue',
  INVOICED: 'cyan', CANCELLED: 'red', CREDIT_NOTE: 'gold',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada',
  INVOICED: 'Facturada', CANCELLED: 'Cancelada', CREDIT_NOTE: 'Nota de Crédito',
}
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'default', IN_PAYMENT: 'orange', PAID: 'purple', IN_REVIEW: 'gold',
}
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', IN_PAYMENT: 'En Pago', PAID: 'Pagada', IN_REVIEW: 'En Revisión',
}
const TIER_LABELS: Record<string, string> = {
  EARLY: 'Anticipado', NORMAL: 'Normal', LATE: 'Tardío',
}
const NEXT_STATUSES: Record<string, string[]> = {
  QUOTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['EXECUTED', 'CANCELLED'],
  EXECUTED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
  CREDIT_NOTE: ['CONFIRMED', 'CANCELLED'],
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = App.useApp()
  const [paymentForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('general')
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
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false)
  const [creditNoteItems, setCreditNoteItems] = useState<any[]>([])
  const [creditNoteNotes, setCreditNoteNotes] = useState('')

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
    } catch {
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
      organizacionId: values.organizacionId || null,
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
          priceListItemId: li.priceListItemId,
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

  const creditNoteMutation = useMutation({
    mutationFn: () => ordersApi.create(order!.eventId, {
      clientId: order!.clientId,
      billingClientId: order!.billingClientId || undefined,
      standId: order!.standId || undefined,
      priceListId: order!.priceListId,
      startDate: order!.startDate || undefined,
      endDate: order!.endDate || undefined,
      notes: creditNoteNotes || `Nota de crédito de ${order!.orderNumber}`,
      isCreditNote: true,
      originalOrderId: order!.id,
      lineItems: creditNoteItems.map((li: any, idx: number) => ({
        resourceId: li.resourceId,
        quantity: li.quantity,
        discountPct: li.discountPct ?? 0,
        observations: li.observations || '',
        sortOrder: idx,
      })),
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      setCreditNoteModalOpen(false)
      message.success('Nota de crédito creada')
      navigate(`/ordenes/${res.data.id}`)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear nota de crédito')
    },
  })

  function openCreditNoteModal() {
    setCreditNoteItems(
      (order!.lineItems ?? []).map((li: any) => ({
        resourceId: li.resourceId,
        description: li.resource?.name || li.description,
        unitPrice: Number(li.unitPrice),
        quantity: -Math.abs(Number(li.actualQuantity ?? li.quantity)),
        discountPct: Number(li.actualDiscountPct ?? li.discountPct),
        observations: '',
      }))
    )
    setCreditNoteNotes('')
    setCreditNoteModalOpen(true)
  }

  function updateCreditNoteItem(index: number, field: string, value: any) {
    setCreditNoteItems(prev => prev.map((li, i) => i === index ? { ...li, [field]: value } : li))
  }

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

  const { data: orgData } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
    enabled: editModalOpen,
  })

  if (isLoading) return <Card loading />
  if (!order) return null

  const canEdit = order.status === 'QUOTED' && Number(order.paidAmount) === 0
  const canEditActual = order.status === 'CONFIRMED'
  const isConfirmedOrLater = ['CONFIRMED', 'EXECUTED', 'INVOICED'].includes(order.status)
  const canPay = (order.status === 'CONFIRMED' && !order.contractId) || (order.status === 'EXECUTED' && Number(order.paidAmount) < Number(order.total))

  const editPriceListItems = priceListData?.data?.items ?? priceListData?.items ?? []

  function openEditModal() {
    editForm.setFieldsValue({
      clientId: order.clientId,
      billingClientId: order.billingClientId || undefined,
      standId: order.standId || undefined,
      startDate: order.startDate ? dayjs(order.startDate) : null,
      endDate: order.endDate ? dayjs(order.endDate) : null,
      notes: order.notes || '',
      organizacionId: order.organizacionId || undefined,
    })
    setEditLineItems(
      (order.lineItems ?? []).map((li: any) => ({
        instanceId: li.id,
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
        timeUnit: li.timeUnit ?? null,
        detail: li.detail ?? '',
        factor: Number(li.resource?.factor ?? 1),
        unit: li.resource?.unit ?? '',
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

  async function addEditLineItem(itemId: string) {
    const item = editPriceListItems.find((i: any) => i.id === itemId)
    if (!item) return
    if (item.resource?.checkDuplicate !== false && editLineItems.find(li => li.resourceId === item.resourceId)) {
      message.warning('Este recurso no permite repetición en la Orden de Servicio')
      return
    }
    const newItem = {
      instanceId: `${item.resourceId}-${Date.now()}-${Math.random()}`,
      resourceId: item.resourceId,
      priceListItemId: item.id,
      description: item.resource.name,
      resourceCode: item.resource.code || '',
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
    setEditLineItems(prev => [...prev, { ...pendingItem, instanceId: `${pendingItem.resourceId}-${Date.now()}-${Math.random()}`, substitutionSelections }])
    setSubstitutionModalOpen(false)
    setPendingItem(null)
    message.success('Artículo agregado con selecciones de sustitución')
  }

  function updateEditLineItem(instanceId: string, field: string, value: any) {
    setEditLineItems(prev => prev.map(li => {
      if (li.instanceId !== instanceId) return li
      const updated = { ...li, [field]: value }
      if (field === 'actualQuantity' || field === 'actualDiscountPct') {
        const qty = field === 'actualQuantity' ? (value ?? li.actualQuantity) : li.actualQuantity
        const disc = field === 'actualDiscountPct' ? (value ?? li.actualDiscountPct) : li.actualDiscountPct
        const tuv = calcTimeUnitValue(li.timeUnit, order?.startDate, order?.endDate)
        updated.actualLineTotal = qty * (li.unitPrice || li.normalPrice || 0) * tuv * effectiveFactor(li.timeUnit, li.factor ?? 1) * (1 - (disc || 0) / 100)
      }
      return updated
    }))
  }

  function removeEditLineItem(instanceId: string) {
    setEditLineItems(prev => prev.filter(li => li.instanceId !== instanceId))
  }

  const lineColumns = [
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      render: (text: string, record: any) => {
        const res = record.resource
        const needsStockCheck = res?.checkStock
        const qty = Number(record.quantity)
        const stock = Number(res?.stock ?? 0)
        const stockOk = qty <= stock
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {res?.isPackage && <span>📦</span>}
            <span>{text}</span>
            {needsStockCheck && (
              <Tooltip title={stockOk ? `Stock OK (${stock} disponibles)` : `Stock insuficiente (${stock} disponibles, ${qty} requeridos)`}>
                {stockOk
                  ? <CheckCircleFilled style={{ color: '#16a34a', fontSize: 13 }} />
                  : <WarningFilled style={{ color: '#f59e0b', fontSize: 13 }} />
                }
              </Tooltip>
            )}
          </div>
        )
      },
    },
    { title: 'Unidad', key: 'unit', render: (_: any, record: any) => record.resource?.unit ?? '—' },
    { title: 'Detalle', key: 'detail', render: (_: any, record: any) => record.detail || '—' },
    { title: 'Ud. Tiempo', key: 'timeUnit', render: (_: any, record: any) => record.timeUnit || 'no aplica' },
    { title: 'Factor', key: 'factor', render: (_: any, record: any) => record.resource?.factor != null ? Number(record.resource.factor) : 1 },
    { title: '× Tiempo', key: 'timeUnitValue', render: (_: any, record: any) => calcTimeUnitValue(record.timeUnit, order.startDate, order.endDate) },
    { title: 'Precio Unit.', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Cantidad', dataIndex: 'quantity', key: 'quantity', render: (v: number) => Number(v) },
    { title: 'Descuento', dataIndex: 'discountPct', key: 'discountPct', render: (v: number) => `${v}%` },
    {
      title: 'Total', key: 'lineTotal',
      render: (_: any, record: any) => {
        const tuv = calcTimeUnitValue(record.timeUnit, order.startDate, order.endDate)
        const total = Number(record.unitPrice) * Number(record.quantity) * tuv * effectiveFactor(record.timeUnit, Number(record.resource?.factor ?? 1)) * (1 - Number(record.discountPct) / 100)
        return `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      },
    },
    { title: 'Observaciones', dataIndex: 'observations', key: 'observations' },
    { title: 'F. Entrega', dataIndex: 'deliveryDate', key: 'deliveryDate', render: (v: any) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
    ...(isConfirmedOrLater ? [
      { title: '✓ Cant. Real', dataIndex: 'actualQuantity', key: 'actualQuantity', render: (v: any) => <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: 3, fontWeight: 500, color: '#0050b3' }}>{v != null ? Number(v) : '—'}</span>, onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }) },
      { title: '✓ Desc. Real', dataIndex: 'actualDiscountPct', key: 'actualDiscountPct', render: (v: any) => <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: 3, fontWeight: 500, color: '#0050b3' }}>{v != null ? `${v}%` : '—'}</span>, onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }) },
      {
        title: '✓ Total Real', key: 'actualLineTotal',
        render: (_: any, record: any) => {
          const tuv = calcTimeUnitValue(record.timeUnit, order.startDate, order.endDate)
          const total = record.actualQuantity != null
            ? Number(record.unitPrice) * Number(record.actualQuantity) * tuv * effectiveFactor(record.timeUnit, Number(record.resource?.factor ?? 1)) * (1 - Number(record.actualDiscountPct ?? record.discountPct) / 100)
            : null
          return <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: 3, fontWeight: 500, color: '#0050b3' }}>{total != null ? `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}</span>
        },
        onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }),
      },
      { title: '✓ Obs. Real', dataIndex: 'actualObservations', key: 'actualObservations', render: (v: any) => <span style={{ backgroundColor: '#e6f4ff', padding: '2px 6px', borderRadius: 3, fontWeight: 500, color: '#0050b3' }}>{v ?? '—'}</span>, onCell: () => ({ style: { backgroundColor: '#f0f5ff' } }) },
    ] : []),
  ]

  const paymentColumns = [
    { title: 'Fecha', dataIndex: 'paymentDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Método', dataIndex: 'method' },
    { title: 'Monto', dataIndex: 'amount', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Referencia', dataIndex: 'reference' },
  ]

  const clientName = order.client?.companyName || `${order.client?.firstName} ${order.client?.lastName}`
  const saldo = Number(order.total) - Number(order.paidAmount)

  // ───── RENDER ─────
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Page header */}
      <PageHeader
        title={
          <div>
            {/* Row 1: back button + order number (never wraps) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{ flexShrink: 0 }}
              />
              <span style={{ fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap' }}>
                {order.orderNumber}
              </span>
            </div>
            {/* Row 2: status tags — wrap freely */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Tag color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Tag>
              <Tag color={PAYMENT_STATUS_COLORS[order.paymentStatus]}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus] || 'Pendiente'}
              </Tag>
              <Tag>{TIER_LABELS[order.pricingTier]}</Tag>
              {order.isCreditNote && <Tag color="red">Nota de Crédito</Tag>}
            </div>
          </div>
        }
        meta={
          <span>
            Evento <strong>{order.event?.name ?? '—'}</strong>
            {' · '}Cliente <strong>{clientName}</strong>
            {order.endDate && <> · Entrega <strong>{dayjs(order.endDate).format('DD/MM/YYYY')}</strong></>}
          </span>
        }
        actions={
          <>
            <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={downloadPdf}>
              PDF
            </Button>
            <Button icon={<FileOutlined />} onClick={() => setGenerateDocOpen(true)}>
              Word
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
            {canPay && (
              <Button icon={<DollarOutlined />} onClick={() => setPaymentModalOpen(true)}>
                Registrar Pago
              </Button>
            )}
            {order.status === 'CONFIRMED' && (
              <Button type="primary" onClick={() => setCreatePOModalOpen(true)}>
                Crear Orden de Compra
              </Button>
            )}
            {order.status === 'EXECUTED' && !order.isCreditNote && (
              <Button danger onClick={openCreditNoteModal}>
                Crear Nota de Crédito
              </Button>
            )}
          </>
        }
        tabs={
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            style={{ marginBottom: -1 }}
            items={[
              { key: 'general', label: 'General' },
              { key: 'items', label: `Items (${order.lineItems?.length ?? 0})` },
              { key: 'financiero', label: 'Financiero' },
              { key: 'documentos', label: `Documentos (${order.documents?.length ?? 0})` },
              { key: 'oc', label: `Órdenes de Compra (${order.purchaseOrders?.length ?? 0})` },
              { key: 'historial', label: 'Historial' },
            ]}
          />
        }
      />

      {/* Content */}
      <div style={{ padding: 24 }}>
        {/* ── TAB: General ── */}
        {activeTab === 'general' && (() => {
          const lineItems: any[] = order.lineItems ?? []
          const depts = new Set(lineItems.map((li: any) => li.resource?.department?.name).filter(Boolean))
          const suppliers = new Set((order.purchaseOrders ?? []).map((po: any) => po.supplier?.id).filter(Boolean))
          const ocCount = order.purchaseOrders?.length ?? 0
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
              {/* Mini-stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Items', value: lineItems.length },
                  { label: 'Deptos.', value: depts.size },
                  { label: 'Proveedores', value: suppliers.size },
                  { label: 'OC asociadas', value: ocCount },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#6B46C1', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Event info */}
              <Card size="small" title="Evento">
                <Descriptions column={1} size="small" colon={false}>
                  <Descriptions.Item label="Nombre">{order.event?.name ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Lista de precios">{order.priceList?.name ?? '—'}</Descriptions.Item>
                  {order.stand && <Descriptions.Item label="Stand">{order.stand.code}</Descriptions.Item>}
                  {order.organizacion && <Descriptions.Item label="Org.">{order.organizacion.descripcion}</Descriptions.Item>}
                  {order.startDate && (
                    <Descriptions.Item label="Inicio">
                      {dayjs(order.startDate).format('DD/MM/YYYY HH:mm')}
                    </Descriptions.Item>
                  )}
                  {order.endDate && (
                    <Descriptions.Item label="Fin">
                      {dayjs(order.endDate).format('DD/MM/YYYY HH:mm')}
                    </Descriptions.Item>
                  )}
                </Descriptions>
                {order.event?.id && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, marginTop: 4 }}
                    onClick={() => navigate(`/eventos/${order.event.id}`)}
                  >
                    Ver evento completo →
                  </Button>
                )}
              </Card>

              {/* Client */}
              <Card size="small" title="Cliente">
                <Text strong>{clientName}</Text>
                {order.billingClient && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Facturación: </Text>
                    <Text style={{ fontSize: 12 }}>{order.billingClient.companyName || order.billingClient.rfc}</Text>
                  </div>
                )}
              </Card>

              {/* Notes */}
              {order.notes && (
                <Card size="small" title="Notas internas">
                  <Text type="secondary" style={{ fontSize: 13 }}>{order.notes}</Text>
                </Card>
              )}

              {/* Credit note links */}
              {(order.originalOrder || order.creditNotes?.length > 0) && (
                <Card size="small" title="Referencias">
                  {order.originalOrder && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Orden original: </Text>
                      <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => navigate(`/ordenes/${order.originalOrder.id}`)}>
                        {order.originalOrder.orderNumber}
                      </Button>
                    </div>
                  )}
                  {order.creditNotes?.map((cn: any) => (
                    <div key={cn.id}>
                      <Text type="secondary" style={{ fontSize: 12 }}>NC: </Text>
                      <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => navigate(`/ordenes/${cn.id}`)}>
                        {cn.orderNumber} ({formatMoney(Number(cn.total), 'MXN')})
                      </Button>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )
        })()}

        {/* ── TAB: Items ── */}
        {activeTab === 'items' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Financial summary strip ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: '#e9d5ff', borderRadius: 8, overflow: 'hidden', border: '1px solid #d8b4fe' }}>
            {[
              { label: 'Subtotal', value: formatMoney(Number(order.subtotal), 'MXN') },
              { label: `Descuento (${Number(order.discountPct)}%)`, value: formatMoney(Number(order.discountAmount), 'MXN') },
              { label: `IVA (${Number(order.taxPct)}%)`, value: formatMoney(Number(order.taxAmount), 'MXN') },
              { label: 'Total', value: formatMoney(Number(order.total), 'MXN'), accent: true },
              { label: 'Pagado', value: formatMoney(Number(order.paidAmount), 'MXN'), green: true },
              { label: 'Saldo', value: formatMoney(saldo, 'MXN'), warn: saldo > 0 },
            ].map(({ label, value, accent, green, warn }) => (
              <div key={label} style={{ background: '#fff', padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: accent ? 700 : 600, fontVariantNumeric: 'tabular-nums', color: accent ? '#6B46C1' : green ? '#16a34a' : warn ? '#f59e0b' : '#111827' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div>
            {/* Items grouped by department */}
            <div>
              {(() => {
                const lineItems: any[] = order.lineItems ?? []
                const groups: Record<string, any[]> = {}
                lineItems.forEach((li: any) => {
                  const dept = li.resource?.department?.name ?? 'Sin Departamento'
                  if (!groups[dept]) groups[dept] = []
                  groups[dept].push(li)
                })
                const groupEntries = Object.entries(groups)
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Space>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Productos y Servicios</span>
                        <Tag>{lineItems.length} partidas</Tag>
                        <Tag color="purple">{groupEntries.length} depto{groupEntries.length !== 1 ? 's' : ''}</Tag>
                      </Space>
                      <Button
                        icon={<DownloadOutlined />}
                        size="small"
                        onClick={() => exportToCsv(
                          `orden-${order.orderNumber}-partidas`,
                          lineItems.map((li: any) => ({
                            descripcion: li.description,
                            precioUnit: Number(li.unitPrice).toFixed(2),
                            cantidad: Number(li.quantity),
                            descuento: `${li.discountPct}%`,
                            total: Number(li.lineTotal).toFixed(2),
                          })),
                          [
                            { header: 'Descripción', key: 'descripcion' },
                            { header: 'Precio Unit.', key: 'precioUnit' },
                            { header: 'Cantidad', key: 'cantidad' },
                            { header: 'Descuento', key: 'descuento' },
                            { header: 'Total', key: 'total' },
                          ]
                        )}
                      >
                        CSV
                      </Button>
                    </div>
                    {groupEntries.map(([dept, items]) => (
                      <Card
                        key={dept}
                        size="small"
                        headStyle={{ background: '#f4eeff', borderBottom: '1px solid #e9d5ff', padding: '6px 12px' }}
                        title={
                          <Space>
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#6B46C1' }}>{dept}</span>
                            <Tag color="purple" style={{ fontSize: 11 }}>{items.length}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatMoney(items.reduce((s: number, li: any) => s + Number(li.lineTotal), 0), 'MXN')}
                            </Text>
                          </Space>
                        }
                        styles={{ body: { padding: 0 } }}
                      >
                        <Table
                          dataSource={items}
                          columns={lineColumns}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          scroll={{ x: 'max-content' }}
                          expandable={{
                            expandedRowRender: (r: any) => {
                      if (!r.resource?.isPackage || !r.resource?.packageComponents?.length) return null
                      const subs = getSubstitutionSelections(r.observations)
                      return (
                        <div style={{ padding: '12px 0' }}>
                          <strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                            📦 Componentes requeridos × {Number(r.quantity).toFixed(3)}
                          </strong>
                          <Table
                            dataSource={r.resource.packageComponents}
                            rowKey="componentResourceId"
                            size="small"
                            pagination={false}
                            columns={[
                              { title: 'Código', key: 'code', width: 70, render: (_: any, comp: any) => comp.componentResource.code },
                              {
                                title: 'Nombre', key: 'name',
                                render: (_: any, comp: any) => (
                                  <span>
                                    {comp.componentResource.name}
                                    {comp.componentResource.isSubstitute && <span style={{ marginLeft: 8, color: '#1890ff', fontSize: 12, fontWeight: 'bold' }}>(Sustitución)</span>}
                                  </span>
                                ),
                              },
                              { title: 'Qty × Artículo', key: 'qtyPer', width: 110, align: 'right' as const, render: (_: any, comp: any) => Number(comp.quantity).toFixed(3) },
                              { title: 'Total Requerido', key: 'qtyTotal', width: 120, align: 'right' as const, render: (_: any, comp: any) => (Number(comp.quantity) * r.quantity).toFixed(3) },
                              { title: 'Unidad', key: 'unit', width: 80, render: (_: any, comp: any) => comp.componentResource.unit || '—' },
                              {
                                title: 'Seleccionado', key: 'selected', width: 150,
                                render: (_: any, comp: any) => {
                                  if (!comp.componentResource.isSubstitute) return null
                                  const val = subs[comp.componentResource.name]
                                  return val ? <Tag color="green">✓ {val}</Tag> : <span style={{ color: '#999' }}>—</span>
                                },
                              },
                            ]}
                          />
                        </div>
                      )
                    },
                  }}
                />
                      </Card>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
          </div>
        )}

        {/* ── TAB: Financiero ── */}
        {activeTab === 'financiero' && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={6}><Statistic title="Subtotal" prefix="$" value={Number(order.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
              <Col xs={12} sm={6}><Statistic title="Descuento" prefix="$" value={Number(order.discountAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
              <Col xs={12} sm={6}><Statistic title="IVA" prefix="$" value={Number(order.taxAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
              <Col xs={12} sm={6}><Statistic title="Total" prefix="$" valueStyle={{ color: '#6B46C1', fontWeight: 'bold' }} value={Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
            </Row>
            <Card
              title={`Pagos (${order.payments?.length ?? 0})`}
              extra={
                canPay && (
                  <Button icon={<DollarOutlined />} size="small" onClick={() => setPaymentModalOpen(true)}>
                    Registrar Pago
                  </Button>
                )
              }
            >
              <Table
                dataSource={order.payments}
                columns={paymentColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </div>
        )}

        {/* ── TAB: Documentos ── */}
        {activeTab === 'documentos' && (
          <Card
            title={`Documentos (${order.documents?.length ?? 0})`}
            extra={
              <Upload beforeUpload={handleDocUpload} showUploadList={false}>
                <Button size="small" icon={<UploadOutlined />} loading={docUploading}>Subir</Button>
              </Upload>
            }
          >
            {(order.documents ?? []).length > 0 ? (
              <List
                size="small"
                dataSource={order.documents}
                renderItem={(doc: any) => (
                  <List.Item
                    actions={[
                      doc.blobKey && (
                        <Button key="dl" size="small" icon={<DownloadOutlined />} onClick={() => doc.blobKey.startsWith('http') ? window.open(doc.blobKey, '_blank') : templatesApi.download(doc.blobKey, doc.fileName)} />
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
            ) : (
              <Text type="secondary">Sin documentos adjuntos</Text>
            )}
          </Card>
        )}

        {/* ── TAB: Órdenes de Compra ── */}
        {activeTab === 'oc' && (
          <Card
            title={
              <Space>
                <ShoppingCartOutlined />
                <span>Órdenes de Compra</span>
                <Tag>{order.purchaseOrders?.length ?? 0}</Tag>
              </Space>
            }
            extra={
              order.status === 'CONFIRMED' && (
                <Button size="small" type="primary" onClick={() => setCreatePOModalOpen(true)}>
                  Nueva OC
                </Button>
              )
            }
            styles={{ body: { padding: 0 } }}
          >
            {(order.purchaseOrders ?? []).length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                Sin órdenes de compra asociadas a esta orden de servicio.
              </div>
            ) : (
              <Table
                dataSource={order.purchaseOrders}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Número',
                    dataIndex: 'orderNumber',
                    render: (v: string, r: any) => (
                      <Button type="link" style={{ padding: 0, color: '#6B46C1', fontWeight: 600 }} onClick={() => navigate(`/catalogos/ordenes-compra/${r.id}`)}>
                        {v}
                      </Button>
                    ),
                  },
                  {
                    title: 'Proveedor',
                    key: 'supplier',
                    render: (_: any, r: any) => r.supplier?.name ?? '—',
                  },
                  {
                    title: 'Estado',
                    dataIndex: 'status',
                    render: (v: string) => <Tag>{v}</Tag>,
                  },
                  {
                    title: 'Total',
                    dataIndex: 'total',
                    align: 'right' as const,
                    render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(Number(v), 'MXN')}</Text>,
                  },
                ]}
              />
            )}
          </Card>
        )}

        {/* ── TAB: Historial ── */}
        {activeTab === 'historial' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Historial de Estado">
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
            <Card title="Auditoría">
              <AuditTimeline data={auditData?.data ?? []} loading={auditLoading} />
            </Card>
          </div>
        )}
      </div>

      {/* ─── MODALS (sin cambios funcionales) ─── */}
      <Modal
        title="Registrar Pago"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={paymentMutation.isPending}
        forceRender
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
            <InputNumber prefix="$" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} min={0} />
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
        forceRender
      >
        <Form form={editForm} layout="vertical" onFinish={updateMutation.mutate} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}>
          {canEdit && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="clientId" label="Cliente" rules={[{ required: true }]}>
                  <Select showSearch filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())} options={(clientsData?.data ?? []).map((c: any) => ({ value: c.id, label: c.companyName || `${c.firstName} ${c.lastName}` }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="billingClientId" label="Cliente Facturación">
                  <Select allowClear showSearch filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())} options={(clientsData?.data ?? []).map((c: any) => ({ value: c.id, label: c.companyName || `${c.firstName} ${c.lastName}` }))} />
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
              <Col span={12}>
                <Form.Item name="organizacionId" label="Organización">
                  <Select allowClear showSearch placeholder="Seleccionar organización..." filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())} options={(orgData?.data ?? []).filter((o: any) => o.isActive).map((o: any) => ({ value: o.id, label: `${o.clave} — ${o.descripcion}` }))} />
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
                    value: i.id,
                    label: `${i.resource?.isPackage ? '📦 ' : ''}${i.resource?.name ?? ''}${i.detail ? ` · ${i.detail}` : ''} — $${Number(i.normalPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
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
                    rowKey="instanceId"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      { title: 'Descripción', dataIndex: 'description', key: 'desc', width: 180, render: (text: string, record: any) => <span>{record.isPackage && '📦 '}{text}</span> },
                      { title: 'P. Unitario', dataIndex: 'normalPrice', width: 110, render: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—' },
                      { title: 'Unidad', key: 'unit', width: 80, render: (_: any, r: any) => r.unit || '—' },
                      { title: 'Detalle', key: 'detail', width: 140, render: (_: any, r: any) => r.detail || '—' },
                      { title: 'Cantidad', dataIndex: 'quantity', width: 90, render: (v: number) => Number(v) },
                      { title: 'Desc. %', dataIndex: 'discountPct', width: 80, render: (v: number) => `${v}%` },
                      { title: 'Ud. Tiempo', key: 'tu', width: 90, render: (_: any, r: any) => r.timeUnit || 'no aplica' },
                      { title: 'Factor', key: 'factor', width: 70, render: (_: any, r: any) => r.factor ?? 1 },
                      { title: '× Tiempo', key: 'tuv', width: 80, render: (_: any, r: any) => calcTimeUnitValue(r.timeUnit, order?.startDate, order?.endDate) },
                      {
                        title: 'Total', key: 'total', width: 120,
                        render: (_: any, r: any) => {
                          const tuv = calcTimeUnitValue(r.timeUnit, order?.startDate, order?.endDate)
                          const total = Number(r.unitPrice || r.normalPrice || 0) * Number(r.quantity) * tuv * effectiveFactor(r.timeUnit, r.factor ?? 1) * (1 - (Number(r.discountPct) || 0) / 100)
                          return `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        },
                      },
                      { title: 'Observaciones', dataIndex: 'observations', width: 160 },
                    ]}
                    footer={() => {
                      const subtotal = editLineItems.reduce((sum, li) => {
                        const tuv = calcTimeUnitValue(li.timeUnit, order?.startDate, order?.endDate)
                        return sum + Number(li.unitPrice || li.normalPrice || 0) * Number(li.quantity) * tuv * effectiveFactor(li.timeUnit, li.factor ?? 1) * (1 - (Number(li.discountPct) || 0) / 100)
                      }, 0)
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
                  <div style={{ backgroundColor: '#f0f5ff', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                    <Table
                      dataSource={editLineItems}
                      rowKey="instanceId"
                      size="small"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        { title: 'Descripción', dataIndex: 'description', key: 'desc', width: 180, render: (text: string, record: any) => <span>{record.isPackage && '📦 '}{text}</span> },
                        { title: 'P. Unitario', dataIndex: 'normalPrice', width: 110, render: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—' },
                        { title: 'Unidad', key: 'unit', width: 80, render: (_: any, r: any) => r.unit || '—' },
                        { title: 'Detalle', key: 'detail', width: 140, render: (_: any, r: any) => r.detail || '—' },
                        { title: 'Ud. Tiempo', key: 'tu', width: 90, render: (_: any, r: any) => r.timeUnit || 'no aplica' },
                        { title: 'Factor', key: 'factor', width: 70, render: (_: any, r: any) => r.factor ?? 1 },
                        { title: '× Tiempo', key: 'tuv', width: 80, render: (_: any, r: any) => calcTimeUnitValue(r.timeUnit, order?.startDate, order?.endDate) },
                        {
                          title: '✓ Cantidad Real', dataIndex: 'actualQuantity', key: 'aqty', width: 110,
                          render: (v: number, r: any) => <InputNumber min={0.001} value={v} onChange={val => updateEditLineItem(r.instanceId, 'actualQuantity', val)} style={{ width: 90, fontWeight: 500 }} size="small" />,
                          onCell: () => ({ style: { backgroundColor: '#e6f4ff', fontWeight: 500 } })
                        },
                        {
                          title: '✓ Desc. Real %', dataIndex: 'actualDiscountPct', key: 'adisc', width: 110,
                          render: (v: number, r: any) => <InputNumber min={0} max={100} value={v} onChange={val => updateEditLineItem(r.instanceId, 'actualDiscountPct', val)} style={{ width: 90, fontWeight: 500 }} size="small" />,
                          onCell: () => ({ style: { backgroundColor: '#e6f4ff', fontWeight: 500 } })
                        },
                        {
                          title: '✓ Total Real', dataIndex: 'actualLineTotal', key: 'atotal', width: 120,
                          render: (v: number) => <span style={{ fontWeight: 500, color: '#0050b3' }}>${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>,
                          onCell: () => ({ style: { backgroundColor: '#e6f4ff', fontWeight: 500 } })
                        },
                        {
                          title: '✓ Obs. Real', dataIndex: 'actualObservations', key: 'aobs', width: 160,
                          render: (v: string, r: any) => <Input value={v} onChange={e => updateEditLineItem(r.instanceId, 'actualObservations', e.target.value)} size="small" style={{ fontWeight: 500 }} />,
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
              rowKey="instanceId"
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
                { title: 'P. Normal', dataIndex: 'normalPrice', width: 110, render: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—' },
                { title: 'Cantidad', dataIndex: 'quantity', key: 'qty', width: 90, render: (v: number, r: any) => <InputNumber min={0.001} value={v} onChange={val => updateEditLineItem(r.instanceId, 'quantity', val)} style={{ width: 80 }} size="small" /> },
                { title: 'Desc. %', dataIndex: 'discountPct', key: 'disc', width: 80, render: (v: number, r: any) => <InputNumber min={0} max={100} value={v} onChange={val => updateEditLineItem(r.instanceId, 'discountPct', val)} style={{ width: 70 }} size="small" /> },
                { title: 'Unidad', key: 'unit', width: 80, render: (_: any, r: any) => r.unit || '—' },
                { title: 'Detalle', key: 'detail', width: 140, render: (_: any, r: any) => r.detail || '—' },
                { title: 'Ud. Tiempo', key: 'tu', width: 90, render: (_: any, r: any) => r.timeUnit || 'no aplica' },
                { title: 'Factor', key: 'factor', width: 70, render: (_: any, r: any) => r.factor ?? 1 },
                { title: '× Tiempo', key: 'tuv', width: 80, render: (_: any, r: any) => calcTimeUnitValue(r.timeUnit, editForm.getFieldValue('startDate')?.toISOString(), editForm.getFieldValue('endDate')?.toISOString()) },
                {
                  title: 'Total', key: 'total', width: 120,
                  render: (_: any, r: any) => {
                    const tuv = calcTimeUnitValue(r.timeUnit, editForm.getFieldValue('startDate')?.toISOString(), editForm.getFieldValue('endDate')?.toISOString())
                    const total = (r.quantity || 0) * (r.normalPrice || 0) * tuv * effectiveFactor(r.timeUnit, r.factor ?? 1) * (1 - (r.discountPct || 0) / 100)
                    return `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                  },
                },
                { title: 'Observaciones', dataIndex: 'observations', key: 'obs', width: 160, render: (v: string, r: any) => <Input value={v} onChange={e => updateEditLineItem(r.instanceId, 'observations', e.target.value)} size="small" /> },
                { title: '', key: 'del', width: 48, render: (_: any, r: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeEditLineItem(r.instanceId)} /> },
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
                              const val = r.substitutionSelections?.[comp.componentResourceId]
                              if (val) {
                                const opts = substitutionPackageDetails[comp.componentResourceId] || []
                                const sel = opts.find((c: any) => c.componentResourceId === val)
                                if (sel?.componentResource?.name) return <Tag color="green">✓ {sel.componentResource.name}</Tag>
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
                const subtotal = editLineItems.reduce((sum, li) => {
                  const tuv = calcTimeUnitValue(li.timeUnit, editForm.getFieldValue('startDate')?.toISOString(), editForm.getFieldValue('endDate')?.toISOString())
                  return sum + (li.quantity * (li.normalPrice || 0) * tuv * effectiveFactor(li.timeUnit, li.factor ?? 1) * (1 - (li.discountPct || 0) / 100))
                }, 0)
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

      <Modal
        title={`Crear Nota de Crédito — ${order?.orderNumber}`}
        open={creditNoteModalOpen}
        onCancel={() => setCreditNoteModalOpen(false)}
        onOk={() => creditNoteMutation.mutate()}
        confirmLoading={creditNoteMutation.isPending}
        okText="Crear Nota de Crédito"
        width={900}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Las cantidades se sugieren en negativo a partir de los valores reales de la orden. Puedes modificar las cantidades (0 o negativos).
        </Text>
        <Input.TextArea rows={2} placeholder="Notas de la nota de crédito..." value={creditNoteNotes} onChange={e => setCreditNoteNotes(e.target.value)} style={{ marginBottom: 12 }} />
        <Table
          dataSource={creditNoteItems}
          rowKey={(_, idx) => String(idx)}
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Descripción', dataIndex: 'description', width: 200 },
            { title: 'P. Unitario', dataIndex: 'unitPrice', width: 110, render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
            { title: 'Cantidad', dataIndex: 'quantity', width: 110, render: (v: number, _: any, idx: number) => <InputNumber value={v} max={0} onChange={val => updateCreditNoteItem(idx, 'quantity', val)} style={{ width: 90 }} size="small" /> },
            { title: 'Desc. %', dataIndex: 'discountPct', width: 80, render: (v: number) => `${v}%` },
            {
              title: 'Total', width: 120,
              render: (_: any, r: any) => {
                const total = (r.quantity || 0) * (r.unitPrice || 0) * (1 - (r.discountPct || 0) / 100)
                return <span style={{ color: total < 0 ? '#ff4d4f' : undefined, fontWeight: 500 }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              },
            },
            { title: 'Observaciones', dataIndex: 'observations', width: 160, render: (v: string, _: any, idx: number) => <Input value={v} onChange={e => updateCreditNoteItem(idx, 'observations', e.target.value)} size="small" /> },
          ]}
          footer={() => {
            const subtotal = creditNoteItems.reduce((sum, li) => sum + (li.quantity || 0) * (li.unitPrice || 0) * (1 - (li.discountPct || 0) / 100), 0)
            const tax = subtotal * 0.16
            return (
              <Row justify="end" gutter={16}>
                <Col><Statistic title="Subtotal" value={`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} valueStyle={{ color: '#ff4d4f' }} /></Col>
                <Col><Statistic title="IVA 16%" value={`$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} valueStyle={{ color: '#ff4d4f' }} /></Col>
                <Col><Statistic title="Total" value={`$${(subtotal + tax).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }} /></Col>
              </Row>
            )
          }}
        />
      </Modal>
    </div>
  )
}
