import { Button, Row, Col, Typography, Card, Divider, Input, Space, Avatar, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ArrowRightOutlined, InstagramOutlined, FacebookOutlined, WhatsAppOutlined, MailOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

// Color scheme from galeriasalamarte.com
const COLORS = {
  navy: '#134242',
  lightBlue: '#7cb7df',
  white: '#ffffff',
  lightGray: '#f5f5f5',
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: COLORS.white }}>
      {/* HEADER NAV */}
      <div style={{
        background: COLORS.navy,
        color: COLORS.white,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Title level={3} style={{ color: COLORS.white, margin: 0 }}>
          🎨 Arte Capital
        </Title>
        <Space>
          <Button type="text" style={{ color: COLORS.white }} onClick={() => navigate('/gallery')}>Galerías</Button>
          <Button type="text" style={{ color: COLORS.white }} onClick={() => navigate('/classes')}>Eventos</Button>
          <Button type="text" style={{ color: COLORS.white }}>Artistas</Button>
          <Button type="primary" onClick={() => navigate('/login')} style={{ background: COLORS.lightBlue, borderColor: COLORS.lightBlue }}>
            Ingresar
          </Button>
        </Space>
      </div>

      {/* HERO SECTION */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.lightBlue} 100%)`,
        color: COLORS.white,
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <Title level={1} style={{ color: COLORS.white, fontSize: 56, marginBottom: 16 }}>
          Descubre Arte Excepcional
        </Title>
        <Paragraph style={{ fontSize: 20, marginBottom: 32, maxWidth: 700, margin: '0 auto 32px', color: COLORS.white }}>
          Conecta con artistas talentosos y colecciona obras maestras. Una plataforma moderna para el arte contemporáneo.
        </Paragraph>
        <Space size="large">
          <Button size="large" type="primary" style={{ background: COLORS.white, color: COLORS.navy, borderColor: COLORS.white }}
            onClick={() => navigate('/register')}>
            Registrarse como Artista
          </Button>
          <Button size="large" style={{ background: 'transparent', borderColor: COLORS.white, color: COLORS.white }}
            onClick={() => navigate('/login')}>
            Explorar Colecciones
          </Button>
        </Space>
      </div>

      {/* FEATURED ARTISTS SECTION */}
      <div style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', color: COLORS.navy, marginBottom: 48 }}>
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
              <Card style={{ textAlign: 'center', borderTop: `4px solid ${COLORS.lightBlue}`, cursor: 'pointer' }}
                hoverable
                onClick={() => navigate('/gallery')}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>{artist.image}</div>
                <Title level={4} style={{ color: COLORS.navy }}>{artist.name}</Title>
                <Text style={{ color: COLORS.lightBlue, fontWeight: 'bold' }}>{artist.role}</Text>
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
          <Title level={2} style={{ textAlign: 'center', color: COLORS.navy, marginBottom: 48 }}>
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
                <Card style={{ textAlign: 'center', cursor: 'pointer', borderRadius: 8 }} hoverable>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>{cat.icon}</div>
                  <Title level={4} style={{ color: COLORS.navy }}>{cat.title}</Title>
                  <Text style={{ color: COLORS.lightBlue }}>{cat.count} obras</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* GALLERY SHOWCASE */}
      <div style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', color: COLORS.navy, marginBottom: 48 }}>
          Galerías Principales
        </Title>
        <Row gutter={[24, 24]}>
          {[
            { title: 'Contemporáneo', desc: 'Obras modernas y contemporáneas', bg: '#e8f4f8' },
            { title: 'Clásico', desc: 'Rescate de técnicas tradicionales', bg: '#f0e8f8' },
            { title: 'Decoración', desc: 'Arte para hogar y espacios', bg: '#f8f0e8' },
            { title: 'Coleccionistas', desc: 'Ediciones limitadas y exclusivas', bg: '#e8f8f0' },
          ].map((gallery, i) => (
            <Col xs={24} sm={12} key={i}>
              <Card style={{ background: gallery.bg, border: `2px solid ${COLORS.lightBlue}`, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                hoverable>
                <Title level={3} style={{ color: COLORS.navy }}>{gallery.title}</Title>
                <Paragraph style={{ color: '#666', marginBottom: 16 }}>{gallery.desc}</Paragraph>
                <Button type="primary" style={{ width: '100%', background: COLORS.lightBlue, borderColor: COLORS.lightBlue }}
                  onClick={() => navigate('/gallery')}>
                  Ver Galería →
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* MEMBERSHIPS SECTION */}
      <div style={{ background: COLORS.navy, color: COLORS.white, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', color: COLORS.white, marginBottom: 48 }}>
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
                  background: i === 1 ? COLORS.lightBlue : 'transparent',
                  borderColor: COLORS.lightBlue,
                  borderWidth: 2,
                }}>
                  <Title level={4} style={{ color: i === 1 ? COLORS.navy : COLORS.white }}>{tier.name}</Title>
                  <Title level={2} style={{ color: i === 1 ? COLORS.navy : COLORS.lightBlue, marginBottom: 24 }}>{tier.price}</Title>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {tier.benefits.map((benefit, j) => (
                      <div key={j} style={{ color: i === 1 ? COLORS.navy : COLORS.white }}>
                        ✓ {benefit}
                      </div>
                    ))}
                  </Space>
                  <Button type="primary" style={{
                    marginTop: 24,
                    width: '100%',
                    background: i === 1 ? COLORS.navy : COLORS.lightBlue,
                    borderColor: i === 1 ? COLORS.navy : COLORS.lightBlue,
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
        <Title level={2} style={{ textAlign: 'center', color: COLORS.navy, marginBottom: 48 }}>
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
              <Card style={{ borderLeft: `4px solid ${COLORS.lightBlue}` }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Title level={4} style={{ color: COLORS.navy, margin: 0 }}>{workshop.title}</Title>
                    <Text type="secondary">{workshop.instructor}</Text>
                  </Col>
                  <Col>
                    <Tag color={COLORS.lightBlue} style={{ color: COLORS.white }}>{workshop.level}</Tag>
                  </Col>
                </Row>
                <Divider style={{ margin: '12px 0' }} />
                <Row justify="space-between">
                  <Text>{workshop.date}</Text>
                  <Button type="link" style={{ color: COLORS.lightBlue }}
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
          <Title level={2} style={{ textAlign: 'center', color: COLORS.navy, marginBottom: 48 }}>
            Próximos Eventos
          </Title>
          <Row gutter={[24, 24]}>
            {[
              { date: '12 MAY', title: 'Exposición: Abstracto Moderno', location: 'Galería Principal' },
              { date: '19 MAY', title: 'Vernissage de Esculturas', location: 'Patio Central' },
              { date: '26 MAY', title: 'Mercado de Artistas', location: 'Espacio Abierto' },
            ].map((event, i) => (
              <Col xs={24} key={i}>
                <Card style={{ borderRadius: 8 }} hoverable>
                  <Row gutter={24}>
                    <Col xs={24} sm={4}>
                      <div style={{ background: COLORS.lightBlue, color: COLORS.white, padding: '16px', textAlign: 'center', borderRadius: 4 }}>
                        <Title level={4} style={{ color: COLORS.white, margin: 0 }}>{event.date}</Title>
                      </div>
                    </Col>
                    <Col xs={24} sm={20}>
                      <Title level={4} style={{ color: COLORS.navy, margin: '0 0 8px 0' }}>{event.title}</Title>
                      <Text type="secondary">📍 {event.location}</Text>
                      <br />
                      <Button type="link" style={{ padding: 0, marginTop: 8, color: COLORS.lightBlue }}
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
            <Title level={2} style={{ color: COLORS.navy, marginBottom: 24 }}>
              Sobre Arte Capital
            </Title>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#333' }}>
              Arte Capital es una plataforma moderna dedicada a conectar artistas talentosos con coleccionistas apasionados alrededor del mundo. Creemos que el arte debe ser accesible, valorado y celebrado.
            </Paragraph>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#333' }}>
              Nuestra misión es:
            </Paragraph>
            <ul style={{ fontSize: 16, lineHeight: 1.8, color: '#333' }}>
              <li>Empoderar a artistas con herramientas para mostrar su trabajo</li>
              <li>Crear una comunidad segura para coleccionistas</li>
              <li>Ofrecer comisiones justas y transparentes</li>
              <li>Promover educación artística</li>
            </ul>
          </Col>
          <Col xs={24} md={12}>
            <Card style={{ background: COLORS.lightGray }}>
              <Row gutter={24}>
                {[
                  { number: '5K+', label: 'Obras de Arte' },
                  { number: '1.2K+', label: 'Artistas' },
                  { number: '8K+', label: 'Coleccionistas' },
                  { number: '42', label: 'Países' },
                ].map((stat, i) => (
                  <Col xs={12} key={i}>
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <Title level={3} style={{ color: COLORS.lightBlue, margin: 0 }}>{stat.number}</Title>
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
      <div style={{ background: COLORS.navy, color: COLORS.white, padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <Title level={2} style={{ color: COLORS.white, marginBottom: 24 }}>
            ¿Necesitas un Servicio Personalizado?
          </Title>
          <Paragraph style={{ color: COLORS.white, marginBottom: 32, fontSize: 16 }}>
            Contáctanos para comisiones especiales, asesoramiento de colecciones o consultas corporativas.
          </Paragraph>
          <Input
            placeholder="Tu correo"
            size="large"
            style={{ marginBottom: 16, background: COLORS.white, color: COLORS.navy }}
          />
          <Button size="large" type="primary" style={{
            background: COLORS.lightBlue,
            borderColor: COLORS.lightBlue,
            width: '100%',
            color: COLORS.navy,
          }}>
            Enviar Consulta
          </Button>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: '#0a1f1f', color: COLORS.white, padding: '48px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 48]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.white }}>Arte Capital</Title>
              <Text type="secondary">Plataforma de arte contemporáneo</Text>
            </Col>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.white }}>Explorar</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text style={{ color: COLORS.lightBlue, cursor: 'pointer' }}>Galerías</Text>
                <Text style={{ color: COLORS.lightBlue, cursor: 'pointer' }}>Artistas</Text>
                <Text style={{ color: COLORS.lightBlue, cursor: 'pointer' }}>Catálogo</Text>
              </div>
            </Col>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.white }}>Legal</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text style={{ color: COLORS.lightBlue, cursor: 'pointer' }}>Términos</Text>
                <Text style={{ color: COLORS.lightBlue, cursor: 'pointer' }}>Privacidad</Text>
                <Text style={{ color: COLORS.lightBlue, cursor: 'pointer' }}>Cookies</Text>
              </div>
            </Col>
            <Col xs={24} sm={6}>
              <Title level={4} style={{ color: COLORS.white }}>Conecta</Title>
              <Space size="large">
                <InstagramOutlined style={{ fontSize: 24, color: COLORS.lightBlue, cursor: 'pointer' }} />
                <FacebookOutlined style={{ fontSize: 24, color: COLORS.lightBlue, cursor: 'pointer' }} />
                <WhatsAppOutlined style={{ fontSize: 24, color: COLORS.lightBlue, cursor: 'pointer' }} />
                <MailOutlined style={{ fontSize: 24, color: COLORS.lightBlue, cursor: 'pointer' }} />
              </Space>
            </Col>
          </Row>
          <Divider style={{ borderColor: '#1a3a3a' }} />
          <div style={{ textAlign: 'center', color: COLORS.lightBlue }}>
            <Text>© 2024 Arte Capital. Todos los derechos reservados.</Text>
          </div>
        </div>
      </div>
    </div>
  )
}
