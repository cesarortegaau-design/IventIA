import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { playerApi } from '../../api/player'
import { usePlayerStore } from '../../stores/playerStore'

const catColors: Record<string, string> = { FEMENIL: '#e91e63', VARONIL: '#2196f3', MIXTO: '#7b1fa2' }
const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  TOUCHDOWN:        { label: 'Touchdown',      color: 'var(--green)',   icon: '🏈' },
  EXTRA_POINT:      { label: 'Punto extra',    color: '#1a9c50',        icon: '✔' },
  SAFETY:           { label: 'Safety',         color: 'var(--blue)',    icon: '🛡' },
  FLAG_PENALTY:     { label: 'Castigo',        color: 'var(--orange)',  icon: '🚩' },
  INTERCEPTION:     { label: 'Intercepción',   color: '#e91e63',        icon: '🙌' },
  POSSESSION_CHANGE:{ label: 'Cambio posesión',color: 'var(--blue)',    icon: '🔄' },
  TIMEOUT:          { label: 'Tiempo fuera',   color: '#faad14',        icon: '⏱' },
  SCORE_ADJUST:     { label: 'Ajuste marcador',color: '#9c27b0',        icon: '✏️' },
  DOWN_UPDATE:      { label: 'Down',           color: 'var(--text-muted)', icon: '📋' },
}

export default function PlayerProfilePage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { clearAuth, setAuth, refreshToken } = usePlayerStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', playerNumber: '' })
  const [activeTab, setActiveTab] = useState<'perfil' | 'pagos' | 'stats'>('perfil')

  const { data: meData, isLoading } = useQuery({
    queryKey: ['player-me'],
    queryFn: playerApi.getMe,
  })

  const { data: statsData } = useQuery({
    queryKey: ['player-stats'],
    queryFn: () => playerApi.getStats(),
    enabled: activeTab === 'stats',
  })

  const me = meData?.data
  const stats = statsData?.data

  function startEdit() {
    if (!me) return
    setForm({ firstName: me.firstName, lastName: me.lastName, phone: me.phone ?? '', playerNumber: me.playerNumber ?? '' })
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

  const photoMutation = useMutation({
    mutationFn: (file: File) => playerApi.uploadPhoto(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-me'] })
      message.success('Foto actualizada')
    },
    onError: () => message.error('Error al subir foto'),
  })

  function handleSave() {
    updateMutation.mutate({ firstName: form.firstName, lastName: form.lastName, phone: form.phone || null, playerNumber: form.playerNumber || null })
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    photoMutation.mutate(file)
    e.target.value = ''
  }

  const initials = me ? `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase() : '?'

  const tabs = [
    { key: 'perfil', label: 'Perfil' },
    { key: 'pagos', label: 'Pagos' },
    { key: 'stats', label: 'Estadísticas' },
  ] as const

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 0 }}>
          ← Volver
        </button>
        <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 16 }}>MI PERFIL</div>
        <button onClick={() => { clearAuth(); navigate('/') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
          Salir
        </button>
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : (
        <>
          {/* Avatar hero */}
          <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {me?.photoUrl ? (
                <img src={me.photoUrl} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--blue)' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface2)', border: '3px solid var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'var(--blue)' }}>
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoMutation.isPending}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--blue)', border: '2px solid var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
              >
                {photoMutation.isPending ? '…' : '📷'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{me?.firstName} {me?.lastName}</span>
                {me?.playerNumber && (
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'var(--green)', background: 'rgba(0,230,118,0.1)', padding: '1px 8px', borderRadius: 8, border: '1px solid var(--green)' }}>
                    #{me.playerNumber}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{me?.email}</div>
              {me?.clients?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 4, fontWeight: 600 }}>
                  {me.clients.map((c: any) => c.client.companyName).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{ flex: 1, background: 'none', border: 'none', padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: activeTab === t.key ? 'var(--blue)' : 'var(--text-muted)', borderBottom: activeTab === t.key ? '2px solid var(--blue)' : '2px solid transparent' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Perfil tab ── */}
            {activeTab === 'perfil' && (
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Teléfono</label>
                        <input type="tel" className="ant-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}># Dorsal</label>
                        <input type="text" className="ant-input" value={form.playerNumber} maxLength={10} onChange={(e) => setForm((f) => ({ ...f, playerNumber: e.target.value }))} style={inputStyle} placeholder="Ej. 7" />
                      </div>
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
                    {me?.playerNumber && <InfoRow label="# Dorsal" value={`#${me.playerNumber}`} />}
                  </div>
                )}
              </div>
            )}

            {/* ── Pagos tab ── */}
            {activeTab === 'pagos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!me?.events?.length ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontSize: 13 }}>Sin torneos inscritos</div>
                ) : (
                  me.events.map((ev: any) => {
                    const cat = ev.playerCategory ?? ev.accessCode?.category
                    const isPaid = ev.paymentStatus === 'PAID'
                    return (
                      <div key={ev.id} style={{ background: 'var(--surface)', border: `1px solid ${isPaid ? 'rgba(0,230,118,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{ev.event?.name}</div>
                            {cat && (
                              <span style={{ fontSize: 11, color: catColors[cat], background: `${catColors[cat]}22`, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                {catLabels[cat] ?? cat}
                              </span>
                            )}
                          </div>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: isPaid ? 'rgba(0,230,118,0.12)' : 'rgba(255,152,0,0.12)',
                            border: `1px solid ${isPaid ? 'var(--green)' : 'var(--orange)'}`,
                            borderRadius: 20, padding: '3px 10px',
                            fontSize: 11, fontWeight: 700,
                            color: isPaid ? 'var(--green)' : 'var(--orange)',
                          }}>
                            {isPaid ? '✓ Pagado' : '⏳ Pendiente'}
                          </div>
                        </div>

                        {ev.event?.eventStart && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                            {new Date(ev.event.eventStart).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </div>
                        )}

                        {isPaid && ev.paidAt && (
                          <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 8 }}>
                            Pagado el {new Date(ev.paidAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <Link
                            to={`/player/tournaments/${ev.eventId}`}
                            style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px', textAlign: 'center', textDecoration: 'none', color: 'var(--text)', fontSize: 12, fontWeight: 600 }}
                          >
                            Ver torneo →
                          </Link>
                          {!isPaid && (
                            <PayButton eventId={ev.eventId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['player-me'] })} />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ── Stats tab ── */}
            {activeTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!stats ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontSize: 13 }}>Cargando estadísticas...</div>
                ) : stats.gamesPlayed === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontSize: 13 }}>Sin partidos registrados aún</div>
                ) : (
                  <>
                    {/* Totals */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
                        Totales — {stats.gamesPlayed} partido{stats.gamesPlayed !== 1 ? 's' : ''}
                      </div>
                      {Object.keys(stats.totals).length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin incidencias registradas</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {Object.entries(stats.totals).map(([type, count]) => {
                            const meta = EVENT_LABELS[type]
                            return (
                              <div key={type} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: `1px solid ${meta?.color ?? 'var(--border)'}33` }}>
                                <div style={{ fontSize: 18 }}>{meta?.icon ?? '•'}</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: meta?.color ?? 'var(--green)', fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1, marginTop: 2 }}>
                                  {String(count)}
                                </div>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2, lineHeight: 1.2 }}>
                                  {meta?.label ?? type}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Per-game incidents */}
                    {stats.games?.length > 0 && (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Historial de partidos</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {stats.games.map((g: any) => (
                            <GameCard key={g.gameId} game={g} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PayButton({ eventId, onSuccess }: { eventId: string; onSuccess: () => void }) {
  const { message } = App.useApp()
  const payMutation = useMutation({
    mutationFn: () => playerApi.payTournament(eventId),
    onSuccess: (res: any) => {
      if (res.data?.paymentStatus === 'PAID') { onSuccess(); message.success('¡Pago registrado!') }
      else if (res.data?.url) { window.location.href = res.data.url }
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al procesar pago'),
  })
  return (
    <button
      onClick={() => payMutation.mutate()}
      disabled={payMutation.isPending}
      style={{ flex: 1, background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: payMutation.isPending ? 'not-allowed' : 'pointer' }}
    >
      {payMutation.isPending ? 'Procesando...' : '💳 Pagar'}
    </button>
  )
}

function GameCard({ game }: { game: any }) {
  const [expanded, setExpanded] = useState(false)
  const hasEvents = game.events?.length > 0
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div
        onClick={() => hasEvents && setExpanded((v) => !v)}
        style={{ padding: '10px 12px', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: hasEvents ? 'pointer' : 'default' }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          {game.homeTeam} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {game.visitingTeam}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {game.localScore !== null && game.localScore !== undefined && (
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: 'var(--green)' }}>
              {game.localScore}–{game.visitingScore}
            </span>
          )}
          {hasEvents && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>}
        </div>
      </div>
      {game.date && (
        <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
          {new Date(game.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      {expanded && hasEvents && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {game.events.map((ev: any, i: number) => {
            const meta = EVENT_LABELS[ev.type]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < game.events.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{meta?.icon ?? '•'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meta?.color ?? 'var(--text)' }}>{meta?.label ?? ev.type}</span>
                  {ev.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</div>}
                </div>
                {ev.points > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>+{ev.points}pts</span>
                )}
              </div>
            )
          })}
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
  fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 14,
  background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
}

const saveBtnStyle: React.CSSProperties = {
  background: 'var(--blue)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}

const cancelBtnStyle: React.CSSProperties = {
  background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
}
