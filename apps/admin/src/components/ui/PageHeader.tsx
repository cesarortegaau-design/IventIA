import { Space } from 'antd'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  tabs?: ReactNode
}

export function PageHeader({ title, meta, actions, tabs }: PageHeaderProps) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, lineHeight: 1.3 }}>{title}</h1>
          {meta && <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>{meta}</div>}
        </div>
        {actions && <Space>{actions}</Space>}
      </div>
      {tabs && <div style={{ padding: '0 24px' }}>{tabs}</div>}
    </div>
  )
}
