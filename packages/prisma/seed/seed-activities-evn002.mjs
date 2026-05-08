import { PrismaClient } from 'prisma-generated'

const prisma = new PrismaClient()

// Helper: build a Date from local CDMX time (UTC-6)
const dt = (y, mo, d, h, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h + 6, mi))

async function main() {
  const eventId  = 'c599e84c-b68e-4893-be27-f191ee24f159'
  const tenantId = '713cdf4a-e1e7-49ab-afc4-99fce42f6fb8'

  const admin = await prisma.user.findFirst({ where: { tenantId, role: 'ADMIN' } })
  if (!admin) throw new Error('Admin user not found')
  const createdById = admin.id

  // Clear existing
  const deleted = await prisma.eventActivity.deleteMany({ where: { eventId } })
  console.log(`🗑️  Removed ${deleted.count} existing activities`)

  const activities = [
    // ── SETUP · Jul 3 ──────────────────────────────────────────────────────────
    {
      position: 1, activityType: 'LOGISTICS', priority: 'HIGH', status: 'PENDING', color: '#f59e0b',
      title: 'Llegada equipo técnico y logística',
      description: 'Recepción de personal técnico, proveedores de sonido, iluminación y escenografía en acceso de carga.',
      startDate: dt(2026,7,3, 8, 0), endDate: dt(2026,7,3, 9,30), durationMins: 90,
    },
    {
      position: 2, activityType: 'LOGISTICS', priority: 'CRITICAL', status: 'PENDING', color: '#ef4444',
      title: 'Montaje de escenario principal',
      description: 'Armado de estructura de escenario, tarima y torres de sonido. Coordinado por empresa Producc. Escénica SA.',
      startDate: dt(2026,7,3, 9, 0), endDate: dt(2026,7,3,15, 0), durationMins: 360,
    },
    {
      position: 3, activityType: 'TECHNICAL', priority: 'CRITICAL', status: 'PENDING', color: '#8b5cf6',
      title: 'Instalación y cableado de sonido',
      description: 'Instalación de sistema de audio principal (main PA, sidefills, monitores), cableado de señal y patching.',
      startDate: dt(2026,7,3,10, 0), endDate: dt(2026,7,3,14, 0), durationMins: 240,
    },
    {
      position: 4, activityType: 'TECHNICAL', priority: 'HIGH', status: 'PENDING', color: '#8b5cf6',
      title: 'Instalación de iluminación y video',
      description: 'Rigging de luminarias, instalación de pantallas LED y proyectores. Programación de consola de iluminación.',
      startDate: dt(2026,7,3,11, 0), endDate: dt(2026,7,3,16, 0), durationMins: 300,
    },
    {
      position: 5, activityType: 'SECURITY', priority: 'HIGH', status: 'PENDING', color: '#1d4ed8',
      title: 'Briefing y distribución de seguridad',
      description: 'Reunion con empresa de seguridad: asignacion de puestos, protocolos de emergencia y puntos de acceso.',
      startDate: dt(2026,7,3,14, 0), endDate: dt(2026,7,3,15, 0), durationMins: 60,
    },
    {
      position: 6, activityType: 'CATERING', priority: 'MEDIUM', status: 'PENDING', color: '#10b981',
      title: 'Instalacion stands de alimentos y bebidas',
      description: 'Montaje de 8 stands de F&B en zonas asignadas. Conexion de servicios electricos e hidraulicos.',
      startDate: dt(2026,7,3,15, 0), endDate: dt(2026,7,3,19, 0), durationMins: 240,
    },
    {
      position: 7, activityType: 'TECHNICAL', priority: 'CRITICAL', status: 'PENDING', color: '#8b5cf6',
      title: 'Prueba de sonido e iluminacion',
      description: 'Sound check y prueba de luces completa. Line check de todas las entradas. Ajuste de EQ y mezcla FOH.',
      startDate: dt(2026,7,3,16, 0), endDate: dt(2026,7,3,19, 0), durationMins: 180,
    },
    {
      position: 8, activityType: 'MILESTONE', priority: 'HIGH', status: 'PENDING', color: '#6b46c1',
      title: 'Revision general — venue listo',
      description: 'Walk-through final: escenario, accesos, senaletica, sanitarios, iluminacion de emergencia y puestos de seguridad.',
      startDate: dt(2026,7,3,20, 0), endDate: dt(2026,7,3,21, 0), durationMins: 60,
    },

    // ── DIA 1 · Jul 4 ──────────────────────────────────────────────────────────
    {
      position: 9, activityType: 'MEETING', priority: 'HIGH', status: 'PENDING', color: '#0891b2',
      title: 'Briefing general de staff — Dia 1',
      description: 'Reunion de todos los equipos: produccion, seguridad, F&B, medicos, prensa. Confirmacion de cargos.',
      startDate: dt(2026,7,4, 8, 0), endDate: dt(2026,7,4, 9, 0), durationMins: 60,
    },
    {
      position: 10, activityType: 'SECURITY', priority: 'CRITICAL', status: 'PENDING', color: '#1d4ed8',
      title: 'Apertura de accesos y control de boletos',
      description: 'Activacion de 12 accesos con lectores QR. Personal de revista y control.',
      startDate: dt(2026,7,4, 9, 0), endDate: dt(2026,7,4,10, 0), durationMins: 60,
    },
    {
      position: 11, activityType: 'MILESTONE', priority: 'CRITICAL', status: 'PENDING', color: '#6b46c1',
      title: 'Apertura al publico — Dia 1',
      description: 'Inicio oficial del evento. Apertura de puertas a todas las zonas.',
      startDate: dt(2026,7,4,10, 0), endDate: dt(2026,7,4,10,30), durationMins: 30,
    },
    {
      position: 12, activityType: 'REHEARSAL', priority: 'HIGH', status: 'PENDING', color: '#d97706',
      title: 'Soundcheck artistas abridor (Dia 1)',
      description: 'Prueba de sonido y luces con acto de apertura. Maximo 45 min sobre escenario.',
      startDate: dt(2026,7,4,10,30), endDate: dt(2026,7,4,11,30), durationMins: 60,
    },
    {
      position: 13, activityType: 'PHASE', priority: 'HIGH', status: 'PENDING', color: '#7c3aed',
      title: 'Acto 1 — Banda Abridor',
      description: 'Presentacion del acto de apertura. Duracion 60 min. Generos: rock alternativo.',
      startDate: dt(2026,7,4,12, 0), endDate: dt(2026,7,4,13, 0), durationMins: 60,
    },
    {
      position: 14, activityType: 'PHASE', priority: 'HIGH', status: 'PENDING', color: '#7c3aed',
      title: 'Acto 2 — Artista Invitado',
      description: 'Segundo acto del cartel. Duracion 75 min. Incluye 15 min de cambio de escenario.',
      startDate: dt(2026,7,4,14, 0), endDate: dt(2026,7,4,15,30), durationMins: 90,
    },
    {
      position: 15, activityType: 'CATERING', priority: 'MEDIUM', status: 'PENDING', color: '#10b981',
      title: 'Reabastecimiento F&B — Dia 1',
      description: 'Carga de inventario en todos los stands durante intervalo entre actos.',
      startDate: dt(2026,7,4,15,30), endDate: dt(2026,7,4,16, 0), durationMins: 30,
    },
    {
      position: 16, activityType: 'PHASE', priority: 'CRITICAL', status: 'PENDING', color: '#7c3aed',
      title: 'Acto 3 — Headliner Dia 1',
      description: 'Show principal del Dia 1. Duracion 120 min. Produccion completa: pirotecnia, confeti, efectos especiales.',
      startDate: dt(2026,7,4,18, 0), endDate: dt(2026,7,4,20, 0), durationMins: 120,
    },
    {
      position: 17, activityType: 'MILESTONE', priority: 'HIGH', status: 'PENDING', color: '#6b46c1',
      title: 'Cierre Dia 1 — Desalojo ordenado',
      description: 'Protocolo de desalojo. Seguridad activa en todos los accesos. Estimado 30 min para desalojo completo.',
      startDate: dt(2026,7,4,21, 0), endDate: dt(2026,7,4,22, 0), durationMins: 60,
    },

    // ── DIA 2 · Jul 5 ──────────────────────────────────────────────────────────
    {
      position: 18, activityType: 'LOGISTICS', priority: 'MEDIUM', status: 'PENDING', color: '#f59e0b',
      title: 'Preparacion del venue — Dia 2',
      description: 'Limpieza, reposicion de consumibles, revision tecnica de escenario e iluminacion.',
      startDate: dt(2026,7,5, 8, 0), endDate: dt(2026,7,5, 9,30), durationMins: 90,
    },
    {
      position: 19, activityType: 'MEETING', priority: 'HIGH', status: 'PENDING', color: '#0891b2',
      title: 'Briefing general de staff — Dia 2',
      description: 'Reunion de seguimiento: incidencias Dia 1, ajustes de personal y logistica.',
      startDate: dt(2026,7,5, 9, 0), endDate: dt(2026,7,5, 9,30), durationMins: 30,
    },
    {
      position: 20, activityType: 'MILESTONE', priority: 'CRITICAL', status: 'PENDING', color: '#6b46c1',
      title: 'Apertura al publico — Dia 2',
      description: 'Inicio del Dia 2. Apertura de todos los accesos.',
      startDate: dt(2026,7,5,10, 0), endDate: dt(2026,7,5,10,15), durationMins: 15,
    },
    {
      position: 21, activityType: 'PHASE', priority: 'HIGH', status: 'PENDING', color: '#7c3aed',
      title: 'Acto 4 — Show Matutino',
      description: 'Presentacion especial formato intimo. Duracion 90 min.',
      startDate: dt(2026,7,5,11, 0), endDate: dt(2026,7,5,12,30), durationMins: 90,
    },
    {
      position: 22, activityType: 'PHASE', priority: 'HIGH', status: 'PENDING', color: '#7c3aed',
      title: 'Acto 5 — Show Vespertino',
      description: 'Artista sorpresa y invitados especiales. Duracion 90 min.',
      startDate: dt(2026,7,5,14, 0), endDate: dt(2026,7,5,15,30), durationMins: 90,
    },
    {
      position: 23, activityType: 'REHEARSAL', priority: 'HIGH', status: 'PENDING', color: '#d97706',
      title: 'Soundcheck headliner final',
      description: 'Ultima prueba de sonido con headliner. Verificacion de efectos especiales y pirotecnia.',
      startDate: dt(2026,7,5,16, 0), endDate: dt(2026,7,5,17, 0), durationMins: 60,
    },
    {
      position: 24, activityType: 'PHASE', priority: 'CRITICAL', status: 'PENDING', color: '#7c3aed',
      title: 'Show Final — Headliner HSODAK 2026',
      description: 'Cierre del festival. Show de 150 min con produccion total: pantallas LED, pirotecnia, confeti y efectos especiales.',
      startDate: dt(2026,7,5,18, 0), endDate: dt(2026,7,5,20,30), durationMins: 150,
    },
    {
      position: 25, activityType: 'MILESTONE', priority: 'CRITICAL', status: 'PENDING', color: '#6b46c1',
      title: 'Fin del festival HSODAK 2026',
      description: 'Ceremonia de cierre oficial. Agradecimientos, desalojo y protocolo de seguridad post-evento.',
      startDate: dt(2026,7,5,21, 0), endDate: dt(2026,7,5,22, 0), durationMins: 60,
    },

    // ── TEARDOWN · Jul 6 ───────────────────────────────────────────────────────
    {
      position: 26, activityType: 'LOGISTICS', priority: 'HIGH', status: 'PENDING', color: '#f59e0b',
      title: 'Desmontaje de escenario y estructuras',
      description: 'Desarmado de tarima, torres, pantallas LED y estructura de rigging.',
      startDate: dt(2026,7,6, 8, 0), endDate: dt(2026,7,6,14, 0), durationMins: 360,
    },
    {
      position: 27, activityType: 'LOGISTICS', priority: 'MEDIUM', status: 'PENDING', color: '#f59e0b',
      title: 'Retiro de equipo tecnico y proveedores',
      description: 'Carga y retiro de equipos de audio, iluminacion, stands F&B y materiales de produccion.',
      startDate: dt(2026,7,6, 9, 0), endDate: dt(2026,7,6,15, 0), durationMins: 360,
    },
    {
      position: 28, activityType: 'TASK', priority: 'MEDIUM', status: 'PENDING', color: '#64748b',
      title: 'Limpieza general del venue',
      description: 'Limpieza profunda de todas las areas: pista, gradas, banos, zonas F&B y accesos.',
      startDate: dt(2026,7,6,12, 0), endDate: dt(2026,7,6,17, 0), durationMins: 300,
    },
    {
      position: 29, activityType: 'MILESTONE', priority: 'HIGH', status: 'PENDING', color: '#6b46c1',
      title: 'Entrega del venue — Acta de cierre',
      description: 'Inspeccion final con representante de Expo Santa Fe. Firma de acta de entrega y cierre del evento.',
      startDate: dt(2026,7,6,17, 0), endDate: dt(2026,7,6,18, 0), durationMins: 60,
    },
  ]

  const result = await prisma.eventActivity.createMany({
    data: activities.map(a => ({
      tenantId,
      eventId,
      createdById,
      title: a.title,
      description: a.description,
      activityType: a.activityType,
      status: a.status,
      priority: a.priority,
      color: a.color,
      position: a.position,
      startDate: a.startDate,
      endDate: a.endDate,
      durationMins: a.durationMins,
    })),
  })

  console.log(`\n✅ ${result.count} actividades creadas para EVN-2026-002 HSODAK 2026\n`)
  console.log('  Setup    (Jul 3):  8 actividades — montaje, tecnico, seguridad, F&B')
  console.log('  Dia 1    (Jul 4):  9 actividades — apertura, 3 actos, headliner')
  console.log('  Dia 2    (Jul 5):  8 actividades — 3 actos, show final, cierre')
  console.log('  Teardown (Jul 6):  4 actividades — desmontaje, limpieza, entrega')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
