import { useState, useEffect } from 'react'
import { Button, Row, Col, Grid, Space } from 'antd'
import {
  CalendarOutlined, ShoppingCartOutlined, MessageOutlined, FileTextOutlined,
  ArrowRightOutlined, CheckOutlined, EnvironmentOutlined, PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const { useBreakpoint } = Grid

const FEATURES = [
  {
    icon: <CalendarOutlined style={{ fontSize: 28, color: '#6B46C1' }} />,
    bg: '#f5f3ff',
    title: 'Gestión de Eventos',
    desc: 'Consulta el programa completo, ubicación de tu stand, horarios y detalles logísticos de cada participación.',
  },
  {
    icon: <ShoppingCartOutlined style={{ fontSize: 28, color: '#0891b2' }} />,
    bg: '#ecfeff',
    title: 'Órdenes de Servicio',
    desc: 'Solicita electricidad, internet, mobiliario, limpieza y más. Rastrea el estado de cada solicitud en tiempo real.',
  },
  {
    icon: <MessageOutlined style={{ fontSize: 28, color: '#059669' }} />,
    bg: '#ecfdf5',
    title: 'Chat en Tiempo Real',
    desc: 'Comunícate directamente con el equipo de Expo Santa Fe. Resuelve dudas al instante durante todo el evento.',
  },
  {
    icon: <FileTextOutlined style={{ fontSize: 28, color: '#d97706' }} />,
    bg: '#fffbeb',
    title: 'Documentación Digital',
    desc: 'Accede a tus contratos, facturas, guías del expositor y toda tu documentación en un solo lugar seguro.',
  },
]

const STATS = [
  { value: '30+', label: 'Años de experiencia' },
  { value: '150', label: 'Eventos por año' },
  { value: '20,000 m²', label: 'Superficie de exposición' },
  { value: '5,000+', label: 'Expositores anuales' },
]

const EVENT_TYPES = [
  { icon: '🏭', label: 'Ferias Industriales' },
  { icon: '🎓', label: 'Congresos y Convenciones' },
  { icon: '🛍️', label: 'Exposiciones Comerciales' },
  { icon: '🤝', label: 'Eventos Corporativos' },
  { icon: '🏆', label: 'Premiaciones' },
  { icon: '💡', label: 'Lanzamientos de Producto' },
]

const STEPS = [
  {
    n: '01',
    title: 'Recibe tu código de acceso',
    desc: 'El equipo de ventas de Expo Santa Fe te enviará un código exclusivo al confirmar tu participación en el evento.',
    note: 'El código es personal e intransferible.',
  },
  {
    n: '02',
    title: 'Crea tu cuenta en minutos',
    desc: 'Ingresa tu código, registra tu correo y contraseña. En menos de 2 minutos tendrás acceso completo al portal.',
    note: 'Solo necesitas email, contraseña y datos básicos.',
  },
  {
    n: '03',
    title: 'Gestiona tu participación',
    desc: 'Accede a los detalles de tu evento, solicita servicios adicionales y comunícate con el equipo de Expo Santa Fe.',
    note: 'Disponible 24/7 desde cualquier dispositivo.',
  },
]

const NAV_H = 68

export default function LandingPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (accessToken) navigate('/dashboard', { replace: true })
  }, [accessToken])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        height: NAV_H,
        background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : 'none',
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center',
        padding: isMobile ? '0 16px' : '0 clamp(24px, 5vw, 80px)',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{
            width: 36, height: 36, background: '#6B46C1', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(107,70,193,0.4)',
          }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: -1 }}>E</span>
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ color: scrolled ? '#0f172a' : '#fff', fontWeight: 700, fontSize: 15, transition: 'color 0.3s' }}>
              Expo Santa Fe
            </div>
            {!isMobile && (
              <div style={{ color: scrolled ? '#64748b' : 'rgba(255,255,255,0.65)', fontSize: 11, transition: 'color 0.3s' }}>
                Portal de Expositores
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <Space size={8}>
          <Button
            onClick={() => navigate('/login')}
            style={{
              borderColor: scrolled ? '#6B46C1' : 'rgba(255,255,255,0.6)',
              color: scrolled ? '#6B46C1' : '#fff',
              background: 'transparent', borderRadius: 8,
            }}
          >
            Iniciar Sesión
          </Button>
          <Button
            type="primary"
            onClick={() => navigate('/register')}
            style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8 }}
            icon={<ArrowRightOutlined />}
          >
            {isMobile ? 'Registro' : 'Registrarse con código'}
          </Button>
        </Space>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #2e1065 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `${NAV_H + 48}px 16px 0`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background dots pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12,
          backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        {/* Glow orbs */}
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(109,40,217,0.35) 0%, transparent 65%)',
          top: -200, right: -150, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)',
          bottom: 60, left: -80, pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 860, padding: '0 8px' }}>
          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(109,70,193,0.25)', border: '1px solid rgba(167,139,250,0.35)',
            borderRadius: 40, padding: '6px 18px', marginBottom: 32,
          }}>
            <span style={{ color: '#a78bfa', fontSize: 11 }}>✦</span>
            <span style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Portal Oficial de Expositores
            </span>
          </div>

          <h1 style={{
            fontSize: isMobile ? 'clamp(28px, 9vw, 40px)' : 'clamp(44px, 5.5vw, 68px)',
            fontWeight: 800, color: '#fff', margin: '0 0 22px',
            lineHeight: 1.08, letterSpacing: -1.5,
          }}>
            Tu participación en{' '}
            <span style={{
              background: 'linear-gradient(90deg, #a78bfa 0%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Expo Santa Fe
            </span>
            ,<br />ahora completamente digital.
          </h1>

          <p style={{
            fontSize: isMobile ? 16 : 19, color: 'rgba(255,255,255,0.65)',
            maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.75,
          }}>
            Gestiona tus stands, solicita servicios, comunícate con el equipo
            y accede a tu documentación desde un solo portal.
          </p>

          <Space size={12} wrap style={{ justifyContent: 'center' }}>
            <Button
              size="large"
              onClick={() => navigate('/login')}
              style={{
                background: '#fff', color: '#1e1b4b',
                borderColor: '#fff', fontWeight: 600,
                height: 52, padding: '0 32px', borderRadius: 10, fontSize: 15,
              }}
            >
              Iniciar Sesión
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/register')}
              icon={<ArrowRightOutlined />}
              style={{
                background: 'linear-gradient(90deg, #7c3aed, #6d28d9)',
                borderColor: 'transparent', color: '#fff', fontWeight: 600,
                height: 52, padding: '0 32px', borderRadius: 10, fontSize: 15,
              }}
            >
              Registrarse con mi código
            </Button>
          </Space>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 18 }}>
            ¿Primera vez? Necesitas un código de acceso enviado por el equipo de ventas.
          </p>
        </div>

        {/* Stats strip anchored at bottom of hero */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 940,
          marginTop: isMobile ? 48 : 72,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px 16px 0 0',
          display: 'flex', flexWrap: 'wrap',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              flex: '1 1 140px', textAlign: 'center',
              padding: '24px 16px',
              borderRight: (i < STATS.length - 1) ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}>
              <div style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 5, letterSpacing: 0.3 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(56px, 8vw, 100px) clamp(16px, 5vw, 80px)' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{
              display: 'inline-block', background: '#f5f3ff', color: '#6B46C1',
              borderRadius: 40, padding: '5px 18px', fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>
              Funcionalidades
            </span>
            <h2 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 800, color: '#0f172a', margin: '0 0 14px', lineHeight: 1.15 }}>
              Todo lo que necesitas,<br />en un solo lugar
            </h2>
            <p style={{ fontSize: 17, color: '#64748b', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              El portal centraliza toda la gestión de tu participación para que puedas enfocarte en lo que importa: tu negocio.
            </p>
          </div>

          <Row gutter={[24, 24]}>
            {FEATURES.map((f, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <div
                  style={{
                    background: '#fff', border: '1px solid #f0f4f8',
                    borderRadius: 18, padding: 28, height: '100%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(-6px)'
                    el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'none'
                    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, background: f.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: 'clamp(56px, 8vw, 100px) clamp(16px, 5vw, 80px)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{
              display: 'inline-block', background: 'rgba(167,139,250,0.2)',
              color: '#c4b5fd', borderRadius: 40, padding: '5px 18px',
              fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>
              Cómo funciona
            </span>
            <h2 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.15 }}>
              Empieza en tres pasos
            </h2>
          </div>

          <Row gutter={[isMobile ? 0 : 48, 40]} align="top">
            {STEPS.map((step, i) => (
              <Col xs={24} md={8} key={i}>
                <div>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(167,139,250,0.18)',
                    border: '1px solid rgba(167,139,250,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
                  }}>
                    <span style={{ color: '#a78bfa', fontSize: 20, fontWeight: 800 }}>{step.n}</span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 12px', lineHeight: 1.3 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, margin: '0 0 12px' }}>
                    {step.desc}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.6)', margin: 0, fontStyle: 'italic' }}>
                    {step.note}
                  </p>
                </div>
              </Col>
            ))}
          </Row>

          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <Button
              size="large"
              onClick={() => navigate('/register')}
              icon={<ArrowRightOutlined />}
              style={{
                background: '#fff', color: '#1e1b4b', borderColor: '#fff',
                fontWeight: 600, height: 52, padding: '0 36px', borderRadius: 10, fontSize: 15,
              }}
            >
              Registrarse ahora
            </Button>
          </div>
        </div>
      </section>

      {/* ── EVENT TYPES ────────────────────────────────────────── */}
      <section style={{ background: '#f8fafc', padding: 'clamp(56px, 8vw, 88px) clamp(16px, 5vw, 80px)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: isMobile ? 26 : 38, fontWeight: 800, color: '#0f172a', margin: '0 0 14px', lineHeight: 1.2 }}>
            Sede de los eventos más importantes de México
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', margin: '0 auto 48px', maxWidth: 540, lineHeight: 1.7 }}>
            Expo Santa Fe alberga ferias, congresos y eventos que reúnen a los líderes del sector empresarial nacional e internacional.
          </p>
          <Row gutter={[16, 16]} justify="center">
            {EVENT_TYPES.map((et, i) => (
              <Col xs={12} sm={8} md={4} key={i}>
                <div style={{
                  background: '#fff', borderRadius: 16, padding: '22px 12px',
                  border: '1px solid #e8ecf0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{et.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', lineHeight: 1.4 }}>{et.label}</div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────── */}
      <section style={{
        background: '#0f172a',
        padding: 'clamp(56px, 8vw, 100px) clamp(16px, 5vw, 80px)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <span style={{
            display: 'inline-block', background: 'rgba(109,70,193,0.2)',
            color: '#a78bfa', borderRadius: 40, padding: '5px 18px',
            fontSize: 13, fontWeight: 600, marginBottom: 24,
          }}>
            ¿Listo para comenzar?
          </span>
          <h2 style={{ fontSize: isMobile ? 30 : 48, fontWeight: 800, color: '#fff', margin: '0 0 18px', lineHeight: 1.12 }}>
            Tu próxima participación<br />empieza aquí
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', margin: '0 0 40px', lineHeight: 1.75, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            Únete a los miles de expositores que ya gestionan su presencia en Expo Santa Fe a través del portal digital.
          </p>
          <Space size={12} wrap style={{ justifyContent: 'center' }}>
            <Button
              size="large"
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent', borderColor: 'rgba(255,255,255,0.25)',
                color: '#fff', height: 52, padding: '0 32px', borderRadius: 10, fontSize: 15,
              }}
            >
              Iniciar Sesión
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/register')}
              style={{
                background: '#6B46C1', borderColor: '#6B46C1',
                fontWeight: 600, height: 52, padding: '0 32px', borderRadius: 10, fontSize: 15,
              }}
            >
              Registrarse con mi código
            </Button>
          </Space>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer style={{ background: '#070c14', padding: 'clamp(40px, 5vw, 64px) clamp(16px, 5vw, 80px) 24px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <Row gutter={[48, 40]}>
            {/* Brand */}
            <Col xs={24} md={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{
                  width: 36, height: 36, background: '#6B46C1', borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>E</span>
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Expo Santa Fe</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>Portal de Expositores</div>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.75, margin: '0 0 20px' }}>
                El centro de convenciones y exposiciones más importante de Santa Fe, Ciudad de México. Sede de los grandes eventos del sector empresarial.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <EnvironmentOutlined style={{ color: '#6B46C1', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                    Vasco de Quiroga 3000, Santa Fe,<br />CDMX, C.P. 01210
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <PhoneOutlined style={{ color: '#6B46C1' }} />
                  <span style={{ color: '#475569', fontSize: 13 }}>+52 (55) 5000-0000</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <MailOutlined style={{ color: '#6B46C1' }} />
                  <span style={{ color: '#475569', fontSize: 13 }}>expositores@exposantafe.com.mx</span>
                </div>
              </div>
            </Col>

            {/* Links */}
            <Col xs={12} sm={8} md={4}>
              <h4 style={{ color: '#cbd5e1', fontWeight: 700, fontSize: 13, margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Portal</h4>
              {['Iniciar Sesión', 'Registrarse', 'Mis Eventos', 'Mis Solicitudes'].map((l, i) => (
                <div key={i} style={{ marginBottom: 11 }}>
                  <span
                    style={{ color: '#475569', fontSize: 14, cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                    onClick={() => navigate(i === 0 ? '/login' : i === 1 ? '/register' : '/dashboard')}
                  >
                    {l}
                  </span>
                </div>
              ))}
            </Col>

            <Col xs={12} sm={8} md={4}>
              <h4 style={{ color: '#cbd5e1', fontWeight: 700, fontSize: 13, margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Expo Santa Fe</h4>
              {['Sobre Nosotros', 'Eventos y Ferias', 'Servicios', 'Contacto', 'Prensa'].map((l, i) => (
                <div key={i} style={{ marginBottom: 11 }}>
                  <span style={{ color: '#475569', fontSize: 14 }}>{l}</span>
                </div>
              ))}
            </Col>

            <Col xs={24} sm={8} md={7}>
              <h4 style={{ color: '#cbd5e1', fontWeight: 700, fontSize: 13, margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: 0.8 }}>¿Por qué el portal?</h4>
              {[
                'Gestión centralizada de participaciones',
                'Solicitudes de servicio en tiempo real',
                'Comunicación directa con el equipo',
                'Documentación siempre disponible',
                'Acceso desde cualquier dispositivo',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 11 }}>
                  <CheckOutlined style={{ color: '#6B46C1', marginTop: 3, fontSize: 12, flexShrink: 0 }} />
                  <span style={{ color: '#475569', fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </Col>
          </Row>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            marginTop: 48, paddingTop: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12,
          }}>
            <span style={{ color: '#334155', fontSize: 13 }}>
              © {new Date().getFullYear()} Expo Santa Fe. Todos los derechos reservados.
            </span>
            <span style={{ color: '#334155', fontSize: 12 }}>
              Powered by{' '}
              <span style={{ color: '#6B46C1', fontWeight: 600 }}>IventIA</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
