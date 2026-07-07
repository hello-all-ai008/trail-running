/**
 * Pure scan transitions with race-day validation rules (from mockup_2):
 *  - unknown BIB           -> rejected, logged as not-found
 *  - duplicate scan        -> rejected ("ซ้ำ"), first-scan-wins, time never overwritten
 *  - CP/Finish before Check-in -> rejected ("ยังไม่เช็คอิน")
 * Every scan — accepted or rejected — appends a scanLog entry (audit trail).
 * All functions return NEW state; inputs are never mutated.
 */

import { findRunner, cpName, STATIONS } from './raceData'

/**
 * @typedef {import('./raceData').Runner} Runner
 * @typedef {Object} ScanResult
 * @property {'ok'|'duplicate'|'not-checked-in'|'not-found'} outcome
 * @property {Runner|null} runner   post-update runner (null when not found)
 * @property {string} station       display name of the scan station
 * @property {string} time          ISO timestamp of this scan
 * @typedef {{ time: string, station: string, bib: string, name: string, ok: boolean, msg?: string }} LogEntry
 * @typedef {{ runners: Runner[], scanLog: LogEntry[] }} RaceState
 */

/**
 * @param {RaceState} state
 * @param {LogEntry} entry
 * @returns {RaceState}
 */
function withLog(state, runners, entry) {
  return { runners, scanLog: [entry, ...state.scanLog] }
}

/**
 * Shared front-half of every scan: resolve runner or log a not-found.
 * @returns {{ runner: Runner|undefined, reject?: { state: RaceState, result: ScanResult } }}
 */
function resolve(state, station, value, iso) {
  const runner = findRunner(state.runners, value)
  if (!runner) {
    const entry = { time: iso, station, bib: String(value).trim(), name: 'ไม่พบในระบบ', ok: false, msg: 'ไม่พบ' }
    return {
      runner: undefined,
      reject: {
        state: withLog(state, state.runners, entry),
        result: { outcome: 'not-found', runner: null, station, time: iso },
      },
    }
  }
  return { runner }
}

/**
 * Replace one runner immutably.
 */
function replaceRunner(runners, updated) {
  return runners.map((r) => (r.bib === updated.bib ? updated : r))
}

/**
 * Check-in scan at the start gate.
 * @param {RaceState} state
 * @param {string} value
 * @param {string} [iso]
 * @returns {{ state: RaceState, result: ScanResult }}
 */
export function applyCheckin(state, value, iso = new Date().toISOString()) {
  const station = STATIONS.CHECKIN
  const { runner, reject } = resolve(state, station, value, iso)
  if (reject) return reject

  if (runner.checkin) {
    const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: false, msg: 'ซ้ำ' }
    return {
      state: withLog(state, state.runners, entry),
      result: { outcome: 'duplicate', runner, station, time: iso },
    }
  }

  const updated = { ...runner, checkin: iso }
  const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: true }
  return {
    state: withLog(state, replaceRunner(state.runners, updated), entry),
    result: { outcome: 'ok', runner: updated, station, time: iso },
  }
}

/**
 * Checkpoint scan (A1/A2/A3). Requires prior check-in.
 * @param {RaceState} state
 * @param {string} value
 * @param {string} cpId
 * @param {string} [iso]
 * @returns {{ state: RaceState, result: ScanResult }}
 */
export function applyCheckpoint(state, value, cpId, iso = new Date().toISOString()) {
  const station = cpName(cpId)
  const { runner, reject } = resolve(state, station, value, iso)
  if (reject) return reject

  if (!runner.checkin) {
    const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: false, msg: 'ยังไม่เช็คอิน' }
    return {
      state: withLog(state, state.runners, entry),
      result: { outcome: 'not-checked-in', runner, station, time: iso },
    }
  }

  if (runner.cps[cpId]) {
    const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: false, msg: 'ซ้ำ' }
    return {
      state: withLog(state, state.runners, entry),
      result: { outcome: 'duplicate', runner, station, time: iso },
    }
  }

  const updated = { ...runner, cps: { ...runner.cps, [cpId]: iso } }
  const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: true }
  return {
    state: withLog(state, replaceRunner(state.runners, updated), entry),
    result: { outcome: 'ok', runner: updated, station, time: iso },
  }
}

/**
 * Finish-line scan. Requires prior check-in; first finish time is kept.
 * @param {RaceState} state
 * @param {string} value
 * @param {string} [iso]
 * @returns {{ state: RaceState, result: ScanResult }}
 */
export function applyFinish(state, value, iso = new Date().toISOString()) {
  const station = STATIONS.FINISH
  const { runner, reject } = resolve(state, station, value, iso)
  if (reject) return reject

  if (!runner.checkin) {
    const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: false, msg: 'ยังไม่เช็คอิน' }
    return {
      state: withLog(state, state.runners, entry),
      result: { outcome: 'not-checked-in', runner, station, time: iso },
    }
  }

  if (runner.finish) {
    const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: false, msg: 'ซ้ำ' }
    return {
      state: withLog(state, state.runners, entry),
      result: { outcome: 'duplicate', runner, station, time: iso },
    }
  }

  const updated = { ...runner, finish: iso }
  const entry = { time: iso, station, bib: runner.bib, name: runner.name, ok: true }
  return {
    state: withLog(state, replaceRunner(state.runners, updated), entry),
    result: { outcome: 'ok', runner: updated, station, time: iso },
  }
}

/**
 * Seed the audit log from runners that already have timestamps (real event
 * data), newest first — mirrors mockup_2's initial log seeding.
 * @param {ReadonlyArray<Runner>} runners
 * @returns {LogEntry[]}
 */
export function seedScanLog(runners) {
  const log = []
  runners.forEach((r) => {
    if (r.checkin) log.push({ time: r.checkin, station: STATIONS.CHECKIN, bib: r.bib, name: r.name, ok: true })
    Object.entries(r.cps).forEach(([cp, t]) =>
      log.push({ time: t, station: cpName(cp), bib: r.bib, name: r.name, ok: true }),
    )
    if (r.finish) log.push({ time: r.finish, station: STATIONS.FINISH, bib: r.bib, name: r.name, ok: true })
  })
  return log.sort((a, b) => new Date(b.time) - new Date(a.time))
}
