import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Row, Col, App, Typography, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, PoweroffOutlined } from '@ant-design/icons'
import { organizationsApi } from '../../../api/organizations'

const { Title } = Typography

export default function OrganizationsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        clave: values.clave,
        descripcion: values.descripcion,
        datosFiscales: {
          razonSocial: values.razonSocial || '',
          rfc: values.rfc || '',
          regimenFiscal: values.regimenFiscal || '',
          domicilioFiscal: values.domicilioFiscal || '',
        },
        datosDemograficos: {
          ciudad: values.ciudad || '',
          estado: values.estado || '',
          pais: values.pais || 'MX',
          telefono: values.telefono || '',
          email: values.email || '',
        },
      }
      return editingId
        ? organizationsApi.update(editingId, payload)
        : organizationsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Organización guardada')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al guardar'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => organizationsApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  })

  function openEdit(record: any) {
    setEditingId(record.id)
    const df = record.datosFiscales ?? {}
    const dd = record.datosDemograficos ?? {}
    form.setFieldsValue({
      clave: record.clave,
      descripcion: record.descripcion,
      razonSocial: df.razonSocial,
      rfc: df.rfc,
      regimenFiscal: df.regimenFiscal,
      domicilioFiscal: df.domicilioFiscal,
      ciudad: dd.ciudad,
      estado: dd.estado,
      pais: dd.pais,
      telefono: dd.telefono,
      email: dd.email,
    })
    setModalOpen(true)
  }

  const columns = [
    { title: 'Clave', dataIndex: 'clave', width: 100 },
    { title: 'Descripción', dataIndex: 'descripcion' },
    { title: 'Depts.', render: (_: any, r: any) => r._count?.departmentOrgs ?? 0, width: 70, align: 'center' as const },
    { title: 'Activo', dataIndex: 'isActive', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: '', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" icon={<PoweroffOutlined />} loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Organizaciones</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
          Nueva Organización
        </Button>
      </Row>
      <Card>
        <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>

      <Modal
        title={editingId ? 'Editar Organización' : 'Nueva Organización'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="clave" label="Clave" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>

          <Tabs items={[
            {
              key: 'fiscal',
              label: 'Datos Fiscales',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="razonSocial" label="Razón Social"><Input /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="rfc" label="RFC"><Input /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="regimenFiscal" label="Régimen Fiscal"><Input /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="domicilioFiscal" label="Domicilio Fiscal"><Input /></Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'demo',
              label: 'Datos Demográficos',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="ciudad" label="Ciudad"><Input /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="estado" label="Estado"><Input /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="pais" label="País" initialValue="MX"><Input /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="telefono" label="Teléfono"><Input /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="email" label="Email"><Input /></Form.Item>
                  </Col>
                </Row>
              ),
            },
          ]} />
        </Form>
      </Modal>
    </div>
  )
}
