import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { playerApi } from '../../api/player'
import { usePlayerStore } from '../../stores/playerStore'

const catColors: Record<string, string> = {
  FEMENIL: '#e91e63',
  VARONIL: '#2196f3',
  MIXTO: '#7b1fa2',
}
const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }

const GAME_STATUS_COLORS: Record<string, string> = {
  PENDING: 'var(--text-muted)',
  ATTENDANCE: 'var(--blue)',
  IN_PROGRESS: 'var(--green)',
  HALFTIME: 'var(--orange)',
  FINISHED: 'var(--text-muted)',
}

const GAME_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ATTENDANCE: 'Pase de lista',
  IN_PROGRESS: 'En juego',
  HALFTIME: 'Medio tiempo',
  FINISHED: 'Finalizado',
}

export default function PlayerTournamentPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const playerToken = usePlayerStore((s) => s.accessToken)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [activeView, setActiveView] = useState<'standings' | 'calendar' | 'stats'>('standings')

  // Verify payment after redirect
  const paymentSuccess = searchParams.get('payment') === 'success'
  const sessionId = searchParams.get('session_id')

  const { data: tournamentData, isLoading } = useQuery({
    queryKey: ['tournament-public', eventId],
    queryFn: () => playerApi.getTournament(eventId!),
    enabled: !!eventId,
  })

  const { data: calendarData } = useQuery({
    queryKey: ['tournament-calendar', eventId],
    queryFn: () => playerApi.getCalendar(eventId!),
    enabled: !!eventId,
    refetchInterval: 30000,
  })

  const { data: meData } = useQuery({
    queryKey: ['player-me'],
    queryFn: playerApi.getMe,
    enabled: !!playerToken,
  })

  const { data: myStatsData } = useQuery({
    queryKey: ['player-stats', eventId],
    queryFn: () => playerApi.getStats(eventId),
    enabled: !!playerToken && activeView === 'stats',
  })
  const myStats = myStatsData?.data

  const { data: teamStatsData } = useQuery({
    queryKey: ['tournament-team-stats-public', eventId],
    queryFn: () => playerApi.getTeamStats(eventId!),
    enabled: !!eventId,
  })
  const teamPlayerStats: any[] = teamStatsData?.data?.teams ?? []
  const teamPlayerStatsMap: Record<string, any[]> = Object.fromEntries(
    teamPlayerStats.map((t: any) => [t.teamId, t.players ?? []])
  )

  const payMutation = useMutation({
    mutationFn: () => playerApi.payTournament(eventId!),
    onSuccess: (res) => {
      if (res.data?.paymentStatus === 'PAID') {
        queryClient.invalidateQueries({ queryKey: ['player-me'] })
        message.success('¡Pago registrado!')
      } else if (res.data?.url) {
        window.location.href = res.data.url
      }
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al procesar pago'),
  })

  const verifyMutation = useMutation({
    mutationFn: (sid: string) => playerApi.verifyPayment(eventId!, sid),
    onSuccess: (res) => {
      if (res.data?.paymentStatus === 'PAID') {
        queryClient.invalidateQueries({ queryKey: ['player-me'] })
        message.success('¡Pago confirmado!')
      }
    },
  })

  useEffect(() => {
    if (paymentSuccess && sessionId && playerToken) {
      verifyMutation.mutate(sessionId)
    }
  }, [paymentSuccess, sessionId, playerToken])

  const tournament = tournamentData?.data
  const standings = tournament?.standings ?? {}
  const categories = Object.keys(standings)

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0])
    }
  }, [categories])

  const calendar = calendarData?.data ?? []

  // Player's own event record
  const myEvent = meData?.data?.events?.find((e: any) => e.eventId === eventId)
  const myCategory = myEvent?.playerCategory ?? myEvent?.accessCode?.category
  const isPaid = myEvent?.paymentStatus === 'PAID'
  const regFee = Number(tournament?.config?.regFeePerPerson ?? 0)

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: 'var(--text-muted)' }}>Torneo no encontrado</div>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>← Volver</button>
      </div>
    )
  }

  const filteredCalendar = activeCategory
    ? calendar.filter((a: any) => a.matchData?.category === activeCategory)
    : calendar

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 6, padding: 0 }}>
          ← Volver
        </button>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
          {tournament.config?.event?.name}
        </div>
        {myCategory && (
          <span style={{ fontSize: 11, fontWeight: 600, color: catColors[myCategory], background: `${catColors[myCategory]}22`, padding: '2px 8px', borderRadius: 12 }}>
            {catLabels[myCategory] ?? myCategory}
          </span>
        )}
      </div>

      {/* Payment banner */}
      {playerToken && myEvent && !isPaid && regFee > 0 && (
        <div style={{ background: '#ff980022', border: '1px solid #ff980044', margin: '12px 16px', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontWeight: 600, color: 'var(--orange)', marginBottom: 6, fontSize: 14 }}>
            Inscripción pendiente de pago
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>
            Cuota por jugador: <strong style={{ color: 'var(--text)' }}>${regFee} MXN</strong>
          </div>
          <button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            style={{
              background: 'var(--orange)',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: 14,
              cursor: payMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {payMutation.isPending ? 'Procesando...' : 'Pagar inscripción'}
          </button>
        </div>
      )}

      {playerToken && myEvent && isPaid && (
        <div style={{ background: '#00e67622', borderLeft: '3px solid var(--green)', margin: '12px 16px', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--green)' }}>
          ✓ Inscripción pagada
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? `${catColors[cat]}22` : 'var(--surface)',
                border: `1px solid ${activeCategory === cat ? catColors[cat] : 'var(--border)'}`,
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                color: activeCategory === cat ? catColors[cat] : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {catLabels[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {([
          { key: 'standings', label: 'Clasificación' },
          { key: 'calendar', label: 'Calendario' },
          ...(playerToken ? [{ key: 'stats', label: 'Mis Stats' }] : []),
        ] as { key: 'standings' | 'calendar' | 'stats'; label: string }[]).map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              color: activeView === v.key ? 'var(--green)' : 'var(--text-muted)',
              borderBottom: activeView === v.key ? '2px solid var(--green)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeView === 'standings' && activeCategory && standings[activeCategory] ? (
          <StandingsTable rows={standings[activeCategory].standings} teamPlayerStatsMap={teamPlayerStatsMap} />
        ) : activeView === 'calendar' ? (
          <CalendarList games={filteredCalendar} eventId={eventId} />
        ) : activeView === 'stats' ? (
          <TournamentStats stats={myStats} />
        ) : (
          <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            Sin datos disponibles
          </div>
        )}
      </div>
    </div>
  )
}

const PLAYER_STAT_KEYS_TT = [
  { key: 'TOUCHDOWN',    label: 'TD',  color: 'var(--green)' },
  { key: 'EXTRA_POINT',  label: 'XP',  color: '#1a9c50' },
  { key: 'SAFETY',       label: 'SAF', color: 'var(--blue)' },
  { key: 'INTERCEPTION', label: 'INT', color: '#e91e63' },
  { key: 'FLAG_PENALTY', label: 'PEN', color: 'var(--orange)' },
]

function StandingsTable({ rows, teamPlayerStatsMap }: { rows: any[]; teamPlayerStatsMap: Record<string, any[]> }) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  if (!rows?.length) {
    return <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sin partidos jugados aún</div>
  }
  return (
    <div style={{ padding: '0 0 16px' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
                <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Equipo' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const players = teamPlayerStatsMap[row.teamId] ?? []
              const isExpanded = expandedTeam === row.teamId
              const hasPlayers = players.length > 0
              return (
                <>
                  <tr
                    key={row.teamId}
                    onClick={() => hasPlayers && setExpandedTeam(isExpanded ? null : row.teamId)}
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', cursor: hasPlayers ? 'pointer' : 'default', background: isExpanded ? 'var(--surface2)' : 'transparent' }}
                  >
                    <td style={{ padding: '10px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.teamName}
                      {hasPlayers && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--blue)' }}>{isExpanded ? '▲' : '▼'}</span>}
                    </td>
                    <td style={numCell}>{row.played}</td>
                    <td style={{ ...numCell, color: 'var(--green)' }}>{row.won}</td>
                    <td style={numCell}>{row.drawn}</td>
                    <td style={{ ...numCell, color: 'var(--red)' }}>{row.lost}</td>
                    <td style={numCell}>{row.gf}</td>
                    <td style={numCell}>{row.ga}</td>
                    <td style={{ ...numCell, color: row.gd >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {row.gd > 0 ? '+' : ''}{row.gd}
                    </td>
                    <td style={{ ...numCell, fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{row.points}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.teamId}-expand`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={10} style={{ padding: '0 0 8px 16px', background: 'var(--surface2)' }}>
                        <div style={{ overflowX: 'auto', paddingTop: 4 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={pthStyle}>#</th>
                                <th style={{ ...pthStyle, textAlign: 'left' }}>Jugador</th>
                                <th style={pthStyle}>Pres.</th>
                                {PLAYER_STAT_KEYS_TT.map(s => <th key={s.key} style={pthStyle}>{s.label}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {players.map((p: any, pi: number) => (
                                <tr key={p.playerId} style={{ borderBottom: pi < players.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                  <td style={ptdStyle}>{p.playerNumber ? `#${p.playerNumber}` : '—'}</td>
                                  <td style={{ ...ptdStyle, textAlign: 'left', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{p.playerName}</td>
                                  <td style={ptdStyle}>{p.gamesAttended > 0 ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>{p.gamesAttended}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                  {PLAYER_STAT_KEYS_TT.map(s => {
                                    const v = p.stats?.[s.key] ?? 0
                                    return <td key={s.key} style={ptdStyle}>{v > 0 ? <span style={{ color: s.color, fontWeight: 700 }}>{v}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
      <StandingsLegendIflag />
    </div>
  )
}

function StandingsLegendIflag() {
  const [open, setOpen] = useState(false)
  const teamCols = [
    ['PJ', 'Partidos Jugados'], ['G', 'Ganados'], ['E', 'Empates'], ['P', 'Perdidos'],
    ['GF', 'Goles a Favor'], ['GC', 'Goles en Contra'], ['DG', 'Diferencia de Goles'], ['Pts', 'Puntos'],
  ]
  const playerCols = [
    ['Pres.', 'Presencias en partidos'], ['TD', 'Touchdown'], ['XP', 'Punto Extra'],
    ['SAF', 'Safety'], ['INT', 'Intercepción'], ['PEN', 'Castigo / Flag Penalty'],
  ]
  return (
    <div style={{ margin: '12px 16px 0' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ℹ️ Leyenda de acrónimos {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Equipo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', marginBottom: 10 }}>
            {teamCols.map(([abbr, full]) => (
              <span key={abbr} style={{ fontSize: 11, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--blue)' }}>{abbr}</strong> = {full}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Jugador (toca el equipo para ver)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
            {playerCols.map(([abbr, full]) => (
              <span key={abbr} style={{ fontSize: 11, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--green)' }}>{abbr}</strong> = {full}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const pthStyle: React.CSSProperties = { padding: '5px 8px', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap' }
const ptdStyle: React.CSSProperties = { padding: '7px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }

function CalendarList({ games, eventId }: { games: any[]; eventId?: string }) {
  const navigate = useNavigate()
  if (!games.length) {
    return <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sin partidos programados</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {games.map((a: any) => {
        const m = a.matchData
        const g = a.footballGame
        const hasScore = m?.homeScore !== null && m?.visitingScore !== null
        const iflagStatus = g?.status
        const clickable = !!g?.id && !!eventId
        return (
          <div
            key={a.id}
            onClick={clickable ? () => navigate(`/spectator/${eventId}/game/${g.id}`) : undefined}
            style={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '12px 16px',
              cursor: clickable ? 'pointer' : 'default',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 4, padding: '1px 6px' }}>
                  J{m?.round ?? '?'}
                </span>
                <span style={{ fontSize: 11, color: catColors[m?.category] ?? 'var(--text-muted)', fontWeight: 600 }}>
                  {catLabels[m?.category] ?? m?.category}
                </span>
              </div>
              {iflagStatus && (
                <span style={{ fontSize: 11, color: GAME_STATUS_COLORS[iflagStatus], fontWeight: 600 }}>
                  ● {GAME_STATUS_LABELS[iflagStatus] ?? iflagStatus}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textAlign: 'left' }}>
                {m?.homeTeam?.companyName ?? '—'}
              </div>
              <div style={{ textAlign: 'center', minWidth: 60 }}>
                {hasScore ? (
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--text)', letterSpacing: '0.05em' }}>
                    {m.homeScore} – {m.visitingScore}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>vs</span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>
                {m?.visitingTeam?.companyName ?? '—'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                {a.startDate && (
                  <span>{new Date(a.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                )}
                {m?.venue?.name && <span>📍 {m.venue.name}</span>}
              </div>
              {clickable && <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>›</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  TOUCHDOWN:         { label: 'Touchdown',       color: 'var(--green)',      icon: '🏈' },
  EXTRA_POINT:       { label: 'Punto extra',     color: '#1a9c50',           icon: '✔' },
  SAFETY:            { label: 'Safety',          color: 'var(--blue)',       icon: '🛡' },
  FLAG_PENALTY:      { label: 'Castigo',         color: 'var(--orange)',     icon: '🚩' },
  INTERCEPTION:      { label: 'Intercepción',    color: '#e91e63',           icon: '🙌' },
  POSSESSION_CHANGE: { label: 'Cambio posesión', color: 'var(--blue)',       icon: '🔄' },
  TIMEOUT:           { label: 'Tiempo fuera',    color: '#faad14',           icon: '⏱' },
  SCORE_ADJUST:      { label: 'Ajuste marcador', color: '#9c27b0',           icon: '✏️' },
  DOWN_UPDATE:       { label: 'Down',            color: 'var(--text-muted)', icon: '📋' },
}

function TournamentStats({ stats }: { stats: any }) {
  if (!stats) {
    return <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Cargando estadísticas...</div>
  }
  if (stats.gamesPlayed === 0) {
    return <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sin partidos registrados en este torneo</div>
  }
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Totals */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
          Mis estadísticas — {stats.gamesPlayed} partido{stats.gamesPlayed !== 1 ? 's' : ''}
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

      {/* Game history */}
      {stats.games?.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Partidos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.games.map((g: any) => (
              <StatsGameCard key={g.gameId} game={g} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatsGameCard({ game }: { game: any }) {
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
      {expanded && hasEvents && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {game.events.map((ev: any, i: number) => {
            const meta = EVENT_LABELS[ev.type]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < game.events.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{meta?.icon ?? '•'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meta?.color ?? 'var(--text)' }}>{meta?.label ?? ev.type}</span>
                  {ev.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{ev.description}</div>}
                </div>
                {ev.points > 0 && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>+{ev.points}pts</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const numCell: React.CSSProperties = {
  padding: '10px 6px',
  textAlign: 'center',
  color: 'var(--text-muted)',
}

const backBtnStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 20px',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: 13,
}
