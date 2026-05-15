import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useRecentScreensStore } from '../stores/recentScreensStore'

/**
 * Call this hook in any page that has dynamic context (event name, order number, etc.)
 * to register a rich label in the recent screens history.
 * Pass an empty string while data is loading — the push is skipped until label is truthy.
 */
export function useRecentScreen(label: string, section = 'general') {
  const { pathname, search } = useLocation()
  const push = useRecentScreensStore((s) => s.push)
  const fullPath = pathname + search

  useEffect(() => {
    if (!label) return
    push({ path: fullPath, label, section })
  }, [label, fullPath]) // eslint-disable-line react-hooks/exhaustive-deps
}
