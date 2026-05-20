import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Input, Button, Row, Col, Card, Typography, Space, Avatar, Empty,
  Spin, Modal, Form, App, Tag, Select, Popconfirm,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, MailOutlined, PhoneOutlined,
  EyeOutlined, ShopOutlined, GlobalOutlined, CloseOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { suppliersApi } from '../../api/suppliers'

const { Title, Text } = Typography

const CATEGORY_OPTIONS = [
  { value: 'CATERING',     label: 'Catering' },
  { value: 'DECORATION',   label: 'Decoración' },
  { value: 'PHOTOGRAPHY',  label: 'Fotografía' },
  { value: 'MUSIC',        label: 'Música / DJ' },
  { value: 'TRANSPORT',    label: 'Transporte' },
  { value: 'VENUE',        label: 'Espacio / Salón' },
  { value: 'AUDIO_VIDEO',  label: 'Audio y Video' },
  { value: 'FLOWERS',      label: 'Flores' },
  { value: 'OTHER',        label: 'Otro' },
]

const CATEGORY_COLORS: Record<string, string> = {
  CATERING:    '#F97316',
  DECORATION:  '#EC4899',
  PHOTOGRAPHY: '#7C3AED',
  MUSIC:       '#0D9488',
  TRANSPORT:   '#2563EB',
  VENUE:       '#D97706',
  AUDIO_VIDEO: '#059669',
  FLOWERS:     '#DC2626',
  OTHER:       '#6B7280',
}

const AVATAR_COLORS = ['#7C3AED', '#EC4899', '#F97316', '#0D9488', '#2563EB', '#059669']

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface SupplierDraft {
  companyName: string
  category: string
  contactName: string
  email: string
  phone: string
  website: string
  notes: string
}

function supplierToDraft(s: any): SupplierDraft {
  return {
    companyName: s.companyName || s.name || '',
    category:    s.category    || '',
    contactName: s.contactName || '',
    email:       s.email       || '',
    phone:       s.phone       || '',
    website:     s.website     || '',
    notes:       s.notes       || '',
  }
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  // HSODAK panel state
  const [selected, setSelected] = useState<any | null>(null)
  const [draft, setDraft] = useState<SupplierDraft | null>(null)
  const [dirty, setDirty] = useState(false)

  const openPanel = (supplier: any) => {
    setSelected(supplier)
    setDraft(supplierToDraft(supplier))
    setDirty(false)
  }
  const closePanel = () => { setSelected(null); setDraft(null); setDirty(false) }
  const patchDraft = (patch: Partial<SupplierDraft>) => {
    setDraft(d => d ? { ...d, ...patch } : d)
    setDirty(true)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['planner-suppliers', search],
    queryFn: () => suppliersApi.list({ search: search || undefined, pageSize: 100 }),
  })
  const suppliers: any[] = data?.data || []

  const createMutation = useMutation({
    mutationFn: (d: any) => suppliersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-suppliers'] })
      message.success('Proveedor creado')
      setModalOpen(false)
      form.resetFields()
    },
    onError: () => message.error('Error al crear proveedor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => suppliersApi.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['planner-suppliers'] })
      if (updated?.data) setSelected(updated.data)
      setDirty(false)
      message.success('Proveedor actualizado')
    },
    onError: () => message.error('Error al actualizar proveedor'),
  })

  const handleSavePanel = () => {
    if (!selected || !draft) return
    updateMutation.mutate({ id: selected.id, data: draft })
  }

  const EditPanel = () => {
    if (!selected || !draft) return null
    const color = avatarColor(selected.id)
    const catColor = CATEGORY_COLORS[draft.category] || '#6B7280'
    const catLabel = CATEGORY_OPTIONS.find(o => o.value === draft.category)?.label || draft.category

    return (
      <div style={{
        width: 300,
        flexShrink: 0,
        borderLeft: '1px solid #EDE9FE',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #EDE9FE',
          background: '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={36}
              style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, flexShrink: 0 }}
              icon={<ShopOutlined />}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
                {draft.companyName || '—'}
              </div>
              {draft.category && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  background: catColor + '18', color: catColor,
                  padding: '1px 7px', borderRadius: 20,
                }}>
                  {catLabel}
                </span>
              )}
            </div>
          </div>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel} style={{ color: '#aaa' }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>EMPRESA / NOMBRE</div>
            <Input
              value={draft.companyName}
              onChange={e => patchDraft({ companyName: e.target.value })}
              placeholder="Nombre de la empresa"
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>CATEGORÍA</div>
            <Select
              value={draft.category || undefined}
              onChange={v => patchDraft({ category: v || '' })}
              options={CATEGORY_OPTIONS}
              placeholder="Selecciona categoría"
              allowClear
              style={{ width: '100%', borderRadius: 8 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>CONTACTO</div>
            <Input
              value={draft.contactName}
              onChange={e => patchDraft({ contactName: e.target.value })}
              placeholder="Nombre de contacto"
              style={{ borderRadius: 8, marginBottom: 8 }}
            />
            <Input
              value={draft.email}
              onChange={e => patchDraft({ email: e.target.value })}
              placeholder="correo@ejemplo.com"
              prefix={<MailOutlined style={{ color: '#aaa' }} />}
              style={{ borderRadius: 8, marginBottom: 8 }}
            />
            <Input
              value={draft.phone}
              onChange={e => patchDraft({ phone: e.target.value })}
              placeholder="Teléfono"
              prefix={<PhoneOutlined style={{ color: '#aaa' }} />}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>SITIO WEB</div>
            <Input
              value={draft.website}
              onChange={e => patchDraft({ website: e.target.value })}
              placeholder="https://..."
              prefix={<GlobalOutlined style={{ color: '#aaa' }} />}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>NOTAS</div>
            <Input.TextArea
              value={draft.notes}
              onChange={e => patchDraft({ notes: e.target.value })}
              rows={3}
              placeholder="Observaciones..."
              style={{ borderRadius: 8, resize: 'none' }}
            />
          </div>

          <Button
            size="small" type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/proveedores/${selected.id}`)}
            style={{ color: '#7C3AED', padding: 0 }}
          >
            Ver perfil completo
          </Button>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid #EDE9FE', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            type="primary"
            disabled={!dirty}
            loading={updateMutation.isPending}
            onClick={handleSavePanel}
            style={{
              background: dirty ? '#059669' : undefined,
              borderColor: dirty ? '#059669' : undefined,
              borderRadius: 8, fontWeight: 600, width: '100%',
            }}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 104px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        padding: '0 0 16px 0', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Proveedores</Title>
        <Space>
          <Input
            placeholder="Buscar proveedor..."
            prefix={<SearchOutlined style={{ color: 'var(--pl-primary)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240, borderRadius: 10 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', border: 'none', height: 40, borderRadius: 10, fontWeight: 600 }}
          >
            Nuevo proveedor
          </Button>
        </Space>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 400 }}>

        {/* Left: grid */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : suppliers.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0' }}>
              <Empty description="No se encontraron proveedores" />
              <Button type="primary" onClick={() => setModalOpen(true)} style={{ marginTop: 16 }}>
                Agregar proveedor
              </Button>
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {suppliers.map((supplier) => {
                const color = avatarColor(supplier.id)
                const name = supplier.companyName || supplier.name || `${supplier.firstName || ''} ${supplier.lastName || ''}`.trim()
                const catColor = CATEGORY_COLORS[supplier.category] || '#6B7280'
                const catLabel = CATEGORY_OPTIONS.find((o) => o.value === supplier.category)?.label || supplier.category
                const isSelected = selected?.id === supplier.id

                return (
                  <Col xs={24} sm={12} lg={8} key={supplier.id}>
                    <Card
                      onClick={() => openPanel(supplier)}
                      style={{
                        borderRadius: 16,
                        border: isSelected ? '2px solid #7C3AED' : '1px solid var(--pl-border)',
                        boxShadow: isSelected ? '0 0 0 3px #EDE9FE' : 'var(--pl-shadow)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                      }}
                      styles={{ body: { padding: 20 } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                        <Avatar
                          size={48}
                          style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: 18, fontWeight: 700, flexShrink: 0 }}
                          icon={<ShopOutlined />}
                        />
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>{name}</Text>
                          {supplier.category && (
                            <Tag style={{ background: catColor + '18', color: catColor, border: 'none', borderRadius: 20, fontSize: 11 }}>
                              {catLabel}
                            </Tag>
                          )}
                        </div>
                      </div>

                      {supplier.email && (
                        <Space size={6} style={{ marginBottom: 4, display: 'flex' }}>
                          <MailOutlined style={{ fontSize: 12, color: 'var(--pl-primary)' }} />
                          <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>{supplier.email}</Text>
                        </Space>
                      )}
                      {supplier.phone && (
                        <Space size={6} style={{ marginBottom: 4, display: 'flex' }}>
                          <PhoneOutlined style={{ fontSize: 12, color: 'var(--pl-teal)' }} />
                          <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>{supplier.phone}</Text>
                        </Space>
                      )}
                      {supplier.website && (
                        <Space size={6} style={{ marginBottom: 4, display: 'flex' }}>
                          <GlobalOutlined style={{ fontSize: 12, color: 'var(--pl-accent)' }} />
                          <a href={supplier.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                            <Text style={{ fontSize: 12 }}>{supplier.website}</Text>
                          </a>
                        </Space>
                      )}

                      <div
                        style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/proveedores/${supplier.id}`)}
                          style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </div>

        {/* Right: edit panel */}
        <EditPanel />
      </div>

      {/* Create modal */}
      <Modal
        title="Nuevo proveedor"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="Crear"
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(vals) => createMutation.mutate(vals)}>
          <Form.Item name="companyName" label="Empresa / Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Categoría">
            <Select options={CATEGORY_OPTIONS} placeholder="Selecciona categoría" allowClear />
          </Form.Item>
          <Form.Item name="contactName" label="Nombre de contacto">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Correo" rules={[{ type: 'email' }]}>
            <Input prefix={<MailOutlined />} />
          </Form.Item>
          <Form.Item name="phone" label="Teléfono">
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="website" label="Sitio web">
            <Input prefix={<GlobalOutlined />} placeholder="https://..." />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
