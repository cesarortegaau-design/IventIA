import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, Row, Col, App, Typography } from 'antd'
import { PlusOutlined, EditOutlined, PoweroffOutlined, DownloadOutlined } from '@ant-design/icons'
import { apiClient } from '../../../api/client'
import { organizationsApi } from '../../../api/organizations'
import { exportToCsv } from '../../../utils/exportCsv'

const { Title } = Typography

export default function DepartmentsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.get('/departments').then(r => r.data),
  })

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  })

  const orgOptions = (orgsData?.data ?? [])
    .filter((o: any) => o.isActive)
    .map((o: any) => ({ value: o.id, label: `${o.clave} — ${o.descripcion}` }))

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const { organizationIds, ...rest } = values
      const dept = editingId
        ? await apiClient.put(`/departments/${editingId}`, rest).then(r => r.data)
        : await apiClient.post('/departments', rest).then(r => r.data)
      // Save organization links (required)
      const deptId = editingId ?? dept?.data?.id
      if (deptId && organizationIds?.length) {
        await organizationsApi.setDepartmentOrgs(deptId, organizationIds)
      }
      return dept
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Departamento guardado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al guardar'),
  })

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      organizationIds: record.departmentOrgs?.map((do_: any) => do_.organization.id) ?? [],
    })
    setModalOpen(true)
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Tipo', dataIndex: 'type', render: (v: string) => <Tag color={v === 'INTERNAL' ? 'blue' : 'orange'}>{v === 'INTERNAL' ? 'Interno' : 'Externo'}</Tag> },
    {
      title: 'Organizaciones',
      render: (_: any, r: any) => (
        <Space wrap size={4}>
          {(r.departmentOrgs ?? []).map((do_: any) => (
            <Tag key={do_.organization.id} color="purple">{do_.organization.clave}</Tag>
          ))}
          {!(r.departmentOrgs?.length) && <Tag color="red">Sin organización</Tag>}
        </Space>
      ),
    },
    { title: 'Usuarios', render: (_: any, r: any) => r._count?.userDepartments ?? 0, width: 80, align: 'center' as const },
    { title: 'Activo', dataIndex: 'isActive', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: '', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" icon={<PoweroffOutlined />} onClick={() => apiClient.patch(`/departments/${r.id}/toggle`).then(() => queryClient.invalidateQueries({ queryKey: ['departments'] }))} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Departamentos Operativos</Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('departamentos', (data?.data ?? []).map((r: any) => ({
              nombre: r.name,
              tipo: r.type === 'INTERNAL' ? 'Interno' : 'Externo',
              organizaciones: (r.departmentOrgs ?? []).map((do_: any) => do_.organization.clave).join(', '),
              activo: r.isActive ? 'Activo' : 'Inactivo',
            })), [
              { header: 'Nombre', key: 'nombre' },
              { header: 'Tipo', key: 'tipo' },
              { header: 'Organizaciones', key: 'organizaciones' },
              { header: 'Activo', key: 'activo' },
            ])}
          >
            Exportar CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
            Nuevo Departamento
          </Button>
        </Space>
      </Row>
      <Card>
        <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>
      <Modal
        title={editingId ? 'Editar Departamento' : 'Nuevo Departamento'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Tipo" initialValue="INTERNAL">
            <Select options={[{ value: 'INTERNAL', label: 'Interno' }, { value: 'EXTERNAL', label: 'Externo' }]} />
          </Form.Item>
          <Form.Item
            name="organizationIds"
            label="Organizaciones"
            rules={[{ required: true, type: 'array', min: 1, message: 'Se requiere al menos una organización' }]}
          >
            <Select mode="multiple" options={orgOptions} placeholder="Seleccionar organizaciones..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
