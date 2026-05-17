import { useState, useRef } from 'react'
import { Table, Button, Space, Modal, Form, Select, InputNumber, App, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, ImportOutlined, FileTextOutlined } from '@ant-design/icons'
import { resourcesApi } from '../../../api/resources'

interface PackageComponent {
  id: string
  packageResourceId: string
  componentResourceId: string
  quantity: number
  sortOrder: number
  componentResource: {
    id: string
    code: string
    name: string
    type: string
    unit: string
    isPackage: boolean
  }
}

interface PackageComponentsManagerProps {
  packageResourceId: string
  isSubstitute: boolean
  components: PackageComponent[]
  onComponentsChange: (components: PackageComponent[]) => void
  allResources: any[]
}

const CSV_COLS = ['codigoComponente', 'nombreComponente', 'tipo', 'cantidad', 'unidad', 'orden']

export function PackageComponentsManager({
  packageResourceId,
  isSubstitute,
  components,
  onComponentsChange,
  allResources,
}: PackageComponentsManagerProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const header = CSV_COLS.join(',')
    const example = 'REC-001,Silla plegable,CONSUMABLE,2,pza,0'
    const blob = new Blob([`${header}\n${example}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_componentes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportCsv() {
    try {
      const res = await resourcesApi.exportPackageComponentsCsv(packageResourceId)
      const rows = res.data ?? res
      if (!rows?.length) { message.warning('No hay componentes para exportar'); return }
      const header = CSV_COLS.join(',')
      const body = rows.map((r: any) =>
        CSV_COLS.map(k => {
          const v = r[k] ?? ''
          return String(v).includes(',') ? `"${v}"` : v
        }).join(',')
      ).join('\n')
      const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'componentes_paquete.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Error al exportar')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const [headerLine, ...dataLines] = text.split(/\r?\n/).filter(l => l.trim())
      const headers = headerLine.split(',').map(h => h.trim())
      const rows = dataLines.map(line => {
        const vals = line.split(',')
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = vals[i]?.trim() ?? '' })
        return obj
      })
      const res = await resourcesApi.importPackageComponentsCsv(packageResourceId, rows)
      message.success(`Importado: ${res.data?.imported ?? rows.length} componentes`)
      // Reload components from parent
      window.location.reload()
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || 'Error al importar')
    } finally {
      setImporting(false)
    }
  }

  const handleAddComponent = async (values: any) => {
    try {
      setLoading(true)
      const res = await resourcesApi.addPackageComponent(packageResourceId, {
        componentResourceId: values.componentResourceId,
        quantity: values.quantity,
        sortOrder: values.sortOrder ?? components.length,
      })

      onComponentsChange([...components, res.data])
      message.success('Componente agregado')
      setModalOpen(false)
      form.resetFields()
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || 'Error al agregar componente')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComponent = async (componentId: string) => {
    try {
      setLoading(true)
      await resourcesApi.removePackageComponent(packageResourceId, componentId)
      onComponentsChange(components.filter(c => c.componentResourceId !== componentId))
      message.success('Componente removido')
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || 'Error al remover componente')
    } finally {
      setLoading(false)
    }
  }

  const handleEditComponent = async (values: any) => {
    try {
      setLoading(true)
      const res = await resourcesApi.updatePackageComponent(packageResourceId, editingComponentId!, {
        quantity: values.quantity,
        sortOrder: values.sortOrder,
      })

      onComponentsChange(
        components.map(c => c.componentResourceId === editingComponentId ? res.data : c)
      )
      message.success('Componente actualizado')
      setModalOpen(false)
      form.resetFields()
      setEditingComponentId(null)
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || 'Error al actualizar componente')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingComponentId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (component: PackageComponent) => {
    setEditingComponentId(component.componentResourceId)
    form.setFieldsValue({
      quantity: component.quantity,
      sortOrder: component.sortOrder,
    })
    setModalOpen(true)
  }

  const columns = [
    {
      title: 'Código',
      key: 'code',
      render: (_: any, record: PackageComponent) => record.componentResource.code,
      width: 100,
    },
    {
      title: 'Nombre',
      key: 'name',
      render: (_: any, record: PackageComponent) => record.componentResource.name,
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (v: any) => Number(v).toFixed(3),
    },
    {
      title: 'Unidad',
      key: 'unit',
      render: (_: any, record: PackageComponent) => record.componentResource.unit || '-',
      width: 100,
    },
    {
      title: 'Es Paquete',
      key: 'isPackage',
      render: (_: any, record: PackageComponent) => record.componentResource.isPackage ? 'Sí' : 'No',
      width: 80,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100,
      render: (_: any, record: PackageComponent) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
            disabled={loading}
          />
          <Popconfirm
            title="¿Remover componente?"
            onConfirm={() => handleDeleteComponent(record.componentResourceId)}
            disabled={loading}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={loading} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {isSubstitute && (
        <div style={{ padding: '12px', background: '#e6f7ff', borderRadius: '4px', marginBottom: '16px' }}>
          <strong>⚠️ Componentes Sustitutos</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#595959' }}>
            Solo uno de estos componentes será seleccionable en las órdenes de servicio.
          </p>
        </div>
      )}

      <input
        ref={importInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} disabled={loading}>
          Agregar Componente
        </Button>
        <Button icon={<FileTextOutlined />} onClick={downloadTemplate}>
          Plantilla
        </Button>
        <Button icon={<ImportOutlined />} loading={importing} onClick={() => importInputRef.current?.click()}>
          Importar
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleExportCsv} disabled={components.length === 0}>
          Exportar
        </Button>
      </Space>

      <Table
        dataSource={components}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        loading={loading}
      />

      <Modal
        title={editingComponentId ? 'Editar Componente' : 'Agregar Componente'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditingComponentId(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingComponentId ? handleEditComponent : handleAddComponent}
        >
          {!editingComponentId && (
            <Form.Item
              name="componentResourceId"
              label="Recurso Componente"
              rules={[{ required: true, message: 'Selecciona un recurso' }]}
            >
              <Select
                showSearch
                placeholder="Busca un recurso..."
                optionFilterProp="label"
                options={(Array.isArray(allResources) ? allResources : [])
                  .filter(r => r.id !== packageResourceId)
                  .map(r => ({
                    value: r.id,
                    label: `${r.code} - ${r.name}`,
                  }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="quantity"
            label="Cantidad"
            rules={[{ required: true, message: 'Ingresa la cantidad' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.001} />
          </Form.Item>

          <Form.Item name="sortOrder" label="Orden de Visualización">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
