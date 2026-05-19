import { apiClient } from './client'

export const resourcesApi = {
  getSearchConfig: () =>
    apiClient.get('/resources/search-config').then((r) => r.data as { unsplashKey: string | null }),
}
