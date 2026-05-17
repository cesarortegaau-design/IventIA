import { useEffect, useRef } from 'react'
import { Tooltip } from 'antd'
import {
  CloseOutlined,
  SwapOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  FullscreenOutlined,
} from '@ant-design/icons'
import { useSplitViewStore } from '../stores/splitViewStore'

const BASE = window.location.origin

function embedUrl(path: string) {
  const sep = path.includes('?') ? '&' : '?'
  return `${BASE}${path}${sep}embed=1`
}

function PaneHeader({
  label,
  path,
  side,
}: {
  label: string
  path: string
  side: 'left' | 'right' | 'top' | 'bottom'
}) {
  const isLeft = side === 'left' || side === 'top'
  const dotColor = isLeft ? '#2e7fc1' : '#8b5cf6'

  return (
    <div style={{
      height: 32,
      background: '#f8faff',
      borderBottom: '1px solid #e5e9f0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      gap: 7,
      flexShrink: 0,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <Tooltip title="Abrir en pantalla completa">
        <a
          href={path}
          target="_top"
          style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <FullscreenOutlined style={{ fontSize: 13 }} />
        </a>
      </Tooltip>
    </div>
  )
}

export default function SplitViewOverlay() {
  const { active, orientation, panes, setOrientation, swap, close } = useSplitViewStore()
  const frame1 = useRef<HTMLIFrameElement>(null)
  const frame2 = useRef<HTMLIFrameElement>(null)

  // ESC to close
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, close])

  if (!active || !panes) return null

  const isHoriz = orientation === 'horizontal'

  const [paneA, paneB] = panes
  const sideA = isHoriz ? 'left' : 'top'
  const sideB = isHoriz ? 'right' : 'bottom'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      background: '#0a1628',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Toolbar */}
      <div style={{
        height: 44,
        background: '#1a3a5c',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Left label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e7fc1', flexShrink: 0 }} />
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
          }}>
            {paneA.label}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tooltip title="Dividir horizontalmente (lado a lado)">
            <button
              onClick={() => setOrientation('horizontal')}
              style={{
                width: 30, height: 30, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: !isHoriz ? 'transparent' : 'rgba(255,255,255,0.12)',
                color: !isHoriz ? 'rgba(255,255,255,0.5)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}
            >
              <ColumnWidthOutlined />
            </button>
          </Tooltip>

          <Tooltip title="Dividir verticalmente (arriba y abajo)">
            <button
              onClick={() => setOrientation('vertical')}
              style={{
                width: 30, height: 30, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: isHoriz ? 'transparent' : 'rgba(255,255,255,0.12)',
                color: isHoriz ? 'rgba(255,255,255,0.5)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}
            >
              <ColumnHeightOutlined />
            </button>
          </Tooltip>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          <Tooltip title="Intercambiar paneles">
            <button
              onClick={swap}
              style={{
                width: 30, height: 30, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: 'transparent', color: 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}
            >
              <SwapOutlined />
            </button>
          </Tooltip>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          <Tooltip title="Cerrar vista dividida (Esc)">
            <button
              onClick={close}
              style={{
                width: 30, height: 30, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(239,68,68,0.15)', color: '#f87171',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}
            >
              <CloseOutlined />
            </button>
          </Tooltip>
        </div>

        <div style={{ flex: 1 }} />

        {/* Right label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
            textAlign: 'right',
          }}>
            {paneB.label}
          </span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
        </div>
      </div>

      {/* Panes */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isHoriz ? 'row' : 'column',
        minHeight: 0,
        gap: 2,
      }}>
        {/* Pane A */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          background: 'white',
          borderRadius: isHoriz ? '0 0 0 0' : undefined,
        }}>
          <PaneHeader label={paneA.label} path={paneA.path} side={sideA} />
          <iframe
            ref={frame1}
            src={embedUrl(paneA.path)}
            style={{ flex: 1, border: 'none', minHeight: 0 }}
            title={paneA.label}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>

        {/* Divider */}
        <div style={{
          flexShrink: 0,
          background: '#0a1628',
          width: isHoriz ? 2 : undefined,
          height: !isHoriz ? 2 : undefined,
        }} />

        {/* Pane B */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          background: 'white',
        }}>
          <PaneHeader label={paneB.label} path={paneB.path} side={sideB} />
          <iframe
            ref={frame2}
            src={embedUrl(paneB.path)}
            style={{ flex: 1, border: 'none', minHeight: 0 }}
            title={paneB.label}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  )
}
