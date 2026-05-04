import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Tag, Modal, Form, Input, Row, Col, App, Typography,
  Tabs, Space, Empty, Skeleton, Popconfirm, Select, Avatar,
} from 'antd'
import { PlusOutlined, EditOutlined, PoweroffOutlined, DownloadOutlined, MoreOutlined } from '@ant-design/icons'
import { organizationsApi } from '../../../api/organizations'
import { apiClient } from '../../../api/client'
import { exportToCsv } from '../../../utils/exportCsv'
import { PageHeader } from '../../../components/ui'
import { getInitials, getAvatarColors } from '../../../utils/format'

const { Text } = Typography

const ORG_COLORS = ['#6B46C1', '#0369a1', '#16a34a', '#d97706', '#db2777', '#7c3aed']

export default function OrganizationsPage() {
  const [orgForm] = Form.useForm()
  const [deptForm] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [orgModalOpen, setOrgModalOpen] = useState(false)
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list,
  })

  const { data: deptsData, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.get('/departments').then(r => r.data),
  })

  const orgs: any[] = orgsData?.data ?? []
  const allDepts: any[] = deptsData?.data ?? []

  // Auto-select first org
  const selectedOrg = orgs.find(o => o.id === selectedOrgId) ?? orgs[0] ?? null
  const effectiveOrgId = selectedOrg?.id ?? null

  // Departments for selected org
  const orgDepts = allDepts.filter((d: any) =>
    (d.departmentOrgs ?? []).some((do_: any) => do_.organization?.id === effectiveOrgId)
  )

  const orgOptions = orgs.filter(o => o.isActive).map((o: any) => ({ value: o.id, label: `${o.clave} — ${o.descripcion}` }))

  // ── Org mutations ────────────────────────────────────────────────────────
  const saveOrgMutation = useMutation({
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
      return editingOrgId
        ? organizationsApi.update(editingOrgId, payload)
        : organizationsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setOrgModalOpen(false)
      orgForm.resetFields()
      message.success('Organización guardada')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al guardar'),
  })

  const toggleOrgMutation = useMutation({
    mutationFn: (id: string) => organizationsApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  })

  // ── Dept mutations ───────────────────────────────────────────────────────
  const saveDeptMutation = useMutation({
    mutationFn: async (values: any) => {
      const { organizationIds, ...rest } = values
      const dept = editingDeptId
        ? await apiClient.put(`/departments/${editingDeptId}`, rest).then(r => r.data)
        : await apiClient.post('/departments', rest).then(r => r.data)
      const deptId = editingDeptId ?? dept?.data?.id
      if (deptId && organizationIds?.length) {
        await organizationsApi.setDepartmentOrgs(deptId, organizationIds)
      }
      return dept
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setDeptModalOpen(false)
      deptForm.resetFields()
      message.success('Departamento guardado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al guardar'),
  })

  function openEditOrg(record: any) {
    setEditingOrgId(record.id)
    const df = record.datosFiscales ?? {}
    const dd = record.datosDemograficos ?? {}
    orgForm.setFieldsValue({
      clave: record.clave, descripcion: record.descripcion,
      razonSocial: df.razonSocial, rfc: df.rfc, regimenFiscal: df.regimenFiscal, domicilioFiscal: df.domicilioFiscal,
      ciudad: dd.ciudad, estado: dd.estado, pais: dd.pais, telefono: dd.telefono, email: dd.email,
    })
    setOrgModalOpen(true)
  }

  function openNewDept() {
    setEditingDeptId(null)
    deptForm.resetFields()
    deptForm.setFieldsValue({
      type: 'INTERNAL',
      organizationIds: effectiveOrgId ? [effectiveOrgId] : [],
    })
    setDeptModalOpen(true)
  }

  function openEditDept(record: any) {
    setEditingDeptId(record.id)
    deptForm.setFieldsValue({
      name: record.name,
      type: record.type,
      organizationIds: record.departmentOrgs?.map((do_: any) => do_.organization.id) ?? [],
    })
    setDeptModalOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Organizaciones y Departamentos"
        meta="Estructura organizacional · entidades legales y áreas operativas"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditingOrgId(null); orgForm.resetFields(); setOrgModalOpen(true) }}
          >
            Nueva organización
          </Button>
        }
      />

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 120px)', background: '#f5f5f5' }}>

        {/* Left — org list */}
        <div style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0' }}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {orgs.length} organizaciones
            </Text>
          </div>

          {orgsLoading ? (
            <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
          ) : orgs.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay organizaciones" style={{ padding: 48 }} />
          ) : (
            <div>
              {orgs.map((org: any, idx: number) => {
                const color = ORG_COLORS[idx % ORG_COLORS.length]
                const isSelected = org.id === (effectiveOrgId)
                return (
                  <div
                    key={org.id}
                    onClick={() => setSelectedOrgId(org.id)}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid #f5f5f5',
                      cursor: 'pointer',
                      background: isSelected ? '#f4eeff' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      transition: 'background 0.15s',
                    }}
                  >
                    <Avatar
                      size={44}
                      style={{ background: color, color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0, borderRadius: 10 }}
                    >
                      {(org.clave ?? '?').substring(0, 2).toUpperCase()}
                    </Avatar>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 14 }}>{org.descripcion}</Text>
                        {idx === 0 && <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px' }}>PRINCIPAL</Tag>}
                        <Tag color={org.isActive ? 'green' : 'red'} style={{ fontSize: 10, lineHeight: '16px' }}>
                          {org.isActive ? 'Activa' : 'Inactiva'}
                        </Tag>
                      </div>
                      <Text code style={{ fontSize: 11 }}>{org.clave}</Text>
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                        {org.datosDemograficos?.pais ?? 'MX'} · {org._count?.departmentOrgs ?? 0} departamentos
                      </div>
                    </div>

                    <Space size={2} onClick={e => e.stopPropagation()}>
                      <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditOrg(org)} />
                      <Button
                        size="small"
                        type="text"
                        icon={<PoweroffOutlined />}
                        loading={toggleOrgMutation.isPending}
                        onClick={() => toggleOrgMutation.mutate(org.id)}
                      />
                    </Space>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — departments for selected org */}
        <div style={{ background: '#fff', overflowY: 'auto' }}>
          {!selectedOrg ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <Empty description="Selecciona una organización" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Departamentos · {selectedOrg.descripcion}
                  </Text>
                </div>
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={() => exportToCsv('departamentos', orgDepts.map((r: any) => ({
                      nombre: r.name,
                      tipo: r.type === 'INTERNAL' ? 'Interno' : 'Externo',
                      organizaciones: (r.departmentOrgs ?? []).map((do_: any) => do_.organization.clave).join(', '),
                      activo: r.isActive ? 'Activo' : 'Inactivo',
                    })), [
                      { header: 'Nombre', key: 'nombre' }, { header: 'Tipo', key: 'tipo' },
                      { header: 'Organizaciones', key: 'organizaciones' }, { header: 'Activo', key: 'activo' },
                    ])}
                  >
                    Exportar
                  </Button>
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openNewDept}>
                    Nuevo departamento
                  </Button>
                </Space>
              </div>

              {deptsLoading ? (
                <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 5 }} /></div>
              ) : orgDepts.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Esta organización no tiene departamentos" style={{ padding: 48 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openNewDept}>Agregar departamento</Button>
                </Empty>
              ) : (
                <Table
                  dataSource={orgDepts}
                  rowKey="id"
                  size="middle"
                  pagination={false}
                  columns={[
                    {
                      title: 'Departamento',
                      render: (_: any, r: any) => (
                        <div>
                          <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</Text>
                        </div>
                      ),
                    },
                    {
                      title: 'Tipo',
                      dataIndex: 'type',
                      width: 90,
                      render: (v: string) => <Tag color={v === 'INTERNAL' ? 'blue' : 'orange'}>{v === 'INTERNAL' ? 'Interno' : 'Externo'}</Tag>,
                    },
                    {
                      title: 'Usuarios',
                      width: 80,
                      align: 'right' as const,
                      render: (_: any, r: any) => (
                        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{r._count?.userDepartments ?? 0}</Text>
                      ),
                    },
                    {
                      title: 'Estado',
                      width: 80,
                      render: (_: any, r: any) => (
                        <Tag color={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Activo' : 'Inactivo'}</Tag>
                      ),
                    },
                    {
                      title: '',
                      key: 'actions',
                      width: 80,
                      render: (_: any, r: any) => (
                        <Space size={2}>
                          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditDept(r)} />
                          <Button
                            size="small"
                            type="text"
                            icon={<PoweroffOutlined />}
                            onClick={() => apiClient.patch(`/departments/${r.id}/toggle`).then(() => queryClient.invalidateQueries({ queryKey: ['departments'] }))}
                          />
                        </Space>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Org create/edit modal */}
      <Modal
        title={editingOrgId ? 'Editar Organización' : 'Nueva Organización'}
        open={orgModalOpen}
        onCancel={() => setOrgModalOpen(false)}
        onOk={() => orgForm.submit()}
        confirmLoading={saveOrgMutation.isPending}
        width={640}
        forceRender
      >
        <Form form={orgForm} layout="vertical" onFinish={saveOrgMutation.mutate}>
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
                  <Col span={12}><Form.Item name="razonSocial" label="Razón Social"><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="rfc" label="RFC"><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="regimenFiscal" label="Régimen Fiscal"><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="domicilioFiscal" label="Domicilio Fiscal"><Input /></Form.Item></Col>
                </Row>
              ),
            },
            {
              key: 'demo',
              label: 'Datos Demográficos',
              children: (
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="ciudad" label="Ciudad"><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="estado" label="Estado"><Input /></Form.Item></Col>
                  <Col span={8}><Form.Item name="pais" label="País" initialValue="MX"><Input /></Form.Item></Col>
                  <Col span={8}><Form.Item name="telefono" label="Teléfono"><Input /></Form.Item></Col>
                  <Col span={8}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
                </Row>
              ),
            },
          ]} />
        </Form>
      </Modal>

      {/* Dept create/edit modal */}
      <Modal
        title={editingDeptId ? 'Editar Departamento' : 'Nuevo Departamento'}
        open={deptModalOpen}
        onCancel={() => setDeptModalOpen(false)}
        onOk={() => deptForm.submit()}
        confirmLoading={saveDeptMutation.isPending}
        forceRender
      >
        <Form form={deptForm} layout="vertical" onFinish={saveDeptMutation.mutate}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Tipo" initialValue="INTERNAL">
            <Select options={[{ value: 'INTERNAL', label: 'Interno' }, { value: 'EXTERNAL', label: 'Externo' }]} />
          </Form.Item>
          <Form.Item name="organizationIds" label="Organizaciones" rules={[{ required: true, type: 'array', min: 1, message: 'Se requiere al menos una organización' }]}>
            <Select mode="multiple" options={orgOptions} placeholder="Seleccionar organizaciones..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
