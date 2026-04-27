import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Modal, Select, Drawer, InputNumber } from 'antd'
import {
  ArrowLeftOutlined, HistoryOutlined, EyeOutlined,
  TeamOutlined, PauseCircleOutlined, PlayCircleOutlined,
  EditOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { iflagApi } from '../api/iflag'

function playerName(c: any) {
  if (!c) return '—'
  return c.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || '—'
}

const HALF_DURATION = 20 * 60 // 20 min per half

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

type ActionType =
  | 'TD' | 'XP1' | 'XP2' | 'SAFETY' | 'PENALTY'
  | 'NEXT_DOWN' | 'PREV_DOWN' | 'POSSESSION'
  | 'HALFTIME' | 'END_GAME' | 'TIMEOUT' | 'SCORE_ADJUST'
  | 'INTERCEPTION' | null

// Label helper for attendance player (text-only)
function plyLabel(a: any) {
  const num = a.number || a.player?.playerNumber
  return `${num ? `#${num} ` : ''}${playerName(a.player)}`
}

// Avatar + number + name inline element for player display
function PlayerTag({ player, size = 20 }: { player: any; size?: number }) {
  if (!player) return <span>—</span>
  const num = player.playerNumber
  const name = player.companyName || `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || '—'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {player.logoUrl
        ? <img src={player.logoUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        : <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, color: 'var(--text-muted)', flexShrink: 0 }}>
            {(name[0] ?? '?').toUpperCase()}
          </span>}
      {num && <span style={{ fontWeight: 800, fontSize: size * 0.65, color: 'var(--green)' }}>#{num}</span>}
      <span>{name}</span>
    </span>
  )
}

// Team badge with logo + name
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

// Build Ant Select options with player image+number
function playerOptions(attendees: any[]) {
  return attendees.map((a: any) => ({
    value: a.playerId,
    label: <PlayerTag player={a.player} size={18} />,
    searchLabel: plyLabel(a),
  }))
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSpectator = searchParams.get('mode') === 'spectator'
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [localSeconds, setLocalSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [action, setAction] = useState<ActionType>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>()
  // TD extra fields
  const [tdPasser, setTdPasser] = useState<string | undefined>()
  const [tdReceiver, setTdReceiver] = useState<string | undefined>()
  const [tdIsRush, setTdIsRush] = useState(false)
  const [tdRunner, setTdRunner] = useState<string | undefined>()
  // Interception
  const [intPlayer, setIntPlayer] = useState<string | undefined>()

  const [logOpen, setLogOpen] = useState(false)
  const [adjustLocalScore, setAdjustLocalScore] = useState(0)
  const [adjustVisitingScore, setAdjustVisitingScore] = useState(0)

  const { data: gameData, isLoading } = useQuery({
    queryKey: ['iflag-game', gameId],
    queryFn: () => iflagApi.getGame(gameId!),
    refetchInterval: isSpectator ? 5000 : false,
  })
  const game = gameData?.data

  const { data: eventsData } = useQuery({
    queryKey: ['iflag-game-events', gameId],
    queryFn: () => iflagApi.listGameEvents(gameId!),
    enabled: logOpen,
  })
  const gameEvents = eventsData?.data ?? []

  // Sync timer from server
  useEffect(() => {
    if (!game) return
    setLocalSeconds(game.timerSeconds ?? 0)
    setTimerRunning(game.timerRunning ?? false)
  }, [game?.timerSeconds, game?.timerRunning])

  // Local tick (ascending)
  useEffect(() => {
    if (timerRunning && !isSpectator) {
      intervalRef.current = setInterval(() => {
        setLocalSeconds(s => s + 1)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning, isSpectator])

  const timerStartMutation = useMutation({
    mutationFn: () => iflagApi.startTimer(gameId!),
    onSuccess: (res) => {
      setTimerRunning(true)
      setLocalSeconds(res.data.timerSeconds ?? localSeconds)
    },
    onError: () => message.error('Error al iniciar cronómetro'),
  })

  const timerStopMutation = useMutation({
    mutationFn: () => iflagApi.stopTimer(gameId!),
    onSuccess: (res) => {
      setTimerRunning(false)
      setLocalSeconds(res.data.timerSeconds ?? localSeconds)
    },
    onError: () => message.error('Error al detener cronómetro'),
  })

  const timerResetMutation = useMutation({
    mutationFn: () => iflagApi.resetTimer(gameId!),
    onSuccess: () => {
      setTimerRunning(false)
      setLocalSeconds(0)
    },
  })

  const recordEventMutation = useMutation({
    mutationFn: (data: any) => iflagApi.recordEvent(gameId!, data),
    onSuccess: (res) => {
      qc.setQueryData(['iflag-game', gameId], (old: any) => old
        ? { ...old, data: { ...old.data, ...res.data.game } }
        : old)
      if (res.data.game) {
        setLocalSeconds(res.data.game.timerSeconds ?? localSeconds)
        setTimerRunning(res.data.game.timerRunning ?? timerRunning)
      }
      resetActionState()
      message.success('Registrado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al registrar'),
  })

  function resetActionState() {
    setAction(null)
    setSelectedTeamId(undefined)
    setSelectedPlayerId(undefined)
    setTdPasser(undefined)
    setTdReceiver(undefined)
    setTdIsRush(false)
    setTdRunner(undefined)
    setIntPlayer(undefined)
  }

  const handleAction = useCallback((type: ActionType) => {
    if (isSpectator) return
    setAction(type)
    setSelectedTeamId(game?.offenseTeamId ?? game?.localTeamId)
    setSelectedPlayerId(undefined)
    setTdPasser(undefined)
    setTdReceiver(undefined)
    setTdIsRush(false)
    setTdRunner(undefined)
    setIntPlayer(undefined)
    if (type === 'SCORE_ADJUST' && game) {
      setAdjustLocalScore(game.localScore)
      setAdjustVisitingScore(game.visitingScore)
    }
  }, [isSpectator, game])

  // Direct actions (no confirmation modal)
  function doNextDown() {
    if (!game) return
    const nextDown = (game.currentDown % 4) + 1
    const newOffense = nextDown === 1
      ? (game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId)
      : game.offenseTeamId
    recordEventMutation.mutate({
      type: 'DOWN_UPDATE',
      quarter: game.currentQuarter,
      down: nextDown,
      newCurrentDown: nextDown,
      newYardsToFirst: nextDown === 1 ? 10 : game.yardsToFirst,
      newOffenseTeamId: newOffense,
      description: `${DOWN_LABELS[nextDown]} down`,
    })
  }

  function doPrevDown() {
    if (!game) return
    const prevDown = game.currentDown > 1 ? game.currentDown - 1 : 1
    recordEventMutation.mutate({
      type: 'DOWN_UPDATE',
      quarter: game.currentQuarter,
      down: prevDown,
      newCurrentDown: prevDown,
      description: `Regresar a ${DOWN_LABELS[prevDown]} down`,
    })
  }

  function getPlayerLabel(playerId: string | undefined) {
    if (!playerId || !game) return ''
    const att = (game.attendance ?? []).find((a: any) => a.playerId === playerId)
    if (!att) return ''
    return plyLabel(att)
  }

  function confirmAction() {
    if (!action || !game) return

    const base = { teamId: selectedTeamId, playerId: selectedPlayerId ?? null }
    const teamLabel = selectedTeamId === game.localTeamId ? playerName(game.localTeam) : playerName(game.visitingTeam)

    if (action === 'TD') {
      let desc = `Touchdown — ${teamLabel}`
      if (tdIsRush && tdRunner) {
        desc += ` | Carrera: ${getPlayerLabel(tdRunner)}`
      } else {
        if (tdPasser) desc += ` | Pase: ${getPlayerLabel(tdPasser)}`
        if (tdReceiver) desc += ` | Recepción: ${getPlayerLabel(tdReceiver)}`
      }
      recordEventMutation.mutate({
        type: 'TOUCHDOWN', ...base, points: 6, applyScore: true,
        playerId: tdIsRush ? tdRunner : tdReceiver ?? tdPasser ?? null,
        description: desc,
        metadata: {
          passerId: tdIsRush ? null : tdPasser,
          receiverId: tdIsRush ? null : tdReceiver,
          runnerId: tdIsRush ? tdRunner : null,
          isRush: tdIsRush,
        },
      })
    } else if (action === 'XP1') {
      recordEventMutation.mutate({
        type: 'EXTRA_POINT', ...base, points: 1, applyScore: true,
        description: `Punto extra (1pt) — ${teamLabel}`,
      })
    } else if (action === 'XP2') {
      recordEventMutation.mutate({
        type: 'EXTRA_POINT', ...base, points: 2, applyScore: true,
        description: `Punto extra (2pts) — ${teamLabel}`,
      })
    } else if (action === 'SAFETY') {
      recordEventMutation.mutate({
        type: 'SAFETY', ...base, points: 2, applyScore: true,
        description: `Safety — ${teamLabel}`,
      })
    } else if (action === 'PENALTY') {
      recordEventMutation.mutate({
        type: 'FLAG_PENALTY', ...base, points: 0,
        description: `Castigo — ${teamLabel}`,
      })
    } else if (action === 'POSSESSION') {
      const newOffense = game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId
      recordEventMutation.mutate({
        type: 'POSSESSION_CHANGE',
        newOffenseTeamId: newOffense,
        newCurrentDown: 1,
        newYardsToFirst: 10,
        description: 'Cambio de posesión',
      })
    } else if (action === 'INTERCEPTION') {
      const defenseTeamId = game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId
      let desc = `Intercepción — ${defenseTeamId === game.localTeamId ? playerName(game.localTeam) : playerName(game.visitingTeam)}`
      if (intPlayer) desc += ` | ${getPlayerLabel(intPlayer)}`
      recordEventMutation.mutate({
        type: 'INTERCEPTION',
        teamId: defenseTeamId,
        playerId: intPlayer ?? null,
        description: desc,
      })
    } else if (action === 'HALFTIME') {
      const isHT = game.status === 'HALFTIME'
      recordEventMutation.mutate({
        type: isHT ? 'HALFTIME_END' : 'HALFTIME_START',
        description: isHT ? 'Inicio segunda mitad' : 'Inicio de medio tiempo',
      })
    } else if (action === 'TIMEOUT') {
      recordEventMutation.mutate({
        type: 'TIMEOUT', teamId: selectedTeamId,
        description: `Tiempo fuera — ${teamLabel}`,
      })
    } else if (action === 'SCORE_ADJUST') {
      recordEventMutation.mutate({
        type: 'SCORE_ADJUST', newLocalScore: adjustLocalScore, newVisitingScore: adjustVisitingScore,
        description: `Ajuste: ${adjustLocalScore} - ${adjustVisitingScore}`,
      })
    } else if (action === 'END_GAME') {
      recordEventMutation.mutate({ type: 'GAME_END', description: 'Partido finalizado' })
    }
  }

  if (isLoading || !game) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando partido...</div>
  }

  const isOffenseLocal = game.offenseTeamId === game.localTeamId
  const offenseTeam = isOffenseLocal ? game.localTeam : game.visitingTeam
  const defenseTeam = isOffenseLocal ? game.visitingTeam : game.localTeam
  const isFinished = game.status === 'FINISHED'
  const isHalftime = game.status === 'HALFTIME'

  // Players for selected team
  const actionTeamPlayers = (game.attendance ?? [])
    .filter((a: any) => a.teamId === selectedTeamId && a.present)
  // Players for defense team (interception)
  const defenseTeamId = game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId
  const defenseTeamPlayers = (game.attendance ?? [])
    .filter((a: any) => a.teamId === defenseTeamId && a.present)

  const isSecondHalf = game.currentQuarter >= 3
  const localTimeoutsUsed = isSecondHalf ? (game.localTimeoutsH2 ?? 0) : (game.localTimeoutsH1 ?? 0)
  const visitingTimeoutsUsed = isSecondHalf ? (game.visitingTimeoutsH2 ?? 0) : (game.visitingTimeoutsH1 ?? 0)

  // Timer display: ascending, show half limit
  const halfLabel = isSecondHalf ? '2T' : '1T'
  const overTime = localSeconds > HALF_DURATION

  const actionLabel: Record<string, string> = {
    TD: 'Touchdown', XP1: 'Punto Extra (1pt)', XP2: 'Punto Extra (2pts)', SAFETY: 'Safety',
    PENALTY: 'Castigo', NEXT_DOWN: 'Siguiente Down', PREV_DOWN: 'Regresar Down',
    POSSESSION: 'Cambio Posesión', HALFTIME: isHalftime ? 'Fin Medio Tiempo' : 'Medio Tiempo',
    END_GAME: 'Finalizar Partido', TIMEOUT: 'Tiempo Fuera',
    SCORE_ADJUST: 'Ajustar Marcador', INTERCEPTION: 'Intercepción',
  }

  const selectStyle = { width: '100%' }
  const labelStyle = { fontSize: 12, color: '#e6edf3', marginBottom: 6, fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
  // Custom filter for Select with ReactNode labels
  const filterPlayer = (input: string, option: any) => {
    const text = option?.searchLabel ?? ''
    return text.toLowerCase().includes(input.toLowerCase())
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 16 }}>
      {isSpectator && <div className="spectator-badge"><EyeOutlined /> Espectador</div>}

      {/* Navbar */}
      <div className="navbar">
        <button className="nav-back" onClick={() => navigate('/games')}>
          <ArrowLeftOutlined />
        </button>
        <div className="nav-title" style={{ fontSize: 13 }}>
          {game.event?.name ?? 'Partido'}
        </div>
        <button className="nav-action" onClick={() => { setLogOpen(true); qc.invalidateQueries({ queryKey: ['iflag-game-events', gameId] }) }}>
          <HistoryOutlined />
        </button>
        {!isSpectator && (
          <button className="nav-action" onClick={() => navigate(`/games/${gameId}?mode=spectator`)}>
            <EyeOutlined />
          </button>
        )}
      </div>

      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="team-score home">
          <div className={`team-name ${isOffenseLocal ? 'offense' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TeamTag team={game.localTeam} size={24} />
            {isOffenseLocal && <span>🏈</span>}
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
          <div className={`team-name ${!isOffenseLocal ? 'offense' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {!isOffenseLocal && <span>🏈</span>}
            <TeamTag team={game.visitingTeam} size={24} />
          </div>
          <div className="score-number">{game.visitingScore}</div>
        </div>
      </div>

      {/* Possession bar */}
      {!isFinished && !isHalftime && (
        <div style={{
          background: 'rgba(0,230,118,0.08)', borderBottom: '2px solid var(--green)',
          padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            🏈 Posesión: <TeamTag team={offenseTeam} size={20} />
          </span>
        </div>
      )}

      {/* Timer */}
      {!isFinished && (
        <div className="timer-section">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {halfLabel} — {overTime ? 'TIEMPO EXTRA' : `${formatTimer(HALF_DURATION - localSeconds)} restante`}
          </div>
          <div className={`timer-display ${timerRunning ? 'running' : ''} ${overTime ? 'warning' : ''}`}>
            {formatTimer(localSeconds)}
          </div>
          {!isSpectator && !isHalftime && (
            <div className="timer-controls">
              {timerRunning ? (
                <button className="timer-btn stop" onClick={() => timerStopMutation.mutate()} disabled={timerStopMutation.isPending}>
                  <PauseCircleOutlined style={{ marginRight: 4 }} /> Detener
                </button>
              ) : (
                <button className="timer-btn start" onClick={() => timerStartMutation.mutate()} disabled={timerStartMutation.isPending}>
                  <PlayCircleOutlined style={{ marginRight: 4 }} /> Iniciar
                </button>
              )}
              <button className="timer-btn reset" onClick={() => timerResetMutation.mutate()} disabled={timerResetMutation.isPending}>
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* Down tracker + direct down buttons */}
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
              <div className="down-dots">
                {[1, 2, 3, 4].map(d => (
                  <div key={d} className={`down-dot ${d <= game.currentDown ? 'active' : ''}`} />
                ))}
              </div>
            </div>
            {/* Direct down buttons — no modal confirmation */}
            {!isSpectator && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="timer-btn reset"
                  style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                  onClick={doPrevDown}
                  disabled={game.currentDown <= 1 || recordEventMutation.isPending}
                >
                  ◀ Regresar
                </button>
                <button
                  className="timer-btn start"
                  style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                  onClick={doNextDown}
                  disabled={recordEventMutation.isPending}
                >
                  Siguiente ▶
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons — referee only, game in progress */}
      {!isSpectator && !isFinished && (
        <div className="actions-section">
          <div className="section-header">Acciones</div>
          <div className="actions-grid">
            {!isHalftime && (
              <>
                <button className="action-btn td" onClick={() => handleAction('TD')}>
                  <span className="action-icon">🏈</span>
                  Touchdown +6
                </button>
                <button className="action-btn xp" onClick={() => handleAction('XP1')}>
                  <span className="action-icon">✔</span>
                  Extra +1
                </button>
                <button className="action-btn xp" onClick={() => handleAction('XP2')}>
                  <span className="action-icon">✔✔</span>
                  Extra +2
                </button>
                <button className="action-btn safety" onClick={() => handleAction('SAFETY')}>
                  <span className="action-icon">🛡</span>
                  Safety +2
                </button>
                <button className="action-btn penalty" onClick={() => handleAction('PENALTY')}>
                  <span className="action-icon">🚩</span>
                  Castigo
                </button>
                <button className="action-btn interception" onClick={() => handleAction('INTERCEPTION')}>
                  <span className="action-icon">🤚</span>
                  Intercepción
                </button>
                <button className="action-btn possession" onClick={() => handleAction('POSSESSION')}>
                  <span className="action-icon"><TeamOutlined /></span>
                  Cambiar Posesión
                </button>
                <button className="action-btn timeout" onClick={() => handleAction('TIMEOUT')}>
                  <span className="action-icon">⏱</span>
                  Tiempo Fuera
                </button>
              </>
            )}
            <button className="action-btn halftime" onClick={() => handleAction('HALFTIME')}>
              <span className="action-icon">⏸</span>
              {isHalftime ? 'Fin Medio Tiempo' : 'Medio Tiempo'}
            </button>
            <button className="action-btn score-adjust" onClick={() => handleAction('SCORE_ADJUST')}>
              <span className="action-icon"><EditOutlined /></span>
              Ajustar Marcador
            </button>
            <button className="action-btn end-game" onClick={() => handleAction('END_GAME')}>
              <span className="action-icon">🏁</span>
              Finalizar Partido
            </button>
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
        </div>
      )}

      {/* Finished summary */}
      {isFinished && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Partido Finalizado</div>
          <div style={{ fontSize: 16, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
          <button className="timer-btn start" style={{ marginTop: 24 }} onClick={() => navigate('/games')}>
            Volver a Partidos
          </button>
        </div>
      )}

      {/* Action confirmation modal */}
      <Modal
        open={action !== null}
        title={<span style={{ color: '#e6edf3' }}>{action ? actionLabel[action as string] : ''}</span>}
        onCancel={resetActionState}
        onOk={confirmAction}
        okText="Confirmar"
        okButtonProps={{
          loading: recordEventMutation.isPending,
          style: { background: 'var(--green)', borderColor: 'var(--green)', color: '#000', fontWeight: 700 },
        }}
        cancelButtonProps={{ style: { color: '#e6edf3' } }}
        destroyOnClose
      >
        {action === 'END_GAME' ? (
          <div style={{ color: '#e6edf3', fontSize: 15 }}>
            ¿Confirmar el cierre del partido?<br />
            <span style={{ color: '#adb5bd', fontSize: 13 }}>Esta acción publicará el marcador final.</span>
          </div>
        ) : action === 'TD' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Team selector */}
            <div>
              <div style={labelStyle}>Equipo</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[game.localTeam, game.visitingTeam].map((t: any) => (
                  <button
                    key={t.id}
                    className={`player-option ${selectedTeamId === t.id ? 'selected' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedTeamId(t.id); setTdPasser(undefined); setTdReceiver(undefined); setTdRunner(undefined) }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e6edf3' }}><TeamTag team={t} size={20} /></div>
                  </button>
                ))}
              </div>
            </div>
            {/* Rush or Pass toggle */}
            <div>
              <div style={labelStyle}>Tipo de anotación</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className={`player-option ${!tdIsRush ? 'selected' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setTdIsRush(false)}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#e6edf3' }}>Pase</div>
                </button>
                <button
                  className={`player-option ${tdIsRush ? 'selected' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setTdIsRush(true)}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#e6edf3' }}>Carrera</div>
                </button>
              </div>
            </div>
            {/* Pass: passer + receiver */}
            {!tdIsRush && selectedTeamId && (
              <>
                <div>
                  <div style={labelStyle}>Lanza el pase</div>
                  <Select
                    style={selectStyle}
                    placeholder="Seleccionar QB..."
                    allowClear showSearch filterOption={filterPlayer}
                    value={tdPasser} onChange={setTdPasser}
                    options={playerOptions(actionTeamPlayers)}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Recibe / Anota</div>
                  <Select
                    style={selectStyle}
                    placeholder="Seleccionar receptor..."
                    allowClear showSearch filterOption={filterPlayer}
                    value={tdReceiver} onChange={setTdReceiver}
                    options={playerOptions(actionTeamPlayers)}
                  />
                </div>
              </>
            )}
            {/* Rush: runner */}
            {tdIsRush && selectedTeamId && (
              <div>
                <div style={labelStyle}>Anotó por carrera</div>
                <Select
                  style={selectStyle}
                  placeholder="Seleccionar corredor..."
                  allowClear showSearch filterOption={filterPlayer}
                  value={tdRunner} onChange={setTdRunner}
                  options={playerOptions(actionTeamPlayers)}
                />
              </div>
            )}
          </div>
        ) : action === 'INTERCEPTION' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ color: '#e6edf3', fontSize: 14 }}>
              La posesión cambiará automáticamente a <strong><TeamTag team={defenseTeam} size={18} /></strong>
            </div>
            <div>
              <div style={labelStyle}>Jugador que intercepta</div>
              <Select
                style={selectStyle}
                placeholder="Seleccionar jugador..."
                allowClear showSearch filterOption={filterPlayer}
                value={intPlayer} onChange={setIntPlayer}
                options={playerOptions(defenseTeamPlayers)}
              />
            </div>
          </div>
        ) : action === 'SCORE_ADJUST' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}><TeamTag team={game.localTeam} size={20} /></div>
              <InputNumber style={{ width: '100%' }} min={0} value={adjustLocalScore} onChange={v => setAdjustLocalScore(v ?? 0)} size="large" />
            </div>
            <div>
              <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}><TeamTag team={game.visitingTeam} size={20} /></div>
              <InputNumber style={{ width: '100%' }} min={0} value={adjustVisitingScore} onChange={v => setAdjustVisitingScore(v ?? 0)} size="large" />
            </div>
          </div>
        ) : action === 'TIMEOUT' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={labelStyle}>Equipo</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[game.localTeam, game.visitingTeam].map((t: any) => {
                const used = t.id === game.localTeamId ? localTimeoutsUsed : visitingTimeoutsUsed
                const remaining = 2 - used
                return (
                  <button
                    key={t.id}
                    className={`player-option ${selectedTeamId === t.id ? 'selected' : ''}`}
                    style={{ flex: 1, opacity: remaining <= 0 ? 0.4 : 1 }}
                    onClick={() => setSelectedTeamId(t.id)}
                    disabled={remaining <= 0}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e6edf3' }}><TeamTag team={t} size={20} /></div>
                    <div style={{ fontSize: 11, color: remaining > 0 ? 'var(--green)' : '#ff4d4f', marginTop: 4 }}>
                      {remaining > 0 ? `${remaining} restante${remaining > 1 ? 's' : ''}` : 'Sin tiempos'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : action === 'POSSESSION' || action === 'HALFTIME' ? (
          <div style={{ color: '#e6edf3', fontSize: 15 }}>
            {action === 'POSSESSION' && (
              <span>La posesión pasará a: <TeamTag team={game.offenseTeamId === game.localTeamId ? game.visitingTeam : game.localTeam} size={20} /></span>
            )}
            {action === 'HALFTIME' && (isHalftime ? 'Reanudar el partido (2ª mitad)' : 'Pausar el partido para medio tiempo')}
          </div>
        ) : (action === 'XP1' || action === 'XP2' || action === 'SAFETY' || action === 'PENALTY') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={labelStyle}>Equipo</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[game.localTeam, game.visitingTeam].map((t: any) => (
                  <button
                    key={t.id}
                    className={`player-option ${selectedTeamId === t.id ? 'selected' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedTeamId(t.id); setSelectedPlayerId(undefined) }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e6edf3' }}><TeamTag team={t} size={20} /></div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={labelStyle}>Jugador (opcional)</div>
              <Select
                style={selectStyle}
                placeholder="Seleccionar jugador..."
                allowClear showSearch filterOption={filterPlayer}
                value={selectedPlayerId} onChange={setSelectedPlayerId}
                options={playerOptions(actionTeamPlayers)}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Event log drawer */}
      <Drawer
        title={<span style={{ color: '#e6edf3' }}>Auditoría del Partido</span>}
        placement="bottom"
        height="65vh"
        open={logOpen}
        onClose={() => setLogOpen(false)}
      >
        <div>
          {gameEvents.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Sin eventos registrados</div>
          )}
          {gameEvents.map((evt: any) => (
            <div key={evt.id} className="event-log-item">
              <div className={`event-dot ${evt.type}`} />
              <div style={{ flex: 1 }}>
                <div className="event-type">{EVENT_LABELS[evt.type] ?? evt.type}</div>
                {evt.description && <div className="event-desc">{evt.description}</div>}
                {evt.points > 0 && <div className="event-desc" style={{ color: 'var(--green)' }}>+{evt.points} pts</div>}
                <div className="event-desc">{evt.createdBy?.firstName} {evt.createdBy?.lastName}</div>
              </div>
              <div className="event-time">{dayjs(evt.createdAt).format('HH:mm:ss')}</div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  )
}
