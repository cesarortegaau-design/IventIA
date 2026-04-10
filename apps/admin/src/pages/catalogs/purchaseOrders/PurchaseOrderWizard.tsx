import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Space, Row, Col, Form, Input, Select, InputNumber, Table, Steps, App, Typography, Divider } from 'antd'
import { MinusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { purchaseOrdersApi } from '../../../api/purchaseOrders'
import { suppliersApi } from '../../../api/suppliers'
import { supplierPriceListsApi } from '../../../api/supplierPriceLists'
import { Decimal } from 'decimal.js'

const { Title } = Typography

interface LineItem {
  resourceId: string
  quantity: number
  unitPrice: number
  description?: string
  deliveryTimeDays?: number
  notes?: string
  resourceCode?: string
  resourceName?: string
}

export default function PurchaseOrderWizard() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>()
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>()
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [taxRate, setTaxRate] = useState(0.16)

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }).then(r => r.data),
  })

  const { data: priceListsData } = useQuery({
    queryKey: ['supplierPriceLists', selectedSupplierId],
    queryFn: () =>
      selectedSupplierId
        ? supplierPriceListsApi.list({ supplierId: selectedSupplierId, pageSize: 1000 }).then(r => r.data)
        : Promise.resolve({ data: [] }),
  })

  const { data: priceListDetail } = useQuery({
    queryKey: ['supplierPriceList', selectedPriceListId],
    queryFn: () =>
      selectedPriceListId
        ? supplierPriceListsApi.get(selectedPriceListId).then(r => r.data)
        : Promise.resolve(null),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const supplier = (suppliersData?.data ?? []).find((s: any) => s.id === selectedSupplierId)
      const priceList = (priceListsData?.data ?? []).find((pl: any) => pl.id === selectedPriceListId)

      const payload = {
        supplierId: selectedSupplierId,
        priceListId: selectedPriceListId,
        taxRate,
        currency: supplier?.currencyCode || 'MXN',
        lineItems: lineItems.map(item => ({
          resourceId: item.resourceId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          description: item.description,
          deliveryTimeDays: item.deliveryTimeDays,
          notes: item.notes,
        })),
      }
      return purchaseOrdersApi.create(payload).then(r => r.data)
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      message.success('Orden de Compra creada')
      navigate(`/catalogs/ordenes-compra/${data.id}`)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear OC')
    },
  })

  function addOrUpdateLineItem(item: LineItem) {
    if (editingIndex !== null) {
      const updated = [...lineItems]
      updated[editingIndex] = item
      setLineItems(updated)
      setEditingIndex(null)
    } else {
      setLineItems([...lineItems, item])
    }
    form.resetFields()
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const calculateLineTotal = (qty: number, price: number) => {
    return new Decimal(qty).times(price).toNumber()
  }

  const subtotal = lineItems.reduce((sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice), 0)
  const tax = new Decimal(subtotal).times(taxRate).toNumber()
  const total = subtotal + tax

  const supplierOptions = (suppliersData?.data ?? []).map((s: any) => ({
    value: s.id,
    label: `${s.code} - ${s.name}`,
  }))

  const priceListOptions = (priceListsData?.data ?? []).map((pl: any) => ({
    value: pl.id,
    label: `${pl.code} - ${pl.name}`,
  }))

  const resourceOptions = (priceListDetail?.items ?? []).map((item: any) => ({
    value: item.resourceId,
    label: `${item.resource?.code} - ${item.resource?.name}`,
    price: item.unitPrice,
    resource: item.resource,
  }))

  const lineItemColumns = [
    { title: 'Código', render: (_: any, r: LineItem) => r.resourceCode },
    { title: 'Descripción', render: (_: any, r: LineItem) => r.description || r.resourceName },
    { title: 'Cantidad', render: (_: any, r: LineItem) => r.quantity },
    { title: 'Precio Unitario', render: (_: any, r: LineItem) => `$${r.unitPrice.toFixed(2)}` },
    { title: 'Total', render: (_: any, r: LineItem) => `$${calculateLineTotal(r.quantity, r.unitPrice).toFixed(2)}` },
    {
      title: '',
      render: (_: any, r: LineItem, index: number) => (
        <Space>
          <Button size="small" onClick={() => {
            setEditingIndex(index)
            form.setFieldsValue(r)
          }}>
            Editar
          </Button>
          <Button size="small" danger icon={<MinusOutlined />} onClick={() => removeLineItem(index)} />
        </Space>
      ),
    },
  ]

  const steps = [
    { title: 'Proveedor', description: 'Selecciona proveedor' },
    { title: 'Lista de Precios', description: 'Elige lista' },
    { title: 'Items', description: 'Agrega líneas' },
    { title: 'Confirmación', description: 'Revisa y confirma' },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <Form layout="vertical">
              <Form.Item label="Seleccionar Proveedor" required>
                <Select
                  placeholder="Elige un proveedor"
                  options={supplierOptions}
                  value={selectedSupplierId}
                  onChange={(v) => { setSelectedSupplierId(v); setSelectedPriceListId(undefined); setCurrentStep(1) }}
                />
              </Form.Item>
            </Form>
          </Card>
        )
      case 1:
        return (
          <Card>
            <Form layout="vertical">
              <Form.Item label="Seleccionar Lista de Precios" required>
                <Select
                  placeholder="Elige una lista"
                  options={priceListOptions}
                  value={selectedPriceListId}
                  onChange={(v) => { setSelectedPriceListId(v); setCurrentStep(2) }}
                />
              </Form.Item>
            </Form>
          </Card>
        )
      case 2:
        return (
          <Card>
            <Title level={5}>Agregar Items</Title>
            <Form form={form} layout="vertical" onFinish={(values) => {
              const resource = resourceOptions.find(r => r.value === values.resourceId)
              addOrUpdateLineItem({
                ...values,
                resourceCode: resource?.resource?.code,
                resourceName: resource?.resource?.name,
                quantity: parseFloat(values.quantity),
                unitPrice: parseFloat(values.unitPrice),
              })
            }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="resourceId" label="Recurso" rules={[{ required: true }]}>
                    <Select
                      placeholder="Selecciona recurso"
                      options={resourceOptions}
                      onChange={(v) => {
                        const resource = resourceOptions.find(r => r.value === v)
                        form.setFieldValue('unitPrice', resource?.price)
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="quantity" label="Cantidad" rules={[{ required: true }]}>
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="unitPrice" label="Precio Unitario" rules={[{ required: true }]}>
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="deliveryTimeDays" label="Días de Entrega">
                    <InputNumber min={0} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="description" label="Descripción">
                    <Input />
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
                      {editingIndex !== null ? 'Actualizar' : 'Agregar Item'}
                    </Button>
                    {editingIndex !== null && (
                      <Button onClick={() => { setEditingIndex(null); form.resetFields() }}>
                        Cancelar
                      </Button>
                    )}
                  </Space>
                </Col>
              </Row>
            </Form>
            <Divider />
            <Title level={5}>Items ({lineItems.length})</Title>
            <Table
              dataSource={lineItems}
              columns={lineItemColumns}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              style={{ marginBottom: 16 }}
            />
            <div>
              <Button onClick={() => setCurrentStep(3)} disabled={lineItems.length === 0}>
                Ir a Confirmación
              </Button>
            </div>
          </Card>
        )
      case 3:
        return (
          <Card>
            <Title level={5}>Resumen de Orden</Title>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <div><strong>Proveedor:</strong></div>
                <div>{(suppliersData?.data ?? []).find((s: any) => s.id === selectedSupplierId)?.name}</div>
              </Col>
              <Col span={8}>
                <div><strong>Lista de Precios:</strong></div>
                <div>{(priceListsData?.data ?? []).find((pl: any) => pl.id === selectedPriceListId)?.name}</div>
              </Col>
              <Col span={8}>
                <div><strong>Tasa de Impuesto:</strong></div>
                <div>{(taxRate * 100).toFixed(0)}%</div>
              </Col>
            </Row>
            <Divider />
            <Table
              dataSource={lineItems}
              columns={lineItemColumns}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              style={{ marginBottom: 16 }}
            />
            <Divider />
            <Row justify="end" gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Row justify="space-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </Row>
                <Row justify="space-between">
                  <span>Impuesto:</span>
                  <span>${tax.toFixed(2)}</span>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between" style={{ fontWeight: 'bold', fontSize: 16 }}>
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </Row>
              </Col>
            </Row>
            <Space>
              <Button type="primary" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
                Crear Orden
              </Button>
              <Button onClick={() => setCurrentStep(2)}>Atrás</Button>
            </Space>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div>
      <Title level={4}>Nueva Orden de Compra</Title>
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />
      {renderStepContent()}
    </div>
  )
}
