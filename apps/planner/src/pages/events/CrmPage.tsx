/**
 * CrmPage.tsx
 * Proveedores asignados al evento: cotizaciones, precios, estado
 * Persiste en localStorage: iventia-crm-{eventId}
 */
import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Button, Input, Select, Typography, Avatar, Popconfirm, App,
  Modal, Tag, InputNumber,
} from 'antd'
import {
  PlusOutlined, CloseOutlined, DeleteOutlined,
  ShopOutlined, SearchOutlined,
} from '@ant-design/icons'
import { suppliersApi } from '../../api/suppliers'

const { Text } = Typography

// ── Types ─────────────────────────────────────────────────────────────────────
interface CrmItem {
  id: string
  description: string
  qty: number
  unitPrice: number
}

interface CrmSupplier {
  id: string
  supplierId: string
  name: string
  category: string
  contactName: string
  email: string
  phone: string
  status: 'PENDIENTE' | 'COTIZADO' | 'CONFIRMADO' | 'RECHAZADO'
  quotedAmount: number
  notes: string
  items: CrmItem[]
  addedAt: string
}

interface CrmStore {
  suppliers: CrmSupplier[]
  updatedAt: string
}

interface SupplierDraft {
  status: 'PENDIENTE' | 'COTIZADO' | 'CONFIRMADO' | 'RECHAZADO'
  quotedAmount: number
  notes: string
  items: CrmItem[]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDIENTE:  { label: 'Pendiente',  color: '#F97316', bg: '#FFF7ED' },
  COTIZADO:   { label: 'Cotizado',   color: '#7C3AED', bg: '#F5F3FF' },
  CONFIRMADO: { label: 'Confirmado', color: '#059669', bg: '#ECFDF5' },
  RECHAZADO:  { label: 'Rechazado',  color: '#DC2626', bg: '#FEF2F2' },
} as const

const CATEGORY_LABELS: Record<string, string> = {
  CATERING: 'Catering', DECORATION: 'Decoración', PHOTOGRAPHY: 'Fotografía',
  MUSIC: 'Música / DJ', TRANSPORT: 'Transporte', VENUE: 'Espacio',
  AUDIO_VIDEO: 'Audio y Video', FLOWERS: 'Flores', OTHER: 'Otro',
}

const AVATAR_COLORS = ['#7C3AED', '#EC4899', '#F97316', '#0D9488', '#2563EB', '#059669']
function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ── Persistence ───────────────────────────────────────────────────────────────
function crmKey(eventId: string) { return `iventia-crm-${eventId}` }

function loadCrm(eventId: string): CrmStore {
  try {
    const raw = localStorage.getItem(crmKey(eventId))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { suppliers: [], updatedAt: '' }
}

function saveCrm(eventId: string, store: CrmStore) {
  try {
    localStorage.setItem(crmKey(eventId), JSON.stringify({ ...store, updatedAt: new Date().toISOString() }))
    window.dispatchEvent(new CustomEvent('iventia-crm-changed', { detail: { eventId } }))
  } catch { /* ignore */ }
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function supplierToDraft(s: CrmSupplier): SupplierDraft {
  return { status: s.status, quotedAmount: s.quotedAmount || 0, notes: s.notes || '', items: s.items || [] }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CrmPage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  const { message } = App.useApp()

  const [store, setStore] = useState<CrmStore>(() => loadCrm(eventId))
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [addSearch, setAddSearch] = useState('')

  // Panel
  const [selected, setSelected] = useState<CrmSupplier | null>(null)
  const [draft, setDraft] = useState<SupplierDraft | null>(null)
  const [dirty, setDirty] = useState(false)

  const openPanel = (s: CrmSupplier) => { setSelected(s); setDraft(supplierToDraft(s)); setDirty(false) }
  const closePanel = () => { setSelected(null); setDraft(null); setDirty(false) }
  const patchDraft = (patch: Partial<SupplierDraft>) => { setDraft(d => d ? { ...d, ...patch } : d); setDirty(true) }

  const { data: suppliersData } = useQuery({
    queryKey: ['planner-suppliers-catalog'],
    queryFn: () => suppliersApi.list({ pageSize: 500 }),
    enabled: addModal,
  })
  const catalogSuppliers: any[] = suppliersData?.data || []

  const save = (next: CrmStore) => { setStore(next); saveCrm(eventId, next) }

  const handleSavePanel = () => {
    if (!selected || !draft) return
    const itemsTotal = draft.items.reduce((t, i) => t + (i.qty || 0) * (i.unitPrice || 0), 0)
    const next = {
      ...store,
      suppliers: store.suppliers.map(s =>
        s.id === selected.id
          ? { ...s, status: draft.status, quotedAmount: draft.items.length > 0 ? itemsTotal : draft.quotedAmount, notes: draft.notes, items: draft.items }
          : s
      ),
    }
    save(next)
    setDirty(false)
    // Sync selected state
    const updated = next.suppliers.find(s => s.id === selected.id)
    if (updated) setSelected(updated)
    message.success('Proveedor actualizado')
  }

  const handleRemove = (sid: string) => {
    if (selected?.id === sid) closePanel()
    save({ ...store, suppliers: store.suppliers.filter(s => s.id !== sid) })
    message.success('Proveedor quitado del evento')
  }

  const handleAddSupplier = (apiSupplier: any) => {
    if (store.suppliers.find(s => s.supplierId === apiSupplier.id)) {
      message.warning('Este proveedor ya está en el evento')
      return
    }
    const entry: CrmSupplier = {
      id: `crm-${Date.now()}`,
      supplierId: apiSupplier.id,
      name: apiSupplier.companyName || apiSupplier.name || `${apiSupplier.firstName || ''} ${apiSupplier.lastName || ''}`.trim(),
      category: apiSupplier.category || '',
      contactName: apiSupplier.contactName || '',
      email: apiSupplier.email || '',
      phone: apiSupplier.phone || '',
      status: 'PENDIENTE',
      quotedAmount: 0,
      notes: '',
      items: [],
      addedAt: new Date().toISOString(),
    }
    const next = { ...store, suppliers: [...store.suppliers, entry] }
    save(next)
    setAddModal(false)
    setAddSearch('')
    message.success(`${entry.name} agregado`)
    openPanel(entry)
  }

  const addItem = () => {
    patchDraft({ items: [...(draft?.items || []), { id: `i-${Date.now()}`, description: '', qty: 1, unitPrice: 0 }] })
  }
  const updateItem = (idx: number, patch: Partial<CrmItem>) => {
    const items = [...(draft?.items || [])]
    items[idx] = { ...items[idx], ...patch }
    patchDraft({ items })
  }
  const removeItem = (idx: number) => {
    patchDraft({ items: (draft?.items || []).filter((_, i) => i !== idx) })
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return store.suppliers
    const q = search.toLowerCase()
    return store.suppliers.filter(s => s.name.toLowerCase().includes(q) || (CATEGORY_LABELS[s.category] || s.category).toLowerCase().includes(q))
  }, [store.suppliers, search])

  const totalQuoted = store.suppliers.reduce((s, x) => {
    const itemsT = x.items.reduce((t, i) => t + (i.qty || 0) * (i.unitPrice || 0), 0)
    return s + (itemsT || x.quotedAmount || 0)
  }, 0)
  const confirmed = store.suppliers.filter(s => s.status === 'CONFIRMADO')
  const totalConfirmed = confirmed.reduce((s, x) => {
    const itemsT = x.items.reduce((t, i) => t + (i.qty || 0) * (i.unitPrice || 0), 0)
    return s + (itemsT || x.quotedAmount || 0)
  }, 0)

  const filteredCatalog = catalogSuppliers.filter(s => {
    if (!addSearch.trim()) return true
    const name = (s.companyName || s.name || '').toLowerCase()
    return name.includes(addSearch.toLowerCase()) || (s.category || '').toLowerCase().includes(addSearch.toLowerCase())
  })

  // ── Edit Panel ──────────────────────────────────────────────────────────────
  const EditPanel = () => {
    if (!selected || !draft) return null
    const color = avatarColor(selected.id)
    const cfg = STATUS_CFG[draft.status] ?? STATUS_CFG.PENDIENTE
    const itemsTotal = draft.items.reduce((t, i) => t + (i.qty || 0) * (i.unitPrice || 0), 0)

    return (
      <div style={{
        width: 340, flexShrink: 0, borderLeft: '1px solid #EDE9FE',
        background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid #EDE9FE', background: '#FAFAFA',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={36} style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, flexShrink: 0 }} icon={<ShopOutlined />} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{selected.name}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{CATEGORY_LABELS[selected.category] || selected.category}</div>
            </div>
          </div>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel} style={{ color: '#aaa' }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
          {/* Contact */}
          {(selected.contactName || selected.email || selected.phone) && (
            <div style={{ marginBottom: 16, padding: '10px 12px', background: '#F5F3FF', borderRadius: 8 }}>
              {selected.contactName && <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>👤 {selected.contactName}</div>}
              {selected.email && <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>✉️ {selected.email}</div>}
              {selected.phone && <div style={{ fontSize: 11, color: '#555' }}>📞 {selected.phone}</div>}
            </div>
          )}

          {/* Status */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>ESTADO</div>
            <Select value={draft.status} onChange={v => patchDraft({ status: v })} style={{ width: '100%' }}>
              {Object.entries(STATUS_CFG).map(([k, c]) => (
                <Select.Option key={k} value={k}>
                  <span style={{ color: c.color, fontWeight: 600 }}>● {c.label}</span>
                </Select.Option>
              ))}
            </Select>
            <div style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
              background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600,
              padding: '3px 10px', borderRadius: 20,
            }}>
              {cfg.label}
            </div>
          </div>

          {/* Line items */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em' }}>PARTIDAS</div>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={addItem}
                style={{ color: '#7C3AED', padding: 0, height: 'auto', fontSize: 11 }}>
                Agregar
              </Button>
            </div>

            {draft.items.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '10px 0', color: '#ccc', fontSize: 11,
                fontStyle: 'italic', border: '1px dashed #EDE9FE', borderRadius: 8,
              }}>
                Clic en "Agregar" para detallar la cotización
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 68px 22px', gap: 4, marginBottom: 4 }}>
                  {['Descripción', 'Cant', 'P.Unit', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 9, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em' }}>{h}</div>
                  ))}
                </div>
                {draft.items.map((item, idx) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 68px 22px', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                    <Input
                      value={item.description}
                      onChange={e => updateItem(idx, { description: e.target.value })}
                      placeholder="Descripción"
                      size="small"
                      style={{ borderRadius: 6, fontSize: 11 }}
                    />
                    <InputNumber
                      value={item.qty} onChange={v => updateItem(idx, { qty: v || 0 })}
                      min={0} size="small" style={{ width: '100%', borderRadius: 6 }}
                    />
                    <InputNumber
                      value={item.unitPrice} onChange={v => updateItem(idx, { unitPrice: v || 0 })}
                      min={0} prefix="$" size="small" style={{ width: '100%', borderRadius: 6 }}
                    />
                    <Button type="text" size="small" icon={<DeleteOutlined />}
                      onClick={() => removeItem(idx)}
                      style={{ color: '#DC2626', padding: 0, height: 22, width: 22 }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #EDE9FE', paddingTop: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>
                    Total: {formatMoney(itemsTotal)}
                  </Text>
                </div>
              </div>
            )}
          </div>

          {/* Monto cotizado (manual, solo si no hay partidas) */}
          {draft.items.length === 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>MONTO COTIZADO</div>
              <InputNumber
                value={draft.quotedAmount}
                onChange={v => patchDraft({ quotedAmount: v || 0 })}
                min={0} prefix="$"
                style={{ width: '100%', borderRadius: 8 }}
                placeholder="0"
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>NOTAS</div>
            <Input.TextArea
              value={draft.notes}
              onChange={e => patchDraft({ notes: e.target.value })}
              rows={3}
              placeholder="Vigencia, condiciones de pago, observaciones..."
              style={{ borderRadius: 8, resize: 'none' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid #EDE9FE', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            type="primary" disabled={!dirty} onClick={handleSavePanel}
            style={{
              background: dirty ? '#059669' : undefined,
              borderColor: dirty ? '#059669' : undefined,
              borderRadius: 8, fontWeight: 600, width: '100%',
            }}
          >
            Guardar cambios
          </Button>
          <Popconfirm
            title="¿Quitar este proveedor del evento?"
            onConfirm={() => handleRemove(selected.id)}
            okButtonProps={{ danger: true }}
            okText="Sí, quitar" cancelText="Cancelar"
          >
            <Button danger style={{ borderRadius: 8, width: '100%' }}>
              Quitar del evento
            </Button>
          </Popconfirm>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7FF' }}>

      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EDE9FE',
        padding: '16px 28px', flexShrink: 0,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <Text style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>Proveedores del evento</Text>
          <br />
          <Text style={{ fontSize: 12, color: '#aaa' }}>
            {store.suppliers.length} proveedores · {confirmed.length} confirmados
            {totalQuoted > 0 && ` · ${formatMoney(totalQuoted)} cotizado total`}
          </Text>
        </div>
        <Button
          type="primary" icon={<PlusOutlined />}
          onClick={() => setAddModal(true)}
          style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, fontWeight: 600 }}
        >
          Agregar proveedor
        </Button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'TOTAL',      value: store.suppliers.length,                                           color: '#7C3AED' },
              { label: 'CONFIRMADOS', value: confirmed.length,                                                 color: '#059669' },
              { label: 'COTIZADOS',  value: store.suppliers.filter(s => s.status === 'COTIZADO').length,      color: '#D97706' },
              { label: 'PENDIENTES', value: store.suppliers.filter(s => s.status === 'PENDIENTE').length,     color: '#F97316' },
            ].map(k => (
              <div key={k.label} style={{
                background: '#fff', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #EDE9FE', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: '0.14em', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: k.color, lineHeight: 1.05 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <Input
            placeholder="Buscar proveedor..."
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280, borderRadius: 10, marginBottom: 16 }}
            allowClear
          />

          {/* Empty state */}
          {store.suppliers.length === 0 && (
            <div style={{
              background: '#fff', borderRadius: 16, border: '2px dashed #DDD6FE',
              padding: '64px 20px', textAlign: 'center',
            }}>
              <ShopOutlined style={{ fontSize: 48, color: '#C4B5FD', display: 'block', marginBottom: 12 }} />
              <Text strong style={{ fontSize: 16, color: '#555', display: 'block', marginBottom: 8 }}>
                Sin proveedores asignados al evento
              </Text>
              <Text style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 16 }}>
                Agrega proveedores del catálogo y registra sus cotizaciones y precios
              </Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}
                style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}>
                Agregar primer proveedor
              </Button>
            </div>
          )}

          {/* Supplier list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(s => {
              const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.PENDIENTE
              const color = avatarColor(s.id)
              const isSelected = selected?.id === s.id
              const itemsT = s.items.reduce((t, i) => t + (i.qty || 0) * (i.unitPrice || 0), 0)
              const displayAmt = itemsT || s.quotedAmount

              return (
                <div
                  key={s.id}
                  onClick={() => openPanel(s)}
                  style={{
                    background: '#fff', borderRadius: 12, padding: '14px 18px',
                    border: isSelected ? '2px solid #7C3AED' : '1px solid #EDE9FE',
                    boxShadow: isSelected ? '0 0 0 3px #EDE9FE' : '0 1px 4px rgba(0,0,0,0.04)',
                    cursor: 'pointer', transition: 'all 0.12s',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#fff' }}
                >
                  <Avatar size={40} style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, flexShrink: 0 }} icon={<ShopOutlined />} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Text strong style={{ fontSize: 14 }}>{s.name}</Text>
                      {s.category && (
                        <Tag style={{ fontSize: 10, borderRadius: 20, border: 'none', background: '#F5F3FF', color: '#7C3AED' }}>
                          {CATEGORY_LABELS[s.category] || s.category}
                        </Tag>
                      )}
                    </div>
                    <Text style={{ fontSize: 11, color: '#888' }}>
                      {s.contactName || s.email || '—'}
                      {s.items.length > 0 && ` · ${s.items.length} partidas`}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    {displayAmt > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{formatMoney(displayAmt)}</div>
                        <div style={{ fontSize: 10, color: '#aaa' }}>cotizado</div>
                      </div>
                    )}
                    <span style={{
                      background: cfg.bg, color: cfg.color,
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Confirmed total */}
          {confirmed.length > 0 && (
            <div style={{
              marginTop: 16, padding: '12px 18px',
              background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>Total confirmado</Text>
              <Text style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{formatMoney(totalConfirmed)}</Text>
            </div>
          )}
        </div>

        {/* Right panel */}
        <EditPanel />
      </div>

      {/* Add modal */}
      <Modal
        title="Agregar proveedor al evento"
        open={addModal}
        onCancel={() => { setAddModal(false); setAddSearch('') }}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Input
          placeholder="Buscar en catálogo..."
          prefix={<SearchOutlined />}
          value={addSearch}
          onChange={e => setAddSearch(e.target.value)}
          style={{ marginBottom: 16, borderRadius: 10 }}
          allowClear
        />
        <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredCatalog.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '32px 0' }}>
              {addSearch ? 'Sin resultados' : 'Cargando catálogo...'}
            </div>
          ) : filteredCatalog.map(s => {
            const name = s.companyName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim()
            const already = store.suppliers.some(x => x.supplierId === s.id)
            const color = avatarColor(s.id)
            return (
              <div
                key={s.id}
                onClick={() => !already && handleAddSupplier(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, border: '1px solid #EDE9FE',
                  cursor: already ? 'default' : 'pointer',
                  opacity: already ? 0.5 : 1,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = '#F5F3FF' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
              >
                <Avatar size={36} style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }} icon={<ShopOutlined />} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {CATEGORY_LABELS[s.category] || s.category || '—'}
                    {s.email && ` · ${s.email}`}
                  </div>
                </div>
                {already
                  ? <Tag color="green" style={{ borderRadius: 20 }}>Ya agregado</Tag>
                  : <Button type="primary" size="small" icon={<PlusOutlined />}
                      style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8 }}>
                      Agregar
                    </Button>
                }
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
