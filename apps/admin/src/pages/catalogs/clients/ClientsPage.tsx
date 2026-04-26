import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Input, Space, Tag, Modal, Form, Typography,
  Row, Col, App, Select, Tabs, Switch, Upload,
} from 'antd'
import { PlusOutlined, EditOutlined, PoweroffOutlined, EyeOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { clientsApi } from '../../../api/clients'
import { exportToCsv } from '../../../utils/exportCsv'

const { Title } = Typography

export default function ClientsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search }],
    queryFn: () => clientsApi.list({ search, pageSize: 100 }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => editingId
      ? clientsApi.update(editingId, values)
      : clientsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setModalOpen(false)
      form.resetFields()
      message.success(editingId ? 'Cliente actualizado' : 'Cliente creado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Error al guardar el cliente'
      message.error(msg)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => clientsApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => clientsApi.importClients(rows),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setImportPreview(null)
      message.success(`Importación completada: ${res.data.created} creados, ${res.data.updated} actualizados`)
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al importar'),
  })

  function downloadTemplate() {
    const csv = 'tipo,nombre,rfc,email,telefono,equipo\nMoral,Empresa Ejemplo SA,ABC123456XXX,ejemplo@email.com,5512345678,0\nFísica,Juan Pérez,,,,0'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'plantilla_clientes.csv'
    a.click()
  }

  function parseCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split(/\r?\n/).filter(Boolean)
      if (lines.length < 2) { message.error('El archivo está vacío'); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',')
        const row: any = {}
        headers.forEach((h, i) => { row[h] = vals[i]?.trim() ?? '' })
        return row
      }).filter(r => r.nombre)
      setImportPreview(rows)
    }
    reader.readAsText(file)
    return false
  }

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const columns = [
    {
      title: 'Tipo', dataIndex: 'personType', key: 'type', width: 90,
      render: (v: string) => <Tag color={v === 'MORAL' ? 'blue' : 'green'}>{v === 'MORAL' ? 'Moral' : 'Física'}</Tag>,
    },
    {
      title: 'Nombre / Razón Social', key: 'name',
      render: (_: any, r: any) => (
        <Space>
          {r.logoUrl && <img src={r.logoUrl} height={20} style={{ objectFit: 'contain', borderRadius: 2 }} alt="" />}
          {r.companyName || `${r.firstName} ${r.lastName}`}
          {r.isTeam && <Tag color="gold" style={{ marginLeft: 4 }}>Equipo</Tag>}
        </Space>
      ),
    },
    { title: 'RFC / TAX ID', dataIndex: 'rfc', key: 'rfc' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Teléfono', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Activo', dataIndex: 'isActive', key: 'active', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/catalogos/clientes/${r.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" icon={<PoweroffOutlined />} onClick={() => toggleMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16, gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Catálogo de Clientes</Title>
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Plantilla CSV
          </Button>
          <Upload
            beforeUpload={parseCsvFile}
            showUploadList={false}
            accept=".csv"
          >
            <Button icon={<UploadOutlined />}>Importar CSV</Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('clientes', (data?.data ?? []).map((r: any) => ({
              tipo: r.personType === 'MORAL' ? 'Moral' : 'Física',
              nombre: r.companyName || `${r.firstName} ${r.lastName}`,
              rfc: r.rfc ?? '',
              email: r.email ?? '',
              telefono: r.phone ?? '',
              equipo: r.isTeam ? '1' : '0',
            })), [
              { header: 'tipo', key: 'tipo' },
              { header: 'nombre', key: 'nombre' },
              { header: 'rfc', key: 'rfc' },
              { header: 'email', key: 'email' },
              { header: 'telefono', key: 'telefono' },
              { header: 'equipo', key: 'equipo' },
            ])}
          >
            Exportar CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
            Agregar Cliente
          </Button>
        </Space>
      </Row>

      <Card>
        <Input.Search
          placeholder="Buscar por nombre, RFC, email..."
          onSearch={setSearch}
          allowClear
          style={{ width: '100%', maxWidth: 400, marginBottom: 16 }}
        />
        <Table
          dataSource={data?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, total: data?.meta?.total }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width="min(700px, 95vw)"
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Tabs items={[
            {
              key: 'general', label: 'Datos Generales',
              children: (
                <Row gutter={16}>
                  <Col xs={12}>
                    <Form.Item name="personType" label="Tipo de Persona" rules={[{ required: true }]}>
                      <Select options={[{ value: 'MORAL', label: 'Persona Moral' }, { value: 'PHYSICAL', label: 'Persona Física' }]} />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="companyName" label="Razón Social">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="firstName" label="Nombre">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="lastName" label="Apellido(s)">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="rfc" label="RFC / TAX ID">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="taxRegime" label="Régimen Fiscal">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="email" label="Email">
                      <Input type="email" />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="phone" label="Teléfono">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="whatsapp" label="WhatsApp">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="addressCountry" label="País" initialValue="MX">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'address', label: 'Dirección',
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="addressStreet" label="Calle y Número"><Input /></Form.Item>
                  </Col>
                  <Col xs={8}>
                    <Form.Item name="addressCity" label="Ciudad"><Input /></Form.Item>
                  </Col>
                  <Col xs={8}>
                    <Form.Item name="addressState" label="Estado"><Input /></Form.Item>
                  </Col>
                  <Col xs={8}>
                    <Form.Item name="addressZip" label="C.P."><Input /></Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'imagen', label: 'Imagen',
              children: (
                <Form.Item name="isTeam" label="Equipo deportivo" valuePropName="checked">
                  <Switch />
                </Form.Item>
              ),
            },
          ]} />
        </Form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        open={importPreview !== null}
        title={`Importar Clientes — ${importPreview?.length ?? 0} filas encontradas`}
        onCancel={() => setImportPreview(null)}
        onOk={() => importMutation.mutate(importPreview!)}
        confirmLoading={importMutation.isPending}
        okText="Importar"
        width="min(800px, 95vw)"
      >
        <Table
          dataSource={importPreview ?? []}
          rowKey={(r, i) => String(i)}
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Tipo', dataIndex: 'tipo', width: 80 },
            { title: 'Nombre', dataIndex: 'nombre' },
            { title: 'RFC', dataIndex: 'rfc', width: 130 },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Teléfono', dataIndex: 'telefono', width: 120 },
            { title: 'Equipo', dataIndex: 'equipo', width: 80 },
          ]}
        />
      </Modal>
    </div>
  )
}
