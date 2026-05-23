/**
 * OrderGridItemsTab — Excel-like editable grid for order line items.
 *
 * Navigation:
 *   Click cell        → enters edit immediately
 *   Tab / Shift+Tab   → commits and moves right / left across editable cols
 *   Enter             → commits and moves down one row (same col)
 *   Arrow keys        → navigate between cells when not editing
 *   Escape            → cancel edit, restore previous value
 *   Del / Backspace   → clear numeric cell while focused (not editing)
 *   F2                → enter edit mode from navigation focus
 *   Ctrl+Enter (last) → adds a new resource row
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Select, Tooltip, Spin, Button, Popconfirm } from 'antd'
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
  unitPrice: number
  quantity: number
  discountPct: number
  observations: string
  lineTotal: number
}

type EditCol = 'quantity' | 'discountPct' | 'observations'
const EDIT_COLS: EditCol[] = ['quantity', 'discountPct', 'observations']

interface EditTarget { rowIdx: number; col: EditCol }

interface Props {
  order: any
  canEdit: boolean
  orderId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcTotal(r: GridRow) {
  const eff = r.timeUnit?.endsWith('sin factor') ? 1 : (r.factor || 1)
  return r.unitPrice * r.quantity * eff * (1 - (r.discountPct || 0) / 100)
}

function rowFromLineItem(li: any): GridRow {
  const r: GridRow = {
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
    observations: li.observations ?? '',
    lineTotal: Number(li.lineTotal),
  }
  return r
}

function getColValue(row: GridRow, col: EditCol): string | number {
  if (col === 'quantity') return row.quantity
  if (col === 'discountPct') return row.discountPct
  return row.observations
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function OrderGridItemsTab({ order, canEdit, orderId }: Props) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [rows, setRows] = useState<GridRow[]>([])
  const [dirty, setDirty] = useState(false)

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [draft, setDraft] = useState<string | number>('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // ── Resource search state ───────────────────────────────────────────────────
  const [showAddRow, setShowAddRow] = useState(false)
  const [addSearch, setAddSearch] = useState('')

  // ── Init rows from order ────────────────────────────────────────────────────
  useEffect(() => {
    if (order?.lineItems) {
      setRows((order.lineItems as any[]).map(rowFromLineItem))
      setDirty(false)
      setEditTarget(null)
    }
  }, [order])

  // Focus input when editTarget changes
  useEffect(() => {
    if (editTarget) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
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

  // ── Save mutation ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
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
      message.success('Cambios guardados')
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Error al guardar'),
  })

  // ── Row helpers ─────────────────────────────────────────────────────────────
  const applyRowPatch = useCallback((key: string, patch: Partial<GridRow>) => {
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r
      const updated = { ...r, ...patch }
      updated.lineTotal = calcTotal(updated)
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
  const startEdit = useCallback((rowIdx: number, col: EditCol, overrideValue?: string | number) => {
    if (!canEdit) return
    const row = rows[rowIdx]
    if (!row) return
    const val = overrideValue !== undefined ? overrideValue : getColValue(row, col)
    setEditTarget({ rowIdx, col })
    setDraft(val)
  }, [canEdit, rows])

  const commitEdit = useCallback((nextTarget?: EditTarget | null) => {
    if (!editTarget) return
    const { rowIdx, col } = editTarget
    const row = rows[rowIdx]
    if (row) {
      let value: string | number = draft
      if (col !== 'observations') {
        value = draft === '' ? 0 : Number(draft)
        if (isNaN(value as number)) value = getColValue(row, col) as number
        if (col === 'discountPct') value = Math.max(0, Math.min(100, value as number))
        if (col === 'quantity') value = Math.max(0, value as number)
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

  const cancelEdit = useCallback(() => {
    setEditTarget(null)
  }, [])

  // Navigate: Tab/Shift+Tab/Enter/arrows
  const navigate = useCallback((direction: 'tab' | 'shifttab' | 'enter' | 'up' | 'down' | 'left' | 'right') => {
    if (!editTarget) return
    const { rowIdx, col } = editTarget
    const colIdx = EDIT_COLS.indexOf(col)
    let nextRowIdx = rowIdx
    let nextColIdx = colIdx

    if (direction === 'tab') {
      if (colIdx < EDIT_COLS.length - 1) nextColIdx = colIdx + 1
      else { nextRowIdx = rowIdx + 1; nextColIdx = 0 }
    } else if (direction === 'shifttab') {
      if (colIdx > 0) nextColIdx = colIdx - 1
      else { nextRowIdx = rowIdx - 1; nextColIdx = EDIT_COLS.length - 1 }
    } else if (direction === 'enter' || direction === 'down') {
      nextRowIdx = rowIdx + 1
    } else if (direction === 'up') {
      nextRowIdx = rowIdx - 1
    } else if (direction === 'right') {
      nextColIdx = Math.min(colIdx + 1, EDIT_COLS.length - 1)
    } else if (direction === 'left') {
      nextColIdx = Math.max(colIdx - 1, 0)
    }

    // Clamp
    if (nextRowIdx < 0) nextRowIdx = 0
    if (nextRowIdx >= rows.length) {
      // Past last row on Tab: open add-row
      commitEdit(null)
      if (direction === 'tab') { setShowAddRow(true); setAddSearch('') }
      return
    }

    const nextCol = EDIT_COLS[nextColIdx]
    commitEdit({ rowIdx: nextRowIdx, col: nextCol })
  }, [editTarget, rows.length, commitEdit])

  // ── Keyboard handler for grid container (when no cell is editing) ────────────
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editTarget) return // handled by input
    if (!canEdit) return
    // Arrow keys when a row is "hovered" — no row focus tracking needed for now
  }, [editTarget, canEdit])

  // ── Input keyboard handler ──────────────────────────────────────────────────
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      navigate(e.shiftKey ? 'shifttab' : 'tab')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      navigate('enter')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }, [navigate, cancelEdit])

  // ── Add resource ────────────────────────────────────────────────────────────
  const addResource = useCallback((resourceId: string) => {
    const pi = plItems.find((p: any) => p.resourceId === resourceId)
    if (!pi) return
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
      unitPrice: Number(pi.price ?? pi.unitPrice ?? 0),
      quantity: 1,
      discountPct: 0,
      observations: '',
      lineTotal: Number(pi.price ?? pi.unitPrice ?? 0),
    }
    setRows(prev => {
      const next = [...prev, newRow]
      return next
    })
    setDirty(true)
    setShowAddRow(false)
    setAddSearch('')
    // After state update, focus quantity of new row
    requestAnimationFrame(() => {
      setRows(prev => {
        const idx = prev.findIndex(r => r._key === newRow._key)
        if (idx >= 0) {
          setEditTarget({ rowIdx: idx, col: 'quantity' })
          setDraft(1)
        }
        return prev
      })
    })
  }, [plItems])

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0)
  const deptGroups = useMemo(() => {
    const g: Record<string, GridRow[]> = {}
    rows.forEach(r => { if (!g[r.dept]) g[r.dept] = []; g[r.dept].push(r) })
    return g
  }, [rows])

  // ── Cell renderer ───────────────────────────────────────────────────────────
  function renderCell(row: GridRow, rowIdx: number, col: EditCol) {
    const isActive = editTarget?.rowIdx === rowIdx && editTarget?.col === col
    const value = getColValue(row, col)
    const isMoney = col === 'quantity' || col === 'discountPct'

    const cellStyle: React.CSSProperties = {
      position: 'relative',
      outline: isActive ? '2px solid #6B46C1' : 'none',
      outlineOffset: -2,
      borderRadius: 3,
      background: isActive ? '#faf5ff' : 'transparent',
      cursor: canEdit ? 'cell' : 'default',
      userSelect: 'none',
    }

    if (isActive && canEdit) {
      // Render input
      const isText = col === 'observations'
      return (
        <div style={cellStyle}>
          <input
            ref={inputRef}
            type={isText ? 'text' : 'number'}
            value={String(draft)}
            step={col === 'discountPct' ? '0.1' : '1'}
            min={col === 'discountPct' ? '0' : col === 'quantity' ? '0' : undefined}
            max={col === 'discountPct' ? '100' : undefined}
            onChange={e => setDraft(isText ? e.target.value : e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={() => commitEdit(null)}
            onFocus={e => e.target.select()}
            style={{
              width: '100%', border: 'none', outline: 'none',
              background: 'transparent', fontSize: 13,
              padding: '3px 6px', fontFamily: 'inherit',
              textAlign: isText ? 'left' : 'right',
              color: '#1e293b',
            }}
          />
        </div>
      )
    }

    // Display mode
    const display = col === 'observations'
      ? (String(value) || '')
      : col === 'discountPct'
      ? `${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
      : Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
      <div
        style={cellStyle}
        onClick={() => startEdit(rowIdx, col, value)}
        onFocus={() => startEdit(rowIdx, col, value)}
        tabIndex={canEdit ? 0 : -1}
        onKeyDown={e => {
          if (!canEdit) return
          if (e.key === 'F2' || e.key === 'Enter') { e.preventDefault(); startEdit(rowIdx, col, value) }
          if ((e.key === 'Delete' || e.key === 'Backspace') && isMoney) {
            e.preventDefault()
            applyRowPatch(row._key, { [col]: 0 })
          }
          if (e.key === 'ArrowRight') { e.preventDefault(); startEdit(rowIdx, EDIT_COLS[Math.min(EDIT_COLS.indexOf(col)+1, EDIT_COLS.length-1)]) }
          if (e.key === 'ArrowLeft')  { e.preventDefault(); startEdit(rowIdx, EDIT_COLS[Math.max(EDIT_COLS.indexOf(col)-1, 0)]) }
          if (e.key === 'ArrowDown')  { e.preventDefault(); if (rowIdx < rows.length-1) startEdit(rowIdx+1, col) }
          if (e.key === 'ArrowUp')    { e.preventDefault(); if (rowIdx > 0) startEdit(rowIdx-1, col) }
          if (e.key === 'Tab') {
            e.preventDefault()
            setEditTarget({ rowIdx, col })
            setDraft(value)
            navigate(e.shiftKey ? 'shifttab' : 'tab')
          }
        }}
      >
        <span style={{
          display: 'block', padding: '4px 6px',
          fontSize: 13,
          color: col === 'discountPct' && Number(value) > 0 ? '#d97706'
               : col === 'observations' ? '#64748b'
               : '#1e293b',
          textAlign: col === 'observations' ? 'left' : 'right',
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {col === 'observations' && !String(value) && canEdit
            ? <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>Observación...</span>
            : display}
        </span>
      </div>
    )
  }

  // ── Column widths ───────────────────────────────────────────────────────────
  const cols = {
    dept: 100, code: 72, name: 210, unit: 52,
    price: 96, qty: 88, disc: 72, total: 108, obs: 170,
    del: canEdit ? 36 : 0,
  }
  const gridCols = `${cols.dept}px ${cols.code}px ${cols.name}px ${cols.unit}px ${cols.price}px ${cols.qty}px ${cols.disc}px ${cols.total}px ${cols.obs}px${canEdit ? ` ${cols.del}px` : ''}`

  const TH: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#94a3b8',
    letterSpacing: '0.08em', padding: '7px 6px',
    background: '#f8fafc', userSelect: 'none',
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'inherit' }} onKeyDown={handleGridKeyDown}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Grid Items</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{rows.length} partida{rows.length !== 1 ? 's' : ''}</span>
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
            <>
              <Button
                icon={<PlusOutlined />}
                size="small"
                onClick={() => { setShowAddRow(v => !v); setAddSearch('') }}
                style={{ borderColor: '#6B46C1', color: '#6B46C1' }}
              >
                Agregar recurso
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="small"
                disabled={!dirty}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(rows)}
                style={{ background: '#6B46C1', borderColor: '#6B46C1' }}
              >
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Add resource search panel ── */}
      {canEdit && showAddRow && (
        <div style={{
          background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 8,
          padding: '10px 14px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <PlusOutlined style={{ color: '#6B46C1', fontSize: 14, flexShrink: 0 }} />
          {plLoading ? <Spin size="small" /> : (
            <Select
              autoFocus
              showSearch
              style={{ flex: 1, maxWidth: 560 }}
              placeholder="Buscar recurso por nombre, código o departamento..."
              filterOption={false}
              onSearch={setAddSearch}
              onSelect={(val) => { if (val) addResource(val as string) }}
              value={null}
              notFoundContent={addSearch.length < 1 ? 'Escribe para buscar...' : 'Sin resultados'}
              dropdownStyle={{ minWidth: 480 }}
              size="middle"
            >
              {addOptions.map((pi: any) => (
                <Select.Option key={pi.resourceId} value={pi.resourceId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{pi.resource?.name}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>{pi.resource?.code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: '#6B46C1', background: '#f3e8ff', padding: '1px 6px', borderRadius: 4 }}>
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
          <Button
            type="text" size="small" icon={<CloseOutlined />}
            onClick={() => setShowAddRow(false)}
            style={{ color: '#94a3b8', flexShrink: 0 }}
          />
        </div>
      )}

      {/* ── Grid ── */}
      <div
        ref={gridRef}
        style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '2px solid #e2e8f0', minWidth: 900, position: 'sticky', top: 0, zIndex: 2 }}>
          {[
            { label: 'DEPTO.',        align: 'left'   },
            { label: 'CÓDIGO',        align: 'left'   },
            { label: 'RECURSO',       align: 'left'   },
            { label: 'U.',            align: 'center' },
            { label: 'P. UNIT.',      align: 'right'  },
            { label: 'CANTIDAD',      align: 'right'  },
            { label: 'DESC. %',       align: 'right'  },
            { label: 'TOTAL',         align: 'right'  },
            { label: 'OBSERVACIONES', align: 'left'   },
            ...(canEdit ? [{ label: '', align: 'center' }] : []),
          ].map((h, i) => (
            <div key={i} style={{ ...TH, textAlign: h.align as any }}>
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

        {/* Rows grouped by dept */}
        {Object.entries(deptGroups).map(([dept, deptRows]) => (
          <div key={dept} style={{ minWidth: 900 }}>

            {/* Dept header */}
            <div style={{
              display: 'grid', gridTemplateColumns: `${cols.dept}px 1fr`,
              background: '#f8f4ff', borderTop: '1px solid #ede9fe', borderBottom: '1px solid #ede9fe',
              padding: '3px 6px 3px 10px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#6B46C1', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: '20px' }}>
                {dept}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', paddingRight: 8, lineHeight: '20px' }}>
                {deptRows.length} item{deptRows.length !== 1 ? 's' : ''}
                {' · '}
                <strong style={{ color: '#6B46C1' }}>
                  {formatMoney(deptRows.reduce((s, r) => s + r.lineTotal, 0), 'MXN')}
                </strong>
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
                    display: 'grid', gridTemplateColumns: gridCols,
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    background: isRowActive ? '#fdfbff' : undefined,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isRowActive) (e.currentTarget as HTMLElement).style.background = '#faf8ff' }}
                  onMouseLeave={e => { if (!isRowActive) (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  {/* Depto — blank (shown in separator) */}
                  <div />

                  {/* Código */}
                  <div style={{ padding: '6px 4px 6px 0', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.code}
                  </div>

                  {/* Nombre */}
                  <Tooltip title={row.name} mouseEnterDelay={0.6}>
                    <div style={{ padding: '6px 8px', fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name}
                    </div>
                  </Tooltip>

                  {/* Unidad */}
                  <div style={{ padding: '6px 4px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                    {row.unit}
                  </div>

                  {/* P. Unit — readonly */}
                  <div style={{ padding: '6px 6px', textAlign: 'right', fontSize: 13, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(row.unitPrice, 'MXN')}
                  </div>

                  {/* Cantidad — editable */}
                  <div style={{ padding: '2px 4px' }}>
                    {renderCell(row, rowIdx, 'quantity')}
                  </div>

                  {/* Desc% — editable */}
                  <div style={{ padding: '2px 4px' }}>
                    {renderCell(row, rowIdx, 'discountPct')}
                  </div>

                  {/* Total — calculated */}
                  <div style={{ padding: '6px 8px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(row.lineTotal, 'MXN')}
                  </div>

                  {/* Observaciones — editable */}
                  <div style={{ padding: '2px 4px' }}>
                    {renderCell(row, rowIdx, 'observations')}
                  </div>

                  {/* Delete */}
                  {canEdit && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Popconfirm
                        title="¿Eliminar esta partida?"
                        onConfirm={() => removeRow(row._key)}
                        okButtonProps={{ danger: true, size: 'small' }}
                        cancelButtonProps={{ size: 'small' }}
                        okText="Eliminar"
                        cancelText="No"
                      >
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

        {/* ── Footer totals ── */}
        {rows.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch',
            borderTop: '2px solid #e2e8f0', background: '#f8fafc', minWidth: 900,
          }}>
            {/* Dept subtotals */}
            <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden' }}>
              {Object.entries(deptGroups).map(([dept, deptRows], i) => (
                <div key={dept} style={{
                  padding: '8px 14px', borderRight: '1px solid #e2e8f0',
                  borderLeft: i === 0 ? 'none' : 'none',
                }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{dept}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6B46C1', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                    {formatMoney(deptRows.reduce((s, r) => s + r.lineTotal, 0), 'MXN')}
                  </div>
                </div>
              ))}
            </div>
            {/* Grand total */}
            <div style={{ padding: '8px 16px', minWidth: 130, textAlign: 'right', background: '#f3e8ff', borderLeft: '2px solid #d8b4fe' }}>
              <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.08em' }}>SUBTOTAL</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#4c1d95', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {formatMoney(subtotal, 'MXN')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation hint ── */}
      {canEdit && rows.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8', display: 'flex', gap: 12 }}>
          <span><kbd style={kbdStyle}>Tab</kbd> siguiente celda</span>
          <span><kbd style={kbdStyle}>Enter</kbd> celda abajo</span>
          <span><kbd style={kbdStyle}>↑↓←→</kbd> navegar</span>
          <span><kbd style={kbdStyle}>Esc</kbd> cancelar</span>
          <span><kbd style={kbdStyle}>Del</kbd> limpiar valor</span>
        </div>
      )}

      {/* ── Sticky save bar ── */}
      {canEdit && dirty && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', borderRadius: 10, padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 200,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)', border: '1px solid #334155',
        }}>
          <WarningOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Cambios sin guardar</span>
          <Button size="small" type="primary" icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate(rows)}
            style={{ background: '#6B46C1', borderColor: '#6B46C1', fontWeight: 600 }}
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
