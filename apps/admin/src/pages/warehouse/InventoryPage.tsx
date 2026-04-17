import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Row, Col, App, Typography, Select, Modal, Form, Input, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, ToolOutlined, SwapOutlined } from '@ant-design/icons'
import { warehouseApi } from '../../api/warehouse'
import { auditApi } from '../../api/audit'
import AuditTimeline from '../../components/AuditTimeline'

const { Title } = Typography

export default function InventoryPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>()
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferForm] = Form.useForm()
  const [selectedInventory, setSelectedInventory] = useState<any>(null)

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.listWarehouses({ pageSize: 1000 }).then(r => r.data),
  })

  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['warehouse-inventory', selectedWarehouse, page, pageSize],
    queryFn: () =>
      selectedWarehouse
        ? warehouseApi.getWarehouseInventory(selectedWarehouse, { page, pageSize }).then(r => r.data)
        : Promise.resolve({ data: [], meta: { total: 0, page: 1, pageSize } }),
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['inventory-audit', selectedWarehouse],
    queryFn: () => auditApi.getLogByType('ResourceInventory', { limit: 100 }),
    enabled: !!selectedWarehouse,
  })

  const adjustMutation = useMutation({
    mutationFn: (values: any) =>
      warehouseApi.adjustInventory(selectedInventory.id, values).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-audit'] })
      setAdjustModalOpen(false)
      form.resetFields()
      message.success('Inventario ajustado')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al ajustar inventario')
    },
  })

  const transferMutation = useMutation({
    mutationFn: (values: any) =>
      warehouseApi.transferInventory({
        sourceWarehouseId: selectedWarehouse!,
        destinationWarehouseId: values.destinationWarehouseId,
        resourceId: selectedInventory.resourceId,
        quantity: String(values.quantity),
        notes: values.notes,
      }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-audit'] })
      setTransferModalOpen(false)
      transferForm.resetFields()
      message.success('Transferencia realizada')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al transferir')
    },
  })

  function openTransferModal(record: any) {
    setSelectedInventory(record)
    transferForm.resetFields()
    const available = parseFloat(record.quantityTotal) - parseFloat(record.quantityReserved)
    transferForm.setFieldsValue({ quantity: available > 0 ? available : 0 })
    setTransferModalOpen(true)
  }

  function openAdjustModal(record: any) {
    setSelectedInventory(record)
    form.resetFields()
    form.setFieldsValue({
      type: 'ADJUSTMENT',
    })
    setAdjustModalOpen(true)
  }

  const columns = [
    { title: 'Recurso', render: (_: any, r: any) => `${r.resource?.code} - ${r.resource?.name}` },
    { title: 'Unidad', width: 80, render: (_: any, r: any) => r.resource?.unit || '-' },
    { title: 'Cantidad Total', render: (_: any, r: any) => r.quantityTotal },
    { title: 'Reservado', render: (_: any, r: any) => r.quantityReserved },
    { title: 'Disponible', render: (_: any, r: any) => {
      const total = parseFloat(r.quantityTotal)
      const reserved = parseFloat(r.quantityReserved)
      const available = total - reserved
      const color = available < 0 ? 'red' : available < parseFloat(r.minLevel || 0) ? 'orange' : 'green'
      return <Tag color={color}>{available}</Tag>
    } },
    { title: 'Mín', render: (_: any, r: any) => r.minLevel || '-' },
    { title: 'Ubicación', dataIndex: ['location'], render: (v: string) => v || '-' },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_: any, r: any) => (
        <Space>
          <Button
            size="small"
            icon={<ToolOutlined />}
            onClick={() => openAdjustModal(r)}
            title="Ajustar stock"
          />
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => openTransferModal(r)}
            title="Transferir a otro almacén"
          />
        </Space>
      ),
    },
  ]

  const warehouseOptions = (warehousesData?.data ?? []).map((w: any) => ({
    value: w.id,
    label: `${w.code} - ${w.name}`,
  }))

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Inventario</Title>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Select
              placeholder="Seleccionar almacén"
              options={warehouseOptions}
              onChange={(v) => { setSelectedWarehouse(v); setPage(1) }}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {selectedWarehouse && (
        <>
          <Card>
            <Table
              dataSource={inventoryData?.data ?? []}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              size="small"
              pagination={{
                current: page,
                pageSize,
                total: inventoryData?.meta?.total,
                onChange: (p, ps) => { setPage(p); setPageSize(ps) },
              }}
            />
          </Card>

          <Card title="Registro de Cambios" style={{ marginTop: 16 }}>
            <AuditTimeline data={auditData?.data ?? []} loading={auditLoading} />
          </Card>
        </>
      )}

      <Modal
        title="Ajustar Inventario"
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={adjustMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={adjustMutation.mutate}>
          <Form.Item label="Recurso" value={selectedInventory?.resource?.name}>
            <Input disabled value={selectedInventory?.resource?.name} />
          </Form.Item>
          <Form.Item name="type" label="Tipo de Ajuste" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'ADJUSTMENT', label: 'Ajuste' },
                { value: 'LOSS', label: 'Pérdida' },
                { value: 'RETURN', label: 'Devolución' },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Cantidad" rules={[{ required: true }]}>
            <Input type="number" step="0.01" placeholder="Positivo o negativo" />
          </Form.Item>
          <Form.Item name="reason" label="Razón">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Transferir a otro almacén"
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        onOk={() => transferForm.submit()}
        confirmLoading={transferMutation.isPending}
      >
        <Form form={transferForm} layout="vertical" onFinish={transferMutation.mutate}>
          <Form.Item label="Recurso">
            <Input disabled value={`${selectedInventory?.resource?.code} - ${selectedInventory?.resource?.name}`} />
          </Form.Item>
          <Form.Item label="Almacén Origen">
            <Input disabled value={warehouseOptions.find((w: any) => w.value === selectedWarehouse)?.label || ''} />
          </Form.Item>
          <Form.Item label="Disponible">
            <Input disabled value={selectedInventory ? `${parseFloat(selectedInventory.quantityTotal) - parseFloat(selectedInventory.quantityReserved)} ${selectedInventory.resource?.unit || ''}` : ''} />
          </Form.Item>
          <Form.Item name="destinationWarehouseId" label="Almacén Destino" rules={[{ required: true, message: 'Selecciona almacén destino' }]}>
            <Select
              placeholder="Seleccionar almacén destino"
              options={warehouseOptions.filter((w: any) => w.value !== selectedWarehouse)}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Cantidad a transferir" rules={[{ required: true, message: 'Ingresa cantidad' }]}>
            <InputNumber
              min={0.001}
              step={0.01}
              style={{ width: '100%' }}
              max={selectedInventory ? parseFloat(selectedInventory.quantityTotal) - parseFloat(selectedInventory.quantityReserved) : undefined}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
