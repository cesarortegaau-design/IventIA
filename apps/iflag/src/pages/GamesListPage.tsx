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

function playerName(c: any) {
  return c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || '—'
}

export default function GamesListPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const user = useAuthStore(s => s.user)

  const [createOpen, setCreateOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [localTeamId, setLocalTeamId] = useState<string | undefined>()
  const [visitingTeamId, setVisitingTeamId] = useState<string | undefined>()
  const [eventId, setEventId] = useState<string | undefined>()

  const { data: gamesData, isLoading } = useQuery({
    queryKey: ['iflag-games'],
    queryFn: () => iflagApi.listGames(),
    refetchInterval: 10_000,
  })
  const games = gamesData?.data ?? []

  const { data: eventsData } = useQuery({
    queryKey: ['iflag-events'],
    queryFn: () => iflagApi.listEvents({ pageSize: 50, status: 'CONFIRMED,IN_EXECUTION' }),
    enabled: createOpen,
  })
  const events = eventsData?.data ?? []

  const { data: teamsData } = useQuery({
    queryKey: ['iflag-teams'],
    queryFn: () => iflagApi.listTeams(),
    enabled: createOpen,
  })
  const teams = (teamsData?.data ?? []).filter((c: any) => c.isTeam)

  const createMutation = useMutation({
    mutationFn: () => iflagApi.createGame({ eventId, localTeamId, visitingTeamId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['iflag-games'] })
      setCreateOpen(false)
      setLocalTeamId(undefined)
      setVisitingTeamId(undefined)
      setEventId(undefined)
      message.success('Partido creado')
      navigate(`/games/${res.data.id}/attendance`)
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al crear partido'),
  })

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
        {games.map((game: any) => (
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
        onClick={() => setCreateOpen(true)}
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

      {/* Create game modal */}
      <Modal
        open={createOpen}
        title={<span style={{ color: 'var(--text)' }}>Nuevo Partido</span>}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createMutation.mutate()}
        okText="Crear Partido"
        okButtonProps={{
          disabled: !localTeamId || !visitingTeamId || !eventId,
          loading: createMutation.isPending,
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
              value={eventId}
              onChange={setEventId}
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
