import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout, List, Avatar, Typography, Input, Button, Badge, Empty, Space, Tag, Spin } from 'antd'
import { SendOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons'
import { chatApi } from '../../api/chat'
import { useSocket } from '../../hooks/useSocket'

const { Sider, Content } = Layout
const { Text, Title } = Typography

const NAVY = '#1a3a5c'

function timeAgo(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60)   return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function ChatPage() {
  const qc     = useQueryClient()
  const socket = useSocket()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [text, setText]             = useState('')
  const bottomRef                   = useRef<HTMLDivElement>(null)

  const { data: conversations = [], isLoading: loadingList } = useQuery({
    queryKey: ['chat', 'admin', 'conversations'],
    queryFn:  chatApi.listConversations,
    refetchInterval: 15000,
  })

  const { data: conversation, isLoading: loadingConv } = useQuery({
    queryKey: ['chat', 'admin', 'conversation', selectedId],
    queryFn:  () => chatApi.getConversation(selectedId!),
    enabled:  !!selectedId,
  })

  const sendMut = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(selectedId!, content),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversation', selectedId] })
      qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversations'] })
    },
  })

  // Real-time: join/leave room and listen for new messages
  useEffect(() => {
    if (!socket || !selectedId) return
    socket.emit('join_conversation', selectedId)
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversation', selectedId] })
      qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversations'] })
    }
    socket.on('new_message', handler)
    socket.on('unread_update', () => qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversations'] }))
    return () => {
      socket.emit('leave_conversation', selectedId)
      socket.off('new_message', handler)
    }
  }, [socket, selectedId, qc])

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages])

  const send = () => {
    if (!text.trim() || !selectedId) return
    sendMut.mutate(text.trim())
  }

  return (
    <Layout style={{ height: 'calc(100vh - 112px)', borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(26,58,92,0.08)' }}>

      {/* Conversation list */}
      <Sider width={300} style={{ background: '#f8fafc', borderRight: '1px solid #e8f0fe' }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #e8f0fe' }}>
          <Space>
            <MessageOutlined style={{ color: '#2e7fc1', fontSize: 18 }} />
            <Title level={5} style={{ margin: 0, color: NAVY }}>Conversaciones</Title>
          </Space>
        </div>
        {loadingList ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
        ) : conversations.length === 0 ? (
          <Empty description="Sin conversaciones" style={{ marginTop: 40 }} />
        ) : (
          <List
            dataSource={conversations}
            renderItem={(conv: any) => {
              const name = `${conv.portalUser?.firstName ?? ''} ${conv.portalUser?.lastName ?? ''}`.trim()
              const lastMsg = conv.messages?.[0]
              const isSelected = selectedId === conv.id
              return (
                <List.Item
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    background: isSelected ? '#e8f0fe' : 'transparent',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background .15s',
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={conv.unreadAdmin} size="small">
                        <Avatar icon={<UserOutlined />} style={{ background: NAVY }} />
                      </Badge>
                    }
                    title={
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong style={{ color: NAVY, fontSize: 13 }}>{name || conv.portalUser?.email}</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>{timeAgo(conv.updatedAt)}</Text>
                      </Space>
                    }
                    description={
                      <div>
                        {conv.event && <Tag color="blue" style={{ fontSize: 10, marginBottom: 2 }}>{conv.event.name}</Tag>}
                        <Text style={{ color: '#64748b', fontSize: 12 }} ellipsis>
                          {lastMsg?.content ?? conv.subject ?? 'Sin mensajes'}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Sider>

      {/* Message view */}
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {!selectedId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94a3b8' }}>
            <MessageOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />
            <Text style={{ color: '#94a3b8' }}>Selecciona una conversación</Text>
          </div>
        ) : loadingConv ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8f0fe', background: '#fff' }}>
              <Space>
                <Avatar icon={<UserOutlined />} style={{ background: NAVY }} />
                <div>
                  <Text strong style={{ color: NAVY, display: 'block' }}>
                    {conversation?.portalUser?.firstName} {conversation?.portalUser?.lastName}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{conversation?.portalUser?.email}</Text>
                </div>
                {conversation?.event && <Tag color="blue">{conversation.event.name}</Tag>}
              </Space>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8fafc' }}>
              {(conversation?.messages ?? []).map((msg: any) => {
                const isAdmin = msg.senderType === 'ADMIN'
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isAdmin ? NAVY : '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    }}>
                      <Text style={{ fontSize: 11, color: isAdmin ? 'rgba(255,255,255,0.6)' : '#94a3b8', display: 'block', marginBottom: 4 }}>
                        {msg.senderName}
                      </Text>
                      <Text style={{ color: isAdmin ? '#fff' : NAVY, fontSize: 14 }}>{msg.content}</Text>
                      <Text style={{ fontSize: 10, color: isAdmin ? 'rgba(255,255,255,0.4)' : '#cbd5e1', display: 'block', marginTop: 4, textAlign: 'right' }}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e8f0fe', background: '#fff', display: 'flex', gap: 8 }}>
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                onPressEnter={send}
                placeholder="Escribe un mensaje..."
                style={{ borderRadius: 20, flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={send}
                loading={sendMut.isPending}
                disabled={!text.trim()}
                style={{ borderRadius: 20, background: NAVY, borderColor: NAVY }}
              />
            </div>
          </>
        )}
      </Content>
    </Layout>
  )
}
