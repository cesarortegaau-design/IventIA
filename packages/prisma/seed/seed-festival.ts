/**
 * seed-festival.ts
 * Comprehensive seed for a music/entertainment Festival production event.
 * Run: cd packages/prisma && npx ts-node seed/seed-festival.ts
 */
import { PrismaClient } from 'prisma-generated'

const prisma = new PrismaClient()

// ─── Fixed IDs ────────────────────────────────────────────────────────────────
const T   = 'expo-santa-fe'           // tenant slug (resolved at runtime)
const ADM = 'admin@exposaantafe.com.mx'

// Concept resources
const C_IDS = {
  artistica:    'res-concept-artistica',
  tecnica:      'res-concept-tecnica',
  logistica:    'res-concept-logistica',
  marketing:    'res-concept-marketing',
  seguridad:    'res-concept-seguridad',
  catering:     'res-concept-catering',
  audiovisual:  'res-concept-audiovisual',
  admin:        'res-concept-admin',
}

// Production resources
const P_IDS = {
  // EQUIPMENT
  sonido:       'res-prod-sistema-sonido',
  luces:        'res-prod-sistema-luces',
  generador:    'res-prod-generador',
  pantalla:     'res-prod-pantalla-led',
  camara:       'res-prod-camara-broadcast',
  // SERVICE
  produccion:   'res-prod-svc-produccion',
  streaming:    'res-prod-svc-streaming',
  transporte:   'res-prod-svc-transporte',
  limpieza:     'res-prod-svc-limpieza',
  primeros:     'res-prod-svc-primeros-auxilios',
  // PERSONAL
  tecnico:      'res-prod-pers-tecnico',
  seguridad_p:  'res-prod-pers-seguridad',
  hostess:      'res-prod-pers-hostess',
  fotografo:    'res-prod-pers-fotografo',
  // FURNITURE / CONSUMABLE
  escenario:    'res-prod-escenario',
  tarima:       'res-prod-tarima',
  camerino:     'res-prod-camerino',
  bano:         'res-prod-bano-portatil',
  valla:        'res-prod-valla-seguridad',
}

// Price lists
const PL_CONCEPT = 'pl-festival-conceptos-2026'
const PL_PROD    = 'pl-festival-produccion-2026'

// Client
const CLIENT_ID  = 'client-festival-campo-marte'

// Event
const EVENT_ID   = 'event-festival-campo-marte-2026'

// Budget
const BUDGET_ID  = 'budget-festival-2026'

// Budget lines (one per concept)
const BL = {
  artistica:   'bl-fest-artistica',
  tecnica:     'bl-fest-tecnica',
  logistica:   'bl-fest-logistica',
  marketing:   'bl-fest-marketing',
  seguridad:   'bl-fest-seguridad',
  catering:    'bl-fest-catering',
  audiovisual: 'bl-fest-audiovisual',
  admin:       'bl-fest-admin',
}

// Orders
const ORD = {
  artistica:   'ord-festival-artistica-001',
  tecnica:     'ord-festival-tecnica-001',
  logistica:   'ord-festival-logistica-001',
  marketing:   'ord-festival-marketing-001',
  seguridad:   'ord-festival-seguridad-001',
  catering:    'ord-festival-catering-001',
  audiovisual: 'ord-festival-audiovisual-001',
  admin:       'ord-festival-admin-001',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function d(iso: string) { return new Date(iso) }

async function main() {
  console.log('🎪 Seeding Festival Campo Marte 2026...')

  // ── 1. Resolve tenant & admin ──────────────────────────────────────────────
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: T } })
  const admin  = await prisma.user.findUniqueOrThrow({ where: { email: ADM } })
  const tid    = tenant.id
  const uid    = admin.id
  console.log(`✅ Tenant: ${tenant.name} | Admin: ${admin.email}`)

  // ── 2. Concept resources ───────────────────────────────────────────────────
  const conceptDefs = [
    { id: C_IDS.artistica,   code: 'FEST-CON-ARTISTICA',  name: 'Producción Artística',          description: 'Artistas, bandas, riders técnicos y producción artística general' },
    { id: C_IDS.tecnica,     code: 'FEST-CON-TECNICA',    name: 'Producción Técnica',             description: 'Sonido, iluminación, backline y dirección técnica de escenario' },
    { id: C_IDS.logistica,   code: 'FEST-CON-LOGISTICA',  name: 'Logística y Montaje',            description: 'Transporte, montaje de estructuras, escenarios y tarimas' },
    { id: C_IDS.marketing,   code: 'FEST-CON-MARKETING',  name: 'Comunicación y Marketing',       description: 'Publicidad, redes sociales, prensa y material gráfico' },
    { id: C_IDS.seguridad,   code: 'FEST-CON-SEGURIDAD',  name: 'Seguridad',                     description: 'Seguridad privada, vallas, control de acceso y primeros auxilios' },
    { id: C_IDS.catering,    code: 'FEST-CON-CATERING',   name: 'Catering y Hospitalidad',        description: 'Catering de artistas, área VIP, hospitalidad y backstage' },
    { id: C_IDS.audiovisual, code: 'FEST-CON-AUDIOVISUAL',name: 'Producción Audiovisual',         description: 'Fotografía, video, streaming en vivo y pantallas LED' },
    { id: C_IDS.admin,       code: 'FEST-CON-ADMIN',      name: 'Administración y Permisos',      description: 'Permisos SEDEMA, SAGARPA, seguros, IMSS y gestión administrativa' },
  ]
  for (const r of conceptDefs) {
    await prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tid, code: r.code } },
      update: {},
      create: { id: r.id, tenantId: tid, code: r.code, name: r.name, type: 'CONCEPT', description: r.description, unit: 'global' },
    })
  }
  console.log(`✅ ${conceptDefs.length} concept resources`)

  // ── 3. Production resources ────────────────────────────────────────────────
  const prodDefs = [
    // EQUIPMENT
    { id: P_IDS.sonido,    code: 'FEST-EQ-SONIDO',    name: 'Sistema de Sonido Line Array (rig completo)',  type: 'EQUIPMENT', unit: 'día', description: 'PA, monitores, consola, backline completo' },
    { id: P_IDS.luces,     code: 'FEST-EQ-LUCES',     name: 'Sistema de Iluminación Escénica',             type: 'EQUIPMENT', unit: 'día', description: 'Moving heads, wash, strobes, controladora' },
    { id: P_IDS.generador, code: 'FEST-EQ-GENERADOR', name: 'Generador Eléctrico (500 kVA)',               type: 'EQUIPMENT', unit: 'día', description: 'Generador con operador y cable distribución' },
    { id: P_IDS.pantalla,  code: 'FEST-EQ-PANTALLA',  name: 'Pantalla LED Gigante (10x6m)',                type: 'EQUIPMENT', unit: 'día', description: 'Pantalla P4 outdoor con media server' },
    { id: P_IDS.camara,    code: 'FEST-EQ-CAMARA',    name: 'Cámara Broadcast + Operador',                 type: 'EQUIPMENT', unit: 'día', description: 'Cámara 4K con operador certificado' },
    // SERVICE
    { id: P_IDS.produccion,code: 'FEST-SVC-PROD',     name: 'Dirección de Producción',                    type: 'SERVICE',   unit: 'evento', description: 'Director de producción + asistentes' },
    { id: P_IDS.streaming, code: 'FEST-SVC-STREAMING',name: 'Servicio de Streaming en Vivo',              type: 'SERVICE',   unit: 'evento', description: 'CDN, streaming multi-plataforma hasta 50k usuarios' },
    { id: P_IDS.transporte,code: 'FEST-SVC-TRANSPORTE',name: 'Transporte y Logística (flete)',            type: 'SERVICE',   unit: 'viaje', description: 'Camión de transporte para equipo y personal' },
    { id: P_IDS.limpieza,  code: 'FEST-SVC-LIMPIEZA', name: 'Servicio de Limpieza y Saneamiento',         type: 'SERVICE',   unit: 'turno', description: 'Cuadrilla de limpieza pre/durante/post evento' },
    { id: P_IDS.primeros,  code: 'FEST-SVC-PRIMEROS', name: 'Primeros Auxilios y Paramédicos',             type: 'SERVICE',   unit: 'día', description: 'Ambulancia + 2 paramédicos certificados' },
    // PERSONAL
    { id: P_IDS.tecnico,   code: 'FEST-PERS-TECNICO', name: 'Técnico de Escenario',                       type: 'PERSONAL',  unit: 'turno', description: 'Técnico especializado en producción en vivo' },
    { id: P_IDS.seguridad_p,code:'FEST-PERS-SEGURIDAD',name: 'Elemento de Seguridad Privada',             type: 'PERSONAL',  unit: 'turno', description: 'Guardia certificado con radio comunicación' },
    { id: P_IDS.hostess,   code: 'FEST-PERS-HOSTESS', name: 'Hostess / Promotora',                        type: 'PERSONAL',  unit: 'turno', description: 'Personal de atención en accesos y áreas VIP' },
    { id: P_IDS.fotografo, code: 'FEST-PERS-FOTO',    name: 'Fotógrafo / Videógrafo',                     type: 'PERSONAL',  unit: 'día', description: 'Registro fotográfico y video profesional' },
    // FURNITURE / CONSUMABLE
    { id: P_IDS.escenario, code: 'FEST-MOB-ESCENARIO',name: 'Escenario Principal (20x12m)',               type: 'FURNITURE', unit: 'evento', description: 'Escenario modular con cubierta y travesías' },
    { id: P_IDS.tarima,    code: 'FEST-MOB-TARIMA',   name: 'Tarima Modulan 1x1m',                        type: 'FURNITURE', unit: 'pza', description: 'Módulo de tarima 1x1m aluminio', stock: 500, checkStock: true },
    { id: P_IDS.camerino,  code: 'FEST-MOB-CAMERINO', name: 'Módulo Camerino (estructura)',               type: 'FURNITURE', unit: 'pza', description: 'Módulo prefabricado para artistas' },
    { id: P_IDS.bano,      code: 'FEST-MOB-BANO',     name: 'Baño Portátil (sanitización)',               type: 'FURNITURE', unit: 'pza', description: 'Sanitario portátil con servicio de limpieza', stock: 50, checkStock: true },
    { id: P_IDS.valla,     code: 'FEST-MOB-VALLA',    name: 'Valla de Seguridad (metro lineal)',           type: 'FURNITURE', unit: 'ml', description: 'Valla metálica crowd control' },
  ]
  for (const r of prodDefs) {
    await prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tid, code: r.code } },
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
    create: {
      id: PL_CONCEPT, tenantId: tid,
      name: 'Conceptos Festival 2026',
      isConceptList: true, isActive: true,
    },
  })
  const conceptPrices: Record<string, { early: number; normal: number; late: number }> = {
    [C_IDS.artistica]:   { early: 1_200_000, normal: 1_400_000, late: 1_600_000 },
    [C_IDS.tecnica]:     { early:   700_000, normal:   820_000, late:   950_000 },
    [C_IDS.logistica]:   { early:   350_000, normal:   420_000, late:   500_000 },
    [C_IDS.marketing]:   { early:   180_000, normal:   220_000, late:   270_000 },
    [C_IDS.seguridad]:   { early:   240_000, normal:   290_000, late:   350_000 },
    [C_IDS.catering]:    { early:   160_000, normal:   200_000, late:   240_000 },
    [C_IDS.audiovisual]: { early:   280_000, normal:   340_000, late:   410_000 },
    [C_IDS.admin]:       { early:    90_000, normal:   110_000, late:   135_000 },
  }
  for (const [resourceId, p] of Object.entries(conceptPrices)) {
    const pliId = `pli-concept-${resourceId}`
    await prisma.priceListItem.upsert({
      where: { id: pliId },
      update: {},
      create: { id: pliId, priceListId: PL_CONCEPT, resourceId, earlyPrice: p.early, normalPrice: p.normal, latePrice: p.late, unit: 'global', cost: p.normal * 0.7 },
    })
  }
  console.log(`✅ Concept price list: ${plConcept.name}`)

  // ── 5. Production price list ───────────────────────────────────────────────
  const plProd = await prisma.priceList.upsert({
    where:  { id: PL_PROD },
    update: {},
    create: {
      id: PL_PROD, tenantId: tid,
      name: 'Producción Festival 2026',
      earlyCutoff:  d('2026-06-30T23:59:59Z'),
      normalCutoff: d('2026-07-31T23:59:59Z'),
      isConceptList: false, isActive: true,
    },
  })
  const prodPrices: Record<string, { early: number; normal: number; late: number; cost: number; unit?: string }> = {
    [P_IDS.sonido]:     { early: 85_000,  normal: 95_000,  late: 110_000, cost: 60_000,  unit: 'día' },
    [P_IDS.luces]:      { early: 55_000,  normal: 65_000,  late: 78_000,  cost: 42_000,  unit: 'día' },
    [P_IDS.generador]:  { early: 18_000,  normal: 22_000,  late: 27_000,  cost: 14_000,  unit: 'día' },
    [P_IDS.pantalla]:   { early: 38_000,  normal: 46_000,  late: 55_000,  cost: 30_000,  unit: 'día' },
    [P_IDS.camara]:     { early: 12_000,  normal: 15_000,  late: 19_000,  cost: 9_000,   unit: 'día' },
    [P_IDS.produccion]: { early: 95_000,  normal: 115_000, late: 140_000, cost: 75_000,  unit: 'evento' },
    [P_IDS.streaming]:  { early: 42_000,  normal: 52_000,  late: 65_000,  cost: 32_000,  unit: 'evento' },
    [P_IDS.transporte]: { early: 8_500,   normal: 10_000,  late: 12_500,  cost: 6_500,   unit: 'viaje' },
    [P_IDS.limpieza]:   { early: 4_200,   normal: 5_000,   late: 6_500,   cost: 3_200,   unit: 'turno' },
    [P_IDS.primeros]:   { early: 14_000,  normal: 17_000,  late: 21_000,  cost: 11_000,  unit: 'día' },
    [P_IDS.tecnico]:    { early: 2_800,   normal: 3_500,   late: 4_500,   cost: 2_200,   unit: 'turno' },
    [P_IDS.seguridad_p]:{ early: 1_800,   normal: 2_200,   late: 2_800,   cost: 1_400,   unit: 'turno' },
    [P_IDS.hostess]:    { early: 1_600,   normal: 2_000,   late: 2_600,   cost: 1_200,   unit: 'turno' },
    [P_IDS.fotografo]:  { early: 8_000,   normal: 9_500,   late: 12_000,  cost: 6_000,   unit: 'día' },
    [P_IDS.escenario]:  { early: 180_000, normal: 210_000, late: 250_000, cost: 140_000, unit: 'evento' },
    [P_IDS.tarima]:     { early: 320,     normal: 380,     late: 460,     cost: 240,     unit: 'pza' },
    [P_IDS.camerino]:   { early: 8_500,   normal: 10_000,  late: 12_500,  cost: 6_500,   unit: 'pza' },
    [P_IDS.bano]:       { early: 1_200,   normal: 1_500,   late: 1_900,   cost: 900,     unit: 'pza' },
    [P_IDS.valla]:      { early: 180,     normal: 220,     late: 280,     cost: 140,     unit: 'ml' },
  }
  for (const [resourceId, p] of Object.entries(prodPrices)) {
    const pliId = `pli-prod-${resourceId}`
    await prisma.priceListItem.upsert({
      where: { id: pliId },
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
      companyName: 'Festival Campo Marte S.A. de C.V.',
      email: 'produccion@festivalcampomarte.mx',
      phone: '+52 55 5555 1200',
      rfc: 'FCM2012045K0',
      addressCity: 'Ciudad de México',
      addressState: 'CDMX',
      addressCountry: 'MX',
    },
  })
  console.log(`✅ Client: ${client.companyName}`)

  // ── 7. Event ───────────────────────────────────────────────────────────────
  const event = await prisma.event.upsert({
    where:  { id: EVENT_ID },
    update: {},
    create: {
      id: EVENT_ID, tenantId: tid,
      code: 'FEST-CM-2026',
      name: 'Festival Campo Marte 2026',
      status: 'CONFIRMED',
      eventType: 'Festival',
      eventClass: 'Música en vivo',
      eventCategory: 'Entretenimiento masivo',
      venueLocation: 'Campo Marte, Miguel Hidalgo, CDMX',
      description: 'Festival de música multigenérico de 3 días en Campo Marte con capacidad para 30,000 personas por día. Producción integral con 3 escenarios, área VIP y zona gastronómica.',
      expectedAttendance: 90000,
      coordinator: 'Laura Mendoza',
      executive: 'Carlos Fuentes',
      primaryClientId: CLIENT_ID,
      priceListId: PL_CONCEPT,
      setupStart:    d('2026-08-11T07:00:00-06:00'),
      setupEnd:      d('2026-08-13T22:00:00-06:00'),
      eventStart:    d('2026-08-14T12:00:00-06:00'),
      eventEnd:      d('2026-08-16T23:59:00-06:00'),
      teardownStart: d('2026-08-17T06:00:00-06:00'),
      teardownEnd:   d('2026-08-18T20:00:00-06:00'),
      createdById: uid,
    },
  })
  console.log(`✅ Event: ${event.name}`)

  // ── 8. Budget ──────────────────────────────────────────────────────────────
  const budget = await prisma.budget.upsert({
    where:  { id: BUDGET_ID },
    update: {},
    create: {
      id: BUDGET_ID, tenantId: tid,
      eventId: EVENT_ID,
      priceListId: PL_CONCEPT,
      name: 'Presupuesto General Festival 2026',
      createdById: uid,
    },
  })

  // Budget lines — (directCostBudgeted = costo estimado; income = precio de venta concepto; utility se calcula)
  type BLDef = { id: string; resourceId: string; description: string; directCostBudgeted: number; indirectCostBudgeted: number; income: number; sortOrder: number }
  const blDefs: BLDef[] = [
    { id: BL.artistica,   resourceId: C_IDS.artistica,   description: 'Producción Artística',      directCostBudgeted: 840_000,  indirectCostBudgeted: 120_000, income: 1_400_000, sortOrder: 1 },
    { id: BL.tecnica,     resourceId: C_IDS.tecnica,     description: 'Producción Técnica',         directCostBudgeted: 570_000,  indirectCostBudgeted: 80_000,  income: 820_000,   sortOrder: 2 },
    { id: BL.logistica,   resourceId: C_IDS.logistica,   description: 'Logística y Montaje',        directCostBudgeted: 290_000,  indirectCostBudgeted: 45_000,  income: 420_000,   sortOrder: 3 },
    { id: BL.marketing,   resourceId: C_IDS.marketing,   description: 'Comunicación y Marketing',   directCostBudgeted: 155_000,  indirectCostBudgeted: 25_000,  income: 220_000,   sortOrder: 4 },
    { id: BL.seguridad,   resourceId: C_IDS.seguridad,   description: 'Seguridad',                  directCostBudgeted: 200_000,  indirectCostBudgeted: 35_000,  income: 290_000,   sortOrder: 5 },
    { id: BL.catering,    resourceId: C_IDS.catering,    description: 'Catering y Hospitalidad',    directCostBudgeted: 140_000,  indirectCostBudgeted: 20_000,  income: 200_000,   sortOrder: 6 },
    { id: BL.audiovisual, resourceId: C_IDS.audiovisual, description: 'Producción Audiovisual',     directCostBudgeted: 235_000,  indirectCostBudgeted: 40_000,  income: 340_000,   sortOrder: 7 },
    { id: BL.admin,       resourceId: C_IDS.admin,       description: 'Administración y Permisos',  directCostBudgeted: 75_000,   indirectCostBudgeted: 15_000,  income: 110_000,   sortOrder: 8 },
  ]
  for (const bl of blDefs) {
    const totalCost = bl.directCostBudgeted + bl.indirectCostBudgeted
    const utility   = bl.income - totalCost
    await prisma.budgetLine.upsert({
      where:  { id: bl.id },
      update: {},
      create: {
        id: bl.id, budgetId: BUDGET_ID, resourceId: bl.resourceId,
        description: bl.description,
        directCostBudgeted:   bl.directCostBudgeted,
        indirectCostBudgeted: bl.indirectCostBudgeted,
        income:   bl.income,
        utility:  utility,
        sortOrder: bl.sortOrder,
      },
    })
  }
  console.log(`✅ Budget: ${budget.name} (${blDefs.length} lines)`)

  // ── 9. Orders (budget orders, isBudgetOrder: true) ─────────────────────────
  type OrdDef = {
    id: string; orderNumber: string; description: string
    lineItems: { resourceId: string; description: string; qty: number; unitPrice: number }[]
  }
  const ordDefs: OrdDef[] = [
    {
      id: ORD.artistica, orderNumber: 'ORD-FEST-001',
      description: 'Producción Artística - Artistas y Riders',
      lineItems: [
        { resourceId: P_IDS.produccion, description: 'Dirección de producción artística (3 días)', qty: 1,  unitPrice: 115_000 },
        { resourceId: P_IDS.tecnico,    description: 'Técnico de escenario principal',              qty: 6,  unitPrice: 3_500  },
        { resourceId: P_IDS.hostess,    description: 'Hostess backstage y camerinos',               qty: 4,  unitPrice: 2_000  },
      ],
    },
    {
      id: ORD.tecnica, orderNumber: 'ORD-FEST-002',
      description: 'Producción Técnica - Sonido, Luces y Energía',
      lineItems: [
        { resourceId: P_IDS.sonido,    description: 'Sistema de sonido line array (3 días)',         qty: 3,  unitPrice: 95_000 },
        { resourceId: P_IDS.luces,     description: 'Sistema de iluminación escénica (3 días)',      qty: 3,  unitPrice: 65_000 },
        { resourceId: P_IDS.generador, description: 'Generador 500 kVA (5 días incl. montaje)',      qty: 5,  unitPrice: 22_000 },
        { resourceId: P_IDS.tecnico,   description: 'Técnico de sonido senior (3 días x 2 turnos)',  qty: 6,  unitPrice: 3_500  },
      ],
    },
    {
      id: ORD.logistica, orderNumber: 'ORD-FEST-003',
      description: 'Logística y Montaje - Estructuras y Transporte',
      lineItems: [
        { resourceId: P_IDS.escenario,  description: 'Escenario principal 20x12m (evento completo)', qty: 1,  unitPrice: 210_000 },
        { resourceId: P_IDS.tarima,     description: 'Tarimas modulares 1x1m (área artistas)',        qty: 120, unitPrice: 380    },
        { resourceId: P_IDS.camerino,   description: 'Módulos de camerino artistas (5 pzas)',         qty: 5,  unitPrice: 10_000  },
        { resourceId: P_IDS.transporte, description: 'Fletes de equipo (ciudad)',                     qty: 12, unitPrice: 10_000  },
      ],
    },
    {
      id: ORD.marketing, orderNumber: 'ORD-FEST-004',
      description: 'Comunicación y Marketing Digital',
      lineItems: [
        { resourceId: P_IDS.produccion, description: 'Producción de contenidos digitales y prensa',  qty: 1,  unitPrice: 65_000  },
        { resourceId: P_IDS.fotografo,  description: 'Fotógrafo/Videógrafo oficial (3 días)',         qty: 3,  unitPrice: 9_500   },
        { resourceId: P_IDS.streaming,  description: 'Streaming en vivo multi-plataforma',            qty: 1,  unitPrice: 52_000  },
      ],
    },
    {
      id: ORD.seguridad, orderNumber: 'ORD-FEST-005',
      description: 'Seguridad Privada y Control de Acceso',
      lineItems: [
        { resourceId: P_IDS.seguridad_p, description: 'Elementos de seguridad (15 por turno x 6 turnos)', qty: 90, unitPrice: 2_200 },
        { resourceId: P_IDS.valla,       description: 'Valla crowd control (perímetro 600 ml)',            qty: 600, unitPrice: 220   },
        { resourceId: P_IDS.primeros,    description: 'Paramédicos y ambulancia (3 días)',                 qty: 3,  unitPrice: 17_000 },
      ],
    },
    {
      id: ORD.catering, orderNumber: 'ORD-FEST-006',
      description: 'Catering Artistas y Área VIP',
      lineItems: [
        { resourceId: P_IDS.hostess,   description: 'Hostess área VIP y hospitalidad (6 turnos)',    qty: 12, unitPrice: 2_000   },
        { resourceId: P_IDS.limpieza,  description: 'Limpieza área gastronómica (6 turnos)',          qty: 6,  unitPrice: 5_000   },
        { resourceId: P_IDS.bano,      description: 'Baños portátiles con servicio (20 pzas)',        qty: 20, unitPrice: 1_500   },
      ],
    },
    {
      id: ORD.audiovisual, orderNumber: 'ORD-FEST-007',
      description: 'Producción Audiovisual y Pantallas',
      lineItems: [
        { resourceId: P_IDS.pantalla,  description: 'Pantalla LED 10x6m (3 días evento + 1 prueba)',  qty: 4,  unitPrice: 46_000  },
        { resourceId: P_IDS.camara,    description: 'Cámaras broadcast + operador (3 días x 3 cáms)', qty: 9,  unitPrice: 15_000  },
        { resourceId: P_IDS.fotografo, description: 'Cobertura fotográfica artística (3 días)',        qty: 3,  unitPrice: 9_500   },
      ],
    },
    {
      id: ORD.admin, orderNumber: 'ORD-FEST-008',
      description: 'Administración, Permisos y Seguros',
      lineItems: [
        { resourceId: P_IDS.produccion, description: 'Gestión de permisos SEDEMA/CDMX',               qty: 1,  unitPrice: 45_000  },
        { resourceId: P_IDS.limpieza,   description: 'Limpieza general pre y post evento (8 turnos)',  qty: 8,  unitPrice: 5_000   },
      ],
    },
  ]

  for (const ord of ordDefs) {
    const subtotal = ord.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
    const taxAmt   = subtotal * 0.16
    const total    = subtotal + taxAmt

    await prisma.order.upsert({
      where:  { id: ord.id },
      update: {},
      create: {
        id: ord.id, tenantId: tid,
        orderNumber: ord.orderNumber,
        eventId: EVENT_ID,
        clientId: CLIENT_ID,
        priceListId: PL_PROD,
        status: 'CONFIRMED',
        pricingTier: 'NORMAL',
        subtotal, taxPct: 16, taxAmount: taxAmt, total,
        notes: ord.description,
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
  console.log(`✅ ${ordDefs.length} budget orders created`)

  // ── 10. Link orders → budget lines (BudgetLineDirectOrder) ────────────────
  const blOrderMap: Array<{ blId: string; ordId: string }> = [
    { blId: BL.artistica,   ordId: ORD.artistica   },
    { blId: BL.tecnica,     ordId: ORD.tecnica      },
    { blId: BL.logistica,   ordId: ORD.logistica    },
    { blId: BL.marketing,   ordId: ORD.marketing    },
    { blId: BL.seguridad,   ordId: ORD.seguridad    },
    { blId: BL.catering,    ordId: ORD.catering     },
    { blId: BL.audiovisual, ordId: ORD.audiovisual  },
    { blId: BL.admin,       ordId: ORD.admin        },
  ]
  for (const { blId, ordId } of blOrderMap) {
    await prisma.budgetLineDirectOrder.upsert({
      where:  { budgetLineId_orderId: { budgetLineId: blId, orderId: ordId } },
      update: {},
      create: { id: `bld-${blId}-${ordId}`, budgetLineId: blId, orderId: ordId },
    })
  }
  console.log(`✅ Budget line → order links: ${blOrderMap.length}`)

  // ── 11. Timeline (EventActivity) ───────────────────────────────────────────
  // Phase IDs (PHASE type activities act as parent containers)
  const PH = {
    preproduccion: 'act-fest-phase-preproduccion',
    montaje:       'act-fest-phase-montaje',
    dia1:          'act-fest-phase-dia1',
    dia2:          'act-fest-phase-dia2',
    dia3:          'act-fest-phase-dia3',
    desmontaje:    'act-fest-phase-desmontaje',
  }

  type ActDef = {
    id: string; title: string; type: string; status?: string; priority?: string
    startDate: string; endDate: string; parentId?: string; color?: string; notes?: string; position: number
  }

  const actDefs: ActDef[] = [
    // ── PHASES ──────────────────────────────────────────────────────────────
    { id: PH.preproduccion, title: 'Pre-producción',   type: 'PHASE', status: 'IN_PROGRESS', priority: 'HIGH',
      startDate: '2026-07-01T09:00:00-06:00', endDate: '2026-08-10T18:00:00-06:00',
      color: '#7c3aed', position: 1 },
    { id: PH.montaje, title: 'Montaje y Preparación',  type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-08-11T07:00:00-06:00', endDate: '2026-08-13T22:00:00-06:00',
      color: '#0284c7', position: 10 },
    { id: PH.dia1, title: 'Día 1 - Viernes 14 Ago',   type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-08-14T10:00:00-06:00', endDate: '2026-08-14T23:59:00-06:00',
      color: '#be185d', position: 20 },
    { id: PH.dia2, title: 'Día 2 - Sábado 15 Ago',    type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-08-15T10:00:00-06:00', endDate: '2026-08-15T23:59:00-06:00',
      color: '#be185d', position: 30 },
    { id: PH.dia3, title: 'Día 3 - Domingo 16 Ago',   type: 'PHASE', status: 'PENDING', priority: 'CRITICAL',
      startDate: '2026-08-16T10:00:00-06:00', endDate: '2026-08-16T23:59:00-06:00',
      color: '#be185d', position: 40 },
    { id: PH.desmontaje, title: 'Desmontaje y Cierre', type: 'PHASE', status: 'PENDING', priority: 'HIGH',
      startDate: '2026-08-17T06:00:00-06:00', endDate: '2026-08-18T20:00:00-06:00',
      color: '#374151', position: 50 },

    // ── PRE-PRODUCCIÓN ───────────────────────────────────────────────────────
    { id: 'act-fest-permisos',    title: 'Trámite de permisos SEDEMA y delegación',      type: 'TASK',      priority: 'CRITICAL', status: 'IN_PROGRESS',
      startDate: '2026-07-01T09:00:00-06:00', endDate: '2026-07-25T18:00:00-06:00', parentId: PH.preproduccion, position: 2 },
    { id: 'act-fest-seguro',      title: 'Contratación de seguro de responsabilidad civil', type: 'TASK',    priority: 'CRITICAL', status: 'PENDING',
      startDate: '2026-07-05T09:00:00-06:00', endDate: '2026-07-20T18:00:00-06:00', parentId: PH.preproduccion, position: 3 },
    { id: 'act-fest-contratos',   title: 'Firma de contratos con artistas y agencias',    type: 'MILESTONE', priority: 'HIGH',
      startDate: '2026-07-10T10:00:00-06:00', endDate: '2026-07-10T18:00:00-06:00', parentId: PH.preproduccion, color: '#d97706', position: 4 },
    { id: 'act-fest-riders',      title: 'Revisión y validación de riders técnicos',       type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-07-15T09:00:00-06:00', endDate: '2026-08-01T18:00:00-06:00', parentId: PH.preproduccion, position: 5 },
    { id: 'act-fest-mkt-digital', title: 'Campaña de marketing digital y venta de boletos', type: 'TASK',   priority: 'HIGH',
      startDate: '2026-07-01T09:00:00-06:00', endDate: '2026-08-10T23:59:00-06:00', parentId: PH.preproduccion, position: 6 },
    { id: 'act-fest-proveedor-sonido', title: 'Confirmación proveedor de sonido y luces',  type: 'MEETING', priority: 'HIGH',
      startDate: '2026-07-08T10:00:00-06:00', endDate: '2026-07-08T13:00:00-06:00', parentId: PH.preproduccion, position: 7 },
    { id: 'act-fest-recorrido',   title: 'Recorrido técnico en Campo Marte',               type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-07-20T09:00:00-06:00', endDate: '2026-07-20T17:00:00-06:00', parentId: PH.preproduccion, position: 8 },
    { id: 'act-fest-acreditaciones', title: 'Emisión de acreditaciones y gafetes',         type: 'TASK',    priority: 'MEDIUM',
      startDate: '2026-08-01T09:00:00-06:00', endDate: '2026-08-08T18:00:00-06:00', parentId: PH.preproduccion, position: 9 },

    // ── MONTAJE ──────────────────────────────────────────────────────────────
    { id: 'act-fest-escenario-montaje', title: 'Montaje de escenario principal',          type: 'LOGISTICS', priority: 'CRITICAL',
      startDate: '2026-08-11T07:00:00-06:00', endDate: '2026-08-12T18:00:00-06:00', parentId: PH.montaje, position: 11 },
    { id: 'act-fest-sonido-instalacion', title: 'Instalación y verificación de sonido',   type: 'TECHNICAL', priority: 'CRITICAL',
      startDate: '2026-08-12T08:00:00-06:00', endDate: '2026-08-13T14:00:00-06:00', parentId: PH.montaje, position: 12 },
    { id: 'act-fest-luces-instalacion',  title: 'Instalación de sistema de iluminación',  type: 'TECHNICAL', priority: 'CRITICAL',
      startDate: '2026-08-12T08:00:00-06:00', endDate: '2026-08-13T14:00:00-06:00', parentId: PH.montaje, position: 13 },
    { id: 'act-fest-pantalla-inst',     title: 'Instalación pantalla LED y media server', type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-08-12T14:00:00-06:00', endDate: '2026-08-13T12:00:00-06:00', parentId: PH.montaje, position: 14 },
    { id: 'act-fest-generadores',        title: 'Instalación generadores y distribución eléctrica', type: 'TECHNICAL', priority: 'CRITICAL',
      startDate: '2026-08-11T07:00:00-06:00', endDate: '2026-08-11T20:00:00-06:00', parentId: PH.montaje, position: 15 },
    { id: 'act-fest-vallas',             title: 'Colocación de vallas y señalización',   type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-13T08:00:00-06:00', endDate: '2026-08-13T16:00:00-06:00', parentId: PH.montaje, position: 16 },
    { id: 'act-fest-soundcheck-general', title: 'Soundcheck general y prueba de luces',  type: 'REHEARSAL', priority: 'CRITICAL', color: '#f59e0b',
      startDate: '2026-08-13T16:00:00-06:00', endDate: '2026-08-13T22:00:00-06:00', parentId: PH.montaje, position: 17 },

    // ── DÍA 1 ────────────────────────────────────────────────────────────────
    { id: 'act-fest-d1-apertura',    title: 'Día 1: Apertura de puertas',                type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-08-14T12:00:00-06:00', endDate: '2026-08-14T12:00:00-06:00', parentId: PH.dia1, position: 21 },
    { id: 'act-fest-d1-soundcheck1', title: 'Día 1: Soundcheck actos de apertura',       type: 'REHEARSAL', priority: 'HIGH',
      startDate: '2026-08-14T10:00:00-06:00', endDate: '2026-08-14T12:00:00-06:00', parentId: PH.dia1, position: 22 },
    { id: 'act-fest-d1-show1',       title: 'Día 1: Show actos de apertura (12–15h)',    type: 'TASK',      priority: 'HIGH',
      startDate: '2026-08-14T12:00:00-06:00', endDate: '2026-08-14T15:00:00-06:00', parentId: PH.dia1, position: 23 },
    { id: 'act-fest-d1-headliner',   title: 'Día 1: Headliner principal (21–23:30h)',    type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-08-14T21:00:00-06:00', endDate: '2026-08-14T23:30:00-06:00', parentId: PH.dia1, position: 24 },
    { id: 'act-fest-d1-seguridad',   title: 'Día 1: Briefing equipo de seguridad',       type: 'SECURITY',  priority: 'CRITICAL',
      startDate: '2026-08-14T11:00:00-06:00', endDate: '2026-08-14T11:30:00-06:00', parentId: PH.dia1, position: 25 },

    // ── DÍA 2 ────────────────────────────────────────────────────────────────
    { id: 'act-fest-d2-apertura',    title: 'Día 2: Apertura de puertas',                type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-08-15T12:00:00-06:00', endDate: '2026-08-15T12:00:00-06:00', parentId: PH.dia2, position: 31 },
    { id: 'act-fest-d2-soundcheck',  title: 'Día 2: Soundchecks y pruebas técnicas',     type: 'REHEARSAL', priority: 'HIGH',
      startDate: '2026-08-15T10:00:00-06:00', endDate: '2026-08-15T12:00:00-06:00', parentId: PH.dia2, position: 32 },
    { id: 'act-fest-d2-shows',       title: 'Día 2: Programación artística (12–23:30h)', type: 'TASK',      priority: 'CRITICAL',
      startDate: '2026-08-15T12:00:00-06:00', endDate: '2026-08-15T23:30:00-06:00', parentId: PH.dia2, position: 33 },
    { id: 'act-fest-d2-streaming',   title: 'Día 2: Transmisión en vivo (streaming)',    type: 'TECHNICAL', priority: 'HIGH',
      startDate: '2026-08-15T14:00:00-06:00', endDate: '2026-08-15T23:30:00-06:00', parentId: PH.dia2, position: 34 },

    // ── DÍA 3 ────────────────────────────────────────────────────────────────
    { id: 'act-fest-d3-apertura',    title: 'Día 3: Apertura de puertas',                type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-08-16T12:00:00-06:00', endDate: '2026-08-16T12:00:00-06:00', parentId: PH.dia3, position: 41 },
    { id: 'act-fest-d3-shows',       title: 'Día 3: Programación artística (12–21h)',    type: 'TASK',      priority: 'CRITICAL',
      startDate: '2026-08-16T12:00:00-06:00', endDate: '2026-08-16T21:00:00-06:00', parentId: PH.dia3, position: 42 },
    { id: 'act-fest-d3-cierre',      title: 'Día 3: Show de cierre y fuegos artificiales', type: 'MILESTONE', priority: 'CRITICAL', color: '#16a34a',
      startDate: '2026-08-16T22:00:00-06:00', endDate: '2026-08-16T23:59:00-06:00', parentId: PH.dia3, position: 43 },
    { id: 'act-fest-d3-desocupacion',title: 'Día 3: Desocupación del recinto',           type: 'SECURITY',  priority: 'HIGH',
      startDate: '2026-08-17T00:00:00-06:00', endDate: '2026-08-17T02:00:00-06:00', parentId: PH.dia3, position: 44 },

    // ── DESMONTAJE ────────────────────────────────────────────────────────────
    { id: 'act-fest-desm-sonido',    title: 'Desmontaje sistema de sonido y luces',      type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-17T06:00:00-06:00', endDate: '2026-08-17T18:00:00-06:00', parentId: PH.desmontaje, position: 51 },
    { id: 'act-fest-desm-escenario', title: 'Desmontaje escenario y estructuras',        type: 'LOGISTICS', priority: 'HIGH',
      startDate: '2026-08-17T08:00:00-06:00', endDate: '2026-08-18T16:00:00-06:00', parentId: PH.desmontaje, position: 52 },
    { id: 'act-fest-desm-limpieza',  title: 'Limpieza general del recinto',              type: 'LOGISTICS', priority: 'MEDIUM',
      startDate: '2026-08-17T10:00:00-06:00', endDate: '2026-08-18T18:00:00-06:00', parentId: PH.desmontaje, position: 53 },
    { id: 'act-fest-desm-entrega',   title: 'Entrega formal del predio',                 type: 'MILESTONE', priority: 'CRITICAL', color: '#6b7280',
      startDate: '2026-08-18T20:00:00-06:00', endDate: '2026-08-18T20:00:00-06:00', parentId: PH.desmontaje, position: 54 },
    { id: 'act-fest-desm-informe',   title: 'Informe post-evento y cierre administrativo', type: 'TASK',   priority: 'MEDIUM',
      startDate: '2026-08-19T09:00:00-06:00', endDate: '2026-08-21T18:00:00-06:00', parentId: PH.desmontaje, position: 55 },
  ]

  // Insert parent phases first, then children
  const phases = actDefs.filter(a => !a.parentId)
  const children = actDefs.filter(a => !!a.parentId)

  for (const a of [...phases, ...children]) {
    await prisma.eventActivity.upsert({
      where:  { id: a.id },
      update: {},
      create: {
        id: a.id, tenantId: tid, eventId: EVENT_ID,
        title:        a.title,
        activityType: a.type as any,
        status:       (a.status ?? 'PENDING') as any,
        priority:     (a.priority ?? 'MEDIUM') as any,
        startDate:    d(a.startDate),
        endDate:      d(a.endDate),
        color:        a.color,
        notes:        a.notes,
        parentId:     a.parentId,
        position:     a.position,
        createdById:  uid,
      },
    })
  }
  console.log(`✅ ${actDefs.length} timeline activities (${phases.length} phases + ${children.length} tasks)`)

  console.log('\n🎉 Festival seed complete!')
  console.log(`   Event: Festival Campo Marte 2026 (${event.code})`)
  console.log(`   Budget: ${budget.name}`)
  console.log(`   Orders: ${ordDefs.length} budget orders`)
  console.log(`   Timeline: ${actDefs.length} activities`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
