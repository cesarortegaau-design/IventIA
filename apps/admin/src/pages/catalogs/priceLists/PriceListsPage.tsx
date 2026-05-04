import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Space, Tag, Modal, Form, Input, DatePicker,
  InputNumber, Typography, Row, Col, App, Select, Empty, Avatar, Divider,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DownloadOutlined, UploadOutlined,
  OrderedListOutlined, MoreOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { priceListsApi } from '../../../api/priceLists'
import { resourcesApi } from '../../../api/resources'
import { exportToCsv } from '../../../utils/exportCsv'
import { PageHeader } from '../../../components/ui'
import { formatMoney, getInitials, getAvatarColors } from '../../../utils/format'

const { Text } = Typography

const TIME_UNIT_OPTIONS = [
  { value: 'no aplica',        label: 'no aplica' },
  { value: 'horas',            label: 'horas' },
  { value: 'días',             label: 'días' },
  { value: 'horas sin factor', label: 'horas sin factor' },
  { value: 'días sin factor',  label: 'días sin factor' },
]

const REQUIRED_CSV_COLUMNS = ['Recurso', 'P. Anticipado', 'P. Normal', 'P. Tardío', 'Unidad de Tiempo']
const VALID_TIME_UNITS = ['no aplica', 'horas', 'días', 'horas sin factor', 'días sin factor']

function parsePriceListItemsCsv(text: string): { rows: any[]; error?: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { rows: [], error: 'El archivo no contiene datos' }

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  for (const col of REQUIRED_CSV_COLUMNS) {
    if (!headers.includes(col)) {
      return { rows: [], error: `Columna requerida no encontrada: "${col}". Las columnas deben ser exactamente: ${REQUIRED_CSV_COLUMNS.join(', ')}` }
    }
  }

  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? '' })

    if (!row['Recurso']) continue

    const earlyPrice = parseFloat(row['P. Anticipado'])
    const normalPrice = parseFloat(row['P. Normal'])
    const latePrice = parseFloat(row['P. Tardío'])
    const timeUnit = row['Unidad de Tiempo']

    if (isNaN(earlyPrice) || isNaN(normalPrice) || isNaN(latePrice)) {
      return { rows: [], error: `Fila ${i + 1}: los campos de precio deben ser números válidos` }
    }
    if (!VALID_TIME_UNITS.includes(timeUnit)) {
      return { rows: [], error: `Fila ${i + 1}: "Unidad de Tiempo" debe ser uno de: ${VALID_TIME_UNITS.join(', ')}` }
    }

    rows.push({ resourceCode: row['Recurso'], earlyPrice, normalPrice, latePrice, timeUnit, detail: row['Detalle'] ?? '' })
  }
  return { rows }
}

export default function PriceListsPage() {
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)   // sidebar selection
  const [viewingId, setViewingId] = useState<string | null>(null)     // items modal
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [packageQty, setPackageQty] = useState<number>(1)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    mutationFn: (values: any) => {
      const { unit: _unit, factor: _factor, ...rest } = values
      return priceListsApi.upsertItem(viewingId!, rest)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list-detail', viewingId] })
      setItemModalOpen(false)
      itemForm.resetFields()
      setSelectedResourceId(null)
      message.success('Artículo agregado')
    },
  })

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => priceListsApi.importItems(viewingId!, rows),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['price-list-detail', viewingId] })
      setImportModalOpen(false)
      setImportPreview(null)
      message.success(`Importación exitosa: ${res.data?.imported ?? 0} artículos`)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Error al importar')
    },
  })

  function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { rows, error } = parsePriceListItemsCsv(text)
      if (error) {
        message.error(error)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setImportPreview(rows)
      setImportModalOpen(true)
    }
    reader.readAsText(file, 'utf-8')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function downloadTemplate() {
    const templateRows = [{ resourceCode: 'RECURSO-001', earlyPrice: 100, normalPrice: 120, latePrice: 140, timeUnit: 'no aplica', detail: '' }]
    exportToCsv('plantilla-lista-precios', templateRows, [
      { header: 'Recurso', key: 'resourceCode' },
      { header: 'P. Anticipado', key: 'earlyPrice' },
      { header: 'P. Normal', key: 'normalPrice' },
      { header: 'P. Tardío', key: 'latePrice' },
      { header: 'Unidad de Tiempo', key: 'timeUnit' },
      { header: 'Detalle', key: 'detail' },
    ])
  }

  function exportItems() {
    const items = detailData?.data?.items ?? []
    exportToCsv(`lista-precios-${detailData?.data?.name ?? viewingId}-articulos`, items.map((r: any) => ({
      recurso: r.resource?.code ?? '',
      nombre: r.resource?.name ?? '',
      unidad: r.resource?.unit ?? '',
      factor: r.resource?.factor != null ? Number(r.resource.factor) : 1,
      unidadTiempo: r.timeUnit ?? 'no aplica',
      detalle: r.detail ?? '',
      earlyPrice: Number(r.earlyPrice).toFixed(2),
      normalPrice: Number(r.normalPrice).toFixed(2),
      latePrice: Number(r.latePrice).toFixed(2),
    })), [
      { header: 'Recurso', key: 'recurso' },
      { header: 'Nombre', key: 'nombre' },
      { header: 'Unidad', key: 'unidad' },
      { header: 'Factor', key: 'factor' },
      { header: 'Unidad de Tiempo', key: 'unidadTiempo' },
      { header: 'Detalle', key: 'detalle' },
      { header: 'P. Anticipado', key: 'earlyPrice' },
      { header: 'P. Normal', key: 'normalPrice' },
      { header: 'P. Tardío', key: 'latePrice' },
    ])
  }

  const allLists: any[] = data?.data ?? []
  const selectedList = allLists.find((l: any) => l.id === selectedId)

  const columns = [
    {
      title: 'Lista',
      render: (_: any, r: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 1 }}>
            {r._count?.items ?? 0} artículos · {r.discountPct ?? 0}% desc. máx.
          </div>
        </div>
      ),
    },
    {
      title: 'Moneda',
      dataIndex: 'currency',
      width: 80,
      render: (v: string) => <Tag>{v || 'MXN'}</Tag>,
    },
    {
      title: 'Items',
      width: 70,
      render: (_: any, r: any) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{r._count?.items ?? 0}</Text>
      ),
    },
    {
      title: 'Vigencia',
      width: 200,
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {r.earlyCutoff ? dayjs(r.earlyCutoff).format('DD/MM/YY') : '—'}
          {' → '}
          {r.normalCutoff ? dayjs(r.normalCutoff).format('DD/MM/YY') : '—'}
        </span>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 90,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activa' : 'Inactiva'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, r: any) => (
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            setEditingId(r.id)
            form.setFieldsValue({
              ...r,
              earlyCutoff: r.earlyCutoff ? dayjs(r.earlyCutoff) : null,
              normalCutoff: r.normalCutoff ? dayjs(r.normalCutoff) : null,
            })
            setModalOpen(true)
          }}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Listas de Precio"
        meta={`Tarifas para clientes · ${allLists.length} listas`}
        actions={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => exportToCsv('listas-de-precio', allLists.map((r: any) => ({
                nombre: r.name,
                activo: r.isActive ? 'Activo' : 'Inactivo',
              })), [
                { header: 'Nombre', key: 'nombre' },
                { header: 'Activo', key: 'activo' },
              ])}
            >
              Exportar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}
            >
              Nueva Lista
            </Button>
          </Space>
        }
      />

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, minHeight: 'calc(100vh - 120px)', background: '#f5f5f5' }}>
        {/* Left — table */}
        <div style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Table
            dataSource={allLists}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            size="middle"
            pagination={false}
            onRow={(r) => ({
              onClick: () => setSelectedId(r.id === selectedId ? null : r.id),
              style: {
                cursor: 'pointer',
                background: r.id === selectedId ? '#f4eeff' : undefined,
              },
            })}
          />
        </div>

        {/* Right — detail panel */}
        <div style={{ padding: 20 }}>
          {!selectedList ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <Empty description="Selecciona una lista para ver su detalle" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <Card size="small" styles={{ body: { padding: 0 } }}>
              {/* Header */}
              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#f4eeff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    💰
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, display: 'block' }}>{selectedList.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedList._count?.items ?? 0} artículos
                    </Text>
                  </div>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingId(selectedList.id)
                      form.setFieldsValue({
                        ...selectedList,
                        earlyCutoff: selectedList.earlyCutoff ? dayjs(selectedList.earlyCutoff) : null,
                        normalCutoff: selectedList.normalCutoff ? dayjs(selectedList.normalCutoff) : null,
                      })
                      setModalOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </div>

              {/* Stats 2×2 */}
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  {
                    label: 'Precio Anticipado hasta',
                    value: selectedList.earlyCutoff ? dayjs(selectedList.earlyCutoff).format('DD/MM/YYYY') : '—',
                  },
                  {
                    label: 'Precio Normal hasta',
                    value: selectedList.normalCutoff ? dayjs(selectedList.normalCutoff).format('DD/MM/YYYY') : '—',
                  },
                  {
                    label: 'Items',
                    value: String(selectedList._count?.items ?? 0),
                  },
                  {
                    label: 'Descuento base',
                    value: `${selectedList.discountPct ?? 0}%`,
                  },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: '#fafafa', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <Divider style={{ margin: 0 }} />

              {/* Actions */}
              <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  icon={<OrderedListOutlined />}
                  onClick={() => { setViewingId(selectedList.id) }}
                >
                  Ver artículos
                </Button>
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => { setViewingId(selectedList.id); fileInputRef.current?.click() }}
                >
                  Importar CSV
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={downloadTemplate}
                >
                  Plantilla
                </Button>
              </div>

              {/* Price rules summary */}
              <Divider style={{ margin: 0 }} />
              <div style={{ padding: '12px 20px 16px' }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.65)', display: 'block', marginBottom: 8 }}>
                  Reglas de precio
                </Text>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.55)', lineHeight: '22px' }}>
                  <li>
                    Anticipado: hasta {selectedList.earlyCutoff ? dayjs(selectedList.earlyCutoff).format('DD/MM/YYYY') : 'sin fecha'}
                  </li>
                  <li>
                    Normal: hasta {selectedList.normalCutoff ? dayjs(selectedList.normalCutoff).format('DD/MM/YYYY') : 'sin fecha'}
                  </li>
                  <li>Tardío: después del precio normal</li>
                  {(selectedList.discountPct ?? 0) > 0 && (
                    <li>Descuento máximo autorizado: {selectedList.discountPct}%</li>
                  )}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Items modal */}
      <Modal
        title={`Artículos — ${detailData?.data?.name}`}
        open={!!viewingId}
        onCancel={() => setViewingId(null)}
        footer={[
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setItemModalOpen(true)}>Agregar artículo</Button>,
          <Button key="import" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>Importar CSV</Button>,
          <Button key="template" icon={<DownloadOutlined />} onClick={downloadTemplate}>Descargar plantilla</Button>,
          <Button key="export" icon={<DownloadOutlined />} onClick={exportItems}>Exportar CSV</Button>,
          <Button key="close" onClick={() => setViewingId(null)}>Cerrar</Button>,
        ]}
        width={1100}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleCsvFileChange}
        />
        <Table
          dataSource={detailData?.data?.items ?? []}
          rowKey="id"
          size="small"
          columns={[
            { title: 'Recurso', render: (_: any, r: any) => r.resource?.name },
            { title: 'Unidad', render: (_: any, r: any) => r.resource?.unit ?? '—' },
            { title: 'Factor', render: (_: any, r: any) => r.resource?.factor != null ? Number(r.resource.factor) : 1 },
            { title: 'Unidad de Tiempo', dataIndex: 'timeUnit', render: (v: string) => v || 'no aplica' },
            { title: 'Detalle', dataIndex: 'detail', render: (v: string) => v || '—' },
            { title: 'P. Anticipado', dataIndex: 'earlyPrice', render: (v: number) => formatMoney(Number(v), 'MXN') },
            { title: 'P. Normal', dataIndex: 'normalPrice', render: (v: number) => formatMoney(Number(v), 'MXN') },
            { title: 'P. Tardío', dataIndex: 'latePrice', render: (v: number) => formatMoney(Number(v), 'MXN') },
          ]}
          expandable={{
            expandedRowRender: (r: any) => {
              if (!r.resource?.isPackage || !r.resource?.packageComponents?.length) return null
              return (
                <div style={{ padding: '12px 0' }}>
                  <strong style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                    📦 Componentes requeridos por {r.resource?.unit || 'paquete'}
                  </strong>
                  <Table
                    dataSource={r.resource.packageComponents}
                    rowKey="componentResourceId"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: 'Código', key: 'code', width: 80, render: (_: any, comp: any) => comp.componentResource.code },
                      { title: 'Nombre', key: 'name', render: (_: any, comp: any) => comp.componentResource.name },
                      { title: 'Cantidad', key: 'quantity', width: 100, align: 'right' as const, render: (_: any, comp: any) => Number(comp.quantity).toFixed(3) },
                      { title: 'Unidad', key: 'unit', width: 100, render: (_: any, comp: any) => comp.componentResource.unit || '—' },
                    ]}
                  />
                </div>
              )
            },
          }}
        />
      </Modal>

      {/* Import preview modal */}
      <Modal
        title="Vista previa de importación"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); setImportPreview(null) }}
        onOk={() => importPreview && importMutation.mutate(importPreview)}
        confirmLoading={importMutation.isPending}
        okText={`Importar ${importPreview?.length ?? 0} artículos`}
        width={700}
      >
        <p style={{ color: '#d46b08', marginBottom: 12 }}>
          Al importar, todos los artículos actuales de la lista serán reemplazados.
        </p>
        <Table
          dataSource={importPreview ?? []}
          rowKey={(_, i) => String(i)}
          size="small"
          pagination={false}
          scroll={{ y: 300 }}
          columns={[
            { title: 'Recurso', dataIndex: 'resourceCode' },
            { title: 'Unidad de Tiempo', dataIndex: 'timeUnit' },
            { title: 'P. Anticipado', dataIndex: 'earlyPrice', render: (v: number) => `$${v.toFixed(2)}` },
            { title: 'P. Normal', dataIndex: 'normalPrice', render: (v: number) => `$${v.toFixed(2)}` },
            { title: 'P. Tardío', dataIndex: 'latePrice', render: (v: number) => `$${v.toFixed(2)}` },
          ]}
        />
      </Modal>

      {/* Create/Edit price list modal */}
      <Modal
        title={editingId ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        forceRender
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
        forceRender
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
                const resource = (resourcesData?.data ?? []).find((r: any) => r.id === value)
                if (resource) {
                  itemForm.setFieldsValue({ unit: resource.unit, factor: resource.factor != null ? Number(resource.factor) : 1 })
                }
              }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="unit" label="Unidad (del recurso)">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="factor" label="Factor (del recurso)">
                <InputNumber disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

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
                  { title: 'Código', key: 'code', width: 70, render: (_: any, r: any) => r.componentResource.code },
                  { title: 'Nombre', key: 'name', render: (_: any, r: any) => r.componentResource.name },
                  { title: 'Qty × Paq', key: 'qtyPackage', width: 80, align: 'right' as const, render: (_: any, r: any) => Number(r.quantity).toFixed(3) },
                  { title: 'Total Requerido', key: 'qtyTotal', width: 110, align: 'right' as const, render: (_: any, r: any) => (Number(r.quantity) * packageQty).toFixed(3) },
                  { title: 'Unidad', key: 'unit', width: 80, render: (_: any, r: any) => r.componentResource.unit || '—' },
                ]}
              />
            </div>
          )}

          <Row gutter={8}>
            <Col span={8}><Form.Item name="earlyPrice" label="Precio Anticipado" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
            <Col span={8}><Form.Item name="normalPrice" label="Precio Normal" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
            <Col span={8}><Form.Item name="latePrice" label="Precio Tardío" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} prefix="$" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="timeUnit" label="Unidad de Tiempo" initialValue="no aplica">
                <Select options={TIME_UNIT_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="detail" label="Detalle">
            <Input.TextArea rows={2} placeholder="Descripción adicional del artículo en esta lista..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
