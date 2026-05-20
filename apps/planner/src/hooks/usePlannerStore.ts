/**
 * usePlannerStore — generic hook for planner pages that need synced JSON storage.
 *
 * Replaces the old localStorage pattern with backend-backed persistence.
 * On mount: fetches from API, falls back to localStorage for one-time migration.
 * On update: debounced PUT to API (1200ms).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  const [store, setStore] = useState<T>(defaultValue)
  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextSave = useRef(true) // skip the first render's save

  // Fetch from backend
  const { data: remote, isLoading } = useQuery({
    queryKey: ['planner-store', eventId, storeKey],
    queryFn: () => eventsApi.getPlannerStore(eventId, storeKey),
    enabled: !!eventId,
    staleTime: Infinity,
  })

  // Initialize from remote or migrate from localStorage
  useEffect(() => {
    if (isLoading || !eventId) return
    const remoteData = remote?.data
    if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
      setStore(remoteData as T)
    } else if (localStorageKey) {
      // One-time migration from localStorage
      try {
        const raw = localStorage.getItem(localStorageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          setStore(parsed as T)
          // Persist migrated data to backend
          eventsApi.savePlannerStore(eventId, storeKey, parsed).catch(() => {})
        }
      } catch { /* ignore */ }
    }
    setReady(true)
    setSyncStatus('idle')
    skipNextSave.current = true
  }, [isLoading, eventId, storeKey, remote, localStorageKey])

  // Debounced save to API on store changes
  useEffect(() => {
    if (!ready || !eventId) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSyncStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      eventsApi.savePlannerStore(eventId, storeKey, store)
        .then(() => setSyncStatus('saved'))
        .catch(() => setSyncStatus('idle'))
    }, DEBOUNCE_MS)
  }, [ready, eventId, storeKey, store])

  const update = useCallback((patch: Partial<T>) => {
    setStore(prev => ({ ...prev, ...patch }))
  }, [])

  return { store, setStore, update, syncStatus, ready }
}
