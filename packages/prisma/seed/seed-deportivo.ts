/**
 * seed-deportivo.ts
 * Seed integral para eventos de carreras deportivas (maratón, 10K, Ironman, Spartan).
 * Run: cd packages/prisma && npx ts-node seed/seed-deportivo.ts
 */
import { PrismaClient } from 'prisma-generated'

const prisma = new PrismaClient()

// ─── Fixed IDs ────────────────────────────────────────────────────────────────
const TENANT_SLUG = 'expo-santa-fe'
const ADMIN_EMAIL = 'admin@exposaantafe.com.mx'

// Concept resource IDs
const C = {
  infraestructura: 'res-dep-con-infraestructura',
  cronometraje:    'res-dep-con-cronometraje',
  seguridad:       'res-dep-con-seguridad',
  hidratacion:     'res-dep-con-hidratacion',
  marketing:       'res-dep-con-marketing',
  premiacion:      'res-dep-con-premiacion',
  audiovisual:     'res-dep-con-audiovisual',
  permisos:        'res-dep-con-permisos',
  voluntariado:    'res-dep-con-voluntariado',
  expo_meta:       'res-dep-con-expo-meta',
}

// Production resource IDs
const P = {
  // EQUIPMENT
  arco_meta:       'res-dep-eq-arco-meta',
  arco_km:         'res-dep-eq-arco-km',
  chip_timing:     'res-dep-eq-chip-timing',
  barrera_jersey:  'res-dep-eq-barrera-jersey',
  valla_metalica:  'res-dep-eq-valla-metalica',
  generador:       'res-dep-eq-generador',
  pantalla_led:    'res-dep-eq-pantalla-led',
  sistema_sonido:  'res-dep-eq-sistema-sonido',
  radio_comunicacion: 'res-dep-eq-radio',
  // SERVICE
  svc_cronometraje: 'res-dep-svc-cronometraje',
  svc_streaming:   'res-dep-svc-streaming',
  svc_fotografia:  'res-dep-svc-fotografia',
  svc_primeros:    'res-dep-svc-primeros-auxilios',
  svc_transporte:  'res-dep-svc-transporte',
  svc_limpieza:    'res-dep-svc-limpieza',
  // PERSONAL
  pers_coordinador: 'res-dep-pers-coordinador',
  pers_juez:       'res-dep-pers-juez',
  pers_guia_bici:  'res-dep-pers-guia-bici',
  pers_hidratacion: 'res-dep-pers-hidratacion',
  pers_voluntario: 'res-dep-pers-voluntario',
  // FURNITURE / consumable
  mob_carpa:       'res-dep-mob-carpa',
  mob_mesa:        'res-dep-mob-mesa',
  mob_bano:        'res-dep-mob-bano',
  mob_valla_crowd: 'res-dep-mob-valla-crowd',
}

// Price lists
const PL_CONCEPT = 'pl-deportivo-conceptos-2026'
const PL_PROD    = 'pl-deportivo-produccion-2026'

// Client
const CLIENT_ID  = 'client-deportivo-cdmx'

// Events
const EV = {
  maraton:  'event-maraton-cdmx-2026',
  spartan:  'event-spartan-teotihuacan-2026',
}

// Budgets
const BUD = {
  maraton: 'budget-maraton-2026',
  spartan: 'budget-spartan-2026',
}

// Budget lines — maratón
const BL_MAR = {
  infraestructura: 'bl-mar-infraestructura',
  cronometraje:    'bl-mar-cronometraje',
  seguridad:       'bl-mar-seguridad',
  hidratacion:     'bl-mar-hidratacion',
  marketing:       'bl-mar-marketing',
  premiacion:      'bl-mar-premiacion',
  audiovisual:     'bl-mar-audiovisual',
  permisos:        'bl-mar-permisos',
  voluntariado:    'bl-mar-voluntariado',
  expo_meta:       'bl-mar-expo-meta',
}

// Orders — maratón
const ORD_MAR = {
  infraestructura: 'ord-mar-infraestructura-001',
  cronometraje:    'ord-mar-cronometraje-001',
  seguridad:       'ord-mar-seguridad-001',
  hidratacion:     'ord-mar-hidratacion-001',
  marketing:       'ord-mar-marketing-001',
  premiacion:      'ord-mar-premiacion-001',
  audiovisual:     'ord-mar-audiovisual-001',
  permisos:        'ord-mar-permisos-001',
  voluntariado:    'ord-mar-voluntariado-001',
  expo_meta:       'ord-mar-expo-meta-001',
}

function d(iso: string) { return new Date(iso) }

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏃 Seeding eventos deportivos 2026...')

  // ── 1. Tenant & admin ──────────────────────────────────────────────────────
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } })
  const admin  = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } })
  const tid = tenant.id
  const uid = admin.id
  console.log(`✅ Tenant: ${tenant.name}`)

  // ── 2. Concept resources ───────────────────────────────────────────────────
  const conceptDefs = [
    { id: C.infraestructura, code: 'DEP-CON-INFRA',    name: 'Infraestructura y Logística de Ruta',  description: 'Arcos, barricadas, señalización, cercado de ruta y zonas de transición' },
    { id: C.cronometraje,    code: 'DEP-CON-TIMING',   name: 'Cronometraje y Tecnología',             description: 'Sistema de chip timing certificado, tableros de resultados y app en tiempo real' },
    { id: C.seguridad,       code: 'DEP-CON-SEGURIDAD',name: 'Seguridad y Atención Médica',           description: 'Personal de seguridad, paramédicos, rescate acuático y cobertura médica de ruta' },
    { id: C.hidratacion,     code: 'DEP-CON-HIDRAT',   name: 'Hidratación y Nutrición',               description: 'Estaciones de hidratación, geles, frutas, isotónicos y avituallamiento especial' },
    { id: C.marketing,       code: 'DEP-CON-MARKETING',name: 'Comunicación y Marketing',              description: 'Publicidad, redes sociales, kit del corredor y experiencia de marca' },
    { id: C.premiacion,      code: 'DEP-CON-PREMIO',   name: 'Premiación y Ceremonias',               description: 'Medallas, trofeos, podios, presentación de ganadores y clasificación por categorías' },
    { id: C.audiovisual,     code: 'DEP-CON-AV',       name: 'Producción Audiovisual',                description: 'Fotografía, video, transmisión en vivo y cobertura de medios' },
    { id: C.permisos,        code: 'DEP-CON-PERMISOS', name: 'Permisos y Administración',             description: 'Permisos vialidad, Protección Civil, seguros, IMSS y gestión SEMARNAT' },
    { id: C.voluntariado,    code: 'DEP-CON-VOLUNTARIOS', name: 'Voluntariado y Personal de Ruta',    description: 'Coordinadores, guías, jueces de campo y personal de hidratación' },
    { id: C.expo_meta,       code: 'DEP-CON-EXPOMETA', name: 'Zona de Meta y Expo',                   description: 'Arco de meta, área de llegada, expo de marcas, zona de recuperación y bag check' },
  ]
  for (const r of conceptDefs) {
    await prisma.resource.upsert({
      where:  { tenantId_code: { tenantId: tid, code: r.code } },
      update: {},
      create: { id: r.id, tenantId: tid, code: r.code, name: r.name, type: 'CONCEPT', description: r.description, unit: 'global' },
    })
  }
  console.log(`✅ ${conceptDefs.length} concept resources`)

  // ── 3. Production resources ────────────────────────────────────────────────
  const prodDefs = [
    // EQUIPMENT
    { id: P.arco_meta,       code: 'DEP-EQ-ARCO-META',  name: 'Arco Inflable de Meta (10m)',                type: 'EQUIPMENT', unit: 'evento', description: 'Arco inflable personalizable con logotipos, incluye motor y anclaje' },
    { id: P.arco_km,         code: 'DEP-EQ-ARCO-KM',    name: 'Arco Inflable de Kilómetro (6m)',            type: 'EQUIPMENT', unit: 'pza', description: 'Arco inflable señalización para puestos de control intermedios' },
    { id: P.chip_timing,     code: 'DEP-EQ-CHIP',       name: 'Chip de Cronometraje (Descartable)',          type: 'EQUIPMENT', unit: 'pza', description: 'Chip RFID descartable para número de corredor', stock: 5000, checkStock: true },
    { id: P.barrera_jersey,  code: 'DEP-EQ-JERSEY',     name: 'Barrera Jersey de Concreto (ml)',             type: 'EQUIPMENT', unit: 'ml', description: 'Barrera de concreto tipo jersey para cierre vial' },
    { id: P.valla_metalica,  code: 'DEP-EQ-VALLA',      name: 'Valla Metálica Peatonal (ml)',                type: 'EQUIPMENT', unit: 'ml', description: 'Valla de encauzamiento para corredores y espectadores' },
    { id: P.generador,       code: 'DEP-EQ-GENERADOR',  name: 'Generador Eléctrico (150 kVA)',               type: 'EQUIPMENT', unit: 'día', description: 'Generador con operador para zona de meta y puestos de control' },
    { id: P.pantalla_led,    code: 'DEP-EQ-PANTALLA',   name: 'Pantalla LED (6x4m)',                         type: 'EQUIPMENT', unit: 'evento', description: 'Pantalla para resultados en tiempo real y transmisión' },
    { id: P.sistema_sonido,  code: 'DEP-EQ-SONIDO',     name: 'Sistema de Sonido Zona Meta',                 type: 'EQUIPMENT', unit: 'evento', description: 'Bocinas, amplificador y consola para animación de meta' },
    { id: P.radio_comunicacion, code: 'DEP-EQ-RADIO',   name: 'Radio de Comunicación (equipo)',              type: 'EQUIPMENT', unit: 'pza', description: 'Radio Motorola digital para coordinación operativa', stock: 100, checkStock: true },
    // SERVICE
    { id: P.svc_cronometraje, code: 'DEP-SVC-TIMING',   name: 'Servicio de Cronometraje Certificado',        type: 'SERVICE',  unit: 'evento', description: 'Servicio completo RFID: instalación, operación, resultados y certificado AIMS/World Athletics' },
    { id: P.svc_streaming,   code: 'DEP-SVC-STREAMING', name: 'Streaming y Transmisión en Vivo',             type: 'SERVICE',  unit: 'evento', description: 'Producción y transmisión multi-plataforma HD de la competencia' },
    { id: P.svc_fotografia,  code: 'DEP-SVC-FOTO',      name: 'Fotografía Deportiva de Participantes',       type: 'SERVICE',  unit: 'evento', description: 'Foto profesional a cada participante en puntos de ruta + meta (descarga digital incluida)' },
    { id: P.svc_primeros,    code: 'DEP-SVC-MEDICOS',   name: 'Paramédicos y Ambulancia',                    type: 'SERVICE',  unit: 'día', description: 'Ambulancia tipo III + 2 paramédicos certificados + DEA' },
    { id: P.svc_transporte,  code: 'DEP-SVC-TRANSPORTE',name: 'Transporte de Equipo y Ruta (flete)',         type: 'SERVICE',  unit: 'viaje', description: 'Camión para traslado de equipo, medallas y material' },
    { id: P.svc_limpieza,    code: 'DEP-SVC-LIMPIEZA',  name: 'Limpieza y Saneamiento de Ruta',              type: 'SERVICE',  unit: 'turno', description: 'Cuadrilla de limpieza post-evento, recolección de residuos y recuperación del espacio' },
    // PERSONAL
    { id: P.pers_coordinador, code: 'DEP-PERS-COORD',   name: 'Coordinador de Ruta / Zona',                  type: 'PERSONAL', unit: 'turno', description: 'Responsable operativo de sector de ruta o zona del evento' },
    { id: P.pers_juez,       code: 'DEP-PERS-JUEZ',     name: 'Juez de Campo Certificado',                   type: 'PERSONAL', unit: 'día', description: 'Juez con certificación nacional para validación de resultados' },
    { id: P.pers_guia_bici,  code: 'DEP-PERS-GUIA',     name: 'Guía Ciclista de Ruta (pacemaker)',           type: 'PERSONAL', unit: 'día', description: 'Ciclista guía para lideres de carrera y segmento ciclismo (triatlón/Ironman)' },
    { id: P.pers_hidratacion, code: 'DEP-PERS-HIDRAT',  name: 'Personal de Estación de Hidratación',         type: 'PERSONAL', unit: 'turno', description: 'Operador de puesto de agua y nutrición en ruta' },
    { id: P.pers_voluntario, code: 'DEP-PERS-VOL',      name: 'Coordinador de Voluntarios',                  type: 'PERSONAL', unit: 'evento', description: 'Responsable de gestión y asignación de voluntarios' },
    // FURNITURE / consumable
    { id: P.mob_carpa,       code: 'DEP-MOB-CARPA',     name: 'Carpa / Toldo Plegable (3x3m)',               type: 'FURNITURE', unit: 'pza', description: 'Carpa para puestos de hidratación, registro y premiación' },
    { id: P.mob_mesa,        code: 'DEP-MOB-MESA',      name: 'Mesa Plegable de Trabajo',                    type: 'FURNITURE', unit: 'pza', description: 'Mesa tipo banquete para registro, expo y premiación', stock: 300, checkStock: true },
    { id: P.mob_bano,        code: 'DEP-MOB-BANO',      name: 'Baño Portátil (con servicio)',                type: 'FURNITURE', unit: 'pza', description: 'Sanitario portátil con servicio de limpieza para participantes', stock: 80, checkStock: true },
    { id: P.mob_valla_crowd, code: 'DEP-MOB-VALLA-C',   name: 'Valla Crowd Control (metro lineal)',          type: 'FURNITURE', unit: 'ml', description: 'Valla portátil de encauzamiento en zona de salida y meta' },
  ]
  for (const r of prodDefs) {
    await prisma.resource.upsert({
      where:  { tenantId_code: { tenantId: tid, code: r.code } },
      update: {},
      create: {
        id: r.id, tenantId: tid, code: r.code, name: r.name,
        type: r.type as any, unit: r.unit, description: r.description,
        stock: (r as any).stock ?? 0,
        checkStock: (r as any).checkStock ?? false,
      },
    })
  }
  console.log(`✅ ${prodDefs.length} production resources`)

  // ── 4. Concept price list (isConceptList: true) ────────────────────────────
  const plConcept = await prisma.priceList.upsert({
    where:  { id: PL_CONCEPT },
    update: {},
    create: { id: PL_CONCEPT, tenantId: tid, name: 'Conceptos Deportivos 2026', isConceptList: true, isActive: true },
  })
  const conceptPrices: Record<string, { early: number; normal: number; late: number }> = {
    [C.infraestructura]: { early: 320_000, normal: 380_000, late: 450_000 },
    [C.cronometraje]:    { early: 150_000, normal: 180_000, late: 220_000 },
    [C.seguridad]:       { early: 210_000, normal: 250_000, late: 300_000 },
    [C.hidratacion]:     { early:  80_000, normal:  95_000, late: 115_000 },
    [C.marketing]:       { early: 120_000, normal: 145_000, late: 175_000 },
    [C.premiacion]:      { early:  90_000, normal: 110_000, late: 135_000 },
    [C.audiovisual]:     { early: 130_000, normal: 160_000, late: 195_000 },
    [C.permisos]:        { early:  60_000, normal:  72_000, late:  88_000 },
    [C.voluntariado]:    { early:  40_000, normal:  48_000, late:  58_000 },
    [C.expo_meta]:       { early: 100_000, normal: 120_000, late: 145_000 },
  }
  for (const [resourceId, p] of Object.entries(conceptPrices)) {
    const pliId = `pli-dep-concept-${resourceId}`
    await prisma.priceListItem.upsert({
      where:  { id: pliId },
      update: {},
      create: { id: pliId, priceListId: PL_CONCEPT, resourceId, earlyPrice: p.early, normalPrice: p.normal, latePrice: p.late, unit: 'global', cost: p.normal * 0.68 },
    })
  }
  console.log(`✅ Concept price list: ${plConcept.name}`)

  // ── 5. Production price list ───────────────────────────────────────────────
  const plProd = await prisma.priceList.upsert({
    where:  { id: PL_PROD },
    update: {},
    create: {
      id: PL_PROD, tenantId: tid,
      name: 'Producción Deportiva 2026',
      earlyCutoff:  d('2026-04-30T23:59:59Z'),
      normalCutoff: d('2026-06-30T23:59:59Z'),
      isConceptList: false, isActive: true,
    },
  })
  const prodPrices: Record<string, { early: number; normal: number; late: number; cost: number; unit?: string }> = {
    [P.arco_meta]:        { early: 18_000, normal: 22_000, late: 27_000,  cost: 14_000, unit: 'evento' },
    [P.arco_km]:          { early:  6_500, normal:  7_800, late:  9_500,  cost:  5_000, unit: 'pza'    },
    [P.chip_timing]:      { early:     45, normal:     55, late:     70,  cost:     32, unit: 'pza'    },
    [P.barrera_jersey]:   { early:    280, normal:    340, late:    420,  cost:    200, unit: 'ml'     },
    [P.valla_metalica]:   { early:    160, normal:    200, late:    250,  cost:    120, unit: 'ml'     },
    [P.generador]:        { early:  8_500, normal: 10_000, late: 12_500,  cost:  6_500, unit: 'día'    },
    [P.pantalla_led]:     { early: 22_000, normal: 27_000, late: 33_000,  cost: 17_000, unit: 'evento' },
    [P.sistema_sonido]:   { early: 14_000, normal: 17_000, late: 21_000,  cost: 10_500, unit: 'evento' },
    [P.radio_comunicacion]:{ early:   850, normal:  1_050, late:  1_300,  cost:    650, unit: 'pza'    },
    [P.svc_cronometraje]: { early: 65_000, normal: 78_000, late: 95_000,  cost: 50_000, unit: 'evento' },
    [P.svc_streaming]:    { early: 28_000, normal: 34_000, late: 42_000,  cost: 22_000, unit: 'evento' },
    [P.svc_fotografia]:   { early: 35_000, normal: 42_000, late: 52_000,  cost: 26_000, unit: 'evento' },
    [P.svc_primeros]:     { early: 12_000, normal: 15_000, late: 18_500,  cost:  9_500, unit: 'día'    },
    [P.svc_transporte]:   { early:  7_500, normal:  9_000, late: 11_000,  cost:  5_800, unit: 'viaje'  },
    [P.svc_limpieza]:     { early:  3_800, normal:  4_500, late:  5_500,  cost:  2_900, unit: 'turno'  },
    [P.pers_coordinador]: { early:  2_200, normal:  2_700, late:  3_300,  cost:  1_700, unit: 'turno'  },
    [P.pers_juez]:        { early:  4_500, normal:  5_500, late:  6_800,  cost:  3_500, unit: 'día'    },
    [P.pers_guia_bici]:   { early:  2_800, normal:  3_400, late:  4_200,  cost:  2_100, unit: 'día'    },
    [P.pers_hidratacion]: { early:  1_200, normal:  1_500, late:  1_900,  cost:    950, unit: 'turno'  },
    [P.pers_voluntario]:  { early:  3_500, normal:  4_200, late:  5_200,  cost:  2_700, unit: 'evento' },
    [P.mob_carpa]:        { early:  1_800, normal:  2_200, late:  2_800,  cost:  1_400, unit: 'pza'    },
    [P.mob_mesa]:         { early:    280, normal:    340, late:    420,  cost:    210, unit: 'pza'    },
    [P.mob_bano]:         { early:  1_100, normal:  1_350, late:  1_700,  cost:    850, unit: 'pza'    },
    [P.mob_valla_crowd]:  { early:    140, normal:    175, late:    220,  cost:    110, unit: 'ml'     },
  }
  for (const [resourceId, p] of Object.entries(prodPrices)) {
    const pliId = `pli-dep-prod-${resourceId}`
    await prisma.priceListItem.upsert({
      where:  { id: pliId },
      update: {},
      create: { id: pliId, priceListId: PL_PROD, resourceId, earlyPrice: p.early, normalPrice: p.normal, latePrice: p.late, cost: p.cost, unit: p.unit },
    })
  }
  console.log(`✅ Production price list: ${plProd.name}`)

  // ── 6. Client ──────────────────────────────────────────────────────────────
  const client = await prisma.client.upsert({
    where:  { id: CLIENT_ID },
    update: {},
    create: {
      id: CLIENT_ID, tenantId: tid,
      personType: 'MORAL',
      companyName: 'RunMex Sports & Events S.A. de C.V.',
      email: 'operaciones@runmex.mx',
      phone: '+52 55 5555 3400',
      rfc: 'RSE2015087X1',
      addressCity: 'Ciudad de México',
      addressState: 'CDMX',
      addressCountry: 'MX',
    },
  })
  console.log(`✅ Client: ${client.companyName}`)

  // ═══════════════════════════════════════════════════════════════════════════
  // ── 7. EVENTO 1: Maratón CDMX 2026 (42K + 21K + 10K) ─────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const eventMaraton = await prisma.event.upsert({
    where:  { id: EV.maraton },
    update: {},
    create: {
      id: EV.maraton, tenantId: tid,
      code: 'MAR-CDMX-2026',
      name: 'Maratón CDMX 2026 (42K / 21K / 10K)',
      status: 'CONFIRMED',
      eventType: 'Carrera de ruta',
      eventClass: 'Maratón / Media maratón / 10K',
      eventCategory: 'Competencia deportiva masiva',
      venueLocation: 'Bosque de Chapultepec, CDMX — Salida/Meta: Paseo de la Reforma',
      description: 'Maratón oficial de la Ciudad de México con distancias 42.195K, 21K y 10K. Certificado World Athletics. Capacidad 25,000 corredores. Inicio 6:00 am, ruta por Paseo de la Reforma, Circuito Interior y Bosque de Chapultepec.',
      expectedAttendance: 25_000,
      coordinator: 'Fernanda Ríos',
      executive: 'Marco Villanueva',
      primaryClientId: CLIENT_ID,
      priceListId: PL_CONCEPT,
      setupStart:    d('2026-08-28T06:00:00-06:00'),
      setupEnd:      d('2026-08-29T22:00:00-06:00'),
      eventStart:    d('2026-08-30T06:00:00-06:00'),
      eventEnd:      d('2026-08-30T16:00:00-06:00'),
      teardownStart: d('2026-08-30T16:00:00-06:00'),
      teardownEnd:   d('2026-08-31T18:00:00-06:00'),
      createdById: uid,
    },
  })
  console.log(`✅ Event: ${eventMaraton.name}`)

  // ── 7a. Budget: Maratón ────────────────────────────────────────────────────
  const budgetMaraton = await prisma.budget.upsert({
    where:  { id: BUD.maraton },
    update: {},
    create: {
      id: BUD.maraton, tenantId: tid,
      eventId: EV.maraton,
      priceListId: PL_CONCEPT,
      name: 'Presupuesto Maratón CDMX 2026',
      createdById: uid,
    },
  })

  type BLDef = { id: string; resourceId: string; description: string; directCostBudgeted: number; indirectCostBudgeted: number; income: number; sortOrder: number }
  const blMarDefs: BLDef[] = [
    { id: BL_MAR.infraestructura, resourceId: C.infraestructura, description: 'Infraestructura y Logística de Ruta', directCostBudgeted: 240_000, indirectCostBudgeted: 38_000, income: 380_000, sortOrder: 1 },
    { id: BL_MAR.cronometraje,    resourceId: C.cronometraje,    description: 'Cronometraje y Tecnología',           directCostBudgeted: 118_000, indirectCostBudgeted: 18_000, income: 180_000, sortOrder: 2 },
    { id: BL_MAR.seguridad,       resourceId: C.seguridad,       description: 'Seguridad y Atención Médica',         directCostBudgeted: 160_000, indirectCostBudgeted: 25_000, income: 250_000, sortOrder: 3 },
    { id: BL_MAR.hidratacion,     resourceId: C.hidratacion,     description: 'Hidratación y Nutrición',             directCostBudgeted:  58_000, indirectCostBudgeted:  9_000, income:  95_000, sortOrder: 4 },
    { id: BL_MAR.marketing,       resourceId: C.marketing,       description: 'Comunicación y Marketing',            directCostBudgeted:  90_000, indirectCostBudgeted: 14_000, income: 145_000, sortOrder: 5 },
    { id: BL_MAR.premiacion,      resourceId: C.premiacion,      description: 'Premiación y Ceremonias',             directCostBudgeted:  70_000, indirectCostBudgeted: 11_000, income: 110_000, sortOrder: 6 },
    { id: BL_MAR.audiovisual,     resourceId: C.audiovisual,     description: 'Producción Audiovisual',              directCostBudgeted: 100_000, indirectCostBudgeted: 16_000, income: 160_000, sortOrder: 7 },
    { id: BL_MAR.permisos,        resourceId: C.permisos,        description: 'Permisos y Administración',           directCostBudgeted:  44_000, indirectCostBudgeted:  7_000, income:  72_000, sortOrder: 8 },
    { id: BL_MAR.voluntariado,    resourceId: C.voluntariado,    description: 'Voluntariado y Personal de Ruta',     directCostBudgeted:  28_000, indirectCostBudgeted:  5_000, income:  48_000, sortOrder: 9 },
    { id: BL_MAR.expo_meta,       resourceId: C.expo_meta,       description: 'Zona de Meta y Expo',                 directCostBudgeted:  74_000, indirectCostBudgeted: 12_000, income: 120_000, sortOrder: 10 },
  ]
  for (const bl of blMarDefs) {
    await prisma.budgetLine.upsert({
      where:  { id: bl.id },
      update: {},
      create: {
        id: bl.id, budgetId: BUD.maraton, resourceId: bl.resourceId,
        description: bl.description,
        directCostBudgeted:   bl.directCostBudgeted,
        indirectCostBudgeted: bl.indirectCostBudgeted,
        income:   bl.income,
        utility:  bl.income - bl.directCostBudgeted - bl.indirectCostBudgeted,
        sortOrder: bl.sortOrder,
      },
    })
  }
  console.log(`✅ Budget: ${budgetMaraton.name} (${blMarDefs.length} líneas)`)

  // ── 7b. Orders: Maratón ────────────────────────────────────────────────────
  type OrdDef = { id: string; orderNumber: string; notes: string; lineItems: { resourceId: string; description: string; qty: number; unitPrice: number }[] }
  const ordMarDefs: OrdDef[] = [
    {
      id: ORD_MAR.infraestructura, orderNumber: 'ORD-MAR-001',
      notes: 'Infraestructura de ruta — arcos, vallas, señalización y malla',
      lineItems: [
        { resourceId: P.arco_meta,       description: 'Arco inflable de salida/meta personalizado',      qty: 1,   unitPrice: 22_000 },
        { resourceId: P.arco_km,         description: 'Arcos km 5, 10, 21, 35 y 42',                    qty: 5,   unitPrice:  7_800 },
        { resourceId: P.valla_metalica,  description: 'Valla metálica encauzamiento (3.2 km de ruta)',   qty: 3200, unitPrice:    200 },
        { resourceId: P.mob_valla_crowd, description: 'Valla crowd control zona de salida/meta (800 ml)', qty: 800, unitPrice:    175 },
        { resourceId: P.svc_transporte,  description: 'Fletes montaje/desmontaje infraestructura',       qty: 6,   unitPrice:  9_000 },
      ],
    },
    {
      id: ORD_MAR.cronometraje, orderNumber: 'ORD-MAR-002',
      notes: 'Sistema de cronometraje oficial certificado World Athletics',
      lineItems: [
        { resourceId: P.svc_cronometraje, description: 'Servicio cronometraje RFID 25,000 participantes', qty: 1,     unitPrice: 78_000 },
        { resourceId: P.chip_timing,      description: 'Chips descartables (25,000 + 10% extra)',         qty: 27_500, unitPrice:    55 },
        { resourceId: P.pantalla_led,     description: 'Pantalla LED resultados en tiempo real',          qty: 1,     unitPrice: 27_000 },
        { resourceId: P.radio_comunicacion, description: 'Radios coordinación timing (15 equipos)',       qty: 15,    unitPrice:  1_050 },
      ],
    },
    {
      id: ORD_MAR.seguridad, orderNumber: 'ORD-MAR-003',
      notes: 'Seguridad perimetral y cobertura médica integral de ruta',
      lineItems: [
        { resourceId: P.svc_primeros,    description: 'Ambulancias + paramédicos (2 unidades × 1 día)',  qty: 2,  unitPrice: 15_000 },
        { resourceId: P.pers_coordinador,description: 'Coordinadores de zona seguridad (10 sectores)',   qty: 10, unitPrice:  2_700 },
        { resourceId: P.barrera_jersey,  description: 'Barrera jersey cierre vial Reforma (1.2 km)',     qty: 1200, unitPrice:   340 },
        { resourceId: P.mob_carpa,       description: 'Carpas puestos médicos en ruta',                  qty: 6,  unitPrice:  2_200 },
      ],
    },
    {
      id: ORD_MAR.hidratacion, orderNumber: 'ORD-MAR-004',
      notes: 'Estaciones de hidratación y avituallamiento a lo largo de la ruta',
      lineItems: [
        { resourceId: P.pers_hidratacion, description: 'Personal hidratación (8 puestos × 3 turnos)',    qty: 24, unitPrice:  1_500 },
        { resourceId: P.mob_carpa,        description: 'Carpas estaciones de hidratación',               qty: 8,  unitPrice:  2_200 },
        { resourceId: P.mob_mesa,         description: 'Mesas para distribución de agua/nutrición',      qty: 40, unitPrice:    340 },
        { resourceId: P.mob_bano,         description: 'Baños portátiles ruta (30 pzas)',                qty: 30, unitPrice:  1_350 },
      ],
    },
    {
      id: ORD_MAR.marketing, orderNumber: 'ORD-MAR-005',
      notes: 'Campaña de comunicación, registro en línea y experiencia de corredor',
      lineItems: [
        { resourceId: P.svc_fotografia,   description: 'Fotografía profesional a todos los participantes', qty: 1,  unitPrice: 42_000 },
        { resourceId: P.pers_coordinador, description: 'Coordinador de prensa y redes sociales',           qty: 1,  unitPrice:  2_700 },
        { resourceId: P.sistema_sonido,   description: 'Sonido zona expo y animación en meta',             qty: 1,  unitPrice: 17_000 },
        { resourceId: P.mob_carpa,        description: 'Carpas expo marcas y patrocinadores',              qty: 10, unitPrice:  2_200 },
      ],
    },
    {
      id: ORD_MAR.premiacion, orderNumber: 'ORD-MAR-006',
      notes: 'Ceremonia de premiación, categorías absolutas y por edad',
      lineItems: [
        { resourceId: P.pers_juez,         description: 'Jueces de campo certificados (3 jueces × 1 día)', qty: 3,  unitPrice:  5_500 },
        { resourceId: P.sistema_sonido,    description: 'Sonido adicional zona premiación',                qty: 1,  unitPrice: 17_000 },
        { resourceId: P.mob_mesa,          description: 'Mesas y montaje zona podios',                    qty: 15, unitPrice:    340 },
        { resourceId: P.pers_coordinador,  description: 'Coordinador de ceremonia y logística premiación', qty: 2,  unitPrice:  2_700 },
      ],
    },
    {
      id: ORD_MAR.audiovisual, orderNumber: 'ORD-MAR-007',
      notes: 'Cobertura audiovisual completa y transmisión en vivo',
      lineItems: [
        { resourceId: P.svc_streaming,  description: 'Producción y streaming en vivo del evento',      qty: 1, unitPrice: 34_000 },
        { resourceId: P.svc_fotografia, description: 'Segunda cobertura fotográfica zona VIP/meta',    qty: 1, unitPrice: 42_000 },
        { resourceId: P.generador,      description: 'Generador para equipo audiovisual (2 días)',     qty: 2, unitPrice: 10_000 },
      ],
    },
    {
      id: ORD_MAR.permisos, orderNumber: 'ORD-MAR-008',
      notes: 'Gestión de permisos viales, Protección Civil y seguros',
      lineItems: [
        { resourceId: P.pers_coordinador, description: 'Coordinador gestión de permisos y trámites',   qty: 1, unitPrice:  2_700 },
        { resourceId: P.svc_transporte,   description: 'Traslado documentación y coordinación oficial', qty: 2, unitPrice:  9_000 },
      ],
    },
    {
      id: ORD_MAR.voluntariado, orderNumber: 'ORD-MAR-009',
      notes: 'Coordinación y gestión de 400 voluntarios de ruta',
      lineItems: [
        { resourceId: P.pers_voluntario,  description: 'Coordinador general de voluntarios',           qty: 1, unitPrice:  4_200 },
        { resourceId: P.pers_coordinador, description: 'Líderes de sector (10 zonas de ruta)',          qty: 10, unitPrice: 2_700 },
        { resourceId: P.radio_comunicacion, description: 'Radios líderes de voluntarios',              qty: 10, unitPrice: 1_050 },
      ],
    },
    {
      id: ORD_MAR.expo_meta, orderNumber: 'ORD-MAR-010',
      notes: 'Zona de llegada, bag check, expo y recuperación',
      lineItems: [
        { resourceId: P.mob_carpa,        description: 'Carpas zona meta, bag check y recuperación',   qty: 15, unitPrice:  2_200 },
        { resourceId: P.mob_mesa,         description: 'Mesas servicio en zona meta',                  qty: 30, unitPrice:    340 },
        { resourceId: P.svc_limpieza,     description: 'Limpieza post-evento zona meta (3 turnos)',    qty: 3,  unitPrice:  4_500 },
        { resourceId: P.generador,        description: 'Generador zona expo y meta (2 días)',           qty: 2,  unitPrice: 10_000 },
      ],
    },
  ]

  for (const ord of ordMarDefs) {
    const subtotal = ord.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
    const taxAmt   = subtotal * 0.16
    await prisma.order.upsert({
      where:  { id: ord.id },
      update: {},
      create: {
        id: ord.id, tenantId: tid,
        orderNumber: ord.orderNumber,
        eventId: EV.maraton,
        clientId: CLIENT_ID,
        priceListId: PL_PROD,
        status: 'CONFIRMED',
        pricingTier: 'NORMAL',
        subtotal, taxPct: 16, taxAmount: taxAmt, total: subtotal + taxAmt,
        notes: ord.notes,
        isBudgetOrder: true,
        createdById: uid,
        lineItems: {
          create: ord.lineItems.map((li, i) => ({
            resourceId:  li.resourceId,
            description: li.description,
            pricingTier: 'NORMAL' as const,
            unitPrice:   li.unitPrice,
            quantity:    li.qty,
            lineTotal:   li.qty * li.unitPrice,
            sortOrder:   i,
          })),
        },
      },
    })
  }
  console.log(`✅ ${ordMarDefs.length} órdenes maratón`)

  // ── 7c. Link orders → budget lines ─────────────────────────────────────────
  const blOrdMapMar = [
    { blId: BL_MAR.infraestructura, ordId: ORD_MAR.infraestructura },
    { blId: BL_MAR.cronometraje,    ordId: ORD_MAR.cronometraje    },
    { blId: BL_MAR.seguridad,       ordId: ORD_MAR.seguridad       },
    { blId: BL_MAR.hidratacion,     ordId: ORD_MAR.hidratacion     },
    { blId: BL_MAR.marketing,       ordId: ORD_MAR.marketing       },
    { blId: BL_MAR.premiacion,      ordId: ORD_MAR.premiacion      },
    { blId: BL_MAR.audiovisual,     ordId: ORD_MAR.audiovisual     },
    { blId: BL_MAR.permisos,        ordId: ORD_MAR.permisos        },
    { blId: BL_MAR.voluntariado,    ordId: ORD_MAR.voluntariado    },
    { blId: BL_MAR.expo_meta,       ordId: ORD_MAR.expo_meta       },
  ]
  for (const { blId, ordId } of blOrdMapMar) {
    await prisma.budgetLineDirectOrder.upsert({
      where:  { budgetLineId_orderId: { budgetLineId: blId, orderId: ordId } },
      update: {},
      create: { id: `bld-mar-${blId}`, budgetLineId: blId, orderId: ordId },
    })
  }
  console.log(`✅ Budget line → order links: ${blOrdMapMar.length}`)

  // ── 7d. Timeline: Maratón ──────────────────────────────────────────────────
  const PH_MAR = {
    preproduccion: 'act-mar-phase-preproduccion',
    montaje:       'act-mar-phase-montaje',
    dia_evento:    'act-mar-phase-evento',
    desmontaje:    'act-mar-phase-desmontaje',
  }

  type ActDef = { id: string; title: string; type: string; status?: string; priority?: string; startDate: string; endDate: string; parentId?: string; color?: string; notes?: string; position: number }

  const actMarDefs: ActDef[] = [
    // FASES
    { id: PH_MAR.preproduccion, title: 'Pre-producción',           type: 'PHASE', status: 'IN_PROGRESS', priority: 'HIGH',
      startDate: '2026-06-01T09:00:00-06:00', endDate: '2026-08-27T18:00:00-06:00', color: '#7c3aed', position: 1 },
    { id: PH_MAR.montaje,       title: 'Montaje y Preparación',    type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-08-28T06:00:00-06:00', endDate: '2026-08-29T22:00:00-06:00', color: '#0284c7', position: 10 },
    { id: PH_MAR.dia_evento,    title: 'Día de Competencia',       type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-08-30T04:00:00-06:00', endDate: '2026-08-30T19:00:00-06:00', color: '#be185d', position: 20 },
    { id: PH_MAR.desmontaje,    title: 'Desmontaje y Cierre',      type: 'PHASE', status: 'PENDING', priority: 'HIGH',
      startDate: '2026-08-30T16:00:00-06:00', endDate: '2026-08-31T18:00:00-06:00', color: '#374151', position: 30 },

    // PRE-PRODUCCIÓN
    { id: 'act-mar-permisos-vial',  title: 'Trámite permisos viales SEMOVI/Vialidad',       type: 'TASK',      priority: 'CRITICAL', status: 'IN_PROGRESS',
      startDate: '2026-06-01T09:00:00-06:00', endDate: '2026-07-15T18:00:00-06:00', parentId: PH_MAR.preproduccion, position: 2 },
    { id: 'act-mar-proteccion',     title: 'Aprobación Protección Civil CDMX',               type: 'MILESTONE', priority: 'CRITICAL',
      startDate: '2026-07-01T09:00:00-06:00', endDate: '2026-07-20T18:00:00-06:00', parentId: PH_MAR.preproduccion, color: '#d97706', position: 3 },
    { id: 'act-mar-inscripciones',  title: 'Apertura plataforma de inscripciones en línea',  type: 'MILESTONE', priority: 'HIGH',
      startDate: '2026-06-15T09:00:00-06:00', endDate: '2026-06-15T12:00:00-06:00', parentId: PH_MAR.preproduccion, color: '#16a34a', position: 4 },
    { id: 'act-mar-timing-contrato',title: 'Contrato proveedor de cronometraje certificado', type: 'TASK',      priority: 'HIGH',
      startDate: '2026-06-10T09:00:00-06:00', endDate: '2026-06-20T18:00:00-06:00', parentId: PH_MAR.preproduccion, position: 5 },
    { id: 'act-mar-seguro',         title: 'Contratación seguro de responsabilidad civil',   type: 'TASK',      priority: 'CRITICAL',
      startDate: '2026-06-15T09:00:00-06:00', endDate: '2026-07-01T18:00:00-06:00', parentId: PH_MAR.preproduccion, position: 6 },
    { id: 'act-mar-ruta-tecnica',   title: 'Medición y certificación de ruta (World Athletics)', type: 'TECHNICAL', priority: 'CRITICAL',
      startDate: '2026-07-05T08:00:00-06:00', endDate: '2026-07-06T17:00:00-06:00', parentId: PH_MAR.preproduccion, position: 7 },
    { id: 'act-mar-kit',            title: 'Producción del kit del corredor (medalla, playera, chip)', type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-07-15T09:00:00-06:00', endDate: '2026-08-10T18:00:00-06:00', parentId: PH_MAR.preproduccion, position: 8 },
    { id: 'act-mar-voluntarios',    title: 'Reclutamiento y capacitación de voluntarios',    type: 'MEETING',   priority: 'MEDIUM',
      startDate: '2026-07-20T09:00:00-06:00', endDate: '2026-08-22T18:00:00-06:00', parentId: PH_MAR.preproduccion, position: 9 },
    { id: 'act-mar-expo-setup',     title: 'Planeación zona expo y distribución de stands',  type: 'TASK',      priority: 'MEDIUM',
      startDate: '2026-08-01T09:00:00-06:00', endDate: '2026-08-15T18:00:00-06:00', parentId: PH_MAR.preproduccion, position: 10 },
    { id: 'act-mar-entrega-kit',    title: 'Entrega de kits del corredor (Expo Deportiva)',   type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-27T09:00:00-06:00', endDate: '2026-08-28T20:00:00-06:00', parentId: PH_MAR.preproduccion, position: 11 },

    // MONTAJE
    { id: 'act-mar-mont-arcos',    title: 'Montaje arcos inflables (salida, meta y km)',     type: 'LOGISTICS', priority: 'CRITICAL',
      startDate: '2026-08-28T07:00:00-06:00', endDate: '2026-08-28T18:00:00-06:00', parentId: PH_MAR.montaje, position: 12 },
    { id: 'act-mar-mont-vallas',   title: 'Instalación vallas y señalización de ruta',       type: 'LOGISTICS', priority: 'CRITICAL',
      startDate: '2026-08-28T06:00:00-06:00', endDate: '2026-08-29T14:00:00-06:00', parentId: PH_MAR.montaje, position: 13 },
    { id: 'act-mar-mont-timing',   title: 'Instalación mats y equipos de cronometraje',      type: 'TECHNICAL', priority: 'CRITICAL',
      startDate: '2026-08-29T08:00:00-06:00', endDate: '2026-08-29T18:00:00-06:00', parentId: PH_MAR.montaje, position: 14 },
    { id: 'act-mar-mont-hidrat',   title: 'Montaje estaciones de hidratación en ruta',       type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-29T07:00:00-06:00', endDate: '2026-08-29T16:00:00-06:00', parentId: PH_MAR.montaje, position: 15 },
    { id: 'act-mar-mont-sonido',   title: 'Instalación sonido zona meta y expo',             type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-08-29T10:00:00-06:00', endDate: '2026-08-29T18:00:00-06:00', parentId: PH_MAR.montaje, position: 16 },
    { id: 'act-mar-prueba-timing', title: 'Prueba general sistema de cronometraje',           type: 'TECHNICAL', priority: 'CRITICAL', color: '#f59e0b',
      startDate: '2026-08-29T19:00:00-06:00', endDate: '2026-08-29T21:00:00-06:00', parentId: PH_MAR.montaje, position: 17 },

    // DÍA DE COMPETENCIA
    { id: 'act-mar-briefing',      title: 'Briefing general coordinadores y voluntarios',    type: 'MEETING',   priority: 'CRITICAL',
      startDate: '2026-08-30T04:00:00-06:00', endDate: '2026-08-30T04:45:00-06:00', parentId: PH_MAR.dia_evento, position: 21 },
    { id: 'act-mar-posiciones',    title: 'Toma de posiciones en ruta (todos los sectores)', type: 'LOGISTICS', priority: 'CRITICAL',
      startDate: '2026-08-30T04:45:00-06:00', endDate: '2026-08-30T05:45:00-06:00', parentId: PH_MAR.dia_evento, position: 22 },
    { id: 'act-mar-salida-42',     title: 'Disparo de salida Maratón 42K',                  type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-08-30T06:00:00-06:00', endDate: '2026-08-30T06:00:00-06:00', parentId: PH_MAR.dia_evento, position: 23 },
    { id: 'act-mar-salida-21',     title: 'Disparo de salida Media Maratón 21K',            type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-08-30T07:00:00-06:00', endDate: '2026-08-30T07:00:00-06:00', parentId: PH_MAR.dia_evento, position: 24 },
    { id: 'act-mar-salida-10',     title: 'Disparo de salida 10K',                          type: 'MILESTONE', priority: 'HIGH', color: '#16a34a',
      startDate: '2026-08-30T08:30:00-06:00', endDate: '2026-08-30T08:30:00-06:00', parentId: PH_MAR.dia_evento, position: 25 },
    { id: 'act-mar-activacion',    title: 'Monitoreo de ruta y atención médica activa',     type: 'SECURITY',  priority: 'CRITICAL',
      startDate: '2026-08-30T06:00:00-06:00', endDate: '2026-08-30T14:00:00-06:00', parentId: PH_MAR.dia_evento, position: 26 },
    { id: 'act-mar-premiacion',    title: 'Ceremonia de premiación categorías absolutas',   type: 'MILESTONE', priority: 'HIGH', color: '#d97706',
      startDate: '2026-08-30T12:00:00-06:00', endDate: '2026-08-30T13:30:00-06:00', parentId: PH_MAR.dia_evento, position: 27 },
    { id: 'act-mar-cierre-ruta',   title: 'Cierre oficial de ruta y tiempo límite',         type: 'MILESTONE', priority: 'HIGH', color: '#6b7280',
      startDate: '2026-08-30T14:00:00-06:00', endDate: '2026-08-30T14:00:00-06:00', parentId: PH_MAR.dia_evento, position: 28 },
    { id: 'act-mar-resultados',    title: 'Publicación oficial de resultados',               type: 'TASK',      priority: 'HIGH',
      startDate: '2026-08-30T15:00:00-06:00', endDate: '2026-08-30T17:00:00-06:00', parentId: PH_MAR.dia_evento, position: 29 },

    // DESMONTAJE
    { id: 'act-mar-desm-hidrat',   title: 'Retiro estaciones de hidratación',               type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-30T16:00:00-06:00', endDate: '2026-08-30T20:00:00-06:00', parentId: PH_MAR.desmontaje, position: 31 },
    { id: 'act-mar-desm-vallas',   title: 'Retiro de vallas y señalización de ruta',        type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-30T16:00:00-06:00', endDate: '2026-08-31T14:00:00-06:00', parentId: PH_MAR.desmontaje, position: 32 },
    { id: 'act-mar-desm-timing',   title: 'Retiro de equipos de cronometraje',              type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-08-30T17:00:00-06:00', endDate: '2026-08-30T21:00:00-06:00', parentId: PH_MAR.desmontaje, position: 33 },
    { id: 'act-mar-desm-limpieza', title: 'Limpieza y saneamiento del recorrido',           type: 'LOGISTICS', priority: 'MEDIUM',
      startDate: '2026-08-31T06:00:00-06:00', endDate: '2026-08-31T16:00:00-06:00', parentId: PH_MAR.desmontaje, position: 34 },
    { id: 'act-mar-desm-informe',  title: 'Informe post-evento y cierre administrativo',    type: 'TASK',      priority: 'MEDIUM',
      startDate: '2026-09-01T09:00:00-06:00', endDate: '2026-09-04T18:00:00-06:00', parentId: PH_MAR.desmontaje, position: 35 },
  ]

  const phasesM  = actMarDefs.filter(a => !a.parentId)
  const childrenM = actMarDefs.filter(a => !!a.parentId)
  for (const a of [...phasesM, ...childrenM]) {
    await prisma.eventActivity.upsert({
      where:  { id: a.id },
      update: {},
      create: {
        id: a.id, tenantId: tid, eventId: EV.maraton,
        title: a.title, activityType: a.type as any,
        status: (a.status ?? 'PENDING') as any,
        priority: (a.priority ?? 'MEDIUM') as any,
        startDate: d(a.startDate), endDate: d(a.endDate),
        color: a.color, notes: a.notes,
        parentId: a.parentId, position: a.position,
        createdById: uid,
      },
    })
  }
  console.log(`✅ Timeline maratón: ${actMarDefs.length} actividades`)

  // ═══════════════════════════════════════════════════════════════════════════
  // ── 8. EVENTO 2: Spartan Race Teotihuacán 2026 ────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const BL_SPA = {
    infraestructura: 'bl-spa-infraestructura',
    cronometraje:    'bl-spa-cronometraje',
    seguridad:       'bl-spa-seguridad',
    hidratacion:     'bl-spa-hidratacion',
    marketing:       'bl-spa-marketing',
    premiacion:      'bl-spa-premiacion',
    audiovisual:     'bl-spa-audiovisual',
    permisos:        'bl-spa-permisos',
    voluntariado:    'bl-spa-voluntariado',
    expo_meta:       'bl-spa-expo-meta',
  }
  const ORD_SPA = {
    infraestructura: 'ord-spa-infraestructura-001',
    cronometraje:    'ord-spa-cronometraje-001',
    seguridad:       'ord-spa-seguridad-001',
    hidratacion:     'ord-spa-hidratacion-001',
    marketing:       'ord-spa-marketing-001',
    premiacion:      'ord-spa-premiacion-001',
    audiovisual:     'ord-spa-audiovisual-001',
    permisos:        'ord-spa-permisos-001',
    voluntariado:    'ord-spa-voluntariado-001',
    expo_meta:       'ord-spa-expo-meta-001',
  }

  const eventSpartan = await prisma.event.upsert({
    where:  { id: EV.spartan },
    update: {},
    create: {
      id: EV.spartan, tenantId: tid,
      code: 'SPART-TEOTI-2026',
      name: 'Spartan Race Teotihuacán 2026 (Sprint / Super / Beast)',
      status: 'CONFIRMED',
      eventType: 'Carrera de obstáculos',
      eventClass: 'Spartan Sprint / Super / Beast',
      eventCategory: 'Competencia de obstáculos / Extreme sports',
      venueLocation: 'Zona Arqueológica de Teotihuacán, Estado de México',
      description: 'Carrera de obstáculos en las faldas de las pirámides de Teotihuacán. 3 distancias: Sprint 5K (20 obstáculos), Super 13K (25 obstáculos), Beast 21K (30 obstáculos). 6,000 competidores por día, dos días de competencia.',
      expectedAttendance: 12_000,
      coordinator: 'Rodrigo Castillo',
      executive: 'Marco Villanueva',
      primaryClientId: CLIENT_ID,
      priceListId: PL_CONCEPT,
      setupStart:    d('2026-10-07T07:00:00-06:00'),
      setupEnd:      d('2026-10-08T22:00:00-06:00'),
      eventStart:    d('2026-10-09T07:00:00-06:00'),
      eventEnd:      d('2026-10-10T18:00:00-06:00'),
      teardownStart: d('2026-10-10T18:00:00-06:00'),
      teardownEnd:   d('2026-10-11T20:00:00-06:00'),
      createdById: uid,
    },
  })
  console.log(`✅ Event: ${eventSpartan.name}`)

  // ── 8a. Budget: Spartan ────────────────────────────────────────────────────
  const budgetSpartan = await prisma.budget.upsert({
    where:  { id: BUD.spartan },
    update: {},
    create: {
      id: BUD.spartan, tenantId: tid,
      eventId: EV.spartan,
      priceListId: PL_CONCEPT,
      name: 'Presupuesto Spartan Race Teotihuacán 2026',
      createdById: uid,
    },
  })

  const blSpaDefs: BLDef[] = [
    { id: BL_SPA.infraestructura, resourceId: C.infraestructura, description: 'Infraestructura y construcción de obstáculos', directCostBudgeted: 195_000, indirectCostBudgeted: 32_000, income: 380_000, sortOrder: 1 },
    { id: BL_SPA.cronometraje,    resourceId: C.cronometraje,    description: 'Cronometraje y control de participantes',       directCostBudgeted:  88_000, indirectCostBudgeted: 14_000, income: 180_000, sortOrder: 2 },
    { id: BL_SPA.seguridad,       resourceId: C.seguridad,       description: 'Seguridad y atención médica de ruta',           directCostBudgeted: 130_000, indirectCostBudgeted: 22_000, income: 250_000, sortOrder: 3 },
    { id: BL_SPA.hidratacion,     resourceId: C.hidratacion,     description: 'Hidratación y puntos de avituallamiento',       directCostBudgeted:  48_000, indirectCostBudgeted:  8_000, income:  95_000, sortOrder: 4 },
    { id: BL_SPA.marketing,       resourceId: C.marketing,       description: 'Marketing digital y experiencia de marca',      directCostBudgeted:  72_000, indirectCostBudgeted: 12_000, income: 145_000, sortOrder: 5 },
    { id: BL_SPA.premiacion,      resourceId: C.premiacion,      description: 'Medallas finisher, trofeos y ceremonia',        directCostBudgeted:  68_000, indirectCostBudgeted: 11_000, income: 110_000, sortOrder: 6 },
    { id: BL_SPA.audiovisual,     resourceId: C.audiovisual,     description: 'Cobertura audiovisual y streaming',             directCostBudgeted:  82_000, indirectCostBudgeted: 14_000, income: 160_000, sortOrder: 7 },
    { id: BL_SPA.permisos,        resourceId: C.permisos,        description: 'Permisos INAH, SEMARNAT y seguros',             directCostBudgeted:  52_000, indirectCostBudgeted:  9_000, income:  72_000, sortOrder: 8 },
    { id: BL_SPA.voluntariado,    resourceId: C.voluntariado,    description: 'Voluntarios y personal de obstáculos',          directCostBudgeted:  26_000, indirectCostBudgeted:  5_000, income:  48_000, sortOrder: 9 },
    { id: BL_SPA.expo_meta,       resourceId: C.expo_meta,       description: 'Zona de llegada, festival y expo',              directCostBudgeted:  62_000, indirectCostBudgeted: 10_000, income: 120_000, sortOrder: 10 },
  ]
  for (const bl of blSpaDefs) {
    await prisma.budgetLine.upsert({
      where:  { id: bl.id },
      update: {},
      create: {
        id: bl.id, budgetId: BUD.spartan, resourceId: bl.resourceId,
        description: bl.description,
        directCostBudgeted:   bl.directCostBudgeted,
        indirectCostBudgeted: bl.indirectCostBudgeted,
        income:  bl.income,
        utility: bl.income - bl.directCostBudgeted - bl.indirectCostBudgeted,
        sortOrder: bl.sortOrder,
      },
    })
  }
  console.log(`✅ Budget: ${budgetSpartan.name} (${blSpaDefs.length} líneas)`)

  // ── 8b. Orders: Spartan ────────────────────────────────────────────────────
  const ordSpaDefs: OrdDef[] = [
    {
      id: ORD_SPA.infraestructura, orderNumber: 'ORD-SPA-001',
      notes: 'Construcción de obstáculos y acondicionamiento de ruta Spartan',
      lineItems: [
        { resourceId: P.arco_meta,       description: 'Arco inflable zona de salida/meta Spartan',      qty: 1,   unitPrice: 22_000 },
        { resourceId: P.arco_km,         description: 'Arcos identificación de sectores de obstáculos', qty: 3,   unitPrice:  7_800 },
        { resourceId: P.valla_metalica,  description: 'Valla encauzamiento (2,500 ml ruta)',             qty: 2500, unitPrice:   200 },
        { resourceId: P.mob_valla_crowd, description: 'Valla crowd control salida escalonada',           qty: 400, unitPrice:    175 },
        { resourceId: P.svc_transporte,  description: 'Fletes materiales construcción obstáculos',       qty: 8,   unitPrice:  9_000 },
      ],
    },
    {
      id: ORD_SPA.cronometraje, orderNumber: 'ORD-SPA-002',
      notes: 'Cronometraje electrónico con control de penalizaciones',
      lineItems: [
        { resourceId: P.svc_cronometraje, description: 'Cronometraje RFID 12,000 competidores (2 días)', qty: 1,     unitPrice: 78_000 },
        { resourceId: P.chip_timing,      description: 'Chips cronometraje (12,000 + 10% extra)',         qty: 13_200, unitPrice:    55 },
        { resourceId: P.radio_comunicacion, description: 'Radios coordinación obstáculos y jueces',      qty: 20,    unitPrice:  1_050 },
      ],
    },
    {
      id: ORD_SPA.seguridad, orderNumber: 'ORD-SPA-003',
      notes: 'Seguridad perimetral y atención médica en zona de obstáculos',
      lineItems: [
        { resourceId: P.svc_primeros,    description: 'Ambulancias y paramédicos (2 uds × 2 días)',     qty: 4,  unitPrice: 15_000 },
        { resourceId: P.pers_coordinador,description: 'Coordinadores de zona seguridad (8 sectores)',   qty: 8,  unitPrice:  2_700 },
        { resourceId: P.mob_carpa,       description: 'Carpas puestos médicos y de rescate',            qty: 5,  unitPrice:  2_200 },
      ],
    },
    {
      id: ORD_SPA.hidratacion, orderNumber: 'ORD-SPA-004',
      notes: 'Estaciones de hidratación y nutrición en ruta y zona de meta',
      lineItems: [
        { resourceId: P.pers_hidratacion, description: 'Personal hidratación (6 puestos × 2 días × 2 turnos)', qty: 24, unitPrice: 1_500 },
        { resourceId: P.mob_carpa,        description: 'Carpas hidratación en ruta',                           qty: 6,  unitPrice: 2_200 },
        { resourceId: P.mob_mesa,         description: 'Mesas distribución agua y geles',                      qty: 24, unitPrice:   340 },
        { resourceId: P.mob_bano,         description: 'Baños portátiles (20 pzas × 2 días)',                  qty: 20, unitPrice: 1_350 },
      ],
    },
    {
      id: ORD_SPA.marketing, orderNumber: 'ORD-SPA-005',
      notes: 'Marketing de experiencia, kit Spartan y activación de marca',
      lineItems: [
        { resourceId: P.svc_fotografia,   description: 'Fotógrafo profesional en obstáculos y meta',    qty: 1,  unitPrice: 42_000 },
        { resourceId: P.sistema_sonido,   description: 'Sonido animación zona salida y meta',           qty: 1,  unitPrice: 17_000 },
        { resourceId: P.mob_carpa,        description: 'Carpas expo marcas y activaciones',             qty: 8,  unitPrice:  2_200 },
        { resourceId: P.pers_coordinador, description: 'Coordinador de experiencia y activación',       qty: 1,  unitPrice:  2_700 },
      ],
    },
    {
      id: ORD_SPA.premiacion, orderNumber: 'ORD-SPA-006',
      notes: 'Medallas finisher y ceremonia de premiación por categorías',
      lineItems: [
        { resourceId: P.pers_juez,        description: 'Jueces certificados control obstáculos (5)',    qty: 5,  unitPrice:  5_500 },
        { resourceId: P.mob_mesa,         description: 'Mesas y montaje zona premiación',               qty: 12, unitPrice:    340 },
        { resourceId: P.pers_coordinador, description: 'Coordinador de ceremonia premiación',           qty: 2,  unitPrice:  2_700 },
      ],
    },
    {
      id: ORD_SPA.audiovisual, orderNumber: 'ORD-SPA-007',
      notes: 'Cobertura audiovisual, streaming y pantallas de resultados',
      lineItems: [
        { resourceId: P.svc_streaming,  description: 'Streaming en vivo 2 días (obstáculos + meta)',   qty: 1, unitPrice: 34_000 },
        { resourceId: P.pantalla_led,   description: 'Pantalla LED resultados y transmisión',          qty: 1, unitPrice: 27_000 },
        { resourceId: P.generador,      description: 'Generador audiovisual (3 días)',                 qty: 3, unitPrice: 10_000 },
      ],
    },
    {
      id: ORD_SPA.permisos, orderNumber: 'ORD-SPA-008',
      notes: 'Permisos INAH zona arqueológica, SEMARNAT y seguros evento',
      lineItems: [
        { resourceId: P.pers_coordinador, description: 'Coordinador trámites INAH y SEMARNAT',         qty: 1, unitPrice:  2_700 },
        { resourceId: P.svc_transporte,   description: 'Traslados documentación y coordinación',       qty: 3, unitPrice:  9_000 },
      ],
    },
    {
      id: ORD_SPA.voluntariado, orderNumber: 'ORD-SPA-009',
      notes: 'Coordinación voluntarios en obstáculos y control de ruta',
      lineItems: [
        { resourceId: P.pers_voluntario,  description: 'Coordinador general de voluntarios',           qty: 1,  unitPrice:  4_200 },
        { resourceId: P.pers_coordinador, description: 'Líderes de sector obstáculos (8 sectores)',    qty: 8,  unitPrice:  2_700 },
        { resourceId: P.radio_comunicacion, description: 'Radios líderes voluntarios',                qty: 8,  unitPrice:  1_050 },
      ],
    },
    {
      id: ORD_SPA.expo_meta, orderNumber: 'ORD-SPA-010',
      notes: 'Festival de llegada, zona de recuperación y expo Spartan',
      lineItems: [
        { resourceId: P.mob_carpa,       description: 'Carpas zona meta, recuperación y festival',    qty: 12, unitPrice:  2_200 },
        { resourceId: P.mob_mesa,        description: 'Mesas servicio zona meta y expo',              qty: 25, unitPrice:    340 },
        { resourceId: P.svc_limpieza,    description: 'Limpieza post-evento (2 días × 2 turnos)',     qty: 4,  unitPrice:  4_500 },
        { resourceId: P.generador,       description: 'Generador zona expo y festival (3 días)',      qty: 3,  unitPrice: 10_000 },
      ],
    },
  ]

  for (const ord of ordSpaDefs) {
    const subtotal = ord.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
    const taxAmt   = subtotal * 0.16
    await prisma.order.upsert({
      where:  { id: ord.id },
      update: {},
      create: {
        id: ord.id, tenantId: tid,
        orderNumber: ord.orderNumber,
        eventId: EV.spartan,
        clientId: CLIENT_ID,
        priceListId: PL_PROD,
        status: 'CONFIRMED',
        pricingTier: 'NORMAL',
        subtotal, taxPct: 16, taxAmount: taxAmt, total: subtotal + taxAmt,
        notes: ord.notes,
        isBudgetOrder: true,
        createdById: uid,
        lineItems: {
          create: ord.lineItems.map((li, i) => ({
            resourceId:  li.resourceId,
            description: li.description,
            pricingTier: 'NORMAL' as const,
            unitPrice:   li.unitPrice,
            quantity:    li.qty,
            lineTotal:   li.qty * li.unitPrice,
            sortOrder:   i,
          })),
        },
      },
    })
  }
  console.log(`✅ ${ordSpaDefs.length} órdenes Spartan`)

  // ── 8c. Link orders → budget lines (Spartan) ───────────────────────────────
  const blOrdMapSpa = [
    { blId: BL_SPA.infraestructura, ordId: ORD_SPA.infraestructura },
    { blId: BL_SPA.cronometraje,    ordId: ORD_SPA.cronometraje    },
    { blId: BL_SPA.seguridad,       ordId: ORD_SPA.seguridad       },
    { blId: BL_SPA.hidratacion,     ordId: ORD_SPA.hidratacion     },
    { blId: BL_SPA.marketing,       ordId: ORD_SPA.marketing       },
    { blId: BL_SPA.premiacion,      ordId: ORD_SPA.premiacion      },
    { blId: BL_SPA.audiovisual,     ordId: ORD_SPA.audiovisual     },
    { blId: BL_SPA.permisos,        ordId: ORD_SPA.permisos        },
    { blId: BL_SPA.voluntariado,    ordId: ORD_SPA.voluntariado    },
    { blId: BL_SPA.expo_meta,       ordId: ORD_SPA.expo_meta       },
  ]
  for (const { blId, ordId } of blOrdMapSpa) {
    await prisma.budgetLineDirectOrder.upsert({
      where:  { budgetLineId_orderId: { budgetLineId: blId, orderId: ordId } },
      update: {},
      create: { id: `bld-spa-${blId}`, budgetLineId: blId, orderId: ordId },
    })
  }
  console.log(`✅ Budget line → order links Spartan: ${blOrdMapSpa.length}`)

  // ── 8d. Timeline: Spartan ──────────────────────────────────────────────────
  const PH_SPA = {
    preproduccion: 'act-spa-phase-preproduccion',
    montaje:       'act-spa-phase-montaje',
    dia1:          'act-spa-phase-dia1',
    dia2:          'act-spa-phase-dia2',
    desmontaje:    'act-spa-phase-desmontaje',
  }

  const actSpaDefs: ActDef[] = [
    // FASES
    { id: PH_SPA.preproduccion, title: 'Pre-producción Spartan',      type: 'PHASE', status: 'IN_PROGRESS', priority: 'HIGH',
      startDate: '2026-07-15T09:00:00-06:00', endDate: '2026-10-06T18:00:00-06:00', color: '#7c3aed', position: 1 },
    { id: PH_SPA.montaje,       title: 'Construcción y Montaje',       type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-10-07T07:00:00-06:00', endDate: '2026-10-08T22:00:00-06:00', color: '#0284c7', position: 10 },
    { id: PH_SPA.dia1,          title: 'Día 1 - Sábado 9 Oct',        type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-10-09T05:00:00-06:00', endDate: '2026-10-09T20:00:00-06:00', color: '#be185d', position: 20 },
    { id: PH_SPA.dia2,          title: 'Día 2 - Domingo 10 Oct',      type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-10-10T05:00:00-06:00', endDate: '2026-10-10T18:00:00-06:00', color: '#be185d', position: 30 },
    { id: PH_SPA.desmontaje,    title: 'Desmontaje y Restauración',   type: 'PHASE', status: 'PENDING', priority: 'HIGH',
      startDate: '2026-10-10T18:00:00-06:00', endDate: '2026-10-11T20:00:00-06:00', color: '#374151', position: 40 },

    // PRE-PRODUCCIÓN
    { id: 'act-spa-permiso-inah',  title: 'Solicitud permiso INAH zona arqueológica',         type: 'TASK',      priority: 'CRITICAL', status: 'IN_PROGRESS',
      startDate: '2026-07-15T09:00:00-06:00', endDate: '2026-08-15T18:00:00-06:00', parentId: PH_SPA.preproduccion, position: 2 },
    { id: 'act-spa-semarnat',      title: 'Aprobación SEMARNAT impacto ambiental',             type: 'TASK',      priority: 'CRITICAL', status: 'IN_PROGRESS',
      startDate: '2026-07-15T09:00:00-06:00', endDate: '2026-08-20T18:00:00-06:00', parentId: PH_SPA.preproduccion, position: 3 },
    { id: 'act-spa-disenio',       title: 'Diseño técnico del circuito de obstáculos',         type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-07-20T09:00:00-06:00', endDate: '2026-08-10T18:00:00-06:00', parentId: PH_SPA.preproduccion, position: 4 },
    { id: 'act-spa-inscripciones', title: 'Apertura inscripciones (Sprint / Super / Beast)',   type: 'MILESTONE', priority: 'HIGH', color: '#16a34a',
      startDate: '2026-08-01T09:00:00-06:00', endDate: '2026-08-01T12:00:00-06:00', parentId: PH_SPA.preproduccion, position: 5 },
    { id: 'act-spa-seguro',        title: 'Contratación seguro RC y accidentes de atletas',   type: 'TASK',      priority: 'CRITICAL',
      startDate: '2026-08-10T09:00:00-06:00', endDate: '2026-08-25T18:00:00-06:00', parentId: PH_SPA.preproduccion, position: 6 },
    { id: 'act-spa-recorrido',     title: 'Recorrido técnico de terreno con constructores',   type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-08-20T08:00:00-06:00', endDate: '2026-08-20T17:00:00-06:00', parentId: PH_SPA.preproduccion, position: 7 },
    { id: 'act-spa-kit',           title: 'Producción kit del competidor (chip, playera, medalla)', type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-25T09:00:00-06:00', endDate: '2026-09-25T18:00:00-06:00', parentId: PH_SPA.preproduccion, position: 8 },
    { id: 'act-spa-voluntarios',   title: 'Reclutamiento y capacitación de voluntarios y jueces', type: 'MEETING', priority: 'MEDIUM',
      startDate: '2026-09-01T09:00:00-06:00', endDate: '2026-10-03T18:00:00-06:00', parentId: PH_SPA.preproduccion, position: 9 },
    { id: 'act-spa-entrega-kits',  title: 'Entrega de kits (Previo al evento en punto de control)', type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-10-06T09:00:00-06:00', endDate: '2026-10-06T20:00:00-06:00', parentId: PH_SPA.preproduccion, position: 10 },

    // MONTAJE
    { id: 'act-spa-mont-obst',    title: 'Construcción obstáculos (muros, fosos, redes)',     type: 'LOGISTICS', priority: 'CRITICAL',
      startDate: '2026-10-07T07:00:00-06:00', endDate: '2026-10-08T16:00:00-06:00', parentId: PH_SPA.montaje, position: 11 },
    { id: 'act-spa-mont-timing',  title: 'Instalación timing y control de penalizaciones',    type: 'TECHNICAL', priority: 'CRITICAL',
      startDate: '2026-10-08T08:00:00-06:00', endDate: '2026-10-08T18:00:00-06:00', parentId: PH_SPA.montaje, position: 12 },
    { id: 'act-spa-mont-seguridad','title': 'Señalización de ruta y posicionamiento médico',  type: 'SECURITY',  priority: 'CRITICAL',
      startDate: '2026-10-07T14:00:00-06:00', endDate: '2026-10-08T17:00:00-06:00', parentId: PH_SPA.montaje, position: 13 },
    { id: 'act-spa-mont-sonido',  title: 'Instalación sonido y pantalla zona de meta',        type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-10-08T10:00:00-06:00', endDate: '2026-10-08T20:00:00-06:00', parentId: PH_SPA.montaje, position: 14 },
    { id: 'act-spa-inspeccion',   title: 'Inspección técnica de seguridad de obstáculos',     type: 'TECHNICAL', priority: 'CRITICAL', color: '#f59e0b',
      startDate: '2026-10-08T18:00:00-06:00', endDate: '2026-10-08T21:00:00-06:00', parentId: PH_SPA.montaje, position: 15 },

    // DÍA 1
    { id: 'act-spa-d1-briefing',   title: 'Día 1: Briefing general del equipo operativo',    type: 'MEETING',   priority: 'CRITICAL',
      startDate: '2026-10-09T05:00:00-06:00', endDate: '2026-10-09T05:45:00-06:00', parentId: PH_SPA.dia1, position: 21 },
    { id: 'act-spa-d1-salida1',    title: 'Día 1: Primera ola de salida Beast (21K)',        type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-10-09T07:00:00-06:00', endDate: '2026-10-09T07:00:00-06:00', parentId: PH_SPA.dia1, position: 22 },
    { id: 'act-spa-d1-salida2',    title: 'Día 1: Primera ola salida Super (13K)',           type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-10-09T08:00:00-06:00', endDate: '2026-10-09T08:00:00-06:00', parentId: PH_SPA.dia1, position: 23 },
    { id: 'act-spa-d1-salida3',    title: 'Día 1: Primera ola salida Sprint (5K)',           type: 'MILESTONE', priority: 'HIGH', color: '#16a34a',
      startDate: '2026-10-09T09:00:00-06:00', endDate: '2026-10-09T09:00:00-06:00', parentId: PH_SPA.dia1, position: 24 },
    { id: 'act-spa-d1-operacion',  title: 'Día 1: Monitoreo continuo obstáculos y ruta',    type: 'SECURITY',  priority: 'CRITICAL',
      startDate: '2026-10-09T07:00:00-06:00', endDate: '2026-10-09T17:00:00-06:00', parentId: PH_SPA.dia1, position: 25 },
    { id: 'act-spa-d1-cierre',     title: 'Día 1: Cierre de ruta y último participante',    type: 'MILESTONE', priority: 'HIGH', color: '#6b7280',
      startDate: '2026-10-09T17:00:00-06:00', endDate: '2026-10-09T17:00:00-06:00', parentId: PH_SPA.dia1, position: 26 },
    { id: 'act-spa-d1-premiacion', title: 'Día 1: Ceremonia premiación categorías élite',   type: 'MILESTONE', priority: 'HIGH', color: '#d97706',
      startDate: '2026-10-09T18:00:00-06:00', endDate: '2026-10-09T19:30:00-06:00', parentId: PH_SPA.dia1, position: 27 },

    // DÍA 2
    { id: 'act-spa-d2-briefing',   title: 'Día 2: Briefing y revisión de obstáculos',       type: 'MEETING',   priority: 'CRITICAL',
      startDate: '2026-10-10T05:00:00-06:00', endDate: '2026-10-10T05:30:00-06:00', parentId: PH_SPA.dia2, position: 31 },
    { id: 'act-spa-d2-salidas',    title: 'Día 2: Salidas olas Sprint / Super / Beast',     type: 'LOGISTICS', priority: 'CRITICAL',
      startDate: '2026-10-10T07:00:00-06:00', endDate: '2026-10-10T12:00:00-06:00', parentId: PH_SPA.dia2, position: 32 },
    { id: 'act-spa-d2-operacion',  title: 'Día 2: Monitoreo de ruta y atención médica',    type: 'SECURITY',  priority: 'CRITICAL',
      startDate: '2026-10-10T07:00:00-06:00', endDate: '2026-10-10T15:00:00-06:00', parentId: PH_SPA.dia2, position: 33 },
    { id: 'act-spa-d2-cierre',     title: 'Día 2: Cierre oficial de carrera',               type: 'MILESTONE', priority: 'CRITICAL', color: '#6b7280',
      startDate: '2026-10-10T15:00:00-06:00', endDate: '2026-10-10T15:00:00-06:00', parentId: PH_SPA.dia2, position: 34 },
    { id: 'act-spa-d2-premiacion', title: 'Día 2: Ceremonia premiación general + overall',  type: 'MILESTONE', priority: 'HIGH', color: '#d97706',
      startDate: '2026-10-10T16:00:00-06:00', endDate: '2026-10-10T17:30:00-06:00', parentId: PH_SPA.dia2, position: 35 },

    // DESMONTAJE
    { id: 'act-spa-desm-obst',     title: 'Desmontaje de obstáculos y estructuras',         type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-10-10T18:00:00-06:00', endDate: '2026-10-11T16:00:00-06:00', parentId: PH_SPA.desmontaje, position: 41 },
    { id: 'act-spa-desm-timing',   title: 'Retiro de equipos de cronometraje',              type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-10-10T18:00:00-06:00', endDate: '2026-10-10T21:00:00-06:00', parentId: PH_SPA.desmontaje, position: 42 },
    { id: 'act-spa-desm-limpieza', title: 'Limpieza y restauración del terreno (INAH)',     type: 'LOGISTICS', priority: 'CRITICAL',
      startDate: '2026-10-11T06:00:00-06:00', endDate: '2026-10-11T18:00:00-06:00', parentId: PH_SPA.desmontaje, position: 43, notes: 'INAH requiere evidencia fotográfica del estado final del terreno' },
    { id: 'act-spa-desm-informe',  title: 'Entrega de terreno e informe ambiental SEMARNAT', type: 'MILESTONE', priority: 'CRITICAL', color: '#6b7280',
      startDate: '2026-10-11T20:00:00-06:00', endDate: '2026-10-11T20:00:00-06:00', parentId: PH_SPA.desmontaje, position: 44 },
  ]

  const phasesS  = actSpaDefs.filter(a => !a.parentId)
  const childrenS = actSpaDefs.filter(a => !!a.parentId)
  for (const a of [...phasesS, ...childrenS]) {
    await prisma.eventActivity.upsert({
      where:  { id: a.id },
      update: {},
      create: {
        id: a.id, tenantId: tid, eventId: EV.spartan,
        title: a.title, activityType: a.type as any,
        status: (a.status ?? 'PENDING') as any,
        priority: (a.priority ?? 'MEDIUM') as any,
        startDate: d(a.startDate), endDate: d(a.endDate),
        color: a.color, notes: a.notes,
        parentId: a.parentId, position: a.position,
        createdById: uid,
      },
    })
  }
  console.log(`✅ Timeline Spartan: ${actSpaDefs.length} actividades`)

  // ── Resumen final ──────────────────────────────────────────────────────────
  console.log('\n🏆 Seed deportivo completo!')
  console.log(`   Recursos concepto: ${conceptDefs.length}`)
  console.log(`   Recursos producción: ${prodDefs.length}`)
  console.log(`   Lista de precios: ${plConcept.name} + ${plProd.name}`)
  console.log(`   Evento 1: ${eventMaraton.name}`)
  console.log(`     → ${blMarDefs.length} líneas de presupuesto | ${ordMarDefs.length} órdenes | ${actMarDefs.length} actividades`)
  console.log(`   Evento 2: ${eventSpartan.name}`)
  console.log(`     → ${blSpaDefs.length} líneas de presupuesto | ${ordSpaDefs.length} órdenes | ${actSpaDefs.length} actividades`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
