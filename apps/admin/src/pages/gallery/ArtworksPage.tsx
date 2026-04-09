import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Row,
  Col,
  Card,
  Modal,
  Form,
  InputNumber,
  Upload,
  message,
  Popconfirm,
  Image,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { galleryApi } from '../../api/gallery'

const MEDIUMS = ['OIL', 'ACRYLIC', 'WATERCOLOR', 'SCULPTURE', 'PHOTOGRAPHY', 'PRINT', 'DIGITAL', 'MIXED_MEDIA']
const STYLES = ['IMPRESSIONISM', 'SURREALISM', 'POP_ART', 'CUBISM', 'ABSTRACT', 'REALISM', 'EXPRESSIONISM', 'CONTEMPORARY', 'TRADITIONAL', 'MODERNISM']
const STATUSES = ['AVAILABLE', 'SOLD', 'RESERVED', 'ARCHIVED']

export function ArtworksPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<any>({})
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // List artworks
  const { data: artworksData, isLoading } = useQuery({
    queryKey: ['artworks', filters],
    queryFn: () => galleryApi.artworks.list(filters),
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editingId) {
        return galleryApi.artworks.update(editingId, values)
      }
      return galleryApi.artworks.create(values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artworks'] })
      message.success(editingId ? 'Artwork updated' : 'Artwork created')
      setIsModalVisible(false)
      setEditingId(null)
      form.resetFields()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => galleryApi.artworks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artworks'] })
      message.success('Artwork archived')
    },
  })

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: any) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSave = async (values: any) => {
    try {
      await saveMutation.mutateAsync(values)
    } catch (error) {
      message.error('Failed to save artwork')
    }
  }

  const columns = [
    {
      title: 'Image',
      dataIndex: 'mainImage',
      key: 'mainImage',
      width: 80,
      render: (url: string) => url ? <Image src={url} width={60} /> : <span>No image</span>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (_: any, record: any) => (
        <a onClick={() => navigate(`/gallery/artworks/${record.id}`)}>{record.title}</a>
      ),
    },
    {
      title: 'Artist',
      dataIndex: ['artist', 'name'],
      key: 'artist',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: any) => `$${parseFloat(price).toFixed(2)}`,
    },
    {
      title: 'Stock',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: status === 'AVAILABLE' ? '#f0f9ff' : status === 'SOLD' ? '#fee' : '#fef',
          color: status === 'AVAILABLE' ? '#0284c7' : status === 'SOLD' ? '#dc2626' : '#7c3aed',
        }}>
          {status}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Archive artwork?"
            description="This will mark the artwork as archived."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12}>
            <Input.Search
              placeholder="Search artworks..."
              onSearch={(value) => setFilters({ ...filters, search: value })}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} block>
              Add Artwork
            </Button>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by status"
              allowClear
              options={STATUSES.map((s) => ({ value: s, label: s }))}
              onChange={(value) => setFilters({ ...filters, status: value })}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="multiple"
              placeholder="Filter by mediums"
              allowClear
              options={MEDIUMS.map((m) => ({ value: m, label: m }))}
              onChange={(value) => setFilters({ ...filters, mediums: value.join(',') })}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="multiple"
              placeholder="Filter by styles"
              allowClear
              options={STYLES.map((s) => ({ value: s, label: s }))}
              onChange={(value) => setFilters({ ...filters, styles: value.join(',') })}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={artworksData?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={artworksData?.meta ? {
            total: artworksData.meta.total,
            pageSize: artworksData.meta.pageSize,
            current: artworksData.meta.page,
            onChange: (page) => setFilters({ ...filters, page }),
          } : false}
        />
      </Card>

      {/* Edit/Create Modal */}
      <Modal
        title={editingId ? 'Edit Artwork' : 'Add Artwork'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          loading={saveMutation.isPending}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: 'Price is required' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Quantity is required' }]}
          >
            <InputNumber min={1} />
          </Form.Item>

          <Form.Item
            name="mediums"
            label="Mediums"
          >
            <Select mode="multiple" options={MEDIUMS.map((m) => ({ value: m, label: m }))} />
          </Form.Item>

          <Form.Item
            name="styles"
            label="Styles"
          >
            <Select mode="multiple" options={STYLES.map((s) => ({ value: s, label: s }))} />
          </Form.Item>

          <Form.Item
            name="mainImage"
            label="Main Image URL"
          >
            <Input type="url" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
