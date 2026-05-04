import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Space, Tag, Modal, Form, Input, Typography,
  Row, Col, App, Select, Tabs, Switch, Upload, Avatar, Skeleton, Empty,
} from 'antd'
import {
  PlusOutlined, EditOutlined, PoweroffOutlined, EyeOutlined,
  DownloadOutlined, UploadOutlined, MoreOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clientsApi } from '../../../api/clients'
import { exportToCsv } from '../../../utils/exportCsv'
import { PageHeader, FilterBar, StatCard } from '../../../components/ui'
import { formatMoney, getInitials, getAvatarColors } from '../../../utils/format'

const { Text } = Typography

export default function ClientsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusTab, setStatusTab] = useState<string>(searchParams.get('status') ?? 'all')
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search }],
    queryFn: () => clientsApi.list({ search, pageSize: 200 }),
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
      message.error(err?.response?.data?.error?.message ?? 'Error al guardar el cliente')
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

  const allClients: any[] = data?.data ?? []

  const stats = useMemo(() => {
    const active = allClients.filter((c: any) => c.isActive).length
    const inactive = allClients.filter((c: any) => !c.isActive).length
    // Top type by count
    const typeCounts: Record<string, number> = {}
    allClients.forEach((c: any) => {
      if (c.personType) typeCounts[c.personType] = (typeCounts[c.personType] || 0) + 1
    })
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
    const topLabel = topType ? (topType[0] === 'MORAL' ? 'Persona Moral' : 'Persona Física') : '—'
    return { active, inactive, topLabel }
  }, [allClients])

  const tabCounts = useMemo(() => ({
    all: allClients.length,
    active: allClients.filter((c: any) => c.isActive).length,
    inactive: allClients.filter((c: any) => !c.isActive).length,
  }), [allClients])

  const filtered = useMemo(() => {
    return allClients.filter((c: any) => {
      if (statusTab === 'active' && !c.isActive) return false
      if (statusTab === 'inactive' && c.isActive) return false
      if (typeFilter && c.personType !== typeFilter) return false
      return true
    })
  }, [allClients, statusTab, typeFilter])

  const hasFilters = !!(typeFilter || search)

  const columns = [
    {
      title: 'Cliente',
      render: (_: any, r: any) => {
        const name = r.companyName || `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()
        const { bg, fg } = getAvatarColors(name)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={32} style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {getInitials(name)}
            </Avatar>
            <div>
              <Text style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{name}</Text>
              {r.rfc && (
                <Text code style={{ fontSize: 11 }}>{r.rfc}</Text>
              )}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Tipo',
      dataIndex: 'personType',
      width: 110,
      render: (v: string) => v ? (
        <Tag>{v === 'MORAL' ? 'Moral' : 'Física'}</Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Contacto',
      render: (_: any, r: any) => (
        <div>
          {r.email && <Text style={{ fontSize: 13, display: 'block' }}>{r.email}</Text>}
          {r.phone && <Text type="secondary" style={{ fontSize: 11 }}>{r.phone}</Text>}
          {!r.email && !r.phone && <Text type="secondary">—</Text>}
        </div>
      ),
    },
    {
      title: 'Eventos',
      width: 80,
      render: (_: any, r: any) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
          {r._count?.orders ?? r._count?.events ?? '—'}
        </Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={2}>
          <Button
            size="small"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/catalogos/clientes/${r.id}`)}
          />
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            onClick={() => toggleMutation.mutate(r.id)}
            title={r.isActive ? 'Desactivar' : 'Activar'}
          />
        </Space>
      ),
    },
  ]

  const tabItems = [
    { key: 'all',      label: `Todos (${tabCounts.all})` },
    { key: 'active',   label: `Activos (${tabCounts.active})` },
    { key: 'inactive', label: `Inactivos (${tabCounts.inactive})` },
  ]

  return (
    <div>
      <PageHeader
        title="Clientes"
        meta={`Empresas y contactos · ${data?.meta?.total ?? allClients.length} totales`}
        actions={
          <Space>
            <Upload beforeUpload={parseCsvFile} showUploadList={false} accept=".csv">
              <Button icon={<UploadOutlined />}>Importar</Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}
            >
              Nuevo cliente
            </Button>
          </Space>
        }
        tabs={
          <Tabs
            activeKey={statusTab}
            onChange={(k) => {
              setStatusTab(k)
              const next = new URLSearchParams(searchParams)
              if (k === 'all') next.delete('status'); else next.set('status', k)
              setSearchParams(next, { replace: true })
            }}
            items={tabItems}
            style={{ marginBottom: -1 }}
          />
        }
      />

      {/* KPI cards */}
      <div style={{ padding: '20px 24px 4px', background: '#fafafa' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Total clientes" value={data?.meta?.total ?? allClients.length} tone="default" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Activos" value={stats.active} tone="primary" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Inactivos" value={stats.inactive} tone="default" hint="Sin actividad" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Tipo principal" value={stats.topLabel} tone="info" />
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearch={(v) => setSearch(v)}
        placeholder="Buscar cliente, RFC, contacto…"
        right={
          hasFilters ? (
            <Button
              type="link"
              style={{ color: '#6B46C1', paddingLeft: 0 }}
              onClick={() => { setTypeFilter(undefined); setSearch('') }}
            >
              Limpiar filtros
            </Button>
          ) : undefined
        }
      >
        <Select
          placeholder="Tipo de persona"
          allowClear
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'MORAL',    label: 'Persona Moral' },
            { value: 'PHYSICAL', label: 'Persona Física' },
          ]}
          style={{ width: 160 }}
        />
        <Button
          icon={<DownloadOutlined />}
          onClick={() => exportToCsv('clientes', filtered.map((r: any) => ({
            tipo: r.personType === 'MORAL' ? 'Moral' : 'Física',
            nombre: r.companyName || `${r.firstName} ${r.lastName}`,
            rfc: r.rfc ?? '', email: r.email ?? '', telefono: r.phone ?? '',
          })), [
            { header: 'Tipo', key: 'tipo' }, { header: 'Nombre', key: 'nombre' },
            { header: 'RFC', key: 'rfc' }, { header: 'Email', key: 'email' },
            { header: 'Teléfono', key: 'telefono' },
          ])}
        >
          Exportar
        </Button>
      </FilterBar>

      {/* Table */}
      <div style={{ background: '#fff' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasFilters ? 'Sin resultados para los filtros aplicados' : 'No hay clientes aún'}
            style={{ padding: 64 }}
          >
            {!hasFilters && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
                Agregar cliente
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="middle"
            scroll={{ x: 800 }}
            onRow={(r) => ({ onClick: () => navigate(`/catalogos/clientes/${r.id}`), style: { cursor: 'pointer' } })}
            pagination={{
              pageSize: 25,
              total: filtered.length,
              showSizeChanger: true,
              showTotal: t => `${t} clientes`,
            }}
          />
        )}
      </div>

      {/* Create/Edit modal */}
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
              key: 'deportivo', label: 'Deportivo',
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
          rowKey={(_, i) => String(i)}
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
