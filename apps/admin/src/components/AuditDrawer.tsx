import { Drawer, Button, Space, Input, Select, Empty } from 'antd'
import { AuditOutlined } from '@ant-design/icons'
import { useState } from 'react'
import AuditTimeline from './AuditTimeline'

interface AuditDrawerProps {
  entityType: string
  entityId: string
  entityName?: string
  data: any[]
  loading: boolean
}

export default function AuditDrawer({ entityType, entityId, entityName, data, loading }: AuditDrawerProps) {
  const [open, setOpen] = useState(false)
  const [filterAction, setFilterAction] = useState<string>('')

  const filtered = filterAction ? data.filter(log => log.action === filterAction) : data

  return (
    <>
      <Button
        type="text"
        size="small"
        icon={<AuditOutlined />}
        onClick={() => setOpen(true)}
      >
        Ver cambios
      </Button>

      <Drawer
        title={
          <Space>
            <AuditOutlined />
            Auditoría
            {entityName && <span style={{ color: '#64748b', fontSize: 12 }}>— {entityName}</span>}
          </Space>
        }
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b' }}>Filtrar por acción:</label>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Todas"
                allowClear
                value={filterAction || undefined}
                onChange={setFilterAction}
                options={[
                  { label: 'Creado', value: 'CREATE' },
                  { label: 'Modificado', value: 'UPDATE' },
                  { label: 'Eliminado', value: 'DELETE' },
                  { label: 'Transferencia', value: 'TRANSFER' },
                ]}
              />
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {filtered.length} de {data.length} registros
            </div>
          </Space>
        </div>

        {filtered.length === 0 && !loading ? (
          <Empty description="Sin registros de auditoría" />
        ) : (
          <AuditTimeline data={filtered} loading={loading} />
        )}
      </Drawer>
    </>
  )
}
