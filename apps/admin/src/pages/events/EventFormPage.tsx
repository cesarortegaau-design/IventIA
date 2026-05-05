import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, Select, DatePicker, Card, Button, Row, Col, Tabs, Space, App, Typography } from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'
import { priceListsApi } from '../../api/priceLists'
import { clientsApi } from '../../api/clients'

const { Title } = Typography

const FIVE_MIN = 5 * 60 * 1000

export default function EventFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const isEdit = !!id

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
    enabled: isEdit,
    initialData: () => queryClient.getQueryData(['event', id]) as any,
    staleTime: FIVE_MIN,
  })

  const { data: priceLists } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => priceListsApi.list(),
    staleTime: FIVE_MIN,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients', { pageSize: 200 }],
    queryFn: () => clientsApi.list({ pageSize: 200, minimal: true }),
    staleTime: FIVE_MIN,
  })

  const event = eventData?.data

  useEffect(() => {
    if (isEdit && event) {
      form.setFieldsValue({
        ...event,
        setupStart: event.setupStart ? dayjs(event.setupStart) : null,
        setupEnd: event.setupEnd ? dayjs(event.setupEnd) : null,
        eventStart: event.eventStart ? dayjs(event.eventStart) : null,
        eventEnd: event.eventEnd ? dayjs(event.eventEnd) : null,
        teardownStart: event.teardownStart ? dayjs(event.teardownStart) : null,
        teardownEnd: event.teardownEnd ? dayjs(event.teardownEnd) : null,
      })
    }
  }, [event?.id])

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        setupStart: values.setupStart?.toISOString(),
        setupEnd: values.setupEnd?.toISOString(),
        eventStart: values.eventStart?.toISOString(),
        eventEnd: values.eventEnd?.toISOString(),
        teardownStart: values.teardownStart?.toISOString(),
        teardownEnd: values.teardownEnd?.toISOString(),
      }
      return isEdit ? eventsApi.update(id!, payload) : eventsApi.create(payload)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', data.data.id] })
      message.success(isEdit ? 'Evento actualizado' : 'Evento creado')
      navigate(`/eventos/${data.data.id}`)
    },
    onError: (err: any) => {
      const details = err?.response?.data?.error?.details?.fieldErrors
      const fieldMsg = details ? Object.entries(details).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' | ') : null
      message.error(fieldMsg ?? err?.response?.data?.error?.message ?? 'Error al guardar el evento')
    },
  })

  const clientOptions = (clients?.data ?? []).map((c: any) => ({
    value: c.id,
    label: c.companyName || `${c.firstName} ${c.lastName}`,
  }))

  const priceListOptions = (priceLists?.data ?? []).map((p: any) => ({
    value: p.id,
    label: p.name,
  }))

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEdit ? `/eventos/${id}` : '/eventos')}>
          {isEdit ? 'Evento' : 'Eventos'}
        </Button>
      </Space>

      <Card
        title={<Title level={4} style={{ margin: 0 }}>{isEdit ? 'Editar Evento' : 'Nuevo Evento'}</Title>}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={() =>
              form.validateFields().catch(() =>
                message.warning('Por favor completa los campos requeridos')
              ).then((values) => {
                if (values) saveMutation.mutate(values)
              })
            }
          >
            Guardar
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Tabs
            items={[
              {
                key: 'general',
                label: 'Edición General',
                children: (
                  <>
                    <Row gutter={16}>
                      <Col xs={16}>
                        <Form.Item name="name" label="Nombre del Evento" rules={[{ required: true }]}>
                          <Input size="large" />
                        </Form.Item>
                      </Col>
                      <Col xs={8}>
                        <Form.Item name="status" label="Estatus">
                          <Select options={[
                            { value: 'QUOTED', label: 'Cotizado' },
                            { value: 'CONFIRMED', label: 'Confirmado' },
                            { value: 'IN_EXECUTION', label: 'En Ejecución' },
                            { value: 'CLOSED', label: 'Cerrado' },
                            { value: 'CANCELLED', label: 'Cancelado' },
                          ]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={12}>
                        <Form.Item name="primaryClientId" label="Cliente">
                          <Select options={clientOptions} showSearch filterOption={(i, o) => String(o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
                        </Form.Item>
                      </Col>
                      <Col xs={12}>
                        <Form.Item name="priceListId" label="Lista de Precios">
                          <Select options={priceListOptions} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Date ranges — 2 columns on all screen sizes */}
                    <Row gutter={16}>
                      <Col xs={12}>
                        <Form.Item label="Inicio Montaje">
                          <Form.Item name="setupStart" noStyle>
                            <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YY HH:mm" placeholder="Inicio" />
                          </Form.Item>
                        </Form.Item>
                      </Col>
                      <Col xs={12}>
                        <Form.Item label="Fin Montaje">
                          <Form.Item name="setupEnd" noStyle>
                            <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YY HH:mm" placeholder="Fin" />
                          </Form.Item>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={12}>
                        <Form.Item label="Inicio Evento">
                          <Form.Item name="eventStart" noStyle>
                            <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YY HH:mm" placeholder="Inicio" />
                          </Form.Item>
                        </Form.Item>
                      </Col>
                      <Col xs={12}>
                        <Form.Item label="Fin Evento">
                          <Form.Item name="eventEnd" noStyle>
                            <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YY HH:mm" placeholder="Fin" />
                          </Form.Item>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={12}>
                        <Form.Item label="Inicio Desmontaje">
                          <Form.Item name="teardownStart" noStyle>
                            <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YY HH:mm" placeholder="Inicio" />
                          </Form.Item>
                        </Form.Item>
                      </Col>
                      <Col xs={12}>
                        <Form.Item label="Fin Desmontaje">
                          <Form.Item name="teardownEnd" noStyle>
                            <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YY HH:mm" placeholder="Fin" />
                          </Form.Item>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={16}>
                        <Form.Item name="venue" label="Venue / Lugar">
                          <Input placeholder="Nombre del recinto" />
                        </Form.Item>
                      </Col>
                      <Col xs={8}>
                        <Form.Item name="expectedAttendance" label="Asistentes esperados">
                          <Input type="number" min={0} placeholder="0" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="notes" label="Notas">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'advanced',
                label: 'Edición Avanzada',
                children: (
                  <Row gutter={16}>
                    <Col xs={12} md={8}>
                      <Form.Item name="eventType" label="Tipo">
                        <Select options={['Cultural', 'Corporativo', 'Social', 'Educativo', 'Deportivo'].map(v => ({ value: v, label: v }))} allowClear />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item name="eventClass" label="Clase">
                        <Select options={['Feria', 'Congreso', 'Presentación', 'Ceremonia', 'Expo'].map(v => ({ value: v, label: v }))} allowClear />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item name="eventCategory" label="Categoría">
                        <Select options={['Grande', 'Mediano', 'Pequeño'].map(v => ({ value: v, label: v }))} allowClear />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item name="coordinator" label="Coordinador">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item name="executive" label="Ejecutivo">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'portal',
                label: 'Portal',
                children: (
                  <>
                    <Form.Item name={['portalSettings', 'description']} label="Descripción de Evento">
                      <Input.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="portalEnabled" label="Visible en Portal" valuePropName="checked">
                      <Select options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]} style={{ width: 100 }} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Card>
    </div>
  )
}
