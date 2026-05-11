import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Tag, Button, Table, Space, Tabs, App, Select, Typography, Form, DatePicker,
  Modal, Badge, Tooltip, Popconfirm, Input, Upload, Timeline, Spin, Alert,
  Skeleton, InputNumber, Switch, Row, Col, Card,
} from 'antd'
import {
  PlusOutlined, RightOutlined, CalendarOutlined, EditOutlined, CopyOutlined,
  StopOutlined, GlobalOutlined, DownloadOutlined, DeleteOutlined, FileOutlined,
  UploadOutlined, AuditOutlined, WarningOutlined, ImportOutlined,
  FileProtectOutlined, EyeOutlined, TrophyOutlined, ShoppingCartOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'
import { portalCodesApi } from '../../api/portalCodes'
import { eventSpacesApi } from '../../api/eventSpaces'
import { resourcesApi } from '../../api/resources'
import { bookingsApi } from '../../api/bookings'
import { auditApi } from '../../api/audit'
import { priceListsApi } from '../../api/priceLists'
import { clientsApi } from '../../api/clients'
import { exportToCsv } from '../../utils/exportCsv'
import AuditTimeline from '../../components/AuditTimeline'
import GenerateDocumentModal from '../../components/GenerateDocumentModal'
import CreateOrderFromSpacesModal from '../../components/CreateOrderFromSpacesModal'
import { templatesApi } from '../../api/templates'
import DxfViewer, { StandSaveData } from '../../components/DxfViewer'
import { floorPlansApi } from '../../api/floorPlans'
import { standsApi } from '../../api/stands'
import TicketEventTab from './TicketEventTab'
import EventSummaryTab from './EventSummaryTab'
import EventTimelineTab from './EventTimelineTab'
import EventBudgetTab from './EventBudgetTab'
import { T } from '../../styles/tokens'

const { Text } = Typography

// ── Status maps ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}

const EVENT_STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  QUOTED:       { bg: `${T.blue}18`,    color: T.blue },
  CONFIRMED:    { bg: `${T.blue}18`,    color: T.blue },
  IN_EXECUTION: { bg: `${T.success}18`, color: T.success },
  CLOSED:       { bg: `${T.textDim}18`, color: T.textDim },
  CANCELLED:    { bg: `${T.danger}18`,  color: T.danger },
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada',
  INVOICED: 'Facturada', CANCELLED: 'Cancelada', CREDIT_NOTE: 'Nota de Crédito',
}

const ORDER_STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  QUOTED:      { bg: `${T.blue}18`,    color: T.blue },
  CONFIRMED:   { bg: `${T.success}18`, color: T.success },
  EXECUTED:    { bg: '#3b82f618',      color: '#3b82f6' },
  INVOICED:    { bg: '#06b6d418',      color: '#06b6d4' },
  CANCELLED:   { bg: `${T.danger}18`,  color: T.danger },
  CREDIT_NOTE: { bg: `${T.warning}18`, color: T.warning },
}

function OrderStatusChip({ status }: { status: string }) {
  const s = ORDER_STATUS_CHIP[status] ?? { bg: '#e5e9f0', color: '#64748b' }
  return (
    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600, background: s.bg, color: s.color }}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BTN_SECONDARY: React.CSSProperties = {
  padding: '7px 12px', background: 'white', border: `1px solid ${T.border}`,
  borderRadius: 6, fontSize: 13, color: T.text, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'background 0.15s',
}

const BTN_PRIMARY: React.CSSProperties = {
  padding: '7px 14px', background: T.navy, color: 'white',
  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') ?? 'resumen')

  // ── Modal / UI state ──────────────────────────────────────────────────────
  const [genModalOpen, setGenModalOpen] = useState(false)
  const [genForm] = Form.useForm()
  const [spaceModalOpen, setSpaceModalOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<any>(null)
  const [spaceForm] = Form.useForm()
  const [docUploading, setDocUploading] = useState(false)
  const [auditSpace, setAuditSpace] = useState<any>(null)
  const [standsImportPreview, setStandsImportPreview] = useState<any[] | null>(null)
  const [standsImportModalOpen, setStandsImportModalOpen] = useState(false)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)
  const [orderFromSpacesOpen, setOrderFromSpacesOpen] = useState(false)
  const [fpUploading, setFpUploading] = useState(false)
  const [fpProgress, setFpProgress] = useState(0)
  const [selectedFpId, setSelectedFpId] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'service' | 'budget'>('all')

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => eventsApi.deleteDocument(id!, docId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['event', id] }); message.success('Documento eliminado') },
    onError: () => message.error('Error al eliminar documento'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => eventsApi.updateStatus(id!, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['event', id] }); message.success('Estado actualizado') },
  })

  const generateCodesMutation = useMutation({
    mutationFn: (vals: any) => portalCodesApi.generate(id!, {
      count: vals.count,
      maxUses: vals.maxUses ?? 1,
      expiresAt: vals.expiresAt ? vals.expiresAt.toISOString() : undefined,
    }),
    onSuccess: (res) => {
      refetchCodes()
      setGenModalOpen(false)
      genForm.resetFields()
      message.success(`${res.data.meta.created} código(s) generado(s)`)
    },
    onError: () => message.error('Error al generar códigos'),
  })

  const revokeCodeMutation = useMutation({
    mutationFn: (codeId: string) => portalCodesApi.revoke(id!, codeId),
    onSuccess: () => { refetchCodes(); message.success('Código revocado') },
  })

  const saveSpaceMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        resourceId: values.resourceId,
        phase: values.phase,
        startTime: values.startTime.toISOString(),
        endTime: values.endTime.toISOString(),
        notes: values.notes ?? null,
      }
      return editingSpace
        ? eventSpacesApi.update(id!, editingSpace.id, payload)
        : eventSpacesApi.create(id!, payload)
    },
    onSuccess: () => {
      refetchSpaces()
      setSpaceModalOpen(false)
      spaceForm.resetFields()
      setEditingSpace(null)
      message.success(editingSpace ? 'Reserva actualizada' : 'Reserva creada')
    },
    onError: () => message.error('Error al guardar la reserva'),
  })

  const deleteSpaceMutation = useMutation({
    mutationFn: (spaceId: string) => eventSpacesApi.remove(id!, spaceId),
    onSuccess: () => { refetchSpaces(); message.success('Reserva eliminada') },
    onError: () => message.error('Error al eliminar'),
  })

  const importStandsMutation = useMutation({
    mutationFn: (rows: any[]) => eventsApi.importStands(id!, rows),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      setStandsImportModalOpen(false)
      setStandsImportPreview(null)
      message.success(`${res.data.imported} stand(s) importados`)
    },
    onError: () => message.error('Error al importar stands'),
  })

  const deleteFloorPlanMutation = useMutation({
    mutationFn: (fpId: string) => floorPlansApi.delete(id!, fpId),
    onSuccess: () => {
      refetchFloorPlans()
      setSelectedFpId(null)
      message.success('Plano eliminado')
    },
    onError: () => message.error('Error al eliminar plano'),
  })

  const updateEventMutation = useMutation({
    mutationFn: (vals: any) => eventsApi.update(id!, vals),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['event', id] }); message.success('Actualizado') },
    onError: () => message.error('Error al actualizar'),
  })

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
    staleTime: 60_000,
  })

  // Prefetch edit-form dependencies in the background so navigating to edit is instant
  useEffect(() => {
    if (!id) return
    queryClient.prefetchQuery({ queryKey: ['event-header', id], queryFn: () => eventsApi.getHeader(id), staleTime: 5 * 60_000 })
    queryClient.prefetchQuery({ queryKey: ['price-lists'], queryFn: () => priceListsApi.list(), staleTime: 5 * 60_000 })
    queryClient.prefetchQuery({ queryKey: ['clients', { pageSize: 200 }], queryFn: () => clientsApi.list({ pageSize: 200, minimal: true }), staleTime: 5 * 60_000 })
  }, [id])

  const { data: eventOrdersData } = useQuery({
    queryKey: ['event-orders', id],
    queryFn: () => eventsApi.getOrders(id!),
    enabled: !!id && (activeTab === 'ordenes' || activeTab === 'contratos'),
    staleTime: 60_000,
  })
  const fullOrders: any[] = eventOrdersData?.data ?? []

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['event-audit', id],
    queryFn: () => auditApi.getLog('Event', id!),
    enabled: !!id,
    staleTime: 60_000,
  })

  const { data: codesData, refetch: refetchCodes } = useQuery({
    queryKey: ['portal-codes', id],
    queryFn: () => portalCodesApi.list(id!),
    enabled: !!id && activeTab === 'portal',
    staleTime: 60_000,
  })

  const { data: spacesData, refetch: refetchSpaces } = useQuery({
    queryKey: ['event-spaces', id],
    queryFn: () => eventSpacesApi.list(id!),
    enabled: !!id && (activeTab === 'espacios' || activeTab === 'mapa'),
    staleTime: 60_000,
  })
  const spaces: any[] = spacesData?.data ?? []

  const { data: auditSpaceData, isLoading: auditSpaceLoading } = useQuery({
    queryKey: ['event-space-audit', id, auditSpace?.id],
    queryFn: () => eventSpacesApi.audit(id!, auditSpace!.id),
    enabled: !!auditSpace,
  })

  const spaceDateFrom = useMemo(() => {
    if (!spaces.length) return null
    return spaces.reduce((min: dayjs.Dayjs, s: any) =>
      dayjs(s.startTime).isBefore(min) ? dayjs(s.startTime) : min, dayjs(spaces[0].startTime))
  }, [spaces])
  const spaceDateTo = useMemo(() => {
    if (!spaces.length) return null
    return spaces.reduce((max: dayjs.Dayjs, s: any) =>
      dayjs(s.endTime).isAfter(max) ? dayjs(s.endTime) : max, dayjs(spaces[0].endTime))
  }, [spaces])

  const { data: calendarData } = useQuery({
    queryKey: ['bookings-overlap', spaceDateFrom?.toISOString(), spaceDateTo?.toISOString()],
    queryFn: () => bookingsApi.calendar({ dateFrom: spaceDateFrom!.format('YYYY-MM-DD'), dateTo: spaceDateTo!.format('YYYY-MM-DD') }),
    enabled: !!spaceDateFrom && !!spaceDateTo,
  })

  const overlapMap = useMemo(() => {
    const map: Record<string, { count: number; ownRank: number; items: { label: string; createdAt: string }[] }> = {}
    if (!calendarData?.data) return map
    const allBookings: any[] = calendarData.data.bookings ?? []
    const rankById: Record<string, number> = {}
    for (const b of allBookings) rankById[b.id] = b.overlapRank ?? 1
    for (const space of spaces) {
      const spaceStart = new Date(space.startTime)
      const spaceEnd = new Date(space.endTime)
      const conflicting = allBookings.filter(b =>
        b.resourceId === space.resourceId && b.id !== space.id &&
        new Date(b.startTime) < spaceEnd && new Date(b.endTime) > spaceStart
      )
      if (conflicting.length > 0) {
        map[space.id] = {
          count: conflicting.length,
          ownRank: rankById[space.id] ?? 1,
          items: conflicting.map((b: any) => ({
            label: b.event ? `${b.event.code} – ${b.event.name}` : `OS ${b.order?.orderNumber ?? ''}`,
            createdAt: b.createdAt ?? '',
          })),
        }
      }
    }
    return map
  }, [calendarData, spaces])

  const { data: resourcesData } = useQuery({
    queryKey: ['resources-all'],
    queryFn: () => resourcesApi.list({ pageSize: 500, isActive: true }),
    enabled: activeTab === 'espacios' || activeTab === 'mapa' || spaceModalOpen,
    staleTime: 10 * 60_000,
  })
  const allResources: any[] = resourcesData?.data ?? []

  const { data: teamClientsData } = useQuery({
    queryKey: ['clients-teams'],
    queryFn: () => clientsApi.list({ pageSize: 200, isTeam: true }),
    enabled: activeTab === 'deporte',
    staleTime: 10 * 60_000,
  })
  const teamClients: any[] = (teamClientsData?.data ?? []).filter((c: any) => c.isTeam)

  const { data: allClientsData } = useQuery({
    queryKey: ['clients-all-for-stands'],
    queryFn: () => clientsApi.list({ pageSize: 500 }),
    enabled: !!id && activeTab === 'mapa',
    staleTime: 10 * 60_000,
  })
  const allClients: any[] = allClientsData?.data ?? []

  const { data: floorPlansData, refetch: refetchFloorPlans } = useQuery({
    queryKey: ['floor-plans', id],
    queryFn: () => floorPlansApi.list(id!),
    enabled: !!id && activeTab === 'mapa',
    staleTime: 5 * 60_000,
  })
  const floorPlans: any[] = floorPlansData?.data ?? []

  const { data: standsData, refetch: refetchStands } = useQuery({
    queryKey: ['stands-geo', id],
    queryFn: () => standsApi.list(id!),
    enabled: !!id && activeTab === 'mapa',
    staleTime: 5 * 60_000,
  })
  const standsGeo: any[] = standsData?.data ?? []

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleDocUpload(file: File) {
    setDocUploading(true)
    try {
      await eventsApi.uploadDocument(id!, file, 'GENERAL')
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      message.success('Documento subido')
    } catch {
      message.error('Error al subir documento')
    } finally {
      setDocUploading(false)
    }
    return false
  }

  async function handleFloorPlanUpload(file: File) {
    setFpUploading(true)
    setFpProgress(0)
    try {
      // 1. Get a signed upload signature from the server (no file data sent to server)
      const sigRes = await floorPlansApi.getUploadSignature(id!)
      const { timestamp, signature, apiKey, cloudName, folder } = sigRes.data

      // 2. Upload directly to Cloudinary in 6 MB chunks
      const CHUNK = 6 * 1024 * 1024
      const totalSize = file.size
      const uploadId = Math.random().toString(36).slice(2) + Date.now().toString(36)
      let start = 0
      let lastResponse: any = null

      while (start < totalSize) {
        const end = Math.min(start + CHUNK, totalSize)
        const chunk = file.slice(start, end)

        const fd = new FormData()
        fd.append('file', chunk, file.name)
        fd.append('api_key', apiKey)
        fd.append('timestamp', String(timestamp))
        fd.append('signature', signature)
        fd.append('folder', folder)

        const resp = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
          {
            method: 'POST',
            headers: {
              'X-Unique-Upload-Id': uploadId,
              'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
            },
            body: fd,
          },
        )

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}))
          throw new Error(errBody?.error?.message ?? `Error Cloudinary ${resp.status}`)
        }

        lastResponse = await resp.json()
        start = end
        setFpProgress(Math.round((end / totalSize) * 100))
      }

      // 3. Register the resulting Cloudinary URL in our database
      const record = await floorPlansApi.createRecord(id!, {
        fileUrl: lastResponse.secure_url,
        fileName: file.name,
      })
      refetchFloorPlans()
      setSelectedFpId(record.data.id)
      message.success('Plano subido correctamente')
    } catch (err: any) {
      const msg = err?.message ?? 'Error al subir el plano'
      message.error(msg, 8)
    } finally {
      setFpUploading(false)
      setFpProgress(0)
    }
    return false
  }

  async function handleStandSave(data: StandSaveData) {
    if (data.id) {
      await standsApi.update(id!, data.id, data)
      message.success('Stand actualizado')
    } else {
      await standsApi.create(id!, data)
      message.success('Stand identificado')
    }
    refetchStands()
    queryClient.invalidateQueries({ queryKey: ['event', id] })
  }

  async function handleStandDelete(standId: string) {
    await standsApi.delete(id!, standId)
    message.success('Stand eliminado')
    refetchStands()
    queryClient.invalidateQueries({ queryKey: ['event', id] })
  }

  function downloadStandsTemplate() {
    const blob = new Blob(['codigo,ancho_m,largo_m,alto_m,notas_ubicacion\nA01,3,3,2.5,Esquina norte\n'], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla-stands-${event?.code ?? 'evento'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseStandsCsv(text: string): any[] {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
      return {
        codigo: row['codigo'] ?? '',
        ancho_m: row['ancho_m'] !== '' ? Number(row['ancho_m']) : null,
        largo_m: row['largo_m'] !== '' ? Number(row['largo_m']) : null,
        alto_m: row['alto_m'] !== '' ? Number(row['alto_m']) : null,
        notas_ubicacion: row['notas_ubicacion'] || null,
      }
    }).filter(r => r.codigo)
  }

  function handleStandsCsvUpload(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseStandsCsv(text)
      if (!rows.length) { message.error('El CSV no contiene filas válidas'); return }
      setStandsImportPreview(rows)
      setStandsImportModalOpen(true)
    }
    reader.readAsText(file)
    return false
  }

  const openSpaceModal = (space?: any) => {
    setEditingSpace(space ?? null)
    if (space) {
      spaceForm.setFieldsValue({
        resourceId: space.resourceId,
        phase: space.phase,
        startTime: dayjs(space.startTime),
        endTime: dayjs(space.endTime),
        notes: space.notes,
      })
    } else {
      spaceForm.resetFields()
    }
    setSpaceModalOpen(true)
  }

  // ── Loading / error ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ margin: -24 }}>
        <div style={{ background: 'white', padding: '14px 24px', borderBottom: `1px solid ${T.border}`, minHeight: 130 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
        <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
      </div>
    )
  }

  const event = data?.data

  if (!event) {
    return (
      <div style={{ margin: -24, padding: 24 }}>
        <Alert
          type="error"
          message="Evento no encontrado"
          action={<Button size="small" onClick={() => navigate('/eventos')}>Volver a Eventos</Button>}
        />
      </div>
    )
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const contractsMap = new Map<string, any>()
  for (const o of fullOrders) {
    if (o.contract && !contractsMap.has(o.contract.id)) {
      contractsMap.set(o.contract.id, {
        ...o.contract,
        _orderCount: fullOrders.filter((x: any) => x.contract?.id === o.contract.id).length,
      })
    }
  }
  const eventContracts = Array.from(contractsMap.values())

  const statusChip = EVENT_STATUS_CHIP[event.status] ?? { bg: '#e5e9f0', color: T.textMuted }

  // ── Tabs definition ───────────────────────────────────────────────────────
  const TABS = [
    { key: 'resumen',    label: 'Resumen' },
    { key: 'espacios',   label: `Espacios (${spaces.length})` },
    { key: 'timeline',   label: 'Timeline' },
    { key: 'presupuesto', label: 'Presupuesto' },
    { key: 'ordenes',    label: `Órdenes (${event._count?.orders ?? event.orders?.length ?? 0})` },
    ...(eventContracts.length > 0 ? [{ key: 'contratos', label: `Contratos (${eventContracts.length})` }] : []),
    { key: 'documentos', label: `Documentos (${event.documents?.length ?? 0})` },
    { key: 'produccion', label: 'Producción' },
    { key: 'mapa',       label: 'Mapa del Venue' },
    { key: 'boletos',    label: 'Boletos' },
    { key: 'portal',     label: 'Portal' },
    { key: 'deporte',    label: 'Portal Deportivo' },
    { key: 'auditoria',  label: 'Auditoría' },
  ]

  // ── Order columns ─────────────────────────────────────────────────────────
  const orderColumns = [
    {
      title: 'Número', dataIndex: 'orderNumber', key: 'orderNumber',
      render: (v: string, r: any) => (
        <Button type="link" style={{ padding: 0, color: T.blue, fontWeight: 600 }} onClick={() => navigate(`/ordenes/${r.id}`)}>{v}</Button>
      ),
    },
    {
      title: 'Cliente', key: 'client',
      render: (_: any, r: any) => r.client?.companyName || `${r.client?.firstName} ${r.client?.lastName}`,
    },
    { title: 'Stand', dataIndex: ['stand', 'code'], key: 'stand' },
    {
      title: 'Organización', key: 'organizacion',
      render: (_: any, r: any) => r.organizacion?.descripcion ?? '—',
    },
    {
      title: 'Tipo', key: 'tipo', width: 110,
      render: (_: any, r: any) => r.isBudgetOrder
        ? <Tag color="purple">Presupuestal</Tag>
        : <Tag color="default">Servicio</Tag>,
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: (v: string) => <OrderStatusChip status={v} />,
    },
    {
      title: 'Total', dataIndex: 'total', key: 'total',
      render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    },
    { title: 'F. Inicio', dataIndex: 'startDate', key: 'startDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—' },
    { title: 'F. Fin', dataIndex: 'endDate', key: 'endDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—' },
    { title: 'Fecha', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YY') },
  ]

  const filteredEventOrders = orderTypeFilter === 'all'
    ? fullOrders
    : orderTypeFilter === 'budget'
    ? fullOrders.filter((o: any) => o.isBudgetOrder)
    : fullOrders.filter((o: any) => !o.isBudgetOrder)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ margin: -24 }}>

      {/* ═══════════════════════════════════════════════════════════ HEADER */}
      <div style={{ background: 'white', padding: '14px 24px', borderBottom: `1px solid ${T.border}` }}>

        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 8 }}>
          <button
            onClick={() => navigate('/eventos')}
            style={{ background: 'none', border: 'none', padding: 0, color: T.textMuted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}
          >
            Eventos
          </button>
          <RightOutlined style={{ fontSize: 9, color: T.textDim }} />
          <span style={{ color: T.text }}>{event.name}</span>
        </div>

        {/* Hero row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>

          {/* Left: icon + title + meta */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #3b82f6, #1e4d7b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarOutlined style={{ fontSize: 22, color: 'white' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: T.navy, margin: 0, lineHeight: 1.2 }}>
                  {event.name}
                </h1>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
                  background: statusChip.bg, color: statusChip.color,
                }}>
                  {STATUS_LABELS[event.status] ?? event.status}
                </span>
                <span style={{ fontSize: 11, color: T.textDim, background: T.bg, padding: '2px 8px', borderRadius: 10 }}>
                  {event.code}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: T.textMuted, marginTop: 4, flexWrap: 'wrap' }}>
                {event.eventStart && (
                  <span>📅 {dayjs(event.eventStart).format('DD MMM YYYY')} – {event.eventEnd ? dayjs(event.eventEnd).format('DD MMM YYYY') : '?'}</span>
                )}
                {(event.venue ?? event.venueLocation) && (
                  <span>📍 {event.venue ?? event.venueLocation}</span>
                )}
                {event.primaryClient && (
                  <span>👤 {event.primaryClient.companyName || `${event.primaryClient.firstName} ${event.primaryClient.lastName}`}</span>
                )}
                {event.expectedAttendance && (
                  <span>🎟 {Number(event.expectedAttendance).toLocaleString('es-MX')} asistentes</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              style={BTN_SECONDARY}
              onClick={() => { navigator.clipboard.writeText(window.location.href); message.success('URL copiada') }}
            >
              Compartir
            </button>
            <button style={BTN_SECONDARY} onClick={() => setGenerateDocOpen(true)}>
              Generar Word
            </button>
            <button style={BTN_SECONDARY} onClick={() => navigate(`/eventos/${id}/reporte`)}>
              <BarChartOutlined style={{ marginRight: 5 }} />Resumen
            </button>
            <Select
              value={event.status}
              onChange={(v) => updateStatusMutation.mutate(v)}
              loading={updateStatusMutation.isPending}
              style={{ width: 160 }}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <button style={BTN_PRIMARY} onClick={() => navigate(`/eventos/${id}/editar`)}>
              Editar
            </button>
            <button
              style={{ ...BTN_PRIMARY, background: T.blue, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => navigate(`/eventos/${id}/ordenes/nueva`)}
            >
              <PlusOutlined style={{ fontSize: 12 }} /> Nueva OS
            </button>
          </div>
        </div>

        {/* Custom tabs bar */}
        <div style={{ display: 'flex', gap: 2, marginTop: 14, marginBottom: -14, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 14px', background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${T.blue}` : '2px solid transparent',
                color: activeTab === tab.key ? T.navy : T.textMuted,
                fontWeight: activeTab === tab.key ? 600 : 500,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) (e.currentTarget.style.color = T.text) }}
              onMouseLeave={e => { if (activeTab !== tab.key) (e.currentTarget.style.color = T.textMuted) }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ BODY */}
      <div style={{ padding: 24, background: T.bg }}>

        {/* ── Tab: Resumen ── */}
        {activeTab === 'resumen' && (
          <EventSummaryTab
            event={event}
            auditData={auditData?.data ?? []}
            onSwitchTab={setActiveTab}
          />
        )}

        {/* ── Tab: Boletos ── */}
        {activeTab === 'boletos' && <TicketEventTab eventId={id!} />}

        {/* ── Tab: Espacios ── */}
        {activeTab === 'espacios' && (
          <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Button
                icon={<ShoppingCartOutlined />}
                disabled={spaces.length === 0}
                onClick={() => setOrderFromSpacesOpen(true)}
              >
                Crear Orden desde Reservas
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openSpaceModal()}>
                Agregar reserva
              </Button>
            </div>
            <Table
              dataSource={spaces}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Recurso / Espacio',
                  render: (_: any, r: any) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.resource?.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.resource?.code} · {r.resource?.type}</div>
                    </div>
                  ),
                },
                {
                  title: 'Fase', dataIndex: 'phase',
                  render: (v: string) => {
                    const cfg: Record<string, { color: string; label: string }> = {
                      SETUP: { color: 'gold', label: 'Montaje' },
                      EVENT: { color: 'blue', label: 'Evento' },
                      TEARDOWN: { color: 'orange', label: 'Desmontaje' },
                    }
                    return <Tag color={cfg[v]?.color}>{cfg[v]?.label ?? v}</Tag>
                  },
                },
                { title: 'Inicio', dataIndex: 'startTime', render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
                { title: 'Fin', dataIndex: 'endTime', render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
                {
                  title: 'Duración',
                  render: (_: any, r: any) => {
                    const hrs = dayjs(r.endTime).diff(dayjs(r.startTime), 'hour')
                    return hrs >= 24 ? `${Math.round(hrs / 24)} días` : `${hrs}h`
                  },
                },
                { title: 'Creación', dataIndex: 'createdAt', render: (v: string) => v ? <span style={{ fontSize: 12, color: '#64748b' }}>{dayjs(v).format('DD/MM/YY HH:mm')}</span> : '—' },
                {
                  title: 'Notas', dataIndex: 'notes',
                  render: (v: string) => v
                    ? <Tooltip title={v}><span style={{ color: '#64748b', fontSize: 12 }}>{v.slice(0, 40)}{v.length > 40 ? '…' : ''}</span></Tooltip>
                    : '—',
                },
                {
                  title: 'Conflictos', key: 'conflicts',
                  render: (_: any, r: any) => {
                    const overlap = overlapMap[r.id]
                    if (!overlap) return <Tag color="green">Sin conflictos</Tag>
                    return (
                      <Tooltip
                        overlayStyle={{ maxWidth: 360 }}
                        title={
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: 8 }}>Solapamiento con:</div>
                            {overlap.items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                                <span>• {item.label}</span>
                                <span style={{ opacity: 0.65 }}>{item.createdAt ? dayjs(item.createdAt).format('DD/MM/YY HH:mm') : '—'}</span>
                              </div>
                            ))}
                          </div>
                        }
                      >
                        <Tag color="red" icon={<WarningOutlined />}>
                          <strong>#{overlap.ownRank}/{overlap.count + 1}</strong> · {overlap.count} conflicto{overlap.count > 1 ? 's' : ''}
                        </Tag>
                      </Tooltip>
                    )
                  },
                },
                {
                  title: '', key: 'actions',
                  render: (_: any, r: any) => (
                    <Space>
                      <Tooltip title="Auditoría"><Button size="small" icon={<AuditOutlined />} onClick={() => setAuditSpace(r)} /></Tooltip>
                      <Button size="small" icon={<EditOutlined />} onClick={() => openSpaceModal(r)} />
                      <Popconfirm title="¿Eliminar esta reserva?" onConfirm={() => deleteSpaceMutation.mutate(r.id)} okText="Sí" cancelText="No">
                        <Button size="small" danger icon={<DeleteOutlined />} loading={deleteSpaceMutation.isPending} />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* ── Tab: Timeline ── */}
        {activeTab === 'timeline' && (
          <EventTimelineTab eventId={id!} event={event} activeTab={activeTab} />
        )}

        {/* ── Tab: Mapa del Venue ── */}
        {activeTab === 'mapa' && (
          <Tabs
            size="small"
            type="card"
            items={[
              {
                key: 'plano',
                label: `Plano DXF (${floorPlans.length})`,
                children: (
                  <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Upload accept=".dxf" showUploadList={false} beforeUpload={handleFloorPlanUpload}>
                        <Button icon={<UploadOutlined />} loading={fpUploading} type="primary">
                          {fpUploading && fpProgress > 0 ? `Subiendo ${fpProgress}%` : 'Subir DXF'}
                        </Button>
                      </Upload>
                      {floorPlans.map((fp: any) => (
                        <Space key={fp.id} size={4}>
                          <Button
                            size="small"
                            type={selectedFpId === fp.id ? 'primary' : 'default'}
                            onClick={() => setSelectedFpId(fp.id)}
                          >
                            {fp.name}
                          </Button>
                          <Tooltip title="Descargar DXF">
                            <Button
                              size="small" icon={<DownloadOutlined />}
                              onClick={async () => {
                                try {
                                  const res = await floorPlansApi.getContent(id!, fp.id)
                                  const blob = new Blob([res.data.content], { type: 'text/plain' })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a'); a.href = url; a.download = fp.fileName; a.click()
                                  URL.revokeObjectURL(url)
                                } catch { message.error('Error al descargar el plano') }
                              }}
                            />
                          </Tooltip>
                          <Popconfirm title="¿Eliminar este plano?" onConfirm={() => deleteFloorPlanMutation.mutate(fp.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteFloorPlanMutation.isPending} />
                          </Popconfirm>
                        </Space>
                      ))}
                      {floorPlans.length === 0 && <Text type="secondary">Sube un archivo DXF para visualizar el plano del venue.</Text>}
                    </div>
                    {selectedFpId && floorPlans.find((fp: any) => fp.id === selectedFpId) && (
                      <DxfViewer
                        eventId={id!}
                        floorPlan={floorPlans.find((fp: any) => fp.id === selectedFpId)}
                        fetchContent={(fpId) => floorPlansApi.getContent(id!, fpId)}
                        stands={standsGeo.map((s: any) => ({
                          ...s,
                          clientName: s.client ? (s.client.companyName || `${s.client.firstName ?? ''} ${s.client.lastName ?? ''}`.trim()) : null,
                          clientLogoUrl: s.client?.logoUrl ?? null,
                        }))}
                        clients={allClients}
                        onStandSave={handleStandSave}
                        onStandDelete={handleStandDelete}
                        onCreateOrder={(standId, clientId) => navigate(`/eventos/${id}/ordenes/nueva`, { state: { standId, clientId } })}
                        height={580}
                      />
                    )}
                    {!selectedFpId && floorPlans.length > 0 && (
                      <Alert type="info" message="Selecciona un plano de la lista para visualizarlo." />
                    )}
                  </div>
                ),
              },
              {
                key: 'stands',
                label: `Stands (${standsGeo.length})`,
                children: (
                  <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                      <Button icon={<DownloadOutlined />} onClick={downloadStandsTemplate}>Plantilla CSV</Button>
                      <Upload accept=".csv" showUploadList={false} beforeUpload={handleStandsCsvUpload}>
                        <Button icon={<ImportOutlined />}>Importar CSV</Button>
                      </Upload>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => exportToCsv(`stands-${event.code}`, standsGeo.map((s: any) => ({
                          codigo: s.code,
                          cliente: s.client?.companyName || `${s.client?.firstName ?? ''} ${s.client?.lastName ?? ''}`.trim(),
                          dimensiones: s.widthM ? `${s.widthM}m x ${s.depthM}m` : '',
                        })), [
                          { header: 'Código', key: 'codigo' },
                          { header: 'Cliente', key: 'cliente' },
                          { header: 'Dimensiones', key: 'dimensiones' },
                        ])}
                      >
                        Exportar CSV
                      </Button>
                    </div>
                    <Table
                      dataSource={standsGeo}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={[
                        { title: 'Código', dataIndex: 'code' },
                        { title: 'Cliente', render: (_: any, r: any) => r.client?.companyName || `${r.client?.firstName ?? ''} ${r.client?.lastName ?? ''}` },
                        { title: 'Dimensiones', render: (_: any, r: any) => r.widthM ? `${r.widthM}m × ${r.depthM}m` : '—' },
                        { title: 'Alto', render: (_: any, r: any) => r.heightM ? `${r.heightM}m` : '—' },
                        { title: 'Notas ubic.', dataIndex: 'locationNotes', render: (v: string) => v || '—' },
                        { title: 'Órdenes', render: (_: any, r: any) => r.orders?.length ?? 0 },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}

        {/* ── Tab: Presupuesto ── */}
        {activeTab === 'presupuesto' && <EventBudgetTab eventId={id!} event={event} />}

        {/* ── Tab: Órdenes ── */}
        {activeTab === 'ordenes' && (
          <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Space>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>Órdenes de servicio</span>
                <Select
                  value={orderTypeFilter}
                  onChange={(v) => setOrderTypeFilter(v)}
                  style={{ width: 170 }}
                  options={[
                    { value: 'all', label: 'Ver: Todas' },
                    { value: 'service', label: 'Ver: Servicio' },
                    { value: 'budget', label: 'Ver: Presupuestales' },
                  ]}
                />
              </Space>
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => exportToCsv(`ordenes-${event.code}`, filteredEventOrders.map((o: any) => ({
                    numero: o.orderNumber,
                    cliente: o.client?.companyName || `${o.client?.firstName} ${o.client?.lastName}`,
                    stand: o.stand?.code ?? '',
                    tipo: o.isBudgetOrder ? 'Presupuestal' : 'Servicio',
                    estado: ORDER_STATUS_LABELS[o.status] ?? o.status,
                    total: Number(o.total).toFixed(2),
                    fecha: dayjs(o.createdAt).format('DD/MM/YYYY'),
                  })), [
                    { header: 'Número', key: 'numero' },
                    { header: 'Cliente', key: 'cliente' },
                    { header: 'Stand', key: 'stand' },
                    { header: 'Tipo', key: 'tipo' },
                    { header: 'Estado', key: 'estado' },
                    { header: 'Total', key: 'total' },
                    { header: 'Fecha', key: 'fecha' },
                  ])}
                >
                  Exportar CSV
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/eventos/${id}/ordenes/nueva`)}>
                  Nueva OS
                </Button>
              </Space>
            </div>
            <Table
              dataSource={filteredEventOrders}
              columns={orderColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 'max-content' }}
            />
          </div>
        )}

        {/* ── Tab: Contratos ── */}
        {activeTab === 'contratos' && (
          <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
            <Table
              dataSource={eventContracts}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Número', dataIndex: 'contractNumber', width: 150,
                  render: (v: string, r: any) => <Button type="link" onClick={() => navigate(`/contratos/${r.id}`)}>{v}</Button>,
                },
                { title: 'Descripción', dataIndex: 'description', ellipsis: true },
                {
                  title: 'Cliente', dataIndex: 'client',
                  render: (c: any) => c?.companyName || `${c?.firstName || ''} ${c?.lastName || ''}`.trim(),
                },
                {
                  title: 'Estado', dataIndex: 'status', width: 110,
                  render: (v: string) => {
                    const map: Record<string, { label: string; color: string }> = {
                      EN_FIRMA: { label: 'En Firma', color: 'processing' },
                      FIRMADO: { label: 'Firmado', color: 'success' },
                      CANCELADO: { label: 'Cancelado', color: 'error' },
                    }
                    const s = map[v] || { label: v, color: 'default' }
                    return <Tag color={s.color}>{s.label}</Tag>
                  },
                },
                {
                  title: 'Monto Total', dataIndex: 'totalAmount', width: 140, align: 'right' as const,
                  render: (v: any) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                },
                { title: 'Órdenes', dataIndex: '_orderCount', width: 80, align: 'center' as const },
                {
                  title: '', key: 'actions', width: 60,
                  render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/contratos/${r.id}`)} />,
                },
              ]}
            />
          </div>
        )}

        {/* ── Tab: Producción ── */}
        {activeTab === 'produccion' && (
          <div style={{
            background: 'white', borderRadius: 10, padding: 64, border: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <BarChartOutlined style={{ fontSize: 48, color: T.textDim }} />
            <div style={{ fontSize: 14, color: T.textMuted }}>Producción y costos por evento estará disponible pronto</div>
            <Button onClick={() => navigate('/produccion')}>Ver módulo general de Producción</Button>
          </div>
        )}

        {/* ── Tab: Documentos ── */}
        {activeTab === 'documentos' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Upload beforeUpload={handleDocUpload} showUploadList={false}>
                <button style={BTN_SECONDARY}>
                  <UploadOutlined style={{ marginRight: 6 }} />
                  {docUploading ? 'Subiendo…' : 'Subir documento'}
                </button>
              </Upload>
            </div>
            {(event.documents ?? []).length === 0 ? (
              <Text type="secondary">Sin documentos adjuntos</Text>
            ) : (
              <Row gutter={[12, 12]}>
                {event.documents.map((doc: any) => {
                  const ext = doc.fileName?.split('.').pop()?.toLowerCase() ?? ''
                  const avatarStyle = ext === 'pdf'
                    ? { bg: `${T.danger}18`, color: T.danger }
                    : ext === 'docx' || ext === 'doc'
                    ? { bg: `${T.blue}18`, color: T.blue }
                    : { bg: '#64748b18', color: '#64748b' }
                  return (
                    <Col xs={24} sm={12} md={8} key={doc.id}>
                      <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, background: 'white' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: avatarStyle.bg, color: avatarStyle.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                          }}>
                            <FileOutlined />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.fileName}
                            </div>
                            <div style={{ fontSize: 11, color: T.textDim }}>{doc.documentType}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 6 }}>
                          {doc.blobKey && (
                            <Button
                              size="small" icon={<DownloadOutlined />}
                              onClick={() => doc.blobKey.startsWith('http')
                                ? window.open(doc.blobKey, '_blank')
                                : templatesApi.download(doc.blobKey, doc.fileName)
                              }
                            />
                          )}
                          <Popconfirm title="¿Eliminar documento?" onConfirm={() => deleteDocMutation.mutate(doc.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteDocMutation.isPending} />
                          </Popconfirm>
                        </div>
                      </div>
                    </Col>
                  )
                })}
              </Row>
            )}
          </div>
        )}

        {/* ── Tab: Portal ── */}
        {activeTab === 'portal' && (
          <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Space>
                <Text>Portal habilitado:</Text>
                <Switch checked={!!event.portalEnabled} disabled checkedChildren="Sí" unCheckedChildren="No" />
                {event.portalEnabled && <Tag color="purple">Visible para expositores</Tag>}
              </Space>
              <Button
                type="primary" icon={<PlusOutlined />}
                onClick={() => setGenModalOpen(true)}
                disabled={!['CONFIRMED', 'IN_EXECUTION'].includes(event.status)}
              >
                Generar códigos
              </Button>
            </div>
            <Table
              dataSource={codesData?.data?.data ?? []}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Código', dataIndex: 'code',
                  render: (v: string) => (
                    <Space>
                      <Text code>{v}</Text>
                      <Button type="link" size="small" icon={<CopyOutlined />}
                        onClick={() => { navigator.clipboard.writeText(v); message.success('Copiado') }} />
                    </Space>
                  ),
                },
                { title: 'Usos', render: (_: any, r: any) => `${r.usedCount} / ${r.maxUses}` },
                { title: 'Expira', dataIndex: 'expiresAt', render: (v: string) => v ? dayjs(v).format('DD/MM/YY') : '—' },
                {
                  title: 'Estado', dataIndex: 'isActive',
                  render: (v: boolean, r: any) => {
                    if (!v) return <Tag color="red">Revocado</Tag>
                    if (r.usedCount >= r.maxUses) return <Tag color="default">Agotado</Tag>
                    return <Tag color="green">Disponible</Tag>
                  },
                },
                {
                  title: 'Registro(s)', render: (_: any, r: any) =>
                    (r.usages ?? []).map((u: any) => <div key={u.id} style={{ fontSize: 12 }}>{u.portalUser?.email}</div>),
                },
                {
                  title: '', render: (_: any, r: any) =>
                    r.isActive && r.usedCount < r.maxUses ? (
                      <Button size="small" danger icon={<StopOutlined />}
                        onClick={() => revokeCodeMutation.mutate(r.id)} loading={revokeCodeMutation.isPending}>
                        Revocar
                      </Button>
                    ) : null,
                },
              ]}
            />
          </div>
        )}

        {/* ── Tab: Portal Deportivo ── */}
        {activeTab === 'deporte' && (
          <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}`, maxWidth: 520 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 16 }}>Equipos del partido</div>
            <Form
              layout="vertical"
              initialValues={{
                sportLocalTeamId: event.sportLocalTeamId ?? undefined,
                sportVisitingTeamId: event.sportVisitingTeamId ?? undefined,
              }}
              onFinish={(vals) => updateEventMutation.mutate(vals)}
            >
              <Form.Item name="sportLocalTeamId" label="Equipo Local">
                <Select
                  allowClear showSearch optionFilterProp="label"
                  placeholder="Seleccionar equipo local..."
                  options={teamClients.map((c: any) => ({
                    value: c.id,
                    label: c.companyName || `${c.firstName} ${c.lastName}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="sportVisitingTeamId" label="Equipo Visitante">
                <Select
                  allowClear showSearch optionFilterProp="label"
                  placeholder="Seleccionar equipo visitante..."
                  options={teamClients.map((c: any) => ({
                    value: c.id,
                    label: c.companyName || `${c.firstName} ${c.lastName}`,
                  }))}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={updateEventMutation.isPending}>
                  Guardar equipos
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}

        {/* ── Tab: Auditoría ── */}
        {activeTab === 'auditoria' && (
          <div style={{ background: 'white', borderRadius: 10, padding: 24, border: `1px solid ${T.border}` }}>
            <AuditTimeline data={auditData?.data ?? []} loading={auditLoading} />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ MODALS */}

      {/* Space audit modal */}
      <Modal
        title={`Auditoría – ${auditSpace?.resource?.name ?? ''}`}
        open={!!auditSpace}
        onCancel={() => setAuditSpace(null)}
        footer={<Button onClick={() => setAuditSpace(null)}>Cerrar</Button>}
        width={560}
      >
        {auditSpaceLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : (
          <Timeline
            style={{ marginTop: 16 }}
            items={(auditSpaceData?.data ?? []).map((log: any) => ({
              color: log.action === 'CREATE' ? 'green' : log.action === 'DELETE' ? 'red' : 'blue',
              children: (
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {log.action === 'CREATE' ? 'Creado' : log.action === 'DELETE' ? 'Eliminado' : 'Modificado'}
                    {' · '}
                    <span style={{ fontWeight: 400, color: '#64748b', fontSize: 12 }}>
                      {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm')} · {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema'}
                    </span>
                  </div>
                  {log.action === 'UPDATE' && log.oldValues && log.newValues && (
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                      {Object.keys(log.newValues as Record<string, any>)
                        .filter(k => (log.oldValues as any)[k] !== (log.newValues as any)[k])
                        .map(k => (
                          <div key={k}>
                            <span style={{ textTransform: 'capitalize' }}>{k}</span>:{' '}
                            <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{String((log.oldValues as any)[k])}</span>
                            {' → '}<span>{String((log.newValues as any)[k])}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        )}
        {!auditSpaceLoading && (auditSpaceData?.data ?? []).length === 0 && (
          <Alert type="info" message="Sin registros de auditoría" />
        )}
      </Modal>

      {/* Space edit modal */}
      <Modal
        title={editingSpace ? 'Editar reserva de espacio' : 'Agregar reserva de espacio'}
        open={spaceModalOpen}
        onCancel={() => { setSpaceModalOpen(false); setEditingSpace(null); spaceForm.resetFields() }}
        onOk={() => spaceForm.validateFields().then(saveSpaceMutation.mutate)}
        confirmLoading={saveSpaceMutation.isPending}
        okText="Guardar"
        width={520}
        forceRender
      >
        <Form form={spaceForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="resourceId" label="Recurso / Espacio" rules={[{ required: true }]}>
            <Select
              showSearch placeholder="Seleccionar recurso"
              filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={allResources.map((r: any) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
            />
          </Form.Item>
          <Form.Item name="phase" label="Fase" rules={[{ required: true }]}>
            <Select options={[
              { value: 'SETUP', label: 'Montaje' },
              { value: 'EVENT', label: 'Evento principal' },
              { value: 'TEARDOWN', label: 'Desmontaje' },
            ]} />
          </Form.Item>
          <Form.Item name="startTime" label="Fecha y hora de inicio" rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endTime" label="Fecha y hora de fin" rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notas (opcional)">
            <Input.TextArea rows={2} placeholder="Observaciones sobre el uso del espacio" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Generate codes modal */}
      <Modal
        title="Generar códigos de acceso"
        open={genModalOpen}
        onCancel={() => setGenModalOpen(false)}
        onOk={() => genForm.validateFields().then(generateCodesMutation.mutate)}
        confirmLoading={generateCodesMutation.isPending}
        okText="Generar"
        forceRender
      >
        <Form form={genForm} layout="vertical" initialValues={{ count: 10, maxUses: 1 }}>
          <Form.Item name="count" label="Número de códigos" rules={[{ required: true }]}>
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxUses" label="Usos máximos por código">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expiresAt" label="Fecha de expiración (opcional)">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Stands import modal */}
      <Modal
        title="Vista previa de importación"
        open={standsImportModalOpen}
        onCancel={() => { setStandsImportModalOpen(false); setStandsImportPreview(null) }}
        onOk={() => standsImportPreview && importStandsMutation.mutate(standsImportPreview)}
        confirmLoading={importStandsMutation.isPending}
        okText={`Importar ${standsImportPreview?.length ?? 0} stand(s)`}
        cancelText="Cancelar"
        width={640}
      >
        <p style={{ marginBottom: 12, color: '#64748b', fontSize: 13 }}>
          Los stands existentes con el mismo código serán actualizados. Los nuevos serán creados.
        </p>
        <Table
          dataSource={standsImportPreview ?? []}
          rowKey="codigo"
          size="small"
          pagination={false}
          scroll={{ y: 320 }}
          columns={[
            { title: 'Código', dataIndex: 'codigo' },
            { title: 'Ancho (m)', dataIndex: 'ancho_m', render: (v: any) => v ?? '—' },
            { title: 'Largo (m)', dataIndex: 'largo_m', render: (v: any) => v ?? '—' },
            { title: 'Alto (m)', dataIndex: 'alto_m', render: (v: any) => v ?? '—' },
            { title: 'Notas ubicación', dataIndex: 'notas_ubicacion', render: (v: any) => v ?? '—' },
          ]}
        />
      </Modal>

      <CreateOrderFromSpacesModal
        open={orderFromSpacesOpen}
        onClose={() => setOrderFromSpacesOpen(false)}
        onSuccess={() => {
          setOrderFromSpacesOpen(false)
          queryClient.invalidateQueries({ queryKey: ['event', id] })
        }}
        eventId={id!}
        eventName={event.name}
      />

      <GenerateDocumentModal
        open={generateDocOpen}
        onClose={() => setGenerateDocOpen(false)}
        context="EVENT"
        entityId={id!}
      />
    </div>
  )
}
