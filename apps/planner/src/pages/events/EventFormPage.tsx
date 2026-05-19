import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Form, Input, Button, Select, DatePicker, InputNumber, Card, Typography,
  Row, Col, Spin, App,
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'
import { clientsApi } from '../../api/clients'

const { Title, Text } = Typography

const EVENT_STATUS_OPTIONS = [
  { value: 'QUOTED', label: 'Cotizado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_EXECUTION', label: 'En ejecución' },
  { value: 'CLOSED', label: 'Cerrado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const EVENT_TYPE_OPTIONS = [
  { value: 'WEDDING', label: 'Boda' },
  { value: 'CORPORATE', label: 'Corporativo' },
  { value: 'BIRTHDAY', label: 'Cumpleaños' },
  { value: 'GALA', label: 'Gala / Cena' },
  { value: 'CONFERENCE', label: 'Conferencia' },
  { value: 'CONCERT', label: 'Concierto' },
  { value: 'EXHIBITION', label: 'Exposición' },
  { value: 'OTHER', label: 'Otro' },
]

export default function EventFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const isEdit = !!id
  const [form] = Form.useForm()

  const { data: eventData, isLoading: loadingEvent } = useQuery({
    queryKey: ['planner-event', id],
    queryFn: () => eventsApi.get(id!),
    enabled: isEdit,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['planner-clients-select'],
    queryFn: () => clientsApi.list({ pageSize: 200 }),
  })

  const clients: any[] = clientsData?.data || []

  useEffect(() => {
    if (eventData?.data && isEdit) {
      const ev = eventData.data
      form.setFieldsValue({
        name: ev.name,
        description: ev.description,
        status: ev.status,
        eventType: ev.eventType,
        venueLocation: ev.venueLocation,
        expectedAttendees: ev.expectedAttendees,
        primaryClientId: ev.primaryClientId,
        eventStart: ev.eventStart ? dayjs(ev.eventStart) : undefined,
        eventEnd: ev.eventEnd ? dayjs(ev.eventEnd) : undefined,
      })
    }
  }, [eventData, isEdit, form])

  const createMutation = useMutation({
    mutationFn: (data: any) => eventsApi.create(data),
    onSuccess: (res) => {
      message.success('Evento creado')
      navigate(`/eventos/${res.data.id}`)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Error al crear el evento')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => eventsApi.update(id!, data),
    onSuccess: () => {
      message.success('Evento actualizado')
      navigate(`/eventos/${id}`)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Error al actualizar el evento')
    },
  })

  const onFinish = (vals: any) => {
    const payload = {
      ...vals,
      eventStart: vals.eventStart?.toISOString(),
      eventEnd: vals.eventEnd?.toISOString(),
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  if (isEdit && loadingEvent) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEdit ? `/eventos/${id}` : '/eventos')} />
        <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
          {isEdit ? 'Editar evento' : 'Nuevo evento'}
        </Title>
      </div>

      <Card style={{ borderRadius: 20, border: '1px solid var(--pl-border)', boxShadow: 'var(--pl-shadow)' }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'QUOTED' }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Nombre del evento" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Ej: Boda García - López" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="eventType" label="Tipo de evento">
                <Select options={EVENT_TYPE_OPTIONS} placeholder="Selecciona tipo" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="status" label="Estado">
                <Select options={EVENT_STATUS_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="primaryClientId" label="Cliente principal">
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Buscar cliente..."
                  options={clients.map((c) => ({
                    value: c.id,
                    label: c.companyName || `${c.firstName} ${c.lastName}`,
                  }))}
                  allowClear
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="venueLocation" label="Lugar / Sede">
                <Input placeholder="Ej: Salón Gran Vitoria" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="eventStart" label="Inicio del evento">
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" placeholder="Fecha y hora de inicio" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="eventEnd" label="Fin del evento">
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" placeholder="Fecha y hora de fin" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="expectedAttendees" label="Asistentes esperados">
                <InputNumber style={{ width: '100%' }} min={1} placeholder="0" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="description" label="Descripción / Notas">
                <Input.TextArea rows={4} placeholder="Detalles, requerimientos especiales, observaciones..." />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button onClick={() => navigate(isEdit ? `/eventos/${id}` : '/eventos')}>
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isPending}
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              {isEdit ? 'Guardar cambios' : 'Crear evento'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}
