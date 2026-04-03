import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Row, Col, Tag, Button, Descriptions, Table, Space, Statistic,
  Tabs, App, Select, Typography, Divider, InputNumber, Form, DatePicker, Modal, Switch, Badge
} from 'antd'
import { EditOutlined, PlusOutlined, ArrowLeftOutlined, CopyOutlined, StopOutlined, GlobalOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'
import { portalCodesApi } from '../../api/portalCodes'

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

      <Card
        title={
          <Space>
            <Tag color="purple">{event.code}</Tag>
            <Title level={4} style={{ margin: 0 }}>{event.name}</Title>
            <Tag color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</Tag>
          </Space>
        }
        extra={
          <Space>
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
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}><Statistic title="Total Órdenes" value={event.orders?.length ?? 0} /></Col>
          <Col span={6}><Statistic title="Confirmadas" value={confirmedOrders} /></Col>
          <Col span={6}><Statistic title="Pagadas/Facturadas" value={paidOrders} /></Col>
          <Col span={6}><Statistic title="Valor Total" prefix="$" value={totalOrders.toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
        </Row>

        <Tabs
          items={[
            {
              key: 'info',
              label: 'Información',
              children: (
                <Descriptions bordered column={2}>
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
                <Table
                  dataSource={event.orders ?? []}
                  columns={orderColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              ),
            },
            {
              key: 'stands',
              label: `Stands (${event.stands?.length ?? 0})`,
              children: (
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
