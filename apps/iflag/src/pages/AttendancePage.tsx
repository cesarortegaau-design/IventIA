import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { ArrowLeftOutlined, PlayCircleOutlined } from '@ant-design/icons'
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
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['iflag-attendance', gameId] })
      const prev = qc.getQueryData(['iflag-attendance', gameId])
      qc.setQueryData(['iflag-attendance', gameId], (old: any) =>
        old ? { ...old, data: old.data.map((a: any) => a.playerId === vars.playerId ? { ...a, present: vars.present } : a) } : old
      )
      return { prev }
    },
    onError: (_: any, __: any, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['iflag-attendance', gameId], ctx.prev)
      message.error('Error al actualizar asistencia')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['iflag-attendance', gameId] }),
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

  const totalPresent = attendance.filter((a: any) => a.present).length
  const totalPlayers = attendance.length

  function sideCount(side: 'local' | 'visiting') {
    const tid = side === 'local' ? game.localTeamId : game.visitingTeamId
    return {
      present: attendance.filter((a: any) => a.teamId === tid && a.present).length,
      total:   attendance.filter((a: any) => a.teamId === tid).length,
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 100 }}>
      {/* Navbar */}
      <div className="navbar">
        <button className="nav-back" onClick={() => navigate('/games')}><ArrowLeftOutlined /></button>
        <div className="nav-title">Pase de Lista</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalPresent}/{totalPlayers}</span>
      </div>

      {/* Team tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {(['local', 'visiting'] as const).map(side => {
          const t = side === 'local' ? game.localTeam : game.visitingTeam
          const name = playerName(t)
          const { present, total } = sideCount(side)
          return (
            <button
              key={side}
              onClick={() => setActiveTeam(side)}
              style={{
                flex: 1, padding: '12px 8px',
                background: 'transparent', border: 'none',
                borderBottom: `3px solid ${activeTeam === side ? 'var(--green)' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'border-color 0.2s',
              }}
            >
              {t?.logoUrl && <img src={t.logoUrl} height={28} style={{ objectFit: 'contain', borderRadius: 4 }} alt="" />}
              <span style={{ fontSize: 13, fontWeight: 700, color: activeTeam === side ? 'var(--green)' : 'var(--text)' }}>{name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{present}/{total} presentes</span>
            </button>
          )
        })}
      </div>

      {/* Player grid */}
      {attLoading ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando jugadores...</div>
      ) : teamPlayers.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
          <div>Sin jugadores registrados</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Agrega jugadores como relaciones tipo "Jugador" al equipo</div>
        </div>
      ) : (
        <div className="att-grid">
          {teamPlayers.map((record: any) => {
            const present = record.present
            const name = playerName(record.player)
            const first = name.split(' ')[0] || name
            const num = record.number ?? record.player?.playerNumber
            return (
              <button
                key={record.id}
                className={`att-card ${present ? 'present' : ''}`}
                onClick={() => toggleMutation.mutate({ playerId: record.playerId, teamId: record.teamId, present: !present })}
              >
                {record.player?.logoUrl
                  ? <img src={record.player.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${present ? 'var(--green)' : 'var(--border)'}` }} />
                  : <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: present ? 'rgba(0,230,118,0.2)' : 'var(--surface)',
                      border: `2px solid ${present ? 'var(--green)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: present ? 'var(--green)' : 'var(--text-muted)',
                    }}>
                    {(first[0] || '?').toUpperCase()}
                  </div>}
                {num != null && (
                  <div style={{ fontFamily: "'Bebas Neue','Inter',sans-serif", fontSize: 18, fontWeight: 900, color: present ? 'var(--green)' : 'var(--text-muted)', lineHeight: 1 }}>
                    #{num}
                  </div>
                )}
                <div style={{ fontSize: 10, fontWeight: 700, color: present ? 'var(--green)' : 'var(--text-muted)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                  {first}
                </div>
                <div style={{ fontSize: 9, color: present ? 'var(--green)' : 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {present ? '✓' : '—'}
                </div>
              </button>
            )
          })}
        </div>
      )}

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
