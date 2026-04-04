import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Input, Typography, Avatar, Spin, Empty, message as antMessage } from 'antd'
import { MessageOutlined, SendOutlined, CloseOutlined, ArrowLeftOutlined, CustomerServiceOutlined, PaperClipOutlined, FileOutlined, LoadingOutlined } from '@ant-design/icons'
import { chatApi } from '../api/chat'
import { useSocket } from '../hooks/useSocket'

const { Text } = Typography

const PURPLE = '#531dab'

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60)    return 'ahora'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function ChatWidget({ isMobile = false }: { isMobile?: boolean }) {
  const qc     = useQueryClient()
  const socket = useSocket()
  const [open, setOpen]             = useState(false)
  const [view, setView]             = useState<'list' | 'conv'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [text, setText]             = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [pendingFile, setPendingFile] = useState<{ fileUrl: string; fileName: string } | null>(null)
  const [uploading, setUploading]   = useState(false)
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)
  const apiBase = (import.meta as any).env?.VITE_API_URL ?? ''

  const { data: conversations = [] } = useQuery({
    queryKey: ['chat', 'portal', 'conversations'],
    queryFn:  chatApi.listConversations,
    enabled:  open,
    refetchInterval: 15000,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['chat', 'portal', 'unread'],
    queryFn:  chatApi.unreadCount,
    refetchInterval: 20000,
  })
  const unread = unreadData?.unread ?? 0

  const { data: conversation, isLoading: loadingConv } = useQuery({
    queryKey: ['chat', 'portal', 'conversation', selectedId],
    queryFn:  () => chatApi.getConversation(selectedId!),
    enabled:  !!selectedId && open,
  })

  const sendMut = useMutation({
    mutationFn: (content: string) =>
      selectedId
        ? chatApi.sendMessage(selectedId, content, pendingFile?.fileUrl, pendingFile?.fileName)
        : chatApi.startConversation({ subject: newSubject || undefined, content }),
    onSuccess: (data: any) => {
      setText('')
      setPendingFile(null)
      setShowNew(false)
      setNewSubject('')
      if (!selectedId && data.conversation) {
        setSelectedId(data.conversation.id)
        setView('conv')
      }
      qc.invalidateQueries({ queryKey: ['chat', 'portal'] })
    },
  })

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

  // Real-time
  useEffect(() => {
    if (!socket || !selectedId) return
    socket.emit('join_conversation', selectedId)
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['chat', 'portal', 'conversation', selectedId] })
      qc.invalidateQueries({ queryKey: ['chat', 'portal', 'conversations'] })
      qc.invalidateQueries({ queryKey: ['chat', 'portal', 'unread'] })
    }
    socket.on('new_message', handler)
    socket.on('unread_update', handler)
    return () => {
      socket.emit('leave_conversation', selectedId)
      socket.off('new_message', handler)
      socket.off('unread_update', handler)
    }
  }, [socket, selectedId, qc])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages])

  const openConv = (id: string) => {
    setSelectedId(id)
    setView('conv')
    setShowNew(false)
  }

  const send = () => {
    if (!text.trim() && !pendingFile) return
    sendMut.mutate(text.trim())
  }

  const floatBottom = isMobile ? 90 : 24
  const floatRight = isMobile ? 16 : 24

  return (
    <div style={{ position: 'fixed', bottom: floatBottom, right: floatRight, zIndex: 1000 }}>
      {/* Floating button */}
      {!open && (
        <Badge count={unread} size="small">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<MessageOutlined style={{ fontSize: 20 }} />}
            onClick={() => setOpen(true)}
            style={{ width: 56, height: 56, background: PURPLE, borderColor: PURPLE, boxShadow: '0 4px 16px rgba(83,29,171,0.4)' }}
          />
        </Badge>
      )}

      {/* Chat window */}
      {open && (
        <div style={
          isMobile
            ? {
                position: 'fixed', inset: 0, width: '100vw', height: '100dvh',
                background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                zIndex: 1001,
              }
            : {
                width: 360, height: 520, background: '#fff', borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }
        }>
          {/* Header */}
          <div style={{ background: PURPLE, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {view === 'conv' && (
                <Button type="text" icon={<ArrowLeftOutlined style={{ color: '#fff' }} />}
                  onClick={() => setView('list')} style={{ padding: 0, height: 'auto' }} />
              )}
              <CustomerServiceOutlined style={{ color: '#fff', fontSize: 18 }} />
              <Text style={{ color: '#fff', fontWeight: 600 }}>
                {view === 'conv' ? 'Conversación' : 'Mensajes'}
              </Text>
            </div>
            <Button type="text" icon={<CloseOutlined style={{ color: '#fff' }} />}
              onClick={() => { setOpen(false); setView('list') }} style={{ padding: 0, height: 'auto' }} />
          </div>

          {/* List view */}
          {view === 'list' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {conversations.length === 0 && !showNew ? (
                  <Empty description="Sin mensajes aún" style={{ marginTop: 40 }} />
                ) : (
                  conversations.map((conv: any) => {
                    const lastMsg = conv.messages?.[0]
                    return (
                      <div key={conv.id} onClick={() => openConv(conv.id)}
                        style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8f0ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <Badge count={conv.unreadPortal} size="small">
                          <Avatar icon={<CustomerServiceOutlined />} style={{ background: PURPLE }} />
                        </Badge>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text strong style={{ fontSize: 13 }}>{conv.subject ?? conv.event?.name ?? 'Consulta general'}</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 11 }}>{timeAgo(conv.updatedAt)}</Text>
                          </div>
                          <Text style={{ color: '#64748b', fontSize: 12 }} ellipsis>{lastMsg?.content ?? '—'}</Text>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div style={{ padding: 12, borderTop: '1px solid #f1f5f9' }}>
                {!showNew ? (
                  <Button block type="primary" onClick={() => setShowNew(true)} style={{ background: PURPLE, borderColor: PURPLE }}>
                    + Nueva consulta
                  </Button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Input placeholder="Asunto (opcional)" value={newSubject} onChange={e => setNewSubject(e.target.value)} size="small" />
                    <Input.TextArea placeholder="¿En qué te podemos ayudar?" value={text} onChange={e => setText(e.target.value)} rows={2} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="small" onClick={() => setShowNew(false)}>Cancelar</Button>
                      <Button size="small" type="primary" onClick={send} loading={sendMut.isPending} disabled={!text.trim()}
                        style={{ flex: 1, background: PURPLE, borderColor: PURPLE }}>Enviar</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversation view */}
          {view === 'conv' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#f8f0ff22' }}>
                {loadingConv ? <div style={{ textAlign: 'center', paddingTop: 40 }}><Spin /></div> : (
                  (conversation?.messages ?? []).map((msg: any) => {
                    const isAdmin = msg.senderType === 'ADMIN'
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end', marginBottom: 10 }}>
                        <div style={{
                          maxWidth: '80%', padding: '8px 12px', borderRadius: isAdmin ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                          background: isAdmin ? PURPLE : '#f1f5f9',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        }}>
                          <Text style={{ fontSize: 11, color: isAdmin ? 'rgba(255,255,255,0.6)' : '#94a3b8', display: 'block' }}>
                            {msg.senderName}
                          </Text>
                          {msg.content && <Text style={{ color: isAdmin ? '#fff' : '#1e293b', fontSize: 13 }}>{msg.content}</Text>}
                          {msg.fileUrl && (
                            msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                              ? <img src={`${apiBase}${msg.fileUrl}`} alt={msg.fileName} style={{ maxWidth: '100%', borderRadius: 6, marginTop: msg.content ? 4 : 0, display: 'block' }} />
                              : <a href={`${apiBase}${msg.fileUrl}`} target="_blank" rel="noreferrer"
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: msg.content ? 4 : 0, color: isAdmin ? '#c4b5fd' : PURPLE, fontSize: 12 }}>
                                  <FileOutlined />{msg.fileName}
                                </a>
                          )}
                          <Text style={{ fontSize: 10, color: isAdmin ? 'rgba(255,255,255,0.4)' : '#cbd5e1', display: 'block', textAlign: 'right', marginTop: 2 }}>
                            {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9' }}>
                {pendingFile && (
                  <div style={{ marginBottom: 6, padding: '4px 8px', background: '#f5f3ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: PURPLE, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileOutlined />{pendingFile.fileName}
                    </span>
                    <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>✕</button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button
                    shape="circle"
                    size="small"
                    icon={uploading ? <LoadingOutlined style={{ fontSize: 12 }} /> : <PaperClipOutlined style={{ fontSize: 12 }} />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ flexShrink: 0 }}
                  />
                  <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onPressEnter={send}
                    placeholder="Escribe un mensaje..."
                    style={{ borderRadius: 20, fontSize: 13 }}
                  />
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={send}
                    loading={sendMut.isPending}
                    disabled={!text.trim() && !pendingFile}
                    style={{ background: PURPLE, borderColor: PURPLE, flexShrink: 0 }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
