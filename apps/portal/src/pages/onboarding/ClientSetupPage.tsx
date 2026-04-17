import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Typography, Button, Form, Input, Select, Row, Col, App, Divider, List, Avatar, Space, Skeleton } from 'antd'
import { UserOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ordersApi } from '../../api/orders'

const { Title, Text, Paragraph } = Typography

export default function ClientSetupPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [form] = Form.useForm()

  const { data: meData, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => ordersApi.me(),
  })
  const me = meData?.data?.data
  const existingClients = me?.clients?.map((c: any) => c.client) ?? []

  // If user already has a client linked (legacy or new), redirect to dashboard
  if (me && (me.client || existingClients.length > 0) && !isLoading) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const selectMutation = useMutation({
    mutationFn: (clientId: string) => ordersApi.selectClient(clientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-me'] })
      message.success('Cliente seleccionado')
      navigate('/dashboard', { replace: true })
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => ordersApi.createClient(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-me'] })
      message.success('Cliente creado exitosamente')
      navigate('/dashboard', { replace: true })
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al crear cliente'),
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Skeleton active /></div>

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px' }}>
      <Card style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>Configura tu Perfil de Expositor</Title>
        <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          Para continuar, necesitamos los datos del cliente al que representas.
          Esta información se usará para tus órdenes y documentos fiscales.
        </Paragraph>

        {existingClients.length > 0 && (
          <>
            <Title level={5}>Selecciona un cliente existente</Title>
            <List
              dataSource={existingClients}
              renderItem={(c: any) => {
                const name = c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
                return (
                  <List.Item
                    actions={[
                      <Button key="select" type="primary" icon={<CheckOutlined />} onClick={() => selectMutation.mutate(c.id)} loading={selectMutation.isPending}>
                        Seleccionar
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={name}
                      description={<Space>{c.rfc && <Text type="secondary">RFC: {c.rfc}</Text>}{c.email && <Text type="secondary">{c.email}</Text>}</Space>}
                    />
                  </List.Item>
                )
              }}
            />
            <Divider>o</Divider>
          </>
        )}

        {mode === 'select' && existingClients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Paragraph type="secondary">No tienes clientes registrados aún.</Paragraph>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setMode('create')}>
              Registrar datos de mi empresa / persona
            </Button>
          </div>
        )}

        {(mode === 'create' || existingClients.length > 0) && (
          <>
            {existingClients.length > 0 && (
              <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setMode('create')} style={{ marginBottom: 16 }}>
                Registrar nuevo cliente
              </Button>
            )}

            {mode === 'create' && (
              <Form form={form} layout="vertical" onFinish={createMutation.mutate} initialValues={{ personType: 'MORAL', addressCountry: 'MX' }}>
                <Title level={5}>Datos del Cliente</Title>

                <Form.Item name="personType" label="Tipo de Persona" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'MORAL', label: 'Persona Moral (Empresa)' },
                    { value: 'PHYSICAL', label: 'Persona Física' },
                  ]} />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="companyName" label="Razón Social / Nombre Comercial">
                      <Input placeholder="Nombre de la empresa" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="rfc" label="RFC / ID Fiscal">
                      <Input placeholder="Ej. XAXX010101000" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="firstName" label="Nombre del Contacto">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="lastName" label="Apellido del Contacto">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="email" label="Correo Electrónico">
                      <Input type="email" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="phone" label="Teléfono">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left" plain>Datos Fiscales</Divider>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="taxRegime" label="Régimen Fiscal">
                      <Input placeholder="Ej. General de Ley" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="addressCountry" label="País">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left" plain>Dirección</Divider>

                <Form.Item name="addressStreet" label="Calle y Número">
                  <Input />
                </Form.Item>
                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item name="addressCity" label="Ciudad">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="addressState" label="Estado">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="addressZip" label="Código Postal">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Button type="primary" htmlType="submit" block size="large" loading={createMutation.isPending}>
                  Guardar y Continuar
                </Button>
              </Form>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
