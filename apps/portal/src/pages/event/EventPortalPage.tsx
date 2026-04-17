import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Row, Col, Skeleton, Grid, Space,
} from 'antd'
import {
  ShoppingCartOutlined, ArrowLeftOutlined, FileOutlined,
  AppstoreOutlined, DownloadOutlined, CalendarOutlined,
  EnvironmentOutlined, ClockCircleOutlined, CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'

const { useBreakpoint } = Grid

const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado',
  IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}
const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  QUOTED:       { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  CONFIRMED:    { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  IN_EXECUTION: { bg: '#fff7ed', color: '#d97706', border: '#fed7aa' },
  CLOSED:       { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  CANCELLED:    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, background: '#f5f3ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        color: '#6B46C1', fontSize: 15,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>{value}</div>
      </div>
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 18, border: '1px solid #f0f4f8',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid #f8fafc',
      }}>
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{title}</span>
        {badge}
      </div>
      <div style={{ padding: '0 24px 20px' }}>{children}</div>
    </div>
  )
}

export default function EventPortalPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const { data, isLoading } = useQuery({
    queryKey: ['portal-event', eventId],
    queryFn: () => eventsApi.get(eventId!),
  })

  const event = data?.data?.data

  if (isLoading) return (
    <div style={{ padding: 24 }}>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  )
  if (!event) return null

  const settings: any = event.portalSettings ?? {}
  const statusStyle = STATUS_STYLES[event.status] ?? STATUS_STYLES.CLOSED
  const canOrder = ['CONFIRMED', 'IN_EXECUTION'].includes(event.status)

  const dateRows = [
    event.setupStart && { icon: <CalendarOutlined />, label: 'Inicio montaje', value: dayjs(event.setupStart).format('DD/MM/YYYY HH:mm') },
    event.setupEnd && { icon: <ClockCircleOutlined />, label: 'Fin montaje', value: dayjs(event.setupEnd).format('DD/MM/YYYY HH:mm') },
    event.eventStart && { icon: <CalendarOutlined />, label: 'Inicio evento', value: dayjs(event.eventStart).format('DD/MM/YYYY HH:mm') },
    event.eventEnd && { icon: <ClockCircleOutlined />, label: 'Fin evento', value: dayjs(event.eventEnd).format('DD/MM/YYYY HH:mm') },
    event.teardownStart && { icon: <CalendarOutlined />, label: 'Inicio desmontaje', value: dayjs(event.teardownStart).format('DD/MM/YYYY HH:mm') },
    event.teardownEnd && { icon: <ClockCircleOutlined />, label: 'Fin desmontaje', value: dayjs(event.teardownEnd).format('DD/MM/YYYY HH:mm') },
    event.venueLocation && { icon: <EnvironmentOutlined />, label: 'Recinto', value: event.venueLocation },
    event.priceList && { icon: <FileTextOutlined />, label: 'Lista de precios', value: event.priceList.name },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[]

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: 20, marginBottom: 24, overflow: 'hidden', position: 'relative',
        padding: isMobile ? '24px 20px 28px' : '32px 40px 36px',
      }}>
        {/* Dot pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(109,40,217,0.3) 0%, transparent 65%)',
          top: -150, right: -80, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Back */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 9, padding: '6px 14px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)', fontSize: 13, display: 'inline-flex',
              alignItems: 'center', gap: 6, marginBottom: 20,
            }}
          >
            <ArrowLeftOutlined style={{ fontSize: 12 }} />
            Mis Eventos
          </button>

          {/* Code badge + Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.35)',
              borderRadius: 8, padding: '3px 12px',
              fontSize: 12, fontWeight: 700, color: '#c4b5fd', letterSpacing: 1, textTransform: 'uppercase',
            }}>
              {event.code}
            </div>
            <div style={{
              background: statusStyle.bg, border: `1px solid ${statusStyle.border}`,
              borderRadius: 8, padding: '3px 12px',
              fontSize: 12, fontWeight: 600, color: statusStyle.color,
            }}>
              {STATUS_LABELS[event.status] ?? event.status}
            </div>
          </div>

          {/* Title */}
          <div style={{
            fontSize: isMobile ? 22 : 30, fontWeight: 800, color: '#fff',
            lineHeight: 1.2, marginBottom: 24,
          }}>
            {event.name}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => navigate(`/events/${eventId}/catalog`)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                borderColor: 'rgba(255,255,255,0.25)',
                color: '#fff', borderRadius: 10, fontWeight: 500,
                height: 40,
              }}
            >
              Ver Catálogo
            </Button>
            {canOrder && (
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                onClick={() => navigate(`/events/${eventId}/new-order`)}
                style={{
                  background: '#fff', borderColor: '#fff',
                  color: '#1e1b4b', borderRadius: 10, fontWeight: 700,
                  height: 40,
                }}
              >
                Nueva Solicitud
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────────── */}
      {settings.description && (
        <div style={{
          background: '#fff', borderRadius: 18, border: '1px solid #f0f4f8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px 24px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.75 }}>
            {settings.description}
          </div>
        </div>
      )}

      <Row gutter={[20, 20]}>
        {/* ── Info column ───────────────────────────────────────────────────── */}
        <Col xs={24} lg={14}>
          <Section
            title="Información del Evento"
            badge={
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#f5f3ff', borderRadius: 8, padding: '3px 12px',
                fontSize: 11, fontWeight: 600, color: '#6B46C1',
              }}>
                <CheckCircleOutlined style={{ fontSize: 11 }} />
                Detalle completo
              </div>
            }
          >
            {dateRows.length === 0 ? (
              <div style={{ padding: '20px 0', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                Sin información disponible
              </div>
            ) : (
              dateRows.map((row, i) => (
                <InfoRow key={i} icon={row.icon} label={row.label} value={row.value} />
              ))
            )}
          </Section>
        </Col>

        {/* ── Side column ───────────────────────────────────────────────────── */}
        <Col xs={24} lg={10}>

          {/* Stands */}
          {(event.stands?.length ?? 0) > 0 && (
            <Section
              title="Stands"
              badge={
                <div style={{
                  background: '#f5f3ff', borderRadius: 20,
                  padding: '2px 12px', fontSize: 12, fontWeight: 700, color: '#6B46C1',
                }}>
                  {event.stands.length}
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                {event.stands.map((stand: any) => (
                  <div key={stand.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{stand.code}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {stand.client
                          ? (stand.client.companyName || `${stand.client.firstName ?? ''} ${stand.client.lastName ?? ''}`.trim())
                          : '—'
                        }
                      </div>
                    </div>
                    {stand.widthM && (
                      <div style={{
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: 8, padding: '4px 10px',
                        fontSize: 12, color: '#475569', fontWeight: 500,
                      }}>
                        {stand.widthM}m × {stand.depthM}m
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Documents */}
          <Section
            title="Documentos"
            badge={
              <div style={{
                background: '#f5f3ff', borderRadius: 20,
                padding: '2px 12px', fontSize: 12, fontWeight: 700, color: '#6B46C1',
              }}>
                {event.documents?.length ?? 0}
              </div>
            }
          >
            {(event.documents ?? []).length === 0 ? (
              <div style={{ padding: '20px 0', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                Sin documentos adjuntos
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                {event.documents.map((doc: any) => (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                    gap: 10,
                  }}>
                    <Space style={{ minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, background: '#ede9fe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <FileOutlined style={{ color: '#6B46C1', fontSize: 14 }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                          {doc.fileName}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{doc.documentType}</div>
                      </div>
                    </Space>
                    {doc.blobKey && (
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        href={doc.blobKey}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          borderColor: '#e2e8f0', color: '#6B46C1',
                          borderRadius: 8, flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </Col>
      </Row>

      {/* ── CTA if can order ─────────────────────────────────────────────────── */}
      {canOrder && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          borderRadius: 18, padding: isMobile ? '24px 20px' : '28px 36px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.07,
            backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
            backgroundSize: '22px 22px', pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              ¿Necesitas servicios adicionales?
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              Solicita electricidad, mobiliario, internet y más desde el catálogo.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => navigate(`/events/${eventId}/catalog`)}
              style={{
                borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)',
                background: 'transparent', borderRadius: 10, height: 40, fontWeight: 500,
              }}
            >
              Ver Catálogo
            </Button>
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => navigate(`/events/${eventId}/new-order`)}
              style={{
                background: '#fff', borderColor: '#fff', color: '#1e1b4b',
                borderRadius: 10, height: 40, fontWeight: 700,
              }}
            >
              Nueva Solicitud
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
