import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Tooltip } from 'antd'
import { HistoryOutlined, CloseOutlined } from '@ant-design/icons'
import { useRecentScreensStore } from '../stores/recentScreensStore'
import { useSplitViewStore } from '../stores/splitViewStore'

const SECTION_COLORS: Record<string, string> = {
  inicio:      '#10b981',
  eventos:     '#2e7fc1',
  ordenes:     '#8b5cf6',
  catalogos:   '#64748b',
  crm:         '#f59e0b',
  analitica:   '#ec4899',
  colabora:    '#06b6d4',
  operaciones: '#f97316',
  almacen:     '#84cc16',
  produccion:  '#a855f7',
  general:     '#94a3b8',
}

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'Ahora'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Split icon — two columns
function SplitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'block' }}>
      <rect x="1" y="1" width="5" height="12" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="8" y="1" width="5" height="12" rx="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

export default function RecentScreensPanel() {
  const [open, setOpen] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const { screens, clear } = useRecentScreensStore()
  const splitView = useSplitViewStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Filter out current page
  const items = screens.filter((s) => s.path !== pathname)

  const handleSplit = (screen: typeof screens[0]) => {
    // Current page as pane A, selected as pane B
    const currentLabel = screens.find(s => s.path === pathname)?.label ?? pathname
    splitView.open(
      { path: pathname, label: currentLabel },
      { path: screen.path, label: screen.label },
    )
    setOpen(false)
  }

  return (
    <div
      ref={panelRef}
      style={{ position: 'fixed', bottom: 20, left: 16, zIndex: 1050 }}
    >
      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 58,
            left: 0,
            width: 'min(340px, calc(100vw - 32px))',
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: '1px solid #e5e9f0',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #f0f0f0',
            background: '#f8faff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HistoryOutlined style={{ fontSize: 14, color: '#64748b' }} />
              Recientes
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {items.length > 0 && (
                <button
                  onClick={clear}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8', padding: '3px 6px', borderRadius: 6 }}
                  title="Limpiar historial"
                >
                  Limpiar
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '3px 6px', borderRadius: 6, fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>

          {/* Split hint */}
          {items.length >= 1 && (
            <div style={{ padding: '6px 14px', background: '#f0f6ff', borderBottom: '1px solid #e0ecff', fontSize: 11, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }}>
              <SplitIcon />
              Pasa el cursor sobre una pantalla para verla junto a la actual
            </div>
          )}

          {/* List */}
          {items.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              Navega entre páginas para ver tu historial
            </div>
          ) : (
            <div style={{ maxHeight: 'min(380px, 55dvh)', overflowY: 'auto' }}>
              {items.map((screen, i) => {
                const dot = SECTION_COLORS[screen.section] ?? '#94a3b8'
                const parts = screen.label.split(' › ')
                const primary = parts[parts.length - 1]
                const parent  = parts.length > 1 ? parts.slice(0, -1).join(' › ') : null
                const isHovered = hoveredIdx === i

                return (
                  <div
                    key={screen.path + i}
                    style={{
                      borderBottom: i < items.length - 1 ? '1px solid #f5f5f5' : 'none',
                      background: isHovered ? '#f8faff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Nav button */}
                    <button
                      onClick={() => { navigate(screen.path); setOpen(false) }}
                      style={{
                        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                        padding: '10px 14px', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dot, flexShrink: 0, marginTop: parent ? 2 : 0,
                      }} />
                      <span style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{
                          display: 'block', fontSize: 13, fontWeight: 600, color: '#1f2937',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {primary}
                        </span>
                        {parent && (
                          <span style={{
                            display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 400,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            marginTop: 1,
                          }}>
                            {parent}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 10, color: '#b0bac5', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>
                        {relTime(screen.visitedAt)}
                      </span>
                    </button>

                    {/* Split button */}
                    <Tooltip title={`Ver junto a la pantalla actual`} placement="left">
                      <button
                        onClick={() => handleSplit(screen)}
                        style={{
                          width: 32, height: '100%', minHeight: 40, border: 'none',
                          background: isHovered ? '#2e7fc1' : 'transparent',
                          color: isHovered ? 'white' : '#cbd5e1',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, borderLeft: '1px solid #f0f0f0',
                          transition: 'background 0.15s, color 0.15s',
                          borderRadius: '0 0 0 0',
                          padding: '0 9px',
                        }}
                        title="Vista dividida"
                      >
                        <SplitIcon />
                      </button>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Pantallas recientes"
        style={{
          width: 48, height: 48, borderRadius: '50%',
          background: open ? '#1a3a5c' : '#fff',
          border: `2px solid ${open ? '#1a3a5c' : '#e5e9f0'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#fff' : '#1a3a5c',
          fontSize: 18,
          transition: 'background 0.18s, color 0.18s, border-color 0.18s',
          outline: 'none',
          position: 'relative',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = '#f0f6ff' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = '#fff' }}
      >
        <HistoryOutlined />
        {items.length > 0 && !open && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#2e7fc1', color: '#fff',
            fontSize: 9, fontWeight: 700,
            minWidth: 16, height: 16, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff', padding: '0 2px',
          }}>
            {items.length}
          </span>
        )}
      </button>
    </div>
  )
}
