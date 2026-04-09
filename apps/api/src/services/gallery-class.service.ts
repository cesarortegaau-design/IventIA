import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import * as whatsappService from './whatsapp.service'

export interface CreateClassInput {
  tenantId: string
  instructorId: string
  locationId: string
  name: string
  description?: string
  price?: number
  schedule: any
  capacity?: number
}

export async function createClass(input: CreateClassInput) {
  // Verify instructor (gallery artist) exists
  const instructor = await prisma.galleryArtist.findFirst({
    where: { id: input.instructorId, tenantId: input.tenantId, isActive: true },
  })
  if (!instructor) throw new AppError(404, 'INSTRUCTOR_NOT_FOUND', 'Instructor not found')

  // Verify location exists
  const location = await prisma.galleryLocation.findFirst({
    where: { id: input.locationId, tenantId: input.tenantId, isActive: true },
  })
  if (!location) throw new AppError(404, 'LOCATION_NOT_FOUND', 'Location not found')

  const galleryClass = await prisma.galleryClass.create({
    data: {
      tenantId: input.tenantId,
      instructorId: input.instructorId,
      locationId: input.locationId,
      name: input.name,
      description: input.description,
      price: input.price ? input.price : null,
      schedule: input.schedule,
      capacity: input.capacity ?? 20,
      status: 'ACTIVE',
    },
    include: { instructor: true, location: true },
  })

  return galleryClass
}

export async function enrollInClass(userId: string, classId: string, tenantId: string) {
  // Check if already enrolled
  const existing = await prisma.galleryClassEnrollment.findFirst({
    where: { userId, classId, tenantId },
  })
  if (existing) throw new AppError(400, 'ALREADY_ENROLLED', 'Already enrolled in this class')

  // Get class details
  const galleryClass = await prisma.galleryClass.findFirst({
    where: { id: classId, tenantId, isActive: true },
    include: { instructor: true, location: true },
  })
  if (!galleryClass) throw new AppError(404, 'CLASS_NOT_FOUND', 'Class not found')

  // Check capacity
  const enrollmentCount = await prisma.galleryClassEnrollment.count({
    where: { classId, status: 'ACTIVE' },
  })
  if (enrollmentCount >= galleryClass.capacity) {
    throw new AppError(400, 'CLASS_FULL', 'Class is at full capacity')
  }

  // Create enrollment
  const enrollment = await prisma.galleryClassEnrollment.create({
    data: {
      tenantId,
      userId,
      classId,
    },
  })

  // Send WhatsApp enrollment confirmation
  try {
    // Get user phone from ArtCapitalUser
    const user = await prisma.artCapitalUser.findUnique({ where: { id: userId } })
    if (user?.phone) {
      const phoneNumber = (user.phone || '').replace(/[^0-9+]/g, '')
      if (phoneNumber) {
        const scheduleInfo = galleryClass.schedule
        await whatsappService.sendClassEnrollmentConfirmation(phoneNumber, {
          className: galleryClass.name,
          instructor: galleryClass.instructor.name,
          dateTime: scheduleInfo.day_of_week ? `${scheduleInfo.day_of_week} at ${scheduleInfo.time}` : 'Check details',
          location: galleryClass.location.name,
        })
      }
    }
  } catch (error) {
    console.error('Failed to send WhatsApp enrollment confirmation:', error)
  }

  return enrollment
}

export async function listClasses(tenantId: string, locationId?: string) {
  const where: any = { tenantId, isActive: true, status: 'ACTIVE' }
  if (locationId) where.locationId = locationId

  const classes = await prisma.galleryClass.findMany({
    where,
    include: {
      instructor: true,
      location: true,
      enrollments: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return classes.map((c) => ({
    ...c,
    enrollmentCount: c.enrollments.length,
    spotsAvailable: c.capacity - c.enrollments.length,
  }))
}

export async function getUserClasses(userId: string, tenantId: string) {
  const enrollments = await prisma.galleryClassEnrollment.findMany({
    where: { userId, tenantId, status: 'ACTIVE' },
    include: {
      class: {
        include: { instructor: true, location: true },
      },
    },
  })

  return enrollments.map((e) => e.class)
}

export async function getClassDetails(classId: string, tenantId: string) {
  const galleryClass = await prisma.galleryClass.findFirst({
    where: { id: classId, tenantId, isActive: true },
    include: {
      instructor: true,
      location: true,
      enrollments: true,
    },
  })
  if (!galleryClass) throw new AppError(404, 'CLASS_NOT_FOUND', 'Class not found')

  return {
    ...galleryClass,
    enrollmentCount: galleryClass.enrollments.length,
    spotsAvailable: galleryClass.capacity - galleryClass.enrollments.length,
  }
}

export async function cancelEnrollment(enrollmentId: string, tenantId: string) {
  const enrollment = await prisma.galleryClassEnrollment.findFirst({
    where: { id: enrollmentId, tenantId },
  })
  if (!enrollment) throw new AppError(404, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found')

  return prisma.galleryClassEnrollment.update({
    where: { id: enrollmentId },
    data: { status: 'CANCELLED' },
  })
}
