import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spin, Alert, Typography, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { eventsApi } from '../../api/events'
import DxfViewer from '../../components/DxfViewer'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'green',
  RESERVED: 'gold',
  SOLD: 'red',
  BLOCKED: 'default',
}
const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  BLOCKED: 'Bloqueado',
}

export default function FloorPlanPortalPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-floor-plan', eventId],
    queryFn: () => eventsApi.getFloorPlan(eventId!),
    enabled: !!eventId,
  })

  const floorPlan = data?.data?.floorPlan ?? null
  const stands: any[] = (data?.data?.stands ?? []).map((s: any) => ({
    ...s,
    clientName: s.client
      ? (s.client.companyName || `${s.client.firstName ?? ''} ${s.client.lastName ?? ''}`.trim())
      : null,
    clientLogoUrl: s.client?.logoUrl ?? null,
  }))

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="Error al cargar el plano del venue" />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/events/${eventId}`)}
          type="text"
        />
        <div>
          <Title level={4} style={{ margin: 0 }}>Plano del Venue</Title>
          {floorPlan && (
            <Text type="secondary" style={{ fontSize: 13 }}>{floorPlan.name}</Text>
          )}
        </div>
      </div>

      {/* Legend */}
      {stands.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['AVAILABLE', 'RESERVED', 'SOLD'] as const).map((s) => (
            <Tag key={s} color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>
          ))}
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
            Haz clic en un stand para ver detalles
          </Text>
        </div>
      )}

      {/* No floor plan */}
      {!floorPlan && (
        <Alert
          type="info"
          message="El organizador aún no ha publicado el plano del venue para este evento."
        />
      )}

      {/* Viewer */}
      {floorPlan && (
        <DxfViewer
          eventId={eventId!}
          floorPlan={floorPlan}
          fetchContent={(fpId) => eventsApi.getFloorPlanContent(eventId!, fpId)}
          stands={stands}
          readonly
          height={560}
        />
      )}

      {/* Stand summary table */}
      {stands.length > 0 && (
        <div style={{
          marginTop: 20, background: '#fff', borderRadius: 12,
          border: '1px solid #f0f4f8', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f8fafc', fontWeight: 700, fontSize: 14 }}>
            Listado de stands ({stands.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Stand', 'Estado', 'Empresa', 'Dimensiones (m)', 'Ubicación'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stands.map((s: any, i: number) => (
                  <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{s.code}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <Tag color={STATUS_COLORS[s.status]}>{STATUS_LABELS[s.status]}</Tag>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#475569' }}>
                      {s.clientName ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#475569' }}>
                      {s.widthM ? `${s.widthM} × ${s.depthM}${s.heightM ? ` × ${s.heightM}h` : ''}` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#475569' }}>{s.locationNotes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
