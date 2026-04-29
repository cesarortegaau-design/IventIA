import { create } from 'zustand'

export interface CartItem {
  sectionId: string
  sectionName: string
  seatId?: string
  seatLabel?: string
  quantity: number
  unitPrice: number
}

interface CartState {
  slug: string | null
  items: CartItem[]
  setSlug: (slug: string) => void
  addItem: (item: CartItem) => void
  removeItem: (sectionId: string, seatId?: string) => void
  updateQuantity: (sectionId: string, quantity: number) => void
  clear: () => void
  total: () => number
}

export const useCart = create<CartState>((set, get) => ({
  slug: null,
  items: [],
  setSlug: (slug) => set({ slug, items: [] }),
  addItem: (item) => set(s => {
    const exists = s.items.find(i => i.sectionId === item.sectionId && i.seatId === item.seatId)
    if (exists) return { items: s.items.map(i => i.sectionId === item.sectionId && i.seatId === item.seatId ? { ...i, quantity: item.quantity } : i) }
    return { items: [...s.items, item] }
  }),
  removeItem: (sectionId, seatId) => set(s => ({ items: s.items.filter(i => !(i.sectionId === sectionId && i.seatId === seatId)) })),
  updateQuantity: (sectionId, quantity) => set(s => ({
    items: quantity <= 0
      ? s.items.filter(i => i.sectionId !== sectionId)
      : s.items.map(i => i.sectionId === sectionId ? { ...i, quantity } : i),
  })),
  clear: () => set({ items: [], slug: null }),
  total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
}))
