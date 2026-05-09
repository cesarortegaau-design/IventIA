import { List, Badge, Tag, Progress, Typography, Avatar, Space } from 'antd'
import { UserOutlined } from '@ant-design/icons'

const { Text } = Typography

function formatDate(date: string | null | undefined) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

export function TaskListPanel({ tasks, selectedTaskId, onSelectTask, statusConfig, priorityConfig }: any) {
  return (
    <List
      dataSource={tasks}
      renderItem={(task: any) => {
        const isSelected = selectedTaskId === task.id
        const status = statusConfig[task.status as keyof typeof statusConfig]
        const priority = priorityConfig[task.priority as keyof typeof priorityConfig]
        const daysUntilDue = task.endDate ? Math.ceil((new Date(task.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        const isOverdue = daysUntilDue && daysUntilDue < 0

        return (
          <List.Item
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              background: isSelected ? '#e8f0fe' : 'transparent',
              borderBottom: '1px solid #f1f5f9',
              transition: 'background .15s',
            }}
          >
            <div style={{ width: '100%' }}>
              {/* Title and Status */}
              <div style={{ marginBottom: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text strong style={{ fontSize: 13, color: '#1a3a5c' }} ellipsis>
                    {task.title}
                  </Text>
                  <Badge color={status.color} text={status.label} style={{ fontSize: 11 }} />
                </Space>
              </div>

              {/* Progress bar */}
              <Progress percent={task.progress} strokeColor={priority.color} size="small" style={{ marginBottom: 8 }} />

              {/* Metadata: Priority, Assigned, Due Date */}
              <Space size="small" style={{ width: '100%', flexWrap: 'wrap', fontSize: 11 }}>
                <Tag color={priority.color} style={{ margin: 0 }}>{priority.label}</Tag>

                {task.assignedTo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Avatar size={20} icon={<UserOutlined />} style={{ background: '#4A90E2' }} />
                    <Text style={{ fontSize: 11, color: '#64748b' }}>
                      {task.assignedTo.firstName}
                    </Text>
                  </div>
                )}

                {task.endDate && (
                  <Text style={{
                    fontSize: 11,
                    color: isOverdue ? '#ef4444' : '#64748b',
                    fontWeight: isOverdue ? 600 : 400,
                  }}>
                    {isOverdue ? '❌ ' : ''}{formatDate(task.endDate)}
                  </Text>
                )}
              </Space>

              {/* Departments if any */}
              {task.departments && task.departments.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <Space size={4} style={{ fontSize: 10 }}>
                    {task.departments.slice(0, 2).map((d: any) => (
                      <Tag key={d.departmentId} color="blue">{d.department.name}</Tag>
                    ))}
                    {task.departments.length > 2 && <Tag>+{task.departments.length - 2}</Tag>}
                  </Space>
                </div>
              )}
            </div>
          </List.Item>
        )
      }}
    />
  )
}
