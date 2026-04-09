/**
 * Seed test data for gallery system
 * Run with: npx ts-node apps/api/src/scripts/seed-gallery-test-data.ts
 */

import { prisma } from '../config/database'
import Decimal from 'decimal.js'

async function seedGalleryTestData() {
  try {
    console.log('🎨 Seeding gallery test data...\n')

    // Get first tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
      console.error('❌ No tenant found. Please create a tenant first.')
      process.exit(1)
    }

    console.log(`Using tenant: ${tenant.name}`)

    // Create test artist (GalleryArtist)
    const artist = await prisma.galleryArtist.create({
      data: {
        tenantId: tenant.id,
        userId: 'test-artist-user',
        name: 'María García',
        bio: 'Contemporary Mexican artist specializing in oil painting and modern art',
        website: 'https://mariagarciaart.mx',
        socialMedia: {
          instagram: '@mariagarciaart',
          twitter: '@mariagarcia_art',
        },
        specialization: ['OIL', 'ACRYLIC', 'CONTEMPORARY'],
        status: 'ACTIVE',
      },
    })
    console.log('✅ Created artist: María García\n')

    // Create test collection
    const collection = await prisma.galleryCollection.create({
      data: {
        tenantId: tenant.id,
        name: 'Sunset Series',
        description: 'A collection of paintings capturing golden hour light across different landscapes',
        image: 'https://via.placeholder.com/400x300?text=Sunset+Series',
      },
    })
    console.log('✅ Created collection: Sunset Series\n')

    // Create test location
    const location = await prisma.galleryLocation.create({
      data: {
        tenantId: tenant.id,
        name: 'Galería Principal CDMX',
        address: 'Av. Paseo de la Reforma 505',
        city: 'Mexico City',
        phone: '+52 55 1234 5678',
        whatsapp: '+34611111111',
        hours: JSON.stringify({
          weekday: 'Mon-Fri 10am-6pm',
          weekend: 'Sat-Sun 10am-5pm',
        }),
      },
    })
    console.log('✅ Created location: Galería Principal CDMX\n')

    // Create test artworks
    const artworkData = [
      {
        title: 'Sunset Over the Valley',
        description: 'A beautiful oil painting capturing the warm light of golden hour',
        price: new Decimal(2500),
        quantity: 3,
        mediums: ['OIL'],
        styles: ['IMPRESSIONISM', 'CONTEMPORARY'],
        mainImage: 'https://via.placeholder.com/600x400?text=Sunset+Valley',
        dimensions: { width: 80, height: 60 },
      },
      {
        title: 'Desert Mirage',
        description: 'Acrylic on canvas depicting the heat waves of the desert',
        price: new Decimal(1800),
        quantity: 2,
        mediums: ['ACRYLIC'],
        styles: ['SURREALISM', 'CONTEMPORARY'],
        mainImage: 'https://via.placeholder.com/600x400?text=Desert+Mirage',
        dimensions: { width: 100, height: 70 },
      },
      {
        title: 'Urban Dreams',
        description: 'Mixed media exploring the intersection of nature and cityscape',
        price: new Decimal(3200),
        quantity: 1,
        mediums: ['MIXED_MEDIA'],
        styles: ['ABSTRACT', 'CONTEMPORARY'],
        mainImage: 'https://via.placeholder.com/600x400?text=Urban+Dreams',
        dimensions: { width: 120, height: 90 },
      },
    ]

    const artworks = await Promise.all(
      artworkData.map((data) =>
        prisma.galleryArtwork.create({
          data: {
            tenantId: tenant.id,
            artistId: artist.id,
            collectionId: collection.id,
            locationId: location.id,
            title: data.title,
            description: data.description,
            price: data.price,
            quantity: data.quantity,
            mediums: data.mediums,
            styles: data.styles,
            mainImage: data.mainImage,
            widthCm: new Decimal(data.dimensions.width),
            heightCm: new Decimal(data.dimensions.height),
            status: 'AVAILABLE',
          },
        })
      )
    )
    console.log(`✅ Created ${artworks.length} test artworks\n`)

    // Create test membership
    const membership = await prisma.galleryMembership.create({
      data: {
        tenantId: tenant.id,
        artistId: artist.id,
        name: 'Gold Membership',
        membershipType: 'GOLD',
        price: new Decimal(500),
        commissionPercentage: new Decimal(20),
        features: ['40% Gallery Exposure', 'Monthly Features', 'Priority Bookings'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    })
    console.log('✅ Created membership: Gold Membership\n')

    // Create test class
    const galleryClass = await prisma.galleryClass.create({
      data: {
        tenantId: tenant.id,
        instructorId: artist.id,
        locationId: location.id,
        name: 'Oil Painting Fundamentals',
        description: 'Learn the essential techniques of oil painting with professional guidance',
        schedule: JSON.stringify({
          day_of_week: 'Monday',
          time: '6:00 PM',
          duration_minutes: 120,
        }),
        capacity: 20,
        price: new Decimal(150),
        status: 'ACTIVE',
      },
    })
    console.log('✅ Created class: Oil Painting Fundamentals\n')

    // Summary
    console.log('\n📊 Test Data Summary:')
    console.log(`   Tenant: ${tenant.name}`)
    console.log(`   Artist: ${artist.name}`)
    console.log(`   Location: ${location.name}`)
    console.log(`   Collection: ${collection.name}`)
    console.log(`   Artworks: ${artworks.length}`)
    console.log(`   Membership: ${membership.name}`)
    console.log(`   Class: ${galleryClass.name}`)
    console.log('\n✨ Gallery test data seeded successfully!')
    console.log('\n🚀 Next steps:')
    console.log('   1. Start dev servers: pnpm dev')
    console.log('   2. Login to Admin: http://localhost:5173')
    console.log('   3. Navigate to Gallery section')
    console.log('   4. Browse artworks on http://localhost:5174/gallery')
    console.log('   5. Add artwork to cart and test checkout\n')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedGalleryTestData()
