import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Row, Col, Tag, Button, Descriptions, Table, Space, Statistic,
  Tabs, App, Select, Typography, Divider, InputNumber, Form, DatePicker, Modal, Switch, Badge,
  Tooltip, Popconfirm, Input, Upload, Timeline, Spin, Alert,
} from 'antd'
import { EditOutlined, PlusOutlined, ArrowLeftOutlined, CopyOutlined, StopOutlined, GlobalOutlined, DownloadOutlined, DeleteOutlined, CalendarOutlined, FileOutlined, UploadOutlined, AuditOutlined, WarningOutlined, ImportOutlined, FileProtectOutlined, EyeOutlined, TrophyOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'
import { portalCodesApi } from '../../api/portalCodes'
import { eventSpacesApi } from '../../api/eventSpaces'
import { resourcesApi } from '../../api/resources'
import { bookingsApi } from '../../api/bookings'
import { auditApi } from '../../api/audit'
import { clientsApi } from '../../api/clients'
import { exportToCsv } from '../../utils/exportCsv'
import AuditTimeline from '../../components/AuditTimeline'
import AuditDrawer from '../../components/AuditDrawer'
import GenerateDocumentModal from '../../components/GenerateDocumentModal'
import { templatesApi } from '../../api/templates'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_EXECUTION: 'orange', CLOSED: 'default', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}
const ORDER_STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', EXECUTED: 'geekblue', INVOICED: 'cyan', CANCELLED: 'red', CREDIT_NOTE: 'gold',
}
const ORDER_STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada', INVOICED: 'Facturada', CANCELLED: 'Cancelada', CREDIT_NOTE: 'Nota de Crédito',
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
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

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => eventsApi.deleteDocument(id!, docId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['event', id] }); message.success('Documento eliminado') },
    onError: () => message.error('Error al eliminar documento'),
  })

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

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['event-audit', id],
    queryFn: () => auditApi.getLog('Event', id!),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => eventsApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      message.success('Estado actualizado')
    },
  })

  const { data: codesData, refetch: refetchCodes } = useQuery({
    queryKey: ['portal-codes', id],
    queryFn: () => portalCodesApi.list(id!),
    enabled: !!id,
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

  // EventSpaces
  const { data: spacesData, refetch: refetchSpaces } = useQuery({
    queryKey: ['event-spaces', id],
    queryFn: () => eventSpacesApi.list(id!),
    enabled: !!id,
  })
  const spaces = spacesData?.data ?? []

  // Audit log for a selected space
  const { data: auditSpaceData, isLoading: auditSpaceLoading } = useQuery({
    queryKey: ['event-space-audit', id, auditSpace?.id],
    queryFn: () => eventSpacesApi.audit(id!, auditSpace!.id),
    enabled: !!auditSpace,
  })

  // Detect overlaps: query booking calendar across all events for the spaces' date range
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
    queryFn: () => bookingsApi.calendar({
      dateFrom: spaceDateFrom!.format('YYYY-MM-DD'),
      dateTo: spaceDateTo!.format('YYYY-MM-DD'),
    }),
    enabled: !!spaceDateFrom && !!spaceDateTo,
  })

  // Map spaceId → conflicting events (from OTHER events on the same resource)
  const overlapMap = useMemo(() => {
    const map: Record<string, { count: number; ownRank: number; items: { label: string; createdAt: string }[] }> = {}
    if (!calendarData?.data) return map
    const allBookings: any[] = calendarData.data.bookings ?? []
    // Build rank lookup: bookingId → overlapRank from calendar response
    const rankById: Record<string, number> = {}
    for (const b of allBookings) rankById[b.id] = b.overlapRank ?? 1
    for (const space of spaces) {
      const spaceStart = new Date(space.startTime)
      const spaceEnd = new Date(space.endTime)
      const conflicting = allBookings.filter(b =>
        b.resourceId === space.resourceId &&
        b.id !== space.id &&
        new Date(b.startTime) < spaceEnd &&
        new Date(b.endTime) > spaceStart
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
  })
  const allResources = resourcesData?.data ?? []

  const { data: teamClientsData } = useQuery({
    queryKey: ['clients-teams'],
    queryFn: () => clientsApi.list({ pageSize: 200, isTeam: true }),
  })
  const teamClients = (teamClientsData?.data ?? []).filter((c: any) => c.isTeam)

  const updateEventMutation = useMutation({
    mutationFn: (vals: any) => eventsApi.update(id!, vals),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      message.success('Portal deportivo actualizado')
    },
    onError: () => message.error('Error al actualizar'),
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

  function downloadStandsTemplate() {
    const header = 'codigo,ancho_m,largo_m,alto_m,notas_ubicacion'
    const example = 'A01,3,3,2.5,Esquina norte'
    const blob = new Blob([header + '\n' + example + '\n'], { type: 'text/csv;charset=utf-8;' })
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
        codigo:          row['codigo'] ?? '',
        ancho_m:         row['ancho_m'] !== '' ? Number(row['ancho_m']) : null,
        largo_m:         row['largo_m'] !== '' ? Number(row['largo_m']) : null,
        alto_m:          row['alto_m'] !== '' ? Number(row['alto_m']) : null,
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

  const event = data?.data

  if (isLoading) return <Card loading />
  if (!event) return null

  const totalOrders = event.orders?.reduce((sum: number, o: any) => sum + Number(o.total), 0) ?? 0
  const confirmedOrders = event.orders?.filter((o: any) => o.status === 'CONFIRMED').length ?? 0
  const paidOrders = event.orders?.filter((o: any) => o.paymentStatus === 'PAID' || o.status === 'INVOICED').length ?? 0

  // Derive unique contracts from event orders
  const contractsMap = new Map<string, any>()
  for (const o of (event.orders ?? [])) {
    if (o.contract && !contractsMap.has(o.contract.id)) {
      contractsMap.set(o.contract.id, {
        ...o.contract,
        _orderCount: (event.orders ?? []).filter((x: any) => x.contract?.id === o.contract.id).length,
      })
    }
  }
  const eventContracts = Array.from(contractsMap.values())

  const orderColumns = [
    { title: 'Número', dataIndex: 'orderNumber', key: 'orderNumber', render: (v: string, r: any) => (
      <Button type="link" onClick={() => navigate(`/ordenes/${r.id}`)}>{v}</Button>
    )},
    { title: 'Cliente', key: 'client', render: (_: any, r: any) =>
      r.client?.companyName || `${r.client?.firstName} ${r.client?.lastName}`
    },
    { title: 'Stand', dataIndex: ['stand', 'code'], key: 'stand' },
    { title: 'Organización', key: 'organizacion', render: (_: any, r: any) => r.organizacion ? r.organizacion.descripcion : '—' },
    { title: 'Estado', dataIndex: 'status', key: 'status', render: (v: string) => (
      <Tag color={ORDER_STATUS_COLORS[v]}>{ORDER_STATUS_LABELS[v]}</Tag>
    )},
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'F. Inicio', dataIndex: 'startDate', key: 'startDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—' },
    { title: 'F. Fin', dataIndex: 'endDate', key: 'endDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—' },
    { title: 'Fecha', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YY') },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/eventos')}>Eventos</Button>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap size={4}>
          <Tag color="purple">{event.code}</Tag>
          <Title level={4} style={{ margin: 0 }}>{event.name}</Title>
          <Tag color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</Tag>
        </Space>
        <Space wrap>
          <Select
            value={event.status}
            onChange={updateStatusMutation.mutate}
            loading={updateStatusMutation.isPending}
            style={{ width: 160 }}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <AuditDrawer
            entityType="Event"
            entityId={id!}
            entityName={event.name}
            data={auditData?.data ?? []}
            loading={auditLoading}
          />
          <Button icon={<EditOutlined />} onClick={() => navigate(`/eventos/${id}/editar`)}>Editar</Button>
          <Button icon={<FileOutlined />} onClick={() => setGenerateDocOpen(true)}>Generar Word</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/eventos/${id}/ordenes/nueva`)}>
            Nueva OS
          </Button>
        </Space>
      </div>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}><Statistic title="Total Órdenes" value={event.orders?.length ?? 0} /></Col>
          <Col xs={12} sm={6}><Statistic title="Confirmadas" value={confirmedOrders} /></Col>
          <Col xs={12} sm={6}><Statistic title="Pagadas/Facturadas" value={paidOrders} /></Col>
          <Col xs={12} sm={6}><Statistic title="Valor Total" prefix="$" value={totalOrders.toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
        </Row>

        <Tabs
          items={[
            {
              key: 'spaces',
              label: (
                <Space>
                  <CalendarOutlined />
                  {`Espacios (${spaces.length})`}
                </Space>
              ),
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
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
                        title: 'Fase',
                        dataIndex: 'phase',
                        render: (v: string) => {
                          const cfg: Record<string, { color: string; label: string }> = {
                            SETUP:    { color: 'gold',   label: 'Montaje' },
                            EVENT:    { color: 'blue',   label: 'Evento' },
                            TEARDOWN: { color: 'orange', label: 'Desmontaje' },
                          }
                          return <Tag color={cfg[v]?.color}>{cfg[v]?.label ?? v}</Tag>
                        },
                      },
                      {
                        title: 'Inicio',
                        dataIndex: 'startTime',
                        render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
                      },
                      {
                        title: 'Fin',
                        dataIndex: 'endTime',
                        render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
                      },
                      {
                        title: 'Duración',
                        render: (_: any, r: any) => {
                          const hrs = dayjs(r.endTime).diff(dayjs(r.startTime), 'hour')
                          return hrs >= 24 ? `${Math.round(hrs / 24)} días` : `${hrs}h`
                        },
                      },
                      {
                        title: 'Creación',
                        dataIndex: 'createdAt',
                        render: (v: string) => v ? (
                          <span style={{ fontSize: 12, color: '#64748b' }}>{dayjs(v).format('DD/MM/YY HH:mm')}</span>
                        ) : '—',
                      },
                      {
                        title: 'Notas',
                        dataIndex: 'notes',
                        render: (v: string) => v
                          ? <Tooltip title={v}><span style={{ color: '#64748b', fontSize: 12 }}>{v.slice(0, 40)}{v.length > 40 ? '…' : ''}</span></Tooltip>
                          : '—',
                      },
                      {
                        title: 'Conflictos',
                        key: 'conflicts',
                        render: (_: any, r: any) => {
                          const overlap = overlapMap[r.id]
                          if (!overlap) return <Tag color="green">Sin conflictos</Tag>
                          return (
                            <Tooltip
                              overlayStyle={{ maxWidth: 360 }}
                              overlayInnerStyle={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: 12, padding: '10px 14px' }}
                              title={
                                <div>
                                  <div style={{ fontWeight: 500, marginBottom: 8 }}>Solapamiento con:</div>
                                  {overlap.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                                      <span>• {item.label}</span>
                                      <span style={{ opacity: 0.65, whiteSpace: 'nowrap' }}>
                                        {item.createdAt ? dayjs(item.createdAt).format('DD/MM/YY HH:mm') : '—'}
                                      </span>
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
                        title: '',
                        key: 'actions',
                        render: (_: any, r: any) => (
                          <Space>
                            <Tooltip title="Auditoría">
                              <Button size="small" icon={<AuditOutlined />} onClick={() => setAuditSpace(r)} />
                            </Tooltip>
                            <Button size="small" icon={<EditOutlined />} onClick={() => openSpaceModal(r)} />
                            <Popconfirm
                              title="¿Eliminar esta reserva?"
                              onConfirm={() => deleteSpaceMutation.mutate(r.id)}
                              okText="Sí" cancelText="No"
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} loading={deleteSpaceMutation.isPending} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />

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
                                  {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm')}
                                  {' · '}
                                  {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema'}
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
                                        {' → '}
                                        <span>{String((log.newValues as any)[k])}</span>
                                      </div>
                                    ))}
                                </div>
                              )}
                              {log.action === 'CREATE' && log.newValues && (
                                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                                  {Object.entries(log.newValues as Record<string, any>)
                                    .filter(([, v]) => v !== null && v !== '')
                                    .map(([k, v]) => (
                                      <div key={k}><span style={{ textTransform: 'capitalize' }}>{k}</span>: {String(v)}</div>
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

                  <Modal
                    title={editingSpace ? 'Editar reserva de espacio' : 'Agregar reserva de espacio'}
                    open={spaceModalOpen}
                    onCancel={() => { setSpaceModalOpen(false); setEditingSpace(null); spaceForm.resetFields() }}
                    onOk={() => spaceForm.validateFields().then(saveSpaceMutation.mutate)}
                    confirmLoading={saveSpaceMutation.isPending}
                    okText="Guardar"
                    width={520}
                  >
                    <Form form={spaceForm} layout="vertical" style={{ marginTop: 16 }}>
                      <Form.Item name="resourceId" label="Recurso / Espacio" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          placeholder="Seleccionar recurso"
                          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                          options={allResources.map((r: any) => ({
                            value: r.id,
                            label: `${r.name} (${r.code})`,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item name="phase" label="Fase" rules={[{ required: true }]}>
                        <Select options={[
                          { value: 'SETUP',    label: 'Montaje' },
                          { value: 'EVENT',    label: 'Evento principal' },
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
                </>
              ),
            },
            {
              key: 'info',
              label: 'Información',
              children: (
                <Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }}>
                  <Descriptions.Item label="Cliente">
                    {event.primaryClient?.companyName || `${event.primaryClient?.firstName} ${event.primaryClient?.lastName}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="Lista de Precios">{event.priceList?.name}</Descriptions.Item>
                  <Descriptions.Item label="Montaje">
                    {event.setupStart ? dayjs(event.setupStart).format('DD/MM/YYYY HH:mm') : '—'} →
                    {event.setupEnd ? dayjs(event.setupEnd).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Evento">
                    {event.eventStart ? dayjs(event.eventStart).format('DD/MM/YYYY HH:mm') : '—'} →
                    {event.eventEnd ? dayjs(event.eventEnd).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Desmontaje">
                    {event.teardownStart ? dayjs(event.teardownStart).format('DD/MM/YYYY HH:mm') : '—'} →
                    {event.teardownEnd ? dayjs(event.teardownEnd).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tipo">{event.eventType}</Descriptions.Item>
                  <Descriptions.Item label="Clase">{event.eventClass}</Descriptions.Item>
                  <Descriptions.Item label="Categoría">{event.eventCategory}</Descriptions.Item>
                  <Descriptions.Item label="Notas" span={2}>{event.notes}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'orders',
              label: `Órdenes de Servicio (${event.orders?.length ?? 0})`,
              children: (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 8 }}>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => exportToCsv(`ordenes-${event.code}`, (event.orders ?? []).map((o: any) => ({
                        numero: o.orderNumber,
                        cliente: o.client?.companyName || `${o.client?.firstName} ${o.client?.lastName}`,
                        stand: o.stand?.code ?? '',
                        estado: ORDER_STATUS_LABELS[o.status] ?? o.status,
                        total: Number(o.total).toFixed(2),
                        fecha: dayjs(o.createdAt).format('DD/MM/YYYY'),
                      })), [
                        { header: 'Número', key: 'numero' },
                        { header: 'Cliente', key: 'cliente' },
                        { header: 'Stand', key: 'stand' },
                        { header: 'Estado', key: 'estado' },
                        { header: 'Total', key: 'total' },
                        { header: 'Fecha', key: 'fecha' },
                      ])}
                    >
                      Exportar CSV
                    </Button>
                  </div>
                  <Table
                    dataSource={event.orders ?? []}
                    columns={orderColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                </>
              ),
            },
            ...(eventContracts.length > 0 ? [{
              key: 'contracts',
              label: (
                <Space>
                  <FileProtectOutlined />
                  {`Contratos (${eventContracts.length})`}
                </Space>
              ),
              children: (
                <Table
                  dataSource={eventContracts}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Número', dataIndex: 'contractNumber', width: 150,
                      render: (v: string, r: any) => (
                        <Button type="link" onClick={() => navigate(`/contratos/${r.id}`)}>{v}</Button>
                      ),
                    },
                    { title: 'Descripción', dataIndex: 'description', ellipsis: true },
                    { title: 'Cliente', dataIndex: 'client',
                      render: (c: any) => c?.companyName || `${c?.firstName || ''} ${c?.lastName || ''}`.trim(),
                    },
                    { title: 'Estado', dataIndex: 'status', width: 110,
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
                    { title: 'Monto Total', dataIndex: 'totalAmount', width: 140, align: 'right' as const,
                      render: (v: any) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                    },
                    { title: 'Órdenes', dataIndex: '_orderCount', width: 80, align: 'center' as const },
                    { title: '', key: 'actions', width: 60,
                      render: (_: any, r: any) => (
                        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/contratos/${r.id}`)} />
                      ),
                    },
                  ]}
                />
              ),
            }] : []),
            {
              key: 'stands',
              label: `Stands (${event.stands?.length ?? 0})`,
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={downloadStandsTemplate}
                    >
                      Descargar plantilla
                    </Button>
                    <Upload
                      accept=".csv"
                      showUploadList={false}
                      beforeUpload={handleStandsCsvUpload}
                    >
                      <Button icon={<ImportOutlined />}>Importar CSV</Button>
                    </Upload>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => exportToCsv(`stands-${event.code}`, (event.stands ?? []).map((s: any) => ({
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
                    dataSource={event.stands ?? []}
                    rowKey="id"
                    size="small"
                    columns={[
                      { title: 'Código', dataIndex: 'code' },
                      { title: 'Cliente', render: (_: any, r: any) => r.client?.companyName || `${r.client?.firstName ?? ''} ${r.client?.lastName ?? ''}` },
                      { title: 'Dimensiones', render: (_: any, r: any) => r.widthM ? `${r.widthM}m × ${r.depthM}m` : '—' },
                      { title: 'Alto', render: (_: any, r: any) => r.heightM ? `${r.heightM}m` : '—' },
                      { title: 'Notas ubic.', dataIndex: 'locationNotes', render: (v: string) => v || '—' },
                      { title: 'Órdenes', render: (_: any, r: any) => r._count?.orders ?? 0 },
                    ]}
                  />

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
                </>
              ),
            },
            {
              key: 'documents',
              label: `Documentos (${event.documents?.length ?? 0})`,
              children: (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Upload beforeUpload={handleDocUpload} showUploadList={false}>
                      <Button icon={<UploadOutlined />} loading={docUploading}>Subir documento</Button>
                    </Upload>
                  </div>
                  {(event.documents ?? []).length === 0 ? (
                    <Text type="secondary">Sin documentos adjuntos</Text>
                  ) : (
                    <Row gutter={[12, 12]}>
                      {event.documents.map((doc: any) => (
                        <Col xs={24} sm={12} md={8} key={doc.id}>
                          <Card size="small">
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <Space>
                                <FileOutlined />
                                <div>
                                  <div style={{ fontSize: 13 }}>{doc.fileName}</div>
                                  <Text type="secondary" style={{ fontSize: 11 }}>{doc.documentType}</Text>
                                </div>
                              </Space>
                              <Space>
                                {doc.blobKey && (
                                  <Button
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() => doc.blobKey.startsWith('http')
                                      ? window.open(doc.blobKey, '_blank')
                                      : templatesApi.download(doc.blobKey, doc.fileName)
                                    }
                                  />
                                )}
                                <Popconfirm title="¿Eliminar documento?" onConfirm={() => deleteDocMutation.mutate(doc.id)}>
                                  <Button size="small" danger icon={<DeleteOutlined />} loading={deleteDocMutation.isPending} />
                                </Popconfirm>
                              </Space>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </>
              ),
            },
            {
              key: 'portal',
              label: (
                <Space>
                  <GlobalOutlined />
                  Portal
                  {event.portalEnabled && <Badge status="processing" color="purple" />}
                </Space>
              ),
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Space>
                      <Text>Portal habilitado:</Text>
                      <Switch checked={!!event.portalEnabled} disabled checkedChildren="Sí" unCheckedChildren="No" />
                      {event.portalEnabled && <Tag color="purple">Visible para expositores</Tag>}
                    </Space>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setGenModalOpen(true)}
                      disabled={!['CONFIRMED', 'IN_EXECUTION'].includes(event.status)}
                      title={!['CONFIRMED', 'IN_EXECUTION'].includes(event.status) ? 'Solo para eventos Confirmados o En ejecución' : undefined}
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
                            <Button
                              type="link" size="small" icon={<CopyOutlined />}
                              onClick={() => { navigator.clipboard.writeText(v); message.success('Copiado') }}
                            />
                          </Space>
                        ),
                      },
                      { title: 'Usos', render: (_: any, r: any) => `${r.usedCount} / ${r.maxUses}` },
                      {
                        title: 'Expira', dataIndex: 'expiresAt',
                        render: (v: string) => v ? dayjs(v).format('DD/MM/YY') : '—',
                      },
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
                          (r.usages ?? []).map((u: any) => (
                            <div key={u.id} style={{ fontSize: 12 }}>{u.portalUser?.email}</div>
                          )),
                      },
                      {
                        title: '', render: (_: any, r: any) =>
                          r.isActive && r.usedCount < r.maxUses ? (
                            <Button
                              size="small" danger icon={<StopOutlined />}
                              onClick={() => revokeCodeMutation.mutate(r.id)}
                              loading={revokeCodeMutation.isPending}
                            >
                              Revocar
                            </Button>
                          ) : null,
                      },
                    ]}
                  />

                  <Modal
                    title="Generar códigos de acceso"
                    open={genModalOpen}
                    onCancel={() => setGenModalOpen(false)}
                    onOk={() => genForm.validateFields().then(generateCodesMutation.mutate)}
                    confirmLoading={generateCodesMutation.isPending}
                    okText="Generar"
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
                </>
              ),
            },
            {
              key: 'sport',
              label: (
                <Space>
                  <TrophyOutlined />
                  Portal Deportivo
                </Space>
              ),
              children: (
                <div style={{ maxWidth: 560 }}>
                  <Card size="small" title="Equipos del partido">
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
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder="Seleccionar equipo local..."
                          options={teamClients.map((c: any) => ({
                            value: c.id,
                            label: c.companyName || `${c.firstName} ${c.lastName}`,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item name="sportVisitingTeamId" label="Equipo Visitante">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
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
                    {(event.sportLocalTeamId || event.sportVisitingTeamId) && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Los jugadores de cada equipo se obtienen de las relaciones de tipo "Jugador" del cliente marcado como equipo.
                        </Text>
                      </div>
                    )}
                  </Card>
                </div>
              ),
            },
            {
              key: 'audit',
              label: (
                <Space>
                  <AuditOutlined />
                  Auditoría
                </Space>
              ),
              children: <AuditTimeline data={auditData?.data ?? []} loading={auditLoading} />,
            },
          ]}
        />
      </Card>

      <GenerateDocumentModal
        open={generateDocOpen}
        onClose={() => setGenerateDocOpen(false)}
        context="EVENT"
        entityId={id!}
      />
    </div>
  )
}
