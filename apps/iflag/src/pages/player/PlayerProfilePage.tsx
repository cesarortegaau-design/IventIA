import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { playerApi } from '../../api/player'
import { usePlayerStore } from '../../stores/playerStore'

const catColors: Record<string, string> = { FEMENIL: '#e91e63', VARONIL: '#2196f3', MIXTO: '#7b1fa2' }
const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }

const EVENT_TYPE_LABELS: Record<string, string> = {
  TOUCHDOWN: 'Touchdown',
  EXTRA_POINT: 'Punto extra',
  TWO_POINT: '2 puntos',
  FIELD_GOAL: 'Field goal',
  SAFETY: 'Safety',
  INTERCEPTION: 'Intercepción',
  SACK: 'Sack',
  FLAG_PULL: 'Bandera',
  PENALTY: 'Penalización',
  TIMEOUT: 'Tiempo fuera',
}

export default function PlayerProfilePage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { user: storeUser, clearAuth, setAuth, refreshToken } = usePlayerStore()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })

  const { data: meData, isLoading } = useQuery({
    queryKey: ['player-me'],
    queryFn: playerApi.getMe,
  })

  const { data: statsData } = useQuery({
    queryKey: ['player-stats'],
    queryFn: () => playerApi.getStats(),
  })

  const me = meData?.data
  const stats = statsData?.data

  function startEdit() {
    if (!me) return
    setForm({ firstName: me.firstName, lastName: me.lastName, phone: me.phone ?? '' })
    setEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => playerApi.updateMe(data),
    onSuccess: (res) => {
      const u = res.data
      setAuth({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName }, usePlayerStore.getState().accessToken!, refreshToken!)
      queryClient.invalidateQueries({ queryKey: ['player-me'] })
      message.success('Perfil actualizado')
      setEditing(false)
    },
    onError: () => message.error('Error al actualizar perfil'),
  })

  function handleSave() {
    updateMutation.mutate({ firstName: form.firstName, lastName: form.lastName, phone: form.phone || null })
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 0 }}>
          ← Volver
        </button>
        <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 16 }}>MI PERFIL</div>
        <button
          onClick={() => { clearAuth(); navigate('/') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
        >
          Salir
        </button>
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Mis datos</div>
              {!editing && (
                <button onClick={startEdit} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
                  Editar
                </button>
              )}
            </div>

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Nombre</label>
                    <input type="text" className="ant-input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Apellido</label>
                    <input type="text" className="ant-input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" className="ant-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSave} disabled={updateMutation.isPending} style={{ ...saveBtnStyle, flex: 1 }}>
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditing(false)} style={{ ...cancelBtnStyle, flex: 1 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoRow label="Nombre" value={`${me?.firstName} ${me?.lastName}`} />
                <InfoRow label="Correo" value={me?.email} />
                {me?.phone && <InfoRow label="Teléfono" value={me.phone} />}
              </div>
            )}
          </div>

          {/* Teams */}
          {me?.clients?.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Mis equipos</div>
              {me.clients.map((c: any) => (
                <div key={c.id} style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>
                  {c.client.companyName}
                </div>
              ))}
            </div>
          )}

          {/* Tournament enrollments */}
          {me?.events?.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Torneos inscritos</div>
              {me.events.map((ev: any) => {
                const cat = ev.playerCategory ?? ev.accessCode?.category
                return (
                  <Link
                    key={ev.id}
                    to={`/player/tournaments/${ev.eventId}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)' }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.event?.name}</div>
                      {cat && <span style={{ fontSize: 11, color: catColors[cat], fontWeight: 600 }}>{catLabels[cat] ?? cat}</span>}
                    </div>
                    <div style={{ color: ev.paymentStatus === 'PAID' ? 'var(--green)' : 'var(--orange)', fontSize: 11, fontWeight: 600 }}>
                      {ev.paymentStatus === 'PAID' ? '✓ Pagado' : 'Pago pendiente'}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Stats */}
          {stats && stats.gamesPlayed > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Mis estadísticas</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                Partidos jugados: <strong style={{ color: 'var(--text)' }}>{stats.gamesPlayed}</strong>
              </div>
              {Object.entries(stats.totals).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(stats.totals).map(([type, count]) => (
                    <div key={type} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                        {EVENT_TYPE_LABELS[type] ?? type}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', fontFamily: "'Bebas Neue', sans-serif" }}>
                        {String(count)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{value ?? '—'}</span>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'block',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  fontSize: 14,
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
}

const saveBtnStyle: React.CSSProperties = {
  background: 'var(--blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
}

const cancelBtnStyle: React.CSSProperties = {
  background: 'var(--surface2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}
