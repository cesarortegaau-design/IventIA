/**
 * expo-sf-data.ts
 * Datos completos para Expo Santa Fe 2026:
 *   - Clientes expositores
 *   - Recursos (consumable, furniture, equipment, service, personal, concept)
 *   - Lista de precios Expo 2026 (no-concepto) + Precio Expo 2026 Conceptos
 *   - Timeline de actividades con órdenes asignadas
 *   - Órdenes de servicio con partidas
 *   - Presupuesto con líneas de concepto y órdenes de presupuesto
 *   - Tareas colaborativas
 */
import {
  PrismaClient,
  EventStatus,
  OrderStatus,
  ActivityType,
  PricingTier,
} from 'prisma-generated'

const prisma = new PrismaClient()

// ─── helpers ────────────────────────────────────────────────────────────────
const dt = (s: string) => new Date(s)

async function seedExpoSF() {
  console.log('\n🎪  Expo Santa Fe 2026 — seed completo\n')

  // ── Tenant / Admin ────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'expo-santa-fe' } })
  if (!tenant) throw new Error('Tenant not found – run db:seed first')

  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'ADMIN' } })
  if (!admin) throw new Error('Admin user not found')

  // ── 1. Clientes expositores ───────────────────────────────────────────────
  const clientsData = [
    { email: 'expositores@grupobimbo.com',       companyName: 'Grupo Bimbo',                        phone: '+52-55-5268-6600' },
    { email: 'eventos@femsa.com',                companyName: 'FEMSA Bebidas',                      phone: '+52-81-8328-6000' },
    { email: 'marketing@nestle.com.mx',          companyName: 'Nestlé México',                      phone: '+52-55-5328-6000' },
    { email: 'eventos@sigma-alimentos.com',      companyName: 'Sigma Alimentos',                    phone: '+52-81-8152-0400' },
    { email: 'contacto@amaiab.org',              companyName: 'AMAIAB – Asoc. Mexicana de Alimentos', phone: '+52-55-5201-9090' },
    { email: 'expositores@lacomer.com.mx',       companyName: 'La Comer / Fresko',                  phone: '+52-55-5723-5060' },
  ]

  const clients = await Promise.all(clientsData.map(async (d) => {
    const existing = await prisma.client.findFirst({ where: { tenantId: tenant.id, email: d.email } })
    return existing ?? prisma.client.create({
      data: { tenantId: tenant.id, personType: 'MORAL', companyName: d.companyName, email: d.email, phone: d.phone },
    })
  }))
  const [cBimbo, cFemsa, cNestle, cSigma, cAmaiab, cLaComer] = clients
  console.log(`✅  ${clients.length} clientes expositores`)

  // ── 2. Recursos ──────────────────────────────────────────────────────────
  // CONSUMABLE
  const consumables = await Promise.all([
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CON-CAFE-STA' } }, update: {}, create: { tenantId: tenant.id, code: 'CON-CAFE-STA', name: 'Estación de Café', type: 'CONSUMABLE', unit: 'servicio', stock: 20, stockLocation: 'Cocina', departmentId: 'dept-cocina-caliente', checkStock: true, portalVisible: true, portalDesc: 'Café, cappuccino y bebidas calientes variadas.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CON-AGUA-BOT' } }, update: {}, create: { tenantId: tenant.id, code: 'CON-AGUA-BOT', name: 'Agua Embotellada (caja 24 pzas)', type: 'CONSUMABLE', unit: 'caja', stock: 500, stockLocation: 'Almacén', departmentId: 'dept-cocina-fria', checkStock: true, portalVisible: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CON-BOTANA-EXP' } }, update: {}, create: { tenantId: tenant.id, code: 'CON-BOTANA-EXP', name: 'Botana Corporativa (bandeja)', type: 'CONSUMABLE', unit: 'bandeja', stock: 200, stockLocation: 'Cocina', departmentId: 'dept-cocina-fria', checkStock: true, portalVisible: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CON-BOLSA-EXP' } }, update: {}, create: { tenantId: tenant.id, code: 'CON-BOLSA-EXP', name: 'Bolsa de Bienvenida Expositor', type: 'CONSUMABLE', unit: 'pza', stock: 1000, stockLocation: 'Almacén', departmentId: 'dept-comercial', checkStock: true, portalVisible: true, portalDesc: 'Kit con programa, directorio y merchandising oficial.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CON-CREDENCIAL' } }, update: {}, create: { tenantId: tenant.id, code: 'CON-CREDENCIAL', name: 'Credencial de Acceso con Lanyard', type: 'CONSUMABLE', unit: 'pza', stock: 3000, stockLocation: 'Recepción', departmentId: 'dept-comercial', checkStock: true } }),
  ])

  // FURNITURE
  const furniture = await Promise.all([
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-MESA-REC' } }, update: {}, create: { tenantId: tenant.id, code: 'MOB-MESA-REC', name: 'Mesa de Recepción', type: 'FURNITURE', unit: 'pza', stock: 30, stockLocation: 'Bodega', departmentId: 'dept-operaciones-sf', checkStock: true, portalVisible: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-SILLA-CONF' } }, update: {}, create: { tenantId: tenant.id, code: 'MOB-SILLA-CONF', name: 'Silla de Conferencia', type: 'FURNITURE', unit: 'pza', stock: 600, stockLocation: 'Bodega', departmentId: 'dept-operaciones-sf', checkStock: true, portalVisible: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-STAND-3X3' } }, update: {}, create: { tenantId: tenant.id, code: 'MOB-STAND-3X3', name: 'Stand Modular 3×3 m', type: 'FURNITURE', unit: 'pza', stock: 120, stockLocation: 'Bodega', departmentId: 'dept-montaje', checkStock: true, portalVisible: true, portalDesc: 'Stand de aluminio y lona con iluminación LED básica.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-PODIO' } }, update: {}, create: { tenantId: tenant.id, code: 'MOB-PODIO', name: 'Podio de Presentación', type: 'FURNITURE', unit: 'pza', stock: 10, stockLocation: 'Bodega', departmentId: 'dept-operaciones-sf', checkStock: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-VITRINA-EXP' } }, update: {}, create: { tenantId: tenant.id, code: 'MOB-VITRINA-EXP', name: 'Vitrina de Exhibición 120 cm', type: 'FURNITURE', unit: 'pza', stock: 60, stockLocation: 'Bodega', departmentId: 'dept-montaje', checkStock: true, portalVisible: true, portalDesc: 'Vitrina de vidrio templado para exposición de productos.' } }),
  ])

  // EQUIPMENT
  const equipment = await Promise.all([
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-PANTALLA-LED' } }, update: {}, create: { tenantId: tenant.id, code: 'EQP-PANTALLA-LED', name: 'Pantalla LED 4×3 m', type: 'EQUIPMENT', unit: 'pza', stock: 8, stockLocation: 'Bodega AV', departmentId: 'dept-audioiluminacion', checkStock: true, portalVisible: true, portalDesc: 'Pantalla LED de alta resolución para presentaciones.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-IMPR-CRED' } }, update: {}, create: { tenantId: tenant.id, code: 'EQP-IMPR-CRED', name: 'Impresora de Credenciales', type: 'EQUIPMENT', unit: 'pza', stock: 6, stockLocation: 'Bodega AV', departmentId: 'dept-internet-sf', checkStock: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-RADIO-COM' } }, update: {}, create: { tenantId: tenant.id, code: 'EQP-RADIO-COM', name: 'Radio de Comunicación (Walkie-Talkie)', type: 'EQUIPMENT', unit: 'pza', stock: 40, stockLocation: 'Bodega Seguridad', departmentId: 'dept-seguridad', checkStock: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-CAMARA-PROF' } }, update: {}, create: { tenantId: tenant.id, code: 'EQP-CAMARA-PROF', name: 'Cámara Profesional + Trípode', type: 'EQUIPMENT', unit: 'kit', stock: 4, stockLocation: 'Bodega', departmentId: 'dept-comercial', checkStock: true } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-KIOSCO-DIG' } }, update: {}, create: { tenantId: tenant.id, code: 'EQP-KIOSCO-DIG', name: 'Kiosco Digital de Información', type: 'EQUIPMENT', unit: 'pza', stock: 10, stockLocation: 'Bodega AV', departmentId: 'dept-internet-sf', checkStock: true, portalVisible: true, portalDesc: 'Pantalla táctil con directorio de expositores.' } }),
  ])

  // SERVICE
  const services = await Promise.all([
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-REGISTRO-EXP' } }, update: {}, create: { tenantId: tenant.id, code: 'SVC-REGISTRO-EXP', name: 'Registro y Acreditación de Expositores', type: 'SERVICE', unit: 'evento', departmentId: 'dept-operaciones-sf', portalVisible: true, portalDesc: 'Servicio completo de credencialización y bienvenida.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-SEG-EXP' } }, update: {}, create: { tenantId: tenant.id, code: 'SVC-SEG-EXP', name: 'Seguridad Privada Expo', type: 'SERVICE', unit: 'turno', departmentId: 'dept-seguridad' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-DECORACION' } }, update: {}, create: { tenantId: tenant.id, code: 'SVC-DECORACION', name: 'Decoración Floral y Ambiental', type: 'SERVICE', unit: 'evento', departmentId: 'dept-operaciones-sf', portalVisible: true, portalDesc: 'Decoración integral del recinto con flores y ambientación.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-SHUTTLE' } }, update: {}, create: { tenantId: tenant.id, code: 'SVC-SHUTTLE', name: 'Shuttle / Transporte Ejecutivo', type: 'SERVICE', unit: 'turno', departmentId: 'dept-logistica', portalVisible: true, portalDesc: 'Transporte entre hotel y sede del evento.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-SOPORTE-TEC' } }, update: {}, create: { tenantId: tenant.id, code: 'SVC-SOPORTE-TEC', name: 'Soporte Técnico en Sitio', type: 'SERVICE', unit: 'hora', departmentId: 'dept-audioiluminacion', portalVisible: true } }),
  ])

  // PERSONAL
  const personal = await Promise.all([
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'PER-COORD' } }, update: {}, create: { tenantId: tenant.id, code: 'PER-COORD', name: 'Coordinador de Evento', type: 'PERSONAL', unit: 'día', departmentId: 'dept-operaciones-sf' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'PER-RECEP' } }, update: {}, create: { tenantId: tenant.id, code: 'PER-RECEP', name: 'Recepcionista Bilingüe', type: 'PERSONAL', unit: 'turno', departmentId: 'dept-comercial' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'PER-FOTO' } }, update: {}, create: { tenantId: tenant.id, code: 'PER-FOTO', name: 'Fotógrafo / Videógrafo', type: 'PERSONAL', unit: 'día', departmentId: 'dept-comercial', portalVisible: true, portalDesc: 'Cobertura fotográfica y videográfica profesional del evento.' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'PER-TEC-AV' } }, update: {}, create: { tenantId: tenant.id, code: 'PER-TEC-AV', name: 'Técnico AV', type: 'PERSONAL', unit: 'turno', departmentId: 'dept-audioiluminacion' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'PER-GUARDIA' } }, update: {}, create: { tenantId: tenant.id, code: 'PER-GUARDIA', name: 'Guardia de Seguridad', type: 'PERSONAL', unit: 'turno', departmentId: 'dept-seguridad' } }),
  ])

  // CONCEPT
  const concepts = await Promise.all([
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CONC-DISEÑO-STAND' } }, update: {}, create: { tenantId: tenant.id, code: 'CONC-DISEÑO-STAND', name: 'Diseño Gráfico de Stand', type: 'CONCEPT', unit: 'proyecto', departmentId: 'dept-comercial' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CONC-PERMISO' } }, update: {}, create: { tenantId: tenant.id, code: 'CONC-PERMISO', name: 'Permiso de Uso de Suelo', type: 'CONCEPT', unit: 'evento', departmentId: 'dept-comercial' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CONC-SEGURO-RC' } }, update: {}, create: { tenantId: tenant.id, code: 'CONC-SEGURO-RC', name: 'Seguro de Responsabilidad Civil', type: 'CONCEPT', unit: 'evento', departmentId: 'dept-comercial' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CONC-HONORARIOS' } }, update: {}, create: { tenantId: tenant.id, code: 'CONC-HONORARIOS', name: 'Honorarios de Coordinación General', type: 'CONCEPT', unit: 'evento', departmentId: 'dept-operaciones-sf' } }),
    prisma.resource.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'CONC-PUBLI-DIG' } }, update: {}, create: { tenantId: tenant.id, code: 'CONC-PUBLI-DIG', name: 'Publicidad Digital (RRSS + SEM)', type: 'CONCEPT', unit: 'campaña', departmentId: 'dept-comercial' } }),
  ])

  const [rCafeSta, rAgua, rBotana, rBolsa, rCredencial] = consumables
  const [rMesaRec, rSillaConf, rStand3x3, rPodio, rVitrina] = furniture
  const [rPantallaLed, rImprCred, rRadioCom, rCamaraProf, rKioscoDig] = equipment
  const [rRegistroExp, rSegExp, rDecoracion, rShuttle, rSoporteTec] = services
  const [rCoord, rRecep, rFoto, rTecAV, rGuardia] = personal
  const [rcDiseñoStand, rcPermiso, rcSeguroRC, rcHonorarios, rcPubliDig] = concepts

  console.log(`✅  Recursos: ${consumables.length} consumable, ${furniture.length} furniture, ${equipment.length} equipment, ${services.length} service, ${personal.length} personal, ${concepts.length} concept`)

  // ── 3. Lista de precios Precio Expo 2026 (no-concepto) ────────────────────
  let plExpo = await prisma.priceList.findFirst({ where: { tenantId: tenant.id, name: 'Precio Expo 2026' } })
  if (!plExpo) {
    plExpo = await prisma.priceList.create({
      data: { tenantId: tenant.id, name: 'Precio Expo 2026', earlyCutoff: dt('2026-06-30T23:59:59Z'), normalCutoff: dt('2026-08-31T23:59:59Z'), discountPct: 5 },
    })
  }

  // upsert-safe: add items only if they don't already exist
  const existingItems = await prisma.priceListItem.findMany({ where: { priceListId: plExpo.id }, select: { resourceId: true } })
  const existingResIds = new Set(existingItems.map(i => i.resourceId))

  const nonConceptItems: Array<{ resourceId: string; earlyPrice: number; normalPrice: number; latePrice: number; unit: string }> = [
    // Consumable
    { resourceId: rCafeSta.id,      earlyPrice: 1800,  normalPrice: 2200,  latePrice: 2800,  unit: 'servicio' },
    { resourceId: rAgua.id,         earlyPrice:  150,  normalPrice:  180,  latePrice:  220,  unit: 'caja' },
    { resourceId: rBotana.id,       earlyPrice:  350,  normalPrice:  420,  latePrice:  520,  unit: 'bandeja' },
    { resourceId: rBolsa.id,        earlyPrice:   80,  normalPrice:  100,  latePrice:  130,  unit: 'pza' },
    { resourceId: rCredencial.id,   earlyPrice:   15,  normalPrice:   20,  latePrice:   30,  unit: 'pza' },
    // Furniture
    { resourceId: rMesaRec.id,      earlyPrice:  800,  normalPrice: 1000,  latePrice: 1300,  unit: 'pza' },
    { resourceId: rSillaConf.id,    earlyPrice:   60,  normalPrice:   80,  latePrice:  100,  unit: 'pza' },
    { resourceId: rStand3x3.id,     earlyPrice: 8000,  normalPrice:10000,  latePrice:13000,  unit: 'pza' },
    { resourceId: rPodio.id,        earlyPrice: 1500,  normalPrice: 2000,  latePrice: 2500,  unit: 'pza' },
    { resourceId: rVitrina.id,      earlyPrice: 1200,  normalPrice: 1500,  latePrice: 2000,  unit: 'pza' },
    // Equipment
    { resourceId: rPantallaLed.id,  earlyPrice:12000,  normalPrice:15000,  latePrice:18000,  unit: 'pza' },
    { resourceId: rImprCred.id,     earlyPrice:  800,  normalPrice: 1000,  latePrice: 1200,  unit: 'pza' },
    { resourceId: rRadioCom.id,     earlyPrice:  200,  normalPrice:  250,  latePrice:  350,  unit: 'pza' },
    { resourceId: rCamaraProf.id,   earlyPrice: 3500,  normalPrice: 4500,  latePrice: 5500,  unit: 'kit' },
    { resourceId: rKioscoDig.id,    earlyPrice: 5000,  normalPrice: 6500,  latePrice: 8000,  unit: 'pza' },
    // Service
    { resourceId: rRegistroExp.id,  earlyPrice:15000,  normalPrice:18000,  latePrice:22000,  unit: 'evento' },
    { resourceId: rSegExp.id,       earlyPrice: 3500,  normalPrice: 4500,  latePrice: 5500,  unit: 'turno' },
    { resourceId: rDecoracion.id,   earlyPrice:12000,  normalPrice:15000,  latePrice:19000,  unit: 'evento' },
    { resourceId: rShuttle.id,      earlyPrice: 2500,  normalPrice: 3200,  latePrice: 4000,  unit: 'turno' },
    { resourceId: rSoporteTec.id,   earlyPrice:  800,  normalPrice: 1000,  latePrice: 1300,  unit: 'hora' },
    // Personal
    { resourceId: rCoord.id,        earlyPrice: 2800,  normalPrice: 3500,  latePrice: 4500,  unit: 'día' },
    { resourceId: rRecep.id,        earlyPrice:  900,  normalPrice: 1100,  latePrice: 1400,  unit: 'turno' },
    { resourceId: rFoto.id,         earlyPrice: 4500,  normalPrice: 5500,  latePrice: 7000,  unit: 'día' },
    { resourceId: rTecAV.id,        earlyPrice: 1200,  normalPrice: 1500,  latePrice: 2000,  unit: 'turno' },
    { resourceId: rGuardia.id,      earlyPrice:  800,  normalPrice: 1000,  latePrice: 1300,  unit: 'turno' },
  ]

  await Promise.all(
    nonConceptItems
      .filter(i => !existingResIds.has(i.resourceId))
      .map(i => prisma.priceListItem.create({ data: { priceListId: plExpo.id, ...i } }))
  )
  console.log(`✅  Lista de precios: Precio Expo 2026 (${nonConceptItems.length} recursos)`)

  // ── 4. Lista de precios conceptos ────────────────────────────────────────
  let plConceptos = await prisma.priceList.findFirst({ where: { tenantId: tenant.id, name: 'Precio Expo 2026 Conceptos' } })
  if (!plConceptos) {
    plConceptos = await prisma.priceList.create({
      data: { tenantId: tenant.id, name: 'Precio Expo 2026 Conceptos', earlyCutoff: dt('2026-06-30T23:59:59Z'), normalCutoff: dt('2026-08-31T23:59:59Z'), discountPct: 0, isConceptList: true },
    })
  }

  const existingConceptItems = await prisma.priceListItem.findMany({ where: { priceListId: plConceptos.id }, select: { resourceId: true } })
  const existingConceptResIds = new Set(existingConceptItems.map(i => i.resourceId))

  const conceptItems = [
    { resourceId: rcDiseñoStand.id, earlyPrice: 5000,  normalPrice: 7000,  latePrice:  9000, unit: 'proyecto' },
    { resourceId: rcPermiso.id,     earlyPrice: 3000,  normalPrice: 3500,  latePrice:  4500, unit: 'evento' },
    { resourceId: rcSeguroRC.id,    earlyPrice: 8000,  normalPrice:10000,  latePrice: 13000, unit: 'evento' },
    { resourceId: rcHonorarios.id,  earlyPrice:25000,  normalPrice:32000,  latePrice: 40000, unit: 'evento' },
    { resourceId: rcPubliDig.id,    earlyPrice:15000,  normalPrice:20000,  latePrice: 25000, unit: 'campaña' },
  ]

  await Promise.all(
    conceptItems
      .filter(i => !existingConceptResIds.has(i.resourceId))
      .map(i => prisma.priceListItem.create({ data: { priceListId: plConceptos.id, ...i } }))
  )
  console.log(`✅  Lista de precios: Precio Expo 2026 Conceptos (${conceptItems.length} conceptos)`)

  // ── 5. Evento EXPO-SF-2026 ─────────────────────────────────────────────────
  const expoEvent = await prisma.event.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'EXPO-SF-2026' } },
    update: {
      name: 'Expo Santa Fe 2026',
      description: 'Feria B2B y consumidor final de la industria de alimentos y bebidas en México.',
      status: EventStatus.CONFIRMED,
      priceListId: plExpo.id,
      primaryClientId: cAmaiab.id,
      venueLocation: 'Centro Citibanamex, Av. del Conscripto 311, Lomas de Sotelo, CDMX',
    },
    create: {
      tenantId: tenant.id,
      code: 'EXPO-SF-2026',
      name: 'Expo Santa Fe 2026',
      description: 'Feria B2B y consumidor final de la industria de alimentos y bebidas en México.',
      eventType: 'EXPOSITION',
      status: EventStatus.CONFIRMED,
      primaryClientId: cAmaiab.id,
      priceListId: plExpo.id,
      setupStart:    dt('2026-09-14T06:00:00Z'),
      setupEnd:      dt('2026-09-14T22:00:00Z'),
      eventStart:    dt('2026-09-15T08:00:00Z'),
      eventEnd:      dt('2026-09-20T22:00:00Z'),
      teardownStart: dt('2026-09-20T18:00:00Z'),
      teardownEnd:   dt('2026-09-21T04:00:00Z'),
      venueLocation: 'Centro Citibanamex, Av. del Conscripto 311, Lomas de Sotelo, CDMX',
      coordinator: 'Alejandra Montes',
      executive: 'Roberto Sandoval',
      expectedAttendance: 8000,
      createdById: admin.id,
    },
  })
  console.log(`✅  Evento: ${expoEvent.name}`)

  // limpieza previa para idempotencia
  await prisma.eventActivityOrder.deleteMany({ where: { activity: { eventId: expoEvent.id } } })
  await prisma.eventActivityDepartment.deleteMany({ where: { activity: { eventId: expoEvent.id } } })
  await prisma.eventActivity.deleteMany({ where: { eventId: expoEvent.id } })
  await prisma.orderLineItem.deleteMany({ where: { order: { eventId: expoEvent.id } } })
  await prisma.budgetLine.deleteMany({ where: { budget: { eventId: expoEvent.id } } })
  await prisma.budget.deleteMany({ where: { eventId: expoEvent.id } })
  await prisma.order.deleteMany({ where: { eventId: expoEvent.id } })
  await prisma.collabTask.deleteMany({ where: { eventId: expoEvent.id } })

  // ── 6. Órdenes de servicio con partidas ──────────────────────────────────
  type OLI = { resourceId: string; description: string; unitPrice: number; quantity: number }

  function buildOrder(lines: OLI[]) {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
    const taxAmount = Math.round(subtotal * 0.16 * 100) / 100
    return { subtotal, taxAmount, total: subtotal + taxAmount, lines }
  }

  // Orden 1 – Producción General (AMAIAB)
  const o1 = buildOrder([
    { resourceId: rRegistroExp.id,  description: 'Registro y acreditación completa del evento', unitPrice: 18000, quantity: 1 },
    { resourceId: rDecoracion.id,   description: 'Decoración floral y ambiental del recinto',   unitPrice: 15000, quantity: 1 },
    { resourceId: rSoporteTec.id,   description: 'Soporte técnico en sitio',                    unitPrice: 1000,  quantity: 8 },
    { resourceId: rCoord.id,        description: 'Coordinador de evento – 7 días',              unitPrice: 3500,  quantity: 7 },
  ])
  const ord1 = await prisma.order.create({ data: { tenantId: tenant.id, orderNumber: `ORD-EXPSF26-001`, eventId: expoEvent.id, clientId: cAmaiab.id, priceListId: plExpo.id, status: OrderStatus.CONFIRMED, pricingTier: PricingTier.NORMAL, subtotal: o1.subtotal, taxAmount: o1.taxAmount, total: o1.total, notes: 'Servicios de producción y coordinación general del evento', createdById: admin.id } })
  await Promise.all(o1.lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ord1.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  // Orden 2 – Stands Grupo Bimbo
  const o2 = buildOrder([
    { resourceId: rStand3x3.id,    description: 'Stand modular 3×3 m – Grupo Bimbo',  unitPrice: 10000, quantity: 4 },
    { resourceId: rVitrina.id,     description: 'Vitrina de exhibición de productos',   unitPrice: 1500,  quantity: 4 },
    { resourceId: rPantallaLed.id, description: 'Pantalla LED 4×3 m para stand',       unitPrice: 15000, quantity: 1 },
    { resourceId: rSillaConf.id,   description: 'Sillas de conferencia',                unitPrice: 80,    quantity: 12 },
  ])
  const ord2 = await prisma.order.create({ data: { tenantId: tenant.id, orderNumber: `ORD-EXPSF26-002`, eventId: expoEvent.id, clientId: cBimbo.id, priceListId: plExpo.id, status: OrderStatus.CONFIRMED, pricingTier: PricingTier.NORMAL, subtotal: o2.subtotal, taxAmount: o2.taxAmount, total: o2.total, notes: 'Equipamiento de stand Grupo Bimbo', createdById: admin.id } })
  await Promise.all(o2.lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ord2.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  // Orden 3 – Catering Q Alimentos
  const clientQAlimentos = await prisma.client.findFirst({ where: { tenantId: tenant.id, email: 'contacto@qalimentos.com' } }) ?? cAmaiab
  const o3 = buildOrder([
    { resourceId: rCafeSta.id,   description: 'Estaciones de café para toda la expo',   unitPrice: 2200,  quantity: 6 },
    { resourceId: rAgua.id,      description: 'Agua embotellada – cajas',                unitPrice: 180,   quantity: 30 },
    { resourceId: rBotana.id,    description: 'Bandejas de botana corporativa',          unitPrice: 420,   quantity: 60 },
    { resourceId: rBolsa.id,     description: 'Bolsas de bienvenida para expositores',   unitPrice: 100,   quantity: 300 },
    { resourceId: rCredencial.id,description: 'Credenciales de acceso con lanyard',      unitPrice: 20,    quantity: 600 },
  ])
  const ord3 = await prisma.order.create({ data: { tenantId: tenant.id, orderNumber: `ORD-EXPSF26-003`, eventId: expoEvent.id, clientId: clientQAlimentos.id, priceListId: plExpo.id, status: OrderStatus.CONFIRMED, pricingTier: PricingTier.NORMAL, subtotal: o3.subtotal, taxAmount: o3.taxAmount, total: o3.total, notes: 'Catering y consumibles del evento', createdById: admin.id } })
  await Promise.all(o3.lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ord3.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  // Orden 4 – Seguridad y Personal (AMAIAB)
  const o4 = buildOrder([
    { resourceId: rGuardia.id,  description: 'Guardias de seguridad – turnos diurnos',  unitPrice: 1000,  quantity: 12 },
    { resourceId: rSegExp.id,   description: 'Seguridad privada especializada expo',     unitPrice: 4500,  quantity: 6 },
    { resourceId: rRecep.id,    description: 'Recepcionistas bilingües',                 unitPrice: 1100,  quantity: 12 },
    { resourceId: rFoto.id,     description: 'Fotógrafo / videógrafo – cobertura 2 días',unitPrice: 5500,  quantity: 2 },
    { resourceId: rTecAV.id,    description: 'Técnicos AV durante el evento',            unitPrice: 1500,  quantity: 6 },
    { resourceId: rRadioCom.id, description: 'Radios de comunicación para staff',        unitPrice: 250,   quantity: 20 },
  ])
  const ord4 = await prisma.order.create({ data: { tenantId: tenant.id, orderNumber: `ORD-EXPSF26-004`, eventId: expoEvent.id, clientId: cAmaiab.id, priceListId: plExpo.id, status: OrderStatus.CONFIRMED, pricingTier: PricingTier.NORMAL, subtotal: o4.subtotal, taxAmount: o4.taxAmount, total: o4.total, notes: 'Personal y seguridad del evento', createdById: admin.id } })
  await Promise.all(o4.lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ord4.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  // Orden 5 – Stand + Tecnología FEMSA
  const o5 = buildOrder([
    { resourceId: rStand3x3.id,    description: 'Stand modular 3×3 m – FEMSA Bebidas',  unitPrice: 10000, quantity: 6 },
    { resourceId: rMesaRec.id,     description: 'Mesas de recepción de stand',           unitPrice: 1000,  quantity: 3 },
    { resourceId: rKioscoDig.id,   description: 'Kioscos digitales interactivos',         unitPrice: 6500,  quantity: 2 },
    { resourceId: rImprCred.id,    description: 'Impresora de credenciales en stand',     unitPrice: 1000,  quantity: 1 },
  ])
  const ord5 = await prisma.order.create({ data: { tenantId: tenant.id, orderNumber: `ORD-EXPSF26-005`, eventId: expoEvent.id, clientId: cFemsa.id, priceListId: plExpo.id, status: OrderStatus.CONFIRMED, pricingTier: PricingTier.NORMAL, subtotal: o5.subtotal, taxAmount: o5.taxAmount, total: o5.total, notes: 'Stand y equipo tecnológico FEMSA', createdById: admin.id } })
  await Promise.all(o5.lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ord5.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  // Orden 6 – Stand Nestlé
  const o6 = buildOrder([
    { resourceId: rStand3x3.id,  description: 'Stand modular 3×3 m – Nestlé México',    unitPrice: 10000, quantity: 3 },
    { resourceId: rVitrina.id,   description: 'Vitrinas de exhibición de productos',      unitPrice: 1500,  quantity: 4 },
    { resourceId: rPodio.id,     description: 'Podio para presentaciones de marca',       unitPrice: 2000,  quantity: 1 },
    { resourceId: rShuttle.id,   description: 'Servicio de shuttle para equipo Nestlé',   unitPrice: 3200,  quantity: 2 },
  ])
  const ord6 = await prisma.order.create({ data: { tenantId: tenant.id, orderNumber: `ORD-EXPSF26-006`, eventId: expoEvent.id, clientId: cNestle.id, priceListId: plExpo.id, status: OrderStatus.QUOTED, pricingTier: PricingTier.NORMAL, subtotal: o6.subtotal, taxAmount: o6.taxAmount, total: o6.total, notes: 'Stand y servicios Nestlé México', createdById: admin.id } })
  await Promise.all(o6.lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ord6.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  console.log(`✅  6 órdenes de servicio creadas`)

  // ── 7. Timeline de actividades con órdenes y departamentos ────────────────
  type ActDef = {
    title: string; description: string; type: ActivityType; priority?: string
    start: string; end: string; depts: string[]; orders?: string[]
  }

  const acts: ActDef[] = [
    // SETUP
    { title: 'Recepción y Verificación de Equipos',       description: 'Recepción de mobiliario, stands y equipos AV en andenes de carga.',                    type: ActivityType.LOGISTICS,  priority: 'HIGH',     start: '2026-09-14T06:00:00Z', end: '2026-09-14T12:00:00Z', depts: ['dept-logistica', 'dept-operaciones-sf'], orders: [ord1.id] },
    { title: 'Montaje de Stands y Estructuras',           description: 'Armado e instalación de stands modulares en planta del recinto.',                      type: ActivityType.LOGISTICS,  priority: 'CRITICAL', start: '2026-09-14T08:00:00Z', end: '2026-09-14T20:00:00Z', depts: ['dept-montaje'],                          orders: [ord2.id, ord5.id, ord6.id] },
    { title: 'Instalación de Equipos AV y LED',          description: 'Montaje, cableado y prueba de pantallas LED, audio y luces.',                           type: ActivityType.TECHNICAL,  priority: 'HIGH',     start: '2026-09-14T10:00:00Z', end: '2026-09-14T18:00:00Z', depts: ['dept-audioiluminacion'],                 orders: [ord4.id] },
    { title: 'Acreditación y Registro de Expositores',   description: 'Apertura del módulo de registro; entrega de credenciales y bolsas de bienvenida.',      type: ActivityType.LOGISTICS,  priority: 'HIGH',     start: '2026-09-14T14:00:00Z', end: '2026-09-14T22:00:00Z', depts: ['dept-comercial', 'dept-operaciones-sf'], orders: [ord1.id, ord3.id] },
    // DÍA 1
    { title: 'Ceremonia de Inauguración Oficial',         description: 'Apertura oficial con autoridades, directivos y prensa especializada.',                   type: ActivityType.MEETING,    priority: 'CRITICAL', start: '2026-09-15T10:00:00Z', end: '2026-09-15T12:00:00Z', depts: ['dept-operaciones-sf', 'dept-comercial'],  orders: [ord1.id, ord4.id] },
    { title: 'Cóctel de Bienvenida a Expositores',        description: 'Networking y catering de bienvenida exclusivo para expositores.',                       type: ActivityType.CATERING,   priority: 'MEDIUM',   start: '2026-09-15T12:30:00Z', end: '2026-09-15T14:00:00Z', depts: ['dept-cocina-caliente', 'dept-cocina-fria'], orders: [ord3.id] },
    { title: 'Conferencia Magistral: Innovación Alimentaria', description: 'Tendencias e innovación en la industria de alimentos y bebidas en México.',          type: ActivityType.MEETING,    priority: 'HIGH',     start: '2026-09-15T16:00:00Z', end: '2026-09-15T18:00:00Z', depts: ['dept-comercial'],                         orders: [ord1.id] },
    // DÍA 2
    { title: 'Ronda de Negocios B2B',                    description: 'Sesiones de citas preagendadas entre compradores y proveedores.',                       type: ActivityType.MEETING,    priority: 'HIGH',     start: '2026-09-16T09:00:00Z', end: '2026-09-16T14:00:00Z', depts: ['dept-comercial', 'dept-operaciones-sf'],  orders: [ord1.id] },
    { title: 'Demo de Nuevos Productos – Área Central',  description: 'Demostraciones en vivo de productos de los expositores principales.',                   type: ActivityType.LOGISTICS,  priority: 'MEDIUM',   start: '2026-09-16T10:00:00Z', end: '2026-09-16T18:00:00Z', depts: ['dept-operaciones-sf'],                   orders: [ord2.id, ord5.id] },
    { title: 'Servicio de Catering – Almuerzo Día 2',   description: 'Servicio de catering para expositores y visitantes VIP.',                               type: ActivityType.CATERING,   priority: 'MEDIUM',   start: '2026-09-16T13:30:00Z', end: '2026-09-16T15:00:00Z', depts: ['dept-cocina-caliente', 'dept-cocina-fria'], orders: [ord3.id] },
    // DÍA 3
    { title: 'Panel de Industria: Tendencias Retail',    description: 'Mesa redonda con directivos de las principales cadenas de distribución.',               type: ActivityType.MEETING,    priority: 'HIGH',     start: '2026-09-17T10:00:00Z', end: '2026-09-17T12:00:00Z', depts: ['dept-comercial'],                         orders: [ord1.id] },
    { title: 'Cóctel de Networking Ejecutivo',           description: 'Networking nocturno exclusivo para directores y compradores.',                          type: ActivityType.CATERING,   priority: 'HIGH',     start: '2026-09-17T19:00:00Z', end: '2026-09-17T22:00:00Z', depts: ['dept-cocina-caliente', 'dept-comercial'],  orders: [ord3.id, ord4.id] },
    // DÍA 4
    { title: 'Foro de Proveedores y Distribuidores',     description: 'Foro abierto para proveedores de insumos, logística y tecnología.',                    type: ActivityType.MEETING,    priority: 'MEDIUM',   start: '2026-09-18T09:00:00Z', end: '2026-09-18T12:00:00Z', depts: ['dept-comercial'],                         orders: [ord1.id] },
    { title: 'Presentaciones de Nuevos Productos',       description: 'Lanzamientos oficiales en escenario principal con cobertura de prensa.',                type: ActivityType.MEETING,    priority: 'HIGH',     start: '2026-09-18T14:00:00Z', end: '2026-09-18T17:00:00Z', depts: ['dept-comercial', 'dept-operaciones-sf'],  orders: [ord2.id, ord5.id, ord6.id] },
    // DÍA 5
    { title: 'Rueda de Prensa',                          description: 'Conferencia de prensa con organizadores y expositores principales.',                    type: ActivityType.MEETING,    priority: 'HIGH',     start: '2026-09-19T10:00:00Z', end: '2026-09-19T11:30:00Z', depts: ['dept-comercial'],                         orders: [ord4.id] },
    { title: 'Tour de Instalaciones – Shuttle',          description: 'Traslado guiado a instalaciones destacadas del recinto para compradores VIP.',          type: ActivityType.LOGISTICS,  priority: 'LOW',      start: '2026-09-19T14:00:00Z', end: '2026-09-19T17:00:00Z', depts: ['dept-logistica'],                         orders: [ord6.id] },
    // DÍA 6
    { title: 'Gala de Clausura y Reconocimientos',       description: 'Ceremonia de cierre con premiación a mejores expositores y networking de gala.',        type: ActivityType.MEETING,    priority: 'CRITICAL', start: '2026-09-20T18:00:00Z', end: '2026-09-20T22:00:00Z', depts: ['dept-operaciones-sf', 'dept-comercial'],  orders: [ord1.id, ord3.id, ord4.id] },
    // TEARDOWN
    { title: 'Desmontaje de Stands y Mobiliario',        description: 'Retiro y empaque de toda la estructura expositiva.',                                    type: ActivityType.LOGISTICS,  priority: 'HIGH',     start: '2026-09-20T18:00:00Z', end: '2026-09-21T02:00:00Z', depts: ['dept-montaje', 'dept-logistica'],         orders: [] },
    { title: 'Limpieza General del Recinto',             description: 'Limpieza profunda y entrega de instalaciones al venue.',                               type: ActivityType.LOGISTICS,  priority: 'MEDIUM',   start: '2026-09-20T20:00:00Z', end: '2026-09-21T04:00:00Z', depts: ['dept-limpieza-sf'],                       orders: [] },
  ]

  const priorityMap: Record<string, string> = { CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' }

  for (const a of acts) {
    const act = await prisma.eventActivity.create({
      data: {
        tenantId:     tenant.id,
        eventId:      expoEvent.id,
        title:        a.title,
        description:  a.description,
        activityType: a.type,
        priority:     (priorityMap[a.priority ?? 'MEDIUM'] as any) ?? 'MEDIUM',
        status:       'PENDING',
        startDate:    dt(a.start),
        endDate:      dt(a.end),
        createdById:  admin.id,
      },
    })
    // departments
    await Promise.all(a.depts.map(dId =>
      prisma.eventActivityDepartment.create({ data: { activityId: act.id, departmentId: dId } })
    ))
    // orders
    if (a.orders?.length) {
      await Promise.all((a.orders as string[]).map(oId =>
        prisma.eventActivityOrder.create({ data: { activityId: act.id, orderId: oId } })
      ))
    }
  }
  console.log(`✅  ${acts.length} actividades de timeline creadas y vinculadas`)

  // ── 8. Presupuesto con lista de precios de conceptos ──────────────────────
  // Órdenes de presupuesto (concepto)
  const ob1Lines = [
    { resourceId: rcDiseñoStand.id, description: 'Diseño gráfico de stands principales',    unitPrice: 7000,  quantity: 1 },
    { resourceId: rcPermiso.id,     description: 'Permiso de uso de suelo – Recinto',       unitPrice: 3500,  quantity: 1 },
    { resourceId: rcSeguroRC.id,    description: 'Seguro de responsabilidad civil del evento',unitPrice:10000, quantity: 1 },
  ]
  const ob1Sub = ob1Lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const ordBudget1 = await prisma.order.create({
    data: { tenantId: tenant.id, orderNumber: 'ORD-EXPSF26-BP1', eventId: expoEvent.id, clientId: cAmaiab.id, priceListId: plConceptos.id, status: OrderStatus.QUOTED, pricingTier: PricingTier.NORMAL, isBudgetOrder: true, subtotal: ob1Sub, taxAmount: Math.round(ob1Sub * 0.16 * 100) / 100, total: ob1Sub + Math.round(ob1Sub * 0.16 * 100) / 100, notes: 'Presupuesto de conceptos – Permisos y diseño', createdById: admin.id },
  })
  await Promise.all(ob1Lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ordBudget1.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  const ob2Lines = [
    { resourceId: rcHonorarios.id, description: 'Honorarios de coordinación general del evento', unitPrice: 32000, quantity: 1 },
    { resourceId: rcPubliDig.id,   description: 'Campaña de publicidad digital RRSS + SEM',      unitPrice: 20000, quantity: 1 },
  ]
  const ob2Sub = ob2Lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const ordBudget2 = await prisma.order.create({
    data: { tenantId: tenant.id, orderNumber: 'ORD-EXPSF26-BP2', eventId: expoEvent.id, clientId: cAmaiab.id, priceListId: plConceptos.id, status: OrderStatus.QUOTED, pricingTier: PricingTier.NORMAL, isBudgetOrder: true, subtotal: ob2Sub, taxAmount: Math.round(ob2Sub * 0.16 * 100) / 100, total: ob2Sub + Math.round(ob2Sub * 0.16 * 100) / 100, notes: 'Presupuesto de conceptos – Coordinación y publicidad', createdById: admin.id },
  })
  await Promise.all(ob2Lines.map((l, i) => prisma.orderLineItem.create({ data: { orderId: ordBudget2.id, resourceId: l.resourceId, description: l.description, pricingTier: PricingTier.NORMAL, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity, sortOrder: i } })))

  // Presupuesto principal
  const budget = await prisma.budget.create({
    data: { tenantId: tenant.id, eventId: expoEvent.id, priceListId: plConceptos.id, name: 'Presupuesto Expo SF 2026', notes: 'Presupuesto base de conceptos para planificación financiera del evento.', createdById: admin.id },
  })

  const budgetLines = [
    { resourceId: rcDiseñoStand.id, description: 'Diseño gráfico de stands',          directCost: 5000,  income: 7000,  indirectCost: 500,  utility: 1500, sortOrder: 1, orderId: ordBudget1.id },
    { resourceId: rcPermiso.id,     description: 'Permiso de uso de suelo',           directCost: 3200,  income: 3500,  indirectCost: 200,  utility: 100,  sortOrder: 2, orderId: ordBudget1.id },
    { resourceId: rcSeguroRC.id,    description: 'Seguro de responsabilidad civil',   directCost: 9000,  income: 10000, indirectCost: 0,    utility: 1000, sortOrder: 3, orderId: ordBudget1.id },
    { resourceId: rcHonorarios.id,  description: 'Honorarios de coordinación',       directCost: 28000, income: 32000, indirectCost: 3000, utility: 1000, sortOrder: 4, orderId: ordBudget2.id },
    { resourceId: rcPubliDig.id,    description: 'Publicidad digital RRSS + SEM',    directCost: 18000, income: 20000, indirectCost: 2000, utility: 0,    sortOrder: 5, orderId: ordBudget2.id },
  ]

  for (const bl of budgetLines) {
    const line = await prisma.budgetLine.create({
      data: { budgetId: budget.id, resourceId: bl.resourceId, description: bl.description, directCost: bl.directCost, income: bl.income, indirectCost: bl.indirectCost, utility: bl.utility, sortOrder: bl.sortOrder },
    })
    await prisma.budgetLineDirectOrder.create({ data: { budgetLineId: line.id, orderId: bl.orderId } })
  }
  console.log(`✅  Presupuesto "${budget.name}" con ${budgetLines.length} líneas y 2 órdenes de presupuesto`)

  // ── 9. Tareas colaborativas ───────────────────────────────────────────────
  type TaskDef = { title: string; description: string; priority: string; status: string; start: string; end: string; depts: string[] }

  const tasks: TaskDef[] = [
    { title: 'Confirmar lista de expositores inscritos',       description: 'Verificar el padrón oficial de empresas confirmadas y pendientes de pago.',              priority: 'HIGH',     status: 'PENDING',      start: '2026-08-01T00:00:00Z', end: '2026-08-20T23:59:59Z', depts: ['dept-comercial'] },
    { title: 'Enviar kits y credenciales a expositores',       description: 'Producción y envío de bolsas de bienvenida, credenciales y pases de acceso.',             priority: 'HIGH',     status: 'PENDING',      start: '2026-08-21T00:00:00Z', end: '2026-09-07T23:59:59Z', depts: ['dept-comercial', 'dept-operaciones-sf'] },
    { title: 'Coordinar acceso de proveedores y transportistas', description: 'Definir ventanas horarias, rutas de acceso y asignación de andenes de carga.',          priority: 'MEDIUM',   status: 'PENDING',      start: '2026-09-01T00:00:00Z', end: '2026-09-13T23:59:59Z', depts: ['dept-logistica', 'dept-operaciones-sf'] },
    { title: 'Revisión técnica de equipos AV y LED',           description: 'Prueba y calibración de pantallas, audio y sistemas de iluminación.',                    priority: 'HIGH',     status: 'PENDING',      start: '2026-09-13T08:00:00Z', end: '2026-09-14T18:00:00Z', depts: ['dept-audioiluminacion'] },
    { title: 'Checklist de montaje de stands',                 description: 'Supervisar que cada stand cumpla especificaciones técnicas y de branding.',               priority: 'HIGH',     status: 'PENDING',      start: '2026-09-14T08:00:00Z', end: '2026-09-14T22:00:00Z', depts: ['dept-montaje', 'dept-operaciones-sf'] },
    { title: 'Confirmar menú y logística de catering',         description: 'Validar cantidades, alergenos y tiempos de servicio con el equipo de cocina.',            priority: 'MEDIUM',   status: 'IN_PROGRESS',  start: '2026-08-15T00:00:00Z', end: '2026-09-14T23:59:59Z', depts: ['dept-cocina-caliente', 'dept-cocina-fria'] },
    { title: 'Preparar programa oficial y difundir a medios',  description: 'Redacción, diseño y distribución del programa de actividades a prensa y medios.',        priority: 'MEDIUM',   status: 'IN_PROGRESS',  start: '2026-08-01T00:00:00Z', end: '2026-09-01T23:59:59Z', depts: ['dept-comercial'] },
    { title: 'Gestionar acreditaciones de prensa',             description: 'Recibir solicitudes y emitir credenciales de prensa con acceso especial.',               priority: 'MEDIUM',   status: 'PENDING',      start: '2026-09-01T00:00:00Z', end: '2026-09-14T23:59:59Z', depts: ['dept-comercial'] },
    { title: 'Supervisión de seguridad y accesos – Operativo', description: 'Coordinar turnos de guardias, puntos de acceso y protocolos de emergencia.',             priority: 'CRITICAL', status: 'PENDING',      start: '2026-09-14T06:00:00Z', end: '2026-09-21T04:00:00Z', depts: ['dept-seguridad', 'dept-operaciones-sf'] },
    { title: 'Informe post-evento y métricas',                 description: 'Elaborar reporte de asistencia, satisfacción de expositores y cierre financiero.',       priority: 'LOW',      status: 'PENDING',      start: '2026-09-21T00:00:00Z', end: '2026-10-05T23:59:59Z', depts: ['dept-comercial', 'dept-operaciones-sf'] },
  ]

  for (const t of tasks) {
    const task = await prisma.collabTask.create({
      data: {
        tenantId:    tenant.id,
        eventId:     expoEvent.id,
        title:       t.title,
        description: t.description,
        priority:    t.priority as any,
        status:      t.status as any,
        startDate:   dt(t.start),
        endDate:     dt(t.end),
        createdById: admin.id,
      },
    })
    await Promise.all(t.depts.map(dId =>
      prisma.collabTaskDepartment.create({ data: { taskId: task.id, departmentId: dId } })
    ))
  }
  console.log(`✅  ${tasks.length} tareas colaborativas creadas`)

  console.log(`\n🎉  Expo Santa Fe 2026 — datos completos listos`)
  console.log(`   Evento:      ${expoEvent.name}`)
  console.log(`   Actividades: ${acts.length}`)
  console.log(`   Órdenes:     6 servicio + 2 presupuesto`)
  console.log(`   Presupuesto: Presupuesto Expo SF 2026 (5 líneas)`)
  console.log(`   Tareas:      ${tasks.length}`)
  console.log(`   Clientes:    ${clients.length} nuevos expositores`)
}

seedExpoSF()
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
