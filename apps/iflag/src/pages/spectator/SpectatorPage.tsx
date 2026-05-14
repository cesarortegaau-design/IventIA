import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { playerApi } from '../../api/player'

const catColors: Record<string, string> = { FEMENIL: '#e91e63', VARONIL: '#2196f3', MIXTO: '#7b1fa2' }
const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }
const GAME_STATUS_COLORS: Record<string, string> = { PENDING: 'var(--text-muted)', ATTENDANCE: 'var(--blue)', IN_PROGRESS: 'var(--green)', HALFTIME: 'var(--orange)', FINISHED: 'var(--text-muted)' }
const GAME_STATUS_LABELS: Record<string, string> = { PENDING: 'Pendiente', ATTENDANCE: 'Pase de lista', IN_PROGRESS: '⚡ En juego', HALFTIME: 'Medio tiempo', FINISHED: 'Finalizado' }

export default function SpectatorPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const navigate = useNavigate()

  if (eventId) return <TournamentDetail eventId={eventId} />
  return <TournamentList />
}

function TournamentList() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-tournaments'],
    queryFn: playerApi.listTournaments,
  })
  const tournaments = data?.data ?? []

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>TORNEOS</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Modo espectador</div>
        </div>
        <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>← Volver</Link>
      </div>

      <div style={{ flex: 1, padding: '16px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        {isLoading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 60 }}>Cargando torneos...</div>
        ) : !tournaments.length ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 60 }}>
            No hay torneos disponibles
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tournaments.map((t: any) => (
              <button
                key={t.id}
                onClick={() => window.location.href = `/spectator/${t.eventId}`}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{t.event?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t.event?.eventStart ? new Date(t.event.eventStart).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
                <div style={{ marginTop: 8, fontSize: 20, color: 'var(--text-muted)', textAlign: 'right' }}>›</div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/player/login" style={{ color: 'var(--blue)', fontSize: 13 }}>
            ¿Eres jugador? Inicia sesión →
          </Link>
        </div>
      </div>
    </div>
  )
}

function TournamentDetail({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('')
  const [activeView, setActiveView] = useState<'standings' | 'calendar'>('standings')

  const { data: tournamentData, isLoading } = useQuery({
    queryKey: ['tournament-public', eventId],
    queryFn: () => playerApi.getTournament(eventId),
  })

  const { data: calendarData } = useQuery({
    queryKey: ['tournament-calendar', eventId],
    queryFn: () => playerApi.getCalendar(eventId),
    refetchInterval: 30000,
  })

  const tournament = tournamentData?.data
  const standings = tournament?.standings ?? {}
  const categories = Object.keys(standings)
  const calendar = calendarData?.data ?? []

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0])
  }, [categories])

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Cargando...
      </div>
    )
  }

  if (!tournament) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: 'var(--text-muted)' }}>Torneo no encontrado</div>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 20px', color: 'var(--text)', cursor: 'pointer' }}>
          ← Volver
        </button>
      </div>
    )
  }

  const filteredCalendar = activeCategory
    ? calendar.filter((a: any) => a.matchData?.category === activeCategory)
    : calendar

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 4, padding: 0 }}>
          ← Torneos
        </button>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{tournament.config?.event?.name}</div>
        <div style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, marginTop: 2 }}>ESPECTADOR</div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
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
            style={{ flex: 1, background: 'none', border: 'none', padding: '10px', fontSize: 13, fontWeight: 600, color: activeView === v ? 'var(--orange)' : 'var(--text-muted)', borderBottom: activeView === v ? '2px solid var(--orange)' : '2px solid transparent', cursor: 'pointer' }}
          >
            {v === 'standings' ? 'Clasificación' : 'Calendario'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeView === 'standings' && activeCategory && standings[activeCategory] ? (
          <StandingsTable rows={standings[activeCategory].standings} />
        ) : activeView === 'calendar' ? (
          <CalendarList games={filteredCalendar} eventId={eventId} />
        ) : (
          <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sin datos disponibles</div>
        )}
      </div>
    </div>
  )
}

function StandingsTable({ rows }: { rows: any[] }) {
  if (!rows?.length) return <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sin partidos jugados aún</div>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Equipo' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.teamId} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.teamName}</td>
              <td style={nc}>{row.played}</td>
              <td style={{ ...nc, color: 'var(--green)' }}>{row.won}</td>
              <td style={nc}>{row.drawn}</td>
              <td style={{ ...nc, color: 'var(--red)' }}>{row.lost}</td>
              <td style={nc}>{row.gf}</td>
              <td style={nc}>{row.ga}</td>
              <td style={{ ...nc, color: row.gd >= 0 ? 'var(--green)' : 'var(--red)' }}>{row.gd > 0 ? '+' : ''}{row.gd}</td>
              <td style={{ ...nc, fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CalendarList({ games, eventId }: { games: any[]; eventId?: string }) {
  const navigate = useNavigate()
  if (!games.length) return <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sin partidos programados</div>
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
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', cursor: clickable ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 4, padding: '1px 6px' }}>J{m?.round ?? '?'}</span>
                <span style={{ fontSize: 11, color: catColors[m?.category] ?? 'var(--text-muted)', fontWeight: 600 }}>{catLabels[m?.category] ?? m?.category}</span>
              </div>
              {iflagStatus && (
                <span style={{ fontSize: 11, color: GAME_STATUS_COLORS[iflagStatus], fontWeight: 600 }}>
                  {GAME_STATUS_LABELS[iflagStatus] ?? iflagStatus}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textAlign: 'left' }}>{m?.homeTeam?.companyName ?? '—'}</div>
              <div style={{ textAlign: 'center', minWidth: 60 }}>
                {hasScore ? (
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--text)', letterSpacing: '0.05em' }}>{m.homeScore} – {m.visitingScore}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>vs</span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>{m?.visitingTeam?.companyName ?? '—'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                {a.startDate && <span>{new Date(a.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
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

const nc: React.CSSProperties = { padding: '10px 6px', textAlign: 'center', color: 'var(--text-muted)' }
