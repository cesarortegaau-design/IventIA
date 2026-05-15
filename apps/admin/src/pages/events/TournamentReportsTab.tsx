import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  App, Button, Table, Card, Tag, Tabs, Empty, Typography, Badge, Tooltip,
} from 'antd'
import {
  FileExcelOutlined, CalendarOutlined, TrophyOutlined, UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { eventActivitiesApi } from '../../api/eventActivities'
import { tournamentApi } from '../../api/tournament'
import { T } from '../../styles/tokens'

const { Text, Title } = Typography

interface Props {
  eventId: string
}

// Unified game record shape used throughout the tab
interface GameRow {
  id: string
  startDate: string | null
  round: number | null
  category: string | null
  homeTeamId: string
  homeTeamName: string
  homeScore: number | null
  visitingTeamId: string
  visitingTeamName: string
  visitingScore: number | null
  source: 'schedule' | 'iflag'
}

function StandingsLegend() {
  const [open, setOpen] = React.useState(false)
  const teamCols = [
    ['PJ', 'Partidos Jugados'], ['G', 'Ganados'], ['E', 'Empates'], ['P', 'Perdidos'],
    ['GF', 'Goles a Favor'], ['GC', 'Goles en Contra'], ['DG', 'Diferencia de Goles'], ['Pts', 'Puntos'],
  ]
  const playerCols = [
    ['Pres.', 'Presencias en partidos'], ['TD', 'Touchdown'], ['XP', 'Punto Extra (Extra Point)'],
    ['SAF', 'Safety'], ['INT', 'Intercepción'], ['PEN', 'Castigo / Flag Penalty'],
  ]
  return (
    <div style={{ marginTop: 12 }}>
      <Button
        type="link"
        size="small"
        onClick={() => setOpen(v => !v)}
        style={{ padding: 0, fontSize: 12, color: '#8c8c8c' }}
      >
        ℹ️ Leyenda de acrónimos {open ? '▲' : '▼'}
      </Button>
      {open && (
        <div style={{ marginTop: 8, padding: '12px 14px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Equipo</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
              {teamCols.map(([abbr, full]) => (
                <span key={abbr} style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>
                  <strong>{abbr}</strong> = {full}
                </span>
              ))}
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Jugador (expandir fila de equipo)</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
              {playerCols.map(([abbr, full]) => (
                <span key={abbr} style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>
                  <strong>{abbr}</strong> = {full}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TournamentReportsTab({ eventId }: Props) {
  const { message } = App.useApp()

  // ── Data sources ─────────────────────────────────────────────────────────

  // Source 1: EventActivity GAME records (schedule-based)
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['tournament-activities', eventId],
    queryFn: () => eventActivitiesApi.list(eventId),
    enabled: !!eventId,
  })
  const allActivities: any[] = activitiesData?.data ?? []

  // Source 2: FootballGame records (direct I-Flag games, may lack activityId)
  const { data: footballData, isLoading: footballLoading } = useQuery({
    queryKey: ['iflag-football-games', eventId],
    queryFn: () => tournamentApi.listFootballGames(eventId),
    enabled: !!eventId,
  })
  const footballGames: any[] = footballData?.data ?? []

  // Team registrations (for category lookup)
  const { data: teamsData } = useQuery({
    queryKey: ['tournament-teams', eventId],
    queryFn: () => tournamentApi.listTeams(eventId),
    enabled: !!eventId,
  })
  const teams: any[] = teamsData?.data ?? []

  // Per-player stats per team
  const { data: teamStatsData } = useQuery({
    queryKey: ['tournament-team-player-stats', eventId],
    queryFn: () => tournamentApi.getTeamPlayerStats(eventId),
    enabled: !!eventId,
  })
  const teamPlayerStats: any[] = teamStatsData?.data?.teams ?? []
  const teamPlayerStatsMap: Record<string, any[]> = Object.fromEntries(
    teamPlayerStats.map((t: any) => [t.teamId, t.players ?? []])
  )

  const isLoading = activitiesLoading || footballLoading

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getTeamName = (teamId: string, fallback?: string) => {
    if (!teamId) return fallback ?? '—'
    // Check team registrations first (has companyName)
    const reg = teams.find((t: any) => t.teamClientId === teamId)
    if (reg?.teamClient) {
      return reg.teamClient.companyName || `${reg.teamClient.firstName ?? ''} ${reg.teamClient.lastName ?? ''}`.trim()
    }
    return fallback ?? teamId
  }

  const getTeamCategory = (teamId: string): string | null => {
    const reg = teams.find((t: any) => t.teamClientId === teamId)
    return reg?.category ?? null
  }

  // ── Build unified game list ───────────────────────────────────────────────

  // Schedule-based games (EventActivity + SportMatchData)
  const scheduleGames: GameRow[] = allActivities
    .filter((a: any) => a.activityType === 'GAME' && a.matchData)
    .map((a: any) => ({
      id: a.id,
      startDate: a.startDate,
      round: a.matchData?.round ?? null,
      category: a.matchData?.category ?? null,
      homeTeamId: a.matchData?.homeTeamId,
      homeTeamName: a.matchData?.homeTeam?.companyName ?? getTeamName(a.matchData?.homeTeamId),
      homeScore: a.matchData?.homeScore ?? null,
      visitingTeamId: a.matchData?.visitingTeamId,
      visitingTeamName: a.matchData?.visitingTeam?.companyName ?? getTeamName(a.matchData?.visitingTeamId),
      visitingScore: a.matchData?.visitingScore ?? null,
      source: 'schedule' as const,
    }))

  // I-Flag direct games (FootballGame without schedule link, or as score fallback)
  // Only include games NOT already represented by a schedule game (via activityId)
  const scheduledActivityIds = new Set(
    allActivities
      .filter((a: any) => a.activityType === 'GAME')
      .map((a: any) => a.id)
  )

  const iflagGames: GameRow[] = footballGames
    .filter((fg: any) => !fg.activityId || !scheduledActivityIds.has(fg.activityId))
    .map((fg: any) => ({
      id: fg.id,
      startDate: fg.startedAt ?? fg.createdAt ?? null,
      round: null,
      category: getTeamCategory(fg.localTeamId) ?? getTeamCategory(fg.visitingTeamId),
      homeTeamId: fg.localTeamId,
      homeTeamName: fg.localTeam?.companyName ?? getTeamName(fg.localTeamId),
      homeScore: fg.status === 'FINISHED' ? fg.localScore : null,
      visitingTeamId: fg.visitingTeamId,
      visitingTeamName: fg.visitingTeam?.companyName ?? getTeamName(fg.visitingTeamId),
      visitingScore: fg.status === 'FINISHED' ? fg.visitingScore : null,
      source: 'iflag' as const,
    }))

  // Also: for schedule games without scores yet, pull score from linked FootballGame
  const footballGameByActivity: Record<string, any> = {}
  for (const fg of footballGames) {
    if (fg.activityId) footballGameByActivity[fg.activityId] = fg
  }
  const enrichedScheduleGames = scheduleGames.map((g) => {
    if (g.homeScore !== null) return g
    const linked = footballGameByActivity[g.id]
    if (linked?.status === 'FINISHED') {
      return { ...g, homeScore: linked.localScore, visitingScore: linked.visitingScore }
    }
    return g
  })

  const allGames: GameRow[] = [...enrichedScheduleGames, ...iflagGames]

  // ── Standings ────────────────────────────────────────────────────────────

  const standingsByCategory: Record<string, any[]> = {}

  if (teams.length > 0) {
    const finishedGames = allGames.filter((g) => g.homeScore !== null && g.visitingScore !== null)
    const standings = teams.map((team: any) => {
      const tid = team.teamClientId
      const teamGames = finishedGames.filter((g) => g.homeTeamId === tid || g.visitingTeamId === tid)
      let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0
      for (const g of teamGames) {
        const scored = g.homeTeamId === tid ? g.homeScore! : g.visitingScore!
        const conceded = g.homeTeamId === tid ? g.visitingScore! : g.homeScore!
        gf += scored; ga += conceded
        if (scored > conceded) wins++
        else if (scored === conceded) draws++
        else losses++
      }
      return {
        teamId: tid,
        teamName: getTeamName(tid),
        category: team.category,
        played: teamGames.length,
        wins, draws, losses, gf, ga,
        gd: gf - ga,
        points: wins * 3 + draws,
      }
    })
    for (const s of standings) {
      if (!standingsByCategory[s.category]) standingsByCategory[s.category] = []
      standingsByCategory[s.category].push(s)
    }
    for (const cat of Object.keys(standingsByCategory)) {
      standingsByCategory[cat].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    }
  } else {
    // No team registrations — group directly from game data
    const allTeamIds = [...new Set(allGames.flatMap((g) => [g.homeTeamId, g.visitingTeamId]))]
    const finishedGames = allGames.filter((g) => g.homeScore !== null && g.visitingScore !== null)
    const statsMap: Record<string, any> = {}
    for (const tid of allTeamIds) {
      const teamGames = finishedGames.filter((g) => g.homeTeamId === tid || g.visitingTeamId === tid)
      let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0
      for (const g of teamGames) {
        const scored = g.homeTeamId === tid ? g.homeScore! : g.visitingScore!
        const conceded = g.homeTeamId === tid ? g.visitingScore! : g.homeScore!
        gf += scored; ga += conceded
        if (scored > conceded) wins++
        else if (scored === conceded) draws++
        else losses++
      }
      statsMap[tid] = {
        teamId: tid,
        teamName: getTeamName(tid, tid.slice(0, 8)),
        category: allGames.find((g) => g.homeTeamId === tid || g.visitingTeamId === tid)?.category ?? 'SIN_CAT',
        played: teamGames.length,
        wins, draws, losses, gf, ga,
        gd: gf - ga,
        points: wins * 3 + draws,
      }
    }
    for (const s of Object.values(statsMap)) {
      if (!standingsByCategory[s.category]) standingsByCategory[s.category] = []
      standingsByCategory[s.category].push(s)
    }
    for (const cat of Object.keys(standingsByCategory)) {
      standingsByCategory[cat].sort((a: any, b: any) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    }
  }

  // ── Group calendar by round ───────────────────────────────────────────────

  const gamesByRound = allGames.reduce((acc: Record<string, GameRow[]>, g) => {
    const key = g.round != null ? `Jornada ${g.round}` : 'Sin jornada'
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {})

  const roundKeys = Object.keys(gamesByRound).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 999
    const nb = parseInt(b.replace(/\D/g, '')) || 999
    return na - nb
  })

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExportExcel = () => {
    try {
      const rows = allGames.map((g) => ({
        'Jornada': g.round ?? '—',
        'Fecha': g.startDate ? dayjs(g.startDate).format('DD/MM/YYYY HH:mm') : '—',
        'Categoría': g.category ?? '—',
        'Local': g.homeTeamName,
        'Visitante': g.visitingTeamName,
        'Goles Local': g.homeScore ?? '—',
        'Goles Visitante': g.visitingScore ?? '—',
        'Fuente': g.source === 'iflag' ? 'I-Flag' : 'Calendario',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Calendario')
      XLSX.writeFile(wb, `reportes-torneo-${eventId}.xlsx`)
      message.success('Exportado')
    } catch {
      message.error('Error al exportar')
    }
  }

  // ── Column definitions ────────────────────────────────────────────────────

  const catColors: Record<string, string> = { FEMENIL: 'pink', VARONIL: 'blue', MIXTO: 'purple', SIN_CAT: 'default' }
  const catLabels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto', SIN_CAT: 'Sin cat.' }

  const calendarColumns = [
    {
      title: 'Jornada',
      dataIndex: 'round',
      key: 'round',
      width: 80,
      render: (v: number | null) => v != null ? <Tag>J{v}</Tag> : <Tag color="default">—</Tag>,
    },
    {
      title: 'Fecha',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 140,
      render: (v: string | null) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
    },
    {
      title: 'Cat.',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      render: (v: string | null) => v ? <Tag color={catColors[v] ?? 'default'}>{catLabels[v] ?? v}</Tag> : '—',
    },
    {
      title: 'Partido',
      key: 'match',
      render: (_: any, r: GameRow) => (
        <span><strong>{r.homeTeamName}</strong> <Text type="secondary">vs</Text> <strong>{r.visitingTeamName}</strong></span>
      ),
    },
    {
      title: 'Resultado',
      key: 'result',
      width: 110,
      render: (_: any, r: GameRow) => {
        if (r.homeScore === null || r.visitingScore === null) {
          return <Text type="secondary">Pendiente</Text>
        }
        const winner = r.homeScore > r.visitingScore ? 'home' : r.visitingScore > r.homeScore ? 'away' : 'draw'
        return (
          <span style={{ fontWeight: 700, fontSize: 14, color: winner === 'draw' ? T.textMuted : T.text }}>
            {r.homeScore} – {r.visitingScore}
          </span>
        )
      },
    },
    {
      title: 'Fuente',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (v: string) => <Tag color={v === 'iflag' ? 'green' : 'blue'}>{v === 'iflag' ? 'I-Flag' : 'Calendario'}</Tag>,
    },
  ]

  const standingsColumns = [
    { title: '#', key: 'pos', width: 40, render: (_: any, __: any, i: number) => i + 1 },
    {
      title: 'Equipo', dataIndex: 'teamName', key: 'teamName',
      render: (name: string, row: any) => {
        const playerCount = (teamPlayerStatsMap[row.teamId] ?? []).length
        return (
          <span>
            {name}
            {playerCount > 0 && (
              <Tooltip title={`${playerCount} jugadores`}>
                <Tag icon={<UserOutlined />} color="blue" style={{ marginLeft: 6, fontSize: 11 }}>{playerCount}</Tag>
              </Tooltip>
            )}
          </span>
        )
      },
    },
    { title: 'PJ', dataIndex: 'played', key: 'played', width: 45 },
    { title: 'G',  dataIndex: 'wins',   key: 'wins',   width: 45, render: (v: number) => <Text style={{ color: '#52c41a' }}>{v}</Text> },
    { title: 'E',  dataIndex: 'draws',  key: 'draws',  width: 45 },
    { title: 'P',  dataIndex: 'losses', key: 'losses', width: 45, render: (v: number) => <Text style={{ color: '#ff4d4f' }}>{v}</Text> },
    { title: 'GF', dataIndex: 'gf',     key: 'gf',     width: 45 },
    { title: 'GC', dataIndex: 'ga',     key: 'ga',     width: 45 },
    { title: 'DG', dataIndex: 'gd',     key: 'gd',     width: 45, render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{v > 0 ? '+' : ''}{v}</span> },
    { title: 'Pts', dataIndex: 'points', key: 'points', width: 50, render: (v: number) => <strong style={{ color: T.navy }}>{v}</strong> },
  ]

  const STAT_LABELS: Record<string, string> = {
    TOUCHDOWN: 'TD', EXTRA_POINT: 'XP', SAFETY: 'SAF',
    INTERCEPTION: 'INT', FLAG_PENALTY: 'PEN', SCORE_ADJUST: 'ADJ',
  }
  const STAT_KEYS = ['TOUCHDOWN', 'EXTRA_POINT', 'SAFETY', 'INTERCEPTION', 'FLAG_PENALTY']

  const playerColumns = [
    { title: '#', key: 'num', width: 40, render: (_: any, r: any) => r.playerNumber ? `#${r.playerNumber}` : '—' },
    { title: 'Jugador', dataIndex: 'playerName', key: 'playerName' },
    { title: 'Pres.', key: 'att', width: 55, render: (_: any, r: any) => r.gamesAttended },
    ...STAT_KEYS.map(k => ({
      title: STAT_LABELS[k] ?? k,
      key: k,
      width: 50,
      render: (_: any, r: any) => {
        const v = r.stats?.[k] ?? 0
        return v > 0 ? <strong style={{ color: k === 'TOUCHDOWN' ? '#52c41a' : k === 'INTERCEPTION' ? '#e91e63' : k === 'FLAG_PENALTY' ? '#faad14' : undefined }}>{v}</strong> : <Text type="secondary">—</Text>
      },
    })),
  ]

  const finishedCount = allGames.filter((g) => g.homeScore !== null).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs
        items={[
          {
            key: 'calendar',
            label: <span><CalendarOutlined /> Calendario de Juegos ({allGames.length})</span>,
            children: (
              <Card loading={isLoading}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {allGames.length} partido{allGames.length !== 1 ? 's' : ''} totales
                    {iflagGames.length > 0 && scheduleGames.length > 0 && ` (${scheduleGames.length} del calendario, ${iflagGames.length} de I-Flag)`}
                    {iflagGames.length > 0 && scheduleGames.length === 0 && ` — fuente: I-Flag`}
                  </Text>
                  {allGames.length > 0 && (
                    <Button icon={<FileExcelOutlined />} size="small" onClick={handleExportExcel}>Excel</Button>
                  )}
                </div>
                {allGames.length === 0 ? (
                  <Empty description="Sin partidos. Genera el calendario o inicia partidos en I-Flag." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {roundKeys.map((rk) => (
                      <div key={rk}>
                        <Title level={5} style={{ marginBottom: 10, color: T.navy }}>{rk}</Title>
                        <Table
                          columns={calendarColumns}
                          dataSource={gamesByRound[rk]}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          scroll={{ x: 'max-content' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ),
          },
          {
            key: 'standings',
            label: <span><TrophyOutlined /> Posiciones</span>,
            children: (
              <Card loading={isLoading}>
                {Object.keys(standingsByCategory).length === 0 ? (
                  <Empty description="Sin datos de posiciones. Se calculan a partir de partidos finalizados." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {Object.entries(standingsByCategory).map(([cat, rows]: [string, any]) => (
                      <div key={cat}>
                        <Title level={5} style={{ marginBottom: 10, color: T.navy }}>
                          <Tag color={catColors[cat] ?? 'default'}>{catLabels[cat] ?? cat}</Tag>
                        </Title>
                        <Table
                          columns={standingsColumns}
                          dataSource={rows}
                          rowKey="teamId"
                          pagination={false}
                          size="small"
                          scroll={{ x: 'max-content' }}
                          expandable={{
                            rowExpandable: (r: any) => (teamPlayerStatsMap[r.teamId]?.length ?? 0) > 0,
                            expandedRowRender: (r: any) => {
                              const players = teamPlayerStatsMap[r.teamId] ?? []
                              return (
                                <div style={{ padding: '8px 0 8px 32px' }}>
                                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                                    Estadísticas por jugador — {r.teamName}
                                  </Text>
                                  <Table
                                    columns={playerColumns}
                                    dataSource={players}
                                    rowKey="playerId"
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: 'max-content' }}
                                  />
                                </div>
                              )
                            },
                          }}
                        />
                        <StandingsLegend />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ),
          },
          {
            key: 'results',
            label: <span>Resultados ({finishedCount})</span>,
            children: (
              <Card loading={isLoading}>
                {finishedCount === 0 ? (
                  <Empty description="Sin resultados finalizados aún" />
                ) : (
                  <Table
                    columns={calendarColumns}
                    dataSource={allGames.filter((g) => g.homeScore !== null)}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
