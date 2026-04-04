import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Layout, List, Avatar, Typography, Input, Button, Badge, Empty,
  Space, Tag, Spin, Modal, Form, Select, Upload, message as antMessage,
} from 'antd'
import { SendOutlined, MessageOutlined, UserOutlined, PlusOutlined, PaperClipOutlined, FileOutlined, LoadingOutlined } from '@ant-design/icons'
import { chatApi } from '../../api/chat'
import { clientsApi } from '../../api/clients'
import { useSocket } from '../../hooks/useSocket'

const { Sider, Content } = Layout
const { Text, Title } = Typography

const NAVY = '#1a3a5c'

function timeAgo(date: string) {
  const d    = new Date(date)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)    return 'ahora'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function ChatPage() {
  const qc     = useQueryClient()
  const socket = useSocket()
  const [form] = Form.useForm()

  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [text, setText]               = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [pendingFile, setPendingFile] = useState<{ fileUrl: string; fileName: string } | null>(null)
  const [uploading, setUploading]     = useState(false)
  const bottomRef                     = useRef<HTMLDivElement>(null)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  const { data: conversations = [], isLoading: loadingList } = useQuery({
    queryKey: ['chat', 'admin', 'conversations'],
    queryFn:  chatApi.listConversations,
    refetchInterval: 15000,
  })

  // Fetch portal users for the "new conversation" modal
  const { data: portalUsers = [] } = useQuery({
    queryKey: ['portal-users'],
    queryFn:  clientsApi.listPortalUsers,
    enabled:  showModal,
  })

  const { data: conversation, isLoading: loadingConv } = useQuery({
    queryKey: ['chat', 'admin', 'conversation', selectedId],
    queryFn:  () => chatApi.getConversation(selectedId!),
    enabled:  !!selectedId,
  })

  const sendMut = useMutation({
    mutationFn: (content: string) =>
      chatApi.sendMessage(selectedId!, content, pendingFile?.fileUrl, pendingFile?.fileName),
    onSuccess: () => {
      setText('')
      setPendingFile(null)
      qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversation', selectedId] })
      qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversations'] })
    },
  })

  const startMut = useMutation({
    mutationFn: (values: any) => chatApi.startConversation(values),
    onSuccess: (data: any) => {
      setShowModal(false)
      form.resetFields()
      qc.invalidateQueries({ queryKey: ['chat', 'admin', 'conversations'] })
      if (data.conversation) setSelectedId(data.conversation.id)
    },
  })

  // Real-time
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages])

  const send = () => {
    if ((!text.trim() && !pendingFile) || !selectedId) return
    sendMut.mutate(text.trim())
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await chatApi.uploadFile(file)
      setPendingFile({ fileUrl: result.fileUrl, fileName: result.fileName })
    } catch {
      antMessage.error('Error al subir el archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const apiBase = (import.meta as any).env?.VITE_API_URL ?? ''

  return (
    <>
      <Layout style={{
        height: 'calc(100vh - 112px)', borderRadius: 12, overflow: 'hidden',
        background: '#fff', boxShadow: '0 2px 12px rgba(26,58,92,0.08)',
      }}>

        {/* ── Conversation list ─────────────────────────────────────────── */}
        <Sider width={300} style={{ background: '#f8fafc', borderRight: '1px solid #e8f0fe' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e8f0fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <MessageOutlined style={{ color: '#2e7fc1', fontSize: 16 }} />
              <Title level={5} style={{ margin: 0, color: NAVY }}>Conversaciones</Title>
            </Space>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setShowModal(true)}
              style={{ background: NAVY, borderColor: NAVY, borderRadius: 6 }}
            >
              Nueva
            </Button>
          </div>

          {loadingList ? (
            <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Empty description="Sin conversaciones" />
              <Button type="link" icon={<PlusOutlined />} onClick={() => setShowModal(true)} style={{ color: '#2e7fc1', marginTop: 8 }}>
                Iniciar una conversación
              </Button>
            </div>
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conv: any) => {
                const name = `${conv.portalUser?.firstName ?? ''} ${conv.portalUser?.lastName ?? ''}`.trim()
                const lastMsg    = conv.messages?.[0]
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

        {/* ── Message view ──────────────────────────────────────────────── */}
        <Content style={{ display: 'flex', flexDirection: 'column' }}>
          {!selectedId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#94a3b8' }}>
              <MessageOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />
              <Text style={{ color: '#94a3b8' }}>Selecciona una conversación o inicia una nueva</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}
                style={{ background: NAVY, borderColor: NAVY }}>
                Nueva conversación
              </Button>
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
                  {conversation?.subject && <Text style={{ color: '#64748b', fontSize: 13 }}>— {conversation.subject}</Text>}
                </Space>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8fafc' }}>
                {(conversation?.messages ?? []).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40 }}>Sin mensajes aún</div>
                )}
                {(conversation?.messages ?? []).map((msg: any) => {
                  const isAdmin = msg.senderType === 'ADMIN'
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px',
                        borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isAdmin ? NAVY : '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}>
                        <Text style={{ fontSize: 11, color: isAdmin ? 'rgba(255,255,255,0.6)' : '#94a3b8', display: 'block', marginBottom: 4 }}>
                          {msg.senderName}
                        </Text>
                        {msg.content && <Text style={{ color: isAdmin ? '#fff' : NAVY, fontSize: 14 }}>{msg.content}</Text>}
                        {msg.fileUrl && (
                          msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                            ? <img src={`${apiBase}${msg.fileUrl}`} alt={msg.fileName} style={{ maxWidth: '100%', borderRadius: 8, marginTop: msg.content ? 6 : 0, display: 'block' }} />
                            : <a href={`${apiBase}${msg.fileUrl}`} target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: msg.content ? 4 : 0, color: isAdmin ? '#a5d8ff' : '#2e7fc1' }}>
                                <FileOutlined /><span style={{ fontSize: 12 }}>{msg.fileName}</span>
                              </a>
                        )}
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
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e8f0fe', background: '#fff' }}>
                {pendingFile && (
                  <div style={{ marginBottom: 8, padding: '6px 10px', background: '#f0f7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                      <FileOutlined style={{ color: '#2e7fc1' }} />
                      <Text style={{ fontSize: 12, color: '#2e7fc1' }}>{pendingFile.fileName}</Text>
                    </Space>
                    <Button type="text" size="small" danger onClick={() => setPendingFile(null)} style={{ padding: '0 4px' }}>✕</Button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" />
                  <Button
                    icon={uploading ? <LoadingOutlined /> : <PaperClipOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ borderRadius: 20, color: '#64748b' }}
                  />
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
                    disabled={!text.trim() && !pendingFile}
                    style={{ borderRadius: 20, background: NAVY, borderColor: NAVY }}
                  />
                </div>
              </div>
            </>
          )}
        </Content>
      </Layout>

      {/* ── New conversation modal ─────────────────────────────────────────── */}
      <Modal
        title="Nueva conversación"
        open={showModal}
        onCancel={() => { setShowModal(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="Iniciar conversación"
        okButtonProps={{ loading: startMut.isPending, style: { background: NAVY, borderColor: NAVY } }}
      >
        <Form form={form} layout="vertical" onFinish={values => startMut.mutate(values)} style={{ marginTop: 16 }}>
          <Form.Item name="portalUserId" label="Expositor" rules={[{ required: true, message: 'Selecciona un expositor' }]}>
            <Select
              placeholder="Selecciona un expositor"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={portalUsers.map((u: any) => ({
                value: u.id,
                label: `${u.firstName} ${u.lastName} (${u.email})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="Asunto (opcional)">
            <Input placeholder="Ej: Información sobre tu stand" />
          </Form.Item>
          <Form.Item name="content" label="Mensaje" rules={[{ required: true, message: 'Escribe un mensaje' }]}>
            <Input.TextArea rows={4} placeholder="Escribe tu mensaje..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
