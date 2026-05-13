import { useState, useEffect } from 'react'
import {
  Modal, Form, Input, Select, DatePicker, InputNumber, Switch, Row, Col,
  Tabs, Upload, List, Spin, Button, Typography, Space,
} from 'antd'
import {
  UploadOutlined, FileOutlined, DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventActivitiesApi } from '../../../api/eventActivities'

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
  { value: 'ROUND',     label: 'Ronda (Torneo)' },
  { value: 'GAME',      label: 'Juego (Torneo)' },
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
  departments: any[]
  activities: any[]
  showCrmOption?: boolean
  eventId: string
}

export default function ActivityFormModal({
  open, onClose, onSave, initialValues, loading,
  spaces, orders, users, departments, activities, showCrmOption, eventId,
}: ActivityFormModalProps) {
  const [form] = Form.useForm()
  const [documents, setDocuments] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)

  // Managed outside the Form to guarantee it's always included in the payload
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  // Reset/populate form and selectedUserIds whenever the modal opens or the edited record changes
  useEffect(() => {
    if (!open) return
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        startDate: initialValues.startDate ? dayjs(initialValues.startDate) : undefined,
        endDate:   initialValues.endDate   ? dayjs(initialValues.endDate)   : undefined,
        departmentIds: initialValues.activityDepartments?.map((d: any) => d.departmentId ?? d.department?.id) ?? [],
        orderIds: initialValues.activityOrders?.map((o: any) => o.orderId ?? o.order?.id) ?? [],
        autoCreateCrmTask: initialValues.autoCreateCrmTask ?? !!initialValues.crmTaskId,
      })
      const ids: string[] =
        initialValues.assignees?.map((a: any) => a.userId ?? a.user?.id).filter(Boolean) ??
        (initialValues.assignedToId ? [initialValues.assignedToId] : [])
      setSelectedUserIds(ids)
    } else {
      form.resetFields()
      setSelectedUserIds([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues?.id])

  useEffect(() => {
    if (open && initialValues?.id) {
      loadDocuments()
    } else if (!open) {
      setDocuments([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues?.id])

  async function loadDocuments() {
    if (!initialValues?.id) return
    setDocsLoading(true)
    try {
      const result = await eventActivitiesApi.listDocuments(eventId, initialValues.id)
      setDocuments(result?.data ?? result ?? [])
    } catch {
      // silently fail
    } finally {
      setDocsLoading(false)
    }
  }

  async function handleUpload(file: File) {
    if (!initialValues?.id) return false
    setUploadLoading(true)
    try {
      await eventActivitiesApi.uploadDocument(eventId, initialValues.id, file)
      await loadDocuments()
    } catch {
      // silently fail
    } finally {
      setUploadLoading(false)
    }
    return false
  }

  async function handleDeleteDocument(doc: any) {
    if (!initialValues?.id) return
    try {
      await eventActivitiesApi.deleteDocument(eventId, initialValues.id, doc.id)
      await loadDocuments()
    } catch {
      // silently fail
    }
  }

  function handleOk() {
    form.validateFields().then(values => {
      const payload = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
        endDate:   values.endDate   ? values.endDate.toISOString()   : undefined,
        // Explicitly inject from state — not from the form — so it's always present
        assignedToIds: selectedUserIds,
      }
      onSave(payload)
    })
  }

  const parentOptions = activities
    .filter(a => a.id !== initialValues?.id)
    .map(a => ({ value: a.id, label: a.title }))

  const datosTab = (
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

      {/* Asignado a — controlled by local state, NOT the Form */}
      <Form.Item label="Asignado a">
        <Select
          mode="multiple"
          showSearch
          allowClear
          placeholder="Seleccionar uno o más responsables"
          optionFilterProp="label"
          value={selectedUserIds}
          onChange={(ids: string[]) => setSelectedUserIds(ids)}
          options={users.map(u => ({
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
          options={departments.map(d => ({ value: d.id, label: d.name }))}
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

      <Form.Item name="orderIds" label="Órdenes de servicio">
        <Select
          mode="multiple"
          allowClear
          placeholder="Seleccionar órdenes"
          options={orders.map(o => ({ value: o.id, label: o.orderNumber }))}
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
  )

  const documentosTab = (
    <div style={{ paddingTop: 16 }}>
      {!initialValues?.id ? (
        <Typography.Text type="secondary">
          Guarda la actividad primero para adjuntar documentos
        </Typography.Text>
      ) : (
        <Spin spinning={docsLoading}>
          <div style={{ marginBottom: 12 }}>
            <Upload beforeUpload={handleUpload} showUploadList={false}>
              <Button icon={<UploadOutlined />} loading={uploadLoading}>
                Adjuntar archivo
              </Button>
            </Upload>
          </div>
          {documents.length === 0 && !docsLoading ? (
            <Typography.Text type="secondary">No hay documentos adjuntos.</Typography.Text>
          ) : (
            <List
              dataSource={documents}
              renderItem={(doc: any) => (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteDocument(doc)}
                    />,
                  ]}
                >
                  <Space>
                    <FileOutlined style={{ fontSize: 18, color: '#8c8c8c' }} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.fileName}</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {doc.uploadedBy
                          ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName} · `
                          : ''}
                        {doc.createdAt ? dayjs(doc.createdAt).format('DD/MM/YY HH:mm') : ''}
                      </div>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Spin>
      )}
    </div>
  )

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
      <Tabs
        defaultActiveKey="datos"
        items={[
          {
            key: 'datos',
            label: 'Datos',
            children: datosTab,
          },
          {
            key: 'documentos',
            label: `Documentos (${documents.length})`,
            children: documentosTab,
          },
        ]}
      />
    </Modal>
  )
}
