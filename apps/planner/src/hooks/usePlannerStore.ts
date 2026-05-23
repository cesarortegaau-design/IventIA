/**
 * usePlannerStore — generic hook for planner pages that need synced JSON storage.
 *
 * Storage strategy (in order of priority):
 *   1. localStorage — written immediately on every update (write-through cache)
 *      → data survives even if the API call fails
 *   2. API (PlannerStore) — debounced PUT, keeps server in sync
 *   3. React Query cache — updated after every successful API save so remounts are instant
 *
 * On mount:  fetch from API first; if empty/failed → fall back to localStorage.
 * On update: write to localStorage immediately + debounce PUT to API (1200ms).
 * On unmount: flush any pending save so navigation never loses data.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '../api/events'

const DEBOUNCE_MS = 1200

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error'

interface UsePlannerStoreReturn<T> {
  store: T
  setStore: React.Dispatch<React.SetStateAction<T>>
  update: (patch: Partial<T>) => void
  saveNow: (explicitData?: T) => Promise<void>
  syncStatus: SyncStatus
  ready: boolean
}

function writeLocalStorage(key: string | undefined, value: unknown) {
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota / private mode */ }
}

function readLocalStorage<T>(key: string | undefined, defaultValue: T): T | null {
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { ...defaultValue, ...JSON.parse(raw) } as T
  } catch { /* ignore */ }
  return null
}

export function usePlannerStore<T extends Record<string, any>>(
  eventId: string,
  storeKey: string,
  defaultValue: T,
  localStorageKey?: string,
): UsePlannerStoreReturn<T> {
  const queryClient = useQueryClient()

  // Seed initial state from localStorage immediately (before API responds)
  const [store, setStore] = useState<T>(() => {
    const local = readLocalStorage(localStorageKey, defaultValue)
    return local ?? defaultValue
  })

  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedJson = useRef('')
  const initialized = useRef(false)
  const storeRef = useRef(store)
  storeRef.current = store

  const qk = useRef(['planner-store', eventId, storeKey])
  qk.current = ['planner-store', eventId, storeKey]

  // Fetch from backend — staleTime Infinity because we update the cache after every save
  const { data: remote, isLoading } = useQuery({
    queryKey: qk.current,
    queryFn: () => eventsApi.getPlannerStore(eventId, storeKey),
    enabled: !!eventId,
    staleTime: Infinity,
    retry: 2,
  })

  // Initialize ONCE: prefer API data, fall back to localStorage
  useEffect(() => {
    if (isLoading || !eventId || initialized.current) return
    initialized.current = true

    const remoteData = remote?.data
    if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
      // API has data — use it and keep localStorage in sync
      const merged = { ...defaultValue, ...remoteData } as T
      setStore(merged)
      lastSavedJson.current = JSON.stringify(merged)
      writeLocalStorage(localStorageKey, merged)
    } else {
      // API empty or failed — localStorage was already seeded in useState initializer
      // but if the component mounted with defaultValue (no LS data), try LS again here
      const local = readLocalStorage(localStorageKey, defaultValue)
      if (local && Object.keys(local).some(k => k !== 'updatedAt' && JSON.stringify((local as any)[k]) !== JSON.stringify((defaultValue as any)[k]))) {
        setStore(local)
        lastSavedJson.current = JSON.stringify(local)
        // Push to API to persist
        eventsApi.savePlannerStore(eventId, storeKey, local).catch(() => {})
      }
    }

    setReady(true)
    setSyncStatus('idle')
  }, [isLoading, eventId, storeKey, remote, localStorageKey])

  // Debounced save to API on store changes (localStorage is already written on update)
  useEffect(() => {
    if (!ready || !eventId) return
    const json = JSON.stringify(store)
    if (json === lastSavedJson.current) return

    setSyncStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const current = storeRef.current
      eventsApi.savePlannerStore(eventId, storeKey, current)
        .then(() => {
          setSyncStatus('saved')
          lastSavedJson.current = JSON.stringify(current)
          queryClient.setQueryData(qk.current, { data: current })
        })
        .catch(() => setSyncStatus('error'))
    }, DEBOUNCE_MS)
  }, [ready, eventId, storeKey, store, queryClient])

  // Flush pending save on unmount so navigating away never loses data
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      const current = storeRef.current
      const json = JSON.stringify(current)
      if (json !== lastSavedJson.current && eventId) {
        // localStorage is already up to date; just sync API
        eventsApi.savePlannerStore(eventId, storeKey, current).catch(() => {})
        queryClient.setQueryData(qk.current, { data: current })
      }
    }
  }, [eventId, storeKey, queryClient])

  // update: write to localStorage immediately, then let debounce handle API
  const update = useCallback((patch: Partial<T>) => {
    setStore(prev => {
      const next = { ...prev, ...patch }
      writeLocalStorage(localStorageKey, next)
      return next
    })
  }, [localStorageKey])

  const saveNow = useCallback(async (explicitData?: T) => {
    if (!eventId) return
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    const current = explicitData ?? storeRef.current
    // Always persist locally first
    writeLocalStorage(localStorageKey, current)
    setSyncStatus('saving')
    try {
      await eventsApi.savePlannerStore(eventId, storeKey, current)
      setSyncStatus('saved')
      lastSavedJson.current = JSON.stringify(current)
      queryClient.setQueryData(qk.current, { data: current })
    } catch (err) {
      setSyncStatus('error')
      throw err
    }
  }, [eventId, storeKey, localStorageKey, queryClient])

  return { store, setStore, update, saveNow, syncStatus, ready }
}
