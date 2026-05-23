/**
 * OrderGridItemsTab — inline editable grid for order line items.
 * Excel-like: click any cell to edit, Tab/Enter to advance.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Select, InputNumber, Tooltip, Spin, Button } from 'antd'
import {
  DeleteOutlined, PlusOutlined, SaveOutlined,
  CheckCircleOutlined, WarningOutlined,
} from '@ant-design/icons'
import { ordersApi } from '../../api/orders'
import { priceListsApi } from '../../api/priceLists'
import { formatMoney } from '../../utils/format'

// ── Types ──────────────────────────────────────────────────────────────────────
interface GridRow {
  _key: string           // local identifier
  id?: string            // DB id (undefined for new rows)
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
  isNew?: boolean
}

interface Props {
  order: any
  canEdit: boolean
  orderId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcTotal(unitPrice: number, quantity: number, discountPct: number, factor: number, timeUnit?: string) {
  const eff = timeUnit?.endsWith('sin factor') ? 1 : (factor || 1)
  return unitPrice * quantity * eff * (1 - (discountPct || 0) / 100)
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
    observations: li.observations ?? '',
    lineTotal: Number(li.lineTotal),
  }
}

// ── Inline cell ────────────────────────────────────────────────────────────────
function NumCell({
  value, min, max, precision = 2, suffix,
  onChange, disabled,
}: {
  value: number; min?: number; max?: number; precision?: number; suffix?: string
  onChange: (v: number) => void; disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  if (!disabled && editing) {
    return (
      <InputNumber
        autoFocus
        size="small"
        value={draft}
        min={min}
        max={max}
        precision={precision}
        style={{ width: '100%', minWidth: 64 }}
        onFocus={e => e.target.select()}
        onChange={v => setDraft(v ?? min ?? 0)}
        onBlur={() => { setEditing(false); onChange(draft) }}
        onPressEnter={() => { setEditing(false); onChange(draft) }}
        onKeyDown={e => { if (e.key === 'Escape') { setEditing(false); setDraft(value) } }}
        suffix={suffix}
      />
    )
  }

  return (
    <div
      onClick={() => { if (!disabled) { setDraft(value); setEditing(true) } }}
      style={{
        padding: '4px 8px', borderRadius: 4, cursor: disabled ? 'default' : 'text',
        background: editing ? '#fff' : 'transparent',
        border: disabled ? 'none' : '1px solid transparent',
        minWidth: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        fontSize: 13,
        ...(disabled ? { color: '#94a3b8' } : { ':hover': {} }),
      }}
      className={disabled ? '' : 'grid-cell-hover'}
    >
      {value.toLocaleString('es-MX', { minimumFractionDigits: Math.min(precision === 0 ? 0 : 2, precision), maximumFractionDigits: precision })}
      {suffix}
    </div>
  )
}

function TextCell({
  value, placeholder, onChange, disabled,
}: {
  value: string; placeholder?: string; onChange: (v: string) => void; disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  if (!disabled && editing) {
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onChange(draft) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { setEditing(false); onChange(draft) }
          if (e.key === 'Escape') { setEditing(false); setDraft(value) }
        }}
        style={{
          width: '100%', border: '1px solid #6B46C1', borderRadius: 4,
          padding: '3px 7px', fontSize: 12, outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => { if (!disabled) { setDraft(value); setEditing(true) } }}
      style={{
        padding: '4px 8px', borderRadius: 4, cursor: disabled ? 'default' : 'text',
        fontSize: 12, color: value ? '#374151' : '#d1d5db',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160,
      }}
    >
      {value || (disabled ? '' : placeholder)}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OrderGridItemsTab({ order, canEdit, orderId }: Props) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [rows, setRows] = useState<GridRow[]>([])
  const [dirty, setDirty] = useState(false)
  const [addSearch, setAddSearch] = useState('')

  // Init rows from order
  useEffect(() => {
    if (order?.lineItems) {
      setRows((order.lineItems as any[]).map(rowFromLineItem))
      setDirty(false)
    }
  }, [order])

  // Price list items for adding new resources
  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ['price-list', order?.priceListId],
    queryFn: () => priceListsApi.get(order!.priceListId),
    enabled: !!order?.priceListId && canEdit,
    staleTime: 60_000,
  })

  const plItems: any[] = useMemo(() => {
    const raw = plData?.data?.items ?? plData?.items ?? []
    return raw.filter((pi: any) => pi.resource && !pi.resource.isPackage === false ? true : !pi.resource?.isPackage)
  }, [plData])

  // Filtered options for add-row select
  const addOptions = useMemo(() => {
    const existingIds = new Set(rows.map(r => r.resourceId))
    const lower = addSearch.toLowerCase()
    return plItems
      .filter((pi: any) => !existingIds.has(pi.resourceId) &&
        (pi.resource?.name?.toLowerCase().includes(lower) || pi.resource?.code?.toLowerCase().includes(lower))
      )
      .slice(0, 60)
  }, [plItems, rows, addSearch])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => ordersApi.update(orderId, {
      lineItems: rows.map((r, idx) => ({
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

  const updateRow = useCallback((key: string, patch: Partial<GridRow>) => {
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r
      const updated = { ...r, ...patch }
      updated.lineTotal = calcTotal(updated.unitPrice, updated.quantity, updated.discountPct, updated.factor, updated.timeUnit)
      return updated
    }))
    setDirty(true)
  }, [])

  const removeRow = useCallback((key: string) => {
    setRows(prev => prev.filter(r => r._key !== key))
    setDirty(true)
  }, [])

  const addResource = useCallback((resourceId: string) => {
    const pi = plItems.find((p: any) => p.resourceId === resourceId)
    if (!pi) return
    const newRow: GridRow = {
      _key: `new-${Date.now()}`,
      isNew: true,
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
    setRows(prev => [...prev, newRow])
    setDirty(true)
    setAddSearch('')
  }, [plItems])

  // Totals
  const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0)

  // Dept groups for visual separation
  const deptGroups = useMemo(() => {
    const groups: Record<string, GridRow[]> = {}
    rows.forEach(r => {
      if (!groups[r.dept]) groups[r.dept] = []
      groups[r.dept].push(r)
    })
    return groups
  }, [rows])

  const COL_DEPT    = 110
  const COL_CODE    = 80
  const COL_NAME    = 200
  const COL_UNIT    = 60
  const COL_PRICE   = 100
  const COL_QTY     = 90
  const COL_DISC    = 70
  const COL_TOTAL   = 110
  const COL_OBS     = 160
  const COL_DEL     = 36

  const headerStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em',
    padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', userSelect: 'none',
  }

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
            Grid Items
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {rows.length} partida{rows.length !== 1 ? 's' : ''}
          </span>
          {dirty && (
            <span style={{ fontSize: 12, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <WarningOutlined style={{ fontSize: 11 }} /> Cambios sin guardar
            </span>
          )}
          {!dirty && rows.length > 0 && (
            <span style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircleOutlined style={{ fontSize: 11 }} /> Al día
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canEdit && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!dirty}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              style={{ background: '#6B46C1', borderColor: '#6B46C1', fontWeight: 600 }}
            >
              Guardar cambios
            </Button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${COL_DEPT}px ${COL_CODE}px ${COL_NAME}px ${COL_UNIT}px ${COL_PRICE}px ${COL_QTY}px ${COL_DISC}px ${COL_TOTAL}px ${COL_OBS}px ${canEdit ? COL_DEL + 'px' : ''}`,
          background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
          position: 'sticky', top: 0, zIndex: 2,
        }}>
          {[
            { label: 'DEPTO.', align: 'left' }, { label: 'CÓDIGO', align: 'left' },
            { label: 'RECURSO', align: 'left' }, { label: 'U.', align: 'center' },
            { label: 'P. UNIT.', align: 'right' }, { label: 'CANT.', align: 'right' },
            { label: 'DESC.%', align: 'right' }, { label: 'TOTAL', align: 'right' },
            { label: 'OBSERVACIONES', align: 'left' },
            ...(canEdit ? [{ label: '', align: 'center' }] : []),
          ].map((col, i) => (
            <div key={i} style={{ ...headerStyle, textAlign: col.align as any, paddingLeft: col.align === 'left' ? 12 : 8 }}>
              {col.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Sin items. {canEdit ? 'Agrega recursos con el buscador de abajo.' : ''}
          </div>
        ) : (
          Object.entries(deptGroups).map(([dept, deptRows]) => (
            <div key={dept}>
              {/* Dept separator */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `${COL_DEPT}px 1fr`,
                background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
                padding: '4px 12px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6B46C1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {dept}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', paddingRight: 8 }}>
                  {deptRows.length} item{deptRows.length !== 1 ? 's' : ''} · {formatMoney(deptRows.reduce((s, r) => s + r.lineTotal, 0), 'MXN')}
                </div>
              </div>

              {/* Data rows */}
              {deptRows.map((row, rowIdx) => {
                const isLast = rowIdx === deptRows.length - 1
                return (
                  <div
                    key={row._key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `${COL_DEPT}px ${COL_CODE}px ${COL_NAME}px ${COL_UNIT}px ${COL_PRICE}px ${COL_QTY}px ${COL_DISC}px ${COL_TOTAL}px ${COL_OBS}px ${canEdit ? COL_DEL + 'px' : ''}`,
                      alignItems: 'center',
                      borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#faf5ff'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    {/* Depto */}
                    <div style={{ padding: '0 8px 0 12px', fontSize: 11, color: '#6B46C1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {/* hidden in dept separator mode — keep blank */}
                    </div>

                    {/* Código */}
                    <div style={{ padding: '0 4px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                      {row.code}
                    </div>

                    {/* Recurso */}
                    <Tooltip title={row.name} mouseEnterDelay={0.8}>
                      <div style={{ padding: '0 4px', fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.name}
                      </div>
                    </Tooltip>

                    {/* Unidad */}
                    <div style={{ padding: '0 4px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                      {row.unit}
                    </div>

                    {/* P. Unit */}
                    <div style={{ padding: '2px 4px', textAlign: 'right' }}>
                      <span style={{ fontSize: 13, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(row.unitPrice, 'MXN')}
                      </span>
                    </div>

                    {/* Cantidad — editable */}
                    <div style={{ padding: '2px 4px' }}>
                      <NumCell
                        value={row.quantity}
                        min={0}
                        precision={2}
                        disabled={!canEdit}
                        onChange={v => updateRow(row._key, { quantity: v })}
                      />
                    </div>

                    {/* Desc% — editable */}
                    <div style={{ padding: '2px 4px' }}>
                      <NumCell
                        value={row.discountPct}
                        min={0}
                        max={100}
                        precision={1}
                        suffix="%"
                        disabled={!canEdit}
                        onChange={v => updateRow(row._key, { discountPct: v })}
                      />
                    </div>

                    {/* Total */}
                    <div style={{ padding: '0 8px 0 4px', textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(row.lineTotal, 'MXN')}
                      </span>
                    </div>

                    {/* Observaciones — editable */}
                    <div style={{ padding: '2px 4px' }}>
                      <TextCell
                        value={row.observations}
                        placeholder="Observación..."
                        disabled={!canEdit}
                        onChange={v => updateRow(row._key, { observations: v })}
                      />
                    </div>

                    {/* Delete */}
                    {canEdit && (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={() => removeRow(row._key)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px 6px', borderRadius: 4, transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#cbd5e1'}
                          title="Eliminar item"
                        >
                          <DeleteOutlined style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}

        {/* ── Add resource row ── */}
        {canEdit && (
          <div style={{ borderTop: '2px dashed #e2e8f0', padding: '8px 12px', background: '#fafafa' }}>
            {plLoading ? (
              <Spin size="small" />
            ) : (
              <Select
                showSearch
                placeholder={<span style={{ color: '#94a3b8' }}><PlusOutlined style={{ marginRight: 6 }} />Agregar recurso de la lista de precios...</span>}
                style={{ width: '100%', maxWidth: 520 }}
                filterOption={false}
                onSearch={setAddSearch}
                onSelect={(val) => { if (val) addResource(val as string) }}
                value={null}
                notFoundContent={addSearch.length < 1 ? 'Escribe para buscar...' : 'Sin resultados'}
                size="small"
                variant="borderless"
                dropdownStyle={{ minWidth: 420 }}
              >
                {addOptions.map((pi: any) => (
                  <Select.Option key={pi.resourceId} value={pi.resourceId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{pi.resource?.name}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>{pi.resource?.code}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: '#6B46C1', background: '#f4eeff', padding: '1px 6px', borderRadius: 4 }}>
                          {pi.resource?.department?.name ?? '—'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                          {formatMoney(Number(pi.price ?? 0), 'MXN')}
                        </span>
                      </div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            )}
          </div>
        )}

        {/* ── Footer totals ── */}
        {rows.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            padding: '8px 16px', background: '#f8fafc',
            borderTop: '2px solid #e2e8f0', gap: 24,
          }}>
            {Object.entries(deptGroups).map(([dept, deptRows]) => (
              <div key={dept} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em' }}>{dept}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#6B46C1', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(deptRows.reduce((s, r) => s + r.lineTotal, 0), 'MXN')}
                </div>
              </div>
            ))}
            <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em' }}>SUBTOTAL</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(subtotal, 'MXN')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky save bar when dirty ── */}
      {canEdit && dirty && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', borderRadius: 10, padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 200,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)', border: '1px solid #334155',
        }}>
          <WarningOutlined style={{ color: '#f59e0b', fontSize: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Tienes cambios sin guardar</span>
          <Button
            size="small" type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            style={{ background: '#6B46C1', borderColor: '#6B46C1', fontWeight: 600 }}
          >
            Guardar
          </Button>
          <button
            onClick={() => { setRows((order?.lineItems ?? []).map(rowFromLineItem)); setDirty(false) }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  )
}
