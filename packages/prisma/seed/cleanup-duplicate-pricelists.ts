/**
 * cleanup-duplicate-pricelists.ts
 * Elimina listas de precios duplicadas (mismo nombre + tenantId),
 * conservando la que tiene más artículos y está vinculada a eventos.
 */
import { PrismaClient } from 'prisma-generated'

const prisma = new PrismaClient()

async function cleanup() {
  console.log('🧹 Limpiando listas de precios duplicadas...\n')

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'expo-santa-fe' } })
  if (!tenant) throw new Error('Tenant not found')

  // Obtener todas las listas agrupadas por nombre
  const allLists = await prisma.priceList.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Agrupar por nombre
  const byName = new Map<string, typeof allLists>()
  for (const pl of allLists) {
    const arr = byName.get(pl.name) ?? []
    arr.push(pl)
    byName.set(pl.name, arr)
  }

  let totalDeleted = 0

  for (const [name, lists] of byName.entries()) {
    if (lists.length <= 1) continue

    console.log(`⚠️  Duplicado: "${name}" — ${lists.length} copias encontradas`)

    // Elegir cuál conservar: la que tiene más items; si empate, la más antigua
    const keeper = lists.reduce((best, cur) =>
      (cur._count.items > best._count.items) ? cur : best
    )

    const toDelete = lists.filter(l => l.id !== keeper.id)

    for (const dup of toDelete) {
      // Reasignar eventos que apunten a esta lista al keeper
      const eventsUsingDup = await prisma.event.findMany({
        where: { priceListId: dup.id },
        select: { id: true, name: true },
      })
      if (eventsUsingDup.length) {
        await prisma.event.updateMany({
          where: { priceListId: dup.id },
          data: { priceListId: keeper.id },
        })
        console.log(`   ↳ ${eventsUsingDup.length} evento(s) reasignados al keeper`)
      }

      // Reasignar órdenes que apunten a esta lista
      await prisma.order.updateMany({
        where: { priceListId: dup.id },
        data: { priceListId: keeper.id },
      })

      // Eliminar artículos de la copia duplicada
      await prisma.priceListItem.deleteMany({ where: { priceListId: dup.id } })

      // Eliminar la lista duplicada
      await prisma.priceList.delete({ where: { id: dup.id } })
      console.log(`   🗑️  Eliminada copia id=${dup.id} (${dup._count.items} artículos)`)
      totalDeleted++
    }

    console.log(`   ✅ Conservada: id=${keeper.id} (${keeper._count.items} artículos)\n`)
  }

  if (totalDeleted === 0) {
    console.log('✅ No se encontraron duplicados.')
  } else {
    console.log(`\n🎉 Limpieza completa: ${totalDeleted} lista(s) duplicada(s) eliminadas.`)
  }
}

cleanup()
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
