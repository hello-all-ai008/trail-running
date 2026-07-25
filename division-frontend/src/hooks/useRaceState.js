import { useCallback, useEffect, useMemo, useState } from 'react'
import { initialRunners, totalMs } from '../lib/raceData'
import { applyCheckin, applyCheckpoint, applyFinish, seedScanLog } from '../lib/raceEngine'
import { computeRanks } from '../lib/results'
import * as api from '../lib/api'

// v2: data shape changed (real event database) — new keys so stale v1 data is ignored
const STORAGE_KEYS = {
  runners: 'tt:v2:runners',
  scanLog: 'tt:v2:scanLog',
}

/** Set VITE_USE_MOCK_DATA=false to point this hook at the real Go API + Supabase Realtime. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false'

/**
 * Read + parse a localStorage key, falling back to a default on any error.
 * @template T
 * @param {string} key
 * @param {() => T} makeFallback
 * @returns {T}
 */
function readStored(key, makeFallback) {
  if (typeof window === 'undefined') return makeFallback()
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : makeFallback()
  } catch {
    return makeFallback()
  }
}

const SCAN_CODES = { checkin: 'CHECKIN', finish: 'FINISH' }

/**
 * Owns app state: runners, the audit scanLog, and per-station last-scan
 * results for the LED boards. Mock mode persists to localStorage and
 * applies raceEngine.js locally; live mode calls division-backend's API
 * and syncs across stations via Supabase Realtime on live_progress.
 */
export function useRaceState() {
  const [runners, setRunners] = useState(() =>
    USE_MOCK ? readStored(STORAGE_KEYS.runners, () => initialRunners) : [],
  )
  const [scanLog, setScanLog] = useState(() =>
    USE_MOCK ? readStored(STORAGE_KEYS.scanLog, () => seedScanLog(initialRunners)) : [],
  )
  /** last ScanResult per station key: 'checkin' | 'checkpoint' | 'finish' */
  const [lastScan, setLastScan] = useState({})

  useEffect(() => {
    if (!USE_MOCK) return
    window.localStorage.setItem(STORAGE_KEYS.runners, JSON.stringify(runners))
  }, [runners])
  useEffect(() => {
    if (!USE_MOCK) return
    window.localStorage.setItem(STORAGE_KEYS.scanLog, JSON.stringify(scanLog))
  }, [scanLog])

  // Live mode: initial load + resync on any scan from any station.
  useEffect(() => {
    if (USE_MOCK) return
    let cancelled = false
    const refresh = () => api.fetchRunners().then((data) => { if (!cancelled) setRunners(data) })
    refresh()
    const unsubscribe = api.subscribeLiveProgress(refresh)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const commitMock = useCallback((stationKey, { state, result }) => {
    setRunners(state.runners)
    setScanLog(state.scanLog)
    setLastScan((prev) => ({ ...prev, [stationKey]: result }))
    return result
  }, [])

  // Real backend: server is the source of truth for runners; the scan log
  // here is a client-accumulated view of this device's own scans only —
  // a full server-side scan-log endpoint is a follow-up (out of scope
  // for this pass, see ~/.claude/plans backend plan's "out of scope" list).
  const commitLive = useCallback((stationKey, result) => {
    if (result.runner) {
      setRunners((prev) => prev.map((r) => (r.bib === result.runner.bib ? result.runner : r)))
    }
    setScanLog((prev) => [
      {
        time: new Date().toISOString(),
        station: result.station,
        bib: result.runner?.bib ?? '—',
        name: result.runner?.name ?? '',
        ok: result.outcome === 'ok',
        msg: result.outcome === 'ok' ? '' : result.outcome,
      },
      ...prev,
    ])
    setLastScan((prev) => ({ ...prev, [stationKey]: result }))
    return result
  }, [])

  const scanCheckin = useCallback(
    (value) => {
      if (USE_MOCK) return Promise.resolve(commitMock('checkin', applyCheckin({ runners, scanLog }, value)))
      return api.postScan(value, SCAN_CODES.checkin).then((result) => commitLive('checkin', result))
    },
    [commitMock, commitLive, runners, scanLog],
  )

  const scanCheckpoint = useCallback(
    (value, cpId) => {
      if (USE_MOCK) return Promise.resolve(commitMock('checkpoint', applyCheckpoint({ runners, scanLog }, value, cpId)))
      return api.postScan(value, cpId).then((result) => commitLive('checkpoint', result))
    },
    [commitMock, commitLive, runners, scanLog],
  )

  const scanFinish = useCallback(
    (value) => {
      if (USE_MOCK) return Promise.resolve(commitMock('finish', applyFinish({ runners, scanLog }, value)))
      return api.postScan(value, SCAN_CODES.finish).then((result) => commitLive('finish', result))
    },
    [commitMock, commitLive, runners, scanLog],
  )

  const resetDemo = useCallback(() => {
    if (!USE_MOCK) return
    setRunners(initialRunners)
    setScanLog(seedScanLog(initialRunners))
    setLastScan({})
  }, [])

  const stats = useMemo(() => {
    const total = runners.length
    const checkedIn = runners.filter((r) => r.checkin).length
    const finished = runners.filter((r) => r.finish).length
    return {
      total,
      checkedIn,
      onCourse: runners.filter((r) => r.checkin && !r.finish).length,
      finished,
      checkedInPct: total ? Math.round((checkedIn / total) * 100) : 0,
      finishedPct: checkedIn ? Math.round((finished / checkedIn) * 100) : 0,
    }
  }, [runners])

  /** bib -> { overall, gender, age } ranks within category (gun time). */
  const ranks = useMemo(() => computeRanks(runners), [runners])

  /** All finishers sorted by gun time (fastest first, across categories). */
  const finishers = useMemo(
    () =>
      runners
        .filter((r) => r.finish)
        .slice()
        .sort((a, b) => totalMs(a) - totalMs(b)),
    [runners],
  )

  return {
    runners,
    scanLog,
    lastScan,
    stats,
    ranks,
    finishers,
    scanCheckin,
    scanCheckpoint,
    scanFinish,
    resetDemo,
  }
}
