import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Select, Space, Tag, Modal, Form, Typography,
  Row, Col, App, Switch, InputNumber, Upload, Image, Popconfirm, Input,
  Drawer, Divider, Spin, Alert, Collapse,
} from 'antd'
import {
  PlusOutlined, EditOutlined, PoweroffOutlined, UploadOutlined,
  DeleteOutlined, DownloadOutlined, ImportOutlined, FileTextOutlined,
  ThunderboltOutlined, SearchOutlined, CheckOutlined,
} from '@ant-design/icons'
import { resourcesApi } from '../../../api/resources'
import { PackageComponentsManager } from './PackageComponentsManager'
import { PageHeader, FilterBar } from '../../../components/ui'
import { formatPercent } from '../../../utils/format'

const { Text, Title } = Typography

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

// ─── Compact Image Slot (for desc/extra) ──────────────────────────────────────

function CompactImageSlot({
  resourceId, slot, label, currentUrl, onDone, onSearchClick,
}: {
  resourceId: string
  slot: 'main' | 'desc' | 'extra'
  label: string
  currentUrl: string | null
  onDone: () => void
  onSearchClick?: () => void
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
      message.success('Imagen subida')
      onDone()
    } catch {
      message.error('Error al subir imagen')
    } finally {
      setUploading(false)
    }
    return false
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ width: 56, height: 42, borderRadius: 6, overflow: 'hidden', background: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {currentUrl
          ? <img src={imgSrc(currentUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 18, opacity: 0.4 }}>🖼️</span>
        }
      </div>
      <Text style={{ flex: 1, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{label}</Text>
      <Space size={4}>
        <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
          <Button size="small" icon={<UploadOutlined />} loading={uploading} type="text" />
        </Upload>
        {onSearchClick && (
          <Button size="small" icon={<SearchOutlined />} type="text" onClick={onSearchClick} />
        )}
        {currentUrl && (
          <Popconfirm title="¿Eliminar?" onConfirm={() => deleteMutation.mutate()}>
            <Button size="small" danger icon={<DeleteOutlined />} type="text" loading={deleteMutation.isPending} />
          </Popconfirm>
        )}
      </Space>
    </div>
  )
}

// ─── Image Search Modal ────────────────────────────────────────────────────────

function ImageSearchModal({
  open, onClose, onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (imageUrl: string) => void
}) {
  const [tab, setTab] = useState<'search' | 'url'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [pastedUrl, setPastedUrl] = useState('')
  const { message } = App.useApp()

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await resourcesApi.searchImages(query)
      setConfigured(res.configured)
      if (!res.configured) { setResults([]); return }
      setResults(res.data)
    } catch {
      message.error('Error al buscar imágenes')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setSelected(null); setPastedUrl(''); setResults([]); setQuery(''); setConfigured(null)
    onClose()
  }

  return (
    <Modal title="Imagen para el recurso" open={open} onCancel={handleClose} footer={null} width={680}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button type={tab === 'search' ? 'primary' : 'default'} icon={<SearchOutlined />} onClick={() => setTab('search')}>
          Buscar en Unsplash
        </Button>
        <Button type={tab === 'url' ? 'primary' : 'default'} onClick={() => setTab('url')}>
          Pegar URL
        </Button>
      </div>

      {tab === 'url' && (
        <div>
          <Input
            placeholder="https://ejemplo.com/imagen.jpg"
            value={pastedUrl}
            onChange={e => setPastedUrl(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          {pastedUrl && (
            <div style={{ marginBottom: 12 }}>
              <img src={pastedUrl} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
          <Button type="primary" block disabled={!pastedUrl.trim()} onClick={() => { onSelect(pastedUrl.trim()); handleClose() }}>
            Usar esta imagen
          </Button>
        </div>
      )}

      {tab === 'search' && (
        <>
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Input
              placeholder="Ej: trade show booth, exhibition furniture..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
              Buscar
            </Button>
          </Space.Compact>

          {configured === false && (
            <Alert
              type="warning"
              message="Agrega UNSPLASH_ACCESS_KEY en las variables de Render y redeploy. Por ahora usa la pestaña 'Pegar URL'."
              showIcon style={{ marginBottom: 12 }}
            />
          )}

          {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}

          {!loading && results.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {results.map((img: any) => (
                  <div
                    key={img.id}
                    onClick={() => setSelected(img.small)}
                    style={{
                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      border: selected === img.small ? '2px solid #6B46C1' : '2px solid transparent',
                      position: 'relative',
                    }}
                  >
                    <img src={img.thumb} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                    {selected === img.small && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#6B46C1', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckOutlined style={{ color: '#fff', fontSize: 11 }} />
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {img.author}
                    </div>
                  </div>
                ))}
              </div>
              {selected && (
                <Button type="primary" block onClick={() => { onSelect(selected); handleClose() }}>
                  Usar esta imagen
                </Button>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [filters, setFilters] = useState({ type: '', search: '', active: 'true' })
  const [selectedType, setSelectedType] = useState<string>('')
  const [isPackage, setIsPackage] = useState(false)
  const [packageComponents, setPackageComponents] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [sidebarType, setSidebarType] = useState('')

  // AI & image search state
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [imageSearchOpen, setImageSearchOpen] = useState(false)
  const [imageSearchSlot, setImageSearchSlot] = useState<'main' | 'desc' | 'extra'>('main')
  const [importingImageUrl, setImportingImageUrl] = useState(false)

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

  const allResources: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  const deptList: any[] = Array.isArray(departments) ? departments : []
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allResources.forEach((r: any) => { counts[r.type] = (counts[r.type] || 0) + 1 })
    return counts
  }, [allResources])

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
        message.success('Recurso creado. Ahora puedes agregar imágenes y descripción.')
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      if (editingRecord && res.data?.id === editingRecord.id) {
        setEditingRecord(res.data)
      }
    },
  })

  function openCreate() {
    setEditingId(null); setEditingRecord(null); setSelectedType('')
    setIsPackage(false); setPackageComponents([])
    form.resetFields(); setDrawerOpen(true)
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
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false); form.resetFields(); setEditingId(null)
    setEditingRecord(null); setSelectedType(''); setIsPackage(false); setPackageComponents([])
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

  async function handleGenerateDescription() {
    if (!editingId) { message.warning('Guarda el recurso primero'); return }
    setGeneratingDesc(true)
    try {
      const res = await resourcesApi.generateDescription(editingId)
      form.setFieldValue('portalDesc', res.description)
      message.success('Descripción generada')
    } catch {
      message.error('Error al generar descripción')
    } finally {
      setGeneratingDesc(false)
    }
  }

  async function handleSelectImage(imageUrl: string) {
    if (!editingId) return
    setImportingImageUrl(true)
    try {
      await resourcesApi.importImageFromUrl(editingId, imageSearchSlot, imageUrl)
      message.success('Imagen guardada')
      refreshEditingRecord()
    } catch {
      message.error('Error al guardar imagen')
    } finally {
      setImportingImageUrl(false)
    }
  }

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
      title: 'Código', dataIndex: 'code', width: 100,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{v}</span>,
    },
    {
      title: 'Nombre', dataIndex: 'name',
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
      title: 'Tipo', dataIndex: 'type', width: 160,
      render: (v: string, r: any) => (
        <Space size={4} wrap>
          <Tag color={TYPE_COLORS[v]} style={{ fontSize: 11, margin: 0 }}>{TYPE_LABELS[v]}</Tag>
          {r.isPackage && <Tag color="processing" style={{ fontSize: 11, margin: 0 }}>Paquete</Tag>}
        </Space>
      ),
    },
    {
      title: 'Stock', dataIndex: 'stock', width: 70, align: 'center' as const,
      render: (v: number | null, r: any) => {
        if (r.type === 'SERVICE') return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        return <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{v ?? 0}</span>
      },
    },
    {
      title: 'Margen', key: 'margin', width: 80, align: 'center' as const,
      render: (_: any, r: any) => {
        const m = calcMargin(r)
        return <span style={{ fontSize: 12, fontWeight: 500, color: marginColor[m.tone] }}>{m.display}</span>
      },
    },
    {
      title: 'Estado', dataIndex: 'isActive', width: 90,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 72, fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" type="text" icon={<PoweroffOutlined />} onClick={() => toggleMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  // ── Drawer content sections ──────────────────────────────────────────────────
  const drawerName = Form.useWatch('name', form) ?? editingRecord?.name ?? ''
  const drawerType = Form.useWatch('type', form) ?? editingRecord?.type ?? selectedType
  const watchIsPackage = Form.useWatch('isPackage', form) ?? isPackage

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <PageHeader
        title="Catálogo de Recursos"
        meta={`Productos, servicios y personal cotizables · ${data?.meta?.total ?? 0} totales`}
        actions={
          <>
            <input ref={importInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />
            <Button icon={<FileTextOutlined />} onClick={downloadTemplate}>Plantilla</Button>
            <Button icon={<ImportOutlined />} loading={importing} onClick={() => importInputRef.current?.click()}>Importar</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>Exportar</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nuevo recurso</Button>
          </>
        }
      />

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0, minHeight: 'calc(100vh - 120px)' }}>
        {/* Left sidebar */}
        <div style={{ borderRight: '1px solid #f0f0f0', background: '#fff', padding: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Tipo de recurso
          </div>
          <div
            onClick={() => { setSidebarType(''); setFilters(f => ({ ...f, type: '' })) }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
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
          {Object.entries(TYPE_LABELS).map(([typeKey, typeLabel]) => {
            const count = typeCounts[typeKey] ?? 0
            const active = sidebarType === typeKey
            return (
              <div
                key={typeKey}
                onClick={() => { setSidebarType(typeKey); setFilters(f => ({ ...f, type: typeKey })) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                  background: active ? '#f4eeff' : 'transparent',
                  color: active ? '#6B46C1' : 'rgba(0,0,0,0.75)',
                  fontWeight: active ? 600 : 400,
                  opacity: count === 0 ? 0.45 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>{TYPE_EMOJI[typeKey]}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{typeLabel}</span>
                <Tag style={{
                  fontSize: 11, lineHeight: '16px', padding: '0 5px', border: 'none',
                  background: active ? '#e9d5ff' : '#f5f5f5',
                  color: active ? '#6B46C1' : 'rgba(0,0,0,0.55)',
                }}>{count}</Tag>
              </div>
            )
          })}
        </div>

        {/* Table */}
        <div>
          <FilterBar
            search={filters.search}
            onSearch={(v) => setFilters(f => ({ ...f, search: v }))}
            placeholder="Buscar por nombre, código…"
          >
            <Select
              value={filters.type || undefined}
              onChange={v => setFilters(f => ({ ...f, type: v || '' }))}
              allowClear placeholder="Tipo"
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
              pageSize: 25, showSizeChanger: true, total: displayResources.length,
              showTotal: t => `${t} recursos`, style: { padding: '12px 24px' },
            }}
          />
        </div>
      </div>

      {/* ── Drawer ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{TYPE_EMOJI[drawerType] ?? '📄'}</span>
            <span style={{ fontWeight: 600, fontSize: 15, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {drawerName || (editingId ? 'Editar recurso' : 'Nuevo recurso')}
            </span>
            {editingRecord && (
              <Tag color={editingRecord.isActive ? 'success' : 'default'} style={{ marginLeft: 4 }}>
                {editingRecord.isActive ? 'Activo' : 'Inactivo'}
              </Tag>
            )}
            {drawerType && <Tag color={TYPE_COLORS[drawerType]} style={{ marginLeft: 0 }}>{TYPE_LABELS[drawerType]}</Tag>}
          </div>
        }
        open={drawerOpen}
        onClose={closeDrawer}
        width={520}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              block
              loading={saveMutation.isPending}
              onClick={() => form.submit()}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600, height: 40 }}
            >
              {editingId ? 'Guardar cambios' : 'Crear recurso'}
            </Button>
            {editingId && editingRecord && (
              <Button
                block
                danger={editingRecord.isActive}
                loading={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate(editingId)}
                style={{ height: 40, maxWidth: 160 }}
              >
                {editingRecord.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            )}
          </div>
        }
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={saveMutation.mutate}
            onFinishFailed={({ errorFields }) => {
              const campos = errorFields.map(f => f.errors[0]).join(', ')
              message.warning(`Campos con error: ${campos}`)
            }}
          >

            {/* ── Descripción para Portal ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.45)' }}>
                  Descripción para Portal
                </Text>
                <Button
                  size="small"
                  icon={<ThunderboltOutlined />}
                  loading={generatingDesc}
                  onClick={handleGenerateDescription}
                  style={{ fontSize: 12, color: '#6B46C1', borderColor: '#6B46C1' }}
                >
                  Generar con IA
                </Button>
              </div>
              <Form.Item name="portalDesc" noStyle>
                <Input.TextArea
                  rows={3}
                  placeholder="Descripción visible para los expositores en el portal..."
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </Form.Item>
              <Form.Item name="portalVisible" valuePropName="checked" noStyle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Form.Item name="portalVisible" valuePropName="checked" noStyle>
                    <Switch size="small" />
                  </Form.Item>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>Visible en el portal de expositores</Text>
                </div>
              </Form.Item>
            </div>

            <Divider style={{ margin: '0 0 20px' }} />

            {/* ── Imagen Principal ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.45)' }}>
                  Imagen Principal
                </Text>
                {editingId && (
                  <Space size={4}>
                    <Upload
                      beforeUpload={async (file) => {
                        try {
                          await resourcesApi.uploadImage(editingId, 'main', file)
                          message.success('Imagen subida')
                          refreshEditingRecord()
                        } catch { message.error('Error al subir') }
                        return false
                      }}
                      showUploadList={false} accept="image/*"
                    >
                      <Button size="small" icon={<UploadOutlined />}>Subir</Button>
                    </Upload>
                    <Button
                      size="small"
                      icon={<SearchOutlined />}
                      loading={importingImageUrl}
                      onClick={() => { setImageSearchSlot('main'); setImageSearchOpen(true) }}
                    >
                      Buscar
                    </Button>
                  </Space>
                )}
              </div>

              {editingRecord?.imageMain ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#f5f5f5' }}>
                  <img
                    src={imgSrc(editingRecord.imageMain)}
                    style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                  />
                  <Popconfirm title="¿Eliminar imagen principal?" onConfirm={async () => {
                    await resourcesApi.deleteImage(editingId!, 'main')
                    message.success('Imagen eliminada')
                    refreshEditingRecord()
                  }}>
                    <Button
                      size="small" danger icon={<DeleteOutlined />}
                      style={{ position: 'absolute', top: 8, right: 8, opacity: 0.9 }}
                    >
                      Eliminar
                    </Button>
                  </Popconfirm>
                </div>
              ) : (
                <div style={{
                  height: 120, border: '1.5px dashed #d9d9d9', borderRadius: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#fafafa', color: 'rgba(0,0,0,0.35)', gap: 6, cursor: editingId ? 'pointer' : 'default',
                }}>
                  <span style={{ fontSize: 28 }}>🖼️</span>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)' }}>
                    {editingId ? 'Sube o busca una imagen para este recurso' : 'Guarda el recurso primero'}
                  </Text>
                </div>
              )}

              {/* Secondary images */}
              {editingId && editingRecord && (
                <div style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', display: 'block', marginBottom: 6 }}>
                    Imágenes adicionales
                  </Text>
                  <CompactImageSlot
                    resourceId={editingId} slot="desc" label="Imagen Descriptiva"
                    currentUrl={editingRecord.imageDesc ?? null} onDone={refreshEditingRecord}
                    onSearchClick={() => { setImageSearchSlot('desc'); setImageSearchOpen(true) }}
                  />
                  <CompactImageSlot
                    resourceId={editingId} slot="extra" label="Imagen Adicional"
                    currentUrl={editingRecord.imageExtra ?? null} onDone={refreshEditingRecord}
                    onSearchClick={() => { setImageSearchSlot('extra'); setImageSearchOpen(true) }}
                  />
                </div>
              )}
            </div>

            <Divider style={{ margin: '0 0 20px' }} />

            {/* ── Datos Generales ── */}
            <div style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 12 }}>
                Datos Generales
              </Text>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
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
                <Col span={24}>
                  <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="departmentId" label="Departamento">
                    <Select allowClear placeholder="Seleccionar" showSearch optionFilterProp="label"
                      options={deptList.filter((d: any) => d.isActive).map((d: any) => ({ value: d.id, label: d.name }))} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="unit" label="Unidad">
                    <Select allowClear options={UNIT_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="factor" label="Factor" initialValue={1}>
                    <InputNumber min={0.001} step={0.01} style={{ width: '100%' }} precision={2} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="description" label="Notas internas">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="isPackage" label="¿Es Paquete?" valuePropName="checked">
                    <Switch onChange={setIsPackage} />
                  </Form.Item>
                </Col>
                {watchIsPackage && (
                  <Col span={12}>
                    <Form.Item name="isSubstitute" label="Componentes Sustitutos" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </div>

            <Divider style={{ margin: '4px 0 20px' }} />

            {/* ── Inventario ── */}
            <Collapse
              ghost
              items={[{
                key: 'inv',
                label: <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.45)' }}>Inventario</Text>,
                children: (
                  <Row gutter={12}>
                    <Col span={8}><Form.Item name="stock" label="Stock"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                    <Col span={16}><Form.Item name="stockLocation" label="Ubicación"><Input /></Form.Item></Col>
                    <Col span={8}><Form.Item name="recoveryTime" label="Recuperación (hrs)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="areaSqm" label="m²"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="capacity" label="Capacidad"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="checkStock" label="Checar Stock" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col span={12}>
                      <Form.Item name="checkDuplicate" label="Verificar duplicado en OS" valuePropName="checked"
                        tooltip="No permite agregar este recurso más de una vez en una OS">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              }]}
            />

            {/* ── Componentes del Paquete ── */}
            {watchIsPackage && editingId && editingRecord && (
              <>
                <Divider style={{ margin: '4px 0 20px' }} />
                <div>
                  <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.45)', display: 'block', marginBottom: 12 }}>
                    Componentes del Paquete
                  </Text>
                  <PackageComponentsManager
                    packageResourceId={editingId}
                    isSubstitute={editingRecord.isSubstitute}
                    components={packageComponents}
                    onComponentsChange={setPackageComponents}
                    allResources={allResources}
                  />
                </div>
              </>
            )}

          </Form>
        </div>
      </Drawer>

      {/* Image Search Modal */}
      <ImageSearchModal
        open={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
        onSelect={handleSelectImage}
      />
    </div>
  )
}
