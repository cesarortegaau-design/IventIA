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

  const isOffenseLocal = game.offenseTeamId === game.localTeamId
  const offenseTeam = isOffenseLocal ? game.localTeam : game.visitingTeam
  const isFinished = game.status === 'FINISHED'
  const isHalftime = game.status === 'HALFTIME'
  const gameEvents = game.gameEvents ?? []

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
          {game.localTeam?.logoUrl && (
            <img src={game.localTeam.logoUrl} height={28} style={{ objectFit: 'contain', borderRadius: 4 }} alt="" />
          )}
          <div className={`team-name ${game.offenseTeamId === game.localTeamId ? 'offense' : ''}`}>
            {playerName(game.localTeam)}
            {game.offenseTeamId === game.localTeamId && <span style={{ marginLeft: 4 }}>🏈</span>}
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
          {game.visitingTeam?.logoUrl && (
            <img src={game.visitingTeam.logoUrl} height={28} style={{ objectFit: 'contain', borderRadius: 4 }} alt="" />
          )}
          <div className={`team-name ${game.offenseTeamId === game.visitingTeamId ? 'offense' : ''}`}>
            {game.offenseTeamId === game.visitingTeamId && <span style={{ marginRight: 4 }}>🏈</span>}
            {playerName(game.visitingTeam)}
          </div>
          <div className="score-number">{game.visitingScore}</div>
        </div>
      </div>

      {/* Timer */}
      {!isFinished && (
        <div className="timer-section">
          <div className={`timer-display ${timerRunning ? 'running' : ''}`}>
            {formatTimer(localSeconds)}
          </div>
        </div>
      )}

      {/* Down tracker */}
      {!isFinished && !isHalftime && (
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
                  {playerName(offenseTeam)}
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
      )}

      {/* Finished summary */}
      {isFinished && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Partido Finalizado</div>
          <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>
            {game.localScore > game.visitingScore
              ? `Ganador: ${playerName(game.localTeam)}`
              : game.visitingScore > game.localScore
              ? `Ganador: ${playerName(game.visitingTeam)}`
              : 'Empate'}
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
