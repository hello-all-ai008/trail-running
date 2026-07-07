import { useCallback, useEffect, useMemo, useState } from 'react'
import { initialRunners, CATEGORIES, totalMs } from '../lib/raceData'
import { applyCheckin, applyCheckpoint, applyFinish, seedScanLog } from '../lib/raceEngine'

// v2: data shape changed (real event database) — new keys so stale v1 data is ignored
const STORAGE_KEYS = {
  runners: 'tt:v2:runners',
  scanLog: 'tt:v2:scanLog',
}

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

/**
 * Owns app state: runners (seeded from the real event database), the audit
 * scanLog, and per-station last-scan results for the LED boards.
 * Persists to localStorage. All updates immutable via raceEngine.
 */
export function useRaceState() {
  const [runners, setRunners] = useState(() => readStored(STORAGE_KEYS.runners, () => initialRunners))
  const [scanLog, setScanLog] = useState(() => readStored(STORAGE_KEYS.scanLog, () => seedScanLog(initialRunners)))
  /** last ScanResult per station key: 'checkin' | 'checkpoint' | 'finish' */
  const [lastScan, setLastScan] = useState({})

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.runners, JSON.stringify(runners))
  }, [runners])
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.scanLog, JSON.stringify(scanLog))
  }, [scanLog])

  const commit = useCallback((stationKey, { state, result }) => {
    setRunners(state.runners)
    setScanLog(state.scanLog)
    setLastScan((prev) => ({ ...prev, [stationKey]: result }))
    return result
  }, [])

  const scanCheckin = useCallback(
    (value) => commit('checkin', applyCheckin({ runners, scanLog }, value)),
    [commit, runners, scanLog],
  )

  const scanCheckpoint = useCallback(
    (value, cpId) => commit('checkpoint', applyCheckpoint({ runners, scanLog }, value, cpId)),
    [commit, runners, scanLog],
  )

  const scanFinish = useCallback(
    (value) => commit('finish', applyFinish({ runners, scanLog }, value)),
    [commit, runners, scanLog],
  )

  const resetDemo = useCallback(() => {
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
  const ranks = useMemo(() => {
    const map = {}
    CATEGORIES.forEach((cat) => {
      const finished = runners
        .filter((r) => r.finish && r.category === cat)
        .slice()
        .sort((a, b) => totalMs(a) - totalMs(b))
      finished.forEach((r, i) => {
        map[r.bib] = { overall: i + 1 }
      })
      const byGender = {}
      const byAge = {}
      finished.forEach((r) => {
        byGender[r.gender] = (byGender[r.gender] || 0) + 1
        map[r.bib].gender = byGender[r.gender]
        const ageKey = `${r.gender}:${r.ageGroup}`
        byAge[ageKey] = (byAge[ageKey] || 0) + 1
        map[r.bib].age = byAge[ageKey]
      })
    })
    return map
  }, [runners])

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
