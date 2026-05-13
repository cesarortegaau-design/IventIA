import { useQuery } from '@tanstack/react-query'
import {
  App, Button, Table, Card, Row, Col, Tag, Space, Tabs, Empty, Spin, Select, DatePicker,
  Divider, Typography, Tooltip, message as antMessage,
} from 'antd'
import {
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined, CalendarOutlined, TrophyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { eventActivitiesApi } from '../../api/eventActivities'
import { tournamentApi } from '../../api/tournament'
import { clientsApi } from '../../api/clients'
import { T } from '../../styles/tokens'

const { Text, Title } = Typography

interface Props {
  eventId: string
}

export default function TournamentReportsTab({ eventId }: Props) {
  const { message } = App.useApp()

  // Fetch tournament data
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['tournament-activities', eventId],
    queryFn: () => eventActivitiesApi.list(eventId),
    enabled: !!eventId,
  })
  const allActivities = activitiesData?.data ?? []

  const { data: teamsData } = useQuery({
    queryKey: ['tournament-teams', eventId],
    queryFn: () => tournamentApi.listTeams(eventId),
    enabled: !!eventId,
  })
  const teams = teamsData?.data ?? []

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })
  const allClients = clientsData?.data ?? []

  const getTeamName = (teamId: string) => {
    const client = allClients.find((c: any) => c.id === teamId)
    return client?.companyName || `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim() || teamId
  }

  // Filter GAME activities
  const games = allActivities.filter((a: any) => a.activityType === 'GAME' && a.matchData)

  // Group games by round
  const gamesByRound = games.reduce((acc: Record<number, any[]>, game: any) => {
    const round = game.matchData?.round ?? 1
    if (!acc[round]) acc[round] = []
    acc[round].push(game)
    return acc
  }, {})

  const roundNumbers = Object.keys(gamesByRound)
    .map(Number)
    .sort((a, b) => a - b)

  // Scoreboard data
  const scoreboardData = games.map((game: any) => ({
    id: game.id,
    title: game.title,
    startDate: game.startDate,
    round: game.matchData?.round ?? 1,
    category: game.matchData?.category,
    homeTeamId: game.matchData?.homeTeamId,
    homeTeamName: getTeamName(game.matchData?.homeTeamId),
    homeScore: game.matchData?.homeScore,
    visitingTeamId: game.matchData?.visitingTeamId,
    visitingTeamName: getTeamName(game.matchData?.visitingTeamId),
    visitingScore: game.matchData?.visitingScore,
  }))

  // Calculate standings
  const standings = teams.map((team: any) => {
    const teamGames = scoreboardData.filter(
      (g: any) => g.homeTeamId === team.teamClientId || g.visitingTeamId === team.teamClientId
    )
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0

    teamGames.forEach((game: any) => {
      if (game.homeScore === null || game.visitingScore === null) return // Skip unfinished games

      const isHome = game.homeTeamId === team.teamClientId
      const scored = isHome ? game.homeScore : game.visitingScore
      const conceded = isHome ? game.visitingScore : game.homeScore

      goalsFor += scored
      goalsAgainst += conceded

      if (scored > conceded) wins++
      else if (scored === conceded) draws++
      else losses++
    })

    const played = wins + draws + losses
    const points = wins * 3 + draws

    return {
      teamId: team.teamClientId,
      teamName: getTeamName(team.teamClientId),
      category: team.category,
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDiff: goalsFor - goalsAgainst,
      points,
    }
  })

  // Group standings by category
  const standingsByCategory = standings.reduce((acc: Record<string, any[]>, standing: any) => {
    if (!acc[standing.category]) acc[standing.category] = []
    acc[standing.category].push(standing)
    return acc
  }, {})

  // Sort within each category
  Object.keys(standingsByCategory).forEach((category) => {
    standingsByCategory[category].sort((a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
      return b.goalsFor - a.goalsFor
    })
  })

  const handleExportCalendarExcel = async () => {
    try {
      const rows = games.map((game: any) => ({
        'Ronda': game.matchData?.round ?? 1,
        'Fecha': dayjs(game.startDate).format('DD/MM/YYYY HH:mm'),
        'Categoría': game.matchData?.category,
        'Equipo Local': getTeamName(game.matchData?.homeTeamId),
        'Equipo Visitante': getTeamName(game.matchData?.visitingTeamId),
        'Goles Local': game.matchData?.homeScore ?? '—',
        'Goles Visitante': game.matchData?.visitingScore ?? '—',
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Calendario')
      XLSX.writeFile(workbook, `calendario-torneo-${eventId}.xlsx`)
      message.success('Calendario exportado')
    } catch {
      message.error('Error al exportar')
    }
  }

  // Calendar columns
  const calendarColumns = [
    {
      title: 'Ronda',
      dataIndex: 'round',
      key: 'round',
      width: 80,
      render: (v: number) => <Tag>{v}</Tag>,
    },
    {
      title: 'Fecha',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 160,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (v: string) => {
        const colors: Record<string, string> = { FEMENIL: 'pink', VARONIL: 'blue', MIXTO: 'purple' }
        const labels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }
        return <Tag color={colors[v]}>{labels[v]}</Tag>
      },
    },
    {
      title: 'Partido',
      key: 'match',
      render: (_: any, record: any) => (
        <span>
          <strong>{record.homeTeamName}</strong> vs <strong>{record.visitingTeamName}</strong>
        </span>
      ),
    },
    {
      title: 'Resultado',
      key: 'result',
      width: 120,
      render: (_: any, record: any) => {
        if (record.homeScore === null || record.visitingScore === null) {
          return <span style={{ color: T.textMuted }}>Pendiente</span>
        }
        const winner =
          record.homeScore > record.visitingScore ? 'home' :
          record.visitingScore > record.homeScore ? 'away' : 'draw'

        return (
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: winner === 'draw' ? T.textMuted : T.text,
          }}>
            {record.homeScore} - {record.visitingScore}
          </span>
        )
      },
    },
  ]

  // Standings columns
  const standingsColumns = [
    { title: 'Pos', dataIndex: 'pos', key: 'pos', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
    { title: 'Equipo', dataIndex: 'teamName', key: 'teamName' },
    { title: 'PJ', dataIndex: 'played', key: 'played', width: 50 },
    { title: 'G', dataIndex: 'wins', key: 'wins', width: 50 },
    { title: 'E', dataIndex: 'draws', key: 'draws', width: 50 },
    { title: 'P', dataIndex: 'losses', key: 'losses', width: 50 },
    { title: 'GF', dataIndex: 'goalsFor', key: 'goalsFor', width: 50 },
    { title: 'GC', dataIndex: 'goalsAgainst', key: 'goalsAgainst', width: 50 },
    { title: 'DG', dataIndex: 'goalDiff', key: 'goalDiff', width: 50 },
    {
      title: 'Pts',
      dataIndex: 'points',
      key: 'points',
      width: 60,
      render: (v: number) => <strong style={{ color: T.navy }}>{v}</strong>,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs
        items={[
          {
            key: 'calendar',
            label: <span><CalendarOutlined /> Calendario de Juegos ({games.length})</span>,
            children: (
              <Card loading={activitiesLoading}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {games.length === 0 && <Text type="secondary">No hay juegos programados</Text>}
                  </div>
                  {games.length > 0 && (
                    <Button icon={<FileExcelOutlined />} onClick={handleExportCalendarExcel}>
                      Descargar Excel
                    </Button>
                  )}
                </div>

                {roundNumbers.length === 0 ? (
                  <Empty description="Sin juegos programados" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {roundNumbers.map((round) => (
                      <div key={round}>
                        <Title level={5} style={{ marginBottom: 12, color: T.navy }}>
                          Ronda {round}
                        </Title>
                        <Table
                          columns={calendarColumns}
                          dataSource={gamesByRound[round]}
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
              <Card loading={activitiesLoading}>
                {Object.keys(standingsByCategory).length === 0 ? (
                  <Empty description="Sin datos de posiciones" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {Object.entries(standingsByCategory).map(([category, categoryStandings]: [string, any]) => {
                      const categoryLabels: Record<string, string> = {
                        FEMENIL: 'Femenil',
                        VARONIL: 'Varonil',
                        MIXTO: 'Mixto',
                      }
                      const categoryColors: Record<string, string> = {
                        FEMENIL: 'pink',
                        VARONIL: 'blue',
                        MIXTO: 'purple',
                      }
                      return (
                        <div key={category}>
                          <Title level={5} style={{ marginBottom: 12, color: T.navy }}>
                            <Tag color={categoryColors[category]}>{categoryLabels[category]}</Tag>
                          </Title>
                          <Table
                            columns={standingsColumns}
                            dataSource={categoryStandings}
                            rowKey="teamId"
                            pagination={false}
                            size="small"
                            scroll={{ x: 'max-content' }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            ),
          },
          {
            key: 'results',
            label: <span>Resultados ({games.filter((g: any) => g.matchData?.homeScore !== null).length})</span>,
            children: (
              <Card loading={activitiesLoading}>
                {games.length === 0 ? (
                  <Empty description="Sin resultados" />
                ) : (
                  <Table
                    columns={calendarColumns}
                    dataSource={games.filter((g: any) => g.matchData?.homeScore !== null)}
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
