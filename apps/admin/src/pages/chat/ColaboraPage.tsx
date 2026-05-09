import { useState } from 'react'
import { Tabs, Empty } from 'antd'
import { MessageOutlined, CheckSquareOutlined } from '@ant-design/icons'
import { ConversacionesTab } from './ConversacionesTab'
import { TareasTab } from './tareas/TareasTab'

export default function ColaboraPage() {
  const [activeTab, setActiveTab] = useState('conversaciones')

  return (
    <div style={{
      height: 'calc(100vh - 112px)', borderRadius: 12, overflow: 'hidden',
      background: '#fff', boxShadow: '0 2px 12px rgba(26,58,92,0.08)',
    }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'conversaciones',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageOutlined />
                Conversaciones
              </span>
            ),
            children: <ConversacionesTab />,
          },
          {
            key: 'tareas',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquareOutlined />
                Tareas
              </span>
            ),
            children: <TareasTab />,
          },
        ]}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        tabBarStyle={{
          margin: 0,
          paddingLeft: 16,
          paddingRight: 16,
          borderBottom: '1px solid #e8f0fe',
          background: '#f8fafc',
        }}
      />
    </div>
  )
}
