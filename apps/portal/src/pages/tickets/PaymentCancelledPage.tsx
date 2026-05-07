import { Link } from 'react-router-dom'

const C = {
  bg: '#0a1220', bg1: '#111827', line: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9', textMute: '#94a3b8', accent: '#34d399',
}

export default function PaymentCancelledPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: C.bg1, borderRadius: 16, padding: '48px 40px', maxWidth: 420,
        width: '100%', border: `1px solid ${C.line}`, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
        <h1 style={{ color: C.text, fontSize: 22, margin: '0 0 12px' }}>Pago cancelado</h1>
        <p style={{ color: C.textMute, fontSize: 14, margin: '0 0 32px' }}>
          Tu pago fue cancelado y no se realizó ningún cargo.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{ background: C.accent, color: '#0a1220', border: 'none', borderRadius: 8,
            padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'block', width: '100%', marginBottom: 12 }}
        >
          Volver e intentar de nuevo
        </button>
      </div>
    </div>
  )
}
