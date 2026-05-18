import { apiClient } from './client'

export const approvalFlowsApi = {
  list: (params?: { objectType?: string }) =>
    apiClient.get('/approval-flows', { params }).then(r => r.data.data),
  get: (id: string) =>
    apiClient.get(`/approval-flows/${id}`).then(r => r.data.data),
  create: (data: any) =>
    apiClient.post('/approval-flows', data).then(r => r.data.data),
  update: (id: string, data: any) =>
    apiClient.put(`/approval-flows/${id}`, data).then(r => r.data.data),
  delete: (id: string) =>
    apiClient.delete(`/approval-flows/${id}`).then(r => r.data),

  listRequests: (params?: { objectType?: string; objectId?: string; status?: string }) =>
    apiClient.get('/approval-flows/requests', { params }).then(r => r.data.data),
  getActiveRequest: (objectType: string, objectId: string) =>
    apiClient.get('/approval-flows/requests/active', { params: { objectType, objectId } }).then(r => r.data.data),
  triggerRequest: (data: { flowId: string; objectType: string; objectId: string }) =>
    apiClient.post('/approval-flows/requests', data).then(r => r.data.data),
  reviewStep: (requestId: string, stepId: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
    apiClient.post(`/approval-flows/requests/${requestId}/steps/${stepId}/review`, { action, reason }).then(r => r.data.data),
  cancelRequest: (requestId: string) =>
    apiClient.post(`/approval-flows/requests/${requestId}/cancel`).then(r => r.data.data),

  compileRule: (ruleText: string, objectType: string) =>
    apiClient.post('/approval-flows/compile-rule', { ruleText, objectType })
      .then(r => r.data.data as {
        ruleCode: string;
        extraFields: Array<{ alias: string; path: string; found: boolean; note?: string }>;
        unknownFields: Array<{ alias: string; path: string; found: boolean; note?: string }>;
      }),

  searchObjects: (objectType: string, q?: string) =>
    apiClient.get('/approval-flows/search-objects', { params: { objectType, q } })
      .then(r => r.data.data as Array<{ id: string; label: string }>),

  testRule: (objectType: string, objectId: string, ruleCode: string) =>
    apiClient.post('/approval-flows/test-rule', { objectType, objectId, ruleCode })
      .then(r => r.data.data as { result: boolean; objectData: Record<string, any>; error?: string }),
}
