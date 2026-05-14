import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Modal, Drawer, InputNumber } from 'antd'
import {
  ArrowLeftOutlined, HistoryOutlined, EyeOutlined,
  TeamOutlined, PauseCircleOutlined, PlayCircleOutlined,
  EditOutlined, TrophyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { iflagApi } from '../api/iflag'

function playerName(c: any) {
  if (!c) return '—'
  return c.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || '—'
}

const HALF_DURATION = 20 * 60

function formatTimer(seconds: number) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const DOWN_LABELS: Record<number, string> = { 1: '1°', 2: '2°', 3: '3°', 4: '4°' }
const EVENT_LABELS: Record<string, string> = {
  TOUCHDOWN: 'Touchdown', EXTRA_POINT: 'Punto Extra', SAFETY: 'Safety',
  FLAG_PENALTY: 'Castigo', DOWN_UPDATE: 'Down', POSSESSION_CHANGE: 'Cambio posesión',
  HALFTIME_START: 'Inicio medio tiempo', HALFTIME_END: 'Fin medio tiempo',
  GAME_END: 'Fin del partido', TIMER_START: 'Cronómetro iniciado',
  TIMER_STOP: 'Cronómetro detenido', GAME_START: 'Partido creado',
  TIMEOUT: 'Tiempo fuera', SCORE_ADJUST: 'Ajuste de marcador', INTERCEPTION: 'Intercepción',
}

type ActionType =
  | 'TD' | 'XP1' | 'XP2' | 'SAFETY' | 'PENALTY' | 'SACK'
  | 'NEXT_DOWN' | 'PREV_DOWN' | 'POSSESSION'
  | 'HALFTIME' | 'END_GAME' | 'TIMEOUT' | 'SCORE_ADJUST'
  | 'INTERCEPTION' | 'VOID_SCORE' | null

function plyLabel(a: any) {
  const num = a.number || a.player?.playerNumber
  return `${num ? `#${num} ` : ''}${playerName(a.player)}`
}

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

// Tap-to-select player grid — no search/filter needed
function PlayerGrid({
  players, selected, onSelect, optional = false,
}: {
  players: any[]; selected: string | undefined; onSelect: (id: string | undefined) => void; optional?: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
      {optional && (
        <button
          className={`player-card ${!selected ? 'selected' : ''}`}
          onClick={() => onSelect(undefined)}
          style={{ gridColumn: 'span 3', flexDirection: 'row', minHeight: 40 }}
        >
          <span style={{ fontSize: 12, color: !selected ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>Sin jugador específico</span>
        </button>
      )}
      {players.map((a: any) => {
        const num = a.number ?? a.player?.playerNumber
        const name = playerName(a.player)
        const first = name.split(' ')[0] || name
        const isSel = selected === a.playerId
        return (
          <button key={a.playerId} className={`player-card ${isSel ? 'selected' : ''}`} onClick={() => onSelect(isSel ? undefined : a.playerId)}>
            {a.player?.logoUrl
              ? <img src={a.player.logoUrl} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)', fontWeight: 700 }}>
                  {(first[0] || '?').toUpperCase()}
                </div>}
            {num != null && (
              <div style={{ fontFamily: "'Bebas Neue','Inter',sans-serif", fontSize: 20, fontWeight: 900, color: isSel ? 'var(--green)' : 'var(--text)', lineHeight: 1 }}>
                #{num}
              </div>
            )}
            <div style={{ fontSize: 10, color: isSel ? 'var(--green)' : 'var(--text-muted)', lineHeight: 1.2, textAlign: 'center', fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {first}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Circular countdown timer with SVG progress ring + drag scrub
function CircularTimer({
  elapsed, total, running, warning, size = 148,
  onScrub, onScrubEnd,
}: {
  elapsed: number; total: number; running: boolean; warning: boolean; size?: number
  onScrub?: (seconds: number) => void
  onScrubEnd?: (seconds: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)

  const cx = size / 2
  const r = size * 0.392
  const sw = size * 0.068
  const circ = 2 * Math.PI * r
  const progress = Math.min(elapsed / total, 1)
  const offset = circ * (1 - progress)
  const color = warning ? 'var(--orange)' : (dragging ? '#fff' : 'var(--green)')
  const shadow = warning ? 'rgba(255,152,0,0.4)' : 'rgba(0,230,118,0.4)'
  const displaySec = Math.max(0, total - elapsed)
  const fontSize = size * 0.257

  // Handle dot position on ring
  const handleAngle = progress * 2 * Math.PI - Math.PI / 2
  const hx = cx + r * Math.cos(handleAngle)
  const hy = cx + r * Math.sin(handleAngle)

  function angleFromPointer(e: React.PointerEvent): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left - cx
    const y = e.clientY - rect.top - cx
    let angle = Math.atan2(x, -y)
    if (angle < 0) angle += 2 * Math.PI
    return angle
  }

  function secondsFromAngle(angle: number): number {
    return Math.min(total, Math.max(0, Math.round((angle / (2 * Math.PI)) * total)))
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!onScrub) return
    e.preventDefault()
    setDragging(true)
    svgRef.current?.setPointerCapture(e.pointerId)
    onScrub(secondsFromAngle(angleFromPointer(e)))
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !onScrub) return
    onScrub(secondsFromAngle(angleFromPointer(e)))
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragging) return
    setDragging(false)
    onScrubEnd?.(secondsFromAngle(angleFromPointer(e)))
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        ref={svgRef}
        width={size} height={size}
        style={{ position: 'absolute', top: 0, left: 0, cursor: onScrub ? 'grab' : 'default', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface2)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: dragging ? 'none' : 'stroke-dashoffset 0.8s linear, stroke 0.3s' }}
        />
        {onScrub && (
          <circle
            cx={hx} cy={hy} r={sw * 0.9}
            fill={color}
            style={{ filter: `drop-shadow(0 0 ${sw * 0.5}px ${color})` }}
          />
        )}
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
        <div
          className={running && !dragging ? 'timer-pulse' : ''}
          style={{ fontFamily: "'Bebas Neue','Inter',sans-serif", fontSize, color, letterSpacing: '0.04em', lineHeight: 1, textShadow: `0 0 20px ${shadow}` }}
        >
          {formatTimer(displaySec)}
        </div>
        {warning && !dragging && (
          <div style={{ fontSize: 9, color: 'var(--orange)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
            EXTRA
          </div>
        )}
        {dragging && (
          <div style={{ fontSize: 9, color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
            AJUSTAR
          </div>
        )}
      </div>
    </div>
  )
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

  const swipeRef = useRef<HTMLDivElement>(null)
  const [activePanel, setActivePanel] = useState(0)

  const [action, setAction] = useState<ActionType>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>()
  const [tdPasser, setTdPasser] = useState<string | undefined>()
  const [tdReceiver, setTdReceiver] = useState<string | undefined>()
  const [tdIsRush, setTdIsRush] = useState(false)
  const [tdRunner, setTdRunner] = useState<string | undefined>()
  const [intPlayer, setIntPlayer] = useState<string | undefined>()
  const [logOpen, setLogOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [adjustLocalScore, setAdjustLocalScore] = useState(0)
  const [adjustVisitingScore, setAdjustVisitingScore] = useState(0)
  const [voidType, setVoidType] = useState<'TD' | 'XP1' | 'XP2'>('TD')

  const { data: gameData, isLoading } = useQuery({
    queryKey: ['iflag-game', gameId],
    queryFn: () => iflagApi.getGame(gameId!),
    refetchInterval: isSpectator ? 5000 : false,
  })
  const game = gameData?.data

  const { data: eventsData } = useQuery({
    queryKey: ['iflag-game-events', gameId],
    queryFn: () => iflagApi.listGameEvents(gameId!),
    enabled: logOpen || statsOpen,
  })
  const gameEvents = eventsData?.data ?? []

  useEffect(() => {
    if (!game) return
    setLocalSeconds(game.timerSeconds ?? 0)
    setTimerRunning(game.timerRunning ?? false)
  }, [game?.timerSeconds, game?.timerRunning])

  useEffect(() => {
    if (timerRunning && !isSpectator) {
      intervalRef.current = setInterval(() => setLocalSeconds(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning, isSpectator])

  function handleSwipeScroll() {
    if (!swipeRef.current) return
    const { scrollLeft, clientWidth } = swipeRef.current
    setActivePanel(Math.round(scrollLeft / clientWidth))
  }

  function goToPanel(panel: number) {
    if (!swipeRef.current) return
    swipeRef.current.scrollTo({ left: panel * swipeRef.current.clientWidth, behavior: 'smooth' })
    setActivePanel(panel)
  }

  const timerStartMutation = useMutation({
    mutationFn: () => iflagApi.startTimer(gameId!),
    onSuccess: (res) => { setTimerRunning(true); setLocalSeconds(res.data.timerSeconds ?? localSeconds) },
    onError: () => message.error('Error al iniciar cronómetro'),
  })

  const timerStopMutation = useMutation({
    mutationFn: () => iflagApi.stopTimer(gameId!),
    onSuccess: (res) => { setTimerRunning(false); setLocalSeconds(res.data.timerSeconds ?? localSeconds) },
    onError: () => message.error('Error al detener cronómetro'),
  })

  const timerResetMutation = useMutation({
    mutationFn: () => iflagApi.resetTimer(gameId!),
    onSuccess: () => { setTimerRunning(false); setLocalSeconds(0) },
  })

  const timerSetMutation = useMutation({
    mutationFn: (seconds: number) => iflagApi.setTimer(gameId!, seconds),
    onSuccess: (res) => { setTimerRunning(false); setLocalSeconds(res.data.timerSeconds ?? 0) },
    onError: () => message.error('Error al ajustar cronómetro'),
  })

  const recordEventMutation = useMutation({
    mutationFn: (data: any) => iflagApi.recordEvent(gameId!, data),
    onSuccess: (res) => {
      qc.setQueryData(['iflag-game', gameId], (old: any) => old ? { ...old, data: { ...old.data, ...res.data.game } } : old)
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
    setAction(null); setSelectedTeamId(undefined); setSelectedPlayerId(undefined)
    setTdPasser(undefined); setTdReceiver(undefined); setTdIsRush(false)
    setTdRunner(undefined); setIntPlayer(undefined); setVoidType('TD')
  }

  const handleAction = useCallback((type: ActionType) => {
    if (isSpectator) return
    setAction(type)
    setSelectedPlayerId(undefined); setTdPasser(undefined); setTdReceiver(undefined)
    setTdIsRush(false); setTdRunner(undefined); setIntPlayer(undefined)

    if (type === 'TD' || type === 'XP1' || type === 'XP2' || type === 'SAFETY' || type === 'PENALTY') {
      setSelectedTeamId(game?.offenseTeamId ?? game?.localTeamId)
    } else if (type === 'SACK') {
      // Pre-select defense team (who makes the sack)
      const def = game?.offenseTeamId === game?.localTeamId ? game?.visitingTeamId : game?.localTeamId
      setSelectedTeamId(def)
    } else if (type === 'POSSESSION') {
      // Pre-select defense team (who would receive)
      const def = game?.offenseTeamId === game?.localTeamId ? game?.visitingTeamId : game?.localTeamId
      setSelectedTeamId(def)
    } else if (type === 'TIMEOUT') {
      setSelectedTeamId(game?.offenseTeamId ?? game?.localTeamId)
    } else if (type === 'HALFTIME' && game?.status === 'HALFTIME') {
      // Pre-select visiting team for 2nd half kickoff (referee can change)
      setSelectedTeamId(game?.visitingTeamId)
    } else {
      setSelectedTeamId(undefined)
    }

    if (type === 'SCORE_ADJUST' && game) {
      setAdjustLocalScore(game.localScore)
      setAdjustVisitingScore(game.visitingScore)
    }
    if (type === 'VOID_SCORE' && game) {
      setSelectedTeamId(game.offenseTeamId ?? game.localTeamId)
      setVoidType('TD')
    }
  }, [isSpectator, game])

  function doNextDown() {
    if (!game) return
    const nextDown = (game.currentDown % 4) + 1
    const newOffense = nextDown === 1
      ? (game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId)
      : game.offenseTeamId
    recordEventMutation.mutate({
      type: 'DOWN_UPDATE', quarter: game.currentQuarter, down: nextDown,
      newCurrentDown: nextDown, newYardsToFirst: nextDown === 1 ? 10 : game.yardsToFirst,
      newOffenseTeamId: newOffense, description: `${DOWN_LABELS[nextDown]} down`,
    })
  }

  function doPrevDown() {
    if (!game) return
    const prevDown = game.currentDown > 1 ? game.currentDown - 1 : 1
    recordEventMutation.mutate({
      type: 'DOWN_UPDATE', quarter: game.currentQuarter, down: prevDown,
      newCurrentDown: prevDown, description: `Regresar a ${DOWN_LABELS[prevDown]} down`,
    })
  }

  // Grant "Primera Oportunidad y Línea" — offense still in own half, must reach midfield
  function doFirstAndLine() {
    if (!game) return
    recordEventMutation.mutate({
      type: 'DOWN_UPDATE', quarter: game.currentQuarter,
      newCurrentDown: 1, newYardsToFirst: 10,
      description: '1° y 10 — Primera oportunidad (propia mitad)',
    })
  }

  // Grant "Primera Oportunidad y Goal" — offense crossed midfield, must score
  function doFirstAndGoal() {
    if (!game) return
    recordEventMutation.mutate({
      type: 'DOWN_UPDATE', quarter: game.currentQuarter,
      newCurrentDown: 1, newYardsToFirst: 0,
      description: '1° y GOAL — Ofensiva en zona anotación',
    })
  }

  function getPlayerLabel(playerId: string | undefined) {
    if (!playerId || !game) return ''
    const att = (game.attendance ?? []).find((a: any) => a.playerId === playerId)
    return att ? plyLabel(att) : ''
  }

  function confirmAction() {
    if (!action || !game) return
    const base = { teamId: selectedTeamId, playerId: selectedPlayerId ?? null }
    const teamLabel = selectedTeamId === game.localTeamId ? playerName(game.localTeam) : playerName(game.visitingTeam)

    if (action === 'TD') {
      let desc = `Touchdown — ${teamLabel}`
      if (tdIsRush && tdRunner) desc += ` | Carrera: ${getPlayerLabel(tdRunner)}`
      else {
        if (tdPasser) desc += ` | Pase: ${getPlayerLabel(tdPasser)}`
        if (tdReceiver) desc += ` | Recepción: ${getPlayerLabel(tdReceiver)}`
      }
      recordEventMutation.mutate({
        type: 'TOUCHDOWN', ...base, points: 6, applyScore: true,
        playerId: tdIsRush ? tdRunner : tdReceiver ?? tdPasser ?? null,
        description: desc,
        metadata: { passerId: tdIsRush ? null : tdPasser, receiverId: tdIsRush ? null : tdReceiver, runnerId: tdIsRush ? tdRunner : null, isRush: tdIsRush },
      })
    } else if (action === 'XP1') {
      recordEventMutation.mutate({ type: 'EXTRA_POINT', ...base, points: 1, applyScore: true, description: `Punto extra (1pt) — ${teamLabel}` })
    } else if (action === 'XP2') {
      recordEventMutation.mutate({ type: 'EXTRA_POINT', ...base, points: 2, applyScore: true, description: `Punto extra (2pts) — ${teamLabel}` })
    } else if (action === 'SAFETY') {
      recordEventMutation.mutate({ type: 'SAFETY', ...base, points: 2, applyScore: true, description: `Safety — ${teamLabel}` })
    } else if (action === 'PENALTY') {
      const playerLabel = selectedPlayerId ? ` | ${getPlayerLabel(selectedPlayerId)}` : ''
      recordEventMutation.mutate({ type: 'FLAG_PENALTY', ...base, points: 0, description: `Castigo — ${teamLabel}${playerLabel}`, metadata: { eventKind: 'PENALTY' } })
    } else if (action === 'SACK') {
      const offLabel = playerName(isOffenseLocal ? game.localTeam : game.visitingTeam)
      const defTeamId = game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId
      const playerLabel = selectedPlayerId ? ` | ${getPlayerLabel(selectedPlayerId)}` : ''
      recordEventMutation.mutate({
        type: 'FLAG_PENALTY', teamId: defTeamId, playerId: selectedPlayerId ?? null, points: 0,
        description: `Sack a ${offLabel}${playerLabel}`, metadata: { eventKind: 'SACK' },
      })
    } else if (action === 'POSSESSION') {
      const newLabel = selectedTeamId === game.localTeamId ? playerName(game.localTeam) : playerName(game.visitingTeam)
      recordEventMutation.mutate({
        type: 'POSSESSION_CHANGE', newOffenseTeamId: selectedTeamId,
        newCurrentDown: 1, newYardsToFirst: 10, description: `Posesión: ${newLabel}`,
      })
    } else if (action === 'INTERCEPTION') {
      const defTeamId = game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId
      let desc = `Intercepción — ${defTeamId === game.localTeamId ? playerName(game.localTeam) : playerName(game.visitingTeam)}`
      if (intPlayer) desc += ` | ${getPlayerLabel(intPlayer)}`
      recordEventMutation.mutate({ type: 'INTERCEPTION', teamId: defTeamId, playerId: intPlayer ?? null, description: desc })
    } else if (action === 'HALFTIME') {
      const isHT = game.status === 'HALFTIME'
      recordEventMutation.mutate({
        type: isHT ? 'HALFTIME_END' : 'HALFTIME_START',
        ...(isHT && selectedTeamId ? { newOffenseTeamId: selectedTeamId } : {}),
        description: isHT ? 'Inicio segunda mitad' : 'Inicio de medio tiempo',
      })
    } else if (action === 'TIMEOUT') {
      recordEventMutation.mutate({ type: 'TIMEOUT', teamId: selectedTeamId, description: `Tiempo fuera — ${teamLabel}` })
    } else if (action === 'SCORE_ADJUST') {
      recordEventMutation.mutate({ type: 'SCORE_ADJUST', newLocalScore: adjustLocalScore, newVisitingScore: adjustVisitingScore, description: `Ajuste: ${adjustLocalScore} - ${adjustVisitingScore}` })
    } else if (action === 'VOID_SCORE') {
      const pts = voidType === 'TD' ? 6 : voidType === 'XP2' ? 2 : 1
      const isLocal = selectedTeamId === game.localTeamId
      const newLocal = isLocal ? Math.max(0, game.localScore - pts) : game.localScore
      const newVisit = !isLocal ? Math.max(0, game.visitingScore - pts) : game.visitingScore
      const typeLabel = voidType === 'TD' ? 'Touchdown (-6)' : voidType === 'XP1' ? 'Punto extra (-1)' : 'Punto extra (-2)'
      recordEventMutation.mutate({ type: 'SCORE_ADJUST', newLocalScore: newLocal, newVisitingScore: newVisit, description: `Anulado: ${typeLabel} — ${teamLabel}` })
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

  const actionTeamPlayers = (game.attendance ?? []).filter((a: any) => a.teamId === selectedTeamId && a.present)
  const defenseTeamId = game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId
  const defenseTeamPlayers = (game.attendance ?? []).filter((a: any) => a.teamId === defenseTeamId && a.present)

  // Quick lookup: playerId → attendance record
  const attMap: Record<string, any> = Object.fromEntries((game.attendance ?? []).map((a: any) => [a.playerId, a]))

  // Build stats from event log
  const stats = (() => {
    const tdScorers: Record<string, number> = {}
    const tdPassers: Record<string, number> = {}
    const interceptions: Record<string, number> = {}
    const sacks: Record<string, number> = {}
    const penalties: Record<string, number> = {}
    gameEvents.forEach((evt: any) => {
      if (evt.type === 'TOUCHDOWN') {
        if (evt.playerId) tdScorers[evt.playerId] = (tdScorers[evt.playerId] ?? 0) + 1
        if (!evt.metadata?.isRush && evt.metadata?.passerId) tdPassers[evt.metadata.passerId] = (tdPassers[evt.metadata.passerId] ?? 0) + 1
      } else if (evt.type === 'INTERCEPTION' && evt.playerId) {
        interceptions[evt.playerId] = (interceptions[evt.playerId] ?? 0) + 1
      } else if (evt.type === 'FLAG_PENALTY') {
        if (evt.metadata?.eventKind === 'SACK' && evt.playerId) {
          sacks[evt.playerId] = (sacks[evt.playerId] ?? 0) + 1
        } else if (evt.metadata?.eventKind !== 'SACK' && evt.playerId) {
          penalties[evt.playerId] = (penalties[evt.playerId] ?? 0) + 1
        }
      }
    })
    return { tdScorers, tdPassers, interceptions, sacks, penalties }
  })()

  const isSecondHalf = game.currentQuarter >= 3
  const localTimeoutsUsed = isSecondHalf ? (game.localTimeoutsH2 ?? 0) : (game.localTimeoutsH1 ?? 0)
  const visitingTimeoutsUsed = isSecondHalf ? (game.visitingTimeoutsH2 ?? 0) : (game.visitingTimeoutsH1 ?? 0)
  const halfLabel = isSecondHalf ? '2T' : '1T'
  const overTime = localSeconds >= HALF_DURATION

  const actionLabel: Record<string, string> = {
    TD: 'Touchdown', XP1: 'Punto Extra (1pt)', XP2: 'Punto Extra (2pts)', SAFETY: 'Safety',
    PENALTY: 'Castigo', SACK: 'Sack', POSSESSION: 'Posesión del Balón',
    HALFTIME: isHalftime ? 'Fin Medio Tiempo' : 'Medio Tiempo',
    END_GAME: 'Finalizar Partido', TIMEOUT: 'Tiempo Fuera',
    SCORE_ADJUST: 'Ajustar Marcador', INTERCEPTION: 'Intercepción',
    VOID_SCORE: 'Anular Anotación',
  }

  const labelStyle = { fontSize: 12, color: '#e6edf3', marginBottom: 8, fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }

  function TeamButtons({ onSelect }: { onSelect?: () => void }) {
    return (
      <div style={{ display: 'flex', gap: 10 }}>
        {[game.localTeam, game.visitingTeam].map((t: any) => (
          <button
            key={t.id}
            className={`player-option ${selectedTeamId === t.id ? 'selected' : ''}`}
            style={{ flex: 1, padding: '14px 8px' }}
            onClick={() => { setSelectedTeamId(t.id); onSelect?.() }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {t.logoUrl
                ? <img src={t.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--text-muted)', fontWeight: 700 }}>
                    {playerName(t)[0]?.toUpperCase()}
                  </div>}
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e6edf3', textAlign: 'center' }}>{playerName(t)}</div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {isSpectator && <div className="spectator-badge"><EyeOutlined /> Espectador</div>}

      {/* Navbar */}
      <div className="navbar" style={{ flexShrink: 0 }}>
        <button className="nav-back" onClick={() => navigate('/games')}><ArrowLeftOutlined /></button>
        <div className="nav-title" style={{ fontSize: 13 }}>{game.event?.name ?? 'Partido'}</div>
        <button className="nav-action" onClick={() => { setStatsOpen(true); qc.invalidateQueries({ queryKey: ['iflag-game-events', gameId] }) }}>
          <TrophyOutlined />
        </button>
        <button className="nav-action" onClick={() => { setLogOpen(true); qc.invalidateQueries({ queryKey: ['iflag-game-events', gameId] }) }}>
          <HistoryOutlined />
        </button>
        {!isSpectator && (
          <button className="nav-action" onClick={() => navigate(`/games/${gameId}?mode=spectator`)}>
            <EyeOutlined />
          </button>
        )}
      </div>

      {/* Scoreboard — fixed, no sticky needed in flex layout */}
      <div className="scoreboard" style={{ position: 'relative', flexShrink: 0 }}>
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
          background: 'rgba(0,230,118,0.08)', borderBottom: '1px solid var(--green)',
          padding: '3px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            🏈 <TeamTag team={offenseTeam} size={18} />
          </span>
        </div>
      )}

      {/* Main content */}
      {isFinished ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Partido Finalizado</div>
          <div style={{ fontSize: 16, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {game.localScore > game.visitingScore
              ? <span>Ganador: <TeamTag team={game.localTeam} size={22} /></span>
              : game.visitingScore > game.localScore
              ? <span>Ganador: <TeamTag team={game.visitingTeam} size={22} /></span>
              : <span>Empate</span>}
          </div>
          {game.finishedAt && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{dayjs(game.finishedAt).format('DD/MM/YYYY HH:mm')}</div>}
          <button className="timer-btn start" style={{ marginTop: 24 }} onClick={() => navigate('/games')}>Volver a Partidos</button>
        </div>
      ) : (
        <>
          {/* Swipe panels */}
          <div ref={swipeRef} className="swipe-container" onScroll={handleSwipeScroll}>

            {/* Panel 1 — Timer (large) + Down */}
            <div className="swipe-panel">
              <div style={{ padding: '4px 12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>

                {/* Half label */}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  {halfLabel}{isHalftime ? ' · Medio Tiempo' : ''}
                </div>

                {/* Large centered timer with drag scrub */}
                <CircularTimer
                  elapsed={localSeconds}
                  total={HALF_DURATION}
                  running={timerRunning}
                  warning={overTime}
                  size={190}
                  onScrub={!isSpectator && !isHalftime ? (s) => setLocalSeconds(s) : undefined}
                  onScrubEnd={!isSpectator && !isHalftime ? (s) => timerSetMutation.mutate(s) : undefined}
                />

                {/* Timer controls — horizontal row */}
                {!isSpectator && !isHalftime && (
                  <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    {timerRunning ? (
                      <button className="timer-btn stop" style={{ flex: 2, padding: '10px 0', fontSize: 15 }} onClick={() => timerStopMutation.mutate()} disabled={timerStopMutation.isPending}>
                        <PauseCircleOutlined style={{ marginRight: 5 }} /> Detener
                      </button>
                    ) : (
                      <button className="timer-btn start" style={{ flex: 2, padding: '10px 0', fontSize: 15 }} onClick={() => timerStartMutation.mutate()} disabled={timerStartMutation.isPending}>
                        <PlayCircleOutlined style={{ marginRight: 5 }} /> Iniciar
                      </button>
                    )}
                    <button className="timer-btn reset" style={{ flex: 1, padding: '10px 0', fontSize: 14 }} onClick={() => timerResetMutation.mutate()} disabled={timerResetMutation.isPending}>
                      Reset
                    </button>
                  </div>
                )}
                {isHalftime && <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>⏸ En pausa</div>}

                {/* Compact down card */}
                {!isHalftime && (
                  <div style={{ width: '100%' }}>
                    <div className="down-card" style={{ padding: '8px 10px' }}>
                      {/* Zone badge + Down + Dots in one row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 7 }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center',
                          background: game.yardsToFirst === 0 ? 'rgba(0,230,118,0.15)' : 'rgba(33,150,243,0.15)',
                          border: `1px solid ${game.yardsToFirst === 0 ? 'var(--green)' : 'var(--blue)'}`,
                          borderRadius: 20, padding: '2px 9px',
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: game.yardsToFirst === 0 ? 'var(--green)' : 'var(--blue)' }}>
                            {game.yardsToFirst === 0 ? '🏈 1° y GOAL' : '📏 1° y 10'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div>
                            <div className="down-label" style={{ marginBottom: 0 }}>Down</div>
                            <div className="down-value" style={{ fontSize: 20 }}>{DOWN_LABELS[game.currentDown] ?? `${game.currentDown}°`}</div>
                          </div>
                          <div className="down-dots">
                            {[1, 2, 3, 4].map(d => <div key={d} className={`down-dot ${d <= game.currentDown ? 'active' : ''}`} />)}
                          </div>
                        </div>
                      </div>

                      {!isSpectator && (
                        <>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                            <button className={`first-down-btn line ${game.yardsToFirst !== 0 ? 'active' : ''}`} onClick={doFirstAndLine} disabled={recordEventMutation.isPending}>
                              📏 1° y 10<span>Propia mitad</span>
                            </button>
                            <button className={`first-down-btn goal ${game.yardsToFirst === 0 ? 'active' : ''}`} onClick={doFirstAndGoal} disabled={recordEventMutation.isPending}>
                              🏈 1° y GOAL<span>Zona anotación</span>
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="timer-btn reset" style={{ flex: 1, padding: '11px 0', fontSize: 15 }} onClick={doPrevDown} disabled={game.currentDown <= 1 || recordEventMutation.isPending}>
                              ◀ Regresar
                            </button>
                            <button className="timer-btn start" style={{ flex: 1, padding: '11px 0', fontSize: 15 }} onClick={doNextDown} disabled={recordEventMutation.isPending}>
                              Siguiente ▶
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeout strip — always visible on Panel 1 */}
              {!isHalftime && (
                <div style={{ width: '100%', padding: '4px 4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', borderRadius: 10, padding: '7px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[1, 2].map(i => (
                        <div key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: i <= localTimeoutsUsed ? '#faad14' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', transition: 'background 0.2s' }} />
                      ))}
                      <TeamTag team={game.localTeam} size={18} />
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      T. Fuera {halfLabel}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <TeamTag team={game.visitingTeam} size={18} />
                      {[1, 2].map(i => (
                        <div key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: i <= visitingTimeoutsUsed ? '#faad14' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isSpectator && (
                <div style={{ padding: '4px 12px 0' }}>
                  <button
                    onClick={() => goToPanel(1)}
                    style={{
                      width: '100%', padding: '8px 0',
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 10, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      letterSpacing: '0.04em',
                    }}
                  >
                    ⚡ Acciones <span style={{ fontSize: 16 }}>→</span>
                  </button>
                </div>
              )}
            </div>

            {/* Panel 2 — Actions (referee only) */}
            {!isSpectator && (
              <div className="swipe-panel">
                <div style={{ padding: '16px 16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <button
                      onClick={() => goToPanel(0)}
                      style={{
                        padding: '7px 14px', background: 'var(--surface2)',
                        border: '1px solid var(--border)', borderRadius: 8,
                        cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>←</span> Principal
                    </button>
                    <div className="section-header" style={{ margin: 0, flex: 1 }}>Acciones</div>
                  </div>
                  <div className="actions-grid">
                    {!isHalftime && (
                      <>
                        <button className="action-btn td" onClick={() => handleAction('TD')}>
                          <span className="action-icon">🏈</span>Touchdown +6
                        </button>
                        <button className="action-btn xp" onClick={() => handleAction('XP1')}>
                          <span className="action-icon">✔</span>Extra +1
                        </button>
                        <button className="action-btn xp" onClick={() => handleAction('XP2')}>
                          <span className="action-icon">✔✔</span>Extra +2
                        </button>
                        <button className="action-btn safety" onClick={() => handleAction('SAFETY')}>
                          <span className="action-icon">🛡</span>Safety +2
                        </button>
                        <button className="action-btn penalty" onClick={() => handleAction('PENALTY')}>
                          <span className="action-icon">🚩</span>Castigo
                        </button>
                        <button className="action-btn sack" onClick={() => handleAction('SACK')}>
                          <span className="action-icon">💨</span>Sack
                        </button>
                        <button className="action-btn interception" onClick={() => handleAction('INTERCEPTION')}>
                          <span className="action-icon">🤚</span>Intercepción
                        </button>
                        <button className="action-btn possession" onClick={() => handleAction('POSSESSION')}>
                          <span className="action-icon"><TeamOutlined /></span>Posesión
                        </button>
                        <button className="action-btn timeout" onClick={() => handleAction('TIMEOUT')}>
                          <span className="action-icon">⏱</span>T. Fuera
                        </button>
                        <button className="action-btn void-score" onClick={() => handleAction('VOID_SCORE')}>
                          <span className="action-icon">↩</span>Anular
                        </button>
                      </>
                    )}
                    <button className="action-btn halftime" onClick={() => handleAction('HALFTIME')}>
                      <span className="action-icon">⏸</span>
                      {isHalftime ? 'Fin Medio' : 'Medio Tiempo'}
                    </button>
                    <button className="action-btn score-adjust" onClick={() => handleAction('SCORE_ADJUST')}>
                      <span className="action-icon"><EditOutlined /></span>Ajustar
                    </button>
                    <button className="action-btn end-game" onClick={() => handleAction('END_GAME')}>
                      <span className="action-icon">🏁</span>Finalizar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Swipe dots */}
          {!isSpectator && (
            <div className="swipe-dots" style={{ flexShrink: 0 }}>
              <div className={`swipe-dot ${activePanel === 0 ? 'active' : ''}`} />
              <div className={`swipe-dot ${activePanel === 1 ? 'active' : ''}`} />
            </div>
          )}
        </>
      )}

      {/* Action modal */}
      <Modal
        open={action !== null}
        title={<span style={{ color: '#e6edf3' }}>{action ? actionLabel[action as string] : ''}</span>}
        onCancel={resetActionState}
        onOk={confirmAction}
        okText="Confirmar"
        okButtonProps={{ loading: recordEventMutation.isPending, style: { background: 'var(--green)', borderColor: 'var(--green)', color: '#000', fontWeight: 700 } }}
        cancelButtonProps={{ style: { color: '#e6edf3' } }}
        destroyOnClose
      >
        {action === 'END_GAME' ? (
          <div style={{ color: '#e6edf3', fontSize: 15 }}>
            ¿Confirmar el cierre del partido?<br />
            <span style={{ color: '#adb5bd', fontSize: 13 }}>Esta acción publicará el marcador final.</span>
          </div>

        ) : action === 'POSSESSION' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>¿Quién tiene el balón?</div>
            <TeamButtons />
          </div>

        ) : action === 'HALFTIME' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isHalftime ? (
              <>
                <div style={{ color: '#e6edf3', fontSize: 14 }}>Iniciar la segunda mitad</div>
                <div>
                  <div style={labelStyle}>🏈 ¿Quién recibe el saque?</div>
                  <TeamButtons />
                </div>
              </>
            ) : (
              <div style={{ color: '#e6edf3', fontSize: 15 }}>Pausar el partido para medio tiempo</div>
            )}
          </div>

        ) : action === 'INTERCEPTION' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ color: '#e6edf3', fontSize: 14, padding: '8px 12px', background: 'rgba(0,230,118,0.08)', borderRadius: 8, border: '1px solid rgba(0,230,118,0.2)' }}>
              🏈 Posesión cambia a <strong><TeamTag team={defenseTeam} size={18} /></strong>
            </div>
            <div>
              <div style={labelStyle}>Jugador que intercepta (opcional)</div>
              <PlayerGrid players={defenseTeamPlayers} selected={intPlayer} onSelect={setIntPlayer} optional />
            </div>
          </div>

        ) : action === 'SACK' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ color: '#e6edf3', fontSize: 14, padding: '8px 12px', background: 'rgba(206,147,216,0.08)', borderRadius: 8, border: '1px solid rgba(206,147,216,0.25)' }}>
              💨 Sack a <strong><TeamTag team={offenseTeam} size={18} /></strong>
            </div>
            <div>
              <div style={labelStyle}>Jugador que hace el sack (opcional)</div>
              <PlayerGrid players={defenseTeamPlayers} selected={selectedPlayerId} onSelect={setSelectedPlayerId} optional />
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
                    style={{ flex: 1, opacity: remaining <= 0 ? 0.4 : 1, padding: '14px 8px' }}
                    onClick={() => setSelectedTeamId(t.id)}
                    disabled={remaining <= 0}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      {t.logoUrl
                        ? <img src={t.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--text-muted)', fontWeight: 700 }}>
                            {playerName(t)[0]?.toUpperCase()}
                          </div>}
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#e6edf3', textAlign: 'center' }}>{playerName(t)}</div>
                      <div style={{ fontSize: 11, color: remaining > 0 ? 'var(--green)' : '#ff4d4f' }}>
                        {remaining > 0 ? `${remaining} restante${remaining > 1 ? 's' : ''}` : 'Sin tiempos'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

        ) : action === 'TD' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '60vh', paddingRight: 2 }}>
            <div>
              <div style={labelStyle}>Equipo</div>
              <TeamButtons onSelect={() => { setTdPasser(undefined); setTdReceiver(undefined); setTdRunner(undefined) }} />
            </div>
            <div>
              <div style={labelStyle}>Tipo</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className={`player-option ${!tdIsRush ? 'selected' : ''}`} style={{ flex: 1, padding: 12 }} onClick={() => setTdIsRush(false)}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#e6edf3', textAlign: 'center' }}>🏈 Pase</div>
                </button>
                <button className={`player-option ${tdIsRush ? 'selected' : ''}`} style={{ flex: 1, padding: 12 }} onClick={() => setTdIsRush(true)}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#e6edf3', textAlign: 'center' }}>🏃 Carrera</div>
                </button>
              </div>
            </div>
            {!tdIsRush && selectedTeamId && (
              <>
                <div>
                  <div style={labelStyle}>QB — Lanza el pase</div>
                  <PlayerGrid players={actionTeamPlayers} selected={tdPasser} onSelect={setTdPasser} optional />
                </div>
                <div>
                  <div style={labelStyle}>Recibe / Anota</div>
                  <PlayerGrid players={actionTeamPlayers} selected={tdReceiver} onSelect={setTdReceiver} optional />
                </div>
              </>
            )}
            {tdIsRush && selectedTeamId && (
              <div>
                <div style={labelStyle}>Anotó por carrera</div>
                <PlayerGrid players={actionTeamPlayers} selected={tdRunner} onSelect={setTdRunner} optional />
              </div>
            )}
          </div>

        ) : action === 'PENALTY' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={labelStyle}>Equipo penalizado</div>
              <TeamButtons onSelect={() => setSelectedPlayerId(undefined)} />
            </div>
            <div>
              <div style={labelStyle}>Jugador penalizado (opcional)</div>
              <PlayerGrid players={actionTeamPlayers} selected={selectedPlayerId} onSelect={setSelectedPlayerId} optional />
            </div>
          </div>

        ) : action === 'VOID_SCORE' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={labelStyle}>Equipo</div>
              <TeamButtons onSelect={() => {}} />
            </div>
            <div>
              <div style={labelStyle}>¿Qué anular?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { key: 'TD' as const,  label: 'Touchdown',    pts: -6, color: 'var(--green)' },
                  { key: 'XP1' as const, label: 'Extra 1pt',    pts: -1, color: '#4db6ac' },
                  { key: 'XP2' as const, label: 'Extra 2pts',   pts: -2, color: '#4db6ac' },
                ] as const).map(({ key, label, pts, color }) => (
                  <button
                    key={key}
                    className={`player-option ${voidType === key ? 'selected' : ''}`}
                    style={{ flex: 1, padding: 12 }}
                    onClick={() => setVoidType(key)}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: voidType === key ? color : '#e6edf3', textAlign: 'center' }}>{label}</div>
                    <div style={{ fontSize: 11, color: voidType === key ? color : 'var(--text-muted)' }}>{pts} pts</div>
                  </button>
                ))}
              </div>
            </div>
            {selectedTeamId && (
              <div style={{ padding: '10px 12px', background: 'rgba(255,107,107,0.08)', borderRadius: 8, border: '1px solid rgba(255,107,107,0.25)', fontSize: 13, color: '#ff6b6b' }}>
                ↩ Se reducirán {voidType === 'TD' ? 6 : voidType === 'XP1' ? 1 : 2} puntos de <strong>{selectedTeamId === game.localTeamId ? playerName(game.localTeam) : playerName(game.visitingTeam)}</strong>
              </div>
            )}
          </div>

        ) : (action === 'XP1' || action === 'XP2' || action === 'SAFETY') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={labelStyle}>Equipo</div>
              <TeamButtons onSelect={() => setSelectedPlayerId(undefined)} />
            </div>
            <div>
              <div style={labelStyle}>Jugador (opcional)</div>
              <PlayerGrid players={actionTeamPlayers} selected={selectedPlayerId} onSelect={setSelectedPlayerId} optional />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Event log drawer */}
      <Drawer title={<span style={{ color: '#e6edf3' }}>Auditoría del Partido</span>} placement="bottom" height="65vh" open={logOpen} onClose={() => setLogOpen(false)}>
        <div>
          {gameEvents.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Sin eventos registrados</div>}
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

      {/* Stats drawer */}
      <Drawer
        title={<span style={{ color: '#e6edf3' }}>🏆 Estadísticas del Partido</span>}
        placement="bottom" height="75vh"
        open={statsOpen} onClose={() => setStatsOpen(false)}
      >
        {gameEvents.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Sin eventos registrados aún</div>
        ) : (
          <div style={{ paddingBottom: 24 }}>
            {(
              [
                { key: 'tdScorers',     emoji: '🏈', label: 'Touchdowns Anotados',  color: 'var(--green)' },
                { key: 'tdPassers',     emoji: '📤', label: 'Touchdowns Lanzados',  color: '#4db6ac' },
                { key: 'interceptions', emoji: '🤚', label: 'Intercepciones',        color: '#e91e63' },
                { key: 'sacks',         emoji: '💨', label: 'Sacks',                color: '#ce93d8' },
                { key: 'penalties',     emoji: '🚩', label: 'Castigos',             color: 'var(--orange)' },
              ] as const
            ).map(({ key, emoji, label, color }) => {
              const map = stats[key as keyof typeof stats]
              const entries = Object.entries(map)
              if (entries.length === 0) return null
              return (
                <div key={key} style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${color}30` }}>
                    {emoji} {label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {entries.map(([playerId, count]) => {
                      const att = attMap[playerId]
                      if (!att) return null
                      const num = att.number ?? att.player?.playerNumber
                      const name = playerName(att.player)
                      const first = name.split(' ')[0] || name
                      return (
                        <div key={playerId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                          <div style={{ position: 'relative' }}>
                            {att.player?.logoUrl
                              ? <img src={att.player.logoUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}` }} />
                              : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--text-muted)', border: `2px solid ${color}40` }}>
                                  {(first[0] || '?').toUpperCase()}
                                </div>}
                            {(count as number) > 1 && (
                              <div style={{ position: 'absolute', top: -4, right: -4, background: color, color: '#000', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {count as number}
                              </div>
                            )}
                          </div>
                          {num != null && (
                            <div style={{ fontFamily: "'Bebas Neue','Inter',sans-serif", fontSize: 17, fontWeight: 900, color, lineHeight: 1 }}>
                              #{num}
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {first}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Drawer>
    </div>
  )
}
