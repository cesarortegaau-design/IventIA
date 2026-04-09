import React, { useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Card, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WhatsAppOutlined } from '@ant-design/icons'

export function LocationsPage() {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // TODO: Replace with actual API integration
  const [locations, setLocations] = useState<any[]>([
    {
      id: '1',
      name: 'Galería Principal - CDMX',
      address: 'Av. Paseo de la Reforma 505, Mexico City',
      city: 'Mexico City',
      phone: '+52 55 1234 5678',
      whatsapp: '+34611111111',
      hours: 'Mon-Sun 10am-6pm',
    },
  ])

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
    if (editingId) {
      setLocations(locations.map((l) => (l.id === editingId ? { ...l, ...values } : l)))
      message.success('Location updated')
    } else {
      setLocations([...locations, { id: Date.now().toString(), ...values }])
      message.success('Location created')
    }
    setIsModalVisible(false)
    form.resetFields()
  }

  const handleDelete = (id: string) => {
    setLocations(locations.filter((l) => l.id !== id))
    message.success('Location deleted')
  }

  const handleSendWhatsApp = (record: any) => {
    if (!record.whatsapp) {
      message.error('No WhatsApp number configured')
      return
    }
    // TODO: Integrate with gallery API for sending notifications
    message.success(`WhatsApp message would be sent to ${record.whatsapp}`)
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 200,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'WhatsApp',
      dataIndex: 'whatsapp',
      key: 'whatsapp',
      render: (wa: string) => (
        wa ? (
          <span style={{ color: '#25d366', fontWeight: 'bold' }}>
            <WhatsAppOutlined /> {wa}
          </span>
        ) : (
          <span style={{ color: '#ccc' }}>Not configured</span>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button
            type="text"
            size="small"
            icon={<WhatsAppOutlined />}
            style={{ color: '#25d366' }}
            onClick={() => handleSendWhatsApp(record)}
          />
          <Popconfirm
            title="Delete location?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Gallery Locations</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Location
          </Button>
        </div>

        <Table columns={columns} dataSource={locations} rowKey="id" pagination={false} />
      </Card>

      {/* Edit/Create Modal */}
      <Modal
        title={editingId ? 'Edit Location' : 'Add Location'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Location Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="City" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item
            name="whatsapp"
            label="WhatsApp Number"
            extra="Full number with country code (e.g., +34611111111)"
          >
            <Input />
          </Form.Item>
          <Form.Item name="hours" label="Business Hours">
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
