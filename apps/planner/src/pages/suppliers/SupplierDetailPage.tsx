import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Typography, Avatar, Button, Spin, Alert, Space, Row, Col,
  Form, Input, Select, App, Tag,
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, SaveOutlined, MailOutlined, PhoneOutlined,
  GlobalOutlined, ShopOutlined,
} from '@ant-design/icons'
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
    </div>
  )
}
