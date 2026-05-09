import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { List, Input, Button, Empty, Space, Typography, Avatar, Popconfirm, message as antMessage } from 'antd'
import { SendOutlined, DeleteOutlined } from '@ant-design/icons'
import { collabTasksApi } from '../../../api/collabTasks'

const { Text } = Typography

function formatDate(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000

  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function TaskCommentThread({ taskId, comments = [] }: any) {
  const qc = useQueryClient()
  const [newComment, setNewComment] = useState('')

  const addCommentMut = useMutation({
    mutationFn: () => collabTasksApi.addComment(taskId, newComment),
    onSuccess: () => {
      setNewComment('')
      antMessage.success('Comentario agregado')
      qc.invalidateQueries({ queryKey: ['collab-task', taskId] })
    },
    onError: () => {
      antMessage.error('Error al agregar comentario')
    },
  })

  const deleteCommentMut = useMutation({
    mutationFn: (commentId: string) => collabTasksApi.deleteComment(taskId, commentId),
    onSuccess: () => {
      antMessage.success('Comentario eliminado')
      qc.invalidateQueries({ queryKey: ['collab-task', taskId] })
    },
    onError: () => {
      antMessage.error('Error al eliminar comentario')
    },
  })

  const handleSendComment = () => {
    if (!newComment.trim()) return
    addCommentMut.mutate()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Comments list */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
        {!comments || comments.length === 0 ? (
          <Empty description="Sin comentarios aún" style={{ marginTop: 32 }} />
        ) : (
          <List
            dataSource={comments}
            renderItem={(comment: any) => (
              <List.Item
                key={comment.id}
                actions={[
                  <Popconfirm
                    title="Eliminar comentario"
                    description="¿Estás seguro?"
                    onConfirm={() => deleteCommentMut.mutate(comment.id)}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleteCommentMut.isPending}>
                      Eliminar
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar style={{ background: '#4A90E2' }}>👤</Avatar>}
                  title={
                    <Space>
                      <Text strong>{comment.author.firstName} {comment.author.lastName}</Text>
                      <Text style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(comment.createdAt)}</Text>
                    </Space>
                  }
                  description={<Text>{comment.content}</Text>}
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #e8f0fe', paddingTop: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Escribe un comentario..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onPressEnter={handleSendComment}
            disabled={addCommentMut.isPending}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendComment}
            loading={addCommentMut.isPending}
            disabled={!newComment.trim()}
            style={{ background: '#1a3a5c', borderColor: '#1a3a5c' }}
          />
        </Space.Compact>
      </div>
    </div>
  )
}
