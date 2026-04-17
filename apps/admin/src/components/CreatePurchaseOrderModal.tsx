import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Modal, Steps, Form, Select, Table, Button, DatePicker, Input, InputNumber,
  Space, Spin, App, Row, Col, Statistic, Tag,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { suppliersApi } from '../api/suppliers'
import { purchaseOrdersApi } from '../api/purchaseOrders'
import { supplierPriceListsApi } from '../api/supplierPriceLists'

interface CreatePurchaseOrderModalProps {
  order: any
  open: boolean
  onClose: () => void
}

interface LineItem {
  resourceId: string
  quantity: string
  unitPrice: string
  description: string
  notes: string
  resourceName?: string
  resourceCode?: string
  resourceUnit?: string
  fromPackage?: string
}

/**
 * Parse substitution selections from an order line item's observations field.
 * Format: [SUSTITUCIÓN] <group name>: <selected name> | ...
 * Returns map of substitution group name -> selected resource name.
 */
function parseSubstitutionSelections(observations?: string): Record<string, string> {
  const selections: Record<string, string> = {}
  if (!observations) return selections
  const regex = /\[SUSTITUCIÓN\]\s+([^:]+):\s+([^|]+)/g
  let match
  while ((match = regex.exec(observations)) !== null) {
    selections[match[1].trim()] = match[2].trim()
  }
  return selections
}

/**
 * Add a resource to the items list, aggregating quantities if it already exists.
 */
function addToItems(items: LineItem[], resourceId: string, qty: number, cr: any, packageName: string) {
  const existing = items.find(i => i.resourceId === resourceId)
  if (existing) {
    existing.quantity = (parseFloat(existing.quantity) + qty).toString()
  } else {
    items.push({
      resourceId,
      quantity: qty.toString(),
      unitPrice: '',
      description: cr.name,
      notes: '',
      resourceName: cr.name,
      resourceCode: cr.code,
      resourceUnit: cr.unit,
      fromPackage: packageName,
    })
  }
}

/**
 * Explode order line items: if a resource is a package, replace it with its
 * component resources (quantity multiplied). Substitution packages are resolved
 * using the selection stored in the line item's observations field.
 */
function explodeLineItems(orderLineItems: any[]): LineItem[] {
  const items: LineItem[] = []

  for (const li of orderLineItems) {
    const resource = li.resource
    if (!resource) continue

    if (resource.isPackage && resource.packageComponents?.length > 0) {
      const orderQty = parseFloat(li.quantity) || 1
      const substitutions = parseSubstitutionSelections(li.observations)

      for (const comp of resource.packageComponents) {
        const cr = comp.componentResource
        if (!cr) continue
        const compQty = parseFloat(comp.quantity) || 1
        const totalQty = orderQty * compQty

        if (cr.isSubstitute && cr.isPackage && cr.packageComponents?.length > 0) {
          // This is a substitution group — find which option was selected
          const selectedName = substitutions[cr.name]
          if (selectedName) {
            // Find the selected component within the substitution group
            const selectedComp = cr.packageComponents.find(
              (sc: any) => sc.componentResource?.name === selectedName
            )
            if (selectedComp?.componentResource) {
              const sel = selectedComp.componentResource
              const selQty = parseFloat(selectedComp.quantity) || 1
              addToItems(items, sel.id, totalQty * selQty, sel, resource.name)
              continue
            }
          }
          // Fallback: no selection found, add first option
          const fallback = cr.packageComponents[0]?.componentResource
          if (fallback) {
            const fbQty = parseFloat(cr.packageComponents[0].quantity) || 1
            addToItems(items, fallback.id, totalQty * fbQty, fallback, resource.name)
          }
        } else {
          // Regular component — add directly
          addToItems(items, cr.id, totalQty, cr, resource.name)
        }
      }
    } else {
      // Non-package resource — pass through
      const existing = items.find(i => i.resourceId === resource.id)
      if (existing) {
        existing.quantity = (parseFloat(existing.quantity) + (parseFloat(li.quantity) || 0)).toString()
      } else {
        items.push({
          resourceId: resource.id,
          quantity: li.quantity?.toString() || '1',
          unitPrice: '',
          description: li.description || resource.name,
          notes: li.observations || '',
          resourceName: resource.name,
          resourceCode: resource.code,
          resourceUnit: resource.unit,
        })
      }
    }
  }

  return items
}

export default function CreatePurchaseOrderModal({
  order,
  open,
  onClose,
}: CreatePurchaseOrderModalProps) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')

  const initialItems = useMemo(
    () => explodeLineItems(order?.lineItems ?? []),
    [order?.lineItems]
  )
  const [lineItems, setLineItems] = useState<LineItem[]>(initialItems)

  const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null)
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [poNotes, setPoNotes] = useState('')

  const { data: suppliersResponse, isLoading: suppliersLoading, error: suppliersError } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }),
    enabled: open,
  })

  const suppliers = suppliersResponse?.data?.data || []

  // Fetch supplier's active price lists when supplier is selected
  const { data: supplierPriceListsResponse } = useQuery({
    queryKey: ['supplierPriceLists-for-po', selectedSupplierId],
    queryFn: () => supplierPriceListsApi.list({ supplierId: selectedSupplierId, isActive: true, pageSize: 100 }),
    enabled: !!selectedSupplierId,
  })

  // Fetch detail (with items) for each active/valid price list
  const priceListIds = useMemo(() => {
    const lists = supplierPriceListsResponse?.data?.data ?? []
    const now = new Date()
    return lists
      .filter((pl: any) => {
        const from = new Date(pl.validFrom)
        const to = pl.validTo ? new Date(pl.validTo) : null
        return from <= now && (!to || now <= to)
      })
      .map((pl: any) => pl.id) as string[]
  }, [supplierPriceListsResponse])

  // Fetch items from the first valid price list (most recent)
  const { data: priceListDetailResponse } = useQuery({
    queryKey: ['supplierPriceListDetail-for-po', priceListIds?.[0]],
    queryFn: () => supplierPriceListsApi.get(priceListIds[0]),
    enabled: priceListIds.length > 0,
  })

  // Build resourceId -> unitPrice map from price list items
  const priceMap = useMemo(() => {
    const map = new Map<string, string>()
    const detail = priceListDetailResponse?.data?.data ?? priceListDetailResponse?.data
    if (!detail?.items) return map
    for (const item of detail.items) {
      if (item.isActive !== false) {
        map.set(item.resourceId, item.unitPrice)
      }
    }
    return map
  }, [priceListDetailResponse])

  // Apply suggested prices when price map changes
  const [pricesApplied, setPricesApplied] = useState(false)
  useEffect(() => {
    if (priceMap.size > 0 && !pricesApplied) {
      setLineItems(prev =>
        prev.map(item => {
          const suggestedPrice = priceMap.get(item.resourceId)
          if (suggestedPrice && !item.unitPrice) {
            return { ...item, unitPrice: suggestedPrice }
          }
          return item
        })
      )
      setPricesApplied(true)
    }
  }, [priceMap, pricesApplied])

  const createPOMutation = useMutation({
    mutationFn: (payload: any) => purchaseOrdersApi.create(payload),
    onSuccess: (res) => {
      message.success('Orden de Compra creada exitosamente')
      onClose()
      navigate(`/catalogos/ordenes-compra/${res.data.id}`)
    },
    onError: () => {
      message.error('Error al crear la Orden de Compra')
    },
  })

  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplierId(supplierId)
    setPricesApplied(false)
    // Reset prices so new supplier prices can be applied
    setLineItems(prev => prev.map(item => ({ ...item, unitPrice: '' })))
    setCurrentStep(1)
  }

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        resourceId: '',
        quantity: '1',
        unitPrice: '',
        description: '',
        notes: '',
      },
    ])
  }

  const handleCreatePO = () => {
    if (!selectedSupplierId) {
      message.error('Selecciona un proveedor')
      return
    }

    if (lineItems.length === 0) {
      message.error('Agrega al menos un artículo')
      return
    }

    if (!deliveryDate) {
      message.error('Especifica una fecha de entrega')
      return
    }

    if (lineItems.some(li => !li.resourceId || !li.quantity)) {
      message.error('Todos los artículos deben tener ID de recurso y cantidad')
      return
    }

    const payload = {
      supplierId: selectedSupplierId,
      originOrderId: order.id,
      requiredDeliveryDate: deliveryDate.toISOString(),
      deliveryLocation: deliveryLocation || undefined,
      description: undefined,
      notes: poNotes || undefined,
      lineItems: lineItems.map(li => ({
        resourceId: li.resourceId,
        quantity: li.quantity,
        unitPrice: li.unitPrice || undefined,
        notes: li.notes || undefined,
      })),
    }

    createPOMutation.mutate(payload)
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unitPrice) || 0
      return sum + qty * price
    }, 0)

    const taxRate = 0.16
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    return { subtotal, taxAmount, total }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  const lineItemsColumns = [
    {
      title: 'Recurso',
      key: 'resourceName',
      width: 200,
      render: (_: any, record: LineItem) => (
        <div>
          <div>{record.resourceName}</div>
          {record.fromPackage && (
            <Tag color="blue" style={{ fontSize: 11, marginTop: 2 }}>Paquete: {record.fromPackage}</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Unidad',
      dataIndex: 'resourceUnit',
      key: 'resourceUnit',
      width: 80,
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (_: any, record: LineItem, index: number) => (
        <InputNumber
          min="0"
          step="0.01"
          value={parseFloat(record.quantity)}
          onChange={(val) => handleLineItemChange(index, 'quantity', val?.toString() || '0')}
          size="small"
        />
      ),
    },
    {
      title: 'Precio Unitario',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 140,
      render: (_: any, record: LineItem, index: number) => {
        const hasSuggested = priceMap.has(record.resourceId)
        return (
          <Space direction="vertical" size={0}>
            <InputNumber
              min="0"
              step="0.01"
              value={parseFloat(record.unitPrice) || undefined}
              onChange={(val) => handleLineItemChange(index, 'unitPrice', val?.toString() || '')}
              size="small"
              placeholder="$"
              style={hasSuggested ? { borderColor: '#52c41a' } : undefined}
            />
            {hasSuggested && (
              <span style={{ fontSize: 11, color: '#52c41a' }}>Precio sugerido</span>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      width: 120,
      render: (_: any, record: LineItem) => {
        const qty = parseFloat(record.quantity) || 0
        const price = parseFloat(record.unitPrice) || 0
        return `$${(qty * price).toFixed(2)}`
      },
    },
    {
      title: 'Notas',
      dataIndex: 'notes',
      key: 'notes',
      render: (_: any, record: LineItem, index: number) => (
        <Input
          size="small"
          value={record.notes}
          onChange={(e) => handleLineItemChange(index, 'notes', e.target.value)}
          placeholder="Notas"
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: any, _record: LineItem, index: number) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveLineItem(index)}
        />
      ),
    },
  ]

  const steps = [
    { title: 'Proveedor', description: 'Selecciona el proveedor' },
    { title: 'Artículos', description: 'Revisa los artículos' },
    { title: 'Entrega', description: 'Detalles de entrega' },
    { title: 'Confirmar', description: 'Revisar y crear' },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ padding: '20px 0' }}>
            <Form layout="vertical">
              <Form.Item label="Proveedor" required>
                {suppliersError && (
                  <div style={{ color: 'red', marginBottom: '10px', fontSize: '12px' }}>
                    Error al cargar proveedores: {(suppliersError as any)?.message || 'Error desconocido'}
                  </div>
                )}
                <Select
                  placeholder={suppliersLoading ? 'Cargando proveedores...' : 'Selecciona un proveedor'}
                  loading={suppliersLoading}
                  onSelect={handleSupplierSelect}
                  optionLabelProp="label"
                  disabled={suppliersLoading || !suppliers || (Array.isArray(suppliers) && suppliers.length === 0)}
                >
                  {Array.isArray(suppliers) ? (
                    suppliers.map((supplier: any) => (
                      <Select.Option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </Select.Option>
                    ))
                  ) : null}
                </Select>
                {Array.isArray(suppliers) && suppliers.length === 0 && !suppliersLoading && (
                  <div style={{ color: '#999', marginTop: '8px', fontSize: '12px' }}>
                    No hay proveedores disponibles
                  </div>
                )}
              </Form.Item>
            </Form>
          </div>
        )

      case 1:
        return (
          <div style={{ padding: '20px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <h4>Componentes de la Orden de Servicio</h4>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
                  Los paquetes se desglosan automáticamente en sus recursos individuales.
                </p>
                {priceMap.size > 0 && (
                  <Tag color="green" style={{ marginBottom: 12 }}>
                    Precios sugeridos desde lista de precios del proveedor ({priceMap.size} recursos encontrados)
                  </Tag>
                )}
                {selectedSupplierId && priceMap.size === 0 && pricesApplied && (
                  <Tag color="orange" style={{ marginBottom: 12 }}>
                    El proveedor no tiene lista de precios activa con estos recursos
                  </Tag>
                )}
                <Table
                  columns={lineItemsColumns}
                  dataSource={lineItems.map((item, idx) => ({ ...item, key: idx }))}
                  pagination={false}
                  size="small"
                  rowKey="key"
                />
              </div>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddLineItem}
                block
              >
                Agregar Artículo
              </Button>
            </Space>
          </div>
        )

      case 2:
        return (
          <Form form={form} layout="vertical" style={{ padding: '20px 0' }}>
            <Form.Item label="Fecha de Entrega" required>
              <DatePicker
                value={deliveryDate}
                onChange={(date) => setDeliveryDate(date)}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="Ubicación de Entrega">
              <Input
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="Ej: Bodega principal, oficina, etc."
              />
            </Form.Item>
            <Form.Item label="Notas">
              <Input.TextArea
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                rows={3}
                placeholder="Notas adicionales sobre la orden"
              />
            </Form.Item>
          </Form>
        )

      case 3:
        const supplier = Array.isArray(suppliers) ? suppliers.find((s: any) => s.id === selectedSupplierId) : undefined
        return (
          <div style={{ padding: '20px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <h4>Resumen de la Orden de Compra</h4>
                <Table
                  columns={[
                    { title: 'Recurso', dataIndex: 'resourceName', key: 'resourceName' },
                    { title: 'Unidad', dataIndex: 'resourceUnit', key: 'resourceUnit', width: 80 },
                    { title: 'Cantidad', dataIndex: 'quantity', key: 'quantity' },
                    { title: 'Precio', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: string) => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
                    {
                      title: 'Subtotal',
                      key: 'subtotal',
                      render: (_: any, record: LineItem) => {
                        const qty = parseFloat(record.quantity) || 0
                        const price = parseFloat(record.unitPrice) || 0
                        return `$${(qty * price).toFixed(2)}`
                      },
                    },
                  ]}
                  dataSource={lineItems.map((item, idx) => ({ ...item, key: idx }))}
                  pagination={false}
                  size="small"
                />
              </div>

              <div>
                <h4>Detalles</h4>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="Proveedor"
                      value={supplier?.name || '-'}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Fecha de Entrega"
                      value={deliveryDate?.format('DD/MM/YYYY') || '-'}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Ubicación"
                      value={deliveryLocation || '-'}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                </Row>
              </div>

              <div>
                <h4>Totales</h4>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Subtotal" value={subtotal} prefix="$" precision={2} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="IVA (16%)" value={taxAmount} prefix="$" precision={2} />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Total"
                      value={total}
                      prefix="$"
                      precision={2}
                      valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                    />
                  </Col>
                </Row>
              </div>
            </Space>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal
      title="Crear Orden de Compra desde Orden de Servicio"
      open={open}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button
          key="prev"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          Anterior
        </Button>,
        <Button
          key="next"
          onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
          disabled={currentStep === 3 || (currentStep === 0 && !selectedSupplierId) || (currentStep === 2 && !deliveryDate)}
        >
          Siguiente
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleCreatePO}
          disabled={currentStep !== 3}
          loading={createPOMutation.isPending}
        >
          Crear Orden de Compra
        </Button>,
      ]}
    >
      <Spin spinning={createPOMutation.isPending}>
        <Steps current={currentStep} items={steps} size="small" />
        <div style={{ marginTop: '20px' }}>
          {renderStepContent()}
        </div>
      </Spin>
    </Modal>
  )
}
