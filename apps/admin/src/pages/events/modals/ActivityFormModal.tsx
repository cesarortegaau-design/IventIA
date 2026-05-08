import { useEffect } from 'react'
import {
  Modal, Form, Input, Select, DatePicker, InputNumber, Switch, Row, Col,
} from 'antd'
import dayjs from 'dayjs'

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'TASK',      label: 'Tarea' },
  { value: 'MILESTONE', label: 'Hito' },
  { value: 'PHASE',     label: 'Fase' },
  { value: 'MEETING',   label: 'Reunión' },
  { value: 'REHEARSAL', label: 'Ensayo' },
  { value: 'LOGISTICS', label: 'Logística' },
  { value: 'CATERING',  label: 'Catering' },
  { value: 'TECHNICAL', label: 'Técnico' },
  { value: 'SECURITY',  label: 'Seguridad' },
  { value: 'CUSTOM',    label: 'Personalizado' },
]

const STATUS_OPTIONS = [
  { value: 'PENDING',     label: 'Pendiente' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'DONE',        label: 'Listo' },
  { value: 'CANCELLED',   label: 'Cancelado' },
  { value: 'BLOCKED',     label: 'Bloqueado' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW',      label: 'Baja' },
  { value: 'MEDIUM',   label: 'Media' },
  { value: 'HIGH',     label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
]

interface ActivityFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: any) => void
  initialValues?: any
  loading?: boolean
  spaces: any[]
  orders: any[]
  users: any[]
  activities: any[]
  showCrmOption?: boolean
}

export default function ActivityFormModal({
  open, onClose, onSave, initialValues, loading,
  spaces, orders, users, activities, showCrmOption,
}: ActivityFormModalProps) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        startDate: initialValues.startDate ? dayjs(initialValues.startDate) : undefined,
        endDate:   initialValues.endDate   ? dayjs(initialValues.endDate)   : undefined,
        // If the activity already has a linked CRM task, show the switch as on
        autoCreateCrmTask: initialValues.autoCreateCrmTask ?? !!initialValues.crmTaskId,
      })
    } else {
      form.resetFields()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.id])

  function handleOk() {
    form.validateFields().then(values => {
      const payload = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
        endDate:   values.endDate   ? values.endDate.toISOString()   : undefined,
      }
      onSave(payload)
    })
  }

  const parentOptions = activities
    .filter(a => a.id !== initialValues?.id)
    .map(a => ({ value: a.id, label: a.title }))

  return (
    <Modal
      title={initialValues?.id ? 'Editar actividad' : 'Nueva actividad'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Guardar"
      cancelText="Cancelar"
      width={640}
      forceRender
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>

        <Form.Item name="title" label="Título" rules={[{ required: true, message: 'El título es requerido' }]}>
          <Input placeholder="Ej. Montaje de sonido" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="activityType" label="Tipo">
              <Select options={ACTIVITY_TYPE_OPTIONS} placeholder="Seleccionar tipo" allowClear />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="status" label="Estado">
              <Select options={STATUS_OPTIONS} placeholder="Pendiente" allowClear />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="priority" label="Prioridad">
              <Select options={PRIORITY_OPTIONS} placeholder="Media" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="startDate" label="Fecha inicio">
              <DatePicker
                showTime
                format="DD/MM/YY HH:mm"
                style={{ width: '100%' }}
                placeholder="DD/MM/YY HH:mm"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="endDate" label="Fecha fin">
              <DatePicker
                showTime
                format="DD/MM/YY HH:mm"
                style={{ width: '100%' }}
                placeholder="DD/MM/YY HH:mm"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="durationMins" label="Duración (min)">
          <InputNumber min={1} style={{ width: '100%' }} placeholder="60" />
        </Form.Item>

        <Form.Item name="assignedToId" label="Asignado a">
          <Select
            showSearch
            allowClear
            placeholder="Seleccionar responsable"
            optionFilterProp="label"
            options={users.map(u => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="spaceId" label="Espacio">
          <Select
            allowClear
            placeholder="Seleccionar espacio"
            options={spaces.map(s => ({
              value: s.id,
              label: `${s.resource?.name ?? '—'} - ${s.phase}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="orderId" label="Orden de servicio">
          <Select
            allowClear
            placeholder="Seleccionar orden"
            options={orders.map(o => ({
              value: o.id,
              label: o.orderNumber,
            }))}
          />
        </Form.Item>

        {showCrmOption && (
          <Form.Item
            name="autoCreateCrmTask"
            label={initialValues?.crmTaskId ? 'Sincronizar con tarea CRM (vinculada)' : 'Crear tarea CRM automáticamente'}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        )}

        <Form.Item name="color" label="Color">
          <Input placeholder="#3B82F6" style={{ width: 160 }} />
        </Form.Item>

        <Form.Item name="parentId" label="Actividad padre">
          <Select
            allowClear
            placeholder="Sin padre"
            options={parentOptions}
          />
        </Form.Item>

        <Form.Item name="notes" label="Notas">
          <Input.TextArea rows={3} placeholder="Observaciones adicionales..." />
        </Form.Item>

      </Form>
    </Modal>
  )
}
