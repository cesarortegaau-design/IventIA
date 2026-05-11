import { useEffect } from 'react'
import { Modal, Form, Input, Select, DatePicker, Row, Col, Spin } from 'antd'
import dayjs from 'dayjs'

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'TASK', label: 'Tarea' },
  { value: 'MILESTONE', label: 'Hito' },
  { value: 'PHASE', label: 'Fase' },
  { value: 'MEETING', label: 'Reunión' },
  { value: 'REHEARSAL', label: 'Ensayo' },
  { value: 'LOGISTICS', label: 'Logística' },
  { value: 'CATERING', label: 'Catering' },
  { value: 'TECHNICAL', label: 'Técnico' },
  { value: 'SECURITY', label: 'Seguridad' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'DONE', label: 'Listo' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'BLOCKED', label: 'Bloqueado' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
]

interface EventActivityFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: any) => void
  activity?: any
  loading?: boolean
  users: any[]
  departments: any[]
}

export function EventActivityFormModal({
  open, onClose, onSave, activity, loading,
  users = [], departments = [],
}: EventActivityFormModalProps) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open && activity) {
      form.setFieldsValue({
        title: activity.title,
        description: activity.description,
        activityType: activity.activityType,
        status: activity.status,
        priority: activity.priority,
        startDate: activity.startDate ? dayjs(activity.startDate) : null,
        endDate: activity.endDate ? dayjs(activity.endDate) : null,
        durationMins: activity.durationMins,
        assignedToId: activity.assignedToId,
        departmentIds: activity.activityDepartments?.map((d: any) => d.departmentId) || [],
        notes: activity.notes,
      })
    } else {
      form.resetFields()
    }
  }, [open, activity, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    }
    onSave(payload)
  }

  return (
    <Modal
      title="Editar Actividad del Timeline"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Guardar"
      cancelText="Cancelar"
      width={700}
      confirmLoading={loading}
    >
      {!activity ? (
        <Spin />
      ) : (
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Título" rules={[{ required: true, message: 'El título es requerido' }]}>
            <Input placeholder="Ej. Montaje de sonido" />
          </Form.Item>

          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={3} placeholder="Detalles de la actividad..." />
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
            <Input type="number" min={1} placeholder="60" />
          </Form.Item>

          <Form.Item name="assignedToId" label="Asignado a">
            <Select
              showSearch
              allowClear
              placeholder="Seleccionar responsable"
              optionFilterProp="label"
              options={(Array.isArray(users) ? users : []).map(u => ({
                value: u.id,
                label: `${u.firstName} ${u.lastName}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="departmentIds" label="Departamentos">
            <Select
              mode="multiple"
              allowClear
              placeholder="Seleccionar departamentos"
              options={(Array.isArray(departments) ? departments : []).map(d => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={3} placeholder="Observaciones adicionales..." />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
