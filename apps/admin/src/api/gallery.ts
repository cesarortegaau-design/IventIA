import { apiClient } from './client'

export const galleryApi = {
  // Artworks
  artworks: {
    list: (params?: any) =>
      apiClient.get('/gallery/artworks', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get(`/gallery/artworks/${id}`).then((r) => r.data.data),
    create: (data: any) =>
      apiClient.post('/gallery/artworks', data).then((r) => r.data.data),
    update: (id: string, data: any) =>
      apiClient.put(`/gallery/artworks/${id}`, data).then((r) => r.data.data),
    delete: (id: string) =>
      apiClient.delete(`/gallery/artworks/${id}`).then((r) => r.data),
    getRelated: (id: string, limit?: number) =>
      apiClient.get(`/gallery/artworks/${id}/related`, { params: { limit } }).then((r) => r.data.data),
  },

  // Cart
  cart: {
    get: () =>
      apiClient.get('/gallery/cart').then((r) => r.data.data),
    summary: () =>
      apiClient.get('/gallery/cart/summary').then((r) => r.data.data),
    addItem: (artworkId: string, quantity: number) =>
      apiClient.post('/gallery/cart/items', { artworkId, quantity }).then((r) => r.data.data),
    updateItem: (cartItemId: string, quantity: number) =>
      apiClient.put(`/gallery/cart/items/${cartItemId}`, { quantity }).then((r) => r.data.data),
    removeItem: (cartItemId: string) =>
      apiClient.delete(`/gallery/cart/items/${cartItemId}`).then((r) => r.data),
    clear: () =>
      apiClient.delete('/gallery/cart').then((r) => r.data),
  },

  // Orders
  orders: {
    list: (params?: any) =>
      apiClient.get('/gallery/orders', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get(`/gallery/orders/${id}`).then((r) => r.data.data),
    create: (data: any) =>
      apiClient.post('/gallery/orders', data).then((r) => r.data.data),
    update: (id: string, data: any) =>
      apiClient.put(`/gallery/orders/${id}`, data).then((r) => r.data.data),
    createCheckoutSession: (orderId: string) =>
      apiClient.post(`/gallery/orders/${orderId}/checkout-session`, {}).then((r) => r.data.data),
    checkSessionStatus: (sessionId: string) =>
      apiClient.get('/gallery/checkout/session-status', { params: { sessionId } }).then((r) => r.data.data),
  },
}
