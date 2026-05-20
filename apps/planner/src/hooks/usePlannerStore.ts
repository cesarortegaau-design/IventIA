/**
 * usePlannerStore — generic hook for planner pages that need synced JSON storage.
 *
 * Replaces the old localStorage pattern with backend-backed persistence.
 * On mount: fetches from API, falls back to localStorage for one-time migration.
 * On update: debounced PUT to API (1200ms). Flushes on unmount so navigating away
 * never loses data.
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
  const didMigrate = useRef(false)
  const storeRef = useRef(store)
  storeRef.current = store

  const queryKey = ['planner-store', eventId, storeKey]

  // Fetch from backend — default staleTime so data refreshes on remount
  const { data: remote, isLoading } = useQuery({
    queryKey,
    queryFn: () => eventsApi.getPlannerStore(eventId, storeKey),
    enabled: !!eventId,
  })

  // Initialize from remote or migrate from localStorage
  useEffect(() => {
    if (isLoading || !eventId) return
    const remoteData = remote?.data
    if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
      setStore(remoteData as T)
      lastSavedJson.current = JSON.stringify(remoteData)
    } else if (localStorageKey && !didMigrate.current) {
      didMigrate.current = true
      try {
        const raw = localStorage.getItem(localStorageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          setStore(parsed as T)
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
      eventsApi.savePlannerStore(eventId, storeKey, store)
        .then(() => {
          setSyncStatus('saved')
          lastSavedJson.current = JSON.stringify(store)
          queryClient.setQueryData(queryKey, { data: store })
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
        queryClient.setQueryData(['planner-store', eventId, storeKey], { data: storeRef.current })
      }
    }
  }, [eventId, storeKey, queryClient])

  const update = useCallback((patch: Partial<T>) => {
    setStore(prev => ({ ...prev, ...patch }))
  }, [])

  return { store, setStore, update, syncStatus, ready }
}
