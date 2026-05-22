/**
 * InvitacionesPage.tsx
 * Gestión de invitaciones digitales: diseño, lista de invitados y envío
 * Persiste via usePlannerStore (API + localStorage)
 */
import { useState, useMemo } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { usePlannerStore } from '../../hooks/usePlannerStore'
import {
  Button, Input, Switch, Radio, App, Typography, Space, Tag, Modal, Form,
  Upload, Tabs, Popconfirm, Tooltip, Select,
} from 'antd'
import {
  PlusOutlined, SendOutlined, DownloadOutlined, UploadOutlined,
  CopyOutlined, WhatsAppOutlined, MailOutlined, EditOutlined, DeleteOutlined,
  CheckOutlined, ClockCircleOutlined, CloseCircleOutlined,
  EnvironmentOutlined, CalendarOutlined, UserOutlined,
} from '@ant-design/icons'
import ExcelJS from 'exceljs'
import { DEFAULT_BRANDING } from './EstudioPage'
import type { EventBranding } from './EstudioPage'

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
interface InvitacionDiseno {
  titulo: string
  subtitulo: string
  fechaTexto: string
  horaTexto: string
  lugarTexto: string
  lugarDireccion: string
  dresscode: string
  notasAdicionales: string
  imagenUrl: string
  incluirMapa: boolean
  modo: 'rsvp' | 'boleto'
  updatedAt: string
}

interface Invitado {
  id: string
  nombre: string
  numPersonas: number
  mesa?: string
  telefono?: string
  email?: string
  rsvp: 'pendiente' | 'confirmado' | 'declinado'
  boletosEnviados: boolean
  fechaRsvp?: string
  notas?: string
}

interface InvitadosStore {
  invitados: Invitado[]
  updatedAt: string
}

// ── Defaults ───────────────────────────────────────────────────────────────────
const DEFAULT_DISENO: InvitacionDiseno = {
  titulo: '',
  subtitulo: '',
  fechaTexto: '',
  horaTexto: '',
  lugarTexto: '',
  lugarDireccion: '',
  dresscode: '',
  notasAdicionales: '',
  imagenUrl: '',
  incluirMapa: false,
  modo: 'rsvp',
  updatedAt: '',
}

const DEFAULT_INVITADOS: InvitadosStore = {
  invitados: [],
  updatedAt: '',
}

// ── RSVP colors ───────────────────────────────────────────────────────────────
const RSVP_COLOR: Record<string, string> = {
  pendiente:  '#F97316',
  confirmado: '#059669',
  declinado:  '#DC2626',
}
const RSVP_LABEL: Record<string, string> = {
  pendiente:  'Pendiente',
  confirmado: 'Confirmado',
  declinado:  'Declinado',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function InvitacionesPage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  // Stores
  const { store: diseno, update: updateDiseno, saveNow: saveDiseno, syncStatus } =
    usePlannerStore<InvitacionDiseno>(eventId, 'invitacion-diseno', DEFAULT_DISENO)

  const { store: invitadosStore, update: updateInvitados, saveNow: saveInvitados } =
    usePlannerStore<InvitadosStore>(eventId, 'invitacion-invitados', DEFAULT_INVITADOS)

  const { store: branding } =
    usePlannerStore<EventBranding>(eventId, 'branding', DEFAULT_BRANDING, `iventia-branding-${eventId}`)

  // Guest modal state
  const [guestModal, setGuestModal] = useState<{ open: boolean; editing: Invitado | null }>({ open: false, editing: null })
  const [guestForm] = Form.useForm()

  // Send tab filter
  const [sendFilter, setSendFilter] = useState<'all' | 'pendiente' | 'confirmado' | 'no-enviado'>('all')

  // ── Patch design ────────────────────────────────────────────────────────────
  const patchDiseno = (patch: Partial<InvitacionDiseno>) => {
    updateDiseno({ ...diseno, ...patch, updatedAt: new Date().toISOString() })
  }

  // ── Guest CRUD ──────────────────────────────────────────────────────────────
  const openNewGuest = () => {
    guestForm.resetFields()
    guestForm.setFieldsValue({ numPersonas: 1, rsvp: 'pendiente', boletosEnviados: false })
    setGuestModal({ open: true, editing: null })
  }

  const openEditGuest = (g: Invitado) => {
    guestForm.setFieldsValue({ ...g })
    setGuestModal({ open: true, editing: g })
  }

  const saveGuest = (vals: any) => {
    const isEdit = !!guestModal.editing
    let nextInvitados: Invitado[]

    if (isEdit) {
      nextInvitados = invitadosStore.invitados.map(g =>
        g.id === guestModal.editing!.id ? { ...g, ...vals } : g
      )
    } else {
      const newGuest: Invitado = {
        id: `inv-${Date.now()}`,
        nombre: vals.nombre,
        numPersonas: vals.numPersonas || 1,
        mesa: vals.mesa || undefined,
        telefono: vals.telefono || undefined,
        email: vals.email || undefined,
        rsvp: vals.rsvp || 'pendiente',
        boletosEnviados: false,
        notas: vals.notas || undefined,
      }
      nextInvitados = [...invitadosStore.invitados, newGuest]
    }

    const newStore = { invitados: nextInvitados, updatedAt: new Date().toISOString() }
    updateInvitados(newStore)
    saveInvitados(newStore).catch(() => {})
    message.success(isEdit ? 'Invitado actualizado' : 'Invitado agregado')
    setGuestModal({ open: false, editing: null })
  }

  const deleteGuest = (id: string) => {
    const nextInvitados = invitadosStore.invitados.filter(g => g.id !== id)
    const newStore = { invitados: nextInvitados, updatedAt: new Date().toISOString() }
    updateInvitados(newStore)
    saveInvitados(newStore).catch(() => {})
    message.success('Invitado eliminado')
  }

  const markEnviado = (id: string) => {
    const nextInvitados = invitadosStore.invitados.map(g =>
      g.id === id ? { ...g, boletosEnviados: true } : g
    )
    const newStore = { invitados: nextInvitados, updatedAt: new Date().toISOString() }
    updateInvitados(newStore)
    saveInvitados(newStore).catch(() => {})
    message.success('Marcado como enviado')
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const invs = invitadosStore.invitados
    return {
      total:      invs.length,
      personas:   invs.reduce((s, g) => s + g.numPersonas, 0),
      confirmados: invs.filter(g => g.rsvp === 'confirmado').length,
      declinados:  invs.filter(g => g.rsvp === 'declinado').length,
      enviados:    invs.filter(g => g.boletosEnviados).length,
    }
  }, [invitadosStore.invitados])

  // ── Excel export ────────────────────────────────────────────────────────────
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Invitados')
    ws.columns = [
      { header: 'Nombre',       key: 'nombre',         width: 28 },
      { header: 'Num. Personas', key: 'numPersonas',   width: 14 },
      { header: 'Mesa',          key: 'mesa',           width: 12 },
      { header: 'Teléfono',      key: 'telefono',       width: 16 },
      { header: 'Email',         key: 'email',          width: 28 },
      { header: 'RSVP',          key: 'rsvp',           width: 14 },
      { header: 'Boleto Enviado', key: 'boletosEnviados', width: 16 },
      { header: 'Notas',         key: 'notas',          width: 30 },
    ]
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9D5FD' } }

    invitadosStore.invitados.forEach(g => {
      ws.addRow({
        nombre:          g.nombre,
        numPersonas:     g.numPersonas,
        mesa:            g.mesa || '',
        telefono:        g.telefono || '',
        email:           g.email || '',
        rsvp:            RSVP_LABEL[g.rsvp] || g.rsvp,
        boletosEnviados: g.boletosEnviados ? 'Sí' : 'No',
        notas:           g.notas || '',
      })
    })

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invitados-${eventId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    message.success('Lista exportada')
  }

  // ── Excel template ──────────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Invitados')
    ws.columns = [
      { header: 'Nombre',       key: 'nombre',     width: 28 },
      { header: 'Num. Personas', key: 'numPersonas', width: 14 },
      { header: 'Mesa',          key: 'mesa',        width: 12 },
      { header: 'Teléfono',      key: 'telefono',    width: 16 },
      { header: 'Email',         key: 'email',        width: 28 },
    ]
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9D5FD' } }
    ws.addRow({ nombre: 'Familia García', numPersonas: 3, mesa: '1', telefono: '+521234567890', email: 'familia@correo.com' })
    ws.addRow({ nombre: 'Luis Martínez',  numPersonas: 1, mesa: '2', telefono: '+521234567891', email: '' })
    ws.addRow({ nombre: 'Esther Buendía', numPersonas: 2, mesa: '1', telefono: '',              email: 'esther@correo.com' })

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-invitados.xlsx'
    a.click()
    URL.revokeObjectURL(url)
    message.success('Plantilla descargada')
  }

  // ── Excel import ────────────────────────────────────────────────────────────
  const importExcel = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buffer)
      const ws = wb.worksheets[0]
      if (!ws) { message.error('No se encontró hoja de cálculo'); return false }

      const newGuests: Invitado[] = []
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return // skip header
        const nombre = String(row.getCell(1).value || '').trim()
        if (!nombre) return
        newGuests.push({
          id:            `inv-import-${Date.now()}-${rowNum}`,
          nombre,
          numPersonas:   Number(row.getCell(2).value) || 1,
          mesa:          String(row.getCell(3).value || '').trim() || undefined,
          telefono:      String(row.getCell(4).value || '').trim() || undefined,
          email:         String(row.getCell(5).value || '').trim() || undefined,
          rsvp:          'pendiente',
          boletosEnviados: false,
        })
      })

      const nextInvitados = [...invitadosStore.invitados, ...newGuests]
      const newStore = { invitados: nextInvitados, updatedAt: new Date().toISOString() }
      updateInvitados(newStore)
      saveInvitados(newStore).catch(() => {})
      message.success(`${newGuests.length} invitados importados`)
    } catch {
      message.error('Error al leer el archivo Excel')
    }
    return false
  }

  // ── Copy link ───────────────────────────────────────────────────────────────
  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => message.success('Link copiado')).catch(() => message.error('No se pudo copiar'))
  }

  const guestLink = (guest: Invitado) => {
    const base = window.location.origin
    return diseno.modo === 'rsvp'
      ? `${base}/rsvp/${eventId}/${guest.id}`
      : `${base}/ticket/${eventId}/${guest.id}`
  }

  const whatsappLink = (guest: Invitado) => {
    if (!guest.telefono) return ''
    const link = guestLink(guest)
    const eventName = event?.name || 'el evento'
    const modeText = diseno.modo === 'rsvp'
      ? 'confirma tu asistencia en el siguiente link'
      : 'aquí tienes tu boleto de entrada (QR)'
    const text = `Hola ${guest.nombre}! Te invitamos a *${eventName}*.\n\nPor favor ${modeText}:\n${link}`
    return `https://wa.me/${guest.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
  }

  // ── Filtered guests for send tab ────────────────────────────────────────────
  const filteredForSend = useMemo(() => {
    const invs = invitadosStore.invitados
    if (sendFilter === 'pendiente')   return invs.filter(g => g.rsvp === 'pendiente')
    if (sendFilter === 'confirmado')  return invs.filter(g => g.rsvp === 'confirmado')
    if (sendFilter === 'no-enviado')  return invs.filter(g => !g.boletosEnviados)
    return invs
  }, [invitadosStore.invitados, sendFilter])

  // ── Sync status badge ───────────────────────────────────────────────────────
  const SyncBadge = () => {
    if (syncStatus === 'saving') return (
      <span style={{ fontSize: 11, color: '#F97316', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', display: 'inline-block', animation: 'pulse 1s infinite' }} />
        Guardando...
      </span>
    )
    if (syncStatus === 'saved') return (
      <span style={{ fontSize: 11, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
        <CheckOutlined style={{ fontSize: 10 }} /> Guardado
      </span>
    )
    return null
  }

  // ── Invitation preview ──────────────────────────────────────────────────────
  const InvitationPreview = () => {
    const bg = branding.bgColor || '#F5F3FF'
    const primary = branding.primaryColor || '#7C3AED'
    const secondary = branding.secondaryColor || '#EC4899'
    const textOnBg = branding.textOnBg || '#ffffff'
    const hasImage = !!diseno.imagenUrl
    const title = diseno.titulo || event?.name || 'Nombre del evento'
    const subtitle = diseno.subtitulo || ''

    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <div style={{
          width: 360,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          background: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {/* Header / Cover */}
          <div style={{
            height: 200,
            background: hasImage
              ? `url(${diseno.imagenUrl}) center/cover no-repeat`
              : `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '20px 24px',
            position: 'relative',
          }}>
            {hasImage && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.5) 100%)',
              }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%' }}>
              {subtitle && (
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500,
                  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
                }}>
                  {subtitle}
                </div>
              )}
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                {title}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', background: '#fff' }}>
            {/* Date row */}
            {diseno.fechaTexto && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${primary}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CalendarOutlined style={{ color: primary, fontSize: 15 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>FECHA</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{diseno.fechaTexto}</div>
                  {diseno.horaTexto && (
                    <div style={{ fontSize: 12, color: '#666' }}>{diseno.horaTexto}</div>
                  )}
                </div>
              </div>
            )}

            {/* Location row */}
            {diseno.lugarTexto && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${primary}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <EnvironmentOutlined style={{ color: primary, fontSize: 15 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>LUGAR</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{diseno.lugarTexto}</div>
                  {diseno.lugarDireccion && (
                    <div style={{ fontSize: 11, color: '#888' }}>{diseno.lugarDireccion}</div>
                  )}
                </div>
              </div>
            )}

            {/* Dresscode */}
            {diseno.dresscode && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${primary}10`, border: `1px solid ${primary}30`,
                borderRadius: 20, padding: '4px 12px', marginBottom: 12,
              }}>
                <UserOutlined style={{ color: primary, fontSize: 12 }} />
                <span style={{ fontSize: 12, color: primary, fontWeight: 600 }}>
                  Dress code: {diseno.dresscode}
                </span>
              </div>
            )}

            {/* Notes */}
            {diseno.notasAdicionales && (
              <div style={{
                fontSize: 12, color: '#666', fontStyle: 'italic',
                borderLeft: `3px solid ${primary}40`, paddingLeft: 10, marginBottom: 14,
              }}>
                {diseno.notasAdicionales}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0 16px' }} />

            {/* CTA Button */}
            <div style={{
              background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
              borderRadius: 12, padding: '13px 0', textAlign: 'center', cursor: 'pointer',
              boxShadow: `0 4px 15px ${primary}40`,
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {diseno.modo === 'rsvp' ? '✉️ Confirmar asistencia' : '🎫 Ver mi boleto QR'}
              </span>
            </div>

            {/* Map notice */}
            {diseno.incluirMapa && diseno.lugarDireccion && (
              <div style={{
                marginTop: 12, textAlign: 'center', fontSize: 11, color: '#aaa',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <EnvironmentOutlined style={{ fontSize: 11 }} />
                Se incluirá mapa de ubicación
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Tab 1: Diseño ───────────────────────────────────────────────────────────
  const DisenoTab = () => (
    <div style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden' }}>
      {/* Left: Form */}
      <div style={{
        width: '40%', flexShrink: 0,
        overflow: 'auto', padding: '24px 28px',
        borderRight: '1px solid #EDE9FE',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Contenido de la invitación</Text>
          <SyncBadge />
        </div>

        {/* Título */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>TÍTULO</div>
          <Input
            value={diseno.titulo}
            onChange={e => patchDiseno({ titulo: e.target.value })}
            placeholder={`Te invitamos a ${event?.name || '...'}`}
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Subtítulo */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>SUBTÍTULO</div>
          <Input
            value={diseno.subtitulo}
            onChange={e => patchDiseno({ subtitulo: e.target.value })}
            placeholder="La boda de Juan y María"
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Fecha / Hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>FECHA</div>
            <Input
              value={diseno.fechaTexto}
              onChange={e => patchDiseno({ fechaTexto: e.target.value })}
              placeholder="Sábado 14 de junio de 2025"
              style={{ borderRadius: 8 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>HORA</div>
            <Input
              value={diseno.horaTexto}
              onChange={e => patchDiseno({ horaTexto: e.target.value })}
              placeholder="19:00 hrs"
              style={{ borderRadius: 8 }}
            />
          </div>
        </div>

        {/* Lugar / Dirección */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>LUGAR</div>
          <Input
            value={diseno.lugarTexto}
            onChange={e => patchDiseno({ lugarTexto: e.target.value })}
            placeholder="Hacienda San Francisco"
            style={{ borderRadius: 8 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>DIRECCIÓN</div>
          <Input
            value={diseno.lugarDireccion}
            onChange={e => patchDiseno({ lugarDireccion: e.target.value })}
            placeholder="Calle Reforma #123, CDMX"
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Dresscode */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>DRESS CODE</div>
          <Input
            value={diseno.dresscode}
            onChange={e => patchDiseno({ dresscode: e.target.value })}
            placeholder="Etiqueta rigurosa"
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Notas */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>NOTAS ADICIONALES</div>
          <Input.TextArea
            value={diseno.notasAdicionales}
            onChange={e => patchDiseno({ notasAdicionales: e.target.value })}
            placeholder="Información adicional para los invitados..."
            rows={3}
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Imagen URL */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '0.05em' }}>URL DE IMAGEN DE PORTADA</div>
          <Input
            value={diseno.imagenUrl}
            onChange={e => patchDiseno({ imagenUrl: e.target.value })}
            placeholder="https://..."
            style={{ borderRadius: 8 }}
          />
          {diseno.imagenUrl && (
            <div style={{
              marginTop: 8, height: 80, borderRadius: 8, overflow: 'hidden',
              border: '1px solid #EDE9FE',
            }}>
              <img
                src={diseno.imagenUrl}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}
        </div>

        {/* Mapa switch */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Incluir mapa</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>Muestra el mapa de la ubicación en la invitación</div>
          </div>
          <Switch
            checked={diseno.incluirMapa}
            onChange={v => patchDiseno({ incluirMapa: v })}
            style={{ background: diseno.incluirMapa ? '#7C3AED' : undefined }}
          />
        </div>

        {/* Modo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, letterSpacing: '0.05em' }}>MODO DE INVITACIÓN</div>
          <Radio.Group
            value={diseno.modo}
            onChange={e => patchDiseno({ modo: e.target.value })}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'rsvp', label: 'RSVP', desc: 'Confirmar asistencia', emoji: '✉️' },
                { value: 'boleto', label: 'Boleto de entrada', desc: 'QR único por invitado', emoji: '🎫' },
              ].map(opt => (
                <Radio.Button
                  key={opt.value}
                  value={opt.value}
                  style={{
                    flex: 1, height: 'auto', padding: '10px 12px',
                    borderRadius: 10, textAlign: 'center',
                    borderColor: diseno.modo === opt.value ? '#7C3AED' : '#d9d9d9',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{opt.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{opt.desc}</div>
                </Radio.Button>
              ))}
            </div>
          </Radio.Group>
        </div>

        <Button
          type="primary"
          block
          onClick={() => saveDiseno({ ...diseno, updatedAt: new Date().toISOString() }).catch(() => {})}
          style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, height: 40, fontWeight: 600 }}
        >
          Guardar diseño
        </Button>
      </div>

      {/* Right: Preview */}
      <div style={{
        flex: 1, overflow: 'auto',
        background: '#F8F7FF',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #EDE9FE',
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Text style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>Vista previa · Invitación digital</Text>
          <Tag style={{ borderRadius: 20, fontSize: 11 }}>
            {diseno.modo === 'rsvp' ? '✉️ Modo RSVP' : '🎫 Modo Boleto'}
          </Tag>
        </div>
        <InvitationPreview />
        <div style={{ textAlign: 'center', paddingBottom: 24, fontSize: 11, color: '#ccc' }}>
          Los colores se toman del Estudio · Arte e IA
        </div>
      </div>
    </div>
  )

  // ── Tab 2: Lista de invitados ───────────────────────────────────────────────
  const ListaTab = () => {
    const invs = invitadosStore.invitados
    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '20px 28px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total invitados',  value: stats.total,      color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Total personas',   value: stats.personas,   color: '#0D9488', bg: '#F0FDFA' },
            { label: 'Confirmados',      value: stats.confirmados, color: '#059669', bg: '#F0FDF4' },
            { label: 'Declinados',       value: stats.declinados,  color: '#DC2626', bg: '#FEF2F2' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 12, padding: '16px 18px',
              border: `1px solid ${s.color}20`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={openNewGuest}
            style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, fontWeight: 600 }}
          >
            Agregar invitado
          </Button>
          <Upload
            accept=".xlsx"
            showUploadList={false}
            beforeUpload={importExcel}
          >
            <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Importar Excel</Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportExcel}
            disabled={invs.length === 0}
            style={{ borderRadius: 8 }}
          >
            Exportar lista
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
            style={{ borderRadius: 8, borderColor: '#EDE9FE', color: '#7C3AED' }}
          >
            Descargar plantilla
          </Button>
        </div>

        {/* Table */}
        {invs.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, border: '2px dashed #DDD6FE',
            padding: '64px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <Text strong style={{ fontSize: 16, color: '#555', display: 'block', marginBottom: 6 }}>Sin invitados</Text>
            <Text style={{ color: '#888', fontSize: 13 }}>Agrega invitados o importa desde Excel</Text>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE9FE', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 80px 80px 140px 180px 120px 110px 80px',
              padding: '8px 16px', background: '#FAFAFA', borderBottom: '1px solid #F0EBFF',
            }}>
              {['NOMBRE', 'N° PER.', 'MESA', 'TELÉFONO', 'EMAIL', 'RSVP', 'BOLETO', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em' }}>{h}</div>
              ))}
            </div>
            {invs.map(g => (
              <div
                key={g.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 80px 80px 140px 180px 120px 110px 80px',
                  padding: '10px 16px', borderBottom: '1px solid #FAF8FF',
                  alignItems: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAF8FF' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <div>
                  <Text style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{g.nombre}</Text>
                  {g.notas && <div style={{ fontSize: 11, color: '#aaa' }}>{g.notas}</div>}
                </div>
                <div style={{ fontSize: 13, color: '#555', textAlign: 'center' }}>{g.numPersonas}</div>
                <div style={{ fontSize: 13, color: '#555' }}>{g.mesa || '—'}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{g.telefono || '—'}</div>
                <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.email || '—'}</div>
                <div>
                  <Tag
                    style={{
                      background: `${RSVP_COLOR[g.rsvp]}15`,
                      border: `1px solid ${RSVP_COLOR[g.rsvp]}40`,
                      color: RSVP_COLOR[g.rsvp],
                      borderRadius: 20, fontWeight: 600, fontSize: 11,
                    }}
                  >
                    {RSVP_LABEL[g.rsvp]}
                  </Tag>
                </div>
                <div>
                  {g.boletosEnviados ? (
                    <Tag style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', borderRadius: 20, fontSize: 11 }}>
                      <CheckOutlined /> Enviado
                    </Tag>
                  ) : (
                    <Tag style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#F97316', borderRadius: 20, fontSize: 11 }}>
                      Pendiente
                    </Tag>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Tooltip title="Editar">
                    <Button type="text" size="small" icon={<EditOutlined />}
                      onClick={() => openEditGuest(g)}
                      style={{ color: '#7C3AED', padding: '0 6px' }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title={`¿Eliminar a ${g.nombre}?`}
                    onConfirm={() => deleteGuest(g.id)}
                    okButtonProps={{ danger: true }}
                    okText="Eliminar"
                  >
                    <Tooltip title="Eliminar">
                      <Button type="text" size="small" icon={<DeleteOutlined />}
                        style={{ color: '#DC2626', padding: '0 6px' }}
                      />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Tab 3: Envío ────────────────────────────────────────────────────────────
  const EnvioTab = () => {
    const invs = filteredForSend
    const total = invitadosStore.invitados.length
    const enviados = stats.enviados

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '20px 28px' }}>
        {/* Header banner */}
        <div style={{
          border: `1px solid ${diseno.modo === 'rsvp' ? '#DDD6FE' : '#A7F3D0'}`,
          borderRadius: 12, padding: '16px 20px', marginBottom: 20,
          background: diseno.modo === 'rsvp' ? '#F5F3FF' : '#F0FDFA',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
            {diseno.modo === 'rsvp' ? '✉️ Modo RSVP' : '🎫 Modo Boleto de entrada'}
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            {diseno.modo === 'rsvp'
              ? 'Los invitados recibirán un link para confirmar su asistencia.'
              : 'Los invitados recibirán un QR único como boleto de entrada.'}
          </div>
          {total > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: '#7C3AED', fontWeight: 600 }}>
              {enviados} de {total} invitados ya tienen su link enviado
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'all',        label: `Todos (${invitadosStore.invitados.length})` },
            { key: 'pendiente',  label: `Pendientes (${invitadosStore.invitados.filter(g => g.rsvp === 'pendiente').length})` },
            { key: 'confirmado', label: `Confirmados (${invitadosStore.invitados.filter(g => g.rsvp === 'confirmado').length})` },
            { key: 'no-enviado', label: `Sin enviar (${invitadosStore.invitados.filter(g => !g.boletosEnviados).length})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setSendFilter(f.key as typeof sendFilter)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid',
                borderColor: sendFilter === f.key ? '#7C3AED' : '#EDE9FE',
                background: sendFilter === f.key ? '#7C3AED' : '#fff',
                color: sendFilter === f.key ? '#fff' : '#555',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Guest send cards */}
        {invitadosStore.invitados.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, border: '2px dashed #DDD6FE',
            padding: '64px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📨</div>
            <Text strong style={{ fontSize: 16, color: '#555', display: 'block', marginBottom: 6 }}>Sin invitados</Text>
            <Text style={{ color: '#888', fontSize: 13 }}>Primero agrega invitados en la pestaña "Lista de invitados"</Text>
          </div>
        ) : invs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
            Sin invitados para este filtro
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {invs.map(g => {
              const link = guestLink(g)
              const waLink = whatsappLink(g)
              return (
                <div
                  key={g.id}
                  style={{
                    background: '#fff', borderRadius: 14, padding: '16px 18px',
                    border: `1px solid ${g.boletosEnviados ? '#BBF7D0' : '#EDE9FE'}`,
                    display: 'flex', gap: 18, alignItems: 'flex-start',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Guest info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {g.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{g.nombre}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#888' }}>{g.numPersonas} persona{g.numPersonas !== 1 ? 's' : ''}</span>
                          {g.mesa && <span style={{ fontSize: 12, color: '#888' }}>· Mesa {g.mesa}</span>}
                          <Tag style={{
                            background: `${RSVP_COLOR[g.rsvp]}15`,
                            border: `1px solid ${RSVP_COLOR[g.rsvp]}40`,
                            color: RSVP_COLOR[g.rsvp],
                            borderRadius: 20, fontWeight: 600, fontSize: 10, margin: 0,
                          }}>{RSVP_LABEL[g.rsvp]}</Tag>
                          {g.boletosEnviados && (
                            <Tag style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', borderRadius: 20, fontSize: 10, margin: 0 }}>
                              <CheckOutlined /> Enviado
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Link + QR */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', letterSpacing: '0.08em', marginBottom: 4 }}>
                          {diseno.modo === 'rsvp' ? 'LINK DE RSVP' : 'LINK DE BOLETO'}
                        </div>
                        <div style={{
                          background: '#F8F7FF', borderRadius: 8, padding: '8px 12px',
                          border: '1px solid #EDE9FE', fontSize: 11, color: '#7C3AED',
                          wordBreak: 'break-all', fontFamily: 'monospace',
                        }}>
                          {link}
                        </div>
                      </div>

                      {/* QR code */}
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', letterSpacing: '0.08em', marginBottom: 4 }}>QR</div>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(link)}`}
                          alt="QR"
                          style={{ width: 80, height: 80, borderRadius: 8, border: '1px solid #EDE9FE', display: 'block' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyLink(link)}
                      style={{ borderRadius: 8, borderColor: '#EDE9FE', color: '#7C3AED', fontWeight: 600 }}
                    >
                      Copiar link
                    </Button>

                    {g.telefono && waLink && (
                      <Button
                        size="small"
                        icon={<WhatsAppOutlined />}
                        onClick={() => window.open(waLink, '_blank')}
                        style={{ borderRadius: 8, background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 600 }}
                      >
                        WhatsApp
                      </Button>
                    )}

                    {g.email && (
                      <Tooltip title={`Enviar a ${g.email}`}>
                        <Button
                          size="small"
                          icon={<MailOutlined />}
                          onClick={() => {
                            const eventName = event?.name || 'el evento'
                            window.open(
                              `mailto:${g.email}?subject=Invitación a ${eventName}&body=Hola ${g.nombre},%0A%0ATe invitamos a ${eventName}.%0A%0ATu link: ${link}`,
                              '_blank'
                            )
                          }}
                          style={{ borderRadius: 8, borderColor: '#EDE9FE', color: '#0D9488', fontWeight: 600 }}
                        >
                          Email
                        </Button>
                      </Tooltip>
                    )}

                    {!g.boletosEnviados && (
                      <Button
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => markEnviado(g.id)}
                        style={{ borderRadius: 8, borderColor: '#BBF7D0', color: '#059669', fontWeight: 600 }}
                      >
                        Marcar enviado
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7FF' }}>

      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EDE9FE',
        padding: '16px 28px', flexShrink: 0,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Text style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>Invitaciones</Text>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
              <span>{stats.total} invitados</span>
              <span style={{ margin: '0 6px', color: '#ddd' }}>·</span>
              <span>{stats.personas} personas en total</span>
              <span style={{ margin: '0 6px', color: '#ddd' }}>·</span>
              <span style={{ color: '#059669' }}>{stats.confirmados} confirmados</span>
              <span style={{ margin: '0 6px', color: '#ddd' }}>·</span>
              <span style={{ color: '#7C3AED' }}>{stats.enviados} enviados</span>
            </div>
          </div>
          <Tag
            style={{
              borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '4px 14px',
              background: '#F5F3FF', borderColor: '#DDD6FE', color: '#7C3AED',
            }}
          >
            {diseno.modo === 'rsvp' ? '✉️ Modo RSVP' : '🎫 Modo Boleto'}
          </Tag>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          defaultActiveKey="diseno"
          style={{ height: '100%' }}
          tabBarStyle={{
            margin: 0, paddingLeft: 28, paddingRight: 28,
            background: '#fff', borderBottom: '1px solid #EDE9FE',
            flexShrink: 0,
          }}
          items={[
            {
              key: 'diseno',
              label: (
                <span style={{ fontWeight: 600 }}>🎨 Diseño de invitación</span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
                  <DisenoTab />
                </div>
              ),
            },
            {
              key: 'lista',
              label: (
                <span style={{ fontWeight: 600 }}>
                  👥 Lista de invitados
                  {stats.total > 0 && (
                    <span style={{
                      marginLeft: 8, background: '#7C3AED', color: '#fff',
                      borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
                    }}>{stats.total}</span>
                  )}
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
                  <ListaTab />
                </div>
              ),
            },
            {
              key: 'envio',
              label: (
                <span style={{ fontWeight: 600 }}>
                  📨 Envío de invitaciones
                  {stats.total > 0 && stats.enviados < stats.total && (
                    <span style={{
                      marginLeft: 8, background: '#F97316', color: '#fff',
                      borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
                    }}>{stats.total - stats.enviados} pendientes</span>
                  )}
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
                  <EnvioTab />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Add/Edit Guest Modal */}
      <Modal
        title={guestModal.editing ? 'Editar invitado' : 'Agregar invitado'}
        open={guestModal.open}
        onCancel={() => setGuestModal({ open: false, editing: null })}
        onOk={() => guestForm.submit()}
        okText={guestModal.editing ? 'Guardar cambios' : 'Agregar'}
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        width={520}
        destroyOnClose
      >
        <Form
          form={guestForm}
          layout="vertical"
          onFinish={saveGuest}
          initialValues={{ numPersonas: 1, rsvp: 'pendiente', boletosEnviados: false }}
        >
          <Form.Item
            name="nombre"
            label="Nombre del invitado"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Familia García o Esther Buendía" autoFocus />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="numPersonas" label="N° de personas">
              <Input type="number" min={1} placeholder="1" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mesa" label="Mesa">
              <Input placeholder="1, 2, 3..." />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="telefono" label="Teléfono (WhatsApp)">
              <Input placeholder="+521234567890" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="correo@ejemplo.com" />
            </Form.Item>
          </div>

          <Form.Item name="rsvp" label="Estado RSVP">
            <Select>
              <Select.Option value="pendiente">
                <span style={{ color: RSVP_COLOR.pendiente, fontWeight: 600 }}>● Pendiente</span>
              </Select.Option>
              <Select.Option value="confirmado">
                <span style={{ color: RSVP_COLOR.confirmado, fontWeight: 600 }}>● Confirmado</span>
              </Select.Option>
              <Select.Option value="declinado">
                <span style={{ color: RSVP_COLOR.declinado, fontWeight: 600 }}>● Declinado</span>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} placeholder="Restricciones alimenticias, accesibilidad, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
