/**
 * ContratosPage.tsx
 * Contratos y calendario de pagos — cotización, contrato, pagos, PDF profesional
 * Persiste via usePlannerStore → PlannerStore backend
 */
import { useState, useMemo } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { usePlannerStore } from '../../hooks/usePlannerStore'
import {
  Button, Modal, Form, Input, InputNumber, Select, Space, DatePicker,
  Popconfirm, App, Typography, Divider, Tag, Steps, Tooltip, Radio,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined,
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined,
  FileTextOutlined, CopyOutlined, PrinterOutlined, SendOutlined,
  ExclamationCircleOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

const { Text, Title } = Typography
const { TextArea } = Input

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClientInfo {
  companyName: string
  firstName: string
  lastName: string
  rfc: string
  email: string
  phone: string
  address: string
  personType: 'PHYSICAL' | 'MORAL'
}

interface ContractItem {
  id: string
  chapterId: string
  chapterName: string
  concept: string
  quantity: number
  unit: string
  unitPrice: number
  status: string
}

interface ScheduledPayment {
  id: string
  label: string
  dueDate: string
  percentage: number
  amount: number
  status: 'PENDIENTE' | 'PAGADO' | 'VENCIDO'
  paidDate?: string
  paidAmount?: number
  reference?: string
  method?: string
}

type ContractStatus = 'BORRADOR' | 'COTIZACION' | 'CONTRATO' | 'FIRMADO' | 'CANCELADO'

interface ContractStore {
  contractNumber: string
  status: ContractStatus
  client: ClientInfo
  items: ContractItem[]
  payments: ScheduledPayment[]
  totalAmount: number
  currency: string
  terms: string
  notes: string
  paymentModel: string
  authorizedBy: string
  authorizedAt: string
  signedAt: string
  createdAt: string
  updatedAt: string
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_CLIENT: ClientInfo = {
  companyName: '', firstName: '', lastName: '', rfc: '',
  email: '', phone: '', address: '', personType: 'PHYSICAL',
}

const DEFAULT_STORE: ContractStore = {
  contractNumber: '', status: 'BORRADOR', client: { ...DEFAULT_CLIENT },
  items: [], payments: [], totalAmount: 0, currency: 'MXN',
  terms: `1. El presente contrato entrará en vigor a partir de la fecha de firma.\n2. Los pagos deberán realizarse en las fechas establecidas en el calendario de pagos.\n3. En caso de cancelación, se retendrá el anticipo como penalización.\n4. Cualquier servicio adicional no contemplado será cotizado por separado.\n5. El organizador se reserva el derecho de modificar proveedores manteniendo la calidad pactada.`,
  notes: '', paymentModel: '', authorizedBy: '', authorizedAt: '',
  signedAt: '', createdAt: '', updatedAt: '',
}

// ── Payment models ────────────────────────────────────────────────────────────
const PAYMENT_MODELS = [
  {
    key: '50-50',
    label: '50 / 50',
    desc: 'Anticipo 50% + Liquidación 50%',
    splits: [
      { label: 'Anticipo', pct: 50, offsetDays: 0 },
      { label: 'Liquidación', pct: 50, offsetDays: -7 },
    ],
  },
  {
    key: '40-30-30',
    label: '40 / 30 / 30',
    desc: 'Anticipo 40% + Segundo pago 30% + Liquidación 30%',
    splits: [
      { label: 'Anticipo', pct: 40, offsetDays: 0 },
      { label: 'Segundo pago', pct: 30, offsetDays: -30 },
      { label: 'Liquidación', pct: 30, offsetDays: -7 },
    ],
  },
  {
    key: '30-30-20-20',
    label: '30 / 30 / 20 / 20',
    desc: 'Anticipo 30% + 2do pago 30% + 3er pago 20% + Liquidación 20%',
    splits: [
      { label: 'Anticipo', pct: 30, offsetDays: 0 },
      { label: 'Segundo pago', pct: 30, offsetDays: -60 },
      { label: 'Tercer pago', pct: 20, offsetDays: -30 },
      { label: 'Liquidación', pct: 20, offsetDays: -7 },
    ],
  },
  {
    key: '100',
    label: 'Pago único',
    desc: 'Pago completo al firmar',
    splits: [
      { label: 'Pago total', pct: 100, offsetDays: 0 },
    ],
  },
]

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ContractStatus, { label: string; color: string; bg: string; step: number }> = {
  BORRADOR:   { label: 'Borrador',   color: '#6B7280', bg: '#F3F4F6', step: 0 },
  COTIZACION: { label: 'Cotización', color: '#D97706', bg: '#FFFBEB', step: 1 },
  CONTRATO:   { label: 'Contrato',   color: '#7C3AED', bg: '#F5F3FF', step: 2 },
  FIRMADO:    { label: 'Firmado',    color: '#059669', bg: '#ECFDF5', step: 3 },
  CANCELADO:  { label: 'Cancelado',  color: '#DC2626', bg: '#FEF2F2', step: -1 },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const uid = () => Math.random().toString(36).slice(2, 10)

// ── Component ─────────────────────────────────────────────────────────────────
export default function ContratosPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message, modal } = App.useApp()

  const { store, update, syncStatus, ready } = usePlannerStore<ContractStore>(
    eventId!, 'contrato', DEFAULT_STORE,
  )

  // Also read presupuesto and branding stores for import
  const { store: presupuesto, ready: presReady } = usePlannerStore<{
    chapters: { id: string; name: string; color: string }[]
    items: { id: string; chapterId: string; concept: string; quantity: number; unit: string; unitPrice: number; status: string }[]
  }>(eventId!, 'presupuesto', { chapters: [], items: [] })

  const { store: branding } = usePlannerStore<{
    primaryColor: string; secondaryColor: string; bannerUrl: string
    tagline: string; coverStyle: string; bgColor: string; textOnBg: string
  }>(eventId!, 'branding', {
    primaryColor: '#7C3AED', secondaryColor: '#EC4899', bannerUrl: '',
    tagline: '', coverStyle: 'gradient', bgColor: '#F5F3FF', textOnBg: '#ffffff',
  })

  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [paymentModelModal, setPaymentModelModal] = useState(false)
  const [paymentEditIdx, setPaymentEditIdx] = useState<number | null>(null)
  const [form] = Form.useForm()

  // ── Import items from presupuesto ─────────────────────────────────────────
  function importFromPresupuesto() {
    if (!presupuesto.items?.length) {
      message.warning('No hay items en el presupuesto')
      return
    }
    const activeItems = presupuesto.items.filter((i: any) => i.status !== 'CANCELLED')
    const chapterMap = Object.fromEntries(
      (presupuesto.chapters || []).map((c: any) => [c.id, c.name]),
    )
    const items: ContractItem[] = activeItems.map((i: any) => ({
      id: i.id,
      chapterId: i.chapterId,
      chapterName: chapterMap[i.chapterId] || 'Sin capítulo',
      concept: i.concept,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      status: i.status,
    }))
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    update({
      items,
      totalAmount,
      updatedAt: new Date().toISOString(),
    })
    message.success(`${items.length} conceptos importados del presupuesto`)
  }

  // ── Generate contract number ──────────────────────────────────────────────
  function generateContractNumber() {
    const year = new Date().getFullYear()
    const seq = String(Math.floor(Math.random() * 9000) + 1000)
    const code = event?.code || 'EVT'
    return `CTR-${code}-${year}-${seq}`
  }

  // ── Create contract from scratch ──────────────────────────────────────────
  function initContract() {
    const contractNumber = generateContractNumber()
    update({
      contractNumber,
      status: 'BORRADOR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    message.success('Contrato iniciado')
  }

  // ── Save client info ──────────────────────────────────────────────────────
  function handleSaveClient(values: ClientInfo) {
    update({ client: values, updatedAt: new Date().toISOString() })
    setClientModalOpen(false)
    message.success('Datos del cliente actualizados')
  }

  // ── Generate payment schedule ─────────────────────────────────────────────
  function generatePayments(modelKey: string) {
    const model = PAYMENT_MODELS.find(m => m.key === modelKey)
    if (!model) return
    const total = store.totalAmount
    const eventDate = event?.eventStart ? dayjs(event.eventStart) : dayjs().add(60, 'day')

    const payments: ScheduledPayment[] = model.splits.map((split, i) => {
      const dueDate = split.offsetDays === 0
        ? dayjs().add(3, 'day')  // anticipo: 3 days from now
        : eventDate.add(split.offsetDays, 'day')
      return {
        id: uid(),
        label: split.label,
        dueDate: dueDate.format('YYYY-MM-DD'),
        percentage: split.pct,
        amount: Math.round(total * split.pct / 100 * 100) / 100,
        status: 'PENDIENTE' as const,
      }
    })

    update({
      payments,
      paymentModel: modelKey,
      updatedAt: new Date().toISOString(),
    })
    setPaymentModelModal(false)
    message.success(`Calendario de pagos generado: ${model.label}`)
  }

  // ── Mark payment as paid ──────────────────────────────────────────────────
  function markPaymentPaid(idx: number) {
    const payments = [...store.payments]
    payments[idx] = {
      ...payments[idx],
      status: 'PAGADO',
      paidDate: new Date().toISOString().split('T')[0],
      paidAmount: payments[idx].amount,
    }
    update({ payments, updatedAt: new Date().toISOString() })
  }

  // ── Status transitions ────────────────────────────────────────────────────
  function advanceStatus() {
    const flow: ContractStatus[] = ['BORRADOR', 'COTIZACION', 'CONTRATO', 'FIRMADO']
    const idx = flow.indexOf(store.status)
    if (idx < 0 || idx >= flow.length - 1) return

    const next = flow[idx + 1]

    // Validations
    if (next === 'COTIZACION' && !store.items.length) {
      message.warning('Importa los conceptos del presupuesto primero')
      return
    }
    if (next === 'CONTRATO' && !store.payments.length) {
      message.warning('Genera el calendario de pagos primero')
      return
    }
    if (next === 'FIRMADO') {
      update({
        status: next,
        signedAt: new Date().toISOString(),
        authorizedBy: 'Organizador',
        authorizedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      message.success('Contrato firmado y autorizado')
      return
    }

    update({ status: next, updatedAt: new Date().toISOString() })
    message.success(`Estado avanzado a: ${STATUS_CFG[next].label}`)
  }

  // ── PDF Generation ────────────────────────────────────────────────────────
  function generatePDF(type: 'cotizacion' | 'contrato') {
    const c = store
    const b = branding
    const ev = event

    // Group items by chapter
    const grouped: Record<string, ContractItem[]> = {}
    for (const item of c.items) {
      const key = item.chapterName || 'General'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    }

    const isCotizacion = type === 'cotizacion'
    const title = isCotizacion ? 'COTIZACIÓN' : 'CONTRATO DE SERVICIOS'
    const subtitle = ev?.name || 'Evento'

    const paidTotal = c.payments
      .filter(p => p.status === 'PAGADO')
      .reduce((s, p) => s + (p.paidAmount || p.amount), 0)
    const pendingTotal = c.totalAmount - paidTotal

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${title} — ${subtitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1F2937; font-size: 11px; line-height: 1.5; }
  @page { size: letter; margin: 0; }

  .header {
    position: relative;
    height: 160px;
    background: ${b.bannerUrl
      ? `url(${b.bannerUrl}) center/cover`
      : `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})`};
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .header-overlay {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.4);
  }
  .header-content {
    position: relative; z-index: 1; text-align: center; color: #fff;
  }
  .header-content h1 { font-size: 28px; font-weight: 800; letter-spacing: 2px; margin-bottom: 4px; }
  .header-content p { font-size: 14px; font-weight: 400; opacity: 0.9; }

  .body { padding: 30px 40px; }

  .meta-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    margin-bottom: 24px;
  }
  .meta-box {
    background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px;
  }
  .meta-box h3 {
    font-size: 9px; font-weight: 700; color: ${b.primaryColor};
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
  }
  .meta-box p { font-size: 11px; line-height: 1.6; color: #374151; }

  .section-title {
    font-size: 13px; font-weight: 700; color: ${b.primaryColor};
    border-bottom: 2px solid ${b.primaryColor}; padding-bottom: 4px;
    margin: 24px 0 12px;
  }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th {
    background: ${b.primaryColor}; color: #fff; padding: 8px 10px;
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    text-align: left;
  }
  td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; font-size: 10.5px; }
  tr:nth-child(even) td { background: #F9FAFB; }

  .chapter-header td {
    background: ${b.primaryColor}10; font-weight: 700; color: ${b.primaryColor};
    font-size: 10px; border-bottom: 2px solid ${b.primaryColor}30;
  }

  .totals-box {
    background: linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor});
    color: #fff; border-radius: 10px; padding: 16px 20px;
    display: flex; justify-content: space-between; align-items: center;
    margin: 16px 0;
  }
  .totals-box .label { font-size: 11px; font-weight: 500; opacity: 0.9; }
  .totals-box .value { font-size: 22px; font-weight: 800; }

  .payment-table th { background: #059669; }
  .payment-status {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 9px; font-weight: 600;
  }
  .status-PAGADO { background: #ECFDF5; color: #059669; }
  .status-PENDIENTE { background: #FFFBEB; color: #D97706; }
  .status-VENCIDO { background: #FEF2F2; color: #DC2626; }

  .terms {
    background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px;
    padding: 16px; margin: 20px 0; font-size: 10px; line-height: 1.7; color: #4B5563;
  }

  .signatures {
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
    margin-top: 50px; padding-top: 20px;
  }
  .sig-line {
    border-top: 1px solid #1F2937; padding-top: 8px; text-align: center;
  }
  .sig-line .name { font-size: 11px; font-weight: 600; }
  .sig-line .role { font-size: 9px; color: #6B7280; }

  .footer {
    text-align: center; padding: 16px; font-size: 9px; color: #9CA3AF;
    border-top: 1px solid #E5E7EB; margin-top: 30px;
  }

  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 12px;
    font-size: 10px; font-weight: 700; margin-left: 8px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-overlay"></div>
  <div class="header-content">
    <h1>${title}</h1>
    <p>${subtitle}${b.tagline ? ` · ${b.tagline}` : ''}</p>
  </div>
</div>

<div class="body">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <div>
      <span style="font-size:13px;font-weight:700;color:${b.primaryColor};">
        ${c.contractNumber || 'Sin número'}
      </span>
      <span class="badge" style="background:${STATUS_CFG[c.status].bg};color:${STATUS_CFG[c.status].color};">
        ${STATUS_CFG[c.status].label}
      </span>
    </div>
    <div style="text-align:right;font-size:10px;color:#6B7280;">
      Fecha: ${dayjs().format('DD/MM/YYYY')}<br>
      ${ev?.eventStart ? `Evento: ${dayjs(ev.eventStart).format('DD MMM YYYY')}` : ''}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <h3>Organizador</h3>
      <p style="font-weight:600;">IventIA Planner</p>
      <p>${ev?.venueLocation || ''}</p>
    </div>
    <div class="meta-box">
      <h3>Cliente</h3>
      <p style="font-weight:600;">
        ${c.client.personType === 'MORAL' ? c.client.companyName : `${c.client.firstName} ${c.client.lastName}`}
      </p>
      <p>RFC: ${c.client.rfc || 'No especificado'}</p>
      <p>${c.client.email || ''} ${c.client.phone ? `· ${c.client.phone}` : ''}</p>
      ${c.client.address ? `<p>${c.client.address}</p>` : ''}
    </div>
  </div>

  <div class="section-title">Conceptos y servicios</div>
  <table>
    <thead>
      <tr>
        <th style="width:40%">Concepto</th>
        <th style="width:12%;text-align:center">Cantidad</th>
        <th style="width:10%;text-align:center">Unidad</th>
        <th style="width:18%;text-align:right">Precio unit.</th>
        <th style="width:20%;text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(grouped).map(([chapter, items]) => `
        <tr class="chapter-header"><td colspan="5">${chapter}</td></tr>
        ${items.map(i => `
          <tr>
            <td>${i.concept}</td>
            <td style="text-align:center">${i.quantity}</td>
            <td style="text-align:center">${i.unit}</td>
            <td style="text-align:right">${fmt(i.unitPrice)}</td>
            <td style="text-align:right">${fmt(i.quantity * i.unitPrice)}</td>
          </tr>
        `).join('')}
      `).join('')}
    </tbody>
  </table>

  <div class="totals-box">
    <div>
      <div class="label">TOTAL ${c.currency}</div>
      <div class="value">${fmt(c.totalAmount)}</div>
    </div>
    ${!isCotizacion ? `
    <div style="text-align:right;">
      <div class="label">Pagado: ${fmt(paidTotal)}</div>
      <div class="label">Pendiente: ${fmt(pendingTotal)}</div>
    </div>
    ` : ''}
  </div>

  ${!isCotizacion && c.payments.length ? `
  <div class="section-title">Calendario de pagos</div>
  <table class="payment-table">
    <thead>
      <tr>
        <th>Concepto</th>
        <th style="text-align:center">%</th>
        <th style="text-align:center">Fecha límite</th>
        <th style="text-align:right">Monto</th>
        <th style="text-align:center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${c.payments.map(p => `
        <tr>
          <td>${p.label}</td>
          <td style="text-align:center">${p.percentage}%</td>
          <td style="text-align:center">${dayjs(p.dueDate).format('DD MMM YYYY')}</td>
          <td style="text-align:right">${fmt(p.amount)}</td>
          <td style="text-align:center">
            <span class="payment-status status-${p.status}">${p.status}</span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  ${c.terms ? `
  <div class="section-title">Términos y condiciones</div>
  <div class="terms">${c.terms.replace(/\n/g, '<br>')}</div>
  ` : ''}

  ${c.notes ? `
  <div class="section-title">Notas</div>
  <div class="terms">${c.notes.replace(/\n/g, '<br>')}</div>
  ` : ''}

  ${!isCotizacion ? `
  <div class="signatures">
    <div class="sig-line">
      <div class="name">${c.client.personType === 'MORAL' ? c.client.companyName : `${c.client.firstName} ${c.client.lastName}`}</div>
      <div class="role">Cliente</div>
    </div>
    <div class="sig-line">
      <div class="name">${c.authorizedBy || 'Organizador'}</div>
      <div class="role">Organizador · IventIA Planner</div>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    Documento generado por IventIA Planner · ${dayjs().format('DD/MM/YYYY HH:mm')}
    ${c.contractNumber ? ` · ${c.contractNumber}` : ''}
  </div>
</div>

</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (w) {
      w.onload = () => {
        URL.revokeObjectURL(url)
        setTimeout(() => w.print(), 600)
      }
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const statusCfg = STATUS_CFG[store.status]
  const paidTotal = store.payments
    .filter(p => p.status === 'PAGADO')
    .reduce((s, p) => s + (p.paidAmount || p.amount), 0)
  const pendingTotal = store.totalAmount - paidTotal
  const hasContract = !!store.contractNumber

  const groupedItems = useMemo(() => {
    const g: Record<string, ContractItem[]> = {}
    for (const item of store.items) {
      const key = item.chapterName || 'General'
      if (!g[key]) g[key] = []
      g[key].push(item)
    }
    return g
  }, [store.items])

  // ── Check overdue payments ────────────────────────────────────────────────
  const paymentsWithOverdue = store.payments.map(p => {
    if (p.status === 'PENDIENTE' && dayjs(p.dueDate).isBefore(dayjs(), 'day')) {
      return { ...p, status: 'VENCIDO' as const }
    }
    return p
  })

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <div>Cargando contrato…</div>
        </div>
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!hasContract) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: '#F8F7FF' }}>
        <div style={{
          maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 20px',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 36, color: '#fff',
          }}>
            <FileTextOutlined />
          </div>
          <Title level={3} style={{ color: '#1F2937', marginBottom: 8 }}>
            Contrato y calendario de pagos
          </Title>
          <Text style={{ color: '#6B7280', fontSize: 14, display: 'block', marginBottom: 24 }}>
            Crea un contrato profesional con la información del cliente,
            los conceptos del presupuesto y un calendario de pagos automatizado.
          </Text>
          <Space direction="vertical" size={12}>
            <Button type="primary" size="large" icon={<PlusOutlined />}
              onClick={initContract}
              style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 10, height: 44 }}>
              Crear contrato
            </Button>
            <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
              Se importarán automáticamente los datos del presupuesto
            </Text>
          </Space>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#F8F7FF' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(248,247,255,0.92)', backdropFilter: 'blur(12px)',
        padding: '14px 24px', borderBottom: '1px solid #EDE9FE',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}>
            <FileTextOutlined />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
              {store.contractNumber}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              {event?.name || 'Evento'}
            </div>
          </div>
          <Tag color={statusCfg.color} style={{ borderRadius: 10, fontWeight: 600 }}>
            {statusCfg.label}
          </Tag>
        </div>

        <Space size={8}>
          {syncStatus === 'saving' && (
            <Text style={{ fontSize: 11, color: '#D97706' }}>Guardando…</Text>
          )}
          {syncStatus === 'saved' && (
            <Text style={{ fontSize: 11, color: '#059669' }}>Guardado</Text>
          )}
          <Tooltip title="Generar cotización PDF">
            <Button icon={<PrinterOutlined />} onClick={() => generatePDF('cotizacion')}
              style={{ borderRadius: 8 }}>Cotización</Button>
          </Tooltip>
          {store.status !== 'BORRADOR' && (
            <Tooltip title="Generar contrato PDF">
              <Button icon={<FilePdfOutlined />} onClick={() => generatePDF('contrato')}
                type="primary" style={{ borderRadius: 8, background: '#7C3AED', borderColor: '#7C3AED' }}>
                Contrato PDF
              </Button>
            </Tooltip>
          )}
          {store.status !== 'FIRMADO' && store.status !== 'CANCELADO' && (
            <Button type="primary" icon={<CheckCircleOutlined />}
              onClick={advanceStatus}
              style={{ borderRadius: 8, background: '#059669', borderColor: '#059669' }}>
              {store.status === 'BORRADOR' ? 'Pasar a cotización' :
               store.status === 'COTIZACION' ? 'Generar contrato' :
               'Firmar contrato'}
            </Button>
          )}
        </Space>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Status stepper */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '16px 24px',
          border: '1px solid #EDE9FE', marginBottom: 20,
        }}>
          <Steps current={STATUS_CFG[store.status].step} size="small"
            items={[
              { title: 'Borrador', icon: <EditOutlined /> },
              { title: 'Cotización', icon: <SendOutlined /> },
              { title: 'Contrato', icon: <FileTextOutlined /> },
              { title: 'Firmado', icon: <SafetyCertificateOutlined /> },
            ]}
          />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Client info */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '18px 20px',
            border: '1px solid #EDE9FE',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>
                Datos del cliente
              </Text>
              <Button type="link" size="small" icon={<EditOutlined />}
                onClick={() => {
                  form.setFieldsValue(store.client)
                  setClientModalOpen(true)
                }}>
                Editar
              </Button>
            </div>
            {store.client.firstName || store.client.companyName ? (
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {store.client.personType === 'MORAL'
                    ? store.client.companyName
                    : `${store.client.firstName} ${store.client.lastName}`}
                </div>
                {store.client.rfc && <div style={{ color: '#6B7280' }}>RFC: {store.client.rfc}</div>}
                {store.client.email && <div style={{ color: '#6B7280' }}>{store.client.email}</div>}
                {store.client.phone && <div style={{ color: '#6B7280' }}>{store.client.phone}</div>}
                {store.client.address && <div style={{ color: '#6B7280' }}>{store.client.address}</div>}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#aaa', fontSize: 12 }}>
                Sin datos de cliente — haz clic en Editar para agregar
              </div>
            )}
          </div>

          {/* Event info + totals */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '18px 20px',
            border: '1px solid #EDE9FE',
          }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', display: 'block', marginBottom: 12 }}>
              Resumen financiero
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'TOTAL', value: fmt(store.totalAmount), color: '#7C3AED' },
                { label: 'PAGADO', value: fmt(paidTotal), color: '#059669' },
                { label: 'PENDIENTE', value: fmt(pendingTotal), color: pendingTotal > 0 ? '#D97706' : '#059669' },
              ].map(k => (
                <div key={k.label} style={{
                  background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 4 }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#6B7280' }}>
              {event?.name && <div>Evento: <b>{event.name}</b></div>}
              {event?.eventStart && <div>Fecha: {dayjs(event.eventStart).format('DD MMM YYYY')}</div>}
              {event?.venueLocation && <div>Lugar: {event.venueLocation}</div>}
            </div>
          </div>
        </div>

        {/* Items table */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '18px 20px',
          border: '1px solid #EDE9FE', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>
              Conceptos ({store.items.length})
            </Text>
            <Button size="small" icon={<CopyOutlined />} onClick={importFromPresupuesto}
              style={{ borderRadius: 8 }}>
              {store.items.length ? 'Re-importar' : 'Importar'} del presupuesto
            </Button>
          </div>

          {store.items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F5F3FF' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>Concepto</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>Cant.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>Unidad</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>Precio unit.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedItems).map(([chapter, items]) => (
                    <>
                      <tr key={`ch-${chapter}`}>
                        <td colSpan={5} style={{
                          padding: '6px 10px', fontWeight: 700, fontSize: 11,
                          color: '#7C3AED', background: '#FAF5FF',
                          borderBottom: '2px solid #EDE9FE',
                        }}>
                          {chapter}
                        </td>
                      </tr>
                      {items.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '7px 10px' }}>{item.concept}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>{item.unit}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>
                            {fmt(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #7C3AED' }}>
                    <td colSpan={4} style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#7C3AED' }}>
                      TOTAL
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#7C3AED' }}>
                      {fmt(store.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 12 }}>
              Sin conceptos — importa del presupuesto para comenzar
            </div>
          )}
        </div>

        {/* Payment Calendar */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '18px 20px',
          border: '1px solid #EDE9FE', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
              Calendario de pagos
              {store.paymentModel && (
                <span style={{ fontWeight: 400, color: '#6B7280', marginLeft: 8, fontSize: 11 }}>
                  Modelo: {PAYMENT_MODELS.find(m => m.key === store.paymentModel)?.label}
                </span>
              )}
            </Text>
            <Button size="small" icon={<DollarOutlined />}
              onClick={() => setPaymentModelModal(true)}
              style={{ borderRadius: 8, borderColor: '#059669', color: '#059669' }}>
              {store.payments.length ? 'Cambiar modelo' : 'Generar calendario'}
            </Button>
          </div>

          {paymentsWithOverdue.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paymentsWithOverdue.map((p, idx) => {
                const isPaid = p.status === 'PAGADO'
                const isOverdue = p.status === 'VENCIDO'
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10,
                    background: isPaid ? '#F0FDF4' : isOverdue ? '#FEF2F2' : '#FFFBEB',
                    border: `1px solid ${isPaid ? '#BBF7D0' : isOverdue ? '#FECDD3' : '#FDE68A'}`,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isPaid ? '#059669' : isOverdue ? '#DC2626' : '#D97706',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, flexShrink: 0,
                    }}>
                      {isPaid ? <CheckCircleOutlined /> : isOverdue ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        {dayjs(p.dueDate).format('DD MMM YYYY')} · {p.percentage}%
                        {p.paidDate && ` · Pagado: ${dayjs(p.paidDate).format('DD MMM YYYY')}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: isPaid ? '#059669' : '#1F2937' }}>
                        {fmt(p.amount)}
                      </div>
                      <Tag color={isPaid ? 'green' : isOverdue ? 'red' : 'orange'} style={{ marginRight: 0, borderRadius: 8 }}>
                        {p.status}
                      </Tag>
                    </div>
                    {!isPaid && (
                      <Popconfirm title="¿Marcar como pagado?"
                        onConfirm={() => markPaymentPaid(idx)}>
                        <Button size="small" type="primary"
                          style={{ borderRadius: 8, background: '#059669', borderColor: '#059669' }}>
                          Pagado
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 12 }}>
              {store.totalAmount > 0
                ? 'Genera un calendario de pagos para este contrato'
                : 'Importa conceptos del presupuesto primero'}
            </div>
          )}
        </div>

        {/* Terms & Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '18px 20px',
            border: '1px solid #EDE9FE',
          }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', display: 'block', marginBottom: 10 }}>
              Términos y condiciones
            </Text>
            <TextArea rows={6} value={store.terms}
              onChange={e => update({ terms: e.target.value })}
              style={{ borderRadius: 8, fontSize: 12 }}
              placeholder="Escribe los términos y condiciones del contrato..." />
          </div>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '18px 20px',
            border: '1px solid #EDE9FE',
          }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', display: 'block', marginBottom: 10 }}>
              Notas adicionales
            </Text>
            <TextArea rows={6} value={store.notes}
              onChange={e => update({ notes: e.target.value })}
              style={{ borderRadius: 8, fontSize: 12 }}
              placeholder="Notas internas o instrucciones especiales..." />
          </div>
        </div>

        {/* Danger zone */}
        {store.status !== 'CANCELADO' && (
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Popconfirm title="¿Cancelar este contrato?" description="Esta acción no se puede deshacer"
              onConfirm={() => {
                update({ status: 'CANCELADO', updatedAt: new Date().toISOString() })
                message.info('Contrato cancelado')
              }}>
              <Button danger type="text" size="small">Cancelar contrato</Button>
            </Popconfirm>
          </div>
        )}
      </div>

      {/* ── Client Modal ─────────────────────────────────────────────────────── */}
      <Modal title="Datos del cliente" open={clientModalOpen}
        onCancel={() => setClientModalOpen(false)}
        onOk={() => form.validateFields().then(handleSaveClient)}
        okText="Guardar" width={520}>
        <Form form={form} layout="vertical" size="small"
          initialValues={store.client}>
          <Form.Item name="personType" label="Tipo de persona">
            <Radio.Group>
              <Radio value="PHYSICAL">Física</Radio>
              <Radio value="MORAL">Moral</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.personType !== cur.personType}>
            {({ getFieldValue }) => getFieldValue('personType') === 'MORAL' ? (
              <Form.Item name="companyName" label="Razón social" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            ) : null}
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Apellido">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="rfc" label="RFC">
            <Input placeholder="XAXX010101000" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Teléfono">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Dirección">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Payment Model Modal ──────────────────────────────────────────────── */}
      <Modal title="Modelo de calendario de pagos" open={paymentModelModal}
        onCancel={() => setPaymentModelModal(false)} footer={null} width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
          {store.totalAmount <= 0 && (
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
              padding: 12, fontSize: 12, color: '#92400E', marginBottom: 8,
            }}>
              Importa los conceptos del presupuesto primero para calcular los montos.
            </div>
          )}
          {PAYMENT_MODELS.map(model => (
            <div key={model.key}
              onClick={() => store.totalAmount > 0 && generatePayments(model.key)}
              style={{
                border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px',
                cursor: store.totalAmount > 0 ? 'pointer' : 'not-allowed',
                opacity: store.totalAmount > 0 ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (store.totalAmount > 0) e.currentTarget.style.borderColor = '#7C3AED' }}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1F2937', marginBottom: 4 }}>
                {model.label}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                {model.desc}
              </div>
              {store.totalAmount > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {model.splits.map((s, i) => (
                    <Tag key={i} color="purple" style={{ borderRadius: 8 }}>
                      {s.label}: {fmt(Math.round(store.totalAmount * s.pct / 100 * 100) / 100)} ({s.pct}%)
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
