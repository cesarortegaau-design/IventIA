import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Typography, Avatar, Button, Spin, Alert, Space, Row, Col,
  Form, Input, Select, App, Tag, Popconfirm,
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, SaveOutlined, MailOutlined, PhoneOutlined,
  GlobalOutlined, ShopOutlined,
  UploadOutlined, LinkOutlined, PaperClipOutlined, FileOutlined,
  DownloadOutlined, DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { suppliersApi } from '../../api/suppliers'

const { Title, Text, Paragraph } = Typography

const CATEGORY_OPTIONS = [
  { value: 'CATERING', label: 'Catering' },
  { value: 'DECORATION', label: 'Decoración' },
  { value: 'PHOTOGRAPHY', label: 'Fotografía' },
  { value: 'MUSIC', label: 'Música / DJ' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'VENUE', label: 'Espacio / Salón' },
  { value: 'AUDIO_VIDEO', label: 'Audio y Video' },
  { value: 'FLOWERS', label: 'Flores' },
  { value: 'OTHER', label: 'Otro' },
]

const CATEGORY_COLORS: Record<string, string> = {
  CATERING: '#F97316',
  DECORATION: '#EC4899',
  PHOTOGRAPHY: '#7C3AED',
  MUSIC: '#0D9488',
  TRANSPORT: '#2563EB',
  VENUE: '#D97706',
  AUDIO_VIDEO: '#059669',
  FLOWERS: '#DC2626',
  OTHER: '#6B7280',
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  // Documents state
  const [docs, setDocs] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(`iventia-supplier-docs-${id}`)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [addingDoc, setAddingDoc] = useState(false)
  const [docUrl, setDocUrl] = useState('')
  const [docName, setDocName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function saveDocs(list: any[]) {
    setDocs(list)
    localStorage.setItem(`iventia-supplier-docs-${id!}`, JSON.stringify(list))
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const doc = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        url: reader.result as string,
        uploadedAt: new Date().toISOString(),
        size: file.size,
      }
      saveDocs([...docs, doc])
      message.success(`${file.name} adjuntado`)
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleAddUrl() {
    if (!docUrl.trim()) return
    const doc = {
      id: Date.now().toString(),
      name: docName.trim() || docUrl,
      type: 'url',
      url: docUrl.trim(),
      uploadedAt: new Date().toISOString(),
    }
    saveDocs([...docs, doc])
    setDocUrl(''); setDocName(''); setAddingDoc(false)
  }

  function removeDoc(docId: string) {
    saveDocs(docs.filter((d) => d.id !== docId))
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['planner-supplier', id],
    queryFn: () => suppliersApi.get(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (d: any) => suppliersApi.update(id!, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-supplier', id] })
      message.success('Proveedor actualizado')
      setEditing(false)
    },
    onError: () => message.error('Error al actualizar'),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (isError) return <Alert type="error" message="No se pudo cargar el proveedor" action={<Button onClick={() => navigate('/proveedores')}>Volver</Button>} />

  const supplier = data?.data
  if (!supplier) return null

  const name = supplier.companyName || supplier.name || `${supplier.firstName || ''} ${supplier.lastName || ''}`.trim()
  const catColor = CATEGORY_COLORS[supplier.category] || '#6B7280'
  const catLabel = CATEGORY_OPTIONS.find((o) => o.value === supplier.category)?.label

  const startEditing = () => {
    form.setFieldsValue({
      companyName: supplier.companyName,
      category: supplier.category,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      website: supplier.website,
      notes: supplier.notes,
    })
    setEditing(true)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/proveedores')} />
        <Avatar
          size={56}
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', fontSize: 20, fontWeight: 700, flexShrink: 0 }}
          icon={<ShopOutlined />}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 800 }}>{name}</Title>
            {catLabel && (
              <Tag style={{ background: catColor + '18', color: catColor, border: 'none', borderRadius: 20 }}>
                {catLabel}
              </Tag>
            )}
          </div>
          {supplier.contactName && (
            <Text style={{ color: 'var(--pl-text-secondary)', fontSize: 13 }}>Contacto: {supplier.contactName}</Text>
          )}
        </div>
      </div>

      {editing ? (
        <Card style={{ borderRadius: 20, boxShadow: 'var(--pl-shadow)' }}>
          <Form form={form} layout="vertical" onFinish={(vals) => updateMutation.mutate(vals)}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="companyName" label="Empresa / Nombre" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="category" label="Categoría">
                  <Select options={CATEGORY_OPTIONS} allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="contactName" label="Nombre de contacto">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="email" label="Correo" rules={[{ type: 'email' }]}>
                  <Input prefix={<MailOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="Teléfono">
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="website" label="Sitio web">
                  <Input prefix={<GlobalOutlined />} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="notes" label="Notas">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending}
                style={{ background: 'var(--pl-primary)', border: 'none' }}>
                Guardar
              </Button>
              <Button onClick={() => setEditing(false)}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      ) : (
        <Card
          style={{ borderRadius: 20, boxShadow: 'var(--pl-shadow)' }}
          extra={<Button icon={<EditOutlined />} onClick={startEditing}>Editar</Button>}
          title="Información del proveedor"
        >
          <Row gutter={[16, 16]}>
            {[
              { label: 'Empresa', value: supplier.companyName || '—' },
              { label: 'Categoría', value: catLabel || '—' },
              { label: 'Contacto', value: supplier.contactName || '—' },
              { label: 'Correo', value: supplier.email || '—' },
              { label: 'Teléfono', value: supplier.phone || '—' },
              { label: 'Sitio web', value: supplier.website ? (
                <a href={supplier.website} target="_blank" rel="noreferrer">{supplier.website}</a>
              ) : '—' },
            ].map((f) => (
              <Col xs={24} sm={12} key={f.label}>
                <Text style={{ fontSize: 11, color: 'var(--pl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</Text>
                <div style={{ fontWeight: 500, marginTop: 2 }}>{f.value}</div>
              </Col>
            ))}
            {supplier.notes && (
              <Col span={24}>
                <Text style={{ fontSize: 11, color: 'var(--pl-text-muted)', textTransform: 'uppercase' }}>Notas</Text>
                <Paragraph style={{ marginTop: 4 }}>{supplier.notes}</Paragraph>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Documents Card */}
      <Card
        style={{ borderRadius: 20, boxShadow: 'var(--pl-shadow)', marginTop: 24 }}
        title={<><PaperClipOutlined style={{ marginRight: 8 }} />Documentos anexos</>}
        extra={
          <Space>
            <Button size="small" onClick={() => fileInputRef.current?.click()}>
              <UploadOutlined /> Subir archivo
            </Button>
            <Button size="small" onClick={() => setAddingDoc(true)}>
              <LinkOutlined /> Agregar URL
            </Button>
          </Space>
        }
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
          onChange={handleFileUpload}
        />

        {/* Add URL form */}
        {addingDoc && (
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Agregar enlace</div>
            <Input
              placeholder="Nombre del documento (opcional)"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <Input
              placeholder="URL del documento"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <Space>
              <Button type="primary" size="small" onClick={handleAddUrl}
                style={{ background: 'var(--pl-primary)', border: 'none' }}>Agregar</Button>
              <Button size="small" onClick={() => { setAddingDoc(false); setDocUrl(''); setDocName('') }}>Cancelar</Button>
            </Space>
          </div>
        )}

        {/* Document list */}
        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF' }}>
            <PaperClipOutlined style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
            <div style={{ fontSize: 13 }}>Sin documentos adjuntos</div>
          </div>
        ) : docs.map((doc) => (
          <div key={doc.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: '1px solid #F3F4F6',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: '#F0EBFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileOutlined style={{ color: '#7C3AED', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.name}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                {dayjs(doc.uploadedAt).format('D MMM YYYY')}
                {doc.size ? ` · ${(doc.size / 1024).toFixed(0)} KB` : ''}
              </div>
            </div>
            <Space>
              <a href={doc.url} target="_blank" rel="noreferrer" download={doc.type !== 'url' ? doc.name : undefined}>
                <Button size="small" icon={<DownloadOutlined />} type="text" />
              </a>
              <Popconfirm title="¿Eliminar documento?" onConfirm={() => removeDoc(doc.id)} okText="Sí" cancelText="No">
                <Button size="small" icon={<DeleteOutlined />} type="text" danger />
              </Popconfirm>
            </Space>
          </div>
        ))}
      </Card>
    </div>
  )
}
