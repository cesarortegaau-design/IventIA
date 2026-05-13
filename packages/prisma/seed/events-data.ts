import { PrismaClient, EventStatus, OrderStatus, ActivityType, PricingTier } from 'prisma-generated'

const prisma = new PrismaClient()

async function seedEvents() {
  console.log('🎬 Seeding events with timelines, budgets, tasks, and service orders...')

  // Get existing tenant and admin user
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'expo-santa-fe' } })
  if (!tenant) throw new Error('Tenant not found')

  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'ADMIN' } })
  if (!admin) throw new Error('Admin user not found')

  // Get clients
  const clientQAlimentos = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: 'contacto@qalimentos.com' },
  })
  const clientDefLeppard = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: 'info@defleppprd.com' },
  })
  const clientAtletismo = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: 'contacto@atletismonacional.mx' },
  })
  const clientFlagFootball = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: 'contacto@flagfootball.mx' },
  })
  const clientConstructora = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: 'compras@constructora-elite.com' },
  })

  if (!clientQAlimentos || !clientDefLeppard || !clientAtletismo || !clientFlagFootball || !clientConstructora) {
    throw new Error('One or more required clients not found')
  }

  // Get resources
  const salonGrande = await prisma.resource.findFirst({ where: { code: 'ESP-SALON-GRANDE' } })
  const pabellonA = await prisma.resource.findFirst({ where: { code: 'ESP-PABELLON-A' } })
  const escenario = await prisma.resource.findFirst({ where: { code: 'ESP-ESCENARIO' } })
  const pistaAtletica = await prisma.resource.findFirst({ where: { code: 'ESP-PISTA-ATLETICA' } })
  const canchaFlag = await prisma.resource.findFirst({ where: { code: 'ESP-CANCHA-FLAG' } })
  const mesaExpo = await prisma.resource.findFirst({ where: { code: 'MOB-MESA-EXPO' } })
  const silla = await prisma.resource.findFirst({ where: { code: 'MOB-SILLA-PLEGABLE' } })
  const proyector = await prisma.resource.findFirst({ where: { code: 'EQP-PROYECTOR' } })
  const consola = await prisma.resource.findFirst({ where: { code: 'EQP-CONSOLA-SONIDO' } })
  const bafles = await prisma.resource.findFirst({ where: { code: 'EQP-BAFLES' } })
  const luces = await prisma.resource.findFirst({ where: { code: 'EQP-LUCES-LED' } })
  const internet = await prisma.resource.findFirst({ where: { code: 'SVC-INTERNET-GBPS' } })
  const limpieza = await prisma.resource.findFirst({ where: { code: 'SVC-LIMPIEZA' } })

  // ── EVENT 1: Expo Santa Fe Exhibition ────────────────────────────────────
  const priceListExpo = await prisma.priceList.findFirst({ where: { tenantId: tenant.id, name: 'Precio Expo 2026' } })
    ?? await prisma.priceList.create({
      data: { tenantId: tenant.id, name: 'Precio Expo 2026', earlyCutoff: new Date('2026-06-30T23:59:59Z'), normalCutoff: new Date('2026-08-31T23:59:59Z'), discountPct: 5 },
    })

  const expoEvent = await prisma.event.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'EXPO-SF-2026' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'EXPO-SF-2026',
      name: 'Expo Santa Fe 2026',
      description: 'Feria de exposiciones B2B y consumidor final',
      eventType: 'EXPOSITION',
      status: EventStatus.QUOTED,
      primaryClientId: clientQAlimentos.id,
      setupStart: new Date('2026-09-14T08:00:00Z'),
      setupEnd: new Date('2026-09-14T20:00:00Z'),
      eventStart: new Date('2026-09-15T08:00:00Z'),
      eventEnd: new Date('2026-09-20T20:00:00Z'),
      teardownStart: new Date('2026-09-20T18:00:00Z'),
      teardownEnd: new Date('2026-09-21T02:00:00Z'),
      venueLocation: 'Palacio de los Deportes, Ciudad de México',
      createdById: admin.id,
      priceListId: priceListExpo.id,
    },
  })

  // Create price list items for expo
  if (priceListExpo && salonGrande && mesaExpo && internet) {
    for (const item of [
      { resourceId: salonGrande.id, earlyPrice: 50000, normalPrice: 60000, latePrice: 75000, unit: 'evento' },
      { resourceId: mesaExpo.id,    earlyPrice: 800,   normalPrice: 1000,  latePrice: 1200,  unit: 'pza' },
      { resourceId: internet.id,    earlyPrice: 5000,  normalPrice: 6000,  latePrice: 7000,  unit: 'Gbps' },
    ]) {
      await prisma.priceListItem.upsert({
        where: { priceListId_resourceId: { priceListId: priceListExpo.id, resourceId: item.resourceId } },
        update: {},
        create: { priceListId: priceListExpo.id, ...item },
      })
    }
  }

  // Create timeline activities for expo
  await prisma.eventActivity.create({
    data: {
      tenantId: tenant.id,
      eventId: expoEvent.id,
      title: 'Montaje General',
      description: 'Montaje de stands y estructuras',
      activityType: ActivityType.LOGISTICS,
      startDate: new Date('2026-09-14T08:00:00Z'),
      endDate: new Date('2026-09-14T20:00:00Z'),
      createdById: admin.id,
    },
  })

  await prisma.eventActivity.create({
    data: {
      tenantId: tenant.id,
      eventId: expoEvent.id,
      title: 'Día 1: Inauguración',
      description: 'Apertura oficial de la expo con ceremonia inaugural',
      activityType: ActivityType.MEETING,
      startDate: new Date('2026-09-15T09:00:00Z'),
      endDate: new Date('2026-09-15T11:00:00Z'),
      createdById: admin.id,
    },
  })

  await prisma.eventActivity.create({
    data: {
      tenantId: tenant.id,
      eventId: expoEvent.id,
      title: 'Desmontaje y Limpieza',
      description: 'Desmontaje general y limpieza del recinto',
      activityType: ActivityType.LOGISTICS,
      startDate: new Date('2026-09-20T18:00:00Z'),
      endDate: new Date('2026-09-21T02:00:00Z'),
      createdById: admin.id,
    },
  })

  console.log(`✅ Event 1: Expo Santa Fe Exhibition created`)

  // ── EVENT 2: Def Leppard Concert ────────────────────────────────────────
  const priceListConcert = await prisma.priceList.findFirst({ where: { tenantId: tenant.id, name: 'Producción Def Leppard 2026' } })
    ?? await prisma.priceList.create({ data: { tenantId: tenant.id, name: 'Producción Def Leppard 2026', discountPct: 0 } })

  const concertEvent = await prisma.event.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DEFLEPPARD-2026' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'DEFLEPPARD-2026',
      name: 'Def Leppard Live - Palacio de los Deportes',
      description: 'Concierto en vivo de la banda de rock Def Leppard',
      eventType: 'CONCERT',
      status: EventStatus.QUOTED,
      primaryClientId: clientDefLeppard.id,
      setupStart: new Date('2026-11-20T14:00:00Z'),
      setupEnd: new Date('2026-11-20T18:30:00Z'),
      eventStart: new Date('2026-11-20T19:00:00Z'),
      eventEnd: new Date('2026-11-20T23:00:00Z'),
      teardownStart: new Date('2026-11-20T23:00:00Z'),
      teardownEnd: new Date('2026-11-21T02:00:00Z'),
      venueLocation: 'Palacio de los Deportes, Ciudad de México',
      createdById: admin.id,
      priceListId: priceListConcert.id,
    },
  })

  // Create price list items for concert
  if (priceListConcert && escenario && consola && bafles && luces) {
    for (const item of [
      { resourceId: escenario.id, earlyPrice: 100000, normalPrice: 120000, latePrice: 150000, unit: 'evento' },
      { resourceId: consola.id,   earlyPrice: 15000,  normalPrice: 18000,  latePrice: 20000,  unit: 'pza' },
      { resourceId: bafles.id,    earlyPrice: 8000,   normalPrice: 10000,  latePrice: 12000,  unit: 'par' },
      { resourceId: luces.id,     earlyPrice: 5000,   normalPrice: 6000,   latePrice: 7500,   unit: 'pza' },
    ]) {
      await prisma.priceListItem.upsert({
        where: { priceListId_resourceId: { priceListId: priceListConcert.id, resourceId: item.resourceId } },
        update: {},
        create: { priceListId: priceListConcert.id, ...item },
      })
    }
  }

  // Create timeline activities for concert
  await prisma.eventActivity.create({
    data: {
      tenantId: tenant.id,
      eventId: concertEvent.id,
      title: 'Soundcheck',
      description: 'Prueba de sonido con la banda',
      activityType: ActivityType.TECHNICAL,
      startDate: new Date('2026-11-20T15:00:00Z'),
      endDate: new Date('2026-11-20T18:00:00Z'),
      createdById: admin.id,
    },
  })

  await prisma.eventActivity.create({
    data: {
      tenantId: tenant.id,
      eventId: concertEvent.id,
      title: 'Show en Vivo',
      description: 'Presentación en vivo de Def Leppard',
      activityType: ActivityType.MEETING,
      startDate: new Date('2026-11-20T19:00:00Z'),
      endDate: new Date('2026-11-20T23:00:00Z'),
      createdById: admin.id,
    },
  })

  console.log(`✅ Event 2: Def Leppard Concert created`)

  // ── EVENT 3: Athletics Races Series ─────────────────────────────────────
  const priceListAthletics = await prisma.priceList.findFirst({ where: { tenantId: tenant.id, name: 'Atletismo Nacional 2026' } })
    ?? await prisma.priceList.create({ data: { tenantId: tenant.id, name: 'Atletismo Nacional 2026', discountPct: 0 } })

  const athleticsEvent = await prisma.event.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ATLETISMO-2026' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'ATLETISMO-2026',
      name: 'Campeonato Nacional de Atletismo 2026',
      description: 'Serie de carreras de 100m, 200m, 400m, 800m y maratón',
      eventType: 'SPORTS',
      status: EventStatus.QUOTED,
      primaryClientId: clientAtletismo.id,
      setupStart: new Date('2026-10-04T08:00:00Z'),
      setupEnd: new Date('2026-10-05T06:00:00Z'),
      eventStart: new Date('2026-10-05T07:00:00Z'),
      eventEnd: new Date('2026-10-07T19:00:00Z'),
      teardownStart: new Date('2026-10-07T18:00:00Z'),
      teardownEnd: new Date('2026-10-08T02:00:00Z'),
      venueLocation: 'Estadio Olímpico, Ciudad de México',
      createdById: admin.id,
      priceListId: priceListAthletics.id,
    },
  })

  // Create price list items for athletics
  if (priceListAthletics && pistaAtletica && internet) {
    for (const item of [
      { resourceId: pistaAtletica.id, earlyPrice: 80000, normalPrice: 100000, latePrice: 120000, unit: 'evento' },
      { resourceId: internet.id,      earlyPrice: 4000,  normalPrice: 5000,   latePrice: 6000,   unit: 'Gbps' },
    ]) {
      await prisma.priceListItem.upsert({
        where: { priceListId_resourceId: { priceListId: priceListAthletics.id, resourceId: item.resourceId } },
        update: {},
        create: { priceListId: priceListAthletics.id, ...item },
      })
    }
  }

  // Create timeline activities for athletics
  for (let day = 5; day <= 7; day++) {
    const dayStr = String(day).padStart(2, '0')
    await prisma.eventActivity.create({
      data: {
        tenantId: tenant.id,
        eventId: athleticsEvent.id,
        title: `Día ${day - 4}: Carreras Cortas (100m, 200m)`,
        description: `Competencias de velocidad - Día ${day - 4}`,
        activityType: ActivityType.MEETING,
        startDate: new Date(`2026-10-${dayStr}T08:00:00Z`),
        endDate: new Date(`2026-10-${dayStr}T12:00:00Z`),
        createdById: admin.id,
      },
    })

    await prisma.eventActivity.create({
      data: {
        tenantId: tenant.id,
        eventId: athleticsEvent.id,
        title: `Día ${day - 4}: Carreras Medianas y Largas (400m, 800m)`,
        description: `Carreras de resistencia - Día ${day - 4}`,
        activityType: ActivityType.MEETING,
        startDate: new Date(`2026-10-${dayStr}T14:00:00Z`),
        endDate: new Date(`2026-10-${dayStr}T18:00:00Z`),
        createdById: admin.id,
      },
    })
  }

  console.log(`✅ Event 3: Athletics Races Series created`)

  // ── EVENT 4: Flag Football Tournament ────────────────────────────────────
  const priceListFlagFootball = await prisma.priceList.findFirst({ where: { tenantId: tenant.id, name: 'Flag Football Liga 2026' } })
    ?? await prisma.priceList.create({ data: { tenantId: tenant.id, name: 'Flag Football Liga 2026', discountPct: 0 } })

  const flagFootballEvent = await prisma.event.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FLAG-FOOTBALL-2026' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'FLAG-FOOTBALL-2026',
      name: 'Liga Flag Football 2026',
      description: 'Torneo de flag football con categorías femenil, varonil y mixta',
      eventType: 'SPORTS',
      status: EventStatus.QUOTED,
      primaryClientId: clientFlagFootball.id,
      setupStart: new Date('2026-07-31T12:00:00Z'),
      setupEnd: new Date('2026-08-01T08:00:00Z'),
      eventStart: new Date('2026-08-01T09:00:00Z'),
      eventEnd: new Date('2026-08-31T19:00:00Z'),
      teardownStart: new Date('2026-08-31T18:00:00Z'),
      teardownEnd: new Date('2026-09-01T02:00:00Z'),
      venueLocation: 'Cancha Flag Football, Zona Metropolitana',
      createdById: admin.id,
      priceListId: priceListFlagFootball.id,
    },
  })

  // Create tournament config
  await prisma.tournamentConfig.upsert({
    where: { eventId: flagFootballEvent.id },
    update: {},
    create: {
      id: `tourConfig-${flagFootballEvent.id}`,
      tenantId: tenant.id,
      eventId: flagFootballEvent.id,
      numRounds: 3,
      hasPlayoffs: true,
      qualificationSystem: 'Liga Round Robin',
      regFeePerTeam: 5000,
      settings: {
        matchDurationMinutes: 40,
        dailyMatchLimit: 4,
        categories: ['FEMENIL', 'VARONIL', 'MIXTO'],
      },
    },
  })

  // Create tournament venue
  if (canchaFlag) {
    await prisma.tournamentVenue.create({
      data: {
        tenantId: tenant.id,
        eventId: flagFootballEvent.id,
        name: 'Cancha Principal',
        address: 'Av. Paseo de la Reforma 505',
        capacity: 500,
      },
    })
  }

  // Create price list items for flag football
  if (priceListFlagFootball && canchaFlag && internet) {
    for (const item of [
      { resourceId: canchaFlag.id, earlyPrice: 50000, normalPrice: 60000, latePrice: 75000, unit: 'evento' },
      { resourceId: internet.id,   earlyPrice: 3000,  normalPrice: 3500,  latePrice: 4000,  unit: 'Gbps' },
    ]) {
      await prisma.priceListItem.upsert({
        where: { priceListId_resourceId: { priceListId: priceListFlagFootball.id, resourceId: item.resourceId } },
        update: {},
        create: { priceListId: priceListFlagFootball.id, ...item },
      })
    }
  }

  // Create timeline for tournament
  await prisma.eventActivity.create({
    data: {
      tenantId: tenant.id,
      eventId: flagFootballEvent.id,
      title: 'Registro de Equipos',
      description: 'Período de registro y confirmación de equipos participantes',
      activityType: ActivityType.MEETING,
      startDate: new Date('2026-07-15T09:00:00Z'),
      endDate: new Date('2026-07-31T18:00:00Z'),
      createdById: admin.id,
    },
  })

  for (let round = 1; round <= 3; round++) {
    const roundStartDay = String(1 + (round - 1) * 10).padStart(2, '0')
    const roundEndDay = String(10 + (round - 1) * 10).padStart(2, '0')
    const roundStart = new Date(`2026-08-${roundStartDay}T09:00:00Z`)
    const roundEnd = new Date(`2026-08-${roundEndDay}T18:00:00Z`)

    await prisma.eventActivity.create({
      data: {
        tenantId: tenant.id,
        eventId: flagFootballEvent.id,
        title: `Jornada ${round}`,
        description: `Jornada ${round} del torneo - Fase de clasificación`,
        activityType: ActivityType.ROUND,
        startDate: roundStart,
        endDate: roundEnd,
        createdById: admin.id,
      },
    })
  }

  await prisma.eventActivity.create({
    data: {
      tenantId: tenant.id,
      eventId: flagFootballEvent.id,
      title: 'Fase Final y Premiación',
      description: 'Juegos finales y ceremonia de entrega de premios',
      activityType: ActivityType.MEETING,
      startDate: new Date('2026-08-30T09:00:00Z'),
      endDate: new Date('2026-08-31T18:00:00Z'),
      createdById: admin.id,
    },
  })

  console.log(`✅ Event 4: Flag Football Tournament created`)

  // ── EVENT 5: Construction Project ───────────────────────────────────────
  const priceListConstruction = await prisma.priceList.findFirst({ where: { tenantId: tenant.id, name: 'Construcción Fase 1-2 2026-2027' } })
    ?? await prisma.priceList.create({ data: { tenantId: tenant.id, name: 'Construcción Fase 1-2 2026-2027', discountPct: 0 } })

  const constructionEvent = await prisma.event.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CONSTRUCCION-2026' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CONSTRUCCION-2026',
      name: 'Proyecto de Remodelación de Oficinas',
      description: 'Remodelación integral de oficinas corporativas - Fase 1 y 2',
      eventType: 'PROJECT',
      status: EventStatus.QUOTED,
      primaryClientId: clientConstructora.id,
      setupStart: new Date('2026-11-25T08:00:00Z'),
      setupEnd: new Date('2026-11-30T17:00:00Z'),
      eventStart: new Date('2026-12-01T08:00:00Z'),
      eventEnd: new Date('2027-03-31T17:00:00Z'),
      teardownStart: new Date('2027-03-31T17:00:00Z'),
      teardownEnd: new Date('2027-04-02T12:00:00Z'),
      venueLocation: 'Av. Paseo de la Reforma 222',
      createdById: admin.id,
      priceListId: priceListConstruction.id,
    },
  })

  // Create timeline for construction project
  const phases = [
    { name: 'Fase 1: Demolición y Preparación', start: '2026-12-01', end: '2026-12-31' },
    { name: 'Fase 2: Construcción de Estructura', start: '2027-01-01', end: '2027-02-15' },
    { name: 'Fase 3: Acabados e Instalaciones', start: '2027-02-16', end: '2027-03-31' },
  ]

  for (const phase of phases) {
    await prisma.eventActivity.create({
      data: {
        tenantId: tenant.id,
        eventId: constructionEvent.id,
        title: phase.name,
        description: `${phase.name} del proyecto de remodelación`,
        activityType: ActivityType.PHASE,
        startDate: new Date(`${phase.start}T08:00:00Z`),
        endDate: new Date(`${phase.end}T17:00:00Z`),
        createdById: admin.id,
      },
    })
  }

  // Add milestones
  const milestones = [
    { title: 'Inspección Inicial', date: '2026-11-25' },
    { title: 'Licencia de Construcción Obtenida', date: '2026-12-01' },
    { title: 'Demolición Completada', date: '2026-12-31' },
    { title: 'Estructura Lista', date: '2027-02-15' },
    { title: 'Inspección Final', date: '2027-03-25' },
    { title: 'Proyecto Finalizado', date: '2027-03-31' },
  ]

  for (const milestone of milestones) {
    await prisma.eventActivity.create({
      data: {
        tenantId: tenant.id,
        eventId: constructionEvent.id,
        title: milestone.title,
        activityType: ActivityType.MILESTONE,
        startDate: new Date(`${milestone.date}T10:00:00Z`),
        createdById: admin.id,
      },
    })
  }

  console.log(`✅ Event 5: Construction Project created`)

  // ── Create service orders and budget orders for all events ────────────────
  const events = [expoEvent, concertEvent, athleticsEvent, flagFootballEvent, constructionEvent]

  for (const event of events) {
    // Generate unique order number
    const orderNumber = `ORD-${event.code}-${Date.now()}`

    // Create a budget order for the event
    const budgetOrder = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        orderNumber,
        eventId: event.id,
        clientId: event.primaryClientId!,
        status: OrderStatus.QUOTED,
        pricingTier: 'EARLY',
        isBudgetOrder: true,
        createdById: admin.id,
        priceListId: event.priceListId || (await prisma.priceList.findFirst({ where: { tenantId: tenant.id } }))?.id!,
      },
    })

    console.log(`  ✓ Budget order created for ${event.name}`)
  }

  console.log('\n✨ All events with timelines, budgets, tasks, and service orders created successfully!')
}

seedEvents()
  .catch((e) => {
    console.error('❌ Error seeding events:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
