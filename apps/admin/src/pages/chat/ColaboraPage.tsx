import { useState } from 'react'
import { Typography } from 'antd'
import { MessageOutlined, CheckSquareOutlined, TeamOutlined } from '@ant-design/icons'
import { T } from '../../styles/tokens'
import { ConversacionesTab } from './ConversacionesTab'
import { TareasTab } from './tareas/TareasTab'

const { Text } = Typography

const TABS = [
  { key: 'conversaciones', label: 'Conversaciones', icon: <MessageOutlined /> },
  { key: 'tareas', label: 'Tareas', icon: <CheckSquareOutlined /> },
]

const BTN_SECONDARY: React.CSSProperties = {
  padding: '7px 12px', background: 'white', border: `1px solid ${T.border}`,
  borderRadius: 6, fontSize: 13, color: T.text, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'background 0.15s',
}

export default function ColaboraPage() {
  const [activeTab, setActiveTab] = useState('conversaciones')

  return (
    <div style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', background: T.bg }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        borderBottom: `1px solid ${T.border}`,
        padding: '20px 24px',
      }}>
        {/* Hero Row: Icon + Title */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#1a3a5c', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            <TeamOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 24, color: '#1a3a5c', display: 'block', lineHeight: 1 }}>
              Colabora
            </Text>
            <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 2, display: 'block' }}>
              Conversaciones y tareas de equipo en un solo lugar
            </Text>
          </div>
        </div>

        {/* Custom tabs bar */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 14px', background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${T.blue}` : '2px solid transparent',
                color: activeTab === tab.key ? '#1a3a5c' : T.textMuted,
                fontWeight: activeTab === tab.key ? 600 : 500,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', transition: 'color 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) (e.currentTarget.style.color = T.text) }}
              onMouseLeave={e => { if (activeTab !== tab.key) (e.currentTarget.style.color = T.textMuted) }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'conversaciones' && <ConversacionesTab />}
        {activeTab === 'tareas' && <TareasTab />}
      </div>
    </div>
  )
}
