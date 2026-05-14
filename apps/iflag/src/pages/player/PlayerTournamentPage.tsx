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
  const [activeView, setActiveView] = useState<'standings' | 'calendar'>('standings')

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
        {(['standings', 'calendar'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              color: activeView === v ? 'var(--green)' : 'var(--text-muted)',
              borderBottom: activeView === v ? '2px solid var(--green)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {v === 'standings' ? 'Clasificación' : 'Calendario'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeView === 'standings' && activeCategory && standings[activeCategory] ? (
          <StandingsTable rows={standings[activeCategory].standings} />
        ) : activeView === 'calendar' ? (
          <CalendarList games={filteredCalendar} />
        ) : (
          <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            Sin datos disponibles
          </div>
        )}
      </div>
    </div>
  )
}

function StandingsTable({ rows }: { rows: any[] }) {
  if (!rows?.length) {
    return <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sin partidos jugados aún</div>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
              <th
                key={h}
                style={{ padding: '8px 10px', textAlign: h === 'Equipo' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.teamId} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.teamName}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CalendarList({ games }: { games: any[] }) {
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
        return (
          <div
            key={a.id}
            style={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '12px 16px',
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

            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              {a.startDate && (
                <span>{new Date(a.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {m?.venue?.name && <span>📍 {m.venue.name}</span>}
            </div>
          </div>
        )
      })}
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
