import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Card, Row, Col, Typography, List, Tag, Button, Avatar, Space,
  Segmented, Empty, Badge,
} from 'antd'
import {
  ClockCircleOutlined, UserOutlined, CalendarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { crmApi } from '../../api/crm'

const { Title, Text } = Typography

export default function CrmDashboard() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('PENDING')

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-tasks', statusFilter],
    queryFn: () => crmApi.myTasks({ status: statusFilter }),
  })

  const tasks = tasksData?.data ?? []
  const overdue = tasks.filter((t: any) => t.dueDate && dayjs(t.dueDate).isBefore(dayjs()))
  const today = tasks.filter((t: any) => t.dueDate && dayjs(t.dueDate).isSame(dayjs(), 'day'))
  const upcoming = tasks.filter((t: any) => !t.dueDate || dayjs(t.dueDate).isAfter(dayjs(), 'day'))

  function TaskList({ items, emptyText }: { items: any[]; emptyText: string }) {
    if (items.length === 0) return <Empty description={emptyText} style={{ padding: 24 }} />
    return (
      <List
        dataSource={items}
        renderItem={(task: any) => {
          const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs())
          const clientName = task.client?.companyName || [task.client?.firstName, task.client?.lastName].filter(Boolean).join(' ') || '—'
          return (
            <List.Item
              actions={[
                <Button size="small" key="view" onClick={() => navigate(`/catalogos/clientes/${task.clientId}`)}>
                  Ver cliente
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    size="small"
                    style={{ backgroundColor: isOverdue ? '#ff4d4f' : '#fa8c16' }}
                    icon={<ClockCircleOutlined />}
                  />
                }
                title={<Text strong>{task.title}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Space>
                      <UserOutlined />
                      <Text type="secondary" style={{ fontSize: 12 }}>{clientName}</Text>
                    </Space>
                    {task.dueDate && (
                      <Space>
                        <CalendarOutlined />
                        <Text type={isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                          {dayjs(task.dueDate).format('DD/MM/YYYY')}
                          {isOverdue && ' — Vencida'}
                        </Text>
                      </Space>
                    )}
                    {task.description && <Text type="secondary" style={{ fontSize: 12 }}>{task.description}</Text>}
                  </Space>
                }
              />
            </List.Item>
          )
        }}
      />
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>CRM — Mis tareas</Title>
        <Segmented
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as string)}
          options={[
            { label: 'Pendientes', value: 'PENDING' },
            { label: 'Completadas', value: 'DONE' },
          ]}
        />
      </Row>

      {statusFilter === 'PENDING' ? (
        <Row gutter={16}>
          <Col span={8}>
            <Card
              title={
                <Space>
                  <Badge count={overdue.length} color="red" />
                  <Text strong style={{ color: '#ff4d4f' }}>Vencidas</Text>
                </Space>
              }
              loading={isLoading}
              style={{ minHeight: 300 }}
            >
              <TaskList items={overdue} emptyText="Sin tareas vencidas" />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              title={
                <Space>
                  <Badge count={today.length} color="orange" />
                  <Text strong style={{ color: '#fa8c16' }}>Hoy</Text>
                </Space>
              }
              loading={isLoading}
              style={{ minHeight: 300 }}
            >
              <TaskList items={today} emptyText="Sin tareas para hoy" />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              title={
                <Space>
                  <Badge count={upcoming.length} color="blue" />
                  <Text strong>Próximas</Text>
                </Space>
              }
              loading={isLoading}
              style={{ minHeight: 300 }}
            >
              <TaskList items={upcoming} emptyText="Sin tareas próximas" />
            </Card>
          </Col>
        </Row>
      ) : (
        <Card loading={isLoading}>
          <TaskList items={tasks} emptyText="Sin tareas completadas" />
        </Card>
      )}
    </div>
  )
}
