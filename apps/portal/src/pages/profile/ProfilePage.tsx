import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Form, Input, Button, Typography, App, Skeleton, Select,
  Row, Col, Divider, List, Avatar, Space, Modal,
} from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined, CheckOutlined, SwapOutlined } from '@ant-design/icons'
import { ordersApi } from '../../api/orders'
import { useAuthStore } from '../../stores/authStore'

const { Title, Text } = Typography

function ClientForm({ form, onFinish, loading, submitLabel }: {
  form: any; onFinish: (v: any) => void; loading: boolean; submitLabel: string
}) {
  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ personType: 'MORAL', addressCountry: 'MX' }}>
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
      <Button type="primary" htmlType="submit" block size="large" loading={loading}>
        {submitLabel}
      </Button>
    </Form>
  )
}

export default function ProfilePage() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const [userForm] = Form.useForm()
  const [clientForm] = Form.useForm()
  const [newClientForm] = Form.useForm()
  const [editingClient, setEditingClient] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => ordersApi.me(),
  })

  const me = data?.data?.data
  const currentClient = me?.client
  const otherClients = (me?.clients?.map((c: any) => c.client) ?? []).filter((c: any) => c.id !== currentClient?.id)

  if (me && !userForm.isFieldsTouched()) {
    userForm.setFieldsValue({ firstName: me.firstName, lastName: me.lastName, phone: me.phone })
  }

  const userMutation = useMutation({
    mutationFn: (values: any) => ordersApi.updateMe(values),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-me'] })
      const updated = res.data.data
      setAuth({ id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone }, accessToken!, refreshToken!)
      message.success('Datos personales actualizados')
    },
    onError: () => message.error('Error al actualizar'),
  })

  const clientMutation = useMutation({
    mutationFn: (values: any) => ordersApi.updateClient(currentClient.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-me'] })
      setEditingClient(false)
      message.success('Datos del cliente actualizados')
    },
    onError: () => message.error('Error al actualizar cliente'),
  })

  const selectMutation = useMutation({
    mutationFn: (clientId: string) => ordersApi.selectClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-me'] })
      setShowSwitchModal(false)
      message.success('Cliente seleccionado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => ordersApi.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-me'] })
      setShowNewClient(false)
      setShowSwitchModal(false)
      newClientForm.resetFields()
      message.success('Cliente creado y seleccionado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al crear cliente'),
  })

  if (isLoading) return <div style={{ padding: 40 }}><Skeleton active /></div>

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Mis Datos</Title>

      {/* Personal info */}
      <Card title="Información personal" style={{ marginBottom: 16 }}>
        <Form form={userForm} layout="vertical" onFinish={userMutation.mutate}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="phone" label="Teléfono">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={userMutation.isPending}>
            Guardar cambios
          </Button>
        </Form>
      </Card>

      {/* Client info */}
      <Card
        title="Datos del Expositor (Cliente)"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            {currentClient && !editingClient && (
              <Button icon={<EditOutlined />} onClick={() => {
                clientForm.setFieldsValue(currentClient)
                setEditingClient(true)
              }}>Editar</Button>
            )}
            <Button icon={<SwapOutlined />} onClick={() => setShowSwitchModal(true)}>
              Cambiar cliente
            </Button>
          </Space>
        }
      >
        {!currentClient && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Text type="secondary">No tienes un cliente vinculado.</Text>
            <br />
            <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => setShowSwitchModal(true)}>
              Vincular o crear cliente
            </Button>
          </div>
        )}

        {currentClient && !editingClient && (
          <>
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}><Text type="secondary">Tipo: </Text><Text>{currentClient.personType === 'MORAL' ? 'Persona Moral' : 'Persona Física'}</Text></Col>
              <Col xs={24} sm={12}><Text type="secondary">Razón Social: </Text><Text>{currentClient.companyName || '—'}</Text></Col>
              <Col xs={24} sm={12}><Text type="secondary">Nombre: </Text><Text>{[currentClient.firstName, currentClient.lastName].filter(Boolean).join(' ') || '—'}</Text></Col>
              <Col xs={24} sm={12}><Text type="secondary">RFC: </Text><Text>{currentClient.rfc || '—'}</Text></Col>
              <Col xs={24} sm={12}><Text type="secondary">Régimen Fiscal: </Text><Text>{currentClient.taxRegime || '—'}</Text></Col>
              <Col xs={24} sm={12}><Text type="secondary">País: </Text><Text>{currentClient.addressCountry || '—'}</Text></Col>
              {currentClient.addressStreet && (
                <Col xs={24}><Text type="secondary">Dirección: </Text><Text>{[currentClient.addressStreet, currentClient.addressCity, currentClient.addressState, currentClient.addressZip].filter(Boolean).join(', ')}</Text></Col>
              )}
            </Row>
          </>
        )}

        {currentClient && editingClient && (
          <ClientForm
            form={clientForm}
            onFinish={clientMutation.mutate}
            loading={clientMutation.isPending}
            submitLabel="Guardar datos del cliente"
          />
        )}
        {editingClient && (
          <Button style={{ marginTop: 8 }} onClick={() => setEditingClient(false)}>Cancelar</Button>
        )}
      </Card>

      {/* Switch / Add client modal */}
      <Modal
        title="Seleccionar o crear cliente"
        open={showSwitchModal}
        onCancel={() => { setShowSwitchModal(false); setShowNewClient(false) }}
        footer={null}
        width={showNewClient ? 700 : 500}
      >
        {!showNewClient && (
          <>
            {otherClients.length > 0 && (
              <>
                <Title level={5}>Clientes existentes</Title>
                <List
                  dataSource={otherClients}
                  renderItem={(c: any) => {
                    const name = c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
                    return (
                      <List.Item actions={[
                        <Button key="s" type="primary" icon={<CheckOutlined />} onClick={() => selectMutation.mutate(c.id)} loading={selectMutation.isPending}>
                          Seleccionar
                        </Button>,
                      ]}>
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
            <Button type="dashed" block icon={<PlusOutlined />} size="large" onClick={() => setShowNewClient(true)}>
              Registrar nuevo cliente
            </Button>
          </>
        )}
        {showNewClient && (
          <>
            <Button type="link" onClick={() => setShowNewClient(false)} style={{ padding: 0, marginBottom: 12 }}>
              ← Volver a la lista
            </Button>
            <ClientForm
              form={newClientForm}
              onFinish={createMutation.mutate}
              loading={createMutation.isPending}
              submitLabel="Crear y seleccionar cliente"
            />
          </>
        )}
      </Modal>
    </div>
  )
}
