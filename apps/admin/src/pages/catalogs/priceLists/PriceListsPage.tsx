import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Space, Tag, Modal, Form, Input, DatePicker,
  InputNumber, Typography, Row, Col, App, Select, Descriptions
} from 'antd'
import { PlusOutlined, EditOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { priceListsApi } from '../../../api/priceLists'
import { resourcesApi } from '../../../api/resources'
import { exportToCsv } from '../../../utils/exportCsv'

const { Title } = Typography

export default function PriceListsPage() {
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [packageQty, setPackageQty] = useState<number>(1)

  const { data, isLoading } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => priceListsApi.list(),
  })

  const { data: detailData } = useQuery({
    queryKey: ['price-list-detail', viewingId],
    queryFn: () => priceListsApi.get(viewingId!),
    enabled: !!viewingId,
  })

  const { data: resourcesData } = useQuery({
    queryKey: ['resources', { active: 'true' }],
    queryFn: () => resourcesApi.list({ active: true, pageSize: 200 }),
    enabled: itemModalOpen,
  })

  const { data: selectedResourceData } = useQuery({
    queryKey: ['resource-detail', selectedResourceId],
    queryFn: () => resourcesApi.get(selectedResourceId!),
    enabled: !!selectedResourceId,
  })

  const { data: packageComponentsData } = useQuery({
    queryKey: ['package-components', selectedResourceId],
    queryFn: () => resourcesApi.getPackageComponents(selectedResourceId!),
    enabled: !!selectedResourceId && selectedResourceData?.data?.isPackage,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        earlyCutoff: values.earlyCutoff?.toISOString(),
        normalCutoff: values.normalCutoff?.toISOString(),
      }
      return editingId ? priceListsApi.update(editingId, payload) : priceListsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Lista de precios guardada')
    },
  })

  const addItemMutation = useMutation({
    mutationFn: (values: any) => priceListsApi.upsertItem(viewingId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list-detail', viewingId] })
      setItemModalOpen(false)
      itemForm.resetFields()
      message.success('Artículo agregado')
    },
  })

  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Precio Anticipado hasta', dataIndex: 'earlyCutoff', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Precio Normal hasta', dataIndex: 'normalCutoff', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Descuento %', dataIndex: 'discountPct', render: (v: number) => `${v}%` },
    { title: 'Artículos', render: (_: any, r: any) => r._count?.items ?? 0 },
    {
      title: 'Activo', dataIndex: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: '', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewingId(r.id)}>Ver artículos</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingId(r.id); form.setFieldsValue({ ...r, earlyCutoff: r.earlyCutoff ? dayjs(r.earlyCutoff) : null, normalCutoff: r.normalCutoff ? dayjs(r.normalCutoff) : null }); setModalOpen(true) }} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Listas de Precio</Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('listas-de-precio', (data?.data ?? []).map((r: any) => ({
              nombre: r.name,
              activo: r.isActive ? 'Activo' : 'Inactivo',
            })), [
              { header: 'Nombre', key: 'nombre' },
              { header: 'Activo', key: 'activo' },
            ])}
          >
            Exportar CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
            Nueva Lista
          </Button>
        </Space>
      </Row>

      <Card>
        <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>

      {/* Price list detail modal */}
      <Modal
        title={`Artículos — ${detailData?.data?.name}`}
        open={!!viewingId}
        onCancel={() => setViewingId(null)}
        footer={[
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setItemModalOpen(true)}>Agregar artículo</Button>,
          <Button key="close" onClick={() => setViewingId(null)}>Cerrar</Button>,
        ]}
        width={900}
      >
        <Table
          dataSource={detailData?.data?.items ?? []}
          rowKey="id"
          size="small"
          columns={[
            { title: 'Recurso', render: (_: any, r: any) => r.resource?.name },
            { title: 'P. Anticipado', dataIndex: 'earlyPrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
            { title: 'P. Normal', dataIndex: 'normalPrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
            { title: 'P. Tardío', dataIndex: 'latePrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
            { title: 'Unidad', dataIndex: 'unit' },
          ]}
          expandable={{
            expandedRowRender: (r: any) => {
              if (!r.resource?.isPackage || !r.resource?.packageComponents?.length) return null
              return (
                <div style={{ padding: '12px 0' }}>
                  <strong style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>📦 Componentes requeridos por {r.unit || 'paquete'}</strong>
                  <Table
                    dataSource={r.resource.packageComponents}
                    rowKey="componentResourceId"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: 'Código',
                        key: 'code',
                        width: 80,
                        render: (_: any, comp: any) => comp.componentResource.code,
                      },
                      {
                        title: 'Nombre',
                        key: 'name',
                        render: (_: any, comp: any) => comp.componentResource.name,
                      },
                      {
                        title: 'Cantidad',
                        key: 'quantity',
                        width: 100,
                        align: 'right' as const,
                        render: (_: any, comp: any) => Number(comp.quantity).toFixed(3),
                      },
                      {
                        title: 'Unidad',
                        key: 'unit',
                        width: 100,
                        render: (_: any, comp: any) => comp.componentResource.unit || '—',
                      },
                    ]}
                  />
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                    * Cantidades requeridas por cada {r.unit || 'paquete'} agregado a la lista de precios
                  </div>
                </div>
              )
            },
          }}
        />
      </Modal>

      {/* Create/Edit price list modal */}
      <Modal
        title={editingId ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="earlyCutoff" label="Fin Precio Anticipado">
                <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="normalCutoff" label="Fin Precio Normal">
                <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="discountPct" label="% Descuento Autorizado" initialValue={0}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add item modal */}
      <Modal
        title="Agregar Artículo a Lista de Precios"
        open={itemModalOpen}
        onCancel={() => {
          setItemModalOpen(false)
          setSelectedResourceId(null)
          itemForm.resetFields()
        }}
        onOk={() => itemForm.submit()}
        confirmLoading={addItemMutation.isPending}
        width={800}
      >
        <Form form={itemForm} layout="vertical" onFinish={addItemMutation.mutate}>
          <Form.Item name="resourceId" label="Recurso" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(resourcesData?.data ?? []).map((r: any) => ({ value: r.id, label: `${r.name} (${r.code})` }))}
              filterOption={(i, o) => o?.label?.toLowerCase().includes(i.toLowerCase()) ?? false}
              onChange={(value) => {
                setSelectedResourceId(value)
                setPackageQty(1)
              }}
            />
          </Form.Item>

          {selectedResourceData?.data?.isPackage && packageComponentsData?.data?.components && (
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>📦 Componentes del paquete</strong>
                <Row gutter={8} style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <Col span={12}>
                    <label style={{ fontSize: '12px', color: '#666' }}>Cantidad de paquetes a agregar</label>
                    <InputNumber
                      min={0.001}
                      step={0.001}
                      value={packageQty}
                      onChange={(v) => setPackageQty(v ?? 1)}
                      style={{ width: '100%', marginTop: '4px' }}
                      precision={3}
                    />
                  </Col>
                </Row>
              </div>
              <Table
                dataSource={packageComponentsData.data.components}
                rowKey="componentResourceId"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Código',
                    key: 'code',
                    width: 70,
                    render: (_: any, r: any) => r.componentResource.code,
                  },
                  {
                    title: 'Nombre',
                    key: 'name',
                    render: (_: any, r: any) => r.componentResource.name,
                  },
                  {
                    title: 'Qty × Paq',
                    key: 'qtyPackage',
                    width: 80,
                    align: 'right' as const,
                    render: (_: any, r: any) => Number(r.quantity).toFixed(3),
                  },
                  {
                    title: 'Total Requerido',
                    key: 'qtyTotal',
                    width: 110,
                    align: 'right' as const,
                    render: (_: any, r: any) => (Number(r.quantity) * packageQty).toFixed(3),
                  },
                  {
                    title: 'Unidad',
                    key: 'unit',
                    width: 80,
                    render: (_: any, r: any) => r.componentResource.unit || '—',
                  },
                ]}
              />
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                * "Qty × Paq": cantidad de cada componente por cada paquete<br/>
                * "Total Requerido": cantidad total si se agregan {packageQty} paquete(s)
              </div>
            </div>
          )}

          <Row gutter={8}>
            <Col span={8}><Form.Item name="earlyPrice" label="Precio Anticipado" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
            <Col span={8}><Form.Item name="normalPrice" label="Precio Normal" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
            <Col span={8}><Form.Item name="latePrice" label="Precio Tardío" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
          </Row>
          <Form.Item name="unit" label="Unidad"><Input placeholder="pza, hr, m2..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
