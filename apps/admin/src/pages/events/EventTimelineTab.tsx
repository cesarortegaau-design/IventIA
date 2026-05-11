import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App, Button, Table, Tag, Space, Popconfirm, Select, Upload, Modal,
  DatePicker, Drawer, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined,
  ImportOutlined, BarChartOutlined, AuditOutlined, FilterOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventActivitiesApi } from '../../api/eventActivities'
import { eventSpacesApi } from '../../api/eventSpaces'
import { eventsApi } from '../../api/events'
import { usersApi } from '../../api/users'
import { resourcesApi } from '../../api/resources'
import { auditApi } from '../../api/audit'
import ActivityFormModal from './modals/ActivityFormModal'
import AuditTimeline from '../../components/AuditTimeline'
import { T } from '../../styles/tokens'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En Progreso',
  DONE:        'Listo',
  CANCELLED:   'Cancelado',
  BLOCKED:     'Bloqueado',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'default',
  IN_PROGRESS: 'processing',
  DONE:        'success',
  CANCELLED:   'error',
  BLOCKED:     'warning',
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  TASK:      'Tarea',
  MILESTONE: 'Hito',
  PHASE:     'Fase',
  MEETING:   'Reunión',
  REHEARSAL: 'Ensayo',
  LOGISTICS: 'Logística',
  CATERING:  'Catering',
  TECHNICAL: 'Técnico',
  SECURITY:  'Seguridad',
  CUSTOM:    'Personalizado',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW:      'Baja',
  MEDIUM:   'Media',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW:      'default',
  MEDIUM:   'blue',
  HIGH:     'orange',
  CRITICAL: 'red',
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCsv(text: string): any[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    return {
      position:     row['posicion']       !== undefined ? Number(row['posicion'])    : undefined,
      title:        row['titulo']         || '',
      activityType: row['tipo']           || undefined,
      status:       row['estado']         || 'PENDING',
      priority:     row['prioridad']      || undefined,
      startDate:    row['fecha_inicio']   || undefined,
      endDate:      row['fecha_fin']      || undefined,
      durationMins: row['duracion_min'] !== '' && row['duracion_min'] !== undefined ? Number(row['duracion_min']) : undefined,
      notes:        row['notas']          || undefined,
    }
  }).filter(r => r.title)
}

// ── Flatten tree helpers ──────────────────────────────────────────────────────

function flattenActivities(activities: any[]): any[] {
  const result: any[] = []
  for (const act of activities) {
    result.push(act)
    if (act.children?.length) {
      for (const child of act.children) {
        result.push({ ...child, _isChild: true })
      }
    }
  }
  return result
}

// ── Gantt bar chart ───────────────────────────────────────────────────────────

function GanttView({ activities, event }: { activities: any[]; event: any }) {
  const withDates = activities.filter(a => a.startDate && a.endDate)

  const { rangeStart, totalMs } = useMemo(() => {
    const eventStart = event?.eventStart ? dayjs(event.eventStart) : null
    const eventEnd   = event?.eventEnd   ? dayjs(event.eventEnd)   : null

    let start = eventStart
    let end   = eventEnd

    for (const a of withDates) {
      const s = dayjs(a.startDate)
      const e = dayjs(a.endDate)
      if (!start || s.isBefore(start)) start = s
      if (!end   || e.isAfter(end))    end   = e
    }

    if (!start || !end || end.diff(start) <= 0) {
      return { rangeStart: dayjs(), totalMs: 1 }
    }

    return { rangeStart: start, totalMs: end.diff(start) }
  }, [withDates, event])

  if (withDates.length === 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 10, padding: 48, border: `1px solid ${T.border}`,
        textAlign: 'center', color: T.textMuted, fontSize: 13,
      }}>
        <BarChartOutlined style={{ fontSize: 36, color: T.textDim, marginBottom: 12, display: 'block' }} />
        No hay actividades con fechas para mostrar en el Gantt.
      </div>
    )
  }

  const TITLE_W = 200
  const ROW_H   = 32
  const BAR_H   = 20

  return (
    <div style={{
      background: 'white', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: TITLE_W + 600 }}>

          {/* Fixed title column */}
          <div style={{ width: TITLE_W, flexShrink: 0, borderRight: `1px solid ${T.border}` }}>
            <div style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${T.border}`, background: T.bg, fontSize: 12, fontWeight: 600, color: T.textMuted }}>
              Actividad
            </div>
            {withDates.map(a => (
              <div
                key={a.id}
                style={{
                  height: ROW_H,
                  display: 'flex', alignItems: 'center',
                  padding: '0 12px',
                  borderBottom: `1px solid ${T.border}`,
                  fontSize: 12,
                  paddingLeft: a._isChild || a.parentId ? 24 : 12,
                  color: T.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {a.title}
              </div>
            ))}
          </div>

          {/* Scrollable bars column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: ROW_H, background: T.bg, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 11, color: T.textMuted, gap: 0, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8 }}>{rangeStart.format('DD MMM')}</span>
              <span style={{ position: 'absolute', right: 8 }}>{rangeStart.add(totalMs, 'ms').format('DD MMM')}</span>
            </div>
            {withDates.map(a => {
              const start  = dayjs(a.startDate)
              const end    = dayjs(a.endDate)
              const left   = ((start.diff(rangeStart)) / totalMs) * 100
              const width  = Math.max(((end.diff(start)) / totalMs) * 100, 0.5)
              const color  = a.color || '#3B82F6'
              return (
                <div
                  key={a.id}
                  style={{ height: ROW_H, position: 'relative', borderBottom: `1px solid ${T.border}`, background: 'white' }}
                >
                  <div
                    title={`${a.title}\n${start.format('DD/MM/YY HH:mm')} → ${end.format('DD/MM/YY HH:mm')}`}
                    style={{
                      position: 'absolute',
                      left:   `${Math.max(0, left)}%`,
                      width:  `${Math.min(width, 100 - Math.max(0, left))}%`,
                      top:    `${(ROW_H - BAR_H) / 2}px`,
                      height: BAR_H,
                      background: color,
                      opacity: 0.85,
                      borderRadius: 4,
                      display: 'flex', alignItems: 'center',
                      paddingLeft: 6,
                      fontSize: 11,
                      color: 'white',
                      fontWeight: 500,
                      overflow: 'hidden', whiteSpace: 'nowrap',
                      cursor: 'default',
                    }}
                  >
                    {width > 3 ? a.title : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  eventId: string
  event: any
  activeTab: string
}

export default function EventTimelineTab({ eventId, event, activeTab }: Props) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView]                       = useState<'list' | 'gantt'>('list')
  const [statusFilter, setStatusFilter]       = useState<string | undefined>(undefined)
  const [modalOpen, setModalOpen]             = useState(false)
  const [pdfLoading, setPdfLoading]           = useState(false)
  const [editingActivity, setEditingActivity] = useState<any>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [importPreview, setImportPreview]     = useState<any[] | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Filters
  const [filterDateRange, setFilterDateRange]   = useState<[any, any] | null>(null)
  const [filterDeptIds, setFilterDeptIds]       = useState<string[]>([])
  const [filterAssignedId, setFilterAssignedId] = useState<string | undefined>(undefined)
  const [filtersVisible, setFiltersVisible]     = useState(false)

  // Audit drawer
  const [auditActivity, setAuditActivity]   = useState<any>(null)
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['event-activities', eventId],
    queryFn: () => eventActivitiesApi.list(eventId),
    enabled: activeTab === 'timeline',
    staleTime: 30_000,
  })
  const activities: any[] = activitiesData?.data ?? []

  const { data: spacesData } = useQuery({
    queryKey: ['event-spaces', eventId],
    queryFn: () => eventSpacesApi.list(eventId),
    enabled: activeTab === 'timeline',
    staleTime: 60_000,
  })
  const spaces: any[] = spacesData?.data ?? []

  const { data: ordersData } = useQuery({
    queryKey: ['event-orders', eventId],
    queryFn: () => eventsApi.getOrders(eventId),
    enabled: activeTab === 'timeline',
    staleTime: 60_000,
  })
  const orders: any[] = ordersData?.data ?? []

  const { data: usersData } = useQuery({
    queryKey: ['users-assignable'],
    queryFn: () => usersApi.listAssignable(),
    staleTime: 5 * 60_000,
  })
  const users: any[] = usersData?.data ?? []

  const { data: depsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => resourcesApi.listDepartments(),
    staleTime: 5 * 60_000,
  })
  const departments: any[] = depsData ?? []

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['activity-audit', auditActivity?.id],
    queryFn: () => auditApi.getLog('EventActivity', auditActivity!.id),
    enabled: !!auditActivity?.id && auditDrawerOpen,
  })

  // ── Mutations ───────────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['event-activities', eventId] })

  const createMutation = useMutation({
    mutationFn: (data: any) => eventActivitiesApi.create(eventId, data),
    onSuccess: () => { invalidate(); setModalOpen(false); message.success('Actividad creada') },
    onError: () => message.error('Error al crear actividad'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => eventActivitiesApi.update(eventId, id, data),
    onSuccess: () => { invalidate(); setModalOpen(false); setEditingActivity(null); message.success('Actividad actualizada') },
    onError: () => message.error('Error al actualizar actividad'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventActivitiesApi.remove(eventId, id),
    onSuccess: () => { invalidate(); message.success('Actividad eliminada') },
    onError: () => message.error('Error al eliminar actividad'),
  })

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => eventActivitiesApi.importCsv(eventId, rows),
    onSuccess: (res) => {
      invalidate()
      setImportModalOpen(false)
      setImportPreview(null)
      message.success(`${res?.data?.imported ?? 'Actividades'} importadas`)
    },
    onError: () => message.error('Error al importar actividades'),
  })

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSave(values: any) {
    if (editingActivity?.id) {
      updateMutation.mutate({ id: editingActivity.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  function openCreate() {
    setEditingActivity(null)
    setModalOpen(true)
  }

  function openEdit(record: any) {
    setEditingActivity(record)
    setModalOpen(true)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditingActivity(null)
  }

  async function handleExportCsv() {
    try {
      const blob = await eventActivitiesApi.exportCsv(eventId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `actividades-${eventId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Error al exportar CSV')
    }
  }

  function handleDownloadTemplate() {
    const content = 'posicion,titulo,tipo,estado,prioridad,fecha_inicio,fecha_fin,duracion_min,notas\n1,Montaje de sonido,TECHNICAL,PENDING,HIGH,,360,Incluye prueba de micrófono\n'
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-actividades.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadPdf() {
    setPdfLoading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { EventTimelinePdf } = await import('../../components/EventTimelinePdf')
      const blob = await pdf(<EventTimelinePdf activities={activities} event={event} />).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `timeline-${event?.name ?? eventId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      message.error('Error al generar PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCsv(text)
      if (!rows.length) { message.error('El CSV no contiene filas válidas'); return }
      setImportPreview(rows)
      setImportModalOpen(true)
    }
    reader.readAsText(file)
    return false // prevent auto-upload
  }

  // ── Derived / filtered data ─────────────────────────────────────────────────
  const flatActivities = useMemo(() => flattenActivities(activities), [activities])

  const filteredFlat = useMemo(() => {
    return flatActivities.filter(a => {
      if (statusFilter && a.status !== statusFilter) return false
      if (filterAssignedId && a.assignedToId !== filterAssignedId) return false
      if (filterDeptIds.length > 0) {
        const actDeptIds = (a.activityDepartments ?? []).map((d: any) => d.departmentId ?? d.department?.id)
        if (!filterDeptIds.some(id => actDeptIds.includes(id))) return false
      }
      if (filterDateRange?.[0] && filterDateRange?.[1]) {
        const start = filterDateRange[0]
        const end   = filterDateRange[1]
        if (a.startDate && dayjs(a.startDate).isAfter(end))   return false
        if (a.endDate   && dayjs(a.endDate).isBefore(start))  return false
      }
      return true
    })
  }, [flatActivities, statusFilter, filterAssignedId, filterDeptIds, filterDateRange])

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#',
      dataIndex: 'position',
      key: 'position',
      width: 48,
      render: (v: number) => <span style={{ color: T.textMuted, fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      render: (v: string, r: any) => (
        <span style={{ paddingLeft: r._isChild || r.parentId ? 16 : 0, fontWeight: r._isChild ? 400 : 500 }}>
          {v}
        </span>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'activityType',
      key: 'activityType',
      width: 110,
      render: (v: string) => v ? <Tag>{ACTIVITY_TYPE_LABELS[v] ?? v}</Tag> : '—',
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: string) => v ? <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] ?? v}</Tag> : '—',
    },
    {
      title: 'Prioridad',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (v: string) => v ? <Tag color={PRIORITY_COLORS[v]}>{PRIORITY_LABELS[v] ?? v}</Tag> : '—',
    },
    {
      title: 'Fecha Inicio',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 130,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
    },
    {
      title: 'Fecha Fin',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 130,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
    },
    {
      title: 'Duración',
      dataIndex: 'durationMins',
      key: 'durationMins',
      width: 90,
      render: (v: number) => {
        if (!v) return '—'
        if (v >= 60) return `${Math.round(v / 60)}h ${v % 60 > 0 ? `${v % 60}m` : ''}`.trim()
        return `${v}m`
      },
    },
    {
      title: 'Asignado',
      key: 'assignedTo',
      width: 130,
      render: (_: any, r: any) => r.assignedTo
        ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}`
        : '—',
    },
    {
      title: 'Espacio',
      key: 'space',
      width: 130,
      render: (_: any, r: any) => r.space
        ? `${r.space.resource?.name ?? '—'} - ${r.space.phase}`
        : '—',
    },
    {
      title: 'Órdenes',
      key: 'orders',
      render: (_: any, r: any) => {
        const actOrders = r.activityOrders ?? []
        if (actOrders.length === 0) return r.order ? <Tag>{r.order.orderNumber}</Tag> : '—'
        return (
          <Space size={2} wrap>
            {actOrders.map((ao: any) => <Tag key={ao.id}>{ao.order?.orderNumber}</Tag>)}
          </Space>
        )
      },
    },
    {
      title: 'Departamentos',
      key: 'depts',
      render: (_: any, r: any) => {
        const depts = r.activityDepartments ?? []
        if (depts.length === 0) return '—'
        return (
          <Space size={2} wrap>
            {depts.map((d: any) => <Tag key={d.id}>{d.department?.name}</Tag>)}
          </Space>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Auditoría" key="audit">
            <Button
              size="small"
              icon={<AuditOutlined />}
              onClick={() => { setAuditActivity(r); setAuditDrawerOpen(true) }}
            />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="¿Eliminar esta actividad?"
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div style={{
        background: 'white', borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.border}`,
        marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        {/* Left */}
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nueva Actividad
          </Button>
          <Button.Group>
            <Button
              type={view === 'list' ? 'primary' : 'default'}
              size="small"
              onClick={() => setView('list')}
            >
              Lista
            </Button>
            <Button
              type={view === 'gantt' ? 'primary' : 'default'}
              size="small"
              onClick={() => setView('gantt')}
            >
              Gantt
            </Button>
          </Button.Group>
        </Space>

        {/* Right */}
        <Space>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            placeholder="Todos los estados"
            style={{ width: 180 }}
            options={[
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFiltersVisible(v => !v)}
            type={filtersVisible ? 'primary' : 'default'}
          >
            Filtros
          </Button>
          <Upload
            accept=".csv"
            showUploadList={false}
            beforeUpload={handleCsvFile}
          >
            <Button icon={<ImportOutlined />}>Importar CSV</Button>
          </Upload>
          <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={handleDownloadPdf}>
            Imprimir PDF
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
            Exportar CSV
          </Button>
          <Button type="text" onClick={handleDownloadTemplate}>
            Descargar plantilla
          </Button>
        </Space>
      </div>

      {/* Filter panel */}
      {filtersVisible && (
        <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 8, marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <DatePicker.RangePicker
            placeholder={['Fecha inicio', 'Fecha fin']}
            onChange={v => setFilterDateRange(v as any)}
            style={{ minWidth: 240 }}
            allowClear
          />
          <Select
            mode="multiple"
            placeholder="Departamentos"
            allowClear
            style={{ minWidth: 200 }}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            onChange={v => setFilterDeptIds(v)}
          />
          <Select
            showSearch
            allowClear
            placeholder="Asignado a"
            optionFilterProp="label"
            style={{ minWidth: 180 }}
            options={users.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
            onChange={v => setFilterAssignedId(v)}
          />
          <Button
            size="small"
            onClick={() => { setFilterDateRange(null); setFilterDeptIds([]); setFilterAssignedId(undefined) }}
          >
            Limpiar
          </Button>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div style={{ background: 'white', borderRadius: 10, border: `1px solid ${T.border}` }}>
          <Table
            dataSource={filteredFlat}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{ pageSize: 50, showSizeChanger: true }}
            scroll={{ x: 'max-content' }}
            expandable={{
              expandedRowKeys,
              onExpand: (expanded, record) => {
                setExpandedRowKeys(expanded
                  ? [...expandedRowKeys, record.id]
                  : expandedRowKeys.filter(k => k !== record.id)
                )
              },
              rowExpandable: (r) => (r.children?.length ?? 0) > 0,
            }}
          />
        </div>
      )}

      {/* Gantt view */}
      {view === 'gantt' && (
        <GanttView activities={filteredFlat} event={event} />
      )}

      {/* Activity form modal */}
      <ActivityFormModal
        open={modalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        initialValues={editingActivity}
        loading={createMutation.isPending || updateMutation.isPending}
        spaces={spaces}
        orders={orders}
        users={users}
        departments={departments}
        activities={flatActivities}
        showCrmOption
        eventId={eventId}
      />

      {/* CSV Import preview modal */}
      <Modal
        title="Vista previa de importación"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); setImportPreview(null) }}
        onOk={() => importPreview && importMutation.mutate(importPreview)}
        confirmLoading={importMutation.isPending}
        okText={`Importar ${importPreview?.length ?? 0} actividad(es)`}
        cancelText="Cancelar"
        width={760}
      >
        <p style={{ marginBottom: 12, color: T.textMuted, fontSize: 13 }}>
          Las actividades serán creadas en el evento. Revise los datos antes de confirmar.
        </p>
        <Table
          dataSource={importPreview ?? []}
          rowKey={(r, i) => String(i)}
          size="small"
          pagination={false}
          scroll={{ y: 320, x: 'max-content' }}
          columns={[
            { title: '#', dataIndex: 'position', width: 48, render: (v: any) => v ?? '—' },
            { title: 'Título', dataIndex: 'title' },
            { title: 'Tipo', dataIndex: 'activityType', render: (v: string) => v ? (ACTIVITY_TYPE_LABELS[v] ?? v) : '—' },
            { title: 'Estado', dataIndex: 'status', render: (v: string) => v ? (STATUS_LABELS[v] ?? v) : '—' },
            { title: 'Prioridad', dataIndex: 'priority', render: (v: string) => v ? (PRIORITY_LABELS[v] ?? v) : '—' },
            { title: 'Fecha inicio', dataIndex: 'startDate', render: (v: string) => v || '—' },
            { title: 'Fecha fin', dataIndex: 'endDate', render: (v: string) => v || '—' },
            { title: 'Duración (min)', dataIndex: 'durationMins', render: (v: any) => v ?? '—' },
            { title: 'Notas', dataIndex: 'notes', render: (v: string) => v || '—' },
          ]}
        />
      </Modal>

      {/* Audit drawer */}
      <Drawer
        title={`Auditoría: ${auditActivity?.title ?? ''}`}
        open={auditDrawerOpen}
        onClose={() => { setAuditDrawerOpen(false); setAuditActivity(null) }}
        width={480}
      >
        <AuditTimeline data={auditData?.data ?? []} loading={auditLoading} />
      </Drawer>
    </div>
  )
}
