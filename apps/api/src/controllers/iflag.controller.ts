import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsedSeconds(game: any): number {
  if (!game.timerRunning || !game.timerLastStarted) return game.timerSeconds
  const elapsed = Math.floor((Date.now() - new Date(game.timerLastStarted).getTime()) / 1000)
  return game.timerSeconds + elapsed
}

async function getGameForTenant(gameId: string, tenantId: string) {
  const game = await prisma.footballGame.findFirst({
    where: { id: gameId, tenantId },
  })
  if (!game) throw new AppError(404, 'GAME_NOT_FOUND', 'Partido no encontrado')
  return game
}

// ── Public (no auth) ──────────────────────────────────────────────────────────

export async function publicGetGame(req: Request, res: Response, next: NextFunction) {
  try {
    const game = await prisma.footballGame.findFirst({
      where: { id: req.params.gameId },
      include: {
        localTeam: { select: { id: true, companyName: true, logoUrl: true } },
        visitingTeam: { select: { id: true, companyName: true, logoUrl: true } },
        event: { select: { id: true, code: true, name: true } },
        attendance: {
          include: {
            player: { select: { id: true, firstName: true, lastName: true, companyName: true, logoUrl: true, playerNumber: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        gameEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })
    if (!game) throw new AppError(404, 'GAME_NOT_FOUND', 'Partido no encontrado')

    res.json({
      success: true,
      data: { ...game, timerSeconds: elapsedSeconds(game) },
    })
  } catch (err) {
    next(err)
  }
}

export async function publicListGames(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.query as { eventId?: string }
    const where: any = {}
    if (eventId) where.eventId = eventId

    const games = await prisma.footballGame.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        localTeam: { select: { id: true, companyName: true, logoUrl: true } },
        visitingTeam: { select: { id: true, companyName: true, logoUrl: true } },
        event: { select: { id: true, code: true, name: true } },
      },
    })

    const enriched = games.map(g => ({
      ...g,
      timerSeconds: elapsedSeconds(g),
    }))

    res.json({ success: true, data: enriched })
  } catch (err) {
    next(err)
  }
}

// ── Schedule games (from tournament activities) ───────────────────────────────

export async function listScheduleGames(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { eventId } = req.query as Record<string, string>
    if (!eventId) throw new AppError(400, 'EVENT_ID_REQUIRED', 'eventId es requerido')

    const activities = await prisma.eventActivity.findMany({
      where: { tenantId, eventId, activityType: 'GAME', matchData: { isNot: null } },
      orderBy: { startDate: 'asc' },
      include: {
        matchData: {
          include: {
            homeTeam: { select: { id: true, companyName: true, logoUrl: true } },
            visitingTeam: { select: { id: true, companyName: true, logoUrl: true } },
            venue: { select: { id: true, name: true } },
          },
        },
        footballGame: { select: { id: true, status: true, localScore: true, visitingScore: true } },
      },
    })

    res.json({ success: true, data: activities })
  } catch (err) {
    next(err)
  }
}

// ── List / Get ─────────────────────────────────────────────────────────────────

export async function listGames(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { eventId } = req.query as Record<string, string>
    const where: any = { tenantId }
    if (eventId) where.eventId = eventId

    const games = await prisma.footballGame.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        localTeam: { select: { id: true, companyName: true, logoUrl: true } },
        visitingTeam: { select: { id: true, companyName: true, logoUrl: true } },
        event: { select: { id: true, code: true, name: true } },
      },
    })

    const enriched = games.map(g => ({
      ...g,
      timerSeconds: elapsedSeconds(g),
    }))

    res.json({ success: true, data: enriched })
  } catch (err) {
    next(err)
  }
}

export async function getGame(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const game = await prisma.footballGame.findFirst({
      where: { id: req.params.gameId, tenantId },
      include: {
        localTeam: {
          select: { id: true, companyName: true, logoUrl: true, isTeam: true },
        },
        visitingTeam: {
          select: { id: true, companyName: true, logoUrl: true, isTeam: true },
        },
        event: { select: { id: true, code: true, name: true } },
        attendance: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, companyName: true, logoUrl: true, playerNumber: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        gameEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })
    if (!game) throw new AppError(404, 'GAME_NOT_FOUND', 'Partido no encontrado')

    res.json({
      success: true,
      data: { ...game, timerSeconds: elapsedSeconds(game) },
    })
  } catch (err) {
    next(err)
  }
}

// ── Create game ────────────────────────────────────────────────────────────────

const createGameSchema = z.object({
  eventId: z.string().uuid(),
  localTeamId: z.string().uuid().optional(),
  visitingTeamId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export async function createGame(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const data = createGameSchema.parse(req.body)

    let localTeamId = data.localTeamId
    let visitingTeamId = data.visitingTeamId
    let resolvedActivityId = data.activityId

    // If activityId is provided, resolve teams from SportMatchData
    if (data.activityId) {
      const activity = await prisma.eventActivity.findFirst({
        where: { id: data.activityId, eventId: data.eventId, tenantId },
        include: { matchData: true, footballGame: { select: { id: true } } },
      })
      if (!activity || !activity.matchData) {
        throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Actividad de partido no encontrada')
      }
      if (activity.footballGame) {
        throw new AppError(409, 'GAME_ALREADY_LINKED', 'Este partido ya tiene un juego de I-Flag asociado')
      }
      localTeamId = activity.matchData.homeTeamId
      visitingTeamId = activity.matchData.visitingTeamId
    } else {
      if (!localTeamId || !visitingTeamId) {
        throw new AppError(400, 'TEAMS_REQUIRED', 'Se requieren equipos local y visitante')
      }
    }

    if (localTeamId === visitingTeamId) {
      throw new AppError(400, 'SAME_TEAM', 'El equipo local y visitante deben ser diferentes')
    }

    const [event, localTeam, visitingTeam] = await Promise.all([
      prisma.event.findFirst({ where: { id: data.eventId, tenantId } }),
      prisma.client.findFirst({ where: { id: localTeamId, tenantId, isTeam: true } }),
      prisma.client.findFirst({ where: { id: visitingTeamId, tenantId, isTeam: true } }),
    ])
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento no encontrado')
    if (!localTeam) throw new AppError(404, 'LOCAL_TEAM_NOT_FOUND', 'Equipo local no encontrado')
    if (!visitingTeam) throw new AppError(404, 'VISITING_TEAM_NOT_FOUND', 'Equipo visitante no encontrado')

    // Pre-populate attendance from JUGADOR relations
    const [localPlayers, visitingPlayers] = await Promise.all([
      prisma.clientRelation.findMany({
        where: { clientId: localTeamId, relationType: 'JUGADOR', isActive: true },
        select: { relatedClientId: true },
      }),
      prisma.clientRelation.findMany({
        where: { clientId: visitingTeamId, relationType: 'JUGADOR', isActive: true },
        select: { relatedClientId: true },
      }),
    ])

    const game = await prisma.$transaction(async (tx) => {
      const game = await tx.footballGame.create({
        data: {
          tenantId,
          eventId: data.eventId,
          localTeamId,
          visitingTeamId,
          activityId: resolvedActivityId ?? null,
          notes: data.notes,
          createdById: userId,
        },
      })

      const attendanceRows = [
        ...localPlayers.map(p => ({ gameId: game.id, playerId: p.relatedClientId, teamId: localTeamId! })),
        ...visitingPlayers.map(p => ({ gameId: game.id, playerId: p.relatedClientId, teamId: visitingTeamId! })),
      ]
      if (attendanceRows.length > 0) {
        await tx.playerAttendance.createMany({ data: attendanceRows, skipDuplicates: true })
      }

      await tx.gameEvent.create({
        data: {
          gameId: game.id,
          tenantId,
          type: 'GAME_START',
          description: 'Partido creado',
          createdById: userId,
        },
      })

      return game
    })

    await auditService.log(tenantId, userId, 'FootballGame', game.id, 'CREATE', null, {
      eventId: data.eventId,
      localTeamId,
      visitingTeamId,
      activityId: resolvedActivityId ?? null,
    })

    res.status(201).json({ success: true, data: game })
  } catch (err) {
    next(err)
  }
}

// ── Update game state ──────────────────────────────────────────────────────────

const updateGameSchema = z.object({
  status: z.enum(['PENDING', 'ATTENDANCE', 'IN_PROGRESS', 'HALFTIME', 'FINISHED']).optional(),
  localScore: z.number().int().min(0).optional(),
  visitingScore: z.number().int().min(0).optional(),
  currentQuarter: z.number().int().min(1).max(4).optional(),
  offenseTeamId: z.string().uuid().nullable().optional(),
  currentDown: z.number().int().min(1).max(4).optional(),
  yardsToFirst: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
})

export async function updateGame(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const game = await getGameForTenant(req.params.gameId, tenantId)
    const data = updateGameSchema.parse(req.body)

    const updated = await prisma.footballGame.update({
      where: { id: game.id },
      data: {
        ...data,
        startedAt: data.status === 'IN_PROGRESS' && !game.startedAt ? new Date() : undefined,
        finishedAt: data.status === 'FINISHED' && !game.finishedAt ? new Date() : undefined,
      },
    })

    res.json({ success: true, data: { ...updated, timerSeconds: elapsedSeconds(updated) } })
  } catch (err) {
    next(err)
  }
}

// ── Timer ──────────────────────────────────────────────────────────────────────

export async function startTimer(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const game = await getGameForTenant(req.params.gameId, tenantId)
    if (game.timerRunning) {
      return res.json({ success: true, data: { ...game, timerSeconds: elapsedSeconds(game) } })
    }

    const updated = await prisma.footballGame.update({
      where: { id: game.id },
      data: { timerRunning: true, timerLastStarted: new Date() },
    })

    await prisma.gameEvent.create({
      data: { gameId: game.id, tenantId, type: 'TIMER_START', createdById: req.user!.userId },
    })

    res.json({ success: true, data: { ...updated, timerSeconds: elapsedSeconds(updated) } })
  } catch (err) {
    next(err)
  }
}

export async function stopTimer(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const game = await getGameForTenant(req.params.gameId, tenantId)
    if (!game.timerRunning) {
      return res.json({ success: true, data: { ...game, timerSeconds: game.timerSeconds } })
    }

    const newSeconds = elapsedSeconds(game)
    const updated = await prisma.footballGame.update({
      where: { id: game.id },
      data: { timerRunning: false, timerSeconds: newSeconds, timerLastStarted: null },
    })

    await prisma.gameEvent.create({
      data: { gameId: game.id, tenantId, type: 'TIMER_STOP', createdById: req.user!.userId },
    })

    res.json({ success: true, data: { ...updated, timerSeconds: newSeconds } })
  } catch (err) {
    next(err)
  }
}

export async function resetTimer(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const game = await getGameForTenant(req.params.gameId, tenantId)

    const updated = await prisma.footballGame.update({
      where: { id: game.id },
      data: { timerRunning: false, timerSeconds: 0, timerLastStarted: null },
    })

    res.json({ success: true, data: { ...updated, timerSeconds: 0 } })
  } catch (err) {
    next(err)
  }
}

export async function setTimer(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const game = await getGameForTenant(req.params.gameId, tenantId)
    const { seconds } = z.object({ seconds: z.number().int().min(0) }).parse(req.body)

    const updated = await prisma.footballGame.update({
      where: { id: game.id },
      data: { timerRunning: false, timerSeconds: seconds, timerLastStarted: null },
    })

    res.json({ success: true, data: { ...updated, timerSeconds: seconds } })
  } catch (err) {
    next(err)
  }
}

// ── Attendance ─────────────────────────────────────────────────────────────────

export async function getAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    await getGameForTenant(req.params.gameId, tenantId)

    const attendance = await prisma.playerAttendance.findMany({
      where: { gameId: req.params.gameId },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, companyName: true, logoUrl: true, playerNumber: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ success: true, data: attendance })
  } catch (err) {
    next(err)
  }
}

const attendancePatchSchema = z.object({
  playerId: z.string().uuid(),
  present: z.boolean(),
  number: z.string().max(10).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
})

export async function upsertAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const game = await getGameForTenant(req.params.gameId, tenantId)
    const data = attendancePatchSchema.parse(req.body)

    const existing = await prisma.playerAttendance.findFirst({
      where: { gameId: game.id, playerId: data.playerId },
    })

    const result = existing
      ? await prisma.playerAttendance.update({
          where: { id: existing.id },
          data: { present: data.present, number: data.number, position: data.position },
        })
      : await prisma.playerAttendance.create({
          data: {
            gameId: game.id,
            playerId: data.playerId,
            teamId: req.body.teamId ?? game.localTeamId,
            present: data.present,
            number: data.number,
            position: data.position,
          },
        })

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

// ── Game Events (scoring / penalties) ─────────────────────────────────────────

const gameEventSchema = z.object({
  type: z.enum([
    'TOUCHDOWN', 'EXTRA_POINT', 'SAFETY', 'FLAG_PENALTY',
    'DOWN_UPDATE', 'POSSESSION_CHANGE',
    'GAME_START', 'GAME_END', 'HALFTIME_START', 'HALFTIME_END',
    'TIMER_START', 'TIMER_STOP', 'TIMEOUT', 'SCORE_ADJUST', 'INTERCEPTION',
  ]),
  teamId: z.string().optional().nullable(),
  playerId: z.string().optional().nullable(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  down: z.number().int().min(1).max(4).optional().nullable(),
  points: z.number().int().default(0),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.any()).optional(),
  // Optional state mutations to apply atomically
  applyScore: z.boolean().optional(),  // if true, add points to the team score
  newDown: z.number().int().min(1).max(4).optional().nullable(),
  newYardsToFirst: z.number().int().min(0).optional().nullable(),
  newOffenseTeamId: z.string().optional().nullable(),
  newCurrentDown: z.number().int().min(1).max(4).optional().nullable(),
  // Score adjustment
  newLocalScore: z.number().int().min(0).optional(),
  newVisitingScore: z.number().int().min(0).optional(),
})

export async function recordGameEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const game = await getGameForTenant(req.params.gameId, tenantId)
    const data = gameEventSchema.parse(req.body)

    const result = await prisma.$transaction(async (tx) => {
      // Apply state changes
      const gameUpdates: any = {}

      if (data.applyScore && data.points > 0 && data.teamId) {
        if (data.teamId === game.localTeamId) {
          gameUpdates.localScore = game.localScore + data.points
        } else if (data.teamId === game.visitingTeamId) {
          gameUpdates.visitingScore = game.visitingScore + data.points
        }
      }
      if (data.newOffenseTeamId !== undefined) gameUpdates.offenseTeamId = data.newOffenseTeamId
      if (data.newCurrentDown !== undefined) gameUpdates.currentDown = data.newCurrentDown
      if (data.newYardsToFirst !== undefined) gameUpdates.yardsToFirst = data.newYardsToFirst
      // Timeout handling (2 per team per half)
      if (data.type === 'TIMEOUT' && data.teamId) {
        const isSecondHalf = game.currentQuarter >= 3
        if (data.teamId === game.localTeamId) {
          const field = isSecondHalf ? 'localTimeoutsH2' : 'localTimeoutsH1'
          if (game[field] >= 2) throw new AppError(400, 'NO_TIMEOUTS', 'No quedan tiempos fuera para este equipo en esta mitad')
          gameUpdates[field] = game[field] + 1
        } else if (data.teamId === game.visitingTeamId) {
          const field = isSecondHalf ? 'visitingTimeoutsH2' : 'visitingTimeoutsH1'
          if (game[field] >= 2) throw new AppError(400, 'NO_TIMEOUTS', 'No quedan tiempos fuera para este equipo en esta mitad')
          gameUpdates[field] = game[field] + 1
        }
      }

      // Interception — auto change possession
      if (data.type === 'INTERCEPTION') {
        const newOffense = game.offenseTeamId === game.localTeamId ? game.visitingTeamId : game.localTeamId
        gameUpdates.offenseTeamId = newOffense
        gameUpdates.currentDown = 1
        gameUpdates.yardsToFirst = 10
      }

      // Score adjustment
      if (data.type === 'SCORE_ADJUST') {
        if (data.newLocalScore !== undefined) gameUpdates.localScore = data.newLocalScore
        if (data.newVisitingScore !== undefined) gameUpdates.visitingScore = data.newVisitingScore
      }

      if (data.type === 'HALFTIME_START') {
        gameUpdates.status = 'HALFTIME'
        gameUpdates.timerRunning = false
        gameUpdates.timerSeconds = elapsedSeconds(game)
        gameUpdates.timerLastStarted = null
      }
      if (data.type === 'HALFTIME_END') {
        gameUpdates.status = 'IN_PROGRESS'
        gameUpdates.timerRunning = false
        gameUpdates.timerSeconds = 0
        gameUpdates.timerLastStarted = null
        gameUpdates.currentQuarter = 3
      }
      if (data.type === 'GAME_END') {
        gameUpdates.status = 'FINISHED'
        gameUpdates.finishedAt = new Date()
        gameUpdates.timerRunning = false
        gameUpdates.timerSeconds = elapsedSeconds(game)
      }

      if (Object.keys(gameUpdates).length > 0) {
        await tx.footballGame.update({ where: { id: game.id }, data: gameUpdates })
      }

      const event = await tx.gameEvent.create({
        data: {
          gameId: game.id,
          tenantId,
          type: data.type,
          teamId: data.teamId ?? null,
          playerId: data.playerId ?? null,
          quarter: data.quarter ?? game.currentQuarter,
          down: data.down ?? game.currentDown,
          points: data.points,
          description: data.description ?? null,
          metadata: data.metadata ?? {},
          createdById: userId,
        },
      })

      return event
    })

    // Return fresh game state
    const freshGame = await prisma.footballGame.findUnique({ where: { id: game.id } })

    // Sync scores to SportMatchData when game ends
    if (data.type === 'GAME_END' && game.activityId && freshGame) {
      await prisma.sportMatchData.update({
        where: { activityId: game.activityId },
        data: { homeScore: freshGame.localScore, visitingScore: freshGame.visitingScore },
      }).catch(() => { /* ignore if no match data */ })
    }

    res.status(201).json({
      success: true,
      data: {
        event: result,
        game: freshGame ? { ...freshGame, timerSeconds: elapsedSeconds(freshGame) } : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function listGameEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    await getGameForTenant(req.params.gameId, tenantId)

    const events = await prisma.gameEvent.findMany({
      where: { gameId: req.params.gameId },
      orderBy: { createdAt: 'asc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Manually resolve player and team names (no Prisma relation defined)
    const playerIds = [...new Set(events.filter((e) => e.playerId).map((e) => e.playerId!))]
    const teamIds   = [...new Set(events.filter((e) => e.teamId).map((e) => e.teamId!))]
    const [players, teams] = await Promise.all([
      playerIds.length
        ? prisma.client.findMany({ where: { id: { in: playerIds } }, select: { id: true, firstName: true, lastName: true, companyName: true, playerNumber: true } })
        : Promise.resolve([]),
      teamIds.length
        ? prisma.client.findMany({ where: { id: { in: teamIds } }, select: { id: true, companyName: true } })
        : Promise.resolve([]),
    ])
    const playerMap = Object.fromEntries(players.map((p) => [p.id, p]))
    const teamMap   = Object.fromEntries(teams.map((t) => [t.id, t]))

    const enriched = events.map((e) => ({
      ...e,
      player: e.playerId ? (playerMap[e.playerId] ?? null) : null,
      team:   e.teamId   ? (teamMap[e.teamId]   ?? null) : null,
    }))

    res.json({ success: true, data: enriched })
  } catch (err) {
    next(err)
  }
}

// ── Players for a team (from JUGADOR relations) ────────────────────────────────

export async function getTeamPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { teamId } = req.params

    const team = await prisma.client.findFirst({ where: { id: teamId, tenantId, isTeam: true } })
    if (!team) throw new AppError(404, 'TEAM_NOT_FOUND', 'Equipo no encontrado')

    const relations = await prisma.clientRelation.findMany({
      where: { clientId: teamId, relationType: 'JUGADOR', isActive: true },
      include: {
        relatedClient: {
          select: { id: true, firstName: true, lastName: true, companyName: true, logoUrl: true, playerNumber: true },
        },
      },
    })

    const players = relations.map(r => r.relatedClient)
    res.json({ success: true, data: players })
  } catch (err) {
    next(err)
  }
}
