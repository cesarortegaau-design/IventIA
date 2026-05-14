import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { playerApi } from '../../api/player'
import dayjs from 'dayjs'

const EVENT_LABELS: Record<string, string> = {
  TOUCHDOWN: 'Touchdown',
  EXTRA_POINT: 'Punto Extra',
  TWO_POINT: '2 Puntos',
  FIELD_GOAL: 'Field Goal',
  SAFETY: 'Safety',
  FLAG_PENALTY: 'Castigo',
  INTERCEPTION: 'Intercepción',
  SACK: 'Sack',
  FLAG_PULL: 'Bandera',
  PENALTY: 'Penalización',
  DOWN_UPDATE: 'Down',
  POSSESSION_CHANGE: 'Cambio posesión',
  HALFTIME_START: 'Inicio medio tiempo',
  HALFTIME_END: 'Fin medio tiempo',
  GAME_END: 'Fin del partido',
  TIMER_START: 'Cronómetro iniciado',
  TIMER_STOP: 'Cronómetro detenido',
  GAME_START: 'Partido iniciado',
  TIMEOUT: 'Tiempo fuera',
  SCORE_ADJUST: 'Ajuste de marcador',
}

const catColors: Record<string, string> = { FEMENIL: '#e91e63', VARONIL: '#2196f3', MIXTO: '#7b1fa2' }
const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const name = team?.companyName || `${team?.firstName ?? ''} ${team?.lastName ?? ''}`.trim() || '?'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {team?.logoUrl
        ? <img src={team.logoUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
        : <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: 'var(--text-muted)', border: '2px solid var(--border)' }}>
            {(name[0] ?? '?').toUpperCase()}
          </div>}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'center', maxWidth: 100, lineHeight: 1.2 }}>{name}</div>
    </div>
  )
}

export default function SpectatorGamePage() {
  const { eventId, gameId } = useParams<{ eventId: string; gameId: string }>()
  const navigate = useNavigate()

  const { data: gameData, isLoading } = useQuery({
    queryKey: ['spectator-game', gameId],
    queryFn: () => playerApi.getPublicGame(gameId!),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'IN_PROGRESS' || status === 'HALFTIME' || status === 'ATTENDANCE' ? 5000 : false
    },
    enabled: !!gameId,
  })

  const { data: tournamentData } = useQuery({
    queryKey: ['tournament-public', eventId],
    queryFn: () => playerApi.getTournament(eventId!),
    enabled: !!eventId,
  })

  const game = gameData?.data
  const standings = tournamentData?.data?.standings ?? {}

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Cargando...
      </div>
    )
  }

  if (!game) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: 'var(--text-muted)' }}>Partido no encontrado</div>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 20px', color: 'var(--text)', cursor: 'pointer' }}>
          ← Volver
        </button>
      </div>
    )
  }

  const isLive = game.status === 'IN_PROGRESS' || game.status === 'HALFTIME' || game.status === 'ATTENDANCE'
  const isFinished = game.status === 'FINISHED'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 4, padding: 0 }}>
          ← Volver
        </button>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{game.event?.name ?? 'Partido'}</div>
        <div style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, marginTop: 2 }}>ESPECTADOR</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLive && <LiveView game={game} />}
        {isFinished && <FinishedView game={game} standings={standings} />}
        {!isLive && !isFinished && <PreGameView game={game} standings={standings} />}
      </div>
    </div>
  )
}

// ── Live View ────────────────────────────────────────────────────────────────

function LiveView({ game }: { game: any }) {
  const [localSeconds, setLocalSeconds] = useState(game.timerSeconds ?? 0)
  const [timerRunning, setTimerRunning] = useState(game.timerRunning ?? false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setLocalSeconds(game.timerSeconds ?? 0)
    setTimerRunning(game.timerRunning ?? false)
  }, [game.timerSeconds, game.timerRunning])

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setLocalSeconds(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  const isHalftime = game.status === 'HALFTIME'
  const isAttendance = game.status === 'ATTENDANCE'
  const HALF_DURATION = 20 * 60
  const remaining = HALF_DURATION - localSeconds
  const isOvertime = remaining < 0
  const isSecondHalf = (game.currentQuarter ?? 1) >= 3
  const halfLabel = isSecondHalf ? '2T' : '1T'
  const isOffenseLocal = game.offenseTeamId === game.localTeamId
  const offenseTeam = isOffenseLocal ? game.localTeam : game.visitingTeam
  const localTimeoutsUsed = isSecondHalf ? (game.localTimeoutsH2 ?? 0) : (game.localTimeoutsH1 ?? 0)
  const visitingTimeoutsUsed = isSecondHalf ? (game.visitingTimeoutsH2 ?? 0) : (game.visitingTimeoutsH1 ?? 0)
  const gameEvents = game.gameEvents ?? []
  const teamName = (t: any) => t?.companyName || `${t?.firstName ?? ''} ${t?.lastName ?? ''}`.trim() || '—'

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Live badge */}
      <div style={{ textAlign: 'center', padding: '8px 0', background: isAttendance ? 'var(--blue)22' : isHalftime ? 'var(--orange)22' : 'var(--green)22' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isAttendance ? 'var(--blue)' : isHalftime ? 'var(--orange)' : 'var(--green)' }}>
          {isAttendance ? '● PASE DE LISTA' : isHalftime ? '● MEDIO TIEMPO' : '⚡ EN JUEGO'}
        </span>
      </div>

      {/* Scoreboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '24px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center' }}>
          <TeamLogo team={game.localTeam} size={52} />
          {game.offenseTeamId === game.localTeamId && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>🏈 Posesión</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            {isHalftime ? 'MEDIO' : `Q${game.currentQuarter ?? 1}`}
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: 'var(--text)', lineHeight: 1, letterSpacing: '0.05em' }}>
            {game.localScore ?? 0} <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>–</span> {game.visitingScore ?? 0}
          </div>
          {!isAttendance && (
            <div style={{ fontSize: 20, fontWeight: 700, color: isOvertime ? 'var(--orange)' : 'var(--text)', marginTop: 8, fontFamily: 'monospace' }}>
              {formatTimer(localSeconds)}
            </div>
          )}
          {!isAttendance && !isHalftime && (
            <div style={{ fontSize: 11, color: isOvertime ? 'var(--orange)' : 'var(--text-muted)', marginTop: 2 }}>
              {isOvertime ? 'TIEMPO EXTRA' : `${halfLabel} — ${formatTimer(remaining)}`}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <TeamLogo team={game.visitingTeam} size={52} />
          {game.offenseTeamId === game.visitingTeamId && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>🏈 Posesión</div>}
        </div>
      </div>

      {/* Down tracker */}
      {!isHalftime && !isAttendance && (
        <div style={{ margin: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <Stat label="Down" value={`${game.currentDown ?? 1}°`} />
            <Stat label="Yardas" value={game.yardsToFirst === 0 ? 'GOAL' : `${game.yardsToFirst ?? 0}y`} />
            <Stat label="Tiempos fuera L" value={`${2 - localTimeoutsUsed}/2`} />
            <Stat label="Tiempos fuera V" value={`${2 - visitingTimeoutsUsed}/2`} />
          </div>
        </div>
      )}

      {/* Recent plays */}
      {gameEvents.length > 0 && (
        <div style={{ padding: '0 16px', marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Jugadas recientes
          </div>
          {gameEvents.slice(0, 8).map((evt: any) => (
            <EventRow key={evt.id} evt={evt} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pre-Game View ────────────────────────────────────────────────────────────

function PreGameView({ game, standings }: { game: any; standings: any }) {
  const localStats = findTeamStats(standings, game.localTeamId)
  const visitingStats = findTeamStats(standings, game.visitingTeamId)

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Scheduled info */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, textAlign: 'center' }}>
          Partido pendiente
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}><TeamLogo team={game.localTeam} size={56} /></div>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 22, fontWeight: 700 }}>VS</div>
          <div style={{ textAlign: 'center' }}><TeamLogo team={game.visitingTeam} size={56} /></div>
        </div>
        {game.scheduledAt && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            {dayjs(game.scheduledAt).format('DD MMM YYYY [–] HH:mm')}
          </div>
        )}
      </div>

      {/* Team stats comparison */}
      {(localStats || visitingStats) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Estadísticas del torneo
          </div>
          <StatsComparison localStats={localStats} visitingStats={visitingStats} localTeam={game.localTeam} visitingTeam={game.visitingTeam} />
        </div>
      )}
    </div>
  )
}

// ── Finished View ────────────────────────────────────────────────────────────

function FinishedView({ game, standings }: { game: any; standings: any }) {
  const localStats = findTeamStats(standings, game.localTeamId)
  const visitingStats = findTeamStats(standings, game.visitingTeamId)
  const gameEvents = game.gameEvents ?? []
  const localWon = (game.localScore ?? 0) > (game.visitingScore ?? 0)
  const visitingWon = (game.visitingScore ?? 0) > (game.localScore ?? 0)
  const draw = !localWon && !visitingWon

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Final score */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 16px' }}>
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          Resultado final
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <TeamLogo team={game.localTeam} size={52} />
            {localWon && <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginTop: 6 }}>GANADOR</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: 'var(--text)', letterSpacing: '0.05em', lineHeight: 1 }}>
              {game.localScore ?? 0} <span style={{ color: 'var(--text-muted)', fontSize: 32 }}>–</span> {game.visitingScore ?? 0}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: draw ? 'var(--text-muted)' : 'transparent' }}>EMPATE</div>
            {game.finishedAt && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {dayjs(game.finishedAt).format('DD/MM/YYYY HH:mm')}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <TeamLogo team={game.visitingTeam} size={52} />
            {visitingWon && <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginTop: 6 }}>GANADOR</div>}
          </div>
        </div>
      </div>

      {/* Stats comparison */}
      {(localStats || visitingStats) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Estadísticas del torneo
          </div>
          <StatsComparison localStats={localStats} visitingStats={visitingStats} localTeam={game.localTeam} visitingTeam={game.visitingTeam} />
        </div>
      )}

      {/* Event log */}
      {gameEvents.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Log del partido ({gameEvents.length} eventos)
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 16px' }}>
            {gameEvents.map((evt: any) => (
              <EventRow key={evt.id} evt={evt} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────

function StatsComparison({ localStats, visitingStats, localTeam, visitingTeam }: any) {
  const rows = [
    { label: 'PJ', lVal: localStats?.played, vVal: visitingStats?.played },
    { label: 'G', lVal: localStats?.won, vVal: visitingStats?.won, green: true },
    { label: 'E', lVal: localStats?.drawn, vVal: visitingStats?.drawn },
    { label: 'P', lVal: localStats?.lost, vVal: visitingStats?.lost, red: true },
    { label: 'GF', lVal: localStats?.gf, vVal: visitingStats?.gf },
    { label: 'GC', lVal: localStats?.ga, vVal: visitingStats?.ga },
    { label: 'Pts', lVal: localStats?.points, vVal: visitingStats?.points, bold: true },
  ]

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {localTeam?.companyName ?? '—'}
        </div>
        <div />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {visitingTeam?.companyName ?? '—'}
        </div>
      </div>
      {rows.map(({ label, lVal, vVal, green, red, bold }) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 8, alignItems: 'center' }}>
          <div style={{ textAlign: 'right', fontSize: 14, fontWeight: bold ? 700 : 500, color: green ? 'var(--green)' : red ? 'var(--red)' : 'var(--text)' }}>
            {lVal ?? '—'}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
          <div style={{ textAlign: 'left', fontSize: 14, fontWeight: bold ? 700 : 500, color: green ? 'var(--green)' : red ? 'var(--red)' : 'var(--text)' }}>
            {vVal ?? '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

function EventRow({ evt }: { evt: any }) {
  const dot: Record<string, string> = {
    TOUCHDOWN: 'var(--green)', EXTRA_POINT: 'var(--green)', TWO_POINT: 'var(--green)',
    INTERCEPTION: 'var(--orange)', SAFETY: 'var(--orange)', PENALTY: 'var(--red)',
    FLAG_PENALTY: 'var(--red)', SACK: 'var(--red)', TIMEOUT: '#faad14',
    SCORE_ADJUST: 'var(--blue)',
  }
  const color = dot[evt.type] ?? 'var(--text-muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{EVENT_LABELS[evt.type] ?? evt.type}</div>
        {evt.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{evt.description}</div>}
        {evt.points > 0 && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 2 }}>+{evt.points} pts</div>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{dayjs(evt.createdAt).format('HH:mm:ss')}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findTeamStats(standings: any, teamId: string | null | undefined) {
  if (!teamId || !standings) return null
  for (const cat of Object.values(standings) as any[]) {
    const row = cat?.standings?.find((r: any) => r.teamId === teamId)
    if (row) return row
  }
  return null
}
