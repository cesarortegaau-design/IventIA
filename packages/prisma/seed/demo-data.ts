import { PrismaClient, PersonType, DepartmentType } from 'prisma-generated'

const prisma = new PrismaClient()

async function seedDemoData() {
  console.log('🎪 Seeding demo data for expositions, concerts, sports, and construction...')

  // Get existing tenant and user
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'expo-santa-fe' } })
  if (!tenant) throw new Error('Tenant not found')

  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'ADMIN' } })
  if (!admin) throw new Error('Admin user not found')

  // ── Organizations ────────────────────────────────────────────────────────
  const orgs = await Promise.all([
    prisma.organization.upsert({
      where: { tenantId_clave: { tenantId: tenant.id, clave: 'Q-ALIMENTOS' } },
      update: {},
      create: { tenantId: tenant.id, clave: 'Q-ALIMENTOS', descripcion: 'Q Alimentos y Bebidas' },
    }),
    prisma.organization.upsert({
      where: { tenantId_clave: { tenantId: tenant.id, clave: 'EXPO-SF' } },
      update: {},
      create: { tenantId: tenant.id, clave: 'EXPO-SF', descripcion: 'Expo Santa Fe' },
    }),
    prisma.organization.upsert({
      where: { tenantId_clave: { tenantId: tenant.id, clave: 'EVENTS-PROD' } },
      update: {},
      create: { tenantId: tenant.id, clave: 'EVENTS-PROD', descripcion: 'Events Production' },
    }),
  ])
  console.log(`✅ ${orgs.length} organizations created`)

  // ── Departments ──────────────────────────────────────────────────────────
  const depts = await Promise.all([
    // Q Alimentos y Bebidas
    prisma.department.upsert({
      where: { id: 'dept-cocina-caliente' },
      update: {},
      create: { id: 'dept-cocina-caliente', tenantId: tenant.id, name: 'Cocina Caliente', type: 'EXTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-cocina-fria' },
      update: {},
      create: { id: 'dept-cocina-fria', tenantId: tenant.id, name: 'Cocina Fría', type: 'EXTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-montaje' },
      update: {},
      create: { id: 'dept-montaje', tenantId: tenant.id, name: 'Montaje', type: 'EXTERNAL' },
    }),
    // Expo Santa Fe
    prisma.department.upsert({
      where: { id: 'dept-comercial' },
      update: {},
      create: { id: 'dept-comercial', tenantId: tenant.id, name: 'Comercial', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-operaciones-sf' },
      update: {},
      create: { id: 'dept-operaciones-sf', tenantId: tenant.id, name: 'Operaciones', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-limpieza-sf' },
      update: {},
      create: { id: 'dept-limpieza-sf', tenantId: tenant.id, name: 'Limpieza', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-audioiluminacion' },
      update: {},
      create: { id: 'dept-audioiluminacion', tenantId: tenant.id, name: 'Audio e Iluminación', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-internet-sf' },
      update: {},
      create: { id: 'dept-internet-sf', tenantId: tenant.id, name: 'Internet', type: 'INTERNAL' },
    }),
    // Events Production
    prisma.department.upsert({
      where: { id: 'dept-produccion' },
      update: {},
      create: { id: 'dept-produccion', tenantId: tenant.id, name: 'Producción', type: 'EXTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-patrocinios' },
      update: {},
      create: { id: 'dept-patrocinios', tenantId: tenant.id, name: 'Patrocinios', type: 'EXTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-seguridad' },
      update: {},
      create: { id: 'dept-seguridad', tenantId: tenant.id, name: 'Seguridad', type: 'EXTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-logistica' },
      update: {},
      create: { id: 'dept-logistica', tenantId: tenant.id, name: 'Logística', type: 'EXTERNAL' },
    }),
  ])
  console.log(`✅ ${depts.length} departments created`)

  // ── Department ↔ Organization links ─────────────────────────────────────
  const [qAlimentos, expoSf, eventsProd] = orgs
  const deptOrgLinks = [
    // Q Alimentos y Bebidas
    { departmentId: 'dept-cocina-caliente', organizationId: qAlimentos.id },
    { departmentId: 'dept-cocina-fria',     organizationId: qAlimentos.id },
    { departmentId: 'dept-montaje',         organizationId: qAlimentos.id },
    // Expo Santa Fe
    { departmentId: 'dept-comercial',       organizationId: expoSf.id },
    { departmentId: 'dept-operaciones-sf',  organizationId: expoSf.id },
    { departmentId: 'dept-limpieza-sf',     organizationId: expoSf.id },
    { departmentId: 'dept-audioiluminacion',organizationId: expoSf.id },
    { departmentId: 'dept-internet-sf',     organizationId: expoSf.id },
    // Events Production
    { departmentId: 'dept-produccion',      organizationId: eventsProd.id },
    { departmentId: 'dept-patrocinios',     organizationId: eventsProd.id },
    { departmentId: 'dept-seguridad',       organizationId: eventsProd.id },
    { departmentId: 'dept-logistica',       organizationId: eventsProd.id },
  ]
  await Promise.all(deptOrgLinks.map(link =>
    prisma.departmentOrganization.upsert({
      where: { departmentId_organizationId: link },
      update: {},
      create: link,
    })
  ))
  console.log(`✅ ${deptOrgLinks.length} department-organization links created`)

  // ── Resources: Espacios ──────────────────────────────────────────────────
  const espacios = await Promise.all([
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-SALON-GRANDE' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-SALON-GRANDE', name: 'Salón Principal', type: 'SPACE',
        areaSqm: 5000, capacity: 5000, departmentId: 'dept-operaciones-sf',
        portalVisible: true, portalDesc: 'Salón principal para exposiciones de gran formato.',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-PABELLON-A' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-PABELLON-A', name: 'Pabellón A', type: 'SPACE',
        areaSqm: 3000, capacity: 3000, departmentId: 'dept-operaciones-sf',
        portalVisible: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-PABELLON-B' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-PABELLON-B', name: 'Pabellón B', type: 'SPACE',
        areaSqm: 2500, capacity: 2500, departmentId: 'dept-operaciones-sf',
        portalVisible: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-AREA-ALIMENTOS' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-AREA-ALIMENTOS', name: 'Área de Alimentos', type: 'SPACE',
        areaSqm: 1500, capacity: 1000, departmentId: 'dept-cocina-caliente',
        portalVisible: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-ESCENARIO' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-ESCENARIO', name: 'Escenario Principal', type: 'SPACE',
        areaSqm: 500, capacity: 20000, departmentId: 'dept-produccion',
        portalVisible: true, portalDesc: 'Escenario para conciertos y eventos en vivo.',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-PISTA-ATLETICA' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-PISTA-ATLETICA', name: 'Pista Atlética', type: 'SPACE',
        areaSqm: 8000, capacity: 5000, departmentId: 'dept-logistica',
        portalVisible: true, portalDesc: 'Pista para carreras y competencias atléticas.',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-CANCHA-FLAG' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-CANCHA-FLAG', name: 'Cancha Flag Football', type: 'SPACE',
        areaSqm: 1500, capacity: 500, departmentId: 'dept-logistica',
        portalVisible: true,
      },
    }),
  ])
  console.log(`✅ ${espacios.length} espacios (spaces) created`)

  // ── Resources: Mobiliario ────────────────────────────────────────────────
  const mobiliario = await Promise.all([
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-MESA-EXPO' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'MOB-MESA-EXPO', name: 'Mesa de Exhibición', type: 'FURNITURE',
        stock: 500, stockLocation: 'Bodega', unit: 'pza', departmentId: 'dept-operaciones-sf', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-STAND-6X3' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'MOB-STAND-6X3', name: 'Stand 6x3', type: 'FURNITURE',
        stock: 100, stockLocation: 'Bodega', unit: 'pza', departmentId: 'dept-montaje', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-SILLA-PLEGABLE' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'MOB-SILLA-PLEGABLE', name: 'Silla Plegable', type: 'FURNITURE',
        stock: 2000, stockLocation: 'Bodega', unit: 'pza', departmentId: 'dept-logistica', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-TARIMA' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'MOB-TARIMA', name: 'Tarima de Escenario', type: 'FURNITURE',
        stock: 50, stockLocation: 'Bodega', unit: 'pza', departmentId: 'dept-produccion', checkStock: true,
      },
    }),
  ])
  console.log(`✅ ${mobiliario.length} recursos de mobiliario created`)

  // ── Resources: Equipo ────────────────────────────────────────────────────
  const equipo = await Promise.all([
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-PROYECTOR' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'EQP-PROYECTOR', name: 'Proyector 4K', type: 'EQUIPMENT',
        stock: 10, stockLocation: 'Bodega AV', unit: 'pza', departmentId: 'dept-audioiluminacion', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-CONSOLA-SONIDO' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'EQP-CONSOLA-SONIDO', name: 'Consola de Sonido', type: 'EQUIPMENT',
        stock: 5, stockLocation: 'Bodega AV', unit: 'pza', departmentId: 'dept-audioiluminacion', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-BAFLES' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'EQP-BAFLES', name: 'Bafles (par)', type: 'EQUIPMENT',
        stock: 20, stockLocation: 'Bodega AV', unit: 'par', departmentId: 'dept-audioiluminacion', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-LUCES-LED' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'EQP-LUCES-LED', name: 'Panel LED de Iluminación', type: 'EQUIPMENT',
        stock: 30, stockLocation: 'Bodega AV', unit: 'pza', departmentId: 'dept-audioiluminacion', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'EQP-MICROFONOS' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'EQP-MICROFONOS', name: 'Micrófono Inalámbrico', type: 'EQUIPMENT',
        stock: 15, stockLocation: 'Bodega AV', unit: 'pza', departmentId: 'dept-audioiluminacion', checkStock: true,
      },
    }),
  ])
  console.log(`✅ ${equipo.length} recursos de equipo created`)

  // ── Resources: Consumibles ───────────────────────────────────────────────
  const consumibles = await Promise.all([
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CON-CAFE' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'CON-CAFE', name: 'Café', type: 'CONSUMABLE',
        stock: 1000, unit: 'taza', departmentId: 'dept-cocina-caliente', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CON-BEBIDAS' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'CON-BEBIDAS', name: 'Bebidas Frías', type: 'CONSUMABLE',
        stock: 2000, unit: 'botella', departmentId: 'dept-cocina-fria', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CON-BOTANAS' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'CON-BOTANAS', name: 'Botanas Surtidas', type: 'CONSUMABLE',
        stock: 500, unit: 'kg', departmentId: 'dept-montaje', checkStock: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CON-PAPEL' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'CON-PAPEL', name: 'Papel y Servilletas', type: 'CONSUMABLE',
        stock: 5000, unit: 'pza', departmentId: 'dept-limpieza-sf', checkStock: true,
      },
    }),
  ])
  console.log(`✅ ${consumibles.length} consumibles created`)

  // ── Resources: Servicios ─────────────────────────────────────────────────
  const servicios = await Promise.all([
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-INTERNET-GBPS' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'SVC-INTERNET-GBPS', name: 'Internet Dedicado', type: 'SERVICE',
        unit: 'Gbps', departmentId: 'dept-internet-sf', portalVisible: true,
        portalDesc: 'Servicio de Internet de banda ancha dedicada.',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-SEGURIDAD' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'SVC-SEGURIDAD', name: 'Servicio de Seguridad', type: 'SERVICE',
        unit: 'turno', departmentId: 'dept-seguridad',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-LIMPIEZA' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'SVC-LIMPIEZA', name: 'Limpieza', type: 'SERVICE',
        unit: 'turno', departmentId: 'dept-limpieza-sf',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-PRODUCCION' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'SVC-PRODUCCION', name: 'Dirección de Producción', type: 'SERVICE',
        unit: 'evento', departmentId: 'dept-produccion',
      },
    }),
  ])
  console.log(`✅ ${servicios.length} servicios created`)

  // ── Resources: Conceptos ─────────────────────────────────────────────────
  const conceptos = await Promise.all([
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CON-DISEÑO-GRAFICO' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'CON-DISEÑO-GRAFICO', name: 'Diseño Gráfico', type: 'DISCOUNT',
        departmentId: 'dept-comercial',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CON-PERMISO-MUNICIPAL' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'CON-PERMISO-MUNICIPAL', name: 'Permiso Municipal', type: 'DISCOUNT',
        departmentId: 'dept-comercial',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CON-SEGURO-EVENTO' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'CON-SEGURO-EVENTO', name: 'Seguro de Evento', type: 'DISCOUNT',
        departmentId: 'dept-seguridad',
      },
    }),
  ])
  console.log(`✅ ${conceptos.length} conceptos created`)

  // ── Clients ──────────────────────────────────────────────────────────────
  const clientesData = [
    { email: 'contacto@qalimentos.com', companyName: 'Q Alimentos y Bebidas', phone: '+52-55-1234-5678' },
    { email: 'info@defleppprd.com', companyName: 'Def Leppard Productions', phone: '+44-20-7946-0958' },
    { email: 'contacto@atletismonacional.mx', companyName: 'Atletismo Nacional MX', phone: '+52-55-9876-5432' },
    { email: 'contacto@flagfootball.mx', companyName: 'Liga Flag Football México', phone: '+52-55-5555-5555' },
    { email: 'compras@constructora-elite.com', companyName: 'Constructora Elite', phone: '+52-55-4444-4444' },
  ]
  const clientes = await Promise.all(clientesData.map(async (data) => {
    const existing = await prisma.client.findFirst({
      where: { tenantId: tenant.id, email: data.email },
    })
    if (existing) return existing
    return prisma.client.create({
      data: {
        tenantId: tenant.id,
        personType: 'MORAL',
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
      },
    })
  }))
  console.log(`✅ ${clientes.length} clientes created`)

  console.log('\n✨ Demo data seed complete!')
}

seedDemoData()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
