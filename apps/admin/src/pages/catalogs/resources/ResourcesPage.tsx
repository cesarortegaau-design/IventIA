import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Select, Space, Tag, Modal, Form, Typography,
  Row, Col, App, Switch, Tabs, InputNumber, Upload, Image, Popconfirm, Input,
} from 'antd'
import {
  PlusOutlined, EditOutlined, PoweroffOutlined, UploadOutlined,
  DeleteOutlined, DownloadOutlined, ImportOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { resourcesApi } from '../../../api/resources'
import { PackageComponentsManager } from './PackageComponentsManager'
import { PageHeader, FilterBar } from '../../../components/ui'
import { formatPercent } from '../../../utils/format'

const { Text } = Typography

const TYPE_LABELS: Record<string, string> = {
  CONSUMABLE: 'Consumible', CONCEPT: 'Concepto', EQUIPMENT: 'Equipo', SPACE: 'Espacio',
  FURNITURE: 'Mobiliario', SERVICE: 'Servicio', DISCOUNT: 'Descuento',
  TAX: 'Impuesto', PERSONAL: 'Personal', TICKET: 'Boleto',
}
const TYPE_COLORS: Record<string, string> = {
  CONSUMABLE: 'orange', CONCEPT: 'geekblue', EQUIPMENT: 'blue', SPACE: 'green',
  FURNITURE: 'purple', SERVICE: 'cyan', DISCOUNT: 'red',
  TAX: 'gold', PERSONAL: 'magenta', TICKET: 'volcano',
}
const TYPE_EMOJI: Record<string, string> = {
  CONSUMABLE: '📦', CONCEPT: '💡', EQUIPMENT: '🔧', SPACE: '🏛️',
  FURNITURE: '🪑', SERVICE: '⚙️', DISCOUNT: '🏷️',
  TAX: '📋', PERSONAL: '👤', TICKET: '🎫',
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg - kilogramos' },
  { value: 'lt', label: 'lt - litros' },
  { value: 'pza', label: 'pza - piezas' },
  { value: 'unidad', label: 'unidad' },
  { value: 'turno', label: 'turno' },
  { value: 'm2', label: 'm2 - metros cuadrados' },
  { value: 'm', label: 'm - metros' },
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
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Sidebar category selection: '' = all, or a type key
  const [sidebarType, setSidebarType] = useState('')

  // CSV template columns (must match import format)
  const CSV_TEMPLATE_COLS = ['codigo','nombre','tipo','descripcion','unidad','factor','departamento','esPaquete','esSubstituto','stock','ubicacionStock','tiempoRecuperacion','areaSqm','capacidad','checarStock','verificarDuplicado','activo']

  function downloadTemplate() {
    const header = CSV_TEMPLATE_COLS.join(',')
    const example = 'REC-001,Silla plegable,CONSUMABLE,Silla blanca plegable,pza,1,Mobiliario,NO,NO,50,,0,,,NO,SI,SI'
    const blob = new Blob([`${header}\n${example}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plantilla_recursos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportCsv() {
    try {
      const res = await resourcesApi.exportCsv(filters.type ? { type: filters.type } : {})
      const rows = res.data ?? res
      if (!rows?.length) { message.warning('No hay recursos para exportar'); return }
      const header = CSV_TEMPLATE_COLS.join(',')
      const body = rows.map((r: any) =>
        CSV_TEMPLATE_COLS.map(k => {
          const v = r[k] ?? ''
          return String(v).includes(',') ? `"${v}"` : v
        }).join(',')
      ).join('\n')
      const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'recursos.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Error al exportar')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const [headerLine, ...dataLines] = text.split(/\r?\n/).filter(l => l.trim())
      const headers = headerLine.split(',').map(h => h.trim())
      const rows = dataLines.map(line => {
        const vals = line.split(',')
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = vals[i]?.trim() ?? '' })
        return obj
      })
      const res = await resourcesApi.importCsv(rows)
      const { created, updated, errors } = res.data ?? res
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      if (errors?.length) {
        message.warning(`Importado: ${created} creados, ${updated} actualizados. ${errors.length} errores.`)
      } else {
        message.success(`Importado: ${created} creados, ${updated} actualizados`)
      }
    } catch {
      message.error('Error al importar el archivo')
    } finally {
      setImporting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['resources', filters],
    queryFn: () => resourcesApi.list({ ...filters, pageSize: 500 }),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => resourcesApi.listDepartments(),
  })

  // Derive counts per type for sidebar
  const allResources: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  const deptList: any[] = Array.isArray(departments) ? departments : []
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allResources.forEach((r: any) => {
      counts[r.type] = (counts[r.type] || 0) + 1
    })
    return counts
  }, [allResources])

  // Filter by sidebar selection (applied client-side on top of server filters)
  const displayResources = useMemo(() => {
    if (!sidebarType) return allResources
    return allResources.filter((r: any) => r.type === sidebarType)
  }, [allResources, sidebarType])

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        departmentId: values.departmentId || null,
        factor: values.factor ?? 1,
        areaSqm: values.areaSqm ?? null,
        capacity: values.capacity ?? null,
      }
      return editingId ? resourcesApi.update(editingId, payload) : resourcesApi.create(payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      if (!editingId) {
        setEditingId(res.data.id)
        setEditingRecord(res.data)
        setSelectedType(res.data.type)
        setIsPackage(res.data.isPackage)
        message.success('Recurso creado. Ahora puedes agregar imágenes.')
      } else {
        setSelectedType(res.data.type)
        setIsPackage(res.data.isPackage)
        setEditingRecord(res.data)
        if (res.data.isPackage) {
          resourcesApi.getPackageComponents(editingId).then((compRes) => {
            setPackageComponents(compRes.data.components ?? [])
          }).catch(() => setPackageComponents([]))
        } else {
          setPackageComponents([])
        }
        message.success('Recurso actualizado')
      }
    },
    onError: (err: any) => {
      const errData = err?.response?.data?.error
      const detail = errData?.details
        ? JSON.stringify(errData.details.fieldErrors ?? errData.details)
        : (errData?.message || err?.message || 'Error desconocido')
      message.error(`Error al guardar recurso: ${detail}`, 10)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => resourcesApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })

  function openCreate() {
    setEditingId(null); setEditingRecord(null); setSelectedType('')
    setIsPackage(false); setPackageComponents([])
    form.resetFields(); setModalOpen(true)
  }

  function openEdit(record: any) {
    setEditingId(record.id); setEditingRecord(record)
    setSelectedType(record.type); setIsPackage(record.isPackage)
    form.setFieldsValue(record)
    if (record.isPackage) {
      resourcesApi.getPackageComponents(record.id)
        .then(res => setPackageComponents(res.data.components ?? []))
        .catch(() => setPackageComponents([]))
    } else {
      setPackageComponents([])
    }
    setModalOpen(true)
  }

  function refreshEditingRecord() {
    if (!editingId) return
    resourcesApi.get(editingId).then((res) => {
      setEditingRecord(res.data); setSelectedType(res.data.type); setIsPackage(res.data.isPackage)
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      if (res.data.isPackage) {
        resourcesApi.getPackageComponents(editingId)
          .then(compRes => setPackageComponents(compRes.data.components ?? []))
          .catch(() => setPackageComponents([]))
      } else {
        setPackageComponents([])
      }
    })
  }

  // Margin helper
  function calcMargin(r: any): { value: number | null; display: string; tone: 'success' | 'warning' | 'error' | 'muted' } {
    const cost = Number(r.cost ?? r.costPrice ?? 0)
    const price = Number(r.defaultPrice ?? r.basePrice ?? 0)
    if (!cost || !price || r.type === 'SERVICE') return { value: null, display: '—', tone: 'muted' }
    const pct = ((price - cost) / price) * 100
    return {
      value: pct,
      display: formatPercent(pct),
      tone: pct >= 30 ? 'success' : pct >= 20 ? 'warning' : 'error',
    }
  }

  const marginColor = { success: '#16a34a', warning: '#f59e0b', error: '#ef4444', muted: 'rgba(0,0,0,0.35)' }

  const columns = [
    {
      title: '', key: 'img', width: 48,
      render: (_: any, r: any) => r.imageMain
        ? <Image src={imgSrc(r.imageMain)} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4 }} preview={false} />
        : <div style={{ width: 32, height: 32, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {TYPE_EMOJI[r.type] ?? '📄'}
          </div>,
    },
    {
      title: 'Código',
      dataIndex: 'code',
      width: 100,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{v}</span>,
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (v: string, r: any) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {r.isPackage && <span style={{ marginRight: 4 }}>📦</span>}
            {v}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
            {[r.unit, r.department?.name].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      width: 160,
      render: (v: string, r: any) => (
        <Space size={4} wrap>
          <Tag color={TYPE_COLORS[v]} style={{ fontSize: 11, margin: 0 }}>{TYPE_LABELS[v]}</Tag>
          {r.isPackage && <Tag color="processing" style={{ fontSize: 11, margin: 0 }}>Paquete</Tag>}
        </Space>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      width: 70,
      align: 'center' as const,
      render: (v: number | null, r: any) => {
        if (r.type === 'SERVICE') return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        return <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{v ?? 0}</span>
      },
    },
    {
      title: 'Margen',
      key: 'margin',
      width: 80,
      align: 'center' as const,
      render: (_: any, r: any) => {
        const m = calcMargin(r)
        return <span style={{ fontSize: 12, fontWeight: 500, color: marginColor[m.tone] }}>{m.display}</span>
      },
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 90,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 72,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" type="text" icon={<PoweroffOutlined />} onClick={() => toggleMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  // Modal tabs (unchanged logic, just render)
  const modalTabs = [
    {
      key: '1', label: 'Datos Generales',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="type" label="Tipo de Recurso" rules={[{ required: true }]}>
              <Select options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} onChange={setSelectedType} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="code" label="Código" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="departmentId" label="Departamento">
              <Select allowClear placeholder="Seleccionar departamento" showSearch optionFilterProp="label"
                options={deptList.filter((d: any) => d.isActive).map((d: any) => ({ value: d.id, label: d.name }))} />
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
            <Form.Item name="portalVisible" label="Visible en Portal" valuePropName="checked"><Switch /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isPackage" label="¿Es Paquete?" valuePropName="checked">
              <Switch onChange={setIsPackage} />
            </Form.Item>
          </Col>
          {isPackage && (
            <Col span={12}>
              <Form.Item name="isSubstitute" label="¿Componentes Sustitutos?" valuePropName="checked"><Switch /></Form.Item>
            </Col>
          )}
          <Col span={24}>
            <Form.Item name="description" label="Notas"><Input.TextArea rows={2} /></Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: '2', label: 'Inventario',
      children: (
        <Row gutter={16}>
          <Col span={8}><Form.Item name="stock" label="Stock"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          <Col span={16}><Form.Item name="stockLocation" label="Ubicación de Stock"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="recoveryTime" label="Tiempo de Recuperación (hrs)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          <Col span={8}><Form.Item name="areaSqm" label="Metros Cuadrados"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          <Col span={8}><Form.Item name="capacity" label="Capacidad"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          <Col span={12}><Form.Item name="checkStock" label="Checar Stock" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col span={12}>
            <Form.Item name="checkDuplicate" label="Verificar duplicado en Orden" valuePropName="checked"
              tooltip="Si está activo, no se podrá agregar este recurso más de una vez en una OS">
              <Switch />
            </Form.Item>
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
            <ResourceImageSlot key={slot} resourceId={editingId} slot={slot} label={label} currentUrl={editingRecord[field] ?? null} onDone={refreshEditingRecord} />
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
              allResources={allResources}
            />
          ),
        }]
      : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <PageHeader
        title="Catálogo de Recursos"
        meta={`Productos, servicios y personal cotizables · ${data?.meta?.total ?? 0} totales`}
        actions={
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <Button icon={<FileTextOutlined />} onClick={downloadTemplate}>
              Plantilla
            </Button>
            <Button icon={<ImportOutlined />} loading={importing} onClick={() => importInputRef.current?.click()}>
              Importar
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
              Exportar
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nuevo recurso
            </Button>
          </>
        }
      />

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0, minHeight: 'calc(100vh - 120px)' }}>
        {/* ── Left: Category sidebar ── */}
        <div style={{ borderRight: '1px solid #f0f0f0', background: '#fff', padding: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Tipo de recurso
          </div>

          {/* "Todas" option */}
          <div
            onClick={() => { setSidebarType(''); setFilters(f => ({ ...f, type: '' })) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 2,
              background: sidebarType === '' ? '#f4eeff' : 'transparent',
              color: sidebarType === '' ? '#6B46C1' : 'rgba(0,0,0,0.88)',
              fontWeight: sidebarType === '' ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 13 }}>Todos los recursos</span>
            <Tag style={{ fontSize: 11, lineHeight: '16px', padding: '0 5px', border: 'none', background: sidebarType === '' ? '#e9d5ff' : '#f5f5f5' }}>
              {allResources.length}
            </Tag>
          </div>

          {/* Type options */}
          {Object.entries(TYPE_LABELS).map(([typeKey, typeLabel]) => {
            const count = typeCounts[typeKey] ?? 0
            const active = sidebarType === typeKey
            return (
              <div
                key={typeKey}
                onClick={() => { setSidebarType(typeKey); setFilters(f => ({ ...f, type: typeKey })) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: active ? '#f4eeff' : 'transparent',
                  color: active ? '#6B46C1' : 'rgba(0,0,0,0.75)',
                  fontWeight: active ? 600 : 400,
                  opacity: count === 0 ? 0.45 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>{TYPE_EMOJI[typeKey]}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{typeLabel}</span>
                <Tag
                  style={{
                    fontSize: 11, lineHeight: '16px', padding: '0 5px', border: 'none',
                    background: active ? '#e9d5ff' : '#f5f5f5',
                    color: active ? '#6B46C1' : 'rgba(0,0,0,0.55)',
                  }}
                >
                  {count}
                </Tag>
              </div>
            )
          })}
        </div>

        {/* ── Right: filter + table ── */}
        <div>
          <FilterBar
            search={filters.search}
            onSearch={(v) => setFilters(f => ({ ...f, search: v }))}
            placeholder="Buscar por nombre, código…"
          >
            <Select
              value={filters.type || undefined}
              onChange={v => setFilters(f => ({ ...f, type: v || '' }))}
              allowClear
              placeholder="Tipo"
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              style={{ width: 140 }}
            />
            <Select
              value={filters.active}
              onChange={v => setFilters(f => ({ ...f, active: v }))}
              options={[
                { value: 'true', label: 'Activos' },
                { value: 'false', label: 'Inactivos' },
                { value: '', label: 'Todos' },
              ]}
              style={{ width: 120 }}
            />
          </FilterBar>

          <Table
            dataSource={displayResources}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            size="middle"
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              total: displayResources.length,
              showTotal: t => `${t} recursos`,
              style: { padding: '12px 24px' },
            }}
          />
        </div>
      </div>

      {/* ── Modal (logic unchanged) ── */}
      <Modal
        title={editingId ? 'Editar Recurso' : 'Agregar Recurso'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false); form.resetFields(); setEditingId(null)
          setEditingRecord(null); setSelectedType(''); setIsPackage(false); setPackageComponents([])
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
