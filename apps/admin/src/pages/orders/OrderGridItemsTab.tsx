/**
 * OrderGridItemsTab — Excel-like editable grid for order line items.
 *
 * Modos:
 *   canEdit       (QUOTED, sin pagos)  → edita cant., desc%, observaciones solicitadas
 *   canEditActual (CONFIRMED)          → edita cant. real, desc% real, obs real
 *   Solo lectura  (otros estados)      → muestra solicitado + real sin edición
 *
 * Navegación teclado:
 *   Tab/Shift+Tab → siguiente/anterior celda editable
 *   Enter         → misma columna, fila siguiente
 *   Flechas       → navegar sin editar
 *   Esc           → cancelar
 *   Del/Backspace → limpiar valor numérico
 *   F2            → entrar a edición
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Select, Tooltip, Spin, Button, Popconfirm, Tag } from 'antd'
import {
  DeleteOutlined, PlusOutlined, SaveOutlined,
  CheckCircleOutlined, WarningOutlined, CloseOutlined,
} from '@ant-design/icons'
import { ordersApi } from '../../api/orders'
import { priceListsApi } from '../../api/priceLists'
import { formatMoney } from '../../utils/format'

// ── Types ──────────────────────────────────────────────────────────────────────
interface GridRow {
  _key: string
  id?: string
  resourceId: string
  priceListItemId?: string
  name: string
  code: string
  dept: string
  unit: string
  factor: number
  timeUnit: string
  // Solicitado
  unitPrice: number
  quantity: number
  discountPct: number
  lineTotal: number
  observations: string
  // Real
  actualQuantity: number
  actualDiscountPct: number
  actualLineTotal: number
  actualObservations: string
}

type SolCol = 'quantity' | 'discountPct' | 'observations'
type ActCol = 'actualQuantity' | 'actualDiscountPct' | 'actualObservations'
type EditCol = SolCol | ActCol

const SOL_COLS: SolCol[] = ['quantity', 'discountPct', 'observations']
const ACT_COLS: ActCol[] = ['actualQuantity', 'actualDiscountPct', 'actualObservations']

interface EditTarget { rowIdx: number; col: EditCol }

interface Props {
  order: any
  canEdit: boolean
  canEditActual: boolean
  orderId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcSolTotal(r: GridRow) {
  const eff = r.timeUnit?.endsWith('sin factor') ? 1 : (r.factor || 1)
  return r.unitPrice * r.quantity * eff * (1 - (r.discountPct || 0) / 100)
}

function calcActTotal(r: GridRow) {
  const eff = r.timeUnit?.endsWith('sin factor') ? 1 : (r.factor || 1)
  return r.unitPrice * (r.actualQuantity ?? 0) * eff * (1 - ((r.actualDiscountPct ?? 0)) / 100)
}

function rowFromLineItem(li: any): GridRow {
  return {
    _key: li.id ?? `row-${Date.now()}-${Math.random()}`,
    id: li.id,
    resourceId: li.resourceId,
    priceListItemId: li.priceListItemId,
    name: li.resource?.name ?? li.description ?? '',
    code: li.resource?.code ?? '',
    dept: li.resource?.department?.name ?? '—',
    unit: li.resource?.unit ?? '',
    factor: Number(li.resource?.factor ?? 1),
    timeUnit: li.timeUnit ?? 'no aplica',
    unitPrice: Number(li.unitPrice),
    quantity: Number(li.quantity),
    discountPct: Number(li.discountPct ?? 0),
    lineTotal: Number(li.lineTotal),
    observations: li.observations ?? '',
    actualQuantity: Number(li.actualQuantity ?? li.quantity ?? 0),
    actualDiscountPct: Number(li.actualDiscountPct ?? li.discountPct ?? 0),
    actualLineTotal: Number(li.actualLineTotal ?? li.lineTotal ?? 0),
    actualObservations: li.actualObservations ?? '',
  }
}

function getColValue(row: GridRow, col: EditCol): string | number {
  return (row as any)[col] ?? (col.includes('Observations') || col === 'observations' ? '' : 0)
}

function isNumericCol(col: EditCol) {
  return col !== 'observations' && col !== 'actualObservations'
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OrderGridItemsTab({ order, canEdit, canEditActual, orderId }: Props) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [rows, setRows] = useState<GridRow[]>([])
  const [dirty, setDirty] = useState(false)

  // Active edit
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [draft, setDraft] = useState<string | number>('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Add resource panel
  const [showAddRow, setShowAddRow] = useState(false)
  const [addSearch, setAddSearch] = useState('')

  const editCols: EditCol[] = canEditActual ? ACT_COLS : SOL_COLS
  const anyEditable = canEdit || canEditActual
  const showActual = canEditActual || ['CONFIRMED', 'EXECUTED', 'INVOICED'].includes(order?.status)

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (order?.lineItems) {
      setRows((order.lineItems as any[]).map(rowFromLineItem))
      setDirty(false)
      setEditTarget(null)
    }
  }, [order])

  useEffect(() => {
    if (editTarget) requestAnimationFrame(() => inputRef.current?.focus())
  }, [editTarget])

  // ── Price list ──────────────────────────────────────────────────────────────
  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ['price-list', order?.priceListId],
    queryFn: () => priceListsApi.get(order!.priceListId),
    enabled: !!order?.priceListId && canEdit,
    staleTime: 60_000,
  })

  const plItems: any[] = useMemo(() => {
    const raw = plData?.data?.items ?? plData?.items ?? []
    return raw.filter((pi: any) => !!pi.resource)
  }, [plData])

  const existingIds = useMemo(() => new Set(rows.map(r => r.resourceId)), [rows])

  const addOptions = useMemo(() => {
    const lower = addSearch.toLowerCase()
    return plItems
      .filter((pi: any) =>
        !existingIds.has(pi.resourceId) &&
        (pi.resource?.name?.toLowerCase().includes(lower) ||
         pi.resource?.code?.toLowerCase().includes(lower) ||
         pi.resource?.department?.name?.toLowerCase().includes(lower))
      )
      .slice(0, 80)
  }, [plItems, existingIds, addSearch])

  // ── Save mutations ──────────────────────────────────────────────────────────
  // Valores solicitados (QUOTED)
  const saveSolMutation = useMutation({
    mutationFn: (rowsToSave: GridRow[]) => ordersApi.update(orderId, {
      lineItems: rowsToSave.map((r, idx) => ({
        resourceId: r.resourceId,
        priceListItemId: r.priceListItemId,
        quantity: r.quantity,
        discountPct: r.discountPct,
        observations: r.observations || '',
        sortOrder: idx,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      setDirty(false)
      message.success('Valores solicitados guardados')
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Error al guardar'),
  })

  // Valores reales (CONFIRMED)
  const saveActMutation = useMutation({
    mutationFn: (rowsToSave: GridRow[]) => ordersApi.updateActualValues(orderId, {
      lineItems: rowsToSave
        .filter(r => r.id)
        .map(r => ({
          id: r.id!,
          actualQuantity: r.actualQuantity,
          actualDiscountPct: r.actualDiscountPct ?? 0,
          actualObservations: r.actualObservations || null,
        })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      setDirty(false)
      message.success('Valores reales guardados')
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Error al guardar'),
  })

  const saveLoading = saveSolMutation.isPending || saveActMutation.isPending

  function handleSave() {
    if (canEditActual) saveActMutation.mutate(rows)
    else saveSolMutation.mutate(rows)
  }

  // ── Row helpers ─────────────────────────────────────────────────────────────
  const applyRowPatch = useCallback((key: string, patch: Partial<GridRow>) => {
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r
      const updated = { ...r, ...patch }
      updated.lineTotal = calcSolTotal(updated)
      updated.actualLineTotal = calcActTotal(updated)
      return updated
    }))
    setDirty(true)
  }, [])

  const removeRow = useCallback((key: string) => {
    setRows(prev => prev.filter(r => r._key !== key))
    setDirty(true)
    setEditTarget(null)
  }, [])

  // ── Editing helpers ─────────────────────────────────────────────────────────
  const startEdit = useCallback((rowIdx: number, col: EditCol, override?: string | number) => {
    if (!anyEditable) return
    // In canEditActual mode only allow actual cols, in canEdit mode only sol cols
    if (canEditActual && !ACT_COLS.includes(col as ActCol)) return
    if (canEdit && !SOL_COLS.includes(col as SolCol)) return
    const row = rows[rowIdx]
    if (!row) return
    const val = override !== undefined ? override : getColValue(row, col)
    setEditTarget({ rowIdx, col })
    setDraft(val)
  }, [anyEditable, canEdit, canEditActual, rows])

  const commitEdit = useCallback((nextTarget?: EditTarget | null) => {
    if (!editTarget) return
    const { rowIdx, col } = editTarget
    const row = rows[rowIdx]
    if (row) {
      const isNum = isNumericCol(col)
      let value: string | number = draft
      if (isNum) {
        value = draft === '' ? 0 : Number(draft)
        if (isNaN(value as number)) value = Number(getColValue(row, col)) || 0
        if (col === 'discountPct' || col === 'actualDiscountPct')
          value = Math.max(0, Math.min(100, value as number))
        if (col === 'quantity' || col === 'actualQuantity')
          value = Math.max(0, value as number)
      }
      applyRowPatch(row._key, { [col]: value })
    }
    if (nextTarget === undefined) {
      setEditTarget(null)
    } else {
      setEditTarget(nextTarget)
      if (nextTarget) {
        const nextRow = rows[nextTarget.rowIdx]
        if (nextRow) setDraft(getColValue(nextRow, nextTarget.col))
      }
    }
  }, [editTarget, rows, draft, applyRowPatch])

  const cancelEdit = useCallback(() => setEditTarget(null), [])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback((dir: 'tab' | 'shifttab' | 'enter' | 'up' | 'down' | 'left' | 'right') => {
    if (!editTarget) return
    const { rowIdx, col } = editTarget
    const colIdx = editCols.indexOf(col as any)
    let nextRowIdx = rowIdx
    let nextColIdx = colIdx

    if (dir === 'tab') {
      if (colIdx < editCols.length - 1) nextColIdx = colIdx + 1
      else { nextRowIdx = rowIdx + 1; nextColIdx = 0 }
    } else if (dir === 'shifttab') {
      if (colIdx > 0) nextColIdx = colIdx - 1
      else { nextRowIdx = rowIdx - 1; nextColIdx = editCols.length - 1 }
    } else if (dir === 'enter' || dir === 'down') {
      nextRowIdx = rowIdx + 1
    } else if (dir === 'up') {
      nextRowIdx = rowIdx - 1
    } else if (dir === 'right') {
      nextColIdx = Math.min(colIdx + 1, editCols.length - 1)
    } else if (dir === 'left') {
      nextColIdx = Math.max(colIdx - 1, 0)
    }

    if (nextRowIdx < 0) nextRowIdx = 0
    if (nextRowIdx >= rows.length) {
      commitEdit(null)
      if (dir === 'tab' && canEdit) { setShowAddRow(true); setAddSearch('') }
      return
    }
    commitEdit({ rowIdx: nextRowIdx, col: editCols[nextColIdx] })
  }, [editTarget, editCols, rows.length, commitEdit, canEdit])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab')    { e.preventDefault(); navigate(e.shiftKey ? 'shifttab' : 'tab') }
    if (e.key === 'Enter')  { e.preventDefault(); navigate('enter') }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }, [navigate, cancelEdit])

  // ── Add resource ────────────────────────────────────────────────────────────
  const addResource = useCallback((resourceId: string) => {
    const pi = plItems.find((p: any) => p.resourceId === resourceId)
    if (!pi) return
    const qty = 1
    const price = Number(pi.price ?? pi.unitPrice ?? 0)
    const newRow: GridRow = {
      _key: `new-${Date.now()}`,
      resourceId: pi.resourceId,
      priceListItemId: pi.id,
      name: pi.resource?.name ?? '',
      code: pi.resource?.code ?? '',
      dept: pi.resource?.department?.name ?? '—',
      unit: pi.resource?.unit ?? '',
      factor: Number(pi.resource?.factor ?? 1),
      timeUnit: 'no aplica',
      unitPrice: price,
      quantity: qty,
      discountPct: 0,
      lineTotal: price,
      observations: '',
      actualQuantity: qty,
      actualDiscountPct: 0,
      actualLineTotal: price,
      actualObservations: '',
    }
    setRows(prev => [...prev, newRow])
    setDirty(true)
    setShowAddRow(false)
    setAddSearch('')
    requestAnimationFrame(() => {
      setRows(prev => {
        const idx = prev.findIndex(r => r._key === newRow._key)
        if (idx >= 0) { setEditTarget({ rowIdx: idx, col: 'quantity' }); setDraft(1) }
        return prev
      })
    })
  }, [plItems])

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotalSol = rows.reduce((s, r) => s + r.lineTotal, 0)
  const subtotalAct = rows.reduce((s, r) => s + r.actualLineTotal, 0)
  const deptGroups = useMemo(() => {
    const g: Record<string, GridRow[]> = {}
    rows.forEach(r => { if (!g[r.dept]) g[r.dept] = []; g[r.dept].push(r) })
    return g
  }, [rows])

  // ── Cell renderer ───────────────────────────────────────────────────────────
  function renderCell(row: GridRow, rowIdx: number, col: EditCol) {
    const isActive = editTarget?.rowIdx === rowIdx && editTarget?.col === col
    const value = getColValue(row, col)
    const isAct = ACT_COLS.includes(col as ActCol)
    const isText = col === 'observations' || col === 'actualObservations'
    const isEditable = (isAct ? canEditActual : canEdit)

    const cellStyle: React.CSSProperties = {
      outline: isActive ? `2px solid ${isAct ? '#059669' : '#6B46C1'}` : 'none',
      outlineOffset: -2,
      borderRadius: 3,
      background: isActive ? (isAct ? '#f0fdf4' : '#faf5ff') : 'transparent',
      cursor: isEditable ? 'cell' : 'default',
      userSelect: 'none',
      height: '100%',
    }

    if (isActive && isEditable) {
      return (
        <div style={cellStyle}>
          <input
            ref={inputRef}
            type={isText ? 'text' : 'number'}
            value={String(draft)}
            step={col.includes('Pct') || col === 'discountPct' ? '0.1' : '1'}
            min={col.includes('Pct') || col === 'discountPct' ? '0' : '0'}
            max={col.includes('Pct') || col === 'discountPct' ? '100' : undefined}
            onChange={e => setDraft(isText ? e.target.value : e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={() => commitEdit(null)}
            onFocus={e => e.target.select()}
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, padding: '4px 6px', fontFamily: 'inherit',
              textAlign: isText ? 'left' : 'right', color: '#1e293b',
            }}
          />
        </div>
      )
    }

    const pct = col === 'discountPct' || col === 'actualDiscountPct'
    const display = isText
      ? String(value)
      : pct
      ? `${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
      : Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
      <div
        style={cellStyle}
        onClick={() => { if (isEditable) startEdit(rowIdx, col, value) }}
        tabIndex={isEditable ? 0 : -1}
        onFocus={() => { if (isEditable) startEdit(rowIdx, col, value) }}
        onKeyDown={e => {
          if (!isEditable) return
          if (e.key === 'F2' || e.key === 'Enter') { e.preventDefault(); startEdit(rowIdx, col, value) }
          if ((e.key === 'Delete' || e.key === 'Backspace') && !isText) {
            e.preventDefault(); applyRowPatch(row._key, { [col]: 0 })
          }
          const ci = editCols.indexOf(col as any)
          if (e.key === 'ArrowRight') { e.preventDefault(); setEditTarget({ rowIdx, col: editCols[Math.min(ci+1, editCols.length-1)] }); setDraft(getColValue(row, editCols[Math.min(ci+1, editCols.length-1)])) }
          if (e.key === 'ArrowLeft')  { e.preventDefault(); setEditTarget({ rowIdx, col: editCols[Math.max(ci-1, 0)] }); setDraft(getColValue(row, editCols[Math.max(ci-1, 0)])) }
          if (e.key === 'ArrowDown')  { e.preventDefault(); if (rowIdx < rows.length-1) startEdit(rowIdx+1, col) }
          if (e.key === 'ArrowUp')    { e.preventDefault(); if (rowIdx > 0) startEdit(rowIdx-1, col) }
          if (e.key === 'Tab') {
            e.preventDefault()
            setEditTarget({ rowIdx, col }); setDraft(value)
            navigate(e.shiftKey ? 'shifttab' : 'tab')
          }
        }}
      >
        <span style={{
          display: 'block', padding: '4px 6px', fontSize: 13,
          color: pct && Number(value) > 0
            ? (isAct ? '#059669' : '#d97706')
            : isText ? '#64748b' : '#1e293b',
          textAlign: isText ? 'left' : 'right',
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {isText && !String(value) && isEditable
            ? <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: 11 }}>obs...</span>
            : display}
        </span>
      </div>
    )
  }

  // ── Column layout ───────────────────────────────────────────────────────────
  // Columns: dept | code | name | unit | p.unit | [sol cols] | [act cols if showActual] | del
  const W = {
    dept: 90, code: 68, name: showActual ? 170 : 200, unit: 48, price: 90,
    qty: 80, disc: 66, obs: showActual ? 130 : 160, total: 100,
    actQty: 80, actDisc: 66, actObs: 130, actTotal: 100,
    del: canEdit ? 34 : 0,
  }

  const fixedCols = `${W.dept}px ${W.code}px ${W.name}px ${W.unit}px ${W.price}px`
  const solCols = `${W.qty}px ${W.disc}px ${W.obs}px ${W.total}px`
  const actCols = showActual ? `${W.actQty}px ${W.actDisc}px ${W.actObs}px ${W.actTotal}px` : ''
  const delCol = canEdit ? `${W.del}px` : ''
  const gridTemplate = [fixedCols, solCols, actCols, delCol].filter(Boolean).join(' ')

  const SOL_COLOR = '#6B46C1'
  const ACT_COLOR = '#059669'

  const TH: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#94a3b8',
    letterSpacing: '0.07em', padding: '5px 6px',
    background: '#f8fafc', whiteSpace: 'nowrap',
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Grid Items</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{rows.length} partida{rows.length !== 1 ? 's' : ''}</span>
          {canEdit && <Tag color="purple">Editando valores solicitados</Tag>}
          {canEditActual && <Tag color="green">Editando valores reales</Tag>}
          {!anyEditable && <Tag>Solo lectura</Tag>}
          {dirty && (
            <span style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <WarningOutlined style={{ fontSize: 10 }} /> Sin guardar
            </span>
          )}
          {!dirty && rows.length > 0 && (
            <span style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircleOutlined style={{ fontSize: 10 }} /> Al día
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canEdit && (
            <Button icon={<PlusOutlined />} size="small"
              onClick={() => { setShowAddRow(v => !v); setAddSearch('') }}
              style={{ borderColor: SOL_COLOR, color: SOL_COLOR }}
            >
              Agregar recurso
            </Button>
          )}
          {anyEditable && (
            <Button type="primary" icon={<SaveOutlined />} size="small"
              disabled={!dirty} loading={saveLoading}
              onClick={handleSave}
              style={{ background: canEditActual ? ACT_COLOR : SOL_COLOR, borderColor: canEditActual ? ACT_COLOR : SOL_COLOR }}
            >
              {canEditActual ? 'Guardar valores reales' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Add resource panel ── */}
      {canEdit && showAddRow && (
        <div style={{
          background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 8,
          padding: '10px 14px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <PlusOutlined style={{ color: SOL_COLOR, flexShrink: 0 }} />
          {plLoading ? <Spin size="small" /> : (
            <Select
              autoFocus showSearch style={{ flex: 1, maxWidth: 560 }}
              placeholder="Buscar recurso por nombre, código o departamento..."
              filterOption={false}
              onSearch={setAddSearch}
              onSelect={(val) => { if (val) addResource(val as string) }}
              value={null}
              notFoundContent={addSearch.length < 1 ? 'Escribe para buscar...' : 'Sin resultados'}
              dropdownStyle={{ minWidth: 480 }}
            >
              {addOptions.map((pi: any) => (
                <Select.Option key={pi.resourceId} value={pi.resourceId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{pi.resource?.name}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>{pi.resource?.code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: SOL_COLOR, background: '#f3e8ff', padding: '1px 6px', borderRadius: 4 }}>
                        {pi.resource?.department?.name ?? '—'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {formatMoney(Number(pi.price ?? 0), 'MXN')}
                      </span>
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          )}
          <Button type="text" size="small" icon={<CloseOutlined />}
            onClick={() => setShowAddRow(false)} style={{ color: '#94a3b8', flexShrink: 0 }} />
        </div>
      )}

      {/* ── Grid ── */}
      <div ref={gridRef} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflowX: 'auto' }}>

        {/* Group headers (Solicitado / Real) */}
        <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, borderBottom: '1px solid #e2e8f0', minWidth: 700 }}>
          {/* Fixed cols spacer */}
          <div style={{ gridColumn: `span 5`, background: '#f8fafc', borderRight: `2px solid #e9d5ff` }} />
          {/* Solicitado */}
          <div style={{
            gridColumn: 'span 4',
            background: `${SOL_COLOR}0d`, borderRight: showActual ? `2px solid ${ACT_COLOR}33` : 'none',
            padding: '4px 8px', fontSize: 10, fontWeight: 800,
            color: SOL_COLOR, letterSpacing: '0.1em', textAlign: 'center',
          }}>
            SOLICITADO
          </div>
          {/* Real */}
          {showActual && (
            <div style={{
              gridColumn: 'span 4',
              background: `${ACT_COLOR}0d`,
              borderRight: canEdit ? `1px solid #e2e8f0` : 'none',
              padding: '4px 8px', fontSize: 10, fontWeight: 800,
              color: ACT_COLOR, letterSpacing: '0.1em', textAlign: 'center',
            }}>
              REAL
            </div>
          )}
          {canEdit && <div style={{ background: '#f8fafc' }} />}
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, borderBottom: '2px solid #e2e8f0', minWidth: 700, position: 'sticky', top: 0, zIndex: 2 }}>
          {[
            { label: 'DEPTO.',   align: 'left',   style: { borderRight: '2px solid #e9d5ff' } },
            { label: 'CÓDIGO',   align: 'left'   },
            { label: 'RECURSO',  align: 'left'   },
            { label: 'U.',       align: 'center' },
            { label: 'P. UNIT.', align: 'right',  style: { borderRight: '2px solid #e9d5ff' } },
            // Sol cols
            { label: 'CANT.',    align: 'right',  style: { background: `${SOL_COLOR}06` } },
            { label: 'DESC. %',  align: 'right',  style: { background: `${SOL_COLOR}06` } },
            { label: 'OBS.',     align: 'left',   style: { background: `${SOL_COLOR}06` } },
            { label: 'TOTAL',    align: 'right',  style: { background: `${SOL_COLOR}06`, borderRight: showActual ? `2px solid ${ACT_COLOR}33` : 'none' } },
            // Act cols
            ...(showActual ? [
              { label: 'CANT. REAL',   align: 'right', style: { background: `${ACT_COLOR}06` } },
              { label: 'DESC. % REAL', align: 'right', style: { background: `${ACT_COLOR}06` } },
              { label: 'OBS. REAL',    align: 'left',  style: { background: `${ACT_COLOR}06` } },
              { label: 'TOTAL REAL',   align: 'right', style: { background: `${ACT_COLOR}06`, borderRight: canEdit ? '1px solid #e2e8f0' : 'none' } },
            ] : []),
            ...(canEdit ? [{ label: '', align: 'center' }] : []),
          ].map((h, i) => (
            <div key={i} style={{ ...TH, textAlign: h.align as any, ...(h.style ?? {}) }}>
              {h.label}
            </div>
          ))}
        </div>

        {/* Empty */}
        {rows.length === 0 && (
          <div style={{ padding: '52px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Sin partidas.{canEdit ? ' Usa "Agregar recurso" para comenzar.' : ''}
          </div>
        )}

        {/* Rows by dept */}
        {Object.entries(deptGroups).map(([dept, deptRows]) => (
          <div key={dept} style={{ minWidth: 700 }}>

            {/* Dept separator */}
            <div style={{
              display: 'grid', gridTemplateColumns: `${W.dept}px 1fr`,
              background: '#f8f4ff', borderTop: '1px solid #ede9fe', borderBottom: '1px solid #ede9fe',
              padding: '3px 6px 3px 10px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: SOL_COLOR, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: '20px' }}>
                {dept}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', paddingRight: 8, lineHeight: '20px', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                <span>{deptRows.length} item{deptRows.length !== 1 ? 's' : ''}</span>
                <span style={{ color: SOL_COLOR, fontWeight: 600 }}>
                  Sol: {formatMoney(deptRows.reduce((s, r) => s + r.lineTotal, 0), 'MXN')}
                </span>
                {showActual && (
                  <span style={{ color: ACT_COLOR, fontWeight: 600 }}>
                    Real: {formatMoney(deptRows.reduce((s, r) => s + r.actualLineTotal, 0), 'MXN')}
                  </span>
                )}
              </div>
            </div>

            {/* Data rows */}
            {deptRows.map((row) => {
              const rowIdx = rows.indexOf(row)
              const isRowActive = editTarget?.rowIdx === rowIdx
              return (
                <div
                  key={row._key}
                  style={{
                    display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    background: isRowActive ? '#fdfbff' : undefined,
                    transition: 'background 0.1s', minHeight: 36,
                  }}
                  onMouseEnter={e => { if (!isRowActive) (e.currentTarget as HTMLElement).style.background = '#faf8ff' }}
                  onMouseLeave={e => { if (!isRowActive) (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  {/* Dept — blank in row (shown in separator) */}
                  <div style={{ borderRight: '2px solid #e9d5ff' }} />

                  {/* Código */}
                  <div style={{ padding: '2px 4px 2px 0', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.code}
                  </div>

                  {/* Nombre */}
                  <Tooltip title={row.name} mouseEnterDelay={0.6}>
                    <div style={{ padding: '2px 8px', fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name}
                    </div>
                  </Tooltip>

                  {/* Unidad */}
                  <div style={{ padding: '2px 4px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                    {row.unit}
                  </div>

                  {/* P. Unit */}
                  <div style={{ padding: '2px 6px', textAlign: 'right', fontSize: 13, color: '#374151', fontVariantNumeric: 'tabular-nums', borderRight: '2px solid #e9d5ff' }}>
                    {formatMoney(row.unitPrice, 'MXN')}
                  </div>

                  {/* ── Solicitado ── */}
                  <div style={{ padding: '2px 4px', background: `${SOL_COLOR}04` }}>
                    {renderCell(row, rowIdx, 'quantity')}
                  </div>
                  <div style={{ padding: '2px 4px', background: `${SOL_COLOR}04` }}>
                    {renderCell(row, rowIdx, 'discountPct')}
                  </div>
                  <div style={{ padding: '2px 4px', background: `${SOL_COLOR}04` }}>
                    {renderCell(row, rowIdx, 'observations')}
                  </div>
                  <div style={{
                    padding: '2px 8px', textAlign: 'right', fontSize: 13, fontWeight: 700,
                    color: '#1e293b', fontVariantNumeric: 'tabular-nums',
                    background: `${SOL_COLOR}04`,
                    borderRight: showActual ? `2px solid ${ACT_COLOR}33` : 'none',
                  }}>
                    {formatMoney(row.lineTotal, 'MXN')}
                  </div>

                  {/* ── Real ── */}
                  {showActual && <>
                    <div style={{ padding: '2px 4px', background: `${ACT_COLOR}04` }}>
                      {renderCell(row, rowIdx, 'actualQuantity')}
                    </div>
                    <div style={{ padding: '2px 4px', background: `${ACT_COLOR}04` }}>
                      {renderCell(row, rowIdx, 'actualDiscountPct')}
                    </div>
                    <div style={{ padding: '2px 4px', background: `${ACT_COLOR}04` }}>
                      {renderCell(row, rowIdx, 'actualObservations')}
                    </div>
                    <div style={{
                      padding: '2px 8px', textAlign: 'right', fontSize: 13, fontWeight: 700,
                      color: ACT_COLOR, fontVariantNumeric: 'tabular-nums',
                      background: `${ACT_COLOR}04`,
                      borderRight: canEdit ? '1px solid #e2e8f0' : 'none',
                    }}>
                      {formatMoney(row.actualLineTotal, 'MXN')}
                    </div>
                  </>}

                  {/* Delete */}
                  {canEdit && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Popconfirm title="¿Eliminar esta partida?" onConfirm={() => removeRow(row._key)}
                        okButtonProps={{ danger: true, size: 'small' }} cancelButtonProps={{ size: 'small' }}
                        okText="Eliminar" cancelText="No">
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: '4px 6px', borderRadius: 4, transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#e2e8f0'}
                        >
                          <DeleteOutlined style={{ fontSize: 12 }} />
                        </button>
                      </Popconfirm>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Footer */}
        {rows.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #e2e8f0', background: '#f8fafc', minWidth: 700 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {Object.entries(deptGroups).map(([dept, deptRows]) => (
                <div key={dept} style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{dept}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: SOL_COLOR, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                    {formatMoney(deptRows.reduce((s, r) => s + r.lineTotal, 0), 'MXN')}
                  </div>
                  {showActual && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: ACT_COLOR, fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(deptRows.reduce((s, r) => s + r.actualLineTotal, 0), 'MXN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 18px', background: `${SOL_COLOR}0f`, borderLeft: `2px solid ${SOL_COLOR}33`, minWidth: 130, textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: SOL_COLOR, fontWeight: 700, letterSpacing: '0.08em' }}>SUBTOTAL SOL.</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#4c1d95', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                {formatMoney(subtotalSol, 'MXN')}
              </div>
            </div>
            {showActual && (
              <div style={{ padding: '8px 18px', background: `${ACT_COLOR}0f`, borderLeft: `2px solid ${ACT_COLOR}33`, minWidth: 130, textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: ACT_COLOR, fontWeight: 700, letterSpacing: '0.08em' }}>SUBTOTAL REAL</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#065f46', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                  {formatMoney(subtotalAct, 'MXN')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      {anyEditable && rows.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            ['Tab', 'siguiente celda'], ['Enter', 'celda abajo'], ['↑↓←→', 'navegar'],
            ['Esc', 'cancelar'], ['Del', 'limpiar'], ['F2', 'editar'],
          ].map(([k, l]) => (
            <span key={k}><kbd style={kbdStyle}>{k}</kbd> {l}</span>
          ))}
        </div>
      )}

      {/* Sticky save bar */}
      {anyEditable && dirty && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', borderRadius: 10, padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 200,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)', border: '1px solid #334155',
        }}>
          <WarningOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {canEditActual ? 'Valores reales sin guardar' : 'Cambios sin guardar'}
          </span>
          <Button size="small" type="primary" icon={<SaveOutlined />}
            loading={saveLoading} onClick={handleSave}
            style={{ background: canEditActual ? ACT_COLOR : SOL_COLOR, borderColor: canEditActual ? ACT_COLOR : SOL_COLOR, fontWeight: 600 }}
          >
            Guardar
          </Button>
          <button
            onClick={() => { setRows((order?.lineItems ?? []).map(rowFromLineItem)); setDirty(false); setEditTarget(null) }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 3,
  padding: '1px 5px', fontSize: 10, fontFamily: 'monospace', color: '#475569',
}
