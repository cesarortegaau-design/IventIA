import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { PortalTokenPayload } from '../middleware/portalAuth.middleware'
import { stripe } from '../lib/stripe'

function signPlayerTokens(portalUserId: string, tenantId: string, email: string) {
  const payload: PortalTokenPayload = { portalUserId, tenantId, email, type: 'portal' }
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any })
  const refreshToken = jwt.sign({ portalUserId, type: 'portal' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  })
  return { accessToken, refreshToken }
}

async function computeStandings(eventId: string) {
  const [registrations, activities] = await Promise.all([
    prisma.teamEventRegistration.findMany({
      where: { eventId },
      include: { teamClient: { select: { id: true, companyName: true } } },
    }),
    prisma.eventActivity.findMany({
      where: { eventId, activityType: 'GAME' as any },
      include: {
        matchData: {
          include: {
            homeTeam: { select: { id: true, companyName: true } },
            visitingTeam: { select: { id: true, companyName: true } },
          },
        },
      },
    }),
  ])

  const categories = ['FEMENIL', 'VARONIL', 'MIXTO'] as const
  const result: Record<string, any> = {}

  for (const cat of categories) {
    const teamsInCat = registrations.filter((r) => r.category === cat)
    if (teamsInCat.length === 0) continue

    const gamesInCat = activities
      .filter(
        (a) =>
          a.matchData?.category === cat &&
          a.matchData?.homeScore !== null &&
          a.matchData?.visitingScore !== null,
      )
      .map((a) => a.matchData!)

    const standings = teamsInCat.map((reg) => {
      const tid = reg.teamClientId
      const gamesPlayed = gamesInCat.filter((g) => g.homeTeamId === tid || g.visitingTeamId === tid)
      const won = gamesPlayed.filter(
        (g) =>
          (g.homeTeamId === tid && g.homeScore! > g.visitingScore!) ||
          (g.visitingTeamId === tid && g.visitingScore! > g.homeScore!),
      ).length
      const drawn = gamesPlayed.filter(
        (g) =>
          (g.homeTeamId === tid || g.visitingTeamId === tid) &&
          g.homeScore === g.visitingScore,
      ).length
      const played = gamesPlayed.length
      const lost = played - won - drawn
      const gf = gamesPlayed.reduce(
        (acc, g) => acc + (g.homeTeamId === tid ? g.homeScore! : g.visitingScore!),
        0,
      )
      const ga = gamesPlayed.reduce(
        (acc, g) => acc + (g.homeTeamId === tid ? g.visitingScore! : g.homeScore!),
        0,
      )
      return {
        teamId: tid,
        teamName: reg.teamClient.companyName,
        played,
        won,
        drawn,
        lost,
        gf,
        ga,
        gd: gf - ga,
        points: won * 3 + drawn,
      }
    })

    standings.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    result[cat] = {
      standings,
      teams: teamsInCat.map((r) => ({ id: r.teamClientId, name: r.teamClient.companyName })),
    }
  }

  return result
}

// ── Public Tournaments ────────────────────────────────────────────────────────

export async function publicListTournaments(req: Request, res: Response, next: NextFunction) {
  try {
    const configs = await prisma.tournamentConfig.findMany({
      where: { settings: { path: ['portalEnabled'], equals: true } },
      include: {
        event: {
          select: { id: true, name: true, code: true, eventStart: true, eventEnd: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: configs })
  } catch (err) {
    next(err)
  }
}

export async function publicGetTournament(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params

    const config = await prisma.tournamentConfig.findUnique({
      where: { eventId },
      include: {
        event: { select: { id: true, name: true, code: true, eventStart: true, eventEnd: true, status: true } },
      },
    })
    if (!config) throw new AppError(404, 'NOT_FOUND', 'Torneo no encontrado')

    const settings = config.settings as any
    if (!settings?.portalEnabled) throw new AppError(404, 'NOT_FOUND', 'Torneo no encontrado')

    const standings = await computeStandings(eventId)

    res.json({ success: true, data: { config, standings } })
  } catch (err) {
    next(err)
  }
}

export async function publicGetCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params

    const activities = await prisma.eventActivity.findMany({
      where: { eventId, activityType: 'GAME' as any },
      include: {
        matchData: {
          include: {
            homeTeam: { select: { id: true, companyName: true } },
            visitingTeam: { select: { id: true, companyName: true } },
            venue: { select: { id: true, name: true } },
          },
        },
        footballGame: {
          select: { id: true, status: true, localScore: true, visitingScore: true },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    res.json({ success: true, data: activities })
  } catch (err) {
    next(err)
  }
}

// ── Player Auth ───────────────────────────────────────────────────────────────

export async function playerVerifyCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body)

    const accessCode = await prisma.portalAccessCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        event: { select: { id: true, name: true } },
        client: { select: { id: true, companyName: true } },
      },
    })

    if (!accessCode || !accessCode.isActive) {
      throw new AppError(400, 'INVALID_CODE', 'Código inválido o inactivo')
    }
    if (accessCode.usedCount >= accessCode.maxUses) {
      throw new AppError(400, 'CODE_EXHAUSTED', 'Este código ya alcanzó el máximo de usos')
    }
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      throw new AppError(400, 'CODE_EXPIRED', 'El código ha expirado')
    }

    const config = await prisma.tournamentConfig.findUnique({ where: { eventId: accessCode.eventId } })
    const settings = (config?.settings ?? {}) as any
    if (!settings?.portalEnabled) {
      throw new AppError(400, 'PORTAL_DISABLED', 'El portal no está habilitado para este torneo')
    }

    res.json({
      success: true,
      data: {
        event: { id: accessCode.event.id, name: accessCode.event.name },
        team: accessCode.client
          ? { id: accessCode.client.id, name: accessCode.client.companyName }
          : null,
        category: (accessCode as any).category,
        codeId: accessCode.id,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function playerSignup(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      code: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().optional(),
    })
    const data = schema.parse(req.body)

    const accessCode = await prisma.portalAccessCode.findUnique({
      where: { code: data.code.toUpperCase() },
      include: { event: true },
    })

    if (!accessCode || !accessCode.isActive || accessCode.usedCount >= accessCode.maxUses) {
      throw new AppError(400, 'INVALID_CODE', 'Código de acceso inválido')
    }
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      throw new AppError(400, 'CODE_EXPIRED', 'El código ha expirado')
    }

    const config = await prisma.tournamentConfig.findUnique({ where: { eventId: accessCode.eventId } })
    const settings = (config?.settings ?? {}) as any
    if (!settings?.portalEnabled) {
      throw new AppError(400, 'PORTAL_DISABLED', 'El portal no está habilitado para este torneo')
    }

    const category = (accessCode as any).category

    const existing = await prisma.portalUser.findUnique({ where: { email: data.email.toLowerCase() } })

    if (existing) {
      const alreadyLinked = await prisma.portalUserEvent.findUnique({
        where: { portalUserId_eventId: { portalUserId: existing.id, eventId: accessCode.eventId } },
      })
      if (!alreadyLinked) {
        await prisma.$transaction([
          prisma.portalUserEvent.create({
            data: {
              portalUserId: existing.id,
              eventId: accessCode.eventId,
              accessCodeId: accessCode.id,
              playerCategory: category,
            } as any,
          }),
          prisma.portalAccessCode.update({
            where: { id: accessCode.id },
            data: { usedCount: { increment: 1 } },
          }),
        ])
        if (accessCode.clientId) {
          await prisma.portalUserClient.upsert({
            where: { portalUserId_clientId: { portalUserId: existing.id, clientId: accessCode.clientId } },
            create: { portalUserId: existing.id, clientId: accessCode.clientId },
            update: { isActive: true },
          })
        }
      }
      const tokens = signPlayerTokens(existing.id, existing.tenantId, existing.email)
      return res.json({
        success: true,
        data: { ...tokens, user: { id: existing.id, email: existing.email, firstName: existing.firstName, lastName: existing.lastName } },
      })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const portalUser = await prisma.portalUser.create({
      data: {
        tenantId: accessCode.tenantId,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    })

    await prisma.$transaction([
      prisma.portalUserEvent.create({
        data: {
          portalUserId: portalUser.id,
          eventId: accessCode.eventId,
          accessCodeId: accessCode.id,
          playerCategory: category,
        } as any,
      }),
      ...(accessCode.clientId
        ? [
            prisma.portalUserClient.create({
              data: { portalUserId: portalUser.id, clientId: accessCode.clientId },
            }),
          ]
        : []),
      prisma.portalAccessCode.update({
        where: { id: accessCode.id },
        data: { usedCount: { increment: 1 } },
      }),
    ])

    const tokens = signPlayerTokens(portalUser.id, portalUser.tenantId, portalUser.email)
    res.status(201).json({
      success: true,
      data: {
        ...tokens,
        user: { id: portalUser.id, email: portalUser.email, firstName: portalUser.firstName, lastName: portalUser.lastName },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function playerLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body)

    const user = await prisma.portalUser.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.isActive) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')

    const tokens = signPlayerTokens(user.id, user.tenantId, user.email)
    res.json({
      success: true,
      data: { ...tokens, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } },
    })
  } catch (err) {
    next(err)
  }
}

export async function playerRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body)
    const payload = jwt.verify(refreshToken, env.JWT_SECRET) as { portalUserId: string; type: string }
    if (payload.type !== 'portal') throw new Error()

    const user = await prisma.portalUser.findUnique({ where: { id: payload.portalUserId } })
    if (!user || !user.isActive) throw new Error()

    const tokens = signPlayerTokens(user.id, user.tenantId, user.email)
    res.json({ success: true, data: tokens })
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token inválido o expirado' } })
  }
}

// ── Player (protected) ────────────────────────────────────────────────────────

export async function playerMe(req: Request, res: Response, next: NextFunction) {
  try {
    const portalUserId = req.portalUser!.portalUserId

    const user = await prisma.portalUser.findUnique({
      where: { id: portalUserId },
      include: {
        clients: {
          where: { isActive: true },
          include: { client: { select: { id: true, companyName: true, firstName: true, lastName: true } } },
        },
        events: {
          include: {
            event: { select: { id: true, name: true, code: true, eventStart: true, eventEnd: true } },
            accessCode: { select: { category: true, clientId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

export async function playerUpdateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().nullish(),
    })
    const data = schema.parse(req.body)

    const user = await prisma.portalUser.update({
      where: { id: req.portalUser!.portalUserId },
      data,
    })

    res.json({
      success: true,
      data: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone },
    })
  } catch (err) {
    next(err)
  }
}

export async function playerStats(req: Request, res: Response, next: NextFunction) {
  try {
    const portalUserId = req.portalUser!.portalUserId
    const { eventId } = z.object({ eventId: z.string().uuid().optional() }).parse(req.query)

    const links = await prisma.portalUserClient.findMany({
      where: { portalUserId, isActive: true },
      select: { clientId: true },
    })
    const clientIds = links.map((l) => l.clientId)

    if (clientIds.length === 0) {
      return res.json({ success: true, data: { totals: {}, gamesPlayed: 0, games: [] } })
    }

    const attendanceWhere: any = { playerId: { in: clientIds }, present: true }
    if (eventId) attendanceWhere.game = { eventId }

    const attendance = await prisma.playerAttendance.findMany({
      where: attendanceWhere,
      include: {
        game: {
          include: {
            localTeam: { select: { companyName: true } },
            visitingTeam: { select: { companyName: true } },
          },
        },
      },
    })

    const gameIds = attendance.map((a) => a.gameId)
    const events = gameIds.length
      ? await prisma.gameEvent.findMany({
          where: { gameId: { in: gameIds }, playerId: { in: clientIds } },
          select: { type: true, gameId: true, points: true },
        })
      : []

    const totals: Record<string, number> = {}
    for (const e of events) totals[e.type] = (totals[e.type] ?? 0) + 1

    const games = attendance.map((a) => ({
      gameId: a.gameId,
      date: a.game.startedAt || a.game.createdAt,
      homeTeam: a.game.localTeam.companyName,
      visitingTeam: a.game.visitingTeam.companyName,
      localScore: a.game.localScore,
      visitingScore: a.game.visitingScore,
      status: a.game.status,
      events: events.filter((e) => e.gameId === a.gameId),
    }))

    res.json({ success: true, data: { totals, gamesPlayed: games.length, games } })
  } catch (err) {
    next(err)
  }
}

export async function playerPayTournament(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Pago en línea no disponible')

    const portalUserId = req.portalUser!.portalUserId
    const { eventId } = req.params

    const config = await prisma.tournamentConfig.findUnique({
      where: { eventId },
      include: { event: { select: { name: true } } },
    })
    if (!config) throw new AppError(404, 'NOT_FOUND', 'Torneo no encontrado')

    const settings = (config.settings ?? {}) as any
    if (!settings?.portalEnabled) throw new AppError(400, 'PORTAL_DISABLED', 'Portal no habilitado')

    const userEvent = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!userEvent) throw new AppError(403, 'NOT_REGISTERED', 'No estás registrado en este torneo')

    const pue = userEvent as any
    if (pue.paymentStatus === 'PAID') {
      return res.json({ success: true, data: { paymentStatus: 'PAID' } })
    }

    const amount = Number(config.regFeePerPerson || 0)
    if (amount <= 0) throw new AppError(400, 'NO_FEE', 'Este torneo no tiene cuota de inscripción por jugador')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'mxn',
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            unit_amount: Math.round(amount * 100),
            product_data: { name: `Inscripción ${(config as any).event?.name ?? 'Torneo'}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.IFLAG_URL}/player/tournaments/${eventId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.IFLAG_URL}/player/tournaments/${eventId}`,
      metadata: { type: 'player_tournament', portalUserId, eventId },
    })

    await prisma.portalUserEvent.update({
      where: { portalUserId_eventId: { portalUserId, eventId } },
      data: { stripeSessionId: session.id } as any,
    })

    res.json({ success: true, data: { url: session.url } })
  } catch (err) {
    next(err)
  }
}

export async function playerVerifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Pago en línea no disponible')

    const portalUserId = req.portalUser!.portalUserId
    const { eventId } = req.params
    const { sessionId } = z.object({ sessionId: z.string().min(1) }).parse(req.body)

    const userEvent = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!userEvent) throw new AppError(403, 'NOT_REGISTERED', 'No registrado en este torneo')

    const pue = userEvent as any
    if (pue.paymentStatus === 'PAID') {
      return res.json({ success: true, data: { paymentStatus: 'PAID' } })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid') {
      await prisma.portalUserEvent.update({
        where: { portalUserId_eventId: { portalUserId, eventId } },
        data: { paymentStatus: 'PAID', paidAt: new Date(), stripeSessionId: sessionId } as any,
      })
      return res.json({ success: true, data: { paymentStatus: 'PAID' } })
    }

    res.json({ success: true, data: { paymentStatus: pue.paymentStatus } })
  } catch (err) {
    next(err)
  }
}
