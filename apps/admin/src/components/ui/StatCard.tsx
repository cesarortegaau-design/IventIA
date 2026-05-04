import { Card } from 'antd'
import type { ReactNode } from 'react'

export interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'primary' | 'info'
}

const toneColor: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'rgba(0,0,0,0.88)',
  success: '#16a34a',
  warning: '#f59e0b',
  primary: '#6B46C1',
  info: '#0ea5e9',
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: toneColor[tone], lineHeight: 1.2 }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{hint}</div>}
    </Card>
  )
}
