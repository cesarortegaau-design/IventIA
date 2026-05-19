import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Input, Button, Row, Col, Card, Typography, Space, Avatar, Empty,
  Spin, Modal, Form, App, Tag, Select,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, MailOutlined, PhoneOutlined,
  EyeOutlined, ShopOutlined, GlobalOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { suppliersApi } from '../../api/suppliers'

const { Title, Text } = Typography

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

const AVATAR_COLORS = ['#7C3AED', '#EC4899', '#F97316', '#0D9488', '#2563EB', '#059669']

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Proveedores</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', border: 'none', height: 40, borderRadius: 10, fontWeight: 600 }}
        >
          Nuevo proveedor
        </Button>
      </div>

      <Input
        placeholder="Buscar proveedor..."
        prefix={<SearchOutlined style={{ color: 'var(--pl-primary)' }} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 300, borderRadius: 10, marginBottom: 20 }}
        allowClear
      />

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

            return (
              <Col xs={24} sm={12} lg={8} key={supplier.id}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid var(--pl-border)',
                    boxShadow: 'var(--pl-shadow)',
                    transition: 'all 0.2s',
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
                      <a href={supplier.website} target="_blank" rel="noreferrer">
                        <Text style={{ fontSize: 12 }}>{supplier.website}</Text>
                      </a>
                    </Space>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
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
