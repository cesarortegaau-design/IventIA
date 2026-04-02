import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      userDepartments: { include: { department: true } },
      privileges: true,
    },
  })

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  if (!user.isActive) {
    throw new AppError(401, 'ACCOUNT_INACTIVE', 'Account is inactive')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  const payload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  }

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })

  const refreshToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departments: user.userDepartments.map((ud) => ud.department),
      privileges: user.privileges.filter((p) => p.granted).map((p) => p.privilegeKey),
    },
  }
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user || !user.isActive) throw new Error()

    const newPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
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
