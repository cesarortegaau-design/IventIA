import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useRecentScreensStore } from '../stores/recentScreensStore'

/**
 * Call this hook in any page that has dynamic context (event name, order number, etc.)
 * to register a rich label in the recent screens history.
 * Pass an empty string while data is loading — the push is skipped until label is truthy.
 */
export function useRecentScreen(label: string, section = 'general') {
  const { pathname } = useLocation()
  const push = useRecentScreensStore((s) => s.push)

  useEffect(() => {
    if (!label) return
    push({ path: pathname, label, section })
  }, [label]) // eslint-disable-line react-hooks/exhaustive-deps
}
