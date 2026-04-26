import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { iflagApi } from '../api/iflag'

function playerName(c: any) {
  if (!c) return '—'
  return c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—'
}

export default function AttendancePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [activeTeam, setActiveTeam] = useState<'local' | 'visiting'>('local')

  const { data: gameData, isLoading: gameLoading } = useQuery({
    queryKey: ['iflag-game', gameId],
    queryFn: () => iflagApi.getGame(gameId!),
  })
  const game = gameData?.data

  const { data: attendanceData, isLoading: attLoading } = useQuery({
    queryKey: ['iflag-attendance', gameId],
    queryFn: () => iflagApi.getAttendance(gameId!),
    enabled: !!gameId,
    refetchOnWindowFocus: false,
  })
  const attendance: any[] = attendanceData?.data ?? []

  const toggleMutation = useMutation({
    mutationFn: (vars: any) => iflagApi.upsertAttendance(gameId!, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iflag-attendance', gameId] }),
    onError: () => message.error('Error al actualizar asistencia'),
  })

  const startGameMutation = useMutation({
    mutationFn: () => iflagApi.updateGame(gameId!, { status: 'IN_PROGRESS' }),
    onSuccess: () => {
      message.success('¡Partido iniciado!')
      navigate(`/games/${gameId}`)
    },
    onError: () => message.error('Error al iniciar partido'),
  })

  const markAttendanceDoneMutation = useMutation({
    mutationFn: () => iflagApi.updateGame(gameId!, { status: 'ATTENDANCE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iflag-game', gameId] }),
  })

  if (gameLoading || !game) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
  }

  const teamId = activeTeam === 'local' ? game.localTeamId : game.visitingTeamId
  const team = activeTeam === 'local' ? game.localTeam : game.visitingTeam
  const teamPlayers = attendance.filter((a: any) => a.teamId === teamId)
  const presentCount = teamPlayers.filter((a: any) => a.present).length

  function getStatus(playerId: string) {
    const rec = attendance.find(a => a.playerId === playerId)
    return rec ? rec.present : null
  }

  const totalPresent = attendance.filter(a => a.present).length
  const totalPlayers = attendance.length

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 100 }}>
      {/* Navbar */}
      <div className="navbar">
        <button className="nav-back" onClick={() => navigate('/games')}>
          <ArrowLeftOutlined />
        </button>
        <div className="nav-title">Pase de Lista</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalPresent}/{totalPlayers}</span>
      </div>

      {/* Team tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {(['local', 'visiting'] as const).map(side => {
          const t = side === 'local' ? game.localTeam : game.visitingTeam
          const name = playerName(t)
          const sideCount = attendance.filter(a => a.teamId === (side === 'local' ? game.localTeamId : game.visitingTeamId) && a.present).length
          const sideTotal = attendance.filter(a => a.teamId === (side === 'local' ? game.localTeamId : game.visitingTeamId)).length
          return (
            <button
              key={side}
              onClick={() => setActiveTeam(side)}
              style={{
                flex: 1, padding: '14px 8px',
                background: 'transparent',
                border: 'none',
                borderBottom: `3px solid ${activeTeam === side ? 'var(--green)' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'border-color 0.2s',
              }}
            >
              {t?.logoUrl && <img src={t.logoUrl} height={28} style={{ objectFit: 'contain', borderRadius: 4 }} alt="" />}
              <span style={{ fontSize: 13, fontWeight: 700, color: activeTeam === side ? 'var(--green)' : 'var(--text)' }}>
                {name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sideCount}/{sideTotal} presentes</span>
            </button>
          )
        })}
      </div>

      {/* Player list */}
      <div style={{ background: 'var(--surface)', margin: '16px', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {attLoading && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando jugadores...</div>
        )}
        {!attLoading && teamPlayers.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div>Sin jugadores registrados</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Agrega jugadores como relaciones tipo "Jugador" al equipo</div>
          </div>
        )}
        {teamPlayers.map((record: any) => {
          const present = record.present
          return (
            <div
              key={record.id}
              className={`attendance-player ${present ? 'present' : 'absent'}`}
            >
              <div>
                <div className="player-name">{playerName(record.player)}</div>
                {record.number && <div className="player-num">#{record.number}</div>}
              </div>
              <button
                className={`attendance-toggle ${present ? 'present' : 'absent'}`}
                onClick={() => toggleMutation.mutate({
                  playerId: record.playerId,
                  teamId: record.teamId,
                  present: !present,
                })}
                disabled={toggleMutation.isPending}
              >
                {present ? <CheckOutlined /> : '—'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        {game.status === 'PENDING' && (
          <button
            className="timer-btn reset"
            style={{ flex: 1 }}
            onClick={() => markAttendanceDoneMutation.mutate()}
            disabled={markAttendanceDoneMutation.isPending}
          >
            Confirmar pase de lista
          </button>
        )}
        <button
          className="timer-btn start"
          style={{ flex: 1 }}
          onClick={() => startGameMutation.mutate()}
          disabled={startGameMutation.isPending}
        >
          <PlayCircleOutlined style={{ marginRight: 6 }} />
          Iniciar partido
        </button>
      </div>
    </div>
  )
}
