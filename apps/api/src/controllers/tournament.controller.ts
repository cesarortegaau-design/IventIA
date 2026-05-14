import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

// ── TournamentConfig ──────────────────────────────────────────────────────────

export async function getTournamentConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const config = await prisma.tournamentConfig.findUnique({ where: { eventId } })
    res.json({ success: true, data: config ?? null })
  } catch (err) { next(err) }
}

const en = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))

const tournamentConfigSchema = z.object({
  numRounds: z.coerce.number().int().min(1).optional(),
  hasPlayoffs: z.boolean().optional(),
  qualificationSystem: z.string().max(200).nullable().optional(),
  regFeePerPerson: z.preprocess(en, z.number().min(0).nullable().optional()),
  regFeePerTeam: z.preprocess(en, z.number().min(0).nullable().optional()),
  settings: z.record(z.any()).optional(),
})

export async function upsertTournamentConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const data = tournamentConfigSchema.parse(req.body)

    const existing = await prisma.tournamentConfig.findUnique({ where: { eventId } })

    let config
    if (existing) {
      config = await prisma.tournamentConfig.update({
        where: { eventId },
        data: {
          ...(data.numRounds !== undefined && { numRounds: data.numRounds }),
          ...(data.hasPlayoffs !== undefined && { hasPlayoffs: data.hasPlayoffs }),
          ...(data.qualificationSystem !== undefined && { qualificationSystem: data.qualificationSystem }),
          ...(data.regFeePerPerson !== undefined && { regFeePerPerson: data.regFeePerPerson }),
          ...(data.regFeePerTeam !== undefined && { regFeePerTeam: data.regFeePerTeam }),
          ...(data.settings !== undefined && { settings: data.settings }),
        },
      })
    } else {
      config = await prisma.tournamentConfig.create({
        data: {
          tenantId,
          eventId,
          numRounds: data.numRounds ?? 1,
          hasPlayoffs: data.hasPlayoffs ?? false,
          qualificationSystem: data.qualificationSystem ?? null,
          regFeePerPerson: data.regFeePerPerson ?? null,
          regFeePerTeam: data.regFeePerTeam ?? null,
          settings: data.settings ?? {},
        },
      })
    }

    res.json({ success: true, data: config })
  } catch (err) { next(err) }
}

// ── TournamentVenue ───────────────────────────────────────────────────────────

export async function listTournamentVenues(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const venues = await prisma.tournamentVenue.findMany({
      where: { eventId },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: venues })
  } catch (err) { next(err) }
}

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(400).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function createTournamentVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const data = createVenueSchema.parse(req.body)

    const venue = await prisma.tournamentVenue.create({
      data: {
        tenantId,
        eventId,
        name: data.name,
        address: data.address ?? null,
        capacity: data.capacity ?? null,
        notes: data.notes ?? null,
      },
    })
    res.status(201).json({ success: true, data: venue })
  } catch (err) { next(err) }
}

const updateVenueSchema = createVenueSchema.partial()

export async function updateTournamentVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, venueId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const venue = await prisma.tournamentVenue.findFirst({ where: { id: venueId, eventId } })
    if (!venue) throw new AppError(404, 'NOT_FOUND', 'Venue no encontrado')

    const data = updateVenueSchema.parse(req.body)

    const updated = await prisma.tournamentVenue.update({
      where: { id: venueId },
      data,
    })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
}

export async function deleteTournamentVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, venueId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const venue = await prisma.tournamentVenue.findFirst({ where: { id: venueId, eventId } })
    if (!venue) throw new AppError(404, 'NOT_FOUND', 'Venue no encontrado')

    await prisma.tournamentVenue.delete({ where: { id: venueId } })
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── Team Registration ─────────────────────────────────────────────────────────

export async function listTeamRegistrations(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const registrations = await prisma.teamEventRegistration.findMany({
      where: { eventId },
      include: {
        teamClient: {
          select: { id: true, companyName: true, isTeam: true, personType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: registrations })
  } catch (err) { next(err) }
}

const registerTeamSchema = z.object({
  teamClientId: z.string().min(1),
  category: z.enum(['FEMENIL', 'VARONIL', 'MIXTO']),
})

export async function registerTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const data = registerTeamSchema.parse(req.body)

    // Verify team exists and is marked as team
    const team = await prisma.client.findFirst({
      where: { id: data.teamClientId, tenantId, isTeam: true },
    })
    if (!team) throw new AppError(400, 'INVALID_TEAM', 'Equipo no encontrado o no es equipo')

    // Check for duplicate registration in this category
    const existing = await prisma.teamEventRegistration.findFirst({
      where: { eventId, teamClientId: data.teamClientId, category: data.category },
    })
    if (existing) throw new AppError(409, 'ALREADY_REGISTERED', 'Este equipo ya está registrado en esta categoría')

    const registration = await prisma.teamEventRegistration.create({
      data: {
        tenantId,
        eventId,
        teamClientId: data.teamClientId,
        category: data.category,
      },
      include: {
        teamClient: {
          select: { id: true, companyName: true },
        },
      },
    })
    res.status(201).json({ success: true, data: registration })
  } catch (err) { next(err) }
}

export async function unregisterTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, registrationId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const registration = await prisma.teamEventRegistration.findFirst({
      where: { id: registrationId, eventId },
    })
    if (!registration) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado')

    await prisma.teamEventRegistration.delete({ where: { id: registrationId } })
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── Team Players ──────────────────────────────────────────────────────────────

export async function getTeamPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, teamId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const team = await prisma.client.findFirst({
      where: { id: teamId, tenantId, isTeam: true },
    })
    if (!team) throw new AppError(404, 'NOT_FOUND', 'Equipo no encontrado')

    // Get players linked to this team
    const players = await prisma.client.findMany({
      where: {
        tenantId,
        personType: 'PHYSICAL',
        relations: {
          some: {
            relatedClientId: teamId,
            relationshipType: 'JUGADOR',
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        playerNumber: true,
      },
      orderBy: { playerNumber: 'asc' },
    })

    res.json({ success: true, data: players })
  } catch (err) { next(err) }
}

// ── Match Scoring ─────────────────────────────────────────────────────────────

const updateMatchScoreSchema = z.object({
  homeScore: z.number().int().min(0).nullable().optional(),
  visitingScore: z.number().int().min(0).nullable().optional(),
  stats: z.record(z.any()).optional(),
})

export async function updateMatchScore(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, activityId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const activity = await prisma.eventActivity.findFirst({
      where: { id: activityId, eventId },
    })
    if (!activity) throw new AppError(404, 'NOT_FOUND', 'Actividad no encontrada')
    if (activity.activityType !== 'GAME') throw new AppError(400, 'NOT_A_GAME', 'Esta actividad no es un juego')

    const matchData = await prisma.sportMatchData.findUnique({
      where: { activityId },
    })
    if (!matchData) throw new AppError(404, 'NOT_FOUND', 'Datos del juego no encontrados')

    const data = updateMatchScoreSchema.parse(req.body)

    const updated = await prisma.sportMatchData.update({
      where: { id: matchData.id },
      data: {
        ...(data.homeScore !== undefined && { homeScore: data.homeScore }),
        ...(data.visitingScore !== undefined && { visitingScore: data.visitingScore }),
        ...(data.stats !== undefined && { stats: data.stats }),
      },
      include: {
        activity: true,
        homeTeam: { select: { id: true, companyName: true } },
        visitingTeam: { select: { id: true, companyName: true } },
      },
    })

    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
}

// ── Schedule Generation ───────────────────────────────────────────────────────

const generateScheduleSchema = z.object({
  startDate: z.string().datetime(),
  matchDurationMinutes: z.number().int().min(1).default(60),
  breakBetweenMatchesMinutes: z.number().int().min(0).default(15),
  matchesPerDay: z.number().int().min(1).default(8),
})

export async function generateTournamentSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const config = await prisma.tournamentConfig.findUnique({ where: { eventId } })
    if (!config) throw new AppError(400, 'NO_CONFIG', 'Primero configura el torneo')

    const data = generateScheduleSchema.parse(req.body)

    // Get registered teams
    const registrations = await prisma.teamEventRegistration.findMany({
      where: { eventId },
      select: { teamClientId: true, category: true },
    })

    if (registrations.length < 2) {
      throw new AppError(400, 'NOT_ENOUGH_TEAMS', 'Se requieren al menos 2 equipos registrados')
    }

    // Group by category
    const teamsByCategory = registrations.reduce((acc: Record<string, string[]>, reg) => {
      if (!acc[reg.category]) acc[reg.category] = []
      acc[reg.category].push(reg.teamClientId)
      return acc
    }, {})

    // Generate matches for each category (round-robin basic)
    const activityCreateData: any[] = []
    let currentDateTime = new Date(data.startDate)
    let matchCount = 0

    for (const [category, teams] of Object.entries(teamsByCategory)) {
      const teamList = teams as string[]

      // Generate all possible pairings for round-robin
      for (let i = 0; i < teamList.length; i++) {
        for (let j = i + 1; j < teamList.length; j++) {
          if (matchCount > 0 && matchCount % data.matchesPerDay === 0) {
            currentDateTime = new Date(currentDateTime)
            currentDateTime.setDate(currentDateTime.getDate() + 1)
            currentDateTime.setHours(9, 0, 0, 0)
          }

          activityCreateData.push({
            eventId,
            activityType: 'GAME',
            title: `${teams[i]} vs ${teams[j]} - ${category}`,
            description: null,
            startTime: new Date(currentDateTime),
            endTime: new Date(new Date(currentDateTime).getTime() + data.matchDurationMinutes * 60000),
            phase: event.setupStart && event.eventStart ? 'EVENT' : 'SETUP',
            parentId: null,
            createdById: req.user!.userId,
          })

          matchCount++
          currentDateTime = new Date(currentDateTime.getTime() + (data.matchDurationMinutes + data.breakBetweenMatchesMinutes) * 60000)
        }
      }
    }

    // Create all activities in transaction
    const createdActivities = await prisma.$transaction(
      activityCreateData.map(actData =>
        prisma.eventActivity.create({ data: actData })
      )
    )

    // Create SportMatchData for each activity (pair with team data)
    let actIndex = 0
    for (const [category, teams] of Object.entries(teamsByCategory)) {
      const teamList = teams as string[]
      for (let i = 0; i < teamList.length; i++) {
        for (let j = i + 1; j < teamList.length; j++) {
          if (actIndex < createdActivities.length) {
            await prisma.sportMatchData.create({
              data: {
                activityId: createdActivities[actIndex].id,
                homeTeamId: teamList[i],
                visitingTeamId: teamList[j],
                category: category as any,
                round: 1,
              },
            })
            actIndex++
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        message: `Torneo generado: ${createdActivities.length} juegos creados`,
        matchCount: createdActivities.length,
        activities: createdActivities,
      },
    })
  } catch (err) { next(err) }
}

// ── Player Codes (for player portal signup) ───────────────────────────────────

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function generatePlayerCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const schema = z.object({
      maxUses: z.number().int().min(1).default(50),
      expiresAt: z.string().datetime().optional(),
    })
    const { maxUses, expiresAt } = schema.parse(req.body)

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const registrations = await prisma.teamEventRegistration.findMany({ where: { eventId } })
    if (registrations.length === 0) throw new AppError(400, 'NO_TEAMS', 'No hay equipos registrados en el torneo')

    let created = 0
    for (const reg of registrations) {
      const existing = await prisma.portalAccessCode.findFirst({
        where: { eventId, clientId: reg.teamClientId, category: reg.category } as any,
      })
      if (existing) continue

      let code = generateCode()
      while (await prisma.portalAccessCode.findUnique({ where: { code } })) code = generateCode()

      await prisma.portalAccessCode.create({
        data: {
          tenantId,
          eventId,
          code,
          clientId: reg.teamClientId,
          category: reg.category,
          maxUses,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdById: req.user!.userId,
        } as any,
      })
      created++
    }

    const allCodes = await prisma.portalAccessCode.findMany({
      where: { eventId, tenantId, category: { not: null } } as any,
      include: {
        client: { select: { id: true, companyName: true } },
        usages: { select: { id: true } },
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    })

    res.status(201).json({ success: true, data: allCodes, meta: { created } })
  } catch (err) { next(err) }
}

export async function listPlayerCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const codes = await prisma.portalAccessCode.findMany({
      where: { eventId, tenantId, category: { not: null } } as any,
      include: {
        client: { select: { id: true, companyName: true } },
        usages: {
          include: { portalUser: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    })

    res.json({ success: true, data: codes })
  } catch (err) { next(err) }
}
