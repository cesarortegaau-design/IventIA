import { create } from 'zustand'

export interface SplitPane {
  path: string
  label: string
}

interface SplitViewStore {
  active: boolean
  orientation: 'horizontal' | 'vertical'
  panes: [SplitPane, SplitPane] | null
  open: (a: SplitPane, b: SplitPane) => void
  setOrientation: (o: 'horizontal' | 'vertical') => void
  swap: () => void
  close: () => void
}

export const useSplitViewStore = create<SplitViewStore>((set) => ({
  active: false,
  orientation: 'horizontal',
  panes: null,
  open: (a, b) => set({ active: true, panes: [a, b] }),
  setOrientation: (orientation) => set({ orientation }),
  swap: () => set((s) => s.panes ? { panes: [s.panes[1], s.panes[0]] } : {}),
  close: () => set({ active: false, panes: null }),
}))
