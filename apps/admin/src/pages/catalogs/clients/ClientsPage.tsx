import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Input, Space, Tag, Modal, Form, Typography,
  Row, Col, App, Select, Tabs, Switch, Upload, Avatar,
} from 'antd'
import {
  PlusOutlined, EditOutlined, PoweroffOutlined, EyeOutlined,
  DownloadOutlined, UploadOutlined, SearchOutlined, TeamOutlined,
  DollarOutlined, ClearOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { clientsApi } from '../../../api/clients'
import { exportToCsv } from '../../../utils/exportCsv'

const { Title, Text } = Typography
const PURPLE = '#6B46C1'

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
    const csv = 'tipo,nombre,rfc,email,telefono,numero,equipo\nMoral,Empresa Ejemplo SA,ABC123456XXX,ejemplo@email.com,5512345678,,0\nFísica,Juan Pérez,,,,7,0'
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

  const clients = data?.data ?? []
  const activeCount = clients.filter((c: any) => c.isActive).length
  const inactiveCount = clients.filter((c: any) => !c.isActive).length

  const COLORS = ['#dbeafe/#1e40af', '#fef3c7/#92400e', '#fee2e2/#991b1b', '#dcfce7/#166534', '#e0e7ff/#3730a3', '#fce7f3/#9f1239', '#f3e8ff/#6b21a8', '#fef9c3/#854d0e']

  const columns = [
    {
      title: 'Cliente', key: 'name',
      render: (_: any, r: any) => {
        const name = r.companyName || `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()
        const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()
        const idx = (r.id?.charCodeAt(0) || 0) % COLORS.length
        const [bg, fg] = COLORS[idx].split('/')
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={32} style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600 }}>{initials}</Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
              {r.rfc && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontFamily: 'monospace' }}>{r.rfc}</div>}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Tipo', dataIndex: 'personType', width: 90,
      render: (v: string) => <Tag color={v === 'MORAL' ? 'blue' : 'green'}>{v === 'MORAL' ? 'Moral' : 'Física'}</Tag>,
    },
    {
      title: 'Contacto', key: 'contact',
      render: (_: any, r: any) => (
        <div>
          {r.email && <div style={{ fontSize: 13 }}>{r.email}</div>}
          {r.phone && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{r.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Estado', dataIndex: 'isActive', width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => navigate(`/catalogos/clientes/${r.id}`)} />
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" type="text" icon={<PoweroffOutlined />} onClick={() => toggleMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Clientes</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Empresas y contactos para los que se producen eventos</Text>
        </div>
        <Space>
          <Upload beforeUpload={parseCsvFile} showUploadList={false} accept=".csv">
            <Button icon={<UploadOutlined />}>Importar</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
            Nuevo cliente
          </Button>
        </Space>
      </div>

      {/* Stats cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total clientes', value: data?.meta?.total ?? clients.length, color: '#1a3a5c' },
          { title: 'Activos', value: activeCount, color: '#16a34a' },
          { title: 'Inactivos', value: inactiveCount, color: '#64748b' },
        ].map(card => (
          <Col xs={24} sm={8} key={card.title}>
            <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.title}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: card.color }}>{card.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card bodyStyle={{ padding: '12px 16px' }} style={{ marginBottom: 16, borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Buscar cliente, RFC, contacto…"
            style={{ width: 280 }}
            onPressEnter={(e) => setSearch((e.target as HTMLInputElement).value)}
            allowClear
            onClear={() => setSearch('')}
          />
          <Button icon={<DownloadOutlined />} onClick={() => exportToCsv('clientes', clients.map((r: any) => ({
            tipo: r.personType === 'MORAL' ? 'Moral' : 'Física',
            nombre: r.companyName || `${r.firstName} ${r.lastName}`,
            rfc: r.rfc ?? '', email: r.email ?? '', telefono: r.phone ?? '',
          })), [
            { header: 'Tipo', key: 'tipo' }, { header: 'Nombre', key: 'nombre' },
            { header: 'RFC', key: 'rfc' }, { header: 'Email', key: 'email' },
            { header: 'Teléfono', key: 'telefono' },
          ])}>
            Exportar
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 10 }}>
        <Table
          dataSource={clients}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, total: data?.meta?.total, showTotal: t => `${t} clientes` }}
          scroll={{ x: 700 }}
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
              key: 'imagen', label: 'Deportivo',
              children: (
                <>
                  <Form.Item name="playerNumber" label="Número de jugador">
                    <Input maxLength={10} style={{ width: 120 }} placeholder="Ej: 7" />
                  </Form.Item>
                  <Form.Item name="isTeam" label="Equipo deportivo" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </>
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
            { title: 'Número', dataIndex: 'numero', width: 80 },
            { title: 'Equipo', dataIndex: 'equipo', width: 80 },
          ]}
        />
      </Modal>
    </div>
  )
}
