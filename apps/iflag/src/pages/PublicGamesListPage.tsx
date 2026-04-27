import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EyeOutlined } from '@ant-design/icons'
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Próximo', color: '#1677ff' },
  ATTENDANCE: { label: 'Asistencia', color: '#1677ff' },
  IN_PROGRESS: { label: 'En Juego', color: '#52c41a' },
  HALFTIME: { label: 'Medio Tiempo', color: '#faad14' },
  FINISHED: { label: 'Finalizado', color: '#8c8c8c' },
}

export default function PublicGamesListPage() {
  const navigate = useNavigate()

  const { data: gamesData, isLoading } = useQuery({
    queryKey: ['public-games'],
    queryFn: () => iflagApi.publicListGames(),
    refetchInterval: 15000,
  })
  const games = gamesData?.data ?? []

  const liveGames = games.filter((g: any) => g.status === 'IN_PROGRESS' || g.status === 'HALFTIME' || g.status === 'ATTENDANCE')
  const upcomingGames = games.filter((g: any) => g.status === 'PENDING')
  const finishedGames = games.filter((g: any) => g.status === 'FINISHED')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 24 }}>
      <div className="navbar">
        <div className="nav-title" style={{ flex: 1, textAlign: 'center', fontSize: 15 }}>
          I-FLAG Partidos
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Cargando...</div>
        )}

        {!isLoading && games.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏈</div>
            <div style={{ fontSize: 16 }}>No hay partidos disponibles</div>
          </div>
        )}

        {liveGames.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 12 }}>
              <span style={{ color: '#52c41a' }}>En vivo</span>
            </div>
            {liveGames.map((g: any) => (
              <GameCard key={g.id} game={g} onClick={() => navigate(`/live/${g.id}`)} live />
            ))}
          </>
        )}

        {upcomingGames.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 20 }}>Próximos</div>
            {upcomingGames.map((g: any) => (
              <GameCard key={g.id} game={g} onClick={() => navigate(`/live/${g.id}`)} />
            ))}
          </>
        )}

        {finishedGames.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 20 }}>Finalizados</div>
            {finishedGames.map((g: any) => (
              <GameCard key={g.id} game={g} onClick={() => navigate(`/live/${g.id}`)} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function GameCard({ game, onClick, live }: { game: any; onClick: () => void; live?: boolean }) {
  const status = STATUS_LABELS[game.status] ?? { label: game.status, color: '#8c8c8c' }

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card-bg)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        cursor: 'pointer',
        border: live ? '1px solid rgba(82, 196, 26, 0.3)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{game.event?.name}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: status.color, textTransform: 'uppercase' }}>
          {live && <EyeOutlined style={{ marginRight: 4 }} />}
          {status.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
          <TeamTag team={game.localTeam} size={22} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', minWidth: 70, textAlign: 'center', fontFamily: 'monospace' }}>
          {game.localScore} - {game.visitingScore}
        </div>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text)', display: 'flex', justifyContent: 'flex-end' }}>
          <TeamTag team={game.visitingTeam} size={22} />
        </div>
      </div>
      {game.createdAt && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          {dayjs(game.createdAt).format('DD/MM/YYYY HH:mm')}
        </div>
      )}
    </div>
  )
}
