import { Request } from 'express'
import { prisma } from '../config/database'

/**
 * Returns the department IDs the current user is assigned to.
 * ADMIN users return null (meaning no filtering — see all).
 * Non-admin users with no departments assigned return empty array (see nothing).
 */
export async function getUserDepartmentIds(req: Request): Promise<string[] | null> {
  if (req.user!.role === 'ADMIN') return null // admins see everything

  const userDepts = await prisma.userDepartment.findMany({
    where: { userId: req.user!.userId },
    select: { departmentId: true },
  })

  return userDepts.map(d => d.departmentId)
}

/**
 * Returns the organization IDs accessible to the current user via their departments.
 * ADMIN users return null (no filtering).
 */
export async function getUserOrgIds(req: Request): Promise<string[] | null> {
  if (req.user!.role === 'ADMIN') return null

  const deptIds = await getUserDepartmentIds(req)
  if (deptIds === null) return null

  const links = await prisma.departmentOrganization.findMany({
    where: { departmentId: { in: deptIds } },
    select: { organizationId: true },
  })

  return [...new Set(links.map(l => l.organizationId))]
}

/**
 * Builds a WHERE fragment to filter Orders by the user's accessible organizations.
 */
export async function orgFilterForOrder(req: Request) {
  const orgIds = await getUserOrgIds(req)
  if (orgIds === null) return {}
  return { organizacionId: { in: orgIds } }
}

/**
 * Builds a WHERE fragment to filter PurchaseOrders by the user's accessible organizations.
 */
export async function orgFilterForPurchaseOrder(req: Request) {
  const orgIds = await getUserOrgIds(req)
  if (orgIds === null) return {}
  return { organizacionId: { in: orgIds } }
}

/**
 * Builds a Prisma WHERE clause fragment to filter by department.
 * Returns {} for admins (no restriction).
 * For normal users: shows resources in their departments + resources with no department assigned.
 */
export async function deptFilterForResource(req: Request) {
  const deptIds = await getUserDepartmentIds(req)
  if (deptIds === null) return {} // admin — no filter
  return { OR: [{ departmentId: { in: deptIds } }, { departmentId: null }] }
}

/**
 * Builds a Prisma WHERE fragment for Orders that have at least one line item
 * with a resource in the user's departments (or unassigned).
 */
export async function deptFilterForOrder(req: Request) {
  const deptIds = await getUserDepartmentIds(req)
  if (deptIds === null) return {}
  return {
    lineItems: { some: { resource: { OR: [{ departmentId: { in: deptIds } }, { departmentId: null }] } } },
  }
}

/**
 * Same for PurchaseOrders.
 */
export async function deptFilterForPurchaseOrder(req: Request) {
  const deptIds = await getUserDepartmentIds(req)
  if (deptIds === null) return {}
  return {
    lineItems: { some: { resource: { OR: [{ departmentId: { in: deptIds } }, { departmentId: null }] } } },
  }
}
