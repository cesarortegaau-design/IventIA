import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Card, Row, Col, Statistic, Input, Button, Spin, Typography, Space, Alert,
  theme, Grid,
} from 'antd'
import {
  SendOutlined, RobotOutlined, UserOutlined, LoadingOutlined,
  DollarOutlined, ShoppingCartOutlined, BarChartOutlined, CalendarOutlined,
} from '@ant-design/icons'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { aiApi } from '../../api/ai'

const { Text, Title } = Typography
const { TextArea } = Input
const { useBreakpoint } = Grid

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChartSeries {
  key: string
  label: string
  color: string
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  data: Record<string, unknown>[]
  xKey?: string
  series?: ChartSeries[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  chart?: ChartConfig | null
}

// ─── Chart Renderer ───────────────────────────────────────────────────────────

function ChartRenderer({ config }: { config: ChartConfig }) {
  const { type, data, xKey, series, title } = config

  const commonProps = {
    data,
    margin: { top: 8, right: 16, left: 0, bottom: 8 },
  }

  if (type === 'pie') {
    const pieData = data as Array<{ name: string; value: number; color: string }>
    return (
      <div style={{ marginTop: 8 }}>
        {title && <Text strong style={{ display: 'block', marginBottom: 4 }}>{title}</Text>}
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color ?? '#6B46C1'} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (!xKey || !series || series.length === 0) return null

  const renderBars = () =>
    series.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />)

  const renderLines = () =>
    series.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />)

  const renderAreas = () =>
    series.map(s => <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} fill={s.color + '33'} strokeWidth={2} />)

  const shared = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
      <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, '']} />
      <Legend />
    </>
  )

  return (
    <div style={{ marginTop: 8 }}>
      {title && <Text strong style={{ display: 'block', marginBottom: 4 }}>{title}</Text>}
      <ResponsiveContainer width="100%" height={260}>
        {type === 'line' ? (
          <LineChart {...commonProps}>{shared}{renderLines()}</LineChart>
        ) : type === 'area' ? (
          <AreaChart {...commonProps}>{shared}{renderAreas()}</AreaChart>
        ) : (
          <BarChart {...commonProps}>{shared}{renderBars()}</BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

// ─── Message Parser ────────────────────────────────────────────────────────────

function parseMessage(text: string): { text: string; chart: ChartConfig | null } {
  const chartMatch = text.match(/<chart>([\s\S]*?)<\/chart>/)
  if (chartMatch) {
    try {
      const chart = JSON.parse(chartMatch[1]) as ChartConfig
      return { text: text.replace(/<chart>[\s\S]*?<\/chart>/, '').trim(), chart }
    } catch {
      return { text, chart: null }
    }
  }
  return { text, chart: null }
}

// ─── Currency formatter ────────────────────────────────────────────────────────

function fmtMXN(val: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val)
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AnalysisDashboard() {
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const { token } = theme.useToken()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hola, soy tu asistente de análisis de IventIA. Puedo responder preguntas sobre ingresos, costos, márgenes, eventos y más. También puedo generar gráficas si me lo pides. ¿En qué te ayudo?',
      chart: null,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Dashboard data
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['ai', 'dashboard'],
    queryFn: aiApi.getDashboard,
  })

  const dashboard = dashData?.data

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
      aiApi.chat(
        message,
        history.map(m => ({ role: m.role, content: m.content })),
      ),
    onSuccess: (data) => {
      const raw = data?.data?.text ?? 'Sin respuesta del asistente.'
      const parsed = parseMessage(raw)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: parsed.text, chart: parsed.chart },
      ])
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error al conectar con el asistente. Por favor intenta de nuevo.', chart: null },
      ])
    },
  })

  const sendMessage = () => {
    const msg = inputValue.trim()
    if (!msg || chatMutation.isPending) return

    const newHistory = [...messages, { role: 'user' as const, content: msg, chart: null }]
    setMessages(newHistory)
    setInputValue('')
    chatMutation.mutate({ message: msg, history: messages })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── KPI Cards ───────────────────────────────────────────────────────────────

  const kpis = dashboard?.kpis
  const kpiCards = [
    {
      title: 'Total Ingresos OS',
      value: kpis?.totalRevenue ?? 0,
      prefix: '$',
      color: '#22c55e',
      icon: <DollarOutlined />,
      formatter: (v: number) => fmtMXN(v),
    },
    {
      title: 'Total Costos OC',
      value: kpis?.totalCosts ?? 0,
      prefix: '$',
      color: '#ef4444',
      icon: <ShoppingCartOutlined />,
      formatter: (v: number) => fmtMXN(v),
    },
    {
      title: 'Margen Bruto',
      value: kpis?.grossMargin ?? 0,
      suffix: ` (${(kpis?.marginPct ?? 0).toFixed(1)}%)`,
      color: (kpis?.grossMargin ?? 0) >= 0 ? '#6B46C1' : '#ef4444',
      icon: <BarChartOutlined />,
      formatter: (v: number) => fmtMXN(v),
    },
    {
      title: 'Eventos Activos',
      value: kpis?.activeEvents ?? 0,
      color: '#3b82f6',
      icon: <CalendarOutlined />,
    },
  ]

  // ─── Layout ───────────────────────────────────────────────────────────────────

  const dashboardSection = (
    <div>
      {/* KPI Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {kpiCards.map((k, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card size="small" loading={dashLoading} style={{ borderTop: `3px solid ${k.color}` }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{k.title}</span>}
                value={k.value}
                valueStyle={{ color: k.color, fontSize: 18 }}
                formatter={k.formatter as any}
                suffix={k.suffix}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Revenue vs Costs Bar Chart */}
      <Card
        title={<span style={{ fontSize: 14 }}>Ingresos vs Costos por Evento (Top 8)</span>}
        size="small"
        style={{ marginBottom: 12 }}
        loading={dashLoading}
      >
        {dashboard?.revenueByEvent?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dashboard.revenueByEvent} margin={{ top: 4, right: 16, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, '']} />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#6B46C1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costos" name="Costos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          !dashLoading && <Text type="secondary">Sin datos disponibles</Text>
        )}
      </Card>

      {/* Orders by Status Pie Chart */}
      <Card
        title={<span style={{ fontSize: 14 }}>Distribución de OS por Estado</span>}
        size="small"
        loading={dashLoading}
      >
        {dashboard?.ordersByStatus?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={dashboard.ordersByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ status, count }: any) => `${status}: ${count}`}
              >
                {dashboard.ordersByStatus.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          !dashLoading && <Text type="secondary">Sin datos disponibles</Text>
        )}
      </Card>
    </div>
  )

  const chatSection = (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#6B46C1' }} />
          <span>Asistente IA</span>
        </Space>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, padding: 12 } }}
    >
      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          height: isMobile ? 380 : 560,
          paddingRight: 4,
          marginBottom: 12,
        }}
      >
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#6B46C1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                    marginTop: 2,
                  }}
                >
                  <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
              )}
              <div style={{ maxWidth: '85%' }}>
                <div
                  style={{
                    background: isUser ? '#6B46C1' : token.colorBgContainer,
                    color: isUser ? '#fff' : token.colorText,
                    border: isUser ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '8px 12px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
                {msg.chart && (
                  <div
                    style={{
                      background: token.colorBgContainer,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 6,
                    }}
                  >
                    <ChartRenderer config={msg.chart} />
                  </div>
                )}
              </div>
              {isUser && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                    marginTop: 2,
                  }}
                >
                  <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
              )}
            </div>
          )
        })}

        {chatMutation.isPending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#6B46C1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <div
              style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: '12px 12px 12px 2px',
                padding: '8px 12px',
              }}
            >
              <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} size="small" />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>Analizando...</Text>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <TextArea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre ingresos, costos, márgenes... (Enter para enviar)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1, resize: 'none' }}
          disabled={chatMutation.isPending}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={sendMessage}
          loading={chatMutation.isPending}
          style={{ background: '#6B46C1', borderColor: '#6B46C1', alignSelf: 'flex-end' }}
          disabled={!inputValue.trim()}
        />
      </div>

      <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
        Puedes pedir gráficas: "muéstrame una gráfica de ingresos por evento"
      </Text>
    </Card>
  )

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16, color: '#1a0533' }}>
        <RobotOutlined style={{ marginRight: 8, color: '#6B46C1' }} />
        Análisis IA
      </Title>

      {isMobile ? (
        <div>
          {dashboardSection}
          <div style={{ marginTop: 16 }}>{chatSection}</div>
        </div>
      ) : (
        <Row gutter={16} style={{ alignItems: 'flex-start' }}>
          <Col span={14}>{dashboardSection}</Col>
          <Col span={10} style={{ position: 'sticky', top: 80 }}>
            {chatSection}
          </Col>
        </Row>
      )}
    </div>
  )
}
