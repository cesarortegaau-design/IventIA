import { Outlet } from 'react-router-dom'

export default function TicketBuyerLayout() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1220',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399', letterSpacing: -0.5 }}>
          IventIA
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
          Portal de Boletos
        </div>
      </div>
      <Outlet />
      <div style={{ marginTop: 32, fontSize: 12, color: '#4b5563', textAlign: 'center' }}>
        © {new Date().getFullYear()} IventIA — Boletos
      </div>
    </div>
  )
}
