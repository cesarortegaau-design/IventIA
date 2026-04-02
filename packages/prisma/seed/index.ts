import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'expo-santa-fe' },
    update: {},
    create: {
      name: 'Expo Santa Fe',
      slug: 'expo-santa-fe',
      settings: { timezone: 'America/Mexico_City', currency: 'MXN' },
    },
  })
  console.log(`✅ Tenant: ${tenant.name}`)

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin1234!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@exposaantafe.com.mx' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@exposaantafe.com.mx',
      passwordHash,
      firstName: 'Administrador',
      lastName: 'IventIA',
      role: 'ADMIN',
    },
  })
  console.log(`✅ Admin user: ${admin.email}`)

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { id: 'dept-logistica' },
      update: {},
      create: { id: 'dept-logistica', tenantId: tenant.id, name: 'Logística', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-av' },
      update: {},
      create: { id: 'dept-av', tenantId: tenant.id, name: 'Audio y Video', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-limpieza' },
      update: {},
      create: { id: 'dept-limpieza', tenantId: tenant.id, name: 'Limpieza', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-contabilidad' },
      update: {},
      create: { id: 'dept-contabilidad', tenantId: tenant.id, name: 'Contabilidad', type: 'INTERNAL' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-operaciones' },
      update: {},
      create: { id: 'dept-operaciones', tenantId: tenant.id, name: 'Operaciones', type: 'INTERNAL' },
    }),
  ])
  console.log(`✅ ${departments.length} departments`)

  // Create sample resources
  const resources = await Promise.all([
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-SALON-A' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-SALON-A', name: 'Salón A', type: 'SPACE',
        areaSqm: 1200, capacity: 2000, departmentId: 'dept-operaciones',
        portalVisible: true, portalDesc: 'Salón principal para exposiciones de gran formato.',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ESP-SALON-B' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'ESP-SALON-B', name: 'Salón B', type: 'SPACE',
        areaSqm: 800, capacity: 1200, departmentId: 'dept-operaciones',
        portalVisible: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-INTERNET' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'SVC-INTERNET', name: 'Servicio de Internet (Mbps)', type: 'SERVICE',
        unit: 'Mbps', departmentId: 'dept-av', portalVisible: true,
        portalDesc: 'Servicio de Internet dedicado por Mbps.',
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-MESA' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'MOB-MESA', name: 'Mesa de Trabajo', type: 'FURNITURE',
        stock: 200, stockLocation: 'Bodega Norte', unit: 'pza', departmentId: 'dept-logistica',
        checkStock: true, portalVisible: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'MOB-SILLA' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'MOB-SILLA', name: 'Silla', type: 'FURNITURE',
        stock: 1000, stockLocation: 'Bodega Norte', unit: 'pza', departmentId: 'dept-logistica',
        checkStock: true, portalVisible: true,
      },
    }),
    prisma.resource.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SVC-LIMPIEZA' } },
      update: {},
      create: {
        tenantId: tenant.id, code: 'SVC-LIMPIEZA', name: 'Servicio de Limpieza', type: 'SERVICE',
        unit: 'turno', departmentId: 'dept-limpieza', portalVisible: true,
      },
    }),
  ])
  console.log(`✅ ${resources.length} resources`)

  // Create price list
  const priceList = await prisma.priceList.upsert({
    where: { id: 'pl-expositores-2025' },
    update: {},
    create: {
      id: 'pl-expositores-2025',
      tenantId: tenant.id,
      name: 'Expositores 2025',
      earlyCutoff: new Date('2025-06-30T23:59:59Z'),
      normalCutoff: new Date('2025-10-31T23:59:59Z'),
      discountPct: 10,
    },
  })

  // Add items to price list
  const mesa = resources.find(r => r.code === 'MOB-MESA')!
  const silla = resources.find(r => r.code === 'MOB-SILLA')!
  const internet = resources.find(r => r.code === 'SVC-INTERNET')!
  const limpieza = resources.find(r => r.code === 'SVC-LIMPIEZA')!

  await Promise.all([
    prisma.priceListItem.upsert({
      where: { priceListId_resourceId: { priceListId: priceList.id, resourceId: mesa.id } },
      update: {},
      create: { priceListId: priceList.id, resourceId: mesa.id, earlyPrice: 350, normalPrice: 420, latePrice: 550, unit: 'pza' },
    }),
    prisma.priceListItem.upsert({
      where: { priceListId_resourceId: { priceListId: priceList.id, resourceId: silla.id } },
      update: {},
      create: { priceListId: priceList.id, resourceId: silla.id, earlyPrice: 80, normalPrice: 100, latePrice: 130, unit: 'pza' },
    }),
    prisma.priceListItem.upsert({
      where: { priceListId_resourceId: { priceListId: priceList.id, resourceId: internet.id } },
      update: {},
      create: { priceListId: priceList.id, resourceId: internet.id, earlyPrice: 900, normalPrice: 1100, latePrice: 1400, unit: 'Mbps' },
    }),
    prisma.priceListItem.upsert({
      where: { priceListId_resourceId: { priceListId: priceList.id, resourceId: limpieza.id } },
      update: {},
      create: { priceListId: priceList.id, resourceId: limpieza.id, earlyPrice: 2500, normalPrice: 3000, latePrice: 3800, unit: 'turno' },
    }),
  ])
  console.log(`✅ Price list: ${priceList.name}`)

  console.log('\n🎉 Seed complete!')
  console.log('   Admin login: admin@exposaantafe.com.mx / Admin1234!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
