import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { ArteCapitalTokenPayload } from '@iventia/shared'

export async function arteCapitalLogin(email: string, password: string, tenantId: string) {
  const user = await prisma.artCapitalUser.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!user || !user.passwordHash || user.tenantId !== tenantId) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  if (!user.isActive) {
    throw new AppError(401, 'ACCOUNT_INACTIVE', 'Account is inactive')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  return generateArteCapitalTokens(user)
}

export interface ArteCapitalRegisterInput {
  tenantId: string
  email: string
  password: string
  firstName: string
  lastName: string
  userRole: 'ARTIST' | 'COLLECTOR'
  phone?: string
}

export async function arteCapitalRegister(input: ArteCapitalRegisterInput) {
  // Check if user already exists
  const existing = await prisma.artCapitalUser.findUnique({
    where: { email: input.email.toLowerCase() },
  })

  if (existing) {
    throw new AppError(409, 'USER_EXISTS', 'User with this email already exists')
  }

  // Ensure tenant exists (create if not found)
  let tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
  })

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: input.tenantId,
        name: `Arte Capital - ${input.tenantId}`,
        slug: `arte-capital-${input.tenantId.toLowerCase()}`,
        isActive: true,
        settings: { commissionRate: 15, currency: 'USD' },
      },
    })
  }

  const passwordHash = await hashPassword(input.password)

  const user = await prisma.artCapitalUser.create({
    data: {
      tenantId: input.tenantId,
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      userRole: input.userRole,
      phone: input.phone,
      isActive: true,
    },
  })

  // If artist, create artist profile
  if (input.userRole === 'ARTIST') {
    await prisma.artCapitalArtist.create({
      data: {
        tenantId: input.tenantId,
        userId: user.id,
        commissionRate: 15, // Default 15% commission
        isActive: true,
      },
    })
  }

  return generateArteCapitalTokens(user)
}

function generateArteCapitalTokens(user: any) {
  const payload: ArteCapitalTokenPayload = {
    artCapitalUserId: user.id,
    tenantId: user.tenantId,
    userRole: user.userRole,
    email: user.email,
    type: 'arte-capital',
  }

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })

  const refreshToken = jwt.sign(
    { artCapitalUserId: user.id, tenantId: user.tenantId },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  )

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userRole: user.userRole,
      profileImage: user.profileImage,
    },
  }
}

export async function arteCapitalRefreshToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_SECRET) as {
      artCapitalUserId: string
      tenantId: string
    }
    const user = await prisma.artCapitalUser.findUnique({
      where: { id: payload.artCapitalUserId },
    })

    if (!user || !user.isActive || user.tenantId !== payload.tenantId) {
      throw new Error()
    }

    const newPayload: ArteCapitalTokenPayload = {
      artCapitalUserId: user.id,
      tenantId: user.tenantId,
      userRole: user.userRole,
      email: user.email,
      type: 'arte-capital',
    }

    const accessToken = jwt.sign(newPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })

    return { accessToken }
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired')
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
