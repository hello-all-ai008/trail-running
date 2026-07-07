import { useCallback, useEffect, useState } from 'react'

const DEFAULT_PAGE = 'dashboard'

/**
 * Current page from the URL hash: "#/runners" -> "runners".
 */
function readHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  return h || DEFAULT_PAGE
}

/**
 * Hash-based routing — page id lives in the URL (#/dashboard … #/log),
 * browser back/forward works, zero dependencies.
 * @returns {[string, (page: string) => void]}
 */
export function useHashRoute() {
  const [page, setPage] = useState(readHash)

  useEffect(() => {
    const onHash = () => setPage(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((next) => {
    window.location.hash = `/${next}`
  }, [])

  return [page, navigate]
}
