/**
 * TareasPage.tsx
 * Tareas del evento — Kanban / Lista — persiste en localStorage por evento
 * Panel lateral derecho para edición (estilo HSODAK)
 */
import { useState, useMemo, useRef } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import {
  Button, Modal, Form, Input, Select, DatePicker, App, Typography, Space, Popconfirm, Tooltip,
} from 'antd'
import {
  PlusOutlined, CalendarOutlined, DeleteOutlined, CloseOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import 'dayjs/locale/es'
dayjs.extend(relativeTime)
dayjs.extend(isSameOrBefore)
dayjs.locale('es')

const { Text } = Typography

// ── Types ─────────────────────────────────────────────────────────────────────
type TaskStatus = 'POR_HACER' | 'EN_CURSO' | 'ESPERANDO_OK' | 'LISTA'
type ViewMode   = 'kanban' | 'lista'

interface Task {
  id: string
  code: string
  title: string
  category: string
  dueDate?: string
  assignee: string
  status: TaskStatus
  notes?: string
}

interface TasksStore {
  tasks: Task[]
  counter: number
  updatedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'POR_HACER',    label: 'Por hacer',    color: '#F59E0B' },
  { key: 'EN_CURSO',     label: 'En curso',     color: '#6366F1' },
  { key: 'ESPERANDO_OK', label: 'Esperando OK', color: '#F97316' },
  { key: 'LISTA',        label: 'Listas',       color: '#10B981' },
]

const CATEGORIES = [
  'Catering', 'Producción', 'Logística', 'Diseño', 'Cliente',
  'Legal', 'Pagos', 'Foto', 'Decoración', 'AV / Técnico', 'General',
]

const CAT_COLORS: Record<string, string> = {
  'Catering':    '#F97316',
  'Producción':  '#6366F1',
  'Logística':   '#0D9488',
  'Diseño':      '#EC4899',
  'Cliente':     '#7C3AED',
  'Legal':       '#DC2626',
  'Pagos':       '#059669',
  'Foto':        '#D97706',
  'Decoración':  '#DB2777',
  'AV / Técnico':'#0369A1',
  'General':     '#6B7280',
}

const AVATAR_COLORS = [
  '#7C3AED','#EC4899','#0D9488','#F97316','#6366F1',
  '#059669','#DC2626','#D97706','#0369A1','#9333EA',
]

function avatarColor(initials: string): string {
  let hash = 0
  for (const c of initials) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ── Persistence ───────────────────────────────────────────────────────────────
function storeKey(id: string) { return `iventia-tareas-${id}` }

function loadStore(id: string): TasksStore {
  try {
    const raw = localStorage.getItem(storeKey(id))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { tasks: [], counter: 0, updatedAt: '' }
}

function saveStore(id: string, store: TasksStore) {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify({
      ...store, updatedAt: new Date().toISOString(),
    }))
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = dayjs().startOf('day')

function daysOverdue(dueDate?: string): number | null {
  if (!dueDate) return null
  const diff = today.diff(dayjs(dueDate).startOf('day'), 'day')
  return diff > 0 ? diff : null
}

function fmtDate(dueDate?: string): string {
  if (!dueDate) return ''
  return dayjs(dueDate).format('DD-MMM').toLowerCase()
}

// ── Draft type ────────────────────────────────────────────────────────────────
interface TaskDraft {
  title: string
  category: string
  status: TaskStatus
  dueDate: string
  assignee: string
  notes: string
}

function taskToDraft(t: Task): TaskDraft {
  return {
    title:    t.title,
    category: t.category,
    status:   t.status,
    dueDate:  t.dueDate ?? '',
    assignee: t.assignee,
    notes:    t.notes ?? '',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TareasPage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  const [store, setStore] = useState<TasksStore>(() => loadStore(eventId))
  const [view, setView]   = useState<ViewMode>('kanban')
  const [myTasks, setMyTasks] = useState(false)
  const [myInitials] = useState('YO')

  // Right panel (edit)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [dirty, setDirty] = useState(false)

  // Create modal (new task only)
  const [createModal, setCreateModal] = useState<{ open: boolean; defaultStatus?: TaskStatus }>({ open: false })
  const [form] = Form.useForm()

  // Drag
  const dragId = useRef<string | null>(null)

  const update = (next: Partial<TasksStore>) => {
    const merged = { ...store, ...next }
    setStore(merged)
    saveStore(eventId, merged)
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total     = store.tasks.length
    const completed = store.tasks.filter(t => t.status === 'LISTA').length
    const vencidas  = store.tasks.filter(t => t.status !== 'LISTA' && daysOverdue(t.dueDate) !== null).length
    return { total, completed, vencidas }
  }, [store.tasks])

  const filtered = useMemo(() =>
    myTasks ? store.tasks.filter(t => t.assignee === myInitials) : store.tasks,
  [store.tasks, myTasks, myInitials])

  // ── Open edit panel ────────────────────────────────────────────────────────
  const openPanel = (task: Task) => {
    setSelectedTask(task)
    setDraft(taskToDraft(task))
    setDirty(false)
  }

  const closePanel = () => {
    setSelectedTask(null)
    setDraft(null)
    setDirty(false)
  }

  const patchDraft = (patch: Partial<TaskDraft>) => {
    setDraft(d => d ? { ...d, ...patch } : d)
    setDirty(true)
  }

  // ── Save from panel ────────────────────────────────────────────────────────
  const handleSavePanel = () => {
    if (!selectedTask || !draft) return
    update({
      tasks: store.tasks.map(t =>
        t.id === selectedTask.id
          ? { ...t, ...draft, dueDate: draft.dueDate || undefined }
          : t
      ),
    })
    setDirty(false)
    message.success('Tarea actualizada')
  }

  // ── Delete from panel ──────────────────────────────────────────────────────
  const handleDeletePanel = () => {
    if (!selectedTask) return
    update({ tasks: store.tasks.filter(t => t.id !== selectedTask.id) })
    closePanel()
    message.success('Tarea eliminada')
  }

  // ── Create new task ────────────────────────────────────────────────────────
  const openNew = (defaultStatus: TaskStatus = 'POR_HACER') => {
    form.resetFields()
    form.setFieldsValue({ status: defaultStatus, category: 'General', assignee: '' })
    setCreateModal({ open: true, defaultStatus })
  }

  const saveNewTask = (vals: any) => {
    const dueDateStr = vals.dueDate ? vals.dueDate.format('YYYY-MM-DD') : undefined
    const next = store.counter + 1
    const colIdx = COLUMNS.findIndex(c => c.key === (vals.status || 'POR_HACER'))
    const prefix = colIdx >= 0
      ? String((colIdx + 1) * 100 + store.tasks.filter(t => t.status === vals.status).length + 1)
      : String(next)
    update({
      counter: next,
      tasks: [...store.tasks, {
        id:       `task-${Date.now()}`,
        code:     `T-${prefix}`,
        title:    vals.title,
        category: vals.category || 'General',
        dueDate:  dueDateStr,
        assignee: vals.assignee || '',
        status:   vals.status || 'POR_HACER',
        notes:    vals.notes,
      }],
    })
    message.success('Tarea agregada')
    setCreateModal({ open: false })
  }

  const moveTask = (id: string, status: TaskStatus) => {
    update({ tasks: store.tasks.map(t => t.id === id ? { ...t, status } : t) })
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, status } : prev)
      setDraft(d => d ? { ...d, status } : d)
    }
  }

  // ── Drag ───────────────────────────────────────────────────────────────────
  const onDragStart = (id: string) => { dragId.current = id }
  const onDrop = (status: TaskStatus) => {
    if (dragId.current) { moveTask(dragId.current, status); dragId.current = null }
  }

  // ── Task Card ──────────────────────────────────────────────────────────────
  const TaskCard = ({ task }: { task: Task }) => {
    const overdue  = task.status !== 'LISTA' ? daysOverdue(task.dueDate) : null
    const catColor = CAT_COLORS[task.category] ?? '#6B7280'
    const isActive = selectedTask?.id === task.id

    return (
      <div
        draggable
        onDragStart={() => onDragStart(task.id)}
        onClick={() => openPanel(task)}
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 8,
          boxShadow: isActive
            ? '0 0 0 2px #7C3AED, 0 3px 10px rgba(124,58,237,0.15)'
            : '0 1px 4px rgba(0,0,0,0.07)',
          border: isActive ? '1px solid #7C3AED' : '1px solid #F0EBFF',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(124,58,237,0.12)'
        }}
        onMouseLeave={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'
        }}
      >
        {/* Top: category + code */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: catColor, display: 'inline-block' }} />
            <Text style={{ fontSize: 11, color: catColor, fontWeight: 600 }}>{task.category}</Text>
          </span>
          <Text style={{ fontSize: 10, color: '#bbb', fontWeight: 500 }}>{task.code}</Text>
        </div>

        {/* Title */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.35, marginBottom: 10 }}>
          {task.title}
        </div>

        {/* Bottom: date + overdue + move + assignee */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {task.dueDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#aaa' }}>
                <CalendarOutlined style={{ fontSize: 11 }} />
                {fmtDate(task.dueDate)}
              </span>
            )}
            {overdue !== null && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: 6 }}>
                {overdue}d tarde
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tooltip title="Mover a..." placement="top">
              <Select
                size="small"
                value={task.status}
                onChange={(v) => { moveTask(task.id, v as TaskStatus) }}
                onClick={e => e.stopPropagation()}
                variant="borderless"
                style={{ width: 26, minWidth: 0, opacity: 0.4 }}
                suffixIcon={null}
                dropdownStyle={{ minWidth: 140 }}
              >
                {COLUMNS.map(c => (
                  <Select.Option key={c.key} value={c.key}>
                    <span style={{ color: c.color, fontWeight: 600, fontSize: 12 }}>● {c.label}</span>
                  </Select.Option>
                ))}
              </Select>
            </Tooltip>
            {task.assignee && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: avatarColor(task.assignee),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {task.assignee.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Kanban ─────────────────────────────────────────────────────────────────
  const KanbanView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'start' }}>
      {COLUMNS.map(col => {
        const colTasks = filtered.filter(t => t.status === col.key)
        const [dropping, setDropping] = useState(false)
        return (
          <div
            key={col.key}
            onDragOver={e => { e.preventDefault(); setDropping(true) }}
            onDragLeave={() => setDropping(false)}
            onDrop={() => { onDrop(col.key); setDropping(false) }}
            style={{
              background: dropping ? '#F5F3FF' : '#F8F7FF',
              borderRadius: 12, padding: '12px 10px',
              border: dropping ? '2px dashed #7C3AED' : '2px solid transparent',
              transition: 'all 0.15s', minHeight: 200,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                <Text style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{col.label}</Text>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: col.color,
                  background: `${col.color}18`, padding: '1px 7px', borderRadius: 20,
                }}>{colTasks.length}</span>
              </div>
              <Button type="text" size="small"
                onClick={() => openNew(col.key)}
                style={{ color: '#bbb', fontWeight: 700, height: 22, padding: '0 4px', fontSize: 16, lineHeight: 1 }}>
                +
              </Button>
            </div>
            {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
            <button
              onClick={() => openNew(col.key)}
              style={{
                width: '100%', marginTop: 4,
                border: '1px dashed #DDD6FE', borderRadius: 8,
                background: 'transparent', cursor: 'pointer',
                padding: '8px 0', color: '#bbb', fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = col.color; (e.currentTarget as HTMLElement).style.color = col.color }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#DDD6FE'; (e.currentTarget as HTMLElement).style.color = '#bbb' }}
            >
              <PlusOutlined style={{ fontSize: 11 }} /> Agregar tarea
            </button>
          </div>
        )
      })}
    </div>
  )

  // ── Lista ──────────────────────────────────────────────────────────────────
  const ListView = () => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 100px 110px 110px',
        padding: '8px 18px', background: '#FAFAFA', borderBottom: '1px solid #F0EBFF',
      }}>
        {['TAREA', 'CATEGORÍA', 'FECHA', 'ASIGNADO', 'ESTADO'].map((h, i) => (
          <div key={i} style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em' }}>{h}</div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#bbb' }}>Sin tareas registradas</div>
      )}
      {filtered.map(task => {
        const overdue  = task.status !== 'LISTA' ? daysOverdue(task.dueDate) : null
        const catColor = CAT_COLORS[task.category] ?? '#6B7280'
        const col      = COLUMNS.find(c => c.key === task.status)
        const isActive = selectedTask?.id === task.id
        return (
          <div
            key={task.id}
            onClick={() => openPanel(task)}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 100px 110px 110px',
              padding: '10px 18px', borderBottom: '1px solid #FAF8FF',
              alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s',
              background: isActive ? '#F5F3FF' : '',
              borderLeft: isActive ? '3px solid #7C3AED' : '3px solid transparent',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#FAF8FF' }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
          >
            <div>
              <Text style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{task.title}</Text>
              <Text style={{ fontSize: 10, color: '#bbb', display: 'block' }}>{task.code}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: catColor, display: 'inline-block' }} />
              <Text style={{ fontSize: 12, color: catColor, fontWeight: 600 }}>{task.category}</Text>
            </div>
            <div>
              {task.dueDate && (
                <span style={{ fontSize: 12, color: overdue ? '#DC2626' : '#555' }}>
                  {fmtDate(task.dueDate)}
                  {overdue !== null && <span style={{ fontSize: 10, color: '#DC2626', marginLeft: 4 }}>{overdue}d tarde</span>}
                </span>
              )}
            </div>
            <div>
              {task.assignee && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: avatarColor(task.assignee),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#fff',
                  }}>{task.assignee.slice(0, 2).toUpperCase()}</div>
                  <Text style={{ fontSize: 12, color: '#555' }}>{task.assignee}</Text>
                </div>
              )}
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: `${col?.color ?? '#6B7280'}18`, color: col?.color ?? '#6B7280',
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: col?.color ?? '#6B7280', display: 'inline-block' }} />
              {col?.label}
            </span>
          </div>
        )
      })}
    </div>
  )

  // ── Right edit panel ───────────────────────────────────────────────────────
  const EditPanel = () => {
    if (!selectedTask || !draft) return null
    const catColor = CAT_COLORS[draft.category] ?? '#6B7280'

    return (
      <div style={{
        width: 300, flexShrink: 0,
        background: '#fff', borderLeft: '1px solid #EDE9FE',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid #EDE9FE',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 3 }}>
              EDITAR TAREA
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>{selectedTask.code}</div>
          </div>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel} style={{ flexShrink: 0, color: '#9CA3AF' }} />
        </div>

        {/* Scrollable fields */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>

          {/* Descripción */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 10 }}>
            DESCRIPCIÓN
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Tarea</div>
            <Input.TextArea
              rows={3}
              value={draft.title}
              onChange={e => patchDraft({ title: e.target.value })}
              style={{ borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Notas</div>
            <Input.TextArea
              rows={2}
              value={draft.notes}
              onChange={e => patchDraft({ notes: e.target.value })}
              placeholder="Observaciones..."
              style={{ borderRadius: 8, fontSize: 13 }}
            />
          </div>

          {/* Organización */}
          <div style={{ height: 1, background: '#F0EBFF', margin: '4px 0 14px' }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 10 }}>
            ORGANIZACIÓN
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Estado</div>
            <Select
              value={draft.status}
              style={{ width: '100%' }}
              onChange={v => patchDraft({ status: v as TaskStatus })}
            >
              {COLUMNS.map(c => (
                <Select.Option key={c.key} value={c.key}>
                  <span style={{ color: c.color, fontWeight: 600 }}>● {c.label}</span>
                </Select.Option>
              ))}
            </Select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Categoría</div>
            <Select
              value={draft.category}
              style={{ width: '100%' }}
              onChange={v => patchDraft({ category: v })}
            >
              {CATEGORIES.map(c => (
                <Select.Option key={c} value={c}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[c] ?? '#6B7280', display: 'inline-block' }} />
                    {c}
                  </span>
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Fechas y responsable */}
          <div style={{ height: 1, background: '#F0EBFF', margin: '4px 0 14px' }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 10 }}>
            FECHAS Y RESPONSABLE
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Fecha límite</div>
            <DatePicker
              style={{ width: '100%', borderRadius: 8 }}
              format="DD/MM/YYYY"
              value={draft.dueDate ? dayjs(draft.dueDate) : null}
              onChange={v => patchDraft({ dueDate: v ? v.format('YYYY-MM-DD') : '' })}
              placeholder="Sin fecha"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Asignado (iniciales)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {draft.assignee && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: avatarColor(draft.assignee),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {draft.assignee.slice(0, 2).toUpperCase()}
                </div>
              )}
              <Input
                value={draft.assignee}
                onChange={e => patchDraft({ assignee: e.target.value.toUpperCase() })}
                placeholder="MR, JC, PL..."
                maxLength={4}
                style={{ borderRadius: 8, textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* Category indicator */}
          <div style={{ height: 1, background: '#F0EBFF', margin: '4px 0 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${catColor}10`, borderRadius: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: catColor, display: 'inline-block', flexShrink: 0 }} />
            <Text style={{ fontSize: 12, color: catColor, fontWeight: 600 }}>{draft.category}</Text>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid #EDE9FE', flexShrink: 0 }}>
          <Button
            type="primary"
            block
            disabled={!dirty}
            onClick={handleSavePanel}
            style={{
              background: dirty ? '#059669' : undefined,
              borderColor: dirty ? '#059669' : undefined,
              height: 40, fontWeight: 600, borderRadius: 8, marginBottom: 8,
              transition: 'all 0.2s',
            }}
          >
            {dirty ? 'Guardar cambios' : 'Sin cambios'}
          </Button>
          <Popconfirm title="¿Eliminar esta tarea?" onConfirm={handleDeletePanel} okButtonProps={{ danger: true }} okText="Eliminar">
            <Button danger block size="small" style={{ borderRadius: 6 }}>
              Eliminar tarea
            </Button>
          </Popconfirm>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7FF' }}>

      {/* ── Header ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EDE9FE',
        padding: '16px 28px', flexShrink: 0,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Text style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>Tareas y pendientes</Text>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
              <span>{stats.total} tareas</span>
              <span style={{ margin: '0 6px', color: '#ddd' }}>·</span>
              <span style={{ color: '#059669' }}>{stats.completed} completadas</span>
              <span style={{ margin: '0 6px', color: '#ddd' }}>·</span>
              <span style={{ color: stats.vencidas > 0 ? '#DC2626' : '#aaa' }}>{stats.vencidas} vencidas</span>
            </div>
          </div>
          <Space>
            <div style={{ display: 'flex', border: '1px solid #EDE9FE', borderRadius: 8, overflow: 'hidden' }}>
              {(['kanban', 'lista'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: view === v ? '#7C3AED' : '#fff',
                  color: view === v ? '#fff' : '#555',
                  transition: 'all 0.15s',
                }}>
                  {v === 'kanban' ? 'Kanban' : 'Lista'}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setMyTasks(!myTasks)}
              style={{
                borderColor: myTasks ? '#7C3AED' : '#EDE9FE',
                color: myTasks ? '#7C3AED' : '#555',
                background: myTasks ? '#F5F3FF' : '#fff',
                fontWeight: 600,
              }}
            >
              Mis tareas
            </Button>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={() => openNew()}
              style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, fontWeight: 600 }}
            >
              Nueva tarea
            </Button>
          </Space>
        </div>
      </div>

      {/* ── Body: list + right panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
          {store.tasks.length === 0 && (
            <div style={{
              background: '#fff', borderRadius: 16, border: '2px dashed #DDD6FE',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '64px 20px', gap: 12,
            }}>
              <span style={{ fontSize: 48 }}>✅</span>
              <Text strong style={{ fontSize: 16, color: '#555' }}>Sin tareas registradas</Text>
              <Text style={{ color: '#888', fontSize: 13 }}>Agrega tareas para dar seguimiento al evento</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openNew()}
                style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, marginTop: 8 }}>
                Nueva tarea
              </Button>
            </div>
          )}
          {store.tasks.length > 0 && (view === 'kanban' ? <KanbanView /> : <ListView />)}
        </div>

        {/* Right edit panel */}
        <EditPanel />
      </div>

      {/* ── Create modal ── */}
      <Modal
        title="Nueva tarea"
        open={createModal.open}
        onCancel={() => setCreateModal({ open: false })}
        onOk={() => form.submit()}
        okText="Crear tarea"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={saveNewTask}>
          <Form.Item name="title" label="Tarea" rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
            <Input placeholder="Describe la tarea..." autoFocus />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="category" label="Categoría">
              <Select placeholder="Categoría">
                {CATEGORIES.map(c => (
                  <Select.Option key={c} value={c}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[c] ?? '#6B7280', display: 'inline-block' }} />
                      {c}
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="status" label="Estado">
              <Select>
                {COLUMNS.map(c => (
                  <Select.Option key={c.key} value={c.key}>
                    <span style={{ color: c.color, fontWeight: 600 }}>● {c.label}</span>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="dueDate" label="Fecha límite">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Seleccionar" />
            </Form.Item>
            <Form.Item name="assignee" label="Asignado (iniciales)">
              <Input placeholder="Ej: MR, JC, PL..." maxLength={4} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones adicionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
