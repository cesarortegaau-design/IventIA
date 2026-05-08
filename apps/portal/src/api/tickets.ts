import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/public/tickets`
  : '/api/v1/public/tickets'

const publicApi = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

export const ticketsPublicApi = {
  getEvent: (slug: string) => publicApi.get(`/events/${slug}`).then(r => r.data),
  createOrder: (data: {
    slug: string
    buyerEmail: string
    buyerName: string
    buyerPhone?: string
    items: Array<{
      sectionId: string
      seatId?: string
      quantity: number
      attendee?: {
        firstName: string
        paternalLastName: string
        maternalLastName?: string
        phone?: string
        email: string
      }
    }>
    paymentMethod?: 'STRIPE' | 'CODE' | 'FREE'
    accessCode?: string
  }) => publicApi.post('/orders', data).then(r => r.data),
  getOrder: (token: string) => publicApi.get(`/orders/${token}`),
}
