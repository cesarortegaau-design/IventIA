import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Modal, Form, Tag, Space, message, Input, Select, Row, Col } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { arteCapitalApi } from '../../api/arte-capital'
import { useState } from 'react'

const [form] = Form.useForm()

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ status: 'PENDING_APPROVAL', page: 1, pageSize: 20 })
  const [rejectModal, setRejectModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['arte-capital-products', filters],
    queryFn: () => arteCapitalApi.products.list(filters),
  })

  const { mutate: approve } = useMutation({
    mutationFn: (productId: string) =>
      arteCapitalApi.products.approve(productId, ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arte-capital-products'] })
      message.success('Product approved')
    },
  })

  const { mutate: reject } = useMutation({
    mutationFn: (productId: string) =>
      arteCapitalApi.products.reject(productId, '', rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arte-capital-products'] })
      message.success('Product rejected')
      setRejectModal(false)
    },
  })

  const columns = [
    { title: 'Título', dataIndex: ['title'], width: 200 },
    { title: 'Artista', dataIndex: ['artist', 'user', 'firstName'], render: (_, r) => `${r.artist?.user?.firstName} ${r.artist?.user?.lastName}` },
    { title: 'Precio', dataIndex: 'price', render: (v) => `$${Number(v).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'APPROVED' ? 'green' : 'orange'}>{v}</Tag> },
    {
      title: 'Acciones',
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING_APPROVAL' && (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={() => approve(record.id)} size="small">
                Aprobar
              </Button>
              <Button danger icon={<CloseOutlined />} onClick={() => {setSelectedProduct(record); setRejectModal(true)}} size="small">
                Rechazar
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <h2>Productos de Arte Capital</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            style={{ width: 180 }}
            value={filters.status}
            onChange={(v) => setFilters({ ...filters, status: v, page: 1 })}
            options={[
              { value: 'PENDING_APPROVAL', label: 'Pendiente' },
              { value: 'APPROVED', label: 'Aprobado' },
              { value: 'REJECTED', label: 'Rechazado' },
            ]}
          />
        </Col>
      </Row>

      <Table columns={columns} dataSource={data?.products ?? []} loading={isLoading} rowKey="id" pagination={false} />

      <Modal title="Rechazar Producto" open={rejectModal} onOk={() => {reject(selectedProduct?.id); setRejectModal(false)}} onCancel={() => setRejectModal(false)}>
        <Form>
          <Form.Item label="Razón del Rechazo">
            <Input.TextArea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
