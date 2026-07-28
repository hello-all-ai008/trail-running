import { useRef } from 'react'
import { diffIds } from '../lib/monitor'

/**
 * Ids (BIBs for the podium, `${bib}-${time}-${station}` for the feed) that
 * appeared since the previous render — drives the once-only arrival flash.
 * First mount has no previous render to diff against, so it returns an empty
 * set rather than flashing the whole board on load.
 *
 * `scope` re-baselines the diff whenever it changes — needed because the
 * podium and feed views use incompatible id formats (bare BIB vs.
 * `${bib}-${time}-${station}`). Without it, switching view modes diffs one
 * format against the other and every id in the new view reads as "new",
 * flashing the whole board on every toggle rather than just on real arrivals.
 * @param {string[]} ids  ids present in this render
 * @param {string} [scope]  id-space identifier, e.g. the active view mode
 * @returns {Set<string>}
 */
export function useRecentArrivals(ids, scope) {
  const prevRef = useRef(null)
  const scopeRef = useRef(scope)

  const scopeChanged = scopeRef.current !== scope
  const added = prevRef.current === null || scopeChanged ? new Set() : diffIds(prevRef.current, ids)

  prevRef.current = new Set(ids)
  scopeRef.current = scope

  return added
}
