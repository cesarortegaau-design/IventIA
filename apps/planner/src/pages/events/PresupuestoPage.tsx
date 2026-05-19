/**
 * PresupuestoPage.tsx
 * Presupuesto por capítulos — persiste en localStorage por evento
 * Diseño: capítulos colapsables, items con Proveedor/Cant/U/P.Unit/Total/Estado,
 * 4 KPIs (Total, Ejecutado, Comprometido, Disponible) y barra de avance apilada.
 */
import { useState, useMemo } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import {
  Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, App, Typography,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FileExcelOutlined, UploadOutlined, RobotOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
dayjs.extend(relativeTime)
dayjs.locale('es')

const { Text } = Typography

// ── Types ─────────────────────────────────────────────────────────────────────
interface BudgetChapter {
  id: string
  name: string
  color: string
  sortOrder: number
}

interface BudgetItem {
  id: string
  chapterId: string
  concept: string
  code: string
  provider: string
  quantity: number
  unit: string
  unitPrice: number
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED'
  notes?: string
}

interface BudgetStore {
  chapters: BudgetChapter[]
  items: BudgetItem[]
  updatedAt: string
}

// ── Persistence ───────────────────────────────────────────────────────────────
const CHAPTER_COLORS = [
  '#7C3AED', '#EC4899', '#F97316', '#0D9488',
  '#2563EB', '#D97706', '#DC2626', '#059669',
]

function storeKey(id: string) { return `iventia-presupuesto-${id}` }

function loadStore(id: string): BudgetStore {
  try {
    const raw = localStorage.getItem(storeKey(id))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { chapters: [], items: [], updatedAt: '' }
}

function saveStore(id: string, store: BudgetStore) {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify({
      ...store,
      updatedAt: new Date().toISOString(),
    }))
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const STATUS_CFG = {
  CONFIRMED: { label: 'Confirmado', color: '#059669', bg: '#ECFDF5', dot: '#059669' },
  PENDING:   { label: 'Pendiente',  color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  CANCELLED: { label: 'Cancelado',  color: '#6B7280', bg: '#F9FAFB', dot: '#9CA3AF' },
} as const

const UNITS = ['pax', 'pza', 'paq', 'global', 'día', 'hora', 'turno', 'm²', 'evento', 'km']

async function exportToExcel(
  store: BudgetStore,
  eventName: string,
) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Presupuesto')
  ws.columns = [
    { header: 'Capítulo',     key: 'chapter',   width: 26 },
    { header: 'Código',       key: 'code',       width: 10 },
    { header: 'Concepto',     key: 'concept',    width: 34 },
    { header: 'Proveedor',    key: 'provider',   width: 22 },
    { header: 'Cant.',        key: 'quantity',   width: 8  },
    { header: 'Unidad',       key: 'unit',       width: 8  },
    { header: 'P. Unit.',     key: 'unitPrice',  width: 14 },
    { header: 'Total',        key: 'total',      width: 14 },
    { header: 'Estado',       key: 'status',     width: 14 },
    { header: 'Notas',        key: 'notes',      width: 30 },
  ]
  ws.getRow(1).font = { bold: true }

  for (const item of store.items) {
    const ch = store.chapters.find(c => c.id === item.chapterId)
    ws.addRow({
      chapter: ch?.name ?? '',
      code:    item.code,
      concept: item.concept,
      provider: item.provider ?? '',
      quantity: item.quantity,
      unit:    item.unit,
      unitPrice: item.unitPrice,
      total:   item.quantity * item.unitPrice,
      status:  STATUS_CFG[item.status]?.label ?? item.status,
      notes:   item.notes ?? '',
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf]))
  const a = document.createElement('a')
  a.href = url
  a.download = `presupuesto-${eventName || 'evento'}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PresupuestoPage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  const [store, setStore] = useState<BudgetStore>(() => loadStore(eventId))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Modals
  const [chModal, setChModal] = useState(false)
  const [editCh, setEditCh] = useState<BudgetChapter | null>(null)
  const [itemModal, setItemModal] = useState<{
    open: boolean; chapterId: string; editing: BudgetItem | null
  }>({ open: false, chapterId: '', editing: null })

  const [chForm] = Form.useForm()
  const [itemForm] = Form.useForm()

  // Persist helper
  const update = (next: Partial<BudgetStore>) => {
    const merged = { ...store, ...next }
    setStore(merged)
    saveStore(eventId, merged)
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const all = store.items
    const total       = all.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const ejecutado   = all.filter(i => i.status === 'CONFIRMED').reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const comprometido = all.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const disponible  = Math.max(0, total - ejecutado - comprometido)
    return { total, ejecutado, comprometido, disponible }
  }, [store.items])

  const lastEdit = store.updatedAt
    ? dayjs(store.updatedAt).fromNow()
    : null

  // ── Chapter CRUD ─────────────────────────────────────────────────────────
  const openNewChapter = () => {
    setEditCh(null)
    chForm.resetFields()
    setChModal(true)
  }

  const openEditChapter = (ch: BudgetChapter) => {
    setEditCh(ch)
    chForm.setFieldsValue({ name: ch.name })
    setChModal(true)
  }

  const saveChapter = (vals: { name: string }) => {
    const chapters = editCh
      ? store.chapters.map(c => c.id === editCh.id ? { ...c, name: vals.name } : c)
      : [...store.chapters, {
          id: `ch-${Date.now()}`,
          name: vals.name,
          color: CHAPTER_COLORS[store.chapters.length % CHAPTER_COLORS.length],
          sortOrder: store.chapters.length,
        }]
    update({ chapters })
    setChModal(false)
  }

  const deleteChapter = (id: string) => {
    update({
      chapters: store.chapters.filter(c => c.id !== id),
      items:    store.items.filter(i => i.chapterId !== id),
    })
    message.success('Capítulo eliminado')
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────────
  const openNewItem = (chapterId: string) => {
    itemForm.resetFields()
    itemForm.setFieldsValue({ quantity: 1, unit: 'global', status: 'PENDING' })
    setItemModal({ open: true, chapterId, editing: null })
  }

  const openEditItem = (item: BudgetItem) => {
    itemForm.setFieldsValue({
      concept: item.concept, provider: item.provider,
      quantity: item.quantity, unit: item.unit,
      unitPrice: item.unitPrice, status: item.status, notes: item.notes,
    })
    setItemModal({ open: true, chapterId: item.chapterId, editing: item })
  }

  const saveItem = (vals: any) => {
    const { chapterId, editing } = itemModal
    if (editing) {
      update({
        items: store.items.map(i => i.id === editing.id ? { ...i, ...vals } : i),
      })
    } else {
      const chIdx = store.chapters.findIndex(c => c.id === chapterId)
      const chCount = store.items.filter(i => i.chapterId === chapterId).length
      const code = `C${chIdx + 1}-${chCount + 1}`
      update({
        items: [...store.items, {
          id: `item-${Date.now()}`,
          chapterId, code, ...vals,
        }],
      })
    }
    setItemModal({ open: false, chapterId: '', editing: null })
    message.success(editing ? 'Item actualizado' : 'Item agregado')
  }

  const deleteItem = (id: string) => {
    update({ items: store.items.filter(i => i.id !== id) })
    message.success('Item eliminado')
  }

  const toggleCollapse = (id: string) =>
    setCollapsed(c => ({ ...c, [id]: c[id] === false })) // default open = true → false closes

  const isOpen = (id: string) => collapsed[id] !== false

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#F8F7FF' }}>

      {/* ── Page header ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EDE9FE',
        padding: '16px 28px', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>Presupuesto</Text>
              {kpi.total > 0 && (
                <Text style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED' }}>
                  · {fmt(kpi.total)}
                </Text>
              )}
              <span style={{
                background: '#EDE9FE', color: '#7C3AED',
                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                borderRadius: 20, letterSpacing: '0.06em',
              }}>MXN</span>
            </div>
            <Text style={{ fontSize: 12, color: '#aaa' }}>
              {store.chapters.length} capítulos · {store.items.length} items
              {lastEdit && ` · última edición ${lastEdit}`}
            </Text>
          </div>

          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => message.info('Importación desde Excel — próximamente')}
            >
              Importar Excel
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => exportToExcel(store, event?.name || eventId)}
              disabled={store.items.length === 0}
            >
              Exportar Excel
            </Button>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={openNewChapter}
              style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, fontWeight: 600 }}
            >
              Nuevo capítulo
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'PRESUPUESTO TOTAL', value: kpi.total, sub: 'aprobado por cliente',
              color: '#7C3AED', border: '#C4B5FD' },
            { label: 'EJECUTADO', value: kpi.ejecutado,
              sub: kpi.total ? `${Math.round(kpi.ejecutado / kpi.total * 100)}% del total` : '0% del total',
              color: '#059669', border: '#6EE7B7' },
            { label: 'COMPROMETIDO', value: kpi.comprometido,
              sub: kpi.total ? `${Math.round(kpi.comprometido / kpi.total * 100)}% · OC abiertas` : '0% · OC abiertas',
              color: '#D97706', border: '#FCD34D' },
            { label: 'DISPONIBLE', value: Math.max(0, kpi.total - kpi.ejecutado - kpi.comprometido),
              sub: kpi.total ? `${Math.round(Math.max(0, kpi.total - kpi.ejecutado - kpi.comprometido) / kpi.total * 100)}% · margen libre` : '0%',
              color: '#DC2626', border: '#FCA5A5' },
          ].map(card => (
            <div key={card.label} style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              border: `1px solid ${card.border}22`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: '0.14em', marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: card.color, lineHeight: 1.05 }}>
                {fmt(card.value)}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Stacked progress bar ── */}
        {kpi.total > 0 && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: '14px 20px',
            marginBottom: 18, border: '1px solid #EDE9FE',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                Avance global de presupuesto
              </Text>
              <Space size={16}>
                {[
                  { label: 'Ejecutado',    color: '#059669' },
                  { label: 'Comprometido', color: '#F59E0B' },
                  { label: 'Disponible',   color: '#E5E7EB' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                    <Text style={{ fontSize: 11, color: '#666' }}>{l.label}</Text>
                  </div>
                ))}
              </Space>
            </div>
            <div style={{
              height: 12, borderRadius: 6, background: '#F3F4F6',
              overflow: 'hidden', display: 'flex',
            }}>
              <div style={{
                width: `${Math.min(100, kpi.ejecutado / kpi.total * 100)}%`,
                background: 'linear-gradient(90deg, #059669, #34D399)',
                transition: 'width 0.5s',
              }} />
              <div style={{
                width: `${Math.min(100 - kpi.ejecutado / kpi.total * 100, kpi.comprometido / kpi.total * 100)}%`,
                background: 'linear-gradient(90deg, #F59E0B, #FCD34D)',
                transition: 'width 0.5s',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: '#aaa' }}>$0</Text>
              <Text style={{ fontSize: 10, color: '#aaa' }}>{fmt(kpi.total)}</Text>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {store.chapters.length === 0 && (
          <div style={{
            background: '#fff', borderRadius: 16, border: '2px dashed #DDD6FE',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '64px 20px', gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>💰</span>
            <Text strong style={{ fontSize: 16, color: '#555' }}>Sin capítulos presupuestales</Text>
            <Text style={{ color: '#888', fontSize: 13 }}>
              Crea tu primer capítulo para detallar el presupuesto del evento
            </Text>
            <Button
              type="primary" icon={<PlusOutlined />} onClick={openNewChapter}
              style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, marginTop: 8 }}
            >
              Nuevo capítulo
            </Button>
          </div>
        )}

        {/* ── Chapter list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {store.chapters.map((ch, chIdx) => {
            const chItems = store.items.filter(i => i.chapterId === ch.id)
            const planeado = chItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
            const real     = chItems.filter(i => i.status === 'CONFIRMED').reduce((s, i) => s + i.quantity * i.unitPrice, 0)
            const variance = real - planeado
            const open     = isOpen(ch.id)

            return (
              <div key={ch.id} style={{
                background: '#fff', borderRadius: 14,
                border: '1px solid #EDE9FE',
                boxShadow: '0 1px 4px rgba(124,58,237,0.05)',
                overflow: 'hidden',
              }}>
                {/* Chapter header row */}
                <div
                  onClick={() => toggleCollapse(ch.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 18px', cursor: 'pointer',
                    borderLeft: `4px solid ${ch.color}`,
                    background: open ? '#FAFAFA' : '#fff',
                    transition: 'background 0.15s',
                    userSelect: 'none',
                  }}
                >
                  {/* Left: toggle + name + count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      color: ch.color, fontSize: 11,
                      display: 'inline-block',
                      transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s',
                    }}>▼</span>
                    <Text strong style={{ fontSize: 14, color: '#1a1a1a' }}>{ch.name}</Text>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{chItems.length} items</span>
                  </div>

                  {/* Right: planeado / real / variance / actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Text style={{ fontSize: 12, color: '#888' }}>
                      Planeado <strong style={{ color: '#1a1a1a' }}>{fmt(planeado)}</strong>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#888' }}>
                      Real <strong style={{ color: ch.color }}>{fmt(real)}</strong>
                    </Text>
                    {planeado > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                        background: variance <= 0 ? '#ECFDF5' : '#FEF2F2',
                        color:      variance <= 0 ? '#059669' : '#DC2626',
                      }}>
                        {variance > 0 ? '+' : ''}{fmt(variance)}
                      </span>
                    )}
                    <Space onClick={e => e.stopPropagation()} size={4}>
                      <Button size="small" type="text" icon={<EditOutlined />}
                        onClick={() => openEditChapter(ch)}
                        style={{ color: '#888', height: 26 }} />
                      <Popconfirm
                        title={`¿Eliminar capítulo "${ch.name}" y sus ${chItems.length} items?`}
                        onConfirm={() => deleteChapter(ch.id)}
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" type="text" icon={<DeleteOutlined />}
                          style={{ color: '#DC2626', height: 26 }} />
                      </Popconfirm>
                    </Space>
                  </div>
                </div>

                {/* Chapter body */}
                {open && (
                  <div>
                    {/* Table header */}
                    {chItems.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 70px 60px 110px 110px 130px 72px',
                        padding: '6px 18px',
                        background: '#FAFAFA',
                        borderTop: '1px solid #F0EBFF',
                        borderBottom: '1px solid #F0EBFF',
                      }}>
                        {['CONCEPTO', 'PROVEEDOR', 'CANT.', 'U.', 'P. UNIT.', 'TOTAL', 'ESTADO', ''].map((h, i) => (
                          <div key={i} style={{
                            fontSize: 9, fontWeight: 700, color: '#aaa',
                            letterSpacing: '0.1em',
                            textAlign: i >= 2 && i <= 5 ? 'right' : 'left',
                            paddingRight: i >= 2 && i <= 5 ? 8 : 0,
                          }}>{h}</div>
                        ))}
                      </div>
                    )}

                    {/* Items */}
                    {chItems.map(item => {
                      const total = item.quantity * item.unitPrice
                      const s = STATUS_CFG[item.status] ?? STATUS_CFG.PENDING
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.2fr 70px 60px 110px 110px 130px 72px',
                            padding: '10px 18px',
                            borderBottom: '1px solid #FAF8FF',
                            alignItems: 'center',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAF8FF'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                        >
                          {/* Concepto */}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                              {item.concept}
                            </div>
                            <div style={{ fontSize: 10, color: '#bbb' }}>{item.code}</div>
                          </div>
                          {/* Proveedor */}
                          <div style={{ fontSize: 12, color: '#555' }}>{item.provider || '—'}</div>
                          {/* Cant */}
                          <div style={{ fontSize: 13, color: '#333', textAlign: 'right', paddingRight: 8 }}>
                            {item.quantity.toLocaleString('es-MX')}
                          </div>
                          {/* Unidad */}
                          <div style={{ fontSize: 11, color: '#888' }}>{item.unit}</div>
                          {/* P. Unit */}
                          <div style={{ fontSize: 13, color: '#333', textAlign: 'right', paddingRight: 8 }}>
                            {fmt(item.unitPrice)}
                          </div>
                          {/* Total */}
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', textAlign: 'right', paddingRight: 8 }}>
                            {fmt(total)}
                          </div>
                          {/* Estado */}
                          <div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: s.bg, color: s.color,
                              fontSize: 11, fontWeight: 600,
                              padding: '3px 10px', borderRadius: 20,
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: s.dot, display: 'inline-block', flexShrink: 0,
                              }} />
                              {s.label}
                            </span>
                          </div>
                          {/* Actions */}
                          <div>
                            <Space size={2}>
                              <Button size="small" type="text" icon={<EditOutlined />}
                                onClick={() => openEditItem(item)}
                                style={{ color: '#aaa', height: 26, width: 28, padding: 0 }} />
                              <Popconfirm title="¿Eliminar este item?" onConfirm={() => deleteItem(item.id)}
                                okButtonProps={{ danger: true }}>
                                <Button size="small" type="text" icon={<DeleteOutlined />}
                                  style={{ color: '#DC2626', height: 26, width: 28, padding: 0 }} />
                              </Popconfirm>
                            </Space>
                          </div>
                        </div>
                      )
                    })}

                    {/* Chapter footer: add item + subtotal */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 18px',
                      background: '#FAFAFA',
                      borderTop: chItems.length > 0 ? '1px solid #F0EBFF' : 'none',
                    }}>
                      <Button
                        type="link" icon={<PlusOutlined />} size="small"
                        onClick={() => openNewItem(ch.id)}
                        style={{ color: ch.color, fontWeight: 600, padding: 0, height: 28 }}
                      >
                        Agregar item
                      </Button>
                      {chItems.length > 0 && (
                        <Text strong style={{ fontSize: 13, color: '#1a1a1a' }}>
                          {fmt(planeado)}
                        </Text>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Add chapter shortcut ── */}
        {store.chapters.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Button
              icon={<PlusOutlined />} type="dashed"
              onClick={openNewChapter}
              style={{ width: '100%', borderColor: '#DDD6FE', color: '#7C3AED', borderRadius: 10, height: 40 }}
            >
              Agregar capítulo
            </Button>
          </div>
        )}
      </div>

      {/* ── Chapter Modal ── */}
      <Modal
        title={editCh ? 'Editar capítulo' : 'Nuevo capítulo'}
        open={chModal}
        onCancel={() => setChModal(false)}
        onOk={() => chForm.submit()}
        okText="Guardar"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        destroyOnClose
      >
        <Form form={chForm} layout="vertical" onFinish={saveChapter}>
          <Form.Item
            name="name" label="Nombre del capítulo"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input
              placeholder="Ej: Catering y bebidas, Decoración y flores, Producción..."
              size="large"
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Item Modal ── */}
      <Modal
        title={itemModal.editing ? 'Editar item' : 'Nuevo item'}
        open={itemModal.open}
        onCancel={() => setItemModal({ open: false, chapterId: '', editing: null })}
        onOk={() => itemForm.submit()}
        okText="Guardar"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        width={580}
        destroyOnClose
      >
        <Form form={itemForm} layout="vertical" onFinish={saveItem}>
          <Form.Item
            name="concept" label="Concepto"
            rules={[{ required: true, message: 'El concepto es obligatorio' }]}
          >
            <Input placeholder="Ej: Cena tres tiempos — 220 pax" />
          </Form.Item>

          <Form.Item name="provider" label="Proveedor">
            <Input placeholder="Nombre del proveedor..." />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 12 }}>
            <Form.Item
              name="quantity" label="Cantidad"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="unit" label="Unidad"
              rules={[{ required: true }]}
            >
              <Select>
                {UNITS.map(u => (
                  <Select.Option key={u} value={u}>{u}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="unitPrice" label="Precio unitario"
              rules={[{ required: true }]}
            >
              <InputNumber
                prefix="$" min={0} style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => Number(v!.replace(/[$,]/g, '')) as unknown as 0}
              />
            </Form.Item>
          </div>

          <Form.Item name="status" label="Estado">
            <Select>
              <Select.Option value="CONFIRMED">
                <span style={{ color: '#059669', fontWeight: 600 }}>● Confirmado</span>
              </Select.Option>
              <Select.Option value="PENDING">
                <span style={{ color: '#D97706', fontWeight: 600 }}>● Pendiente</span>
              </Select.Option>
              <Select.Option value="CANCELLED">
                <span style={{ color: '#6B7280', fontWeight: 600 }}>● Cancelado</span>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones adicionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
