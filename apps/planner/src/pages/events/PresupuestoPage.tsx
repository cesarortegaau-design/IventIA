/**
 * PresupuestoPage.tsx — v2
 * Presupuesto P&L — precio de venta, costo y utilidad por item/capítulo/evento
 * Persiste en localStorage por evento
 */
import { useState, useMemo, useRef } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { usePlannerStore } from '../../hooks/usePlannerStore'
import {
  Button, Modal, Form, Input, InputNumber, Select, Space,
  Popconfirm, App, Typography, Divider,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FileExcelOutlined, UploadOutlined,
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
  unitPrice: number   // precio que cobra el organizador al cliente
  unitCost: number    // costo real del proveedor (0 = no capturado)
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

const pct = (n: number, total: number) =>
  total > 0 ? `${Math.round(n / total * 100)}%` : '—'

const STATUS_CFG = {
  CONFIRMED: { label: 'Confirmado', color: '#059669', bg: '#ECFDF5', dot: '#059669' },
  PENDING:   { label: 'Pendiente',  color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  CANCELLED: { label: 'Cancelado',  color: '#6B7280', bg: '#F9FAFB', dot: '#9CA3AF' },
} as const

const UNITS = ['pax', 'pza', 'paq', 'global', 'día', 'hora', 'turno', 'm²', 'evento', 'km']

// ── P&L inline preview ────────────────────────────────────────────────────────
function PLPreview({ qty, price, cost }: { qty: number; price: number; cost: number }) {
  const ingreso  = qty * price
  const costo    = qty * cost
  const utilidad = ingreso - costo
  const margen   = ingreso > 0 ? utilidad / ingreso : 0
  const positive = utilidad >= 0

  return (
    <div style={{
      background: positive ? '#F0FDF4' : '#FFF1F2',
      border: `1px solid ${positive ? '#BBF7D0' : '#FECDD3'}`,
      borderRadius: 8, padding: '10px 14px',
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: 8, marginTop: 4,
    }}>
      {[
        { label: 'INGRESO',  value: fmt(ingreso),  color: '#7C3AED' },
        { label: 'COSTO',    value: fmt(costo),    color: '#DC2626' },
        { label: 'UTILIDAD', value: fmt(utilidad), color: positive ? '#059669' : '#DC2626' },
        { label: 'MARGEN',   value: `${Math.round(margen * 100)}%`, color: positive ? '#059669' : '#DC2626' },
      ].map(k => (
        <div key={k.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 2 }}>
            {k.label}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: k.color }}>{k.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Excel export ──────────────────────────────────────────────────────────────
async function exportToExcel(store: BudgetStore, eventName: string) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Presupuesto')
  ws.columns = [
    { header: 'Capítulo',      key: 'chapter',    width: 26 },
    { header: 'Código',        key: 'code',        width: 10 },
    { header: 'Concepto',      key: 'concept',     width: 34 },
    { header: 'Proveedor',     key: 'provider',    width: 22 },
    { header: 'Cant.',         key: 'quantity',    width: 8  },
    { header: 'Unidad',        key: 'unit',        width: 8  },
    { header: 'P. Unit.',      key: 'unitPrice',   width: 14 },
    { header: 'Costo Unit.',   key: 'unitCost',    width: 14 },
    { header: 'Total Ingreso', key: 'total',       width: 16 },
    { header: 'Total Costo',   key: 'totalCost',   width: 14 },
    { header: 'Utilidad',      key: 'profit',      width: 14 },
    { header: 'Margen %',      key: 'margin',      width: 10 },
    { header: 'Estado',        key: 'status',      width: 14 },
    { header: 'Notas',         key: 'notes',       width: 30 },
  ]
  ws.getRow(1).font = { bold: true }

  for (const item of store.items) {
    const ch        = store.chapters.find(c => c.id === item.chapterId)
    const ingreso   = item.quantity * item.unitPrice
    const costo     = item.quantity * (item.unitCost ?? 0)
    const utilidad  = ingreso - costo
    const margin    = ingreso > 0 ? Math.round(utilidad / ingreso * 100) : 0
    ws.addRow({
      chapter:   ch?.name ?? '',
      code:      item.code,
      concept:   item.concept,
      provider:  item.provider ?? '',
      quantity:  item.quantity,
      unit:      item.unit,
      unitPrice: item.unitPrice,
      unitCost:  item.unitCost ?? 0,
      total:     ingreso,
      totalCost: costo,
      profit:    utilidad,
      margin:    `${margin}%`,
      status:    STATUS_CFG[item.status]?.label ?? item.status,
      notes:     item.notes ?? '',
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
  const { message, modal } = App.useApp()
  const importInputRef = useRef<HTMLInputElement>(null)

  const { store, update, syncStatus, ready } = usePlannerStore<BudgetStore>(
    eventId, 'presupuesto',
    { chapters: [], items: [], updatedAt: '' },
    `iventia-presupuesto-${eventId}`,
  )
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Modals
  const [chModal, setChModal] = useState(false)
  const [editCh, setEditCh] = useState<BudgetChapter | null>(null)
  const [itemModal, setItemModal] = useState<{
    open: boolean; chapterId: string; editing: BudgetItem | null
  }>({ open: false, chapterId: '', editing: null })

  const [chForm] = Form.useForm()
  const [itemForm] = Form.useForm()

  // Live preview watchers
  const watchQty   = Form.useWatch('quantity',  itemForm) ?? 0
  const watchPrice = Form.useWatch('unitPrice', itemForm) ?? 0
  const watchCost  = Form.useWatch('unitCost',  itemForm) ?? 0

  // ── Excel import ──────────────────────────────────────────────────────────
  async function importFromExcel(file: File) {
    try {
      const ExcelJS = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      if (!ws) { message.error('El archivo no contiene hojas'); return }

      // Map header names → column indices
      const colMap: Record<string, number> = {}
      ws.getRow(1).eachCell((cell, ci) => {
        const v = String(cell.value ?? '').trim()
        if (v) colMap[v] = ci
      })

      if (!colMap['Concepto']) {
        message.error('El archivo no tiene la columna "Concepto". Usa el Excel exportado como plantilla.')
        return
      }

      const STATUS_REVERSE: Record<string, BudgetItem['status']> = {
        confirmado: 'CONFIRMED', cancelado: 'CANCELLED',
      }

      type ParsedRow = {
        chapter: string; code: string; concept: string; provider: string
        quantity: number; unit: string; unitPrice: number; unitCost: number
        status: BudgetItem['status']; notes: string
      }
      const rows: ParsedRow[] = []
      ws.eachRow((row, ri) => {
        if (ri === 1) return
        const str = (col: string) => {
          const idx = colMap[col]; if (!idx) return ''
          const v = row.getCell(idx).value
          return v == null ? '' : String(v).trim()
        }
        const num = (col: string) => {
          const idx = colMap[col]; if (!idx) return 0
          const v = row.getCell(idx).value
          if (v == null) return 0
          const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''))
          return isNaN(n) ? 0 : n
        }
        const concept = str('Concepto')
        if (!concept) return
        const statusKey = str('Estado').toLowerCase()
        rows.push({
          chapter:   str('Capítulo') || 'General',
          code:      str('Código'),
          concept,
          provider:  str('Proveedor'),
          quantity:  num('Cant.') || 1,
          unit:      str('Unidad') || 'pza',
          unitPrice: num('P. Unit.'),
          unitCost:  num('Costo Unit.'),
          status:    STATUS_REVERSE[statusKey] ?? 'PENDING',
          notes:     str('Notas'),
        })
      })

      if (rows.length === 0) { message.warning('No se encontraron filas con datos'); return }

      modal.confirm({
        title: `Importar ${rows.length} items`,
        content: `Se reemplazará el presupuesto actual con los ${rows.length} items del archivo "${file.name}". Esta acción no se puede deshacer.`,
        okText: 'Reemplazar',
        cancelText: 'Cancelar',
        okButtonProps: { danger: true },
        onOk() {
          const COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#7C2D8E']
          const chapterNames = [...new Set(rows.map(r => r.chapter))]
          const newChapters: BudgetChapter[] = chapterNames.map((name, i) => ({
            id: `ch-${Date.now()}-${i}`, name, color: COLORS[i % COLORS.length], sortOrder: i,
          }))
          const chIdByName: Record<string, string> = {}
          newChapters.forEach(ch => { chIdByName[ch.name] = ch.id })
          const newItems: BudgetItem[] = rows.map((r, i) => ({
            id: `item-${Date.now()}-${i}`,
            chapterId: chIdByName[r.chapter],
            concept: r.concept, code: r.code, provider: r.provider,
            quantity: r.quantity, unit: r.unit,
            unitPrice: r.unitPrice, unitCost: r.unitCost,
            status: r.status, notes: r.notes,
          }))
          update({ chapters: newChapters, items: newItems })
          message.success(`${rows.length} items importados correctamente`)
        },
      })
    } catch (err) {
      console.error(err)
      message.error('Error al leer el archivo Excel')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    // Excluir CANCELLED de todos los cálculos
    const active    = store.items.filter(i => i.status !== 'CANCELLED')
    const confirmed = store.items.filter(i => i.status === 'CONFIRMED')

    const ingreso   = active.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const costo     = active.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
    const utilidad  = ingreso - costo
    const confirmado = confirmed.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

    return { ingreso, costo, utilidad, confirmado }
  }, [store.items])

  const margenPct = kpi.ingreso > 0 ? Math.round(kpi.utilidad / kpi.ingreso * 100) : 0
  const margenColor = margenPct >= 25 ? '#059669' : margenPct >= 10 ? '#D97706' : '#DC2626'

  const lastEdit = store.updatedAt ? dayjs(store.updatedAt).fromNow() : null

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
    itemForm.setFieldsValue({ quantity: 1, unit: 'global', status: 'PENDING', unitCost: 0 })
    setItemModal({ open: true, chapterId, editing: null })
  }

  const openEditItem = (item: BudgetItem) => {
    itemForm.setFieldsValue({
      concept: item.concept, provider: item.provider,
      quantity: item.quantity, unit: item.unit,
      unitPrice: item.unitPrice, unitCost: item.unitCost ?? 0,
      status: item.status, notes: item.notes,
    })
    setItemModal({ open: true, chapterId: item.chapterId, editing: item })
  }

  const saveItem = (vals: any) => {
    const { chapterId, editing } = itemModal
    if (editing) {
      update({
        items: store.items.map(i =>
          i.id === editing.id ? { ...i, ...vals, unitCost: vals.unitCost ?? 0 } : i
        ),
      })
    } else {
      const chIdx   = store.chapters.findIndex(c => c.id === chapterId)
      const chCount = store.items.filter(i => i.chapterId === chapterId).length
      const code    = `C${chIdx + 1}-${chCount + 1}`
      update({
        items: [...store.items, {
          id: `item-${Date.now()}`,
          chapterId, code, ...vals, unitCost: vals.unitCost ?? 0,
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
    setCollapsed(c => ({ ...c, [id]: !isOpen(id) }))

  const isOpen = (id: string) => collapsed[id] !== true

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
              {kpi.ingreso > 0 && (
                <Text style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED' }}>
                  · {fmt(kpi.ingreso)}
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
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) importFromExcel(f) }}
            />
            <Button
              icon={<UploadOutlined />}
              onClick={() => importInputRef.current?.click()}
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
            {
              label: 'INGRESO TOTAL',
              value: kpi.ingreso,
              sub: `${store.items.filter(i => i.status !== 'CANCELLED').length} items activos`,
              color: '#7C3AED', border: '#C4B5FD',
            },
            {
              label: 'COSTO TOTAL',
              value: kpi.costo,
              sub: kpi.ingreso > 0 ? `${pct(kpi.costo, kpi.ingreso)} del ingreso` : 'sin ingreso',
              color: '#DC2626', border: '#FCA5A5',
            },
            {
              label: 'UTILIDAD',
              value: kpi.utilidad,
              sub: `Margen: ${margenPct}%`,
              color: margenColor, border: margenPct >= 10 ? '#BBF7D0' : '#FCA5A5',
            },
            {
              label: 'CONFIRMADO',
              value: kpi.confirmado,
              sub: kpi.ingreso > 0 ? `${pct(kpi.confirmado, kpi.ingreso)} del total` : '—',
              color: '#0D9488', border: '#99F6E4',
            },
          ].map(card => (
            <div key={card.label} style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              border: `1px solid ${card.border}44`,
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

        {/* ── P&L progress bars ── */}
        {kpi.ingreso > 0 && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: '14px 20px',
            marginBottom: 18, border: '1px solid #EDE9FE',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            {/* Ingreso breakdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Ingreso por estado</Text>
              <Space size={12}>
                {[
                  { label: `Confirmado  ${fmt(kpi.confirmado)}`, color: '#7C3AED' },
                  { label: `Pendiente  ${fmt(kpi.ingreso - kpi.confirmado)}`, color: '#C4B5FD' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                    <Text style={{ fontSize: 11, color: '#666' }}>{l.label}</Text>
                  </div>
                ))}
              </Space>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#EDE9FE', overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
              <div style={{
                width: `${Math.min(100, kpi.confirmado / kpi.ingreso * 100)}%`,
                background: '#7C3AED', transition: 'width 0.5s',
              }} />
            </div>

            {/* Margin structure */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Estructura de margen</Text>
              <Space size={12}>
                {[
                  { label: `Costo  ${fmt(kpi.costo)}`, color: '#FCA5A5' },
                  { label: `Utilidad  ${fmt(kpi.utilidad)}`, color: '#6EE7B7' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                    <Text style={{ fontSize: 11, color: '#666' }}>{l.label}</Text>
                  </div>
                ))}
              </Space>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden', display: 'flex' }}>
              <div style={{
                width: `${Math.min(100, kpi.costo / kpi.ingreso * 100)}%`,
                background: 'linear-gradient(90deg, #DC2626, #FCA5A5)',
                transition: 'width 0.5s',
              }} />
              <div style={{
                width: `${Math.max(0, Math.min(100 - kpi.costo / kpi.ingreso * 100, kpi.utilidad / kpi.ingreso * 100))}%`,
                background: 'linear-gradient(90deg, #059669, #6EE7B7)',
                transition: 'width 0.5s',
              }} />
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
              Crea tu primer capítulo para detallar precio, costo y utilidad del evento
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
          {store.chapters.map((ch) => {
            const chItems  = store.items.filter(i => i.chapterId === ch.id)
            const active   = chItems.filter(i => i.status !== 'CANCELLED')
            const chIngreso   = active.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
            const chCosto     = active.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
            const chUtilidad  = chIngreso - chCosto
            const chMargenPct = chIngreso > 0 ? Math.round(chUtilidad / chIngreso * 100) : 0
            const chColor2    = chMargenPct >= 25 ? '#059669' : chMargenPct >= 10 ? '#D97706' : '#DC2626'
            const open        = isOpen(ch.id)

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

                  {/* Right: P&L summary + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        Ingreso <strong style={{ color: '#7C3AED' }}>{fmt(chIngreso)}</strong>
                        {'  '}Costo <strong style={{ color: '#DC2626' }}>{fmt(chCosto)}</strong>
                      </div>
                    </div>
                    {chIngreso > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: chUtilidad >= 0 ? '#ECFDF5' : '#FEF2F2',
                        color: chUtilidad >= 0 ? '#059669' : '#DC2626',
                        border: `1px solid ${chUtilidad >= 0 ? '#BBF7D0' : '#FECDD3'}`,
                      }}>
                        {chUtilidad >= 0 ? '+' : ''}{fmt(chUtilidad)} · {chMargenPct}%
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
                        gridTemplateColumns: '2fr 1fr 90px 110px 100px 110px 100px 130px 70px',
                        padding: '6px 18px',
                        background: '#FAFAFA',
                        borderTop: '1px solid #F0EBFF',
                        borderBottom: '1px solid #F0EBFF',
                      }}>
                        {['CONCEPTO', 'PROVEEDOR', 'CANT.×U.', 'P.UNIT.', 'COSTO U.', 'TOTAL', 'UTILIDAD', 'ESTADO', ''].map((h, i) => (
                          <div key={i} style={{
                            fontSize: 9, fontWeight: 700, color: '#aaa',
                            letterSpacing: '0.1em',
                            textAlign: (i >= 2 && i <= 6) ? 'right' : 'left',
                            paddingRight: (i >= 2 && i <= 6) ? 8 : 0,
                          }}>{h}</div>
                        ))}
                      </div>
                    )}

                    {/* Items */}
                    {chItems.map(item => {
                      const ingreso  = item.quantity * item.unitPrice
                      const costo    = item.quantity * (item.unitCost ?? 0)
                      const utilidad = ingreso - costo
                      const uPct     = ingreso > 0 ? Math.round(utilidad / ingreso * 100) : 0
                      const hasCost  = (item.unitCost ?? 0) > 0
                      const uColor   = uPct >= 0 ? '#059669' : '#DC2626'
                      const s        = STATUS_CFG[item.status] ?? STATUS_CFG.PENDING
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 90px 110px 100px 110px 100px 130px 70px',
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
                          {/* Cant × Unidad */}
                          <div style={{ fontSize: 12, color: '#555', textAlign: 'right', paddingRight: 8 }}>
                            {item.quantity.toLocaleString('es-MX')} {item.unit}
                          </div>
                          {/* P. Unit */}
                          <div style={{ fontSize: 13, color: '#7C3AED', fontWeight: 600, textAlign: 'right', paddingRight: 8 }}>
                            {fmt(item.unitPrice)}
                          </div>
                          {/* Costo U */}
                          <div style={{ fontSize: 13, color: hasCost ? '#DC2626' : '#ccc', textAlign: 'right', paddingRight: 8 }}>
                            {hasCost ? fmt(item.unitCost) : '—'}
                          </div>
                          {/* Total ingreso */}
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', textAlign: 'right', paddingRight: 8 }}>
                            {fmt(ingreso)}
                          </div>
                          {/* Utilidad */}
                          <div style={{ textAlign: 'right', paddingRight: 8 }}>
                            {hasCost ? (
                              <span style={{
                                display: 'inline-block',
                                background: uPct >= 0 ? '#ECFDF5' : '#FEF2F2',
                                color: uColor,
                                fontSize: 11, fontWeight: 700,
                                padding: '2px 8px', borderRadius: 12,
                              }}>
                                {fmt(utilidad)} <span style={{ fontWeight: 400 }}>({uPct}%)</span>
                              </span>
                            ) : (
                              <span style={{ color: '#ccc', fontSize: 11 }}>—</span>
                            )}
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

                    {/* Chapter footer */}
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
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: '#888' }}>
                            Ingreso <strong style={{ color: '#7C3AED' }}>{fmt(chIngreso)}</strong>
                          </Text>
                          {chCosto > 0 && (
                            <Text style={{ fontSize: 12, color: '#888' }}>
                              Utilidad <strong style={{ color: chColor2 }}>{fmt(chUtilidad)}</strong>
                            </Text>
                          )}
                        </div>
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
              placeholder="Ej: Catering y bebidas, Decoración, Producción..."
              size="large" autoFocus
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
        width={620}
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

          {/* Quantity + Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="quantity" label="Cantidad" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit" label="Unidad" rules={[{ required: true }]}>
              <Select>
                {UNITS.map(u => <Select.Option key={u} value={u}>{u}</Select.Option>)}
              </Select>
            </Form.Item>
          </div>

          {/* Price + Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="unitPrice" label="Precio unitario (cliente)"
              rules={[{ required: true, message: 'Ingresa el precio' }]}
              tooltip="Lo que cobra el organizador al cliente"
            >
              <InputNumber
                prefix="$" min={0} style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => Number(v!.replace(/[$,]/g, '')) as unknown as 0}
              />
            </Form.Item>
            <Form.Item
              name="unitCost" label="Costo unitario (proveedor)"
              tooltip="Costo real que cobra el proveedor. Opcional — define tu utilidad."
            >
              <InputNumber
                prefix="$" min={0} style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => Number(v!.replace(/[$,]/g, '')) as unknown as 0}
              />
            </Form.Item>
          </div>

          {/* Live P&L Preview */}
          {(watchPrice > 0 || watchCost > 0) && (
            <>
              <Text style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>
                Vista previa P&L
              </Text>
              <PLPreview qty={watchQty || 1} price={watchPrice || 0} cost={watchCost || 0} />
              <Divider style={{ margin: '14px 0 4px' }} />
            </>
          )}

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
