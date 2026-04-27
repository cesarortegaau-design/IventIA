import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Drawer } from 'antd'
import { HistoryOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { iflagApi } from '../api/iflag'

function playerName(c: any) {
  if (!c) return '—'
  return c.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || '—'
}

function TeamTag({ team, size = 22 }: { team: any; size?: number }) {
  if (!team) return <span>—</span>
  const name = playerName(team)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {team.logoUrl
        ? <img src={team.logoUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        : <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, color: 'var(--text-muted)', flexShrink: 0 }}>
            {(name[0] ?? '?').toUpperCase()}
          </span>}
      <span>{name}</span>
    </span>
  )
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DOWN_LABELS: Record<number, string> = { 1: '1°', 2: '2°', 3: '3°', 4: '4°' }
const EVENT_LABELS: Record<string, string> = {
  TOUCHDOWN: 'Touchdown',
  EXTRA_POINT: 'Punto Extra',
  SAFETY: 'Safety',
  FLAG_PENALTY: 'Castigo',
  DOWN_UPDATE: 'Down',
  POSSESSION_CHANGE: 'Cambio posesión',
  HALFTIME_START: 'Inicio medio tiempo',
  HALFTIME_END: 'Fin medio tiempo',
  GAME_END: 'Fin del partido',
  TIMER_START: 'Cronómetro iniciado',
  TIMER_STOP: 'Cronómetro detenido',
  GAME_START: 'Partido creado',
  TIMEOUT: 'Tiempo fuera',
  SCORE_ADJUST: 'Ajuste de marcador',
  INTERCEPTION: 'Intercepción',
}

export default function PublicGamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [logOpen, setLogOpen] = useState(false)
  const [localSeconds, setLocalSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: gameData, isLoading } = useQuery({
    queryKey: ['public-game', gameId],
    queryFn: () => iflagApi.publicGetGame(gameId!),
    refetchInterval: 5000,
  })
  const game = gameData?.data

  // Sync timer from server
  useEffect(() => {
    if (!game) return
    setLocalSeconds(game.timerSeconds ?? 0)
    setTimerRunning(game.timerRunning ?? false)
  }, [game?.timerSeconds, game?.timerRunning])

  // Local tick for smooth display
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setLocalSeconds(s => s + 1)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  if (isLoading || !game) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando partido...</div>
  }

  const HALF_DURATION = 20 * 60
  const isOffenseLocal = game.offenseTeamId === game.localTeamId
  const offenseTeam = isOffenseLocal ? game.localTeam : game.visitingTeam
  const isFinished = game.status === 'FINISHED'
  const isHalftime = game.status === 'HALFTIME'
  const gameEvents = game.gameEvents ?? []
  const isSecondHalf = game.currentQuarter >= 3
  const localTimeoutsUsed = isSecondHalf ? (game.localTimeoutsH2 ?? 0) : (game.localTimeoutsH1 ?? 0)
  const visitingTimeoutsUsed = isSecondHalf ? (game.visitingTimeoutsH2 ?? 0) : (game.visitingTimeoutsH1 ?? 0)
  const halfLabel = isSecondHalf ? '2T' : '1T'
  const remaining = HALF_DURATION - localSeconds
  const isOvertime = remaining < 0

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 16 }}>
      <div className="spectator-badge"><EyeOutlined /> En vivo</div>

      {/* Navbar */}
      <div className="navbar">
        <div className="nav-title" style={{ fontSize: 13, flex: 1, textAlign: 'center' }}>
          {game.event?.name ?? 'Partido'}
        </div>
        <button className="nav-action" onClick={() => setLogOpen(true)}>
          <HistoryOutlined />
        </button>
      </div>

      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="team-score home">
          <div className={`team-name ${game.offenseTeamId === game.localTeamId ? 'offense' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TeamTag team={game.localTeam} size={24} />
            {game.offenseTeamId === game.localTeamId && <span>🏈</span>}
          </div>
          <div className="score-number">{game.localScore}</div>
        </div>

        <div className="score-center">
          <div className="quarter-badge">
            {isHalftime ? 'MEDIO' : isFinished ? 'FINAL' : `Q${game.currentQuarter}`}
          </div>
          <div className="score-separator">:</div>
        </div>

        <div className="team-score away">
          <div className={`team-name ${game.offenseTeamId === game.visitingTeamId ? 'offense' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {game.offenseTeamId === game.visitingTeamId && <span>🏈</span>}
            <TeamTag team={game.visitingTeam} size={24} />
          </div>
          <div className="score-number">{game.visitingScore}</div>
        </div>
      </div>

      {/* Timer */}
      {!isFinished && (
        <div className="timer-section">
          <div className={`timer-display ${timerRunning ? 'running' : ''} ${isOvertime ? 'warning' : ''}`}>
            {formatTimer(localSeconds)}
          </div>
          <div style={{ fontSize: 13, color: isOvertime ? 'var(--orange)' : 'var(--text-muted)', marginTop: 4 }}>
            {isOvertime ? 'TIEMPO EXTRA' : `${halfLabel} — ${formatTimer(remaining)} restante`}
          </div>
        </div>
      )}

      {/* Possession bar */}
      {!isFinished && !isHalftime && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: 'rgba(0,230,118,0.08)', border: '1px solid var(--green)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            🏈 Posesión: <TeamTag team={offenseTeam} size={20} />
          </span>
        </div>
      )}

      {/* Down tracker */}
      {!isFinished && !isHalftime && (
        <>
          <div className="down-section">
            <div className="down-card">
              <div className="down-row">
                <div>
                  <div className="down-label">Down</div>
                  <div className="down-value">{DOWN_LABELS[game.currentDown] ?? `${game.currentDown}°`}</div>
                </div>
                <div>
                  <div className="down-label">Yardas</div>
                  <div className="down-value">{game.yardsToFirst === 0 ? 'GOAL' : `${game.yardsToFirst}y`}</div>
                </div>
                <div>
                  <div className="down-label">Posesión</div>
                  <div className="down-value" style={{ fontSize: 14, color: 'var(--green)' }}>
                    <TeamTag team={offenseTeam} size={18} />
                  </div>
                </div>
                <div className="down-dots">
                  {[1, 2, 3, 4].map(d => (
                    <div key={d} className={`down-dot ${d <= game.currentDown ? 'active' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Timeout indicators */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12, padding: '0 16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <TeamTag team={game.localTeam} size={16} />
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i <= localTimeoutsUsed ? '#faad14' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Tiempos fuera</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <TeamTag team={game.visitingTeam} size={16} />
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i <= visitingTimeoutsUsed ? '#faad14' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Finished summary */}
      {isFinished && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Partido Finalizado</div>
          <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>
            {game.localScore > game.visitingScore
              ? <span>Ganador: <TeamTag team={game.localTeam} size={22} /></span>
              : game.visitingScore > game.localScore
              ? <span>Ganador: <TeamTag team={game.visitingTeam} size={22} /></span>
              : <span>Empate</span>}
          </div>
          {game.finishedAt && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {dayjs(game.finishedAt).format('DD/MM/YYYY HH:mm')}
            </div>
          )}
        </div>
      )}

      {/* Recent events inline */}
      <div style={{ padding: '0 16px', marginTop: 16 }}>
        <div className="section-header">Jugadas recientes</div>
        {gameEvents.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>Sin eventos registrados</div>
        ) : (
          gameEvents.slice(0, 10).map((evt: any) => (
            <div key={evt.id} className="event-log-item">
              <div className={`event-dot ${evt.type}`} />
              <div style={{ flex: 1 }}>
                <div className="event-type">{EVENT_LABELS[evt.type] ?? evt.type}</div>
                {evt.description && <div className="event-desc">{evt.description}</div>}
                {evt.points > 0 && <div className="event-desc" style={{ color: 'var(--green)' }}>+{evt.points} pts</div>}
              </div>
              <div className="event-time">{dayjs(evt.createdAt).format('HH:mm:ss')}</div>
            </div>
          ))
        )}
      </div>

      {/* Full event log drawer */}
      <Drawer
        title={<span style={{ color: 'var(--text)' }}>Historial del Partido</span>}
        placement="bottom"
        height="65vh"
        open={logOpen}
        onClose={() => setLogOpen(false)}
      >
        <div>
          {gameEvents.map((evt: any) => (
            <div key={evt.id} className="event-log-item">
              <div className={`event-dot ${evt.type}`} />
              <div style={{ flex: 1 }}>
                <div className="event-type">{EVENT_LABELS[evt.type] ?? evt.type}</div>
                {evt.description && <div className="event-desc">{evt.description}</div>}
                {evt.points > 0 && <div className="event-desc" style={{ color: 'var(--green)' }}>+{evt.points} pts</div>}
              </div>
              <div className="event-time">{dayjs(evt.createdAt).format('HH:mm:ss')}</div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  )
}
