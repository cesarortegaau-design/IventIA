import { useState } from 'react'
import {
  Card, Form, Input, InputNumber, Select, Button, Typography, Row, Col,
  Spin, Alert, Divider, Tag, App, Space,
} from 'antd'
import {
  RobotOutlined, BulbOutlined, DollarOutlined, SendOutlined, ClearOutlined,
  StarOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { aiApi } from '../../api/ai'

const { Title, Text, Paragraph } = Typography

const EVENT_TYPE_OPTIONS = [
  { value: 'WEDDING', label: 'Boda' },
  { value: 'CORPORATE', label: 'Corporativo' },
  { value: 'BIRTHDAY', label: 'Cumpleaños' },
  { value: 'GALA', label: 'Gala / Cena' },
  { value: 'CONFERENCE', label: 'Conferencia' },
  { value: 'CONCERT', label: 'Concierto' },
  { value: 'EXHIBITION', label: 'Exposición' },
  { value: 'OTHER', label: 'Otro' },
]

function ResultCard({ title, content, color }: { title: string; content: string; color: string }) {
  return (
    <Card
      style={{
        borderRadius: 16,
        border: `1px solid ${color}30`,
        background: `${color}08`,
        marginTop: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RobotOutlined style={{ color, fontSize: 16 }} />
        </div>
        <Text strong style={{ color, fontSize: 15 }}>{title}</Text>
      </div>
      <Paragraph
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.8,
          fontSize: 14,
          color: 'var(--pl-text)',
        }}
      >
        {content}
      </Paragraph>
    </Card>
  )
}

// ── Concept Generator ────────────────────────────────────────────────────────
function ConceptGenerator() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [form] = Form.useForm()

  const handleGenerate = async (vals: any) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await aiApi.generateEventConcept(vals)
      const content = res.data?.result || res.result || res.content || JSON.stringify(res, null, 2)
      setResult(content)
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Error al generar concepto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      style={{
        borderRadius: 20,
        border: '1px solid #DDD6FE',
        boxShadow: '0 4px 20px rgba(124,58,237,0.08)',
        height: '100%',
      }}
      title={
        <Space>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BulbOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Generador de Concepto</div>
            <div style={{ fontSize: 12, color: 'var(--pl-text-muted)', fontWeight: 400 }}>
              IA crea el concepto y mood de tu evento
            </div>
          </div>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleGenerate}>
        <Form.Item
          name="eventName"
          label="Nombre del evento"
          rules={[{ required: true, message: 'Ingresa el nombre' }]}
        >
          <Input placeholder="Ej: Boda romántica en jardín" />
        </Form.Item>

        <Form.Item
          name="eventType"
          label="Tipo de evento"
          rules={[{ required: true, message: 'Selecciona el tipo' }]}
        >
          <Select options={EVENT_TYPE_OPTIONS} placeholder="Selecciona tipo" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="guestCount" label="Número de invitados">
              <InputNumber style={{ width: '100%' }} min={1} placeholder="150" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="budget" label="Presupuesto (MXN)">
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                prefix="$"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                placeholder="100,000"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="Descripción / Preferencias">
          <Input.TextArea
            rows={3}
            placeholder="Colores preferidos, temática, estilo, requerimientos especiales..."
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={loading ? <Spin size="small" /> : <SendOutlined />}
            loading={loading}
            style={{
              flex: 1,
              height: 42,
              background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            Generar concepto
          </Button>
          {result && (
            <Button
              icon={<ClearOutlined />}
              onClick={() => setResult(null)}
              style={{ height: 42 }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </Form>

      {result && (
        <ResultCard title="Concepto generado por IA" content={result} color="#7C3AED" />
      )}
    </Card>
  )
}

// ── Budget Generator ─────────────────────────────────────────────────────────
function BudgetGenerator() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [form] = Form.useForm()

  const handleGenerate = async (vals: any) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await aiApi.generateBudget(vals)
      const content = res.data?.result || res.result || res.content || JSON.stringify(res, null, 2)
      setResult(content)
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Error al generar presupuesto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      style={{
        borderRadius: 20,
        border: '1px solid #FBCFE8',
        boxShadow: '0 4px 20px rgba(236,72,153,0.08)',
        height: '100%',
      }}
      title={
        <Space>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #EC4899, #F9A8D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DollarOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Estimador de Presupuesto</div>
            <div style={{ fontSize: 12, color: 'var(--pl-text-muted)', fontWeight: 400 }}>
              IA estima el desglose de costos
            </div>
          </div>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleGenerate}>
        <Form.Item
          name="eventName"
          label="Nombre del evento"
          rules={[{ required: true, message: 'Ingresa el nombre' }]}
        >
          <Input placeholder="Ej: Conferencia Tech 2026" />
        </Form.Item>

        <Form.Item
          name="eventType"
          label="Tipo de evento"
          rules={[{ required: true, message: 'Selecciona el tipo' }]}
        >
          <Select options={EVENT_TYPE_OPTIONS} placeholder="Selecciona tipo" />
        </Form.Item>

        <Form.Item name="guestCount" label="Número de invitados">
          <InputNumber style={{ width: '100%' }} min={1} placeholder="200" />
        </Form.Item>

        <Form.Item name="notes" label="Detalles adicionales">
          <Input.TextArea
            rows={3}
            placeholder="Ubicación, tipo de servicio, requerimientos especiales..."
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={loading ? <Spin size="small" /> : <ThunderboltOutlined />}
            loading={loading}
            style={{
              flex: 1,
              height: 42,
              background: 'linear-gradient(135deg, #EC4899, #F9A8D4)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            Estimar presupuesto
          </Button>
          {result && (
            <Button
              icon={<ClearOutlined />}
              onClick={() => setResult(null)}
              style={{ height: 42 }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </Form>

      {result && (
        <ResultCard title="Estimación de presupuesto" content={result} color="#EC4899" />
      )}
    </Card>
  )
}

// ── Main StudioPage ───────────────────────────────────────────────────────────
export default function StudioPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Estudio IA
            </Title>
            <Text style={{ color: 'var(--pl-text-secondary)' }}>
              Herramientas de diseño creativo potenciadas por inteligencia artificial
            </Text>
          </div>
        </div>

        {/* Feature tags */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {[
            { icon: <BulbOutlined />, label: 'Generación de conceptos', color: '#7C3AED' },
            { icon: <DollarOutlined />, label: 'Estimación de presupuesto', color: '#EC4899' },
            { icon: <StarOutlined />, label: 'Ideas creativas', color: '#F97316' },
          ].map((tag) => (
            <Tag
              key={tag.label}
              icon={tag.icon}
              style={{
                background: tag.color + '12',
                color: tag.color,
                border: `1px solid ${tag.color}30`,
                borderRadius: 20,
                padding: '4px 12px',
                fontWeight: 500,
              }}
            >
              {tag.label}
            </Tag>
          ))}
        </div>
      </div>

      {/* AI Tools */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <ConceptGenerator />
        </Col>
        <Col xs={24} lg={12}>
          <BudgetGenerator />
        </Col>
      </Row>

      {/* Info banner */}
      <Card
        style={{
          marginTop: 24,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1E1040, #2D1B69)',
          border: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <RobotOutlined style={{ color: '#A78BFA', fontSize: 32 }} />
          <div>
            <Text strong style={{ color: '#fff', fontSize: 16, display: 'block' }}>
              Potenciado por IventIA
            </Text>
            <Text style={{ color: '#C4B5FD', fontSize: 13 }}>
              Nuestros modelos de IA están entrenados específicamente para el diseño y planeación de eventos.
              Los resultados son sugerencias creativas — tu criterio profesional siempre es el factor decisivo.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  )
}
