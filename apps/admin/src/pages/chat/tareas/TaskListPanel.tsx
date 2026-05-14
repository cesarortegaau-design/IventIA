import { Avatar, Tag } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import { T } from '../../../styles/tokens'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_BAR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#3b82f6',
  LOW:      '#94a3b8',
}

const STATUS_DOT: Record<string, string> = {
  PENDING:     '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  ON_HOLD:     '#f59e0b',
  DONE:        '#10b981',
  CANCELLED:   '#ef4444',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En Progreso',
  ON_HOLD:     'En Espera',
  DONE:        'Completada',
  CANCELLED:   'Cancelada',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(user: any) {
  if (!user) return '?'
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
}

function getDueInfo(endDate: string | null | undefined) {
  if (!endDate) return null
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 864e5)
  if (days < 0)   return { label: `${Math.abs(days)}d vencida`, color: '#ef4444', bg: '#fef2f2' }
  if (days === 0) return { label: 'Vence hoy',                  color: '#f97316', bg: '#fff7ed' }
  if (days === 1) return { label: 'Mañana',                     color: '#f59e0b', bg: '#fffbeb' }
  if (days <= 7)  return { label: `${days} días`,               color: T.textMuted, bg: '#f1f5f9' }
  return {
    label: new Date(endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    color: T.textDim,
    bg: 'transparent',
  }
}

function isAssignedToMe(task: any, userId: string) {
  if (task.assignedTo?.id === userId) return true
  if (task.assignees?.some((a: any) => a.userId === userId || a.user?.id === userId)) return true
  return false
}

// ── Single task card ──────────────────────────────────────────────────────────

function TaskCard({
  task,
  isSelected,
  isMine,
  onSelect,
}: {
  task: any
  isSelected: boolean
  isMine: boolean
  onSelect: () => void
}) {
  const isDone      = task.status === 'DONE'
  const isCancelled = task.status === 'CANCELLED'
  const finished    = isDone || isCancelled

  const barColor   = finished ? '#e5e9f0' : (PRIORITY_BAR[task.priority] ?? '#94a3b8')
  const dotColor   = STATUS_DOT[task.status]  ?? T.textDim
  const statusText = STATUS_LABEL[task.status] ?? task.status
  const dueInfo    = getDueInfo(task.endDate)

  // Collect all assignees deduped
  const seen = new Set<string>()
  const assignees: any[] = []
  if (task.assignedTo) { seen.add(task.assignedTo.id); assignees.push(task.assignedTo) }
  ;(task.assignees ?? []).forEach((a: any) => {
    const u = a.user ?? a
    if (u?.id && !seen.has(u.id)) { seen.add(u.id); assignees.push(u) }
  })

  const depts = (task.departments ?? task.activityDepartments ?? []).slice(0, 2)
  const extraDepts = Math.max(0, (task.departments ?? task.activityDepartments ?? []).length - 2)
  const eventName = task.event?.name

  const bgBase    = isSelected ? '#e8f4ff' : isMine && !finished ? '#f6faff' : '#fff'
  const bgHover   = isSelected ? '#e8f4ff' : isMine && !finished ? '#eff5ff' : '#f8fafc'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      style={{
        position: 'relative',
        padding: '10px 14px 10px 12px',
        cursor: 'pointer',
        background: bgBase,
        borderLeft: `3px solid ${barColor}`,
        borderBottom: `1px solid ${T.border}`,
        transition: 'background 0.12s',
        opacity: finished ? 0.6 : 1,
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = bgHover }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = bgBase }}
    >
      {/* ── Row 1: title + status ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isMine && !finished && (
            <span style={{
              display: 'inline-block', verticalAlign: 'middle',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: '#fff', background: T.navy,
              borderRadius: 3, padding: '1px 5px', marginRight: 6,
            }}>
              Mía
            </span>
          )}
          <span style={{
            fontSize: 13,
            fontWeight: isMine && !finished ? 700 : 600,
            color: finished ? T.textDim : T.text,
            textDecoration: isDone ? 'line-through' : 'none',
            lineHeight: 1.35,
          }}>
            {task.title}
          </span>
        </div>

        {/* Status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>{statusText}</span>
        </div>
      </div>

      {/* ── Row 2: assignees + due date ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {assignees.length > 0 ? (
          <Avatar.Group
            maxCount={3}
            size={20}
            maxStyle={{ fontSize: 9, width: 20, height: 20, lineHeight: '20px', background: '#94a3b8' }}
          >
            {assignees.map((u) => (
              <Avatar key={u.id} size={20} style={{ background: T.blue, fontSize: 9, fontWeight: 600 }}>
                {getInitials(u)}
              </Avatar>
            ))}
          </Avatar.Group>
        ) : (
          <span style={{ fontSize: 11, color: T.textDim, fontStyle: 'italic' }}>Sin asignar</span>
        )}

        {dueInfo && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: dueInfo.color,
            background: dueInfo.bg,
            padding: '2px 6px', borderRadius: 4,
            border: dueInfo.bg !== 'transparent' ? `1px solid ${dueInfo.color}33` : 'none',
            whiteSpace: 'nowrap',
          }}>
            {dueInfo.label}
          </span>
        )}
      </div>

      {/* ── Row 3: context tags ── */}
      {(eventName || depts.length > 0) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {eventName && (
            <Tag
              icon={<CalendarOutlined />}
              color={task._type === 'event_activity' ? 'geekblue' : 'default'}
              style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px', margin: 0 }}
            >
              {eventName.length > 20 ? eventName.slice(0, 20) + '…' : eventName}
            </Tag>
          )}
          {depts.map((d: any) => (
            <Tag
              key={d.departmentId}
              style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px', margin: 0, color: T.textMuted }}
            >
              {d.department?.name}
            </Tag>
          ))}
          {extraDepts > 0 && (
            <span style={{ fontSize: 10, color: T.textDim, alignSelf: 'center' }}>+{extraDepts}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent }: { label: string; count: number; accent?: string }) {
  return (
    <div style={{
      padding: '7px 14px 5px',
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#f8fafc',
      borderBottom: `1px solid ${T.border}`,
      position: 'sticky', top: 0, zIndex: 1,
    }}>
      {accent && (
        <span style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: accent ?? T.textDim,
        background: accent ? `${accent}15` : '#e5e9f0',
        borderRadius: 10, padding: '0 7px', lineHeight: '18px',
      }}>
        {count}
      </span>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TaskListPanel({
  tasks,
  selectedTaskId,
  onSelectTask,
  currentUserId,
  viewFilter,
}: {
  tasks: any[]
  selectedTaskId: string | null
  onSelectTask: (id: string) => void
  currentUserId: string
  viewFilter: 'all' | 'mine' | 'urgent'
}) {
  // Split into groups only in 'all' view
  const isUrgent = (t: any) => {
    if (t.status === 'DONE' || t.status === 'CANCELLED') return false
    if (!t.endDate) return false
    const days = Math.ceil((new Date(t.endDate).getTime() - Date.now()) / 864e5)
    return days <= 1
  }

  if (viewFilter === 'all') {
    const mine = tasks.filter((t) => isAssignedToMe(t, currentUserId) && t.status !== 'DONE' && t.status !== 'CANCELLED')
    const mineUrgent = mine.filter(isUrgent)
    const mineRest = mine.filter((t) => !isUrgent(t))
    const others = tasks.filter((t) => !isAssignedToMe(t, currentUserId) || t.status === 'DONE' || t.status === 'CANCELLED')
    const done = tasks.filter((t) => t.status === 'DONE' || t.status === 'CANCELLED')
    const active = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && !isAssignedToMe(t, currentUserId))

    return (
      <div>
        {/* Urgentes mías */}
        {mineUrgent.length > 0 && (
          <>
            <SectionHeader label="Urgentes — Mías" count={mineUrgent.length} accent="#ef4444" />
            {mineUrgent.map((t) => (
              <TaskCard key={t.id} task={t} isSelected={selectedTaskId === t.id} isMine onSelect={() => onSelectTask(t.id)} />
            ))}
          </>
        )}

        {/* Mis tareas activas */}
        {mineRest.length > 0 && (
          <>
            <SectionHeader label="Mis Tareas" count={mineRest.length} accent={T.navy} />
            {mineRest.map((t) => (
              <TaskCard key={t.id} task={t} isSelected={selectedTaskId === t.id} isMine onSelect={() => onSelectTask(t.id)} />
            ))}
          </>
        )}

        {/* Tareas del equipo */}
        {active.length > 0 && (
          <>
            <SectionHeader label="Equipo" count={active.length} />
            {active.map((t) => (
              <TaskCard key={t.id} task={t} isSelected={selectedTaskId === t.id} isMine={false} onSelect={() => onSelectTask(t.id)} />
            ))}
          </>
        )}

        {/* Completadas / Canceladas */}
        {done.length > 0 && (
          <>
            <SectionHeader label="Completadas" count={done.length} />
            {done.map((t) => (
              <TaskCard key={t.id} task={t} isSelected={selectedTaskId === t.id} isMine={isAssignedToMe(t, currentUserId)} onSelect={() => onSelectTask(t.id)} />
            ))}
          </>
        )}

        {tasks.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: T.textDim, fontSize: 13 }}>
            Sin tareas
          </div>
        )}
      </div>
    )
  }

  // 'mine' or 'urgent' — flat list with single section header
  const sectionLabel = viewFilter === 'mine' ? 'Mis Tareas' : 'Urgentes'
  const accent = viewFilter === 'urgent' ? '#ef4444' : T.navy

  return (
    <div>
      {tasks.length > 0 && (
        <SectionHeader label={sectionLabel} count={tasks.length} accent={accent} />
      )}
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          isSelected={selectedTaskId === t.id}
          isMine={isAssignedToMe(t, currentUserId)}
          onSelect={() => onSelectTask(t.id)}
        />
      ))}
      {tasks.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: T.textDim, fontSize: 13 }}>
          {viewFilter === 'mine' ? 'No tienes tareas asignadas' : 'Sin tareas urgentes'}
        </div>
      )}
    </div>
  )
}
