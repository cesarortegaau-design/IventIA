import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, Row, Col, App, Typography, DatePicker } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { contractsApi } from '../../api/contracts'
import { clientsApi } from '../../api/clients'
import dayjs from 'dayjs'

const { Title } = Typography
const { TextArea } = Input

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  EN_FIRMA: { label: 'En Firma', color: 'processing' },
  FIRMADO: { label: 'Firmado', color: 'success' },
  CANCELADO: { label: 'Cancelado', color: 'error' },
}

function formatMoney(v: any) {
  return `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

export default function ContractsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', statusFilter],
    queryFn: () => contractsApi.list({ status: statusFilter }),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.list().then((r: any) => r.data || r),
  })

  const createMutation = useMutation({
    mutationFn: (values: any) => contractsApi.create({
      ...values,
      signingDate: values.signingDate ? values.signingDate.toISOString() : undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Contrato creado')
      navigate(`/contratos/${data.id}`)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear contrato')
    },
  })

  const columns = [
    { title: 'Número', dataIndex: 'contractNumber', width: 150 },
    {
      title: 'Descripción', dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: 'Cliente', dataIndex: 'client',
      render: (c: any) => c?.companyName || `${c?.firstName || ''} ${c?.lastName || ''}`.trim(),
    },
    {
      title: 'Estado', dataIndex: 'status', width: 120,
      render: (v: string) => {
        const s = STATUS_MAP[v] || { label: v, color: 'default' }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: 'Monto Total', dataIndex: 'totalAmount', width: 140, align: 'right' as const,
      render: formatMoney,
    },
    {
      title: 'Pagado', dataIndex: 'paidAmount', width: 140, align: 'right' as const,
      render: formatMoney,
    },
    {
      title: 'Órdenes', dataIndex: 'orders', width: 80, align: 'center' as const,
      render: (orders: any[]) => orders?.length || 0,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/contratos/${r.id}`)} title="Ver detalle" />
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>Contratos</Title>
          <Select
            allowClear
            placeholder="Filtrar por estado"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(STATUS_MAP).map(([value, { label }]) => ({ value, label }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true) }}>
          Nuevo Contrato
        </Button>
      </Row>

      <Card>
        <Table
          dataSource={contracts || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="Nuevo Contrato"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="description" label="Descripción" rules={[{ required: true, message: 'Requerido' }]}>
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="clientId" label="Cliente" rules={[{ required: true, message: 'Requerido' }]}>
                <Select
                  showSearch
                  placeholder="Buscar cliente..."
                  optionFilterProp="label"
                  options={(clients || []).map((c: any) => ({
                    value: c.id,
                    label: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="signingDate" label="Fecha de Firma">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notas">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
