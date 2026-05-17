import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Space, Tag, Modal, Form, Input, Select,
  Switch, Typography, Row, Col, App, Divider, Drawer, Popconfirm,
  Tooltip, Empty, Alert,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined,
  ArrowUpOutlined, ArrowDownOutlined, RobotOutlined,
} from '@ant-design/icons'
import { approvalFlowsApi } from '../../api/approvalFlows'
import { usersApi } from '../../api/users'
import { apiClient } from '../../api/client'

const { Text, Title } = Typography
const { TextArea } = Input

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OBJECT_TYPE_LABELS: Record<string, string> = {
  PRICE_LIST: 'Lista de Precio',
  CLIENT: 'Cliente',
  SUPPLIER: 'Proveedor',
  SUPPLIER_PRICE_LIST: 'Lista de Precio de Proveedor',
  EVENT: 'Evento',
  ORDER: 'Orden de Servicio',
  BUDGET_ORDER: 'Orden de Presupuesto',
  PURCHASE_ORDER: 'Orden de Compra',
  COLLAB_TASK: 'Tarea',
}

const OBJECT_TYPE_COLORS: Record<string, string> = {
  PRICE_LIST: 'gold',
  CLIENT: 'blue',
  SUPPLIER: 'purple',
  SUPPLIER_PRICE_LIST: 'geekblue',
  EVENT: 'green',
  ORDER: 'volcano',
  BUDGET_ORDER: 'magenta',
  PURCHASE_ORDER: 'orange',
  COLLAB_TASK: 'cyan',
}

const OBJECT_TYPE_OPTIONS = Object.entries(OBJECT_TYPE_LABELS).map(([value, label]) => ({ value, label }))

// ─────────────────────────────────────────────────────────────────────────────
// Flow Diagram Component
// ─────────────────────────────────────────────────────────────────────────────

function FlowDiagram({ steps, currentStep }: { steps: any[]; currentStep?: number | null }) {
  if (!steps || steps.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#aaa', padding: '16px 0', fontSize: 13 }}>
        Sin pasos definidos
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '12px 0', gap: 0 }}>
      {/* Start node */}
      <div style={{
        background: '#f5f5f5',
        border: '1.5px solid #d9d9d9',
        borderRadius: 8,
        padding: '6px 14px',
        fontSize: 12,
        color: '#888',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        Inicio
      </div>

      {steps.map((step: any, idx: number) => {
        const isCurrentStep = currentStep !== null && currentStep !== undefined && step.order === currentStep
        const isLast = idx === steps.length - 1
        const assigneeName = step.assigneeUser
          ? `${step.assigneeUser.firstName} ${step.assigneeUser.lastName}`
          : step.assigneeProfile
            ? step.assigneeProfile.name
            : '—'

        return (
          <div key={step.id ?? idx} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {/* Arrow */}
            <div style={{ padding: '0 6px', color: '#bbb', fontSize: 18, userSelect: 'none' }}>→</div>

            {/* Step box */}
            <div style={{
              border: isLast ? '2px solid #52c41a' : isCurrentStep ? '2px solid #1890ff' : '1.5px solid #d9d9d9',
              borderRadius: 8,
              padding: '8px 14px',
              background: isCurrentStep ? '#e6f7ff' : '#fff',
              minWidth: 110,
              maxWidth: 160,
              boxShadow: isCurrentStep ? '0 0 0 3px rgba(24,144,255,0.18)' : undefined,
              animation: isCurrentStep ? 'approval-pulse 2s infinite' : undefined,
            }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Paso {step.order + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#222', wordBreak: 'break-word' }}>{step.name}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, wordBreak: 'break-word' }}>{assigneeName}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Builder sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface StepFormValue {
  key: string
  name: string
  description?: string
  assigneeType: 'USER' | 'PROFILE'
  assigneeUserId?: string
  assigneeProfileId?: string
}

function StepBuilder({
  steps,
  onChange,
  users,
  profiles,
}: {
  steps: StepFormValue[]
  onChange: (steps: StepFormValue[]) => void
  users: any[]
  profiles: any[]
}) {
  const addStep = () => {
    onChange([
      ...steps,
      { key: Date.now().toString(), name: '', assigneeType: 'USER' },
    ])
  }

  const removeStep = (key: string) => {
    onChange(steps.filter(s => s.key !== key))
  }

  const updateStep = (key: string, field: string, value: any) => {
    onChange(steps.map(s => s.key === key ? { ...s, [field]: value } : s))
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const newSteps = [...steps]
    ;[newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]]
    onChange(newSteps)
  }

  const moveDown = (idx: number) => {
    if (idx === steps.length - 1) return
    const newSteps = [...steps]
    ;[newSteps[idx], newSteps[idx + 1]] = [newSteps[idx + 1], newSteps[idx]]
    onChange(newSteps)
  }

  return (
    <div>
      {steps.map((step, idx) => (
        <Card
          key={step.key}
          size="small"
          style={{ marginBottom: 10, background: '#fafafa', border: '1px solid #e8e8e8' }}
          bodyStyle={{ padding: '10px 12px' }}
          title={<Text style={{ fontSize: 13, fontWeight: 600 }}>Paso {idx + 1}</Text>}
          extra={
            <Space size={4}>
              <Tooltip title="Subir">
                <Button size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => moveUp(idx)} />
              </Tooltip>
              <Tooltip title="Bajar">
                <Button size="small" icon={<ArrowDownOutlined />} disabled={idx === steps.length - 1} onClick={() => moveDown(idx)} />
              </Tooltip>
              <Popconfirm title="¿Eliminar este paso?" onConfirm={() => removeStep(step.key)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          }
        >
          <Row gutter={[8, 8]}>
            <Col span={24}>
              <Input
                placeholder="Nombre del paso *"
                value={step.name}
                onChange={e => updateStep(step.key, 'name', e.target.value)}
              />
            </Col>
            <Col span={24}>
              <Input
                placeholder="Descripción del paso"
                value={step.description ?? ''}
                onChange={e => updateStep(step.key, 'description', e.target.value)}
              />
            </Col>
            <Col span={10}>
              <Select
                value={step.assigneeType}
                onChange={v => updateStep(step.key, 'assigneeType', v)}
                style={{ width: '100%' }}
                options={[
                  { value: 'USER', label: 'Usuario específico' },
                  { value: 'PROFILE', label: 'Perfil (rol)' },
                ]}
              />
            </Col>
            <Col span={14}>
              {step.assigneeType === 'USER' ? (
                <Select
                  placeholder="Seleccionar usuario"
                  value={step.assigneeUserId}
                  onChange={v => updateStep(step.key, 'assigneeUserId', v)}
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, opt) =>
                    String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={users.map((u: any) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName}`,
                  }))}
                />
              ) : (
                <Select
                  placeholder="Seleccionar perfil"
                  value={step.assigneeProfileId}
                  onChange={v => updateStep(step.key, 'assigneeProfileId', v)}
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, opt) =>
                    String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={profiles.map((p: any) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              )}
            </Col>
          </Row>
        </Card>
      ))}
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={addStep}
        style={{ marginTop: 4 }}
      >
        Agregar paso
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ApprovalFlowsPage() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterObjectType, setFilterObjectType] = useState<string | undefined>()
  const [form] = Form.useForm()
  const [steps, setSteps] = useState<StepFormValue[]>([])
  const [autoTriggerOn, setAutoTriggerOn] = useState(false)

  // ── Queries ──
  const { data: flows = [], isLoading } = useQuery<any[]>({
    queryKey: ['approval-flows', filterObjectType],
    queryFn: () => approvalFlowsApi.list(filterObjectType ? { objectType: filterObjectType } : undefined),
  })

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users-assignable'],
    queryFn: () => usersApi.listAssignable(),
  })

  const { data: profilesData } = useQuery<any>({
    queryKey: ['profiles-list'],
    queryFn: () => apiClient.get('/profiles').then(r => r.data),
  })
  const profiles: any[] = profilesData?.data ?? profilesData ?? []

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => approvalFlowsApi.create(data),
    onSuccess: () => {
      message.success('Flujo creado correctamente')
      queryClient.invalidateQueries({ queryKey: ['approval-flows'] })
      closeDrawer()
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Error al crear flujo'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => approvalFlowsApi.update(id, data),
    onSuccess: () => {
      message.success('Flujo actualizado correctamente')
      queryClient.invalidateQueries({ queryKey: ['approval-flows'] })
      closeDrawer()
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Error al actualizar flujo'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => approvalFlowsApi.delete(id),
    onSuccess: () => {
      message.success('Flujo eliminado')
      queryClient.invalidateQueries({ queryKey: ['approval-flows'] })
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Error al eliminar flujo'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      approvalFlowsApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-flows'] }),
    onError: (e: any) => message.error(e.response?.data?.message ?? 'Error'),
  })

  // ── Handlers ──
  const openCreate = () => {
    setEditingId(null)
    setSteps([])
    setAutoTriggerOn(false)
    form.resetFields()
    setDrawerOpen(true)
  }

  const openEdit = (flow: any) => {
    setEditingId(flow.id)
    setAutoTriggerOn(!!flow.autoTrigger)
    form.setFieldsValue({
      name: flow.name,
      description: flow.description,
      objectType: flow.objectType,
      targetStatus: flow.targetStatus,
      activationConditionsText: flow.activationConditionsText,
      finalEffectsText: flow.finalEffectsText,
      autoTrigger: !!flow.autoTrigger,
      blocksTransition: flow.blocksTransition !== false,
    })
    setSteps(
      (flow.steps ?? []).map((s: any) => ({
        key: s.id,
        name: s.name,
        description: s.description ?? '',
        assigneeType: s.assigneeType,
        assigneeUserId: s.assigneeUserId ?? undefined,
        assigneeProfileId: s.assigneeProfileId ?? undefined,
      }))
    )
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingId(null)
    setSteps([])
    setAutoTriggerOn(false)
    form.resetFields()
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        steps: steps.map((s, idx) => ({
          order: idx,
          name: s.name,
          description: s.description || null,
          assigneeType: s.assigneeType,
          assigneeUserId: s.assigneeType === 'USER' ? (s.assigneeUserId ?? null) : null,
          assigneeProfileId: s.assigneeType === 'PROFILE' ? (s.assigneeProfileId ?? null) : null,
        })),
      }
      if (editingId) {
        updateMutation.mutate({ id: editingId, data: payload })
      } else {
        createMutation.mutate(payload)
      }
    } catch {
      // validation error — antd shows field errors automatically
    }
  }

  // ── Columns ──
  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Objeto',
      dataIndex: 'objectType',
      key: 'objectType',
      width: 160,
      render: (t: string) => (
        <Tag color={OBJECT_TYPE_COLORS[t] ?? 'default'}>
          {OBJECT_TYPE_LABELS[t] ?? t}
        </Tag>
      ),
    },
    {
      title: 'Estado destino',
      dataIndex: 'targetStatus',
      key: 'targetStatus',
      width: 130,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Disparo',
      key: 'autoTrigger',
      width: 90,
      render: (_: any, record: any) => record.autoTrigger
        ? <Tag color="purple" icon={<RobotOutlined />}>Auto</Tag>
        : <Tag color="default">Manual</Tag>,
    },
    {
      title: 'Pasos',
      key: 'steps',
      width: 70,
      render: (_: any, record: any) => (
        <Text>{record.steps?.length ?? 0}</Text>
      ),
    },
    {
      title: 'Solicitudes',
      key: 'requests',
      width: 90,
      render: (_: any, record: any) => (
        <Text>{record._count?.requests ?? 0}</Text>
      ),
    },
    {
      title: 'Activo',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (val: boolean, record: any) => (
        <Switch
          size="small"
          checked={val}
          onChange={(checked) => toggleActiveMutation.mutate({ id: record.id, isActive: checked })}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este flujo?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const selectedFlow = editingId ? flows.find(f => f.id === editingId) : null

  return (
    <>
      {/* Pulse animation for active step */}
      <style>{`
        @keyframes approval-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(24,144,255,0.18); }
          50% { box-shadow: 0 0 0 6px rgba(24,144,255,0.08); }
        }
      `}</style>

      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <ThunderboltOutlined style={{ marginRight: 8, color: '#faad14' }} />
              Flujos de Aprobación
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Define cadenas de aprobación para transiciones de estado en distintos objetos.
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo flujo
          </Button>
        </div>

        {/* Filters */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text style={{ marginRight: 8, fontSize: 13 }}>Filtrar por objeto:</Text>
              <Select
                allowClear
                placeholder="Todos"
                value={filterObjectType}
                onChange={setFilterObjectType}
                style={{ width: 200 }}
                options={OBJECT_TYPE_OPTIONS}
              />
            </Col>
          </Row>
        </Card>

        {/* Table */}
        <Card bodyStyle={{ padding: 0 }}>
          <Table
            dataSource={flows}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="No hay flujos de aprobación" /> }}
            expandable={{
              expandedRowRender: (record: any) => (
                <div style={{ padding: '8px 16px' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    Diagrama del flujo
                  </Text>
                  <FlowDiagram steps={record.steps ?? []} />
                  {record.activationConditionsText && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Condiciones de activación: </Text>
                      <Text style={{ fontSize: 12 }}>{record.activationConditionsText}</Text>
                    </div>
                  )}
                  {record.finalEffectsText && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Efectos finales: </Text>
                      <Text style={{ fontSize: 12 }}>{record.finalEffectsText}</Text>
                    </div>
                  )}
                </div>
              ),
            }}
          />
        </Card>
      </div>

      {/* Flow Builder Drawer */}
      <Drawer
        title={editingId ? 'Editar flujo de aprobación' : 'Nuevo flujo de aprobación'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={600}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={closeDrawer}>Cancelar</Button>
              <Button
                type="primary"
                onClick={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Guardar cambios' : 'Crear flujo'}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Ej: Aprobación de confirmar evento" />
          </Form.Item>

          <Form.Item name="description" label="Descripción">
            <TextArea rows={2} placeholder="Descripción del flujo (opcional)" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="objectType"
                label="Objeto"
                rules={[{ required: true, message: 'Selecciona el tipo de objeto' }]}
              >
                <Select
                  placeholder="Seleccionar objeto"
                  options={OBJECT_TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="targetStatus"
                label="Estado destino"
                rules={[{ required: true, message: 'El estado destino es requerido' }]}
                tooltip="Estado al que el objeto intentará transicionar. Ej: CONFIRMED"
              >
                <Input placeholder="Ej: CONFIRMED" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 13, fontWeight: 600 }}>
            Activación automática
          </Divider>

          <Form.Item
            name="autoTrigger"
            label="Activar automáticamente"
            valuePropName="checked"
            tooltip="Si está activo, el flujo se dispara automáticamente cuando el objeto intente cambiar al estado destino configurado arriba"
          >
            <Switch
              onChange={(checked) => {
                setAutoTriggerOn(checked)
                if (!checked) form.setFieldValue('blocksTransition', true)
              }}
            />
          </Form.Item>

          {autoTriggerOn && (
            <>
              <Form.Item
                name="blocksTransition"
                label="Bloquear transición hasta aprobar"
                valuePropName="checked"
                tooltip="El cambio de estado queda bloqueado hasta que el flujo sea aprobado"
              >
                <Switch defaultChecked />
              </Form.Item>
              <Alert
                type="info"
                showIcon
                icon={<RobotOutlined />}
                style={{ marginBottom: 16, fontSize: 12 }}
                message={`Cuando el objeto intente cambiar a "${form.getFieldValue('targetStatus') || '(estado destino)'}", el sistema creará este flujo automáticamente y bloqueará la transición hasta recibir aprobación.`}
              />
            </>
          )}

          <Form.Item
            name="activationConditionsText"
            label="Notas de activación"
            tooltip="Notas adicionales sobre cuándo o por qué aplica este flujo"
          >
            <TextArea rows={2} placeholder="Ej: Aplica cuando el monto supere $50,000 MXN" />
          </Form.Item>

          <Form.Item
            name="finalEffectsText"
            label="Efectos al aprobar"
            tooltip="Describe qué ocurre cuando el flujo es aprobado"
          >
            <TextArea rows={2} placeholder="Ej: El evento cambia a estado CONFIRMED automáticamente" />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13, fontWeight: 600 }}>
            Pasos del flujo
          </Divider>

          <StepBuilder
            steps={steps}
            onChange={setSteps}
            users={users}
            profiles={profiles}
          />

          {steps.length > 0 && (
            <>
              <Divider orientation="left" style={{ fontSize: 13, fontWeight: 600, marginTop: 20 }}>
                Vista previa del diagrama
              </Divider>
              <Card size="small" style={{ background: '#f9f9f9' }}>
                <FlowDiagram
                  steps={steps.map((s, idx) => ({
                    id: s.key,
                    order: idx,
                    name: s.name || `Paso ${idx + 1}`,
                    assigneeUser: s.assigneeType === 'USER' && s.assigneeUserId
                      ? users.find((u: any) => u.id === s.assigneeUserId)
                      : null,
                    assigneeProfile: s.assigneeType === 'PROFILE' && s.assigneeProfileId
                      ? profiles.find((p: any) => p.id === s.assigneeProfileId)
                      : null,
                  }))}
                />
              </Card>
            </>
          )}
        </Form>
      </Drawer>
    </>
  )
}
