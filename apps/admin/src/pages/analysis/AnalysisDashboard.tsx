import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Card, Row, Col, Statistic, Input, Button, Spin, Typography, Space,
  theme, Grid, Tooltip,
} from 'antd'
import {
  SendOutlined, RobotOutlined, UserOutlined, LoadingOutlined,
  DollarOutlined, ShoppingCartOutlined, BarChartOutlined, CalendarOutlined,
  FileWordOutlined, FileExcelOutlined,
} from '@ant-design/icons'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { aiApi } from '../../api/ai'

const { Text, Title } = Typography
const { TextArea } = Input
const { useBreakpoint } = Grid

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChartSeries { key: string; label: string; color: string }
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

// ─── Markdown table parsing ───────────────────────────────────────────────────

function stripMd(s: string) {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').trim()
}

interface ParsedTable { headers: string[]; rows: string[][] }

function parseMarkdownTables(content: string): Array<{ type: 'text'; text: string } | { type: 'table'; table: ParsedTable }> {
  const lines = content.split('\n')
  const segments: Array<{ type: 'text'; text: string } | { type: 'table'; table: ParsedTable }> = []
  const textBuf: string[] = []
  let i = 0

  const flushText = () => {
    const t = textBuf.join('\n').trim()
    if (t) segments.push({ type: 'text', text: t })
    textBuf.length = 0
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    const isRow = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2
    const isSep = /^\|[\s\-|:]+\|$/.test(trimmed)

    if (isRow && !isSep) {
      const nextTrimmed = (lines[i + 1] ?? '').trim()
      const nextIsSep = /^\|[\s\-|:]+\|$/.test(nextTrimmed)
      if (nextIsSep) {
        // start of a markdown table
        flushText()
        const parseRow = (l: string) =>
          l.trim().slice(1, -1).split('|').map(c => stripMd(c))
        const headers = parseRow(line)
        i += 2 // skip header + separator
        const rows: string[][] = []
        while (i < lines.length) {
          const tl = lines[i].trim()
          if (tl.startsWith('|') && tl.endsWith('|') && tl.length > 2 && !/^\|[\s\-|:]+\|$/.test(tl)) {
            rows.push(parseRow(lines[i]))
            i++
          } else break
        }
        segments.push({ type: 'table', table: { headers, rows } })
        continue
      }
    }
    textBuf.push(line)
    i++
  }
  flushText()
  return segments
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function downloadXlsx(wb: any, XLSX: any, filename: string) {
  // Use Blob + anchor — more reliable than XLSX.writeFile in browsers
  const buf: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function tableToExcel(table: ParsedTable, titleHint = 'datos') {
  import('xlsx').then(XLSX => {
    const wsData = [table.headers, ...table.rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = table.headers.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, titleHint.slice(0, 31))
    downloadXlsx(wb, XLSX, `${titleHint.replace(/[^\w-]/g, '_').slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  })
}

function chartToExcel(chart: ChartConfig) {
  import('xlsx').then(XLSX => {
    const data = chart.data
    if (!data.length) return
    const labelMap: Record<string, string> = {}
    chart.series?.forEach(s => { labelMap[s.key] = s.label })
    const keys = Object.keys(data[0])
    const headers = keys.map(k => labelMap[k] ?? k)

    const wsData: unknown[][] = [headers]
    data.forEach(row => {
      wsData.push(keys.map(k => {
        const v = row[k]
        const n = Number(v)
        return (v !== null && v !== '' && !isNaN(n)) ? n : String(v ?? '')
      }))
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = headers.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, (chart.title ?? 'Datos').slice(0, 31))
    downloadXlsx(wb, XLSX, `${(chart.title ?? 'grafica').replace(/[^\w-]/g, '_').slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  })
}

async function exportToWord(messages: ChatMessage[]) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = await import('docx')
  const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' }

  const children: any[] = [
    new Paragraph({
      children: [new TextRun({ text: 'Análisis IA — IventIA', bold: true, size: 36, color: '1a0533' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generado el ${date}`, size: 20, color: '64748b' })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 480 },
    }),
  ]

  let qNum = 0
  for (const msg of messages) {
    if (msg.role === 'user') {
      qNum++
      children.push(new Paragraph({
        children: [new TextRun({ text: `${qNum}. ${msg.content}`, bold: true, size: 24, color: '1e40af' })],
        spacing: { before: 360, after: 120 },
      }))
    } else if (msg.role === 'assistant' && msg.content) {
      // Strip any residual <chart> tags that weren't removed by parseMessage
      const cleanContent = msg.content.replace(/<chart>[\s\S]*?<\/chart>/g, '').trim()
      const segs = parseMarkdownTables(cleanContent)
      for (const seg of segs) {
        if (seg.type === 'text') {
          seg.text.split('\n').forEach(line => {
            const trimmed = line.trimStart()
            const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ')
            children.push(new Paragraph({
              children: [new TextRun({ text: isBullet ? trimmed.slice(2) : line, size: 22 })],
              bullet: isBullet ? { level: 0 } : undefined,
              spacing: { before: isBullet ? 0 : 60, after: 0 },
            }))
          })
        } else {
          const { headers, rows } = seg.table
          children.push(new Paragraph({
            children: [new TextRun({ text: '', size: 22 })],
            spacing: { before: 120, after: 80 },
          }))
          const headerRow = new TableRow({
            children: headers.map(h => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })] })],
              shading: { fill: '6B46C1' },
              borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder },
            })),
            tableHeader: true,
          })
          const dataRows = rows.map((row, ri) => new TableRow({
            children: row.map(cell => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })] })],
              shading: { fill: ri % 2 === 0 ? 'F3F0FF' : 'FFFFFF' },
              borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder },
            })),
          }))
          children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
            borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder, insideH: tableBorder, insideV: tableBorder },
          }))
          children.push(new Paragraph({ text: '', spacing: { after: 120 } }))
        }
      }
      if (msg.chart?.data?.length) {
        const { chart } = msg
        const keys = Object.keys(chart.data[0])
        children.push(new Paragraph({
          children: [new TextRun({ text: chart.title || 'Datos de gráfica', bold: true, size: 22, color: '6B46C1' })],
          spacing: { before: 240, after: 120 },
        }))
        const headerRow = new TableRow({
          children: keys.map(k => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: '6B46C1' },
            borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder },
          })),
          tableHeader: true,
        })
        const dataRows = chart.data.map((row, ri) => new TableRow({
          children: keys.map(k => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(row[k] ?? ''), size: 20 })] })],
            shading: { fill: ri % 2 === 0 ? 'F3F0FF' : 'FFFFFF' },
            borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder },
          })),
        }))
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
          borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder, insideH: tableBorder, insideV: tableBorder },
        }))
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }))
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analisis-ia-${new Date().toISOString().slice(0, 10)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Inline table component ───────────────────────────────────────────────────

function InlineTable({ table, idx }: { table: ParsedTable; idx: number }) {
  return (
    <div style={{ marginTop: 10, marginBottom: 4, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} style={{ background: '#6B46C1', color: '#fff', padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? '#F3F0FF' : '#fff' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '7px 14px', borderBottom: '1px solid #e9d5ff', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <Tooltip title="Exportar tabla a Excel">
          <Button size="small" icon={<FileExcelOutlined />}
            onClick={() => tableToExcel(table, `tabla-${idx + 1}`)}
            style={{ color: '#166534', borderColor: '#166534', fontSize: 12 }}>
            Excel
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}

// ─── Message content renderer ─────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const segments = parseMarkdownTables(content)
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{seg.text}</span>
        ) : (
          <InlineTable key={i} table={seg.table} idx={i} />
        )
      )}
    </>
  )
}

// ─── Chart Renderer ───────────────────────────────────────────────────────────

function ChartRenderer({ config }: { config: ChartConfig }) {
  const { type, data, xKey, series, title } = config
  const commonProps = { data, margin: { top: 8, right: 16, left: 0, bottom: 8 } }

  if (type === 'pie') {
    const pieData = data as Array<{ name: string; value: number; color: string }>
    return (
      <div style={{ marginTop: 8 }}>
        {title && <Text strong style={{ display: 'block', marginBottom: 4 }}>{title}</Text>}
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {pieData.map((_, i) => <Cell key={i} fill={pieData[i].color ?? '#6B46C1'} />)}
            </Pie>
            <ReTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (!xKey || !series?.length) return null
  const shared = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
      <ReTooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, '']} />
      <Legend />
    </>
  )
  return (
    <div style={{ marginTop: 8 }}>
      {title && <Text strong style={{ display: 'block', marginBottom: 4 }}>{title}</Text>}
      <ResponsiveContainer width="100%" height={260}>
        {type === 'line' ? (
          <LineChart {...commonProps}>{shared}{series.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />)}</LineChart>
        ) : type === 'area' ? (
          <AreaChart {...commonProps}>{shared}{series.map(s => <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} fill={s.color + '33'} strokeWidth={2} />)}</AreaChart>
        ) : (
          <BarChart {...commonProps}>{shared}{series.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />)}</BarChart>
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

function fmtMXN(val: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val)
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AnalysisDashboard() {
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const { token } = theme.useToken()

  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Hola, soy tu asistente de análisis de IventIA. Puedo responder preguntas sobre ingresos, costos, márgenes, eventos y más. También puedo generar gráficas y tablas si me lo pides. ¿En qué te ayudo?',
    chart: null,
  }])
  const [inputValue, setInputValue] = useState('')
  const [exportingWord, setExportingWord] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: dashData, isLoading: dashLoading } = useQuery({ queryKey: ['ai', 'dashboard'], queryFn: aiApi.getDashboard })
  const dashboard = dashData?.data

  const chatMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
      aiApi.chat(message, history.map(m => ({ role: m.role, content: m.content }))),
    onSuccess: (data) => {
      const raw = data?.data?.text ?? 'Sin respuesta del asistente.'
      const parsed = parseMessage(raw)
      setMessages(prev => [...prev, { role: 'assistant', content: parsed.text, chart: parsed.chart }])
    },
    onError: () => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el asistente. Por favor intenta de nuevo.', chart: null }])
    },
  })

  const sendMessage = () => {
    const msg = inputValue.trim()
    if (!msg || chatMutation.isPending) return
    setMessages(prev => [...prev, { role: 'user', content: msg, chart: null }])
    setInputValue('')
    chatMutation.mutate({ message: msg, history: messages })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleExportWord = async () => {
    setExportingWord(true)
    try { await exportToWord(messages) } finally { setExportingWord(false) }
  }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const hasAssistantMessages = messages.some(m => m.role === 'assistant' && m.content)

  // ─── KPI Cards ───────────────────────────────────────────────────────────────

  const kpis = dashboard?.kpis
  const kpiCards = [
    { title: 'Total Ingresos OS', value: kpis?.totalRevenue ?? 0, color: '#22c55e', formatter: (v: number) => fmtMXN(v), icon: <DollarOutlined /> },
    { title: 'Total Costos OC',   value: kpis?.totalCosts ?? 0,   color: '#ef4444', formatter: (v: number) => fmtMXN(v), icon: <ShoppingCartOutlined /> },
    { title: 'Margen Bruto', value: kpis?.grossMargin ?? 0, suffix: ` (${(kpis?.marginPct ?? 0).toFixed(1)}%)`, color: (kpis?.grossMargin ?? 0) >= 0 ? '#6B46C1' : '#ef4444', formatter: (v: number) => fmtMXN(v), icon: <BarChartOutlined /> },
    { title: 'Eventos Activos', value: kpis?.activeEvents ?? 0, color: '#3b82f6', icon: <CalendarOutlined /> },
  ]

  const dashboardSection = (
    <div>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {kpiCards.map((k, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card size="small" loading={dashLoading} style={{ borderTop: `3px solid ${k.color}` }}>
              <Statistic title={<span style={{ fontSize: 12 }}>{k.title}</span>} value={k.value}
                valueStyle={{ color: k.color, fontSize: 18 }} formatter={k.formatter as any} suffix={k.suffix} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={<span style={{ fontSize: 14 }}>Ingresos vs Costos por Evento (Top 8)</span>} size="small" style={{ marginBottom: 12 }} loading={dashLoading}>
        {dashboard?.revenueByEvent?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dashboard.revenueByEvent} margin={{ top: 4, right: 16, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : String(v)} />
              <ReTooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, '']} />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#6B46C1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costos" name="Costos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (!dashLoading && <Text type="secondary">Sin datos disponibles</Text>)}
      </Card>

      <Card title={<span style={{ fontSize: 14 }}>Distribución de OS por Estado</span>} size="small" loading={dashLoading}>
        {dashboard?.ordersByStatus?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dashboard.ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}
                label={({ status, count }: any) => `${status}: ${count}`}>
                {dashboard.ordersByStatus.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <ReTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (!dashLoading && <Text type="secondary">Sin datos disponibles</Text>)}
      </Card>
    </div>
  )

  const chatSection = (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space><RobotOutlined style={{ color: '#6B46C1' }} /><span>Asistente IA</span></Space>
          <Tooltip title="Exportar conversación a Word">
            <Button size="small" icon={<FileWordOutlined />} loading={exportingWord}
              disabled={!hasAssistantMessages} onClick={handleExportWord}
              style={{ color: '#1e40af', borderColor: '#1e40af' }}>Word</Button>
          </Tooltip>
        </div>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, padding: 12 } }}
    >
      <div style={{ flex: 1, overflowY: 'auto', height: isMobile ? 400 : 560, paddingRight: 4, marginBottom: 12 }}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              {!isUser && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6B46C1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                  <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
              )}
              <div style={{ maxWidth: '90%' }}>
                <div style={{
                  background: isUser ? '#6B46C1' : token.colorBgContainer,
                  color: isUser ? '#fff' : token.colorText,
                  border: isUser ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '8px 12px', fontSize: 13, lineHeight: 1.6,
                }}>
                  {isUser
                    ? <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    : <MessageContent content={msg.content} />
                  }
                </div>
                {msg.chart && (
                  <div style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 12, marginTop: 6 }}>
                    <ChartRenderer config={msg.chart} />
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="Exportar datos de gráfica a Excel">
                        <Button size="small" icon={<FileExcelOutlined />}
                          onClick={() => chartToExcel(msg.chart!)}
                          style={{ color: '#166534', borderColor: '#166534', fontSize: 12 }}>Excel</Button>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>
              {isUser && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                  <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
              )}
            </div>
          )
        })}

        {chatMutation.isPending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6B46C1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <div style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: '12px 12px 12px 2px', padding: '8px 12px' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} size="small" />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>Analizando...</Text>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <TextArea value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre ingresos, costos, márgenes... (Enter para enviar)"
          autoSize={{ minRows: 1, maxRows: 4 }} style={{ flex: 1, resize: 'none' }}
          disabled={chatMutation.isPending} />
        <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} loading={chatMutation.isPending}
          style={{ background: '#6B46C1', borderColor: '#6B46C1', alignSelf: 'flex-end' }}
          disabled={!inputValue.trim()} />
      </div>
      <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
        Puedes pedir gráficas o tablas: "muéstrame una tabla de ingresos por evento"
      </Text>
    </Card>
  )

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16, color: '#1a0533' }}>
        <RobotOutlined style={{ marginRight: 8, color: '#6B46C1' }} />Análisis IA
      </Title>
      {isMobile ? (
        <div>{dashboardSection}<div style={{ marginTop: 16 }}>{chatSection}</div></div>
      ) : (
        <Row gutter={16} style={{ alignItems: 'flex-start' }}>
          <Col span={14}>{dashboardSection}</Col>
          <Col span={10} style={{ position: 'sticky', top: 80 }}>{chatSection}</Col>
        </Row>
      )}
    </div>
  )
}
