import { apiClient } from './client'

export const arteCapitalApi = {
  // Products
  products: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/products', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get(`/arte-capital/products/${id}`).then((r) => r.data),
    approve: (id: string, approvedById: string) =>
      apiClient.patch(`/arte-capital/admin/products/${id}/approve`, { approvedById }).then((r) => r.data),
    reject: (id: string, approvedById: string, rejectionReason: string) =>
      apiClient.patch(`/arte-capital/admin/products/${id}/reject`, { approvedById, rejectionReason }).then((r) => r.data),
  },

  // Artists
  artists: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/artists', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get(`/arte-capital/admin/artists/${id}`).then((r) => r.data),
    updateCommission: (id: string, commissionRate: number) =>
      apiClient.patch(`/arte-capital/admin/artists/${id}`, { commissionRate }).then((r) => r.data),
  },

  // Members/Users
  members: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/members', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get(`/arte-capital/admin/members/${id}`).then((r) => r.data),
    renewMembership: (memberId: string) =>
      apiClient.post(`/arte-capital/admin/memberships/${memberId}/renew`, {}).then((r) => r.data),
  },

  // Orders
  orders: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/orders', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get(`/arte-capital/admin/orders/${id}`).then((r) => r.data),
  },

  // Memberships
  memberships: {
    tiers: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/memberships/tiers', { params }).then((r) => r.data),
    listTiers: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/membership-tiers', { params }).then((r) => r.data),
    createTier: (data: any) =>
      apiClient.post('/arte-capital/admin/membership-tiers', data).then((r) => r.data),
    updateTier: (id: string, data: any) =>
      apiClient.patch(`/arte-capital/admin/membership-tiers/${id}`, data).then((r) => r.data),
  },

  // Sales Reports
  reports: {
    sales: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/reports/sales', { params }).then((r) => r.data),
    commissions: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/reports/commissions', { params }).then((r) => r.data),
    activity: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/reports/activity', { params }).then((r) => r.data),
  },

  // Settings
  settings: {
    get: () =>
      apiClient.get('/arte-capital/admin/settings').then((r) => r.data),
    update: (data: any) =>
      apiClient.patch('/arte-capital/admin/settings', data).then((r) => r.data),
  },

  // Audit
  audit: {
    logs: (params?: Record<string, any>) =>
      apiClient.get('/arte-capital/admin/audit-logs', { params }).then((r) => r.data),
    trail: (entityId: string, entityType: string) =>
      apiClient.get(`/arte-capital/admin/audit/${entityType}/${entityId}`).then((r) => r.data),
  },
}
