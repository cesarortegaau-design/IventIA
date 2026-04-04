import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Typography, Tag, Descriptions, Button, Row, Col, Table, Space, Skeleton, Tabs
} from 'antd'
import { ShoppingCartOutlined, ArrowLeftOutlined, FileOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_EXECUTION: 'orange', CLOSED: 'default', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}

export default function EventPortalPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['portal-event', eventId],
    queryFn: () => eventsApi.get(eventId!),
  })

  const event = data?.data?.data

  if (isLoading) return <Skeleton active />
  if (!event) return null

  const settings: any = event.portalSettings ?? {}

  const standColumns = [
    { title: 'Código', dataIndex: 'code' },
    { title: 'Cliente', render: (_: any, r: any) => r.client?.companyName || `${r.client?.firstName ?? ''} ${r.client?.lastName ?? ''}` },
    { title: 'Dimensiones', render: (_: any, r: any) => r.widthM ? `${r.widthM}m × ${r.depthM}m` : '—' },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>Mis Eventos</Button>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <Space wrap size={4}>
          <Tag color="purple">{event.code}</Tag>
          <Title level={4} style={{ margin: 0 }}>{event.name}</Title>
          <Tag color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</Tag>
        </Space>
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          onClick={() => navigate(`/events/${eventId}/new-order`)}
        >
          Nueva Solicitud
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'info',
            label: 'Información del Evento',
            children: (
              <>
                {settings.description && (
                  <Card style={{ marginBottom: 16 }}>
                    <Text>{settings.description}</Text>
                  </Card>
                )}
                <Descriptions bordered column={{ xs: 1, sm: 2 }}>
                  {event.venueLocation && (
                    <Descriptions.Item label="Recinto" span={2}>{event.venueLocation}</Descriptions.Item>
                  )}
                  <Descriptions.Item label="Inicio montaje">
                    {event.setupStart ? dayjs(event.setupStart).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Fin montaje">
                    {event.setupEnd ? dayjs(event.setupEnd).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Inicio evento">
                    {event.eventStart ? dayjs(event.eventStart).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Fin evento">
                    {event.eventEnd ? dayjs(event.eventEnd).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Inicio desmontaje">
                    {event.teardownStart ? dayjs(event.teardownStart).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Fin desmontaje">
                    {event.teardownEnd ? dayjs(event.teardownEnd).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                  {event.priceList && (
                    <Descriptions.Item label="Lista de precios">{event.priceList.name}</Descriptions.Item>
                  )}
                </Descriptions>
              </>
            ),
          },
          {
            key: 'stands',
            label: `Stands (${event.stands?.length ?? 0})`,
            children: (
              <Table
                dataSource={event.stands ?? []}
                columns={standColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            ),
          },
          {
            key: 'documents',
            label: `Documentos (${event.documents?.length ?? 0})`,
            children: (
              <Row gutter={[12, 12]}>
                {(event.documents ?? []).length === 0 ? (
                  <Col span={24}><Text type="secondary">Sin documentos adjuntos</Text></Col>
                ) : (
                  event.documents.map((doc: any) => (
                    <Col xs={24} sm={12} md={8} key={doc.id}>
                      <Card size="small">
                        <Space>
                          <FileOutlined />
                          <div>
                            <div>{doc.fileName}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{doc.documentType}</Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))
                )}
              </Row>
            ),
          },
        ]}
      />
    </div>
  )
}
