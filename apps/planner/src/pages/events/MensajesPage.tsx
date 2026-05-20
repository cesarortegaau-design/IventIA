/**
 * MensajesPage.tsx
 * Mensajes del evento — chat interno entre equipo del planner
 * Persiste en localStorage: iventia-mensajes-{eventId}
 */
import { useState, useRef, useEffect } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Input, Button, Avatar, Tag, Typography, Tooltip, App,
  Upload, Popover, Divider,
} from 'antd'
import {
  SendOutlined, PaperClipOutlined, SmileOutlined, SearchOutlined,
  MessageOutlined, TeamOutlined, CheckOutlined, ClockCircleOutlined,
  FileOutlined, PictureOutlined, DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { useAuthStore } from '../../stores/authStore'
import { eventsApi } from '../../api/events'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
interface Mensaje {
  id: string
  text: string
  authorId: string
  authorName: string
  authorInitials: string
  authorColor: string
  timestamp: string
  type: 'text' | 'file' | 'image' | 'system'
  fileUrl?: string
  fileName?: string
  reactions?: Record<string, string[]>   // emoji → [authorId]
  replyTo?: { id: string; text: string; authorName: string }
}

// ── Persistence ────────────────────────────────────────────────────────────────
const msgsKey = (id: string) => `iventia-mensajes-${id}`

function loadMsgs(id: string): Mensaje[] {
  try {
    const raw = localStorage.getItem(msgsKey(id))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveMsgs(id: string, msgs: Mensaje[]) {
  localStorage.setItem(msgsKey(id), JSON.stringify(msgs))
}

// ── Color palette for users ────────────────────────────────────────────────────
const USER_COLORS = ['#7C3AED', '#EC4899', '#0D9488', '#F97316', '#3B82F6', '#8B5CF6', '#14B8A6']
const colorFor = (userId: string) => USER_COLORS[userId.charCodeAt(0) % USER_COLORS.length]

// ── Emoji picker (simple) ──────────────────────────────────────────────────────
const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙌', '🔥', '✅', '💯', '👏', '😍']

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({
  msg, isMine, onReact, onReply, onDelete,
}: {
  msg: Mensaje
  isMine: boolean
  onReact: (id: string, emoji: string) => void
  onReply: (msg: Mensaje) => void
  onDelete: (id: string) => void
}) {
  const [showActions, setShowActions] = useState(false)

  if (msg.type === 'system') {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <Text style={{ fontSize: 11, color: '#aaa', background: '#F3F4F6', borderRadius: 20, padding: '2px 12px' }}>
          {msg.text}
        </Text>
      </div>
    )
  }

  const emojiPicker = (
    <div style={{ display: 'flex', gap: 4, padding: 4 }}>
      {EMOJIS.map((e) => (
        <span key={e} style={{ fontSize: 18, cursor: 'pointer' }}
          onClick={() => onReact(msg.id, e)}>
          {e}
        </span>
      ))}
    </div>
  )

  return (
    <div
      style={{
        display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
        gap: 8, marginBottom: 12, alignItems: 'flex-end',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isMine && (
        <Avatar size={28} style={{ background: msg.authorColor, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          {msg.authorInitials}
        </Avatar>
      )}

      <div style={{ maxWidth: '72%' }}>
        {/* Author + time */}
        {!isMine && (
          <div style={{ fontSize: 10, color: '#888', marginBottom: 2, paddingLeft: 2 }}>
            {msg.authorName} · {dayjs(msg.timestamp).fromNow()}
          </div>
        )}

        {/* Reply reference */}
        {msg.replyTo && (
          <div style={{
            background: isMine ? 'rgba(255,255,255,0.2)' : '#F0F0F5',
            borderLeft: `3px solid ${msg.authorColor}`,
            borderRadius: '6px 6px 0 0', padding: '4px 10px',
            fontSize: 11, color: isMine ? 'rgba(255,255,255,0.8)' : '#666',
          }}>
            <span style={{ fontWeight: 600 }}>{msg.replyTo.authorName}</span>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {msg.replyTo.text}
            </div>
          </div>
        )}

        {/* Bubble */}
        <div style={{
          background: isMine ? 'linear-gradient(135deg,#7C3AED,#9333EA)' : '#fff',
          color: isMine ? '#fff' : '#1F2937',
          borderRadius: isMine
            ? (msg.replyTo ? '12px 4px 12px 12px' : '12px 4px 12px 12px')
            : (msg.replyTo ? '4px 12px 12px 12px' : '4px 12px 12px 12px'),
          padding: '8px 12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'relative',
        }}>
          {msg.type === 'image' && msg.fileUrl ? (
            <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }} />
          ) : msg.type === 'file' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileOutlined style={{ fontSize: 18 }} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{msg.fileName}</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.text}
            </div>
          )}

          {/* Timestamp (mine) */}
          {isMine && (
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', textAlign: 'right', marginTop: 2 }}>
              {dayjs(msg.timestamp).format('HH:mm')}
              <CheckOutlined style={{ marginLeft: 3 }} />
            </div>
          )}
        </div>

        {/* Reactions */}
        {msg.reactions && Object.entries(msg.reactions).some(([, users]) => users.length > 0) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
            {Object.entries(msg.reactions).filter(([, users]) => users.length > 0).map(([emoji, users]) => (
              <span
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                style={{
                  background: '#F3F4F6', borderRadius: 20, padding: '2px 6px',
                  fontSize: 12, cursor: 'pointer', border: '1px solid #E5E7EB',
                }}
              >
                {emoji} <span style={{ fontSize: 10, color: '#888' }}>{users.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div style={{
          display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0,
          flexDirection: isMine ? 'row-reverse' : 'row',
        }}>
          <Popover content={emojiPicker} trigger="click" placement="top">
            <Tooltip title="Reaccionar">
              <Button size="small" type="text" icon={<SmileOutlined />}
                style={{ fontSize: 12, width: 26, height: 26, padding: 0 }} />
            </Tooltip>
          </Popover>
          <Tooltip title="Responder">
            <Button size="small" type="text"
              icon={<span style={{ fontSize: 12 }}>↩</span>}
              onClick={() => onReply(msg)}
              style={{ width: 26, height: 26, padding: 0 }} />
          </Tooltip>
          {isMine && (
            <Tooltip title="Eliminar">
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                onClick={() => onDelete(msg.id)}
                style={{ fontSize: 12, width: 26, height: 26, padding: 0 }} />
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

// ── Day separator ──────────────────────────────────────────────────────────────
function DaySeparator({ date }: { date: string }) {
  const label = dayjs(date).isSame(dayjs(), 'day')
    ? 'Hoy'
    : dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')
      ? 'Ayer'
      : dayjs(date).format('D [de] MMMM YYYY')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px' }}>
      <div style={{ flex: 1, height: 1, background: '#F0F0F0' }} />
      <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#F0F0F0' }} />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MensajesPage() {
  const { id } = useParams<{ id: string }>()
  const { event: ctxEvent } = useOutletContext<{ event: any }>() || {}
  const { user } = useAuthStore()

  const { data } = useQuery({
    queryKey: ['planner-event-header', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id && !ctxEvent,
  })
  const event = ctxEvent || data?.data

  const [msgs, setMsgs] = useState<Mensaje[]>(() => {
    const loaded = loadMsgs(id || '')
    // Add welcome system message if empty
    if (loaded.length === 0) {
      const welcome: Mensaje = {
        id: 'sys-welcome',
        text: `Canal de mensajes creado para "${event?.name || 'el evento'}"`,
        authorId: 'system',
        authorName: 'Sistema',
        authorInitials: 'S',
        authorColor: '#888',
        timestamp: new Date().toISOString(),
        type: 'system',
      }
      return [welcome]
    }
    return loaded
  })

  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [replyTo, setReplyTo] = useState<Mensaje | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  function send() {
    const trimmed = text.trim()
    if (!trimmed) return

    const newMsg: Mensaje = {
      id: `msg-${Date.now()}`,
      text: trimmed,
      authorId: user?.id || 'me',
      authorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Yo',
      authorInitials: `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'YO',
      authorColor: colorFor(user?.id || 'me'),
      timestamp: new Date().toISOString(),
      type: 'text',
      ...(replyTo ? { replyTo: { id: replyTo.id, text: replyTo.text, authorName: replyTo.authorName } } : {}),
    }

    const updated = [...msgs, newMsg]
    setMsgs(updated)
    saveMsgs(id!, updated)
    setText('')
    setReplyTo(null)
  }

  function handleReact(msgId: string, emoji: string) {
    const uid = user?.id || 'me'
    const updated = msgs.map((m) => {
      if (m.id !== msgId) return m
      const reactions = { ...(m.reactions || {}) }
      const users = reactions[emoji] || []
      reactions[emoji] = users.includes(uid)
        ? users.filter((u) => u !== uid)
        : [...users, uid]
      return { ...m, reactions }
    })
    setMsgs(updated)
    saveMsgs(id!, updated)
  }

  function handleDelete(msgId: string) {
    const updated = msgs.filter((m) => m.id !== msgId)
    setMsgs(updated)
    saveMsgs(id!, updated)
  }

  function handleReply(msg: Mensaje) {
    setReplyTo(msg)
    inputRef.current?.focus()
  }

  // Group messages by day for separator
  const displayed = search
    ? msgs.filter((m) => m.text.toLowerCase().includes(search.toLowerCase()))
    : msgs

  let lastDay = ''
  const withDays: Array<Mensaje | { _day: string }> = []
  for (const m of displayed) {
    const day = dayjs(m.timestamp).format('YYYY-MM-DD')
    if (day !== lastDay) { withDays.push({ _day: day }); lastDay = day }
    withDays.push(m)
  }

  const myId = user?.id || 'me'

  // Unique authors (for sidebar)
  const authors: Record<string, Mensaje> = {}
  for (const m of msgs) {
    if (m.authorId !== 'system') authors[m.authorId] = m
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#F8F8FF' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #F0F0F0',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid #F5F5F5' }}>
          <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageOutlined style={{ color: '#7C3AED' }} /> Mensajes
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{event?.name || '—'}</div>
        </div>

        <div style={{ padding: 10, flex: 1, overflow: 'auto' }}>
          {/* Channels */}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#BBB', letterSpacing: '0.06em', marginBottom: 6 }}>
            CANALES
          </div>
          {['# general', '# equipo', '# proveedores'].map((ch, i) => (
            <div key={i} style={{
              padding: '7px 10px', borderRadius: 7, marginBottom: 2,
              background: i === 0 ? '#F5F3FF' : 'transparent',
              color: i === 0 ? '#7C3AED' : '#666',
              fontSize: 12, fontWeight: i === 0 ? 600 : 400,
              cursor: 'pointer',
            }}>
              {ch}
              {i === 0 && <Tag style={{ marginLeft: 6, fontSize: 9, borderRadius: 20, padding: '0 5px', lineHeight: '16px' }}>{msgs.filter(m => m.type !== 'system').length}</Tag>}
            </div>
          ))}

          <Divider style={{ margin: '10px 0' }} />

          {/* Participants */}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#BBB', letterSpacing: '0.06em', marginBottom: 6 }}>
            <TeamOutlined style={{ marginRight: 4 }} />PARTICIPANTES
          </div>
          {Object.values(authors).map((a) => (
            <div key={a.authorId} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Avatar size={22} style={{ background: a.authorColor, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                {a.authorInitials}
              </Avatar>
              <span style={{ fontSize: 11, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.authorName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat header */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}># general</div>
          <div style={{ fontSize: 12, color: '#888' }}>Canal del equipo de evento</div>
          <div style={{ flex: 1 }} />
          {showSearch ? (
            <Input
              size="small" prefix={<SearchOutlined />}
              placeholder="Buscar mensajes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => { if (!search) setShowSearch(false) }}
              autoFocus
              style={{ width: 200 }}
              allowClear
              onClear={() => { setSearch(''); setShowSearch(false) }}
            />
          ) : (
            <Tooltip title="Buscar">
              <Button type="text" size="small" icon={<SearchOutlined />} onClick={() => setShowSearch(true)} />
            </Tooltip>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
          {withDays.map((item, i) => {
            if ('_day' in item) return <DaySeparator key={`day-${i}`} date={item._day} />
            const m = item as Mensaje
            return (
              <MessageBubble
                key={m.id}
                msg={m}
                isMine={m.authorId === myId}
                onReact={handleReact}
                onReply={handleReply}
                onDelete={handleDelete}
              />
            )
          })}
          {displayed.length === 0 && search && (
            <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 13 }}>
              No se encontraron mensajes para "{search}"
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply preview */}
        {replyTo && (
          <div style={{
            background: '#F5F3FF', borderTop: '1px solid #DDD6FE',
            padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED' }}>
                ↩ Respondiendo a {replyTo.authorName}
              </div>
              <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {replyTo.text}
              </div>
            </div>
            <Button size="small" type="text" onClick={() => setReplyTo(null)}>✕</Button>
          </div>
        )}

        {/* Input */}
        <div style={{
          background: '#fff', borderTop: '1px solid #E5E7EB',
          padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
        }}>
          <Avatar size={30} style={{ background: colorFor(myId), fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Avatar>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input.TextArea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
              autoSize={{ minRows: 1, maxRows: 5 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              style={{ borderRadius: 10, paddingRight: 36, fontSize: 13 }}
            />
          </div>
          <Tooltip title="Adjuntar archivo">
            <Upload
              showUploadList={false}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/')
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const newMsg: Mensaje = {
                    id: `msg-${Date.now()}`,
                    text: file.name,
                    authorId: myId,
                    authorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Yo',
                    authorInitials: `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'YO',
                    authorColor: colorFor(myId),
                    timestamp: new Date().toISOString(),
                    type: isImage ? 'image' : 'file',
                    fileUrl: ev.target?.result as string,
                    fileName: file.name,
                  }
                  const updated = [...msgs, newMsg]
                  setMsgs(updated)
                  saveMsgs(id!, updated)
                }
                reader.readAsDataURL(file)
                return false
              }}
            >
              <Button type="text" icon={<PaperClipOutlined />} style={{ color: '#888' }} />
            </Upload>
          </Tooltip>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={send}
            disabled={!text.trim()}
            style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}
          />
        </div>
      </div>
    </div>
  )
}
