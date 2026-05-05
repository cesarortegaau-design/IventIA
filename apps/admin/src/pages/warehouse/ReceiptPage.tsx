import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Space, Row, Col, App, Typography, Select, Form, Input, InputNumber, Table, Modal, Steps } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { purchaseOrdersApi } from '../../api/purchaseOrders'
import { warehouseApi } from '../../api/warehouse'

const { Title } = Typography

interface ReceiptItem {
  lineItemId: string
  receivedQty: string | number
  warehouseId: string
  condition?: string
  location?: string
  notes?: string
  resourceName?: string
  quantity?: string
}

export default function ReceiptPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [selectedPoId, setSelectedPoId] = useState<string>()
  const [currentStep, setCurrentStep] = useState(0)
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)

  const { data: posData } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => purchaseOrdersApi.list({ pageSize: 1000 }).then(r => r.data),
  })

  const { data: poDetailResponse } = useQuery({
    queryKey: ['purchaseOrder', selectedPoId],
    queryFn: () => (selectedPoId ? purchaseOrdersApi.get(selectedPoId).then(r => r.data) : Promise.resolve(null)),
  })
  const poDetail = poDetailResponse?.data ?? poDetailResponse

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.listWarehouses({ pageSize: 1000 }).then(r => r.data),
  })

  const registerMutation = useMutation({
    mutationFn: () => {
      if (!selectedPoId) throw new Error('No PO selected')
      return warehouseApi.registerReception(selectedPoId, receiptItems.map(item => ({
        lineItemId: item.lineItemId,
        receivedQty: item.receivedQty.toString(),
        warehouseId: item.warehouseId,
        condition: item.condition,
        location: item.location,
        notes: item.notes,
      }))).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] })
      setSelectedPoId(undefined)
      setReceiptItems([])
      setCurrentStep(0)
      form.resetFields()
      message.success('Recepción registrada exitosamente')
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error al registrar recepción')
    },
  })

  function addOrUpdateItem(item: ReceiptItem) {
    if (editingItemIndex !== null) {
      const updated = [...receiptItems]
      updated[editingItemIndex] = item
      setReceiptItems(updated)
      setEditingItemIndex(null)
    } else {
      setReceiptItems([...receiptItems, item])
    }
    form.resetFields()
  }

  function removeItem(index: number) {
    setReceiptItems(receiptItems.filter((_, i) => i !== index))
  }

  const poOptions = (posData?.data ?? [])
    .filter((po: any) => ['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status))
    .map((po: any) => ({
      value: po.id,
      label: `${po.orderNumber} - ${po.supplier?.name}`,
    }))

  const warehouseOptions = (warehousesData?.data ?? []).map((w: any) => ({
    value: w.id,
    label: `${w.code} - ${w.name}`,
  }))

  const steps = [
    { title: 'Seleccionar OC', description: 'Elige la orden de compra' },
    { title: 'Recibir Items', description: 'Registra cantidad y datos' },
    { title: 'Confirmar', description: 'Revisa y confirma la recepción' },
  ]

  const itemColumns = [
    { title: 'Recurso', render: (_: any, r: any) => r.resourceName },
    { title: 'Cantidad Original', render: (_: any, r: any) => r.quantity },
    { title: 'Cantidad Recibida', render: (_: any, r: any) => r.receivedQty },
    { title: 'Almacén', render: (_: any, r: any) => {
      const warehouse = (warehousesData?.data ?? []).find((w: any) => w.id === r.warehouseId)
      return warehouse ? `${warehouse.code} - ${warehouse.name}` : '-'
    } },
    { title: 'Condición', render: (_: any, r: any) => r.condition || '-' },
    { title: 'Ubicación', render: (_: any, r: any) => r.location || '-' },
    {
      title: '',
      key: 'actions',
      render: (_: any, r: any, index: number) => (
        <Space>
          <Button size="small" onClick={() => {
            setEditingItemIndex(index)
            form.setFieldsValue(r)
          }}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => removeItem(index)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <Form layout="vertical">
              <Form.Item label="Seleccionar Orden de Compra" required>
                <Select
                  placeholder="Elige una OC confirmada"
                  options={poOptions}
                  value={selectedPoId}
                  onChange={(v) => { setSelectedPoId(v); setCurrentStep(1) }}
                />
              </Form.Item>
            </Form>
          </Card>
        )
      case 1:
        return (
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>OC: {poDetail?.orderNumber}</Title>
              <Title level={5}>Proveedor: {poDetail?.supplier?.name}</Title>
            </div>
            <Form form={form} layout="vertical" onFinish={(values) => {
              const poLineItem = poDetail?.lineItems?.find((li: any) => li.id === values.lineItemId)
              addOrUpdateItem({
                ...values,
                lineItemId: values.lineItemId,
                warehouseId: values.warehouseId || (warehousesData?.data?.[0]?.id),
                resourceName: poLineItem?.resource?.name,
                quantity: poLineItem?.quantity,
              })
            }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="lineItemId" label="Recurso" rules={[{ required: true }]}>
                    <Select
                      placeholder="Selecciona recurso a recibir"
                      options={(poDetail?.lineItems ?? []).map((li: any) => ({
                        value: li.id,
                        label: `${li.resource?.code} - ${li.resource?.name} (${li.quantity})`,
                      }))}
                      onChange={(lineItemId) => {
                        const li = (poDetail?.lineItems ?? []).find((l: any) => l.id === lineItemId)
                        if (li) {
                          const remaining = parseFloat(li.quantity) - parseFloat(li.receivedQty || '0')
                          form.setFieldValue('receivedQty', remaining > 0 ? remaining : parseFloat(li.quantity))
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="receivedQty" label="Cantidad Recibida" rules={[{ required: true }]}>
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="warehouseId" label="Almacén" rules={[{ required: true }]}>
                    <Select options={warehouseOptions} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="condition" label="Condición">
                    <Select options={[
                      { value: 'GOOD', label: 'Buena' },
                      { value: 'DAMAGED', label: 'Dañada' },
                      { value: 'INCOMPLETE', label: 'Incompleta' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="location" label="Ubicación en Almacén">
                    <Input placeholder="Ej: Pasillo A, Estante 3" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="notes" label="Notas">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      {editingItemIndex !== null ? 'Actualizar Item' : 'Agregar Item'}
                    </Button>
                    {editingItemIndex !== null && (
                      <Button onClick={() => { setEditingItemIndex(null); form.resetFields() }}>
                        Cancelar Edición
                      </Button>
                    )}
                  </Space>
                </Col>
              </Row>
            </Form>
            <div style={{ marginTop: 24 }}>
              <Title level={5}>Items a Recibir ({receiptItems.length})</Title>
              <Table
                dataSource={receiptItems}
                columns={itemColumns}
                rowKey={(_, i) => i}
                pagination={false}
                size="small"
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Button onClick={() => setCurrentStep(2)} disabled={receiptItems.length === 0}>
                Ir a Confirmación
              </Button>
            </div>
          </Card>
        )
      case 2:
        return (
          <Card>
            <Title level={5}>Resumen de Recepción</Title>
            <Table
              dataSource={receiptItems}
              columns={itemColumns}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              style={{ marginBottom: 16 }}
            />
            <div>
              <Button type="primary" onClick={() => registerMutation.mutate()} loading={registerMutation.isPending}>
                Confirmar Recepción
              </Button>
              <Button onClick={() => setCurrentStep(1)} style={{ marginLeft: 8 }}>
                Atrás
              </Button>
            </div>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div>
      <Title level={4}>Recepción de Órdenes de Compra</Title>
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />
      {renderStepContent()}
    </div>
  )
}
