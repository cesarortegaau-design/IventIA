/**
 * usePlannerStore — generic hook for planner pages that need synced JSON storage.
 *
 * On mount: fetches from API (once), falls back to localStorage for migration.
 * On update: debounced PUT to API (1200ms).
 * On unmount: flushes any pending save so navigation never loses data.
 * After each save the React Query cache is updated so the next mount is instant.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '../api/events'

const DEBOUNCE_MS = 1200

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'saved'

interface UsePlannerStoreReturn<T> {
  store: T
  setStore: React.Dispatch<React.SetStateAction<T>>
  update: (patch: Partial<T>) => void
  syncStatus: SyncStatus
  ready: boolean
}

export function usePlannerStore<T extends Record<string, any>>(
  eventId: string,
  storeKey: string,
  defaultValue: T,
  localStorageKey?: string,
): UsePlannerStoreReturn<T> {
  const queryClient = useQueryClient()
  const [store, setStore] = useState<T>(defaultValue)
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
  })

  // Initialize ONCE from remote or migrate from localStorage
  useEffect(() => {
    if (isLoading || !eventId || initialized.current) return
    initialized.current = true

    const remoteData = remote?.data
    if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
      const merged = { ...defaultValue, ...remoteData } as T
      setStore(merged)
      lastSavedJson.current = JSON.stringify(merged)
    } else if (localStorageKey) {
      try {
        const raw = localStorage.getItem(localStorageKey)
        if (raw) {
          const parsed = { ...defaultValue, ...JSON.parse(raw) } as T
          setStore(parsed)
          lastSavedJson.current = JSON.stringify(parsed)
          eventsApi.savePlannerStore(eventId, storeKey, parsed).catch(() => {})
        }
      } catch { /* ignore */ }
    }
    setReady(true)
    setSyncStatus('idle')
  }, [isLoading, eventId, storeKey, remote, localStorageKey])

  // Debounced save to API on store changes
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
          // Update RQ cache so next mount loads instantly (no re-fetch needed)
          queryClient.setQueryData(qk.current, { data: current })
        })
        .catch(() => setSyncStatus('idle'))
    }, DEBOUNCE_MS)
  }, [ready, eventId, storeKey, store, queryClient])

  // Flush pending save on unmount so navigating away never loses data
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      const json = JSON.stringify(storeRef.current)
      if (json !== lastSavedJson.current && eventId) {
        eventsApi.savePlannerStore(eventId, storeKey, storeRef.current).catch(() => {})
        queryClient.setQueryData(qk.current, { data: storeRef.current })
      }
    }
  }, [eventId, storeKey, queryClient])

  const update = useCallback((patch: Partial<T>) => {
    setStore(prev => ({ ...prev, ...patch }))
  }, [])

  return { store, setStore, update, syncStatus, ready }
}
