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
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Title + meta block */}
        <div style={{ minWidth: 0 }}>
          <div style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
          {meta && (
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>{meta}</div>
          )}
        </div>
        {/* Actions — wrap naturally on narrow screens */}
        {actions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>
      {tabs && <div style={{ padding: '0 20px' }}>{tabs}</div>}
    </div>
  )
}
