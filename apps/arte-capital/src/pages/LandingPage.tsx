import { Button, Row, Col, Typography, Card, Divider, Input, Space, Avatar, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ArrowRightOutlined, InstagramOutlined, FacebookOutlined, WhatsAppOutlined, MailOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

// Color scheme inspired by Feria Internacional Arte Capital
const COLORS = {
  primary: '#FFD700',      // Golden Yellow
  dark: '#1a1a1a',         // Deep black/dark gray
  accent: '#F4E4C1',       // Light cream/beige
  white: '#ffffff',
  lightGray: '#f9f9f9',
  text: '#333333',
  lightText: '#666666',
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: COLORS.white }}>
      {/* HEADER NAV */}
      <div style={{
        background: COLORS.dark,
        color: COLORS.white,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `3px solid ${COLORS.primary}`,
      }}>
        <Title level={3} style={{ color: COLORS.primary, margin: 0, fontSize: 24, fontWeight: 700 }}>
          🎨 ARTE CAPITAL
        </Title>
        <Space>
          <Button type="text" style={{ color: COLORS.white, fontWeight: 500 }} onClick={() => navigate('/gallery')}>Galerías</Button>
          <Button type="text" style={{ color: COLORS.white, fontWeight: 500 }} onClick={() => navigate('/classes')}>Eventos</Button>
          <Button type="text" style={{ color: COLORS.white, fontWeight: 500 }}>Artistas</Button>
          <Button type="primary" onClick={() => navigate('/login')} style={{ background: COLORS.primary, borderColor: COLORS.primary, color: COLORS.dark, fontWeight: 600 }}>
            Ingresar
          </Button>
        </Space>
      </div>

      {/* HERO SECTION */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.dark} 0%, #2d2d2d 100%)`,
        color: COLORS.white,
        padding: '100px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 400,
          height: 400,
          background: COLORS.primary,
          borderRadius: '50%',
          opacity: 0.1,
        }} />
        <Title level={1} style={{ color: COLORS.white, fontSize: 56, marginBottom: 16, fontWeight: 700, position: 'relative', zIndex: 1 }}>
          Descubre Arte Excepcional
        </Title>
        <Paragraph style={{ fontSize: 20, marginBottom: 32, maxWidth: 700, margin: '0 auto 32px', color: COLORS.lightText, position: 'relative', zIndex: 1 }}>
          Conecta con artistas talentosos y colecciona obras maestras. Una plataforma moderna para el arte contemporáneo.
        </Paragraph>
        <Space size="large" style={{ position: 'relative', zIndex: 1 }}>
          <Button size="large" type="primary" style={{ background: COLORS.primary, color: COLORS.dark, borderColor: COLORS.primary, fontWeight: 600 }}
            onClick={() => navigate('/register')}>
            Registrarse como Artista
          </Button>
          <Button size="large" style={{ background: 'transparent', borderColor: COLORS.white, color: COLORS.white, fontWeight: 600 }}
            onClick={() => navigate('/login')}>
            Explorar Colecciones
          </Button>
        </Space>
      </div>

      {/* FEATURED ARTISTS SECTION */}
      <div style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', color: COLORS.dark, marginBottom: 48, fontWeight: 700 }}>
          Artistas Destacados
        </Title>
        <Row gutter={[32, 32]}>
          {[
            { name: 'María Rodríguez', role: 'Pintora', specialty: 'Abstraccionalismo', image: '👩‍🎨' },
            { name: 'Carlos Mendez', role: 'Escultor', specialty: 'Modernismo', image: '👨‍🎨' },
            { name: 'Ana Flores', role: 'Fotógrafa', specialty: 'Fotografía Fine Art', image: '👩‍💼' },
            { name: 'Diego Santos', role: 'Artista Digital', specialty: 'NFT & Digital', image: '👨‍💻' },
          ].map((artist, i) => (
            <Col xs={24} sm={12} md={6} key={i}>
              <Card style={{
                textAlign: 'center',
                borderTop: `4px solid ${COLORS.primary}`,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
              }}
                hoverable
                onClick={() => navigate('/gallery')}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>{artist.image}</div>
                <Title level={4} style={{ color: COLORS.dark }}>{artist.name}</Title>
                <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{artist.role}</Text>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary">{artist.specialty}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* COLLECTIONS/CATEGORIES */}
      <div style={{ background: COLORS.lightGray, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', color: COLORS.dark, marginBottom: 48, fontWeight: 700 }}>
            Explora por Categoría
          </Title>
          <Row gutter={[24, 24]}>
            {[
              { title: 'Pintura', count: 342, icon: '🎭' },
              { title: 'Escultura', count: 156, icon: '🗿' },
              { title: 'Fotografía', count: 428, icon: '📸' },
              { title: 'Digital & NFT', count: 89, icon: '💻' },
              { title: 'Cerámica', count: 167, icon: '🏺' },
              { title: 'Grabado', count: 103, icon: '🖼️' },
            ].map((cat, i) => (
              <Col xs={24} sm={12} md={4} key={i}>
                <Card style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.primary}`,
                  transition: 'all 0.3s ease',
                }} hoverable>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>{cat.icon}</div>
                  <Title level={4} style={{ color: COLORS.dark }}>{cat.title}</Title>
                  <Text style={{ color: COLORS.primary, fontWeight: 600 }}>{cat.count} obras</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* GALLERY SHOWCASE */}
      <div style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', color: COLORS.dark, marginBottom: 48, fontWeight: 700 }}>
          Galerías Principales
        </Title>
        <Row gutter={[24, 24]}>
          {[
            { title: 'Contemporáneo', desc: 'Obras modernas y contemporáneas', bg: COLORS.accent },
            { title: 'Clásico', desc: 'Rescate de técnicas tradicionales', bg: '#faf5f0' },
            { title: 'Decoración', desc: 'Arte para hogar y espacios', bg: '#f5f9fa' },
            { title: 'Coleccionistas', desc: 'Ediciones limitadas y exclusivas', bg: '#f9faf5' },
          ].map((gallery, i) => (
            <Col xs={24} sm={12} key={i}>
              <Card style={{
                background: gallery.bg,
                border: `2px solid ${COLORS.primary}`,
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
                hoverable>
                <Title level={3} style={{ color: COLORS.dark }}>{gallery.title}</Title>
                <Paragraph style={{ color: COLORS.lightText, marginBottom: 16 }}>{gallery.desc}</Paragraph>
                <Button type="primary" style={{
                  width: '100%',
                  background: COLORS.primary,
                  borderColor: COLORS.primary,
                  color: COLORS.dark,
                  fontWeight: 600,
                }}
                  onClick={() => navigate('/gallery')}>
                  Ver Galería →
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* MEMBERSHIPS SECTION */}
      <div style={{ background: COLORS.dark, color: COLORS.white, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', color: COLORS.white, marginBottom: 48, fontWeight: 700 }}>
            Membresías Exclusivas
          </Title>
          <Row gutter={[24, 24]}>
            {[
              { name: 'Explorador', price: 'Gratis', benefits: ['Acceso a galerías públicas', 'Newsletter mensual', 'Contacto con artistas'] },
              { name: 'Coleccionista', price: '$9.99/mes', benefits: ['Acceso a todos', 'Descuentos especiales', 'Previs acceso a nuevas obras', 'Envío prioritario'] },
              { name: 'Patrono', price: '$29.99/mes', benefits: ['Todo de Coleccionista', 'Sesiones privadas con artistas', 'Acceso a ediciones limitadas', 'Invitaciones a eventos exclusivos'] },
            ].map((tier, i) => (
              <Col xs={24} md={8} key={i}>
                <Card style={{
                  textAlign: 'center',
                  background: i === 1 ? COLORS.primary : '#2d2d2d',
                  borderColor: COLORS.primary,
                  borderWidth: 2,
                  boxShadow: i === 1 ? '0 8px 16px rgba(255, 215, 0, 0.2)' : '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                  <Title level={4} style={{ color: i === 1 ? COLORS.dark : COLORS.white }}>{tier.name}</Title>
                  <Title level={2} style={{ color: i === 1 ? COLORS.dark : COLORS.primary, marginBottom: 24 }}>{tier.price}</Title>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {tier.benefits.map((benefit, j) => (
                      <div key={j} style={{ color: i === 1 ? COLORS.dark : COLORS.white }}>
                        ✓ {benefit}
                      </div>
                    ))}
                  </Space>
                  <Button type="primary" style={{
                    marginTop: 24,
                    width: '100%',
                    background: i === 1 ? COLORS.dark : COLORS.primary,
                    borderColor: i === 1 ? COLORS.dark : COLORS.primary,
                    color: i === 1 ? COLORS.primary : COLORS.dark,
                    fontWeight: 600,
                  }}
                  onClick={() => navigate('/register')}>
                    Suscribirse
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* WORKSHOPS & EDUCATION */}
      <div style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', color: COLORS.dark, marginBottom: 48, fontWeight: 700 }}>
          Educación & Talleres
        </Title>
        <Row gutter={[24, 24]}>
          {[
            { title: 'Técnicas de Pintura Abstracta', instructor: 'María Rodríguez', date: '15 May 2024', level: 'Intermedio' },
            { title: 'Fotografía Fine Art Masterclass', instructor: 'Ana Flores', date: '22 May 2024', level: 'Avanzado' },
            { title: 'Introducción a NFTs', instructor: 'Diego Santos', date: '29 May 2024', level: 'Principiante' },
            { title: 'Escultura Contemporánea', instructor: 'Carlos Mendez', date: '5 June 2024', level: 'Intermedio' },
          ].map((workshop, i) => (
            <Col xs={24} sm={12} key={i}>
              <Card style={{
                borderLeft: `4px solid ${COLORS.primary}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Title level={4} style={{ color: COLORS.dark, margin: 0 }}>{workshop.title}</Title>
                    <Text type="secondary">{workshop.instructor}</Text>
                  </Col>
                  <Col>
                    <Tag color={COLORS.primary} style={{ color: COLORS.dark }}>{workshop.level}</Tag>
                  </Col>
                </Row>
                <Divider style={{ margin: '12px 0' }} />
                <Row justify="space-between">
                  <Text>{workshop.date}</Text>
                  <Button type="link" style={{ color: COLORS.primary, fontWeight: 600 }}
                    onClick={() => navigate('/gallery')}>
                    Inscribirse →
                  </Button>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* EVENTS */}
      <div style={{ background: COLORS.lightGray, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', color: COLORS.dark, marginBottom: 48, fontWeight: 700 }}>
            Próximos Eventos
          </Title>
          <Row gutter={[24, 24]}>
            {[
              { date: '12 MAY', title: 'Exposición: Abstracto Moderno', location: 'Galería Principal' },
              { date: '19 MAY', title: 'Vernissage de Esculturas', location: 'Patio Central' },
              { date: '26 MAY', title: 'Mercado de Artistas', location: 'Espacio Abierto' },
            ].map((event, i) => (
              <Col xs={24} key={i}>
                <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} hoverable>
                  <Row gutter={24}>
                    <Col xs={24} sm={4}>
                      <div style={{
                        background: COLORS.primary,
                        color: COLORS.dark,
                        padding: '16px',
                        textAlign: 'center',
                        borderRadius: 4,
                        fontWeight: 700,
                      }}>
                        <Title level={4} style={{ color: COLORS.dark, margin: 0 }}>{event.date}</Title>
                      </div>
                    </Col>
                    <Col xs={24} sm={20}>
                      <Title level={4} style={{ color: COLORS.dark, margin: '0 0 8px 0' }}>{event.title}</Title>
                      <Text type="secondary">📍 {event.location}</Text>
                      <br />
                      <Button type="link" style={{ padding: 0, marginTop: 8, color: COLORS.primary, fontWeight: 600 }}
                        onClick={() => navigate('/gallery')}>
                        Más información →
                      </Button>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* ABOUT SECTION */}
      <div style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={48}>
          <Col xs={24} md={12}>
            <Title level={2} style={{ color: COLORS.dark, marginBottom: 24, fontWeight: 700 }}>
              Sobre Arte Capital
            </Title>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: COLORS.text }}>
              Arte Capital es una plataforma moderna dedicada a conectar artistas talentosos con coleccionistas apasionados alrededor del mundo. Creemos que el arte debe ser accesible, valorado y celebrado.
            </Paragraph>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: COLORS.text }}>
              Nuestra misión es:
            </Paragraph>
            <ul style={{ fontSize: 16, lineHeight: 1.8, color: COLORS.text }}>
              <li>Empoderar a artistas con herramientas para mostrar su trabajo</li>
              <li>Crear una comunidad segura para coleccionistas</li>
              <li>Ofrecer comisiones justas y transparentes</li>
              <li>Promover educación artística</li>
            </ul>
          </Col>
          <Col xs={24} md={12}>
            <Card style={{ background: COLORS.lightGray, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <Row gutter={24}>
                {[
                  { number: '5K+', label: 'Obras de Arte' },
                  { number: '1.2K+', label: 'Artistas' },
                  { number: '8K+', label: 'Coleccionistas' },
                  { number: '42', label: 'Países' },
                ].map((stat, i) => (
                  <Col xs={12} key={i}>
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <Title level={3} style={{ color: COLORS.primary, margin: 0, fontWeight: 700 }}>{stat.number}</Title>
                      <Text type="secondary">{stat.label}</Text>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      </div>

      {/* CONTACT / COMMISSION */}
      <div style={{ background: COLORS.dark, color: COLORS.white, padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <Title level={2} style={{ color: COLORS.white, marginBottom: 24, fontWeight: 700 }}>
            ¿Necesitas un Servicio Personalizado?
          </Title>
          <Paragraph style={{ color: COLORS.lightText, marginBottom: 32, fontSize: 16 }}>
            Contáctanos para comisiones especiales, asesoramiento de colecciones o consultas corporativas.
          </Paragraph>
          <Input
            placeholder="Tu correo"
            size="large"
            style={{ marginBottom: 16, background: COLORS.white, color: COLORS.dark }}
          />
          <Button size="large" type="primary" style={{
            background: COLORS.primary,
            borderColor: COLORS.primary,
            width: '100%',
            color: COLORS.dark,
            fontWeight: 600,
          }}>
            Enviar Consulta
          </Button>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: '#0f0f0f', color: COLORS.white, padding: '48px 24px', borderTop: `3px solid ${COLORS.primary}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 48]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.primary, fontWeight: 700 }}>Arte Capital</Title>
              <Text type="secondary">Plataforma de arte contemporáneo</Text>
            </Col>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.white }}>Explorar</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text style={{ color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>Galerías</Text>
                <Text style={{ color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>Artistas</Text>
                <Text style={{ color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>Catálogo</Text>
              </div>
            </Col>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.white }}>Legal</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text style={{ color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>Términos</Text>
                <Text style={{ color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>Privacidad</Text>
                <Text style={{ color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>Cookies</Text>
              </div>
            </Col>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.white }}>Conecta</Title>
              <Space size="large">
                <InstagramOutlined style={{ fontSize: 24, color: COLORS.primary, cursor: 'pointer' }} />
                <FacebookOutlined style={{ fontSize: 24, color: COLORS.primary, cursor: 'pointer' }} />
                <WhatsAppOutlined style={{ fontSize: 24, color: COLORS.primary, cursor: 'pointer' }} />
                <MailOutlined style={{ fontSize: 24, color: COLORS.primary, cursor: 'pointer' }} />
              </Space>
            </Col>
          </Row>
          <Divider style={{ borderColor: '#2d2d2d' }} />
          <div style={{ textAlign: 'center', color: COLORS.primary }}>
            <Text>© 2024 Arte Capital. Todos los derechos reservados.</Text>
          </div>
        </div>
      </div>
    </div>
  )
}
