import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Space, Tag, Modal, Form, Input, Select,
  Row, Col, App, Typography, Upload, Popconfirm, List
} from 'antd'
import { PlusOutlined, DeleteOutlined, UploadOutlined, TagsOutlined } from '@ant-design/icons'
import { templatesApi } from '../../api/templates'

const { Title, Text } = Typography
const { TextArea } = Input
const { Dragger } = Upload

const CONTEXT_OPTIONS = [
  { value: 'EVENT', label: 'Evento' },
  { value: 'ORDER', label: 'Orden de Servicio' },
  { value: 'CONTRACT', label: 'Contrato' },
]

const CONTEXT_COLORS: Record<string, string> = {
  EVENT: 'blue',
  ORDER: 'green',
  CONTRACT: 'purple',
}

const CONTEXT_LABELS: Record<string, string> = {
  EVENT: 'Evento',
  ORDER: 'Orden',
  CONTRACT: 'Contrato',
}

export default function TemplatesPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [contextFilter, setContextFilter] = useState<string | undefined>()
  const [labelsModalOpen, setLabelsModalOpen] = useState(false)
  const [labelsContext, setLabelsContext] = useState<string>('EVENT')

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', contextFilter],
    queryFn: () => templatesApi.list({ context: contextFilter }),
  })

  const { data: labels } = useQuery({
    queryKey: ['template-labels', labelsContext],
    queryFn: () => templatesApi.getLabels(labelsContext),
    enabled: labelsModalOpen,
  })

  const uploadMutation = useMutation({
    mutationFn: (values: any) => {
      if (!file) throw new Error('Selecciona un archivo')
      return templatesApi.upload(file, values.name, values.context, values.description)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setModalOpen(false)
      form.resetFields()
      setFile(null)
      const count = (data.placeholders as string[])?.length || 0
      message.success(`Plantilla subida — ${count} marcador(es) detectado(s)`)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.message || 'Error al subir plantilla')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      message.success('Plantilla eliminada')
    },
    onError: () => message.error('Error al eliminar'),
  })

  const columns = [
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Descripción', dataIndex: 'description', ellipsis: true },
    {
      title: 'Contexto', dataIndex: 'context', width: 120,
      render: (v: string) => <Tag color={CONTEXT_COLORS[v]}>{CONTEXT_LABELS[v]}</Tag>,
    },
    { title: 'Archivo', dataIndex: 'fileName', width: 200, ellipsis: true },
    {
      title: 'Marcadores', dataIndex: 'placeholders', width: 100, align: 'center' as const,
      render: (v: string[]) => v?.length || 0,
    },
    {
      title: 'Creado por', dataIndex: 'createdBy', width: 150,
      render: (u: any) => u ? `${u.firstName} ${u.lastName}` : '-',
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_: any, r: any) => (
        <Popconfirm title="¿Eliminar plantilla?" onConfirm={() => deleteMutation.mutate(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const expandedRow = (record: any) => {
    const placeholders = record.placeholders as string[]
    if (!placeholders || placeholders.length === 0) return <Text type="secondary">Sin marcadores</Text>
    return (
      <Space wrap>
        {placeholders.map((p: string) => (
          <Tag key={p} color="geekblue">*[{p}]</Tag>
        ))}
      </Space>
    )
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>Plantillas de Documentos</Title>
          <Select
            allowClear
            placeholder="Filtrar por contexto"
            style={{ width: 180 }}
            value={contextFilter}
            onChange={setContextFilter}
            options={CONTEXT_OPTIONS}
          />
        </Space>
        <Space>
          <Button icon={<TagsOutlined />} onClick={() => setLabelsModalOpen(true)}>
            Ver Etiquetas
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setFile(null); setModalOpen(true) }}>
            Subir Plantilla
          </Button>
        </Space>
      </Row>

      <Card>
        <Table
          dataSource={templates || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20 }}
          expandable={{
            expandedRowRender: expandedRow,
            rowExpandable: (r: any) => (r.placeholders as string[])?.length > 0,
          }}
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Subir Plantilla Word"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={uploadMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={(v) => uploadMutation.mutate(v)}>
          <Form.Item name="name" label="Nombre de la Plantilla" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Contrato de Servicios" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="context" label="Contexto" rules={[{ required: true, message: 'Requerido' }]}>
                <Select options={CONTEXT_OPTIONS} placeholder="Seleccionar" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Descripción">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Archivo Word (.docx)" required>
            <Dragger
              accept=".docx"
              maxCount={1}
              beforeUpload={(f) => { setFile(f); return false }}
              onRemove={() => setFile(null)}
              fileList={file ? [{ uid: '-1', name: file.name, status: 'done' } as any] : []}
            >
              <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} /></p>
              <p>Arrastra o haz clic para subir un archivo .docx</p>
              <p style={{ color: '#888', fontSize: 12 }}>
                Usa marcadores con formato <strong>*[Etiqueta]</strong> dentro del documento
              </p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      {/* Labels Reference Modal */}
      <Modal
        title="Etiquetas Disponibles"
        open={labelsModalOpen}
        onCancel={() => setLabelsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Space style={{ marginBottom: 16 }}>
          <Text>Contexto:</Text>
          <Select
            value={labelsContext}
            onChange={setLabelsContext}
            options={CONTEXT_OPTIONS}
            style={{ width: 200 }}
          />
        </Space>

        {/* Scalar labels */}
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Campos simples</Text>
        <List
          size="small"
          bordered
          style={{ marginBottom: 16 }}
          dataSource={(labels as any)?.scalar || []}
          renderItem={(label: string) => (
            <List.Item>
              <Tag color="geekblue">*[{label}]</Tag>
            </List.Item>
          )}
        />

        {/* Table/loop labels */}
        {((labels as any)?.tables || []).length > 0 && (
          <>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Tablas (loops)</Text>
            {((labels as any)?.tables || []).map((t: any) => (
              <Card key={t.name} size="small" title={t.description} style={{ marginBottom: 12 }}
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Sección: {t.name}</Text>}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                  En tu documento Word, agrega una fila de tabla con <Tag color="volcano">*[#{t.name}]</Tag> al inicio
                  y <Tag color="volcano">*[/{t.name}]</Tag> al final. Dentro de la fila usa:
                </Text>
                <Space wrap>
                  {t.fields.map((f: string) => (
                    <Tag key={f} color="geekblue">*[{f}]</Tag>
                  ))}
                </Space>
              </Card>
            ))}
          </>
        )}
      </Modal>
    </div>
  )
}
