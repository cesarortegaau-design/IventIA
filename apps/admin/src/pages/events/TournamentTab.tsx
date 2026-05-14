import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select,
  Space, Table, Tabs, Typography, Divider, Card, Row, Col, DatePicker,
  Empty, Badge, Tooltip, Switch,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, TrophyOutlined,
  TeamOutlined, EnvironmentOutlined, SettingOutlined, BarChartOutlined, MobileOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { tournamentApi } from '../../api/tournament'
import { clientsApi } from '../../api/clients'
import TournamentReportsTab from './TournamentReportsTab'
import { T } from '../../styles/tokens'

const { Text } = Typography

interface Props {
  eventId: string
}

const GAME_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ATTENDANCE: 'Pase de lista',
  IN_PROGRESS: 'En juego',
  HALFTIME: 'Medio tiempo',
  FINISHED: 'Finalizado',
}
const GAME_STATUS_COLORS: Record<string, string> = {
  PENDING: 'default',
  ATTENDANCE: 'processing',
  IN_PROGRESS: 'success',
  HALFTIME: 'warning',
  FINISHED: 'default',
}
const CATEGORY_LABELS: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }
const CATEGORY_COLORS: Record<string, string> = { FEMENIL: 'pink', VARONIL: 'blue', MIXTO: 'purple' }

function IFlagStatusSection({ eventId }: { eventId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['iflag-schedule', eventId],
    queryFn: () => tournamentApi.listIFlagGames(eventId),
    enabled: !!eventId,
  })
  const activities = data?.data ?? []

  const columns = [
    {
      title: 'Jornada',
      key: 'round',
      width: 80,
      render: (_: any, r: any) => <Text strong>J{r.matchData?.round ?? '—'}</Text>,
    },
    {
      title: 'Categoría',
      key: 'category',
      width: 100,
      render: (_: any, r: any) => (
        <Badge color={CATEGORY_COLORS[r.matchData?.category] ?? 'default'} text={CATEGORY_LABELS[r.matchData?.category] ?? r.matchData?.category} />
      ),
    },
    {
      title: 'Local',
      key: 'home',
      render: (_: any, r: any) => r.matchData?.homeTeam?.companyName ?? '—',
    },
    {
      title: 'Visitante',
      key: 'visiting',
      render: (_: any, r: any) => r.matchData?.visitingTeam?.companyName ?? '—',
    },
    {
      title: 'Venue',
      key: 'venue',
      render: (_: any, r: any) => r.matchData?.venue?.name ?? '—',
    },
    {
      title: 'Hora',
      key: 'time',
      render: (_: any, r: any) => r.startDate ? dayjs(r.startDate).format('DD/MM HH:mm') : '—',
    },
    {
      title: 'I-Flag',
      key: 'iflag',
      render: (_: any, r: any) => {
        const g = r.footballGame
        if (!g) return <Badge color="default" text="Sin partido" />
        const label = GAME_STATUS_LABELS[g.status] ?? g.status
        const color = GAME_STATUS_COLORS[g.status] ?? 'default'
        const score = g.status !== 'PENDING' ? ` (${g.localScore}–${g.visitingScore})` : ''
        return <Badge status={color as any} text={`${label}${score}`} />
      },
    },
  ]

  return (
    <Card loading={isLoading}>
      <div style={{ marginBottom: 12, fontSize: 13, color: T.textDim }}>
        Estado de los partidos del calendario en la app I-Flag.
      </div>
      <Table
        columns={columns}
        dataSource={activities}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: <Empty description="Sin partidos programados" /> }}
      />
    </Card>
  )
}

export default function TournamentTab({ eventId }: Props) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  // ── State ────────────────────────────────────────────────────────────────
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [configForm] = Form.useForm()

  const [venueModalOpen, setVenueModalOpen] = useState(false)
  const [editingVenue, setEditingVenue] = useState<any>(null)
  const [venueForm] = Form.useForm()

  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [teamForm] = Form.useForm()

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleForm] = Form.useForm()
  const [codesModalOpen, setCodesModalOpen] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['tournament-config', eventId],
    queryFn: () => tournamentApi.getConfig(eventId),
    enabled: !!eventId,
  })
  const config = configData?.data ?? null

  const { data: venuesData, isLoading: venuesLoading } = useQuery({
    queryKey: ['tournament-venues', eventId],
    queryFn: () => tournamentApi.listVenues(eventId),
    enabled: !!eventId,
  })
  const venues = venuesData?.data ?? []

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['tournament-teams', eventId],
    queryFn: () => tournamentApi.listTeams(eventId),
    enabled: !!eventId,
  })
  const teams = teamsData?.data ?? []

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'teams'],
    queryFn: () => clientsApi.list({ isTeam: true }),
  })
  const teamClients = clientsData?.data ?? []

  // ── Mutations ────────────────────────────────────────────────────────────
  const upsertConfigMutation = useMutation({
    mutationFn: (data: any) => tournamentApi.upsertConfig(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-config', eventId] })
      message.success('Configuración actualizada')
      setConfigModalOpen(false)
      configForm.resetFields()
    },
    onError: () => message.error('Error al actualizar configuración'),
  })

  const createVenueMutation = useMutation({
    mutationFn: (data: any) => tournamentApi.createVenue(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-venues', eventId] })
      message.success('Venue creado')
      setVenueModalOpen(false)
      venueForm.resetFields()
    },
    onError: () => message.error('Error al crear venue'),
  })

  const updateVenueMutation = useMutation({
    mutationFn: (data: any) => tournamentApi.updateVenue(eventId, editingVenue!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-venues', eventId] })
      message.success('Venue actualizado')
      setVenueModalOpen(false)
      venueForm.resetFields()
      setEditingVenue(null)
    },
    onError: () => message.error('Error al actualizar venue'),
  })

  const deleteVenueMutation = useMutation({
    mutationFn: (venueId: string) => tournamentApi.deleteVenue(eventId, venueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-venues', eventId] })
      message.success('Venue eliminado')
    },
    onError: () => message.error('Error al eliminar venue'),
  })

  const registerTeamMutation = useMutation({
    mutationFn: (data: any) => tournamentApi.registerTeam(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-teams', eventId] })
      message.success('Equipo registrado')
      setTeamModalOpen(false)
      teamForm.resetFields()
    },
    onError: (err: any) => message.error(err.response?.data?.error?.message || 'Error al registrar equipo'),
  })

  const unregisterTeamMutation = useMutation({
    mutationFn: (registrationId: string) => tournamentApi.unregisterTeam(eventId, registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-teams', eventId] })
      message.success('Equipo desinscrito')
    },
    onError: () => message.error('Error al desinscrever equipo'),
  })

  const generateScheduleMutation = useMutation({
    mutationFn: (data: any) => tournamentApi.generateSchedule(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-teams', eventId] })
      message.success('Calendario generado')
      setScheduleModalOpen(false)
      scheduleForm.resetFields()
    },
    onError: (err: any) => message.error(err.response?.data?.error?.message || 'Error al generar calendario'),
  })

  const togglePortalMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      tournamentApi.upsertConfig(eventId, {
        settings: { ...((config?.settings as any) ?? {}), portalEnabled: enabled },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-config', eventId] })
      message.success('Portal actualizado')
    },
    onError: () => message.error('Error al actualizar portal'),
  })

  const generateCodesMutation = useMutation({
    mutationFn: () => tournamentApi.generatePlayerCodes(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-codes', eventId] })
      message.success('Códigos generados')
      setCodesModalOpen(true)
    },
    onError: (err: any) => message.error(err.response?.data?.error?.message || 'Error al generar códigos'),
  })

  const { data: codesData } = useQuery({
    queryKey: ['player-codes', eventId],
    queryFn: () => tournamentApi.listPlayerCodes(eventId),
    enabled: !!eventId,
  })
  const playerCodes = codesData?.data ?? []

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenConfigModal = () => {
    if (config) {
      configForm.setFieldsValue({
        numRounds: config.numRounds,
        hasPlayoffs: config.hasPlayoffs,
        qualificationSystem: config.qualificationSystem,
        regFeePerPerson: config.regFeePerPerson,
        regFeePerTeam: config.regFeePerTeam,
      })
    }
    setConfigModalOpen(true)
  }

  const handleOpenVenueModal = (venue?: any) => {
    if (venue) {
      setEditingVenue(venue)
      venueForm.setFieldsValue(venue)
    } else {
      setEditingVenue(null)
      venueForm.resetFields()
    }
    setVenueModalOpen(true)
  }

  const handleVenueSubmit = (values: any) => {
    if (editingVenue) {
      updateVenueMutation.mutate(values)
    } else {
      createVenueMutation.mutate(values)
    }
  }

  // ── Columns ──────────────────────────────────────────────────────────────
  const venueColumns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Dirección', dataIndex: 'address', key: 'address' },
    {
      title: 'Capacidad',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (v: number | null) => v ? `${v} personas` : '—',
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            size="small" type="text" icon={<EditOutlined />}
            onClick={() => handleOpenVenueModal(record)}
          />
          <Popconfirm title="¿Eliminar?" onConfirm={() => deleteVenueMutation.mutate(record.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const teamColumns = [
    {
      title: 'Equipo',
      dataIndex: ['teamClient', 'companyName'],
      key: 'team',
      render: (v: string, record: any) => v || `${record.teamClient?.firstName} ${record.teamClient?.lastName}`,
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      render: (v: string) => {
        const colors: Record<string, string> = { FEMENIL: 'pink', VARONIL: 'blue', MIXTO: 'purple' }
        const labels: Record<string, string> = { FEMENIL: 'Femenil', VARONIL: 'Varonil', MIXTO: 'Mixto' }
        return <Badge color={colors[v]} text={labels[v]} />
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Popconfirm title="¿Desinscrever?" onConfirm={() => unregisterTeamMutation.mutate(record.id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs
        items={[
          {
            key: 'config',
            label: <span><SettingOutlined /> Configuración</span>,
            children: (
              <Card loading={configLoading}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 8 }}>
                          Configuración del Torneo
                        </div>
                        {config && (
                          <div style={{ fontSize: 13, color: T.textDim }}>
                            <div>• Rondas: {config.numRounds}</div>
                            <div>• Playoffs: {config.hasPlayoffs ? 'Sí' : 'No'}</div>
                            <div>• Sistema: {config.qualificationSystem || '—'}</div>
                            {config.regFeePerTeam && <div>• Cuota por equipo: ${config.regFeePerTeam}</div>}
                            {config.regFeePerPerson && <div>• Cuota por jugador: ${config.regFeePerPerson}</div>}
                          </div>
                        )}
                      </div>
                      <Space wrap>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 13, color: T.textDim }}>Portal jugador:</Text>
                          <Switch
                            checked={(config?.settings as any)?.portalEnabled ?? false}
                            loading={togglePortalMutation.isPending}
                            onChange={(checked) => togglePortalMutation.mutate(checked)}
                            checkedChildren="Habilitado"
                            unCheckedChildren="Deshabilitado"
                          />
                        </div>
                        <Button type="primary" onClick={handleOpenConfigModal}>
                          {config ? 'Editar' : 'Crear'} Configuración
                        </Button>
                      </Space>
                    </div>
                  </Col>
                </Row>
              </Card>
            ),
          },
          {
            key: 'venues',
            label: <span><EnvironmentOutlined /> Venues ({venues.length})</span>,
            children: (
              <Card loading={venuesLoading}>
                <div style={{ marginBottom: 16 }}>
                  <Button icon={<PlusOutlined />} onClick={() => handleOpenVenueModal()}>
                    Agregar Venue
                  </Button>
                </div>
                <Table
                  columns={venueColumns}
                  dataSource={venues}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: <Empty description="Sin venues registrados" /> }}
                />
              </Card>
            ),
          },
          {
            key: 'teams',
            label: <span><TeamOutlined /> Equipos ({teams.length})</span>,
            children: (
              <Card loading={teamsLoading}>
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button icon={<PlusOutlined />} type="primary" onClick={() => setTeamModalOpen(true)}>
                    Registrar Equipo
                  </Button>
                  <Button
                    icon={<KeyOutlined />}
                    loading={generateCodesMutation.isPending}
                    onClick={() => generateCodesMutation.mutate()}
                  >
                    Generar Códigos
                  </Button>
                  {playerCodes.length > 0 && (
                    <Button onClick={() => setCodesModalOpen(true)}>
                      Ver Códigos ({playerCodes.length})
                    </Button>
                  )}
                </div>
                <Table
                  columns={teamColumns}
                  dataSource={teams}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: <Empty description="Sin equipos registrados" /> }}
                />
              </Card>
            ),
          },
          {
            key: 'schedule',
            label: <span><CalendarOutlined /> Generar Calendario</span>,
            children: (
              <Card>
                <div style={{ maxWidth: 500 }}>
                  <div style={{ marginBottom: 16, fontSize: 13, color: T.textDim }}>
                    Genera automáticamente un calendario con partidos en formato round-robin.
                  </div>
                  <Button icon={<CalendarOutlined />} type="primary" onClick={() => setScheduleModalOpen(true)}>
                    Generar Calendario
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            key: 'reports',
            label: <span><BarChartOutlined /> Reportes</span>,
            children: <TournamentReportsTab eventId={eventId} />,
          },
          {
            key: 'iflag',
            label: <span><MobileOutlined /> I-Flag</span>,
            children: <IFlagStatusSection eventId={eventId} />,
          },
        ]}
      />

      {/* Config Modal */}
      <Modal
        title="Configuración del Torneo"
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfigModalOpen(false)}>Cancelar</Button>,
          <Button key="submit" type="primary" loading={upsertConfigMutation.isPending}
            onClick={() => configForm.submit()}>
            Guardar
          </Button>,
        ]}
      >
        <Form layout="vertical" form={configForm} onFinish={(values) => upsertConfigMutation.mutate(values)}>
          <Form.Item label="Número de Rondas" name="numRounds" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} />
          </Form.Item>
          <Form.Item label="¿Incluir Playoffs?" name="hasPlayoffs" valuePropName="checked">
            <Input type="checkbox" />
          </Form.Item>
          <Form.Item label="Sistema de Calificación" name="qualificationSystem">
            <Select
              allowClear
              placeholder="Seleccionar..."
              options={[
                { value: 'Liga', label: 'Liga' },
                { value: 'Copa', label: 'Copa' },
                { value: 'Grupos', label: 'Grupos' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Cuota por Equipo ($)" name="regFeePerTeam">
            <InputNumber min={0} step={10} precision={2} />
          </Form.Item>
          <Form.Item label="Cuota por Jugador ($)" name="regFeePerPerson">
            <InputNumber min={0} step={10} precision={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Venue Modal */}
      <Modal
        title={editingVenue ? 'Editar Venue' : 'Nuevo Venue'}
        open={venueModalOpen}
        onCancel={() => setVenueModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setVenueModalOpen(false)}>Cancelar</Button>,
          <Button key="submit" type="primary" loading={createVenueMutation.isPending || updateVenueMutation.isPending}
            onClick={() => venueForm.submit()}>
            {editingVenue ? 'Actualizar' : 'Crear'}
          </Button>,
        ]}
      >
        <Form
          layout="vertical"
          form={venueForm}
          onFinish={handleVenueSubmit}
        >
          <Form.Item label="Nombre" name="name" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Cancha 1" />
          </Form.Item>
          <Form.Item label="Dirección" name="address">
            <Input placeholder="Dirección del venue" />
          </Form.Item>
          <Form.Item label="Capacidad" name="capacity">
            <InputNumber min={0} placeholder="Número de personas" />
          </Form.Item>
          <Form.Item label="Notas" name="notes">
            <Input.TextArea rows={3} placeholder="Notas adicionales..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Team Registration Modal */}
      <Modal
        title="Registrar Equipo"
        open={teamModalOpen}
        onCancel={() => setTeamModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setTeamModalOpen(false)}>Cancelar</Button>,
          <Button key="submit" type="primary" loading={registerTeamMutation.isPending}
            onClick={() => teamForm.submit()}>
            Registrar
          </Button>,
        ]}
      >
        <Form
          layout="vertical"
          form={teamForm}
          onFinish={(values) => registerTeamMutation.mutate(values)}
        >
          <Form.Item label="Equipo" name="teamClientId" rules={[{ required: true, message: 'Selecciona un equipo' }]}>
            <Select
              allowClear showSearch optionFilterProp="label"
              placeholder="Seleccionar equipo..."
              options={teamClients.map((c: any) => ({
                value: c.id,
                label: c.companyName || `${c.firstName} ${c.lastName}`,
              }))}
            />
          </Form.Item>
          <Form.Item label="Categoría" name="category" rules={[{ required: true, message: 'Selecciona categoría' }]}>
            <Select
              placeholder="Seleccionar..."
              options={[
                { value: 'FEMENIL', label: 'Femenil' },
                { value: 'VARONIL', label: 'Varonil' },
                { value: 'MIXTO', label: 'Mixto' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Player Codes Modal */}
      <Modal
        title="Códigos de Jugador"
        open={codesModalOpen}
        onCancel={() => setCodesModalOpen(false)}
        footer={null}
        width={680}
      >
        <div style={{ marginBottom: 12, fontSize: 13, color: T.textDim }}>
          Comparte cada código con los jugadores del equipo correspondiente para que puedan registrarse en el portal.
        </div>
        <Table
          columns={[
            {
              title: 'Equipo',
              key: 'team',
              render: (_: any, r: any) => r.client?.companyName ?? '—',
            },
            {
              title: 'Categoría',
              key: 'category',
              width: 100,
              render: (_: any, r: any) => <Badge color={CATEGORY_COLORS[r.category] ?? 'default'} text={CATEGORY_LABELS[r.category] ?? r.category} />,
            },
            {
              title: 'Código',
              key: 'code',
              render: (_: any, r: any) => (
                <Typography.Text code copyable style={{ fontSize: 14, letterSpacing: '0.1em' }}>
                  {r.code}
                </Typography.Text>
              ),
            },
            {
              title: 'Usos',
              key: 'uses',
              width: 80,
              render: (_: any, r: any) => `${r.usedCount} / ${r.maxUses}`,
            },
          ]}
          dataSource={playerCodes}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="Sin códigos generados" /> }}
        />
      </Modal>

      {/* Schedule Generation Modal */}
      <Modal
        title="Generar Calendario"
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setScheduleModalOpen(false)}>Cancelar</Button>,
          <Button key="submit" type="primary" loading={generateScheduleMutation.isPending}
            onClick={() => scheduleForm.submit()}>
            Generar
          </Button>,
        ]}
      >
        <Form
          layout="vertical"
          form={scheduleForm}
          onFinish={(values) => {
            generateScheduleMutation.mutate({
              ...values,
              startDate: values.startDate.toISOString(),
            })
          }}
        >
          <Form.Item label="Fecha de Inicio" name="startDate" rules={[{ required: true }]}>
            <DatePicker showTime />
          </Form.Item>
          <Form.Item label="Duración de Partido (minutos)" name="matchDurationMinutes" initialValue={60}>
            <InputNumber min={15} step={15} />
          </Form.Item>
          <Form.Item label="Descanso entre Partidos (minutos)" name="breakBetweenMatchesMinutes" initialValue={15}>
            <InputNumber min={0} step={5} />
          </Form.Item>
          <Form.Item label="Máx. Partidos por Día" name="matchesPerDay" initialValue={8}>
            <InputNumber min={1} max={20} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
