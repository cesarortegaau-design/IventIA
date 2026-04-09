import { apiClient } from './client'

export const galleryApi = {
  artworks: {
    list: (params?: any) =>
      apiClient.get('/gallery/artworks', { params }).then((r) => ({
        data: r.data.data,
        meta: r.data.meta,
      })),
    get: (id: string) =>
      apiClient.get(`/gallery/artworks/${id}`).then((r) => r.data.data),
    getRelated: (id: string) =>
      apiClient.get(`/gallery/artworks/${id}/related`).then((r) => r.data.data),
  },

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
  },

  orders: {
    create: (data: any) =>
      apiClient.post('/gallery/orders', data).then((r) => r.data.data),
    get: (id: string) =>
      apiClient.get(`/gallery/orders/${id}`).then((r) => r.data.data),
    list: () =>
      apiClient.get('/gallery/orders').then((r) => r.data.data),
    createCheckoutSession: (orderId: string) =>
      apiClient.post(`/gallery/orders/${orderId}/checkout-session`, {}).then((r) => r.data.data),
  },
}
