import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Select, Modal, Drawer } from 'antd'
import { PlusOutlined, LogoutOutlined, HistoryOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { iflagApi } from '../api/iflag'
import { useAuthStore } from '../stores/authStore'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ATTENDANCE: 'Pase de lista',
  IN_PROGRESS: 'En juego',
  HALFTIME: 'Medio tiempo',
  FINISHED: 'Finalizado',
}

const CATEGORY_COLORS: Record<string, string> = {
  FEMENIL: '#e91e63',
  VARONIL: '#1976d2',
  MIXTO: '#7b1fa2',
}

function playerName(c: any) {
  return c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || '—'
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="status-pill PENDING" style={{ fontSize: 10 }}>Sin iniciar</span>
  return <span className={`status-pill ${status}`} style={{ fontSize: 10 }}>{STATUS_LABELS[status] ?? status}</span>
}

export default function GamesListPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const user = useAuthStore(s => s.user)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>()

  // Free game modal state
  const [freeGameOpen, setFreeGameOpen] = useState(false)
  const [localTeamId, setLocalTeamId] = useState<string | undefined>()
  const [visitingTeamId, setVisitingTeamId] = useState<string | undefined>()
  const [freeEventId, setFreeEventId] = useState<string | undefined>()

  const [logOpen, setLogOpen] = useState(false)

  const { data: gamesData, isLoading } = useQuery({
    queryKey: ['iflag-games'],
    queryFn: () => iflagApi.listGames(),
    refetchInterval: 10_000,
  })
  const games = gamesData?.data ?? []

  const { data: eventsData } = useQuery({
    queryKey: ['iflag-events'],
    queryFn: () => iflagApi.listEvents({ pageSize: 50, status: 'CONFIRMED,IN_EXECUTION' }),
    enabled: drawerOpen || freeGameOpen,
  })
  const events = eventsData?.data ?? []

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['iflag-schedule', selectedEventId],
    queryFn: () => iflagApi.listScheduleGames({ eventId: selectedEventId! }),
    enabled: !!selectedEventId,
  })
  const scheduleGames = scheduleData?.data ?? []

  const { data: teamsData } = useQuery({
    queryKey: ['iflag-teams'],
    queryFn: () => iflagApi.listTeams(),
    enabled: freeGameOpen,
  })
  const teams = (teamsData?.data ?? []).filter((c: any) => c.isTeam)

  // Create from schedule activity
  const createFromScheduleMutation = useMutation({
    mutationFn: (activity: any) => iflagApi.createGame({
      eventId: activity.eventId,
      activityId: activity.id,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['iflag-games'] })
      qc.invalidateQueries({ queryKey: ['iflag-schedule', selectedEventId] })
      setDrawerOpen(false)
      message.success('Partido iniciado')
      navigate(`/games/${res.data.id}/attendance`)
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al crear partido'),
  })

  // Create free game
  const createFreeMutation = useMutation({
    mutationFn: () => iflagApi.createGame({ eventId: freeEventId, localTeamId, visitingTeamId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['iflag-games'] })
      setFreeGameOpen(false)
      setLocalTeamId(undefined)
      setVisitingTeamId(undefined)
      setFreeEventId(undefined)
      message.success('Partido creado')
      navigate(`/games/${res.data.id}/attendance`)
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al crear partido'),
  })

  function handleScheduleGameTap(activity: any) {
    if (activity.footballGame) {
      setDrawerOpen(false)
      const g = activity.footballGame
      if (g.status === 'PENDING' || g.status === 'ATTENDANCE') {
        navigate(`/games/${g.id}/attendance`)
      } else {
        navigate(`/games/${g.id}`)
      }
    } else {
      createFromScheduleMutation.mutate(activity)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="navbar">
        <div className="nav-title">
          <span style={{ color: 'var(--green)', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '0.06em' }}>I-FLAG</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{user?.firstName} {user?.lastName}</span>
        </div>
        <button className="nav-action" onClick={() => setLogOpen(true)} title="Historial">
          <HistoryOutlined />
        </button>
        <button className="nav-action" onClick={() => { clearAuth(); navigate('/login') }} title="Salir">
          <LogoutOutlined />
        </button>
      </div>

      {/* Games */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>Cargando...</div>
        )}
        {!isLoading && games.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏈</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Sin partidos</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Crea el primer partido</div>
          </div>
        )}
        {games.filter((g: any) => g.status !== 'FINISHED').map((game: any) => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => {
              if (game.status === 'PENDING' || game.status === 'ATTENDANCE') {
                navigate(`/games/${game.id}/attendance`)
              } else {
                navigate(`/games/${game.id}`)
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{game.event?.name ?? '—'}</span>
              <span className={`status-pill ${game.status}`}>{STATUS_LABELS[game.status] ?? game.status}</span>
            </div>
            <div className="game-card-teams">
              <div>
                {game.localTeam?.logoUrl && (
                  <img src={game.localTeam.logoUrl} height={24} style={{ objectFit: 'contain', borderRadius: 4, marginBottom: 4, display: 'block' }} alt="" />
                )}
                <div className="game-card-team">{playerName(game.localTeam)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Local</div>
              </div>
              <div className="game-card-score">
                {game.localScore} — {game.visitingScore}
              </div>
              <div style={{ textAlign: 'right' }}>
                {game.visitingTeam?.logoUrl && (
                  <img src={game.visitingTeam.logoUrl} height={24} style={{ objectFit: 'contain', borderRadius: 4, marginBottom: 4, display: 'block', marginLeft: 'auto' }} alt="" />
                )}
                <div className="game-card-team right">{playerName(game.visitingTeam)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>Visitante</div>
              </div>
            </div>
            {game.startedAt && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {dayjs(game.startedAt).format('DD/MM/YYYY HH:mm')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setDrawerOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 20,
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'var(--green)',
          color: '#000',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,230,118,0.4)',
          zIndex: 200,
        }}
      >
        <PlusOutlined />
      </button>

      {/* Tournament schedule drawer */}
      <Drawer
        title={<span style={{ color: 'var(--text)' }}>Nuevo Partido</span>}
        placement="bottom"
        height="80vh"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedEventId(undefined) }}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Torneo / Evento</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar torneo..."
              showSearch
              optionFilterProp="label"
              value={selectedEventId}
              onChange={setSelectedEventId}
              options={events.map((e: any) => ({ value: e.id, label: `${e.code} — ${e.name}` }))}
            />
          </div>

          {selectedEventId && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Partidos del Calendario
              </div>
              {scheduleLoading && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Cargando...</div>
              )}
              {!scheduleLoading && scheduleGames.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                  Sin partidos programados en este torneo
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
                {scheduleGames.map((activity: any) => {
                  const md = activity.matchData
                  if (!md) return null
                  const hasGame = !!activity.footballGame
                  const isFinished = activity.footballGame?.status === 'FINISHED'
                  return (
                    <div
                      key={activity.id}
                      className="game-card"
                      style={{ opacity: isFinished ? 0.6 : 1, cursor: createFromScheduleMutation.isPending ? 'wait' : 'pointer' }}
                      onClick={() => !createFromScheduleMutation.isPending && handleScheduleGameTap(activity)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                            background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4,
                            color: 'var(--text-muted)',
                          }}>
                            J{md.round}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                            color: CATEGORY_COLORS[md.category] ?? 'var(--text-muted)',
                            background: `${CATEGORY_COLORS[md.category] ?? '#888'}22`,
                            padding: '2px 6px', borderRadius: 4,
                          }}>
                            {md.category}
                          </span>
                          {md.venue && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{md.venue.name}</span>
                          )}
                        </div>
                        <StatusPill status={activity.footballGame?.status} />
                      </div>
                      <div className="game-card-teams">
                        <div>
                          {md.homeTeam?.logoUrl && (
                            <img src={md.homeTeam.logoUrl} height={20} style={{ borderRadius: 4, marginBottom: 2, display: 'block' }} alt="" />
                          )}
                          <div className="game-card-team" style={{ fontSize: 12 }}>{playerName(md.homeTeam)}</div>
                        </div>
                        <div className="game-card-score" style={{ fontSize: 14 }}>
                          {hasGame
                            ? `${activity.footballGame.localScore} — ${activity.footballGame.visitingScore}`
                            : 'vs'}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {md.visitingTeam?.logoUrl && (
                            <img src={md.visitingTeam.logoUrl} height={20} style={{ borderRadius: 4, marginBottom: 2, display: 'block', marginLeft: 'auto' }} alt="" />
                          )}
                          <div className="game-card-team right" style={{ fontSize: 12 }}>{playerName(md.visitingTeam)}</div>
                        </div>
                      </div>
                      {activity.startDate && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          {dayjs(activity.startDate).format('DD/MM HH:mm')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, textAlign: 'center' }}>
            <button
              onClick={() => { setDrawerOpen(false); setFreeGameOpen(true) }}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 20px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13,
              }}
            >
              + Partido libre (sin torneo)
            </button>
          </div>
        </div>
      </Drawer>

      {/* Free game modal */}
      <Modal
        open={freeGameOpen}
        title={<span style={{ color: 'var(--text)' }}>Partido Libre</span>}
        onCancel={() => setFreeGameOpen(false)}
        onOk={() => createFreeMutation.mutate()}
        okText="Crear Partido"
        okButtonProps={{
          disabled: !localTeamId || !visitingTeamId || !freeEventId,
          loading: createFreeMutation.isPending,
          style: { background: 'var(--green)', borderColor: 'var(--green)', color: '#000', fontWeight: 700 },
        }}
        cancelButtonProps={{ style: { color: 'var(--text-muted)' } }}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evento</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar evento..."
              showSearch
              optionFilterProp="label"
              value={freeEventId}
              onChange={setFreeEventId}
              options={events.map((e: any) => ({ value: e.id, label: `${e.code} — ${e.name}` }))}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Equipo Local</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar equipo local..."
              showSearch
              optionFilterProp="label"
              value={localTeamId}
              onChange={setLocalTeamId}
              options={teams
                .filter((t: any) => t.id !== visitingTeamId)
                .map((t: any) => ({ value: t.id, label: playerName(t) }))}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Equipo Visitante</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Seleccionar equipo visitante..."
              showSearch
              optionFilterProp="label"
              value={visitingTeamId}
              onChange={setVisitingTeamId}
              options={teams
                .filter((t: any) => t.id !== localTeamId)
                .map((t: any) => ({ value: t.id, label: playerName(t) }))}
            />
          </div>
        </div>
      </Modal>

      {/* Log drawer */}
      <Drawer
        title="Todos los partidos"
        placement="bottom"
        height="60vh"
        open={logOpen}
        onClose={() => setLogOpen(false)}
      >
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {games.filter((g: any) => g.status === 'FINISHED').length === 0
            ? 'Sin partidos finalizados'
            : games.filter((g: any) => g.status === 'FINISHED').map((game: any) => (
              <div
                key={game.id}
                className="game-card"
                style={{ marginBottom: 10 }}
                onClick={() => { setLogOpen(false); navigate(`/games/${game.id}`) }}
              >
                <div className="game-card-teams">
                  <div className="game-card-team">{playerName(game.localTeam)}</div>
                  <div className="game-card-score">{game.localScore} — {game.visitingScore}</div>
                  <div className="game-card-team right">{playerName(game.visitingTeam)}</div>
                </div>
              </div>
            ))}
        </div>
      </Drawer>
    </div>
  )
}
