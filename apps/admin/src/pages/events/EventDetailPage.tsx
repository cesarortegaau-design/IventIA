import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Row, Col, Tag, Button, Descriptions, Table, Space, Statistic,
  Tabs, App, Select, Typography, Divider, InputNumber, Form, DatePicker, Modal, Switch, Badge,
  Tooltip, Popconfirm, Input,
} from 'antd'
import { EditOutlined, PlusOutlined, ArrowLeftOutlined, CopyOutlined, StopOutlined, GlobalOutlined, DownloadOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'
import { portalCodesApi } from '../../api/portalCodes'
import { eventSpacesApi } from '../../api/eventSpaces'
import { resourcesApi } from '../../api/resources'
import { exportToCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_EXECUTION: 'orange', CLOSED: 'default', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}
const ORDER_STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_PAYMENT: 'orange', PAID: 'purple', INVOICED: 'cyan', CANCELLED: 'red',
}
const ORDER_STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', IN_PAYMENT: 'En Pago', PAID: 'Pagada', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
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

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
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

  const { data: resourcesData } = useQuery({
    queryKey: ['resources-all'],
    queryFn: () => resourcesApi.list({ pageSize: 500, isActive: true }),
  })
  const allResources = resourcesData?.data ?? []

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
  const paidOrders = event.orders?.filter((o: any) => o.status === 'PAID' || o.status === 'INVOICED').length ?? 0

  const orderColumns = [
    { title: 'Número', dataIndex: 'orderNumber', key: 'orderNumber', render: (v: string, r: any) => (
      <Button type="link" onClick={() => navigate(`/ordenes/${r.id}`)}>{v}</Button>
    )},
    { title: 'Cliente', key: 'client', render: (_: any, r: any) =>
      r.client?.companyName || `${r.client?.firstName} ${r.client?.lastName}`
    },
    { title: 'Stand', dataIndex: ['stand', 'code'], key: 'stand' },
    { title: 'Estado', dataIndex: 'status', key: 'status', render: (v: string) => (
      <Tag color={ORDER_STATUS_COLORS[v]}>{ORDER_STATUS_LABELS[v]}</Tag>
    )},
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
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
          <Button icon={<EditOutlined />} onClick={() => navigate(`/eventos/${id}/editar`)}>Editar</Button>
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
                        title: 'Notas',
                        dataIndex: 'notes',
                        render: (v: string) => v
                          ? <Tooltip title={v}><span style={{ color: '#64748b', fontSize: 12 }}>{v.slice(0, 40)}{v.length > 40 ? '…' : ''}</span></Tooltip>
                          : '—',
                      },
                      {
                        title: '',
                        key: 'actions',
                        render: (_: any, r: any) => (
                          <Space>
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
            {
              key: 'stands',
              label: `Stands (${event.stands?.length ?? 0})`,
              children: (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 8 }}>
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
                      { title: 'Órdenes', render: (_: any, r: any) => r._count?.orders ?? 0 },
                    ]}
                  />
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
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenModalOpen(true)}>
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
          ]}
        />
      </Card>
    </div>
  )
}
