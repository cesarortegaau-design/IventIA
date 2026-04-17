import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Typography, Form, Input, Button, Spin, App, Descriptions } from 'antd'
import {
  UserOutlined, ShopOutlined, SaveOutlined,
} from '@ant-design/icons'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

const { Text, Title } = Typography

const PRIMARY  = '#0369a1'
const DARK     = '#0c4a6e'
const DARK_MID = '#0369a1'

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      marginBottom: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #E5E7EB', background: '#F3F4F6',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg, ${PRIMARY}, #0284c7)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 16 }}>{icon}</span>
        </div>
        <Text strong style={{ fontSize: 15 }}>{title}</Text>
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const qc          = useQueryClient()
  const { message } = App.useApp()
  const setAuth     = useAuthStore((s) => s.setAuth)
  const storeUser   = useAuthStore((s) => s.user)
  const storeTokens = useAuthStore((s) => ({ a: s.accessToken!, r: s.refreshToken! }))
  const [form]      = Form.useForm()

  const { data: meData, isLoading } = useQuery({
    queryKey: ['supplier-me'],
    queryFn:  authApi.me,
  })

  const me       = meData?.data?.data ?? meData?.data
  const supplier = me?.suppliers?.[0] ?? me?.supplier ?? null

  useEffect(() => {
    if (me) {
      form.setFieldsValue({
        firstName: me.firstName,
        lastName:  me.lastName,
        phone:     me.phone ?? '',
      })
    }
  }, [me, form])

  const updateMut = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; phone?: string }) => authApi.updateMe(data),
    onSuccess: (res) => {
      const updatedUser = res.data?.data ?? res.data
      if (updatedUser && storeUser) {
        setAuth(
          { ...storeUser, ...updatedUser },
          storeTokens.a,
          storeTokens.r,
        )
      }
      message.success('Perfil actualizado correctamente')
      qc.invalidateQueries({ queryKey: ['supplier-me'] })
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message ?? 'Error al actualizar el perfil')
    },
  })

  const onSave = (values: any) => {
    updateMut.mutate({
      firstName: values.firstName,
      lastName:  values.lastName,
      phone:     values.phone || undefined,
    })
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>

  const supplierDescItems = [
    { key: 'name',        label: 'Razón Social',     children: supplier?.name ?? '—' },
    { key: 'code',        label: 'Código',            children: supplier?.code ?? '—' },
    { key: 'type',        label: 'Tipo',              children: supplier?.type ?? '—' },
    { key: 'email',       label: 'Correo',            children: supplier?.email ?? '—' },
    { key: 'phone',       label: 'Teléfono',          children: supplier?.phone ?? '—' },
    { key: 'rfc',         label: 'RFC',               children: supplier?.rfc ?? supplier?.taxId ?? '—' },
    { key: 'fiscalName',  label: 'Nombre Fiscal',     children: supplier?.fiscalName ?? supplier?.legalName ?? '—' },
    { key: 'cfdiUse',     label: 'Uso de CFDI',       children: supplier?.cfdiUse ?? '—' },
    { key: 'paymentMethod', label: 'Método de Pago',  children: supplier?.paymentMethod ?? '—' },
    { key: 'address',     label: 'Dirección',         children: [
      supplier?.street, supplier?.city, supplier?.state, supplier?.postalCode, supplier?.country,
    ].filter(Boolean).join(', ') || '—' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_MID} 100%)`,
        padding: '28px 24px 36px',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180,
          background: 'radial-gradient(circle, rgba(2,132,199,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.12)', borderRadius: 20,
            padding: '3px 12px', marginBottom: 10,
          }}>
            <UserOutlined style={{ color: '#bae6fd', fontSize: 12 }} />
            <Text style={{ color: '#bae6fd', fontSize: 12, fontWeight: 500 }}>Cuenta</Text>
          </div>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>Mi Perfil</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            {me?.email}
          </Text>
        </div>
      </div>

      {/* Account form */}
      <SectionCard icon={<UserOutlined />} title="Mi Cuenta">
        <Form form={form} layout="vertical" onFinish={onSave} style={{ maxWidth: 480 }}>
          <Form.Item
            name="firstName"
            label="Nombre"
            rules={[{ required: true, message: 'Ingresa tu nombre' }]}
          >
            <Input size="large" placeholder="Tu nombre" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Apellido"
            rules={[{ required: true, message: 'Ingresa tu apellido' }]}
          >
            <Input size="large" placeholder="Tu apellido" />
          </Form.Item>
          <Form.Item name="phone" label="Teléfono">
            <Input size="large" placeholder="+52 55 1234 5678" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={updateMut.isPending}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
            >
              Guardar Cambios
            </Button>
          </Form.Item>
        </Form>
      </SectionCard>

      {/* Supplier info */}
      {supplier && (
        <SectionCard icon={<ShopOutlined />} title="Información del Proveedor">
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2 }}
            items={supplierDescItems.filter(i => i.children !== '—')}
          />
        </SectionCard>
      )}
    </div>
  )
}
