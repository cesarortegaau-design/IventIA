import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

export function FilterBar({
  search,
  onSearch,
  placeholder = 'Buscar…',
  children,
  right,
}: {
  search?: string
  onSearch?: (v: string) => void
  placeholder?: string
  children?: ReactNode
  right?: ReactNode
}) {
  return (
    <div
      style={{
        padding: '16px 24px',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Input
        prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch?.(e.target.value)}
        style={{ width: 280 }}
      />
      {children}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  )
}
