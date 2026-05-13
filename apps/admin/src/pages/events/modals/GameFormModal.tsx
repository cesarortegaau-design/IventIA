import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Modal, Form, Input, Select, InputNumber, Row, Col, Card, Tag, Empty, Space, Button, Typography, Divider,
} from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { tournamentApi } from '../../../api/tournament'
import { clientsApi } from '../../../api/clients'
import { T } from '../../../styles/tokens'

const { Text, Title } = Typography

interface GameFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: any) => void
  initialValues?: any
  loading?: boolean
  eventId: string
}

export default function GameFormModal({
  open, onClose, onSave, initialValues, loading, eventId,
}: GameFormModalProps) {
  const [form] = Form.useForm()

  // Fetch teams and venues
  const { data: teamsData } = useQuery({
    queryKey: ['tournament-teams', eventId],
    queryFn: () => tournamentApi.listTeams(eventId),
    enabled: open,
  })
  const teams = teamsData?.data ?? []

  const { data: venuesData } = useQuery({
    queryKey: ['tournament-venues', eventId],
    queryFn: () => tournamentApi.listVenues(eventId),
    enabled: open,
  })
  const venues = venuesData?.data ?? []

  // Team clients lookup for team names
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })
  const allClients = clientsData?.data ?? []

  const getTeamName = (teamId: string) => {
    const client = allClients.find((c: any) => c.id === teamId)
    return client?.companyName || client?.firstName + ' ' + client?.lastName || teamId
  }

  // Load matchData if editing
  const matchData = initialValues?.matchData
  const homeTeam = matchData?.homeTeam
  const visitingTeam = matchData?.visitingTeam
  const category = matchData?.category

  useEffect(() => {
    if (!open) return
    if (initialValues) {
      form.setFieldsValue({
        title: initialValues.title,
        description: initialValues.description,
        startDate: initialValues.startDate ? dayjs(initialValues.startDate) : undefined,
        endDate: initialValues.endDate ? dayjs(initialValues.endDate) : undefined,
        homeTeamId: matchData?.homeTeamId,
        visitingTeamId: matchData?.visitingTeamId,
        venueId: matchData?.venueId,
        homeScore: matchData?.homeScore,
        visitingScore: matchData?.visitingScore,
        category: matchData?.category,
      })
    } else {
      form.resetFields()
    }
  }, [open, initialValues?.id])

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    }
    onSave(payload)
  }

  const homeTeamObj = teams.find((t: any) => t.teamClientId === form.getFieldValue('homeTeamId'))
  const visitingTeamObj = teams.find((t: any) => t.teamClientId === form.getFieldValue('visitingTeamId'))

  return (
    <Modal
      title={initialValues ? 'Editar Juego' : 'Nuevo Juego'}
      open={open}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="submit" type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => form.submit()}>
          {initialValues ? 'Actualizar' : 'Crear'}
        </Button>,
      ]}
    >
      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Título del Juego" name="title" rules={[{ required: true, message: 'Requerido' }]}>
              <Input placeholder="Ej: Semifinal - Equipo A vs Equipo B" />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Información del Partido</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Equipo Local" name="homeTeamId" rules={[{ required: true, message: 'Requerido' }]}>
              <Select
                placeholder="Seleccionar equipo local..."
                options={teams.map((t: any) => ({
                  value: t.teamClientId,
                  label: `${getTeamName(t.teamClientId)} (${t.category})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Equipo Visitante" name="visitingTeamId" rules={[{ required: true, message: 'Requerido' }]}>
              <Select
                placeholder="Seleccionar equipo visitante..."
                options={teams.map((t: any) => ({
                  value: t.teamClientId,
                  label: `${getTeamName(t.teamClientId)} (${t.category})`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Categoría" name="category">
              <Select
                placeholder="Seleccionar..."
                options={[
                  { value: 'FEMENIL', label: 'Femenil' },
                  { value: 'VARONIL', label: 'Varonil' },
                  { value: 'MIXTO', label: 'Mixto' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Venue" name="venueId">
              <Select
                allowClear
                placeholder="Seleccionar venue..."
                options={venues.map((v: any) => ({
                  value: v.id,
                  label: v.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Horarios</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Inicio" name="startDate" rules={[{ required: true, message: 'Requerido' }]}>
              <Input type="datetime-local" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Fin" name="endDate" rules={[{ required: true, message: 'Requerido' }]}>
              <Input type="datetime-local" />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Resultado</Divider>

        <Card style={{ marginBottom: 16, background: `${T.blue}08` }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              {homeTeamObj && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>Equipo Local</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{getTeamName(homeTeamObj.teamClientId)}</div>
                  <Tag color="blue" style={{ marginTop: 4 }}>{homeTeamObj.category}</Tag>
                </div>
              )}
            </Col>
            <Col span={8}>
              <Row gutter={8} align="middle" justify="center">
                <Col span={10}>
                  <Form.Item name="homeScore" label="Goles" noStyle>
                    <InputNumber min={0} max={99} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={4} style={{ textAlign: 'center', fontSize: 18, fontWeight: 600 }}>vs</Col>
                <Col span={10}>
                  <Form.Item name="visitingScore" label="Goles" noStyle>
                    <InputNumber min={0} max={99} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
            <Col span={8}>
              {visitingTeamObj && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>Equipo Visitante</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{getTeamName(visitingTeamObj.teamClientId)}</div>
                  <Tag color="volcano" style={{ marginTop: 4 }}>{visitingTeamObj.category}</Tag>
                </div>
              )}
            </Col>
          </Row>
        </Card>

        <Form.Item label="Notas" name="description">
          <Input.TextArea rows={3} placeholder="Notas adicionales sobre el partido..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
