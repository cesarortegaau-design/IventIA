// API response envelope
export interface ApiResponse<T> {
  success: true
  data: T
  meta?: {
    total: number
    page: number
    pageSize: number
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// Pagination query params
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Auth
export interface AuthTokenPayload {
  userId: string
  tenantId: string
  role: 'ADMIN' | 'NORMAL' | 'READ_ONLY'
  email: string
}

export interface PortalTokenPayload {
  clientId: string
  tenantId: string
  email: string
}

export interface ArteCapitalTokenPayload {
  artCapitalUserId: string
  tenantId: string
  userRole: 'ARTIST' | 'COLLECTOR' | 'ADMIN'
  email: string
  type: 'arte-capital'
}
