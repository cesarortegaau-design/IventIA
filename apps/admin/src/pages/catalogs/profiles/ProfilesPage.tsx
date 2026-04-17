import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Space, Tag, Modal, Form, Input, Row, Col, App,
  Typography, Checkbox, Collapse, Popconfirm,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { apiClient } from '../../../api/client'
import { PRIVILEGE_GROUPS } from '@iventia/shared'

const ALL_PRIVILEGE_KEYS = PRIVILEGE_GROUPS.flatMap(g => g.privileges.map(p => p.key))

const { Title } = Typography

function PrivilegesSelector({ value = [], onChange }: { value?: string[], onChange?: (v: string[]) => void }) {
  function toggleAll() {
    if (value.length === ALL_PRIVILEGE_KEYS.length) {
      onChange?.([])
    } else {
      onChange?.([...ALL_PRIVILEGE_KEYS])
    }
  }

  function toggleGroup(groupKeys: string[]) {
    const allInGroup = groupKeys.every(k => value.includes(k))
    if (allInGroup) {
      onChange?.(value.filter(k => !groupKeys.includes(k)))
    } else {
      onChange?.([...new Set([...value, ...groupKeys])])
    }
  }

  const allChecked = value.length === ALL_PRIVILEGE_KEYS.length
  const someChecked = value.length > 0 && !allChecked

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox checked={allChecked} indeterminate={someChecked} onChange={toggleAll}>
          <span style={{ fontWeight: 600 }}>Marcar / Desmarcar todos</span>
        </Checkbox>
        <Tag color="blue">{value.length} / {ALL_PRIVILEGE_KEYS.length}</Tag>
      </div>
      <Checkbox.Group value={value} onChange={v => onChange?.(v as string[])} style={{ width: '100%' }}>
        <Collapse
          size="small"
          items={PRIVILEGE_GROUPS.map((group, i) => {
            const groupKeys = group.privileges.map(p => p.key)
            const groupSelected = groupKeys.filter(k => value.includes(k))
            const allInGroup = groupSelected.length === groupKeys.length
            const someInGroup = groupSelected.length > 0 && !allInGroup
            return {
              key: String(i),
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={allInGroup}
                    indeterminate={someInGroup}
                    onChange={() => toggleGroup(groupKeys)}
                  />
                  <span style={{ fontWeight: 600 }}>{group.label}</span>
                  <Tag style={{ marginLeft: 'auto' }}>{groupSelected.length}/{groupKeys.length}</Tag>
                </div>
              ),
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {group.privileges.map(p => (
                    <Checkbox key={p.key} value={p.key}>{p.label}</Checkbox>
                  ))}
                </div>
              ),
            }
          })}
        />
      </Checkbox.Group>
    </div>
  )
}

export default function ProfilesPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => apiClient.get('/profiles').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        name: values.name,
        description: values.description,
        privileges: values.privileges ?? [],
      }
      return editingId
        ? apiClient.put(`/profiles/${editingId}`, payload).then(r => r.data)
        : apiClient.post('/profiles', payload).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setModalOpen(false)
      form.resetFields()
      setEditingId(null)
      message.success('Perfil guardado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/profiles/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      message.success('Perfil eliminado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      privileges: record.privileges?.map((p: any) => p.privilegeKey) ?? [],
    })
    setModalOpen(true)
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Descripción', dataIndex: 'description', key: 'description' },
    {
      title: 'Privilegios', key: 'privCount',
      render: (_: any, r: any) => <Tag color="blue">{r.privileges?.length ?? 0}</Tag>,
    },
    {
      title: 'Usuarios', key: 'userCount',
      render: (_: any, r: any) => r._count?.users ?? 0,
    },
    {
      title: '', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="¿Eliminar este perfil?" onConfirm={() => deleteMutation.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Perfiles y Privilegios</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
          Nuevo Perfil
        </Button>
      </Row>

      <Card>
        <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>

      <Modal
        title={editingId ? 'Editar Perfil' : 'Nuevo Perfil'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingId(null) }}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Nombre del Perfil" rules={[{ required: true }]}>
                <Input placeholder="Ej. Coordinador, Ventas, Almacén" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="Descripción">
                <Input placeholder="Descripción breve del perfil" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="privileges" label="Privilegios">
            <PrivilegesSelector />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
