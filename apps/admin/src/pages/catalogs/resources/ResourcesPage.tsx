import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Input, Select, Space, Tag, Modal, Form, Typography,
  Row, Col, App, Switch, Tabs, InputNumber, Upload, Image, Popconfirm, Spin
} from 'antd'
import { PlusOutlined, EditOutlined, PoweroffOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import { resourcesApi } from '../../../api/resources'
import { exportToCsv } from '../../../utils/exportCsv'
import { PackageComponentsManager } from './PackageComponentsManager'

const { Title, Text } = Typography

const TYPE_LABELS: Record<string, string> = {
  CONSUMABLE: 'Consumible', EQUIPMENT: 'Equipo', SPACE: 'Espacio',
  FURNITURE: 'Mobiliario', SERVICE: 'Servicio', DISCOUNT: 'Descuento', TAX: 'Impuesto', PERSONAL: 'Personal',
}
const TYPE_COLORS: Record<string, string> = {
  CONSUMABLE: 'orange', EQUIPMENT: 'blue', SPACE: 'green',
  FURNITURE: 'purple', SERVICE: 'cyan', DISCOUNT: 'red', TAX: 'gold', PERSONAL: 'magenta',
}

const UNIT_OPTIONS = [
  { value: 'kg',     label: 'kg - kilogramos' },
  { value: 'lt',     label: 'lt - litros' },
  { value: 'pza',    label: 'pza - piezas' },
  { value: 'unidad', label: 'unidad' },
  { value: 'turno',  label: 'turno' },
  { value: 'm2',     label: 'm2 - metros cuadrados' },
  { value: 'm',      label: 'm - metros' },
]

const apiUrl = import.meta.env.VITE_API_URL || ''
const imgSrc = (path: string | null | undefined) =>
  path ? (path.startsWith('/uploads') ? `${apiUrl}${path}` : path) : undefined

const IMAGE_SLOTS: { slot: 'main' | 'desc' | 'extra'; label: string; field: string }[] = [
  { slot: 'main',  label: 'Imagen Principal',   field: 'imageMain' },
  { slot: 'desc',  label: 'Imagen Descriptiva',  field: 'imageDesc' },
  { slot: 'extra', label: 'Imagen Adicional',    field: 'imageExtra' },
]

function ResourceImageSlot({
  resourceId, slot, label, currentUrl, onDone,
}: {
  resourceId: string
  slot: 'main' | 'desc' | 'extra'
  label: string
  currentUrl: string | null
  onDone: () => void
}) {
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => resourcesApi.deleteImage(resourceId, slot),
    onSuccess: () => { message.success('Imagen eliminada'); onDone() },
    onError: () => message.error('Error al eliminar imagen'),
  })

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      await resourcesApi.uploadImage(resourceId, slot, file)
      message.success('Imagen subida correctamente')
      onDone()
    } catch {
      message.error('Error al subir imagen')
    } finally {
      setUploading(false)
    }
    return false
  }

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>{label}</Text>
      {currentUrl ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Image
            src={imgSrc(currentUrl)}
            width={120}
            height={90}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="
          />
          <Space direction="vertical" size={4}>
            <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
              <Button size="small" icon={<UploadOutlined />} loading={uploading}>Reemplazar</Button>
            </Upload>
            <Popconfirm title="¿Eliminar imagen?" onConfirm={() => deleteMutation.mutate()}>
              <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>Eliminar</Button>
            </Popconfirm>
          </Space>
        </div>
      ) : (
        <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
          <Button icon={<UploadOutlined />} loading={uploading}>Subir imagen</Button>
        </Upload>
      )}
    </div>
  )
}

export default function ResourcesPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [filters, setFilters] = useState({ type: '', search: '', active: 'true' })
  const [selectedType, setSelectedType] = useState<string>('')
  const [isPackage, setIsPackage] = useState(false)
  const [packageComponents, setPackageComponents] = useState<any[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['resources', filters],
    queryFn: () => resourcesApi.list({ ...filters, pageSize: 100 }),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => resourcesApi.listDepartments(),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => editingId
      ? resourcesApi.update(editingId, values)
      : resourcesApi.create(values),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      if (!editingId) {
        // After create, switch to edit mode so images can be uploaded
        setEditingId(res.data.id)
        setEditingRecord(res.data)
        setSelectedType(res.data.type)
        setIsPackage(res.data.isPackage)
        message.success('Recurso creado. Ahora puedes agregar imágenes.')
      } else {
        // After update, refresh the record to get latest state
        setSelectedType(res.data.type)
        setIsPackage(res.data.isPackage)
        setEditingRecord(res.data)
        // Recargar componentes si es paquete
        if (res.data.isPackage) {
          resourcesApi.getPackageComponents(editingId).then((compRes) => {
            setPackageComponents(compRes.data.components ?? [])
          }).catch(() => {
            setPackageComponents([])
          })
        } else {
          setPackageComponents([])
        }
        message.success('Recurso actualizado')
      }
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.message || err?.message || 'Error desconocido'
      message.error(`Error al guardar recurso: ${detail}`)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => resourcesApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })

  function openCreate() {
    setEditingId(null)
    setEditingRecord(null)
    setSelectedType('')
    setIsPackage(false)
    setPackageComponents([])
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(record: any) {
    setEditingId(record.id)
    setEditingRecord(record)
    setSelectedType(record.type)
    setIsPackage(record.isPackage)
    form.setFieldsValue(record)
    // Cargar componentes si es paquete
    if (record.isPackage) {
      resourcesApi.getPackageComponents(record.id).then((res) => {
        setPackageComponents(res.data.components ?? [])
      }).catch(() => {
        setPackageComponents([])
      })
    } else {
      setPackageComponents([])
    }
    setModalOpen(true)
  }

  function refreshEditingRecord() {
    if (!editingId) return
    resourcesApi.get(editingId).then((res) => {
      setEditingRecord(res.data)
      setSelectedType(res.data.type)
      setIsPackage(res.data.isPackage)
      queryClient.invalidateQueries({ queryKey: ['resources'] })

      // Cargar componentes si es paquete
      if (res.data.isPackage) {
        resourcesApi.getPackageComponents(editingId).then((compRes) => {
          setPackageComponents(compRes.data.components ?? [])
        }).catch(() => {
          setPackageComponents([])
        })
      } else {
        setPackageComponents([])
      }
    })
  }

  const columns = [
    {
      title: '', key: 'img', width: 52,
      render: (_: any, r: any) => r.imageMain
        ? <Image src={imgSrc(r.imageMain)} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} preview={false} />
        : <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 4 }} />,
    },
    { title: 'Código', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    {
      title: 'Tipo', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={TYPE_COLORS[v]}>{TYPE_LABELS[v]}</Tag>,
    },
    { title: 'Departamento', render: (_: any, r: any) => r.department?.name },
    {
      title: '¿Paquete?', dataIndex: 'isPackage', key: 'isPackage', width: 80,
      render: (v: boolean) => v ? <Tag color="blue">Paquete</Tag> : '-',
    },
    { title: 'Unidad', dataIndex: 'unit', key: 'unit' },
    { title: 'Factor', dataIndex: 'factor', key: 'factor', render: (v: any) => v != null ? Number(v) : 1 },
    {
      title: 'Portal', dataIndex: 'portalVisible', key: 'portal',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Visible' : 'Oculto'}</Tag>,
    },
    {
      title: 'Activo', dataIndex: 'isActive', key: 'active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: 'Acciones', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" icon={<PoweroffOutlined />} onClick={() => toggleMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  const tabs = ['Todos', ...Object.keys(TYPE_LABELS)].map(t => ({
    key: t === 'Todos' ? '' : t,
    label: t === 'Todos' ? 'Todos' : TYPE_LABELS[t],
  }))

  const modalTabs = [
    {
      key: '1', label: 'Datos Generales',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="type" label="Tipo de Recurso" rules={[{ required: true }]}>
              <Select
                options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                onChange={setSelectedType}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="Código" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="departmentId" label="Departamento">
              <Select
                allowClear
                placeholder="Seleccionar departamento"
                showSearch
                optionFilterProp="label"
                options={(departments || [])
                  .filter((d: any) => d.isActive)
                  .map((d: any) => ({ value: d.id, label: d.name }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="unit" label="Unidad">
              <Select allowClear placeholder="Seleccionar unidad" options={UNIT_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="factor" label="Factor" initialValue={1}>
              <InputNumber min={0.001} step={0.01} style={{ width: '100%' }} precision={2} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="portalVisible" label="Visible en Portal" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isPackage" label="¿Es Paquete?" valuePropName="checked">
              <Switch onChange={setIsPackage} />
            </Form.Item>
          </Col>
          {isPackage && (
            <Col span={12}>
              <Form.Item name="isSubstitute" label="¿Componentes Sustitutos?" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          )}
          <Col span={24}>
            <Form.Item name="description" label="Notas">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: '2', label: 'Inventario',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="stock" label="Stock"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="stockLocation" label="Ubicación de Stock"><Input /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="recoveryTime" label="Tiempo de Recuperación (hrs)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="areaSqm" label="Metros Cuadrados"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="capacity" label="Capacidad"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="checkStock" label="Checar Stock" valuePropName="checked"><Switch /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="checkDuplicate" label="Verificar duplicado en Orden" valuePropName="checked" tooltip="Si está activo, no se podrá agregar este recurso más de una vez en una Orden de Servicio"><Switch /></Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: '3', label: 'Portal',
      children: (
        <Form.Item name="portalDesc" label="Descripción para Portal">
          <Input.TextArea rows={3} />
        </Form.Item>
      ),
    },
    {
      key: '4', label: 'Imágenes',
      children: editingId && editingRecord ? (
        <div>
          {IMAGE_SLOTS.map(({ slot, label, field }) => (
            <ResourceImageSlot
              key={slot}
              resourceId={editingId}
              slot={slot}
              label={label}
              currentUrl={editingRecord[field] ?? null}
              onDone={refreshEditingRecord}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: 24, color: '#888', textAlign: 'center' }}>
          Guarda el recurso primero para poder agregar imágenes.
        </div>
      ),
    },
    ...(isPackage && editingId && editingRecord
      ? [{
          key: '5', label: 'Componentes del Paquete',
          children: (
            <PackageComponentsManager
              packageResourceId={editingId}
              isSubstitute={editingRecord.isSubstitute}
              components={packageComponents}
              onComponentsChange={setPackageComponents}
              allResources={data?.data ?? []}
            />
          ),
        }]
      : []),
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Catálogo de Recursos</Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('recursos', (data?.data ?? []).map((r: any) => ({
              codigo: r.code,
              nombre: r.name,
              tipo: TYPE_LABELS[r.type] ?? r.type,
              departamento: r.department?.name ?? '',
              unidad: r.unit ?? '',
              portal: r.portalVisible ? 'Visible' : 'Oculto',
              activo: r.isActive ? 'Activo' : 'Inactivo',
            })), [
              { header: 'Código', key: 'codigo' },
              { header: 'Nombre', key: 'nombre' },
              { header: 'Tipo', key: 'tipo' },
              { header: 'Departamento', key: 'departamento' },
              { header: 'Unidad', key: 'unidad' },
              { header: 'Portal', key: 'portal' },
              { header: 'Activo', key: 'activo' },
            ])}
          >
            Exportar CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Agregar Recurso</Button>
        </Space>
      </Row>

      <Card>
        <Tabs
          items={tabs}
          onChange={(key) => setFilters(f => ({ ...f, type: key }))}
          style={{ marginBottom: 8 }}
          tabBarExtraContent={
            <Space>
              <Input.Search placeholder="Buscar..." onSearch={v => setFilters(f => ({ ...f, search: v }))} allowClear style={{ width: 200 }} />
              <Select
                value={filters.active}
                onChange={v => setFilters(f => ({ ...f, active: v }))}
                options={[{ value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }, { value: '', label: 'Todos' }]}
                style={{ width: 100 }}
              />
            </Space>
          }
        />
        <Table
          dataSource={data?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, total: data?.meta?.total }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingId ? 'Editar Recurso' : 'Agregar Recurso'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingId(null)
          setEditingRecord(null)
          setSelectedType('')
          setIsPackage(false)
          setPackageComponents([])
        }}
        onOk={() => form.submit()}
        width={700}
        confirmLoading={saveMutation.isPending}
        okText={editingId ? 'Guardar' : 'Crear'}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveMutation.mutate}
          onFinishFailed={({ errorFields }) => {
            const campos = errorFields.map(f => f.errors[0]).join(', ')
            message.warning(`Campos con error: ${campos}`)
          }}
        >
          <Tabs items={modalTabs} />
        </Form>
      </Modal>
    </div>
  )
}
