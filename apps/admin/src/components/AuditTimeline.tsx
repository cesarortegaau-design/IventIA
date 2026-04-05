import { Timeline, Spin, Alert, Empty } from 'antd'
import dayjs from 'dayjs'

export default function AuditTimeline({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
  }

  if (!data || data.length === 0) {
    return <Empty description="Sin registros de auditoría" style={{ marginTop: 32 }} />
  }

  return (
    <Timeline
      style={{ marginTop: 16 }}
      items={data.map((log: any) => ({
        color: log.action === 'CREATE' ? 'green' : log.action === 'DELETE' ? 'red' : 'blue',
        children: (
          <div>
            <div style={{ fontWeight: 600 }}>
              {log.action === 'CREATE' ? 'Creado' : log.action === 'DELETE' ? 'Eliminado' : 'Modificado'}
              {' · '}
              <span style={{ fontWeight: 400, color: '#64748b', fontSize: 12 }}>
                {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                {' · '}
                {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema'}
              </span>
            </div>
            {log.action === 'UPDATE' && log.oldValues && log.newValues && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {Object.keys(log.newValues as Record<string, any>)
                  .filter(k => (log.oldValues as any)[k] !== (log.newValues as any)[k])
                  .map(k => (
                    <div key={k}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{k}:</span>{' '}
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{String((log.oldValues as any)[k]) || '(vacío)'}</span>
                      {' → '}
                      <span style={{ fontWeight: 500 }}>{String((log.newValues as any)[k]) || '(vacío)'}</span>
                    </div>
                  ))}
              </div>
            )}
            {log.action === 'CREATE' && log.newValues && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {Object.entries(log.newValues as Record<string, any>)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k}><span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{k}:</span> {String(v)}</div>
                  ))}
              </div>
            )}
            {log.action === 'DELETE' && log.oldValues && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {Object.entries(log.oldValues as Record<string, any>)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k}><span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{k}:</span> {String(v)}</div>
                  ))}
              </div>
            )}
          </div>
        ),
      }))}
    />
  )
}
